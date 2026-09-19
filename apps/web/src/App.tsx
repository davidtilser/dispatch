import { useEffect, useState } from 'react';
import type { DemoDashboard } from '@dispatch/contracts';
import './dashboard.css';

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
        if (mounted) setData(value);
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

  return <main className="dashboard">
    <nav className="shop-nav"><a className="wordmark" href="/">dispatch<span> / shop</span></a><div><span className="demo-label">MOCK BOOKING & CALENDAR</span><button className="quiet" disabled={busy || !data} onClick={() => void action('demo/reset')}>Reset demo ↻</button></div></nav>
    <header className="shop-header"><div><p className="eyebrow">YOUR CHAIR. ALWAYS WORKING.</p><h1>{data?.businessName ?? 'Apblendzz'}<span>Shop overview</span></h1><p>Cancel free, as long as we fill your spot.</p></div><div className="day-label"><strong>Saturday, September 19</strong><span>2026 · Pacific time · One barber</span><small><i /> Live updates every second</small></div></header>
    {error && <p role="alert" className="dashboard-error">{error} <button className="quiet" onClick={() => { setError(''); void refresh().catch(() => setError('API unavailable')); }}>Retry</button></p>}
    <div className="metrics"><article><span>Recovered revenue</span><strong>{money(recovered)}</strong><small>From replacement bookings</small></article><article><span>Cancellation fees pending</span><strong>{money(pending)}</strong><small>Until a replacement is booked</small></article><article className={waived ? 'success-metric' : ''}><span>Customer fees waived</span><strong>{money(waived)}</strong><small>No real charges or refunds</small></article></div>
    <div className={`refill-banner ${data?.run?.status === 'filled' ? 'complete' : ''}`} aria-live="polite"><div className="agent-mark">D</div><div><p className="eyebrow">DISPATCH AGENT</p><h2>{data?.offer ? `${data.offer.sessionActive ? 'Speaking with' : 'Ready to call'} ${data.offer.customerName}` : data?.run?.status === 'filled' ? 'Spot filled. Customer fee waived.' : data?.run?.status === 'exhausted' ? 'Waitlist complete. No booking accepted.' : 'Turn a cancellation into a full chair.'}</h2><p>{data?.offer ? `${data.offer.service} at ${data.offer.time} · One waitlist candidate at a time. Accept the browser call to begin.` : data?.run?.status === 'filled' ? 'The replacement is saved in the calendar below.' : data?.run?.status === 'exhausted' ? 'The cancellation fee stays pending. Reset to run the demo again.' : 'Cancel Chris’s 3:00 PM appointment below, then open the customer call.'}</p></div><a className="call-link" href="/voice" target="_blank" rel="noreferrer">Open customer call ↗</a></div>
    <div className="shop-grid"><section className="agenda"><div className="section-title"><h2>Day’s appointments</h2><span>{data?.bookings.filter(b => b.status !== 'cancelled').length ?? '—'} booked</span></div><p className="section-subtitle">45-minute haircuts · $45 · Cancellation fee $15</p>
      <div className="agenda-list">{!data && <p>Loading calendar…</p>}{data?.bookings.map(b => <article key={b.id} className={`appointment ${b.status}`}><div className="appointment-time"><strong>{time(b.startsAt)}</strong><span>{b.durationMinutes} min</span></div><div className="appointment-person"><strong>{b.customerName}</strong><span>{b.service} · {money(b.priceCents)}</span>{b.status === 'cancelled' && <small className={b.feeStatus === 'waived' ? 'fee-waived' : ''}>{money(b.cancellationFeeCents)} fee {b.feeStatus === 'waived' ? 'waived ✓' : 'pending refill'}</small>}{b.status === 'replacement' && <small className="fee-waived">Booked by Dispatch ✓</small>}</div><span className={`badge ${b.status}`}>{b.status === 'replacement' ? 'Refilled' : b.status === 'cancelled' ? 'Cancelled' : 'Confirmed'}</span>{b.status === 'booked' && <button className="cancel-button" disabled={busy || inProgress} onClick={() => void action(`slots/${b.id}/cancel`)}>Cancel</button>}</article>)}</div>
      <div className="calendar-note">Demo tip: the 3:00 PM slot can move to 3:30 PM. A 4:00 PM start conflicts with the 4:30 PM appointment.</div>
    </section><aside><section className="waitlist"><div className="section-title"><h2>Waitlist</h2><span>{data?.waitlist.filter(c => c.status === 'waiting').length ?? '—'} waiting</span></div><p className="section-subtitle">Called in order. First acceptance wins.</p>{data?.waitlist.map((c, i) => <div className="waitlist-person" key={c.id}><span className="avatar">{c.name.split(' ').map(n => n[0]).join('')}</span><div><strong>{c.name}</strong><small>{c.status === 'booked' ? 'Replacement booked' : data.offer?.customerName === c.name ? 'Current candidate' : `Waitlist · ${i + 1}`}</small></div><span className={`candidate-dot ${data.offer?.customerName === c.name ? 'active' : ''} ${c.status === 'booked' ? 'booked' : ''}`} /></div>)}</section><section className="activity"><div className="section-title"><h2>Agent activity</h2><span>Live</span></div><div className="event-list" role="log" aria-live="polite">{data?.events.map(e => <div className="event" key={e.id}><span>{new Date(e.time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span><p>{e.message}</p></div>)}</div></section></aside></div>
    <footer>Hackathon demo · Local SQLite calendar, seeded clients and simulated fees · Real ElevenLabs browser audio when configured · No phone calls or payments</footer>
  </main>;
}
