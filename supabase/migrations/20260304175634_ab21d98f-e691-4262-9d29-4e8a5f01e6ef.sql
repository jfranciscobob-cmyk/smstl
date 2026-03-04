
ALTER TABLE public.transferencias 
  ADD COLUMN tipo text NOT NULL DEFAULT 'transferencia',
  ADD COLUMN manter_ambos boolean NOT NULL DEFAULT false,
  ADD COLUMN unidade_origem_id uuid REFERENCES public.unidades(id),
  ADD COLUMN unidade_destino_id uuid REFERENCES public.unidades(id),
  ADD COLUMN setor_origem_id uuid REFERENCES public.setores(id),
  ADD COLUMN setor_destino_id uuid REFERENCES public.setores(id);

COMMENT ON COLUMN public.transferencias.tipo IS 'transferencia | realocacao | informativo';
COMMENT ON COLUMN public.transferencias.manter_ambos IS 'true = manter em ambos, false = mover apenas para o novo';
