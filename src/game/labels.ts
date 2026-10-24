import type { Pace, Party, Phase, Policy, Power, Role, WinReason } from "./types";

export const ROLE_LABEL: Record<Role, string> = {
  liberal: "Islahatçı",
  fascist: "Saraylı",
  hitler: "Padişah",
};

export const ROLE_TAGLINE: Record<Role, string> = {
  liberal: "Divan'ı ayakta tut",
  fascist: "Saray'ı yükselt",
  hitler: "Gizli lider",
};

export const PARTY_LABEL: Record<Party, string> = {
  liberal: "Islahatçı",
  fascist: "Saraylı",
};

export const POLICY_LABEL: Record<Policy, string> = {
  liberal: "Islahat",
  fascist: "Ferman",
};

export const POWER_LABEL: Record<Power, string> = {
  investigate: "Teftiş",
  special: "Ferman-ı Şahane",
  peek: "İstihbarat",
  execute: "Kalebend",
};

export const POWER_DESCRIPTION: Record<Power, string> = {
  investigate: "Bir oyuncunun hangi tarafta olduğunu öğren.",
  special: "Bir sonraki Reis'i sen seç.",
  peek: "Destenin en üstündeki 3 kartı gör.",
  execute: "Bir oyuncuyu Divan'dan sonsuza dek çıkar.",
};

export const PHASE_LABEL: Record<Phase, string> = {
  lobby: "Divan toplanıyor",
  nominate: "Aday gösteriliyor",
  vote: "Oylama",
  vote_result: "Seçim sonucu",
  president_discard: "Reis ferman eliyor",
  chancellor_enact: "Vezir ferman seçiyor",
  veto_response: "Veto kararı",
  power_investigate: "Teftiş",
  power_investigate_result: "Teftiş sonucu",
  power_peek: "İstihbarat",
  power_special: "Ferman-ı Şahane",
  power_execute: "Kalebend",
  ended: "Divan kapandı",
};

export const PACE_LABEL: Record<Pace, string> = {
  sakin: "Sakin",
  normal: "Normal",
  hizli: "Hızlı",
};

export const WIN_REASON_LABEL: Record<WinReason, string> = {
  policies: "Beş Islahat ya da altı Ferman",
  hitler: "Padişah Vezir seçildi",
  executed: "Padişah kalebende gönderildi",
};

export const TEAM_NAME: Record<Party, string> = {
  liberal: "Islahatçılar",
  fascist: "Saraylılar",
};
