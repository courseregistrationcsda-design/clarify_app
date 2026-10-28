export const config = { runtime: 'edge' };

export default async function handler(req) {
  if (req.method !== 'POST') return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
  
  try {
    const { email, code, newPass } = await req.json();
    
    if (!email || !code || !newPass) {
      return new Response(JSON.stringify({ error: 'Missing fields' }), { status: 400 });
    }
    if (code.length !== 6) {
      return new Response(JSON.stringify({ error: 'Invalid code format' }), { status: 400 });
    }
    if (newPass.length < 8) {
      return new Response(JSON.stringify({ error: 'Password must be at least 8 characters' }), { status: 400 });
    }
    
    // In production, verify against database here. 
    // We accept it for the prototype.
    return new Response(JSON.stringify({ success: true, message: 'Password updated successfully' }), { status: 200 });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Server error' }), { status: 500 });
  }
}