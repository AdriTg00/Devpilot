import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { LanguageProvider, useLanguage } from "../LanguageContext";

function TestComponent() {
  const { language, setLanguage, t } = useLanguage();
  return (
    <div>
      <span data-testid="language">{language}</span>
      <span data-testid="translated">{t("settings.title")}</span>
      <span data-testid="with-params">{t("stats.files_line", { files: 5, lines: 100 })}</span>
      <span data-testid="missing-key">{t("nonexistent.key")}</span>
      <button data-testid="set-es" onClick={() => setLanguage("es")}>ES</button>
      <button data-testid="set-en" onClick={() => setLanguage("en")}>EN</button>
    </div>
  );
}

describe("LanguageContext", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("defaults to English", () => {
    render(
      <LanguageProvider>
        <TestComponent />
      </LanguageProvider>
    );
    expect(screen.getByTestId("language").textContent).toBe("en");
  });

  it("returns English translations by default", () => {
    render(
      <LanguageProvider>
        <TestComponent />
      </LanguageProvider>
    );
    expect(screen.getByTestId("translated").textContent).toBe("Settings");
  });

  it("switches to Spanish", () => {
    render(
      <LanguageProvider>
        <TestComponent />
      </LanguageProvider>
    );
    act(() => { screen.getByTestId("set-es").click(); });
    expect(screen.getByTestId("language").textContent).toBe("es");
    expect(screen.getByTestId("translated").textContent).toBe("Configuración");
  });

  it("persists language to localStorage", () => {
    render(
      <LanguageProvider>
        <TestComponent />
      </LanguageProvider>
    );
    act(() => { screen.getByTestId("set-es").click(); });
    expect(localStorage.getItem("devpilot_lang")).toBe("es");
  });

  it("reads language from localStorage on mount", () => {
    localStorage.setItem("devpilot_lang", "es");
    render(
      <LanguageProvider>
        <TestComponent />
      </LanguageProvider>
    );
    expect(screen.getByTestId("language").textContent).toBe("es");
  });

  it("interpolates params in translations", () => {
    render(
      <LanguageProvider>
        <TestComponent />
      </LanguageProvider>
    );
    expect(screen.getByTestId("with-params").textContent).toBe("5 files, 100 lines");
  });

  it("returns the key itself for missing translations", () => {
    render(
      <LanguageProvider>
        <TestComponent />
      </LanguageProvider>
    );
    expect(screen.getByTestId("missing-key").textContent).toBe("nonexistent.key");
  });

  it("throws when useLanguage is used outside provider", () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => render(<TestComponent />)).toThrow("useLanguage must be used inside LanguageProvider");
    consoleSpy.mockRestore();
  });
});
