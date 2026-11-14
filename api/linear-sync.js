export const config = {
  runtime: 'edge',
};

export default async function handler(req) {
  if (req.method !== 'POST') return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });

  try {
    const { title, description } = await req.json();
    if (!title) return new Response(JSON.stringify({ error: 'Task title required' }), { status: 400 });

    if (!process.env.LINEAR_API_KEY || !process.env.LINEAR_TEAM_ID) {
      return new Response(JSON.stringify({ 
        success: true, 
        mock: true,
        message: 'No LINEAR_API_KEY configured. Mock sync successful.'
      }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }

    // Call Linear GraphQL API
    const query = `
      mutation IssueCreate {
        issueCreate(
          input: {
            title: "${title}",
            description: "${description || 'Created via Clarify App'}",
            teamId: "${process.env.LINEAR_TEAM_ID}"
          }
        ) {
          success
          issue {
            id
            title
            url
          }
        }
      }
    `;

    const res = await fetch('https://api.linear.app/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': process.env.LINEAR_API_KEY
      },
      body: JSON.stringify({ query })
    });

    const data = await res.json();
    
    if (data.errors) {
      return new Response(JSON.stringify({ error: 'Linear API error', details: data.errors }), { status: 500 });
    }

    return new Response(JSON.stringify({ success: true, mock: false, url: data.data.issueCreate.issue.url }), { status: 200, headers: { 'Content-Type': 'application/json' } });

  } catch (error) {
    return new Response(JSON.stringify({ error: 'Failed to sync with Linear' }), { status: 500 });
  }
}
