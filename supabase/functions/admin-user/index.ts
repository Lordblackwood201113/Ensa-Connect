// supabase/functions/admin-user/index.ts
// Edge Function to handle admin user operations securely
// This function uses the service_role key to perform admin operations

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface InviteUserPayload {
  action: "invite";
  email: string;
  fullName: string;
  promotion: string;
  city: string;
  linkedinUrl?: string;
  requestId: string;
  reviewerId: string;
  redirectUrl: string;
}

interface DeleteUserPayload {
  action: "delete";
  userId: string;
}

type AdminPayload = InviteUserPayload | DeleteUserPayload;

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Create Supabase admin client with service_role key
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Verify the requesting user is a super_user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get the user from the JWT
    const token = authHeader.replace("Bearer ", "");
    const { data: { user: callerUser }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !callerUser) {
      return new Response(
        JSON.stringify({ error: "Invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if the caller is a super_user
    const { data: callerProfile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("is_super_user")
      .eq("id", callerUser.id)
      .single();

    if (profileError || !callerProfile?.is_super_user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized: Super user access required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse request body
    const payload: AdminPayload = await req.json();

    if (payload.action === "invite") {
      // Split full name into first and last name for user metadata
      const nameParts = payload.fullName.trim().split(" ");
      const firstName = nameParts[0];
      const lastName = nameParts.slice(1).join(" ") || nameParts[0];

      // Send invitation email using inviteUserByEmail
      // This will create the user and send them an email with a magic link
      const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(
        payload.email,
        {
          redirectTo: payload.redirectUrl,
          data: {
            full_name: payload.fullName,
            first_name: firstName,
            last_name: lastName,
            promotion: payload.promotion,
            city: payload.city,
            linkedin_url: payload.linkedinUrl || null,
            from_join_request: true,
          },
        }
      );

      if (inviteError) {
        // Check if user already exists
        if (inviteError.message?.includes("already been registered")) {
          return new Response(
            JSON.stringify({ error: "Cet email est déjà enregistré dans le système" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        return new Response(
          JSON.stringify({ error: inviteError.message }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (inviteData.user) {
        // Create the profile immediately so it's ready when user accepts invitation
        const { error: profileInsertError } = await supabaseAdmin.from("profiles").upsert({
          id: inviteData.user.id,
          first_name: firstName,
          last_name: lastName,
          email: payload.email,
          promotion: payload.promotion,
          city: payload.city,
          linkedin_url: payload.linkedinUrl || null,
          onboarding_completed: false,
          must_change_password: false, // Not needed with invitation flow
          completion_score: 30,
        });

        if (profileInsertError) {
          console.error("Profile creation error:", profileInsertError);
          // Don't rollback - the user can still complete their profile later
        }

        // Update request status
        await supabaseAdmin
          .from("join_requests")
          .update({
            status: "approved",
            reviewed_by: payload.reviewerId,
            reviewed_at: new Date().toISOString(),
          })
          .eq("id", payload.requestId);

        return new Response(
          JSON.stringify({
            success: true,
            userId: inviteData.user.id,
            message: `Invitation envoyée à ${payload.email}. L'utilisateur recevra un email pour définir son mot de passe.`,
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ error: "Erreur lors de l'envoi de l'invitation" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (payload.action === "delete") {
      const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(payload.userId);

      if (deleteError) {
        return new Response(
          JSON.stringify({ error: deleteError.message }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ success: true, message: "Utilisateur supprimé" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Invalid action" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Edge function error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
