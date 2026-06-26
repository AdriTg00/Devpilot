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
} from "../services/projectService";

import type { ProjectAnalysis } from "../types/Project";
import type { ProjectFile } from "../types/Files";

interface ProjectContextType {
  currentPath: string;
  setCurrentPath: (path: string) => void;

  analysis: ProjectAnalysis | null;

  files: ProjectFile[];

  selectedFile: ProjectFile | null;
  fileContent: string;

  selectFile: (file: ProjectFile) => Promise<void>;

  loading: boolean;

  analyze: () => Promise<void>;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export function ProjectProvider({ children }: { children: ReactNode }) {
  const [currentPath, setCurrentPath] = useState("");

  const [analysis, setAnalysis] = useState<ProjectAnalysis | null>(null);

  const [files, setFiles] = useState<ProjectFile[]>([]);

  const [selectedFile, setSelectedFile] = useState<ProjectFile | null>(null);

  const [fileContent, setFileContent] = useState("");

  const [loading, setLoading] = useState(false);

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
    } finally {
      setLoading(false);
    }
  }

  async function selectFile(file: ProjectFile) {
    setSelectedFile(file);

    try {
      const data = await getFileContent(file.path);
      setFileContent(data.content);
    } catch (error) {
      console.error("Error loading file:", error);
      setFileContent("");
    }
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

        selectFile,

        loading,

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