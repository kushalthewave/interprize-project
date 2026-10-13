/**
 * QuizPanel.js
 * The three questions on the results screen.
 *
 * Deliberately gentle: no clock, no effect on the score, and a wrong answer
 * shows the right one with the reason rather than just a cross. The point is
 * the thirty seconds of reading after a mistake, which is where the hazard
 * actually gets learned.
 */
import { el } from './dom.js';
import { buildQuiz, scoreQuiz } from '../gameplay/quiz.js';

/**
 * @param {object} summary  the finished round
 * @param {object} [o]
 * @param {(result:{correct:number,total:number}) => void} [o.onFinish]
 */
export function quizPanel(summary, { onFinish } = {}) {
  const questions = buildQuiz(summary);
  if (questions.length === 0) return null;

  const given = questions.map(() => null);
  const host = el('div.quiz-body');
  let index = 0;

  const progress = el('div.faint', {});

  function renderQuestion() {
    const q = questions[index];
    progress.textContent = `Question ${index + 1} of ${questions.length}`;

    const feedback = el('div.quiz-feedback');
    const next = el('button.btn.btn-primary', {
      text: index + 1 === questions.length ? 'See how you did' : 'Next question',
      disabled: true,
    });

    const options = q.options.map((text, i) => el('button.quiz-option', {
      type: 'button',
      text,
      on: {
        click: (e) => {
          if (given[index] !== null) return;        // one answer per question
          given[index] = i;
          const right = i === q.answer;

          for (const [j, node] of options.entries()) {
            node.disabled = true;
            if (j === q.answer) node.classList.add('correct');
            else if (j === i) node.classList.add('wrong');
          }
          e.currentTarget.classList.add('chosen');

          feedback.replaceChildren(
            el('div.quiz-verdict', { class: right ? 'ok' : 'no', text: right ? 'Correct' : 'Not quite' }),
            el('p', { text: q.explain }),
          );
          next.disabled = false;
          next.focus();
        },
      },
    }));

    next.addEventListener('click', () => {
      index += 1;
      if (index < questions.length) renderQuestion();
      else renderResult();
    });

    host.replaceChildren(
      el('div.quiz-question', { text: q.question }),
      el('div.quiz-options', {}, options),
      feedback,
      el('div.row.mt', {}, [next]),
    );
  }

  function renderResult() {
    const result = scoreQuiz(questions, given);
    progress.textContent = '';

    const missed = questions.filter((q, i) => given[i] !== q.answer);

    host.replaceChildren(
      el('div.quiz-score', { text: `${result.correct} of ${result.total} correct` }),
      el('p', {
        text: result.passed
          ? 'You can spot these hazards and you know what to do about them.'
          : 'Worth reading again before your next round:',
      }),
      missed.length > 0 && el('div.quiz-recap', {}, missed.map((q) => el('div.quiz-recap-item', {}, [
        el('div.hz-name', { text: q.options[q.answer] }),
        el('div.hz-tip', { text: q.explain }),
      ]))),
    );
    onFinish?.(result);
  }

  renderQuestion();

  return el('div.card.mt.quiz', {}, [
    el('div.section-head', {}, [
      el('h3', { text: 'Check what you learned' }),
      progress,
    ]),
    el('p.faint', { text: 'Three questions about the hazards in this round. They do not affect your score.' }),
    host,
  ]);
}
