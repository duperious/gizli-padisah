export const AVATARS = [
  "🦅",
  "🌙",
  "⚔️",
  "📜",
  "☕",
  "🌷",
  "🐎",
  "🕯️",
  "🎩",
  "🪶",
  "🐈",
  "⚓",
  "🏹",
  "🍇",
  "🦁",
  "🗝️",
] as const;

function randomIndex(max: number): number {
  const bytes = new Uint32Array(1);
  crypto.getRandomValues(bytes);
  return bytes[0]! % max;
}

export function randomAvatar(used: readonly string[] = []): string {
  const free = AVATARS.filter((avatar) => !used.includes(avatar));
  const pool = free.length > 0 ? free : AVATARS;
  return pool[randomIndex(pool.length)]!;
}

export function sanitizeAvatar(value: unknown, used: readonly string[] = []): string {
  if (
    typeof value === "string" &&
    (AVATARS as readonly string[]).includes(value)
  ) {
    return value;
  }
  return randomAvatar(used);
}
