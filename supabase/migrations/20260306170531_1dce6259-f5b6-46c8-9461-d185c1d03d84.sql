DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'diretorias'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.diretorias;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'unidades'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.unidades;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'coordenacoes'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.coordenacoes;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'servidores_unidades'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.servidores_unidades;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'avisos'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.avisos;
  END IF;
END
$$;