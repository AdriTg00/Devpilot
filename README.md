# DevPilot AI

Encender backend: uvicorn app.main:app --reload

## Descripción
DevPilot AI es una aplicación que ofrece herramientas inteligentes para el desarrollo de software. La plataforma incluye funcionalidades para chat interactivo con IA, análisis y generación de documentación de proyectos, así como explicación de archivos de código.

## Características
- **Chat Interactivo:** Permite realizar preguntas a un asistente de IA.
- **Análisis de Proyectos:** Proporciona resúmenes, estadísticas y análisis detallados de los proyectos de software.
- **Generación de Documentación Automática:** Crea automáticamente READMEs para proyectos basados en su contenido.

## Arquitectura
La arquitectura está basada en FastAPI, que permite la creación rápida y sencilla de APIs RESTful. Se utiliza una estructura de módulos separada para el backend (`app`), donde cada servicio y modelo tiene su propio archivo.

## Instalación
No disponible.

## Uso
Para usar DevPilot AI, simplemente realiza solicitudes POST a los endpoints correspondientes según las características descritas. Por ejemplo:

- **Chat Interactivo:**
  ```bash
  curl -X POST "http://localhost:8000/chat" -H "Content-Type: application/json" -d '{"message": "¿Cómo funciona FastAPI?"}'
  ```

- **Análisis de Proyectos:**
  ```bash
  curl -X POST "http://localhost:8000/project/files" -H "Content-Type: application/json" -d '{"path": "/ruta/a/tu/proyecto"}'
  curl -X POST "http://localhost:8000/project/analyze" -H "Content-Type: application/json" -d '{"path": "/ruta/a/tu/proyecto"}'
  curl -X POST "http://localhost:8000/project/summary" -H "Content-Type: application/json" -d '{"path": "/ruta/a/tu/proyecto"}'
  ```

## API
Las APIs disponibles en DevPilot AI se documentan a través de Swagger UI. Puedes acceder a la documentación interactiva en:
```
http://localhost:8000/docs
```

## Tecnologías
- **FastAPI:** Framework para la creación de APIs RESTful.
- **Python:** Lenguaje de programación principal.
- **Pydantic:** Para el manejo de modelos de datos.
- **ollama:** Biblioteca para interactuar con modelos de lenguaje.
- **pathlib:** Para operaciones de sistema de archivos.

## Mejoras Futuras
- **Experiencia del Usuario:** Mejorar la interactividad y la retroalimentación del usuario.
- **Escalabilidad:** Optimizar el rendimiento y la capacidad de manejo de carga.
- **Integración con Herramientas Externas:** Ampliar la funcionalidad mediante integraciones adicionales, como versionadores de código o sistemas de control de calidad.