
CREATE TABLE public.afastamentos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  servidor_id UUID NOT NULL REFERENCES public.servidores(id) ON DELETE CASCADE,
  motivo TEXT NOT NULL,
  data_inicio DATE NOT NULL,
  data_fim DATE,
  observacao TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.afastamentos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow read afastamentos" ON public.afastamentos FOR SELECT USING (true);
CREATE POLICY "Allow insert afastamentos" ON public.afastamentos FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update afastamentos" ON public.afastamentos FOR UPDATE USING (true);
CREATE POLICY "Allow delete afastamentos" ON public.afastamentos FOR DELETE USING (true);

ALTER PUBLICATION supabase_realtime ADD TABLE public.afastamentos;
