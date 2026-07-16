import { type ReactNode } from "react";
import { useWebSocket } from "../../services/ws";

export default function WebSocketProvider({ children }: { children?: ReactNode }) {
  useWebSocket();
  return <>{children}</>;
}
