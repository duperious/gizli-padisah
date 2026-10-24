import { useEffect, useState } from "react";
import clsx from "clsx";
import {
  AlertTriangle,
  Check,
  Clock,
  Crown,
  Eye,
  Gavel,
  Landmark,
  LogOut,
  MessageCircle,
  RotateCcw,
  ScrollText,
  Shield,
  Skull,
  Vote,
  X,
} from "lucide-react";
import type { Action } from "../game/types";
import {
  PARTY_LABEL,
  PHASE_LABEL,
  POLICY_LABEL,
  POWER_DESCRIPTION,
  POWER_LABEL,
  ROLE_LABEL,
  TEAM_NAME,
  WIN_REASON_LABEL,
} from "../game/labels";
import type { ClientPlayer, ClientState } from "../game/view";
import type { SessionStatus } from "../net/session";
import { roomUrl } from "../net/roomCode";
import {
  Avatar,
  Badge,
  Board,
  Brand,
  Button,
  ChatPanel,
  CopyButton,
  EyeButton,
  LogPanel,
  Modal,
  PhaseIcon,
  PlayerCard,
  PolicyCard,
  RoleCard,
  StatusPill,
} from "./parts";
import { RulesModal } from "./Rules";
import { formatSeconds, useCountdown } from "./useCountdown";
import { navigate } from "./router";

type TargetKind = "nominate" | "investigate" | "special" | "execute";

export function Game({
  code,
  state,
  selfId,
  isHost,
  status,
  send,
  leave,
}: {
  code: string;
  state: ClientState;
  selfId: string | null;
  isHost: boolean;
  status: SessionStatus;
  send: (action: Action) => void;
  leave: () => void;
}) {
  const [rulesOpen, setRulesOpen] = useState(false);
  const [roleOpen, setRoleOpen] = useState(false);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [gameOverOpen, setGameOverOpen] = useState(true);
  const [vetoOpen, setVetoOpen] = useState(false);
  const [sheet, setSheet] = useState<"chat" | "log" | null>(null);
  const [asideTab, setAsideTab] = useState<"chat" | "log">("log");
  const [target, setTarget] = useState<string | null>(null);
  const [cardIndex, setCardIndex] = useState<number | null>(null);

  const you = state.you;
  const remaining = useCountdown(state.phaseEndsAt, state.serverNow);
  const urgent = remaining !== null && remaining <= 10;
  const president = state.players.find((player) => player.id === state.presidentId);
  const chancellor = state.players.find((player) => player.id === state.chancellorId);
  const nominee = state.players.find((player) => player.id === state.nomineeId);
  const alive = state.players.filter((player) => player.alive);
  const votedAlready = state.votes.voted.includes(you.id);

  useEffect(() => {
    setTarget(null);
    setCardIndex(null);
    setVetoOpen(false);
  }, [state.phase, state.round, state.nomineeId]);

  useEffect(() => {
    if (state.phase === "ended") setGameOverOpen(true);
  }, [state.phase]);

  const targetMode: TargetKind | null =
    you.can.nominate
      ? "nominate"
      : you.can.investigate
        ? "investigate"
        : you.can.special
          ? "special"
          : you.can.execute
            ? "execute"
            : null;

  const targetIds =
    targetMode === "nominate"
      ? state.eligible
      : targetMode
        ? alive.filter((player) => player.id !== you.id).map((player) => player.id)
        : [];

  const act = (action: Action) => {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate?.(12);
    }
    send(action);
  };

  const doLeave = () => {
    leave();
    navigate("/");
  };

  const selectedPlayer = state.players.find((player) => player.id === target) ?? null;

  const actionPanel = () => {
    switch (state.phase) {
      case "nominate":
        return (
          <ActionCard
            tone="gold"
            title="Vezir adayı"
            eyebrow={`Tur ${state.round}`}
            icon={<Landmark className="h-4 w-4" />}
          >
            {you.can.nominate ? (
              <>
                <p className="text-sm text-parchment-2">
                  Divan'ın önüne bir Vezir adayı çıkar. Dönem sınırına takılan isimler
                  listelenmez.
                </p>
                <PlayerPicker
                  ids={state.eligible}
                  players={state.players}
                  selected={target}
                  onSelect={setTarget}
                />
                <Button
                  variant="gold"
                  disabled={!target}
                  onClick={() => {
                    if (target) act({ type: "nominate", target });
                  }}
                  className="w-full py-3"
                >
                  <Vote className="h-4 w-4" />
                  {selectedPlayer ? `${selectedPlayer.name}'i Aday Göster` : "Aday Seç"}
                </Button>
              </>
            ) : (
              <Waiting
                text={
                  president
                    ? `Reis ${president.name} Vezir adayını seçiyor.`
                    : "Reis adayını seçiyor."
                }
              />
            )}
          </ActionCard>
        );

      case "vote":
        return (
          <ActionCard
            tone="gold"
            title="Oylama"
            eyebrow={`Tur ${state.round}`}
            icon={<Vote className="h-4 w-4" />}
          >
            <div className="flex flex-wrap items-center gap-2 text-sm text-parchment-2">
              <span>
                <strong className="text-gold-2">{president?.name}</strong> Reis,
              </span>
              <span>
                <strong className="text-parchment">{nominee?.name}</strong> adayını Vezir
                gösterdi.
              </span>
            </div>
            {you.can.vote ? (
              <>
                <p className="mt-1 text-xs text-muted">
                  Oyun açıktır. Çoğunluk Evet ise seçim geçer. Oy verdikten sonra
                  değiştiremezsin.
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <Button variant="gold" onClick={() => act({ type: "vote", value: true })} className="py-3.5">
                    <Check className="h-5 w-5" /> Evet
                  </Button>
                  <Button variant="danger" onClick={() => act({ type: "vote", value: false })} className="py-3.5">
                    <X className="h-5 w-5" /> Hayır
                  </Button>
                </div>
              </>
            ) : votedAlready ? (
              <div className="flex items-center gap-2 rounded-xl border border-liberal-2/30 bg-liberal/10 px-3 py-3 text-sm text-liberal-2">
                <Check className="h-4 w-4" />
                Oyun verildi. Divan'ın geri kalanı bekleniyor.
              </div>
            ) : !you.alive ? (
              <div className="flex items-center gap-2 rounded-xl border border-fascist-2/30 bg-fascist/10 px-3 py-3 text-sm text-fascist-2">
                <Skull className="h-4 w-4" />
                Kalebenddesin; bu oylamada söz hakkın yok.
              </div>
            ) : (
              <Waiting text="Oyun bekleniyor." />
            )}
            <div className="flex flex-wrap items-center gap-1.5">
              {alive.map((player) => {
                const hasVoted = state.votes.voted.includes(player.id);
                return (
                  <span
                    key={player.id}
                    className={clsx(
                      "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px]",
                      hasVoted
                        ? "border-liberal-2/40 bg-liberal/10 text-liberal-2"
                        : "border-gold/15 bg-ink/40 text-muted",
                    )}
                  >
                    {hasVoted ? <Check className="h-2.5 w-2.5" /> : <Clock className="h-2.5 w-2.5" />}
                    {player.name}
                  </span>
                );
              })}
            </div>
          </ActionCard>
        );

      case "vote_result": {
        const revealed = state.votes.revealed ?? {};
        const yes = Object.values(revealed).filter(Boolean).length;
        const no = alive.length - yes;
        return (
          <ActionCard
            tone={yes > no ? "liberal" : "fascist"}
            title="Seçim sonucu"
            eyebrow={`Tur ${state.round}`}
            icon={<Vote className="h-4 w-4" />}
          >
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-xl border border-liberal-2/30 bg-liberal/10 px-3 py-2">
                <p className="text-[10px] uppercase tracking-[0.2em] text-liberal-2">Evet</p>
                <p className="font-display text-2xl font-bold">{yes}</p>
              </div>
              <div className="rounded-xl border border-fascist-2/30 bg-fascist/10 px-3 py-2">
                <p className="text-[10px] uppercase tracking-[0.2em] text-fascist-2">Hayır</p>
                <p className="font-display text-2xl font-bold">{no}</p>
              </div>
            </div>
            <div className="grid gap-1.5 sm:grid-cols-2">
              {alive.map((player) => {
                const vote = revealed[player.id];
                return (
                  <div
                    key={player.id}
                    className="flex items-center justify-between gap-2 rounded-lg border border-gold/10 bg-ink/40 px-2.5 py-1.5 text-xs"
                  >
                    <span className="flex items-center gap-1.5">
                      <span>{player.avatar}</span>
                      {player.name}
                    </span>
                    <Badge tone={vote ? "liberal" : "fascist"}>
                      {vote ? "Evet" : "Hayır"}
                    </Badge>
                  </div>
                );
              })}
            </div>
            <Waiting
              text={
                yes > no
                  ? `${nominee?.name} Vezir oldu. Fermanlar çekiliyor…`
                  : "Seçim düştü. Reis sırası dönüyor…"
              }
            />
          </ActionCard>
        );
      }

      case "president_discard":
        return (
          <ActionCard
            tone="gold"
            title="Ferman eleme"
            eyebrow={`Tur ${state.round}`}
            icon={<ScrollText className="h-4 w-4" />}
          >
            {you.can.discard && you.hand ? (
              <>
                <p className="text-sm text-parchment-2">
                  Üç fermanı gördün. Birini elersin; kalan iki ferman Vezir{" "}
                  <strong className="text-parchment">{chancellor?.name}</strong>'e gider.
                </p>
                <div className="flex flex-wrap justify-center gap-3 py-1">
                  {you.hand.map((policy, index) => (
                    <PolicyCard
                      key={`${policy}-${index}`}
                      policy={policy}
                      selected={cardIndex === index}
                      onClick={() => setCardIndex(index)}
                    />
                  ))}
                </div>
                <p className="text-center text-xs text-muted">
                  {cardIndex !== null
                    ? `${POLICY_LABEL[you.hand[cardIndex]!]} fermanını eliyorsun.`
                    : "Elemek istediğin fermana dokun."}
                </p>
                <Button
                  variant="gold"
                  disabled={cardIndex === null}
                  onClick={() => {
                    if (cardIndex !== null) act({ type: "discard", index: cardIndex });
                  }}
                  className="w-full"
                >
                  <ScrollText className="h-4 w-4" /> Fermanı Ele
                </Button>
              </>
            ) : (
              <>
                <div className="flex justify-center gap-3 py-1 opacity-70">
                  <PolicyCard faceDown />
                  <PolicyCard faceDown />
                  <PolicyCard faceDown />
                </div>
                <Waiting
                  text={
                    president
                      ? `Reis ${president.name} fermanları inceliyor.`
                      : "Reis fermanları inceliyor."
                  }
                />
              </>
            )}
          </ActionCard>
        );

      case "chancellor_enact":
        return (
          <ActionCard
            tone="gold"
            title="Ferman yürürlüğü"
            eyebrow={`Tur ${state.round}`}
            icon={<ScrollText className="h-4 w-4" />}
          >
            {you.can.enact && you.hand ? (
              <>
                <p className="text-sm text-parchment-2">
                  İki ferman kaldı. Birini yürürlüğe koy; diğeri atılır.
                </p>
                <div className="flex flex-wrap justify-center gap-4 py-1">
                  {you.hand.map((policy, index) => (
                    <PolicyCard
                      key={`${policy}-${index}`}
                      policy={policy}
                      selected={cardIndex === index}
                      onClick={() => setCardIndex(index)}
                    />
                  ))}
                </div>
                <p className="text-center text-xs text-muted">
                  {cardIndex !== null
                    ? `${POLICY_LABEL[you.hand[cardIndex]!]} yürürlüğe girecek.`
                    : "Yürürlüğe koymak istediğin fermana dokun."}
                </p>
                <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
                  <Button
                    variant="gold"
                    disabled={cardIndex === null}
                    onClick={() => {
                      if (cardIndex !== null) act({ type: "enact", index: cardIndex });
                    }}
                  >
                    <Check className="h-4 w-4" /> Yürürlüğe Koy
                  </Button>
                  {you.can.veto && (
                    <Button variant="ghost" onClick={() => setVetoOpen(true)}>
                      <Shield className="h-4 w-4 text-gold" /> Veto
                    </Button>
                  )}
                </div>
              </>
            ) : (
              <>
                <div className="flex justify-center gap-4 py-1 opacity-70">
                  <PolicyCard faceDown />
                  <PolicyCard faceDown />
                </div>
                <Waiting
                  text={
                    chancellor
                      ? `Vezir ${chancellor.name} ferman seçiyor.`
                      : "Vezir ferman seçiyor."
                  }
                />
              </>
            )}
          </ActionCard>
        );

      case "veto_response":
        return (
          <ActionCard
            tone="fascist"
            title="Veto kararı"
            eyebrow={`Tur ${state.round}`}
            icon={<Shield className="h-4 w-4" />}
          >
            <div className="flex justify-center gap-4 opacity-70">
              <PolicyCard faceDown />
              <PolicyCard faceDown />
            </div>
            {you.can.vetoResponse ? (
              <>
                <p className="text-sm text-parchment-2">
                  Vezir iki fermanı da iade etmek istiyor. Kabul edersen iki ferman da
                  atılır ve <strong className="text-parchment">seçim sayacı bir artar</strong>.
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant="danger"
                    onClick={() => act({ type: "vetoResponse", accept: true })}
                  >
                    <Check className="h-4 w-4" /> Kabul Et
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => act({ type: "vetoResponse", accept: false })}
                  >
                    <X className="h-4 w-4" /> Reddet
                  </Button>
                </div>
              </>
            ) : (
              <Waiting text="Reis veto kararını veriyor." />
            )}
          </ActionCard>
        );

      case "power_investigate":
        return (
          <ActionCard
            tone="gold"
            title={POWER_LABEL.investigate}
            eyebrow={`Tur ${state.round}`}
            icon={<Eye className="h-4 w-4" />}
          >
            {you.can.investigate ? (
              <>
                <p className="text-sm text-parchment-2">{POWER_DESCRIPTION.investigate}</p>
                <PlayerPicker
                  ids={targetIds}
                  players={state.players}
                  selected={target}
                  onSelect={setTarget}
                />
                <Button
                  variant="gold"
                  disabled={!target}
                  onClick={() => {
                    if (target) act({ type: "investigate", target });
                  }}
                  className="w-full"
                >
                  <Eye className="h-4 w-4" />
                  {selectedPlayer ? `${selectedPlayer.name}'i Teftiş Et` : "Hedef Seç"}
                </Button>
              </>
            ) : (
              <Waiting text="Reis bir oyuncuyu teftiş ediyor." />
            )}
          </ActionCard>
        );

      case "power_investigate_result": {
        const result = you.investigate;
        const targetPlayer = result
          ? state.players.find((player) => player.id === result.targetId)
          : null;
        return (
          <ActionCard
            tone={result?.party === "fascist" ? "fascist" : "liberal"}
            title="Teftiş sonucu"
            eyebrow={`Tur ${state.round}`}
            icon={<Eye className="h-4 w-4" />}
          >
            {you.can.ack && result && targetPlayer ? (
              <>
                <div className="flex items-center gap-3 rounded-xl border border-gold/20 bg-ink/50 p-3">
                  <Avatar emoji={targetPlayer.avatar} size="lg" />
                  <div>
                    <p className="font-display text-lg font-bold">{targetPlayer.name}</p>
                    <Badge tone={result.party === "liberal" ? "liberal" : "fascist"}>
                      {PARTY_LABEL[result.party]}
                    </Badge>
                    <p className="mt-1 text-[11px] text-muted">
                      Padişah da Saraylı olarak görünür.
                    </p>
                  </div>
                </div>
                <Button variant="gold" onClick={() => act({ type: "ack" })} className="w-full">
                  Anladım
                </Button>
              </>
            ) : (
              <Waiting text="Reis teftiş sonucunu inceliyor." />
            )}
          </ActionCard>
        );
      }

      case "power_peek":
        return (
          <ActionCard
            tone="gold"
            title={POWER_LABEL.peek}
            eyebrow={`Tur ${state.round}`}
            icon={<ScrollText className="h-4 w-4" />}
          >
            {you.can.ack && you.peeked ? (
              <>
                <p className="text-sm text-parchment-2">
                  Destenin en üstündeki üç ferman. İlk çekilecek kart en solda.
                </p>
                <div className="flex flex-wrap justify-center gap-2 py-1">
                  {you.peeked.map((policy, index) => (
                    <PolicyCard key={`${policy}-${index}`} policy={policy} size="sm" />
                  ))}
                </div>
                <p className="text-center text-[11px] text-muted">
                  {you.peeked.map((policy) => POLICY_LABEL[policy]).join(" · ")}
                </p>
                <Button variant="gold" onClick={() => act({ type: "ack" })} className="w-full">
                  Anladım
                </Button>
              </>
            ) : (
              <Waiting text="Reis istihbarat raporunu inceliyor." />
            )}
          </ActionCard>
        );

      case "power_special":
        return (
          <ActionCard
            tone="gold"
            title={POWER_LABEL.special}
            eyebrow={`Tur ${state.round}`}
            icon={<Crown className="h-4 w-4" />}
          >
            {you.can.special ? (
              <>
                <p className="text-sm text-parchment-2">{POWER_DESCRIPTION.special}</p>
                <PlayerPicker
                  ids={targetIds}
                  players={state.players}
                  selected={target}
                  onSelect={setTarget}
                />
                <Button
                  variant="gold"
                  disabled={!target}
                  onClick={() => {
                    if (target) act({ type: "special", target });
                  }}
                  className="w-full"
                >
                  <Crown className="h-4 w-4" />
                  {selectedPlayer ? `${selectedPlayer.name}'i Reis İlan Et` : "Hedef Seç"}
                </Button>
              </>
            ) : (
              <Waiting text="Reis bir sonraki Reis'i seçiyor." />
            )}
          </ActionCard>
        );

      case "power_execute":
        return (
          <ActionCard
            tone="fascist"
            title={POWER_LABEL.execute}
            eyebrow={`Tur ${state.round}`}
            icon={<Gavel className="h-4 w-4" />}
          >
            {you.can.execute ? (
              <>
                <p className="text-sm text-parchment-2">{POWER_DESCRIPTION.execute}</p>
                <PlayerPicker
                  ids={targetIds}
                  players={state.players}
                  selected={target}
                  onSelect={setTarget}
                />
                <p className="flex items-start gap-2 rounded-lg border border-fascist-2/30 bg-fascist/10 px-2.5 py-2 text-[11px] text-fascist-2">
                  <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  Kalebend geri alınamaz. Padişah'ı bulursan Islahatçılar kazanır.
                </p>
                <Button
                  variant="danger"
                  disabled={!target}
                  onClick={() => {
                    if (target) act({ type: "execute", target });
                  }}
                  className="w-full"
                >
                  <Gavel className="h-4 w-4" />
                  {selectedPlayer ? `${selectedPlayer.name}'i Kalebende Gönder` : "Hedef Seç"}
                </Button>
              </>
            ) : (
              <Waiting text="Reis kalebend emrini hazırlıyor." />
            )}
          </ActionCard>
        );

      case "ended":
        return (
          <ActionCard
            tone={state.winner === "liberal" ? "liberal" : "fascist"}
            title="Divan kapandı"
            eyebrow={WIN_REASON_LABEL[state.winReason ?? "policies"]}
            icon={<Crown className="h-4 w-4" />}
          >
            <p className="font-display text-2xl font-bold">
              {state.winner === "liberal" ? "Islahatçılar kazandı" : "Saraylılar kazandı"}
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              <Button variant="gold" onClick={() => setGameOverOpen(true)}>
                <Crown className="h-4 w-4" /> Sonucu Gör
              </Button>
              {isHost ? (
                <Button variant="ghost" onClick={() => act({ type: "rematch" })}>
                  <RotateCcw className="h-4 w-4" /> Yeniden Oyna
                </Button>
              ) : (
                <div className="grid place-items-center rounded-xl border border-gold/15 px-3 text-[11px] text-muted">
                  Yeni turu oda sahibi başlatır.
                </div>
              )}
            </div>
          </ActionCard>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-dvh lg:pb-4">
      <header className="sticky top-0 z-30 border-b border-gold/10 bg-ink/90 backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-6xl items-center gap-2 px-2.5 py-2 sm:px-5">
          <Brand compact />
          <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
            <div className="hidden sm:block">
              <StatusPill status={status} isHost={isHost} />
            </div>
            <span
              className={clsx(
                "inline-flex items-center gap-1.5 rounded-lg border px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wider",
                urgent
                  ? "border-fascist-2/50 bg-fascist/15 text-fascist-2"
                  : "border-gold/20 bg-ink/60 text-parchment-2",
              )}
            >
              <Clock className="h-3.5 w-3.5" />
              {formatSeconds(remaining)}
            </span>
            <EyeButton onClick={() => setRoleOpen(true)} />
            <button
              type="button"
              onClick={() => setRulesOpen(true)}
              className="btn-ghost hidden px-2 py-2 text-xs sm:inline-flex"
              aria-label="Kurallar"
            >
              <ScrollText className="h-4 w-4 text-gold" />
            </button>
            <button
              type="button"
              onClick={() => (isHost ? setLeaveOpen(true) : doLeave())}
              className="btn-ghost px-2 py-2 text-xs"
              aria-label="Ayrıl"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
        <div className="mx-auto flex max-w-6xl items-center gap-2 border-t border-gold/[0.07] px-2.5 py-1.5 sm:px-5">
          <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-gold-2">
            <PhaseIcon phase={state.phase} />
            {PHASE_LABEL[state.phase]}
          </span>
          <span className="text-[10px] text-muted">· Tur {state.round}</span>
          <span className="ml-auto font-mono text-[10px] tracking-[0.2em] text-muted">
            {code}
          </span>
        </div>
      </header>

      {state.phase === "ended" && !gameOverOpen && (
        <div className="mx-auto mt-3 w-full max-w-6xl px-3 sm:px-5">
          <div className="flex items-center gap-2 rounded-xl border border-gold/30 bg-gold/10 px-3 py-2 text-xs">
            <Crown className="h-4 w-4 text-gold" />
            <span className="flex-1">
              Oyun bitti: {state.winner === "liberal" ? "Islahatçılar" : "Saraylılar"}{" "}
              kazandı.
            </span>
            <button
              type="button"
              className="font-semibold text-gold-2 underline underline-offset-2"
              onClick={() => setGameOverOpen(true)}
            >
              Sonucu gör
            </button>
          </div>
        </div>
      )}

      <main className="mx-auto grid w-full max-w-6xl gap-3 px-2.5 py-3 pb-24 sm:px-5 lg:grid-cols-[1fr_330px] lg:items-start lg:gap-4 lg:pb-3">
        <div className="min-w-0 space-y-3">
          <Board state={state} />

          <div key={`${state.phase}-${state.round}`} className="animate-rise">
            {actionPanel()}
          </div>

          <section className="panel p-3.5 sm:p-4">
            <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="eyebrow">Divan</p>
                <p className="font-display text-lg font-bold">
                  {alive.length}
                  <span className="text-muted"> / {state.players.length} hayatta</span>
                </p>
              </div>
              {targetMode && (
                <Badge tone="gold">
                  <Eye className="h-3 w-3" /> Hedef seç
                </Badge>
              )}
            </div>
            <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
              {state.players.map((player) => {
                const selectable = targetMode
                  ? targetIds.includes(player.id)
                  : undefined;
                return (
                  <PlayerCard
                    key={player.id}
                    player={player}
                    isYou={player.id === you.id}
                    selectable={selectable}
                    selected={target === player.id}
                    onSelect={() => {
                      if (selectable) {
                        setTarget(player.id);
                        if (typeof navigator !== "undefined" && "vibrate" in navigator) {
                          navigator.vibrate?.(8);
                        }
                      }
                    }}
                    showRole={state.phase === "ended"}
                  />
                );
              })}
            </div>
            {targetMode && (
              <p className="mt-2 text-[10px] text-muted">
                Yukarıdaki listeden veya bu kartlardan hedef seçebilirsin.
              </p>
            )}
          </section>
        </div>

        <aside className="panel hidden p-3 lg:sticky lg:top-[92px] lg:flex lg:h-[calc(100dvh-108px)] lg:flex-col">
          <div className="mb-2 grid grid-cols-2 gap-1 rounded-lg border border-gold/10 bg-ink/40 p-1">
            <button
              type="button"
              onClick={() => setAsideTab("log")}
              className={clsx(
                "rounded-md px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wider transition",
                asideTab === "log" ? "bg-gold/15 text-gold-2" : "text-muted",
              )}
            >
              Günlük
            </button>
            <button
              type="button"
              onClick={() => setAsideTab("chat")}
              className={clsx(
                "rounded-md px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wider transition",
                asideTab === "chat" ? "bg-gold/15 text-gold-2" : "text-muted",
              )}
            >
              Sohbet
            </button>
          </div>
          <div className="min-h-0 flex-1">
            {asideTab === "log" ? (
              <LogPanel entries={state.log} />
            ) : (
              <ChatPanel
                messages={state.chat}
                selfId={selfId}
                onSend={(text) => send({ type: "chat", text })}
                className="h-full"
              />
            )}
          </div>
          <div className="mt-2 border-t border-gold/10 pt-2 text-center text-[9px] uppercase tracking-[0.18em] text-muted/60">
            Divan-ı Hümayun · {code}
          </div>
        </aside>
      </main>

      <div className="fixed bottom-3 right-3 z-20 flex flex-col gap-2 lg:hidden">
        <button
          type="button"
          onClick={() => setSheet("chat")}
          className="grid h-11 w-11 place-items-center rounded-full border border-gold/40 bg-ink-2/95 text-gold shadow-lift backdrop-blur"
          aria-label="Sohbet"
        >
          <MessageCircle className="h-5 w-5" />
        </button>
        <button
          type="button"
          onClick={() => setSheet("log")}
          className="grid h-11 w-11 place-items-center rounded-full border border-gold/30 bg-ink-2/95 text-gold shadow-lift backdrop-blur"
          aria-label="Günlük"
        >
          <ScrollText className="h-5 w-5" />
        </button>
      </div>

      <Modal
        open={roleOpen}
        onClose={() => setRoleOpen(false)}
        title="Rolün"
        eyebrow="Sadece sen gör"
      >
        {you.role ? (
          <RoleCard
            role={you.role}
            players={state.players}
            teammates={you.teammates}
            name={you.name}
          />
        ) : (
          <p className="text-sm text-muted">Rolün henüz dağıtılmadı.</p>
        )}
      </Modal>

      <Modal
        open={sheet !== null}
        onClose={() => setSheet(null)}
        title={sheet === "chat" ? "Divan sohbeti" : "Divan günlüğü"}
        eyebrow={sheet === "chat" ? "Söz sırası sende" : "Neler oldu?"}
        wide
      >
        <div className="h-[58dvh]">
          {sheet === "chat" ? (
            <ChatPanel
              messages={state.chat}
              selfId={selfId}
              onSend={(text) => send({ type: "chat", text })}
              className="h-full"
            />
          ) : (
            <LogPanel entries={state.log} />
          )}
        </div>
      </Modal>

      <Modal
        open={vetoOpen}
        onClose={() => setVetoOpen(false)}
        title="Vetoyu iste?"
        eyebrow="Vezir yetkisi"
        footer={
          <div className="flex gap-2">
            <Button variant="ghost" className="flex-1" onClick={() => setVetoOpen(false)}>
              Vazgeç
            </Button>
            <Button
              variant="danger"
              className="flex-1"
              onClick={() => {
                setVetoOpen(false);
                act({ type: "vetoRequest" });
              }}
            >
              <Shield className="h-4 w-4" /> Veto İste
            </Button>
          </div>
        }
      >
        <p className="text-sm leading-relaxed text-parchment-2">
          İki fermanı da iade etmek istiyorsun. Reis kabul ederse iki ferman atılır ve seçim
          sayacı bir artar. Reddederse fermanlardan birini seçmek zorunda kalırsın.
        </p>
      </Modal>

      <Modal
        open={leaveOpen}
        onClose={() => setLeaveOpen(false)}
        title="Divan'ı kapat?"
        eyebrow="Oda sahibi"
        footer={
          <div className="flex gap-2">
            <Button variant="ghost" className="flex-1" onClick={() => setLeaveOpen(false)}>
              Vazgeç
            </Button>
            <Button variant="danger" className="flex-1" onClick={doLeave}>
              <LogOut className="h-4 w-4" /> Kapat
            </Button>
          </div>
        }
      >
        <p className="text-sm leading-relaxed text-parchment-2">
          Oda kapanınca oyun sona erer ve tüm oyuncuların bağlantısı kesilir. Emin misin?
        </p>
      </Modal>

      <Modal
        open={gameOverOpen && state.phase === "ended"}
        onClose={() => setGameOverOpen(false)}
        title="Divan kapandı"
        eyebrow={state.winReason ? WIN_REASON_LABEL[state.winReason] : undefined}
        wide
        footer={
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button variant="ghost" className="flex-1" onClick={() => setGameOverOpen(false)}>
              Tahtayı İncele
            </Button>
            {isHost ? (
              <Button
                variant="gold"
                className="flex-1"
                onClick={() => {
                  setGameOverOpen(false);
                  act({ type: "rematch" });
                }}
              >
                <RotateCcw className="h-4 w-4" /> Yeniden Oyna
              </Button>
            ) : (
              <div className="grid flex-1 place-items-center rounded-xl border border-gold/15 px-3 py-2 text-center text-[11px] text-muted">
                Yeni turu oda sahibi başlatabilir.
              </div>
            )}
          </div>
        }
      >
        <div
          className={clsx(
            "relative overflow-hidden rounded-2xl border-2 p-5",
            state.winner === "liberal"
              ? "border-liberal-2/50 bg-gradient-to-br from-liberal/60 to-[#12291f]"
              : "border-fascist-2/60 bg-gradient-to-br from-wine to-[#2a0a10]",
          )}
        >
          <div className="absolute -right-8 -top-8 opacity-15">
            <Crown className="h-40 w-40" />
          </div>
          <p className="text-[10px] uppercase tracking-[0.26em] text-white/60">Sonuç</p>
          <h3 className="font-display text-3xl font-bold">
            {state.winner === "liberal" ? "Islahatçılar kazandı" : "Saraylılar kazandı"}
          </h3>
          <p className="mt-1 text-sm text-white/75">
            {state.winReason === "hitler"
              ? "Padişah, üçüncü Ferman'dan sonra Vezir koltuğuna oturdu."
              : state.winReason === "executed"
                ? "Padişah kalebende gönderildi; Divan nefes aldı."
                : state.winner === "liberal"
                  ? "Beş Islahat yürürlüğe girdi."
                  : "Altı Ferman yürürlüğe girdi."}
          </p>
        </div>

        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <TeamColumn
            title={TEAM_NAME.liberal}
            tone="liberal"
            players={state.players.filter((player) => player.role === "liberal")}
          />
          <TeamColumn
            title={TEAM_NAME.fascist}
            tone="fascist"
            players={state.players.filter(
              (player) => player.role === "fascist" || player.role === "hitler",
            )}
          />
        </div>
        <p className="mt-2 text-center text-[10px] text-muted">
          Roller artık herkese açık. Yeni tur için oda sahibi lobiye dönebilir.
        </p>
      </Modal>

      <RulesModal open={rulesOpen} onClose={() => setRulesOpen(false)} />
      <CopyLinkFloating code={code} />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Yardımcı bileşenler                                                 */
/* ------------------------------------------------------------------ */

function ActionCard({
  title,
  eyebrow,
  icon,
  children,
  tone,
}: {
  title: string;
  eyebrow?: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  tone: "gold" | "liberal" | "fascist";
}) {
  return (
    <section
      className={clsx(
        "panel relative overflow-hidden p-4 sm:p-5",
        tone === "gold" && "border-gold/30",
        tone === "liberal" && "border-liberal-2/35",
        tone === "fascist" && "border-fascist-2/40",
      )}
    >
      <div
        className={clsx(
          "pointer-events-none absolute inset-x-0 top-0 h-0.5",
          tone === "gold" && "bg-gradient-to-r from-transparent via-gold to-transparent",
          tone === "liberal" &&
            "bg-gradient-to-r from-transparent via-liberal-2 to-transparent",
          tone === "fascist" &&
            "bg-gradient-to-r from-transparent via-fascist-2 to-transparent",
        )}
      />
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          {eyebrow && <p className="eyebrow">{eyebrow}</p>}
          <h2 className="title mt-0.5 flex items-center gap-2 text-xl">
            <span
              className={clsx(
                "grid h-7 w-7 place-items-center rounded-full border",
                tone === "liberal"
                  ? "border-liberal-2/40 bg-liberal/15 text-liberal-2"
                  : tone === "fascist"
                    ? "border-fascist-2/40 bg-fascist/15 text-fascist-2"
                    : "border-gold/40 bg-gold/10 text-gold",
              )}
            >
              {icon}
            </span>
            {title}
          </h2>
        </div>
      </div>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function Waiting({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-gold/15 bg-ink/40 px-3 py-3 text-sm text-parchment-2">
      <span className="relative flex h-2.5 w-2.5 shrink-0">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-gold/50" />
        <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-gold" />
      </span>
      {text}
    </div>
  );
}

function PlayerPicker({
  ids,
  players,
  selected,
  onSelect,
}: {
  ids: string[];
  players: ClientPlayer[];
  selected: string | null;
  onSelect: (id: string) => void;
}) {
  const targets = players.filter((player) => ids.includes(player.id));
  if (targets.length === 0) {
    return <p className="text-xs text-muted">Uygun hedef yok.</p>;
  }
  return (
    <div className="grid gap-1.5 sm:grid-cols-2">
      {targets.map((player) => (
        <button
          key={player.id}
          type="button"
          onClick={() => onSelect(player.id)}
          className={clsx(
            "flex items-center gap-2 rounded-lg border px-2.5 py-2 text-left text-xs transition",
            selected === player.id
              ? "border-gold bg-gold/15 text-parchment"
              : "border-gold/15 bg-ink/40 text-parchment-2 hover:border-gold/45",
          )}
        >
          <Avatar emoji={player.avatar} size="xs" />
          <span className="min-w-0 flex-1 truncate font-semibold">{player.name}</span>
          {selected === player.id && <Check className="h-4 w-4 shrink-0 text-gold" />}
        </button>
      ))}
    </div>
  );
}

function TeamColumn({
  title,
  players,
  tone,
}: {
  title: string;
  players: ClientPlayer[];
  tone: "liberal" | "fascist";
}) {
  return (
    <div
      className={clsx(
        "rounded-xl border p-3",
        tone === "liberal"
          ? "border-liberal-2/30 bg-liberal/10"
          : "border-fascist-2/30 bg-fascist/10",
      )}
    >
      <p
        className={clsx(
          "text-[10px] font-semibold uppercase tracking-[0.2em]",
          tone === "liberal" ? "text-liberal-2" : "text-fascist-2",
        )}
      >
        {title}
      </p>
      <div className="mt-2 space-y-1.5">
        {players.map((player) => (
          <div key={player.id} className="flex items-center gap-2 text-xs">
            <span>{player.avatar}</span>
            <span className="flex-1 truncate">{player.name}</span>
            <Badge tone={player.role === "hitler" ? "gold" : tone}>
              {player.role ? ROLE_LABEL[player.role] : "?"}
            </Badge>
          </div>
        ))}
      </div>
    </div>
  );
}

function CopyLinkFloating({ code }: { code: string }) {
  return (
    <div className="fixed bottom-3 left-3 z-20 hidden lg:block">
      <CopyButton value={roomUrl(code)} label="Davet linki" compact />
    </div>
  );
}

