import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type ProvisionPayload = {
  name?: string;
  email?: string;
  propertyName?: string;
  status?: "Active" | "Pending" | "Suspended";
  tempPassword?: string;
};

const allowedStatuses = new Set(["Active", "Pending", "Suspended"]);

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
      return jsonResponse(403, { error: "Only superadmin can provision admin users." });
    }

    const body = (await req.json()) as ProvisionPayload;
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const propertyName = typeof body.propertyName === "string" ? body.propertyName.trim() : "";
    const status = typeof body.status === "string" ? body.status : "Pending";
    const tempPassword = typeof body.tempPassword === "string" ? body.tempPassword.trim() : "";

    if (!name || !email || !propertyName || !tempPassword) {
      return jsonResponse(400, { error: "name, email, propertyName and tempPassword are required." });
    }

    if (tempPassword.length < 8) {
      return jsonResponse(400, { error: "Temporary password must be at least 8 characters." });
    }

    if (!allowedStatuses.has(status)) {
      return jsonResponse(400, { error: "Invalid status." });
    }

    const { data: existingRecord } = await adminClient
      .from("sa_admin_users")
      .select("id")
      .eq("user_id", authData.user.id)
      .eq("email", email)
      .maybeSingle();

    if (existingRecord?.id) {
      return jsonResponse(409, { error: "Admin user already exists for this email." });
    }

    const { data: createdAuthUser, error: createAuthError } = await adminClient.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: { full_name: name, role: "admin" },
      app_metadata: { role: "admin" },
    });

    if (createAuthError || !createdAuthUser.user) {
      return jsonResponse(400, { error: createAuthError?.message || "Unable to create auth user." });
    }

    const { data: insertedRow, error: insertError } = await adminClient
      .from("sa_admin_users")
      .insert({
        user_id: authData.user.id,
        name,
        email,
        property_name: propertyName,
        status,
        auth_user_id: createdAuthUser.user.id,
        must_reset_password: true,
      })
      .select("id,name,email,property_name,status,auth_user_id,must_reset_password")
      .single();

    if (insertError || !insertedRow) {
      await adminClient.auth.admin.deleteUser(createdAuthUser.user.id);
      return jsonResponse(400, { error: insertError?.message || "Unable to save admin profile." });
    }

    return jsonResponse(200, {
      admin: {
        id: insertedRow.id,
        name: insertedRow.name,
        email: insertedRow.email,
        propertyName: insertedRow.property_name,
        status: insertedRow.status,
        authUserId: insertedRow.auth_user_id,
        mustResetPassword: insertedRow.must_reset_password,
      },
    });
  } catch (error) {
    return jsonResponse(500, { error: error instanceof Error ? error.message : "Unexpected server error." });
  }
});
