import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Health from "../Health";
import { LanguageProvider } from "../../../contexts/LanguageContext";

vi.mock("../../../services/projectService", () => ({
  getHealthDetailed: vi.fn().mockResolvedValue({
    status: "healthy",
    version: "0.1.0",
    uptime_seconds: 3600,
    settings: {
      provider: "ollama",
      model: "qwen2.5-coder:7b",
      active_model: "qwen2.5-coder:7b",
      temperature: 0.2,
      max_tokens: 4096,
    },
    services: {
      ollama: { reachable: true, models: ["qwen2.5-coder:7b"], error: null },
      groq: { configured: false, reachable: false },
      rag: { ready: true, chunks: 42, dimensions: 384 },
      rag_ready: true,
    },
    storage: {
      memory_path: "/tmp",
      memory_bytes: 1258291,
      shares_count: 0,
    },
    quota: { has_quota: true, message: "", error: null },
    base_url: "http://localhost:8000",
  }),
}));

function renderWithProviders(ui: React.ReactElement) {
  return render(
    <MemoryRouter>
      <LanguageProvider>
        {ui}
      </LanguageProvider>
    </MemoryRouter>
  );
}

describe("Health Page", () => {
  it("renders the health dashboard title", async () => {
    renderWithProviders(<Health />);
    expect(await screen.findByText("Health Dashboard")).toBeDefined();
  });

  it("displays provider information", async () => {
    renderWithProviders(<Health />);
    expect(await screen.findByText("ollama")).toBeDefined();
  });

  it("displays model information", async () => {
    renderWithProviders(<Health />);
    const elements = await screen.findAllByText("qwen2.5-coder:7b");
    expect(elements.length).toBeGreaterThan(0);
  });

  it("shows RAG section when ready", async () => {
    renderWithProviders(<Health />);
    expect(await screen.findByText("RAG (ChromaDB)")).toBeDefined();
  });
});
