import Peer, { type DataConnection } from "peerjs";
import { addPlayer, apply, createLobby, GameError, markConnected, removePlayer, tick } from "../game/engine";
import type { Action, GameState } from "../game/types";
import { project, type ClientState } from "../game/view";
import { sanitizeAvatar } from "../game/avatars";
import { isAction, type ClientMessage, type HostMessage } from "./protocol";
import { peerIdFor } from "./roomCode";
import {
  clearHostInfo,
  clearHostState,
  getToken,
  loadHostState,
  saveHostInfo,
  saveHostState,
  saveLastHosted,
  saveToken,
  type Profile,
} from "./storage";

export type SessionStatus = "connecting" | "online" | "offline" | "error" | "closed";

export interface SessionSnapshot {
  mode: "host" | "client";
  status: SessionStatus;
  state: ClientState | null;
  error: string | null;
  selfId: string | null;
}

export interface Session {
  readonly mode: "host" | "client";
  subscribe(listener: (snapshot: SessionSnapshot) => void): () => void;
  start(): void;
  send(action: Action): void;
  leave(): void;
  dispose(): void;
}

const ICE: RTCConfiguration = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    {
      urls: [
        "turn:openrelay.metered.ca:80",
        "turn:openrelay.metered.ca:443",
        "turns:openrelay.metered.ca:443",
      ],
      username: "openrelayproject",
      credential: "openrelayproject",
    },
  ],
};

const PEER_OPTIONS = {
  debug: 0,
  config: ICE,
} as const;

abstract class BaseSession implements Session {
  abstract readonly mode: "host" | "client";
  protected listeners = new Set<(snapshot: SessionSnapshot) => void>();
  protected snap: SessionSnapshot;
  protected disposed = false;

  constructor(mode: "host" | "client") {
    this.snap = {
      mode,
      status: "connecting",
      state: null,
      error: null,
      selfId: null,
    };
  }

  subscribe(listener: (snapshot: SessionSnapshot) => void): () => void {
    this.listeners.add(listener);
    listener(this.snap);
    return () => {
      this.listeners.delete(listener);
    };
  }

  protected emit(): void {
    for (const listener of this.listeners) listener(this.snap);
  }

  abstract start(): void;
  abstract send(action: Action): void;
  abstract leave(): void;
  abstract dispose(): void;
}

interface ConnMeta {
  playerId: string | null;
  helloTimer: number | null;
}

export class HostSession extends BaseSession {
  readonly mode = "host" as const;
  private state: GameState;
  private hostId: string;
  private peer: Peer | null = null;
  private started = false;
  private restored = false;
  private idRetries = 0;
  private connections = new Map<string, DataConnection>();
  private connMeta = new Map<DataConnection, ConnMeta>();
  private pendingRemoval = new Map<string, number>();
  private chatTimes = new Map<string, number>();
  private timer: number | null = null;
  private errorTimer: number | null = null;
  private peerTimer: number | null = null;

  constructor(
    private code: string,
    profile: Profile,
  ) {
    super("host");
    const saved = loadHostState(code);
    this.restored = Boolean(saved);
    if (saved) {
      this.state = saved;
      this.state.players.forEach((player) => {
        player.connected = player.id === this.state.hostId;
      });
      saveHostState(this.state);
    } else {
      this.state = createLobby(code, profile);
      saveHostState(this.state);
      saveLastHosted(code, profile.name);
      saveHostInfo(code, { ...profile, createdAt: Date.now() });
    }
    this.hostId = this.state.hostId;
    this.snap.selfId = this.hostId;
    this.refresh();
  }

  start(): void {
    if (this.started || this.disposed) return;
    this.started = true;
    this.addLifecycle();
    this.openPeer();
    this.refresh();
    // Yeniden açılan odada kısa süre önce kopan oyuncuları lobiden temizle.
    for (const player of this.state.players) {
      if (player.id !== this.hostId && !player.connected) {
        this.scheduleRemoval(player.id);
      }
    }
  }

  private addLifecycle(): void {
    window.addEventListener("beforeunload", this.onBeforeUnload);
    window.addEventListener("online", this.onVisible);
    document.addEventListener("visibilitychange", this.onVisible);
  }

  private removeLifecycle(): void {
    window.removeEventListener("beforeunload", this.onBeforeUnload);
    window.removeEventListener("online", this.onVisible);
    document.removeEventListener("visibilitychange", this.onVisible);
  }

  private onBeforeUnload = (event: BeforeUnloadEvent): void => {
    if (this.state.players.length > 1) {
      event.preventDefault();
      event.returnValue = "";
    }
  };

  private onVisible = (): void => {
    if (document.visibilityState === "visible") this.runTick();
  };

  private openPeer(): void {
    if (this.disposed) return;
    const peer = new Peer(peerIdFor(this.code), PEER_OPTIONS);
    this.peer = peer;
    this.clearPeerTimer();
    this.peerTimer = window.setTimeout(() => {
      if (this.peer !== peer || this.disposed || peer.open) return;
      this.snap.status = "offline";
      this.snap.error =
        "Sinyal sunucusuna ulaşılamadı. İnternet bağlantını kontrol et; davet linki çalışmayabilir.";
      this.refresh();
    }, 18000);

    peer.on("open", () => {
      if (this.peer !== peer || this.disposed) return;
      this.clearPeerTimer();
      this.idRetries = 0;
      this.snap.status = "online";
      this.snap.error = null;
      this.refresh();
      this.schedule();
    });

    peer.on("connection", (connection) => {
      if (this.peer !== peer || this.disposed) return;
      this.setupConnection(connection);
    });

    peer.on("error", (error) => {
      if (this.peer !== peer || this.disposed) return;
      this.handlePeerError(error as { type?: string; message?: string });
    });

    peer.on("disconnected", () => {
      if (this.peer !== peer || this.disposed) return;
      this.snap.status = "offline";
      this.snap.error = "Sinyal sunucusuyla bağlantı koptu; mevcut oyun devam ediyor.";
      this.refresh();
      window.setTimeout(() => {
        if (!this.disposed && this.peer === peer) {
          try {
            peer.reconnect();
          } catch {
            // yeniden bağlanma başarısız; hata olayı bilgi verecek
          }
        }
      }, 1500);
    });

    peer.on("close", () => {
      if (this.peer !== peer || this.disposed) return;
      this.clearPeerTimer();
      if (this.snap.status !== "error") {
        this.snap.status = "closed";
        this.snap.error = "Divan kapandı.";
        this.refresh();
      }
    });
  }

  private clearPeerTimer(): void {
    if (this.peerTimer) {
      clearTimeout(this.peerTimer);
      this.peerTimer = null;
    }
  }

  private handlePeerError(error: { type?: string; message?: string }): void {
    const type = error.type ?? "";
    if (type === "unavailable-id") {
      if (this.restored && this.idRetries < 3) {
        this.idRetries += 1;
        this.clearPeerTimer();
        try {
          this.peer?.destroy();
        } catch {
          // yoksay
        }
        this.peer = null;
        window.setTimeout(() => this.openPeer(), 1200);
        return;
      }
      this.snap.status = "error";
      this.snap.error = "Bu oda kodu şu an kullanımda. Ana sayfadan yeni bir kod al.";
      this.refresh();
      return;
    }
    if (type === "browser-incompatible") {
      this.snap.status = "error";
      this.snap.error = "Tarayıcı WebRTC desteklemiyor. Güncel Chrome, Safari veya Firefox dene.";
      this.refresh();
      return;
    }
    if (
      type === "network" ||
      type === "server-error" ||
      type === "socket-error" ||
      type === "socket-closed"
    ) {
      this.snap.status = "offline";
      this.snap.error = "Sinyal sunucusuna ulaşılamıyor. Yeni katılımlar bekleyebilir.";
      this.refresh();
      return;
    }
    console.warn("PeerJS hatası", error);
  }

  private setupConnection(connection: DataConnection): void {
    const meta: ConnMeta = { playerId: null, helloTimer: null };
    meta.helloTimer = window.setTimeout(() => {
      if (!meta.playerId) {
        try {
          connection.close();
        } catch {
          // yoksay
        }
      }
    }, 15000);
    this.connMeta.set(connection, meta);
    connection.on("data", (data) => this.handleData(connection, data));
    connection.on("close", () => this.handleClose(connection));
    connection.on("error", () => this.handleClose(connection));
  }

  private handleData(connection: DataConnection, data: unknown): void {
    if (!data || typeof data !== "object") return;
    const message = data as ClientMessage;
    if (message.t === "hello") {
      this.handleHello(connection, message);
      return;
    }

    const meta = this.connMeta.get(connection);
    if (!meta?.playerId) {
      this.sendError(connection, "Önce divana katıl.");
      return;
    }
    if (message.t === "leave") {
      this.handleLeave(meta.playerId, connection);
      return;
    }
    if (message.t === "action") {
      if (!isAction(message.action)) {
        this.sendError(connection, "Geçersiz hamle.");
        return;
      }
      this.dispatch(meta.playerId, message.action, connection);
    }
  }

  private handleHello(
    connection: DataConnection,
    message: Extract<ClientMessage, { t: "hello" }>,
  ): void {
    const meta = this.connMeta.get(connection);
    if (!meta || meta.playerId) return;

    let name: string;
    try {
      name = String(message.name ?? "");
      if (name.trim().length < 2) throw new GameError("İsim en az 2 karakter olmalı.");
    } catch (error) {
      this.sendError(connection, error instanceof GameError ? error.message : "Geçersiz isim.");
      return;
    }

    const used = this.state.players.map((player) => player.avatar);
    const avatar = sanitizeAvatar(message.avatar, used);
    const token = typeof message.token === "string" && message.token ? message.token : null;
    let player = token ? this.state.players.find((p) => p.token === token) : undefined;

    if (!player) {
      if (this.state.phase !== "lobby") {
        this.sendError(connection, "Oyun başladı; yeni oyuncu alınamıyor.");
        return;
      }
      try {
        const result = addPlayer(this.state, { name, avatar });
        this.state = result.state;
        player = result.player;
      } catch (error) {
        this.sendError(
          connection,
          error instanceof GameError ? error.message : "Divana katılınamadı.",
        );
        return;
      }
    }

    this.bindConnection(connection, player.id);
    this.saveAndBroadcast();
  }

  private bindConnection(connection: DataConnection, playerId: string): void {
    const meta = this.connMeta.get(connection);
    if (!meta) return;
    meta.playerId = playerId;
    if (meta.helloTimer) {
      clearTimeout(meta.helloTimer);
      meta.helloTimer = null;
    }

    const old = this.connections.get(playerId);
    if (old && old !== connection) {
      this.connMeta.delete(old);
      try {
        old.close();
      } catch {
        // yoksay
      }
    }
    this.connections.set(playerId, connection);

    const pending = this.pendingRemoval.get(playerId);
    if (pending) {
      clearTimeout(pending);
      this.pendingRemoval.delete(playerId);
    }

    this.state = markConnected(this.state, playerId, true);
    const player = this.state.players.find((p) => p.id === playerId);
    if (!player) return;

    try {
      connection.send({
        t: "welcome",
        playerId,
        token: player.token,
        state: project(this.state, playerId),
      } satisfies HostMessage);
    } catch {
      // bağlantı hemen kapanmış olabilir
    }
  }

  private handleLeave(playerId: string, connection: DataConnection): void {
    const player = this.state.players.find((p) => p.id === playerId);
    if (!player) return;

    if (this.state.phase === "lobby" && playerId !== this.hostId) {
      try {
        this.state = removePlayer(this.state, playerId);
      } catch {
        // yoksay
      }
      this.connections.delete(playerId);
      this.connMeta.delete(connection);
      const pending = this.pendingRemoval.get(playerId);
      if (pending) {
        clearTimeout(pending);
        this.pendingRemoval.delete(playerId);
      }
      try {
        connection.close();
      } catch {
        // yoksay
      }
      this.saveAndBroadcast();
      return;
    }

    this.handleClose(connection);
    try {
      connection.close();
    } catch {
      // yoksay
    }
  }

  private handleClose(connection: DataConnection): void {
    const meta = this.connMeta.get(connection);
    if (!meta) return;
    this.connMeta.delete(connection);
    const playerId = meta.playerId;
    if (!playerId) return;
    if (this.connections.get(playerId) !== connection) return;

    this.connections.delete(playerId);
    this.state = markConnected(this.state, playerId, false);
    this.saveAndBroadcast();
    if (this.state.phase === "lobby") this.scheduleRemoval(playerId);
  }

  private scheduleRemoval(playerId: string): void {
    if (playerId === this.hostId || this.pendingRemoval.has(playerId)) return;
    const timer = window.setTimeout(() => {
      this.pendingRemoval.delete(playerId);
      if (this.disposed) return;
      const player = this.state.players.find((p) => p.id === playerId);
      if (!player || player.connected || this.state.phase !== "lobby") return;
      try {
        this.state = removePlayer(this.state, playerId);
        this.saveAndBroadcast();
      } catch {
        // yoksay
      }
    }, 45000);
    this.pendingRemoval.set(playerId, timer);
  }

  private dispatch(
    playerId: string,
    action: Action,
    connection: DataConnection | null,
  ): void {
    if (action.type === "chat") {
      const now = Date.now();
      const last = this.chatTimes.get(playerId) ?? 0;
      if (now - last < 600) {
        this.sendError(connection, "Çok hızlı yazıyorsun; bir saniye bekle.");
        return;
      }
      this.chatTimes.set(playerId, now);
    }

    try {
      this.state = apply(this.state, playerId, action, Date.now());
      if (!connection) this.snap.error = null;
      this.saveAndBroadcast();
    } catch (error) {
      const message =
        error instanceof GameError ? error.message : "Hamle uygulanamadı.";
      if (connection) {
        this.sendError(connection, message);
      } else {
        this.transientError(message);
      }
    }
  }

  private sendError(connection: DataConnection | null, message: string): void {
    if (!connection) {
      this.transientError(message);
      return;
    }
    try {
      if (connection.open) {
        connection.send({ t: "error", message } satisfies HostMessage);
      }
    } catch {
      // yoksay
    }
  }

  private transientError(message: string): void {
    this.snap.error = message;
    this.refresh();
    if (this.errorTimer) clearTimeout(this.errorTimer);
    this.errorTimer = window.setTimeout(() => {
      if (this.snap.error === message) {
        this.snap.error = null;
        this.refresh();
      }
    }, 4500);
  }

  private saveAndBroadcast(): void {
    saveHostState(this.state);
    this.broadcast();
    this.schedule();
  }

  private broadcast(): void {
    for (const [playerId, connection] of this.connections) {
      if (!connection.open) continue;
      try {
        connection.send({
          t: "snapshot",
          state: project(this.state, playerId),
        } satisfies HostMessage);
      } catch {
        // kopmuş bağlantı; kapatma olayı temizleyecek
      }
    }
    this.refresh();
  }

  private refresh(): void {
    try {
      this.snap.state = project(this.state, this.hostId);
    } catch {
      // projeksiyon hatası oyunu durdurmasın
    }
    this.emit();
  }

  private schedule(): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    if (this.disposed) return;
    const endsAt = this.state.phaseEndsAt;
    if (!endsAt) return;
    const delay = Math.max(0, endsAt - Date.now()) + 80;
    this.timer = window.setTimeout(() => {
      this.timer = null;
      this.runTick();
    }, delay);
  }

  private runTick(): void {
    if (this.disposed) return;
    const next = tick(this.state, Date.now());
    if (next) {
      this.state = next;
      this.saveAndBroadcast();
    } else {
      this.schedule();
    }
  }

  send(action: Action): void {
    if (this.disposed) return;
    this.dispatch(this.hostId, action, null);
  }

  leave(): void {
    this.closeRoom();
  }

  closeRoom(): void {
    if (this.disposed) return;
    for (const connection of this.connections.values()) {
      try {
        connection.send({
          t: "closed",
          message: "Divan sahibi odayı kapattı.",
        } satisfies HostMessage);
        connection.close();
      } catch {
        // yoksay
      }
    }
    this.dispose();
    clearHostState(this.code);
    clearHostInfo(this.code);
    this.snap.status = "closed";
    this.snap.error = "Divan kapandı.";
    this.emit();
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.removeLifecycle();
    if (this.timer) clearTimeout(this.timer);
    if (this.errorTimer) clearTimeout(this.errorTimer);
    this.clearPeerTimer();
    for (const timer of this.pendingRemoval.values()) clearTimeout(timer);
    this.pendingRemoval.clear();
    for (const connection of this.connections.values()) {
      try {
        connection.close();
      } catch {
        // yoksay
      }
    }
    this.connections.clear();
    this.connMeta.clear();
    if (this.peer) {
      try {
        this.peer.removeAllListeners();
        this.peer.destroy();
      } catch {
        // yoksay
      }
      this.peer = null;
    }
    saveHostState(this.state);
  }
}

export class ClientSession extends BaseSession {
  readonly mode = "client" as const;
  private peer: Peer | null = null;
  private connection: DataConnection | null = null;
  private token: string | null;
  private attempts = 0;
  private started = false;
  private lastLossAt = 0;
  private retryTimer: number | null = null;
  private connTimer: number | null = null;
  private peerTimer: number | null = null;
  private errorTimer: number | null = null;

  constructor(
    private code: string,
    private profile: Profile,
  ) {
    super("client");
    this.token = getToken(code);
  }

  start(): void {
    if (this.started || this.disposed) return;
    this.started = true;
    window.addEventListener("online", this.onWake);
    document.addEventListener("visibilitychange", this.onWake);
    this.connectNow();
  }

  private onWake = (): void => {
    if (
      document.visibilityState === "visible" &&
      !this.disposed &&
      (this.snap.status === "offline" || this.snap.status === "connecting")
    ) {
      this.retryNow();
    }
  };

  private connectNow(): void {
    if (this.disposed || this.connection?.open) return;
    this.teardown();
    this.snap.status = this.snap.state ? "offline" : "connecting";
    this.emit();

    const peer = new Peer(PEER_OPTIONS);
    this.peer = peer;
    this.peerTimer = window.setTimeout(() => {
      if (this.peer !== peer || this.disposed || peer.open) return;
      this.lost("Sinyal sunucusuna ulaşılamadı.");
    }, 18000);

    peer.on("open", () => {
      if (this.peer !== peer || this.disposed) return;
      if (this.peerTimer) {
        clearTimeout(this.peerTimer);
        this.peerTimer = null;
      }
      const connection = peer.connect(peerIdFor(this.code), {
        reliable: true,
        serialization: "json",
      });
      this.connection = connection;
      this.connTimer = window.setTimeout(() => {
        if (this.connection === connection && !connection.open) {
          this.lost("Odaya ulaşılamadı.");
        }
      }, 15000);

      connection.on("open", () => {
        if (this.connection !== connection || this.disposed) return;
        if (this.connTimer) {
          clearTimeout(this.connTimer);
          this.connTimer = null;
        }
        this.sendHello();
      });
      connection.on("data", (data) => this.handleData(data));
      connection.on("close", () => this.lost("Oda bağlantısı kapandı."));
      connection.on("error", () => this.lost("Bağlantı hatası."));
    });

    peer.on("error", (error) => {
      if (this.peer !== peer || this.disposed) return;
      const type = (error as { type?: string }).type ?? "";
      if (type === "peer-unavailable") {
        this.lost("Oda bulunamadı. Kod doğru mu?", 4);
      } else if (type === "browser-incompatible") {
        this.fatal("Tarayıcı WebRTC desteklemiyor. Güncel Chrome, Safari veya Firefox dene.");
      } else if (type === "network" || type === "server-error") {
        this.lost("Sinyal sunucusuna ulaşılamadı.");
      } else {
        this.lost("Bağlantı kurulamadı.");
      }
    });

    peer.on("disconnected", () => {
      if (this.peer === peer && !this.disposed) this.lost("Sinyal bağlantısı koptu.");
    });
  }

  private sendHello(): void {
    if (!this.connection?.open) return;
    try {
      this.connection.send({
        t: "hello",
        name: this.profile.name,
        avatar: this.profile.avatar,
        token: this.token,
      } satisfies ClientMessage);
    } catch {
      this.lost("Katılım isteği gönderilemedi.");
    }
  }

  private handleData(data: unknown): void {
    if (!data || typeof data !== "object") return;
    const message = data as HostMessage;
    if (message.t === "welcome") {
      this.token = message.token;
      saveToken(this.code, message.token);
      this.snap.selfId = message.playerId;
      this.snap.state = message.state;
      this.snap.status = "online";
      this.snap.error = null;
      this.attempts = 0;
      this.emit();
      return;
    }
    if (message.t === "snapshot") {
      this.snap.state = message.state;
      this.snap.status = "online";
      this.emit();
      return;
    }
    if (message.t === "error") {
      this.transientError(message.message);
      return;
    }
    if (message.t === "closed") {
      this.fatal(message.message);
    }
  }

  private transientError(message: string): void {
    this.snap.error = message;
    this.emit();
    if (this.errorTimer) clearTimeout(this.errorTimer);
    this.errorTimer = window.setTimeout(() => {
      if (this.snap.error === message) {
        this.snap.error = null;
        this.emit();
      }
    }, 4500);
  }

  private fatal(message: string): void {
    this.teardown();
    if (this.retryTimer) {
      clearTimeout(this.retryTimer);
      this.retryTimer = null;
    }
    this.snap.status = "error";
    this.snap.error = message;
    this.emit();
  }

  private lost(message: string, fatalAfter = 12): void {
    if (this.disposed) return;
    const now = Date.now();
    if (now - this.lastLossAt < 400) return;
    this.lastLossAt = now;
    this.teardown();
    this.attempts += 1;

    if (this.attempts >= fatalAfter) {
      this.fatal(
        fatalAfter <= 4
          ? "Oda bulunamadı veya kapandı. Kodu ve oda sahibinin sekmeyi açık tuttuğunu kontrol et."
          : "Divan dağıldı veya bağlantı kurulamadı. Oda sahibinin sekmeyi açık tutması gerekiyor.",
      );
      return;
    }

    this.snap.status = "offline";
    this.snap.error = `${message} Yeniden deniyorum… (${this.attempts})`;
    this.emit();
    const delay = Math.min(900 * this.attempts, 5000);
    this.retryTimer = window.setTimeout(() => {
      this.retryTimer = null;
      this.connectNow();
    }, delay);
  }

  private retryNow(): void {
    if (this.disposed) return;
    if (this.retryTimer) {
      clearTimeout(this.retryTimer);
      this.retryTimer = null;
    }
    if (this.connection?.open) return;
    this.connectNow();
  }

  private teardown(): void {
    if (this.connTimer) {
      clearTimeout(this.connTimer);
      this.connTimer = null;
    }
    if (this.peerTimer) {
      clearTimeout(this.peerTimer);
      this.peerTimer = null;
    }
    if (this.connection) {
      const connection = this.connection;
      this.connection = null;
      try {
        connection.removeAllListeners();
        connection.close();
      } catch {
        // yoksay
      }
    }
    if (this.peer) {
      const peer = this.peer;
      this.peer = null;
      try {
        peer.removeAllListeners();
        peer.destroy();
      } catch {
        // yoksay
      }
    }
  }

  send(action: Action): void {
    if (this.disposed) return;
    if (this.connection?.open) {
      try {
        this.connection.send({ t: "action", action } satisfies ClientMessage);
        return;
      } catch {
        // aşağıda yeniden bağlanma denenecek
      }
    }
    this.transientError("Bağlantı yok; yeniden bağlanıyorum.");
    this.retryNow();
  }

  leave(): void {
    if (this.connection?.open) {
      try {
        this.connection.send({ t: "leave" } satisfies ClientMessage);
      } catch {
        // yoksay
      }
    }
    this.dispose();
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    window.removeEventListener("online", this.onWake);
    document.removeEventListener("visibilitychange", this.onWake);
    if (this.retryTimer) clearTimeout(this.retryTimer);
    if (this.errorTimer) clearTimeout(this.errorTimer);
    this.teardown();
  }
}
