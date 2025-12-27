import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ApprovalEmailRequest {
  to: string;
  fullName: string;
  temporaryPassword: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { to, fullName, temporaryPassword }: ApprovalEmailRequest = await req.json();

    // Validate inputs
    if (!to || !fullName || !temporaryPassword) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: to, fullName, temporaryPassword" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const firstName = fullName.split(" ")[0];

    // Send email via Resend
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "ENSA Connect <noreply@votre-domaine.com>", // Remplacez par votre domaine vérifié
        to: [to],
        subject: "Bienvenue sur ENSA Connect - Votre compte a été approuvé !",
        html: `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f5;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td style="padding: 40px 20px;">
        <table role="presentation" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">

          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 40px 40px 30px;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700;">
                Bienvenue sur ENSA Connect !
              </h1>
              <p style="margin: 10px 0 0; color: rgba(255,255,255,0.9); font-size: 16px;">
                Votre demande d'adhésion a été approuvée
              </p>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <p style="margin: 0 0 20px; color: #374151; font-size: 16px; line-height: 1.6;">
                Bonjour <strong>${firstName}</strong>,
              </p>

              <p style="margin: 0 0 20px; color: #374151; font-size: 16px; line-height: 1.6;">
                Nous avons le plaisir de vous informer que votre demande d'adhésion au réseau ENSA Connect a été <strong style="color: #10b981;">approuvée</strong> !
              </p>

              <p style="margin: 0 0 20px; color: #374151; font-size: 16px; line-height: 1.6;">
                Vous pouvez maintenant vous connecter avec les identifiants suivants :
              </p>

              <!-- Credentials Box -->
              <table role="presentation" style="width: 100%; margin: 25px 0; background-color: #f9fafb; border-radius: 12px; border: 1px solid #e5e7eb;">
                <tr>
                  <td style="padding: 25px;">
                    <p style="margin: 0 0 12px; color: #6b7280; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px;">
                      Vos identifiants
                    </p>
                    <p style="margin: 0 0 8px; color: #374151; font-size: 15px;">
                      <strong>Email :</strong> ${to}
                    </p>
                    <p style="margin: 0; color: #374151; font-size: 15px;">
                      <strong>Mot de passe temporaire :</strong>
                      <code style="background-color: #fef3c7; padding: 4px 8px; border-radius: 4px; font-family: monospace; color: #92400e;">${temporaryPassword}</code>
                    </p>
                  </td>
                </tr>
              </table>

              <!-- Warning -->
              <table role="presentation" style="width: 100%; margin: 25px 0; background-color: #fef3c7; border-radius: 12px; border-left: 4px solid #f59e0b;">
                <tr>
                  <td style="padding: 20px;">
                    <p style="margin: 0; color: #92400e; font-size: 14px; line-height: 1.5;">
                      <strong>Important :</strong> Pour des raisons de sécurité, vous devrez changer ce mot de passe lors de votre première connexion.
                    </p>
                  </td>
                </tr>
              </table>

              <!-- CTA Button -->
              <table role="presentation" style="width: 100%; margin: 30px 0;">
                <tr>
                  <td style="text-align: center;">
                    <a href="https://ensa-connect.vercel.app"
                       style="display: inline-block; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 12px; font-weight: 600; font-size: 16px;">
                      Se connecter maintenant
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin: 30px 0 0; color: #6b7280; font-size: 14px; line-height: 1.6;">
                Si vous n'avez pas demandé à rejoindre ENSA Connect, veuillez ignorer cet email.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 30px 40px; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0; color: #9ca3af; font-size: 13px; text-align: center;">
                ENSA Connect - Le réseau des alumni de l'ENSA
              </p>
              <p style="margin: 10px 0 0; color: #9ca3af; font-size: 12px; text-align: center;">
                Cet email a été envoyé automatiquement, merci de ne pas y répondre.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
        `,
        tags: [
          { name: "type", value: "approval" },
          { name: "user", value: fullName },
        ],
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Resend API error:", data);
      return new Response(
        JSON.stringify({ error: data.message || "Failed to send email" }),
        { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, emailId: data.id }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error sending approval email:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
