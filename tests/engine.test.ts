import { describe, expect, it } from "vitest";
import {
  addBots,
  addPlayer,
  apply,
  boardPowers,
  createLobby,
  eligibleNominees,
  fascistCountFor,
  GameError,
  markConnected,
  powerFor,
  removePlayer,
  tick,
} from "../src/game/engine";
import { project } from "../src/game/view";
import type { GameState, Policy, Role } from "../src/game/types";

const NOW = 1_700_000_000_000;

function makeLobby(n = 5): GameState {
  let state = createLobby("TEST1", { name: "Reis", avatar: "🦅" }, NOW, 12345);
  for (let i = 2; i <= n; i += 1) {
    state = addPlayer(state, { name: `Oyuncu ${i}`, avatar: "🌙" }, NOW).state;
  }
  for (const player of state.players) player.ready = true;
  return state;
}

function started(n = 5): GameState {
  const lobby = makeLobby(n);
  return apply(lobby, lobby.hostId, { type: "start" }, NOW);
}

function botLobby(humans = 1, bots = 4): GameState {
  return addBots(makeLobby(humans), bots, NOW);
}

function roleCounts(state: GameState): Record<Role, number> {
  const counts: Record<Role, number> = { liberal: 0, fascist: 0, hitler: 0 };
  for (const player of state.players) counts[player.role] += 1;
  return counts;
}

function passVote(state: GameState): GameState {
  const presidentId = state.presidentId!;
  const nominee = eligibleNominees(state)[0]!;
  let next = apply(state, presidentId, { type: "nominate", target: nominee.id }, NOW);
  for (const player of next.players.filter((p) => p.alive)) {
    next = apply(next, player.id, { type: "vote", value: true }, NOW);
  }
  expect(next.phase).toBe("vote_result");
  return tick(next, next.phaseEndsAt!)!;
}

describe("lobi", () => {
  it("5-10 oyuncu alır, isimleri benzersizleştirir", () => {
    let state = makeLobby(5);
    const result = addPlayer(state, { name: "Reis", avatar: "☕" }, NOW);
    state = result.state;
    expect(result.player.name).toBe("Reis 2");
    expect(state.players).toHaveLength(6);
  });

  it("10 oyuncudan fazlasını almaz", () => {
    const state = makeLobby(10);
    expect(() => addPlayer(state, { name: "Fazla", avatar: "☕" }, NOW)).toThrow(
      GameError,
    );
  });

  it("oyun başladıktan sonra oyuncu almaz", () => {
    const state = started(5);
    expect(() => addPlayer(state, { name: "Geç", avatar: "☕" }, NOW)).toThrow(
      GameError,
    );
  });

  it("host olmadan başlamaz", () => {
    const state = makeLobby(5);
    const other = state.players[1]!;
    expect(() => apply(state, other.id, { type: "start" }, NOW)).toThrow(GameError);
  });

  it("herkes hazır olmadan başlamaz", () => {
    const state = makeLobby(5);
    state.players[2]!.ready = false;
    expect(() => apply(state, state.hostId, { type: "start" }, NOW)).toThrow(
      GameError,
    );
  });

  it("4 kişiyle başlamaz", () => {
    const state = makeLobby(4);
    expect(() => apply(state, state.hostId, { type: "start" }, NOW)).toThrow(GameError);
  });

  it("oyuncuyu çıkarır, host'u çıkaramaz", () => {
    const state = makeLobby(5);
    const removed = removePlayer(state, state.players[1]!.id, NOW);
    expect(removed.players).toHaveLength(4);
    expect(() => removePlayer(state, state.hostId, NOW)).toThrow(GameError);
  });

  it("bağlantı durumunu işaretler", () => {
    const state = makeLobby(5);
    const next = markConnected(state, state.players[1]!.id, false, NOW);
    expect(next.players[1]!.connected).toBe(false);
    expect(next.seq).toBe(state.seq + 1);
  });
});

describe("rol dağıtımı", () => {
  it.each([
    [5, 1, 3],
    [6, 1, 4],
    [7, 2, 4],
    [8, 2, 5],
    [9, 3, 5],
    [10, 3, 6],
  ])("%i oyuncuda %i ek Saraylı, %i Islahatçı", (n, fascists, liberals) => {
    const state = started(n);
    const counts = roleCounts(state);
    expect(fascistCountFor(n)).toBe(fascists);
    expect(counts.fascist).toBe(fascists);
    expect(counts.hitler).toBe(1);
    expect(counts.liberal).toBe(liberals);
  });

  it("17 kartlık desteyi kurar (6 Islahat, 11 Ferman)", () => {
    const state = started(5);
    expect(state.deck).toHaveLength(17);
    expect(state.deck.filter((c) => c === "liberal")).toHaveLength(6);
    expect(state.deck.filter((c) => c === "fascist")).toHaveLength(11);
  });
});

describe("seçim akışı", () => {
  it("geçerli adayı oylamaya açar", () => {
    const state = started(5);
    const nominee = eligibleNominees(state)[0]!;
    const next = apply(
      state,
      state.presidentId!,
      { type: "nominate", target: nominee.id },
      NOW,
    );
    expect(next.phase).toBe("vote");
    expect(next.nomineeId).toBe(nominee.id);
    expect(next.votes).toEqual({});
  });

  it("Reis kendini aday gösteremez", () => {
    const state = started(5);
    expect(() =>
      apply(state, state.presidentId!, { type: "nominate", target: state.presidentId! }, NOW),
    ).toThrow(GameError);
  });

  it("son seçilen Vezir'i aday gösteremez", () => {
    const state = started(7);
    const other = state.players.find((p) => p.id !== state.presidentId)!;
    state.lastElectedChancellor = other.id;
    expect(() =>
      apply(state, state.presidentId!, { type: "nominate", target: other.id }, NOW),
    ).toThrow(GameError);
  });

  it("5 kişi kaldığında son Reis Vezir adayı olabilir", () => {
    const state = started(5);
    const other = state.players.find((p) => p.id !== state.presidentId)!;
    state.lastElectedPresident = other.id;
    const next = apply(
      state,
      state.presidentId!,
      { type: "nominate", target: other.id },
      NOW,
    );
    expect(next.nomineeId).toBe(other.id);
  });

  it("oybirliğiyle geçen seçim yasamaya geçer", () => {
    const state = started(5);
    const next = passVote(state);
    expect(next.chancellorId).toBe(next.lastElectedChancellor);
    expect(next.phase).toBe("president_discard");
    expect(next.presidentHand).toHaveLength(3);
    expect(next.tracker).toBe(0);
    expect(next.lastElectedPresident).toBe(state.presidentId);
  });

  it("reddedilen seçim sayacı artırır ve Reis'i döndürür", () => {
    const state = started(5);
    const nominee = eligibleNominees(state)[0]!;
    let next = apply(
      state,
      state.presidentId!,
      { type: "nominate", target: nominee.id },
      NOW,
    );
    for (const player of next.players.filter((p) => p.alive)) {
      next = apply(next, player.id, { type: "vote", value: false }, NOW);
    }
    next = tick(next, next.phaseEndsAt!)!;
    expect(next.tracker).toBe(1);
    expect(next.phase).toBe("nominate");
    expect(next.presidentId).not.toBe(state.presidentId);
  });

  it("üç reddedilen seçim desteden ferman çıkarır ve sayacı sıfırlar", () => {
    let state = started(5);
    const before = state.deck.length;
    for (let i = 0; i < 3; i += 1) {
      const nominee = eligibleNominees(state)[0]!;
      let next = apply(
        state,
        state.presidentId!,
        { type: "nominate", target: nominee.id },
        NOW,
      );
      for (const player of next.players.filter((p) => p.alive)) {
        next = apply(next, player.id, { type: "vote", value: false }, NOW);
      }
      state = tick(next, next.phaseEndsAt!)!;
    }
    expect(state.tracker).toBe(0);
    expect(state.deck.length).toBe(before - 1);
    expect(state.liberal + state.fascist).toBe(1);
    expect(state.lastElectedChancellor).toBeNull();
  });

  it("Padişah 3 fermandan sonra Vezir olursa Saray kazanır", () => {
    const state = started(5);
    const hitler = state.players.find((p) => p.role === "hitler")!;
    state.fascist = 3;
    state.presidentId = state.players.find((p) => p.id !== hitler.id)!.id;
    state.lastElectedPresident = null;
    state.lastElectedChancellor = null;
    let next = apply(
      state,
      state.presidentId,
      { type: "nominate", target: hitler.id },
      NOW,
    );
    for (const player of next.players.filter((p) => p.alive)) {
      next = apply(next, player.id, { type: "vote", value: true }, NOW);
    }
    next = tick(next, next.phaseEndsAt!)!;
    expect(next.phase).toBe("ended");
    expect(next.winner).toBe("fascist");
    expect(next.winReason).toBe("hitler");
  });

  it("Padişah 3 fermandan önce Vezir olursa oyun sürer", () => {
    const state = started(5);
    const hitler = state.players.find((p) => p.role === "hitler")!;
    state.fascist = 2;
    state.presidentId = state.players.find((p) => p.id !== hitler.id)!.id;
    let next = apply(
      state,
      state.presidentId,
      { type: "nominate", target: hitler.id },
      NOW,
    );
    for (const player of next.players.filter((p) => p.alive)) {
      next = apply(next, player.id, { type: "vote", value: true }, NOW);
    }
    next = tick(next, next.phaseEndsAt!)!;
    expect(next.phase).toBe("president_discard");
    expect(next.winner).toBeNull();
  });
});

describe("yasama", () => {
  it("Reis 3 karttan birini eler, Vezir 2 karttan birini seçer", () => {
    let state = passVote(started(5));
    const presidentId = state.presidentId!;
    state.presidentHand = ["liberal", "fascist", "fascist"];
    state = apply(state, presidentId, { type: "discard", index: 1 }, NOW);
    expect(state.phase).toBe("chancellor_enact");
    expect(state.chancellorHand).toEqual(["liberal", "fascist"]);
    expect(state.discard).toEqual(["fascist"]);

    const chancellorId = state.chancellorId!;
    state = apply(state, chancellorId, { type: "enact", index: 0 }, NOW);
    expect(state.liberal).toBe(1);
    expect(state.discard).toEqual(["fascist", "fascist"]);
    expect(state.phase).toBe("nominate");
    expect(state.round).toBe(2);
  });

  it("5 Islahat oyunu bitirir", () => {
    let state = passVote(started(5));
    state.liberal = 4;
    state.presidentHand = ["liberal", "fascist", "fascist"];
    state = apply(state, state.presidentId!, { type: "discard", index: 1 }, NOW);
    state = apply(state, state.chancellorId!, { type: "enact", index: 0 }, NOW);
    expect(state.phase).toBe("ended");
    expect(state.winner).toBe("liberal");
    expect(state.winReason).toBe("policies");
  });

  it("6 Ferman oyunu bitirir", () => {
    let state = passVote(started(5));
    state.fascist = 5;
    state.presidentHand = ["fascist", "liberal", "liberal"];
    state = apply(state, state.presidentId!, { type: "discard", index: 1 }, NOW);
    state = apply(state, state.chancellorId!, { type: "enact", index: 0 }, NOW);
    expect(state.phase).toBe("ended");
    expect(state.winner).toBe("fascist");
  });

  it("Ferman yetkisi açar ve onay sonrası tur döner", () => {
    let state = passVote(started(5));
    state.fascist = 2;
    state.presidentHand = ["fascist", "liberal", "liberal"];
    state = apply(state, state.presidentId!, { type: "discard", index: 1 }, NOW);
    state = apply(state, state.chancellorId!, { type: "enact", index: 0 }, NOW);
    expect(state.fascist).toBe(3);
    expect(state.phase).toBe("power_peek");
    expect(state.peeked).toHaveLength(3);
    const peeked = state.peeked;
    state = apply(state, state.presidentId!, { type: "ack" }, NOW);
    expect(state.phase).toBe("nominate");
    expect(state.peeked).toBeNull();
    expect(state.round).toBe(2);
    expect(peeked).not.toBeNull();
  });

  it("teftiş sonucu yalnızca Reis'e gösterilir", () => {
    let state = passVote(started(7));
    state.fascist = 1;
    state.presidentHand = ["fascist", "liberal", "liberal"];
    state = apply(state, state.presidentId!, { type: "discard", index: 1 }, NOW);
    state = apply(state, state.chancellorId!, { type: "enact", index: 0 }, NOW);
    expect(state.phase).toBe("power_investigate");
    const target = state.players.find(
      (p) => p.alive && p.id !== state.presidentId,
    )!;
    state = apply(state, state.presidentId!, { type: "investigate", target: target.id }, NOW);
    expect(state.phase).toBe("power_investigate_result");

    const presidentView = project(state, state.presidentId!, NOW);
    expect(presidentView.you.investigate?.targetId).toBe(target.id);
    expect(presidentView.you.investigate?.party).toBe(
      target.role === "liberal" ? "liberal" : "fascist",
    );
    const other = state.players.find((p) => p.id !== state.presidentId)!;
    const otherView = project(state, other.id, NOW);
    expect(otherView.you.investigate).toBeNull();
  });

  it("kalebend Padişah'ı vurursa Islahatçılar kazanır", () => {
    const state = started(5);
    const hitler = state.players.find((p) => p.role === "hitler")!;
    state.phase = "power_execute";
    state.power = "execute";
    state.presidentId = state.players.find((p) => p.id !== hitler.id)!.id;
    const next = apply(
      state,
      state.presidentId,
      { type: "execute", target: hitler.id },
      NOW,
    );
    expect(next.phase).toBe("ended");
    expect(next.winner).toBe("liberal");
    expect(next.winReason).toBe("executed");
    expect(next.players.find((p) => p.id === hitler.id)!.alive).toBe(false);
  });
});

describe("veto", () => {
  it("Vezir veto ister, Reis kabul ederse iki kart atılır ve sayaç artar", () => {
    let state = passVote(started(5));
    state.presidentHand = ["liberal", "fascist", "fascist"];
    state = apply(state, state.presidentId!, { type: "discard", index: 0 }, NOW);
    state.fascist = 5;
    const beforeDiscard = state.discard.length;
    state = apply(state, state.chancellorId!, { type: "vetoRequest" }, NOW);
    expect(state.phase).toBe("veto_response");
    state = apply(state, state.presidentId!, { type: "vetoResponse", accept: true }, NOW);
    expect(state.discard.length).toBe(beforeDiscard + 2);
    expect(state.tracker).toBe(1);
    expect(state.chancellorHand).toBeNull();
    expect(state.phase).toBe("nominate");
  });

  it("Reis vetoyu reddederse Vezir kart seçmek zorunda", () => {
    let state = passVote(started(5));
    state.presidentHand = ["liberal", "fascist", "fascist"];
    state = apply(state, state.presidentId!, { type: "discard", index: 0 }, NOW);
    state.fascist = 5;
    state = apply(state, state.chancellorId!, { type: "vetoRequest" }, NOW);
    state = apply(state, state.presidentId!, { type: "vetoResponse", accept: false }, NOW);
    expect(state.phase).toBe("chancellor_enact");
    expect(state.chancellorHand).toHaveLength(2);
    expect(state.vetoRequested).toBe(true);
    expect(() =>
      apply(state, state.chancellorId!, { type: "vetoRequest" }, NOW),
    ).toThrow(GameError);
  });
});

describe("yetki tablosu", () => {
  it("oyuncu sayısına göre doğru yetkileri verir", () => {
    expect(boardPowers(5).slice(1, 6)).toEqual([
      null,
      null,
      "peek",
      "execute",
      "execute",
    ]);
    expect(boardPowers(7).slice(1, 6)).toEqual([
      null,
      "investigate",
      "special",
      "execute",
      "execute",
    ]);
    expect(boardPowers(9).slice(1, 6)).toEqual([
      "investigate",
      "investigate",
      "special",
      "execute",
      "execute",
    ]);
    expect(powerFor(5, 6)).toBeNull();
  });

  it("özel seçim bir sonraki Reis'i atar", () => {
    const state = started(7);
    const president = state.presidentId!;
    const target = state.players.find((p) => p.id !== president)!.id;
    state.phase = "power_special";
    state.power = "special";
    const next = apply(state, president, { type: "special", target }, NOW);
    expect(next.presidentId).toBe(target);
    expect(next.phase).toBe("nominate");
  });
});

describe("gizli bilgi", () => {
  it("lobide rol göstermez, bitince hepsini açar", () => {
    const lobby = makeLobby(5);
    const view = project(lobby, lobby.hostId, NOW);
    expect(view.you.role).toBeNull();
    expect(view.players.every((p) => p.role === null)).toBe(true);
  });

  it("başka oyuncuların rollerini gizler", () => {
    const state = started(7);
    const view = project(state, state.players[0]!.id, NOW);
    expect(view.you.role).not.toBeNull();
    expect(view.players.every((p) => p.role === null)).toBe(true);
  });

  it("Saraylılar birbirini, Padişah 7+ oyunda kimseyi bilmez", () => {
    const state = started(7);
    const fascist = state.players.find((p) => p.role === "fascist")!;
    const hitler = state.players.find((p) => p.role === "hitler")!;
    const fascistView = project(state, fascist.id, NOW);
    expect(fascistView.you.teammates).toContain(hitler.id);
    expect(fascistView.you.teammates).toHaveLength(2); // Hitler + diğer Saraylı

    const hitlerView = project(state, hitler.id, NOW);
    expect(hitlerView.you.teammates).toEqual([]);
  });

  it("5-6 oyunda Padişah Saraylıları bilir", () => {
    const state = started(5);
    const hitler = state.players.find((p) => p.role === "hitler")!;
    const fascist = state.players.find((p) => p.role === "fascist")!;
    const view = project(state, hitler.id, NOW);
    expect(view.you.teammates).toEqual([fascist.id]);
  });

  it("oylamada değerleri, sonuç açıklanana kadar gizler", () => {
    const state = started(5);
    const nominee = eligibleNominees(state)[0]!;
    let next = apply(state, state.presidentId!, { type: "nominate", target: nominee.id }, NOW);
    next = apply(next, state.players[0]!.id, { type: "vote", value: true }, NOW);
    const view = project(next, state.players[0]!.id, NOW);
    expect(view.votes.voted.length).toBe(1);
    expect(view.votes.revealed).toBeNull();

    for (const player of next.players.filter((p) => p.alive)) {
      if (!(player.id in next.votes)) {
        next = apply(next, player.id, { type: "vote", value: false }, NOW);
      }
    }
    const revealed = project(next, state.players[0]!.id, NOW);
    expect(revealed.votes.revealed).not.toBeNull();
  });

  it("Reis'in elini yalnızca Reis görür", () => {
    const state = passVote(started(5));
    const presidentView = project(state, state.presidentId!, NOW);
    expect(presidentView.you.hand).toHaveLength(3);
    const other = state.players.find((p) => p.id !== state.presidentId)!;
    const otherView = project(state, other.id, NOW);
    expect(otherView.you.hand).toBeNull();
  });
});

describe("zamanlayıcı", () => {
  it("süre dolmadan değişiklik yapmaz", () => {
    const state = started(5);
    expect(tick(state, NOW + 1000)).toBeNull();
  });

  it("aday gösterme süresi dolunca otomatik aday seçer", () => {
    const state = started(5);
    const next = tick(state, state.phaseEndsAt!)!;
    expect(next.phase).toBe("vote");
    expect(next.nomineeId).not.toBeNull();
  });

  it("oylama süresi dolunca oy vermeyenleri Hayır sayar", () => {
    let state = started(5);
    const nominee = eligibleNominees(state)[0]!;
    state = apply(state, state.presidentId!, { type: "nominate", target: nominee.id }, NOW);
    const next = tick(state, state.phaseEndsAt!)!;
    expect(next.phase).toBe("vote_result");
    expect(Object.values(next.votes).every((v) => v === false)).toBe(true);
  });

  it("seçim sonucu süresi dolunca yasamaya geçer", () => {
    let state = started(5);
    const nominee = eligibleNominees(state)[0]!;
    state = apply(state, state.presidentId!, { type: "nominate", target: nominee.id }, NOW);
    for (const player of state.players.filter((p) => p.alive)) {
      state = apply(state, player.id, { type: "vote", value: true }, NOW);
    }
    expect(state.phase).toBe("vote_result");
    const next = tick(state, state.phaseEndsAt!)!;
    expect(next.phase).toBe("president_discard");
  });
});

describe("tekrar oyna", () => {
  it("host oyunu lobiye döndürür", () => {
    let state = started(5);
    state.phase = "ended";
    state.winner = "liberal";
    state.winReason = "policies";
    state.players[2]!.alive = false;
    const next = apply(state, state.hostId, { type: "rematch" }, NOW);
    expect(next.phase).toBe("lobby");
    expect(next.winner).toBeNull();
    expect(next.players.every((p) => p.alive)).toBe(true);
    expect(next.players.find((p) => p.id === state.hostId)!.ready).toBe(true);
    expect(next.players.find((p) => p.id !== state.hostId)!.ready).toBe(false);
  });
});

describe("deste", () => {
  it("deste azalınca atılanları geri karıştırır", () => {
    const state = started(5);
    state.deck = ["liberal"];
    state.discard = ["fascist", "fascist"] as Policy[];
    const next = passVote(state);
    expect(next.presidentHand).toHaveLength(3);
    expect(next.deck).toHaveLength(0);
    expect(next.discard).toHaveLength(0);
  });
});

describe("botlar", () => {
  it("tek insan ve dört botla beş kişilik oyun başlar", () => {
    const lobby = botLobby(1, 4);
    expect(lobby.players).toHaveLength(5);
    const bots = lobby.players.filter((player) => player.isBot);
    expect(bots).toHaveLength(4);
    expect(bots.every((bot) => bot.ready && bot.connected)).toBe(true);
    expect(project(lobby, lobby.hostId, NOW).players.filter((p) => p.isBot)).toHaveLength(4);

    const game = apply(lobby, lobby.hostId, { type: "start" }, NOW);
    expect(game.phase).not.toBe("lobby");
    expect(roleCounts(game)).toEqual({ liberal: 3, fascist: 1, hitler: 1 });
    expect(game.players.filter((player) => player.isBot)).toHaveLength(4);
  });

  it("botları yalnızca oda sahibi ekleyip çıkarabilir", () => {
    const lobby = makeLobby(3);
    const other = lobby.players[1]!;
    const added = apply(
      lobby,
      lobby.hostId,
      { type: "addBots", count: 2 },
      NOW,
    );
    expect(added.players).toHaveLength(5);
    const botId = added.players.find((player) => player.isBot)!.id;

    expect(() =>
      apply(lobby, other.id, { type: "addBots", count: 1 }, NOW),
    ).toThrow(GameError);
    expect(() =>
      apply(added, other.id, { type: "removeBot", target: botId }, NOW),
    ).toThrow(GameError);
    expect(() =>
      apply(added, added.hostId, { type: "removeBot", target: other.id }, NOW),
    ).toThrow(GameError);

    const removed = apply(
      added,
      added.hostId,
      { type: "removeBot", target: botId },
      NOW,
    );
    expect(removed.players).toHaveLength(4);
    expect(removed.players.some((player) => player.id === botId)).toBe(false);
  });

  it("on oyuncu sınırını aşmaz ve geçersiz sayıyı reddeder", () => {
    const full = addBots(makeLobby(1), 9, NOW);
    expect(full.players).toHaveLength(10);
    expect(() => addBots(full, 1, NOW)).toThrow(GameError);
    expect(() =>
      apply(full, full.hostId, { type: "addBots", count: 1 }, NOW),
    ).toThrow(GameError);
    expect(() => addBots(makeLobby(1), 0, NOW)).toThrow(GameError);
  });

  it("oyun başladıktan sonra bot eklemez ve çıkarmaz", () => {
    const lobby = botLobby(1, 4);
    const game = apply(lobby, lobby.hostId, { type: "start" }, NOW);
    const botId = game.players.find((player) => player.isBot)!.id;
    expect(() =>
      apply(game, game.hostId, { type: "addBots", count: 1 }, NOW),
    ).toThrow(GameError);
    expect(() =>
      apply(game, game.hostId, { type: "removeBot", target: botId }, NOW),
    ).toThrow(GameError);
  });

  it("tekrar oyunda botlar hazır kalır, insanlar hazır olur", () => {
    const lobby = botLobby(2, 3);
    let state = apply(lobby, lobby.hostId, { type: "start" }, NOW);
    state.phase = "ended";
    state.winner = "liberal";
    state.winReason = "policies";
    const next = apply(state, state.hostId, { type: "rematch" }, NOW);
    expect(next.phase).toBe("lobby");
    for (const player of next.players) {
      if (player.isBot || player.id === state.hostId) {
        expect(player.ready).toBe(true);
      } else {
        expect(player.ready).toBe(false);
      }
    }
  });
});
