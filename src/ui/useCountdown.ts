import { useEffect, useRef, useState } from "react";

export function useCountdown(
  endsAt: number | null,
  serverNow: number | null,
): number | null {
  const offset = useRef(0);
  const [, setTick] = useState(0);

  useEffect(() => {
    if (typeof serverNow === "number") {
      offset.current = serverNow - Date.now();
    }
  }, [serverNow]);

  useEffect(() => {
    if (!endsAt) return;
    const timer = window.setInterval(() => setTick((value) => value + 1), 250);
    return () => window.clearInterval(timer);
  }, [endsAt]);

  if (!endsAt) return null;
  return Math.max(0, Math.ceil((endsAt - (Date.now() + offset.current)) / 1000));
}

export function formatSeconds(seconds: number | null): string {
  if (seconds === null) return "--:--";
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return `${minutes}:${rest.toString().padStart(2, "0")}`;
}
