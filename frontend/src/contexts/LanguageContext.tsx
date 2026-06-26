import { createContext, useContext, useState, type ReactNode } from "react";

type Language = "en" | "es";

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>("en");

  const value: LanguageContextType = {
    language,
    setLanguage,
    t: (key: string) => translations[language]?.[key] ?? translations.en?.[key] ?? key,
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
    "explorer.empty": "Analyze a project to display its files.",
    "chat.title": "Project Chat",
    "chat.no_project": "Open a project from the Dashboard first to start asking questions.",
    "chat.asking_about": "Asking about:",
    "chat.placeholder": "Ask about your project...",
    "chat.send": "Send",
    "chat.thinking": "Thinking...",
    "chat.empty": "Ask anything about your project — architecture, dependencies, how to add features, etc.",
    "chat.error": "Error: Unable to get an answer.",
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
    "explorer.empty": "Analiza un proyecto para ver sus archivos.",
    "chat.title": "Chat del Proyecto",
    "chat.no_project": "Abre un proyecto desde el Dashboard primero para hacer preguntas.",
    "chat.asking_about": "Preguntando sobre:",
    "chat.placeholder": "Pregunta sobre tu proyecto...",
    "chat.send": "Enviar",
    "chat.thinking": "Pensando...",
    "chat.empty": "Pregunta cualquier cosa sobre tu proyecto — arquitectura, dependencias, cómo añadir funciones, etc.",
    "chat.error": "Error: No se pudo obtener una respuesta.",
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
    "lang.en": "Inglés",
    "lang.es": "Español",
  },
};
