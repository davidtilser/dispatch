import { lazy, StrictMode, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { VoiceDemo } from './voice/VoiceDemo';
import './styles.css';
import { MotionConfig } from 'framer-motion';

const ClientPortal = lazy(() => import('./client/App'));

createRoot(document.getElementById('root')!).render(<StrictMode><MotionConfig reducedMotion="user"><Suspense fallback={<p role="status">Loading Dispatch…</p>}>{window.location.pathname === '/voice' ? <VoiceDemo /> : ['/client', '/login'].includes(window.location.pathname) ? <ClientPortal /> : <App />}</Suspense></MotionConfig></StrictMode>);
