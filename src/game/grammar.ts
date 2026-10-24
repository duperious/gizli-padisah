const VOWELS = new Set(["a", "e", "ı", "i", "o", "ö", "u", "ü"]);
const BACK_VOWELS = new Set(["a", "ı", "o", "u"]);

function lower(name: string): string {
  return name.trim().toLocaleLowerCase("tr-TR");
}

function lastVowel(name: string): string {
  const value = lower(name);
  for (let index = value.length - 1; index >= 0; index -= 1) {
    const char = value[index]!;
    if (VOWELS.has(char)) return char;
  }
  return "e";
}

function endsWithVowel(name: string): boolean {
  const value = lower(name);
  return VOWELS.has(value[value.length - 1] ?? "");
}

function suffix(name: string, front: string, back: string, buffer: string): string {
  const harmony = BACK_VOWELS.has(lastVowel(name)) ? back : front;
  return `${name}'${endsWithVowel(name) ? buffer : ""}${harmony}`;
}

/** Belirtme durumu: Bilge Elçi'yi, Poyraz Nişancı'yı, Demir Muhafız'ı. */
export function accusative(name: string): string {
  return suffix(name, "i", "ı", "y");
}

/** Yönelme durumu: Bilge Elçi'ye, Poyraz Nişancı'ya, Demir Muhafız'a. */
export function dative(name: string): string {
  return suffix(name, "e", "a", "y");
}

/** Tamlayan durumu: Bilge Elçi'nin, Poyraz Nişancı'nın, Demir Muhafız'ın. */
export function genitive(name: string): string {
  return suffix(name, "in", "ın", "n");
}
