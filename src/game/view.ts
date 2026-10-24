import { boardPowers, eligibleNominees, partyOf } from "./engine";
import type {
  ChatEntry,
  GameSettings,
  GameState,
  LogEntry,
  Party,
  Policy,
  Power,
  Role,
  WinReason,
} from "./types";

export interface ClientPlayer {
  id: string;
  name: string;
  avatar: string;
  alive: boolean;
  connected: boolean;
  ready: boolean;
  isHost: boolean;
  isBot: boolean;
  isPresident: boolean;
  isChancellor: boolean;
  isNominee: boolean;
  role: Role | null;
}

export interface YouView {
  id: string;
  name: string;
  avatar: string;
  role: Role | null;
  party: Party | null;
  teammates: string[];
  alive: boolean;
  isHost: boolean;
  isPresident: boolean;
  isChancellor: boolean;
  isNominee: boolean;
  hand: Policy[] | null;
  peeked: Policy[] | null;
  investigate: { targetId: string; party: Party } | null;
  can: {
    ready: boolean;
    start: boolean;
    pace: boolean;
    nominate: boolean;
    vote: boolean;
    discard: boolean;
    enact: boolean;
    veto: boolean;
    vetoResponse: boolean;
    ack: boolean;
    investigate: boolean;
    special: boolean;
    execute: boolean;
    rematch: boolean;
  };
}

export interface ClientState {
  code: string;
  seq: number;
  phase: GameState["phase"];
  settings: GameSettings;
  players: ClientPlayer[];
  hostId: string;
  round: number;
  presidentId: string | null;
  chancellorId: string | null;
  nomineeId: string | null;
  board: {
    liberal: number;
    fascist: number;
    tracker: number;
    vetoUnlocked: boolean;
    powers: (Power | null)[];
  };
  deckCount: number;
  discardCount: number;
  votes: {
    voted: string[];
    revealed: Record<string, boolean> | null;
  };
  eligible: string[];
  lastElectedPresident: string | null;
  lastElectedChancellor: string | null;
  power: Power | null;
  winner: Party | null;
  winReason: WinReason | null;
  reveal: { id: string; name: string; role: Role }[] | null;
  chat: ChatEntry[];
  log: LogEntry[];
  phaseEndsAt: number | null;
  serverNow: number;
  you: YouView;
}

function teammatesOf(state: GameState, viewerId: string): string[] {
  const viewer = state.players.find((p) => p.id === viewerId);
  if (!viewer) return [];
  if (viewer.role === "liberal") return [];
  if (viewer.role === "fascist") {
    return state.players
      .filter(
        (p) =>
          p.id !== viewer.id && (p.role === "fascist" || p.role === "hitler"),
      )
      .map((p) => p.id);
  }
  // Savaş Çığırtkanı: 5-6 kişilik oyunda yandaşlarını bilir.
  if (state.players.length <= 6) {
    return state.players
      .filter((p) => p.role === "fascist")
      .map((p) => p.id);
  }
  return [];
}

export function project(
  state: GameState,
  viewerId: string,
  now = Date.now(),
): ClientState {
  const viewer = state.players.find((p) => p.id === viewerId);
  if (!viewer) throw new Error("project: oyuncu bulunamadı");

  const ended = state.phase === "ended";
  const isPresident = state.presidentId === viewer.id;
  const isChancellor = state.chancellorId === viewer.id;
  const isNominee = state.nomineeId === viewer.id;
  const fascist = state.fascist;
  const playerCount = state.players.length;

  const hand =
    viewer.id === state.presidentId && state.phase === "president_discard"
      ? state.presidentHand
      : viewer.id === state.chancellorId &&
          (state.phase === "chancellor_enact" || state.phase === "veto_response")
        ? state.chancellorHand
        : null;

  const peeked = isPresident && state.phase === "power_peek" ? state.peeked : null;
  const investigate =
    isPresident && state.phase === "power_investigate_result"
      ? state.investigate
      : null;

  const voted = Object.keys(state.votes);
  const lobby = state.phase === "lobby";

  return {
    code: state.code,
    seq: state.seq,
    phase: state.phase,
    settings: state.settings,
    players: state.players.map((p) => ({
      id: p.id,
      name: p.name,
      avatar: p.avatar,
      alive: p.alive,
      connected: p.connected,
      ready: p.ready,
      isHost: p.id === state.hostId,
      isBot: Boolean(p.isBot),
      isPresident: p.id === state.presidentId,
      isChancellor: p.id === state.chancellorId,
      isNominee: p.id === state.nomineeId,
      role: ended ? p.role : null,
    })),
    hostId: state.hostId,
    round: state.round,
    presidentId: state.presidentId,
    chancellorId: state.chancellorId,
    nomineeId: state.nomineeId,
    board: {
      liberal: state.liberal,
      fascist: state.fascist,
      tracker: state.tracker,
      vetoUnlocked: state.fascist >= 5,
      powers: boardPowers(playerCount),
    },
    deckCount: state.deck.length,
    discardCount: state.discard.length,
    votes: {
      voted,
      revealed: state.votesRevealed ? { ...state.votes } : null,
    },
    eligible:
      state.phase === "nominate" ? eligibleNominees(state).map((p) => p.id) : [],
    lastElectedPresident: state.lastElectedPresident,
    lastElectedChancellor: state.lastElectedChancellor,
    power: state.power,
    winner: state.winner,
    winReason: state.winReason,
    reveal: ended
      ? state.players.map((p) => ({ id: p.id, name: p.name, role: p.role }))
      : null,
    chat: state.chat,
    log: state.log,
    phaseEndsAt: state.phaseEndsAt,
    serverNow: now,
    you: {
      id: viewer.id,
      name: viewer.name,
      avatar: viewer.avatar,
      role: lobby ? null : viewer.role,
      party: lobby ? null : partyOf(viewer.role),
      teammates: lobby ? [] : teammatesOf(state, viewer.id),
      alive: viewer.alive,
      isHost: viewer.id === state.hostId,
      isPresident,
      isChancellor,
      isNominee,
      hand: hand ?? null,
      peeked,
      investigate,
      can: {
        ready: lobby,
        start:
          lobby &&
          viewer.id === state.hostId &&
          playerCount >= 5 &&
          state.players.every((p) => p.ready && p.connected),
        pace: lobby && viewer.id === state.hostId,
        nominate: state.phase === "nominate" && isPresident,
        vote:
          state.phase === "vote" &&
          viewer.alive &&
          !Object.prototype.hasOwnProperty.call(state.votes, viewer.id),
        discard: state.phase === "president_discard" && isPresident,
        enact: state.phase === "chancellor_enact" && isChancellor,
        veto:
          state.phase === "chancellor_enact" &&
          isChancellor &&
          fascist >= 5 &&
          !state.vetoRequested,
        vetoResponse: state.phase === "veto_response" && isPresident,
        ack:
          (state.phase === "power_peek" ||
            state.phase === "power_investigate_result") &&
          isPresident,
        investigate: state.phase === "power_investigate" && isPresident,
        special: state.phase === "power_special" && isPresident,
        execute: state.phase === "power_execute" && isPresident,
        rematch: ended && viewer.id === state.hostId,
      },
    },
  };
}

export function targetsForPower(state: ClientState, power: Power | null): string[] {
  if (!power) return [];
  const alive = state.players.filter((p) => p.alive && p.id !== state.you.id);
  if (power === "special" || power === "execute" || power === "investigate") {
    return alive.map((p) => p.id);
  }
  return [];
}
