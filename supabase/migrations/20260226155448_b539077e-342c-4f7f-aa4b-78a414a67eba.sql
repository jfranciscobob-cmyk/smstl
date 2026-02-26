
-- Tabela de funções dentro de unidades (ex: Médicos Reguladores, Administrativo)
CREATE TABLE public.funcoes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome text NOT NULL,
  unidade_id uuid REFERENCES public.unidades(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Tabela de atestados
CREATE TABLE public.atestados (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  servidor_id uuid NOT NULL REFERENCES public.servidores(id) ON DELETE CASCADE,
  tipo text NOT NULL DEFAULT 'médico',
  data_inicio date NOT NULL,
  data_fim date NOT NULL,
  dias integer NOT NULL DEFAULT 1,
  observacao text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Adicionar funcao_id nos servidores
ALTER TABLE public.servidores ADD COLUMN funcao_id uuid REFERENCES public.funcoes(id) ON DELETE SET NULL;

-- RLS para funcoes
ALTER TABLE public.funcoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read funcoes" ON public.funcoes FOR SELECT USING (true);
CREATE POLICY "Auth insert funcoes" ON public.funcoes FOR INSERT WITH CHECK (true);
CREATE POLICY "Auth update funcoes" ON public.funcoes FOR UPDATE USING (true);
CREATE POLICY "Auth delete funcoes" ON public.funcoes FOR DELETE USING (true);

-- RLS para atestados
ALTER TABLE public.atestados ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read atestados" ON public.atestados FOR SELECT USING (true);
CREATE POLICY "Auth insert atestados" ON public.atestados FOR INSERT WITH CHECK (true);
CREATE POLICY "Auth update atestados" ON public.atestados FOR UPDATE USING (true);
CREATE POLICY "Auth delete atestados" ON public.atestados FOR DELETE USING (true);

-- Triggers de updated_at
CREATE TRIGGER update_funcoes_updated_at BEFORE UPDATE ON public.funcoes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_atestados_updated_at BEFORE UPDATE ON public.atestados FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Realtime para atestados
ALTER PUBLICATION supabase_realtime ADD TABLE public.atestados;
ALTER PUBLICATION supabase_realtime ADD TABLE public.funcoes;
