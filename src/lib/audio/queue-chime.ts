'use client';

/**
 * Web Audio API Two-Tone Hospital Chime ("Ding-Dong")
 * Synthesizes an authentic medical center chime without external MP3 dependencies.
 */
export function playHospitalChime(): Promise<void> {
  return new Promise((resolve) => {
    try {
      // AudioContext compatibility
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) {
        resolve();
        return;
      }

      const ctx = new AudioCtx();

      // Note 1: Higher "Ding" (G5, 783.99 Hz)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(783.99, ctx.currentTime);

      gain1.gain.setValueAtTime(0.3, ctx.currentTime);
      gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);

      osc1.connect(gain1);
      gain1.connect(ctx.destination);

      osc1.start(ctx.currentTime);
      osc1.stop(ctx.currentTime + 0.8);

      // Note 2: Lower "Dong" (E5, 659.25 Hz)
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(659.25, ctx.currentTime + 0.35);

      gain2.gain.setValueAtTime(0, ctx.currentTime);
      gain2.gain.setValueAtTime(0.35, ctx.currentTime + 0.35);
      gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.2);

      osc2.connect(gain2);
      gain2.connect(ctx.destination);

      osc2.start(ctx.currentTime + 0.35);
      osc2.stop(ctx.currentTime + 1.2);

      setTimeout(() => {
        try {
          ctx.close();
        } catch {
          // ignore
        }
        resolve();
      }, 1200);
    } catch (e) {
      console.warn('[QueueChime] Web Audio playback failed:', e);
      resolve();
    }
  });
}

/**
 * Web Speech API Voice Callout in English
 * e.g., "Now serving token CN-A109. Please proceed to Room 304."
 */
export function announcePatientCall({
  tokenCode,
  displayName,
  roomNumber,
  maskName = false,
}: {
  tokenCode: string;
  displayName?: string;
  roomNumber?: string;
  maskName?: boolean;
}) {
  if (typeof window === 'undefined' || !window.speechSynthesis) return;

  try {
    // Format patient name for privacy compliance under RA 10173
    let announcementText = `Now serving token ${tokenCode}.`;

    if (displayName && !maskName) {
      announcementText = `Now serving token ${tokenCode}, ${displayName}.`;
    }

    if (roomNumber) {
      announcementText += ` Please proceed to Room ${roomNumber}.`;
    }

    const utterance = new SpeechSynthesisUtterance(announcementText);
    utterance.rate = 0.9; // Slightly slower, clear hospital pace
    utterance.pitch = 1.0;
    utterance.lang = 'en-PH'; // Philippine English accent if available

    // Optional: Select English voice
    const voices = window.speechSynthesis.getVoices();
    const englishVoice = voices.find((v) => v.lang.startsWith('en'));
    if (englishVoice) {
      utterance.voice = englishVoice;
    }

    window.speechSynthesis.speak(utterance);
  } catch (err) {
    console.warn('[QueueVoice] SpeechSynthesis call failed:', err);
  }
}

/**
 * Helper to mask names according to Philippine Data Privacy Act (RA 10173)
 * e.g. "Juan Carlos dela Cruz" -> "Juan C. d."
 */
export function maskPatientName(name: string): string {
  if (!name) return 'Patient';
  const parts = name.trim().split(' ');
  if (parts.length === 1) return parts[0];
  const first = parts[0];
  const rest = parts.slice(1).map((p) => (p[0] ? `${p[0]}.` : '')).join(' ');
  return `${first} ${rest}`;
}
