import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import Badge from "../Badge";

describe("Badge", () => {
  it("renders children", () => {
    render(<Badge>Label</Badge>);
    expect(screen.getByText("Label")).toBeDefined();
  });

  it("applies default variant", () => {
    render(<Badge>Default</Badge>);
    const el = screen.getByText("Default");
    expect(el.className).toContain("bg-slate-700");
  });

  it("applies emerald variant", () => {
    render(<Badge variant="emerald">Active</Badge>);
    const el = screen.getByText("Active");
    expect(el.className).toContain("bg-emerald-900");
  });

  it("applies amber variant", () => {
    render(<Badge variant="amber">Warning</Badge>);
    const el = screen.getByText("Warning");
    expect(el.className).toContain("bg-amber-900");
  });

  it("applies custom className", () => {
    render(<Badge className="custom">Custom</Badge>);
    const el = screen.getByText("Custom");
    expect(el.className).toContain("custom");
  });
});
