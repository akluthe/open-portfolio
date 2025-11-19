# Testing Authentication

No cloud services needed! This uses local JWT authentication.

## Quick Setup

### 1. Set Environment Variables

**For Next.js (apps/web):**

Create `apps/web/.env.local`:
```bash
# JWT Secret - MUST match the .NET API secret
JWT_SECRET=dev-secret-key-12345
# Or use AUTH_SECRET
# AUTH_SECRET=dev-secret-key-12345

# Admin login credentials
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin123

# Resume API endpoint
RESUME_API=http://localhost:5152
```

**For .NET API (apps/api-resume):**

Update `apps/api-resume/appsettings.Development.json`:
```json
{
  "JWT_SECRET": "dev-secret-key-12345",
  "AUTH_SECRET": "dev-secret-key-12345"
}
```

**Important:** The JWT secret must be the same in both services!

### 2. Start Services

**Terminal 1 - Start Postgres:**
```bash
make up
```

**Terminal 2 - Start .NET API:**
```bash
make api
# Or: dotnet watch run --project apps/api-resume/api-resume.csproj
```

**Terminal 3 - Start Next.js:**
```bash
make web
# Or: npm run dev --prefix apps/web
```

### 3. Test Authentication

1. **Open the login page:**
   - Navigate to: http://localhost:3000/login
   - Or try to access: http://localhost:3000/admin/main (will redirect to login)

2. **Login:**
   - Username: `admin` (or your ADMIN_USERNAME)
   - Password: `admin123` (or your ADMIN_PASSWORD)

3. **Test protected routes:**
   - After login, you should be able to access `/admin/main`
   - Try editing a resume - the PUT request should work

4. **Test API directly (optional):**
   ```bash
   # First, get a token by logging in via the web UI
   # Then extract the token from browser cookies (DevTools > Application > Cookies)
   # Or use curl to login:
   curl -X POST http://localhost:3000/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"username":"admin","password":"admin123"}' \
     -c cookies.txt
   
   # Use the token to call the API:
   curl -X PUT http://localhost:5152/resumes/main \
     -H "Authorization: Bearer YOUR_TOKEN_HERE" \
     -H "Content-Type: application/json" \
     -d '{"basics":{"name":"Test","title":"Developer"},"experience":[]}'
   ```

## Troubleshooting

**"Authentication not configured" error:**
- Make sure `ADMIN_PASSWORD` is set in your `.env.local`

**"Unauthorized" when calling API:**
- Make sure `JWT_SECRET` or `AUTH_SECRET` matches in both services
- Check that the token hasn't expired (24 hours)

**Token validation fails:**
- Ensure both services are using the exact same secret
- Check that the token is being passed in the `Authorization: Bearer <token>` header

## Production Notes

For production:
1. Generate a secure random secret: `openssl rand -base64 32`
2. Use environment variables, not config files
3. Use proper password hashing (bcrypt, argon2, etc.)
4. Set `secure: true` for cookies in production
5. Consider adding token refresh logic

