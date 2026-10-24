import type { Action } from "../game/types";
import type { ClientState } from "../game/view";

export type ClientMessage =
  | {
      t: "hello";
      name: string;
      avatar?: string;
      token?: string | null;
    }
  | { t: "action"; action: Action }
  | { t: "leave" };

export type HostMessage =
  | {
      t: "welcome";
      playerId: string;
      token: string;
      state: ClientState;
    }
  | { t: "snapshot"; state: ClientState }
  | { t: "error"; message: string }
  | { t: "closed"; message: string };

const ACTION_TYPES = new Set<string>([
  "ready",
  "pace",
  "start",
  "nominate",
  "vote",
  "discard",
  "enact",
  "vetoRequest",
  "vetoResponse",
  "ack",
  "investigate",
  "special",
  "execute",
  "chat",
  "rematch",
]);

export function isAction(value: unknown): value is Action {
  if (!value || typeof value !== "object") return false;
  const type = (value as { type?: unknown }).type;
  return typeof type === "string" && ACTION_TYPES.has(type);
}
