import axios from "axios";

const ENV = import.meta.env.VITE_API_URL;
const BASE = ENV !== undefined ? ENV : "http://localhost:8000";

export const api = axios.create({
  baseURL: BASE,
  headers: {
    "Content-Type": "application/json",
  },
});

export interface Settings {
  provider: string;
  ollama_model: string;
  groq_model: string;
  temperature: number;
  max_tokens: number;
  ollama_base_url: string;
  rag_chunk_lines: number;
  rag_overlap_lines: number;
  rag_max_chunks_per_file: number;
  rag_max_results: number;
}

export async function getSettings(): Promise<Settings> {
  const { data } = await api.get("/settings");
  return data;
}

export async function updateSettings(updates: Partial<Settings>): Promise<Settings> {
  const { data } = await api.put("/settings", updates);
  return data;
}
