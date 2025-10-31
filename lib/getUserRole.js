import { supabase } from "./supabaseClient";

export async function getUserRole() {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) return null;

  // Match with your team table
  const { data: teamData } = await supabase
    .from("team")
    .select("name, role, id_number")
    .eq("email", user.email)
    .single();

  return teamData || null;
}
