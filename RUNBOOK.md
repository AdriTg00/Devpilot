# DevPilot Runbook

Guía operativa para el asistente de desarrollo local con IA.

---

## Índice

1. [Descripción general](#1-descripción-general)
2. [Arquitectura](#2-arquitectura)
3. [Stack técnico](#3-stack-técnico)
4. [Setup local](#4-setup-local)
5. [Docker / Producción](#5-docker--producción)
6. [Comandos útiles](#6-comandos-útiles)
7. [CI/CD](#7-cicd)
8. [Endpoints clave](#8-endpoints-clave)
9. [Solución de problemas comunes](#9-solución-de-problemas-comunes)
10. [Persistencia de datos](#10-persistencia-de-datos)
11. [Credenciales por defecto](#11-credenciales-por-defecto)
12. [Variables de entorno](#12-variables-de-entorno)

---

## 1. Descripción general

DevPilot es un asistente de desarrollo con IA local. Permite analizar proyectos, chatear con un LLM que entiende el código, buscar con indexado vectorial (RAG), y obtener code reviews automatizados.

### Funcionalidades principales

- Análisis de proyectos (estadísticas por lenguaje: archivos, líneas, funciones, clases)
- Chat con IA con contexto RAG (ChromaDB + LLM, citas de código fuente)
- Llamada a herramientas por el LLM (leer archivos, buscar código, explorar estructura)
- Visor y editor de archivos con resaltado de sintaxis (18 lenguajes)
- Code review automatizado (bugs, seguridad, performance, mantenibilidad)
- Generación de documentación y README
- Compartición de proyectos por enlace público con expiración
- Chat multi-sesión por proyecto
- Dashboard de salud (Ollama/Groq, ChromaDB, almacenamiento)
- Métricas Prometheus en `/metrics`

---

## 2. Arquitectura

```
┌─────────────┐     ┌──────────────┐     ┌───────────┐
│  Frontend   │────▶│   Backend    │────▶│  Ollama   │
│ (React SPA) │     │ (FastAPI)    │     │ (LLM local)│
│  nginx:80   │     │  uvicorn:8000│     │  :11434   │
└─────────────┘     └──────┬───────┘     └───────────┘
                           │
                    ┌──────┴───────┐
                    │   ChromaDB   │
                    │  (vectores)  │
                    └──────────────┘
```

### Frontend (React SPA)
- Renderizado con Vite + React 19
- Tailwind CSS v4 para estilos
- React Router v6 con persistencia de pestañas (rutas ocultas no desmontadas)
- 613 módulos, bundle ~312 KB gzipped

### Backend (FastAPI)
- Python 3.12, uvicorn
- SQLite para persistencia (usuarios, sesiones, settings, shares)
- ChromaDB para búsqueda vectorial RAG
- Rate limiting con slowapi (120 req/min por IP)
- Middleware de observabilidad (Request ID + métricas Prometheus + latencia)
- Cache de análisis de proyecto (5 min TTL)

---

## 3. Stack técnico

| Componente | Tecnología | Versión |
|---|---|---|
| Frontend | React + TypeScript | 19.2 / 6.0 |
| Build | Vite + tsc | 8.1 |
| Estilos | Tailwind CSS | 4.3 |
| Backend | Python + FastAPI | 3.12 / último |
| BD vectores | ChromaDB | última |
| BD relacional | SQLite (via SQLAlchemy) | - |
| LLM local | Ollama (qwen2.5-coder:7b) | última |
| LLM cloud | Groq / OpenAI / Anthropic / Google | - |
| Contenedores | Docker Compose | - |
| CI | GitHub Actions | - |

---

## 4. Setup local

### Requisitos

- Python 3.12+
- Node.js 22+
- Ollama (opcional, para LLM local)
- Docker Desktop (opcional, para producción)

### Backend

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\activate
pip install -r requirements.txt
copy ..\.env.example .env   # y editar con claves API
uvicorn app.main:app --reload
# http://localhost:8000
```

### Frontend

```powershell
cd frontend
npm install
npm run dev
# http://localhost:5173
```

### Notas

- El backend arranca automáticamente desde el frontend en dev (Vite plugin `backend-launcher`)
- Si no funciona, asegúrate de que el venv está en `../.venv/Scripts/python.exe` desde `frontend/`
- La primera vez, el backend crea las tablas SQLite y el usuario `admin/admin`

---

## 5. Docker / Producción

### Comandos principales

```powershell
# Construir y arrancar
docker compose up --build -d

# Ver logs
docker compose logs -f

# Parar
docker compose down

# Parar y borrar volúmenes (cuidado: borra modelos, BD e índices)
docker compose down -v

# Reconstruir un servicio específico
docker compose build backend
docker compose build frontend
```

### Orden de arranque

1. **ollama** — servidor de LLM local
2. **ollama-pull** — descarga el modelo (one-shot, se ejecuta una vez y sale)
3. **backend** — FastAPI, espera a ollama sano y ollama-pull completado
4. **frontend** — nginx sirviendo SPA, espera a backend sano

### Puertos

| Servicio | Puerto host | Puerto contenedor |
|---|---|---|
| Frontend | 3000 | 80 |
| Backend | - | 8000 |
| Ollama | - | 11434 |

---

## 6. Comandos útiles

### Backend

```powershell
cd backend

# Tests
pytest --cov=. --cov-report=term

# Lint
ruff check .

# Lint + fix
ruff check --fix .
```

### Frontend

```powershell
cd frontend

# Lint
npm run lint

# Tests
npm run test

# Build producción
npm run build

# Build + typecheck
tsc -b
```

### Deploy script

```powershell
.\deploy.ps1 up       # docker compose up -d
.\deploy.ps1 down     # docker compose down
.\deploy.ps1 build    # docker compose build
.\deploy.ps1 logs     # docker compose logs -f
.\deploy.ps1 restart  # down + up
```

---

## 7. CI/CD

El pipeline de GitHub Actions (`.github/workflows/ci.yml`) se ejecuta en push/PR a `main`.

### Jobs

**backend** (matrix: Python 3.11, 3.12):
```
ruff check .
pytest --cov=. --cov-report=term
python -c "from app.main import app; print('FastAPI app OK')"
```

**frontend** (Node 22):
```
npm ci
npm run lint     # eslint
npm run test     # vitest
npm run build    # tsc + vite
```

**docker** (depende de backend + frontend):
```
docker compose build
```

### Reglas de linting ignoradas

- Backend: `E501` (líneas largas — strings en español), `E402` (imports diferidos intencionales)
- Frontend: `react-refresh/only-export-components`, `react-hooks/set-state-in-effect`

---

## 8. Endpoints clave

| URL | Propósito | Auth |
|---|---|---|
| `http://localhost:3000` | Frontend (Docker) | - |
| `http://localhost:8000/docs` | Swagger UI | - |
| `http://localhost:8000/health` | Health check básico | No |
| `http://localhost:8000/health/detailed` | Health detallado (Ollama, RAG, Groq, storage) | No |
| `http://localhost:8000/metrics` | Métricas Prometheus | No |
| `POST /api/v1/auth/login` | Login (body: `{username, password}`) | No |
| `POST /api/v1/project/upload` | Subir proyecto | JWT |
| `POST /api/v1/project/analyze` | Analizar proyecto | JWT |
| `POST /api/v1/project/code-review` | Code review (streaming) | JWT |
| `POST /api/v1/project/ai-fix` | AI Fix (streaming) | JWT |
| `POST /api/v1/chat/tool-stream` | Chat con herramientas (streaming) | JWT |

---

## 9. Solución de problemas comunes

### Error 404 en login en Docker

**Causa:** `proxy_pass` en nginx.conf con barra final (`proxy_pass http://backend:8000/;`)

**Solución:** La barra final descarta el prefijo `/api/`. Debe ser:
```nginx
proxy_pass http://backend:8000;
```

### Error 413 (entity too large) al subir archivos

**Causa:** nginx por defecto limita el body a 1 MB.

**Solución:** En nginx.conf, añadir `client_max_body_size 50m;`

### "El archivo no existe: /app/...\archivo.py" en AI Fix

**Causa:** El frontend convertía barras `/` a `\` (Windows) y las concatenaba a una ruta Linux de Docker. Ruta mixta: `/app/temp_uploads/proyecto\tests\file.py`.

**Solución:** Siempre normalizar a forward slashes en Linux:
```ts
const fullPath = `${currentPath.replace(/\\/g, "/")}/${fileRel.replace(/\\/g, "/")}`;
```

### Chat responde con JSON crudo o una sola línea

**Causa (doble):**
1. `streamToolChat` enviaba líneas individuales a `onChunk`, y el frontend reemplazaba el contenido cada vez — solo se veía la última línea
2. Las herramientas devolvían `json.dumps(...)` y modelos pequeños lo repetían como respuesta

**Solución:**
1. Acumular texto en `textBuffer` y pasar acumulado a `onChunk`
2. Herramientas devuelven texto plano (`f"Error: ..."`, `"\n".join(matches)`) en vez de JSON

### No se persiste el estado entre pestañas

**Causa:** `<Outlet />` desmonta la ruta anterior al navegar. React pierde todo el estado del componente.

**Solución:** `MainLayout` acumula las páginas visitadas en un `Record<string, ReactElement>` via `useState`, renderiza todas con `hidden` en las inactivas.

### El lint de frontend falla con "Cannot access refs during render"

**Causa:** React 19 añadió la regla `react-hooks/refs` — no se puede leer `ref.current` durante el render.

**Solución:** Usar `useState` + `useEffect` en lugar de `useRef` para datos usados en render.

### El modelo Ollama no responde

**Causa:** El modelo `qwen2.5-coder:7b` (~4.7 GB) no se ha descargado aún.

**Solución:** El servicio `ollama-pull` lo hace automáticamente en Docker. En local:
```powershell
ollama pull qwen2.5-coder:7b
```

### El provider de cloud falla

**Causa:** API key incorrecta, caducada, o cuota excedida.

**Comportamiento:** El sistema fallback automáticamente a Ollama. Puedes cambiarlo en Settings > Proveedor de IA.

### Rate limit excedido (429)

**Causa:** slowapi permite 120 requests/minuto por IP.

**Solución:** Esperar o ajustar en `app/main.py`:
```python
limiter = Limiter(key_func=get_remote_address, default_limits=["120/minute"])
```

### ChromaDB "not ready"

**Causa:** El `DefaultEmbeddingFunction()` de ChromaDB puede requerir dependencias implícitas (`sentence-transformers`, `onnxruntime`).

**Solución:** Verificar logs del backend. En entornos mínimos (como slim Docker), puede fallar silenciosamente.

---

## 10. Persistencia de datos

### Docker volumes

| Volume | Ruta contenedor | Contenido | Tamaño típico |
|---|---|---|---|
| `ollama_data` | `/root/.ollama` | Modelos descargados | ~4.7 GB |
| `chroma_data` | `/app/.chroma` | Índice vectorial | Varía |
| `db_data` | `/app/.memory` | SQLite + shares | KB-MB |

### Reset completo

```powershell
docker compose down -v
# Borra TODOS los datos: modelos, BD, índices
```

### Archivos locales

- `backend/.chroma/` — Índice ChromaDB
- `backend/.memory/devpilot.db` — SQLite (usuarios, sesiones, settings, shares)
- `backend/.memory/conversations.json` — Legacy (migrado a SQLite al arrancar)
- `backend/temp_uploads/` — Proyectos subidos vía API

---

## 11. Credenciales por defecto

| Campo | Valor |
|---|---|
| Username | `admin` |
| Password | `admin` |

Se crean automáticamente al arrancar el backend por primera vez (`seed_default_user()`).

**⚠️ Seguridad:** En producción, cambia `JWT_SECRET` en `.env`. El valor por defecto es `devpilot-dev-secret-change-in-production`.

---

## 12. Variables de entorno

Archivo: `backend/.env` (copiar de `.env.example`)

| Variable | Default | Descripción |
|---|---|---|
| `OLLAMA_MODEL` | `qwen2.5-coder:7b` | Modelo de Ollama |
| `OLLAMA_HOST` | (cliente por defecto) | Host de Ollama |
| `GROQ_API_KEY` | - | API key de Groq |
| `GROQ_MODEL` | `fast` | Tier de Groq (fast/balanced/code) |
| `OPENAI_API_KEY` | - | API key de OpenAI |
| `ANTHROPIC_API_KEY` | - | API key de Anthropic |
| `GOOGLE_API_KEY` | - | API key de Google/Gemini |
| `JWT_SECRET` | `devpilot-dev-secret-change-in-production` | Clave JWT |
| `CORS_ORIGINS` | `http://localhost:3000,...` | Orígenes CORS permitidos |
| `DATABASE_URL` | `sqlite:///.memory/devpilot.db` | Conexión SQLite |
| `BASE_URL` | `http://localhost:5173` | URL base para enlaces compartidos |
| `MAX_FILE_CHARS` | `1000` | Máx caracteres por archivo en contexto |
| `MAX_CONTEXT_CHARS` | `10000` | Máx caracteres totales de contexto |

Las API keys se pueden configurar también desde la UI (Settings > Proveedor de IA). El backend lee primero de Settings DB, luego de env vars como fallback.
