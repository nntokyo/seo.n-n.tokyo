import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import type { FullAuditResult } from '@seo/shared';

// 旧形式 (audit_<時刻>_<5文字>) と新形式 (audit_<時刻>_<base64url>) の両方を受け付ける。
// パス区切りや "." を含む値は拒否し、保存先ディレクトリの外を参照させない。
const AUDIT_ID_PATTERN = /^audit_[0-9a-z]{1,16}_[0-9A-Za-z_-]{1,64}$/;

export function isValidAuditId(id: unknown): id is string {
  return typeof id === 'string' && AUDIT_ID_PATTERN.test(id);
}

export function generateAuditId(): string {
  return `audit_${Date.now().toString(36)}_${crypto.randomBytes(18).toString('base64url')}`;
}

type StoredAudit = FullAuditResult & { _ownerId?: string };

function toPublic(stored: StoredAudit): FullAuditResult {
  const { _ownerId: _omit, ...audit } = stored;
  return audit as FullAuditResult;
}

export interface AuditStoreOptions {
  dir: string;
  maxCached?: number;
  // 所有者を保存していない旧データ用。プロジェクト履歴から所有ユーザーを引く。
  findLegacyOwner?: (auditId: string) => string | undefined;
  onWriteError?: (error: unknown) => void;
}

export function createAuditStore(options: AuditStoreOptions) {
  const { dir, maxCached = 500, findLegacyOwner, onWriteError } = options;
  const cache = new Map<string, StoredAudit>();
  try {
    fs.mkdirSync(dir, { recursive: true });
  } catch {}

  const filePath = (id: string) => path.join(dir, `${id}.json`);

  const remember = (id: string, stored: StoredAudit) => {
    cache.delete(id);
    cache.set(id, stored);
    while (cache.size > maxCached) {
      const oldest = cache.keys().next().value;
      if (oldest === undefined) break;
      cache.delete(oldest);
    }
  };

  const load = (id: string): StoredAudit | null => {
    if (!isValidAuditId(id)) return null;
    const hit = cache.get(id);
    if (hit) return hit;
    try {
      const stored = JSON.parse(fs.readFileSync(filePath(id), 'utf8')) as StoredAudit;
      // 大文字小文字を区別しないファイルシステムで別表記の ID から読まれないようにする
      if (stored?.id !== id) return null;
      remember(id, stored);
      return stored;
    } catch {
      return null;
    }
  };

  // 起動時にディスク上の既存レポートを復元
  try {
    for (const file of fs.readdirSync(dir)) {
      if (!file.endsWith('.json')) continue;
      const id = file.slice(0, -'.json'.length);
      if (!isValidAuditId(id)) continue;
      try {
        const stored = JSON.parse(fs.readFileSync(filePath(id), 'utf8')) as StoredAudit;
        if (stored?.id === id) remember(id, stored);
      } catch {}
    }
  } catch {}

  const ownerOf = (id: string, stored: StoredAudit): string | undefined =>
    stored._ownerId || findLegacyOwner?.(id);

  return {
    get size() {
      return cache.size;
    },

    has(id: string): boolean {
      return load(id) !== null;
    },

    /** 結果を保存する。ownerId があればその利用者だけが読める。戻り値に所有者情報は含めない。 */
    save(audit: FullAuditResult, ownerId: string | undefined): FullAuditResult {
      if (!isValidAuditId(audit.id)) throw new Error('Invalid audit id');
      if (!cache.has(audit.id) && fs.existsSync(filePath(audit.id)) && load(audit.id) === null) {
        // 大文字小文字だけ違う既存ファイルを上書きしない
        throw new Error('Audit id conflicts with an existing result');
      }
      const stored: StoredAudit = ownerId ? { ...audit, _ownerId: ownerId } : { ...audit };
      remember(audit.id, stored);
      try {
        fs.writeFileSync(filePath(audit.id), JSON.stringify(stored), 'utf8');
      } catch (error) {
        onWriteError?.(error);
      }
      return toPublic(stored);
    },

    /** 所有者付きの結果は本人のみ。所有者の無い (未ログインで作成した) 結果はリンクを知っていれば読める。 */
    readForUser(id: string, userId: string | undefined): FullAuditResult | null {
      const stored = load(id);
      if (!stored) return null;
      const owner = ownerOf(id, stored);
      if (owner && owner !== userId) return null;
      return toPublic(stored);
    },

    /** 呼び出し側で認可済み (例: 本人のプロジェクト履歴に含まれる ID) の場合だけ使う。 */
    readInternal(id: string): FullAuditResult | null {
      const stored = load(id);
      return stored ? toPublic(stored) : null;
    },
  };
}
