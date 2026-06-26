import ast
import logging

logger = logging.getLogger(__name__)


def analyze_python_file(content: str) -> dict:
    """Analiza un archivo Python y devuelve métricas básicas.

    Usa ast.parse para un conteo preciso de funciones y clases.
    Cae en str.count() si el archivo tiene sintaxis inválida.
    """
    lines = len(content.splitlines())
    try:
        tree = ast.parse(content)
        functions = sum(
            1 for n in ast.walk(tree) if isinstance(n, ast.FunctionDef)
        )
        classes = sum(
            1 for n in ast.walk(tree) if isinstance(n, ast.ClassDef)
        )
    except SyntaxError as e:
        logger.warning(f"No se pudo parsear con ast ({e}). Usando conteo por texto.")
        functions = content.count("def ")
        classes = content.count("class ")
    return {
        "lines": lines,
        "functions": functions,
        "classes": classes,
    }