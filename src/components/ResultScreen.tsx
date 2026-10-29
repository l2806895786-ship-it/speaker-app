/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Star, RotateCcw, Home, CheckCircle, Coffee, MessageSquare } from 'lucide-react';
import { TurnHistoryItem } from './PracticeScreen.tsx';
import { DIALOGUE_TURNS, calculateStars } from '../utils/dialogueRules.ts';

interface ResultScreenProps {
  history: TurnHistoryItem[];
  onPracticeAgain: () => void;
  onBackToStart: () => void;
}

export const ResultScreen: React.FC<ResultScreenProps> = ({
  history,
  onPracticeAgain,
  onBackToStart,
}) => {
  const completedCount = history.filter((h) => !h.skipped).length;
  const spokenCount = history.filter((h) => h.attemptedSpeech).length;
  const totalSentences = DIALOGUE_TURNS.length;

  const starRating = calculateStars(completedCount, spokenCount);

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 md:py-12 flex flex-col items-center text-center">
      {/* Top: Cafe badge & Completion Title */}
      <div className="w-16 h-16 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center mb-4 shadow-xs">
        <Coffee className="w-8 h-8 text-amber-700" />
      </div>

      <h1 className="text-3xl md:text-4xl font-extrabold text-stone-900 tracking-tight font-['Outfit',sans-serif] mb-2">
        Café Talk Complete!
      </h1>

      <p className="text-stone-600 text-sm md:text-base max-w-md mb-8 leading-relaxed">
        Wonderful job practicing your English café orders! Mia understood your requests, and you're building real confidence for your next visit to a coffee shop.
      </p>

      {/* Middle: Star Rating Card (Participation-based, NO NUMERIC SCORES) */}
      <div className="w-full bg-white rounded-2xl border border-stone-200/90 shadow-sm p-6 md:p-8 text-left mb-6">
        {/* Star header */}
        <div className="flex flex-col items-center justify-center pb-6 border-b border-stone-100">
          <div className="flex items-center gap-2 mb-2" aria-label={`${starRating.stars} out of 3 stars`}>
            {[1, 2, 3].map((starIndex) => (
              <Star
                key={starIndex}
                className={`w-8 h-8 transition-transform ${
                  starIndex <= starRating.stars
                    ? 'text-amber-500 fill-amber-400 drop-shadow-xs'
                    : 'text-stone-200 fill-stone-100'
                }`}
              />
            ))}
          </div>

          <span className="text-base font-bold text-stone-900 font-['Outfit',sans-serif]">
            {starRating.stars === 3
              ? 'Outstanding Participation!'
              : starRating.stars === 2
              ? 'Great Effort!'
              : 'Good First Step!'}
          </span>

          <span className="text-xs text-stone-500 mt-1">
            {starRating.description}
          </span>

          {/* Important pedagogical principle notice */}
          <span className="text-[11px] text-amber-800 bg-amber-50 border border-amber-200/80 rounded-md px-2.5 py-1 mt-3">
            Stars reward participation, not pronunciation accuracy.
          </span>
        </div>

        {/* Practice Stats Summary */}
        <div className="grid grid-cols-2 gap-4 py-5 border-b border-stone-100 text-center">
          <div className="p-3 bg-stone-50 rounded-xl">
            <span className="text-xs text-stone-500 block mb-1">Sentences Practiced</span>
            <span className="text-xl font-bold text-stone-900">
              {completedCount} <span className="text-xs font-normal text-stone-400">/ {totalSentences}</span>
            </span>
          </div>

          <div className="p-3 bg-stone-50 rounded-xl">
            <span className="text-xs text-stone-500 block mb-1">Dialogue Status</span>
            <span className="text-sm font-bold text-emerald-700 flex items-center justify-center gap-1 mt-1">
              <CheckCircle className="w-4 h-4 text-emerald-600" />
              <span>{completedCount === totalSentences ? 'Completed' : 'Finished'}</span>
            </span>
          </div>
        </div>

        {/* Dialogue Review List */}
        <div className="pt-5">
          <h3 className="text-xs font-bold text-stone-700 uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <MessageSquare className="w-3.5 h-3.5 text-stone-400" />
            <span>Dialogue Review</span>
          </h3>

          <div className="space-y-3">
            {DIALOGUE_TURNS.map((t, idx) => {
              const userTurn = history.find((h) => h.turnIndex === idx);
              const isTurnCompleted = userTurn && !userTurn.skipped;

              return (
                <div
                  key={idx}
                  className="p-3 rounded-xl border border-stone-100 bg-stone-50/70 text-xs text-left"
                >
                  <div className="flex items-center justify-between text-stone-400 text-[11px] mb-1">
                    <span>Sentence {idx + 1}</span>
                    <span className={isTurnCompleted ? 'text-emerald-700 font-medium' : 'text-stone-400'}>
                      {isTurnCompleted ? 'Practiced' : 'Skipped'}
                    </span>
                  </div>

                  <div className="text-stone-800 font-medium mb-1">
                    <span className="text-amber-800 font-semibold mr-1">Mia:</span>
                    "{t.partnerText}"
                  </div>

                  <div className="text-stone-900 font-bold mb-1">
                    <span className="text-stone-600 font-normal mr-1">You:</span>
                    "{t.studentTarget}"
                  </div>

                  <div className="text-[11px] text-stone-500">
                    {t.studentKorean}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Bottom: Action Buttons */}
      <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
        <button
          onClick={onPracticeAgain}
          className="w-full sm:w-auto px-6 py-3 bg-amber-700 hover:bg-amber-800 active:scale-98 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
        >
          <RotateCcw className="w-4 h-4" />
          <span>Practice Again</span>
        </button>

        <button
          onClick={onBackToStart}
          className="w-full sm:w-auto px-6 py-3 bg-white hover:bg-stone-50 active:scale-98 text-stone-800 border border-stone-200 text-xs font-semibold rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
        >
          <Home className="w-4 h-4" />
          <span>Back to Start</span>
        </button>
      </div>
    </div>
  );
};
