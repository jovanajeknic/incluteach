import { useCallback, useEffect, useRef, useState } from 'react';

export type SpeechAvailability = 'unsupported' | 'no-voice' | 'ready';
export type SpeechStatus = 'idle' | 'playing' | 'paused';
export type SpeechRate = 'slow' | 'normal' | 'fast';

const RATE_VALUES: Record<SpeechRate, number> = { slow: 0.75, normal: 1, fast: 1.2 };

// Serbian first, then closely related languages whose voices read our Latin text well.
const PREFERRED_LANGUAGES = ['sr', 'hr', 'bs', 'sh'];

function getSynth(): SpeechSynthesis | null {
  return typeof window !== 'undefined' && 'speechSynthesis' in window
    ? window.speechSynthesis
    : null;
}

function pickVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | undefined {
  for (const language of PREFERRED_LANGUAGES) {
    const voice = voices.find((item) => item.lang.toLowerCase().split(/[-_]/)[0] === language);
    if (voice) return voice;
  }
  return undefined;
}

/**
 * Reads lesson sentences aloud with the browser's built-in voice (no server, nothing sent
 * anywhere). Sentences are spoken one by one so the current one can be highlighted; this is
 * more reliable across browsers than word-boundary events.
 */
export function useLessonSpeech(sentences: readonly string[]) {
  const synth = getSynth();
  const [voice, setVoice] = useState<SpeechSynthesisVoice | undefined>(() =>
    synth ? pickVoice(synth.getVoices()) : undefined,
  );
  const [status, setStatus] = useState<SpeechStatus>('idle');
  const [activeSentence, setActiveSentence] = useState<number | null>(null);
  const [rate, setRate] = useState<SpeechRate>('normal');
  // Each run gets a token; callbacks from a cancelled run are ignored.
  const runRef = useRef(0);

  // Voices often load after the page, so listen for the list to change.
  useEffect(() => {
    if (!synth) return;
    const update = () => setVoice(pickVoice(synth.getVoices()));
    synth.addEventListener('voiceschanged', update);
    return () => synth.removeEventListener('voiceschanged', update);
  }, [synth]);

  const stop = useCallback(() => {
    runRef.current += 1;
    synth?.cancel();
    setStatus('idle');
    setActiveSentence(null);
  }, [synth]);

  // New text (another lesson or step) or leaving the page stops reading.
  useEffect(() => stop, [sentences, stop]);

  const play = useCallback(() => {
    if (!synth || !voice || sentences.length === 0) return;
    synth.cancel();
    const run = ++runRef.current;

    const speakFrom = (index: number) => {
      if (run !== runRef.current) return;
      if (index >= sentences.length) {
        setStatus('idle');
        setActiveSentence(null);
        return;
      }
      const utterance = new SpeechSynthesisUtterance(sentences[index]);
      utterance.voice = voice;
      utterance.lang = voice.lang;
      utterance.rate = RATE_VALUES[rate];
      utterance.onstart = () => {
        if (run === runRef.current) setActiveSentence(index);
      };
      utterance.onend = () => speakFrom(index + 1);
      synth.speak(utterance);
    };

    setStatus('playing');
    speakFrom(0);
  }, [synth, voice, sentences, rate]);

  const pause = useCallback(() => {
    synth?.pause();
    setStatus('paused');
  }, [synth]);

  const resume = useCallback(() => {
    synth?.resume();
    setStatus('playing');
  }, [synth]);

  const availability: SpeechAvailability = !synth ? 'unsupported' : voice ? 'ready' : 'no-voice';

  return { availability, status, activeSentence, rate, setRate, play, pause, resume, stop };
}
