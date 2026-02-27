
-- Registration requests table
CREATE TABLE public.registration_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  nome text NOT NULL DEFAULT '',
  senha text NOT NULL,
  role_requested text NOT NULL CHECK (role_requested IN ('diretor', 'coordenador')),
  diretoria_id uuid REFERENCES public.diretorias(id),
  status text NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'aprovado', 'rejeitado')),
  respondido_por uuid,
  respondido_at timestamptz,
  motivo_rejeicao text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.registration_requests ENABLE ROW LEVEL SECURITY;

-- Only authenticated users with admin/diretor role can read requests
CREATE POLICY "Full access read requests" ON public.registration_requests
  FOR SELECT TO authenticated
  USING (public.has_full_access(auth.uid()));

CREATE POLICY "Full access update requests" ON public.registration_requests
  FOR UPDATE TO authenticated
  USING (public.has_full_access(auth.uid()));

CREATE POLICY "Full access delete requests" ON public.registration_requests
  FOR DELETE TO authenticated
  USING (public.has_full_access(auth.uid()));

-- Anyone (anon) can insert a request
CREATE POLICY "Anyone can submit request" ON public.registration_requests
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

-- Add last_seen_at to profiles for online tracking
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_seen_at timestamptz;
