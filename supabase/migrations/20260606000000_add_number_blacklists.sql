-- Add number column for sort order
ALTER TABLE public.umbrellas ADD COLUMN IF NOT EXISTS number integer;

-- Create blacklists table
CREATE TABLE public.blacklists (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id  text        NOT NULL,
  reason      text        NOT NULL,
  starts_at   timestamptz NOT NULL,
  until       timestamptz NOT NULL,
  released_at timestamptz,
  rental_id   uuid        REFERENCES public.rentals(id),
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- RLS: same lock-down pattern as umbrellas/rentals
ALTER TABLE public.blacklists ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.blacklists FROM anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.blacklists TO service_role;

-- Index for active blacklist lookup (borrow check hot path)
CREATE INDEX blacklists_active_student_idx
  ON public.blacklists (student_id)
  WHERE released_at IS NULL;
