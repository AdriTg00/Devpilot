import { vi } from "vitest";

export const mockSettings = {
  provider: "auto",
  provider_model: "fast",
  ollama_model: "qwen2.5-coder:7b",
  groq_model: "fast",
  temperature: 0.2,
  max_tokens: 4096,
  ollama_base_url: "http://localhost:11434",
  rag_chunk_lines: 50,
  rag_overlap_lines: 5,
  rag_max_chunks_per_file: 20,
  rag_max_results: 8,
  openai_api_key: "",
  anthropic_api_key: "",
  google_api_key: "",
  groq_api_key: "",
};

export const mockApi = {
  get: vi.fn(),
  put: vi.fn(),
  post: vi.fn(),
  delete: vi.fn(),
  interceptors: {
    request: { use: vi.fn(), eject: vi.fn() },
    response: { use: vi.fn(), eject: vi.fn() },
  },
};

export const api = mockApi;

export async function getSettings(): Promise<typeof mockSettings> {
  return mockSettings;
}

export async function updateSettings(updates: Partial<typeof mockSettings>) {
  return { settings: { ...mockSettings, ...updates }, warnings: [] };
}

export async function testProviderConnection() {
  return { success: true, message: "OK" };
}

export { BASE } from "../services/api";
export const ROOT_BASE = "http://localhost:8000";
