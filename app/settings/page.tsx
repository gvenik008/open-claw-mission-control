"use client";

import { useEffect, useState } from "react";
import { Save, Check, Moon, Sun, Monitor } from "lucide-react";
import { getSettings, saveSettings } from "@/lib/api";
import clsx from "clsx";

export default function SettingsPage() {
  const [gatewayUrl, setGatewayUrl] = useState("http://127.0.0.1:18789");
  const [token, setToken] = useState("");
  const [saved, setSaved] = useState(false);
  const [theme, setTheme] = useState<"dark" | "light" | "system">("dark");

  useEffect(() => {
    const s = getSettings();
    setGatewayUrl(s.gatewayUrl);
    setToken(s.token);
    const savedTheme = localStorage.getItem("mc-theme") || "dark";
    setTheme(savedTheme as any);
  }, []);

  const handleSave = () => {
    saveSettings({ gatewayUrl, token });
    localStorage.setItem("mc-theme", theme);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const themes = [
    { value: "dark", label: "Dark", icon: Moon },
    { value: "light", label: "Light", icon: Sun },
    { value: "system", label: "System", icon: Monitor },
  ] as const;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold text-[#f5f5f5] tracking-tight">Settings</h1>
        <p className="text-sm text-[#555555] mt-0.5">Configure Mission Control</p>
      </div>

      {/* Gateway Config */}
      <div className="bg-[#111111] border border-[#222222] rounded-md overflow-hidden">
        <div className="px-5 py-3.5 border-b border-[#222222]">
          <h2 className="text-[13px] font-medium text-[#f5f5f5]">Gateway connection</h2>
          <p className="text-[11px] text-[#555555] mt-0.5">Configure the OpenClaw gateway endpoint</p>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <label className="text-[10px] text-[#555555] uppercase tracking-wider font-medium block mb-1.5">
              Gateway URL
            </label>
            <input
              type="text"
              value={gatewayUrl}
              onChange={(e) => setGatewayUrl(e.target.value)}
              className="w-full px-3 py-2 bg-[#0a0a0a] border border-[#222222] rounded-md text-[13px] text-[#f5f5f5] placeholder-[#444444] focus:outline-none focus:border-[#5e6ad2] transition-colors duration-150 font-mono"
              placeholder="http://127.0.0.1:18789"
            />
            <p className="text-[11px] text-[#444444] mt-1.5">
              Base URL for the OpenClaw gateway REST API
            </p>
          </div>

          <div>
            <label className="text-[10px] text-[#555555] uppercase tracking-wider font-medium block mb-1.5">
              Authorization token
            </label>
            <input
              type="password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              className="w-full px-3 py-2 bg-[#0a0a0a] border border-[#222222] rounded-md text-[13px] text-[#f5f5f5] placeholder-[#444444] focus:outline-none focus:border-[#5e6ad2] transition-colors duration-150 font-mono"
              placeholder="Bearer token"
            />
            <p className="text-[11px] text-[#444444] mt-1.5">
              Used in the Authorization: Bearer header for API requests
            </p>
          </div>
        </div>
      </div>

      {/* Appearance */}
      <div className="bg-[#111111] border border-[#222222] rounded-md overflow-hidden">
        <div className="px-5 py-3.5 border-b border-[#222222]">
          <h2 className="text-[13px] font-medium text-[#f5f5f5]">Appearance</h2>
          <p className="text-[11px] text-[#555555] mt-0.5">Customize the interface theme</p>
        </div>

        <div className="p-5">
          <label className="text-[10px] text-[#555555] uppercase tracking-wider font-medium block mb-3">
            Theme
          </label>
          <div className="grid grid-cols-3 gap-2">
            {themes.map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                onClick={() => setTheme(value)}
                className={clsx(
                  "flex flex-col items-center gap-2 py-3 rounded-md border text-[13px] transition-colors duration-150",
                  theme === value
                    ? "bg-[#1a1a1a] border-[#5e6ad2] text-[#f5f5f5]"
                    : "border-[#222222] text-[#555555] hover:border-[#2a2a2a] hover:text-[#888888]"
                )}
              >
                <Icon className="w-4 h-4" />
                <span className="text-[11px]">{label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Save button */}
      <button
        onClick={handleSave}
        className={clsx(
          "flex items-center justify-center gap-2 w-full py-2.5 rounded-md text-[13px] font-medium transition-colors duration-150",
          saved
            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
            : "bg-[#5e6ad2] text-white hover:bg-[#6c78e0]"
        )}
      >
        {saved ? (
          <>
            <Check className="w-4 h-4" />
            Saved
          </>
        ) : (
          <>
            <Save className="w-4 h-4" />
            Save settings
          </>
        )}
      </button>

      {/* About */}
      <div className="bg-[#111111] border border-[#222222] rounded-md overflow-hidden">
        <div className="px-5 py-3.5 border-b border-[#222222]">
          <h2 className="text-[13px] font-medium text-[#f5f5f5]">About</h2>
        </div>
        <div className="p-5 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-[#555555]">Mission Control</span>
            <span className="text-[11px] text-[#888888] font-mono">v0.1.0</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-[#555555]">Next.js</span>
            <span className="text-[11px] text-[#888888] font-mono">14.x</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-[#555555]">OpenClaw Gateway</span>
            <span className="text-[11px] text-[#888888] font-mono">127.0.0.1:18789</span>
          </div>
        </div>
      </div>
    </div>
  );
}
