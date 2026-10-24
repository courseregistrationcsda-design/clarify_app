export const config = {
  runtime: 'edge',
};

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: { 'Content-Type': 'application/json' } });
  }

  try {
    const { emails, teamName } = await req.json();
    if (!emails || !emails.length) return new Response(JSON.stringify({ error: 'Emails required' }), { status: 400 });

    if (!process.env.RESEND_API_KEY) {
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'No RESEND_API_KEY configured. Invites bypassed in Demo mode.'
      }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'Clarify App <onboarding@resend.dev>', // Verified domain goes here
        to: emails,
        subject: `You've been invited to join ${teamName} on Clarify`,
        html: `<div style="font-family: sans-serif; padding: 20px;">
          <h2>Team Invitation</h2>
          <p>You have been invited to collaborate in the <strong>${teamName}</strong> workspace on Clarify.</p>
          <a href="https://clarifyapp.vercel.app/" style="display:inline-block; padding:12px 24px; background:#4f46e5; color:#fff; text-decoration:none; border-radius:8px; font-weight:bold; margin-top:16px;">Go to Workspace</a>
        </div>`
      })
    });

    return new Response(JSON.stringify({ success: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });

  } catch (error) {
    return new Response(JSON.stringify({ error: 'Failed to process request' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}
