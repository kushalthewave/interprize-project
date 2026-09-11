# Game Design

## The design problem

Warehouse safety e-learning is usually a slideshow followed by a multiple-choice
quiz. It tests whether you can *recall* that blocked fire exits are bad. It does
not test whether you would *notice* one while walking past it.

Hazard identification is a perceptual skill:

- **Spatial** — is that carton overhanging the beam, or just near the edge?
- **Comparative** — this rack upright is not vertical *like the others*
- **Contextual** — a forklift is not a hazard; a forklift in the pedestrian lane is
- **Discriminative** — a coned, signed spill is being managed; an unmarked one is not

None of that survives a screenshot with a quiz underneath. It needs a space you
can walk around and look at from your own eyeline.

## Core loop

```
        ┌──────────────────────────────────┐
        │        Enter the warehouse       │
        └──────────────────────────────────┘
                        │
        ┌───────────────┴───────────────┐
        ▼                               ▼
   TRAIN MODE (optional)           TEST MODE (always open)
   learn what a hazard             find them yourself
   looks like                      in five minutes
        │                               │
   no clock at all                 5:00 countdown
   guide: arrow, distance,         no guide, no locations
   location, light column          combo streaks
   teaching card each find
        │                               │
        └───────────────┬───────────────┘
                        ▼
              ┌──────────────────┐
              │     RESULTS      │
              │  score · rank    │
              │  what you missed │
              │  how to improve  │
              └──────────────────┘
                        │
                        ▼
              harder difficulty / next site
```

## Design principles

### 1. The hazard must exist in the world

The single rule the whole project is built around.

❌ **Wrong** — a red icon labelled "FALLING BOXES"

✅ **Right** —
```
rack beam
├── pallet, boxes square and wrapped     ← control
├── pallet, boxes square and wrapped     ← control
└── pallet ── carton displaced sideways
            ├─ carton tilted on a corner
            └─ carton overhanging the beam, teetering, falls
```

You identify it by *looking*. The ring in Train Mode marks where to look; it is
not the hazard.

### 2. Always provide the control alongside the hazard

Nearly every hazard has a correct counterpart placed nearby:

| Hazard | Control placed nearby |
|---|---|
| Unmarked spill | A spill that is coned and signed |
| Blocked fire point | A fully accessible fire point |
| Open dock edge | A dock sealed by a trailer |
| Broken pallet | A good pallet beside it |
| Over-height stack | A correctly built wide, low stack |
| Blind corner with no mirror | Convex mirrors at every other junction |
| Worker with no PPE | A compliant colleague standing next to them |

Trainees learn by *contrast*. Showing only failures teaches that everything is
dangerous, which is useless on a real site.

### 3. Wrong answers must teach

A wrong flag is never just "✗ wrong". It returns a reason:

> *"This spill is already being managed — it is signed and coned off, which is
> exactly the correct control. The hazard is an UNMARKED spill."*

This is why decoys exist. Real hazard spotting is discrimination, not detection.
A trainee who flags everything has learned nothing, and the decoys are what make
that strategy fail.

### 4. Difficulty must change the game

Eight parameters change across Simple / Mid / Hard: the fast-bonus
threshold, score multiplier, highlighting, whether the hazard count is shown, decoy count,
whether hazards move, ambient light, fog, and aim tolerance. On Hard the
building is genuinely darker, trucks patrol, and you are not told how many
hazards exist.

A unit test asserts the three difficulty shapes stay distinct so this cannot
silently regress into a label.

### 5. Never punish with a hard stop

When a single search runs long the round continues — your combo resets and you
are told how many hazards are left. Only the five-minute round clock ends a test,
and Train Mode has no clock at all.

### 6. Test length is fixed, so results compare

Every test is five minutes, on every difficulty. Difficulty changes how fast a
find must be to earn the bonus (45 s / 30 s / 19 s since the last find), the
lighting, the decoys and the guidance — but not the length of the assessment, so
a score on Mid can be read against a score on Hard.

## Train Mode

**Goal:** the trainee leaves knowing what each hazard *looks like* and what the
correct control is.

- **No clock.** Nothing is timed, so nothing is shown.
- **A guide to the nearest unfound hazard**, chosen from where the trainee is
  standing. The old fixed "majors first" order sent people from one end of a
  62 m building to the other and back; nearest-first keeps the next hazard a
  short walk away.
  - HUD compass: an arrow that turns as you turn, and the floor distance
  - The **location in words** — "Aisle B, south end — at eye level" — shown from
    the first frame. Previously the panel said "Explore the warehouse" until
    something had been found, so the moment a trainee most needed directions
    was the one moment they got none.
  - A **column of light** over the hazard, drawn through racking
- Every unfound hazard is ringed (red = major, amber = minor); the guided one
  is drawn larger
- Finding one opens a card: what it is, why it is dangerous, the control, the
  longer teaching text, and the safety keywords
- Cards linger longer than in Test Mode — this is the teaching moment
- **Optional.** It never gates Test Mode.

## Test Mode

**Goal:** measure whether they can do it unaided.

```
Observe → Find → Flag → Validate → Result
```

Measured: correctness, reaction time per hazard, wrong flags, combo streaks,
accuracy, and category-level weaknesses.

The results screen gives **personalised coaching**, chosen from the actual
performance:

- Flagging more wrong than right → *"Before flagging, ask: what is physically wrong here?"*
- Slow average → *"Work the room systematically — floor, then eye level, then above head height."*
- Never comboed → *"Three correct in a row triggers a bonus. Slow down and confirm before you flag."*
- Missed majors → *"You missed N major hazards. Major hazards are the ones that kill."*

## Progression

**Everything is open.** Training is optional and every environment and
difficulty can be tested straight away.

The original design gated it — train, then Simple, then Mid at 30+, then Hard at
30+ — on the reasoning that it mirrors a site induction. In practice it stopped
an experienced operative proving what they already knew, and stopped a
supervisor running a quick assessment. The gate logic is kept in
`Profile.isUnlocked()` and still tested; a site that wants a mandatory path can
switch it back on in `PROGRESSION` in `src/data/config.js`.

## Achievements

| | | |
|---|---|---|
| 🎯 First Hazard | 🎓 Training Complete | 🏆 Safety Champion |
| ⚡ Fast Responder | 🔥 Combo Master | 💎 Perfect Test |
| 🧗 Hard Cleared | 🗺️ Site Inspector | |

Chosen to reward *different play styles* — speed, accuracy, consistency,
thoroughness, breadth — so there is more than one way to feel successful.

## Scoring rationale

| | Fast | Slow |
|---|---|---|
| Major | +15 | +7 |
| Minor | +5 | +2 |

Major hazards are worth 3× minor ones, deliberately. A trainee who prioritises
vehicles, racking and edges over housekeeping is prioritising correctly, and the
scoring should reward the judgement that matters on a real site.

Speed is worth roughly 2×, but only within the hazard's own time budget — so
Hard is not simply "the same game, rushed".

**Combo** (3 in a row, +3 each) rewards sustained accuracy over lucky guesses.
Breaking on a wrong flag is what makes spraying flags a losing strategy.

**Ranks** — 50+ Safety Champion · 30–49 Getting There · below 30 Needs Practice.

## Accessibility

- Full keyboard play; `E` flags, so no mouse precision is required
- Pointer lock is optional — drag-look fallback if the browser refuses it
- Feedback is never colour-only: icons (✓/✗), text labels and severity words
- Visible focus rings throughout; `prefers-reduced-motion` respected
- A "reduce motion" setting disables head bob
- Large hit targets and high contrast, legible on a projector
- The hazard guide is readable outside the game, so the content is available to
  anyone who cannot play the 3D portion at all
