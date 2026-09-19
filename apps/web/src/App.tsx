import { useEffect, useState } from 'react';

export function App() {
  const [apiStatus, setApiStatus] = useState('Checking…');
  useEffect(() => {
    const controller = new AbortController();
    void fetch('/api/health', { signal: controller.signal })
      .then((response) => { if (!response.ok) throw new Error('API unavailable'); return response.json(); })
      .then(() => setApiStatus('Connected'))
      .catch(() => { if (!controller.signal.aborted) setApiStatus('Unavailable — start the API'); });
    return () => controller.abort();
  }, []);

  return <main>
    <p className="eyebrow">DISPATCH · STARTER</p>
    <h1>Cancel free, as long as we fill your spot.</h1>
    <p>TypeScript workspace ready. Dashboard, agents, and voice integration are waiting for their owners.</p>
    <p className="status">NestJS API: {apiStatus}</p>
    <section>
      <h2>Dashboard TODO</h2>
      <ul>
        <li>Import a shop from its website URL</li>
        <li>Show the mock calendar and waitlist</li>
        <li>Cancel the 3pm slot and show sequential calls</li>
        <li>Show the replacement booking and fee waiver</li>
      </ul>
    </section>
    <small>Scaffold only. No calls, bookings, crawling, or fee processing are implemented.</small>
  </main>;
}
