/**
 * server/src/index.ts
 *
 * Entry point. Starts the HTTP server on 127.0.0.1:8787.
 * HOST is imported from config — never from env.
 */

import { createApp } from './app.js';
import { HOST, PORT, config } from './config.js';

const app = createApp();

app.listen(PORT, HOST, () => {
  console.log(`\n  GetItDone API listening on http://${HOST}:${PORT}\n`);
  if (!config.voice.enabled) {
    console.log('  ℹ  Voice disabled (no ELEVENLABS_API_KEY set). Running in silent demo mode.');
  }
});
