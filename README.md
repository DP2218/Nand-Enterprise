# NAND Enterprise — Employee Attendance, Salary & Advance Management Portal

A production-ready web application built with **Next.js 14**, **Supabase (PostgreSQL)**, **custom JWT auth**, and **Tailwind CSS**.

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Supabase

See **[DATABASE_CONNECTION.md](./DATABASE_CONNECTION.md)** for the full guide.

**TL;DR**:
1. Create a free Supabase project at [supabase.com](https://supabase.com)
2. Run `supabase/schema.sql` in the SQL Editor
3. Create `.env.local` with your keys:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
   SUPABASE_SERVICE_ROLE_KEY=eyJ...
   JWT_SECRET=your-32-char-minimum-secret
   ```
4. Run the seed script: `node supabase/seed.js`

### 3. Start the Dev Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Demo Credentials

| Role | Username | Password |
|------|---------|---------|
| Admin | `ADMIN001` | `admin123` |
| Employee | `NAND0001` | `9876543210` |

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend + Backend | Next.js 14 (App Router, TypeScript) |
| Database | Supabase (PostgreSQL) |
| Auth | Custom JWT (bcryptjs + jsonwebtoken) |
| Styling | Tailwind CSS |
| Icons | lucide-react |
| Charts | Recharts |
| Excel Export | ExcelJS |
| Forms | react-hook-form + Zod |

## Features

- 🔐 **Custom JWT Auth** — Employee Number login, bcrypt passwords, httpOnly cookie sessions
- 👥 **Employee Management** — Auto-generated NAND0001+ numbers, CRUD, deactivation
- 📅 **Attendance** — Mark/edit daily attendance, monthly reports
- 🏖️ **Leave Requests** — Employee submission, admin approve/reject with remarks
- 💰 **Salary** — Per-day salary settings, monthly generation with PF + advance deduction
- 📈 **Advances** — Record advances, automatic deduction during salary generation
- 📊 **Reports** — Excel export (attendance/salary/advances) via ExcelJS
- 📱 **Responsive** — Mobile-first with collapsible sidebar drawer

## Project Structure

```
nand-enterprise/
├── app/                    # Next.js App Router
│   ├── (admin)/           # Admin-only pages
│   ├── (employee)/        # Employee-only pages
│   ├── api/               # API route handlers
│   └── login/             # Login page
├── components/
│   ├── charts/            # Recharts wrappers
│   ├── layout/            # Sidebar, Navbar, AppShell
│   └── ui/                # Modal, Button, Input, etc.
├── context/               # React auth context
├── lib/
│   ├── auth/              # JWT, bcrypt, session helpers
│   ├── supabase/          # Server and browser clients
│   ├── utils/             # Employee number gen, salary calc, Excel
│   └── validations/       # Zod schemas
├── middleware.ts           # Route protection
└── supabase/
    ├── schema.sql          # Full DB schema + RLS + seed
    └── seed.js             # Bcrypt hash seeder
```
