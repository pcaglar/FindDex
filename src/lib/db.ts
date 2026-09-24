import fs from 'fs';
import path from 'path';
import { Profile } from '@/types/profile';
import { INITIAL_PROFILES } from './seedData';

const DATA_DIR = path.join(process.cwd(), 'data');
const DATA_FILE = path.join(DATA_DIR, 'vault.json');

function ensureDataFile(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify(INITIAL_PROFILES, null, 2), 'utf-8');
  } else {
    try {
      const content = fs.readFileSync(DATA_FILE, 'utf-8');
      const parsed = JSON.parse(content);
      if (!Array.isArray(parsed) || parsed.length === 0) {
        fs.writeFileSync(DATA_FILE, JSON.stringify(INITIAL_PROFILES, null, 2), 'utf-8');
      }
    } catch {
      fs.writeFileSync(DATA_FILE, JSON.stringify(INITIAL_PROFILES, null, 2), 'utf-8');
    }
  }
}

export function getAllProfiles(): Profile[] {
  ensureDataFile();
  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf-8');
    return JSON.parse(raw) as Profile[];
  } catch (err) {
    console.error('Error reading profiles:', err);
    return INITIAL_PROFILES;
  }
}

export function getProfileById(id: string): Profile | null {
  const profiles = getAllProfiles();
  return profiles.find((p) => p.id === id) || null;
}

export function saveProfiles(profiles: Profile[]): void {
  ensureDataFile();
  // Atomic write via temp file
  const tempFile = `${DATA_FILE}.tmp`;
  fs.writeFileSync(tempFile, JSON.stringify(profiles, null, 2), 'utf-8');
  fs.renameSync(tempFile, DATA_FILE);
}

export function createProfile(data: Omit<Profile, 'id' | 'createdAt' | 'updatedAt'>): Profile {
  const profiles = getAllProfiles();
  const now = new Date().toISOString();
  const newProfile: Profile = {
    ...data,
    id: `fd-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    createdAt: now,
    updatedAt: now,
  };

  profiles.unshift(newProfile);
  saveProfiles(profiles);
  return newProfile;
}

export function updateProfile(id: string, patch: Partial<Profile>): Profile | null {
  const profiles = getAllProfiles();
  const index = profiles.findIndex((p) => p.id === id);
  if (index === -1) return null;

  const updated: Profile = {
    ...profiles[index],
    ...patch,
    id, // protect id
    updatedAt: new Date().toISOString(),
  };

  profiles[index] = updated;
  saveProfiles(profiles);
  return updated;
}

export function deleteProfile(id: string): boolean {
  const profiles = getAllProfiles();
  const filtered = profiles.filter((p) => p.id !== id);
  if (filtered.length === profiles.length) return false;

  saveProfiles(filtered);
  return true;
}

export function resetProfiles(): Profile[] {
  saveProfiles(INITIAL_PROFILES);
  return INITIAL_PROFILES;
}
