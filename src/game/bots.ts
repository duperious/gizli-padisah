import { alivePlayers, eligibleNominees } from "./engine";
import type { Action, GameState, Player, Policy } from "./types";

export interface BotMove {
  playerId: string;
  action: Action;
}

/**
 * Bot kararları deterministik bir karışımla verilir; böylece test edilebilir ve
 * aynı oda durumunda öngörülebilir kalır. Botlar yalnızca kendi rollerinin
 * bildiği bilgiyi kullanır: Islahatçı kimseyi tanımaz, Saraylılar Padişah'ı ve
 * birbirini tanır, 7+ oyunda Padişah yandaşlarını bilmez.
 */
function hash(input: string): number {
  let value = 0x811c9dc5;
  for (let index = 0; index < input.length; index += 1) {
    value ^= input.charCodeAt(index);
    value = Math.imul(value, 0x01000193);
  }
  return value >>> 0;
}

function random01(state: GameState, actorId: string, salt: string): number {
  return hash(`${state.rng}:${state.seq}:${actorId}:${salt}`) / 0x100000000;
}

function choose<T>(
  items: readonly T[],
  state: GameState,
  actorId: string,
  salt: string,
): T {
  const index = Math.floor(random01(state, actorId, salt) * items.length);
  return items[Math.min(index, items.length - 1)]!;
}

function knownAlly(state: GameState, viewer: Player, other: Player): boolean {
  if (viewer.role === "liberal" || other.role === "liberal") return false;
  if (viewer.role === "hitler" && state.players.length > 6) return false;
  return true;
}

function teammatePool(
  state: GameState,
  viewer: Player,
  players: Player[],
): Player[] {
  return players.filter((player) => knownAlly(state, viewer, player));
}

function decideVote(state: GameState, voter: Player, nominee: Player): boolean {
  const roll = random01(state, voter.id, "vote");

  if (voter.role === "liberal") {
    return roll < (state.tracker >= 2 ? 0.9 : 0.72);
  }

  const ally = knownAlly(state, voter, nominee);
  if (ally && nominee.role === "hitler" && state.fascist >= 3) return true;
  if (ally) return roll < 0.85;
  return roll < (state.tracker >= 2 ? 0.25 : 0.4);
}

function discardIndex(state: GameState, hand: Policy[], actor: Player): number {
  const wanted = actor.role === "liberal" ? "fascist" : "liberal";
  const index = hand.indexOf(wanted);
  return index >= 0 ? index : Math.floor(random01(state, actor.id, "discard") * hand.length);
}

function enactMove(
  state: GameState,
  chancellor: Player,
  hand: Policy[],
): BotMove {
  const wanted = chancellor.role === "liberal" ? "liberal" : "fascist";
  const index = hand.indexOf(wanted);
  if (index >= 0) {
    return { playerId: chancellor.id, action: { type: "enact", index } };
  }
  if (
    state.fascist >= 5 &&
    !state.vetoRequested &&
    random01(state, chancellor.id, "veto") < 0.3
  ) {
    return { playerId: chancellor.id, action: { type: "vetoRequest" } };
  }
  return { playerId: chancellor.id, action: { type: "enact", index: 0 } };
}

function presidentMove(state: GameState, president: Player): BotMove | null {
  if (state.phase === "nominate") {
    const eligible = eligibleNominees(state);
    if (eligible.length === 0) return null;

    let pool = eligible;
    if (president.role !== "liberal") {
      const allies = teammatePool(state, president, eligible);
      const hitler = eligible.find((player) => player.role === "hitler");
      if (state.fascist >= 3 && hitler) {
        pool = [hitler];
      } else if (
        allies.length > 0 &&
        random01(state, president.id, "nominate-ally") < 0.62
      ) {
        pool = allies;
      }
    }
    const target = choose(pool, state, president.id, "nominate");
    return { playerId: president.id, action: { type: "nominate", target: target.id } };
  }

  if (state.phase === "president_discard") {
    const hand = state.presidentHand;
    if (!hand) return null;
    return {
      playerId: president.id,
      action: { type: "discard", index: discardIndex(state, hand, president) },
    };
  }

  if (state.phase === "veto_response") {
    const accept = random01(state, president.id, "veto-response") < 0.45;
    return { playerId: president.id, action: { type: "vetoResponse", accept } };
  }

  if (state.phase === "power_investigate_result" || state.phase === "power_peek") {
    return { playerId: president.id, action: { type: "ack" } };
  }

  if (
    state.phase !== "power_investigate" &&
    state.phase !== "power_special" &&
    state.phase !== "power_execute"
  ) {
    return null;
  }

  const targets = alivePlayers(state).filter((player) => player.id !== president.id);
  if (targets.length === 0) return null;

  let pool = targets;
  if (president.role !== "liberal") {
    const allies = teammatePool(state, president, targets);
    if (state.phase === "power_special" && allies.length > 0) {
      pool = allies;
    }
    if (state.phase === "power_investigate") {
      const enemies = targets.filter((player) => !knownAlly(state, president, player));
      if (enemies.length > 0) pool = enemies;
    }
    if (state.phase === "power_execute") {
      const enemies = targets.filter(
        (player) => !knownAlly(state, president, player) && player.role !== "hitler",
      );
      const nonHitler = targets.filter((player) => player.role !== "hitler");
      if (enemies.length > 0) pool = enemies;
      else if (nonHitler.length > 0) pool = nonHitler;
    }
  }

  const target = choose(pool, state, president.id, state.phase);
  if (state.phase === "power_investigate") {
    return { playerId: president.id, action: { type: "investigate", target: target.id } };
  }
  if (state.phase === "power_special") {
    return { playerId: president.id, action: { type: "special", target: target.id } };
  }
  return { playerId: president.id, action: { type: "execute", target: target.id } };
}

export function nextBotMove(state: GameState): BotMove | null {
  if (state.phase === "lobby" || state.phase === "ended" || state.phase === "vote_result") {
    return null;
  }

  if (state.phase === "vote") {
    const voter = alivePlayers(state).find(
      (player) => player.isBot && !(player.id in state.votes),
    );
    const nominee = state.players.find((player) => player.id === state.nomineeId);
    if (!voter || !nominee) return null;
    return {
      playerId: voter.id,
      action: { type: "vote", value: decideVote(state, voter, nominee) },
    };
  }

  if (state.phase === "chancellor_enact") {
    const chancellor = state.players.find((player) => player.id === state.chancellorId);
    if (!chancellor?.isBot || !chancellor.alive || !state.chancellorHand) return null;
    return enactMove(state, chancellor, state.chancellorHand);
  }

  const president = state.players.find((player) => player.id === state.presidentId);
  if (!president?.isBot || !president.alive) return null;
  return presidentMove(state, president);
}
