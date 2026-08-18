# VERCEL_DEPLOYMENT.md — NAND Enterprise Portal
# Production Deployment Guide for Vercel

This guide explains step-by-step how to deploy the **NAND Enterprise** Next.js 14 + Supabase web application to **Vercel**.

---

## 1. Push to GitHub

Ensure your project is saved and tracked in a Git repository before importing to Vercel:

1. **Initialize Git (if not already initialized)**:
   ```bash
   git init
   ```

2. **Verify `.gitignore`**:
   Ensure `.env.local`, `node_modules/`, and `.next/` are present in `.gitignore` so secrets are never pushed to GitHub.

3. **Commit and Push**:
   ```bash
   git add .
   git commit -m "Initial commit — NAND Enterprise Portal ready for Vercel"
   git branch -M main
   git remote add origin https://github.com/YOUR_GITHUB_USERNAME/nand-enterprise.git
   git push -u origin main
   ```

---

## 2. Import Project into Vercel

1. Log in to [Vercel](https://vercel.com).
2. Click **Add New…** → **Project**.
3. Under **Import Git Repository**, select your `nand-enterprise` GitHub repository and click **Import**.
4. **Framework Preset**: Vercel will automatically detect **Next.js**.
5. **Root Directory**: `./` (leave default).
6. **Build & Output Settings**: Do NOT change the defaults (`npm run build` is detected automatically).

---

## 3. Set Environment Variables in Vercel

Before clicking **Deploy**, expand the **Environment Variables** section in the Vercel project setup screen (or go to **Project Settings → Environment Variables** later).

Add the following **4 environment variables** for **Production**, **Preview**, and **Development**:

| Environment Variable | Value Example | Description |
|----------------------|---------------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://xxxx.supabase.co` | Supabase Project API URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJhbGciOi...` | Supabase Anonymous Public Key |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJhbGciOi...` | **Secret** Service Role Key (Server-only) |
| `JWT_SECRET` | `c8e7f9a1b2c3d4e5f6g7h8i9j0k1l2m3` | **Secret** JWT Signing Key (Minimum 32 chars) |

> [!CAUTION]
> - **Never** prefix `SUPABASE_SERVICE_ROLE_KEY` or `JWT_SECRET` with `NEXT_PUBLIC_`. Doing so will expose private admin keys to client browsers.
> - For production `JWT_SECRET`, generate a strong 64-character random string (do NOT use dev placeholders):
>   ```bash
>   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
>   ```

---

## 4. Supabase Database Preparation for Production

You can choose one of two database setups for deployment:

### Option A: Separate Production Supabase Project (Recommended)
For real business use, create a dedicated Supabase project (e.g. `nand-enterprise-prod`) so development testing never affects live attendance or salary records.

1. Create a new project in [Supabase](https://supabase.com).
2. Run `supabase/schema.sql` in the **SQL Editor**.
3. Run the seed script pointing to production credentials:
   ```bash
   NEXT_PUBLIC_SUPABASE_URL=https://prod.supabase.co SUPABASE_SERVICE_ROLE_KEY=prod_key node supabase/seed.js
   ```
4. Copy the production URL, Anon Key, and Service Role Key into Vercel's Environment Variables.

### Option B: Use Existing Supabase Project
If using the same database for dev and deployment, paste the existing Supabase credentials into Vercel's Environment Variables.

---

## 5. Deploy & Verify Build

1. Click **Deploy** in Vercel.
2. Vercel will clone the repo, install dependencies, run `npm run build`, and assign a production URL (e.g., `nand-enterprise.vercel.app`).
3. Once build completes, click on your deployment link. You should automatically be redirected to `/login`.

---

## 6. Post-Deployment Smoke Test Checklist

Test the live deployment end-to-end:

- [ ] **Admin Login**: Log in with `ADMIN001` / `admin123`. Verify the Admin Dashboard loads with stat cards.
- [ ] **Employee Login**: Log in with `NAND0001` / `9876543210`. Verify forced redirect to `/change-password` on first login.
- [ ] **Employee CRUD**: Create a new employee as Admin (`NAND0006`). Confirm auto-generated number and password creation.
- [ ] **Attendance**: Mark attendance for an employee and verify it appears in the grid.
- [ ] **Leave Request**: Submit a leave request as employee (`NAND0002`), approve it as Admin, and check status update.
- [ ] **Salary Generation**: Run "Generate Salary" for an employee in the Admin panel. Verify calculation of earned salary, PF, advance deduction, and final salary.
- [ ] **Excel Export**: Go to **Reports** → click "Export to Excel" → verify `.xlsx` file downloads and opens properly.
- [ ] **Session Persistence**: Refresh the page or open a new tab; verify the `nand_session` httpOnly cookie maintains login state without error.

---

## 7. Custom Domain Setup (Optional)

To connect your own domain (e.g. `portal.nandenterprise.com`):

1. Go to Vercel Dashboard → Select Project → **Settings → Domains**.
2. Type your domain name and click **Add**.
3. Update DNS records with your registrar:
   - For subdomains: Add a `CNAME` record pointing to `cname.vercel-dns.com`.
   - For apex domains: Add an `A` record pointing to `76.76.21.21`.
4. No code changes are required: all auth redirects and cookies use relative paths (`/` and `sameSite: 'lax'`).

---

## 8. Ongoing Deployments & Git Workflow

- **Production Deployments**: Every `git push` to `main` automatically triggers a production build on Vercel.
- **Preview Deployments**: Pushing to any feature branch or opening a Pull Request automatically generates a unique Vercel Preview URL.
- **Preview DB Strategy**: If multiple developers test feature branches, use a separate Supabase "staging" project for Vercel Preview environments to prevent test data from contaminating production tables.

---

## 9. Troubleshooting Common Vercel Deployment Issues

### Issue 1: Runtime 500 Error on API Routes
- **Cause**: Missing or incorrect environment variables in Vercel dashboard.
- **Fix**: Check Vercel → Project Settings → Environment Variables. Ensure `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and `JWT_SECRET` are exact. Redeploy after updating.

### Issue 2: Edge Runtime Incompatibility in Middleware
- **Cause**: Standard Node.js `crypto` or `jsonwebtoken` used inside `middleware.ts`.
- **Fix**: This project uses `jose`, a Web Crypto API library fully compatible with Vercel Edge Runtime. If modifying JWT logic in `lib/auth/jwt.ts`, ensure `jose` is retained.

### Issue 3: Supabase Queries Return Empty / Permission Denied
- **Cause**: API routes accidentally using browser `anon` client instead of server `service_role` client.
- **Fix**: Verify API handlers import `supabaseServer` from `@/lib/supabase/server`. `SUPABASE_SERVICE_ROLE_KEY` bypasses RLS for server-validated requests.

### Issue 4: Cookie Not Saved / User Instantly Logged Out
- **Cause**: Browser blocking HTTP cookie on HTTPS domain.
- **Fix**: `lib/auth/session.ts` automatically sets `secure: true` in production (`process.env.NODE_ENV === 'production'`). Ensure Vercel is serving over HTTPS (default).

---

*Generated by Antigravity for NAND Enterprise Portal v1.0*
