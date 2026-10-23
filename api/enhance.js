export const config = {
  runtime: 'edge', // Opt into Vercel Edge Runtime for maximum free-tier performance
};

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: { 'Content-Type': 'application/json' } });
  }

  try {
    const { text } = await req.json();
    if (!text) {
      return new Response(JSON.stringify({ error: 'Text is required' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    if (!process.env.OPENAI_API_KEY) {
      // Free-tier local simulation fallback
      const lines = text.split(/\n|,|;/).map(s => s.trim()).filter(s => s.length > 2);
      const enhanced = lines.map(l => "- " + l.charAt(0).toUpperCase() + l.slice(1) + (l.endsWith('.') ? '' : '.')).join('\n');
      
      return new Response(JSON.stringify({ 
        enhanced: `✨ **Enhanced (Vercel Edge Fallback):**\n\n${enhanced}\n\n*(Add OPENAI_API_KEY to Vercel Env Vars for real AI)*`
      }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }

    // Call OpenAI
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: "gpt-4o-mini", // Very cheap/fast model
        messages: [
          { role: "system", content: "You are an executive assistant. Take these rough meeting notes and turn them into a polished, professional markdown bulleted list. Fix grammar, expand acronyms if obvious, and extract clear action items if implied. Do not add conversational filler. Start your response with '✨ **Enhanced Summary:**'" },
          { role: "user", content: text }
        ],
        temperature: 0.3
      })
    });

    const data = await response.json();
    return new Response(JSON.stringify({ enhanced: data.choices[0].message.content }), { 
      status: 200, 
      headers: { 'Content-Type': 'application/json' } 
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: 'Failed to process AI enhancement' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}
