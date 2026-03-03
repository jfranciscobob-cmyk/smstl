
-- Tabela de equipes de saúde
CREATE TABLE public.equipes_saude (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  tipo TEXT NOT NULL DEFAULT 'ESF',
  unidade_id UUID NOT NULL REFERENCES public.unidades(id) ON DELETE CASCADE,
  responsavel_id UUID REFERENCES public.servidores(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de junção servidores <-> equipes
CREATE TABLE public.servidores_equipes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  servidor_id UUID NOT NULL REFERENCES public.servidores(id) ON DELETE CASCADE,
  equipe_id UUID NOT NULL REFERENCES public.equipes_saude(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(servidor_id, equipe_id)
);

-- RLS
ALTER TABLE public.equipes_saude ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.servidores_equipes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow read equipes_saude" ON public.equipes_saude FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow insert equipes_saude" ON public.equipes_saude FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow update equipes_saude" ON public.equipes_saude FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Allow delete equipes_saude" ON public.equipes_saude FOR DELETE TO authenticated USING (true);

CREATE POLICY "Allow read servidores_equipes" ON public.servidores_equipes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow insert servidores_equipes" ON public.servidores_equipes FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow update servidores_equipes" ON public.servidores_equipes FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Allow delete servidores_equipes" ON public.servidores_equipes FOR DELETE TO authenticated USING (true);

-- Trigger updated_at
CREATE TRIGGER update_equipes_saude_updated_at BEFORE UPDATE ON public.equipes_saude FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
