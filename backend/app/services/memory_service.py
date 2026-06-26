# TODO: Implementar memoria conversacional para mantener el historial de chat.
#
# Esta funcionalidad permitira al LLM recordar el contexto de conversaciones
# anteriores. Posibles implementaciones:
#   - Buffer en memoria (lista de mensajes)
#   - Persistencia en SQLite con SQLAlchemy
#   - Redis para entornos distribuidos


class MemoryService:
    """Servicio de memoria conversacional. Pendiente de implementar."""

    def __init__(self):
        raise NotImplementedError(
            "MemoryService aun no esta implementado. "
            "Consulta los TODOs en este archivo para opciones de implementacion."
        )
