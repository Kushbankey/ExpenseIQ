# ExpenseIQ - Personal Finance Dashboard

A modern, mobile-responsive personal finance dashboard that transforms your bank's Excel export into actionable financial insights. Upload your expense sheet and instantly see where your money goes — categorized, classified, and visualized.

**Live:** [expenseeiq.netlify.app](https://expenseeiq.netlify.app)

![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?logo=tailwindcss)
![Supabase](https://img.shields.io/badge/Supabase-Auth_&_DB-3ECF8E?logo=supabase)
[![Netlify Status](https://api.netlify.com/api/v1/badges/79fca86d-e754-4a6c-a17d-75341712cd71/deploy-status)](https://app.netlify.com/projects/expenseeiq/deploys)

## Features

### Core

-   **Excel Upload** — Drag & drop your `.xlsx` bank statement and get instant analysis
-   **Needs / Wants / Investments** — Every transaction auto-classified using the 50/30/20 rule
-   **Multi-Account Support** — Track spending across bank accounts and credit cards
-   **Data Persistence** — Your data is saved to Supabase and restored on every visit
-   **User Authentication** — Email + password auth with Row Level Security (each user sees only their data)

### Dashboard Pages

| Page             | What it shows                                                                                                                                                           |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Overview**     | Summary cards, allocation bar, spending chart, recent transactions, recurring expenses, SIP tracker                                                                     |
| **Transactions** | Searchable, filterable table of all income & expenses with card layout on mobile                                                                                        |
| **Categories**   | Donut chart, expandable category/subcategory list, monthly category trend (top 5)                                                                                       |
| **Accounts**     | Per-account spending cards, usage bar chart, credit card monthly analysis, monthly trend                                                                                |
| **Trends**       | Income vs expense bars, savings rate per month, needs/wants/investments stacked chart                                                                                   |
| **Budget**       | 50/30/20 actual vs target comparison with gap analysis cards                                                                                                            |
| **Insights**     | Top categories, largest transactions, food breakdown, transport analysis, quick commerce, split tracking, investment consistency, spending extremes, savings rate trend |

### Mobile

-   Bottom tab navigation (replaces sidebar on mobile)
-   "More" slide-up menu for additional pages
-   Card-based transaction list (replaces table on small screens)
-   All grids collapse to single column
-   Safe area support for iPhone notch/home indicator

## Tech Stack

| Layer           | Technology                                                      |
| --------------- | --------------------------------------------------------------- |
| Framework       | [Next.js 16](https://nextjs.org/) (App Router)                  |
| Language        | TypeScript 5                                                    |
| Styling         | Tailwind CSS 4                                                  |
| State           | [Zustand](https://zustand-demo.pmnd.rs/)                        |
| Charts          | [Recharts](https://recharts.org/)                               |
| Excel Parsing   | [SheetJS (xlsx)](https://sheetjs.com/)                          |
| Auth & Database | [Supabase](https://supabase.com/) (Auth + PostgreSQL + Storage) |
| Icons           | [Lucide React](https://lucide.dev/)                             |

## Getting Started

### Prerequisites

-   Node.js 18+
-   npm or pnpm
-   A [Supabase](https://supabase.com/) project (free tier works)

### 1. Clone & Install

```bash
git clone https://github.com/Kushbankey/ExpenseIQ.git
cd ExpenseIQ
npm install
```

### 2. Supabase Setup

Create a new Supabase project, then run this SQL in the **SQL Editor**:

```sql
-- Data table
CREATE TABLE user_data (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  finance_data JSONB NOT NULL,
  file_name TEXT NOT NULL,
  uploaded_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(user_id)
);

ALTER TABLE user_data ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own data" ON user_data FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own data" ON user_data FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own data" ON user_data FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own data" ON user_data FOR DELETE USING (auth.uid() = user_id);

-- Storage bucket for Excel files
INSERT INTO storage.buckets (id, name, public) VALUES ('excel-files', 'excel-files', false);

CREATE POLICY "Users upload own files" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'excel-files' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users read own files" ON storage.objects FOR SELECT
  USING (bucket_id = 'excel-files' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users delete own files" ON storage.objects FOR DELETE
  USING (bucket_id = 'excel-files' AND auth.uid()::text = (storage.foldername(name))[1]);
```

In Supabase Dashboard → **Authentication → URL Configuration**, set the redirect URL to:

```
http://localhost:3000/auth/callback
```

(Update this to your production URL after deploying.)

### 3. Environment Variables

Create `.env.local` in the project root:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

You can find these in Supabase Dashboard → **Settings → API**.

### 4. Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), sign up, upload your Excel file, and explore your dashboard.

## Excel File Format

The app expects an `.xlsx` file with these columns (case-insensitive):

| Column       | Description        | Example          |
| ------------ | ------------------ | ---------------- |
| Date         | Transaction date   | 2026-04-05       |
| Account      | Bank/card name     | HDFC Savings     |
| Category     | Spending category  | Food             |
| Sub Category | Specific type      | Groceries        |
| Type         | Transaction type   | Expense / Income |
| Amount       | Transaction amount | 5000             |
| Note         | Description        | Swiggy order     |

Transfers (Transfer-In, Transfer-Out, Income Balance) are automatically filtered out during processing.

## Classification System

Transactions are auto-classified into three buckets based on category:

| Classification  | Categories                                                                                | Color  |
| --------------- | ----------------------------------------------------------------------------------------- | ------ |
| **Needs**       | Food, Transport, Health, Household, Phone, Haircut, Education                             | Blue   |
| **Wants**       | Shopping, Social Life, Travel, Beauty, Gift, Culture, Fun & Activities, Other, Petty cash | Orange |
| **Investments** | Investment                                                                                | Green  |

Food transactions are further split: groceries and cooking gas → Needs; dining out, ordering → Wants.

## Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Go to [vercel.com/new](https://vercel.com/new) and import your repo
3. Add environment variables (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`)
4. Deploy — Vercel auto-detects Next.js and handles everything
5. Update Supabase auth redirect URL to `https://your-app.vercel.app/auth/callback`

### Other Platforms

The app also works on **Netlify** (via OpenNext adapter) and **Cloudflare Pages**. See the respective platform docs for Next.js deployment guides.

## Project Structure

```
src/
├── app/
│   ├── layout.tsx              # Root layout with AuthProvider
│   ├── page.tsx                # Landing page (upload / auth)
│   ├── login/page.tsx          # Login page
│   ├── signup/page.tsx         # Signup page
│   ├── auth/callback/route.ts  # Supabase auth callback
│   └── dashboard/
│       ├── layout.tsx          # Sidebar + content wrapper
│       ├── page.tsx            # Overview
│       ├── transactions/       # Filterable transaction list
│       ├── categories/         # Category breakdown + trends
│       ├── accounts/           # Account & credit card analysis
│       ├── trends/             # Monthly trends + savings
│       ├── budget/             # 50/30/20 comparison
│       └── insights/           # Smart spending insights
├── components/
│   ├── ui/                     # Card, StatCard, Badge, AllocationBar
│   ├── layout/                 # Sidebar (desktop + mobile bottom nav)
│   ├── upload/                 # DropZone (drag & drop)
│   ├── dashboard/              # SummaryCards, RecentTransactions, etc.
│   ├── charts/                 # 10 Recharts components
│   └── providers/              # AuthProvider
├── lib/
│   ├── types.ts                # All TypeScript interfaces
│   ├── constants.ts            # Category classifications, colors
│   ├── parser.ts               # Excel → raw rows
│   ├── cleaner.ts              # Filter, parse dates, split income/expense
│   ├── classifier.ts           # Need/Want/Investment assignment
│   ├── formatters.ts           # INR formatting, date helpers
│   ├── serialization.ts        # Date ↔ JSON serialization for Supabase
│   ├── supabase/               # Client, server, middleware helpers
│   └── analytics/              # Summary, categories, monthly, accounts,
│                               # budget, insights, recurring
├── store/
│   └── useFinanceStore.ts      # Zustand store — data pipeline + persistence
└── middleware.ts               # Route protection (auth redirects)
```

## Data Flow

```
User drops .xlsx
  → DropZone component
  → useFinanceStore.processFile()
    → parser.ts     (xlsx → raw rows)
    → cleaner.ts    (filter transfers, parse dates, split income/expense)
    → classifier.ts (assign Need/Want/Investment)
    → analytics/*   (all computations)
    → saveToSupabase() (persist to DB + upload file to Storage)
  → Router → /dashboard
  → Components read from Zustand store

On page refresh:
  → AuthProvider checks auth
  → restoreFromSupabase() fetches saved data
  → Deserialize dates → Zustand store populated
  → Dashboard renders instantly
```

## Scripts

```bash
npm run dev       # Start development server
npm run build     # Production build
npm run start     # Run production server
npm run lint      # Run ESLint
```

## License

MIT

---

Built with [Claude Code](https://claude.ai/claude-code)
