import type { GameState } from "../game/types";

export interface Profile {
  name: string;
  avatar: string;
}

export interface HostInfo extends Profile {
  createdAt: number;
}

const PREFIX = "gizli-padisah:";

function read<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function write(key: string, value: unknown): void {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    // Depolama dolu veya kapalı; oyun bellek üzerinden devam eder.
  }
}

function remove(key: string): void {
  try {
    localStorage.removeItem(PREFIX + key);
  } catch {
    // yoksay
  }
}

export function getProfile(): Profile | null {
  const profile = read<Profile>("profile");
  if (!profile || typeof profile.name !== "string") return null;
  return profile;
}

export function saveProfile(profile: Profile): void {
  write("profile", profile);
}

export function getHostInfo(code: string): HostInfo | null {
  const info = read<HostInfo>(`host:${code}`);
  if (!info || typeof info.name !== "string") return null;
  return info;
}

export function saveHostInfo(code: string, info: HostInfo): void {
  write(`host:${code}`, info);
}

export function clearHostInfo(code: string): void {
  remove(`host:${code}`);
}

export function getToken(code: string): string | null {
  const token = read<string>(`token:${code}`);
  return typeof token === "string" ? token : null;
}

export function saveToken(code: string, token: string): void {
  write(`token:${code}`, token);
}

export function saveHostState(state: GameState): void {
  write(`state:${state.code}`, { savedAt: Date.now(), state });
}

export function loadHostState(code: string): GameState | null {
  const saved = read<{ savedAt: number; state: GameState }>(`state:${code}`);
  if (!saved?.state) return null;
  const state = saved.state;
  if (state.code !== code || !Array.isArray(state.players) || !state.hostId) {
    remove(`state:${code}`);
    return null;
  }
  if (Date.now() - saved.savedAt > 6 * 60 * 60 * 1000) {
    remove(`state:${code}`);
    return null;
  }
  return state;
}

export function clearHostState(code: string): void {
  remove(`state:${code}`);
}

export function getLastHosted(): { code: string; at: number; name: string } | null {
  const last = read<{ code: string; at: number; name: string }>("last-hosted");
  if (!last || typeof last.code !== "string") return null;
  return last;
}

export function saveLastHosted(code: string, name: string): void {
  write("last-hosted", { code, at: Date.now(), name });
}
