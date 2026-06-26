import {
  createContext,
  useContext,
  useState,
  type ReactNode,
} from "react";

import {
  analyzeProject,
  getFiles,
  getFileContent,
  explainFileStream,
} from "../services/projectService";
import { useLanguage } from "./LanguageContext";

import type { ProjectAnalysis } from "../types/Project";
import type { ProjectFile } from "../types/Files";

const RECENT_KEY = "devpilot_recent";

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
  explaining: boolean;

  recentProjects: string[];

  analyze: () => Promise<void>;
} 

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export function ProjectProvider({ children }: { children: ReactNode }) {
  const { language, t } = useLanguage();
  const [currentPath, setCurrentPath] = useState("");

  const [analysis, setAnalysis] = useState<ProjectAnalysis | null>(null);

  const [files, setFiles] = useState<ProjectFile[]>([]);

  const [selectedFile, setSelectedFile] = useState<ProjectFile | null>(null);

  const [fileContent, setFileContent] = useState("");

  const [fileExplanation, setFileExplanation] = useState("");

  const [loading, setLoading] = useState(false);

  const [explaining, setExplaining] = useState(false);

  const [recentProjects, setRecentProjects] = useState<string[]>(loadRecent);

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
    } finally {
      setLoading(false);
    }
  }

  async function selectFile(file: ProjectFile) {
    setSelectedFile(file);

    // Limpiamos la explicación al cambiar de archivo
    setFileExplanation("");

    try {
      const data = await getFileContent(file.path);

      setFileContent(data.content);
    } catch (error) {
      console.error("Error loading file:", error);

      setFileContent("");
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