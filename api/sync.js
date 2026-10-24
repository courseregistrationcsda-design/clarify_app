// Vercel Serverless Function (Node.js runtime)
// Acts as an in-memory HTTP relay to bypass strict in-app browser firewalls (like Messenger)

let cache = {};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method === 'POST') {
    const { id, meeting } = req.body;
    if (id && meeting) {
      const existing = cache[id];
      // Delta check: Only update the server if the incoming meeting has a newer timestamp
      if (!existing || (meeting.lastUpdated || 0) >= (existing.meeting.lastUpdated || 0)) {
        cache[id] = { meeting, timestamp: Date.now() };
      }
      return res.status(200).json({ success: true });
    }
    return res.status(400).json({ error: 'Missing id or meeting' });
  }

  if (req.method === 'GET') {
    const { id } = req.query;
    if (cache[id]) {
      return res.status(200).json(cache[id].meeting);
    }
    return res.status(404).json({ error: 'Meeting not found' });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
