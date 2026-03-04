
-- Tabela de avisos do administrador
CREATE TABLE public.avisos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  titulo TEXT NOT NULL,
  mensagem TEXT NOT NULL,
  criado_por UUID NOT NULL,
  destinatario_tipo TEXT NOT NULL DEFAULT 'todos', -- 'todos' ou 'usuario'
  destinatario_user_id UUID, -- se for específico
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de confirmações de leitura
CREATE TABLE public.avisos_lidos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  aviso_id UUID NOT NULL REFERENCES public.avisos(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  lido_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(aviso_id, user_id)
);

-- RLS
ALTER TABLE public.avisos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.avisos_lidos ENABLE ROW LEVEL SECURITY;

-- Avisos: todos autenticados podem ler
CREATE POLICY "Authenticated can read avisos" ON public.avisos FOR SELECT TO authenticated USING (true);
-- Apenas admins podem inserir/atualizar/deletar
CREATE POLICY "Admin insert avisos" ON public.avisos FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin update avisos" ON public.avisos FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin delete avisos" ON public.avisos FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'));

-- Avisos lidos: usuário pode inserir e ler os próprios
CREATE POLICY "User can read own lidos" ON public.avisos_lidos FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "User can insert own lidos" ON public.avisos_lidos FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
-- Admin pode ler todos (para ver quem leu)
CREATE POLICY "Admin can read all lidos" ON public.avisos_lidos FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'));
