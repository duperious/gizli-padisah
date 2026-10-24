import { useEffect, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  Crown,
  Home,
  RefreshCw,
  ScrollText,
  WifiOff,
} from "lucide-react";
import { AVATARS, randomAvatar } from "../game/avatars";
import { randomName } from "../game/names";
import { isValidCode, normalizeCode } from "../net/roomCode";
import { getHostInfo, getProfile, saveProfile, type Profile } from "../net/storage";
import { useSession } from "../net/useSession";
import { Game } from "./Game";
import { Lobby } from "./Lobby";
import { Brand, Button, LoadingScreen, Ornament, Toast } from "./parts";
import { RulesModal } from "./Rules";
import { navigate } from "./router";

export function RoomPage({ code }: { code: string }) {
  const normalized = normalizeCode(code);
  if (!isValidCode(normalized)) {
    return <InvalidRoom raw={code} />;
  }
  return <RoomSession key={normalized} code={normalized} />;
}

function RoomSession({ code }: { code: string }) {
  const normalized = code;
  const [isHost] = useState(() => Boolean(getHostInfo(normalized)));
  const [profile, setProfile] = useState<Profile | null>(() => {
    const host = getHostInfo(normalized);
    if (host) return { name: host.name, avatar: host.avatar };
    return getProfile();
  });
  const [hiddenError, setHiddenError] = useState<string | null>(null);
  const session = useSession(normalized, isHost, profile);

  useEffect(() => {
    setHiddenError(null);
  }, [session.error]);

  if (!profile) {
    return <JoinGate code={normalized} onJoin={setProfile} />;
  }

  if (!session.state) {
    if (session.status === "error" || session.status === "closed") {
      return (
        <RoomError
          code={normalized}
          message={session.error}
          isHost={isHost}
          closed={session.status === "closed"}
        />
      );
    }
    return (
      <div className="min-h-dvh">
        <RoomHeader />
        <LoadingScreen
          label={
            isHost
              ? "Savaş Konseyi kuruluyor…"
              : session.status === "offline"
                ? "Oda aranıyor; yeniden deniyorum…"
                : "Konsey'e bağlanılıyor…"
          }
        />
        {session.error && (
          <p className="mx-auto mt-2 max-w-sm px-4 text-center text-xs text-muted">
            {session.error}
          </p>
        )}
      </div>
    );
  }

  const toastMessage =
    session.error && session.error !== hiddenError ? session.error : null;

  return (
    <>
      {session.state.phase === "lobby" ? (
        <Lobby
          code={normalized}
          state={session.state}
          selfId={session.selfId}
          isHost={isHost}
          status={session.status}
          send={session.send}
          leave={session.leave}
        />
      ) : (
        <Game
          code={normalized}
          state={session.state}
          selfId={session.selfId}
          isHost={isHost}
          status={session.status}
          send={session.send}
          leave={session.leave}
        />
      )}
      {session.status === "offline" && (
        <div className="pointer-events-none fixed bottom-20 left-1/2 z-40 -translate-x-1/2">
          <span className="pointer-events-auto inline-flex items-center gap-2 rounded-full border border-gold/30 bg-ink-2/95 px-3 py-1.5 text-[11px] text-gold-2 shadow-lift backdrop-blur">
            <WifiOff className="h-3.5 w-3.5" />
            Bağlantı aranıyor…
          </span>
        </div>
      )}
      <Toast message={toastMessage} onClose={() => setHiddenError(session.error)} />
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Davet linkiyle gelen misafir                                        */
/* ------------------------------------------------------------------ */

function JoinGate({
  code,
  onJoin,
}: {
  code: string;
  onJoin: (profile: Profile) => void;
}) {
  const [name, setName] = useState(() => randomName());
  const [avatar, setAvatar] = useState(() => randomAvatar());
  const [error, setError] = useState<string | null>(null);
  const [rulesOpen, setRulesOpen] = useState(false);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const clean = name.replace(/\s+/g, " ").trim().slice(0, 18);
    if (clean.length < 2) {
      setError("Adın en az 2 karakter olmalı.");
      return;
    }
    const profile = { name: clean, avatar };
    saveProfile(profile);
    onJoin(profile);
  };

  return (
    <div className="relative min-h-dvh overflow-hidden">
      <div className="pointer-events-none absolute -right-40 -top-40 text-gold/10">
        <Ornament className="h-[460px] w-[460px]" />
      </div>
      <header className="relative z-10 mx-auto flex w-full max-w-3xl items-center justify-between px-4 py-4">
        <Brand />
        <button
          type="button"
          onClick={() => setRulesOpen(true)}
          className="btn-ghost px-2.5 py-2 text-xs"
        >
          <ScrollText className="h-4 w-4 text-gold" />
          Kurallar
        </button>
      </header>

      <main className="relative z-10 mx-auto w-full max-w-md px-4 pb-16 pt-6">
        <div className="mb-4 text-center">
          <p className="eyebrow">Davet edildin</p>
          <h1 className="title mt-1 text-3xl">Konsey'e katıl</h1>
          <p className="mt-2 text-sm text-parchment-2">
            Oda kodu{" "}
            <span className="font-mono text-base tracking-[0.18em] text-gold-2">
              {code}
            </span>
          </p>
        </div>

        <form onSubmit={submit} className="panel animate-rise p-5 sm:p-6">
          <label className="block">
            <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">
              Adın
            </span>
            <input
              value={name}
              onChange={(event) => {
                setName(event.target.value);
                setError(null);
              }}
              maxLength={18}
              placeholder="Konsey'de nasıl anılsın?"
              className="input"
              autoComplete="nickname"
              autoFocus
            />
          </label>

          <div className="mt-4">
            <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">
              Simgen
            </span>
            <div className="grid grid-cols-8 gap-1.5">
              {AVATARS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => setAvatar(emoji)}
                  aria-label={`Simge ${emoji}`}
                  aria-pressed={avatar === emoji}
                  className={
                    avatar === emoji
                      ? "grid h-9 place-items-center rounded-lg border border-gold bg-gold/15 text-lg shadow-gold"
                      : "grid h-9 place-items-center rounded-lg border border-gold/10 bg-ink/50 text-lg transition hover:border-gold/40"
                  }
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <p className="mt-3 rounded-lg border border-fascist-2/40 bg-fascist/10 px-3 py-2 text-xs text-fascist-2">
              {error}
            </p>
          )}

          <Button type="submit" variant="gold" className="mt-5 w-full py-3">
            <Crown className="h-4 w-4" />
            Konsey'e Gir
            <ArrowRight className="h-4 w-4" />
          </Button>
          <p className="mt-3 text-center text-[10px] text-muted/80">
            Adını ve simgeni sonra değiştirmek için ana sayfaya dönebilirsin.
          </p>
        </form>
      </main>

      <RulesModal open={rulesOpen} onClose={() => setRulesOpen(false)} />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Hata ekranları                                                      */
/* ------------------------------------------------------------------ */

function RoomHeader() {
  return (
    <header className="flex items-center justify-between px-4 py-4">
      <Brand />
      <button
        type="button"
        onClick={() => navigate("/")}
        className="btn-ghost px-2.5 py-2 text-xs"
      >
        <Home className="h-4 w-4" />
        Ana sayfa
      </button>
    </header>
  );
}

function RoomError({
  code,
  message,
  isHost,
  closed,
}: {
  code: string;
  message: string | null;
  isHost: boolean;
  closed: boolean;
}) {
  return (
    <div className="relative min-h-dvh overflow-hidden">
      <div className="pointer-events-none absolute -left-48 top-10 text-fascist/10">
        <Ornament className="h-[420px] w-[420px]" />
      </div>
      <div className="relative z-10">
        <RoomHeader />
        <main className="mx-auto w-full max-w-md px-4 pb-16 pt-6">
          <section className="panel p-6 text-center">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-full border border-fascist-2/40 bg-fascist/10">
              <AlertTriangle className="h-7 w-7 text-fascist-2" />
            </div>
            <p className="eyebrow mt-4">Oda {code}</p>
            <h1 className="title mt-1 text-2xl">
              {closed ? "Konsey kapandı" : "Konsey'e ulaşılamadı"}
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-parchment-2">
              {message ??
                "Oda sahibine ulaşılamadı. Kod doğru mu ve oda sahibinin sekmesi açık mı?"}
            </p>

            <div className="mt-4 space-y-1.5 rounded-xl border border-gold/15 bg-ink/40 p-3 text-left text-[11px] text-muted">
              <p className="flex items-start gap-2">
                <Crown className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gold/70" />
                {isHost
                  ? "Aynı oda kodu başka bir sekmede açıksa bu sekme odayı kuramaz. Diğer sekmeyi kapatıp tekrar dene."
                  : "Oda sahibinin sekmeyi kapatmadığından emin ol."}
              </p>
              <p className="flex items-start gap-2">
                <WifiOff className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gold/70" />
                Bağlantı koptuysa birkaç saniye sonra yeniden denemek genelde yeterlidir.
              </p>
            </div>

            <div className="mt-5 grid gap-2 sm:grid-cols-2">
              <Button variant="ghost" onClick={() => navigate("/")}>
                <Home className="h-4 w-4" /> Ana Sayfa
              </Button>
              <Button variant="gold" onClick={() => window.location.reload()}>
                <RefreshCw className="h-4 w-4" /> Tekrar Dene
              </Button>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}

function InvalidRoom({ raw }: { raw: string }) {
  const [rulesOpen, setRulesOpen] = useState(false);
  return (
    <div className="relative min-h-dvh overflow-hidden">
      <div className="pointer-events-none absolute -right-40 -top-32 text-gold/10">
        <Ornament className="h-[420px] w-[420px]" />
      </div>
      <header className="relative z-10 mx-auto flex w-full max-w-3xl items-center justify-between px-4 py-4">
        <Brand />
        <button
          type="button"
          onClick={() => setRulesOpen(true)}
          className="btn-ghost px-2.5 py-2 text-xs"
        >
          <ScrollText className="h-4 w-4 text-gold" />
          Kurallar
        </button>
      </header>
      <main className="relative z-10 mx-auto w-full max-w-md px-4 pt-8">
        <section className="panel p-6 text-center">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-full border border-fascist-2/40 bg-fascist/10">
            <AlertTriangle className="h-7 w-7 text-fascist-2" />
          </div>
          <h1 className="title mt-4 text-2xl">Geçersiz oda kodu</h1>
          <p className="mt-2 text-sm text-parchment-2">
            <span className="font-mono text-gold-2">{raw || "…"}</span> geçerli bir oda
            kodu değil. Oda kodları 5 karakterdir ve karışmasın diye bazı harfleri
            kullanmaz.
          </p>
          <Button
            variant="gold"
            className="mt-5 w-full"
            onClick={() => navigate("/")}
          >
            <Home className="h-4 w-4" /> Ana Sayfaya Dön
          </Button>
        </section>
      </main>
      <RulesModal open={rulesOpen} onClose={() => setRulesOpen(false)} />
    </div>
  );
}
