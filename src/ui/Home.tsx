import { useEffect, useState } from "react";
import {
  ArrowRight,
  Bot,
  Clock,
  Crown,
  Download,
  ScrollText,
  Smartphone,
  Users,
} from "lucide-react";
import { AVATARS, randomAvatar } from "../game/avatars";
import { randomName } from "../game/names";
import { isValidCode, makeRoomCode, normalizeCode } from "../net/roomCode";
import { getHostInfo, getLastHosted, getProfile, saveHostInfo, saveProfile } from "../net/storage";
import { Brand, Button, Ornament } from "./parts";
import { RulesModal } from "./Rules";
import { navigate } from "./router";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

export function Home() {
  const [name, setName] = useState(() => getProfile()?.name ?? randomName());
  const [avatar, setAvatar] = useState(() => getProfile()?.avatar ?? randomAvatar());
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [rulesOpen, setRulesOpen] = useState(false);
  const [install, setInstall] = useState<BeforeInstallPromptEvent | null>(null);
  const [lastRoom] = useState(() => {
    const last = getLastHosted();
    if (!last || Date.now() - last.at > 6 * 60 * 60 * 1000) return null;
    if (!getHostInfo(last.code)) return null;
    return last;
  });

  useEffect(() => {
    const handler = (event: Event) => {
      event.preventDefault();
      setInstall(event as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const cleanProfile = (): { name: string; avatar: string } | null => {
    const clean = name.replace(/\s+/g, " ").trim().slice(0, 18);
    if (clean.length < 2) {
      setError("Adın en az 2 karakter olmalı.");
      return null;
    }
    const profile = { name: clean, avatar };
    saveProfile(profile);
    return profile;
  };

  const createRoom = () => {
    const profile = cleanProfile();
    if (!profile) return;
    let roomCode = makeRoomCode();
    for (let attempt = 0; attempt < 6 && getHostInfo(roomCode); attempt += 1) {
      roomCode = makeRoomCode();
    }
    saveHostInfo(roomCode, { ...profile, createdAt: Date.now() });
    navigate(`/oda/${roomCode}`);
  };

  const joinRoom = () => {
    const profile = cleanProfile();
    if (!profile) return;
    const normalized = normalizeCode(code);
    if (!isValidCode(normalized)) {
      setError("5 haneli oda kodunu gir.");
      return;
    }
    navigate(`/oda/${normalized}`);
  };

  const installApp = async () => {
    if (!install) return;
    await install.prompt();
    await install.userChoice;
    setInstall(null);
  };

  return (
    <div className="relative min-h-dvh overflow-hidden">
      <div className="pointer-events-none absolute -right-48 -top-48 text-gold/10 sm:-right-24 sm:-top-24">
        <Ornament className="h-[520px] w-[520px]" />
      </div>
      <div className="pointer-events-none absolute -bottom-56 -left-56 text-gold/[0.06]">
        <Ornament className="h-[480px] w-[480px]" />
      </div>

      <header className="relative z-10 mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
        <Brand />
        <div className="flex items-center gap-2">
          {install && (
            <button
              type="button"
              onClick={installApp}
              className="btn-ghost hidden px-2.5 py-2 text-xs sm:inline-flex"
            >
              <Download className="h-4 w-4 text-gold" />
              Uygulamayı kur
            </button>
          )}
          <button
            type="button"
            onClick={() => setRulesOpen(true)}
            className="btn-ghost px-2.5 py-2 text-xs sm:px-3.5"
          >
            <ScrollText className="h-4 w-4 text-gold" />
            <span className="hidden sm:inline">Nasıl oynanır?</span>
            <span className="sm:hidden">Kurallar</span>
          </button>
        </div>
      </header>

      <main className="relative z-10 mx-auto grid w-full max-w-6xl gap-8 px-4 pb-20 pt-6 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:gap-12 lg:pt-12">
        <section className="animate-rise">
          <p className="eyebrow">Bir entrika ve savaş oyunu</p>
          <h1 className="title mt-3 text-5xl leading-[0.92] sm:text-7xl lg:text-[5.5rem]">
            Savaş
            <br />
            <span className="text-gold-2 text-shadow-gold">Konseyi</span>
          </h1>
          <p className="mt-5 max-w-xl text-sm leading-relaxed text-parchment-2 sm:text-base">
            Konsey toplanıyor. Barışçıllar mı Konsey'i ayakta tutacak, yoksa
            Saldırganlar mı Savaş Çığırtkanı'nı Savaş Bakanı koltuğuna oturtacak? Roller gizli, oylar açık,
            entrika her turda yeniden kurulur. Yalnız kaldıysan lobide bot ekleyip
            Konsey'i en az 5 kişiye tamamlayabilirsin.
          </p>

          <div className="mt-6 flex flex-wrap gap-2">
            <span className="badge border-gold/25 bg-ink/50 text-parchment-2">
              <Users className="h-3 w-3 text-gold" /> 5–10 oyuncu
            </span>
            <span className="badge border-gold/25 bg-ink/50 text-parchment-2">
              <Bot className="h-3 w-3 text-gold" /> Botlarla oynanır
            </span>
            <span className="badge border-gold/25 bg-ink/50 text-parchment-2">
              <Clock className="h-3 w-3 text-gold" /> 20–30 dakika
            </span>
            <span className="badge border-gold/25 bg-ink/50 text-parchment-2">
              <Smartphone className="h-3 w-3 text-gold" /> Telefondan oynanır
            </span>
          </div>

          <div className="mt-7 hidden gap-3 sm:flex">
            <div className="flex items-center gap-2 rounded-xl border border-liberal-2/25 bg-liberal/10 px-3 py-2 text-xs text-parchment-2">
              <span className="h-2 w-2 rounded-full bg-liberal-2" />
              Barışçıllar: 5 Barış Kararı
            </div>
            <div className="flex items-center gap-2 rounded-xl border border-fascist-2/25 bg-fascist/10 px-3 py-2 text-xs text-parchment-2">
              <span className="h-2 w-2 rounded-full bg-fascist-2" />
              Saldırganlar: 6 Savaş Kararı
            </div>
          </div>

          {lastRoom && (
            <button
              type="button"
              onClick={() => navigate(`/oda/${lastRoom.code}`)}
              className="mt-6 inline-flex items-center gap-2 rounded-xl border border-gold/25 bg-ink/50 px-3 py-2 text-xs text-parchment-2 transition hover:border-gold/50"
            >
              <Crown className="h-4 w-4 text-gold" />
              Son konseyin: <span className="font-mono tracking-[0.18em] text-gold-2">{lastRoom.code}</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          )}
        </section>

        <section className="animate-rise panel relative overflow-hidden p-5 sm:p-6" style={{ animationDelay: "80ms" }}>
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold/50 to-transparent" />
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="eyebrow">Konsey'e gir</p>
              <h2 className="title mt-1 text-2xl">Masanı kur</h2>
            </div>
            <div className="grid h-11 w-11 place-items-center rounded-full border border-gold/30 bg-wine/40">
              <Crown className="h-5 w-5 text-gold-2" />
            </div>
          </div>

          <label className="mt-5 block">
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

          <Button onClick={createRoom} variant="gold" className="mt-5 w-full py-3">
            <Crown className="h-4 w-4" />
            Konsey Kur
          </Button>

          <div className="my-4 flex items-center gap-3">
            <div className="divider-gold flex-1" />
            <span className="text-[10px] uppercase tracking-[0.24em] text-muted">veya</span>
            <div className="divider-gold flex-1" />
          </div>

          <div className="flex gap-2">
            <input
              value={code}
              onChange={(event) => {
                setCode(
                  event.target.value
                    .toUpperCase()
                    .replace(/[^A-Z0-9]/g, "")
                    .slice(0, 5),
                );
                setError(null);
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") joinRoom();
              }}
              placeholder="ODA KODU"
              className="input flex-1 text-center font-mono text-lg tracking-[0.3em] uppercase"
              autoCapitalize="characters"
              autoComplete="off"
              spellCheck={false}
              maxLength={5}
              aria-label="Oda kodu"
            />
            <Button onClick={joinRoom} variant="primary" className="px-4">
              Katıl
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>

          <p className="mt-4 flex items-start gap-2 text-[11px] leading-relaxed text-muted">
            <Crown className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gold/70" />
            Odayı kuran kişinin sekmesi açık kalmalı. Konsey, oda sahibinin tarayıcısında
            yaşar.
          </p>
        </section>
      </main>

      <footer className="relative z-10 mx-auto w-full max-w-6xl px-4 pb-8 sm:px-6">
        <div className="divider-gold mb-4" />
        <div className="flex flex-col items-start justify-between gap-2 text-[10px] text-muted/70 sm:flex-row sm:items-center">
          <p>
            Savaş Konseyi — ticari olmayan bir hayran projesi. Secret Hitler oyunundan
            esinlenmiştir.
          </p>
          <p className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-liberal-2" />
            Arkadaşlarınla oyna, kartını kimseye gösterme.
          </p>
        </div>
      </footer>

      <RulesModal open={rulesOpen} onClose={() => setRulesOpen(false)} />
    </div>
  );
}
