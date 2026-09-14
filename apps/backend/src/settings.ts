import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { AlertSettings, TeamMember, ApiKeyRecord } from '@seo/shared';
import { hashToken, safeEqual } from './security.js';

const settingsDir = path.resolve(process.cwd(), '.data', 'settings');
fs.mkdirSync(settingsDir, { recursive: true });

const ownerKey = (ownerId: string) => crypto.createHash('sha256').update(ownerId).digest('hex');
const fileFor = (ownerId: string, kind: string) => path.join(settingsDir, `${ownerKey(ownerId)}-${kind}.json`);
const readJson = <T>(file: string, fallback: T): T => {
  try { return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : fallback; } catch { return fallback; }
};
const writeJson = (file: string, value: unknown) => fs.writeFileSync(file, JSON.stringify(value, null, 2), { encoding: 'utf8', mode: 0o600 });

const defaultAlerts: AlertSettings = {
  enabled: false,
  scoreThreshold: 75,
  notifyOnBrokenLinks: true,
  brokenLinkThreshold: 3,
  webhookUrl: '',
  slackChannel: '',
  emailNotifications: false,
  notificationEmail: '',
};

export function getAlertSettings(ownerId: string): AlertSettings {
  const { __ownerId: _ownerId, ...stored } = readJson<Record<string, unknown>>(fileFor(ownerId, 'alerts'), {});
  return { ...defaultAlerts, ...stored } as AlertSettings;
}

export function saveAlertSettings(ownerId: string, settings: Partial<AlertSettings>): AlertSettings {
  const updated = { ...getAlertSettings(ownerId), ...settings };
  writeJson(fileFor(ownerId, 'alerts'), { ...updated, __ownerId: ownerId });
  return updated;
}

export function listEnabledAlertOwners(): string[] {
  const owners = new Set<string>();
  for (const file of fs.readdirSync(settingsDir).filter((name) => name.endsWith('-alerts.json'))) {
    const stored = readJson<Record<string, unknown>>(path.join(settingsDir, file), {});
    if (stored.enabled === true && typeof stored.__ownerId === 'string') owners.add(stored.__ownerId);
  }
  return [...owners];
}

export function listTeamMembers(ownerId: string, owner?: { name: string; email: string }): TeamMember[] {
  const stored = readJson<TeamMember[]>(fileFor(ownerId, 'team'), []);
  if (stored.length || !owner) return stored;
  return [{ id: ownerId, name: owner.name, email: owner.email, role: 'admin', status: 'active', createdAt: new Date().toISOString() }];
}

export function addTeamMember(ownerId: string, name: string, email: string, role: TeamMember['role'], owner?: { name: string; email: string }): TeamMember {
  const members = listTeamMembers(ownerId, owner);
  if (members.some((member) => member.email.toLowerCase() === email.toLowerCase())) throw new Error('このメールアドレスは既に追加されています');
  const member: TeamMember = { id: `usr_${crypto.randomBytes(8).toString('hex')}`, name, email: email.toLowerCase(), role, status: 'invited', createdAt: new Date().toISOString() };
  writeJson(fileFor(ownerId, 'team'), [...members, member]);
  return member;
}

export function removeTeamMember(ownerId: string, id: string): boolean {
  const members = listTeamMembers(ownerId);
  const target = members.find((member) => member.id === id);
  if (!target || target.role === 'admin') return false;
  writeJson(fileFor(ownerId, 'team'), members.filter((member) => member.id !== id));
  return true;
}

interface StoredApiKey extends ApiKeyRecord { tokenHash: string; ownerId: string }
const storedKeys = (ownerId: string): StoredApiKey[] => readJson(fileFor(ownerId, 'api-keys'), []);

export function listApiKeys(ownerId: string): ApiKeyRecord[] {
  return storedKeys(ownerId).map(({ tokenHash: _tokenHash, ownerId: _ownerId, fullKey: _fullKey, ...key }) => key);
}

export function createApiKey(ownerId: string, name: string, scopes: ('read' | 'write' | 'admin')[]): ApiKeyRecord {
  const rawKey = `seo_${crypto.randomBytes(32).toString('base64url')}`;
  const record: StoredApiKey = {
    id: `key_${crypto.randomBytes(8).toString('hex')}`,
    name,
    keyPrefix: `${rawKey.slice(0, 12)}...`,
    fullKey: undefined,
    tokenHash: hashToken(rawKey),
    ownerId,
    scopes,
    createdAt: new Date().toISOString(),
  };
  writeJson(fileFor(ownerId, 'api-keys'), [...storedKeys(ownerId), record]);
  return {
    id: record.id,
    name: record.name,
    keyPrefix: record.keyPrefix,
    fullKey: rawKey,
    scopes: record.scopes,
    createdAt: record.createdAt,
  };
}

export function revokeApiKey(ownerId: string, id: string): boolean {
  const keys = storedKeys(ownerId);
  if (!keys.some((key) => key.id === id)) return false;
  writeJson(fileFor(ownerId, 'api-keys'), keys.filter((key) => key.id !== id));
  return true;
}

export function verifyApiKey(rawKey: string, requiredScope: 'read' | 'write' | 'admin' = 'read'): { ownerId: string; key: ApiKeyRecord } | null {
  for (const file of fs.readdirSync(settingsDir).filter((name) => name.endsWith('-api-keys.json'))) {
    const keys = readJson<StoredApiKey[]>(path.join(settingsDir, file), []);
    const found = keys.find((key) => safeEqual(key.tokenHash, hashToken(rawKey)) && (key.scopes.includes(requiredScope) || key.scopes.includes('admin')));
    if (found) {
      found.lastUsedAt = new Date().toISOString();
      writeJson(path.join(settingsDir, file), keys);
      const { tokenHash: _tokenHash, ownerId: _ownerId, ...key } = found;
      return { ownerId: found.ownerId, key };
    }
  }
  return null;
}
