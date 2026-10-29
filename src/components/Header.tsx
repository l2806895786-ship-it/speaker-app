/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Coffee, RotateCcw } from 'lucide-react';

interface HeaderProps {
  currentScreen: 'start' | 'practice' | 'result';
  onReset: () => void;
}

export const Header: React.FC<HeaderProps> = ({ currentScreen, onReset }) => {
  return (
    <header className="flex items-center justify-between gap-8 px-6 py-4 border-b border-stone-200/80 bg-white/80 backdrop-blur-sm sticky top-0 z-30">
      {/* Zone 1: Brand wordmark */}
      <div className="flex items-center gap-2.5 whitespace-nowrap shrink-0">
        <div className="w-8 h-8 rounded-lg bg-amber-700/10 text-amber-800 flex items-center justify-center font-bold">
          <Coffee className="w-4 h-4 text-amber-700" />
        </div>
        <span className="text-lg font-bold tracking-tight text-stone-900 font-['Outfit',sans-serif]">
          SpeakEasy — Café Talk
        </span>
      </div>

      {/* Zone 2: Informational context links */}
      <div className="hidden md:flex items-center gap-6 text-xs text-stone-500 font-medium whitespace-nowrap shrink-0">
        <span>Ordering at a Café</span>
        <span aria-hidden="true">·</span>
        <span>CEFR A1–A2</span>
        <span aria-hidden="true">·</span>
        <span>5 Practice Turns</span>
      </div>

      {/* Zone 3: Primary Action / Reset */}
      <div className="flex items-center gap-3 shrink-0">
        {currentScreen !== 'start' ? (
          <button
            onClick={onReset}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-stone-600 bg-stone-100 hover:bg-stone-200 rounded-lg transition-colors whitespace-nowrap"
            aria-label="Restart practice"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Restart</span>
          </button>
        ) : (
          <span className="text-xs text-stone-400 font-normal">Self-study & Classroom</span>
        )}
      </div>
    </header>
  );
};
