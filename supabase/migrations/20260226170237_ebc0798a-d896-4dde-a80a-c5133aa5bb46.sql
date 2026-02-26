
-- Junction table: a servidor can be coordinator of multiple unidades
CREATE TABLE public.coordenadores_unidades (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  servidor_id UUID NOT NULL REFERENCES public.servidores(id) ON DELETE CASCADE,
  unidade_id UUID NOT NULL REFERENCES public.unidades(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(servidor_id, unidade_id)
);

-- Enable RLS
ALTER TABLE public.coordenadores_unidades ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow read coordenadores_unidades" ON public.coordenadores_unidades FOR SELECT USING (true);
CREATE POLICY "Allow insert coordenadores_unidades" ON public.coordenadores_unidades FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update coordenadores_unidades" ON public.coordenadores_unidades FOR UPDATE USING (true);
CREATE POLICY "Allow delete coordenadores_unidades" ON public.coordenadores_unidades FOR DELETE USING (true);

-- Migrate existing data: servidores with is_coordenador=true and unidade_id set
INSERT INTO public.coordenadores_unidades (servidor_id, unidade_id)
SELECT id, unidade_id FROM public.servidores
WHERE is_coordenador = true AND unidade_id IS NOT NULL
ON CONFLICT DO NOTHING;

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.coordenadores_unidades;
