from fastapi import APIRouter

# TODO: Exponer herramientas individuales (leer archivo, listar archivos,
# analizar codigo) como endpoints REST para su uso desde el frontend
# o clientes externos.

router = APIRouter(prefix="/tools", tags=["tools"])
