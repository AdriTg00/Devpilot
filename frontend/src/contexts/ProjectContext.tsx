import {
  createContext,
  useContext,
  useState,
  type ReactNode,
} from "react";

import {
  analyzeProject,
  uploadProject,
  closeProject as closeProjectApi,
  getFiles,
  getFileContent,
  explainFileStream,
} from "../services/projectService";
import { useLanguage } from "./LanguageContext";
import { useToast } from "./ToastContext";

import type { ProjectAnalysis } from "../types/Project";
import type { ProjectFile } from "../types/Files";

const RECENT_KEY = "devpilot_recent";
const PREV_PATH_KEY = "devpilot_prev_path";

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
  uploading: boolean;
  closing: boolean;
  explaining: boolean;
  fileLoading: boolean;

  recentProjects: string[];
  previousPath: string;
  clearRecentProjects: () => void;

  analyze: () => Promise<void>;
  uploadAndAnalyze: (name: string, files: Record<string, string>) => Promise<void>;
  closeProject: () => Promise<void>;
  resumeProject: () => Promise<void>;
} 

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export function ProjectProvider({ children }: { children: ReactNode }) {
  const { language, t } = useLanguage();
  const { toast } = useToast();
  const [currentPath, setCurrentPath] = useState("");
  const [analysis, setAnalysis] = useState<ProjectAnalysis | null>(null);
  const [files, setFiles] = useState<ProjectFile[]>([]);

  const [selectedFile, setSelectedFile] = useState<ProjectFile | null>(null);

  const [fileContent, setFileContent] = useState("");

  const [fileExplanation, setFileExplanation] = useState("");

  const [loading, setLoading] = useState(false);

  const [uploading, setUploading] = useState(false);
  const [closing, setClosing] = useState(false);

  const [explaining, setExplaining] = useState(false);

  const [fileLoading, setFileLoading] = useState(false);

  const [recentProjects, setRecentProjects] = useState<string[]>(loadRecent);

  const previousPath = localStorage.getItem(PREV_PATH_KEY) || "";

  async function uploadAndAnalyze(name: string, files: Record<string, string>) {
    setUploading(true);
    try {
      const data = await uploadProject(name, files);
      console.log("[upload] response:", data);
      const workspacePath = data.workspace_path;
      setCurrentPath(workspacePath);

      const analysisData = {
        ...data.analysis,
        projectName: name,
        projectPath: workspacePath,
      };
      console.log("[upload] analysis:", analysisData);
      setAnalysis(analysisData);

      console.log("[upload] files:", data.files?.length);
      setFiles(data.files || []);
      setSelectedFile(null);
      setFileContent("");
      setFileExplanation("");
      saveRecent(workspacePath);
      localStorage.setItem(PREV_PATH_KEY, workspacePath);
      setRecentProjects(loadRecent());
      toast("Proyecto subido y analizado correctamente", "success");
    } catch (err) {
      console.error("[upload] error:", err);
      toast("No se pudo subir el proyecto", "error");
    } finally {
      setUploading(false);
    }
  }

  async function closeProject() {
    if (!currentPath) return;
    setClosing(true);
    try {
      await closeProjectApi(currentPath);
      setCurrentPath("");
      setAnalysis(null);
      setFiles([]);
      setSelectedFile(null);
      setFileContent("");
      setFileExplanation("");
      toast("Proyecto cerrado", "success");
    } catch {
      toast("Error al cerrar el proyecto", "error");
    } finally {
      setClosing(false);
    }
  }

  function clearRecentProjects() {
    localStorage.removeItem(RECENT_KEY);
    setRecentProjects([]);
  }

  async function resumeProject() {
    const prev = localStorage.getItem(PREV_PATH_KEY);
    if (!prev) return;
    setCurrentPath(prev);
    await analyzeWithPath(prev);
  }

  async function analyzeWithPath(path: string) {
    setLoading(true);
    try {
      const data = await analyzeProject(path);
      setAnalysis({
        ...data,
        projectName: path.replace(/\\/g, "/").split("/").filter(Boolean).pop(),
        projectPath: path,
      });
      const projectFiles = await getFiles(path);
      setFiles(projectFiles);
      setSelectedFile(null);
      setFileContent("");
      setFileExplanation("");
      saveRecent(path);
      setRecentProjects(loadRecent());
      localStorage.setItem(PREV_PATH_KEY, path);
      toast("Proyecto analizado correctamente", "success");
    } catch {
      toast("No se pudo analizar el proyecto", "error");
    } finally {
      setLoading(false);
    }
  }

  async function analyze() {
    if (!currentPath) return;
    await analyzeWithPath(currentPath);
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
        uploading,
        closing,
        explaining,
        fileLoading,

        recentProjects,
        previousPath,
        clearRecentProjects,

        analyze,
        uploadAndAnalyze,
        closeProject,
        resumeProject,
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