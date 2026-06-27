import { createContext, useContext, useState, type ReactNode } from "react";

type Language = "en" | "es";

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>("en");

  const value: LanguageContextType = {
    language,
    setLanguage,
    t: (key: string, params?: Record<string, string | number>) => {
      let text = translations[language]?.[key] ?? translations.en?.[key] ?? key;
      if (params) {
        for (const [k, v] of Object.entries(params)) {
          text = text.replace(`{${k}}`, String(v));
        }
      }
      return text;
    },
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used inside LanguageProvider");
  return ctx;
}

const translations: Record<Language, Record<string, string>> = {
  en: {
    "app.name": "DevPilot",
    "nav.dashboard": "Dashboard",
    "nav.projects": "Projects",
    "nav.chat": "Chat",
    "nav.documentation": "Documentation",
    "nav.settings": "Settings",
    "navbar.subtitle": "AI Developer Assistant",
    "settings.title": "Settings",
    "settings.language": "Language",
    "settings.language_label": "Select your preferred language",
    "settings.provider": "Provider",
    "settings.provider_label": "Choose which LLM backend to use",
    "settings.ollama_model": "Ollama Model",
    "settings.groq_model": "Groq Model",
    "settings.ollama_url": "Ollama Base URL",
    "settings.generation": "Generation",
    "settings.temperature": "Temperature",
    "settings.max_tokens": "Max Tokens",
    "settings.save": "Save Settings",
    "settings.saved": "Settings saved",
    "settings.save_error": "Failed to save settings",
    "settings.rag": "RAG",
    "settings.rag_desc": "Semantic code chunking for vector search",
    "settings.rag_chunk_lines": "Chunk Lines",
    "settings.rag_overlap": "Overlap Lines",
    "settings.rag_max_chunks": "Max Chunks per File",
    "settings.rag_max_results": "Max Search Results",
    "project.title": "Project",
    "doc.title": "Documentation",
    "dashboard.title": "Dashboard",
    "viewer.title": "File Viewer",
    "viewer.select": "Select a file to view its contents.",
    "viewer.code": "Code",
    "viewer.ai": "AI",
    "viewer.explain": "Explain with AI",
    "viewer.generating": "Generating...",
    "viewer.waiting": "Waiting for response...",
    "viewer.no_explanation": "No explanation generated yet.",
    "viewer.chars": "chars",
    "viewer.error": "Unable to generate explanation.",
    "stats.total_files": "Total Files",
    "stats.lines": "Lines",
    "stats.functions": "Functions",
    "stats.classes": "Classes",
    "stats.files_line": "{files} files, {lines} lines",
    "explorer.title": "Project Explorer",
    "explorer.search": "Search files...",
    "explorer.empty": "Analyze a project to display its files.",
    "chat.title": "Project Chat",
    "chat.no_project": "Open a project from the Dashboard first to start asking questions.",
    "chat.asking_about": "Asking about:",
    "chat.placeholder": "Ask about your project...",
    "chat.send": "Send",
    "chat.thinking": "Thinking...",
    "chat.empty": "Ask anything about your project — architecture, dependencies, how to add features, etc.",
    "chat.error": "Error: Unable to get an answer.",
    "chat.clear": "Clear history",
    "project.select": "Select Project",
    "project.analyze": "Analyze",
    "project.analyzing": "Analyzing...",
    "project.browse": "Browse",
    "project.path_placeholder": "Select a project...",
    "project.analyze_title": "Analyze Project",
    "current_project.title": "Current Project",
    "current_project.no_project": "No project selected",
    "recent.title": "Recent Projects",
    "recent.empty": "No projects analyzed yet.",
    "rag.ready": "RAG Active",
    "rag.not_ready": "RAG Unavailable",
    "rag.chunks": "{chunks} chunks indexed",
    "rag.project_chunks": "{chunks} for this project",
    "rag.rebuild": "Rebuild Index",
    "rag.clear": "Clear Index",
    "rag.chunk_lines": "Chunk size: {n} lines",
    "rag.overlap": "Overlap: {n} lines",
    "lang.en": "English",
    "lang.es": "Spanish",
  },
  es: {
    "app.name": "DevPilot",
    "nav.dashboard": "Dashboard",
    "nav.projects": "Proyectos",
    "nav.chat": "Chat",
    "nav.documentation": "Documentación",
    "nav.settings": "Configuración",
    "navbar.subtitle": "Asistente de Desarrollo IA",
    "settings.title": "Configuración",
    "settings.language": "Idioma",
    "settings.language_label": "Selecciona tu idioma preferido",
    "settings.provider": "Proveedor",
    "settings.provider_label": "Elige qué backend LLM usar",
    "settings.ollama_model": "Modelo Ollama",
    "settings.groq_model": "Modelo Groq",
    "settings.ollama_url": "URL Base Ollama",
    "settings.generation": "Generación",
    "settings.temperature": "Temperatura",
    "settings.max_tokens": "Máx. Tokens",
    "settings.save": "Guardar Cambios",
    "settings.saved": "Configuración guardada",
    "settings.save_error": "Error al guardar configuración",
    "settings.rag": "RAG",
    "settings.rag_desc": "Fragmentación semántica de código para búsqueda vectorial",
    "settings.rag_chunk_lines": "Líneas por Fragmento",
    "settings.rag_overlap": "Líneas de Solapamiento",
    "settings.rag_max_chunks": "Máx. Fragmentos por Archivo",
    "settings.rag_max_results": "Máx. Resultados de Búsqueda",
    "project.title": "Proyecto",
    "doc.title": "Documentación",
    "dashboard.title": "Dashboard",
    "viewer.title": "Visor de Archivos",
    "viewer.select": "Selecciona un archivo para ver su contenido.",
    "viewer.code": "Código",
    "viewer.ai": "IA",
    "viewer.explain": "Explicar con IA",
    "viewer.generating": "Generando...",
    "viewer.waiting": "Esperando respuesta...",
    "viewer.no_explanation": "Aún no se generó ninguna explicación.",
    "viewer.chars": "caracteres",
    "viewer.error": "No se pudo generar la explicación.",
    "stats.total_files": "Archivos Totales",
    "stats.lines": "Líneas",
    "stats.functions": "Funciones",
    "stats.classes": "Clases",
    "stats.files_line": "{files} arch., {lines} líneas",
    "explorer.title": "Explorador de Archivos",
    "explorer.search": "Buscar archivos...",
    "explorer.empty": "Analiza un proyecto para ver sus archivos.",
    "chat.title": "Chat del Proyecto",
    "chat.no_project": "Abre un proyecto desde el Dashboard primero para hacer preguntas.",
    "chat.asking_about": "Preguntando sobre:",
    "chat.placeholder": "Pregunta sobre tu proyecto...",
    "chat.send": "Enviar",
    "chat.thinking": "Pensando...",
    "chat.empty": "Pregunta cualquier cosa sobre tu proyecto — arquitectura, dependencias, cómo añadir funciones, etc.",
    "chat.error": "Error: No se pudo obtener una respuesta.",
    "chat.clear": "Limpiar historial",
    "project.select": "Seleccionar Proyecto",
    "project.analyze": "Analizar",
    "project.analyzing": "Analizando...",
    "project.browse": "Examinar",
    "project.path_placeholder": "Selecciona un proyecto...",
    "project.analyze_title": "Analizar Proyecto",
    "current_project.title": "Proyecto Actual",
    "current_project.no_project": "Ningún proyecto seleccionado",
    "recent.title": "Proyectos Recientes",
    "recent.empty": "Aún no se analizaron proyectos.",
    "rag.ready": "RAG Activo",
    "rag.not_ready": "RAG No Disponible",
    "rag.chunks": "{chunks} fragmentos indexados",
    "rag.project_chunks": "{chunks} para este proyecto",
    "rag.rebuild": "Reconstruir Índice",
    "rag.clear": "Limpiar Índice",
    "rag.chunk_lines": "Tamaño: {n} líneas",
    "rag.overlap": "Solapamiento: {n} líneas",
    "lang.en": "Inglés",
    "lang.es": "Español",
  },
};
