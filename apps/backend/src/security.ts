import crypto from 'node:crypto';

const PREFIX = 'enc:v1:';

function encryptionKey(): Buffer {
  const secret = process.env.ENCRYPTION_MASTER_KEY;
  if (!secret || secret === 'replace-with-32-byte-hex-key') {
    throw new Error('ENCRYPTION_MASTER_KEY が設定されていません');
  }
  return /^[0-9a-f]{64}$/i.test(secret)
    ? Buffer.from(secret, 'hex')
    : crypto.scryptSync(secret, 'seo-analyzer:v1', 32);
}

export function encryptSecret(value: string): string {
  if (!value || value.startsWith(PREFIX)) return value;
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  return `${PREFIX}${iv.toString('base64url')}:${cipher.getAuthTag().toString('base64url')}:${encrypted.toString('base64url')}`;
}

export function decryptSecret(value?: string): string | undefined {
  if (!value || !value.startsWith(PREFIX)) return value;
  const [, , ivText, tagText, encryptedText] = value.split(':');
  if (!ivText || !tagText || !encryptedText) throw new Error('暗号化データの形式が不正です');
  const decipher = crypto.createDecipheriv('aes-256-gcm', encryptionKey(), Buffer.from(ivText, 'base64url'));
  decipher.setAuthTag(Buffer.from(tagText, 'base64url'));
  return Buffer.concat([
    decipher.update(Buffer.from(encryptedText, 'base64url')),
    decipher.final(),
  ]).toString('utf8');
}

export function hashToken(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex');
}

export function safeEqual(left?: string, right?: string): boolean {
  if (!left || !right) return false;
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
