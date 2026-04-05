import { createClient } from "@/lib/supabase/server";

export async function getActiveCompanyContext() {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { userId: null, companyId: null, error: "Not authenticated." };
  }

  const { data: membership, error: membershipError } = await supabase
    .from("company_members")
    .select("company_id")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();

  if (membershipError || !membership?.company_id) {
    return {
      userId: user.id,
      companyId: null,
      error: "No active company membership found.",
    };
  }

  return { userId: user.id, companyId: membership.company_id, error: null };
}
