import { MicVAD, utils } from '@ricky0123/vad-web';
import { useRef, useCallback, useEffect } from 'react';

interface UseVoiceCaptureOptions {
  onSpeechEnd: (audioBlob: Blob) => void;
  onSpeechStart?: () => void;
  positiveSpeechThreshold?: number;
  negativeSpeechThreshold?: number;
  minSpeechFrames?: number;
}

export function useVoiceCapture({
  onSpeechEnd,
  onSpeechStart,
  positiveSpeechThreshold = 0.9,
  negativeSpeechThreshold = 0.75,
  minSpeechFrames = 5,
}: UseVoiceCaptureOptions) {
  const vadRef = useRef<MicVAD | null>(null);
  const activeRef = useRef(false);

  const start = useCallback(async () => {
    if (activeRef.current || vadRef.current) return;
    activeRef.current = true;
    try {
      vadRef.current = await MicVAD.new({
        positiveSpeechThreshold,
        negativeSpeechThreshold,
        minSpeechFrames,
        redemptionFrames: 8,
        onSpeechStart: () => onSpeechStart?.(),
        onSpeechEnd: (audio: Float32Array) => {
          // Append 200ms silence to prevent STT cutting off the final syllable
          const sampleRate = 16000;
          const tail = new Float32Array(Math.floor(sampleRate * 0.2));
          const padded = new Float32Array(audio.length + tail.length);
          padded.set(audio);
          const wavBuffer = utils.encodeWAV(padded);
          onSpeechEnd(new Blob([wavBuffer], { type: 'audio/wav' }));
        },
      });
      vadRef.current.start();
    } catch (e) {
      console.warn('[useVoiceCapture] VAD init error:', e);
      activeRef.current = false;
    }
  }, [onSpeechEnd, onSpeechStart, positiveSpeechThreshold, negativeSpeechThreshold, minSpeechFrames]);

  const stop = useCallback(() => {
    vadRef.current?.destroy();
    vadRef.current = null;
    activeRef.current = false;
  }, []);

  useEffect(() => () => stop(), [stop]);

  return { start, stop };
}
