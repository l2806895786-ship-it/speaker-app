/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Safe helper for Web Speech API SpeechSynthesis and SpeechRecognition

export interface SpeechRecognitionHelper {
  start: () => void;
  stop: () => void;
  abort: () => void;
}

export function isSpeechRecognitionSupported(): boolean {
  if (typeof window === 'undefined') return false;
  return 'SpeechRecognition' in window || 'webkitSpeechRecognition' in window;
}

export function isInAppBrowser(): boolean {
  if (typeof window === 'undefined') return false;
  const ua = navigator.userAgent || navigator.vendor || '';
  return /KAKAOTALK|Instagram|NAVER|Line|FB_IAB|FBAN|FBAV/i.test(ua);
}

/**
 * Reads aloud text in English (en-US) using Web SpeechSynthesis.
 * Normal rate: 0.9, Slow rate: 0.7 as specified in the PRD.
 */
export function speakText(
  text: string,
  rate = 0.9,
  onStart?: () => void,
  onEnd?: () => void
): void {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    if (onEnd) onEnd();
    return;
  }

  try {
    // Cancel any ongoing speech
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    utterance.rate = rate; // 0.9 normal or 0.7 slow
    utterance.pitch = 1.0;

    // Pick a natural English voice if available
    const voices = window.speechSynthesis.getVoices();
    const enVoice = voices.find(
      (v) => (v.lang === 'en-US' || v.lang.startsWith('en')) && !v.name.includes('Google')
    ) || voices.find((v) => v.lang.startsWith('en'));
    if (enVoice) {
      utterance.voice = enVoice;
    }

    if (onStart) utterance.onstart = onStart;
    utterance.onend = () => {
      if (onEnd) onEnd();
    };
    utterance.onerror = (e) => {
      console.warn('SpeechSynthesis error:', e);
      if (onEnd) onEnd();
    };

    window.speechSynthesis.speak(utterance);
  } catch (err) {
    console.warn('SpeechSynthesis failed:', err);
    if (onEnd) onEnd();
  }
}

export function stopSpeaking(): void {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    try {
      window.speechSynthesis.cancel();
    } catch (err) {
      // ignore
    }
  }
}

/**
 * Initializes browser Web Speech API SpeechRecognition
 * Stops listening after ~1.5s silence as required in PRD.
 */
export function createSpeechRecognition(
  onResult: (transcript: string) => void,
  onStatusChange: (status: 'ready' | 'listening' | 'done') => void,
  onError: (errorMessage: string) => void,
  onComplete?: (finalText: string) => void
): SpeechRecognitionHelper | null {
  if (!isSpeechRecognitionSupported()) {
    return null;
  }

  const SpeechRecognitionConstructor =
    (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

  const recognition = new SpeechRecognitionConstructor();
  recognition.lang = 'en-US';
  recognition.continuous = false;
  recognition.interimResults = true;
  recognition.maxAlternatives = 1;

  let silenceTimer: any = null;
  let finalAccumulated = '';
  let isDone = false;

  const resetSilenceTimer = () => {
    if (silenceTimer) clearTimeout(silenceTimer);
    silenceTimer = setTimeout(() => {
      // 1.5 seconds of silence: stop recognition automatically
      try {
        recognition.stop();
      } catch (err) {
        // ignore
      }
    }, 1500);
  };

  recognition.onstart = () => {
    isDone = false;
    finalAccumulated = '';
    onStatusChange('listening');
    resetSilenceTimer();
  };

  recognition.onresult = (event: any) => {
    resetSilenceTimer();
    let interim = '';
    let finals = '';
    for (let i = 0; i < event.results.length; ++i) {
      const res = event.results[i];
      if (res.isFinal) {
        finals += res[0].transcript + ' ';
      } else {
        interim += res[0].transcript + ' ';
      }
    }
    finalAccumulated = finals.trim();
    const liveText = (finals + interim).trim();
    if (liveText) {
      onResult(liveText);
    }
  };

  recognition.onerror = (event: any) => {
    if (silenceTimer) clearTimeout(silenceTimer);
    console.warn('SpeechRecognition error:', event.error);
    if (event.error === 'not-allowed') {
      onError('Microphone access was denied. Please allow microphone permissions in browser settings.');
    } else if (event.error === 'no-speech') {
      onResult('');
      if (onComplete) onComplete('');
    } else {
      onError(`Speech recognition notice: ${event.error}`);
    }
    onStatusChange('ready');
  };

  recognition.onend = () => {
    if (silenceTimer) clearTimeout(silenceTimer);
    if (!isDone) {
      isDone = true;
      onStatusChange('done');
      if (onComplete) {
        onComplete(finalAccumulated);
      }
    }
  };

  return {
    start: () => {
      try {
        recognition.start();
      } catch (err: any) {
        console.warn('Recognition start error:', err);
      }
    },
    stop: () => {
      if (silenceTimer) clearTimeout(silenceTimer);
      try {
        recognition.stop();
      } catch (err) {
        // ignore
      }
    },
    abort: () => {
      if (silenceTimer) clearTimeout(silenceTimer);
      try {
        recognition.abort();
      } catch (err) {
        // ignore
      }
      onStatusChange('ready');
    },
  };
}
