
CREATE TABLE IF NOT EXISTS public.escalas_semanais (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  servidor_id uuid NOT NULL REFERENCES public.servidores(id) ON DELETE CASCADE,
  dia_semana smallint NOT NULL CHECK (dia_semana BETWEEN 0 AND 6),
  entrada1 text NULL,
  saida1 text NULL,
  entrada2 text NULL,
  saida2 text NULL,
  total_horas numeric NULL,
  observacao text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(servidor_id, dia_semana)
);

ALTER TABLE public.escalas_semanais ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow read escalas_semanais" ON public.escalas_semanais FOR SELECT USING (true);
CREATE POLICY "Allow insert escalas_semanais" ON public.escalas_semanais FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update escalas_semanais" ON public.escalas_semanais FOR UPDATE USING (true);
CREATE POLICY "Allow delete escalas_semanais" ON public.escalas_semanais FOR DELETE USING (true);

ALTER PUBLICATION supabase_realtime ADD TABLE public.escalas_semanais;

CREATE TRIGGER update_escalas_semanais_updated_at
  BEFORE UPDATE ON public.escalas_semanais
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
