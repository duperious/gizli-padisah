const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function makeRoomCode(length = 5): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  let code = "";
  for (const byte of bytes) code += ALPHABET[byte % ALPHABET.length];
  return code;
}

export function normalizeCode(raw: string): string {
  return raw
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 5);
}

export function isValidCode(code: string): boolean {
  return (
    code.length === 5 &&
    [...code].every((char) => ALPHABET.includes(char))
  );
}

export function peerIdFor(code: string): string {
  return `gizli-padisah-v1-${code.toLowerCase()}`;
}

export function roomUrl(code: string): string {
  const url = new URL(window.location.href);
  url.hash = `#/oda/${code}`;
  return url.toString();
}
