import { describe, it, expect, vi } from "vitest";
import { BASE, ROOT_BASE } from "../api";

vi.mock("axios", () => {
  const mockAxios = {
    create: vi.fn(() => mockAxios),
    get: vi.fn(),
    put: vi.fn(),
    post: vi.fn(),
    interceptors: {
      request: { use: vi.fn(), eject: vi.fn() },
      response: { use: vi.fn(), eject: vi.fn() },
    },
  };
  return { default: mockAxios };
});

describe("api service", () => {
  it("exports BASE URL", () => {
    expect(BASE).toContain("/api/v1");
  });

  it("exports ROOT_BASE URL", () => {
    expect(ROOT_BASE).toContain("localhost:8000");
  });
});
