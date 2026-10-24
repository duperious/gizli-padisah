import { describe, expect, it } from "vitest";
import {
  addBots,
  apply,
  createLobby,
  eligibleNominees,
  tick,
} from "../src/game/engine";
import { nextBotMove } from "../src/game/bots";
import type { Action, GameState } from "../src/game/types";

const NOW = 1_700_000_000_000;

function botLobby(botCount = 4): GameState {
  const lobby = createLobby("BOT01", { name: "Konsey Başkanı", avatar: "🦅" }, NOW, 424242);
  return addBots(lobby, botCount, NOW);
}

function botGame(): GameState {
  const lobby = botLobby();
  return apply(lobby, lobby.hostId, { type: "start" }, NOW);
}

function setRoles(state: GameState, roles: Record<string, "liberal" | "fascist" | "hitler">) {
  for (const player of state.players) {
    const role = roles[player.id];
    if (role) player.role = role;
  }
}

function humanMove(state: GameState): Action | null {
  const host = state.players.find((player) => player.id === state.hostId)!;
  switch (state.phase) {
    case "nominate": {
      if (state.presidentId !== host.id) return null;
      const target = eligibleNominees(state)[0];
      return target ? { type: "nominate", target: target.id } : null;
    }
    case "vote":
      if (!host.alive || host.id in state.votes) return null;
      return { type: "vote", value: true };
    case "president_discard":
      return state.presidentId === host.id ? { type: "discard", index: 0 } : null;
    case "chancellor_enact":
      return state.chancellorId === host.id ? { type: "enact", index: 0 } : null;
    case "veto_response":
      return state.presidentId === host.id
        ? { type: "vetoResponse", accept: false }
        : null;
    case "power_investigate": {
      if (state.presidentId !== host.id) return null;
      const target = state.players.find(
        (player) => player.alive && player.id !== host.id,
      );
      return target ? { type: "investigate", target: target.id } : null;
    }
    case "power_peek":
    case "power_investigate_result":
      return state.presidentId === host.id ? { type: "ack" } : null;
    case "power_special":
    case "power_execute": {
      if (state.presidentId !== host.id) return null;
      const target = state.players.find(
        (player) => player.alive && player.id !== host.id,
      );
      if (!target) return null;
      return state.phase === "power_special"
        ? { type: "special", target: target.id }
        : { type: "execute", target: target.id };
    }
    default:
      return null;
  }
}

function botShouldAct(state: GameState): boolean {
  const alive = state.players.filter((player) => player.alive);
  switch (state.phase) {
    case "nominate":
      return (
        Boolean(state.players.find((p) => p.id === state.presidentId)?.isBot) &&
        eligibleNominees(state).length > 0
      );
    case "vote":
      return alive.some((player) => player.isBot && !(player.id in state.votes));
    case "president_discard":
      return Boolean(state.players.find((p) => p.id === state.presidentId)?.isBot);
    case "chancellor_enact":
      return Boolean(state.players.find((p) => p.id === state.chancellorId)?.isBot);
    case "veto_response":
    case "power_investigate_result":
    case "power_peek":
      return Boolean(state.players.find((p) => p.id === state.presidentId)?.isBot);
    case "power_investigate":
    case "power_special":
    case "power_execute":
      return (
        Boolean(state.players.find((p) => p.id === state.presidentId)?.isBot) &&
        alive.some((player) => player.id !== state.presidentId)
      );
    default:
      return false;
  }
}

describe("bot kararları", () => {
  it("lobide ve insan oyuncunun sırasında hamle üretmez", () => {
    const lobby = botLobby();
    expect(nextBotMove(lobby)).toBeNull();

    const state = botGame();
    state.phase = "nominate";
    state.presidentId = state.hostId;
    expect(nextBotMove(state)).toBeNull();
  });

  it("Konsey Başkanı botu geçerli bir aday gösterir", () => {
    const state = botGame();
    const president = state.players.find((player) => player.isBot)!;
    state.phase = "nominate";
    state.presidentId = president.id;
    state.nomineeId = null;
    state.chancellorId = null;

    const move = nextBotMove(state)!;
    expect(move.playerId).toBe(president.id);
    expect(move.action.type).toBe("nominate");
    const next = apply(state, move.playerId, move.action, NOW);
    expect(next.phase).toBe("vote");
    expect(next.nomineeId).not.toBeNull();
  });

  it("tüm botlar sırayla oy verir", () => {
    let state = botGame();
    const president = state.players.find((player) => player.isBot)!;
    state.phase = "nominate";
    state.presidentId = president.id;
    const nominated = nextBotMove(state)!;
    state = apply(state, nominated.playerId, nominated.action, NOW);

    const botVoters = state.players.filter((player) => player.isBot);
    const seen: string[] = [];
    for (;;) {
      const move = nextBotMove(state);
      if (!move) break;
      expect(move.action.type).toBe("vote");
      seen.push(move.playerId);
      state = apply(state, move.playerId, move.action, NOW);
    }
    expect(seen).toHaveLength(botVoters.length);
    expect(new Set(seen).size).toBe(botVoters.length);
    expect(state.phase).toBe("vote");
  });

  it("Barışçıl bot kendi kararını korur, Saldırgan bot karşı kararı atar", () => {
    const base = botGame();
    const liberalBot = base.players.find((player) => player.isBot)!;
    const liberalState = structuredClone(base);
    liberalState.phase = "president_discard";
    liberalState.presidentId = liberalBot.id;
    liberalState.presidentHand = ["liberal", "fascist", "fascist"];
    setRoles(liberalState, { [liberalBot.id]: "liberal" });
    const liberalMove = nextBotMove(liberalState)!;
    expect(liberalMove.action).toEqual({ type: "discard", index: 1 });
    const afterDiscard = apply(
      liberalState,
      liberalMove.playerId,
      liberalMove.action,
      NOW,
    );
    expect(afterDiscard.chancellorHand).toEqual(["liberal", "fascist"]);

    const fascistBot = base.players.filter((player) => player.isBot)[1]!;
    const fascistState = structuredClone(base);
    fascistState.phase = "president_discard";
    fascistState.presidentId = fascistBot.id;
    fascistState.presidentHand = ["fascist", "liberal", "liberal"];
    setRoles(fascistState, { [fascistBot.id]: "fascist" });
    const fascistMove = nextBotMove(fascistState)!;
    expect(fascistMove.action).toEqual({ type: "discard", index: 1 });
  });

  it("Savaş Bakanı botu kendi tarafının kararını yürürlüğe koyar", () => {
    const base = botGame();
    const chancellor = base.players.find((player) => player.isBot)!;

    const liberalState = structuredClone(base);
    liberalState.phase = "chancellor_enact";
    liberalState.chancellorId = chancellor.id;
    liberalState.chancellorHand = ["fascist", "liberal"];
    setRoles(liberalState, { [chancellor.id]: "liberal" });
    const liberalMove = nextBotMove(liberalState)!;
    expect(liberalMove.action).toEqual({ type: "enact", index: 1 });

    const fascistState = structuredClone(base);
    fascistState.phase = "chancellor_enact";
    fascistState.chancellorId = chancellor.id;
    fascistState.chancellorHand = ["liberal", "fascist"];
    setRoles(fascistState, { [chancellor.id]: "fascist" });
    const fascistMove = nextBotMove(fascistState)!;
    expect(fascistMove.action).toEqual({ type: "enact", index: 1 });
  });

  it("veto reddedildikten sonra bot yeniden veto istemez", () => {
    const state = botGame();
    const chancellor = state.players.find((player) => player.isBot)!;
    state.phase = "chancellor_enact";
    state.chancellorId = chancellor.id;
    state.chancellorHand = ["fascist", "fascist"];
    state.fascist = 5;
    state.vetoRequested = true;
    setRoles(state, { [chancellor.id]: "liberal" });
    const move = nextBotMove(state)!;
    expect(move.action.type).toBe("enact");
    expect(() => apply(state, move.playerId, move.action, NOW)).not.toThrow();
  });

  it("Konsey Başkanı botu yetki kartlarını onaylar ve geçerli hedef seçer", () => {
    const base = botGame();
    const president = base.players.find((player) => player.isBot)!;
    const others = base.players.filter((player) => player.id !== president.id);
    const ally = others.find((player) => player.isBot)!;
    setRoles(base, {
      [president.id]: "fascist",
      [ally.id]: "hitler",
      ...Object.fromEntries(
        others
          .filter((player) => player.id !== ally.id)
          .map((player) => [player.id, "liberal"]),
      ),
    });
    base.presidentId = president.id;

    const peekState = structuredClone(base);
    peekState.phase = "power_peek";
    peekState.power = "peek";
    peekState.peeked = ["liberal", "fascist", "liberal"];
    const peekMove = nextBotMove(peekState)!;
    expect(peekMove.action).toEqual({ type: "ack" });
    expect(apply(peekState, peekMove.playerId, peekMove.action, NOW).phase).toBe(
      "nominate",
    );

    const investigateState = structuredClone(base);
    investigateState.phase = "power_investigate";
    investigateState.power = "investigate";
    const investigateMove = nextBotMove(investigateState)!;
    expect(investigateMove.action.type).toBe("investigate");
    if (investigateMove.action.type === "investigate") {
      expect(investigateMove.action.target).not.toBe(ally.id);
    }
    expect(
      apply(investigateState, investigateMove.playerId, investigateMove.action, NOW)
        .phase,
    ).toBe("power_investigate_result");

    const specialState = structuredClone(base);
    specialState.phase = "power_special";
    specialState.power = "special";
    const specialMove = nextBotMove(specialState)!;
    expect(specialMove.action).toEqual({ type: "special", target: ally.id });

    const executeState = structuredClone(base);
    executeState.phase = "power_execute";
    executeState.power = "execute";
    const executeMove = nextBotMove(executeState)!;
    expect(executeMove.action.type).toBe("execute");
    if (executeMove.action.type === "execute") {
      expect(executeMove.action.target).not.toBe(ally.id);
    }
    expect(
      apply(executeState, executeMove.playerId, executeMove.action, NOW).phase,
    ).not.toBe("ended");
  });

  it("tam bir oyunu botlarla ve otomatik insan hamleleriyle bitirir", () => {
    let state = botGame();
    let steps = 0;

    while (state.phase !== "ended" && steps < 600) {
      steps += 1;
      const botMove = nextBotMove(state);
      if (botMove) {
        state = apply(state, botMove.playerId, botMove.action, NOW);
        continue;
      }

      if (botShouldAct(state)) {
        throw new Error(`Bot hamlesi üretmedi: ${state.phase}`);
      }

      const action = humanMove(state);
      if (action) {
        state = apply(state, state.hostId, action, NOW);
        continue;
      }

      const next = tick(state, state.phaseEndsAt ?? NOW + 1_000_000);
      if (!next || next.seq === state.seq) {
        throw new Error(`Oyun ilerlemedi: ${state.phase}`);
      }
      state = next;
    }

    expect(state.phase).toBe("ended");
    expect(state.winner).toMatch(/liberal|fascist/);
    expect(steps).toBeLessThan(600);
  });
});
