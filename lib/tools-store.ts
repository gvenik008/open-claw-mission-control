export interface ToolParam {
  name: string;
  type: "string" | "number" | "boolean";
  description?: string;
}

export interface CustomTool {
  id: string;
  name: string;
  description: string;
  type: "http" | "shell" | "javascript";
  endpoint?: string;
  command?: string;
  code?: string;
  parameters: ToolParam[];
  createdAt: string;
}

const STORAGE_KEY = "mc-tools";

export function getTools(): CustomTool[] {
  if (typeof window === "undefined") return [];
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch {
      return [];
    }
  }
  return [];
}

export function saveTool(tool: CustomTool) {
  const tools = getTools();
  const idx = tools.findIndex((t) => t.id === tool.id);
  if (idx >= 0) {
    tools[idx] = tool;
  } else {
    tools.push(tool);
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tools));
}

export function deleteTool(id: string) {
  const tools = getTools().filter((t) => t.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tools));
}
