// Generates docs/HAZARDS.md from src/data/hazards.js so the reference can never
// drift from the data the game actually uses. Run: node scripts/gen-hazard-docs.mjs
import { writeFileSync } from 'node:fs';
import { HAZARDS, HAZARD_CATEGORIES } from '../src/data/hazards.js';
import { SCORING } from '../src/data/config.js';

const byCat = {};
for (const h of HAZARDS) (byCat[h.category] ??= []).push(h);

let md = `# Hazard Reference

**Generated from \`src/data/hazards.js\` — do not edit by hand.**
Regenerate with \`node scripts/gen-hazard-docs.mjs\`.

All ${HAZARDS.length} hazards required by the brief are implemented as physical
situations in the 3D world. The highlight ring is only ever a *training aid*
shown in Train Mode and on Simple difficulty — in Test Mode the hazard must be
identified by looking at the geometry.

## Scoring by severity

| Severity | Fast | Slow | Count |
|---|---|---|---|
| Major | +${SCORING.major.fast} | +${SCORING.major.slow} | ${HAZARDS.filter(h => h.severity === 'major').length} |
| Minor | +${SCORING.minor.fast} | +${SCORING.minor.slow} | ${HAZARDS.filter(h => h.severity === 'minor').length} |

"Fast" = found within the first ${SCORING.fastThresholdRatio * 100}% of that hazard's allotted time.

## Index

| # | Hazard | Category | Severity |
|---|---|---|---|
`;

HAZARDS.forEach((h, i) => {
  md += `| ${i + 1} | [${h.name}](#${h.id}) | ${HAZARD_CATEGORIES[h.category].label} | ${h.severity === 'major' ? '🔴 Major' : '🟡 Minor'} |\n`;
});

md += `\n## By category\n\n`;
for (const [cat, list] of Object.entries(byCat)) {
  md += `- **${HAZARD_CATEGORIES[cat].label}** — ${list.length}: ${list.map(h => h.name).join(', ')}\n`;
}

md += `\n---\n\n## Full reference\n`;

HAZARDS.forEach((h, i) => {
  md += `
### ${h.id}

**${i + 1}. ${h.name}** · ${HAZARD_CATEGORIES[h.category].label} · ${h.severity === 'major' ? '🔴 Major' : '🟡 Minor'}

**What you are looking at**
${h.description}

**Why it is dangerous**
${h.whyDangerous}

**The control (shown on both correct and wrong answers)**
${h.safetyTip}

**Train Mode teaching text**
${h.trainExplanation}

**Safety keywords** — ${h.keywords.map(k => `\`${k}\``).join(' · ')}

**Standard** — *${h.regulation}*

---
`;
});

md += `
## How each hazard is built in 3D

Every scenario below is a builder in \`src/environment/Scenarios.js\`, reused
across all three environments.

| Hazard | Builder | Physical construction |
|---|---|---|
| Forklift on a pedestrian route | \`forkliftOnWalkway()\` | Loaded truck travelling **inside the painted green lane**, pedestrian on foot in the same lane. Both animate on Mid/Hard. |
| Reversing forklift | \`reversingForklift()\` | Truck reversing with flashing reverse lights, seated driver, worker standing in the counterweight blind spot holding a clipboard. |
| Unstable / falling boxes | \`fallingBoxes()\` | Rack bay with two tidy courses, then one displaced carton, one tilted, one overhanging the beam. The overhanging one teeters, falls, bounces and resets. Neighbouring bays are correctly stacked as the visual control. |
| Damaged racking | \`damagedRacking()\` | Bent upright with a kinked section, buckled brace, bay leaning out of plumb, mangled column guard, impact debris on the floor. |
| Oil / liquid spill | \`unmarkedSpill()\` | Irregular decal with a rainbow sheen and a leaking drum as the source. **No sign, no cones.** \`managedSpill()\` places the signed-and-coned control elsewhere as a decoy. |
| Blocked walkway | \`blockedWalkway()\` | Pallet load, block stack and a roll cage standing in the green lane. |
| Blocked emergency exit | \`blockedFireExit()\` | Wrapped pallet stack and roll cage across the fire-exit door, under the lit running-man sign, over the keep-clear hatching. |
| Blocked extinguisher | \`blockedFirePoint()\` | Fire point with cartons stacked in front, hiding the extinguishers and covering the keep-clear zone. |
| Worker without PPE | \`workerNoPPE()\` | Figure in plain dark clothing in the vehicle area, with a compliant hi-vis colleague beside them for contrast. |
| Open dock edge | \`openDockEdge()\` | Open dock door, no trailer, no gate. Striped nosing, unused dock plate, worker leaning over the edge. |
| Trailing cable | \`trailingCableHazard()\` | Cable tube across the floor from a wall socket to a tool, with a taped repair and exposed conductor that glints. |
| Broken pallet | \`brokenPalletHazard()\` | Pallet with a missing deck board, a cracked lifted board, split bearer and protruding nail — **still carrying a load that sags into the gap**. Good pallet alongside. |
| Overloaded stack | \`overloadedStackHazard()\` | Nine courses on a two-carton base, progressively leaning. A correctly built wide/low stack sits beside it as a decoy. |
| Unsafe ladder | \`unsafeLadder()\` | Ladder at ~55° instead of 75°, unfooted and untied, worker on the top rungs carrying a box. |
| Blind corner | \`blindCorner()\` | Solid stock to the corner killing the sight line, forklift and pedestrian converging from opposite sides, **no convex mirror** — mirrors are present at every other junction so the absence reads. |
`;

writeFileSync('docs/HAZARDS.md', md);
console.log(`docs/HAZARDS.md written (${HAZARDS.length} hazards)`);
