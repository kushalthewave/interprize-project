/**
 * ReviewScreen.js
 * The hazards this trainee missed, taught properly.
 *
 * The results screen lists a missed hazard with its one-line control, which
 * is enough to recognise it and not enough to understand it. This is the
 * longer read: what the thing actually is, why it hurts people, what a safe
 * site does about it, the words to remember, and the standard behind it.
 *
 * It opens straight after a round, from the results screen, because that is
 * the one moment a trainee is motivated to read about the hazard they walked
 * past. Everything here comes from the same knowledge base the game builds
 * its scenarios from, so nothing can drift out of step.
 */
import { el } from './dom.js';
import { HAZARDS, HAZARD_CATEGORIES } from '../data/hazards.js';
import { icon } from './icons.js';
import { categoryBreakdown } from '../gameplay/breakdown.js';

/** @param {{id:string, where?:string|null}[]} missed */
function cards(missed, { showWhere }) {
  return missed.map(({ id, where }) => {
    const h = HAZARDS.find((x) => x.id === id);
    if (!h) return null;

    return el('div.card.review-card', {}, [
      el('div.review-head', {}, [
        el('div', {}, [
          el('h3', { text: h.name }),
          el('div.row', { style: { gap: '0.4rem', flexWrap: 'wrap' } }, [
            el('span.stat-pill', { text: HAZARD_CATEGORIES[h.category]?.label ?? h.category }),
            el(`span.tag.tag-${h.severity}`, { text: h.severity === 'major' ? 'Major hazard' : 'Minor hazard' }),
            showWhere && where && el('span.hz-where', {}, [icon('pin', { size: 14 }), where]),
          ]),
        ]),
      ]),

      el('p', { text: h.description }),

      el('div.review-block', {}, [
        el('div.review-label', { text: 'Why it is dangerous' }),
        el('p', { text: h.whyDangerous }),
      ]),
      el('div.review-block', {}, [
        el('div.review-label', { text: 'What a safe site does' }),
        el('p', { text: h.safetyTip }),
      ]),
      h.trainExplanation && el('div.review-block', {}, [
        el('div.review-label', { text: 'How to spot it' }),
        el('p', { text: h.trainExplanation }),
      ]),

      (h.keywords?.length ?? 0) > 0 && el('div.row.mt', { style: { flexWrap: 'wrap', gap: '0.35rem' } },
        h.keywords.map((k) => el('span.stat-pill', { text: k }))),

      h.regulation && el('p.faint.mt', { text: h.regulation }),
    ]);
  }).filter(Boolean);
}

/**
 * @param {object} ctx
 * @param {object} params
 * @param {object} params.summary  the round being reviewed
 */
export function reviewScreen(ctx, { summary }) {
  const missed = summary?.missedHazards ?? [];
  const showWhere = summary?.mode === 'train';
  const weakest = categoryBreakdown(summary).filter((r) => r.missed > 0)[0];

  return el('div.screen', {}, [
    el('div.screen-inner.wide', {}, [
      el('div.section-head', {}, [
        el('h2', { text: 'What you missed' }),
        el('p', {
          text: missed.length === 0
            ? 'Nothing. Every hazard in that round was found.'
            : `${missed.length} hazard${missed.length === 1 ? '' : 's'} walked past. Read these before your next round.`,
        }),
      ]),

      weakest && el('div.card', {}, [
        el('p', {
          text: `Most of what you missed was ${weakest.label.toLowerCase()}: `
            + `${weakest.missed} of ${weakest.total} in that round.`,
        }),
      ]),

      ...cards(missed, { showWhere }),

      el('div.row.mt', { style: { flexWrap: 'wrap' } }, [
        el('button.btn.btn-primary', { text: '↻ Try the round again', on: { click: () => ctx.actions.retry() } }),
        el('button.btn', { text: 'Hazard Guide', on: { click: () => ctx.go('guide') } }),
        el('button.btn.btn-ghost', { text: 'Back to results', on: { click: () => ctx.go('results', { summary }) } }),
      ]),
    ]),
  ]);
}
