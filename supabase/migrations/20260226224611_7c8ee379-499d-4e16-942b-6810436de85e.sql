ALTER TABLE public.servidores ADD COLUMN IF NOT EXISTS vinculo2 text DEFAULT NULL;
ALTER TABLE public.servidores ADD COLUMN IF NOT EXISTS duplo_vinculo boolean NOT NULL DEFAULT false;