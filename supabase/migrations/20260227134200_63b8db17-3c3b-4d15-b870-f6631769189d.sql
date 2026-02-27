
CREATE TABLE public.servidores_setores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  servidor_id UUID NOT NULL REFERENCES public.servidores(id) ON DELETE CASCADE,
  setor_id UUID NOT NULL REFERENCES public.setores(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(servidor_id, setor_id)
);

ALTER TABLE public.servidores_setores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow read servidores_setores" ON public.servidores_setores FOR SELECT USING (true);
CREATE POLICY "Allow insert servidores_setores" ON public.servidores_setores FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update servidores_setores" ON public.servidores_setores FOR UPDATE USING (true);
CREATE POLICY "Allow delete servidores_setores" ON public.servidores_setores FOR DELETE USING (true);
