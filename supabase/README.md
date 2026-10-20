# Warhawks Cricket Tournament Management — Database Setup Guide

This directory contains the **single consolidated master SQL initialization script** for Supabase PostgreSQL:
- **`supabase/schema.sql`**

---

## 1. Single Master Initialization Script (`schema.sql`)

All fragmented migration files have been consolidated into `supabase/schema.sql`. It includes:

1. **Extensions**: `uuid-ossp` and `pgcrypto`
2. **Enumerations**: `tournament_status`, `match_status`, `user_role`, `dietary_preference`
3. **Core Tables & Relationships**:
   - `user_profiles` (Supabase Auth role mapping)
   - `tournaments` (Multi-edition isolation, budget caps, UPI payment info)
   - `teams` (Franchise squads, color branding, salary purse budgets)
   - `players` (Rosters, roles, base prices, sold bids, stats)
   - `matches` (Fixtures, rounds, toss results, scores, CricHeroes IDs)
   - `standings` (Points, net run rate, tie counts)
   - `sponsors` (Corporate tiers, contributions, website links)
   - `expenses` (Ledger records, vendor vouchers, payment modes)
   - `registrations` (Player self-service, guest count, **independent guest dietary preferences JSONB**, UPI references)
   - `auction_configs` & `auction_bids` (Live auction room, bid increments)
   - `rules` (Playing conditions and rules articles)
   - `media_assets` (Tournament photo and video library)
   - `import_jobs` (Batch CricHeroes & spreadsheet imports)
   - `audit_logs` (Administrative audit trail)
4. **Performance Indexes**: High-performance B-tree indexes across all foreign keys, query statuses, and email filters.
5. **Storage Bucket**: Configures `tournament-assets` for public read and organizer upload of UPI QR codes and photos.
6. **Row Level Security (RLS)**: Strict policies separating public player privileges from administrator operational controls.

---

## 2. How to Initialize the Database from Scratch

1. Open your [Supabase Dashboard](https://supabase.com/dashboard).
2. Select your project (`warhawks`).
3. Click **SQL Editor** on the left menu navigation.
4. Click **+ New Query**.
5. Copy the entire contents of **`supabase/schema.sql`**, paste it into the editor, and click **Run**.
6. The entire database schema, storage bucket, and security policies will be created cleanly.

---

## 3. Fresh Reset (Destructive)

To completely wipe all existing tables and re-initialize with fresh empty tables:
At the top of `supabase/schema.sql`, uncomment the `DROP TABLE ... CASCADE` statements and execute in the SQL Editor.
