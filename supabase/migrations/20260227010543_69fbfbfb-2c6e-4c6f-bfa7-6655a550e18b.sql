
-- Junction table for servidor in multiple unidades
CREATE TABLE public.servidores_unidades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  servidor_id uuid NOT NULL REFERENCES public.servidores(id) ON DELETE CASCADE,
  unidade_id uuid NOT NULL REFERENCES public.unidades(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(servidor_id, unidade_id)
);

ALTER TABLE public.servidores_unidades ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow read servidores_unidades" ON public.servidores_unidades FOR SELECT USING (true);
CREATE POLICY "Allow insert servidores_unidades" ON public.servidores_unidades FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update servidores_unidades" ON public.servidores_unidades FOR UPDATE USING (true);
CREATE POLICY "Allow delete servidores_unidades" ON public.servidores_unidades FOR DELETE USING (true);
