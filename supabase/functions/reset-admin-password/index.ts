import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type ResetPayload = {
  adminId?: string;
  tempPassword?: string;
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

    if (!isSuperadminUser(authData.user)) {
      return jsonResponse(403, { error: "Only superadmin can reset admin passwords." });
    }

    const body = (await req.json()) as ResetPayload;
    const adminId = typeof body.adminId === "string" ? body.adminId.trim() : "";
    const tempPassword = typeof body.tempPassword === "string" ? body.tempPassword.trim() : "";

    if (!adminId || !tempPassword) {
      return jsonResponse(400, { error: "adminId and tempPassword are required." });
    }

    if (tempPassword.length < 8) {
      return jsonResponse(400, { error: "Temporary password must be at least 8 characters." });
    }

    const { data: adminRow, error: adminLookupError } = await adminClient
      .from("sa_admin_users")
      .select("id,auth_user_id")
      .eq("id", adminId)
      .eq("user_id", authData.user.id)
      .maybeSingle();

    if (adminLookupError) {
      return jsonResponse(400, { error: adminLookupError.message });
    }

    if (!adminRow?.auth_user_id) {
      return jsonResponse(404, { error: "Admin auth account not found." });
    }

    const { error: updateAuthError } = await adminClient.auth.admin.updateUserById(adminRow.auth_user_id, {
      password: tempPassword,
      user_metadata: { role: "admin" },
      app_metadata: { role: "admin" },
    });

    if (updateAuthError) {
      return jsonResponse(400, { error: updateAuthError.message || "Unable to reset password." });
    }

    const { error: updateProfileError } = await adminClient
      .from("sa_admin_users")
      .update({ must_reset_password: true, updated_at: new Date().toISOString() })
      .eq("id", adminId)
      .eq("user_id", authData.user.id);

    if (updateProfileError) {
      return jsonResponse(400, { error: updateProfileError.message || "Unable to update admin profile." });
    }

    return jsonResponse(200, { success: true });
  } catch (error) {
    return jsonResponse(500, { error: error instanceof Error ? error.message : "Unexpected server error." });
  }
});
