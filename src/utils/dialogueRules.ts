/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface DialogueTurn {
  turnNumber: number; // 1 to 5
  partnerText: string;
  partnerKorean: string;
  studentTarget: string;
  studentKorean: string;
  keyWords: string[];
  politeWords?: string[];
  firstLetterHint: string;
  firstLetterExplanationKr: string;
  chunkParts: string[];
  chunkExplanationKr: string;
  recastModelKr: string;
}

export const DIALOGUE_TURNS: DialogueTurn[] = [
  {
    turnNumber: 1,
    partnerText: "Hi! What can I get for you?",
    partnerKorean: "안녕하세요! 무엇을 드릴까요?",
    studentTarget: "Can I have a hot chocolate, please?",
    studentKorean: "핫초코 한 잔 주시겠어요?",
    keyWords: ["have", "hot", "chocolate"],
    politeWords: ["please"],
    firstLetterHint: "Can I have a hot chocolate, p___?",
    firstLetterExplanationKr: "거의 다 왔어요! 마지막 단어는 p로 시작해요.",
    chunkParts: ["Can I have", "a hot chocolate", "please."],
    chunkExplanationKr: "짧은 부분으로 나누어 말해 봐요.",
    recastModelKr: "좋은 시도예요! 이렇게 말해 보세요.",
  },
  {
    turnNumber: 2,
    partnerText: "What size would you like?",
    partnerKorean: "어떤 사이즈로 드릴까요?",
    studentTarget: "A small one, please.",
    studentKorean: "작은 걸로 주세요.",
    keyWords: ["small", "one", "please"],
    politeWords: ["please"],
    firstLetterHint: "A small one, p_____?",
    firstLetterExplanationKr: "거의 다 왔어요! 마지막 단어는 p로 시작해요.",
    chunkParts: ["A small one", "please."],
    chunkExplanationKr: "짧은 부분으로 나누어 말해 봐요.",
    recastModelKr: "좋은 시도예요! 이렇게 말해 보세요.",
  },
  {
    turnNumber: 3,
    partnerText: "Would you like anything to eat?",
    partnerKorean: "디저트나 베이커리도 드릴까요?",
    studentTarget: "Can I have a cookie, too?",
    studentKorean: "쿠키도 하나 주시겠어요?",
    keyWords: ["have", "cookie", "too"],
    firstLetterHint: "Can I have a c_____, too?",
    firstLetterExplanationKr: "거의 다 왔어요! 중간 단어는 c로 시작해요.",
    chunkParts: ["Can I have", "a cookie", "too?"],
    chunkExplanationKr: "짧은 부분으로 나누어 말해 봐요.",
    recastModelKr: "좋은 시도예요! 이렇게 말해 보세요.",
  },
  {
    turnNumber: 4,
    partnerText: "Is that everything?",
    partnerKorean: "더 필요한 건 없으신가요?",
    studentTarget: "Yes, that's everything.",
    studentKorean: "네, 이상입니다.",
    keyWords: ["yes", "everything"],
    firstLetterHint: "Yes, that's e_________.",
    firstLetterExplanationKr: "거의 다 왔어요! 마지막 단어는 e로 시작해요.",
    chunkParts: ["Yes", "that's everything."],
    chunkExplanationKr: "짧은 부분으로 나누어 말해 봐요.",
    recastModelKr: "좋은 시도예요! 이렇게 말해 보세요.",
  },
  {
    turnNumber: 5,
    partnerText: "That will be five dollars.",
    partnerKorean: "5달러입니다.",
    studentTarget: "Here you are. Thank you!",
    studentKorean: "여기 있습니다. 감사합니다!",
    keyWords: ["here", "thank", "you"],
    firstLetterHint: "Here you are. T____ you!",
    firstLetterExplanationKr: "거의 다 왔어요! 감사 인사는 t로 시작해요.",
    chunkParts: ["Here you are.", "Thank you!"],
    chunkExplanationKr: "짧은 부분으로 나누어 말해 봐요.",
    recastModelKr: "좋은 시도예요! 이렇게 말해 보세요.",
  },
];

/**
 * Normalizes speech transcript: lowercases, removes punctuation, trims spaces.
 * Differences in capitalization and punctuation are ignored.
 */
export function normalizeTranscript(text: string): string {
  if (!text) return "";
  return text
    .toLowerCase()
    .replace(/[.,/#!$%^&*;:{}=\-_`~()?'"“”‘’]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Checks whether all specified key words are present in the transcript.
 */
export function checkKeyWords(transcript: string, keyWords: string[]): boolean {
  const normalized = normalizeTranscript(transcript);
  const words = normalized.split(/\s+/).filter(Boolean);
  return keyWords.every((kw) => {
    const target = kw.toLowerCase().trim();
    return words.includes(target);
  });
}

/**
 * Checks whether optional polite/small words are missing.
 */
export function checkMissingPoliteWords(
  transcript: string,
  politeWords?: string[]
): string[] {
  if (!politeWords || politeWords.length === 0) return [];
  const normalized = normalizeTranscript(transcript);
  const words = normalized.split(/\s+/).filter(Boolean);
  return politeWords.filter((pw) => !words.includes(pw.toLowerCase().trim()));
}

export type FeedbackType =
  | "NO_SPEECH"
  | "SUCCESS"
  | "SUCCESS_MISSING_POLITE"
  | "RECAST"
  | "ELICITATION"
  | "CHUNKING";

export interface EvaluationResult {
  isSuccess: boolean;
  type: FeedbackType;
  feedbackText: string;
  englishFeedback: string;
  koreanFeedback: string;
  missingKeyWords: string[];
  missingSmallWords: string[];
  attemptCount: number;
}

/**
 * Deterministic evaluation logic implementing PRD Section 7 rules:
 * - Judge by "Did the partner understand?" (key words recognized), not native-like pronunciation.
 * - 1st attempt failure -> Recast
 * - 2nd attempt failure -> Elicitation (first-letter hint)
 * - 3rd attempt failure -> Chunking
 * - Success -> Praise
 * - Success with small word missing (e.g. 'please') -> Praise + polite suggestion
 * - No speech recognized -> Friendly encouragement to try again
 */
export function evaluateAttempt(
  turnIndex: number,
  transcript: string,
  attemptNumber: number
): EvaluationResult {
  const turn = DIALOGUE_TURNS[turnIndex];
  if (!turn) {
    throw new Error(`Invalid turn index: ${turnIndex}`);
  }

  const normalized = normalizeTranscript(transcript);

  // 1. No speech recognized
  if (!normalized) {
    return {
      isSuccess: false,
      type: "NO_SPEECH",
      feedbackText:
        "I didn't catch that. Try speaking a little louder, or tap Listen first. (잘 들리지 않았어요. 조금 더 크게 말하거나 먼저 듣기를 눌러 보세요.)",
      englishFeedback:
        "I didn't catch that. Try speaking a little louder, or tap Listen first.",
      koreanFeedback:
        "잘 들리지 않았어요. 조금 더 크게 말하거나 먼저 듣기를 눌러 보세요.",
      missingKeyWords: turn.keyWords,
      missingSmallWords: turn.politeWords || [],
      attemptCount: attemptNumber,
    };
  }

  const words = normalized.split(/\s+/).filter(Boolean);
  const missingKeyWords = turn.keyWords.filter(
    (kw) => !words.includes(kw.toLowerCase().trim())
  );
  const missingPoliteWords = checkMissingPoliteWords(
    transcript,
    turn.politeWords
  );

  const hasAllKeyWords = missingKeyWords.length === 0;

  // 2. Success with all key words
  if (hasAllKeyWords) {
    if (missingPoliteWords.includes("please")) {
      return {
        isSuccess: true,
        type: "SUCCESS_MISSING_POLITE",
        feedbackText:
          "Nice job! Add 'please' to sound more polite. (잘했어요! 더 공손하게 'please'를 붙여 보세요.)",
        englishFeedback: "Nice job! Add 'please' to sound more polite.",
        koreanFeedback: "잘했어요! 더 공손하게 'please'를 붙여 보세요.",
        missingKeyWords: [],
        missingSmallWords: ["please"],
        attemptCount: attemptNumber,
      };
    }

    return {
      isSuccess: true,
      type: "SUCCESS",
      feedbackText:
        "Perfect! I understood your order clearly. (주문 내용을 잘 이해했어요!)",
      englishFeedback: "Perfect! I understood your order clearly.",
      koreanFeedback: "주문 내용을 잘 이해했어요!",
      missingKeyWords: [],
      missingSmallWords: [],
      attemptCount: attemptNumber,
    };
  }

  // 3. Failure - Progressive Scaffolding based on attempt count
  if (attemptNumber <= 1) {
    // 1st attempt failure: Recast
    const eng = `Nice try! You can say, "${turn.studentTarget}"`;
    const kr = turn.recastModelKr;
    return {
      isSuccess: false,
      type: "RECAST",
      feedbackText: `${eng} (${kr})`,
      englishFeedback: eng,
      koreanFeedback: kr,
      missingKeyWords,
      missingSmallWords: missingPoliteWords,
      attemptCount: attemptNumber,
    };
  } else if (attemptNumber === 2) {
    // 2nd attempt failure: Elicitation (first-letter hint)
    const eng = `You're almost there! "${turn.firstLetterHint}"`;
    const kr = turn.firstLetterExplanationKr;
    return {
      isSuccess: false,
      type: "ELICITATION",
      feedbackText: `${eng} (${kr})`,
      englishFeedback: eng,
      koreanFeedback: kr,
      missingKeyWords,
      missingSmallWords: missingPoliteWords,
      attemptCount: attemptNumber,
    };
  } else {
    // 3rd+ attempt failure: Chunking
    const chunkFormatted = turn.chunkParts.map((c) => `'${c}'`).join(" / ");
    const eng = `Let's say it in small parts: ${chunkFormatted}`;
    const kr = turn.chunkExplanationKr;
    return {
      isSuccess: false,
      type: "CHUNKING",
      feedbackText: `${eng} (${kr})`,
      englishFeedback: eng,
      koreanFeedback: kr,
      missingKeyWords,
      missingSmallWords: missingPoliteWords,
      attemptCount: attemptNumber,
    };
  }
}

/**
 * Calculates star rating according to Section 6 / Star Rules:
 * ★★★ Finished all five turns and tried speaking on each turn.
 * ★★ Finished three or four turns.
 * ★ Finished the dialogue or practiced at least one turn.
 * (Stars reward participation, not pronunciation accuracy.)
 */
export function calculateStars(
  completedTurns: number,
  spokenTurns: number
): { stars: number; description: string } {
  if (completedTurns === 5 && spokenTurns >= 5) {
    return {
      stars: 3,
      description:
        "Finished all five turns and tried speaking on each turn!",
    };
  }

  if (completedTurns >= 3) {
    return {
      stars: 2,
      description: "Finished three or more café ordering turns!",
    };
  }

  if (completedTurns >= 1 || spokenTurns >= 1) {
    return {
      stars: 1,
      description: "Practiced café ordering expressions!",
    };
  }

  return {
    stars: 1,
    description: "Good start trying English speaking!",
  };
}
