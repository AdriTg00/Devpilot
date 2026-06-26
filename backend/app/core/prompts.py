"""
Plantillas de prompts para el LLM.

Todos los prompts están centralizados aquí para facilitar su mantenimiento
e iteración sin tocar la lógica de negocio de los servicios.
"""

README_PROMPT = """
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

ANSWER_QUESTION_PROMPT = """
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

EXPLAIN_PROJECT_PROMPT = """
Analiza este proyecto Python.

Describe:

- Arquitectura
- Responsabilidades de cada módulo
- Organización del código
- Posibles mejoras

Proyecto:

{project_content}
"""

EXPLAIN_FILE_PROMPT = """
Eres un experto en análisis de código.

Analiza el siguiente archivo: {file_name}

Describe:
- Propósito del archivo
- Clases y funciones principales
- Dependencias y acoplamiento
- Posibles mejoras

Código:

{content}
"""

SUMMARIZE_PROJECT_PROMPT = """
Analiza este proyecto:

Archivos Python: {python_files}
Líneas de código: {lines}
Funciones: {functions}
Clases: {classes}

Describe la arquitectura general y sugiere posibles mejoras.
"""

