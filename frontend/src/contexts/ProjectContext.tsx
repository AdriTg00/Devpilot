import {
  createContext,
  useContext,
  useState,
  useRef,
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

interface ProjectViewState {
  analysis: ProjectAnalysis | null;
  files: ProjectFile[];
  selectedFile: ProjectFile | null;
  fileContent: string;
  fileExplanation: string;
  fileLoading: boolean;
  explaining: boolean;
}

interface ProjectTab {
  id: string;
  path: string;
  name: string;
  view: ProjectViewState;
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

  projectTabs: { id: string; path: string; name: string }[];
  activeTabId: string | null;
  switchTab: (id: string) => void;
  closeTab: (id: string) => Promise<void>;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

function emptyView(): ProjectViewState {
  return {
    analysis: null,
    files: [],
    selectedFile: null,
    fileContent: "",
    fileExplanation: "",
    fileLoading: false,
    explaining: false,
  };
}

export function ProjectProvider({ children }: { children: ReactNode }) {
  const { language, t } = useLanguage();
  const { toast } = useToast();
  const [tabs, setTabs] = useState<ProjectTab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [closing, setClosing] = useState(false);
  const [recentProjects, setRecentProjects] = useState<string[]>(loadRecent);
  const nextId = useRef(1);

  const previousPath = localStorage.getItem(PREV_PATH_KEY) || "";

  const activeTab = tabs.find((t) => t.id === activeTabId) ?? null;

  const currentPath = activeTab?.path ?? "";
  const analysis = activeTab?.view.analysis ?? null;
  const files = activeTab?.view.files ?? [];
  const selectedFile = activeTab?.view.selectedFile ?? null;
  const fileContent = activeTab?.view.fileContent ?? "";
  const fileExplanation = activeTab?.view.fileExplanation ?? "";
  const fileLoading = activeTab?.view.fileLoading ?? false;
  const explaining = activeTab?.view.explaining ?? false;

  function updateView(partial: Partial<ProjectViewState>, tabId?: string) {
    const id = tabId ?? activeTabId;
    if (!id) return;
    setTabs((prev) =>
      prev.map((t) =>
        t.id === id ? { ...t, view: { ...t.view, ...partial } } : t,
      ),
    );
  }

  function addTab(path: string, name: string, view?: ProjectViewState): string {
    const id = `tab-${nextId.current++}`;
    const tab: ProjectTab = { id, path, name, view: view ?? emptyView() };
    setTabs((prev) => [...prev, tab]);
    setActiveTabId(id);
    saveRecent(path);
    localStorage.setItem(PREV_PATH_KEY, path);
    setRecentProjects(loadRecent());
    return id;
  }

  function setCurrentPath(path: string) {
    const existing = tabs.find((t) => t.path === path);
    if (existing) {
      setActiveTabId(existing.id);
    } else {
      addTab(path, path.split("/").filter(Boolean).pop() || path);
    }
  }

  async function uploadAndAnalyze(name: string, files: Record<string, string>) {
    setUploading(true);
    try {
      const data = await uploadProject(name, files);
      const workspacePath = data.workspace_path;
      const analysisData = {
        ...data.analysis,
        projectName: name,
        projectPath: workspacePath,
      };
      addTab(workspacePath, name, {
        analysis: analysisData,
        files: data.files || [],
        selectedFile: null,
        fileContent: "",
        fileExplanation: "",
        fileLoading: false,
        explaining: false,
      });
      toast("Proyecto subido y analizado correctamente", "success");
    } catch (err) {
      console.error("[upload] error:", err);
      toast("No se pudo subir el proyecto", "error");
    } finally {
      setUploading(false);
    }
  }

  async function closeTab(tabId: string) {
    const tab = tabs.find((t) => t.id === tabId);
    if (!tab) return;
    setClosing(true);
    try {
      await closeProjectApi(tab.path);
    } catch {
      /* best-effort cleanup */
    } finally {
      setTabs((prev) => {
        const remaining = prev.filter((t) => t.id !== tabId);
        if (remaining.length === 0) {
          setActiveTabId(null);
        } else if (activeTabId === tabId) {
          setActiveTabId(remaining[0].id);
        }
        return remaining;
      });
      setClosing(false);
    }
  }

  async function closeProject() {
    if (!activeTabId) return;
    await closeTab(activeTabId);
  }

  function switchTab(id: string) {
    setActiveTabId(id);
  }

  function clearRecentProjects() {
    localStorage.removeItem(RECENT_KEY);
    setRecentProjects([]);
  }

  async function resumeProject() {
    const prev = localStorage.getItem(PREV_PATH_KEY);
    if (!prev) return;
    const existing = tabs.find((t) => t.path === prev);
    const tabId: string = existing
      ? (setActiveTabId(existing.id), existing.id)
      : addTab(prev, prev.split("/").filter(Boolean).pop() || prev);
    await analyzeWithPath(prev, tabId);
  }

  async function analyzeWithPath(path: string, tabId?: string) {
    setLoading(true);
    try {
      const data = await analyzeProject(path);
      const analysisData = {
        ...data,
        projectName: path.replace(/\\/g, "/").split("/").filter(Boolean).pop(),
        projectPath: path,
      };
      const projectFiles = await getFiles(path);
      updateView({
        analysis: analysisData,
        files: projectFiles,
        selectedFile: null,
        fileContent: "",
        fileExplanation: "",
      }, tabId);
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
    updateView({ selectedFile: file, fileExplanation: "", fileLoading: true });
    try {
      const data = await getFileContent(file.path);
      updateView({ fileContent: data.content });
    } catch (error) {
      console.error("Error loading file:", error);
      toast("No se pudo cargar el archivo", "error");
      updateView({ fileContent: "" });
    } finally {
      updateView({ fileLoading: false });
    }
  }

  async function explainSelectedFile() {
    const file = selectedFile;
    if (!file) return;
    updateView({ explaining: true, fileExplanation: "" });
    await explainFileStream(
      file.path,
      language,
      (text: string) => updateView({ fileExplanation: text }),
      () => updateView({ explaining: false }),
      () => {
        updateView({ fileExplanation: t("viewer.error"), explaining: false });
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

        projectTabs: tabs.map((t) => ({ id: t.id, path: t.path, name: t.name })),
        activeTabId,
        switchTab,
        closeTab,
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
