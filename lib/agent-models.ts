export const MODELS = [
  {
    id: "claude-opus-4-6",
    name: "Claude Opus 4",
    tier: "premium",
    description: "Best for complex reasoning, orchestration, multi-step tasks",
    costTier: "high",
  },
  {
    id: "claude-sonnet-4-6",
    name: "Claude Sonnet 4",
    tier: "standard",
    description: "Best for coding, analysis, detailed work. Great balance of quality and cost",
    costTier: "medium",
  },
  {
    id: "claude-haiku-4-5",
    name: "Claude Haiku 4.5",
    tier: "fast",
    description: "Best for simple tasks, data gathering, formatting. Very cost-efficient",
    costTier: "low",
  },
];

export const DIVISIONS = [
  "QA & Testing",
  "Development",
  "DevOps & Infrastructure",
  "Security",
  "Research & Analysis",
  "Design & UX",
  "Project Management",
  "Data",
  "Independent",
];

export function modelRecommendation(division: string): string {
  if (division === "Independent") return "claude-opus-4-6";
  return "claude-sonnet-4-6";
}

export function defaultPersonality(division: string): string {
  const map: Record<string, string> = {
    "QA & Testing":
      "Methodical, detail-oriented, and thorough. Never accepts 'it works' without evidence. Documents everything.",
    Development:
      "Clean code advocate. Pragmatic problem solver. Writes readable, maintainable code with proper tests.",
    "DevOps & Infrastructure":
      "Reliability-focused. Automates everything possible. Thinks in systems and failure modes.",
    Security:
      "Paranoid by design. Assumes everything can be broken. Precise and evidence-based in findings.",
    "Research & Analysis":
      "Curious and systematic. Follows data, not assumptions. Delivers actionable insights, not just information.",
    "Design & UX":
      "User-first thinker. Balances aesthetics with usability. Backs opinions with UX principles.",
    "Project Management":
      "Organized and clear. Tracks progress, flags risks early. Communicates status concisely.",
    Data: "Precise and analytical. Validates before concluding. Presents findings clearly with supporting evidence.",
    Independent:
      "Adaptable and resourceful. Figures things out independently. Asks for help when genuinely stuck.",
  };
  return map[division] || map["Independent"];
}
