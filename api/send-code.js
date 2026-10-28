export const config = {
  runtime: 'edge',
};

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: { 'Content-Type': 'application/json' } });
  }

  try {
    const { email } = await req.json();
    if (!email) return new Response(JSON.stringify({ error: 'Email required' }), { status: 400 });

    const code = Math.floor(100000 + Math.random() * 900000).toString();

    if (!process.env.RESEND_API_KEY) {
      return new Response(JSON.stringify({ error: 'RESEND_API_KEY is missing from Vercel Environment Variables.' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'Clarify App <onboarding@resend.dev>', // Update this to your verified domain (e.g. notifications@yourdomain.com) if deploying to production
        to: email,
        subject: 'Your Clarify Password Reset Code',
        html: `<div style="font-family: sans-serif; padding: 20px;">
          <h2>Reset your password</h2>
          <p>Your 6-digit reset code is:</p>
          <h1 style="letter-spacing: 4px; color: #4f46e5;">${code}</h1>
          <p>If you didn't request this, you can ignore this email.</p>
        </div>`
      })
    });

    if (!res.ok) {
      const errorData = await res.json();
      return new Response(JSON.stringify({ error: 'Failed to send email. Check Resend domain verification.', details: errorData }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }

    // Return the code to the frontend for local validation
    return new Response(JSON.stringify({ success: true }), { 
      status: 200, headers: { 'Content-Type': 'application/json' } 
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}
