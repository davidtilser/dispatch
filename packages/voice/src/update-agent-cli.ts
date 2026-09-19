import { ElevenLabsClient } from '@elevenlabs/elevenlabs-js';
import { enableAutomaticHangup, inspectCalendarTools } from './update-agent.js';

const apiKey = process.env.ELEVENLABS_API_KEY;
const agentId = process.env.ELEVENLABS_AGENT_ID;
if (!apiKey || !agentId) {
  console.error('Set ELEVENLABS_API_KEY and ELEVENLABS_AGENT_ID in .env first.');
  process.exitCode = 1;
} else {
  try {
    if (process.argv.includes('--inspect')) {
      await inspectCalendarTools(new ElevenLabsClient({ apiKey }), agentId);
      console.log('Configured agent verified: attached calendar client tools are compatible and not shared with another agent. No configuration changed.');
    } else {
    await enableAutomaticHangup(new ElevenLabsClient({ apiKey }), agentId);
    console.log('Existing ElevenLabs agent updated and verified: calendar search across demo days, exact-date booking, approved discounts and automatic hangup enabled. Start a new call to use it.');
    }
  } catch {
    console.error('Could not update voice agent. Check ElevenLabs agent read/write permissions and network, then retry.');
    process.exitCode = 1;
  }
}
