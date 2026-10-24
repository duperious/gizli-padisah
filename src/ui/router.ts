import { useEffect, useState } from "react";
import { isValidCode } from "../net/roomCode";

export type Route =
  | { name: "home" }
  | { name: "room"; code: string }
  | { name: "notfound" };

export function parseRoute(hash: string): Route {
  const clean = hash.replace(/^#/, "").replace(/^\//, "");
  if (!clean) return { name: "home" };
  const match = clean.match(/^oda\/([^/?#]+)/i);
  if (match?.[1]) {
    const code = decodeURIComponent(match[1]).toUpperCase();
    return { name: "room", code };
  }
  return { name: "notfound" };
}

export function useRoute(): Route {
  const [route, setRoute] = useState<Route>(() => parseRoute(window.location.hash));

  useEffect(() => {
    const onHash = () => {
      setRoute(parseRoute(window.location.hash));
      window.scrollTo({ top: 0, behavior: "instant" });
    };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  return route;
}

export function navigate(path: string): void {
  const next = path.startsWith("#") ? path : `#${path}`;
  if (window.location.hash === next) {
    window.dispatchEvent(new HashChangeEvent("hashchange"));
  } else {
    window.location.hash = next;
  }
}

export function roomPath(code: string): string {
  return `/oda/${code}`;
}

export function validRoomCode(code: string): boolean {
  return isValidCode(code);
}
