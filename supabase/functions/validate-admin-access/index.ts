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

const isSuperadminUser = (user: { email?: string | null; user_metadata?: Record<string, unknown>; app_metadata?: Record<string, unknown> }) => {
  const roleFromUserMeta = typeof user.user_metadata?.role === "string" ? user.user_metadata.role.toLowerCase() : "";
  const roleFromAppMeta = typeof user.app_metadata?.role === "string" ? user.app_metadata.role.toLowerCase() : "";
  const email = typeof user.email === "string" ? user.email.toLowerCase() : "";
  return roleFromUserMeta === "superadmin" || roleFromAppMeta === "superadmin" || email === "superadmin@room.com";
};

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

    if (isSuperadminUser(authData.user)) {
      return jsonResponse(200, { authorized: true, mustResetPassword: false });
    }

    const { data: adminRow, error: adminRowError } = await adminClient
      .from("sa_admin_users")
      .select("status,must_reset_password")
      .eq("auth_user_id", authData.user.id)
      .maybeSingle();

    if (adminRowError) {
      return jsonResponse(400, { error: adminRowError.message });
    }

    if (!adminRow) {
      return jsonResponse(200, { authorized: false, reason: "Admin account is not provisioned by superadmin." });
    }

    if (adminRow.status !== "Active") {
      return jsonResponse(200, {
        authorized: false,
        reason: `Admin access is ${String(adminRow.status).toLowerCase()}. Please contact superadmin.`,
      });
    }

    return jsonResponse(200, {
      authorized: true,
      mustResetPassword: Boolean(adminRow.must_reset_password),
    });
  } catch (error) {
    return jsonResponse(500, { error: error instanceof Error ? error.message : "Unexpected server error." });
  }
});
