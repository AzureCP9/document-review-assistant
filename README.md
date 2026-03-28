# Document Review Assistant

## Demo

Walkthrough: [https://www.loom.com/share/678f13c85e4b422eb059942f98e7a9ea](https://www.loom.com/share/678f13c85e4b422eb059942f98e7a9ea)

This project extends the baseline legal document Q&A app into a multi-document review workflow for commercial real estate due diligence. Conversations can now contain multiple documents, answers can cite and group sources across those documents, and the document viewer supports faster verification through direct citation navigation and improved in-document search.

Part 2 rationale: see [DECISIONS.md](DECISIONS.md).

## Setup

### Prerequisites

- Docker and Docker Compose
- just (command runner) — install via `brew install just` or `cargo install just`

That's it. Everything else runs inside containers.

### Getting Started

1. Clone this repository

2. Run the setup command:

```
just setup
```

This copies `.env.example` to `.env` and builds the Docker images.

3. Add your Anthropic API key to `.env`:

```
ANTHROPIC_API_KEY=your_key_here
```

4. Start everything:

```
just dev
```

This starts PostgreSQL, the FastAPI backend (port 8000), and the React frontend (port 5173).
Database migrations run automatically when the backend starts — no separate step needed.

5. Open http://localhost:5173 in your browser.

Your local `backend/src/` and `frontend/src/` directories are mounted into the containers —
edit files normally on your machine and changes hot-reload automatically.

### Sample Documents

We've included sample legal documents in `sample-docs/` for testing.

### Project Structure

- `frontend/` — React frontend (Vite + Tailwind + shadcn/Radix UI)
- `backend/` — FastAPI backend (Python 3.12 + SQLAlchemy + PydanticAI)
- `alembic/` — Database migrations
- `data/` — Product analytics and customer feedback (for Part 2)
- `sample-docs/` — Sample PDF documents for testing

### Useful Commands

- `just dev` — Start full stack (Postgres + backend + frontend)
- `just stop` — Stop all services
- `just reset` — Stop everything and clear database
- `just check` — Run all linters and type checks
- `just fmt` — Format all code
- `just db-init` — Run database migrations
- `just db-shell` — Open a psql shell
- `just shell-backend` — Shell into backend container
- `just logs-backend` — Tail backend logs
