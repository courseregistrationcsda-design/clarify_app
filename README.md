# Clarify - AI Meeting Workspace

Clarify is a serverless, real-time AI meeting workspace optimized for professionals with back-to-back meetings. It uses WebRTC for true P2P synchronization, the Web Speech API for local audio dictation, native Spatial Video Conferencing,, and OpenAI for structuring raw notes into perfect agendas.

## Deployment

Clarify is optimized for **Vercel Edge Functions**.

1. Fork or clone this repository.
2. Import the project in Vercel.
3. Add your environment variables (see below).
4. Deploy!

## Environment Variables

For production, you must set these variables in your Vercel Dashboard:

- \`OPENAI_API_KEY\`: Required for the AI Enhancement ("Magic") button and Whisper audio transcription.
- \`RESEND_API_KEY\`: Required for sending actual emails for password resets and team invites.

See \`.env.example\` for the layout.

## Documentation

For a full breakdown of the architecture, SOPs, and design rules, see \`DOCUMENTATION.md\`.


## Client Guide
Please see `CLIENT_GUIDE.md` for a comprehensive, non-technical overview of how to use the app.