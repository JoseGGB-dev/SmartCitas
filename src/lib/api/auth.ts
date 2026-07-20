import { supabase } from "@/integrations/supabase/client";
import { currentRoles, mapProfile, toRoleCode } from "./supabase-api";
import type { UserProfile, RoleCode } from "./types";

export async function getMe(): Promise<UserProfile> {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    throw error;
  }

  if (!user) {
    throw new Error("Usuario no autenticado");
  }

  const metadataRoles = [user.user_metadata?.role, user.user_metadata?.roles]
    .flat()
    .map(toRoleCode)
    .filter((role): role is RoleCode => Boolean(role));

  const roles = await currentRoles(user.id).catch(() => metadataRoles);
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    throw profileError;
  }

  return mapProfile(user, profile, roles.length ? roles : metadataRoles);
}
