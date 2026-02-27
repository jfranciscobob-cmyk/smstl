
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS diretoria_id uuid REFERENCES public.diretorias(id) ON DELETE SET NULL;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS unidade_id uuid REFERENCES public.unidades(id) ON DELETE SET NULL;
