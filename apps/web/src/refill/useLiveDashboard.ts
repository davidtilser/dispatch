import { useEffect, useState } from 'react';
import type { DemoDashboard } from '@dispatch/contracts';

// The voice page observes the same backend snapshots as the shop dashboard.
export function useLiveDashboard() {
  const [data, setData] = useState<DemoDashboard>();
  const [error, setError] = useState('');
  useEffect(() => {
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout>;
    const poll = async () => {
      try {
        const response = await fetch('/api/demo/dashboard', { signal: controller.signal });
        if (!response.ok) throw new Error('Shared calendar unavailable');
        const value: DemoDashboard = await response.json();
        if (!controller.signal.aborted) { setData(value); setError(''); }
      } catch {
        if (!controller.signal.aborted) setError('Shared calendar unavailable. Updates will resume when the API reconnects.');
      } finally {
        if (!controller.signal.aborted) timer = setTimeout(() => void poll(), 1000);
      }
    };
    void poll();
    return () => { controller.abort(); clearTimeout(timer); };
  }, []);
  return { data, error };
}
