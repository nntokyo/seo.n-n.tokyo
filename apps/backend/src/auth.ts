import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { AuthUser, AuthTokenResponse, RegisterRequest, LoginRequest } from '@seo/shared';

const authDataDir = path.resolve(process.cwd(), '.data', 'auth');
try {
  fs.mkdirSync(authDataDir, { recursive: true });
} catch {}

const USERS_FILE = path.join(authDataDir, 'users.json');
const SESSIONS_FILE = path.join(authDataDir, 'sessions.json');

interface StoredUser extends AuthUser {
  passwordSalt?: string;
  passwordHash?: string;
  googleId?: string;
  verificationCode?: string;
  verificationExpires?: number;
}

interface StoredSession {
  token: string;
  userId: string;
  expiresAt: number;
  createdAt: string;
}

let usersMap = new Map<string, StoredUser>();
let sessionsMap = new Map<string, StoredSession>();

function loadAuthData() {
  try {
    if (fs.existsSync(USERS_FILE)) {
      const list: StoredUser[] = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
      for (const u of list) {
        // デフォルトでemailVerifiedが存在しない既存ユーザーは互換性のためtrueまたはprovider===GOOGLEで判定
        if (u.emailVerified === undefined) {
          u.emailVerified = u.provider === 'GOOGLE' || u.role === 'ADMIN';
        }
        usersMap.set(u.id, u);
      }
    }
  } catch {}

  try {
    if (fs.existsSync(SESSIONS_FILE)) {
      const list: StoredSession[] = JSON.parse(fs.readFileSync(SESSIONS_FILE, 'utf8'));
      const now = Date.now();
      for (const s of list) {
        if (s.expiresAt > now) {
          sessionsMap.set(s.token, s);
        }
      }
    }
  } catch {}
}

function saveUsers() {
  try {
    fs.writeFileSync(USERS_FILE, JSON.stringify(Array.from(usersMap.values()), null, 2), 'utf8');
  } catch {}
}

function saveSessions() {
  try {
    fs.writeFileSync(SESSIONS_FILE, JSON.stringify(Array.from(sessionsMap.values()), null, 2), 'utf8');
  } catch {}
}

loadAuthData();

function hashPassword(password: string, salt: string): string {
  return crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
}

function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function createSessionForUser(user: StoredUser): AuthTokenResponse {
  const token = `seo_token_${crypto.randomBytes(32).toString('hex')}`;
  const expiresAt = Date.now() + 30 * 24 * 3600 * 1000; // 30日有効

  const session: StoredSession = {
    token,
    userId: user.id,
    expiresAt,
    createdAt: new Date().toISOString(),
  };

  sessionsMap.set(token, session);
  saveSessions();

  return {
    token,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      provider: user.provider,
      role: user.role,
      avatarUrl: user.avatarUrl,
      emailVerified: Boolean(user.emailVerified),
      createdAt: user.createdAt,
    },
  };
}

// 1. メールアドレス＋パスワードによる新規登録 (6桁認証コード発行)
export function registerWithPassword(req: RegisterRequest): AuthTokenResponse & { verificationCode?: string } {
  const email = req.email.trim().toLowerCase();
  if (!email || !req.password) {
    throw new Error('メールアドレスとパスワードは必須です');
  }

  // 重複チェック
  for (const u of usersMap.values()) {
    if (u.email.toLowerCase() === email) {
      throw new Error('このメールアドレスは既に登録されています');
    }
  }

  const salt = crypto.randomBytes(16).toString('hex');
  const passwordHash = hashPassword(req.password, salt);
  const userId = `usr_${Date.now().toString(36)}_${crypto.randomBytes(4).toString('hex')}`;
  const defaultName = req.name?.trim() || email.split('@')[0];
  const isFirstUser = usersMap.size === 0;

  const verificationCode = generateVerificationCode();
  const verificationExpires = Date.now() + 24 * 3600 * 1000; // 24時間

  const newUser: StoredUser = {
    id: userId,
    email,
    name: defaultName,
    provider: 'LOCAL',
    role: isFirstUser ? 'ADMIN' : 'MEMBER',
    emailVerified: isFirstUser, // 最初の管理者は自動認証、それ以外は要認証
    verificationCode: isFirstUser ? undefined : verificationCode,
    verificationExpires: isFirstUser ? undefined : verificationExpires,
    passwordSalt: salt,
    passwordHash,
    createdAt: new Date().toISOString(),
  };

  usersMap.set(userId, newUser);
  saveUsers();

  const sessionRes = createSessionForUser(newUser);
  return {
    ...sessionRes,
    verificationCode: newUser.emailVerified ? undefined : verificationCode,
  };
}

// 2. メールアドレス＋パスワードによるログイン
export function loginWithPassword(req: LoginRequest): AuthTokenResponse {
  const email = req.email.trim().toLowerCase();
  if (!email || !req.password) {
    throw new Error('メールアドレスとパスワードを入力してください');
  }

  let found: StoredUser | null = null;
  for (const u of usersMap.values()) {
    if (u.email.toLowerCase() === email) {
      found = u;
      break;
    }
  }

  if (!found || !found.passwordHash || !found.passwordSalt) {
    throw new Error('メールアドレスまたはパスワードが正しくありません');
  }

  const hash = hashPassword(req.password, found.passwordSalt);
  if (hash !== found.passwordHash) {
    throw new Error('メールアドレスまたはパスワードが正しくありません');
  }

  return createSessionForUser(found);
}

// 3. Google OAuth ログイン / アカウント作成 (OAuth IDトークンまたはプロファイルから)
export function loginOrCreateWithGoogle(googleUser: {
  googleId: string;
  email: string;
  name: string;
  picture?: string;
}): AuthTokenResponse {
  const email = googleUser.email.trim().toLowerCase();
  let found: StoredUser | null = null;

  for (const u of usersMap.values()) {
    if (u.googleId === googleUser.googleId || u.email.toLowerCase() === email) {
      found = u;
      break;
    }
  }

  if (found) {
    // 既存ユーザーのGoogle ID / アバター更新 (Googleログインはメール認証済みに昇格)
    found.googleId = googleUser.googleId;
    found.emailVerified = true;
    if (googleUser.picture) found.avatarUrl = googleUser.picture;
    if (googleUser.name && !found.name) found.name = googleUser.name;
    usersMap.set(found.id, found);
    saveUsers();
    return createSessionForUser(found);
  }

  // 新規Googleユーザー作成 (Googleは自動的に認証済み)
  const userId = `usr_goog_${Date.now().toString(36)}_${crypto.randomBytes(4).toString('hex')}`;
  const newUser: StoredUser = {
    id: userId,
    email,
    name: googleUser.name || email.split('@')[0],
    provider: 'GOOGLE',
    googleId: googleUser.googleId,
    avatarUrl: googleUser.picture,
    emailVerified: true,
    role: usersMap.size === 0 ? 'ADMIN' : 'MEMBER',
    createdAt: new Date().toISOString(),
  };

  usersMap.set(userId, newUser);
  saveUsers();

  return createSessionForUser(newUser);
}

// 4. トークンによるユーザー検証
export function verifySessionToken(token?: string): AuthUser | null {
  if (!token) return null;
  const cleanToken = token.replace(/^Bearer\s+/i, '').trim();
  const session = sessionsMap.get(cleanToken);
  if (!session) return null;

  if (session.expiresAt < Date.now()) {
    sessionsMap.delete(cleanToken);
    saveSessions();
    return null;
  }

  const user = usersMap.get(session.userId);
  if (!user) return null;

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    provider: user.provider,
    role: user.role,
    avatarUrl: user.avatarUrl,
    emailVerified: Boolean(user.emailVerified),
    createdAt: user.createdAt,
  };
}

// 5. ログアウト
export function logoutSession(token?: string): boolean {
  if (!token) return false;
  const cleanToken = token.replace(/^Bearer\s+/i, '').trim();
  const deleted = sessionsMap.delete(cleanToken);
  if (deleted) saveSessions();
  return deleted;
}

// 6. ユーザープロファイル更新 (名前変更)
export function updateUserProfile(userId: string, updates: { name?: string }): AuthUser {
  const user = usersMap.get(userId);
  if (!user) {
    throw new Error('ユーザーが見つかりません');
  }

  if (updates.name && updates.name.trim()) {
    user.name = updates.name.trim();
  }

  usersMap.set(userId, user);
  saveUsers();

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    provider: user.provider,
    role: user.role,
    avatarUrl: user.avatarUrl,
    emailVerified: Boolean(user.emailVerified),
    createdAt: user.createdAt,
  };
}

// 7. パスワード変更
export function changeUserPassword(userId: string, currentPass: string, newPass: string): boolean {
  const user = usersMap.get(userId);
  if (!user) {
    throw new Error('ユーザーが見つかりません');
  }

  if (user.provider !== 'LOCAL') {
    throw new Error('Google連携アカウントのパスワードは変更できません');
  }

  if (!user.passwordSalt || !user.passwordHash) {
    throw new Error('パスワード情報が設定されていません');
  }

  if (!newPass || newPass.length < 6) {
    throw new Error('新しいパスワードは6文字以上で指定してください');
  }

  const currentHash = hashPassword(currentPass, user.passwordSalt);
  if (currentHash !== user.passwordHash) {
    throw new Error('現在のパスワードが正しくありません');
  }

  const newSalt = crypto.randomBytes(16).toString('hex');
  const newHash = hashPassword(newPass, newSalt);

  user.passwordSalt = newSalt;
  user.passwordHash = newHash;
  usersMap.set(userId, user);
  saveUsers();

  return true;
}

// 8. メールアドレス変更申請 (新コード発行 & 未認証化)
export function changeUserEmail(userId: string, newEmail: string): { user: AuthUser; verificationCode: string } {
  const normEmail = newEmail.trim().toLowerCase();
  if (!normEmail || !normEmail.includes('@')) {
    throw new Error('有効なメールアドレスを入力してください');
  }

  const user = usersMap.get(userId);
  if (!user) {
    throw new Error('ユーザーが見つかりません');
  }

  // 他ユーザーとの重複チェック
  for (const [id, u] of usersMap.entries()) {
    if (id !== userId && u.email.toLowerCase() === normEmail) {
      throw new Error('このメールアドレスは既に使用されています');
    }
  }

  const code = generateVerificationCode();
  const expires = Date.now() + 24 * 3600 * 1000;

  user.email = normEmail;
  user.emailVerified = false; // 未認証へ戻す
  user.verificationCode = code;
  user.verificationExpires = expires;

  usersMap.set(userId, user);
  saveUsers();

  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      provider: user.provider,
      role: user.role,
      avatarUrl: user.avatarUrl,
      emailVerified: false,
      createdAt: user.createdAt,
    },
    verificationCode: code,
  };
}

// 9. メール認証コードの検証
export function verifyEmailCode(userId: string, code: string): AuthUser {
  const user = usersMap.get(userId);
  if (!user) {
    throw new Error('ユーザーが見つかりません');
  }

  if (user.emailVerified) {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      provider: user.provider,
      role: user.role,
      avatarUrl: user.avatarUrl,
      emailVerified: true,
      createdAt: user.createdAt,
    };
  }

  if (!user.verificationCode || user.verificationCode !== code.trim()) {
    throw new Error('認証コードが一致しません');
  }

  if (user.verificationExpires && user.verificationExpires < Date.now()) {
    throw new Error('認証コードの有効期限が切れています。再送信してください');
  }

  user.emailVerified = true;
  user.verificationCode = undefined;
  user.verificationExpires = undefined;

  usersMap.set(userId, user);
  saveUsers();

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    provider: user.provider,
    role: user.role,
    avatarUrl: user.avatarUrl,
    emailVerified: true,
    createdAt: user.createdAt,
  };
}

// 10. 認証コード再送信
export function resendVerificationCode(userId: string): { verificationCode: string } {
  const user = usersMap.get(userId);
  if (!user) {
    throw new Error('ユーザーが見つかりません');
  }

  if (user.emailVerified) {
    throw new Error('このメールアドレスは既に認証済みです');
  }

  const code = generateVerificationCode();
  user.verificationCode = code;
  user.verificationExpires = Date.now() + 24 * 3600 * 1000;

  usersMap.set(userId, user);
  saveUsers();

  return { verificationCode: code };
}

// 11. 全ユーザー一覧 (ADMIN専用)
export function listAllUsers(): AuthUser[] {
  return Array.from(usersMap.values()).map((u) => ({
    id: u.id,
    email: u.email,
    name: u.name,
    provider: u.provider,
    role: u.role,
    avatarUrl: u.avatarUrl,
    emailVerified: Boolean(u.emailVerified),
    createdAt: u.createdAt,
  }));
}

// 12. ユーザー権限変更 (ADMIN専用)
export function updateUserRole(userId: string, role: 'ADMIN' | 'MEMBER'): AuthUser {
  const user = usersMap.get(userId);
  if (!user) {
    throw new Error('ユーザーが見つかりません');
  }

  user.role = role;
  usersMap.set(userId, user);
  saveUsers();

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    provider: user.provider,
    role: user.role,
    avatarUrl: user.avatarUrl,
    emailVerified: Boolean(user.emailVerified),
    createdAt: user.createdAt,
  };
}
