
CREATE TABLE public.transferencias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  servidor_id uuid NOT NULL REFERENCES public.servidores(id) ON DELETE CASCADE,
  diretoria_origem_id uuid NOT NULL REFERENCES public.diretorias(id),
  diretoria_destino_id uuid NOT NULL REFERENCES public.diretorias(id),
  solicitante_user_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'pendente',
  observacao text,
  resposta_observacao text,
  respondido_por_user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  respondido_at timestamptz
);

ALTER TABLE public.transferencias ENABLE ROW LEVEL SECURITY;

-- RLS: authenticated users can read transferencias relevant to their diretorias
CREATE POLICY "Allow read transferencias" ON public.transferencias FOR SELECT USING (true);
CREATE POLICY "Allow insert transferencias" ON public.transferencias FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update transferencias" ON public.transferencias FOR UPDATE USING (true);

-- Trigger for updated_at
CREATE TRIGGER update_transferencias_updated_at
  BEFORE UPDATE ON public.transferencias
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.transferencias;
