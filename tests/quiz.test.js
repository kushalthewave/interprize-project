/**
 * The end-of-round quiz.
 *
 * What matters is that it asks about the right hazards, that a wrong answer
 * is wrong for a reason a trainee can see, and that the correct answer is not
 * guessable from its position.
 */
import { describe, it, expect } from 'vitest';
import { buildQuiz, quizSubjects, scoreQuiz, seededRandom, QUIZ_LENGTH } from '../src/gameplay/quiz.js';
import { HAZARDS } from '../src/data/hazards.js';

const summaryWith = ({ missed = [], found = [] }) => ({
  missedHazards: missed.map((id) => ({ id })),
  finds: found.map((id) => ({ id })),
});

const ids = HAZARDS.map((h) => h.id);

describe('Choosing what to ask about', () => {
  it('asks about the hazards the trainee missed, because those are the gaps', () => {
    const s = summaryWith({ missed: ids.slice(0, 3), found: ids.slice(3, 10) });
    const picked = quizSubjects(s, { rand: seededRandom(1) }).map((h) => h.id);
    expect(picked).toHaveLength(3);
    expect(picked.every((id) => ids.slice(0, 3).includes(id))).toBe(true);
  });

  it('falls back to the hazards they found, so a perfect round still gets a quiz', () => {
    const s = summaryWith({ missed: [], found: ids.slice(0, 6) });
    expect(quizSubjects(s, { rand: seededRandom(2) })).toHaveLength(3);
  });

  it('tops up from found hazards when only one was missed', () => {
    const s = summaryWith({ missed: [ids[0]], found: ids.slice(1, 8) });
    const picked = quizSubjects(s, { rand: seededRandom(3) }).map((h) => h.id);
    expect(picked).toHaveLength(3);
    expect(picked[0]).toBe(ids[0]);
  });

  it('never asks about the same hazard twice', () => {
    const s = summaryWith({ missed: [ids[0], ids[0]], found: [ids[0], ids[1]] });
    const picked = quizSubjects(s, { rand: seededRandom(4) }).map((h) => h.id);
    expect(new Set(picked).size).toBe(picked.length);
  });

  it('returns nothing when the round has no hazards to ask about', () => {
    expect(quizSubjects(summaryWith({}), { rand: seededRandom(5) })).toEqual([]);
    expect(buildQuiz(summaryWith({}))).toEqual([]);
  });
});

describe('Building the questions', () => {
  const summary = summaryWith({ missed: ids.slice(0, 2), found: ids.slice(2, 9) });

  it('asks three questions with four answers each', () => {
    const quiz = buildQuiz(summary, { rand: seededRandom(7) });
    expect(quiz).toHaveLength(QUIZ_LENGTH);
    for (const q of quiz) {
      expect(q.options).toHaveLength(4);
      expect(q.question.length).toBeGreaterThan(10);
    }
  });

  it("marks exactly one answer correct, and it is the hazard's own text", () => {
    const quiz = buildQuiz(summary, { rand: seededRandom(8) });
    for (const q of quiz) {
      const hazard = HAZARDS.find((h) => h.id === q.hazardId);
      const correct = q.options[q.answer];
      expect([hazard.safetyTip, hazard.whyDangerous]).toContain(correct);
      expect(q.options.filter((o) => o === correct)).toHaveLength(1);
    }
  });

  it('uses other hazards for the wrong answers, never invented text', () => {
    const real = new Set(HAZARDS.flatMap((h) => [h.safetyTip, h.whyDangerous]));
    for (const q of buildQuiz(summary, { rand: seededRandom(9) })) {
      for (const option of q.options) expect(real.has(option)).toBe(true);
    }
  });

  it('mixes the two question types rather than asking the same shape three times', () => {
    const kinds = new Set(buildQuiz(summary, { rand: seededRandom(10) }).map((q) => q.id.split(':')[0]));
    expect(kinds.size).toBeGreaterThan(1);
  });

  it('does not always put the correct answer in the same place', () => {
    const positions = new Set();
    for (let seed = 1; seed <= 25; seed++) {
      for (const q of buildQuiz(summary, { rand: seededRandom(seed) })) positions.add(q.answer);
    }
    expect(positions.size).toBeGreaterThan(2);
  });

  it("explains the answer with the hazard's other field, so reading it teaches something", () => {
    for (const q of buildQuiz(summary, { rand: seededRandom(11) })) {
      expect(q.explain.length).toBeGreaterThan(20);
      expect(q.explain).not.toBe(q.options[q.answer]);
    }
  });
});

describe('Scoring', () => {
  const quiz = [{ answer: 0 }, { answer: 2 }, { answer: 1 }];

  it('counts the right ones', () => {
    expect(scoreQuiz(quiz, [0, 2, 1])).toEqual({ correct: 3, total: 3, passed: true });
    expect(scoreQuiz(quiz, [0, 1, 1])).toEqual({ correct: 2, total: 3, passed: false });
  });

  it('treats an unanswered question as wrong rather than skipping it', () => {
    expect(scoreQuiz(quiz, [0, null, null])).toEqual({ correct: 1, total: 3, passed: false });
  });

  it('is not a pass when there were no questions', () => {
    expect(scoreQuiz([], [])).toEqual({ correct: 0, total: 0, passed: false });
  });
});
