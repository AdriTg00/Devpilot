import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from "react";

import {
  analyzeProject,
  getFiles,
  getFileContent,
  explainFileStream,
} from "../services/projectService";
import { useLanguage } from "./LanguageContext";
import { useToast } from "./ToastContext";

import type { ProjectAnalysis } from "../types/Project";
import type { ProjectFile } from "../types/Files";

const RECENT_KEY = "devpilot_recent";
const PATH_KEY = "devpilot_path";
const ANALYSIS_KEY = "devpilot_analysis";
const FILES_KEY = "devpilot_files";

function loadRecent(): string[] {
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) || "[]");
  } catch {
    return [];
  }
}

function saveRecent(path: string) {
  const list = loadRecent().filter((p) => p !== path);
  list.unshift(path);
  localStorage.setItem(RECENT_KEY, JSON.stringify(list.slice(0, 10)));
}

function loadJSON<T>(key: string, fallback: T): T {
  try {
    const v = localStorage.getItem(key);
    return v ? JSON.parse(v) : fallback;
  } catch {
    return fallback;
  }
}

interface ProjectContextType {
  currentPath: string;
  setCurrentPath: (path: string) => void;

  analysis: ProjectAnalysis | null;

  files: ProjectFile[];

  selectedFile: ProjectFile | null;
  fileContent: string;
  fileExplanation: string;

  selectFile: (file: ProjectFile) => Promise<void>;
  explainSelectedFile: () => Promise<void>;

  loading: boolean;
  explaining: boolean;
  fileLoading: boolean;

  recentProjects: string[];

  analyze: () => Promise<void>;
} 

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export function ProjectProvider({ children }: { children: ReactNode }) {
  const { language, t } = useLanguage();
  const { toast } = useToast();
  const [currentPath, setCurrentPath] = useState(() =>
    localStorage.getItem(PATH_KEY) || "",
  );

  const [analysis, setAnalysis] = useState<ProjectAnalysis | null>(() =>
    loadJSON<ProjectAnalysis | null>(ANALYSIS_KEY, null),
  );

  const [files, setFiles] = useState<ProjectFile[]>(() =>
    loadJSON<ProjectFile[]>(FILES_KEY, []),
  );

  const [selectedFile, setSelectedFile] = useState<ProjectFile | null>(null);

  const [fileContent, setFileContent] = useState("");

  const [fileExplanation, setFileExplanation] = useState("");

  const [loading, setLoading] = useState(false);

  const [explaining, setExplaining] = useState(false);

  const [fileLoading, setFileLoading] = useState(false);

  const [recentProjects, setRecentProjects] = useState<string[]>(loadRecent);

  useEffect(() => {
    localStorage.setItem(PATH_KEY, currentPath);
  }, [currentPath]);

  useEffect(() => {
    if (analysis) {
      localStorage.setItem(ANALYSIS_KEY, JSON.stringify(analysis));
    } else {
      localStorage.removeItem(ANALYSIS_KEY);
    }
  }, [analysis]);

  useEffect(() => {
    localStorage.setItem(FILES_KEY, JSON.stringify(files));
  }, [files]);

  async function analyze() {
    if (!currentPath) return;

    setLoading(true);

    try {
      const data = await analyzeProject(currentPath);

      setAnalysis({
        ...data,
        projectName: currentPath.split("\\").pop(),
        projectPath: currentPath,
      });

      const projectFiles = await getFiles(currentPath);

      setFiles(projectFiles);

      setSelectedFile(null);
      setFileContent("");
      setFileExplanation("");

      saveRecent(currentPath);
      setRecentProjects(loadRecent());
      toast("Proyecto analizado correctamente", "success");
    } catch {
      toast("No se pudo analizar el proyecto", "error");
    } finally {
      setLoading(false);
    }
  }

  async function selectFile(file: ProjectFile) {
    setSelectedFile(file);

    setFileExplanation("");
    setFileLoading(true);

    try {
      const data = await getFileContent(file.path);

      setFileContent(data.content);
    } catch (error) {
      console.error("Error loading file:", error);
      toast("No se pudo cargar el archivo", "error");

      setFileContent("");
    } finally {
      setFileLoading(false);
    }
  }

  async function explainSelectedFile() {
    if (!selectedFile) return;

    setExplaining(true);
    setFileExplanation("");

    await explainFileStream(
      selectedFile.path,
      language,
      (text: string) => setFileExplanation(text),
      () => setExplaining(false),
      (error: Error) => {
        console.error("Error explaining file:", error);
        setFileExplanation(t("viewer.error"));
        setExplaining(false);
        toast("Error al explicar el archivo", "error");
      },
    );
  }

  return (
    <ProjectContext.Provider
      value={{
        currentPath,
        setCurrentPath,

        analysis,

        files,

        selectedFile,
        fileContent,
        fileExplanation,

        selectFile,
        explainSelectedFile,

        loading,
        explaining,
        fileLoading,

        recentProjects,

        analyze,
      }}
    >
      {children}
    </ProjectContext.Provider>
  );
}

export function useProject() {
  const context = useContext(ProjectContext);

  if (!context) {
    throw new Error("useProject must be used inside ProjectProvider");
  }

  return context;
}