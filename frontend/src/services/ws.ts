import { useEffect, useRef } from "react";

type EventHandler = (data: Record<string, unknown>) => void;

function deriveWsUrl(): string {
  const httpBase = import.meta.env.VITE_API_URL || "http://localhost:8000";
  return httpBase.replace(/^http/, "ws") + "/ws";
}

class WebSocketClient {
  private ws: WebSocket | null = null;
  private handlers = new Map<string, Set<EventHandler>>();
  private reconnectTimer: number | null = null;
  private url: string;
  private destroyed = false;

  constructor(url: string) {
    this.url = url;
  }

  connect() {
    if (this.ws?.readyState === WebSocket.OPEN || this.destroyed) return;

    this.ws = new WebSocket(this.url);

    this.ws.onmessage = (event) => {
      try {
        const { event: evt, data } = JSON.parse(event.data);
        const handlers = this.handlers.get(evt);
        if (handlers) {
          handlers.forEach((fn) => fn(data));
        }
      } catch {
        // ignore malformed messages
      }
    };

    this.ws.onclose = () => {
      this.ws = null;
      this.scheduleReconnect();
    };

    this.ws.onerror = () => {
      // onerror always precedes onclose, so just let onclose handle reconnection
    };
  }

  disconnect() {
    this.destroyed = true;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.ws?.close();
    this.ws = null;
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) return;
    this.reconnectTimer = window.setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, 5000);
  }

  on(event: string, handler: EventHandler) {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, new Set());
    }
    this.handlers.get(event)!.add(handler);
    return () => this.off(event, handler);
  }

  off(event: string, handler: EventHandler) {
    this.handlers.get(event)?.delete(handler);
  }

  send(event: string, data?: Record<string, unknown>) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ event, data }));
    }
  }
}

const wsUrl = deriveWsUrl();
export const wsClient = new WebSocketClient(wsUrl);

export function useWebSocketEvent(event: string, handler: EventHandler) {
  const handlerRef = useRef<EventHandler>(handler);

  useEffect(() => {
    handlerRef.current = handler;
  });

  useEffect(() => {
    const unsub = wsClient.on(event, (...args) => handlerRef.current(...args));
    return unsub;
  }, [event]);
}

export function useWebSocket() {
  const connected = useRef(false);

  useEffect(() => {
    wsClient.connect();
    connected.current = true;
    return () => {
      wsClient.disconnect();
      connected.current = false;
    };
  }, []);

  return { wsClient };
}
