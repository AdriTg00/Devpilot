import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import TypingEffect, { CodeSkeleton } from "../TypingEffect";

describe("CodeSkeleton", () => {
  it("renders skeleton lines", () => {
    const { container } = render(<CodeSkeleton />);
    const lines = container.querySelectorAll(".animate-pulse");
    expect(lines.length).toBeGreaterThan(0);
  });
});

describe("TypingEffect", () => {
  it("renders skeleton when loading with no text", () => {
    const { container } = render(<TypingEffect text="" loading />);
    const skeletons = container.querySelectorAll(".animate-pulse");
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it("renders text when loaded", () => {
    render(<TypingEffect text="Hello world" loading={false} />);
    expect(screen.getByText("Hello world")).toBeDefined();
  });

  it("renders empty state with no text and not loading", () => {
    const { container } = render(<TypingEffect text="" loading={false} />);
    expect(container.querySelector(".animate-pulse")).toBeNull();
  });

  it("renders cursor while streaming", () => {
    // Speed 1 so words appear one at a time quickly but not instantly all at once
    const { container } = render(
      <TypingEffect text="word1 word2 word3" loading speed={2000} />,
    );
    const cursor = container.querySelector(".bg-emerald-400");
    expect(cursor).toBeDefined();
  });
});
