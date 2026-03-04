
-- Add diretoria/unidade targeting columns to avisos
ALTER TABLE public.avisos 
  ADD COLUMN IF NOT EXISTS destinatario_diretoria_id uuid REFERENCES public.diretorias(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS destinatario_unidade_id uuid REFERENCES public.unidades(id) ON DELETE SET NULL;

-- Drop old restrictive RLS policies for avisos
DROP POLICY IF EXISTS "Admin delete avisos" ON public.avisos;
DROP POLICY IF EXISTS "Admin insert avisos" ON public.avisos;
DROP POLICY IF EXISTS "Admin update avisos" ON public.avisos;

-- Admin can do everything
CREATE POLICY "Admin manage avisos" ON public.avisos
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Diretor/Coord Geral can insert avisos for their diretorias
CREATE POLICY "Diretor insert avisos" ON public.avisos
  FOR INSERT TO authenticated
  WITH CHECK (
    (has_role(auth.uid(), 'diretor'::app_role) OR has_role(auth.uid(), 'coordenador_geral'::app_role))
    AND criado_por = auth.uid()
  );

-- Diretor/Coord Geral can update/delete own avisos
CREATE POLICY "Diretor manage own avisos" ON public.avisos
  FOR UPDATE TO authenticated
  USING (
    (has_role(auth.uid(), 'diretor'::app_role) OR has_role(auth.uid(), 'coordenador_geral'::app_role))
    AND criado_por = auth.uid()
  );

CREATE POLICY "Diretor delete own avisos" ON public.avisos
  FOR DELETE TO authenticated
  USING (
    (has_role(auth.uid(), 'diretor'::app_role) OR has_role(auth.uid(), 'coordenador_geral'::app_role))
    AND criado_por = auth.uid()
  );

-- Coordenador can insert avisos for their unidades
CREATE POLICY "Coordenador insert avisos" ON public.avisos
  FOR INSERT TO authenticated
  WITH CHECK (
    has_role(auth.uid(), 'coordenador'::app_role)
    AND criado_por = auth.uid()
  );

CREATE POLICY "Coordenador manage own avisos" ON public.avisos
  FOR UPDATE TO authenticated
  USING (
    has_role(auth.uid(), 'coordenador'::app_role)
    AND criado_por = auth.uid()
  );

CREATE POLICY "Coordenador delete own avisos" ON public.avisos
  FOR DELETE TO authenticated
  USING (
    has_role(auth.uid(), 'coordenador'::app_role)
    AND criado_por = auth.uid()
  );
