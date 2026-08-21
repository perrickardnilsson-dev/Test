/**
 * E-postutskick via Resend (https://resend.com). Valfritt: om RESEND_API_KEY
 * saknas skickas inget mejl och läraren kopierar inbjudningslänken manuellt.
 */

export function emailEnabled(): boolean {
  return Boolean(process.env.RESEND_API_KEY);
}

export async function sendInvitationEmail(opts: {
  to: string;
  className: string;
  inviteUrl: string;
}): Promise<{ sent: boolean; error?: string }> {
  if (!emailEnabled()) return { sent: false };

  const from =
    process.env.EMAIL_FROM ?? "NO-provplattform <onboarding@resend.dev>";

  const html = `
    <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
      <h2>Du är inbjuden till klassen ${escapeHtml(opts.className)}</h2>
      <p>
        Din lärare har bjudit in dig till NO-provplattformen. Klicka på länken
        nedan för att skapa ditt elevkonto och gå med i klassen.
      </p>
      <p style="margin: 24px 0;">
        <a href="${opts.inviteUrl}"
           style="background: #2563eb; color: #fff; padding: 12px 20px;
                  border-radius: 8px; text-decoration: none;">
          Acceptera inbjudan
        </a>
      </p>
      <p style="color: #64748b; font-size: 13px;">
        Om knappen inte fungerar, kopiera den här länken till din webbläsare:<br />
        <a href="${opts.inviteUrl}">${opts.inviteUrl}</a>
      </p>
    </div>`;

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [opts.to],
        subject: `Inbjudan till klassen ${opts.className}`,
        html,
      }),
    });
    if (!res.ok) {
      const body = await res.text();
      return { sent: false, error: `Resend svarade ${res.status}: ${body}` };
    }
    return { sent: true };
  } catch (e) {
    return {
      sent: false,
      error: e instanceof Error ? e.message : "Okänt e-postfel",
    };
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
