# @resume-platform/shared-types

Central Zod schemas shared across the API, web UI, and future tooling. The initial focus is the resume document, which defines the shape of the JSON stored in Postgres and rendered by the Next.js client.

## Usage

Import from the module inside either the API or the web app:

```ts
import { resumeSchema, type ResumeDocument } from '@resume-platform/shared-types';
```

The schema is flexible enough for the seed data in `infra/postgres/init.sql` but also supports richer resumes that include skills, education, and project sections.
