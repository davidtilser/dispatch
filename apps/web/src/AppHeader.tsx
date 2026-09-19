import { PhoneCall, RotateCcw, Store, UserRound } from 'lucide-react';
import './header.css';

export function AppHeader({ view, onReset, resetDisabled }: {
  view: 'shop' | 'voice';
  onReset?: () => void;
  resetDisabled?: boolean;
}) {
  return <nav className="app-header" aria-label="Main navigation">
    <a className="app-brand" href="/" aria-label="Dispatch shop dashboard">
      <img src="/dispatch-logo.png" alt="" />
      <div><div className="brand-name">Dispatch <span className="demo-pill">Demo</span></div>
        <span className="brand-tagline">Cancel free, as long as we fill your spot.</span></div>
    </a>
    <div className="header-actions">
      <div className="view-switcher">
        <a href="/client"><UserRound size={14} aria-hidden="true" /><span>Client portal</span></a>
        <a href="/" aria-current={view === 'shop' ? 'page' : undefined}><Store size={14} aria-hidden="true" /><span>Shop dashboard</span></a>
        <a href="/voice" aria-current={view === 'voice' ? 'page' : undefined}><PhoneCall size={14} aria-hidden="true" /><span>Customer call</span></a>
      </div>
      {onReset && <button className="reset-demo" aria-label="Reset demo" disabled={resetDisabled} onClick={onReset} title="Restore demo bookings and clear the current call"><RotateCcw size={14} aria-hidden="true" /><span>Reset demo</span></button>}
    </div>
  </nav>;
}
