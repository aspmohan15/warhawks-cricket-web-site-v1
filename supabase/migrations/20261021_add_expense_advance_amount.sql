-- Migration: Add advance_amount column to expenses table
-- Preserves existing data, default 0 for existing expenses

ALTER TABLE public.expenses
ADD COLUMN IF NOT EXISTS advance_amount NUMERIC(14, 2) NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.expenses.advance_amount IS 'Advance or token amount already disbursed for this expense voucher';
