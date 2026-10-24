/** Oyunun çekirdek tipleri. İçeride İngilizce anahtarlar, arayüzde Türkçe etiketler. */

export type Policy = "liberal" | "fascist";
export type Party = "liberal" | "fascist";
export type Role = Party | "hitler";
export type Power = "investigate" | "special" | "peek" | "execute";
export type Pace = "sakin" | "normal" | "hizli";

export type Phase =
  | "lobby"
  | "nominate"
  | "vote"
  | "vote_result"
  | "president_discard"
  | "chancellor_enact"
  | "veto_response"
  | "power_investigate"
  | "power_investigate_result"
  | "power_peek"
  | "power_special"
  | "power_execute"
  | "ended";

export type WinReason = "policies" | "hitler" | "executed";

export interface Player {
  id: string;
  name: string;
  avatar: string;
  token: string;
  role: Role;
  alive: boolean;
  connected: boolean;
  ready: boolean;
  joinedAt: number;
}

export interface GameSettings {
  pace: Pace;
}

export interface LogEntry {
  id: string;
  at: number;
  kind: "info" | "election" | "policy" | "power" | "death" | "system";
  text: string;
}

export interface ChatEntry {
  id: string;
  at: number;
  playerId: string;
  name: string;
  text: string;
  system?: boolean;
}

export interface GameState {
  code: string;
  seq: number;
  createdAt: number;
  updatedAt: number;
  phase: Phase;
  settings: GameSettings;
  players: Player[];
  hostId: string;

  round: number;
  presidentId: string | null;
  chancellorId: string | null;
  nomineeId: string | null;
  votes: Record<string, boolean>;
  votesRevealed: boolean;

  deck: Policy[];
  discard: Policy[];
  liberal: number;
  fascist: number;
  tracker: number;

  lastElectedPresident: string | null;
  lastElectedChancellor: string | null;

  presidentHand: Policy[] | null;
  chancellorHand: Policy[] | null;
  vetoRequested: boolean;

  power: Power | null;
  peeked: Policy[] | null;
  investigate: { targetId: string; party: Party } | null;
  specialNext: string | null;

  winner: Party | null;
  winReason: WinReason | null;
  log: LogEntry[];
  chat: ChatEntry[];

  phaseEndsAt: number | null;
  endedAt: number | null;
  rng: number;
}

export type Action =
  | { type: "ready"; value: boolean }
  | { type: "pace"; pace: Pace }
  | { type: "start" }
  | { type: "nominate"; target: string }
  | { type: "vote"; value: boolean }
  | { type: "discard"; index: number }
  | { type: "enact"; index: number }
  | { type: "vetoRequest" }
  | { type: "vetoResponse"; accept: boolean }
  | { type: "ack" }
  | { type: "investigate"; target: string }
  | { type: "special"; target: string }
  | { type: "execute"; target: string }
  | { type: "chat"; text: string }
  | { type: "rematch" };
