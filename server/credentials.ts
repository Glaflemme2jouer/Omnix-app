import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { isPostgresEnabled, kvGet, kvSet } from './db.ts';

const DATA_DIR = path.resolve(process.cwd(), '.data');
const CREDS_PATH = path.join(DATA_DIR, 'credentials.json');
const KV_KEY = 'member_credentials';

export interface MemberCredential {
  email: string;
  salt: string;
  passwordHash: string;
  updatedAt: string;
}

let cachedCreds: Record<string, MemberCredential> | null = null;

function readLocalCredentialsMap(): Record<string, MemberCredential> {
  try {
    if (!fs.existsSync(CREDS_PATH)) {
      return {};
    }
    const raw = fs.readFileSync(CREDS_PATH, 'utf-8');
    const parsed = JSON.parse(raw) as Record<string, MemberCredential>;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function loadCredentialsMap(): Record<string, MemberCredential> {
  if (isPostgresEnabled()) {
    return cachedCreds || {};
  }
  const local = readLocalCredentialsMap();
  cachedCreds = local;
  return local;
}

async function saveCredentialsMap(map: Record<string, MemberCredential>): Promise<void> {
  cachedCreds = structuredClone(map);

  if (isPostgresEnabled()) {
    await kvSet(KV_KEY, cachedCreds);
    return;
  }

  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  const tmpPath = `${CREDS_PATH}.tmp`;
  fs.writeFileSync(tmpPath, JSON.stringify(map, null, 2), { encoding: 'utf-8', mode: 0o600 });
  fs.renameSync(tmpPath, CREDS_PATH);
}

export async function initCredentialsStore(): Promise<void> {
  if (isPostgresEnabled()) {
    const existing = await kvGet<Record<string, MemberCredential>>(KV_KEY);
    if (existing && typeof existing === 'object') {
      cachedCreds = existing;
    } else {
      const seed = fs.existsSync(CREDS_PATH) ? readLocalCredentialsMap() : {};
      cachedCreds = seed;
      await kvSet(KV_KEY, cachedCreds);
    }
    return;
  }

  cachedCreds = readLocalCredentialsMap();
}

function hashPassword(password: string, salt: string): string {
  return crypto.scryptSync(password, salt, 64).toString('hex');
}

export async function setMemberPassword(email: string, password: string): Promise<void> {
  const normalized = email.trim().toLowerCase();
  const salt = crypto.randomBytes(16).toString('hex');
  const passwordHash = hashPassword(password, salt);
  const map = { ...loadCredentialsMap() };
  map[normalized] = {
    email: normalized,
    salt,
    passwordHash,
    updatedAt: new Date().toISOString(),
  };
  await saveCredentialsMap(map);
}

export function verifyMemberPassword(email: string, password: string): boolean {
  const normalized = email.trim().toLowerCase();
  const map = loadCredentialsMap();
  const entry = map[normalized];
  if (!entry || !entry.salt || !entry.passwordHash) {
    return false;
  }
  const candidate = hashPassword(password, entry.salt);
  const candBuf = Buffer.from(candidate, 'hex');
  const storedBuf = Buffer.from(entry.passwordHash, 'hex');
  if (candBuf.length !== storedBuf.length) {
    return false;
  }
  return crypto.timingSafeEqual(candBuf, storedBuf);
}

export function hasMemberPassword(email: string): boolean {
  const normalized = email.trim().toLowerCase();
  const map = loadCredentialsMap();
  return Boolean(map[normalized]?.passwordHash);
}

export async function deleteMemberPassword(email: string): Promise<void> {
  const normalized = email.trim().toLowerCase();
  const map = { ...loadCredentialsMap() };
  if (map[normalized]) {
    delete map[normalized];
    await saveCredentialsMap(map);
  }
}
