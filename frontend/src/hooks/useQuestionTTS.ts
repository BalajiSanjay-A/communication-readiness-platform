import { useRef, useCallback, useEffect } from 'react';

export function useQuestionTTS() {
  const isSpeakingRef = useRef(false);

  const speak = useCallback((text: string, onEnd?: () => void) => {
    if (!text) { onEnd?.(); return; }
    if (!('speechSynthesis' in window)) { onEnd?.(); return; }

    window.speechSynthesis.cancel();
    if (window.speechSynthesis.paused) window.speechSynthesis.resume();

    isSpeakingRef.current = true;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;

    const voices = window.speechSynthesis.getVoices();
    const naturalVoice = voices.find(v =>
      v.lang.startsWith('en') &&
      (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Samantha') || v.name.includes('David'))
    );
    if (naturalVoice) utterance.voice = naturalVoice;

    let ended = false;
    const handleEnd = () => {
      if (ended) return;
      ended = true;
      isSpeakingRef.current = false;
      onEnd?.();
    };

    utterance.onstart = () => { isSpeakingRef.current = true; };
    utterance.onend = handleEnd;
    utterance.onerror = (e) => { console.warn('[useQuestionTTS] error:', e); handleEnd(); };

    // Chromium onend bug: safety timer in case onend never fires
    const safetyMs = Math.max(5000, text.length * 90);
    setTimeout(() => { if (isSpeakingRef.current) handleEnd(); }, safetyMs);

    window.speechSynthesis.speak(utterance);
  }, []);

  const cancel = useCallback(() => {
    window.speechSynthesis.cancel();
    isSpeakingRef.current = false;
  }, []);

  useEffect(() => () => cancel(), [cancel]);

  return { speak, cancel };
}
