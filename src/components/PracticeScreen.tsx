/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  Volume2,
  Mic,
  RotateCcw,
  ArrowRight,
  FastForward,
  AlertCircle,
  Sparkles,
  CheckCircle2,
  HelpCircle,
  Snail,
  MessageCircle,
} from 'lucide-react';
import {
  DIALOGUE_TURNS,
  DialogueTurn,
  EvaluationResult,
  evaluateAttempt,
} from '../utils/dialogueRules.ts';
import {
  speakText,
  stopSpeaking,
  createSpeechRecognition,
  isSpeechRecognitionSupported,
  isInAppBrowser,
  SpeechRecognitionHelper,
} from '../utils/speech.ts';

interface PracticeScreenProps {
  currentTurnIndex: number;
  onNextTurn: (turnIndex: number, attemptedSpeech: boolean, completed: boolean) => void;
  onFinishDialogue: (history: TurnHistoryItem[]) => void;
}

export interface TurnHistoryItem {
  turnIndex: number;
  studentTarget: string;
  transcript: string;
  isSuccess: boolean;
  attemptedSpeech: boolean;
  skipped: boolean;
}

export const PracticeScreen: React.FC<PracticeScreenProps> = ({
  currentTurnIndex,
  onNextTurn,
  onFinishDialogue,
}) => {
  const turn: DialogueTurn = DIALOGUE_TURNS[currentTurnIndex] || DIALOGUE_TURNS[0];
  const totalTurns = DIALOGUE_TURNS.length;

  // Turn state
  const [attemptCount, setAttemptCount] = useState<number>(0);
  const [micState, setMicState] = useState<'ready' | 'listening' | 'done'>('ready');
  const [isAudioPlaying, setIsAudioPlaying] = useState<boolean>(false);
  const [playingAudioType, setPlayingAudioType] = useState<string | null>(null);
  const [transcript, setTranscript] = useState<string>('');
  const [evaluation, setEvaluation] = useState<EvaluationResult | null>(null);
  const [isLoadingFeedback, setIsLoadingFeedback] = useState<boolean>(false);
  const [micError, setMicError] = useState<string | null>(null);
  const [triedSpeakingCurrentTurn, setTriedSpeakingCurrentTurn] = useState<boolean>(false);
  const [history, setHistory] = useState<TurnHistoryItem[]>([]);

  // Simulation test input toggle
  const [showSimInput, setShowSimInput] = useState<boolean>(false);
  const [customSimText, setCustomSimText] = useState<string>('');

  const recognitionRef = useRef<SpeechRecognitionHelper | null>(null);

  // Play barista question automatically when entering a new turn
  useEffect(() => {
    setAttemptCount(0);
    setTranscript('');
    setEvaluation(null);
    setMicState('ready');
    setMicError(null);
    setTriedSpeakingCurrentTurn(false);

    // Read partner question once
    playPartnerAudio();

    return () => {
      stopSpeaking();
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, [currentTurnIndex]);

  // Audio helper: play Mia's question
  const playPartnerAudio = () => {
    setIsAudioPlaying(true);
    setPlayingAudioType('partner');
    speakText(
      turn.partnerText,
      0.9,
      () => setIsAudioPlaying(true),
      () => {
        setIsAudioPlaying(false);
        setPlayingAudioType(null);
      }
    );
  };

  // Audio helper: play target sentence at normal rate (0.9)
  const playTargetNormal = () => {
    setIsAudioPlaying(true);
    setPlayingAudioType('target-normal');
    speakText(
      turn.studentTarget,
      0.9,
      () => setIsAudioPlaying(true),
      () => {
        setIsAudioPlaying(false);
        setPlayingAudioType(null);
      }
    );
  };

  // Audio helper: play target sentence at slow rate (0.7)
  const playTargetSlow = () => {
    setIsAudioPlaying(true);
    setPlayingAudioType('target-slow');
    speakText(
      turn.studentTarget,
      0.7,
      () => setIsAudioPlaying(true),
      () => {
        setIsAudioPlaying(false);
        setPlayingAudioType(null);
      }
    );
  };

  // Audio helper: play Mia's feedback advice aloud
  const playFeedbackAudio = () => {
    if (!evaluation) return;
    setIsAudioPlaying(true);
    setPlayingAudioType('feedback');
    speakText(
      evaluation.englishFeedback,
      0.85,
      () => setIsAudioPlaying(true),
      () => {
        setIsAudioPlaying(false);
        setPlayingAudioType(null);
      }
    );
  };

  // Evaluation request: calls /api/feedback (which uses Gemini or fallback)
  const processSpokenInput = async (spokenText: string) => {
    setTranscript(spokenText);
    setMicState('done');
    setTriedSpeakingCurrentTurn(true);
    const newAttempt = attemptCount + 1;
    setAttemptCount(newAttempt);
    setIsLoadingFeedback(true);

    try {
      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          turnIndex: currentTurnIndex,
          transcript: spokenText,
          attemptNumber: newAttempt,
        }),
      });

      if (!response.ok) {
        throw new Error('Feedback request failed');
      }

      const data = await response.json();
      setEvaluation({
        isSuccess: data.isSuccess,
        type: data.type || (data.isSuccess ? 'SUCCESS' : 'RECAST'),
        feedbackText: data.feedbackText,
        englishFeedback: data.englishFeedback,
        koreanFeedback: data.koreanFeedback,
        missingKeyWords: data.missingKeyWords || [],
        missingSmallWords: data.missingSmallWords || [],
        attemptCount: newAttempt,
      });
    } catch (err) {
      console.warn('Using client-side Section 7 rule evaluation:', err);
      const fallback = evaluateAttempt(currentTurnIndex, spokenText, newAttempt);
      setEvaluation(fallback);
    } finally {
      setIsLoadingFeedback(false);
    }
  };

  // Mic click handler
  const handleMicClick = () => {
    if (isAudioPlaying) return; // Disabled while audio is playing (Checklist #7)

    if (micState === 'listening') {
      // User tapped while listening to stop
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      return;
    }

    if (!isSpeechRecognitionSupported()) {
      setMicError(
        'Speech recognition is not supported in this browser. Please open in Google Chrome or use the simulation input below.'
      );
      return;
    }

    setMicError(null);
    setMicState('listening');

    recognitionRef.current = createSpeechRecognition(
      (resultText) => {
        setTranscript(resultText);
      },
      (status) => {
        setMicState(status);
      },
      (errMsg) => {
        setMicError(errMsg);
        setMicState('ready');
      },
      (finalText) => {
        processSpokenInput(finalText);
      }
    );

    if (recognitionRef.current) {
      recognitionRef.current.start();
    }
  };

  // Try Again: reset mic & transcript for next attempt on same turn
  const handleTryAgain = () => {
    setMicState('ready');
    setTranscript('');
    setEvaluation(null);
    setMicError(null);
  };

  // Next: go to next turn
  const handleNext = () => {
    const updatedHistory: TurnHistoryItem[] = [
      ...history,
      {
        turnIndex: currentTurnIndex,
        studentTarget: turn.studentTarget,
        transcript: transcript || '(Not recorded)',
        isSuccess: evaluation ? evaluation.isSuccess : false,
        attemptedSpeech: triedSpeakingCurrentTurn,
        skipped: false,
      },
    ];
    setHistory(updatedHistory);

    if (currentTurnIndex + 1 < totalTurns) {
      onNextTurn(currentTurnIndex + 1, triedSpeakingCurrentTurn, true);
    } else {
      onFinishDialogue(updatedHistory);
    }
  };

  // Skip: skip this sentence
  const handleSkip = () => {
    const updatedHistory: TurnHistoryItem[] = [
      ...history,
      {
        turnIndex: currentTurnIndex,
        studentTarget: turn.studentTarget,
        transcript: '(Skipped)',
        isSuccess: false,
        attemptedSpeech: triedSpeakingCurrentTurn,
        skipped: true,
      },
    ];
    setHistory(updatedHistory);

    if (currentTurnIndex + 1 < totalTurns) {
      onNextTurn(currentTurnIndex + 1, triedSpeakingCurrentTurn, false);
    } else {
      onFinishDialogue(updatedHistory);
    }
  };

  // Simulation test helpers
  const handleSimulateSpeech = (text: string) => {
    if (isAudioPlaying) stopSpeaking();
    processSpokenInput(text);
  };

  const isBrowserUnsupported = !isSpeechRecognitionSupported();
  const inAppBrowserDetected = isInAppBrowser();

  return (
    <div className="max-w-2xl mx-auto px-4 py-4 md:py-6 flex flex-col gap-5">
      {/* Turn Progress & Header */}
      <div className="flex items-center justify-between text-xs text-stone-500 pb-2 border-b border-stone-200">
        <span className="font-semibold text-stone-700 tracking-wide">
          Sentence {turn.turnNumber} of {totalTurns}
        </span>
        <div className="flex items-center gap-1.5" aria-label={`Step ${turn.turnNumber} of ${totalTurns}`}>
          {DIALOGUE_TURNS.map((_, idx) => (
            <div
              key={idx}
              className={`h-1.5 rounded-full transition-all ${
                idx === currentTurnIndex
                  ? 'w-6 bg-amber-700'
                  : idx < currentTurnIndex
                  ? 'w-3 bg-stone-400'
                  : 'w-2 bg-stone-200'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Browser Warning / Guidance Notice */}
      {(isBrowserUnsupported || inAppBrowserDetected || micError) && (
        <div className="bg-amber-50 border border-amber-200 text-amber-900 rounded-xl p-3.5 text-xs flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
          <div className="flex-1">
            <span className="font-semibold block mb-0.5">Microphone Guidance:</span>
            {inAppBrowserDetected ? (
              <p>You appear to be in an in-app browser. Please open this app in Google Chrome for microphone support.</p>
            ) : micError ? (
              <p>{micError}</p>
            ) : (
              <p>Web Speech API is best supported in Google Chrome. You can also use the practice simulation tools below.</p>
            )}
          </div>
        </div>
      )}

      {/* Top: Partner's question in a speech bubble */}
      <div className="flex items-start gap-3">
        {/* Mia Barista Avatar */}
        <div className="w-10 h-10 rounded-full bg-amber-100 border border-amber-300 flex items-center justify-center shrink-0 text-amber-900 font-bold text-sm shadow-xs">
          M
        </div>

        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold text-stone-900">Mia</span>
            <span className="text-[11px] text-stone-400">Café Barista</span>
            {isAudioPlaying && playingAudioType === 'partner' && (
              <span className="text-[10px] text-amber-700 font-medium animate-pulse flex items-center gap-1">
                <Volume2 className="w-3 h-3" /> Speaking...
              </span>
            )}
          </div>

          {/* Speech bubble */}
          <div className="bg-white rounded-2xl rounded-tl-sm p-4 border border-stone-200 shadow-xs relative">
            <div className="flex items-center justify-between gap-4">
              <p className="text-base md:text-lg font-semibold text-stone-900 font-['Outfit',sans-serif]">
                "{turn.partnerText}"
              </p>
              <button
                onClick={playPartnerAudio}
                disabled={isAudioPlaying}
                className="w-8 h-8 rounded-lg bg-stone-100 hover:bg-stone-200 active:scale-95 text-stone-700 flex items-center justify-center transition-colors shrink-0 disabled:opacity-40 cursor-pointer"
                title="Hear Mia's question again"
                aria-label="Replay Mia's question"
              >
                <Volume2 className="w-4 h-4" />
              </button>
            </div>
            {/* Korean Translation */}
            <p className="text-xs text-stone-500 mt-1.5 font-normal">
              {turn.partnerKorean}
            </p>
          </div>
        </div>
      </div>

      {/* Middle: Target English sentence in the LARGEST text */}
      <div className="bg-amber-50/40 rounded-2xl border border-amber-200/70 p-6 md:p-8 flex flex-col items-center text-center">
        <span className="text-[11px] font-semibold text-amber-800 uppercase tracking-wider mb-2">
          Your Response
        </span>

        {/* Target sentence (LARGEST text on the screen, as required by PRD Section 4) */}
        <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-stone-900 font-['Outfit',sans-serif] leading-tight mb-2 tracking-tight">
          "{turn.studentTarget}"
        </h2>

        {/* Korean Meaning */}
        <p className="text-sm text-stone-600 mb-4">
          {turn.studentKorean}
        </p>

        {/* Key Words with unboxed typographic separators */}
        <div className="flex items-center gap-1.5 text-xs text-stone-500 mb-6 flex-wrap justify-center">
          <span className="font-semibold text-stone-700">Key words:</span>
          {turn.keyWords.map((kw, i) => (
            <React.Fragment key={kw}>
              <span className="font-medium text-amber-900 bg-amber-100/70 px-2 py-0.5 rounded text-xs">
                {kw}
              </span>
              {i < turn.keyWords.length - 1 && <span aria-hidden="true" className="text-stone-300">·</span>}
            </React.Fragment>
          ))}
        </div>

        {/* [Listen] and [Slow] audio buttons (PRD Section 4 & Checklist #4, #5) */}
        <div className="flex items-center gap-3">
          <button
            onClick={playTargetNormal}
            disabled={isAudioPlaying}
            className={`inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg border transition-all cursor-pointer ${
              playingAudioType === 'target-normal'
                ? 'bg-amber-700 text-white border-amber-700 ring-2 ring-amber-300'
                : 'bg-white hover:bg-stone-50 text-stone-800 border-stone-200 shadow-xs'
            } disabled:opacity-40`}
            aria-label="Listen at normal speed"
          >
            <Volume2 className="w-4 h-4 text-amber-700" />
            <span>[Listen]</span>
          </button>

          <button
            onClick={playTargetSlow}
            disabled={isAudioPlaying}
            className={`inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg border transition-all cursor-pointer ${
              playingAudioType === 'target-slow'
                ? 'bg-amber-700 text-white border-amber-700 ring-2 ring-amber-300'
                : 'bg-white hover:bg-stone-50 text-stone-800 border-stone-200 shadow-xs'
            } disabled:opacity-40`}
            aria-label="Listen at slow speed"
          >
            <Snail className="w-4 h-4 text-amber-700" />
            <span>[Slow]</span>
          </button>
        </div>
      </div>

      {/* Bottom: Large round [Mic] button with 3 visible states */}
      <div className="flex flex-col items-center">
        <div className="relative mb-3">
          {/* Pulsing ring when listening */}
          {micState === 'listening' && (
            <div className="absolute inset-0 rounded-full bg-emerald-400 animate-ping opacity-30" />
          )}

          <button
            onClick={handleMicClick}
            disabled={isAudioPlaying}
            className={`w-20 h-20 md:w-24 md:h-24 rounded-full flex flex-col items-center justify-center transition-all shadow-md relative z-10 cursor-pointer ${
              isAudioPlaying
                ? 'bg-stone-200 text-stone-400 cursor-not-allowed opacity-60'
                : micState === 'listening'
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white ring-4 ring-emerald-200 scale-105'
                : micState === 'done'
                ? 'bg-stone-800 hover:bg-stone-900 text-white'
                : 'bg-amber-700 hover:bg-amber-800 text-white hover:scale-102'
            }`}
            aria-label={
              isAudioPlaying
                ? 'Microphone disabled while audio is playing'
                : micState === 'listening'
                ? 'Stop listening'
                : 'Start speaking'
            }
          >
            {micState === 'listening' ? (
              <>
                <Mic className="w-7 h-7 md:w-8 md:h-8 animate-bounce mb-1" />
                <span className="text-[10px] font-bold tracking-wider uppercase">Listening</span>
              </>
            ) : micState === 'done' ? (
              <>
                <CheckCircle2 className="w-7 h-7 md:w-8 md:h-8 mb-1" />
                <span className="text-[10px] font-bold tracking-wider uppercase">Done</span>
              </>
            ) : (
              <>
                <Mic className="w-7 h-7 md:w-8 md:h-8 mb-1" />
                <span className="text-[10px] font-bold tracking-wider uppercase">Ready</span>
              </>
            )}
          </button>
        </div>

        {/* State label & audio notification */}
        <span className="text-xs text-stone-500 font-medium">
          {isAudioPlaying ? (
            <span className="text-amber-800 flex items-center gap-1">
              <Volume2 className="w-3.5 h-3.5" /> Audio playing (mic disabled)
            </span>
          ) : micState === 'listening' ? (
            'Listening... (auto stops after silence)'
          ) : micState === 'done' ? (
            'Speech processed'
          ) : (
            'Tap [Mic] (Ready) to speak'
          )}
        </span>
      </div>

      {/* Recognized text display (Checklist #8) */}
      {(transcript || micState === 'listening') && (
        <div className="bg-stone-100 rounded-xl p-3.5 text-xs text-stone-700 flex items-center justify-between border border-stone-200">
          <div>
            <span className="font-semibold text-stone-900 mr-2">You said:</span>
            <span className="italic">
              {transcript ? `"${transcript}"` : <span className="text-stone-400">Listening to your voice...</span>}
            </span>
          </div>
          {transcript && (
            <button
              onClick={() => handleSimulateSpeech(transcript)}
              className="text-[11px] text-amber-800 hover:underline font-medium"
            >
              Re-evaluate
            </button>
          )}
        </div>
      )}

      {/* Loading feedback spinner */}
      {isLoadingFeedback && (
        <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-xs flex items-center justify-center gap-3 text-stone-600 text-sm">
          <div className="w-5 h-5 border-2 border-amber-700 border-t-transparent rounded-full animate-spin" />
          <span>Mia is preparing friendly feedback...</span>
        </div>
      )}

      {/* Feedback Box (Section 7 Rules: Praise first, one thing to fix, two sentences or fewer, English + Korean) */}
      {evaluation && !isLoadingFeedback && (
        <div
          className={`rounded-2xl p-5 md:p-6 border transition-all shadow-xs ${
            evaluation.isSuccess
              ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
              : 'bg-amber-50/70 border-amber-200 text-amber-950'
          }`}
        >
          <div className="flex items-start gap-3">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-white ${
                evaluation.isSuccess ? 'bg-emerald-600' : 'bg-amber-600'
              }`}
            >
              {evaluation.isSuccess ? (
                <CheckCircle2 className="w-4 h-4" />
              ) : (
                <Sparkles className="w-4 h-4" />
              )}
            </div>

            <div className="flex-1">
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <span className="text-xs font-bold uppercase tracking-wider text-stone-700">
                  {evaluation.isSuccess
                    ? 'Mia Understood!'
                    : `Friendly Guidance (Attempt ${attemptCount})`}
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-stone-500 font-medium">
                    {evaluation.type === 'RECAST'
                      ? '1st Attempt: Recast'
                      : evaluation.type === 'ELICITATION'
                      ? '2nd Attempt: First-Letter Hint'
                      : evaluation.type === 'CHUNKING'
                      ? '3rd Attempt: Chunking'
                      : evaluation.type === 'SUCCESS_MISSING_POLITE'
                      ? 'Polite Suggestion'
                      : 'Goal Reached'}
                  </span>
                  <button
                    onClick={playFeedbackAudio}
                    disabled={isAudioPlaying}
                    className="p-1 rounded hover:bg-stone-200/50 text-stone-600 transition-colors cursor-pointer"
                    title="Hear Mia say this aloud"
                    aria-label="Hear Mia read feedback"
                  >
                    <Volume2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Main Pedagogical Feedback in English */}
              <p className="text-base font-semibold text-stone-900 leading-snug mb-1">
                {evaluation.englishFeedback || evaluation.feedbackText}
              </p>

              {/* Korean translation in parentheses */}
              {evaluation.koreanFeedback && (
                <p className="text-xs text-stone-600 font-normal leading-relaxed">
                  ({evaluation.koreanFeedback})
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Bottom Action Buttons: [Try Again], [Next], [Skip] */}
      <div className="flex items-center justify-between gap-3 pt-2">
        <button
          onClick={handleSkip}
          className="px-4 py-2.5 text-xs font-semibold text-stone-500 hover:text-stone-800 hover:bg-stone-100 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
        >
          <FastForward className="w-3.5 h-3.5" />
          <span>[Skip]</span>
        </button>

        <div className="flex items-center gap-2.5">
          {/* [Try Again] button */}
          {(evaluation || transcript || micState === 'done') && (
            <button
              onClick={handleTryAgain}
              className="px-4 py-2.5 text-xs font-semibold text-stone-700 bg-white hover:bg-stone-50 border border-stone-200 rounded-lg shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>[Try Again]</span>
            </button>
          )}

          {/* [Next] button */}
          <button
            onClick={handleNext}
            className="px-6 py-2.5 text-xs font-semibold text-white bg-amber-700 hover:bg-amber-800 rounded-lg shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <span>{currentTurnIndex + 1 === totalTurns ? '[Finish Dialogue]' : '[Next]'}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Interactive Practice Simulation Drawer (for testing in browser without mic) */}
      <div className="border-t border-stone-200/80 pt-3 mt-1">
        <button
          onClick={() => setShowSimInput(!showSimInput)}
          className="text-xs text-stone-500 hover:text-stone-800 flex items-center gap-1 font-medium cursor-pointer"
        >
          <HelpCircle className="w-3.5 h-3.5 text-amber-700" />
          <span>{showSimInput ? 'Hide simulation / keyboard test' : 'Need keyboard practice or test options?'}</span>
        </button>

        {showSimInput && (
          <div className="bg-stone-50 rounded-xl p-4 border border-stone-200 mt-2 text-xs flex flex-col gap-3">
            <span className="font-semibold text-stone-700">Quick Test / Keyboard Utterances:</span>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => handleSimulateSpeech(turn.studentTarget)}
                className="px-2.5 py-1.5 bg-white hover:bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-md font-medium text-[11px] cursor-pointer"
              >
                Say full sentence
              </button>
              <button
                onClick={() => handleSimulateSpeech(turn.studentTarget.replace(/,\s*please/i, ''))}
                className="px-2.5 py-1.5 bg-white hover:bg-amber-50 text-amber-800 border border-amber-200 rounded-md font-medium text-[11px] cursor-pointer"
              >
                Say without 'please'
              </button>
              <button
                onClick={() => handleSimulateSpeech('I want some water')}
                className="px-2.5 py-1.5 bg-white hover:bg-stone-100 text-stone-700 border border-stone-200 rounded-md font-medium text-[11px] cursor-pointer"
              >
                Say different keywords
              </button>
              <button
                onClick={() => handleSimulateSpeech('')}
                className="px-2.5 py-1.5 bg-white hover:bg-stone-100 text-stone-500 border border-stone-200 rounded-md font-medium text-[11px] cursor-pointer"
              >
                Simulate silence
              </button>
            </div>

            <div className="flex gap-2 mt-1">
              <input
                type="text"
                value={customSimText}
                onChange={(e) => setCustomSimText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && customSimText) {
                    handleSimulateSpeech(customSimText);
                    setCustomSimText('');
                  }
                }}
                placeholder="Or type speech transcript..."
                className="flex-1 px-3 py-1.5 bg-white border border-stone-200 rounded-md text-xs focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
              <button
                onClick={() => {
                  if (customSimText) {
                    handleSimulateSpeech(customSimText);
                    setCustomSimText('');
                  }
                }}
                className="px-3 py-1.5 bg-stone-800 text-white rounded-md font-medium text-xs hover:bg-stone-900 cursor-pointer"
              >
                Submit
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
