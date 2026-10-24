const ADJECTIVES = [
  "Sessiz",
  "Kurnaz",
  "Cesur",
  "Yorgun",
  "Gizli",
  "Şafak",
  "Gece",
  "Altın",
  "Demir",
  "Poyraz",
  "Kızıl",
  "Mavi",
  "Bilge",
  "Hızlı",
  "Sarp",
  "Tatlı",
];

const NOUNS = [
  "Kâtip",
  "Bakan",
  "Derya",
  "Lale",
  "Simurg",
  "Kervan",
  "Tuğrul",
  "Zümrüt",
  "Kılıç",
  "Karar",
  "Baykuş",
  "Yıldız",
  "Kahve",
  "Atlas",
  "Çınar",
  "Pusula",
];

export function randomName(): string {
  const bytes = new Uint32Array(2);
  crypto.getRandomValues(bytes);
  const adjective = ADJECTIVES[bytes[0]! % ADJECTIVES.length]!;
  const noun = NOUNS[bytes[1]! % NOUNS.length]!;
  return `${adjective} ${noun}`;
}

/** Botların isimleri; insan oyuncularla çakışırsa motor sonuna sayı ekler. */
export const BOT_NAMES = [
  "Gölge Subay",
  "Kurnaz Subay",
  "Demir Muhafız",
  "Bilge Elçi",
  "Poyraz Nişancı",
  "Gizli Elçi",
  "Altın Subay",
  "Gece Muhafızı",
  "Zümrüt Bakan",
  "Sessiz Çavuş",
] as const;
