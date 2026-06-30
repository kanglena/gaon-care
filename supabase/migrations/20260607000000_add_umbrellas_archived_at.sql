-- Soft-delete support for umbrellas: archived rows are excluded from
-- inventory lists, dashboard counts, and QR printing.
ALTER TABLE public.umbrellas ADD COLUMN IF NOT EXISTS archived_at timestamptz;
