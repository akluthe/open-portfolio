# Clerk Authentication Setup Guide

This guide will help you set up Clerk with GitHub OAuth for your resume platform.

## Why Clerk?

- ✅ **Free tier**: 10,000 monthly active users
- ✅ **Built-in GitHub OAuth** - one-click setup
- ✅ **Excellent Next.js integration**
- ✅ **Automatic JWT token management**
- ✅ **Easy admin access control**

## Step 1: Create Clerk Account

1. Go to https://clerk.com
2. Sign up for a free account
3. Create a new application
4. Choose "Next.js" as your framework

## Step 2: Configure GitHub OAuth

1. In your Clerk dashboard, go to **User & Authentication** → **Social Connections**
2. Click **GitHub** to enable it
3. You'll need to create a GitHub OAuth App:
   - Go to https://github.com/settings/developers
   - Click **New OAuth App**
   - **Application name**: Your app name
   - **Homepage URL**: `http://localhost:3000` (for dev) or your production URL
   - **Authorization callback URL**: 
     - Dev: `http://localhost:3000/api/auth/callback/github`
     - Production: `https://yourdomain.com/api/auth/callback/github`
   - Click **Register application**
   - Copy the **Client ID** and generate a **Client Secret**
4. Back in Clerk, paste your GitHub **Client ID** and **Client Secret**
5. Save the configuration

## Step 3: Get Your Clerk Keys

In your Clerk dashboard:

1. Go to **API Keys**
2. Copy the following:
   - **Publishable Key** (starts with `pk_test_` or `pk_live_`)
   - **Secret Key** (starts with `sk_test_` or `sk_live_`)
   - **Instance ID** (used to validate JWT issuer and JWKS URL)

## Step 4: Configure Environment Variables

### Next.js (apps/web/.env.local)

```bash
# Clerk Configuration
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_xxxxx
CLERK_SECRET_KEY=sk_test_xxxxx

# Restrict admin access to specific GitHub usernames (comma-separated)
ALLOWED_ADMIN_GITHUB_USERNAMES=your-github-username,another-admin

# Resume API endpoint
RESUME_API=http://localhost:5152
FEATURE_ADMIN_EDITING=true
```

### .NET API (apps/api-resume/appsettings.Development.json)

```json
{
  "CLERK_PUBLISHABLE_KEY": "pk_test_xxxxx",
  "CLERK_SECRET_KEY": "sk_test_xxxxx",
  "CLERK_INSTANCE_ID": "your-instance-id"
}
```

Or set as environment variables:
```bash
export CLERK_PUBLISHABLE_KEY=pk_test_xxxxx
export CLERK_SECRET_KEY=sk_test_xxxxx
export CLERK_INSTANCE_ID=your-instance-id
```

## Step 5: Test the Integration

1. **Start your services:**
   ```bash
   make up    # Start Postgres
   make api   # Start .NET API
   make web   # Start Next.js
   ```

2. **Navigate to login:**
   - Go to http://localhost:3000/login
   - You should see Clerk's sign-in page with GitHub option

3. **Sign in with GitHub:**
   - Click "Continue with GitHub"
   - Authorize the application
   - You should be redirected to `/admin/main`

4. **Verify admin access:**
   - If your GitHub username is in `ALLOWED_ADMIN_GITHUB_USERNAMES`, you'll see the admin panel
   - If not, you'll see an "Access Denied" message

## Step 6: Configure Admin Access

To restrict admin access to specific GitHub users:

1. Add your GitHub username(s) to `ALLOWED_ADMIN_GITHUB_USERNAMES` in `.env.local`:
   ```bash
   ALLOWED_ADMIN_GITHUB_USERNAMES=your-github-username,friend-github-username
   ```

2. Restart your Next.js server

3. Only users with those GitHub usernames will be able to access admin routes

## Troubleshooting

### "Invalid CLERK_PUBLISHABLE_KEY format"
- Make sure you copied the full key starting with `pk_test_` or `pk_live_`
- Check that there are no extra spaces

### "Unauthorized" when calling API
- Make sure `CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY` are set in both services
- Verify the keys match between Next.js and .NET API
- Check that you're signed in (token should be automatically included)

### GitHub OAuth not showing
- Verify GitHub OAuth is enabled in Clerk dashboard
- Check that your GitHub OAuth app callback URL matches your app URL
- Make sure `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` is set (the `NEXT_PUBLIC_` prefix is required)

### Access Denied even after login
- Check that your GitHub username is in `ALLOWED_ADMIN_GITHUB_USERNAMES`
- Verify the username matches exactly (case-sensitive)
- Restart the Next.js server after changing the env variable

## Production Deployment

1. **Update Clerk keys:**
   - Use production keys (`pk_live_` and `sk_live_`) in production
   - Never commit keys to git - use environment variables

2. **Update GitHub OAuth callback:**
   - Add your production URL to GitHub OAuth app
   - Update Clerk's allowed redirect URLs

3. **Set environment variables:**
   - Use your hosting platform's environment variable settings
   - Set both `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY`

## Cost

- **Free tier**: 10,000 monthly active users
- **Pro tier**: $25/month for 10,000+ MAU
- Perfect for personal/small projects!

## Next Steps

- Customize the Clerk sign-in UI in the Clerk dashboard
- Add more social providers (Google, Microsoft, etc.)
- Set up user roles and permissions in Clerk
- Configure session management and token expiration
