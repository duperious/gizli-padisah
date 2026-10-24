import type { Pace, Party, Phase, Policy, Power, Role, WinReason } from "./types";

export const ROLE_LABEL: Record<Role, string> = {
  liberal: "Barışçıl",
  fascist: "Saldırgan",
  hitler: "Savaş Çığırtkanı",
};

export const ROLE_TAGLINE: Record<Role, string> = {
  liberal: "Barışı koru",
  fascist: "Saldırganları zafere taşı",
  hitler: "Gizli lider",
};

export const PARTY_LABEL: Record<Party, string> = {
  liberal: "Barışçıl",
  fascist: "Saldırgan",
};

export const POLICY_LABEL: Record<Policy, string> = {
  liberal: "Barış Kararı",
  fascist: "Savaş Kararı",
};

export const POWER_LABEL: Record<Power, string> = {
  investigate: "Soruşturma",
  special: "Özel Seçim",
  peek: "İstihbarat",
  execute: "Tutuklama",
};

export const POWER_DESCRIPTION: Record<Power, string> = {
  investigate: "Bir oyuncunun hangi tarafta olduğunu öğren.",
  special: "Bir sonraki Konsey Başkanı'nı sen seç.",
  peek: "Destenin en üstündeki 3 kararı gör.",
  execute: "Bir oyuncuyu Konsey'den sonsuza dek çıkar.",
};

export const PHASE_LABEL: Record<Phase, string> = {
  lobby: "Konsey toplanıyor",
  nominate: "Aday gösteriliyor",
  vote: "Oylama",
  vote_result: "Seçim sonucu",
  president_discard: "Başkan karar eliyor",
  chancellor_enact: "Bakan karar seçiyor",
  veto_response: "Veto kararı",
  power_investigate: "Soruşturma",
  power_investigate_result: "Soruşturma sonucu",
  power_peek: "İstihbarat",
  power_special: "Özel Seçim",
  power_execute: "Tutuklama",
  ended: "Konsey kapandı",
};

export const PACE_LABEL: Record<Pace, string> = {
  sakin: "Sakin",
  normal: "Normal",
  hizli: "Hızlı",
};

export const WIN_REASON_LABEL: Record<WinReason, string> = {
  policies: "Beş Barış Kararı ya da altı Savaş Kararı",
  hitler: "Savaş Çığırtkanı, Savaş Bakanı seçildi",
  executed: "Savaş Çığırtkanı tutuklandı",
};

export const TEAM_NAME: Record<Party, string> = {
  liberal: "Barışçıllar",
  fascist: "Saldırganlar",
};
