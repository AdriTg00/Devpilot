import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import Spinner from "../Spinner";

describe("Spinner", () => {
  it("renders svg", () => {
    const { container } = render(<Spinner />);
    const svg = container.querySelector("svg");
    expect(svg).toBeDefined();
  });

  it("applies size classes", () => {
    const { container } = render(<Spinner size="lg" />);
    const svg = container.querySelector("svg")!;
    expect(svg.getAttribute("class")).toContain("h-8");
    expect(svg.getAttribute("class")).toContain("w-8");
  });

  it("renders with sm size", () => {
    const { container } = render(<Spinner size="sm" />);
    const svg = container.querySelector("svg")!;
    expect(svg.getAttribute("class")).toContain("h-4");
    expect(svg.getAttribute("class")).toContain("w-4");
  });

  it("applies custom className", () => {
    const { container } = render(<Spinner className="text-red-500" />);
    const svg = container.querySelector("svg")!;
    expect(svg.getAttribute("class")).toContain("text-red-500");
  });
});
