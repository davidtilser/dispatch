import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { VoiceDemo } from './voice/VoiceDemo';
import './styles.css';

createRoot(document.getElementById('root')!).render(<StrictMode>{window.location.pathname === '/voice' ? <VoiceDemo /> : <App />}</StrictMode>);
