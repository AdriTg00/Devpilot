import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import Card from "../Card";

describe("Card", () => {
  it("renders children", () => {
    render(<Card>Hello</Card>);
    expect(screen.getByText("Hello")).toBeDefined();
  });

  it("applies custom className", () => {
    render(<Card className="custom-class">Content</Card>);
    const el = screen.getByText("Content");
    expect(el.className).toContain("custom-class");
  });

  it("renders complex children", () => {
    render(
      <Card>
        <span data-testid="inner">Nested</span>
      </Card>,
    );
    expect(screen.getByTestId("inner")).toBeDefined();
  });
});
