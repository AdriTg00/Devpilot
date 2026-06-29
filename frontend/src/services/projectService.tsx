import { api } from "./api";
import type { ProjectAnalysis } from "../types/Project";
import type { ProjectFile } from "../types/Files";

export interface UploadResponse {
  workspace_path: string;
  analysis: ProjectAnalysis;
  files: ProjectFile[];
  files_written: number;
}

const ENV = import.meta.env.VITE_API_URL;
const BASE = ENV !== undefined ? ENV : "http://localhost:8000";

export async function uploadProject(
  name: string,
  files: Record<string, string>,
): Promise<UploadResponse> {
  const response = await api.post("/project/upload", { name, files });
  return response.data;
}

export async function analyzeProject(
  path: string
): Promise<ProjectAnalysis> {
  const response = await api.post("/project/analyze", {
    path,
  });

  return response.data;
}

export async function getFiles(
  path: string
): Promise<ProjectFile[]> {

  const response = await api.post("/project/files", {
    path,
  });

  return response.data.files;
}


export async function getFileContent(path: string) {
  const response = await api.post("/project/read-file", {
    path,
  });

  return response.data;
}


export async function askProjectQuestion(path: string, question: string, language: string = "en") {
  const response = await api.post("/project/question", {
    path,
    question,
    language,
  });

  return response.data;
}

export async function saveFile(path: string, content: string) {
  const response = await api.post("/project/save-file", { path, content });
  return response.data;
}

export async function summarizeProject(path: string, language: string = "en") {
  const response = await api.post("/project/summary", { path, language });
  return response.data;
}

export async function explainProject(path: string, language: string = "en") {
  const response = await api.post("/project/explain-project", { path, language });
  return response.data;
}

async function streamFetch(
  url: string,
  body: Record<string, unknown>,
  onChunk: (text: string) => void,
  onDone: () => void,
  onError: (err: Error) => void,
  onHeaders?: (headers: Headers) => void,
) {
  try {
    const response = await fetch(BASE + url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    onHeaders?.(response.headers);

    const reader = response.body!.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      onChunk(buffer);
    }

    onDone();
  } catch (err) {
    onError(err instanceof Error ? err : new Error(String(err)));
  }
}

export function streamSummary(
  path: string,
  language: string,
  onChunk: (text: string) => void,
  onDone: () => void,
  onError: (err: Error) => void,
) {
  streamFetch("/project/summary", { path, language }, onChunk, onDone, onError);
}

export function streamProjectQuestion(
  path: string,
  question: string,
  language: string,
  onChunk: (text: string) => void,
  onDone: () => void,
  onError: (err: Error) => void,
  onSources?: (sources: RAGSource[]) => void,
) {
  streamFetch(
    "/project/question-stream",
    { path, question, language },
    onChunk,
    onDone,
    onError,
    (headers) => {
      const raw = headers.get("X-RAG-Sources");
      if (raw) {
        try {
          const parsed: RAGSource[] = JSON.parse(raw);
          onSources?.(parsed);
        } catch {
          /* ignore parse errors */
        }
      }
    },
  );
}

export function streamExplainProject(
  path: string,
  language: string,
  onChunk: (text: string) => void,
  onDone: () => void,
  onError: (err: Error) => void,
) {
  streamFetch("/project/explain-project", { path, language }, onChunk, onDone, onError);
}

export function streamCodeReview(
  path: string,
  language: string,
  onChunk: (text: string) => void,
  onDone: () => void,
  onError: (err: Error) => void,
) {
  streamFetch("/project/code-review", { path, language }, onChunk, onDone, onError);
}

export function streamDocumentation(
  path: string,
  language: string,
  onChunk: (text: string) => void,
  onDone: () => void,
  onError: (err: Error) => void,
) {
  streamFetch("/project/documentation", { path, language }, onChunk, onDone, onError);
}

export async function generateReadme(path: string, language: string = "en") {
  const response = await api.post("/project/readme", { path, language });
  return response.data;
}

export interface RAGSource {
  file: string;
  line_start: number;
  snippet: string;
}

export interface RAGStatus {
  ready: boolean;
  chroma_dir: string;
  chunk_lines: number;
  overlap_lines: number;
  max_chunks_per_file: number;
  max_results: number;
  total_chunks: number | null;
  project_chunks: number | null;
}

export async function getRAGStatus(path?: string): Promise<RAGStatus> {
  const params = path ? `?path=${encodeURIComponent(path)}` : "";
  const response = await api.get(`/project/rag-status${params}`);
  return response.data;
}

export async function reindexProject(path: string): Promise<{ message: string; files: number }> {
  const response = await api.post("/project/rag-reindex", { path });
  return response.data;
}

export async function clearRAGIndex(path: string): Promise<{ message: string }> {
  const response = await api.request({ method: "DELETE", url: "/project/rag-clear", data: { path } });
  return response.data;
}

export async function explainFile(path: string) {
  const response = await api.post("/project/explain-file", {
    path,
  });

  return response.data;
}

export async function casualChat(message: string) {
  const response = await api.post("/chat", { message });
  return response.data;
}

export async function clearChatMemory() {
  const response = await api.post("/chat-clear");
  return response.data;
}

export interface SearchMatch {
  path: string;
  line: number;
  content: string;
}

export interface SearchResponse {
  matches: SearchMatch[];
  total: number;
  truncated: boolean;
}

export async function searchProject(
  path: string,
  query: string,
  caseSensitive?: boolean,
): Promise<SearchResponse> {
  const response = await api.post("/project/search", {
    path,
    query,
    case_sensitive: caseSensitive ?? false,
  });
  return response.data;
}

export async function closeProject(path: string) {
  const response = await api.post("/project/close", { path });
  return response.data;
}

export async function exportProject(path: string, language: string) {
  const ENV = import.meta.env.VITE_API_URL;
  const BASE = ENV !== undefined ? ENV : "http://localhost:8000";
  const response = await fetch(BASE + "/project/export", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ path, language }),
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const blob = await response.blob();
  const disposition = response.headers.get("Content-Disposition") || "";
  const match = disposition.match(/filename="?(.+?)"?$/);
  const filename = match?.[1] || `${path.split("\\").pop() || "project"}-export.zip`;
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export interface SessionEntry {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface SessionMessage {
  role: string;
  content: string;
}

export async function listSessions(project: string = "_casual"): Promise<SessionEntry[]> {
  const response = await api.get("/chat/sessions", { params: { project } });
  return response.data;
}

export async function createSession(project: string = "_casual", name: string = ""): Promise<SessionEntry> {
  const response = await api.post("/chat/sessions", { project, name });
  return response.data;
}

export async function deleteSession(sessionId: string): Promise<void> {
  await api.delete(`/chat/sessions/${sessionId}`);
}

export async function renameSession(sessionId: string, name: string): Promise<SessionEntry> {
  const response = await api.put(`/chat/sessions/${sessionId}`, { name });
  return response.data;
}

export async function getSessionHistory(sessionId: string): Promise<SessionMessage[]> {
  const response = await api.get(`/chat/sessions/${sessionId}/history`);
  return response.data;
}

export function streamSessionChat(
  message: string,
  sessionId: string,
  onChunk: (text: string) => void,
  onDone: () => void,
  onError: (err: Error) => void,
) {
  streamFetch("/chat-stream", { message, session_id: sessionId }, onChunk, onDone, onError);
}

export function streamCasualChat(
  message: string,
  onChunk: (text: string) => void,
  onDone: () => void,
  onError: (err: Error) => void,
) {
  streamFetch("/chat-stream", { message }, onChunk, onDone, onError);
}

export async function analyzeCode(path: string) {
  const response = await api.post("/tools/analyze-file", { path });
  return response.data;
}

export async function readToolFile(path: string) {
  const response = await api.post("/tools/read-file", { path });
  return response.data;
}

export async function listToolFiles(path: string) {
  const response = await api.post("/tools/list-files", { path });
  return response.data;
}

export async function explainFileStream(
  path: string,
  language: string,
  onChunk: (text: string) => void,
  onDone: () => void,
  onError: (error: Error) => void,
): Promise<void> {
  try {
    const response = await fetch(BASE + "/project/explain-file", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path, language }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error: ${response.status}`);
    }

    const reader = response.body!.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      onChunk(buffer);
    }

    onDone();
  } catch (error) {
    onError(error instanceof Error ? error : new Error(String(error)));
  }
}