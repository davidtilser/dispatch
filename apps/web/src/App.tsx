import { useEffect, useState } from 'react';
import type { DemoDashboard } from '@dispatch/contracts';
import { Activity, ArrowUpRight, CalendarDays, Check, Clock3, DollarSign, PhoneCall, Radio, ShieldCheck, Sparkles, Users } from 'lucide-react';
import { AppHeader } from './AppHeader';
import './dashboard.css';
import { AnimatePresence, motion } from 'framer-motion';
import { AnimatedMoney, DispatchOrbit, Signal } from './MotionUI';

const money = (cents: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(cents / 100);
const time = (iso: string) => new Date(iso).toLocaleTimeString('en-US', { timeZone: 'America/Los_Angeles', hour: 'numeric', minute: '2-digit' });

export function App() {
  const [data, setData] = useState<DemoDashboard>();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function refresh() {
    const response = await fetch('/api/demo/dashboard');
    if (!response.ok) throw new Error('Dashboard unavailable. Check that the API is running.');
    setData(await response.json());
  }
  useEffect(() => {
    let mounted = true;
    async function poll() {
      try {
        const response = await fetch('/api/demo/dashboard');
        if (!response.ok) throw new Error('API unavailable');
        const value = await response.json();
        if (mounted) { setData(value); setError(''); }
      } catch { if (mounted) setError('Cannot reach the API. Start the API, then retry.'); }
    }
    void poll(); const timer = setInterval(() => void poll(), 1000);
    return () => { mounted = false; clearInterval(timer); };
  }, []);
  async function action(path: string) {
    setBusy(true); setError('');
    try {
      const response = await fetch(`/api/${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message ?? 'Request failed');
      await refresh();
    } catch (err) { setError(err instanceof Error ? err.message : 'Request failed'); }
    finally { setBusy(false); }
  }
  const cancelled = data?.bookings.filter(b => b.status === 'cancelled') ?? [];
  const recovered = data?.bookings.filter(b => b.status === 'replacement').reduce((sum,b) => sum + b.priceCents, 0) ?? 0;
  const pending = cancelled.filter(b => b.feeStatus === 'pending').reduce((sum,b) => sum + b.cancellationFeeCents, 0);
  const waived = cancelled.filter(b => b.feeStatus === 'waived').reduce((sum,b) => sum + b.cancellationFeeCents, 0);
  const inProgress = data?.run?.status === 'calling' || data?.run?.status === 'pending';
  const activeBooking = inProgress ? data?.bookings.find(b => b.id === data.run?.slotId) : undefined;
  const cancellationBlockedReason = inProgress
    ? `Another refill is active${activeBooking ? ` for ${activeBooking.customerName} at ${time(activeBooking.startsAt)}` : ''}. Complete this refill or reset the demo to cancel another appointment.`
    : undefined;

  const booked = data?.bookings.filter(b => b.status !== 'cancelled').length ?? 0;
  const waiting = data?.waitlist.filter(c => c.status === 'waiting').length ?? 0;
  const dateLabel = new Date(`${data?.date ?? '2026-09-19'}T12:00:00Z`).toLocaleDateString('en-US', {
    timeZone: 'UTC', weekday: 'long', month: 'long', day: 'numeric',
  });

  return <main className="dashboard">
    <AppHeader view="shop" onReset={() => void action('demo/reset')} resetDisabled={busy || !data} />
    <header className="shop-header">
      <div className="shop-intro">
        <span className="overview-label"><Radio size={13} aria-hidden="true" /> {data?.businessName ?? 'Apblendzz'} <span>/</span> Live workspace</span>
        <h1>Fewer empty chairs.<br /><span>More possibilities.</span></h1>
        <p>A cancellation is just the beginning. Your AI assistant finds the next customer, so every opening gets another chance.</p>
      </div>
      <DispatchOrbit active={!!inProgress} complete={data?.run?.status === 'filled'} />
      <div className="shop-counts"><span><strong>{data ? booked : '—'}</strong> active bookings</span><span><strong>{data ? waiting : '—'}</strong> on the waitlist</span><span><ShieldCheck size={14} aria-hidden="true" /> One slot. One happy customer.</span></div>
    </header>
    <div className="workspace-heading"><div><span className="eyebrow">THE BIG PICTURE</span><h2>Your day, in motion.</h2></div><div className="day-label">
      <span className="date-title"><CalendarDays size={14} aria-hidden="true" /><strong>{dateLabel}</strong></span>
      <small><i /> Live calendar · Pacific time</small>
    </div></div>

    {error && <p role="alert" className="dashboard-error">{error} <button className="quiet" onClick={() => { setError(''); void refresh().catch(() => setError('API unavailable')); }}>Retry</button></p>}

    <div className="metrics">
      <article className="revenue-metric"><div className="metric-label"><span>Recovered revenue</span><DollarSign size={17} aria-hidden="true" /></div><strong><AnimatedMoney cents={recovered} /></strong><small>From replacement bookings</small></article>
      <article><div className="metric-label"><span>Cancellation fees pending</span><Clock3 size={17} aria-hidden="true" /></div><strong className={pending ? 'pending-value' : ''}><AnimatedMoney cents={pending} /></strong><small>Until a replacement is booked</small></article>
      <article className={waived ? 'success-metric' : ''}><div className="metric-label"><span>Customer fees waived</span><ShieldCheck size={17} aria-hidden="true" /></div><strong><AnimatedMoney cents={waived} /></strong><small>No real charges or refunds</small></article>
    </div>

    <div className={`refill-banner ${data?.run?.status === 'filled' ? 'complete' : ''} ${data?.offer ? 'has-offer' : ''}`} aria-live="polite">
      <div className="agent-mark"><Signal active={!!data?.offer} /></div>
      <div className="agent-copy">
        <p className="eyebrow">Dispatch voice assistant {data?.offer && <span className="agent-state"><i />{data.offer.sessionActive ? 'In conversation' : 'Call ready'}</span>}</p>
        <h2>{data?.offer ? `${data.offer.sessionActive ? 'Speaking with' : 'Ready to call'} ${data.offer.customerName}` : data?.run?.status === 'filled' ? 'Spot filled. Customer fee waived.' : data?.run?.status === 'exhausted' ? 'Waitlist complete. No booking accepted.' : 'Turn a cancellation into a full chair.'}</h2>
        <p>{data?.offer ? `${data.offer.service} at ${data.offer.time} · Accept the browser call to begin.` : data?.run?.status === 'filled' ? 'The replacement is saved in the calendar below.' : data?.run?.status === 'exhausted' ? 'The cancellation fee stays pending. Reset to run the demo again.' : 'Cancel Chris’s 3:00 PM appointment below, then open the customer call.'}</p>
      </div>
      <a className="call-link" href="/voice" target="_blank" rel="noreferrer"><PhoneCall size={15} aria-hidden="true" />Open customer call<ArrowUpRight size={14} aria-hidden="true" /></a>
    </div>

    <ol className="recovery-steps" aria-label="Recovery progress">
      {[{ label: 'An opening appears', detail: 'Cancellation received', done: !!data?.run }, { label: 'A match is found', detail: 'Your next customer, selected', done: !!data?.offer || data?.run?.status === 'filled' }, { label: 'Everyone wins', detail: 'Chair filled. Fee waived.', done: data?.run?.status === 'filled' }].map((step, i) => <li key={step.label} className={step.done ? 'done' : ''}><span>{step.done ? <Check size={14} /> : `0${i + 1}`}</span><div><strong>{step.label}</strong><small>{step.detail}</small></div>{i < 2 && <ArrowUpRight size={16} aria-hidden="true" />}</li>)}
    </ol>
    <div className="shop-grid">
      <section className="agenda">
        <div className="section-title"><div><p className="eyebrow"><CalendarDays size={14} aria-hidden="true" />Today’s agenda</p><h2>Day’s appointments</h2></div><span className="count-pill">{data ? booked : '—'} booked</span></div>
        <p className="section-subtitle">45-minute haircuts · $45 · Cancellation fee $15</p>
        {inProgress && <div className="refill-notice" id="cancel-blocked-reason" role="status"><strong>One refill at a time</strong><p>{cancellationBlockedReason}</p><button className="cancel-button" disabled={busy} onClick={() => void action('demo/reset')}>Reset demo to start over</button><small>Reset restores all demo bookings and clears the current call.</small></div>}
        <div className="agenda-list">
          {!data && <p role="status">Loading calendar…</p>}
          <AnimatePresence initial={false}>{data?.bookings.map(b => <motion.article layout initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.97 }} transition={{ duration: 0.35 }} key={b.id} className={`appointment ${b.status}`}>
            <div className="appointment-main">
              <div className="appointment-time"><Clock3 size={17} aria-hidden="true" /><strong>{time(b.startsAt)}</strong></div>
              <div className="appointment-person"><div className="person-heading"><strong>{b.customerName}</strong><span className={`badge ${b.status}`}>{b.status === 'replacement' ? 'Refilled' : b.status === 'cancelled' ? 'Cancelled' : 'Confirmed'}</span></div><span>{b.service} · {b.durationMinutes} min · {money(b.priceCents)}</span>{b.status === 'replacement' && <small className="fee-waived"><Check size={12} aria-hidden="true" />Booked by Dispatch</small>}</div>
            </div>
            <div className="appointment-actions">
              {b.status === 'cancelled' && <div className={`fee-status ${b.feeStatus === 'waived' ? 'fee-waived' : ''}`}><strong>{b.feeStatus === 'waived' ? <ShieldCheck size={13} aria-hidden="true" /> : <Clock3 size={13} aria-hidden="true" />}{money(b.cancellationFeeCents)} fee {b.feeStatus === 'waived' ? 'waived' : 'pending'}</strong><small>{b.feeStatus === 'waived' ? 'Spot refilled from the waitlist' : 'Waived when this spot is filled'}</small></div>}
              {b.status === 'booked' && <button className="cancel-button" disabled={busy || inProgress} title={cancellationBlockedReason} aria-describedby={inProgress ? 'cancel-blocked-reason' : undefined} onClick={() => void action(`slots/${b.id}/cancel`)}>{inProgress ? 'Refill active' : busy ? 'Please wait…' : 'Cancel'}</button>}
            </div>
          </motion.article>)}</AnimatePresence>
        </div>
        <div className="calendar-note"><Sparkles size={15} aria-hidden="true" /><p>Demo tip: the 3:00 PM slot can move to 3:30 PM. A 4:00 PM start conflicts with the 4:30 PM appointment.</p></div>
      </section>

      <aside className="shop-sidebar">
        <section className="waitlist">
          <div className="section-title"><div><p className="eyebrow"><Users size={14} aria-hidden="true" />Queue order</p><h2>Live waitlist</h2></div><span className="count-pill">{data ? waiting : '—'} waiting</span></div>
          <p className="section-subtitle">Called in order. First acceptance wins.</p>
          <div className="waitlist-list">{data?.waitlist.map((c, i) => {
            const active = data.offer?.customerName === c.name;
            return <div className={`waitlist-person ${active ? 'active' : ''} ${c.status === 'booked' ? 'booked' : ''}`} key={c.id}>
              <span className="queue-number">{String(i + 1).padStart(2, '0')}</span>
              <div><strong>{c.name}</strong><small>{c.status === 'booked' ? 'Replacement booked' : active ? 'Current candidate' : `Waitlist · ${i + 1}`}</small></div>
              <span className={`queue-status ${active ? 'active' : ''} ${c.status === 'booked' ? 'booked' : ''}`}>{c.status === 'booked' ? <><Check size={11} aria-hidden="true" />Booked</> : active ? <><PhoneCall size={11} aria-hidden="true" />{data.offer?.sessionActive ? 'In call' : 'Up next'}</> : 'Waiting'}</span>
            </div>;
          })}</div>
        </section>
        <section className="activity">
          <div className="section-title"><div><p className="eyebrow"><Activity size={14} aria-hidden="true" />Behind the scenes</p><h2>Agent activity</h2></div><span className="live-pill"><i />Live</span></div>
          <div className="event-list" role="log" aria-live="polite">{data?.events.map(e => <motion.div initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} className="event" key={e.id}><span>{new Date(e.time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span><p>{e.message}</p></motion.div>)}</div>
        </section>
      </aside>
    </div>
    <footer>Hackathon demo · Local SQLite calendar, seeded clients and simulated fees · Real ElevenLabs browser audio when configured · No phone calls or payments</footer>
  </main>;
}
