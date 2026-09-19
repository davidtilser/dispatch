import { useRef, useState, type FormEvent } from 'react';
import { ArrowLeft, ArrowRight, Check, ExternalLink, Globe, LoaderCircle, Store, X } from 'lucide-react';
import type { BusinessImportPreview, DemoBusinessSetup } from '@dispatch/contracts';
import './business-setup.css';

const example = 'https://www.thecuttingroomsf.com/';
async function post<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(`/api/${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: AbortSignal.timeout(45000) });
  const data = await response.json();
  if (!response.ok) throw new Error(typeof data.message === 'string' ? data.message : 'Could not save these details. Please try again.');
  return data;
}

export function BusinessSetup({ disabled, onActivated }: { disabled: boolean; onActivated: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [url, setUrl] = useState(example);
  const [preview, setPreview] = useState<BusinessImportPreview>();
  const [name, setName] = useState('');
  const [service, setService] = useState('');
  const [price, setPrice] = useState('');
  const [duration, setDuration] = useState('45');
  const [busy, setBusy] = useState<'reading' | 'saving' | null>(null);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState<DemoBusinessSetup>();

  function selectService(item: BusinessImportPreview['services'][number]) {
    setService(item.name); setPrice(item.priceCents === undefined ? '' : String(item.priceCents / 100));
    setDuration(String(item.durationMinutes ?? 45));
  }
  async function load(event: FormEvent) {
    event.preventDefault(); setError(''); setBusy('reading');
    try {
      const value = await post<BusinessImportPreview>('business/preview', { url: url.trim() });
      setPreview(value); setName(value.name); selectService(value.services[0] ?? { name: '' });
    } catch (err) { setError(err instanceof Error ? err.message : 'Website could not be read.'); }
    finally { setBusy(null); }
  }
  async function activate(event: FormEvent) {
    event.preventDefault(); setError(''); setBusy('saving');
    try {
      const value = await post<DemoBusinessSetup>('demo/business', { name, website: preview!.website,
        service: { name: service, priceCents: Math.round(Number(price) * 100), durationMinutes: Number(duration) } });
      setSaved(value); onActivated();
    } catch (err) { setError(err instanceof Error ? err.message : 'Could not activate business.'); }
    finally { setBusy(null); }
  }
  function open() { setSaved(undefined); setPreview(undefined); setError(''); dialog.current?.showModal(); }

  return <>
    <button className="business-setup-trigger" onClick={open} disabled={disabled} title={disabled ? 'Finish or reset the current refill before setting up a business.' : 'Import your business from its website'}><Globe size={14} />Set up your business<ArrowRight size={14} /></button>
    <dialog ref={dialog} className="business-setup-dialog" aria-labelledby="business-setup-title" onCancel={event => { if (busy) event.preventDefault(); }}>
      <div className="business-setup-top"><span><Store size={16} /> YOUR BUSINESS, ON DISPATCH</span><button type="button" aria-label="Close business setup" onClick={() => dialog.current?.close()} disabled={!!busy}><X size={20} /></button></div>
      {saved ? <div className="business-setup-success">
        <div className="business-setup-check"><Check size={30} /></div><p className="eyebrow">READY FOR ITS FIRST OPENING</p>
        <h2 id="business-setup-title">{saved.name} is ready.</h2>
        <p>Your calendar and voice assistant now use <strong>{saved.service.name}</strong> at <strong>${(saved.service.priceCents / 100).toFixed(2)}</strong>.</p>
        <p className="business-setup-note">The calendar, waitlist and $15 cancellation fee are demo data. No external booking account was connected.</p>
        <button className="business-setup-primary" onClick={() => dialog.current?.close()}>Open your dashboard<ArrowRight size={16} /></button>
      </div> : <>
        <ol className="business-setup-steps" aria-label="Business setup progress"><li className={!preview ? 'current' : 'complete'}>01 · Your website</li><li className={preview ? 'current' : ''}>02 · Review & activate</li></ol>
        <h2 id="business-setup-title">{preview ? 'Make it yours.' : 'One link. Your next full chair.'}</h2>
        <p className="business-setup-intro">{preview ? 'Confirm the details your voice assistant will use.' : 'Start with your public website. We’ll look for your business name, services and prices.'}</p>
        {error && <p className="business-setup-error" role="alert">{error}</p>}
        {!preview ? <form onSubmit={event => void load(event)}>
          <label className="business-setup-field">Business website<input type="url" value={url} onChange={event => setUrl(event.target.value)} required maxLength={2000} placeholder="https://your-barbershop.com" autoFocus disabled={!!busy} /></label>
          <button className="business-setup-example" type="button" disabled={!!busy} onClick={() => setUrl(example)}>Try The Cutting Room, San Francisco ↗</button>
          <div className="business-setup-promise"><Globe size={22} /><div><strong>Read your website. Review what we find.</strong><p>Nothing changes until you confirm. If a site blocks access, you can enter the details yourself.</p></div></div>
          <button className="business-setup-primary" disabled={!!busy}>{busy ? <><LoaderCircle className="business-setup-spinner" size={17} />Reading your website…</> : <>Find my business<ArrowRight size={17} /></>}</button>
          {busy && <p className="business-setup-note" role="status">Checking public business information. This can take up to 40 seconds.</p>}
        </form> : <form onSubmit={event => void activate(event)}>
          <div className="business-setup-source"><span>{preview.source === 'manual' ? 'Manual setup' : preview.source === 'managed_agent' ? 'Extracted by import agent' : 'Read from your website'}</span><a href={preview.website} target="_blank" rel="noreferrer">View source<ExternalLink size={12} /></a></div>
          <p className="business-setup-note">{preview.notice}</p>
          <label className="business-setup-field">Business name<input required maxLength={120} value={name} onChange={event => setName(event.target.value)} disabled={!!busy} /></label>
          {preview.services.length > 0 && <label className="business-setup-field">Choose a service found on the website<select defaultValue="0" disabled={!!busy} onChange={event => { const item = preview.services[Number(event.target.value)]; if (item) selectService(item); }}>{preview.services.map((item, i) => <option key={i} value={i}>{item.name}{item.priceCents === undefined ? '' : ` · $${(item.priceCents / 100).toFixed(2)}`}</option>)}</select></label>}
          <label className="business-setup-field">Service for this demo<input required maxLength={120} value={service} onChange={event => setService(event.target.value)} disabled={!!busy} placeholder="e.g. Standard haircut" /></label>
          <div className="business-setup-fields"><label className="business-setup-field">Price · USD<input type="number" required min="1" max="1000" step="0.01" value={price} onChange={event => setPrice(event.target.value)} disabled={!!busy} placeholder="Enter price" /></label><label className="business-setup-field">Duration · minutes<input type="number" required min="15" max="90" step="1" value={duration} onChange={event => setDuration(event.target.value)} disabled={!!busy} /></label></div>
          <p className="business-setup-note">Duration defaults to 45 minutes when not published. Confirm it here. Demo hours: 9 AM–6 PM Pacific · USD · $15 simulated cancellation fee.</p>
          <div className="business-setup-impact"><strong>This updates the voice assistant and starts a fresh demo calendar.</strong><p>Existing demo bookings and activity will be replaced with sample customers using this service. No real appointments or payments are changed.</p></div>
          <div className="business-setup-footer"><button type="button" className="business-setup-back" disabled={!!busy} onClick={() => { setPreview(undefined); setError(''); }}><ArrowLeft size={14} />Back</button><button className="business-setup-primary" disabled={!!busy}>{busy ? <><LoaderCircle className="business-setup-spinner" size={17} />Activating…</> : <>Activate demo business<ArrowRight size={16} /></>}</button></div>
        </form>}
      </>}
    </dialog>
  </>;
}
