const DEFAULT_GATEWAY_URL = "http://127.0.0.1:18789";
const DEFAULT_TOKEN = "7f219aa154a9aac8bafdf23333c1095129a20679879828cd";

export function getSettings() {
  if (typeof window === "undefined") return { gatewayUrl: DEFAULT_GATEWAY_URL, token: DEFAULT_TOKEN };
  const saved = localStorage.getItem("mc-settings");
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch {
      // ignore
    }
  }
  return { gatewayUrl: DEFAULT_GATEWAY_URL, token: DEFAULT_TOKEN };
}

export function saveSettings(settings: { gatewayUrl: string; token: string }) {
  localStorage.setItem("mc-settings", JSON.stringify(settings));
}

export async function fetchGateway(path: string, options?: RequestInit) {
  const { token } = getSettings();
  // Use Next.js rewrite proxy to avoid CORS issues
  const proxyPath = `/proxy/gateway${path.startsWith("/") ? path : "/" + path}`;
  try {
    const res = await fetch(proxyPath, {
      ...options,
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
        ...options?.headers,
      },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (e) {
    console.warn(`Gateway fetch failed for ${path}:`, e);
    return null;
  }
}

export async function checkGatewayHealth(): Promise<boolean> {
  try {
    const res = await fetch("/proxy/gateway/health");
    return res.ok;
  } catch {
    return false;
  }
}

// Mock data fallbacks
export const mockSessions = [
  {
    id: "sess-001",
    name: "agent:main",
    channel: "webchat",
    lastActive: new Date().toISOString(),
    status: "active",
    messages: [
      { role: "user", content: "Build me a dashboard", timestamp: new Date(Date.now() - 300000).toISOString() },
      { role: "assistant", content: "On it! Creating Mission Control...", timestamp: new Date(Date.now() - 290000).toISOString() },
    ],
  },
  {
    id: "sess-002",
    name: "agent:main:subagent:a1379f4c",
    channel: "internal",
    lastActive: new Date(Date.now() - 60000).toISOString(),
    status: "active",
    messages: [
      { role: "system", content: "Subagent spawned for dashboard build task", timestamp: new Date(Date.now() - 60000).toISOString() },
    ],
  },
  {
    id: "sess-003",
    name: "discord-bot",
    channel: "discord",
    lastActive: new Date(Date.now() - 3600000).toISOString(),
    status: "idle",
    messages: [],
  },
];

export const mockActivity = [
  { id: 1, type: "session", message: "New session started: agent:main", time: "2 min ago", icon: "🚀" },
  { id: 2, type: "tool", message: "Tool executed: exec (shell command)", time: "5 min ago", icon: "⚡" },
  { id: 3, type: "message", message: "Message received on webchat channel", time: "8 min ago", icon: "💬" },
  { id: 4, type: "system", message: "Gateway heartbeat OK", time: "12 min ago", icon: "💚" },
  { id: 5, type: "tool", message: "Tool executed: read (file access)", time: "15 min ago", icon: "📄" },
  { id: 6, type: "session", message: "Subagent spawned: skill-creator", time: "20 min ago", icon: "🤖" },
  { id: 7, type: "system", message: "Gateway started on port 18789", time: "1 hr ago", icon: "🛸" },
];
