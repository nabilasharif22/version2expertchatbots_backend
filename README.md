
# Scientist Debate — Backend

Two-agent AI debate backend with:
- **OpenAI (Agent A)** and **Anthropic (Agent B)**
- **CrossRef validation** (error if scientist has no published works)
- **SSE streaming**: real-time message events
- **Visualization protocol** for model-requested charts
- **SQLite + Prisma** persistence (debates, messages, visualizations)
- **Secure key handling** via environment variables

## Quick Start

```bash
cd backend
npm install

# Setup environment
cp .env.example .env
# Fill in OPENAI_API_KEY, ANTHROPIC_API_KEY, and set CORS_ORIGIN to your frontend origin

# Setup database
npx prisma generate
npx prisma migrate dev --name init

# Run server
npm run dev
# -> http://localhost:5050
```

## API

### Start Streaming Debate (SSE)
**GET** `/api/debate/stream?topic=...&a=...&b=...&turns=8&first=A`

Events:
- `info` — status notes (includes the debate session id)
- `message` — `{ speaker, model, text, turn }`
- `visualization` — chart payload requested by agent
- `error` — `{ message }`
- `done` — `{ totalTurns }`

### Read Endpoints
- **GET** `/api/debate` — list recent debates
- **GET** `/api/debate/:id` — one debate with messages + visualizations

## Disclosures (Show in UI + included in system prompts)

> **Simulation Disclosure**  
> “This is a simulated debate between AI-generated personas inspired by public information. These are not the real individuals. Do not attribute quotes to them. Content may be inaccurate or incomplete.”

**Academic integrity & safety**
- Don’t present generated text as quotes/statements by real people.
- Verify any scientific claims with primary sources.
- Respect provider ToS and rate limits.

## Visualization Protocol (Agent Instructions)

Agents can request a chart by appending a fenced block at the end of a message:

```viz
{
  "type": "chart",
  "chart": "line" | "bar" | "scatter",
  "title": "Short title",
  "labels": ["1","2","3"],
  "series": [
    { "label": "Model A", "data": [0.6,0.7,0.8], "color": "#7c9cff" }
  ]
}
```

The backend extracts, validates, and emits a `visualization` SSE event. A short system summary is added so the counterpart can respond to the chart.

## Keys & Config

- `OPENAI_API_KEY` — Agent A
- `ANTHROPIC_API_KEY` — Agent B
- `OPENAI_MODEL` (optional), default: `gpt-4.1-mini`
- `ANTHROPIC_MODEL` (optional), default: `claude-3-5-sonnet-latest`
- `CORS_ORIGIN` — e.g., `http://localhost:5173`
- `DATABASE_URL` — `file:./prisma/dev.db`

## Notes

- SQLite is perfect for local dev. For production/serverless, switch `datasource` to Postgres in `prisma/schema.prisma`, update `DATABASE_URL`, and run `prisma migrate dev`.
