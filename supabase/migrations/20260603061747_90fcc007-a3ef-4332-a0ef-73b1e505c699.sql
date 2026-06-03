
-- 1) Prevent users from editing their own eco_score directly
CREATE OR REPLACE FUNCTION public.protect_profile_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- service_role bypasses RLS and runs with no auth.uid(); allow it.
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;
  IF NEW.eco_score IS DISTINCT FROM OLD.eco_score THEN
    NEW.eco_score := OLD.eco_score;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_protect_columns ON public.profiles;
CREATE TRIGGER profiles_protect_columns
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.protect_profile_columns();

-- Safe server-side incrementer (small, bounded delta)
CREATE OR REPLACE FUNCTION public.increment_eco_score(delta integer)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  new_score integer;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF delta IS NULL OR delta < 1 OR delta > 100 THEN
    RAISE EXCEPTION 'Invalid delta';
  END IF;
  UPDATE public.profiles
     SET eco_score = eco_score + delta
   WHERE id = uid
   RETURNING eco_score INTO new_score;
  RETURN new_score;
END;
$$;

REVOKE ALL ON FUNCTION public.increment_eco_score(integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.increment_eco_score(integer) TO authenticated;

-- 2) Remove self-insert on user_badges; expose a validated award function
DROP POLICY IF EXISTS "Users insert own badges" ON public.user_badges;

CREATE OR REPLACE FUNCTION public.award_badge(_slug text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  b record;
  score integer;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  SELECT id, threshold INTO b FROM public.badges WHERE slug = _slug;
  IF NOT FOUND THEN
    RETURN false;
  END IF;
  SELECT eco_score INTO score FROM public.profiles WHERE id = uid;
  IF coalesce(score, 0) < b.threshold THEN
    RETURN false;
  END IF;
  INSERT INTO public.user_badges (user_id, badge_id)
  VALUES (uid, b.id)
  ON CONFLICT DO NOTHING;
  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.award_badge(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.award_badge(text) TO authenticated;

-- 3) Explicit admin-only INSERT/DELETE policies on user_roles
DROP POLICY IF EXISTS "Admins insert roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins delete roles" ON public.user_roles;

CREATE POLICY "Admins insert roles"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins delete roles"
ON public.user_roles
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));
