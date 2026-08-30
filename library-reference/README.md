# Hussayni Library — Reference Code

Illustrative starting-point code for the phased roadmap at
`C:\Users\Manaf\.claude\plans\memoized-jumping-owl.md`. This is **not** production code and not
wired into the Hussayni Editor build — it's a reference to come back to when the Library build
actually starts, showing one reasonable shape for each phase's hardest parts.

When the Library work begins for real, this folder's contents should move into their own
separate repo (per the roadmap's architecture decision: two codebases, one product, linked by
navigation) — this folder just keeps the sketch next to the plan in the meantime.

## Layout

- `docker-compose.yml` — Phase 0: Postgres + FastAPI + Next.js + Meilisearch skeleton.
- `backend/app/models.py` — Phase 1: user/role, poem/writer/reciter, ownership, visibility, and
  audit-history schema in one pass (the schema decision the roadmap flags as highest-leverage).
- `backend/app/auth.py` — Phase 1: self-rolled JWT auth + role-based access control (the
  recommended alternative to Authentik).
- `backend/app/search.py` — Phase 4: Arabic text normalization for search/duplicate-detection,
  and a duplicate-check query that is structurally incapable of matching Private drafts.
- `backend/app/routers/poems.py` — Phase 2-4: CRUD + the publish workflow's visibility/duplicate
  gate as an explicit state transition, not scattered conditionals.
- `backend/app/routers/moderation.py` — Phase 5: claim approval and duplicate-merge sketch,
  preserving history rather than deleting the losing record.
- `frontend/` — Phase 2/3/6: Next.js public poem page (SSR) and a protected "My Drafts" page shape.
- `editor-integration/AppIconSwitcher.tsx` — Phase 7: the two integration points kept separate —
  a plain navigation link (ships early) vs. the publish handoff (needs the Library API to exist).

Every file has a short header comment tying it back to its roadmap phase and calling out what's
simplified/omitted for reference purposes (error handling, migrations, pagination, etc.).
