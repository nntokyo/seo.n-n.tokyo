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
      createdAt: user.createdAt,
    },
  };
}

// 1. メールアドレス＋パスワードによる新規登録
export function registerWithPassword(req: RegisterRequest): AuthTokenResponse {
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

  const newUser: StoredUser = {
    id: userId,
    email,
    name: defaultName,
    provider: 'LOCAL',
    role: usersMap.size === 0 ? 'ADMIN' : 'MEMBER',
    passwordSalt: salt,
    passwordHash,
    createdAt: new Date().toISOString(),
  };

  usersMap.set(userId, newUser);
  saveUsers();

  return createSessionForUser(newUser);
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
    // 既存ユーザーのGoogle ID / アバター更新
    found.googleId = googleUser.googleId;
    if (googleUser.picture) found.avatarUrl = googleUser.picture;
    if (googleUser.name && !found.name) found.name = googleUser.name;
    usersMap.set(found.id, found);
    saveUsers();
    return createSessionForUser(found);
  }

  // 新規Googleユーザー作成
  const userId = `usr_goog_${Date.now().toString(36)}_${crypto.randomBytes(4).toString('hex')}`;
  const newUser: StoredUser = {
    id: userId,
    email,
    name: googleUser.name || email.split('@')[0],
    provider: 'GOOGLE',
    googleId: googleUser.googleId,
    avatarUrl: googleUser.picture,
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
