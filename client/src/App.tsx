import { useEffect, useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';
import type { HealthResponse } from '@getitdone/shared';

type ConnectionStatus = 'checking' | 'connected' | 'error';

function HomePage() {
  const [status, setStatus] = useState<ConnectionStatus>('checking');

  useEffect(() => {
    const controller = new AbortController();

    void fetch('/api/health', { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error('Non-OK response');
        return res.json() as Promise<HealthResponse>;
      })
      .then((data) => {
        if (data.ok) setStatus('connected');
        else setStatus('error');
      })
      .catch(() => {
        if (!controller.signal.aborted) setStatus('error');
      });

    return () => controller.abort();
  }, []);

  const statusConfig = {
    checking: {
      icon: <Loader2 className="animate-spin text-slate-400" size={20} />,
      label: 'Checking server…',
      color: 'text-slate-500',
    },
    connected: {
      icon: <CheckCircle className="text-emerald-500" size={20} />,
      label: 'Server connected',
      color: 'text-emerald-600',
    },
    error: {
      icon: <XCircle className="text-red-500" size={20} />,
      label: 'Server unavailable — run npm run dev',
      color: 'text-red-600',
    },
  } as const;

  const current = statusConfig[status];

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="max-w-lg w-full bg-white rounded-2xl shadow-sm border border-slate-200 p-10"
      >
        {/* Eyebrow */}
        <p className="text-xs font-bold tracking-widest text-slate-400 uppercase mb-4">
          GetItDone · Milestone 1
        </p>

        {/* Headline */}
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900 mb-3">
          Cancel free, as long as we fill your spot.
        </h1>

        <p className="text-slate-500 text-sm leading-relaxed mb-8">
          Scaffold and security baseline. Server is running on{' '}
          <code className="font-mono bg-slate-100 px-1 rounded text-slate-700">
            127.0.0.1:8787
          </code>
          , Vite on{' '}
          <code className="font-mono bg-slate-100 px-1 rounded text-slate-700">
            127.0.0.1:5173
          </code>
          .
        </p>

        {/* Status pill */}
        <div className="flex items-center gap-2 px-4 py-3 bg-slate-50 rounded-xl border border-slate-100">
          {current.icon}
          <span className={`text-sm font-medium ${current.color}`}>
            {current.label}
          </span>
        </div>
      </motion.div>
    </main>
  );
}

export function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      {/* Future milestone routes go here */}
    </Routes>
  );
}
