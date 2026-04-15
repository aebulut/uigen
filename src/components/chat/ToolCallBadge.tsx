"use client";

import { Loader2, CheckCircle2, FilePlus, FilePen, FileX, FileSearch, ArrowRightLeft } from "lucide-react";

interface ToolCallBadgeProps {
  toolName: string;
  args: Record<string, unknown>;
  state: "call" | "partial-call" | "result";
}

function getLabel(toolName: string, args: Record<string, unknown>): { icon: React.ReactNode; text: string } {
  const path = typeof args.path === "string" ? args.path.replace(/^\//, "") : "";
  const newPath = typeof args.new_path === "string" ? args.new_path.replace(/^\//, "") : "";
  const command = args.command as string | undefined;

  if (toolName === "str_replace_editor") {
    switch (command) {
      case "create":
        return { icon: <FilePlus className="w-3 h-3" />, text: `Creating ${path}` };
      case "str_replace":
      case "insert":
        return { icon: <FilePen className="w-3 h-3" />, text: `Editing ${path}` };
      case "view":
        return { icon: <FileSearch className="w-3 h-3" />, text: `Reading ${path}` };
      default:
        return { icon: <FilePen className="w-3 h-3" />, text: `Editing ${path}` };
    }
  }

  if (toolName === "file_manager") {
    switch (command) {
      case "delete":
        return { icon: <FileX className="w-3 h-3" />, text: `Deleting ${path}` };
      case "rename":
        return { icon: <ArrowRightLeft className="w-3 h-3" />, text: `Renaming ${path} → ${newPath}` };
      default:
        return { icon: <FilePen className="w-3 h-3" />, text: path };
    }
  }

  return { icon: <FilePen className="w-3 h-3" />, text: toolName };
}

export function ToolCallBadge({ toolName, args, state }: ToolCallBadgeProps) {
  const done = state === "result";
  const { icon, text } = getLabel(toolName, args);

  return (
    <div className="inline-flex items-center gap-2 mt-2 px-3 py-1.5 bg-neutral-50 rounded-lg text-xs font-mono border border-neutral-200">
      {done ? (
        <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" />
      ) : (
        <Loader2 className="w-3 h-3 animate-spin text-blue-600 shrink-0" />
      )}
      <span className="text-neutral-600 shrink-0">{icon}</span>
      <span className="text-neutral-700">{text}</span>
    </div>
  );
}
