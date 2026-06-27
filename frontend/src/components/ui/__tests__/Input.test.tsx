import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import Input from "../Input";

describe("Input", () => {
  it("renders with placeholder", () => {
    render(<Input placeholder="Type here" />);
    expect(screen.getByPlaceholderText("Type here")).toBeDefined();
  });

  it("forwards ref", () => {
    const ref = { current: null };
    render(<Input ref={ref} />);
    expect(ref.current).toBeInstanceOf(HTMLInputElement);
  });

  it("applies custom className", () => {
    render(<Input className="extra-class" />);
    const input = screen.getByRole("textbox");
    expect(input.className).toContain("extra-class");
  });

  it("passes input props", () => {
    render(<Input disabled type="email" />);
    const input = screen.getByRole("textbox") as HTMLInputElement;
    expect(input.disabled).toBe(true);
    expect(input.type).toBe("email");
  });
});
