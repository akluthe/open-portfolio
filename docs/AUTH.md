# Authentication

Admin routes (`/admin/**`) and the API's write endpoints are protected by
[Clerk](https://clerk.com) with GitHub OAuth. Public resume views (`/r/[slug]`,
`/t/[slug]`) and read endpoints are open.

- **Web** (`apps/web`) — `clerkMiddleware` guards `/admin/**`; `lib/admin-auth.ts`
  gates access to the GitHub usernames in `ALLOWED_ADMIN_GITHUB_USERNAMES`
  (empty = any signed-in user).
- **API** (`apps/api-resume`) — validates Clerk-issued JWTs via JWKS. If the
  Clerk env vars are absent the API still boots, but `[Authorize]` endpoints
  reject all callers.

## 1. Create the Clerk application

1. Sign up at <https://clerk.com> and create an application (framework: Next.js).
2. Under **User & Authentication → Social Connections**, enable **GitHub**.
   Clerk will walk you through creating a GitHub OAuth App
   (<https://github.com/settings/developers>):
   - **Homepage URL**: `http://localhost:3000` (dev) / `https://yourdomain` (prod)
   - **Authorization callback URL**: Clerk shows the exact value to paste.
3. From **API Keys**, copy the **Publishable Key** (`pk_…`), **Secret Key**
   (`sk_…`), and your **Instance ID** (used by the API to build the JWKS URL).

## 2. Configure environment variables

### Web — `apps/web/.env.local` (local dev)

```bash
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_xxxxx
CLERK_SECRET_KEY=sk_test_xxxxx
ALLOWED_ADMIN_GITHUB_USERNAMES=your-github-username
RESUME_API=http://localhost:5152
FEATURE_ADMIN_EDITING=true
```

> `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` is inlined into the client bundle **at
> build time**. In Docker it is passed as a build arg — see [DEPLOY.md](DEPLOY.md).

### API — `apps/api-resume/appsettings.Development.json` or env vars

```json
{
  "CLERK_PUBLISHABLE_KEY": "pk_test_xxxxx",
  "CLERK_SECRET_KEY": "sk_test_xxxxx",
  "CLERK_INSTANCE_ID": "your-instance-id"
}
```

## 3. Verify

```bash
make dev
open http://localhost:3000/login   # Clerk sign-in with "Continue with GitHub"
```

After signing in you land on `/admin/main`. If your GitHub username isn't in
`ALLOWED_ADMIN_GITHUB_USERNAMES`, you'll see an access-denied response.

## Troubleshooting

| Symptom | Fix |
|---|---|
| "Invalid publishable key format" | Copy the full `pk_…` key, no stray spaces. |
| `401` from the API | Same Clerk keys must be set on **both** web and API; confirm you're signed in. |
| GitHub option missing on sign-in | Enable GitHub in Clerk → Social Connections; check the OAuth callback URL. |
| Access denied after login | Username must match `ALLOWED_ADMIN_GITHUB_USERNAMES` exactly (case-sensitive); restart web after changing it. |

## Production notes

- Use `pk_live_` / `sk_live_` keys and add your production domain to both the
  GitHub OAuth App and Clerk's allowed origins.
- Never commit keys. For the self-hosted stack they live in `infra/compose/.env`
  (gitignored). See [DEPLOY.md](DEPLOY.md).
