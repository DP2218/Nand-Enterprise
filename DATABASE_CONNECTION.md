# DATABASE_CONNECTION.md — NAND Enterprise Portal
# Supabase Connection Guide

---

## 1. Create a Supabase Project

1. Go to [https://supabase.com](https://supabase.com) and sign in (or create a free account).
2. Click **New Project**.
3. Fill in:
   - **Project name**: `nand-enterprise` (or any name)
   - **Database password**: Save this securely — you'll need it if using the CLI.
   - **Region**: Choose the closest to your users.
4. Click **Create new project** and wait ~1 minute for it to provision.

### Locate Your Keys

In the Supabase dashboard, go to **Settings → API**:

| Key | Where to find it |
|-----|-----------------|
| **Project URL** | `https://xxxxxxxxxxxx.supabase.co` — shown at the top of the API settings page |
| **`anon` (public) key** | Listed under **Project API keys → anon public** |
| **`service_role` secret key** | Listed under **Project API keys → service_role** — click the eye icon to reveal |

---

## 2. Run the Database Schema

### Option A — Supabase SQL Editor (Recommended for beginners)

1. In the Supabase dashboard, click **SQL Editor** in the left sidebar.
2. Click **New query**.
3. Open `supabase/schema.sql` from this project and **paste the entire contents**.
4. Click **Run** (or press `Ctrl+Enter`).
5. You should see "Success. No rows returned" — the schema was applied.

### Option B — Supabase CLI

```bash
# Install the CLI
npm install -g supabase

# Login
supabase login

# Link to your project (use your project ref from the dashboard URL)
supabase link --project-ref your-project-ref

# Push the schema
supabase db push < supabase/schema.sql
```

### Option C — psql direct connection

Use the connection string from **Settings → Database → Connection string**:

```bash
psql "postgresql://postgres:YOUR_DB_PASSWORD@db.xxxx.supabase.co:5432/postgres" -f supabase/schema.sql
```

---

## 3. Seed Demo Users (Required!)

The `schema.sql` inserts employee and admin rows, but uses **placeholder bcrypt hashes** for passwords (they won't work). You must run the seed script to set real hashes:

```bash
node supabase/seed.js
```

This will update all users with proper bcrypt hashes for their demo passwords.

**Prerequisites**: Make sure `.env.local` is set up first (see Section 4).

---

## 4. Environment Variables (`.env.local`)

Create a file named `.env.local` in the **project root** (it is gitignored):

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
JWT_SECRET=my-very-long-and-random-secret-string-minimum-32-characters
```

> [!CAUTION]
> **`SUPABASE_SERVICE_ROLE_KEY` and `JWT_SECRET` must NEVER be prefixed with `NEXT_PUBLIC_`**.
> The `NEXT_PUBLIC_` prefix exposes variables to the browser bundle. These two variables are
> server-only secrets and must remain server-side only.

### Variable Reference

| Variable | Prefix | Used In | Notes |
|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `NEXT_PUBLIC_` | Server + Browser | Safe to expose; it's your project's public URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `NEXT_PUBLIC_` | Browser client | Safe to expose; RLS protects your data |
| `SUPABASE_SERVICE_ROLE_KEY` | *(none)* | **Server only** (`lib/supabase/server.ts`) | Bypasses RLS — NEVER expose to client |
| `JWT_SECRET` | *(none)* | **Server only** (`lib/auth/jwt.ts`) | Signs session cookies — NEVER expose |

---

## 5. How the Two Supabase Clients Differ

### `lib/supabase/server.ts` — Service Role Client

```typescript
// Used ONLY in app/api/** route handlers
createClient(url, SUPABASE_SERVICE_ROLE_KEY)
```

- **Bypasses all Row Level Security (RLS) policies.**
- Can read and write any data in any table.
- Should **never** be imported in Client Components or pages.
- Used for all CRUD operations initiated by authenticated users (validated via JWT middleware).

### `lib/supabase/client.ts` — Anon Browser Client

```typescript
// Usable in Client Components
createClient(url, NEXT_PUBLIC_SUPABASE_ANON_KEY)
```

- **Respects Row Level Security.**
- In this app, the anon client is mostly unused directly — all data access goes through Next.js API routes (which use the service-role client server-side).
- Available if you want to add real-time subscriptions or public reads in the future.

---

## 6. Verify the Connection

1. Set up `.env.local` and run the schema + seed script.
2. Start the development server:
   ```bash
   npm run dev
   ```
3. Open [http://localhost:3000](http://localhost:3000) — you should be redirected to `/login`.
4. Log in as admin: `ADMIN001` / `admin123`.
5. Navigate to **Employees** — if the list loads, your DB connection is working.
6. Or test the API directly:
   ```bash
   # First log in to get the cookie, then:
   curl http://localhost:3000/api/employees -H "Cookie: nand_session=YOUR_JWT"
   ```

---

## 7. Demo Credentials

> [!WARNING]
> Change all passwords before deploying to production!

| Role | Username | Password | Notes |
|------|---------|---------|-------|
| Admin | `ADMIN001` | `admin123` | Full access |
| Employee | `NAND0001` | `9876543210` | Must change password on first login |
| Employee | `NAND0002` | `9876543211` | Salary: ₹700/day |
| Employee | `NAND0003` | `9876543212` | Salary: ₹900/day, PF enabled |
| Employee | `NAND0004` | `9876543213` | Salary: ₹600/day |
| Employee | `NAND0005` | `9876543214` | Salary: ₹1000/day, PF enabled |

Employees' default passwords are their phone numbers (seeded in `schema.sql`). The `must_change_pw` flag is set to `true` for all employees, forcing them to change their password on first login.

---

## 8. Common Errors & Fixes

### `Invalid API key`

**Symptom**: Supabase returns 401 or "Invalid API key" error.

**Fix**:
- Double-check `.env.local` — ensure keys have no extra spaces or quotes.
- Verify the key is the correct type (`anon` vs `service_role`).
- Restart the dev server after editing `.env.local`.

### RLS Blocking a Query

**Symptom**: API returns data = null or empty array even though data exists.

**Fix**:
- In your API route, you should be using `supabaseServer` (service role) — not the browser client.
- Check that `lib/supabase/server.ts` is imported, not `lib/supabase/client.ts`.
- As a test, you can temporarily disable RLS in the Supabase dashboard for that table.

### Missing `.env.local`

**Symptom**: `Error: Missing env: NEXT_PUBLIC_SUPABASE_URL` thrown on startup.

**Fix**:
- Create `.env.local` at the project root (same level as `package.json`).
- Copy values from `.env.example` and fill in your real keys.
- Restart `npm run dev`.

### Seed Script Fails

**Symptom**: `node supabase/seed.js` throws an error about the users table.

**Fix**:
- Ensure `schema.sql` was run first and the `users` table exists.
- Ensure `.env.local` has the correct `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`.

### `Error: Missing env: JWT_SECRET`

**Symptom**: Server crashes with this error.

**Fix**:
- Add `JWT_SECRET=your-long-random-string` to `.env.local`.
- The secret must be at least 32 characters long. Generate one with:
  ```bash
  node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
  ```

---

*Generated by Antigravity for NAND Enterprise Portal v1.0*
