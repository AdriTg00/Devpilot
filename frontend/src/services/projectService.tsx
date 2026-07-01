import { api, BASE, ROOT_BASE } from "./api";
import type { ProjectAnalysis } from "../types/Project";
import type { ProjectFile } from "../types/Files";

function fetchAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem("devpilot_token");
  if (!token) return { "Content-Type": "application/json" };
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

export interface UploadResponse {
  workspace_path: string;
  analysis: ProjectAnalysis;
  files: ProjectFile[];
  files_written: number;
}


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
      headers: fetchAuthHeaders(),
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

export async function reindexProject(path: string, files?: string[]): Promise<{ message: string; files: number }> {
  const response = await api.post("/project/rag-reindex", { path, files });
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

export async function aiFixCode(path: string, issue: string, fixSuggestion: string) {
  const response = await api.post("/project/ai-fix", {
    path,
    issue,
    fix_suggestion: fixSuggestion,
  });
  return response.data;
}

export function streamAiFix(
  path: string,
  issue: string,
  fixSuggestion: string,
  onChunk: (text: string) => void,
  onDone: (fixedContent: string) => void,
  onError: (err: Error) => void,
) {
  const url = `${BASE}/project/ai-fix`;
  const body = JSON.stringify({ path, issue, fix_suggestion: fixSuggestion });

  try {
    fetch(url, {
      method: "POST",
      headers: fetchAuthHeaders(),
      body,
    })
      .then(async (response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const reader = response.body!.getReader();
        const decoder = new TextDecoder();
        let full = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          full += chunk;

          if (full.includes("__FIX_ERROR__")) {
            onError(new Error("AI fix returned invalid output"));
            return;
          }

          // Clean markdown fences for display
          let display = full.replace("__FIX_ERROR__", "");
          if (display.startsWith("```")) {
            const lines = display.split("\n");
            lines.shift();
            if (lines.length > 0 && lines[lines.length - 1].trim() === "```") {
              lines.pop();
            }
            display = lines.join("\n");
          }
          onChunk(display);
        }

        let cleaned = full.replace("__FIX_ERROR__", "").trim();
        // Strip markdown code fences (```lang ... ```)
        if (cleaned.startsWith("```")) {
          const lines = cleaned.split("\n");
          lines.shift(); // remove first line (```lang)
          if (lines[lines.length - 1].trim() === "```") {
            lines.pop(); // remove last line (```)
          }
          cleaned = lines.join("\n").trim();
        }
        if (!cleaned) {
          onError(new Error("Empty response from AI"));
          return;
        }
        onDone(cleaned);
      })
      .catch((err) => onError(err instanceof Error ? err : new Error(String(err))));
  } catch (err) {
    onError(err instanceof Error ? err : new Error(String(err)));
  }
}

export async function exportProject(path: string, language: string) {
  const response = await fetch(BASE + "/project/export", {
    method: "POST",
    headers: fetchAuthHeaders(),
    body: JSON.stringify({ path, language }),
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const blob = await response.blob();
  const disposition = response.headers.get("Content-Disposition") || "";
  const match = disposition.match(/filename="?(.+?)"?$/);
  const filename = match?.[1] || `${path.replace(/\\/g, "/").split("/").filter(Boolean).pop() || "project"}-export.zip`;
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

export interface ToolEvent {
  type: "tool_call" | "tool_result" | "done";
  tool?: string;
  args?: Record<string, unknown>;
  result?: string;
}

export function streamToolChat(
  message: string,
  projectPath: string,
  onChunk: (text: string) => void,
  onToolEvent: (event: ToolEvent) => void,
  onDone: () => void,
  onError: (err: Error) => void,
) {
  const url = `${BASE}/chat/tool-stream`;
  const body = JSON.stringify({ message, project_path: projectPath });
  const TOOL_PREFIX = "__TOOL__";

  try {
    fetch(url, {
      method: "POST",
      headers: fetchAuthHeaders(),
      body,
    })
      .then(async (response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const reader = response.body!.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let textBuffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });

          // process complete tool events
          while (buffer.includes("\n")) {
            const nlIdx = buffer.indexOf("\n");
            const line = buffer.slice(0, nlIdx);
            buffer = buffer.slice(nlIdx + 1);

            if (line.startsWith(TOOL_PREFIX)) {
              try {
                const event: ToolEvent = JSON.parse(line.slice(TOOL_PREFIX.length));
                onToolEvent(event);
              } catch {
                // ignore parse errors
              }
            } else {
              textBuffer += line + "\n";
              onChunk(textBuffer);
            }
          }
        }

        // remaining buffer
        if (buffer && !buffer.startsWith(TOOL_PREFIX)) {
          textBuffer += buffer;
          onChunk(textBuffer);
        }

        onDone();
      })
      .catch((err) => onError(err instanceof Error ? err : new Error(String(err))));
  } catch (err) {
    onError(err instanceof Error ? err : new Error(String(err)));
  }
}

export interface ShareEntry {
  token: string;
  url: string;
  expires_at: string;
  created_at: string;
}

export interface SharedProjectData {
  token: string;
  project_name: string;
  project_path: string;
  analysis: import("../types/Project").ProjectAnalysis;
  file_tree: string[];
  file_count: number;
  created_at: string;
  expires_at: string;
}

export async function shareProject(path: string, expiryDays: number = 7): Promise<ShareEntry> {
  const response = await api.post("/project/share", { path, expiry_days: expiryDays });
  return response.data;
}

export async function getSharedProject(token: string): Promise<SharedProjectData> {
  const response = await fetch(`${ROOT_BASE}/shared/${token}`);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
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
      headers: fetchAuthHeaders(),
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

export interface HealthResponse {
  status: string;
  version: string;
  uptime_seconds: number;
  settings: {
    provider: string;
    model: string;
    temperature: number;
    max_tokens: number;
  };
  services: {
    ollama: { reachable: boolean; models: string[]; error: string | null };
    groq: { configured: boolean; reachable: boolean };
    rag: Record<string, unknown>;
    rag_ready: boolean;
  };
  storage: {
    memory_path: string;
    memory_bytes: number;
    shares_count: number;
  };
  base_url: string;
}

export async function getHealthDetailed(): Promise<HealthResponse> {
  const response = await fetch(`${ROOT_BASE}/health/detailed`);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}