-- Remove all existing umbrella data (cascades to rentals via FK — run in dev only)
DELETE FROM public.rentals;
DELETE FROM public.umbrellas;

-- Insert 28 umbrellas with new ID format
INSERT INTO public.umbrellas (id, label, qr_payload, status, number)
SELECT
  'umb-' || n,
  n || '번 우산',
  'umb-' || n,
  'available',
  n
FROM generate_series(1, 28) AS n;
