import { useCallback, useEffect, useRef, useState } from "react";
import type { Action } from "../game/types";
import {
  ClientSession,
  HostSession,
  type Session,
  type SessionSnapshot,
} from "./session";
import type { Profile } from "./storage";

export interface UseSessionResult extends SessionSnapshot {
  send: (action: Action) => void;
  leave: () => void;
}

export function useSession(
  code: string,
  host: boolean,
  profile: Profile | null,
): UseSessionResult {
  const [snapshot, setSnapshot] = useState<SessionSnapshot>(() => ({
    mode: host ? "host" : "client",
    status: "connecting",
    state: null,
    error: null,
    selfId: null,
  }));
  const sessionRef = useRef<Session | null>(null);
  const name = profile?.name ?? "";
  const avatar = profile?.avatar ?? "";

  useEffect(() => {
    if (!name) return;
    const session: Session = host
      ? new HostSession(code, { name, avatar })
      : new ClientSession(code, { name, avatar });
    sessionRef.current = session;
    const unsubscribe = session.subscribe((snapshot) => {
      setSnapshot({ ...snapshot });
    });
    session.start();
    return () => {
      unsubscribe();
      session.dispose();
      if (sessionRef.current === session) sessionRef.current = null;
    };
  }, [code, host, name, avatar]);

  const send = useCallback((action: Action) => {
    sessionRef.current?.send(action);
  }, []);

  const leave = useCallback(() => {
    sessionRef.current?.leave();
  }, []);

  return { ...snapshot, send, leave };
}
