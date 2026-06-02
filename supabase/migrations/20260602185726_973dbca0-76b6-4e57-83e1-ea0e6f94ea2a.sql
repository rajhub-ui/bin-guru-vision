ALTER TYPE public.waste_class ADD VALUE IF NOT EXISTS 'battery';
ALTER TYPE public.waste_class ADD VALUE IF NOT EXISTS 'hazardous';
ALTER TYPE public.waste_class ADD VALUE IF NOT EXISTS 'wood';
ALTER TYPE public.waste_class ADD VALUE IF NOT EXISTS 'rubber';
ALTER TYPE public.waste_class ADD VALUE IF NOT EXISTS 'medical';

CREATE UNIQUE INDEX IF NOT EXISTS disposal_proofs_unique_detection
  ON public.disposal_proofs (user_id, detection_id)
  WHERE detection_id IS NOT NULL;