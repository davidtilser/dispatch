import { lazy, StrictMode, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { VoiceDemo } from './voice/VoiceDemo';
import './styles.css';

const ClientPortal = lazy(() => import('./client/App'));

createRoot(document.getElementById('root')!).render(<StrictMode><Suspense fallback={<p role="status">Loading Dispatch…</p>}>{window.location.pathname === '/voice' ? <VoiceDemo /> : ['/client', '/login'].includes(window.location.pathname) ? <ClientPortal /> : <App />}</Suspense></StrictMode>);
