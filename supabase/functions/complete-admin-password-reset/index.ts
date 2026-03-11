import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const jsonResponse = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse(405, { error: "Method not allowed." });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceRoleKey) {
      return jsonResponse(500, { error: "Supabase environment is not configured." });
    }

    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice("Bearer ".length) : "";
    if (!token) {
      return jsonResponse(401, { error: "Missing bearer token." });
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
    const { data: authData, error: authError } = await adminClient.auth.getUser(token);
    if (authError || !authData.user) {
      return jsonResponse(401, { error: "Invalid session." });
    }

    const { error: updateError } = await adminClient
      .from("sa_admin_users")
      .update({ must_reset_password: false, updated_at: new Date().toISOString() })
      .eq("auth_user_id", authData.user.id);

    if (updateError) {
      return jsonResponse(400, { error: updateError.message });
    }

    return jsonResponse(200, { success: true });
  } catch (error) {
    return jsonResponse(500, { error: error instanceof Error ? error.message : "Unexpected server error." });
  }
});
