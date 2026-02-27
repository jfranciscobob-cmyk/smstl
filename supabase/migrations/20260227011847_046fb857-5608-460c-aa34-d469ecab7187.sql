-- Tabelas de vínculo múltiplo de pastas por usuário
CREATE TABLE IF NOT EXISTS public.user_diretorias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  diretoria_id uuid NOT NULL REFERENCES public.diretorias(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, diretoria_id)
);

CREATE TABLE IF NOT EXISTS public.user_unidades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  unidade_id uuid NOT NULL REFERENCES public.unidades(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, unidade_id)
);

CREATE INDEX IF NOT EXISTS idx_user_diretorias_user_id ON public.user_diretorias(user_id);
CREATE INDEX IF NOT EXISTS idx_user_unidades_user_id ON public.user_unidades(user_id);

ALTER TABLE public.user_diretorias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_unidades ENABLE ROW LEVEL SECURITY;

-- SELECT: próprio usuário ou usuários com acesso amplo
DROP POLICY IF EXISTS "Read own or full access user_diretorias" ON public.user_diretorias;
CREATE POLICY "Read own or full access user_diretorias"
ON public.user_diretorias
FOR SELECT
USING (user_id = auth.uid() OR public.has_full_access(auth.uid()));

DROP POLICY IF EXISTS "Read own or full access user_unidades" ON public.user_unidades;
CREATE POLICY "Read own or full access user_unidades"
ON public.user_unidades
FOR SELECT
USING (user_id = auth.uid() OR public.has_full_access(auth.uid()));

-- Escrita: apenas usuários com acesso amplo (admin/diretor)
DROP POLICY IF EXISTS "Full access insert user_diretorias" ON public.user_diretorias;
CREATE POLICY "Full access insert user_diretorias"
ON public.user_diretorias
FOR INSERT
WITH CHECK (public.has_full_access(auth.uid()));

DROP POLICY IF EXISTS "Full access delete user_diretorias" ON public.user_diretorias;
CREATE POLICY "Full access delete user_diretorias"
ON public.user_diretorias
FOR DELETE
USING (public.has_full_access(auth.uid()));

DROP POLICY IF EXISTS "Full access insert user_unidades" ON public.user_unidades;
CREATE POLICY "Full access insert user_unidades"
ON public.user_unidades
FOR INSERT
WITH CHECK (public.has_full_access(auth.uid()));

DROP POLICY IF EXISTS "Full access delete user_unidades" ON public.user_unidades;
CREATE POLICY "Full access delete user_unidades"
ON public.user_unidades
FOR DELETE
USING (public.has_full_access(auth.uid()));

-- Backfill inicial a partir dos vínculos únicos existentes em profiles
INSERT INTO public.user_diretorias (user_id, diretoria_id)
SELECT id, diretoria_id
FROM public.profiles
WHERE diretoria_id IS NOT NULL
ON CONFLICT (user_id, diretoria_id) DO NOTHING;

INSERT INTO public.user_unidades (user_id, unidade_id)
SELECT id, unidade_id
FROM public.profiles
WHERE unidade_id IS NOT NULL
ON CONFLICT (user_id, unidade_id) DO NOTHING;