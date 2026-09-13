import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { AlertSettings, TeamMember, ApiKeyRecord } from '@seo/shared';

const settingsDir = path.resolve(process.cwd(), '.data', 'settings');
try {
  fs.mkdirSync(settingsDir, { recursive: true });
} catch {}

const ALERTS_FILE = path.join(settingsDir, 'alerts.json');
const TEAM_FILE = path.join(settingsDir, 'team.json');
const API_KEYS_FILE = path.join(settingsDir, 'api-keys.json');

// 1. アラート設定
const defaultAlerts: AlertSettings = {
  enabled: true,
  scoreThreshold: 75,
  notifyOnBrokenLinks: true,
  brokenLinkThreshold: 3,
  webhookUrl: '',
  slackChannel: '#seo-alerts',
  emailNotifications: false,
  notificationEmail: '',
};

export function getAlertSettings(): AlertSettings {
  try {
    if (fs.existsSync(ALERTS_FILE)) {
      return { ...defaultAlerts, ...JSON.parse(fs.readFileSync(ALERTS_FILE, 'utf8')) };
    }
  } catch {}
  return defaultAlerts;
}

export function saveAlertSettings(settings: Partial<AlertSettings>): AlertSettings {
  const current = getAlertSettings();
  const updated: AlertSettings = { ...current, ...settings };
  try {
    fs.writeFileSync(ALERTS_FILE, JSON.stringify(updated, null, 2), 'utf8');
  } catch {}
  return updated;
}

// 2. チームメンバー管理
const defaultTeam: TeamMember[] = [
  {
    id: 'usr_owner_01',
    name: 'プロジェクトオーナー',
    email: 'admin@n-n.tokyo',
    role: 'admin',
    status: 'active',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'usr_analyst_02',
    name: 'SEO アナリスト',
    email: 'analyst@n-n.tokyo',
    role: 'analyst',
    status: 'active',
    createdAt: new Date().toISOString(),
  },
];

export function listTeamMembers(): TeamMember[] {
  try {
    if (fs.existsSync(TEAM_FILE)) {
      return JSON.parse(fs.readFileSync(TEAM_FILE, 'utf8'));
    }
  } catch {}
  return defaultTeam;
}

export function addTeamMember(name: string, email: string, role: TeamMember['role']): TeamMember {
  const members = listTeamMembers();
  const newMember: TeamMember = {
    id: `usr_${Date.now().toString(36)}`,
    name,
    email,
    role,
    status: 'invited',
    createdAt: new Date().toISOString(),
  };
  members.push(newMember);
  try {
    fs.writeFileSync(TEAM_FILE, JSON.stringify(members, null, 2), 'utf8');
  } catch {}
  return newMember;
}

export function removeTeamMember(id: string): boolean {
  let members = listTeamMembers();
  if (members.length <= 1) return false;
  members = members.filter((m) => m.id !== id);
  try {
    fs.writeFileSync(TEAM_FILE, JSON.stringify(members, null, 2), 'utf8');
  } catch {}
  return true;
}

// 3. APIキー管理
export function listApiKeys(): ApiKeyRecord[] {
  try {
    if (fs.existsSync(API_KEYS_FILE)) {
      const keys: ApiKeyRecord[] = JSON.parse(fs.readFileSync(API_KEYS_FILE, 'utf8'));
      return keys.map((k) => ({
        id: k.id,
        name: k.name,
        keyPrefix: k.keyPrefix,
        scopes: k.scopes,
        createdAt: k.createdAt,
        lastUsedAt: k.lastUsedAt,
      }));
    }
  } catch {}
  return [
    {
      id: 'key_default_01',
      name: '本番CI/CD連携トークン',
      keyPrefix: 'seo_live_9f82...',
      scopes: ['read', 'write'],
      createdAt: new Date().toISOString(),
      lastUsedAt: new Date().toISOString(),
    },
  ];
}

export function createApiKey(name: string, scopes: ('read' | 'write' | 'admin')[]): ApiKeyRecord {
  const keys = listApiKeys();
  const rawKey = `seo_${crypto.randomBytes(24).toString('hex')}`;
  const keyPrefix = `${rawKey.slice(0, 12)}...`;
  const record: ApiKeyRecord = {
    id: `key_${Date.now().toString(36)}`,
    name,
    keyPrefix,
    fullKey: rawKey,
    scopes,
    createdAt: new Date().toISOString(),
  };
  keys.push({ ...record, fullKey: undefined });
  try {
    fs.writeFileSync(API_KEYS_FILE, JSON.stringify(keys, null, 2), 'utf8');
  } catch {}
  return record;
}

export function revokeApiKey(id: string): boolean {
  let keys = listApiKeys();
  keys = keys.filter((k) => k.id !== id);
  try {
    fs.writeFileSync(API_KEYS_FILE, JSON.stringify(keys, null, 2), 'utf8');
  } catch {}
  return true;
}
