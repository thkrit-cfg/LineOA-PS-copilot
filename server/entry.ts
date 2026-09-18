import { createApp } from './app';

// Vercel serverless function entry (pre-bundled to api/index.mjs by
// `npm run build:api`). Default-exporting the Express app makes Vercel
// route every request under /api/* to it.
export default createApp();
