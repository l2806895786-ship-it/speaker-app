/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Coffee, ShieldCheck, Sparkles, Volume2, Mic, ArrowRight } from 'lucide-react';

interface StartScreenProps {
  onStart: () => void;
}

export const StartScreen: React.FC<StartScreenProps> = ({ onStart }) => {
  return (
    <div className="max-w-2xl mx-auto px-4 py-8 md:py-12 flex flex-col items-center text-center">
      {/* Top: Cafe Illustration & Badge */}
      <div className="relative mb-6">
        <div className="w-24 h-24 md:w-28 md:h-28 rounded-2xl bg-gradient-to-b from-amber-100 to-amber-200/70 border border-amber-300/40 flex items-center justify-center shadow-sm relative overflow-hidden">
          {/* Decorative cafe cup art */}
          <svg
            className="w-14 h-14 text-amber-800 drop-shadow-sm"
            viewBox="0 0 64 64"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* Steam waves */}
            <path
              d="M26 12C26 8 28 6 28 4M34 14C34 10 36 8 36 6M42 12C42 8 44 6 44 4"
              stroke="#B45309"
              strokeWidth="2.5"
              strokeLinecap="round"
              className="animate-pulse"
            />
            {/* Cup body */}
            <path
              d="M16 22H48C48 37 42 46 32 46C22 46 16 37 16 22Z"
              fill="#D97706"
              stroke="#92400E"
              strokeWidth="2.5"
            />
            {/* Cup foam/coffee level */}
            <path
              d="M19 25C23 27 27 24 32 25C37 26 41 24 45 25"
              stroke="#FEF3C7"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
            {/* Handle */}
            <path
              d="M47 26H52C55.5 26 57 28.5 57 32C57 35.5 55.5 38 52 38H45"
              stroke="#92400E"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
            {/* Saucer */}
            <path
              d="M12 50H52"
              stroke="#92400E"
              strokeWidth="3"
              strokeLinecap="round"
            />
          </svg>
        </div>
      </div>

      {/* App Title */}
      <h1 className="text-3xl md:text-4xl font-extrabold text-stone-900 tracking-tight font-['Outfit',sans-serif] mb-3">
        SpeakEasy — Café Talk
      </h1>

      <p className="text-stone-600 text-sm md:text-base max-w-md mb-8 leading-relaxed">
        Order food and drinks at a café with friendly, patient guidance from barista Mia.
      </p>

      {/* Middle: Situation Card */}
      <div className="w-full bg-white rounded-2xl border border-stone-200/90 shadow-sm p-6 md:p-8 text-left mb-8">
        <div className="flex items-center gap-2 text-xs font-semibold text-amber-800 uppercase tracking-wider mb-2">
          <span>Situation</span>
          <span aria-hidden="true">·</span>
          <span>Ordering at a café</span>
        </div>

        <h2 className="text-xl md:text-2xl font-bold text-stone-900 mb-3 font-['Outfit',sans-serif]">
          You are ordering at a café.
        </h2>

        <p className="text-stone-700 text-sm md:text-base mb-6 leading-relaxed">
          Step into a warm coffee shop! Practice speaking out loud without fear of making mistakes.
          Success is simply making yourself understood.
        </p>

        {/* Learning Goal & Features */}
        <div className="bg-amber-50/60 rounded-xl p-4 border border-amber-200/60 mb-6">
          <div className="text-xs font-medium text-amber-900 mb-1">Learning Goal</div>
          <p className="text-sm font-semibold text-amber-950">
            Practice 5 useful sentences intelligibly and complete the dialogue.
          </p>
        </div>

        {/* 3 Step Flow */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-stone-100 text-xs text-stone-600">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-stone-100 flex items-center justify-center text-stone-700 shrink-0">
              <Volume2 className="w-3.5 h-3.5" />
            </div>
            <div>
              <span className="font-semibold text-stone-900 block">1. Listen</span>
              <span>Hear normal & slow audio</span>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-stone-100 flex items-center justify-center text-stone-700 shrink-0">
              <Mic className="w-3.5 h-3.5" />
            </div>
            <div>
              <span className="font-semibold text-stone-900 block">2. Speak</span>
              <span>Say key café words</span>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-stone-100 flex items-center justify-center text-stone-700 shrink-0">
              <Sparkles className="w-3.5 h-3.5" />
            </div>
            <div>
              <span className="font-semibold text-stone-900 block">3. Friendly Feedback</span>
              <span>Helpful hints, no pressure</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom: Start Practice Button & Notice */}
      <div className="w-full flex flex-col items-center">
        <button
          onClick={onStart}
          className="w-full sm:w-auto min-w-[240px] px-8 py-3.5 bg-amber-700 hover:bg-amber-800 active:scale-[0.99] text-white font-semibold rounded-xl shadow-sm hover:shadow transition-all flex items-center justify-center gap-2.5 text-base cursor-pointer"
        >
          <span>Start Practice</span>
          <ArrowRight className="w-4 h-4" />
        </button>

        {/* Required Privacy Notice */}
        <div className="flex items-center justify-center gap-2 mt-5 text-xs text-stone-500 max-w-md">
          <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>Your voice is processed to turn it into text and is not recorded or saved.</span>
        </div>
      </div>
    </div>
  );
};
