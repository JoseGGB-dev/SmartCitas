import { supabase } from "@/integrations/supabase/client";
import type { CatalogItem } from "./types";

export async function getSpecialties() {
  const { data, error } = await supabase
    .from("specialties")
    .select("id, code, name, description")
    .eq("active", true)
    .order("name");
  if (error) throw error;
  return (data ?? []) as CatalogItem[];
}

export async function getFacilities() {
  const { data, error } = await supabase
    .from("facilities")
    .select("id, code, name, description, address")
    .eq("active", true)
    .order("name");
  if (error) throw error;
  return (data ?? []) as CatalogItem[];
}
