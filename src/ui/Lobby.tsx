import { useEffect, useState } from "react";
import {
  AlertTriangle,
  Bot,
  Check,
  Crown,
  LogOut,
  Play,
  ScrollText,
  Settings2,
  Users,
  X,
} from "lucide-react";
import clsx from "clsx";
import type { Action, Pace } from "../game/types";
import { PACE_LABEL } from "../game/labels";
import type { ClientState } from "../game/view";
import { roomUrl } from "../net/roomCode";
import type { SessionStatus } from "../net/session";
import {
  Avatar,
  Badge,
  Brand,
  Button,
  ChatPanel,
  CopyButton,
  Modal,
  StatusPill,
} from "./parts";
import { RulesModal } from "./Rules";
import { navigate } from "./router";

export function Lobby({
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
  const [confirmClose, setConfirmClose] = useState(false);
  const [notifyText, setNotifyText] = useState("");
  const [targetTotal, setTargetTotal] = useState(5);

  const me = state.players.find((player) => player.id === selfId) ?? null;
  const bots = state.players.filter((player) => player.isBot);
  const enough = state.players.length >= 5;
  const allReady = enough && state.players.every((player) => player.ready && player.connected);
  const canStart = isHost && enough && allReady;
  const emptySeats = Math.max(0, 10 - state.players.length);
  const botsToAdd = Math.max(0, targetTotal - state.players.length);
  const canAddBots = isHost && botsToAdd > 0 && state.players.length < 10;

  useEffect(() => {
    setTargetTotal((current) => Math.max(current, state.players.length));
  }, [state.players.length]);

  const handleLeave = () => {
    if (isHost) {
      setConfirmClose(true);
      return;
    }
    leave();
    navigate("/");
  };

  const closeRoom = () => {
    setConfirmClose(false);
    leave();
    navigate("/");
  };

  const copyNative = async () => {
    try {
      await navigator.clipboard.writeText(roomUrl(code));
      setNotifyText("Davet linki kopyalandı.");
      window.setTimeout(() => setNotifyText(""), 2200);
    } catch {
      setNotifyText("Linki uzun basıp kopyalayabilirsin.");
      window.setTimeout(() => setNotifyText(""), 2600);
    }
  };

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-30 border-b border-gold/10 bg-ink/85 backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-6xl items-center gap-3 px-3 py-2.5 sm:px-5">
          <Brand compact />
          <div className="ml-auto flex items-center gap-2">
            <StatusPill status={status} isHost={isHost} />
            <button
              type="button"
              onClick={() => setRulesOpen(true)}
              className="btn-ghost px-2 py-2 text-xs"
              aria-label="Kurallar"
            >
              <ScrollText className="h-4 w-4 text-gold" />
              <span className="hidden sm:inline">Kurallar</span>
            </button>
            <button
              type="button"
              onClick={handleLeave}
              className="btn-ghost px-2 py-2 text-xs"
              aria-label={isHost ? "Divanı kapat" : "Ayrıl"}
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">{isHost ? "Kapat" : "Ayrıl"}</span>
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto grid w-full max-w-6xl gap-4 px-3 py-4 sm:px-5 lg:grid-cols-[1fr_340px] lg:items-start">
        <div className="space-y-4">
          <section className="panel animate-rise relative overflow-hidden p-5 sm:p-6">
            <div className="pointer-events-none absolute -right-16 -top-20 text-gold/10">
              <Crown className="h-52 w-52" strokeWidth={0.8} />
            </div>
            <div className="relative z-10">
              <p className="eyebrow">Divan-ı Hümayun · Lobi</p>
              <div className="mt-2 flex flex-wrap items-end gap-x-5 gap-y-2">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.18em] text-muted">Oda kodu</p>
                  <p className="font-mono text-4xl font-semibold tracking-[0.18em] text-gold-2 sm:text-5xl">
                    {code}
                  </p>
                </div>
                <div className="mb-1 flex flex-wrap gap-2">
                  <CopyButton value={roomUrl(code)} label="Linki kopyala" compact />
                  <button
                    type="button"
                    onClick={copyNative}
                    className="btn-ghost px-2.5 py-1.5 text-xs sm:hidden"
                  >
                    Kodu kopyala
                  </button>
                </div>
              </div>
              <p className="mt-3 max-w-xl text-sm leading-relaxed text-parchment-2">
                {isHost
                  ? "Arkadaşların kodu veya linki kullanarak katılsın. Herkes hazır olduğunda Divan'ı aç."
                  : "Oda sahibi herkes hazır olunca Divan'ı açacak. Bu sırada sohbet edebilirsin."}
              </p>
              {notifyText && (
                <p className="mt-2 text-xs text-liberal-2">{notifyText}</p>
              )}
            </div>
          </section>

          <section className="panel p-4 sm:p-5">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="eyebrow">Divan üyeleri</p>
                <p className="font-display text-lg font-bold">
                  {state.players.length}
                  <span className="text-muted"> / 10 kişi</span>
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge tone={enough ? "liberal" : "muted"}>
                  <Users className="h-3 w-3" />
                  {enough ? "Yeterli" : "En az 5"}
                </Badge>
                <Badge tone={allReady ? "gold" : "muted"}>
                  {allReady ? "Herkes hazır" : "Hazırlık sürüyor"}
                </Badge>
                {bots.length > 0 && (
                  <Badge tone="muted">
                    <Bot className="h-3 w-3" /> {bots.length} bot
                  </Badge>
                )}
              </div>
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              {state.players.map((player) => (
                <div
                  key={player.id}
                  className={clsx(
                    "seat flex items-center gap-3",
                    player.id === selfId && "border-gold/40 bg-gold/[0.06]",
                  )}
                >
                  <Avatar
                    emoji={player.avatar}
                    size="md"
                    connected={player.connected}
                    highlight={player.id === selfId}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <p className="truncate text-sm font-semibold">{player.name}</p>
                      {player.isHost && (
                        <Badge tone="gold" className="px-1.5 py-0">
                          <Crown className="h-2.5 w-2.5" /> Sahip
                        </Badge>
                      )}
                      {player.isBot && (
                        <Badge tone="muted" className="px-1.5 py-0">
                          <Bot className="h-2.5 w-2.5" /> Bot
                        </Badge>
                      )}
                      {player.id === selfId && (
                        <span className="text-[9px] font-semibold text-gold">SEN</span>
                      )}
                    </div>
                    <p
                      className={clsx(
                        "mt-0.5 flex items-center gap-1 text-[10px]",
                        player.ready && player.connected ? "text-liberal-2" : "text-muted",
                      )}
                    >
                      {player.connected ? (
                        <>
                          {player.ready ? (
                            <Check className="h-3 w-3" />
                          ) : (
                            <span className="h-1.5 w-1.5 rounded-full bg-gold/60" />
                          )}
                          {player.ready ? "Hazır" : "Bekliyor"}
                        </>
                      ) : (
                        <>
                          <AlertTriangle className="h-3 w-3 text-fascist-2" />
                          Bağlantı yok
                        </>
                      )}
                    </p>
                  </div>
                </div>
              ))}
              {Array.from({ length: Math.min(emptySeats, 10) }).map((_, index) => (
                <div
                  key={`empty-${index}`}
                  className="flex min-h-[60px] items-center justify-center rounded-xl border border-dashed border-gold/12 bg-ink/25 px-3 text-[10px] uppercase tracking-[0.2em] text-muted/50"
                >
                  Boş divan yeri
                </div>
              ))}
            </div>
          </section>

          {isHost && (
            <section className="panel p-4 sm:p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="eyebrow flex items-center gap-1.5">
                    <Bot className="h-3.5 w-3.5" /> Botlar
                  </p>
                  <p className="mt-1 max-w-xl text-xs leading-relaxed text-muted">
                    Eksik kadroyu botlarla tamamla. Yalnız kalsan bile en az 5 kişiyle
                    oynayabilirsin; botlar hazır olur ve sıraları gelince otomatik oynar.
                  </p>
                </div>
                <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-gold/15 bg-ink/50 px-2 py-1 text-[10px] text-muted">
                  <Bot className="h-3 w-3 text-gold/70" /> {bots.length} bot
                </span>
              </div>

              {bots.length > 0 && (
                <div className="mt-3 grid gap-1.5 sm:grid-cols-2">
                  {bots.map((bot) => (
                    <div
                      key={bot.id}
                      className="flex items-center gap-2 rounded-lg border border-gold/12 bg-ink/35 px-2 py-1.5"
                    >
                      <Avatar emoji={bot.avatar} size="xs" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-semibold">{bot.name}</p>
                        <p className="text-[9px] uppercase tracking-[0.18em] text-muted/70">
                          Otomatik oyuncu
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => send({ type: "removeBot", target: bot.id })}
                        className="grid h-7 w-7 shrink-0 place-items-center rounded-lg border border-gold/15 text-muted transition hover:border-fascist-2/50 hover:text-fascist-2"
                        aria-label={`${bot.name} botunu çıkar`}
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-end">
                <label className="block sm:w-40">
                  <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.18em] text-muted">
                    Hedef kadro
                  </span>
                  <select
                    value={targetTotal}
                    onChange={(event) => setTargetTotal(Number(event.target.value))}
                    className="input w-full py-2 text-sm"
                  >
                    {[5, 6, 7, 8, 9, 10].map((count) => (
                      <option key={count} value={count}>
                        {count} oyuncu
                      </option>
                    ))}
                  </select>
                </label>
                <Button
                  variant="ghost"
                  onClick={() => send({ type: "addBots", count: botsToAdd })}
                  disabled={!canAddBots}
                  className="w-full sm:flex-1"
                >
                  <Bot className="h-4 w-4 text-gold" />
                  {botsToAdd > 0 ? `${botsToAdd} bot ekle` : "Kadro tamam"}
                </Button>
              </div>

              <p className="mt-2 text-[10px] leading-relaxed text-muted/70">
                Botlar sohbet etmez; rolleri diğer oyuncular gibi gizli kalır. İstediğin
                zaman lobide bot çıkarabilir, yerine arkadaşını alabilirsin.
              </p>
            </section>
          )}

          <section className="panel p-4 sm:p-5">
            {isHost ? (
              <div className="space-y-4">
                <div>
                  <p className="eyebrow flex items-center gap-1.5">
                    <Settings2 className="h-3.5 w-3.5" /> Tur temposu
                  </p>
                  <p className="mt-1 text-xs text-muted">
                    Süre dolunca Divan otomatik hamle yapar. Tartışmaya alan bırakmak için
                    sakin tempoyu seç.
                  </p>
                  <div className="mt-2 grid grid-cols-3 gap-2">
                    {(["sakin", "normal", "hizli"] as Pace[]).map((pace) => (
                      <button
                        key={pace}
                        type="button"
                        onClick={() => send({ type: "pace", pace })}
                        className={clsx(
                          "rounded-lg border px-2 py-2 text-xs font-semibold transition",
                          state.settings.pace === pace
                            ? "border-gold bg-gold/15 text-gold-2"
                            : "border-gold/15 bg-ink/40 text-muted hover:border-gold/35",
                        )}
                      >
                        {PACE_LABEL[pace]}
                      </button>
                    ))}
                  </div>
                </div>

                {!canStart && (
                  <p className="flex items-start gap-2 rounded-lg border border-gold/15 bg-gold/[0.04] px-3 py-2 text-[11px] text-muted">
                    <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gold" />
                    {!enough
                      ? "Divan'ı açmak için en az 5 oyuncu gerekli."
                      : !allReady
                        ? "Herkesin hazır ve bağlı olması gerekiyor."
                        : ""}
                  </p>
                )}

                <Button
                  variant="gold"
                  onClick={() => send({ type: "start" })}
                  disabled={!canStart}
                  className="w-full py-3 text-base"
                >
                  <Play className="h-4 w-4" />
                  Divan'ı Aç
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-xs text-muted">
                  Oda sahibi seni bekliyor. Hazır olduğunda işaretle.
                </p>
                <Button
                  variant={me?.ready ? "ghost" : "gold"}
                  onClick={() => send({ type: "ready", value: !me?.ready })}
                  className="w-full py-3"
                >
                  {me?.ready ? (
                    <>
                      <Check className="h-4 w-4 text-liberal-2" /> Hazırsın
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4" /> Hazırım
                    </>
                  )}
                </Button>
              </div>
            )}

            <p className="mt-3 flex items-start gap-2 border-t border-gold/10 pt-3 text-[10px] leading-relaxed text-muted/75">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gold/60" />
              {isHost
                ? "Sen oda sahibisin: sekmeyi kapatırsan veya sayfayı yenilemezsen divan dağılır. Tarayıcıyı arka planda tutmakta sorun yok."
                : "Oda sahibi sekmeyi kapatırsa divan dağılır. Bağlantın koparsa aynı linke dönerek yerine geri oturabilirsin."}
            </p>
          </section>
        </div>

        <aside className="panel flex h-[420px] flex-col p-3.5 sm:p-4 lg:sticky lg:top-[68px] lg:h-[calc(100dvh-90px)]">
          <div className="mb-2 flex items-center justify-between">
            <p className="eyebrow">Divan sohbeti</p>
            <span className="text-[10px] text-muted">{state.chat.length} mesaj</span>
          </div>
          <ChatPanel
            messages={state.chat}
            selfId={selfId}
            onSend={(text) => send({ type: "chat", text })}
            className="min-h-0 flex-1"
          />
        </aside>
      </main>

      <RulesModal open={rulesOpen} onClose={() => setRulesOpen(false)} />
      <Modal
        open={confirmClose}
        onClose={() => setConfirmClose(false)}
        title="Divan'ı kapat?"
        eyebrow="Oda sahibi"
        footer={
          <div className="flex gap-2">
            <Button variant="ghost" className="flex-1" onClick={() => setConfirmClose(false)}>
              Vazgeç
            </Button>
            <Button variant="danger" className="flex-1" onClick={closeRoom}>
              <LogOut className="h-4 w-4" />
              Kapat
            </Button>
          </div>
        }
      >
        <p className="text-sm leading-relaxed text-parchment-2">
          Oda kapanınca tüm oyuncuların bağlantısı kesilir ve bu kod bir daha kullanılamaz.
          Arkadaşlarınla yeniden oynamak için yeni bir divan kurman gerekir.
        </p>
      </Modal>
    </div>
  );
}
