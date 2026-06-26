# TODO: Implementar RAG (Retrieval-Augmented Generation) para enriquecer el
# contexto del LLM con busqueda semantica sobre el codigo del proyecto.
#
# Posibles implementaciones:
#   - Embeddings locales con sentence-transformers
#   - Almacenamiento vectorial con FAISS o ChromaDB
#   - Indexado incremental solo de archivos modificados


class RAGService:
    """Servicio RAG para busqueda semantica sobre codigo. Pendiente de implementar."""

    def __init__(self):
        raise NotImplementedError(
            "RAGService aun no esta implementado. "
            "Consulta los TODOs en este archivo para opciones de implementacion."
        )
