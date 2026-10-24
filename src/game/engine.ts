import {
  PHASE_LABEL,
  POLICY_LABEL,
  POWER_LABEL,
  ROLE_LABEL,
} from "./labels";
import { AVATARS } from "./avatars";
import { BOT_NAMES } from "./names";
import type {
  Action,
  GameState,
  LogEntry,
  Pace,
  Party,
  Player,
  Policy,
  Power,
  Role,
  WinReason,
} from "./types";

export class GameError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GameError";
  }
}

export const MIN_PLAYERS = 5;
export const MAX_PLAYERS = 10;

const TIMERS: Record<
  Pace,
  { nominate: number; vote: number; legislative: number; power: number }
> = {
  sakin: { nominate: 150, vote: 90, legislative: 90, power: 90 },
  normal: { nominate: 100, vote: 60, legislative: 60, power: 60 },
  hizli: { nominate: 60, vote: 35, legislative: 40, power: 35 },
};

const RESULT_SECONDS = 7;

let uidCounter = 0;
function uid(prefix: string): string {
  uidCounter += 1;
  return `${prefix}_${Date.now().toString(36)}_${uidCounter.toString(36)}_${Math.random()
    .toString(36)
    .slice(2, 6)}`;
}

export function nextRand(state: GameState): number {
  state.rng = (state.rng + 0x6d2b79f5) >>> 0;
  let t = state.rng;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

function shuffle<T>(items: T[], state: GameState): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(nextRand(state) * (i + 1));
    const tmp = copy[i]!;
    copy[i] = copy[j]!;
    copy[j] = tmp;
  }
  return copy;
}

function pickOne<T>(items: T[], state: GameState): T {
  return items[Math.floor(nextRand(state) * items.length)]!;
}

function addLog(state: GameState, kind: LogEntry["kind"], text: string, now: number) {
  state.log.push({ id: uid("l"), at: now, kind, text });
  if (state.log.length > 120) state.log.splice(0, state.log.length - 120);
}

function addSystemChat(state: GameState, text: string, now: number) {
  state.chat.push({
    id: uid("c"),
    at: now,
    playerId: "",
    name: "Divan",
    text,
    system: true,
  });
  trimChat(state);
}

function trimChat(state: GameState) {
  if (state.chat.length > 120) state.chat.splice(0, state.chat.length - 120);
}

export function sanitizeName(raw: string): string {
  const name = raw
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 18);
  if (name.length < 2) throw new GameError("İsim en az 2 karakter olmalı.");
  return name;
}

function lower(s: string): string {
  return s.toLocaleLowerCase("tr-TR");
}

function uniqueName(state: GameState, requested: string): string {
  let name = requested;
  let n = 2;
  while (state.players.some((p) => lower(p.name) === lower(name))) {
    name = `${requested} ${n}`;
    n += 1;
  }
  return name;
}

export function createLobby(
  code: string,
  host: { name: string; avatar: string },
  now = Date.now(),
  rng?: number,
): GameState {
  const player: Player = {
    id: uid("p"),
    name: sanitizeName(host.name),
    avatar: host.avatar,
    token: uid("t"),
    role: "liberal",
    alive: true,
    connected: true,
    ready: true,
    isBot: false,
    joinedAt: now,
  };
  return {
    code,
    seq: 0,
    createdAt: now,
    updatedAt: now,
    phase: "lobby",
    settings: { pace: "normal" },
    players: [player],
    hostId: player.id,
    round: 0,
    presidentId: null,
    chancellorId: null,
    nomineeId: null,
    votes: {},
    votesRevealed: false,
    deck: [],
    discard: [],
    liberal: 0,
    fascist: 0,
    tracker: 0,
    lastElectedPresident: null,
    lastElectedChancellor: null,
    presidentHand: null,
    chancellorHand: null,
    vetoRequested: false,
    power: null,
    peeked: null,
    investigate: null,
    specialNext: null,
    winner: null,
    winReason: null,
    log: [],
    chat: [],
    phaseEndsAt: null,
    endedAt: null,
    rng: (rng ?? (now ^ Math.floor(Math.random() * 0xffffffff))) >>> 0,
  };
}

export function addPlayer(
  prev: GameState,
  input: { name: string; avatar: string },
  now = Date.now(),
): { state: GameState; player: Player } {
  if (prev.phase !== "lobby") {
    throw new GameError("Oyun başladı; yeni oyuncu alınamıyor.");
  }
  if (prev.players.length >= MAX_PLAYERS) {
    throw new GameError("Divan dolu (en fazla 10 oyuncu).");
  }
  const state = structuredClone(prev);
  state.seq += 1;
  state.updatedAt = now;
  const player: Player = {
    id: uid("p"),
    name: uniqueName(state, sanitizeName(input.name)),
    avatar: input.avatar,
    token: uid("t"),
    role: "liberal",
    alive: true,
    connected: true,
    ready: false,
    isBot: false,
    joinedAt: now,
  };
  state.players.push(player);
  addSystemChat(state, `${player.name} divana katıldı.`, now);
  return { state, player };
}

export function removePlayer(prev: GameState, playerId: string, now = Date.now()): GameState {
  if (prev.phase !== "lobby") {
    throw new GameError("Oyun sırasında oyuncu çıkarılamaz.");
  }
  if (playerId === prev.hostId) {
    throw new GameError("Divan sahibi odadan çıkarılamaz.");
  }
  const state = structuredClone(prev);
  const player = state.players.find((p) => p.id === playerId);
  if (!player) return state;
  state.players = state.players.filter((p) => p.id !== playerId);
  state.seq += 1;
  state.updatedAt = now;
  addSystemChat(state, `${player.name} divandan ayrıldı.`, now);
  return state;
}

function addBotsToState(state: GameState, count: number, now: number): void {
  if (state.phase !== "lobby") {
    throw new GameError("Botlar yalnızca lobide eklenebilir.");
  }
  if (!Number.isInteger(count) || count < 1) {
    throw new GameError("Geçersiz bot sayısı.");
  }
  if (state.players.length + count > MAX_PLAYERS) {
    throw new GameError(`Divan dolu (en fazla ${MAX_PLAYERS} oyuncu).`);
  }

  const existingBots = state.players.filter((p) => p.isBot).length;
  const added: Player[] = [];
  for (let index = 0; index < count; index += 1) {
    const used = state.players.map((p) => p.avatar);
    const avatar =
      AVATARS.find((candidate) => !used.includes(candidate)) ??
      AVATARS[(existingBots + index) % AVATARS.length]!;
    const player: Player = {
      id: uid("p"),
      name: uniqueName(state, BOT_NAMES[(existingBots + index) % BOT_NAMES.length]!),
      avatar,
      token: uid("t"),
      role: "liberal",
      alive: true,
      connected: true,
      ready: true,
      isBot: true,
      joinedAt: now + index,
    };
    state.players.push(player);
    added.push(player);
  }
  if (added.length === 1) {
    addSystemChat(state, `${added[0]!.name} divana katıldı. (bot)`, now);
  } else {
    addSystemChat(state, `${added.length} bot divana katıldı.`, now);
  }
}

function removeBotFromState(state: GameState, targetId: string, now: number): void {
  if (state.phase !== "lobby") {
    throw new GameError("Botlar yalnızca lobide çıkarılabilir.");
  }
  const bot = state.players.find((p) => p.id === targetId);
  if (!bot || !bot.isBot) {
    throw new GameError("Bu oyuncu bir bot değil.");
  }
  state.players = state.players.filter((p) => p.id !== targetId);
  addSystemChat(state, `${bot.name} divandan ayrıldı. (bot)`, now);
}

export function addBots(prev: GameState, count: number, now = Date.now()): GameState {
  const state = structuredClone(prev);
  state.seq += 1;
  state.updatedAt = now;
  addBotsToState(state, count, now);
  return state;
}

export function removeBot(prev: GameState, targetId: string, now = Date.now()): GameState {
  const state = structuredClone(prev);
  const bot = state.players.find((p) => p.id === targetId);
  if (!bot || !bot.isBot) {
    throw new GameError("Bu oyuncu bir bot değil.");
  }
  state.seq += 1;
  state.updatedAt = now;
  removeBotFromState(state, targetId, now);
  return state;
}

export function markConnected(
  prev: GameState,
  playerId: string,
  connected: boolean,
  now = Date.now(),
): GameState {
  const current = prev.players.find((p) => p.id === playerId);
  if (!current || current.connected === connected) return prev;
  const state = structuredClone(prev);
  const player = state.players.find((p) => p.id === playerId);
  if (!player) return prev;
  player.connected = connected;
  state.seq += 1;
  state.updatedAt = now;
  if (state.phase === "lobby") {
    addSystemChat(
      state,
      connected ? `${player.name} geri döndü.` : `${player.name}'in bağlantısı koptu.`,
      now,
    );
  }
  return state;
}

function getPlayer(state: GameState, id: string): Player {
  const player = state.players.find((p) => p.id === id);
  if (!player) throw new GameError("Oyuncu bulunamadı.");
  return player;
}

function requireHost(state: GameState, actor: Player) {
  if (actor.id !== state.hostId) throw new GameError("Bu hamle yalnızca Divan sahibine ait.");
}

function requireAlive(actor: Player) {
  if (!actor.alive) throw new GameError("Divan'dan çıkarıldın; bu hamleyi yapamazsın.");
}

function requirePhase(state: GameState, ...phases: GameState["phase"][]) {
  if (!phases.includes(state.phase)) {
    throw new GameError("Bu hamle şu an yapılamaz.");
  }
}

export function partyOf(role: Role): Party {
  return role === "liberal" ? "liberal" : "fascist";
}

export function fascistCountFor(playerCount: number): number {
  if (playerCount <= 6) return 1;
  if (playerCount <= 8) return 2;
  return 3;
}

export function powerFor(playerCount: number, fascistPolicies: number): Power | null {
  if (fascistPolicies < 1 || fascistPolicies > 5) return null;
  if (playerCount <= 6) {
    if (fascistPolicies === 3) return "peek";
    if (fascistPolicies === 4 || fascistPolicies === 5) return "execute";
    return null;
  }
  if (playerCount <= 8) {
    if (fascistPolicies === 2) return "investigate";
    if (fascistPolicies === 3) return "special";
    if (fascistPolicies === 4 || fascistPolicies === 5) return "execute";
    return null;
  }
  if (fascistPolicies === 1 || fascistPolicies === 2) return "investigate";
  if (fascistPolicies === 3) return "special";
  if (fascistPolicies === 4 || fascistPolicies === 5) return "execute";
  return null;
}

/** Tahtadaki 1..6 numaralı ferman yuvalarının yetkileri (0 kullanılmaz). */
export function boardPowers(playerCount: number): (Power | null)[] {
  const slots: (Power | null)[] = [null];
  for (let i = 1; i <= 6; i += 1) slots.push(powerFor(playerCount, i));
  return slots;
}

function setPhase(state: GameState, phase: GameState["phase"], now: number) {
  state.phase = phase;
  const t = TIMERS[state.settings.pace];
  let seconds: number | null = null;
  switch (phase) {
    case "nominate":
      seconds = t.nominate;
      break;
    case "vote":
      seconds = t.vote;
      break;
    case "vote_result":
      seconds = RESULT_SECONDS;
      break;
    case "president_discard":
    case "chancellor_enact":
    case "veto_response":
      seconds = t.legislative;
      break;
    case "power_investigate":
    case "power_investigate_result":
    case "power_peek":
    case "power_special":
    case "power_execute":
      seconds = t.power;
      break;
    default:
      seconds = null;
  }
  state.phaseEndsAt = seconds === null ? null : now + seconds * 1000;
}

function ensureDeck(state: GameState, needed: number, now: number) {
  if (state.deck.length >= needed) return;
  const merged = shuffle([...state.deck, ...state.discard], state);
  state.deck = merged;
  state.discard = [];
  addLog(state, "system", "Deste tükendi; atılan fermanlar yeniden karıştırıldı.", now);
}

function drawOne(state: GameState, now: number): Policy {
  ensureDeck(state, 1, now);
  const card = state.deck.pop();
  if (!card) throw new GameError("Destede kart kalmadı.");
  return card;
}

function nextAliveId(state: GameState, currentId: string | null): string | null {
  const alive = state.players.filter((p) => p.alive);
  if (alive.length === 0) return null;
  if (!currentId) return alive[0]!.id;
  const index = state.players.findIndex((p) => p.id === currentId);
  for (let step = 1; step <= state.players.length; step += 1) {
    const candidate = state.players[(index + step) % state.players.length]!;
    if (candidate.alive) return candidate.id;
  }
  return alive[0]!.id;
}

export function eligibleNominees(state: GameState): Player[] {
  if (!state.presidentId) return [];
  const alive = state.players.filter((p) => p.alive);
  const termLimitWaived = alive.length <= 5;
  return alive.filter((p) => {
    if (p.id === state.presidentId) return false;
    if (p.id === state.lastElectedChancellor) return false;
    if (!termLimitWaived && p.id === state.lastElectedPresident) return false;
    return true;
  });
}

export function alivePlayers(state: GameState): Player[] {
  return state.players.filter((p) => p.alive);
}

function beginNomination(state: GameState, now: number) {
  state.nomineeId = null;
  state.chancellorId = null;
  state.votes = {};
  state.votesRevealed = false;
  state.presidentHand = null;
  state.chancellorHand = null;
  state.vetoRequested = false;
  state.power = null;
  state.peeked = null;
  state.investigate = null;
  state.specialNext = null;
  setPhase(state, "nominate", now);
}

function beginRound(state: GameState, now: number, specialPresidentId?: string) {
  state.round += 1;
  state.presidentId = specialPresidentId ?? nextAliveId(state, state.presidentId);
  beginNomination(state, now);
}

function startGame(state: GameState, now: number) {
  const n = state.players.length;
  if (n < MIN_PLAYERS) throw new GameError(`En az ${MIN_PLAYERS} oyuncu gerekli.`);
  if (n > MAX_PLAYERS) throw new GameError(`En fazla ${MAX_PLAYERS} oyuncu oynayabilir.`);
  if (state.players.some((p) => !p.ready)) {
    throw new GameError("Herkes hazır olmadan Divan açılmaz.");
  }
  if (state.players.some((p) => !p.connected)) {
    throw new GameError("Bağlantısı kopan oyuncu var. Herkesin dönmesini bekle.");
  }

  const extraFascists = fascistCountFor(n);
  const roles: Role[] = [
    ...Array<Role>(n - extraFascists - 1).fill("liberal"),
    ...Array<Role>(extraFascists).fill("fascist"),
    "hitler",
  ];
  const dealt = shuffle(roles, state);

  state.deck = shuffle(
    [
      ...Array<Policy>(6).fill("liberal"),
      ...Array<Policy>(11).fill("fascist"),
    ],
    state,
  );
  state.discard = [];
  state.liberal = 0;
  state.fascist = 0;
  state.tracker = 0;
  state.round = 1;
  state.lastElectedPresident = null;
  state.lastElectedChancellor = null;
  state.winner = null;
  state.winReason = null;
  state.endedAt = null;
  state.log = [];
  state.power = null;
  state.peeked = null;
  state.investigate = null;
  state.specialNext = null;
  state.votes = {};
  state.votesRevealed = false;
  state.presidentHand = null;
  state.chancellorHand = null;
  state.vetoRequested = false;

  state.players.forEach((player, index) => {
    player.role = dealt[index]!;
    player.alive = true;
    player.ready = false;
  });

  state.presidentId = pickOne(state.players, state).id;
  beginNomination(state, now);
  const botCount = state.players.filter((player) => player.isBot).length;
  addLog(
    state,
    "system",
    `Divan toplandı: ${n} oyuncu${botCount > 0 ? ` (${botCount} bot)` : ""}, ${
      extraFascists + 1
    } Saraylı.`,
    now,
  );
  addLog(
    state,
    "info",
    `İlk Reis ${getPlayer(state, state.presidentId!).name}. Vezir adayını bekliyoruz.`,
    now,
  );
}

function startLegislative(state: GameState, now: number) {
  ensureDeck(state, 3, now);
  state.presidentHand = [drawOne(state, now), drawOne(state, now), drawOne(state, now)];
  state.chancellorHand = null;
  setPhase(state, "president_discard", now);
  addLog(
    state,
    "info",
    `Reis ${getPlayer(state, state.presidentId!).name} ve Vezir ${getPlayer(
      state,
      state.chancellorId!,
    ).name} yasama için çekildi.`,
    now,
  );
}

function endGame(state: GameState, winner: Party, reason: WinReason, now: number) {
  state.phase = "ended";
  state.winner = winner;
  state.winReason = reason;
  state.endedAt = now;
  state.phaseEndsAt = null;
  state.presidentHand = null;
  state.chancellorHand = null;
  state.peeked = null;
  state.investigate = null;
  state.power = null;
  addLog(
    state,
    "system",
    winner === "liberal" ? "Islahatçılar kazandı. Divan nefes aldı." : "Saraylılar kazandı. Fermanlar yürürlükte.",
    now,
  );
}

function enactPolicy(
  state: GameState,
  policy: Policy,
  now: number,
  chaos = false,
): boolean {
  if (policy === "liberal") state.liberal += 1;
  else state.fascist += 1;

  addLog(
    state,
    "policy",
    `${POLICY_LABEL[policy]} yürürlüğe girdi. (Islahat ${state.liberal}/5 · Ferman ${state.fascist}/6)`,
    now,
  );

  if (state.liberal >= 5) {
    endGame(state, "liberal", "policies", now);
    return true;
  }
  if (state.fascist >= 6) {
    endGame(state, "fascist", "policies", now);
    return true;
  }

  if (!chaos && policy === "fascist") {
    const power = powerFor(state.players.length, state.fascist);
    if (power) {
      startPower(state, power, now);
      return true;
    }
  }
  return false;
}

function startPower(state: GameState, power: Power, now: number) {
  state.power = power;
  state.peeked = null;
  state.investigate = null;
  if (power === "peek") {
    ensureDeck(state, 3, now);
    state.peeked = state.deck.slice(-3).reverse();
    setPhase(state, "power_peek", now);
  } else if (power === "investigate") {
    setPhase(state, "power_investigate", now);
  } else if (power === "special") {
    setPhase(state, "power_special", now);
  } else {
    setPhase(state, "power_execute", now);
  }
  addLog(
    state,
    "power",
    `Reis ${getPlayer(state, state.presidentId!).name} yetki kullanıyor: ${POWER_LABEL[power]}.`,
    now,
  );
}

function finishVote(state: GameState, now: number) {
  const alive = alivePlayers(state);
  for (const player of alive) {
    if (!(player.id in state.votes)) state.votes[player.id] = false;
  }
  const yes = Object.values(state.votes).filter(Boolean).length;
  const no = alive.length - yes;
  state.votesRevealed = true;
  setPhase(state, "vote_result", now);
  addLog(state, "election", `Oylama bitti: ${yes} Evet, ${no} Hayır.`, now);
}

function resolveVoteResult(state: GameState, now: number) {
  const alive = alivePlayers(state);
  const yes = Object.values(state.votes).filter(Boolean).length;
  const no = alive.length - yes;
  const nomineeId = state.nomineeId;
  if (!nomineeId) return;
  const nominee = getPlayer(state, nomineeId);

  if (yes > no) {
    state.chancellorId = nomineeId;
    state.lastElectedPresident = state.presidentId;
    state.lastElectedChancellor = nomineeId;
    state.tracker = 0;
    addLog(state, "election", `Seçim geçti: ${nominee.name} Vezir oldu.`, now);

    if (nominee.role === "hitler" && state.fascist >= 3) {
      endGame(state, "fascist", "hitler", now);
      return;
    }
    startLegislative(state, now);
    return;
  }

  state.chancellorId = null;
  addLog(state, "election", `Seçim düştü. ${nominee.name} Vezir olamadı.`, now);
  failElection(state, now);
}

function failElection(state: GameState, now: number) {
  state.tracker += 1;
  addLog(state, "election", `Seçim sayacı ${state.tracker}/3.`, now);

  if (state.tracker >= 3) {
    state.tracker = 0;
    state.lastElectedPresident = null;
    state.lastElectedChancellor = null;
    addLog(
      state,
      "policy",
      "Üç seçim üst üste düştü; destenin üstündeki ferman yürürlüğe giriyor.",
      now,
    );
    const card = drawOne(state, now);
    if (enactPolicy(state, card, now, true)) return;
  }
  beginRound(state, now);
}

function actNominate(state: GameState, actor: Player, targetId: string, now: number) {
  requirePhase(state, "nominate");
  requireAlive(actor);
  if (state.presidentId !== actor.id) throw new GameError("Adayı yalnızca Reis gösterir.");
  const target = getPlayer(state, targetId);
  if (!eligibleNominees(state).some((p) => p.id === target.id)) {
    throw new GameError("Bu oyuncu aday olamaz (dönem sınırı veya hayatta değil).");
  }
  state.nomineeId = target.id;
  addLog(state, "election", `${actor.name}, ${target.name}'i Vezirliğe aday gösterdi.`, now);
  setPhase(state, "vote", now);
}

function actVote(state: GameState, actor: Player, value: boolean, now: number) {
  requirePhase(state, "vote");
  requireAlive(actor);
  if (actor.id in state.votes) throw new GameError("Zaten oy verdin.");
  state.votes[actor.id] = value;
  const alive = alivePlayers(state);
  if (alive.every((p) => p.id in state.votes)) {
    finishVote(state, now);
  }
}

function actDiscard(state: GameState, actor: Player, index: number, now: number) {
  requirePhase(state, "president_discard");
  if (actor.id !== state.presidentId) throw new GameError("Fermanı yalnızca Reis eler.");
  const hand = state.presidentHand;
  if (!hand || index < 0 || index >= hand.length) throw new GameError("Geçersiz ferman.");
  const discarded = hand[index]!;
  const remaining = hand.filter((_, i) => i !== index);
  state.presidentHand = null;
  state.chancellorHand = remaining;
  state.discard.push(discarded);
  addLog(state, "info", "Reis bir fermanı eledi.", now);
  setPhase(state, "chancellor_enact", now);
}

function actEnact(state: GameState, actor: Player, index: number, now: number) {
  requirePhase(state, "chancellor_enact");
  if (actor.id !== state.chancellorId) throw new GameError("Fermanı yalnızca Vezir seçer.");
  const hand = state.chancellorHand;
  if (!hand || index < 0 || index >= hand.length) throw new GameError("Geçersiz ferman.");
  const chosen = hand[index]!;
  const other = hand[1 - index]!;
  state.chancellorHand = null;
  state.discard.push(other);
  if (!enactPolicy(state, chosen, now)) {
    beginRound(state, now);
  }
}

function actVetoRequest(state: GameState, actor: Player, now: number) {
  requirePhase(state, "chancellor_enact");
  if (state.fascist < 5) throw new GameError("Veto henüz açılmadı.");
  if (actor.id !== state.chancellorId) throw new GameError("Vetoyu yalnızca Vezir ister.");
  if (state.vetoRequested) throw new GameError("Veto hakkı bu tur kullanıldı.");
  state.vetoRequested = true;
  addLog(state, "power", `${actor.name} veto istedi. Karar Reis'te.`, now);
  setPhase(state, "veto_response", now);
}

function actVetoResponse(state: GameState, actor: Player, accept: boolean, now: number) {
  requirePhase(state, "veto_response");
  if (actor.id !== state.presidentId) throw new GameError("Veto kararını yalnızca Reis verir.");
  if (!accept) {
    addLog(state, "election", "Veto reddedildi; Vezir fermanlardan birini seçmek zorunda.", now);
    setPhase(state, "chancellor_enact", now);
    return;
  }

  if (state.chancellorHand) state.discard.push(...state.chancellorHand);
  state.chancellorHand = null;
  state.tracker += 1;
  addLog(state, "election", "Veto kabul edildi; iki ferman da geri çevrildi.", now);

  if (state.tracker >= 3) {
    state.tracker = 0;
    state.lastElectedPresident = null;
    state.lastElectedChancellor = null;
    addLog(
      state,
      "policy",
      "Üçüncü kez tıkandı; destenin üstündeki ferman yürürlüğe giriyor.",
      now,
    );
    const card = drawOne(state, now);
    if (enactPolicy(state, card, now, true)) return;
  }
  beginRound(state, now);
}

function finishPower(state: GameState, now: number) {
  state.peeked = null;
  state.investigate = null;
  state.power = null;
  beginRound(state, now);
}

function actAck(state: GameState, actor: Player, now: number) {
  if (state.phase !== "power_peek" && state.phase !== "power_investigate_result") {
    throw new GameError("Onaylanacak bir yetki yok.");
  }
  if (actor.id !== state.presidentId) throw new GameError("Yetkiyi yalnızca Reis kapatır.");
  finishPower(state, now);
}

function actInvestigate(state: GameState, actor: Player, targetId: string, now: number) {
  requirePhase(state, "power_investigate");
  if (actor.id !== state.presidentId) throw new GameError("Teftişi yalnızca Reis yapar.");
  const target = getPlayer(state, targetId);
  if (!target.alive || target.id === actor.id) throw new GameError("Geçersiz hedef.");
  state.investigate = { targetId: target.id, party: partyOf(target.role) };
  addLog(state, "power", `${actor.name}, ${target.name}'i teftiş etti.`, now);
  setPhase(state, "power_investigate_result", now);
}

function actSpecial(state: GameState, actor: Player, targetId: string, now: number) {
  requirePhase(state, "power_special");
  if (actor.id !== state.presidentId) throw new GameError("Fermanı yalnızca Reis kullanır.");
  const target = getPlayer(state, targetId);
  if (!target.alive || target.id === actor.id) throw new GameError("Geçersiz hedef.");
  addLog(
    state,
    "power",
    `${actor.name}, Ferman-ı Şahane ile ${target.name}'i bir sonraki Reis ilan etti.`,
    now,
  );
  beginRound(state, now, target.id);
}

function actExecute(state: GameState, actor: Player, targetId: string, now: number) {
  requirePhase(state, "power_execute");
  if (actor.id !== state.presidentId) throw new GameError("Kalebend'i yalnızca Reis uygular.");
  const target = getPlayer(state, targetId);
  if (!target.alive || target.id === actor.id) throw new GameError("Geçersiz hedef.");
  target.alive = false;
  addLog(state, "death", `${actor.name}, ${target.name}'i kalebende gönderdi.`, now);
  if (target.role === "hitler") {
    endGame(state, "liberal", "executed", now);
    return;
  }
  beginRound(state, now);
}

export function apply(
  prev: GameState,
  actorId: string,
  action: Action,
  now = Date.now(),
): GameState {
  const state = structuredClone(prev);
  state.updatedAt = now;
  state.seq += 1;
  const actor = getPlayer(state, actorId);

  switch (action.type) {
    case "ready": {
      requirePhase(state, "lobby");
      if (actor.id === state.hostId && !action.value) {
        throw new GameError("Divan sahibi hazır olmadan duramaz.");
      }
      actor.ready = action.value;
      break;
    }
    case "addBots": {
      requirePhase(state, "lobby");
      requireHost(state, actor);
      addBotsToState(state, action.count, now);
      break;
    }
    case "removeBot": {
      requirePhase(state, "lobby");
      requireHost(state, actor);
      removeBotFromState(state, action.target, now);
      break;
    }
    case "pace": {
      requirePhase(state, "lobby");
      requireHost(state, actor);
      state.settings.pace = action.pace;
      addLog(state, "system", `Oyun temposu: ${action.pace}.`, now);
      break;
    }
    case "start": {
      requirePhase(state, "lobby");
      requireHost(state, actor);
      startGame(state, now);
      break;
    }
    case "nominate":
      actNominate(state, actor, action.target, now);
      break;
    case "vote":
      actVote(state, actor, action.value, now);
      break;
    case "discard":
      actDiscard(state, actor, action.index, now);
      break;
    case "enact":
      actEnact(state, actor, action.index, now);
      break;
    case "vetoRequest":
      actVetoRequest(state, actor, now);
      break;
    case "vetoResponse":
      actVetoResponse(state, actor, action.accept, now);
      break;
    case "ack":
      actAck(state, actor, now);
      break;
    case "investigate":
      actInvestigate(state, actor, action.target, now);
      break;
    case "special":
      actSpecial(state, actor, action.target, now);
      break;
    case "execute":
      actExecute(state, actor, action.target, now);
      break;
    case "chat": {
      const text = action.text.replace(/\s+/g, " ").trim().slice(0, 240);
      if (!text) throw new GameError("Boş mesaj gönderilemez.");
      state.chat.push({
        id: uid("c"),
        at: now,
        playerId: actor.id,
        name: actor.name,
        text,
      });
      trimChat(state);
      break;
    }
    case "rematch": {
      requirePhase(state, "ended");
      requireHost(state, actor);
      state.phase = "lobby";
      state.round = 0;
      state.presidentId = null;
      state.chancellorId = null;
      state.nomineeId = null;
      state.votes = {};
      state.votesRevealed = false;
      state.deck = [];
      state.discard = [];
      state.liberal = 0;
      state.fascist = 0;
      state.tracker = 0;
      state.lastElectedPresident = null;
      state.lastElectedChancellor = null;
      state.presidentHand = null;
      state.chancellorHand = null;
      state.vetoRequested = false;
      state.power = null;
      state.peeked = null;
      state.investigate = null;
      state.specialNext = null;
      state.winner = null;
      state.winReason = null;
      state.phaseEndsAt = null;
      state.endedAt = null;
      state.log = [];
      state.players.forEach((p) => {
        p.alive = true;
        p.ready = p.isBot || p.id === state.hostId;
        p.role = "liberal";
      });
      addSystemChat(state, "Yeni divan kuruldu. Hazır olanlar bekleniyor.", now);
      break;
    }
    default: {
      const exhaustive: never = action;
      throw new GameError(`Bilinmeyen hamle: ${JSON.stringify(exhaustive)}`);
    }
  }

  return state;
}

/** Süre dolduğunda otomatik hamleyi çalıştırır. Değişiklik yoksa null döner. */
export function tick(prev: GameState, now = Date.now()): GameState | null {
  if (!prev.phaseEndsAt || now < prev.phaseEndsAt) return null;
  if (prev.phase === "lobby" || prev.phase === "ended") return null;

  const state = structuredClone(prev);
  state.updatedAt = now;
  state.seq += 1;

  switch (state.phase) {
    case "nominate": {
      const candidates = eligibleNominees(state);
      if (candidates.length === 0) {
        beginRound(state, now);
        break;
      }
      const target = pickOne(candidates, state);
      const president = getPlayer(state, state.presidentId!);
      addLog(state, "system", "Süre doldu; Reis otomatik aday gösterdi.", now);
      actNominate(state, president, target.id, now);
      break;
    }
    case "vote": {
      addLog(state, "system", "Süre doldu; oy vermeyenler Hayır sayıldı.", now);
      finishVote(state, now);
      break;
    }
    case "vote_result": {
      resolveVoteResult(state, now);
      break;
    }
    case "president_discard": {
      const hand = state.presidentHand;
      if (!hand) break;
      const president = getPlayer(state, state.presidentId!);
      const index = Math.floor(nextRand(state) * hand.length);
      addLog(state, "system", "Süre doldu; Reis otomatik ferman eledi.", now);
      actDiscard(state, president, index, now);
      break;
    }
    case "chancellor_enact": {
      const hand = state.chancellorHand;
      if (!hand) break;
      const chancellor = getPlayer(state, state.chancellorId!);
      const index = Math.floor(nextRand(state) * hand.length);
      addLog(state, "system", "Süre doldu; Vezir otomatik ferman seçti.", now);
      actEnact(state, chancellor, index, now);
      break;
    }
    case "veto_response": {
      const president = getPlayer(state, state.presidentId!);
      addLog(state, "system", "Süre doldu; Reis vetoyu reddetti.", now);
      actVetoResponse(state, president, false, now);
      break;
    }
    case "power_investigate": {
      const targets = alivePlayers(state).filter((p) => p.id !== state.presidentId);
      const president = getPlayer(state, state.presidentId!);
      if (targets.length === 0) {
        finishPower(state, now);
        break;
      }
      const target = pickOne(targets, state);
      addLog(state, "system", "Süre doldu; Reis otomatik teftiş yaptı.", now);
      actInvestigate(state, president, target.id, now);
      break;
    }
    case "power_investigate_result":
    case "power_peek": {
      const president = getPlayer(state, state.presidentId!);
      actAck(state, president, now);
      break;
    }
    case "power_special": {
      const targets = alivePlayers(state).filter((p) => p.id !== state.presidentId);
      const president = getPlayer(state, state.presidentId!);
      if (targets.length === 0) {
        finishPower(state, now);
        break;
      }
      const target = pickOne(targets, state);
      addLog(state, "system", "Süre doldu; Reis otomatik seçim yaptı.", now);
      actSpecial(state, president, target.id, now);
      break;
    }
    case "power_execute": {
      const targets = alivePlayers(state).filter((p) => p.id !== state.presidentId);
      const president = getPlayer(state, state.presidentId!);
      if (targets.length === 0) {
        finishPower(state, now);
        break;
      }
      const target = pickOne(targets, state);
      addLog(state, "system", "Süre doldu; Reis otomatik kalebend uyguladı.", now);
      actExecute(state, president, target.id, now);
      break;
    }
    default:
      return null;
  }

  return state;
}

export function phaseLabel(state: GameState): string {
  return PHASE_LABEL[state.phase];
}

export function roleLabel(role: Role): string {
  return ROLE_LABEL[role];
}
