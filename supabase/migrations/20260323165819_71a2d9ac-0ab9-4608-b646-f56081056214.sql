ALTER TABLE public.registration_requests DROP CONSTRAINT IF EXISTS registration_requests_role_requested_check;

ALTER TABLE public.registration_requests
ADD CONSTRAINT registration_requests_role_requested_check
CHECK (role_requested = ANY (ARRAY['diretor'::text, 'coordenador'::text, 'coordenador_geral'::text]));