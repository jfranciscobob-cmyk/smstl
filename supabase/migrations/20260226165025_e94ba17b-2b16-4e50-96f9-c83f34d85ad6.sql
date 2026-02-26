
-- Drop all restrictive policies and recreate as permissive

-- UNIDADES
DROP POLICY IF EXISTS "Auth delete unidades" ON public.unidades;
DROP POLICY IF EXISTS "Auth insert unidades" ON public.unidades;
DROP POLICY IF EXISTS "Auth update unidades" ON public.unidades;
DROP POLICY IF EXISTS "Public read unidades" ON public.unidades;

CREATE POLICY "Allow read unidades" ON public.unidades FOR SELECT USING (true);
CREATE POLICY "Allow insert unidades" ON public.unidades FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update unidades" ON public.unidades FOR UPDATE USING (true);
CREATE POLICY "Allow delete unidades" ON public.unidades FOR DELETE USING (true);

-- DIRETORIAS
DROP POLICY IF EXISTS "Auth delete diretorias" ON public.diretorias;
DROP POLICY IF EXISTS "Auth insert diretorias" ON public.diretorias;
DROP POLICY IF EXISTS "Auth update diretorias" ON public.diretorias;
DROP POLICY IF EXISTS "Public read diretorias" ON public.diretorias;

CREATE POLICY "Allow read diretorias" ON public.diretorias FOR SELECT USING (true);
CREATE POLICY "Allow insert diretorias" ON public.diretorias FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update diretorias" ON public.diretorias FOR UPDATE USING (true);
CREATE POLICY "Allow delete diretorias" ON public.diretorias FOR DELETE USING (true);

-- COORDENACOES
DROP POLICY IF EXISTS "Auth delete coordenacoes" ON public.coordenacoes;
DROP POLICY IF EXISTS "Auth insert coordenacoes" ON public.coordenacoes;
DROP POLICY IF EXISTS "Auth update coordenacoes" ON public.coordenacoes;
DROP POLICY IF EXISTS "Public read coordenacoes" ON public.coordenacoes;

CREATE POLICY "Allow read coordenacoes" ON public.coordenacoes FOR SELECT USING (true);
CREATE POLICY "Allow insert coordenacoes" ON public.coordenacoes FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update coordenacoes" ON public.coordenacoes FOR UPDATE USING (true);
CREATE POLICY "Allow delete coordenacoes" ON public.coordenacoes FOR DELETE USING (true);

-- SERVIDORES
DROP POLICY IF EXISTS "Auth delete servidores" ON public.servidores;
DROP POLICY IF EXISTS "Auth insert servidores" ON public.servidores;
DROP POLICY IF EXISTS "Auth update servidores" ON public.servidores;
DROP POLICY IF EXISTS "Public read servidores" ON public.servidores;

CREATE POLICY "Allow read servidores" ON public.servidores FOR SELECT USING (true);
CREATE POLICY "Allow insert servidores" ON public.servidores FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update servidores" ON public.servidores FOR UPDATE USING (true);
CREATE POLICY "Allow delete servidores" ON public.servidores FOR DELETE USING (true);

-- SETORES
DROP POLICY IF EXISTS "Auth delete setores" ON public.setores;
DROP POLICY IF EXISTS "Auth insert setores" ON public.setores;
DROP POLICY IF EXISTS "Auth update setores" ON public.setores;
DROP POLICY IF EXISTS "Public read setores" ON public.setores;

CREATE POLICY "Allow read setores" ON public.setores FOR SELECT USING (true);
CREATE POLICY "Allow insert setores" ON public.setores FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update setores" ON public.setores FOR UPDATE USING (true);
CREATE POLICY "Allow delete setores" ON public.setores FOR DELETE USING (true);

-- FUNCOES
DROP POLICY IF EXISTS "Auth delete funcoes" ON public.funcoes;
DROP POLICY IF EXISTS "Auth insert funcoes" ON public.funcoes;
DROP POLICY IF EXISTS "Auth update funcoes" ON public.funcoes;
DROP POLICY IF EXISTS "Public read funcoes" ON public.funcoes;

CREATE POLICY "Allow read funcoes" ON public.funcoes FOR SELECT USING (true);
CREATE POLICY "Allow insert funcoes" ON public.funcoes FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update funcoes" ON public.funcoes FOR UPDATE USING (true);
CREATE POLICY "Allow delete funcoes" ON public.funcoes FOR DELETE USING (true);

-- ATESTADOS
DROP POLICY IF EXISTS "Auth delete atestados" ON public.atestados;
DROP POLICY IF EXISTS "Auth insert atestados" ON public.atestados;
DROP POLICY IF EXISTS "Auth update atestados" ON public.atestados;
DROP POLICY IF EXISTS "Public read atestados" ON public.atestados;

CREATE POLICY "Allow read atestados" ON public.atestados FOR SELECT USING (true);
CREATE POLICY "Allow insert atestados" ON public.atestados FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update atestados" ON public.atestados FOR UPDATE USING (true);
CREATE POLICY "Allow delete atestados" ON public.atestados FOR DELETE USING (true);
