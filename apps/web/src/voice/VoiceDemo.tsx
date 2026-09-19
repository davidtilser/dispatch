import { useEffect, useRef, useState } from 'react';
import { VoiceConversation } from '@elevenlabs/react';
import type { VoiceDemoConfiguration, VoiceDemoSession, VoiceSessionStart } from '@dispatch/contracts';
import { useRingtone } from './useRingtone';
import { AppHeader } from '../AppHeader';
import { MessagesSquare } from 'lucide-react';
import './voice.css';
import { Signal } from '../MotionUI';
import { LiveRefill } from '../refill/LiveRefill';
import { useLiveDashboard } from '../refill/useLiveDashboard';

// Long enough for a one-line goodbye, short enough that the demo never stalls.
const GOODBYE_MS = 8000;

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
  const dashboard = useLiveDashboard();
  const previousRun = useRef<string | null>(null);
  const [config, setConfig] = useState<VoiceDemoConfiguration>();
  const [session, setSession] = useState<VoiceDemoSession>();
  const [status, setStatus] = useState<'disconnected' | 'connecting' | 'connected' | 'disconnecting'>('disconnected');
  const [speaking, setSpeaking] = useState(false);
  const [muted, setMuted] = useState(false);
  const [error, setError] = useState('');
  const [messages, setMessages] = useState<{ role: string; text: string }[]>([]);
  const [answeredOffer, setAnsweredOffer] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const connection = useRef<VoiceConversation | null>(null);
  const current = useRef<{ id?: string; cancelled: boolean } | null>(null);
  const busy = useRef(false);
  const hangup = useRef<ReturnType<typeof setTimeout> | null>(null);
  const incomingOffer = status === 'disconnected' && config?.configured && !config.callActive
    && config.attemptId !== answeredOffer ? config?.attemptId ?? null : null;
  const ringtone = useRingtone(incomingOffer);

  useEffect(() => {
    if (!dashboard.data) return;
    const runId = dashboard.data.run?.id ?? null;
    if (previousRun.current && previousRun.current !== runId) {
      setMessages([]); setSession(undefined); setAnsweredOffer(null); setElapsed(0); setError('');
      if (hangup.current) { clearTimeout(hangup.current); hangup.current = null; }
      if (current.current) current.current.cancelled = true;
      void connection.current?.endSession();
      connection.current = null; busy.current = false; setStatus('disconnected');
    }
    previousRun.current = runId;
  }, [dashboard.data]);

  useEffect(() => {
    if (status !== 'connected') return;
    const started = Date.now(); setElapsed(0);
    const timer = setInterval(() => setElapsed(Math.floor((Date.now() - started) / 1000)), 1000);
    return () => clearInterval(timer);
  }, [status]);

  useEffect(() => {
    let mounted = true;
    const refresh = () => void api<VoiceDemoConfiguration>('config').then((value) => { if (mounted) setConfig(value); })
      .catch((err: Error) => { if (mounted) setError(err.message); });
    refresh();
    const timer = setInterval(refresh, 1000);
    return () => {
      mounted = false; clearInterval(timer);
      if (hangup.current) clearTimeout(hangup.current);
      if (current.current) current.current.cancelled = true;
      void connection.current?.endSession();
      if (current.current?.id) void api(`sessions/${current.current.id}/end`, { reason: 'ended' }).catch(() => {});
    };
  }, []);

  useEffect(() => {
    if (status === 'disconnected') setSession(undefined);
  }, [config?.attemptId]);

  useEffect(() => {
    const close = () => {
      const id = current.current?.id;
      if (id) navigator.sendBeacon(`/api/voice/sessions/${id}/end`, new Blob([JSON.stringify({ reason: 'ended' })], { type: 'application/json' }));
    };
    window.addEventListener('pagehide', close);
    return () => window.removeEventListener('pagehide', close);
  }, []);

  useEffect(() => {
    if (!session?.id || status !== 'connected') return;
    const timer = setInterval(() => {
      void api<VoiceDemoSession>(`sessions/${session.id}`).catch(() => {
        setError('The demo was reset or the API is unavailable. Ending this call.');
        void connection.current?.endSession();
      });
    }, 2000);
    return () => clearInterval(timer);
  }, [session?.id, status]);

  async function start() {
    if (busy.current || connection.current) return;
    ringtone.stop();
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
      const prepared = await api<VoiceSessionStart>('sessions', { attemptId: config?.attemptId });
      attempt.id = prepared.session.id;
      setAnsweredOffer(config?.attemptId ?? null);
      if (!isCurrent()) { await api(`sessions/${attempt.id}/end`, { reason: 'ended' }); return; }
      setSession(prepared.session);

      async function tool(action: string, parameters: Record<string, unknown>) {
        try {
          if (!isCurrent()) return JSON.stringify({ ok: false, message: 'The call ended.' });
          const result = await api<VoiceDemoSession | Record<string, unknown>>(`sessions/${attempt.id}/${action}`, parameters);
          if ('status' in result && isCurrent()) setSession(result as VoiceDemoSession);
          // The agent should say goodbye and call end_call itself. This is the backstop so a
          // booked or declined call always hangs up, even if it keeps talking instead.
          if ((result.status === 'accepted' || result.status === 'alternative_booked' || result.status === 'declined') && isCurrent() && !hangup.current) {
            hangup.current = setTimeout(() => {
              if (isCurrent() && !attempt.closed) void end();
            }, GOODBYE_MS);
          }
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
          if (hangup.current) { clearTimeout(hangup.current); hangup.current = null; }
          setStatus('disconnecting');
          void api<VoiceDemoSession>(`sessions/${attempt.id}/end`, { reason: details.reason === 'error' ? 'failed' : 'ended' })
            .then((value) => { if (isCurrent()) setSession(value); })
            .catch((err: Error) => { if (isCurrent()) setError(err.message); })
            .finally(() => { if (isCurrent()) { busy.current = false; setStatus('disconnected'); } });
        },
      });
      if (!isCurrent()) { await connected.endSession(); return; }
      // The provider can disconnect while startSession is resolving.
      if (!attempt.closed) {
        connection.current = connected; busy.current = false;
        if (prepared.session.managerBrief) connected.sendContextualUpdate(`The Dispatch manager prepared this call brief for the selected waitlist customer: ${JSON.stringify(prepared.session.managerBrief)}. Use booking tools to verify availability and confirm any booking.`);
      }
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

  const context = status !== 'disconnected' ? session?.context ?? config?.context : config?.context ?? session?.context;
  return <main className="voice-demo">
    <AppHeader view="voice" />
    <header><p className="eyebrow">ONE OPEN SLOT. ONE CONVERSATION.</p>
      <h1>A voice. <span>A new possibility.</span></h1>
      <p>You are the waitlist customer. Talk to Dispatch in English, agree to a time, or decline the offer.</p>
    </header>

    {!config && !error && <p role="status">Checking voice setup…</p>}
    {config && !config.attemptId && !dashboard.data?.run && <aside className="setup-note">Cancel an appointment on the <a href="/" target="_blank" rel="noreferrer">shop dashboard</a> to prepare a waitlist call. This page updates automatically.</aside>}
    {config && !config.configured && <aside className="setup-note">
      <strong>Connect ElevenLabs to start</strong>
      <p>Set <code>ELEVENLABS_API_KEY</code> in your root <code>.env</code>, run <code>npm run voice:setup</code>, then restart the API and reload this page.</p>
      <small>Missing: {config.missing.join(', ')}</small>
    </aside>}
    {error && <p className="voice-error" role="alert">{error}</p>}

    {dashboard.error && <p role="alert" className="voice-error">{dashboard.error}</p>}
    <div className="voice-grid">
      <div className="voice-call-column">
      <section className={`call-card ${incomingOffer ? 'incoming-call' : ''}`}>
        <div className="call-topline"><span className="call-status" role="status">{incomingOffer ? 'Incoming call' : status === 'connected' ? 'Connected' : status === 'connecting' ? 'Connecting' : status === 'disconnecting' ? 'Ending call' : 'Ready when you are'}</span><button className="ringtone-toggle" onClick={() => ringtone.enabled ? ringtone.disable() : void ringtone.enable()} aria-pressed={ringtone.enabled}>{ringtone.enabled ? '♫ Ringtone on' : '♫ Enable ringtone'}</button></div>
        <div className="caller-portrait" aria-hidden="true"><span className="ring-wave wave-one" /><span className="ring-wave wave-two" /><div className={`voice-orb ${status === 'connected' ? 'live' : ''} ${speaking ? 'speaking' : ''}`}><Signal active={status === 'connected' && speaking} /></div><span className="caller-phone"><PhoneIcon /></span></div>
        <p className="caller-label">DISPATCH · AI BOOKING ASSISTANT</p>
        <h2 className="caller-name">{context?.businessName ?? 'Dispatch'}</h2>
        <p className="caller-detail" aria-live="polite">{incomingOffer ? `Calling ${context?.customerName ?? 'you'} about an open appointment` : status === 'connected' ? (speaking ? 'Dispatch is speaking…' : muted ? 'Microphone muted' : `Listening to ${session?.context.customerName ?? 'you'}…`) : status === 'connecting' ? 'Opening your secure audio connection…' : status === 'disconnecting' ? 'Finishing your call…' : config?.callActive ? 'A call is open in another window' : 'Your next appointment starts with a conversation.'}</p>
        {status === 'connected' ? <div className="call-duration"><span className="connection-dot" />{String(Math.floor(elapsed / 60)).padStart(2, '0')}:{String(elapsed % 60).padStart(2, '0')}</div> : <div className="call-duration">{incomingOffer ? 'WEB AUDIO CALL' : 'BROWSER AUDIO · NO PHONE NUMBER NEEDED'}</div>}
        {context && <p className="refill-call-context">{context.service} · {context.price} · {context.date}<br />Offered {context.offeredTime} · {context.timezone}{context.discount && <><br />{context.discount}</>}</p>}
        <div className="call-actions">
          {status === 'disconnected' ? <>
            {incomingOffer && <button className="silence-call" disabled={!ringtone.ringing} onClick={ringtone.silence}>Silence</button>}
            <button className={`answer-call ${incomingOffer ? 'answer-ringing' : ''}`} disabled={!config?.configured || !config?.attemptId || config.callActive || config.attemptId === answeredOffer} onClick={() => void start()}><PhoneIcon />{incomingOffer ? `Answer · ${config?.context?.customerName.split(' ')[0] ?? 'You'}` : config?.callActive ? 'Call already open' : 'Waiting for a call'}</button>
          </> : <>
            <button className="secondary" disabled={status !== 'connected'} onClick={toggleMute}>{muted ? 'Unmute' : 'Mute'}</button>
            <button className="end-call" disabled={status !== 'connected'} onClick={() => void end()}>End call</button>
          </>}
        </div>
        <small>{ringtone.audioError || (!ringtone.enabled && status === 'disconnected' ? 'Enable ringtone once to hear incoming calls in this tab.' : 'Use headphones for the clearest conversation.')}</small>
        {session?.booking && <div className="booking-result" role="status"><strong>Booked for {session.booking.spokenDate ?? session.booking.date ?? session.context.date} at {session.booking.time}</strong>{session.status === 'alternative_booked' && <p>Separate appointment saved. The original opening remains available.</p>}</div>}
      </section>

    <section className="transcript-card"><p className="eyebrow"><MessagesSquare size={14} aria-hidden="true" />Live transcript</p><h2>Conversation</h2>
      <div className="transcript" role="log" aria-live="polite">
        {messages.length ? messages.map((item, index) => <p key={index}><strong>{item.role === 'agent' ? 'Dispatch' : 'You'}</strong><span>{item.text}</span></p>) : <p className="empty-transcript">The live transcript will appear here.</p>}
      </div>
    </section>
      </div>
      {dashboard.data && <LiveRefill data={dashboard.data} layout="voice" />}
    </div>

    <footer>Real ElevenLabs voice · Simulated booking · No Twilio</footer>
  </main>;
}

function PhoneIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6 19.8 19.8 0 0 1-3.1-8.7A2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 2 .7 2.9a2 2 0 0 1-.5 2.1L8 10a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.5c.9.3 1.9.6 2.9.7a2 2 0 0 1 1.7 2Z" /></svg>;
}
