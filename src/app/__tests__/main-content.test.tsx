import { test, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MainContent } from "@/app/main-content";

// Mock complex child components and providers
vi.mock("@/lib/contexts/file-system-context", () => ({
  FileSystemProvider: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  useFileSystem: vi.fn(() => ({
    fileSystem: null,
    refreshTrigger: 0,
    selectedFile: null,
    setSelectedFile: vi.fn(),
    getAllFiles: vi.fn(() => new Map()),
    handleToolCall: vi.fn(),
  })),
}));

vi.mock("@/lib/contexts/chat-context", () => ({
  ChatProvider: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

vi.mock("@/components/chat/ChatInterface", () => ({
  ChatInterface: () => <div data-testid="chat-interface">Chat</div>,
}));

vi.mock("@/components/editor/FileTree", () => ({
  FileTree: () => <div data-testid="file-tree">FileTree</div>,
}));

vi.mock("@/components/editor/CodeEditor", () => ({
  CodeEditor: () => <div data-testid="code-editor">CodeEditor</div>,
}));

vi.mock("@/components/preview/PreviewFrame", () => ({
  PreviewFrame: () => <div data-testid="preview-frame">PreviewFrame</div>,
}));

vi.mock("@/components/HeaderActions", () => ({
  HeaderActions: () => <div data-testid="header-actions">HeaderActions</div>,
}));

vi.mock("@/components/ui/resizable", () => ({
  ResizablePanelGroup: ({
    children,
    className,
  }: {
    children: React.ReactNode;
    className?: string;
  }) => (
    <div className={className}>
      {children}
    </div>
  ),
  ResizablePanel: ({
    children,
  }: {
    children: React.ReactNode;
  }) => <div>{children}</div>,
  ResizableHandle: () => <div />,
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

test("renders Preview and Code toggle buttons", () => {
  render(<MainContent />);
  expect(screen.getByRole("tab", { name: "Preview" })).toBeDefined();
  expect(screen.getByRole("tab", { name: "Code" })).toBeDefined();
});

test("shows preview frame and hides code editor by default", () => {
  render(<MainContent />);
  const previewWrapper = screen.getByTestId("preview-frame").parentElement!;
  const codeEditorWrapper = screen.getByTestId("code-editor").closest('[class~="hidden"]');
  expect(previewWrapper.className).not.toContain("hidden");
  expect(codeEditorWrapper).not.toBeNull();
});

test("clicking Code button shows code editor and hides preview", async () => {
  const user = userEvent.setup();
  render(<MainContent />);
  await user.click(screen.getByRole("tab", { name: "Code" }));
  const previewWrapper = screen.getByTestId("preview-frame").parentElement!;
  const codeEditorWrapper = screen.getByTestId("code-editor").closest('[class~="hidden"]');
  expect(previewWrapper.className).toContain("hidden");
  expect(codeEditorWrapper).toBeNull();
});

test("clicking Preview button after Code restores preview and hides code", async () => {
  const user = userEvent.setup();
  render(<MainContent />);
  await user.click(screen.getByRole("tab", { name: "Code" }));
  await user.click(screen.getByRole("tab", { name: "Preview" }));
  const previewWrapper = screen.getByTestId("preview-frame").parentElement!;
  const codeEditorWrapper = screen.getByTestId("code-editor").closest('[class~="hidden"]');
  expect(previewWrapper.className).not.toContain("hidden");
  expect(codeEditorWrapper).not.toBeNull();
});

test("both PreviewFrame and code editor remain mounted when toggling", async () => {
  const user = userEvent.setup();
  render(<MainContent />);
  // Initially on preview — both should be in the DOM
  expect(screen.getByTestId("preview-frame")).toBeDefined();
  expect(screen.getByTestId("code-editor")).toBeDefined();

  // Switch to code — both still in DOM
  await user.click(screen.getByRole("tab", { name: "Code" }));
  expect(screen.getByTestId("preview-frame")).toBeDefined();
  expect(screen.getByTestId("code-editor")).toBeDefined();

  // Switch back to preview — both still in DOM
  await user.click(screen.getByRole("tab", { name: "Preview" }));
  expect(screen.getByTestId("preview-frame")).toBeDefined();
  expect(screen.getByTestId("code-editor")).toBeDefined();
});
