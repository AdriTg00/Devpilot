from app.services.llm_service import LLMService
from app.tools.file_reader import read_file
from app.tools.directory_reader import list_files
from app.tools.file_reader import read_file
from app.tools.file_writer import write_file
from pathlib import Path


class CodeExplainerService:

    def __init__(self):
        self.llm = LLMService()

    def generate_readme(self, project_path: str):

        documentation = self.generate_documentation(project_path)

        readme_path = f"{project_path}/README.md"

        write_file(readme_path, documentation)

        return {"readme_path": readme_path}

    def generate_documentation(self, project_path: str):

        files = list_files(project_path)

        project_name = Path(project_path).name

        context = ""

        for file in files:

            if file.endswith(".py"):

                try:

                    content = read_file(file)

                    context += f"""

    ARCHIVO:
    {file}

    CODIGO:
    {content[:1000]}

    """

                except Exception:
                    continue

                if len(context) > 10000:
                    break

        prompt = f"""
    Eres un arquitecto software senior.

    Analiza EXCLUSIVAMENTE la información proporcionada.

    Nombre de la carpeta del proyecto:
    {project_name}

    Reglas obligatorias:

    - No inventes funcionalidades.
    - No inventes tecnologías.
    - No inventes dependencias.
    - No inventes URLs.
    - No inventes repositorios GitHub.
    - No inventes endpoints.
    - No inventes comandos de instalación.
    - Si una información no aparece en el código, escribe:
    "No disponible".
    - Basa todas las conclusiones únicamente en el código recibido.

    Genera un README profesional en Markdown.

    Incluye:

    # Nombre del Proyecto

    ## Descripción

    ## Características

    ## Arquitectura

    ## Instalación

    ## Uso

    ## API

    ## Tecnologías

    ## Mejoras Futuras

    Código del proyecto:

    {context}
    """

        return self.llm.ask(prompt)

    def answer_question(self, project_path: str, question: str):

        files = list_files(project_path)

        project_name = Path(project_path).name

        context = ""

        for file in files:

            if file.endswith(".py"):

                try:

                    content = read_file(file)

                    context += f"""

    ARCHIVO:
    {file}

    CODIGO:
    {content[:1000]}

    """

                except Exception:
                    continue

                if len(context) > 8000:
                    break

        prompt = f"""
    Eres un asistente experto en análisis de código.

    Proyecto:
    {project_name}

    Código disponible:

    {context}

    Pregunta:

    {question}

    Reglas:

    - Responde únicamente utilizando el código proporcionado.
    - No inventes archivos.
    - No inventes funciones.
    - No inventes clases.
    - Si la respuesta no puede deducirse del código disponible, responde:
    "No puedo determinarlo con la información proporcionada."

    Respuesta:
    """

        return self.llm.ask(prompt)

    def explain_project(self, path: str):

        files = list_files(path)

        project_content = ""

        for file in files:

            if file.endswith(".py"):

                try:

                    content = read_file(file)

                    project_content += f"""

    ARCHIVO: {file}

    {content[:3000]}

    """

                except Exception:
                    pass

                if len(project_content) > 15000:
                    break

        prompt = f"""
        Analiza este proyecto Python.

        Describe:

        - Arquitectura
        - Responsabilidades
        - Organización del código
        - Posibles mejoras

        Proyecto:

        {project_content}
        """

        return self.llm.ask(prompt)
