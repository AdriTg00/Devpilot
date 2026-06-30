import axios from "axios";

const ENV = import.meta.env.VITE_API_URL;
const BASE = (ENV !== undefined ? ENV : "http://localhost:8000") + "/api/v1";

function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem("devpilot_token");
  if (!token) return {};
  return { Authorization: `Bearer ${token}` };
}

export const api = axios.create({
  baseURL: BASE,
  headers: {
    "Content-Type": "application/json",
    ...getAuthHeaders(),
  },
});

api.interceptors.request.use((config) => {
  const headers = getAuthHeaders();
  for (const [k, v] of Object.entries(headers)) {
    config.headers.set(k, v);
  }
  return config;
});

export interface Settings {
  provider: string;
  provider_model: string;
  ollama_model: string;
  groq_model: string;
  temperature: number;
  max_tokens: number;
  ollama_base_url: string;
  rag_chunk_lines: number;
  rag_overlap_lines: number;
  rag_max_chunks_per_file: number;
  rag_max_results: number;
  openai_api_key: string;
  anthropic_api_key: string;
  google_api_key: string;
  groq_api_key: string;
}

export async function getSettings(): Promise<Settings> {
  const { data } = await api.get("/settings");
  return data.settings ?? data;
}

export async function updateSettings(updates: Partial<Settings>): Promise<{ settings: Settings; warnings: string[] }> {
  const { data } = await api.put("/settings", updates);
  return { settings: data.settings ?? data, warnings: data.warnings ?? [] };
}

export async function testProviderConnection(provider: string, apiKey: string): Promise<{ success: boolean; message: string }> {
  const { data } = await api.post("/settings/test-provider", { provider, api_key: apiKey });
  return data;
}

export { BASE };

export const ROOT_BASE = ENV !== undefined ? ENV : "http://localhost:8000";
