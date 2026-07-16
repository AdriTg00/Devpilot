"""WebSocket connection manager for server-sent events."""

import json
import logging
from typing import Set

from fastapi import WebSocket

logger = logging.getLogger("devpilot.ws")

class ConnectionManager:
    def __init__(self):
        self.active_connections: Set[WebSocket] = set()

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.add(websocket)
        logger.info("WebSocket connected: %s (total: %d)", id(websocket), len(self.active_connections))

    def disconnect(self, websocket: WebSocket):
        self.active_connections.discard(websocket)
        logger.info("WebSocket disconnected: %s (total: %d)", id(websocket), len(self.active_connections))

    async def broadcast(self, event: str, data: dict):
        """Send an event to all connected clients."""
        payload = json.dumps({"event": event, "data": data})
        stale = set()
        for ws in self.active_connections:
            try:
                await ws.send_text(payload)
            except Exception:
                stale.add(ws)
        for ws in stale:
            self.active_connections.discard(ws)

    async def send_to(self, websocket: WebSocket, event: str, data: dict):
        """Send an event to a specific client."""
        try:
            await websocket.send_text(json.dumps({"event": event, "data": data}))
        except Exception:
            self.disconnect(websocket)


manager = ConnectionManager()
