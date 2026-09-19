import { useCallback, useEffect, useRef, useState } from 'react';

// Audio is unlocked by an explicit click. No microphone or media download needed.
export function useRingtone(offerId: string | null) {
  const audio = useRef<AudioContext | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const tones = useRef(new Map<OscillatorNode, GainNode>());
  const [enabled, setEnabled] = useState(false);
  const [silencedOffer, setSilencedOffer] = useState<string | null>(null);
  const [audioError, setAudioError] = useState('');

  const stop = useCallback(() => {
    if (timer.current !== null) clearInterval(timer.current);
    timer.current = null;
    for (const [oscillator, gain] of tones.current) {
      oscillator.onended = null;
      oscillator.stop(); oscillator.disconnect(); gain.disconnect();
    }
    tones.current.clear();
  }, []);

  useEffect(() => {
    const context = audio.current;
    if (!offerId || !enabled || offerId === silencedOffer || context?.state !== 'running') return;
    const ring = () => {
      // Two soft telephone-style bursts, followed by a pause.
      for (const offset of [0, 0.55]) for (const frequency of [440, 480]) {
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        const start = context.currentTime + offset;
        oscillator.frequency.value = frequency;
        gain.gain.setValueAtTime(0, start);
        gain.gain.linearRampToValueAtTime(0.045, start + 0.025);
        gain.gain.setValueAtTime(0.045, start + 0.3);
        gain.gain.linearRampToValueAtTime(0, start + 0.36);
        oscillator.connect(gain); gain.connect(context.destination);
        tones.current.set(oscillator, gain);
        oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); tones.current.delete(oscillator); };
        oscillator.start(start); oscillator.stop(start + 0.38);
      }
    };
    ring(); timer.current = setInterval(ring, 3000);
    return stop;
  }, [offerId, enabled, silencedOffer, stop]);

  useEffect(() => () => {
    stop();
    const context = audio.current;
    audio.current = null;
    if (context) { context.onstatechange = null; void context.close(); }
  }, [stop]);

  async function enable() {
    setAudioError('');
    try {
      const context = audio.current ?? new AudioContext();
      audio.current = context;
      context.onstatechange = () => { if (context.state !== 'running') { stop(); setEnabled(false); } };
      await context.resume();
      if (audio.current !== context) return;
      setEnabled(context.state === 'running'); setSilencedOffer(null);
    } catch { setAudioError('Sound is unavailable. You can still answer the call.'); }
  }

  return {
    enabled, audioError,
    ringing: Boolean(offerId && enabled && offerId !== silencedOffer),
    enable,
    disable: () => { stop(); setEnabled(false); },
    silence: () => { stop(); setSilencedOffer(offerId); },
    stop,
  };
}
