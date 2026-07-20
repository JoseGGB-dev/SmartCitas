-- Mantiene el rol administrador como rol exclusivo dentro del sistema.
DELETE FROM public.user_roles roles_to_remove
WHERE roles_to_remove.role <> 'admin'
  AND EXISTS (
    SELECT 1
    FROM public.user_roles admin_roles
    WHERE admin_roles.user_id = roles_to_remove.user_id
      AND admin_roles.role = 'admin'
  );

CREATE OR REPLACE FUNCTION public.cleanup_admin_extra_roles()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.user_roles roles_to_remove
  WHERE roles_to_remove.role <> 'admin'
    AND EXISTS (
      SELECT 1
      FROM public.user_roles admin_roles
      WHERE admin_roles.user_id = roles_to_remove.user_id
        AND admin_roles.role = 'admin'
    );

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS cleanup_admin_extra_roles_on_change ON public.user_roles;

CREATE TRIGGER cleanup_admin_extra_roles_on_change
AFTER INSERT OR UPDATE ON public.user_roles
FOR EACH STATEMENT
EXECUTE FUNCTION public.cleanup_admin_extra_roles();
