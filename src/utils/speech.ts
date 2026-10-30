/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Helper for Web Speech API SpeechSynthesis and SpeechRecognition with Noise Suppression

export interface SpeechRecognitionHelper {
  start: () => void;
  stop: () => void;
  abort: () => void;
}

export interface SpeechRecognitionOptions {
  silenceTimeoutMs?: number; // silence threshold after speaking (e.g. 3500ms)
  initialWaitMs?: number; // wait time before any speech starts (e.g. 7000ms)
  maxDurationMs?: number; // maximum safety timeout (e.g. 15000ms)
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
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    utterance.rate = rate;
    utterance.pitch = 1.0;

    const voices = window.speechSynthesis.getVoices();
    const enVoice =
      voices.find(
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
 * Filters out trivial ambient noise artifacts (e.g., isolated coughs, clicks, single-letter noises)
 */
export function filterAmbientNoise(transcript: string): string {
  if (!transcript) return '';
  const trimmed = transcript.trim();
  // Filter out stray single punctuation or solitary acoustic noise tokens
  if (/^[^a-zA-Z0-9]+$/.test(trimmed)) {
    return '';
  }
  return trimmed;
}

/**
 * Initializes browser Web Speech API SpeechRecognition
 * Enhanced with continuous mode, noise suppression constraints, and lengthened silence detection.
 */
export function createSpeechRecognition(
  onResult: (transcript: string) => void,
  onStatusChange: (status: 'ready' | 'listening' | 'done') => void,
  onError: (errorMessage: string) => void,
  onComplete?: (finalText: string) => void,
  options?: SpeechRecognitionOptions
): SpeechRecognitionHelper | null {
  if (!isSpeechRecognitionSupported()) {
    return null;
  }

  const silenceTimeoutMs = options?.silenceTimeoutMs ?? 3500; // Increased from 1500ms to 3500ms for natural pauses
  const initialWaitMs = options?.initialWaitMs ?? 7000; // 7s to start speaking
  const maxDurationMs = options?.maxDurationMs ?? 15000; // 15s max safety window

  const SpeechRecognitionConstructor =
    (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

  const recognition = new SpeechRecognitionConstructor();
  recognition.lang = 'en-US';
  recognition.continuous = true; // Continuous listening so speech doesn't cut off on brief pauses
  recognition.interimResults = true;
  recognition.maxAlternatives = 1;

  let silenceTimer: any = null;
  let maxDurationTimer: any = null;
  let finalAccumulated = '';
  let isDone = false;
  let hasUserSpoken = false;
  let audioStream: MediaStream | null = null;

  // Request browser hardware noise suppression & echo cancellation
  const enableHardwareNoiseSuppression = async () => {
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      try {
        audioStream = await navigator.mediaDevices.getUserMedia({
          audio: {
            noiseSuppression: true,
            echoCancellation: true,
            autoGainControl: true,
          },
        });
      } catch (err) {
        // Fall back gracefully to standard microphone if getUserMedia is denied
      }
    }
  };

  const releaseHardwareNoiseSuppression = () => {
    if (audioStream) {
      try {
        audioStream.getTracks().forEach((track) => track.stop());
      } catch (e) {
        // ignore
      }
      audioStream = null;
    }
  };

  const clearAllTimers = () => {
    if (silenceTimer) clearTimeout(silenceTimer);
    if (maxDurationTimer) clearTimeout(maxDurationTimer);
    silenceTimer = null;
    maxDurationTimer = null;
  };

  const resetSilenceTimer = (delay: number) => {
    if (silenceTimer) clearTimeout(silenceTimer);
    silenceTimer = setTimeout(() => {
      // Extended silence reached: safely stop recognition
      stopRecognition();
    }, delay);
  };

  const stopRecognition = () => {
    clearAllTimers();
    try {
      recognition.stop();
    } catch (err) {
      // ignore
    }
  };

  recognition.onstart = () => {
    isDone = false;
    hasUserSpoken = false;
    finalAccumulated = '';
    onStatusChange('listening');

    // Enable noise suppression
    enableHardwareNoiseSuppression();

    // Start with initial wait period (7 seconds before first speech)
    resetSilenceTimer(initialWaitMs);

    // Hard ceiling safety timeout (15 seconds total)
    maxDurationTimer = setTimeout(() => {
      stopRecognition();
    }, maxDurationMs);
  };

  recognition.onresult = (event: any) => {
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

    const currentLive = (finals + interim).trim();
    if (currentLive) {
      hasUserSpoken = true;
      finalAccumulated = finals.trim() || currentLive;
      onResult(currentLive);
      // Once speaking has begun, wait for the extended silence timeout (3.5 seconds)
      resetSilenceTimer(silenceTimeoutMs);
    }
  };

  recognition.onerror = (event: any) => {
    clearAllTimers();
    releaseHardwareNoiseSuppression();
    console.warn('SpeechRecognition error:', event.error);
    if (event.error === 'not-allowed') {
      onError('Microphone access was denied. Please allow microphone permissions in browser settings.');
    } else if (event.error === 'no-speech') {
      onResult('');
      if (onComplete && !isDone) {
        isDone = true;
        onComplete('');
      }
    } else {
      onError(`Speech recognition notice: ${event.error}`);
    }
    onStatusChange('ready');
  };

  recognition.onend = () => {
    clearAllTimers();
    releaseHardwareNoiseSuppression();
    if (!isDone) {
      isDone = true;
      onStatusChange('done');
      if (onComplete) {
        const cleanText = filterAmbientNoise(finalAccumulated);
        onComplete(cleanText);
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
      stopRecognition();
    },
    abort: () => {
      clearAllTimers();
      releaseHardwareNoiseSuppression();
      try {
        recognition.abort();
      } catch (err) {
        // ignore
      }
      onStatusChange('ready');
    },
  };
}
