import { test, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { ToolCallBadge } from "../ToolCallBadge";

afterEach(() => {
  cleanup();
});

// str_replace_editor tests

test("shows 'Creating' message for str_replace_editor create command", () => {
  render(
    <ToolCallBadge
      toolName="str_replace_editor"
      args={{ command: "create", path: "/components/Button.jsx" }}
      state="call"
    />
  );
  expect(screen.getByText("Creating components/Button.jsx")).toBeDefined();
});

test("shows 'Editing' message for str_replace_editor str_replace command", () => {
  render(
    <ToolCallBadge
      toolName="str_replace_editor"
      args={{ command: "str_replace", path: "/App.jsx" }}
      state="call"
    />
  );
  expect(screen.getByText("Editing App.jsx")).toBeDefined();
});

test("shows 'Editing' message for str_replace_editor insert command", () => {
  render(
    <ToolCallBadge
      toolName="str_replace_editor"
      args={{ command: "insert", path: "/App.jsx" }}
      state="call"
    />
  );
  expect(screen.getByText("Editing App.jsx")).toBeDefined();
});

test("shows 'Reading' message for str_replace_editor view command", () => {
  render(
    <ToolCallBadge
      toolName="str_replace_editor"
      args={{ command: "view", path: "/utils/helpers.ts" }}
      state="call"
    />
  );
  expect(screen.getByText("Reading utils/helpers.ts")).toBeDefined();
});

// file_manager tests

test("shows 'Deleting' message for file_manager delete command", () => {
  render(
    <ToolCallBadge
      toolName="file_manager"
      args={{ command: "delete", path: "/components/Old.jsx" }}
      state="call"
    />
  );
  expect(screen.getByText("Deleting components/Old.jsx")).toBeDefined();
});

test("shows 'Renaming' message for file_manager rename command", () => {
  render(
    <ToolCallBadge
      toolName="file_manager"
      args={{ command: "rename", path: "/components/Old.jsx", new_path: "/components/New.jsx" }}
      state="call"
    />
  );
  expect(screen.getByText("Renaming components/Old.jsx → components/New.jsx")).toBeDefined();
});

// State tests

test("shows spinner when state is 'call'", () => {
  const { container } = render(
    <ToolCallBadge
      toolName="str_replace_editor"
      args={{ command: "create", path: "/App.jsx" }}
      state="call"
    />
  );
  expect(container.querySelector(".animate-spin")).toBeDefined();
});

test("shows spinner when state is 'partial-call'", () => {
  const { container } = render(
    <ToolCallBadge
      toolName="str_replace_editor"
      args={{ command: "create", path: "/App.jsx" }}
      state="partial-call"
    />
  );
  expect(container.querySelector(".animate-spin")).toBeDefined();
});

test("shows checkmark (no spinner) when state is 'result'", () => {
  const { container } = render(
    <ToolCallBadge
      toolName="str_replace_editor"
      args={{ command: "create", path: "/App.jsx" }}
      state="result"
    />
  );
  expect(container.querySelector(".animate-spin")).toBeNull();
  // CheckCircle2 icon is rendered (emerald class via SVGAnimatedString.baseVal)
  const svgs = container.querySelectorAll("svg");
  const hasEmerald = Array.from(svgs).some((svg) =>
    svg.className.baseVal?.includes("emerald")
  );
  expect(hasEmerald).toBe(true);
});

test("strips leading slash from path", () => {
  render(
    <ToolCallBadge
      toolName="str_replace_editor"
      args={{ command: "create", path: "/components/Card.jsx" }}
      state="result"
    />
  );
  expect(screen.getByText("Creating components/Card.jsx")).toBeDefined();
});
