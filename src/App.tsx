/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Header } from './components/Header.tsx';
import { StartScreen } from './components/StartScreen.tsx';
import { PracticeScreen, TurnHistoryItem } from './components/PracticeScreen.tsx';
import { ResultScreen } from './components/ResultScreen.tsx';
import { DIALOGUE_TURNS } from './utils/dialogueRules.ts';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<'start' | 'practice' | 'result'>('start');
  const [currentTurnIndex, setCurrentTurnIndex] = useState<number>(0);
  const [dialogueHistory, setDialogueHistory] = useState<TurnHistoryItem[]>([]);

  // Check ?autostart=1 support for immediate verification & testing
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('autostart') === '1') {
        setCurrentScreen('practice');
      }
    }
  }, []);

  // Ensure scroll position resets to top on screen or turn transition
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [currentScreen, currentTurnIndex]);

  const handleStartPractice = () => {
    setCurrentTurnIndex(0);
    setDialogueHistory([]);
    setCurrentScreen('practice');
  };

  const handleNextTurn = (nextTurnIndex: number) => {
    setCurrentTurnIndex(nextTurnIndex);
  };

  const handleFinishDialogue = (history: TurnHistoryItem[]) => {
    setDialogueHistory(history);
    setCurrentScreen('result');
  };

  const handlePracticeAgain = () => {
    setCurrentTurnIndex(0);
    setDialogueHistory([]);
    setCurrentScreen('practice');
  };

  const handleBackToStart = () => {
    setCurrentTurnIndex(0);
    setDialogueHistory([]);
    setCurrentScreen('start');
  };

  return (
    <div className="min-h-screen bg-[#FAF8F5] text-stone-800 flex flex-col font-['Plus_Jakarta_Sans',sans-serif]">
      {/* Top Header */}
      <Header currentScreen={currentScreen} onReset={handleBackToStart} />

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col py-4 md:py-6">
        {currentScreen === 'start' && (
          <StartScreen onStart={handleStartPractice} />
        )}

        {currentScreen === 'practice' && (
          <PracticeScreen
            currentTurnIndex={currentTurnIndex}
            onNextTurn={handleNextTurn}
            onFinishDialogue={handleFinishDialogue}
          />
        )}

        {currentScreen === 'result' && (
          <ResultScreen
            history={dialogueHistory}
            onPracticeAgain={handlePracticeAgain}
            onBackToStart={handleBackToStart}
          />
        )}
      </main>

      {/* Subtle Footer with privacy reminder */}
      <footer className="py-4 border-t border-stone-200/60 text-center text-xs text-stone-400">
        <div className="max-w-2xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>SpeakEasy — Café Talk · English Speaking Practice</span>
          <span>No audio saved · Built for learner confidence</span>
        </div>
      </footer>
    </div>
  );
}
