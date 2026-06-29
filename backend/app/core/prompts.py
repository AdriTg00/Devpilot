"""
Plantillas de prompts para el LLM.

Todos los prompts están centralizados aquí para facilitar su mantenimiento
e iteración sin tocar la lógica de negocio de los servicios.
"""


def language_instruction(language: str) -> str:
    if language == "es":
        return (
            "IMPORTANTE: Responde EXCLUSIVAMENTE en español.\n"
            "Todos los encabezados, explicaciones, análisis y secciones deben estar en español.\n"
        )
    return (
        "IMPORTANT: Respond EXCLUSIVELY in English.\n"
        "All headings, explanations, analysis and sections must be in English.\n"
    )


README_PROMPT = """
{language_instruction}
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
- Basa todas las conclusiones únicamente en el código recibido.

Para la seccion Instalacion / Installation:
- Revisa los archivos de configuracion incluidos (package.json, requirements.txt, Cargo.toml, Gemfile, etc.)
- Genera comandos de instalacion REALES basados en lo que detectes.
- Si ves package.json, sugiere: npm install
- Si ves requirements.txt, sugiere: pip install -r requirements.txt
- Si ves Cargo.toml, sugiere: cargo build
- Incluye los pasos para clonar (git clone <repo-url>) solo si la URL del repositorio esta visible en el codigo.
- Si no encuentras ningun archivo de configuracion de paquetes, escribe:
  "No disponible" / "Not available".

Genera un README profesional en Markdown.

Incluye:

# Nombre del Proyecto / Project Name

## Descripcion / Description

## Caracteristicas / Features

## Arquitectura / Architecture

## Instalacion / Installation

## Uso / Usage

## API / API

## Tecnologias / Technologies

## Mejoras Futuras / Future Improvements

Codigo del proyecto:

{context}
"""

EXPLAIN_PROJECT_PROMPT = """
{language_instruction}
Analiza este proyecto / Analyze this project.

Describe / Describe:

- Arquitectura / Architecture
- Responsabilidades de cada modulo / Module responsibilities
- Organización del codigo / Code organization

Proyecto / Project:

{project_content}
"""

EXPLAIN_FILE_PROMPT = """
{language_instruction}
Eres un Staff Software Engineer realizando una revisión de código experta.

El usuario YA está viendo el código fuente completo del archivo.
NO repitas el código. NO copies fragmentos largos.

Reglas obligatorias:
- NO inventes funcionalidades, clases, funciones ni módulos.
- Basa todas las conclusiones únicamente en el código proporcionado.
- Responde exclusivamente en Markdown usando la estructura indicada.
- Preserva la estructura de secciones pero tradúcela al idioma indicado.
- Sé técnico, específico y conciso.
- Si no puedes determinar algo con certeza, indícalo explícitamente.

Archivo / File: {file_name}
Proyecto / Project: {project_name}

Código / Code:

{content}

Responde usando EXACTAMENTE esta estructura (traduciendo los encabezados al idioma indicado):

# Purpose / Propósito

Explica la responsabilidad principal del archivo en una frase clara. ¿Qué problema resuelve? ¿Por qué existe este archivo dentro del proyecto? Describe también cómo encaja en la arquitectura general.

# Responsibilities / Responsabilidades

Desglosa las responsabilidades concretas del archivo. ¿Qué tareas ejecuta? ¿Qué decisiones de diseño refleja? Identifica si sigue algún patrón (controlador, servicio, modelo, utilidad, middleware, etc.) y si sus responsabilidades están bien definidas o están mezcladas.

# Key Components / Componentes Principales

Enumera y explica las funciones, clases y símbolos principales:
- ¿Cuál es su propósito específico?
- ¿Cómo se relacionan entre sí dentro del archivo?
- ¿Qué flujo de ejecución sigue el código?
- Señala si algún componente es demasiado grande o hace demasiadas cosas.

# Dependencies / Dependencias

Analiza las importaciones y dependencias:
- **Externas**: bibliotecas de terceros. ¿Están bien utilizadas?
- **Internas**: cómo se conecta este archivo con el resto del proyecto.
- ¿Hay dependencias circulares, innecesarias, mal ubicadas o que aumenten el acoplamiento sin beneficio claro?

# Improvements / Mejoras

Propón mejoras concretas y justificadas. Para cada una indica:
- ¿Qué cambiar?
- ¿Por qué? (legibilidad, rendimiento, mantenibilidad, testing, seguridad)
- ¿Cómo impacta positivamente?

Prioriza las mejoras por impacto. Si aplica, menciona patrones de diseño o refactors específicos.

# Risks / Riesgos

Identifica problemas potenciales:
- Casos borde no manejados (archivos vacíos, valores None, input inválido, etc.)
- Posibles excepciones o errores silenciosos
- Seguridad: validación de entrada, path traversal, exposición de datos
- Mantenibilidad: código frágil, acoplado, difícil de extender
- Rendimiento: bucles innecesarios, operaciones costosas, falta de lazy loading
- Si no detectas riesgos relevantes, escribe "No se observan riesgos relevantes." / "No relevant risks observed."
"""

SUMMARIZE_PROJECT_PROMPT = """
{language_instruction}
Analiza este proyecto / Analyze this project:

Archivos / Files: {files}
Líneas de codigo / Lines of code: {lines}
Funciones / Functions: {functions}
Clases e interfaces / Classes and interfaces: {classes}

Describe la arquitectura general.
Describe the overall architecture.
"""

CODE_REVIEW_PROMPT = """
{language_instruction}
Eres un Staff Software Engineer realizando una auditoría de código exhaustiva.

Analiza los archivos del proyecto y busca:

1. **POTENTIAL BUGS** — Errores lógicos, condiciones mal manejadas, race conditions, null safety, off-by-one, recursos no cerrados.
2. **CODE SMELLS** — Funciones largas, duplicated code, nested too deep, magic numbers, dead code, poor naming, falta de tipos.
3. **SECURITY** — Input sin validar, path traversal, XSS, SQL injection, hardcoded secrets, falta de sanitización.
4. **PERFORMANCE** — Bucles innecesarios, N+1 queries, memory leaks, falta de lazy loading, bundle size.
5. **MAINTAINABILITY** — Mala organización, falta de modularidad, acoplamiento excesivo, falta de tests.

Reglas obligatorias:
- SOLO menciona problemas reales basados en el código proporcionado.
- NO inventes issues.
- Por cada issue indica: categoría, archivo, línea aproximada, descripción y sugerencia de fix.
- Si el proyecto está bien escrito y no hay issues graves, indícalo honestamente.
- Usa formato Markdown con encabezados por categoría.

Estructura de respuesta:

## Potential Bugs

### [Bug] Descripción breve
- **File**: `ruta/archivo`
- **Line**: ~N
- **Issue**: Explicación del problema
- **Fix**: Sugerencia de solución

(Repetir por cada issue encontrado)

## Code Smells
...

## Security
...

## Performance
...

## Maintainability
...

Si una categoría no tiene issues, escribe "Ninguno detectado."

Archivos del proyecto:
{context}
"""

