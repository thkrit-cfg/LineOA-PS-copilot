import { createApp } from './_lib/app';

// Vercel serverless function entry.
// The `@vercel/node` build bundles this file; default-exporting the Express
// app makes Vercel route every request under /api/* to it.
export default createApp();
