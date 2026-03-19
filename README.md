# 🛸 Mission Control — OpenClaw Dashboard

A sleek, space-themed dashboard for managing your OpenClaw gateway.

## Features

- **Dashboard** — Real-time gateway status, stats cards, activity feed
- **Tool Builder** — Create/edit/delete custom tools (HTTP, Shell, JS) with parameters
- **Sessions** — View active gateway sessions and message history
- **Settings** — Configure gateway URL, auth token, and theme

## Stack

- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- Lucide React icons
- JetBrains Mono font

## Getting Started

```bash
cd mission-control
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Configuration

By default, Mission Control connects to the OpenClaw gateway at `http://127.0.0.1:18789`. You can change this in **Settings**.

If the gateway isn't available, the dashboard gracefully falls back to mock data.

## Pages

| Route | Description |
|-------|-------------|
| `/` | Dashboard with stats and activity |
| `/tools` | Custom tool builder |
| `/sessions` | Active session viewer |
| `/settings` | Gateway and theme settings |
