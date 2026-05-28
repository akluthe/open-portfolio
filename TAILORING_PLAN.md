# Implementation Plan — Resume Tailoring Layer

**Status:** Ready to build · **Owner:** Andrew Kluthe · **Drafted by:** Claude (orientation session, 2026-05-28)

> **You (the agent reading this):** This document is self-contained. You should NOT need to ask the human questions before starting. Everything you need — current architecture, the design decision, the data model, the file-by-file breakdown, and acceptance criteria — is below. Read the whole thing once, then build in the phase order given. Run the existing test suite as you go.

---

## 1. What we're building and why

This repo is a "resume CMS." Today it serves exactly **one resume per `slug`** (a full JSON document in Postgres). The product vision is a **master + tailoring** model:

- **Master** — one canonical work history (the existing `resumes` rows; e.g. slug `main`).
- **Tailoring** — named, per-application *overlays* on a master: a custom headline/summary, plus which experience entries and bullets to show/hide, and which skills to show/reorder. **No copy-paste, no divergence** — edit the master once and every tailored version reflects it (except the bits a tailor deliberately overrides).
- **Export** — each tailored version gets its own public URL and its own PDF, reusing the export pipeline that already exists.

**Concrete near-term need:** Andrew needs a `databank-engmgr` tailoring (Anheuser-Busch InBev leadership story emphasized, for a Senior Engineering Manager referral) and a `ba-contract` tailoring (SAP / business-analyst emphasis). The deadline for the Databank version is **Monday June 2, 2026**.

> **Deadline hedge (read this):** Shipping a tailored resume does NOT strictly depend on this feature — because every resume is a slug, a tailored doc can always be pushed to its own slug (e.g. `PUT /resumes/databank`) and it already gets a URL + PDF. So **build this feature properly; do not cut corners to hit Monday.** If you somehow can't finish, the human still has the slug-based fallback. Don't let the deadline pressure you into a half-built overlay model — a clean, tested overlay is the goal.

---

## 2. Current architecture (so you don't have to rediscover it)

**Monorepo.** Active branch is `init-resume-api` (≈22 commits ahead of `main`; `main` is effectively empty — do NOT expect anything there). Create your work on a branch off `init-resume-api`, e.g. `feat/resume-tailoring`.

**Data flow:**
```
Postgres (table: resumes)               infra/postgres/init.sql
   ▲  GET/PUT /resumes/{slug}
.NET 9 Minimal API                       apps/api-resume/Program.cs + ResumeDbService.cs
   ▲  server-side fetch (Clerk JWT on writes)
Next.js (App Router)                     apps/web
   • /r/[slug]            public view     apps/web/app/r/[slug]/page.tsx
   • /admin/[slug]        gated editor    apps/web/app/admin/[slug]/page.tsx
   • /api/resumes/[slug]/route.ts         PUT proxy → .NET (adds Clerk token)
   • /api/resumes/[slug]/pdf/route.ts     live PDF  (Typst → PDF, in-process WASM)
   • /api/resumes/[slug]/typst/route.ts   live .typ source
```

**Key files and what they do:**

| File | Role |
|---|---|
| `packages/shared-types/src/resume.ts` | Zod `resumeSchema` + `ResumeDocument` type. **The shared contract.** |
| `packages/shared-types/src/index.ts` | barrel — `export * from './resume'` |
| `apps/web/lib/shared-types.ts` | web-side re-export shim of `@resume-platform/shared-types` (Turbopack workaround). Web code imports from `@/lib/shared-types`, not the package directly. |
| `apps/api-resume/Program.cs` | Minimal API; Clerk JWT auth (falls back to symmetric `JWT_SECRET` if Clerk env unset); `GET /resumes/{slug}` (public), `PUT /resumes/{slug}` (`[Authorize]`). |
| `apps/api-resume/ResumeDbService.cs` | `IResumeDbService` — `GetResumeJsonBySlugAsync`, `UpsertResumeAsync`. Raw Npgsql, parameterized, returns JSON string passthrough. |
| `apps/web/lib/resume-api.ts` | `fetchResumeBySlug` (cached), `updateResumeBySlug`. Reads `RESUME_API` env. |
| `apps/web/components/resume/resume-view.tsx` | Renders a `ResumeDocument` to HTML. **Reuse as-is for tailored view.** |
| `apps/web/lib/resume-typst.ts` | `buildTypstSource(resume)` → Typst markup. **Reuse as-is.** |
| `apps/web/lib/typst-pdf.ts` | `renderTypstPdf(source)` → PDF bytes (WASM, serialized queue). **Reuse as-is.** |
| `apps/web/lib/admin-auth.ts` | `isAdmin()` via Clerk `currentUser()`; allows all authed users if `ALLOWED_ADMIN_GITHUB_USERNAMES` unset. |
| `apps/web/middleware.ts` | Clerk middleware; protects `/admin(.*)`. |
| `apps/web/app/api/resumes/[slug]/route.ts` | PUT proxy that injects the Clerk session token before calling .NET. |

**`ResumeDocument` shape** (from `resume.ts` — do not change it):
```ts
{
  basics: { name: string; title: string; summary?: string };
  summary?: string;                 // legacy/top-level summary; view prefers basics.summary ?? summary
  contact?: { email?; phone?; website?; location?; links?: {label,url}[] };
  skills: { name: string; keywords: string[] }[];
  experience: { company; role; period?; startDate?; endDate?; location?; highlights: string[] }[];
  education: { school; degree?; field?; period?; highlights: string[] }[];
  projects: { name; description?; url?; highlights: string[] }[];
  lastUpdated?: string;
}
```

**Conventions to match:**
- TS: 2-space indent, single quotes, no semicolon-free style (semicolons are used), Zod for all boundary validation. Path alias `@/*` → web root; import shared types from `@/lib/shared-types`.
- C#: file-scoped style as in `Program.cs`; raw parameterized Npgsql in a `*DbService` class behind an interface, registered via DI; return `Results.Content(json, "application/json")` for JSON passthrough; `[Authorize]` for writes.
- Tests: `vitest` in web (`*.test.ts(x)` next to source; fixtures in `lib/__fixtures__/`). Run with `npm run test --prefix apps/web`. API tests live in `apps/api-resume.tests`.
- Run everything: `make up` (Postgres) then `make dev` (API + web). API at `http://localhost:5152`, web at `:3000`. DB shell: `make db`.

---

## 3. The design decision (already made — don't relitigate)

**Overlay model, resolved in the web/TS tier.**

- A **tailoring profile** is a small JSON *overlay* stored in a new `profiles` table (mirrors `resumes`). It references a `baseSlug` (which master) and describes overrides + selections. It does **not** copy resume content.
- **Resolution happens in TypeScript** (a pure function in `shared-types`), not in C#. Rationale: the export pipeline (`buildTypstSource`, `renderTypstPdf`) and `ResumeView` already live in the web tier and operate on a `ResumeDocument`. Resolving in TS means **one resolver**, reused by the HTML view, the Typst route, and the PDF route. The .NET API stays a dumb JSON store for overlays (no duplicated resolver logic in C#).
- **Addressing is index-based** (experience entry by array index; highlights by index within the entry). This avoids a migration that would force stable IDs into existing master docs. The resolver MUST be defensive: out-of-range indices are ignored, not fatal. Document this limitation (if the master is structurally reordered, a profile's selections may need re-checking). This is acceptable for a single-user v1.

**Resolution semantics** (master + profile → `ResumeDocument`):
1. `basics.title` = `profile.headline` if set, else master's.
2. Summary: if `profile.summary` set, it replaces both `basics.summary` and top-level `summary`.
3. Experience: keep master order. For each entry at index `i`: if a profile experience-rule exists with `include: false` → drop the entry; otherwise keep it but remove highlights whose index is in that rule's `hiddenHighlights`. Entries with no rule are fully included.
4. Skills: drop skill groups whose index is in `skills.hidden`; then reorder per `skills.order` (any indices listed appear first in that order; the rest follow in original order). Tolerate stale/duplicate indices.
5. Sections: if `hiddenSections` includes `'projects'`/`'education'`/`'skills'`, output an empty array for that section.
6. The resolved object MUST pass `resumeSchema.parse(...)` before being returned, so every downstream consumer is guaranteed a valid `ResumeDocument`.

---

## 4. Data model

Add to `infra/postgres/init.sql` (after the `resumes` block). Keep the same style/casing as the existing table:

```sql
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug TEXT UNIQUE NOT NULL,
  doc JSONB NOT NULL,
  created_tsp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_mod_tsp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Example seed (safe to keep; demonstrates the overlay shape)
INSERT INTO profiles(slug, doc)
VALUES (
  'databank-engmgr',
  '{
     "name": "Databank — Senior Engineering Manager",
     "baseSlug": "main",
     "headline": "Senior Engineering Manager — Frontend Org & Platform Modernization",
     "summary": "Engineering leader who rebuilt and led the frontend org at Anheuser-Busch InBev (NAZ)…",
     "experience": [],
     "skills": { "order": [], "hidden": [] },
     "hiddenSections": []
   }'::jsonb
)
ON CONFLICT (slug) DO NOTHING;
```

> **Note on applying the migration:** `init.sql` only runs on a *fresh* Postgres volume (it's mounted to `/docker-entrypoint-initdb.d/`). For an existing local DB, either run the `CREATE TABLE`/seed manually via `make db`, or `make down` (which uses `-v` and drops the volume) then `make up`. Call this out to the human; don't silently assume a fresh DB.

---

## 5. Shared types + resolver (`packages/shared-types`)

**New file `packages/shared-types/src/tailoring.ts`:**

```ts
import { z } from 'zod';
import { resumeSchema, type ResumeDocument } from './resume';

const experienceRuleSchema = z.object({
  index: z.number().int().nonnegative(),
  include: z.boolean().default(true),
  hiddenHighlights: z.array(z.number().int().nonnegative()).default([])
});

export const tailoringProfileSchema = z.object({
  name: z.string().min(1),                 // display name, e.g. "Databank — Sr Eng Mgr"
  baseSlug: z.string().min(1).default('main'),
  headline: z.string().optional(),         // overrides basics.title
  summary: z.string().optional(),          // overrides summary
  experience: z.array(experienceRuleSchema).default([]),
  skills: z
    .object({
      order: z.array(z.number().int().nonnegative()).default([]),
      hidden: z.array(z.number().int().nonnegative()).default([])
    })
    .default({ order: [], hidden: [] }),
  hiddenSections: z.array(z.enum(['projects', 'education', 'skills'])).default([]),
  lastUpdated: z.string().optional()
});

export type TailoringProfile = z.infer<typeof tailoringProfileSchema>;

/**
 * Apply a tailoring overlay to a master resume. Pure, defensive (ignores
 * out-of-range indices), and guaranteed to return a schema-valid ResumeDocument.
 */
export function resolveTailoredResume(
  master: ResumeDocument,
  profile: TailoringProfile
): ResumeDocument {
  const ruleByIndex = new Map(profile.experience.map((r) => [r.index, r]));

  const experience = master.experience
    .map((entry, i) => ({ entry, rule: ruleByIndex.get(i) }))
    .filter(({ rule }) => rule?.include !== false)
    .map(({ entry, rule }) => {
      if (!rule || rule.hiddenHighlights.length === 0) return entry;
      const hidden = new Set(rule.hiddenHighlights);
      return { ...entry, highlights: entry.highlights.filter((_, hi) => !hidden.has(hi)) };
    });

  const hiddenSkills = new Set(profile.skills.hidden);
  const visibleSkills = master.skills
    .map((group, i) => ({ group, i }))
    .filter(({ i }) => !hiddenSkills.has(i));
  const orderRank = new Map(profile.skills.order.map((idx, rank) => [idx, rank]));
  const skills = visibleSkills
    .sort((a, b) => {
      const ra = orderRank.has(a.i) ? orderRank.get(a.i)! : Number.MAX_SAFE_INTEGER;
      const rb = orderRank.has(b.i) ? orderRank.get(b.i)! : Number.MAX_SAFE_INTEGER;
      return ra === rb ? a.i - b.i : ra - rb;
    })
    .map(({ group }) => group);

  const hide = new Set(profile.hiddenSections);
  const summary = profile.summary ?? master.basics.summary ?? master.summary;

  const resolved: ResumeDocument = {
    ...master,
    basics: {
      ...master.basics,
      title: profile.headline ?? master.basics.title,
      summary
    },
    summary,
    experience,
    skills: hide.has('skills') ? [] : skills,
    projects: hide.has('projects') ? [] : master.projects,
    education: hide.has('education') ? [] : master.education
  };

  return resumeSchema.parse(resolved);
}
```

**Update `packages/shared-types/src/index.ts`:** add `export * from './tailoring';`.

**Update `apps/web/lib/shared-types.ts`:** re-export the new symbols alongside the existing ones:
```ts
import {
  resumeSchema, type ResumeDocument, type ResumeExperience, type ResumeSkillGroup,
  tailoringProfileSchema, type TailoringProfile, resolveTailoredResume
} from '@resume-platform/shared-types';

export {
  resumeSchema, type ResumeDocument, type ResumeExperience, type ResumeSkillGroup,
  tailoringProfileSchema, type TailoringProfile, resolveTailoredResume
};
```

---

## 6. API (`apps/api-resume`) — dumb storage for overlays

**`ProfileDbService.cs`** — mirror `ResumeDbService.cs` exactly (interface + Npgsql, parameterized). Methods:
- `Task<string?> GetProfileJsonBySlugAsync(string slug)` — `SELECT doc FROM profiles WHERE slug=@slug`.
- `Task<string> ListProfilesJsonAsync()` — return a JSON array string of `{slug, name, baseSlug}`. SQL: `SELECT slug, doc->>'name' AS name, doc->>'baseSlug' AS base_slug FROM profiles ORDER BY slug`. Build the JSON array in C# (or use `json_agg`/`row_to_json` in SQL and pass it through — either is fine; SQL `json_agg` keeps the passthrough style).
- `Task UpsertProfileAsync(string slug, string json)` — same upsert pattern as resumes.
- `Task DeleteProfileAsync(string slug)` — `DELETE FROM profiles WHERE slug=@slug`.

Register in `Program.cs` DI next to `IResumeDbService`.

**Endpoints in `Program.cs`** (mirror the resume routes' style):
- `GET /profiles` → `Results.Content(await db.ListProfilesJsonAsync(), "application/json")`. Public.
- `GET /profiles/{slug}` → doc JSON or `Results.NotFound()`. Public.
- `PUT /profiles/{slug}` → `[Authorize]`. Read body, `JsonDocument.Parse`, validate it has non-empty `name` and `baseSlug` (mirror the resume PUT's required-field check), upsert, return the stored JSON.
- `DELETE /profiles/{slug}` → `[Authorize]`. Delete, return `Results.NoContent()`.

> Validation depth: the API does a light structural check (name + baseSlug present). The authoritative validation is the Zod `tailoringProfileSchema` in the web tier before PUT. Keep it that way — don't reimplement the full schema in C#.

---

## 7. Web tier

**`apps/web/lib/profile-api.ts`** (mirror `resume-api.ts`):
- `listProfiles(): Promise<{ slug: string; name: string; baseSlug: string }[]>`
- `fetchProfile(slug): Promise<TailoringProfile | null>` — 404 → null; else `tailoringProfileSchema.parse(json)`.
- `upsertProfile(slug, profile, token): Promise<TailoringProfile>` — PUT with `Authorization: Bearer`.
- `deleteProfile(slug, token): Promise<void>`.
- `fetchResolvedResume(slug): Promise<ResumeDocument | null>` — convenience: fetch the profile, then `fetchResumeBySlug(profile.baseSlug)`, then `resolveTailoredResume(...)`. Returns null if either is missing.

**Public tailored view + exports** (reuse everything):
- `apps/web/app/t/[slug]/page.tsx` — like `r/[slug]/page.tsx` but calls `fetchResolvedResume(slug)` and renders the SAME `<ResumeView>`. Download links point at the new routes below. Show an "Edit Tailoring" link when `isAdmin()`.
- `apps/web/app/api/profiles/[slug]/pdf/route.ts` — like the resume pdf route, but resolve first: `fetchResolvedResume(slug)` → `buildTypstSource` → `renderTypstPdf`.
- `apps/web/app/api/profiles/[slug]/typst/route.ts` — same, returns `.typ`.
- `apps/web/app/api/profiles/[slug]/route.ts` — PUT + DELETE proxies that inject the Clerk token (mirror `api/resumes/[slug]/route.ts`).

**Admin UI** (functional, reuse existing `admin-*` CSS classes from `globals.css` — don't invent a new design system):
- `apps/web/app/admin/tailoring/page.tsx` — list profiles (name, slug, baseSlug, links to view `/t/{slug}` and edit), plus a "New tailoring" form (name + slug + baseSlug → creates an empty overlay and redirects to its editor). Gated by `isAdmin()` like the existing admin page.
- `apps/web/app/admin/tailoring/[slug]/page.tsx` — server component: load the profile + its base master resume, pass both to a client editor.
- `apps/web/components/admin/tailoring-edit-form.tsx` — client component. Renders the master so the user can make selections:
  - Headline override (text) and Summary override (textarea) — empty = inherit master.
  - Experience: list each master entry (company · role · period). A checkbox to include/exclude the entry; under each, its highlights each with an include/exclude checkbox. State maps to the `experience` rules array (only store rules that differ from "fully included" to keep overlays small, OR store all — either is fine; prefer storing only non-default rules).
  - Skills: list master skill groups with include checkboxes; (reordering is nice-to-have — a simple up/down or numeric order input is enough; if time-constrained, ship hide-only and leave `order` as `[]`).
  - Section toggles for projects/education/skills.
  - Save → Zod-validate with `tailoringProfileSchema` → PUT `/api/profiles/{slug}` → redirect to `/t/{slug}`.
- Add a link to `/admin/tailoring` from the existing `/admin/[slug]` page header so it's discoverable.

---

## 8. Tests (do these — the resolver is the highest-value test target)

- **`packages/shared-types`**: if the package has no test runner, add resolver tests in the web app instead (it already has vitest). Create `apps/web/lib/resolve-tailored.test.ts` using the existing `sampleResume` fixture (`lib/__fixtures__/sample-resume.ts`). Cover:
  - headline + summary override applied; absent overrides inherit master.
  - excluding an experience entry drops it; hiding a highlight removes only that bullet; entries with no rule are untouched.
  - hidden skills removed; `order` reorders; stale/out-of-range indices are ignored (no throw).
  - `hiddenSections` empties the right arrays.
  - resolved output passes `resumeSchema.parse` (assert no throw).
- **Typst/PDF**: extend `resume-typst.test.ts` (or add a sibling) asserting that `buildTypstSource(resolveTailoredResume(master, profile))` reflects an override (e.g. the new headline appears, an excluded company does not).
- Run: `npm run test --prefix apps/web` and `dotnet test apps/api-resume.tests/api-resume.tests.csproj`. Don't finish red.

---

## 9. Build order (phases)

1. **Branch.** `git checkout -b feat/resume-tailoring` off `init-resume-api`.
2. **Shared types + resolver** (§5) **and its unit tests** (§8). Get the resolver green first — it's the core. `npm run test --prefix apps/web`.
3. **DB** (§4). Apply via `make db` to the running DB, or `make down && make up` for a clean volume.
4. **API** (§6): `ProfileDbService.cs`, DI registration, 4 endpoints. `dotnet build` + `dotnet test`. Smoke: `curl localhost:5152/profiles`, `curl localhost:5152/profiles/databank-engmgr`.
5. **Web data layer** (§7): `profile-api.ts` + `/api/profiles/[slug]/{route,pdf,typst}`.
6. **Public tailored view** (§7): `/t/[slug]`. Verify `/t/databank-engmgr` renders and `/api/profiles/databank-engmgr/pdf` downloads.
7. **Admin UI** (§7): list/create + editor. Verify a round-trip: create → toggle bullets → save → see changes on `/t/{slug}` and in the PDF.
8. **Tests green, typecheck clean** (`npm run typecheck --prefix apps/web`), `make test`. Update `README.md` status table and add a `docs/series/S1E07.md` episode note (the repo documents each feature as an episode — match that template in `docs/series/_template.md`).

---

## 10. Acceptance criteria (definition of done)

- [ ] `profiles` table exists; `GET /profiles` and `GET /profiles/{slug}` return JSON; `PUT`/`DELETE` require auth.
- [ ] `resolveTailoredResume` is pure, defensive, and unit-tested; output always passes `resumeSchema`.
- [ ] `/t/{slug}` renders a resolved resume using the existing `ResumeView`; admins see an edit link.
- [ ] `/api/profiles/{slug}/pdf` and `/typst` produce a tailored PDF/Typst from the same pipeline as master resumes.
- [ ] Admin can create a tailoring, toggle experience entries + individual bullets, override headline/summary, hide/reorder skills, hide sections, save, and see the result reflected on the public view AND the PDF.
- [ ] Editing the **master** (via `/admin/{baseSlug}`) is reflected in all tailors built on it (proving it's an overlay, not a copy).
- [ ] `npm run test --prefix apps/web`, `npm run typecheck --prefix apps/web`, and `dotnet test` all pass.
- [ ] README status table updated; `docs/series/S1E07.md` added.

---

## 11. Explicitly out of scope (do NOT build now)

- Stable IDs / migration for experience entries & bullets (index addressing is the v1; note the tradeoff).
- Drag-and-drop reordering UI (numeric/up-down ordering is sufficient; hide-only is an acceptable fallback).
- A C# resolver (resolution stays in TS).
- Per-bullet rewriting/AI suggestions, ATS plain-text export, analytics — future work.
- Auth model changes (keep the existing Clerk + `ALLOWED_ADMIN_GITHUB_USERNAMES` behavior).

---

## 12. Content note (for the human, not the agent)

The two interview-prep notes in the vault (`Technical Discussion Scenarios`, `On-Prem Financial Infrastructure Observability`) are **hypothetical/educational framing — NOT real accomplishments** and must not be mined for resume bullets. Real ABI content is being gathered separately. The seed row in `init.sql` ("Anheuser-Busch InBev (NAZ), Senior Software Engineer, led 5 engineers / guided >10, 2023–Present") is the only real-ish master content currently in the repo and is a placeholder to verify against, not final copy.
