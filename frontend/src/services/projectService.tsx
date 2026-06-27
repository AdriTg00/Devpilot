import { api } from "./api";
import type { ProjectAnalysis } from "../types/Project";
import type { ProjectFile } from "../types/Files";

const ENV = import.meta.env.VITE_API_URL;
const BASE = ENV !== undefined ? ENV : "http://localhost:8000";

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
) {
  streamFetch("/project/question-stream", { path, question, language }, onChunk, onDone, onError);
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