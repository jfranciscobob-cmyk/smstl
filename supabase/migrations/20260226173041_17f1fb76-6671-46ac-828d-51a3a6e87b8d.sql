
-- Fix RLS policies: change from RESTRICTIVE to PERMISSIVE

-- Drop restrictive policies on profiles
DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Service can insert profiles" ON public.profiles;

-- Recreate as PERMISSIVE
CREATE POLICY "Users can read own profile" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid());
CREATE POLICY "Service can insert profiles" ON public.profiles FOR INSERT WITH CHECK (true);

-- Allow anon to count profiles (for setup check)
CREATE POLICY "Anon can count profiles" ON public.profiles FOR SELECT TO anon USING (true);

-- Drop restrictive policies on user_roles
DROP POLICY IF EXISTS "Read roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admin insert roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admin delete roles" ON public.user_roles;

-- Recreate as PERMISSIVE
CREATE POLICY "Read roles" ON public.user_roles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin insert roles" ON public.user_roles FOR INSERT WITH CHECK (true);
CREATE POLICY "Admin delete roles" ON public.user_roles FOR DELETE USING (true);

-- Allow anon to count user_roles
CREATE POLICY "Anon can count roles" ON public.user_roles FOR SELECT TO anon USING (true);

-- Insert profile for existing user if missing
INSERT INTO public.profiles (id, email, nome)
SELECT id, email, COALESCE(raw_user_meta_data->>'nome', email)
FROM auth.users
WHERE id NOT IN (SELECT id FROM public.profiles)
ON CONFLICT (id) DO NOTHING;

-- Assign admin role to existing user if no roles exist
INSERT INTO public.user_roles (user_id, role)
SELECT u.id, 'admin'::app_role
FROM auth.users u
WHERE NOT EXISTS (SELECT 1 FROM public.user_roles)
ON CONFLICT (user_id, role) DO NOTHING;
