/**
 * quiz.js
 * Three questions at the end of a round.
 *
 * Spotting a hazard and understanding it are different skills. The game
 * measures the first well: find the thing, score the points. A trainee can do
 * that by recognising a shape without ever knowing why a forklift in a
 * walkway is dangerous or what the site is supposed to do about it. The quiz
 * is the check on the second, and it is deliberately small: three questions,
 * no clock, no effect on the score, because it is here to teach rather than
 * to catch anybody out.
 *
 * Questions are built from the hazard knowledge base, so they stay correct
 * when the hazards change. Pure functions with an injectable random source,
 * so every rule below is unit tested.
 */
import { HAZARDS, HAZARD_CATEGORIES } from '../data/hazards.js';

export const QUIZ_LENGTH = 3;

/** Mulberry32: tiny, seedable, good enough to shuffle four answers. */
export function seededRandom(seed = 1) {
  let a = seed >>> 0;
  return function next() {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle(list, rand) {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * Which hazards should this trainee be asked about?
 *
 * Missed ones first: those are the gaps. Then the ones they found, so a
 * perfect round still gets a quiz. Never more than one question per hazard.
 */
export function quizSubjects(summary, { hazards = HAZARDS, count = QUIZ_LENGTH, rand = Math.random } = {}) {
  const byId = new Map(hazards.map((h) => [h.id, h]));
  const missed = (summary?.missedHazards ?? []).map((h) => byId.get(h.id)).filter(Boolean);
  const found = (summary?.finds ?? []).map((f) => byId.get(f.id)).filter(Boolean);

  const seen = new Set();
  const pick = [];
  for (const h of [...shuffle(missed, rand), ...shuffle(found, rand)]) {
    if (seen.has(h.id)) continue;
    seen.add(h.id);
    pick.push(h);
    if (pick.length === count) break;
  }
  return pick;
}

/**
 * Wrong answers worth reading.
 *
 * Taken from other hazards, preferring a different category: an answer about
 * racking inspection next to a question about a spill is obviously wrong to
 * someone who understands, and plausible to someone who does not. That is
 * what makes the question measure anything.
 */
function distractors(subject, field, { hazards, rand, count = 3 }) {
  const others = hazards.filter((h) => h.id !== subject.id && h[field]);
  const far = others.filter((h) => h.category !== subject.category);
  const near = others.filter((h) => h.category === subject.category);
  return [...shuffle(far, rand), ...shuffle(near, rand)]
    .slice(0, count)
    .map((h) => h[field]);
}

const TEMPLATES = [
  {
    id: 'control',
    field: 'safetyTip',
    ask: (h) => `You have found this hazard: ${h.name}. What should be done about it?`,
  },
  {
    id: 'why',
    field: 'whyDangerous',
    ask: (h) => `Why is "${h.name}" dangerous?`,
  },
];

/**
 * Build the quiz for a finished round.
 *
 * @param {object} summary  the end-of-round summary
 * @param {object} [o]
 * @param {object[]} [o.hazards]
 * @param {number} [o.count]
 * @param {() => number} [o.rand]
 * @returns {{id:string, hazardId:string, category:string, question:string,
 *            options:string[], answer:number, explain:string}[]}
 */
export function buildQuiz(summary, { hazards = HAZARDS, count = QUIZ_LENGTH, rand = Math.random } = {}) {
  const subjects = quizSubjects(summary, { hazards, count, rand });

  return subjects.map((h, i) => {
    // Alternate the two question types, so three questions are not all the
    // same shape.
    const t = TEMPLATES[i % TEMPLATES.length];
    const correct = h[t.field];
    const options = shuffle([correct, ...distractors(h, t.field, { hazards, rand })], rand);

    return {
      id: `${t.id}:${h.id}`,
      hazardId: h.id,
      category: HAZARD_CATEGORIES[h.category]?.label ?? h.category,
      question: t.ask(h),
      options,
      answer: options.indexOf(correct),
      explain: t.id === 'control' ? h.whyDangerous : h.safetyTip,
    };
  });
}

/**
 * @param {{answer:number}[]} questions
 * @param {(number|null)[]} given  the option index the trainee chose, per question
 */
export function scoreQuiz(questions, given) {
  const correct = questions.reduce((n, q, i) => n + (given[i] === q.answer ? 1 : 0), 0);
  return {
    correct,
    total: questions.length,
    passed: questions.length > 0 && correct === questions.length,
  };
}
