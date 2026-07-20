-- Descripcion administrativa de sedes para mantener informacion visible en catalogos.
ALTER TABLE public.facilities
  ADD COLUMN IF NOT EXISTS description TEXT;
