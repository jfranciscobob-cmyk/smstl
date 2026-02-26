
-- Create timestamp update function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Diretorias
CREATE TABLE public.diretorias (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Unidades
CREATE TABLE public.unidades (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  sigla TEXT NOT NULL,
  diretoria_id UUID NOT NULL REFERENCES public.diretorias(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Coordenações
CREATE TABLE public.coordenacoes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  unidade_id UUID NOT NULL REFERENCES public.unidades(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Servidores
CREATE TABLE public.servidores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  matricula TEXT NOT NULL,
  cargo TEXT NOT NULL,
  local_trabalho TEXT NOT NULL DEFAULT '',
  setor TEXT NOT NULL DEFAULT '',
  funcao_critica BOOLEAN NOT NULL DEFAULT false,
  cobertura_prevista TEXT NOT NULL DEFAULT 'PARCIAL',
  vinculo TEXT NOT NULL DEFAULT '',
  status_presenca TEXT NOT NULL DEFAULT 'presente',
  observacao TEXT,
  escala_inicio1 TEXT,
  escala_fim1 TEXT,
  escala_inicio2 TEXT,
  escala_fim2 TEXT,
  escala_total_horas INTEGER,
  ferias_ano_referencia INTEGER,
  ferias_status_gerencial TEXT DEFAULT 'SEM ANO DE REFERÊNCIA',
  ferias_periodo1_inicio TEXT,
  ferias_periodo1_fim TEXT,
  ferias_periodo2_inicio TEXT,
  ferias_periodo2_fim TEXT,
  ferias_total_dias INTEGER DEFAULT 0,
  ferias_vencidas INTEGER DEFAULT 0,
  diretoria_id UUID REFERENCES public.diretorias(id) ON DELETE SET NULL,
  unidade_id UUID REFERENCES public.unidades(id) ON DELETE SET NULL,
  coordenacao_id UUID REFERENCES public.coordenacoes(id) ON DELETE SET NULL,
  is_diretor BOOLEAN NOT NULL DEFAULT false,
  is_coordenador BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.diretorias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.unidades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coordenacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.servidores ENABLE ROW LEVEL SECURITY;

-- Public read policies
CREATE POLICY "Public read diretorias" ON public.diretorias FOR SELECT USING (true);
CREATE POLICY "Public read unidades" ON public.unidades FOR SELECT USING (true);
CREATE POLICY "Public read coordenacoes" ON public.coordenacoes FOR SELECT USING (true);
CREATE POLICY "Public read servidores" ON public.servidores FOR SELECT USING (true);

-- Auth write policies
CREATE POLICY "Auth insert diretorias" ON public.diretorias FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Auth update diretorias" ON public.diretorias FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Auth delete diretorias" ON public.diretorias FOR DELETE TO authenticated USING (true);

CREATE POLICY "Auth insert unidades" ON public.unidades FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Auth update unidades" ON public.unidades FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Auth delete unidades" ON public.unidades FOR DELETE TO authenticated USING (true);

CREATE POLICY "Auth insert coordenacoes" ON public.coordenacoes FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Auth update coordenacoes" ON public.coordenacoes FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Auth delete coordenacoes" ON public.coordenacoes FOR DELETE TO authenticated USING (true);

CREATE POLICY "Auth insert servidores" ON public.servidores FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Auth update servidores" ON public.servidores FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Auth delete servidores" ON public.servidores FOR DELETE TO authenticated USING (true);

-- Triggers
CREATE TRIGGER update_diretorias_updated_at BEFORE UPDATE ON public.diretorias FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_unidades_updated_at BEFORE UPDATE ON public.unidades FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_coordenacoes_updated_at BEFORE UPDATE ON public.coordenacoes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_servidores_updated_at BEFORE UPDATE ON public.servidores FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for servidores
ALTER PUBLICATION supabase_realtime ADD TABLE public.servidores;
