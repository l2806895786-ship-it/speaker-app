/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI, Type } from '@google/genai';
import {
  evaluateAttempt,
  DIALOGUE_TURNS,
  normalizeTranscript,
} from './src/utils/dialogueRules.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json());

  // Initialize Gemini API client if key exists
  let aiClient: GoogleGenAI | null = null;
  if (process.env.GEMINI_API_KEY) {
    aiClient = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }

  // API endpoint for evaluating student spoken turns
  app.post('/api/feedback', async (req, res) => {
    try {
      const {
        turnIndex,
        transcript = '',
        attemptNumber = 1,
      } = req.body;

      const turn = DIALOGUE_TURNS[turnIndex];
      if (!turn) {
        return res.status(400).json({ error: 'Invalid turnIndex' });
      }

      // Default deterministic evaluation result (works 100% offline without AI)
      const fallbackResult = evaluateAttempt(turnIndex, transcript, attemptNumber);

      // If no AI client available or empty transcript, return deterministic result immediately
      if (!aiClient || !normalizeTranscript(transcript)) {
        return res.json({
          source: 'rule-engine',
          ...fallbackResult,
        });
      }

      // If Gemini is available, query Gemini to produce tailored pedagogical feedback
      try {
        const prompt = `
You are Mia, a friendly café barista who speaks clearly and patiently with beginner English learners (A1-A2 level).
Evaluate the student's spoken order attempt in a café roleplay.

Context:
- Café situation: Ordering at a café
- Barista's question: "${turn.partnerText}" (${turn.partnerKorean})
- Student target sentence: "${turn.studentTarget}" (${turn.studentKorean})
- Key message words: ${JSON.stringify(turn.keyWords)}
- Student said: "${transcript}"
- Current attempt number: ${attemptNumber}

PRD Pedagogical Feedback Rules (MUST FOLLOW STRICTLY):
1. Praise first, give at most one small clear suggestion.
2. Two sentences or fewer total.
3. Simple English followed immediately by a natural Korean translation in parentheses.
4. Never say "wrong", never use numeric/percentage scores, and never describe mouth/lip/tongue positions.
5. Judge by: "Did the barista understand the key message?" (i.e. did they communicate the key words?), NOT native-like pronunciation or minor grammar.
6. Support by attempt:
   - Attempt 1: Recast (e.g. "Nice try! You can say, '${turn.studentTarget}' (${turn.recastModelKr})")
   - Attempt 2: Elicitation with first-letter hint (e.g. "You're almost there! '${turn.firstLetterHint}' (${turn.firstLetterExplanationKr})")
   - Attempt 3: Chunking (e.g. "Let's say it in small parts: ${turn.chunkParts.map((c) => `'${c}'`).join(' / ')} (${turn.chunkExplanationKr})")
   - If success: "Perfect! I understood your order clearly. (주문 내용을 잘 이해했어요!)"
   - If success but polite word 'please' is missing: "Nice job! Add 'please' to sound more polite. (잘했어요! 더 공손하게 'please'를 붙여 보세요.)"
   - If no speech: "I didn't catch that. Try speaking a little louder, or tap Listen first. (잘 들리지 않았어요. 조금 더 크게 말하거나 먼저 듣기를 눌러 보세요.)"
`;

        const geminiPromise = aiClient.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: prompt,
          config: {
            temperature: 0.2,
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                isSuccess: { type: Type.BOOLEAN },
                feedbackText: { type: Type.STRING },
                englishFeedback: { type: Type.STRING },
                koreanFeedback: { type: Type.STRING },
                feedbackType: { type: Type.STRING },
              },
              required: ['isSuccess', 'feedbackText', 'englishFeedback', 'koreanFeedback'],
            },
          },
        });

        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Gemini API timeout')), 3000)
        );

        const response: any = await Promise.race([geminiPromise, timeoutPromise]);

        const rawText = response.text?.trim();
        if (rawText) {
          const parsed = JSON.parse(rawText);
          return res.json({
            source: 'gemini',
            isSuccess: parsed.isSuccess ?? fallbackResult.isSuccess,
            feedbackText: parsed.feedbackText || fallbackResult.feedbackText,
            englishFeedback: parsed.englishFeedback || fallbackResult.englishFeedback,
            koreanFeedback: parsed.koreanFeedback || fallbackResult.koreanFeedback,
            missingKeyWords: fallbackResult.missingKeyWords,
            missingSmallWords: fallbackResult.missingSmallWords,
            attemptCount: attemptNumber,
          });
        }
      } catch (geminiError) {
        console.warn('Gemini evaluation error, using Section 7 rule engine fallback:', geminiError);
      }

      // Safe fallback
      return res.json({
        source: 'rule-engine',
        ...fallbackResult,
      });
    } catch (err: any) {
      console.error('API Error in /api/feedback:', err);
      return res.status(500).json({ error: err?.message || 'Server error' });
    }
  });

  // Health check endpoint
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', hasGeminiKey: !!process.env.GEMINI_API_KEY });
  });

  // Vite middleware in dev or static dist in prod
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR !== 'true',
        watch: process.env.DISABLE_HMR === 'true' ? null : {},
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
