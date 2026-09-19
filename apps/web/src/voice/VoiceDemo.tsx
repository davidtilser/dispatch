import { useEffect, useRef, useState } from 'react';
import { VoiceConversation } from '@elevenlabs/react';
import type { VoiceDemoConfiguration, VoiceDemoSession, VoiceSessionStart } from '@dispatch/contracts';
import './voice.css';

async function api<T>(path: string, body?: unknown): Promise<T> {
  const response = await fetch(`/api/voice/${path}`, {
    method: body === undefined ? 'GET' : 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(20_000),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(typeof result.message === 'string' ? result.message : 'Request failed. Try again.');
  return result as T;
}

export function VoiceDemo() {
  const [config, setConfig] = useState<VoiceDemoConfiguration>();
  const [session, setSession] = useState<VoiceDemoSession>();
  const [status, setStatus] = useState<'disconnected' | 'connecting' | 'connected' | 'disconnecting'>('disconnected');
  const [speaking, setSpeaking] = useState(false);
  const [muted, setMuted] = useState(false);
  const [error, setError] = useState('');
  const [messages, setMessages] = useState<{ role: string; text: string }[]>([]);
  const connection = useRef<VoiceConversation | null>(null);
  const current = useRef<{ id?: string; cancelled: boolean } | null>(null);
  const busy = useRef(false);

  useEffect(() => {
    let mounted = true;
    void api<VoiceDemoConfiguration>('config').then((value) => { if (mounted) setConfig(value); })
      .catch((err: Error) => { if (mounted) setError(err.message); });
    return () => {
      mounted = false;
      if (current.current) current.current.cancelled = true;
      void connection.current?.endSession();
      if (current.current?.id) void api(`sessions/${current.current.id}/end`, { reason: 'ended' }).catch(() => {});
    };
  }, []);

  async function start() {
    if (busy.current || connection.current) return;
    busy.current = true;
    const attempt = { id: undefined as string | undefined, cancelled: false, closed: false };
    current.current = attempt;
    setError(''); setMessages([]); setSession(undefined); setMuted(false); setStatus('connecting');
    const isCurrent = () => current.current === attempt && !attempt.cancelled;
    try {
      if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
        throw new Error('Microphone access needs localhost or HTTPS. On a phone, open an HTTPS demo URL.');
      }
      // Ask for permission before allocating an ElevenLabs session. Release this
      // preflight stream; the SDK owns and cleans up its own microphone stream.
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((track) => track.stop());
      if (!isCurrent()) return;
      const prepared = await api<VoiceSessionStart>('sessions', {});
      attempt.id = prepared.session.id;
      if (!isCurrent()) { await api(`sessions/${attempt.id}/end`, { reason: 'ended' }); return; }
      setSession(prepared.session);

      async function tool(action: string, parameters: Record<string, unknown>) {
        try {
          if (!isCurrent()) return JSON.stringify({ ok: false, message: 'The call ended.' });
          const result = await api<VoiceDemoSession | Record<string, unknown>>(`sessions/${attempt.id}/${action}`, parameters);
          if ('status' in result && isCurrent()) setSession(result as VoiceDemoSession);
          return JSON.stringify({ ok: true, ...result });
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Could not complete the request';
          if (isCurrent()) setError(message);
          return JSON.stringify({ ok: false, message });
        }
      }

      const connected = await VoiceConversation.startSession({
        conversationToken: prepared.conversationToken,
        connectionType: 'webrtc',
        dynamicVariables: prepared.dynamicVariables,
        clientTools: {
          check_availability: (parameters) => tool('check-availability', parameters),
          accept_slot: (parameters) => tool('accept', parameters),
          decline_slot: () => tool('decline', {}),
        },
        onConnect: () => { if (isCurrent()) setStatus('connected'); },
        onModeChange: ({ mode }) => { if (isCurrent()) setSpeaking(mode === 'speaking'); },
        onMessage: ({ role, message }) => {
          if (isCurrent()) setMessages((items) => [...items, { role, text: message }].slice(-100));
        },
        onError: () => { if (isCurrent()) setError('The voice connection failed. Check your network and ElevenLabs configuration, then retry.'); },
        onDisconnect: (details) => {
          if (!isCurrent()) return;
          attempt.closed = true;
          connection.current = null;
          setStatus('disconnecting');
          void api<VoiceDemoSession>(`sessions/${attempt.id}/end`, { reason: details.reason === 'error' ? 'failed' : 'ended' })
            .then((value) => { if (isCurrent()) setSession(value); })
            .catch((err: Error) => { if (isCurrent()) setError(err.message); })
            .finally(() => { if (isCurrent()) { busy.current = false; setStatus('disconnected'); } });
        },
      });
      if (!isCurrent()) { await connected.endSession(); return; }
      // The provider can disconnect while startSession is resolving.
      if (!attempt.closed) { connection.current = connected; busy.current = false; }
    } catch (err) {
      if (attempt.id) {
        await api<VoiceDemoSession>(`sessions/${attempt.id}/end`, { reason: 'failed' })
          .then((value) => { if (isCurrent()) setSession(value); }).catch(() => {});
      }
      if (isCurrent()) {
        const message = err instanceof Error ? err.message : 'Could not start the call';
        setError(err instanceof DOMException && err.name === 'NotAllowedError' ? 'Microphone permission was denied. Allow microphone access and try again.' : message);
        busy.current = false; setStatus('disconnected');
      }
    }
  }

  async function end() {
    if (!connection.current) return;
    setStatus('disconnecting'); busy.current = true;
    try { await connection.current.endSession(); }
    catch { setError('Could not close the call. Reload this page.'); busy.current = false; }
  }

  function toggleMute() {
    connection.current?.setMicMuted(!muted);
    setMuted(!muted);
  }

  const context = session?.context ?? config?.context;
  return <main className="voice-demo">
    <nav><a href="/">← Dispatch</a><span>LIVE VOICE LAB</span></nav>
    <header><p className="eyebrow">ONE OPEN SLOT. ONE CONVERSATION.</p>
      <h1>Let’s fill that spot.</h1>
      <p>Talk to Dispatch in English. Ask for 3:30, accept the appointment, or say no.</p>
    </header>

    {!config && !error && <p role="status">Checking voice setup…</p>}
    {config && !config.configured && <aside className="setup-note">
      <strong>Connect ElevenLabs to start</strong>
      <p>Set <code>ELEVENLABS_API_KEY</code> in your root <code>.env</code>, run <code>npm run voice:setup</code>, then restart the API and reload this page.</p>
      <small>Missing: {config.missing.join(', ')}</small>
    </aside>}
    {error && <p className="voice-error" role="alert">{error}</p>}

    <div className="voice-grid">
      <section className="call-card">
        <div className={`voice-orb ${status === 'connected' ? 'live' : ''} ${speaking ? 'speaking' : ''}`} aria-hidden="true">D</div>
        <h2>{status === 'connected' ? (speaking ? 'Dispatch is speaking' : 'Your turn, Jordan') : status === 'connecting' ? 'Connecting…' : status === 'disconnecting' ? 'Ending call…' : 'Your appointment is calling'}</h2>
        <p aria-live="polite">{status === 'connected' ? (muted ? 'Microphone muted' : 'Microphone on · Live AI conversation') : 'Browser audio · No phone number needed'}</p>
        <div className="call-actions">
          {status === 'disconnected' ? <button disabled={!config?.configured} onClick={() => void start()}>{session ? 'Start another demo' : 'Accept web call'}</button> : <>
            <button className="secondary" disabled={status !== 'connected'} onClick={toggleMute}>{muted ? 'Unmute' : 'Mute'}</button>
            <button className="end-call" disabled={status !== 'connected'} onClick={() => void end()}>End call</button>
          </>}
        </div>
        <small>Use headphones to avoid speaker echo.</small>
      </section>

      <section className="booking-card">
        <p className="eyebrow">MOCK CALENDAR</p><h2>{context?.businessName ?? 'Apblendzz'}</h2>
        {context && <><p>{context.service} · {context.price} · {context.date}</p><p>Offered: <strong>3:00 PM</strong><br />Alternatives: 3:30 PM or 4:00 PM<br /><small>{context.timezone}</small></p></>}
        <div className={`booking-result ${session?.feeWaived ? 'filled' : ''}`} aria-live="polite">
          <strong>{session?.booking ? `Booked for ${session.booking.time}` : session?.status === 'declined' ? 'Offer declined' : session?.status === 'ended' || session?.status === 'failed' ? 'Call ended without a booking' : 'Waiting for an acceptance'}</strong>
          <p>Cancellation fee: <b>{session?.feeWaived ? 'Waived' : 'Pending'}</b></p>
        </div>
        <small>Each call starts a separate demo slot. Calendar, waitlist and fee changes are simulated.</small>
      </section>
    </div>

    <section className="transcript-card"><h2>Conversation</h2>
      <div className="transcript" role="log" aria-live="polite">
        {messages.length ? messages.map((item, index) => <p key={index}><strong>{item.role === 'agent' ? 'Dispatch' : 'You'}</strong><span>{item.text}</span></p>) : <p className="empty-transcript">The live transcript will appear here.</p>}
      </div>
    </section>
    <footer>Real ElevenLabs voice · Simulated booking · No Twilio</footer>
  </main>;
}
