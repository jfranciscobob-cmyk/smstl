
-- Add data_admissao column to servidores
ALTER TABLE public.servidores ADD COLUMN IF NOT EXISTS data_admissao date NULL;

-- Create faltas_abonadas table
CREATE TABLE IF NOT EXISTS public.faltas_abonadas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  servidor_id uuid NOT NULL REFERENCES public.servidores(id) ON DELETE CASCADE,
  data date NOT NULL,
  observacao text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.faltas_abonadas ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Allow read faltas_abonadas" ON public.faltas_abonadas FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow insert faltas_abonadas" ON public.faltas_abonadas FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow update faltas_abonadas" ON public.faltas_abonadas FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Allow delete faltas_abonadas" ON public.faltas_abonadas FOR DELETE TO authenticated USING (true);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.faltas_abonadas;
