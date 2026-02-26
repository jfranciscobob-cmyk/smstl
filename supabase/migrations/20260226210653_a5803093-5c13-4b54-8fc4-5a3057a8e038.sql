
-- Add coordenador médico flag to servidores
ALTER TABLE public.servidores ADD COLUMN is_coordenador_medico boolean NOT NULL DEFAULT false;

-- Create agrupamentos table (grouping of unidades within a diretoria)
CREATE TABLE public.agrupamentos (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome text NOT NULL,
  diretoria_id uuid NOT NULL REFERENCES public.diretorias(id) ON DELETE CASCADE,
  coordenador_id uuid REFERENCES public.servidores(id) ON DELETE SET NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Add agrupamento_id to unidades
ALTER TABLE public.unidades ADD COLUMN agrupamento_id uuid REFERENCES public.agrupamentos(id) ON DELETE SET NULL;

-- Enable RLS on agrupamentos
ALTER TABLE public.agrupamentos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow read agrupamentos" ON public.agrupamentos FOR SELECT USING (true);
CREATE POLICY "Allow insert agrupamentos" ON public.agrupamentos FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update agrupamentos" ON public.agrupamentos FOR UPDATE USING (true);
CREATE POLICY "Allow delete agrupamentos" ON public.agrupamentos FOR DELETE USING (true);

-- Enable realtime for agrupamentos
ALTER PUBLICATION supabase_realtime ADD TABLE public.agrupamentos;
