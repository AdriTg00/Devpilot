import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { ToastProvider, useToast } from "../ToastContext";

vi.mock("cuelume", () => ({
  play: vi.fn(),
}));

function TestComponent() {
  const { toast } = useToast();
  return (
    <div>
      <button data-testid="show-success" onClick={() => toast("Success!", "success")}>Success</button>
      <button data-testid="show-error" onClick={() => toast("Error!", "error")}>Error</button>
      <button data-testid="show-info" onClick={() => toast("Info!", "info")}>Info</button>
    </div>
  );
}

describe("ToastContext", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders children", () => {
    render(
      <ToastProvider>
        <span>child</span>
      </ToastProvider>
    );
    expect(screen.getByText("child")).toBeDefined();
  });

  it("shows a success toast", () => {
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    );
    act(() => { screen.getByTestId("show-success").click(); });
    expect(screen.getByText("Success!")).toBeDefined();
  });

  it("shows an error toast", () => {
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    );
    act(() => { screen.getByTestId("show-error").click(); });
    expect(screen.getByText("Error!")).toBeDefined();
  });

  it("shows an info toast", () => {
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    );
    act(() => { screen.getByTestId("show-info").click(); });
    expect(screen.getByText("Info!")).toBeDefined();
  });

  it("auto-dismisses toast after 4 seconds", () => {
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    );
    act(() => { screen.getByTestId("show-error").click(); });
    expect(screen.getByText("Error!")).toBeDefined();

    act(() => { vi.advanceTimersByTime(4000); });
    expect(screen.queryByText("Error!")).toBeNull();
  });

  it("throws when useToast is used outside provider", () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => render(<TestComponent />)).toThrow("useToast must be used inside ToastProvider");
    consoleSpy.mockRestore();
  });
});
