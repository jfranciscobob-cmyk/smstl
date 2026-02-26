
-- Tabela de setores (funções/departamentos dentro de diretorias ou secretaria)
CREATE TABLE public.setores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  diretoria_id UUID REFERENCES public.diretorias(id) ON DELETE CASCADE,
  cargo_gestao TEXT, -- ex: "Chefe de Setor", "Assessor", "Gerente"
  responsavel_id UUID REFERENCES public.servidores(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- diretoria_id NULL = pertence diretamente à Secretaria Municipal

-- RLS
ALTER TABLE public.setores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read setores" ON public.setores FOR SELECT USING (true);
CREATE POLICY "Auth insert setores" ON public.setores FOR INSERT WITH CHECK (true);
CREATE POLICY "Auth update setores" ON public.setores FOR UPDATE USING (true);
CREATE POLICY "Auth delete setores" ON public.setores FOR DELETE USING (true);

-- Adicionar setor_id na tabela servidores para vincular servidor a um setor
ALTER TABLE public.servidores ADD COLUMN setor_id UUID REFERENCES public.setores(id) ON DELETE SET NULL;
