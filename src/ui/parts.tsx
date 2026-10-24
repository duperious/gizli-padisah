import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import clsx from "clsx";
import {
  AlertTriangle,
  Archive,
  Bot,
  Check,
  Copy,
  Crown,
  Eye,
  Gavel,
  Landmark,
  Layers,
  Loader2,
  MessageCircle,
  Scale,
  ScrollText,
  SendHorizontal,
  Shield,
  Skull,
  Sparkles,
  Star,
  Users,
  Vote,
  X,
} from "lucide-react";
import type { ClientPlayer, ClientState } from "../game/view";
import type { ChatEntry, LogEntry, Policy, Power, Role } from "../game/types";
import {
  POLICY_LABEL,
  POWER_LABEL,
  ROLE_LABEL,
  ROLE_TAGLINE,
} from "../game/labels";

/* ------------------------------------------------------------------ */
/* Marka ve süsler                                                     */
/* ------------------------------------------------------------------ */

export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="relative grid h-9 w-9 shrink-0 place-items-center rounded-full border border-gold/60 bg-wine/80 shadow-gold">
        <span className="font-display text-[13px] font-bold tracking-tight text-gold-2">
          GP
        </span>
      </div>
      <div className="leading-tight">
        <p className="font-display text-base font-bold text-parchment">Gizli Padişah</p>
        {!compact && (
          <p className="text-[10px] uppercase tracking-[0.24em] text-gold/70">
            Divan-ı Hümayun
          </p>
        )}
      </div>
    </div>
  );
}

export function Ornament({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 400 400"
      aria-hidden="true"
      className={className}
      fill="none"
      stroke="currentColor"
    >
      <circle cx="200" cy="200" r="186" strokeWidth="1" opacity="0.5" />
      <circle cx="200" cy="200" r="168" strokeWidth="0.6" opacity="0.35" />
      <path d="M200 18 L382 200 L200 382 L18 200 Z" strokeWidth="1" opacity="0.45" />
      <path d="M200 52 L348 200 L200 348 L52 200 Z" strokeWidth="0.6" opacity="0.3" />
      {Array.from({ length: 24 }).map((_, index) => {
        const angle = (index * Math.PI * 2) / 24;
        const x1 = 200 + Math.cos(angle) * 170;
        const y1 = 200 + Math.sin(angle) * 170;
        const x2 = 200 + Math.cos(angle) * 186;
        const y2 = 200 + Math.sin(angle) * 186;
        return (
          <line
            key={index}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            strokeWidth="0.7"
            opacity="0.35"
          />
        );
      })}
      <path d="M200 120 C230 150 230 175 200 200 C170 175 170 150 200 120 Z" strokeWidth="0.8" opacity="0.4" />
    </svg>
  );
}

export function Button({
  children,
  variant = "primary",
  className,
  loading,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "gold" | "ghost" | "danger";
  loading?: boolean;
}) {
  return (
    <button
      className={clsx(
        variant === "primary" && "btn-primary",
        variant === "gold" && "btn-gold",
        variant === "ghost" && "btn-ghost",
        variant === "danger" && "btn-danger",
        className,
      )}
      {...props}
      disabled={props.disabled || loading}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" />}
      {children}
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* Avatar, rozet, kart                                                 */
/* ------------------------------------------------------------------ */

const AVATAR_SIZES = {
  xs: "h-7 w-7 text-sm",
  sm: "h-9 w-9 text-lg",
  md: "h-11 w-11 text-xl",
  lg: "h-16 w-16 text-3xl",
};

export function Avatar({
  emoji,
  size = "md",
  dead,
  connected = true,
  highlight,
  className,
}: {
  emoji: string;
  size?: keyof typeof AVATAR_SIZES;
  dead?: boolean;
  connected?: boolean;
  highlight?: boolean;
  className?: string;
}) {
  return (
    <div
      className={clsx(
        "relative grid shrink-0 place-items-center rounded-full border bg-ink/80",
        AVATAR_SIZES[size],
        highlight ? "border-gold shadow-gold" : "border-gold/20",
        dead && "border-fascist/40",
        className,
      )}
    >
      <span className={clsx(dead && "opacity-35 grayscale")}>{emoji}</span>
      {dead && (
        <span className="absolute inset-0 grid place-items-center">
          <Skull className="h-4 w-4 text-fascist-2" />
        </span>
      )}
      {!connected && (
        <span
          className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-ink bg-fascist-2"
          title="Bağlantı yok"
        />
      )}
    </div>
  );
}

export function Badge({
  children,
  tone = "gold",
  className,
}: {
  children: ReactNode;
  tone?: "gold" | "liberal" | "fascist" | "muted";
  className?: string;
}) {
  return (
    <span
      className={clsx(
        "badge",
        tone === "gold" && "badge-gold",
        tone === "liberal" && "badge-liberal",
        tone === "fascist" && "badge-fascist",
        tone === "muted" && "border-gold/20 bg-ink/60 text-muted",
        className,
      )}
    >
      {children}
    </span>
  );
}

const POLICY_STYLES = {
  liberal: {
    box: "border-liberal-2/60 bg-gradient-to-b from-liberal/90 to-[#1c3e30] text-parchment",
    label: "text-liberal-2",
    icon: Scale,
    sub: "Divan'ın sesi",
  },
  fascist: {
    box: "border-fascist-2/70 bg-gradient-to-b from-fascist/90 to-[#4a1119] text-parchment",
    label: "text-fascist-2",
    icon: ScrollText,
    sub: "Saray'ın iradesi",
  },
};

const POLICY_SIZES = {
  sm: "h-[104px] w-[70px] p-1.5",
  md: "h-40 w-28 p-2.5",
  lg: "h-52 w-36 p-3",
};

export function PolicyCard({
  policy,
  faceDown,
  size = "md",
  onClick,
  disabled,
  selected,
  className,
}: {
  policy?: Policy;
  faceDown?: boolean;
  size?: keyof typeof POLICY_SIZES;
  onClick?: () => void;
  disabled?: boolean;
  selected?: boolean;
  className?: string;
}) {
  const interactive = Boolean(onClick) && !disabled;
  const handleKey = (event: React.KeyboardEvent) => {
    if (!interactive) return;
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onClick?.();
    }
  };

  if (faceDown || !policy) {
    return (
      <div
        role={interactive ? "button" : undefined}
        tabIndex={interactive ? 0 : undefined}
        onClick={interactive ? onClick : undefined}
        onKeyDown={handleKey}
        className={clsx(
          "relative flex flex-col items-center justify-center gap-2 overflow-hidden rounded-xl border-2 border-gold/30 bg-ink-3 text-gold/50 shadow-lift transition",
          POLICY_SIZES[size],
          interactive && "cursor-pointer hover:-translate-y-1 hover:border-gold/60",
          disabled && "opacity-60",
          className,
        )}
      >
        <div className="absolute inset-1.5 rounded-lg border border-gold/15" />
        <Star className="h-1/3 w-1/3" strokeWidth={1.2} />
        {size !== "sm" && (
          <span className="text-[9px] uppercase tracking-[0.24em]">Gizli</span>
        )}
      </div>
    );
  }

  const style = POLICY_STYLES[policy];
  const Icon = style.icon;
  return (
    <div
      role={interactive ? "button" : undefined}
      tabIndex={interactive ? 0 : undefined}
      onClick={interactive ? onClick : undefined}
      onKeyDown={handleKey}
      className={clsx(
        "relative flex flex-col items-center justify-between overflow-hidden rounded-xl border-2 shadow-lift transition",
        style.box,
        POLICY_SIZES[size],
        interactive && "cursor-pointer hover:-translate-y-1.5 hover:shadow-gold",
        selected && "ring-2 ring-gold ring-offset-2 ring-offset-ink",
        disabled && "opacity-60",
        className,
      )}
    >
      <div className="absolute inset-1 rounded-lg border border-white/15" />
      <div className="relative z-10 w-full text-center">
        <p className="text-[8px] uppercase tracking-[0.22em] text-white/60">
          Divan-ı Hümayun
        </p>
      </div>
      <div className="relative z-10 flex flex-col items-center gap-1.5">
        <Icon
          className={clsx(size === "sm" ? "h-5 w-5" : "h-8 w-8", "text-white/85")}
          strokeWidth={1.4}
        />
        <p
          className={clsx(
            "font-display font-bold uppercase tracking-wide",
            size === "sm" ? "text-[11px]" : size === "md" ? "text-base" : "text-xl",
          )}
        >
          {POLICY_LABEL[policy]}
        </p>
      </div>
      {size !== "sm" && (
        <p className="relative z-10 text-[8px] uppercase tracking-[0.18em] text-white/55">
          {style.sub}
        </p>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Modal, toast, kopyalama                                             */
/* ------------------------------------------------------------------ */

export function Modal({
  open,
  onClose,
  title,
  eyebrow,
  children,
  wide,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  eyebrow?: string;
  children: ReactNode;
  wide?: boolean;
  footer?: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4">
      <button
        type="button"
        aria-label="Kapat"
        onClick={onClose}
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
      />
      <div
        role="dialog"
        aria-modal="true"
        className={clsx(
          "panel animate-scale-in relative z-10 max-h-[92dvh] w-full overflow-y-auto rounded-b-none bg-ink-2 p-5 safe-bottom sm:rounded-2xl sm:p-6",
          wide ? "sm:max-w-2xl" : "sm:max-w-md",
        )}
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            {eyebrow && <p className="eyebrow mb-1">{eyebrow}</p>}
            {title && <h2 className="title text-xl">{title}</h2>}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-gold/20 p-1.5 text-muted transition hover:border-gold/50 hover:text-parchment"
            aria-label="Kapat"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        {children}
        {footer && <div className="mt-5">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}

export function Toast({
  message,
  onClose,
  tone = "error",
}: {
  message: string | null;
  onClose: () => void;
  tone?: "error" | "info";
}) {
  useEffect(() => {
    if (!message) return;
    const timer = window.setTimeout(onClose, 4500);
    return () => window.clearTimeout(timer);
  }, [message, onClose]);

  if (!message) return null;
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[60] flex justify-center px-4">
      <div
        className={clsx(
          "animate-rise pointer-events-auto flex max-w-sm items-start gap-2.5 rounded-xl border px-4 py-3 text-sm shadow-lift backdrop-blur-md",
          tone === "error"
            ? "border-fascist-2/50 bg-[#2a1114]/95 text-parchment"
            : "border-gold/40 bg-ink-2/95 text-parchment",
        )}
      >
        <AlertTriangle
          className={clsx(
            "mt-0.5 h-4 w-4 shrink-0",
            tone === "error" ? "text-fascist-2" : "text-gold",
          )}
        />
        <span>{message}</span>
        <button
          type="button"
          onClick={onClose}
          className="ml-auto text-muted hover:text-parchment"
          aria-label="Kapat"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

export function CopyButton({
  value,
  label = "Davet linkini kopyala",
  compact,
}: {
  value: string;
  label?: string;
  compact?: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const [failed, setFailed] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setFailed(false);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setFailed(true);
      window.setTimeout(() => setFailed(false), 2500);
    }
  };

  return (
    <button
      type="button"
      onClick={copy}
      className={clsx(
        "btn-ghost",
        compact ? "px-2.5 py-1.5 text-xs" : "w-full",
      )}
    >
      {copied ? (
        <Check className="h-4 w-4 text-liberal-2" />
      ) : (
        <Copy className="h-4 w-4 text-gold" />
      )}
      {copied ? "Kopyalandı" : failed ? "Kopyalanamadı" : label}
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* Tahta                                                               */
/* ------------------------------------------------------------------ */

const POWER_GLYPH: Record<Power, typeof Eye> = {
  investigate: Eye,
  special: Crown,
  peek: ScrollText,
  execute: Gavel,
};

const POWER_SHORT: Record<Power, string> = {
  investigate: "Teftiş",
  special: "F.-ı Şahane",
  peek: "İstihbarat",
  execute: "Kalebend",
};

function DeckStack({
  label,
  value,
  icon,
  tone,
}: {
  label: string;
  value: number;
  icon: ReactNode;
  tone: "gold" | "muted";
}) {
  return (
    <div className={clsx("deck-stack", tone === "gold" ? "deck-stack-gold" : "deck-stack-muted")}>
      <span className="deck-stack-art" aria-hidden="true">
        <span />
        <span />
        <span />
        <span className="deck-stack-glyph">{icon}</span>
      </span>
      <span className="leading-tight">
        <span className="block text-[8px] uppercase tracking-[0.18em] text-muted">{label}</span>
        <span className="block font-display text-base font-bold text-parchment">{value}</span>
      </span>
    </div>
  );
}

function PolicyTrack({
  party,
  count,
  total,
  powers,
}: {
  party: "liberal" | "fascist";
  count: number;
  total: number;
  powers?: (Power | null)[];
}) {
  const fascist = party === "fascist";
  const Icon = fascist ? ScrollText : Scale;
  return (
    <div
      className={clsx(
        "policy-track",
        fascist ? "policy-track-fascist" : "policy-track-liberal",
      )}
    >
      <div className="policy-track-head">
        <div className="flex min-w-0 items-center gap-2">
          <span
            className={clsx(
              "policy-track-icon",
              fascist ? "text-fascist-2" : "text-liberal-2",
            )}
          >
            <Icon className="h-4 w-4" strokeWidth={1.5} />
          </span>
          <div className="min-w-0">
            <p className="truncate text-[9px] font-semibold uppercase tracking-[0.2em] text-parchment-2">
              {fascist ? "Saray Fermanları" : "Islahat Fermaları"}
            </p>
            <p className="truncate text-[9px] text-muted">
              {fascist ? "6 Ferman Saray'ın zaferi" : "5 Islahat Divan'ın zaferi"}
            </p>
          </div>
        </div>
        <p
          className={clsx(
            "font-display text-lg font-bold leading-none",
            fascist ? "text-fascist-2" : "text-liberal-2",
          )}
        >
          {count}
          <span className="text-[11px] text-muted">/{total}</span>
        </p>
      </div>

      <div
        className={clsx(
          "policy-track-grid",
          fascist ? "grid-cols-6" : "grid-cols-5",
        )}
      >
        <div className="policy-track-watermark" aria-hidden="true">
          <Icon className="h-full w-full" strokeWidth={0.7} />
        </div>
        {Array.from({ length: total }).map((_, index) => {
          const slot = index + 1;
          const filled = slot <= count;
          const final = slot === total;
          const power = powers?.[slot] ?? null;
          const PowerIcon = power ? POWER_GLYPH[power] : null;
          return (
            <div
              key={slot}
              title={
                final
                  ? `${slot}. ${fascist ? "Ferman" : "Islahat"}: zafer`
                  : power
                    ? `${slot}. Ferman: ${POWER_LABEL[power]}`
                    : `${slot}. ${fascist ? "Ferman" : "Islahat"}`
              }
              className={clsx(
                "policy-slot",
                filled && "policy-slot-filled",
                final && "policy-slot-final",
              )}
            >
              {filled ? (
                <>
                  <Icon className="h-4 w-4 opacity-80" strokeWidth={1.5} />
                  <span className="text-[7px] font-semibold uppercase tracking-[0.12em] text-parchment/80">
                    {fascist ? "Ferman" : "Islahat"}
                  </span>
                </>
              ) : (
                <>
                  <span className="policy-slot-number">{slot}</span>
                  {final ? (
                    <span className="policy-slot-power text-gold-2">
                      <Crown className="h-3.5 w-3.5" strokeWidth={1.5} />
                      Zafer
                    </span>
                  ) : power && PowerIcon ? (
                    <span className="policy-slot-power">
                      <PowerIcon className="h-3 w-3" strokeWidth={1.6} />
                      {POWER_SHORT[power]}
                    </span>
                  ) : (
                    <span className="text-[9px] text-muted/50">—</span>
                  )}
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function Board({ state }: { state: ClientState }) {
  const powers = state.board.powers;
  return (
    <section className="policy-board" aria-label="Ferman ve Islahat tahtası">
      <div className="policy-board-head">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="board-seal">
            <Landmark className="h-5 w-5" strokeWidth={1.4} />
          </span>
          <div className="min-w-0">
            <p className="eyebrow">Divan Tahtası</p>
            <h2 className="font-display text-base font-bold leading-none sm:text-xl">
              Ferman Dengesi
            </h2>
          </div>
        </div>
        <div className="ml-auto flex shrink-0 items-center gap-1.5 sm:gap-2">
          <DeckStack
            label="Deste"
            value={state.deckCount}
            tone="gold"
            icon={<Layers className="h-3.5 w-3.5" />}
          />
          <DeckStack
            label="Atık"
            value={state.discardCount}
            tone="muted"
            icon={<Archive className="h-3.5 w-3.5" />}
          />
        </div>
      </div>

      <PolicyTrack
        party="fascist"
        count={state.board.fascist}
        total={6}
        powers={powers}
      />
      <PolicyTrack party="liberal" count={state.board.liberal} total={5} />

      <div className="policy-board-foot">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[9px] font-semibold uppercase tracking-[0.18em] text-muted">
            Seçim sayacı
          </span>
          <div className="flex gap-1.5" aria-label={`Seçim sayacı ${state.board.tracker}/3`}>
            {Array.from({ length: 3 }).map((_, index) => (
              <span
                key={index}
                className={clsx(
                  "h-2.5 w-2.5 rounded-full border transition",
                  index < state.board.tracker
                    ? "border-gold bg-gold shadow-[0_0_10px_rgba(201,162,75,0.5)]"
                    : "border-gold/25 bg-transparent",
                )}
              />
            ))}
          </div>
          {state.board.tracker >= 2 && (
            <span className="text-[9px] text-gold-2">
              Bir sonraki düşüşte üst ferman açılır
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {state.board.vetoUnlocked ? (
            <Badge tone="gold">
              <Shield className="h-3 w-3" /> Veto açık
            </Badge>
          ) : (
            <span className="text-[9px] text-muted/70">Veto 5. Ferman'da açılır</span>
          )}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Oyuncu kartı                                                        */
/* ------------------------------------------------------------------ */

export function PlayerCard({
  player,
  isYou,
  selectable,
  selected,
  onSelect,
  showRole,
  compact,
  voted,
  revealedVote,
  className,
}: {
  player: ClientPlayer;
  isYou: boolean;
  selectable?: boolean;
  selected?: boolean;
  onSelect?: () => void;
  showRole?: boolean;
  compact?: boolean;
  voted?: boolean;
  revealedVote?: boolean | null;
  className?: string;
}) {
  const disabled = selectable === false;
  const roleTone =
    player.role === "liberal"
      ? "player-seat-badge-liberal"
      : player.role === "hitler"
        ? "player-seat-badge-gold"
        : "player-seat-badge-fascist";

  const roleLabel = !player.alive
    ? "Kalebend"
    : showRole && player.role
      ? ROLE_LABEL[player.role]
      : player.isPresident
        ? "Reis"
        : player.isChancellor
          ? "Vezir"
          : player.isNominee
            ? "Aday"
            : !player.connected
              ? "Kopuk"
              : player.isBot
                ? "Bot"
                : isYou
                  ? "Sen"
                  : "Divan";

  return (
    <button
      type="button"
      onClick={selectable ? onSelect : undefined}
      disabled={!selectable}
      aria-pressed={selectable ? selected : undefined}
      title={player.name}
      className={clsx(
        "player-seat",
        compact && "player-seat-compact",
        selectable && "player-seat-target",
        selected && "player-seat-selected",
        disabled && "player-seat-dim",
        isYou && "player-seat-you",
        !player.alive && "player-seat-dead",
        className,
      )}
    >
      <span className="player-seat-medallion">
        <Avatar
          emoji={player.avatar}
          size={compact ? "sm" : "md"}
          dead={!player.alive}
          connected={player.connected}
          highlight={player.isPresident || player.isChancellor}
        />
        {player.isPresident && (
          <span className="seat-flag seat-flag-president" title="Reis">
            <Crown className="h-2.5 w-2.5" />
          </span>
        )}
        {player.isChancellor && (
          <span className="seat-flag seat-flag-chancellor" title="Vezir">
            <Shield className="h-2.5 w-2.5" />
          </span>
        )}
        {player.isNominee && !player.isChancellor && (
          <span className="seat-flag seat-flag-nominee" title="Aday">
            <Vote className="h-2.5 w-2.5" />
          </span>
        )}
      </span>

      <span className="player-seat-name">
        <span className="min-w-0 truncate">{player.name}</span>
        {player.isHost && <Crown className="h-2.5 w-2.5 shrink-0 text-gold/80" />}
        {player.isBot && <Bot className="h-2.5 w-2.5 shrink-0 text-muted" />}
      </span>

      <span className="player-seat-roles">
        <span
          className={clsx(
            "player-seat-badge",
            !player.alive
              ? "player-seat-badge-fascist"
              : showRole && player.role
                ? roleTone
                : player.isPresident
                  ? "player-seat-badge-gold"
                  : player.isChancellor
                    ? "player-seat-badge-liberal"
                    : player.isNominee
                      ? "player-seat-badge-muted"
                      : !player.connected
                        ? "player-seat-badge-fascist"
                        : "player-seat-badge-muted",
          )}
        >
          {roleLabel}
        </span>
      </span>

      {voted && (
        <span
          className={clsx(
            "player-seat-voted",
            revealedVote === false && "player-seat-voted-no",
          )}
          title={
            revealedVote == null ? "Oy verdi" : revealedVote ? "Evet" : "Hayır"
          }
        >
          {revealedVote === false ? (
            <X className="h-2.5 w-2.5" />
          ) : (
            <Check className="h-2.5 w-2.5" />
          )}
        </span>
      )}

      {selected && (
        <span className="player-seat-selected-mark">
          <Check className="h-2.5 w-2.5" />
        </span>
      )}
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* Rol kartı                                                           */
/* ------------------------------------------------------------------ */

const ROLE_STYLE: Record<
  Role,
  { box: string; seal: string; icon: typeof Scale; text: string }
> = {
  liberal: {
    box: "border-liberal-2/60 bg-gradient-to-br from-[#1e4636] via-liberal to-[#17382b]",
    seal: "text-liberal-2",
    icon: Scale,
    text: "Divan'ı ayakta tut. Beş Islahat geçir ya da Padişah'ı kalebende gönder.",
  },
  fascist: {
    box: "border-fascist-2/60 bg-gradient-to-br from-[#5b151b] via-fascist to-[#3d0e13]",
    seal: "text-fascist-2",
    icon: ScrollText,
    text: "Padişah'ı koru. Altı Ferman geçir ya da Padişah'ı Vezir yap.",
  },
  hitler: {
    box: "border-gold/60 bg-gradient-to-br from-[#6d1c2a] via-wine to-[#2a0a10]",
    seal: "text-gold-2",
    icon: Crown,
    text: "Gizli lider sensin. Üç Ferman'dan sonra Vezir seçilirsen Saray kazanır. Kalebend'den sakın.",
  },
};

export function RoleCard({
  role,
  players,
  teammates,
  name,
}: {
  role: Role;
  players: ClientPlayer[];
  teammates: string[];
  name: string;
}) {
  const style = ROLE_STYLE[role];
  const Icon = style.icon;
  const mates = players.filter((player) => teammates.includes(player.id));
  return (
    <div
      className={clsx(
        "relative overflow-hidden rounded-2xl border-2 p-5 shadow-lift",
        style.box,
      )}
    >
      <div className="absolute inset-1.5 rounded-xl border border-white/20" />
      <div className="absolute -right-8 -top-8 opacity-15">
        <Icon className="h-40 w-40" strokeWidth={1} />
      </div>
      <div className="relative z-10">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] uppercase tracking-[0.26em] text-white/60">
              Gizli rolün
            </p>
            <h3 className="font-display text-3xl font-bold">{ROLE_LABEL[role]}</h3>
            <p className="text-xs text-white/70">{ROLE_TAGLINE[role]}</p>
          </div>
          <div className="grid h-14 w-14 place-items-center rounded-full border border-white/30 bg-black/20">
            <Icon className="h-7 w-7" strokeWidth={1.4} />
          </div>
        </div>

        <p className="mt-4 rounded-lg border border-white/15 bg-black/20 p-3 text-sm leading-relaxed text-white/85">
          {style.text}
        </p>

        {role !== "liberal" && (
          <div className="mt-4">
            <p className="text-[10px] uppercase tracking-[0.22em] text-white/55">
              {role === "hitler" && players.length > 6
                ? "Yandaşlarını bilmiyorsun"
                : "Yandaşların"}
            </p>
            {mates.length > 0 ? (
              <div className="mt-2 flex flex-wrap gap-2">
                {mates.map((mate) => (
                  <span
                    key={mate.id}
                    className="inline-flex items-center gap-1.5 rounded-full border border-white/25 bg-black/25 px-2.5 py-1 text-xs"
                  >
                    <span>{mate.avatar}</span>
                    {mate.name}
                  </span>
                ))}
              </div>
            ) : (
              <p className="mt-1 text-xs text-white/60">
                Kimseyi tanımıyorsun. Dikkatli oyna.
              </p>
            )}
          </div>
        )}

        {role === "liberal" && (
          <div className="mt-4 flex items-center gap-2 text-xs text-white/70">
            <Users className="h-4 w-4" />
            Yalnızsın ama çoğunluktasın. {name}, divanı koru.
          </div>
        )}

        <p className="mt-4 text-center text-[9px] uppercase tracking-[0.24em] text-white/40">
          Bu kartı kimseye gösterme
        </p>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Sohbet ve günlük                                                    */
/* ------------------------------------------------------------------ */

export function ChatPanel({
  messages,
  onSend,
  selfId,
  disabled,
  className,
  inputPlaceholder = "Divan'a bir şey söyle…",
}: {
  messages: ChatEntry[];
  onSend: (text: string) => void;
  selfId: string | null;
  disabled?: boolean;
  className?: string;
  inputPlaceholder?: string;
}) {
  const [text, setText] = useState("");
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = listRef.current;
    if (node) node.scrollTop = node.scrollHeight;
  }, [messages.length]);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const clean = text.trim();
    if (!clean) return;
    onSend(clean);
    setText("");
  };

  return (
    <div className={clsx("flex min-h-0 flex-col", className)}>
      <div ref={listRef} className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
        {messages.length === 0 && (
          <p className="py-6 text-center text-xs text-muted">
            Henüz kimse konuşmadı. İlk sözü sen söyle.
          </p>
        )}
        {messages.map((message) =>
          message.system ? (
            <p
              key={message.id}
              className="py-0.5 text-center text-[10px] uppercase tracking-wide text-muted/80"
            >
              {message.text}
            </p>
          ) : (
            <div
              key={message.id}
              className={clsx(
                "rounded-lg border px-2.5 py-1.5 text-xs",
                message.playerId === selfId
                  ? "border-gold/25 bg-gold/10"
                  : "border-gold/10 bg-ink/50",
              )}
            >
              <div className="flex items-baseline justify-between gap-2">
                <span className="font-semibold text-gold-2">{message.name}</span>
                <span className="text-[9px] text-muted">
                  {new Date(message.at).toLocaleTimeString("tr-TR", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
              <p className="mt-0.5 break-words leading-relaxed text-parchment-2">
                {message.text}
              </p>
            </div>
          ),
        )}
      </div>
      <form onSubmit={submit} className="mt-2 flex gap-2">
        <input
          value={text}
          onChange={(event) => setText(event.target.value)}
          maxLength={240}
          placeholder={disabled ? "Bağlantı bekleniyor…" : inputPlaceholder}
          disabled={disabled}
          className="input flex-1 py-2 text-xs"
          aria-label="Mesaj"
        />
        <Button
          type="submit"
          variant="ghost"
          className="px-3 py-2"
          disabled={disabled || !text.trim()}
          aria-label="Gönder"
        >
          <SendHorizontal className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );
}

export function LogPanel({ entries }: { entries: LogEntry[] }) {
  const listRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const node = listRef.current;
    if (node) node.scrollTop = node.scrollHeight;
  }, [entries.length]);

  const iconFor = (kind: LogEntry["kind"]) => {
    if (kind === "policy") return <ScrollText className="h-3.5 w-3.5 text-gold" />;
    if (kind === "election") return <Vote className="h-3.5 w-3.5 text-gold" />;
    if (kind === "death") return <Skull className="h-3.5 w-3.5 text-fascist-2" />;
    if (kind === "power") return <Sparkles className="h-3.5 w-3.5 text-gold" />;
    return <Landmark className="h-3.5 w-3.5 text-muted" />;
  };

  return (
    <div ref={listRef} className="h-full space-y-2 overflow-y-auto pr-1">
      {entries.length === 0 && (
        <p className="py-6 text-center text-xs text-muted">Divan henüz konuşmadı.</p>
      )}
      {entries.map((entry) => (
        <div key={entry.id} className="flex gap-2 text-[11px] leading-relaxed">
          <span className="mt-0.5 shrink-0">{iconFor(entry.kind)}</span>
          <div>
            <p
              className={clsx(
                "text-parchment-2",
                entry.kind === "death" && "text-fascist-2",
                entry.kind === "system" && "text-muted",
              )}
            >
              {entry.text}
            </p>
            <p className="text-[9px] text-muted/60">
              {new Date(entry.at).toLocaleTimeString("tr-TR", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Bağlantı / yükleniyor                                               */
/* ------------------------------------------------------------------ */

export function LoadingScreen({ label = "Divan toplanıyor…" }: { label?: string }) {
  return (
    <div className="grid min-h-[60dvh] place-items-center">
      <div className="text-center">
        <Loader2 className="mx-auto h-8 w-8 animate-spin text-gold" />
        <p className="mt-3 text-sm text-muted">{label}</p>
      </div>
    </div>
  );
}

export function StatusPill({
  status,
  isHost,
}: {
  status: "connecting" | "online" | "offline" | "error" | "closed";
  isHost: boolean;
}) {
  const map = {
    connecting: { label: isHost ? "Divan açılıyor" : "Bağlanıyor", tone: "text-gold" },
    online: { label: isHost ? "Divan açık" : "Bağlı", tone: "text-liberal-2" },
    offline: { label: "Bağlantı aranıyor", tone: "text-gold" },
    error: { label: "Bağlantı yok", tone: "text-fascist-2" },
    closed: { label: "Kapandı", tone: "text-muted" },
  }[status];
  return (
    <span className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.2em] text-muted">
      <span
        className={clsx(
          "h-1.5 w-1.5 rounded-full",
          status === "online" ? "bg-liberal-2" : status === "error" ? "bg-fascist-2" : "bg-gold",
        )}
      />
      <span className={map.tone}>{map.label}</span>
    </span>
  );
}

export function PhaseIcon({ phase }: { phase: ClientState["phase"] }) {
  if (phase === "vote" || phase === "vote_result")
    return <Vote className="h-4 w-4" />;
  if (phase.startsWith("power")) return <Sparkles className="h-4 w-4" />;
  if (phase === "president_discard" || phase === "chancellor_enact")
    return <ScrollText className="h-4 w-4" />;
  if (phase === "ended") return <Crown className="h-4 w-4" />;
  return <Landmark className="h-4 w-4" />;
}

export function EyeButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="btn-ghost px-2.5 py-2 text-xs"
      aria-label="Rolünü göster"
    >
      <Eye className="h-4 w-4 text-gold" />
      <span className="hidden sm:inline">Rolün</span>
    </button>
  );
}

export function ChatIcon() {
  return <MessageCircle className="h-4 w-4" />;
}
