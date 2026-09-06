# Hazard Reference

**Generated from `src/data/hazards.js` — do not edit by hand.**
Regenerate with `node scripts/gen-hazard-docs.mjs`.

All 15 hazards required by the brief are implemented as physical
situations in the 3D world. The highlight ring is only ever a *training aid*
shown in Train Mode and on Simple difficulty — in Test Mode the hazard must be
identified by looking at the geometry.

## Scoring by severity

| Severity | Fast | Slow | Count |
|---|---|---|---|
| Major | +15 | +7 | 8 |
| Minor | +5 | +2 | 7 |

"Fast" = found within the first 50% of that hazard's allotted time.

## Index

| # | Hazard | Category | Severity |
|---|---|---|---|
| 1 | [Forklift on a Pedestrian Route](#forklift-pedestrian-collision) | Forklift & Vehicle | 🔴 Major |
| 2 | [Reversing Forklift with Worker Behind](#forklift-reversing-blind) | Forklift & Vehicle | 🔴 Major |
| 3 | [Unstable / Falling Boxes](#falling-boxes) | Racking & Storage | 🔴 Major |
| 4 | [Damaged / Leaning Racking](#damaged-rack) | Racking & Storage | 🔴 Major |
| 5 | [Oil / Liquid Spill on Floor](#floor-spill) | Floor & Walkway | 🟡 Minor |
| 6 | [Blocked Pedestrian Walkway](#blocked-walkway) | Floor & Walkway | 🟡 Minor |
| 7 | [Blocked Emergency Exit](#blocked-fire-exit) | Emergency Access | 🔴 Major |
| 8 | [Blocked Fire Extinguisher](#blocked-extinguisher) | Emergency Access | 🟡 Minor |
| 9 | [Worker Without PPE](#no-ppe-worker) | PPE & Behaviour | 🟡 Minor |
| 10 | [Person at an Open Loading Dock Edge](#open-dock-edge) | Work at Height | 🔴 Major |
| 11 | [Trailing Electrical Cable](#trailing-cable) | Electrical | 🟡 Minor |
| 12 | [Broken / Damaged Pallet](#broken-pallet) | Racking & Storage | 🟡 Minor |
| 13 | [Overloaded / Over-height Stack](#overloaded-stack) | Racking & Storage | 🟡 Minor |
| 14 | [Unsafe Ladder Use](#unsafe-ladder) | Work at Height | 🔴 Major |
| 15 | [Blind Corner Conflict](#blind-corner) | Forklift & Vehicle | 🔴 Major |

## By category

- **Forklift & Vehicle** — 3: Forklift on a Pedestrian Route, Reversing Forklift with Worker Behind, Blind Corner Conflict
- **Racking & Storage** — 4: Unstable / Falling Boxes, Damaged / Leaning Racking, Broken / Damaged Pallet, Overloaded / Over-height Stack
- **Floor & Walkway** — 2: Oil / Liquid Spill on Floor, Blocked Pedestrian Walkway
- **Emergency Access** — 2: Blocked Emergency Exit, Blocked Fire Extinguisher
- **PPE & Behaviour** — 1: Worker Without PPE
- **Work at Height** — 2: Person at an Open Loading Dock Edge, Unsafe Ladder Use
- **Electrical** — 1: Trailing Electrical Cable

---

## Full reference

### forklift-pedestrian-collision

**1. Forklift on a Pedestrian Route** · Forklift & Vehicle · 🔴 Major

**What you are looking at**
A loaded forklift is travelling straight down a marked pedestrian walkway while a worker is on foot in the same lane.

**Why it is dangerous**
Forklifts weigh 2-4 tonnes and cannot stop quickly. A pedestrian struck by one is very likely to suffer crushing or fatal injuries.

**The control (shown on both correct and wrong answers)**
Keep vehicles and people apart. Forklifts must use vehicle aisles only; pedestrians must stay inside the green walkway and never cross without eye contact with the driver.

**Train Mode teaching text**
The single biggest killer in warehouses is a moving forklift meeting a person on foot. Look for a truck whose path crosses or occupies the painted pedestrian lane. Safe sites separate the two with barriers, one-way routes and designated crossing points.

**Safety keywords** — `segregation` · `pedestrian walkway` · `right of way` · `eye contact`

**Standard** — *Workplace transport: separate vehicles and pedestrians wherever reasonably practicable.*

---

### forklift-reversing-blind

**2. Reversing Forklift with Worker Behind** · Forklift & Vehicle · 🔴 Major

**What you are looking at**
A forklift is reversing while a worker stands directly in its blind spot behind the counterweight.

**Why it is dangerous**
The driver has almost no rear visibility past the mast and load. Reversing accounts for a large share of workplace vehicle fatalities.

**The control (shown on both correct and wrong answers)**
Never stand behind a reversing vehicle. Use a banksman, reversing alarms and mirrors, and plan routes so reversing is avoided wherever possible.

**Train Mode teaching text**
Watch for the reversing lights, the alarm and the direction of travel. If somebody is in the arc behind the truck, that is a hazard even if nothing has happened yet. The safe control is to design out reversing, or to use a trained banksman who stays in the driver line of sight.

**Safety keywords** — `blind spot` · `reversing alarm` · `banksman` · `exclusion zone`

**Standard** — *Reversing operations must be controlled and, where possible, eliminated by route design.*

---

### falling-boxes

**3. Unstable / Falling Boxes** · Racking & Storage · 🔴 Major

**What you are looking at**
On an upper rack beam a stack of cartons has been pushed out of line - one carton overhangs the edge and another is tilting off the pallet.

**Why it is dangerous**
A 20 kg carton falling from 4 m carries enough energy to cause serious head and spinal injury, even through a hard hat.

**The control (shown on both correct and wrong answers)**
Stack loads square and within the pallet footprint, never let a load overhang the beam, and shrink-wrap or band unstable stacks before they are put away.

**Train Mode teaching text**
Compare the good stacks with the bad one. Safe pallets sit fully inside the rack, boxes are aligned and no corner projects over the aisle. The hazard here is visible instability - overhang, tilt and a displaced carton above a walkway.

**Safety keywords** — `overhang` · `load stability` · `shrink wrap` · `stack square`

**Standard** — *Stored goods must be stacked so they are stable and cannot fall.*

---

### damaged-rack

**4. Damaged / Leaning Racking** · Racking & Storage · 🔴 Major

**What you are looking at**
A racking upright has been struck by a forklift. The frame is bent, the bracing is deformed and the whole bay leans out of plumb.

**Why it is dangerous**
Damaged uprights lose a large part of their load capacity. Racking failure is progressive - one bay collapsing can bring down a whole run.

**The control (shown on both correct and wrong answers)**
Report and barrier off impact damage immediately, off-load the affected bay, and do not use the racking until a competent person has inspected and repaired it.

**Train Mode teaching text**
Look along the line of uprights: a safe run is perfectly vertical and evenly spaced. A leaning or dented frame, missing footplate bolts or a bowed brace are all reportable damage under a rack inspection regime (the green-amber-red traffic light system).

**Safety keywords** — `impact damage` · `rack inspection` · `green-amber-red` · `off-load`

**Standard** — *Racking must be inspected regularly and damaged components taken out of service.*

---

### floor-spill

**5. Oil / Liquid Spill on Floor** · Floor & Walkway · 🟡 Minor

**What you are looking at**
A dark oil and water spill has spread across the aisle floor with no warning sign and no attempt to clean it.

**Why it is dangerous**
Slips are the most common cause of workplace injury. On a warehouse floor a spill also destroys forklift braking and steering grip.

**The control (shown on both correct and wrong answers)**
Contain the spill, put out a wet floor sign, clean it with the correct absorbent, and report the leaking source so it is fixed rather than repeatedly mopped.

**Train Mode teaching text**
Spills are easy to miss because the floor is already dark. Look for sheen, colour change and reflections near equipment that leaks - forklifts, battery bays and hydraulic lines. Unmarked is the key word: a signed, coned spill is being managed; an unsigned one is a live hazard.

**Safety keywords** — `slip` · `wet floor sign` · `absorbent` · `report the source`

**Standard** — *Floors must be kept free from anything that may cause a person to slip or trip.*

---

### blocked-walkway

**6. Blocked Pedestrian Walkway** · Floor & Walkway · 🟡 Minor

**What you are looking at**
Pallets and stock have been left standing in the middle of the marked green pedestrian walkway.

**Why it is dangerous**
Blocking the walkway forces people to step into the forklift aisle - it converts a housekeeping problem into a vehicle-strike risk.

**The control (shown on both correct and wrong answers)**
Keep marked walkways completely clear at all times. Stage goods in designated marked-out areas, never on the pedestrian route.

**Train Mode teaching text**
Follow the green painted lane from one end of the building to the other. Anywhere you would have to step outside the paint is a blockage. This is one of the most common real-world audit findings and also one of the easiest to fix.

**Safety keywords** — `housekeeping` · `clear route` · `staging area` · `segregation`

**Standard** — *Traffic routes must be kept free from obstruction.*

---

### blocked-fire-exit

**7. Blocked Emergency Exit** · Emergency Access · 🔴 Major

**What you are looking at**
A stack of pallets and a roll cage have been parked directly in front of a final fire exit door, under the running-man sign.

**Why it is dangerous**
In a fire the building may become unsurvivable within a few minutes. An obstructed exit turns a survivable incident into multiple fatalities.

**The control (shown on both correct and wrong answers)**
Fire exits and their approach routes must be kept permanently clear and unlocked. Never use the space in front of an exit for storage, even temporarily.

**Train Mode teaching text**
Find every green running-man sign in the building and trace the route to the door. The hazard is not just something touching the door - anything narrowing the escape route counts. Ask: could 40 people leave through here in the dark, in 30 seconds?

**Safety keywords** — `means of escape` · `fire exit` · `keep clear` · `evacuation`

**Standard** — *Emergency routes and exits must be kept clear at all times.*

---

### blocked-extinguisher

**8. Blocked Fire Extinguisher** · Emergency Access · 🟡 Minor

**What you are looking at**
Stacked cartons have been piled in front of the fire point, hiding the extinguisher and its signage.

**Why it is dangerous**
A small fire can be put out in seconds with the right extinguisher. Seconds lost searching for hidden equipment is what turns a small fire into a total loss.

**The control (shown on both correct and wrong answers)**
Keep a clear zone in front of every fire point, keep the location sign visible from a distance, and check extinguishers monthly.

**Train Mode teaching text**
Fire points are marked with a red backboard and a sign mounted high so it can be seen over racking. If you cannot walk straight up to the extinguisher and lift it out, it is blocked.

**Safety keywords** — `fire point` · `clear access` · `signage visibility`

**Standard** — *Firefighting equipment must be readily accessible and clearly indicated.*

---

### no-ppe-worker

**9. Worker Without PPE** · PPE & Behaviour · 🟡 Minor

**What you are looking at**
A worker is inside the vehicle movement area in plain clothes - no high-visibility vest, no hard hat and no safety footwear.

**Why it is dangerous**
Without hi-vis a person is very hard for a forklift driver to see against dark racking; without a hard hat any falling object is a head injury.

**The control (shown on both correct and wrong answers)**
Hi-vis, safety boots and a hard hat where loads are handled overhead are mandatory in the operational area. Challenge and correct anyone entering without them.

**Train Mode teaching text**
Compare the workers in the scene. Compliant staff wear a yellow or orange hi-vis vest and a helmet. The hazard is the person who stands out by not standing out - dark clothing in a vehicle area.

**Safety keywords** — `hi-vis` · `hard hat` · `safety footwear` · `visibility`

**Standard** — *Suitable personal protective equipment must be provided and worn where risks remain.*

---

### open-dock-edge

**10. Person at an Open Loading Dock Edge** · Work at Height · 🔴 Major

**What you are looking at**
A dock door is open with no trailer parked and no barrier. A worker is standing right on the unprotected edge, about 1.2 m above the yard.

**Why it is dangerous**
Falls from dock level cause serious head, spine and pelvic injuries, and a forklift driven off an open dock is usually fatal for the operator.

**The control (shown on both correct and wrong answers)**
Keep unused dock doors closed. Where they must be open, fit a dock gate, chain or self-closing barrier and mark the edge clearly.

**Train Mode teaching text**
A loading dock is a hidden fall-from-height hazard because the drop looks small. Check every open dock door: is there a trailer sealed against it, or a physical barrier? An open void with a person near it is always a major hazard.

**Safety keywords** — `fall from height` · `dock gate` · `edge protection` · `wheel chock`

**Standard** — *Prevent falls from any edge where a person could be injured.*

---

### trailing-cable

**11. Trailing Electrical Cable** · Electrical · 🟡 Minor

**What you are looking at**
A damaged extension lead runs loose across the floor from a wall socket, with exposed conductor at a tape repair and no cable protector.

**Why it is dangerous**
It is both a trip hazard and an electrical hazard - damaged insulation on a wet warehouse floor risks electric shock as well as a fall.

**The control (shown on both correct and wrong answers)**
Route cables overhead or through a floor cable protector, take damaged leads out of service immediately, and keep portable equipment on an inspection regime.

**Train Mode teaching text**
Trace any cable you see from the socket to the tool. A safe cable is short, undamaged, and does not cross a walkway. Taped repairs, cuts and kinks all mean the lead should be quarantined.

**Safety keywords** — `trip hazard` · `cable protector` · `portable appliance testing` · `damaged insulation`

**Standard** — *Electrical systems and portable equipment must be maintained to prevent danger.*

---

### broken-pallet

**12. Broken / Damaged Pallet** · Racking & Storage · 🟡 Minor

**What you are looking at**
A wooden pallet in use has snapped deck boards and a split bearer, yet it is still carrying a load.

**Why it is dangerous**
A failing pallet drops its load without warning, often while it is on the forks at height or being walked past.

**The control (shown on both correct and wrong answers)**
Quarantine damaged pallets in a marked repair or scrap area. Never lift, stack or store a load on a pallet with broken boards or bearers.

**Train Mode teaching text**
Look at the pallet itself, not the load. Missing or cracked top boards, splintering and protruding nails all mean it is out of service. Good sites keep a clearly marked broken-pallet cage.

**Safety keywords** — `load failure` · `quarantine` · `inspect before use`

**Standard** — *Work equipment, including pallets, must be suitable and in good repair.*

---

### overloaded-stack

**13. Overloaded / Over-height Stack** · Racking & Storage · 🟡 Minor

**What you are looking at**
A free-standing block stack of cartons has been built far above the safe stacking height, narrow at the base and visibly out of plumb.

**Why it is dangerous**
Tall unsupported stacks topple sideways with no warning, particularly when a forklift passes and vibrates the floor.

**The control (shown on both correct and wrong answers)**
Observe the site maximum stacking height, keep block stacks pyramid-stable with the heaviest goods at the bottom, and use racking rather than height.

**Train Mode teaching text**
Compare stack height to the racking beams and to the people nearby. A rule of thumb is that a free-standing stack should not exceed three times its shortest base dimension. Judge base width against height, and look for lean.

**Safety keywords** — `stacking height` · `base to height ratio` · `heaviest at bottom`

**Standard** — *Goods must not be stacked at a height or in a manner that makes them unstable.*

---

### unsafe-ladder

**14. Unsafe Ladder Use** · Work at Height · 🔴 Major

**What you are looking at**
A leaning ladder is set at far too shallow an angle on the smooth floor, unfooted and untied, with a worker standing on the top two rungs holding a box.

**Why it is dangerous**
Falls from ladders are a leading cause of major workplace injury. An unfooted ladder on a smooth floor slides out with no warning.

**The control (shown on both correct and wrong answers)**
Use the 1-in-4 rule, tie or foot the ladder, keep three points of contact and never work from the top three rungs. For picking at height, use a proper order picker or step platform.

**Train Mode teaching text**
Ladders should be a last resort in a warehouse. Check the angle (roughly 75 degrees, one out for four up), whether it is secured, and where the worker feet and hands are. Carrying a load while standing on the top rungs is unsafe on every count.

**Safety keywords** — `1 in 4 rule` · `three points of contact` · `tie or foot` · `order picker`

**Standard** — *Work at height must be properly planned, supervised and carried out with suitable equipment.*

---

### blind-corner

**15. Blind Corner Conflict** · Forklift & Vehicle · 🔴 Major

**What you are looking at**
A forklift and a pedestrian are approaching the same rack corner from opposite sides. Solid stock blocks the sight line and there is no mirror or warning signage.

**Why it is dangerous**
Neither party can see the other until they are within stopping distance. Blind-corner strikes are among the most common serious warehouse collisions.

**The control (shown on both correct and wrong answers)**
Fit convex mirrors at blind corners, sound the horn on approach, slow to walking pace, and keep corner sight lines clear of stacked stock.

**Train Mode teaching text**
A blind corner is a hazard created by the layout, not by a single object. Ask at every junction: could something be coming that I cannot see? Controls are mirrors, horn discipline, floor markings and keeping the corner clear.

**Safety keywords** — `sight lines` · `convex mirror` · `sound horn` · `junction control`

**Standard** — *Traffic routes must be organised so that vehicles and pedestrians can circulate safely.*

---

## How each hazard is built in 3D

Every scenario below is a builder in `src/environment/Scenarios.js`, reused
across all three environments.

| Hazard | Builder | Physical construction |
|---|---|---|
| Forklift on a pedestrian route | `forkliftOnWalkway()` | Loaded truck travelling **inside the painted green lane**, pedestrian on foot in the same lane. Both animate on Mid/Hard. |
| Reversing forklift | `reversingForklift()` | Truck reversing with flashing reverse lights, seated driver, worker standing in the counterweight blind spot holding a clipboard. |
| Unstable / falling boxes | `fallingBoxes()` | Rack bay with two tidy courses, then one displaced carton, one tilted, one overhanging the beam. The overhanging one teeters, falls, bounces and resets. Neighbouring bays are correctly stacked as the visual control. |
| Damaged racking | `damagedRacking()` | Bent upright with a kinked section, buckled brace, bay leaning out of plumb, mangled column guard, impact debris on the floor. |
| Oil / liquid spill | `unmarkedSpill()` | Irregular decal with a rainbow sheen and a leaking drum as the source. **No sign, no cones.** `managedSpill()` places the signed-and-coned control elsewhere as a decoy. |
| Blocked walkway | `blockedWalkway()` | Pallet load, block stack and a roll cage standing in the green lane. |
| Blocked emergency exit | `blockedFireExit()` | Wrapped pallet stack and roll cage across the fire-exit door, under the lit running-man sign, over the keep-clear hatching. |
| Blocked extinguisher | `blockedFirePoint()` | Fire point with cartons stacked in front, hiding the extinguishers and covering the keep-clear zone. |
| Worker without PPE | `workerNoPPE()` | Figure in plain dark clothing in the vehicle area, with a compliant hi-vis colleague beside them for contrast. |
| Open dock edge | `openDockEdge()` | Open dock door, no trailer, no gate. Striped nosing, unused dock plate, worker leaning over the edge. |
| Trailing cable | `trailingCableHazard()` | Cable tube across the floor from a wall socket to a tool, with a taped repair and exposed conductor that glints. |
| Broken pallet | `brokenPalletHazard()` | Pallet with a missing deck board, a cracked lifted board, split bearer and protruding nail — **still carrying a load that sags into the gap**. Good pallet alongside. |
| Overloaded stack | `overloadedStackHazard()` | Nine courses on a two-carton base, progressively leaning. A correctly built wide/low stack sits beside it as a decoy. |
| Unsafe ladder | `unsafeLadder()` | Ladder at ~55° instead of 75°, unfooted and untied, worker on the top rungs carrying a box. |
| Blind corner | `blindCorner()` | Solid stock to the corner killing the sight line, forklift and pedestrian converging from opposite sides, **no convex mirror** — mirrors are present at every other junction so the absence reads. |
