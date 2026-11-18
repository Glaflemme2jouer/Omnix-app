import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

const DATA_DIR = path.resolve(process.cwd(), '.data');
const CREDS_PATH = path.join(DATA_DIR, 'credentials.json');

export interface MemberCredential {
  email: string;
  salt: string;
  passwordHash: string;
  updatedAt: string;
}

function loadCredentialsMap(): Record<string, MemberCredential> {
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

function saveCredentialsMap(map: Record<string, MemberCredential>): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  const tmpPath = `${CREDS_PATH}.tmp`;
  fs.writeFileSync(tmpPath, JSON.stringify(map, null, 2), { encoding: 'utf-8', mode: 0o600 });
  fs.renameSync(tmpPath, CREDS_PATH);
}

function hashPassword(password: string, salt: string): string {
  return crypto.scryptSync(password, salt, 64).toString('hex');
}

export function setMemberPassword(email: string, password: string): void {
  const normalized = email.trim().toLowerCase();
  const salt = crypto.randomBytes(16).toString('hex');
  const passwordHash = hashPassword(password, salt);
  const map = loadCredentialsMap();
  map[normalized] = {
    email: normalized,
    salt,
    passwordHash,
    updatedAt: new Date().toISOString(),
  };
  saveCredentialsMap(map);
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

export function deleteMemberPassword(email: string): void {
  const normalized = email.trim().toLowerCase();
  const map = loadCredentialsMap();
  if (map[normalized]) {
    delete map[normalized];
    saveCredentialsMap(map);
  }
}
