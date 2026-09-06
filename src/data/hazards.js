/**
 * hazards.js
 * The hazard *knowledge base*. Pure data - no Three.js, no DOM.
 *
 * Each definition describes WHAT the hazard is and WHY it is dangerous.
 * WHERE it physically sits in the world is defined per-environment in
 * src/environment/scenes/*.js, which references these ids.
 *
 * Fields
 *  id                 stable key used by scenes, saves and tests
 *  name               short player-facing label
 *  category           grouping used for the results breakdown
 *  severity           'major' | 'minor'  -> drives score value via SCORING
 *  description        what the player is actually looking at
 *  whyDangerous       the risk / likely injury
 *  safetyTip          the corrective action (shown on correct AND on wrong)
 *  trainExplanation   longer teaching text used by Train Mode
 *  keywords           safety keywords surfaced in Train Mode
 *  regulation         plain-language standard reference (educational)
 */

export const HAZARD_CATEGORIES = {
  vehicle: { id: 'vehicle', label: 'Forklift & Vehicle', color: '#f97316' },
  storage: { id: 'storage', label: 'Racking & Storage', color: '#eab308' },
  floor: { id: 'floor', label: 'Floor & Walkway', color: '#38bdf8' },
  emergency: { id: 'emergency', label: 'Emergency Access', color: '#ef4444' },
  ppe: { id: 'ppe', label: 'PPE & Behaviour', color: '#a78bfa' },
  electrical: { id: 'electrical', label: 'Electrical', color: '#facc15' },
  height: { id: 'height', label: 'Work at Height', color: '#34d399' },
};

export const HAZARDS = [
  {
    id: 'forklift-pedestrian-collision',
    name: 'Forklift on a Pedestrian Route',
    category: 'vehicle',
    severity: 'major',
    description:
      'A loaded forklift is travelling straight down a marked pedestrian walkway while a worker is on foot in the same lane.',
    whyDangerous:
      'Forklifts weigh 2-4 tonnes and cannot stop quickly. A pedestrian struck by one is very likely to suffer crushing or fatal injuries.',
    safetyTip:
      'Keep vehicles and people apart. Forklifts must use vehicle aisles only; pedestrians must stay inside the green walkway and never cross without eye contact with the driver.',
    trainExplanation:
      'The single biggest killer in warehouses is a moving forklift meeting a person on foot. Look for a truck whose path crosses or occupies the painted pedestrian lane. Safe sites separate the two with barriers, one-way routes and designated crossing points.',
    keywords: ['segregation', 'pedestrian walkway', 'right of way', 'eye contact'],
    regulation: 'Workplace transport: separate vehicles and pedestrians wherever reasonably practicable.',
  },
  {
    id: 'forklift-reversing-blind',
    name: 'Reversing Forklift with Worker Behind',
    category: 'vehicle',
    severity: 'major',
    description:
      'A forklift is reversing while a worker stands directly in its blind spot behind the counterweight.',
    whyDangerous:
      'The driver has almost no rear visibility past the mast and load. Reversing accounts for a large share of workplace vehicle fatalities.',
    safetyTip:
      'Never stand behind a reversing vehicle. Use a banksman, reversing alarms and mirrors, and plan routes so reversing is avoided wherever possible.',
    trainExplanation:
      'Watch for the reversing lights, the alarm and the direction of travel. If somebody is in the arc behind the truck, that is a hazard even if nothing has happened yet. The safe control is to design out reversing, or to use a trained banksman who stays in the driver line of sight.',
    keywords: ['blind spot', 'reversing alarm', 'banksman', 'exclusion zone'],
    regulation: 'Reversing operations must be controlled and, where possible, eliminated by route design.',
  },
  {
    id: 'falling-boxes',
    name: 'Unstable / Falling Boxes',
    category: 'storage',
    severity: 'major',
    description:
      'On an upper rack beam a stack of cartons has been pushed out of line - one carton overhangs the edge and another is tilting off the pallet.',
    whyDangerous:
      'A 20 kg carton falling from 4 m carries enough energy to cause serious head and spinal injury, even through a hard hat.',
    safetyTip:
      'Stack loads square and within the pallet footprint, never let a load overhang the beam, and shrink-wrap or band unstable stacks before they are put away.',
    trainExplanation:
      'Compare the good stacks with the bad one. Safe pallets sit fully inside the rack, boxes are aligned and no corner projects over the aisle. The hazard here is visible instability - overhang, tilt and a displaced carton above a walkway.',
    keywords: ['overhang', 'load stability', 'shrink wrap', 'stack square'],
    regulation: 'Stored goods must be stacked so they are stable and cannot fall.',
  },
  {
    id: 'damaged-rack',
    name: 'Damaged / Leaning Racking',
    category: 'storage',
    severity: 'major',
    description:
      'A racking upright has been struck by a forklift. The frame is bent, the bracing is deformed and the whole bay leans out of plumb.',
    whyDangerous:
      'Damaged uprights lose a large part of their load capacity. Racking failure is progressive - one bay collapsing can bring down a whole run.',
    safetyTip:
      'Report and barrier off impact damage immediately, off-load the affected bay, and do not use the racking until a competent person has inspected and repaired it.',
    trainExplanation:
      'Look along the line of uprights: a safe run is perfectly vertical and evenly spaced. A leaning or dented frame, missing footplate bolts or a bowed brace are all reportable damage under a rack inspection regime (the green-amber-red traffic light system).',
    keywords: ['impact damage', 'rack inspection', 'green-amber-red', 'off-load'],
    regulation: 'Racking must be inspected regularly and damaged components taken out of service.',
  },
  {
    id: 'floor-spill',
    name: 'Oil / Liquid Spill on Floor',
    category: 'floor',
    severity: 'minor',
    description:
      'A dark oil and water spill has spread across the aisle floor with no warning sign and no attempt to clean it.',
    whyDangerous:
      'Slips are the most common cause of workplace injury. On a warehouse floor a spill also destroys forklift braking and steering grip.',
    safetyTip:
      'Contain the spill, put out a wet floor sign, clean it with the correct absorbent, and report the leaking source so it is fixed rather than repeatedly mopped.',
    trainExplanation:
      'Spills are easy to miss because the floor is already dark. Look for sheen, colour change and reflections near equipment that leaks - forklifts, battery bays and hydraulic lines. Unmarked is the key word: a signed, coned spill is being managed; an unsigned one is a live hazard.',
    keywords: ['slip', 'wet floor sign', 'absorbent', 'report the source'],
    regulation: 'Floors must be kept free from anything that may cause a person to slip or trip.',
  },
  {
    id: 'blocked-walkway',
    name: 'Blocked Pedestrian Walkway',
    category: 'floor',
    severity: 'minor',
    description:
      'Pallets and stock have been left standing in the middle of the marked green pedestrian walkway.',
    whyDangerous:
      'Blocking the walkway forces people to step into the forklift aisle - it converts a housekeeping problem into a vehicle-strike risk.',
    safetyTip:
      'Keep marked walkways completely clear at all times. Stage goods in designated marked-out areas, never on the pedestrian route.',
    trainExplanation:
      'Follow the green painted lane from one end of the building to the other. Anywhere you would have to step outside the paint is a blockage. This is one of the most common real-world audit findings and also one of the easiest to fix.',
    keywords: ['housekeeping', 'clear route', 'staging area', 'segregation'],
    regulation: 'Traffic routes must be kept free from obstruction.',
  },
  {
    id: 'blocked-fire-exit',
    name: 'Blocked Emergency Exit',
    category: 'emergency',
    severity: 'major',
    description:
      'A stack of pallets and a roll cage have been parked directly in front of a final fire exit door, under the running-man sign.',
    whyDangerous:
      'In a fire the building may become unsurvivable within a few minutes. An obstructed exit turns a survivable incident into multiple fatalities.',
    safetyTip:
      'Fire exits and their approach routes must be kept permanently clear and unlocked. Never use the space in front of an exit for storage, even temporarily.',
    trainExplanation:
      'Find every green running-man sign in the building and trace the route to the door. The hazard is not just something touching the door - anything narrowing the escape route counts. Ask: could 40 people leave through here in the dark, in 30 seconds?',
    keywords: ['means of escape', 'fire exit', 'keep clear', 'evacuation'],
    regulation: 'Emergency routes and exits must be kept clear at all times.',
  },
  {
    id: 'blocked-extinguisher',
    name: 'Blocked Fire Extinguisher',
    category: 'emergency',
    severity: 'minor',
    description:
      'Stacked cartons have been piled in front of the fire point, hiding the extinguisher and its signage.',
    whyDangerous:
      'A small fire can be put out in seconds with the right extinguisher. Seconds lost searching for hidden equipment is what turns a small fire into a total loss.',
    safetyTip:
      'Keep a clear zone in front of every fire point, keep the location sign visible from a distance, and check extinguishers monthly.',
    trainExplanation:
      'Fire points are marked with a red backboard and a sign mounted high so it can be seen over racking. If you cannot walk straight up to the extinguisher and lift it out, it is blocked.',
    keywords: ['fire point', 'clear access', 'signage visibility'],
    regulation: 'Firefighting equipment must be readily accessible and clearly indicated.',
  },
  {
    id: 'no-ppe-worker',
    name: 'Worker Without PPE',
    category: 'ppe',
    severity: 'minor',
    description:
      'A worker is inside the vehicle movement area in plain clothes - no high-visibility vest, no hard hat and no safety footwear.',
    whyDangerous:
      'Without hi-vis a person is very hard for a forklift driver to see against dark racking; without a hard hat any falling object is a head injury.',
    safetyTip:
      'Hi-vis, safety boots and a hard hat where loads are handled overhead are mandatory in the operational area. Challenge and correct anyone entering without them.',
    trainExplanation:
      'Compare the workers in the scene. Compliant staff wear a yellow or orange hi-vis vest and a helmet. The hazard is the person who stands out by not standing out - dark clothing in a vehicle area.',
    keywords: ['hi-vis', 'hard hat', 'safety footwear', 'visibility'],
    regulation: 'Suitable personal protective equipment must be provided and worn where risks remain.',
  },
  {
    id: 'open-dock-edge',
    name: 'Person at an Open Loading Dock Edge',
    category: 'height',
    severity: 'major',
    description:
      'A dock door is open with no trailer parked and no barrier. A worker is standing right on the unprotected edge, about 1.2 m above the yard.',
    whyDangerous:
      'Falls from dock level cause serious head, spine and pelvic injuries, and a forklift driven off an open dock is usually fatal for the operator.',
    safetyTip:
      'Keep unused dock doors closed. Where they must be open, fit a dock gate, chain or self-closing barrier and mark the edge clearly.',
    trainExplanation:
      'A loading dock is a hidden fall-from-height hazard because the drop looks small. Check every open dock door: is there a trailer sealed against it, or a physical barrier? An open void with a person near it is always a major hazard.',
    keywords: ['fall from height', 'dock gate', 'edge protection', 'wheel chock'],
    regulation: 'Prevent falls from any edge where a person could be injured.',
  },
  {
    id: 'trailing-cable',
    name: 'Trailing Electrical Cable',
    category: 'electrical',
    severity: 'minor',
    description:
      'A damaged extension lead runs loose across the floor from a wall socket, with exposed conductor at a tape repair and no cable protector.',
    whyDangerous:
      'It is both a trip hazard and an electrical hazard - damaged insulation on a wet warehouse floor risks electric shock as well as a fall.',
    safetyTip:
      'Route cables overhead or through a floor cable protector, take damaged leads out of service immediately, and keep portable equipment on an inspection regime.',
    trainExplanation:
      'Trace any cable you see from the socket to the tool. A safe cable is short, undamaged, and does not cross a walkway. Taped repairs, cuts and kinks all mean the lead should be quarantined.',
    keywords: ['trip hazard', 'cable protector', 'portable appliance testing', 'damaged insulation'],
    regulation: 'Electrical systems and portable equipment must be maintained to prevent danger.',
  },
  {
    id: 'broken-pallet',
    name: 'Broken / Damaged Pallet',
    category: 'storage',
    severity: 'minor',
    description:
      'A wooden pallet in use has snapped deck boards and a split bearer, yet it is still carrying a load.',
    whyDangerous:
      'A failing pallet drops its load without warning, often while it is on the forks at height or being walked past.',
    safetyTip:
      'Quarantine damaged pallets in a marked repair or scrap area. Never lift, stack or store a load on a pallet with broken boards or bearers.',
    trainExplanation:
      'Look at the pallet itself, not the load. Missing or cracked top boards, splintering and protruding nails all mean it is out of service. Good sites keep a clearly marked broken-pallet cage.',
    keywords: ['load failure', 'quarantine', 'inspect before use'],
    regulation: 'Work equipment, including pallets, must be suitable and in good repair.',
  },
  {
    id: 'overloaded-stack',
    name: 'Overloaded / Over-height Stack',
    category: 'storage',
    severity: 'minor',
    description:
      'A free-standing block stack of cartons has been built far above the safe stacking height, narrow at the base and visibly out of plumb.',
    whyDangerous:
      'Tall unsupported stacks topple sideways with no warning, particularly when a forklift passes and vibrates the floor.',
    safetyTip:
      'Observe the site maximum stacking height, keep block stacks pyramid-stable with the heaviest goods at the bottom, and use racking rather than height.',
    trainExplanation:
      'Compare stack height to the racking beams and to the people nearby. A rule of thumb is that a free-standing stack should not exceed three times its shortest base dimension. Judge base width against height, and look for lean.',
    keywords: ['stacking height', 'base to height ratio', 'heaviest at bottom'],
    regulation: 'Goods must not be stacked at a height or in a manner that makes them unstable.',
  },
  {
    id: 'unsafe-ladder',
    name: 'Unsafe Ladder Use',
    category: 'height',
    severity: 'major',
    description:
      'A leaning ladder is set at far too shallow an angle on the smooth floor, unfooted and untied, with a worker standing on the top two rungs holding a box.',
    whyDangerous:
      'Falls from ladders are a leading cause of major workplace injury. An unfooted ladder on a smooth floor slides out with no warning.',
    safetyTip:
      'Use the 1-in-4 rule, tie or foot the ladder, keep three points of contact and never work from the top three rungs. For picking at height, use a proper order picker or step platform.',
    trainExplanation:
      'Ladders should be a last resort in a warehouse. Check the angle (roughly 75 degrees, one out for four up), whether it is secured, and where the worker feet and hands are. Carrying a load while standing on the top rungs is unsafe on every count.',
    keywords: ['1 in 4 rule', 'three points of contact', 'tie or foot', 'order picker'],
    regulation: 'Work at height must be properly planned, supervised and carried out with suitable equipment.',
  },
  {
    id: 'blind-corner',
    name: 'Blind Corner Conflict',
    category: 'vehicle',
    severity: 'major',
    description:
      'A forklift and a pedestrian are approaching the same rack corner from opposite sides. Solid stock blocks the sight line and there is no mirror or warning signage.',
    whyDangerous:
      'Neither party can see the other until they are within stopping distance. Blind-corner strikes are among the most common serious warehouse collisions.',
    safetyTip:
      'Fit convex mirrors at blind corners, sound the horn on approach, slow to walking pace, and keep corner sight lines clear of stacked stock.',
    trainExplanation:
      'A blind corner is a hazard created by the layout, not by a single object. Ask at every junction: could something be coming that I cannot see? Controls are mirrors, horn discipline, floor markings and keeping the corner clear.',
    keywords: ['sight lines', 'convex mirror', 'sound horn', 'junction control'],
    regulation: 'Traffic routes must be organised so that vehicles and pedestrians can circulate safely.',
  },
];

/** id -> definition lookup. */
export const HAZARD_BY_ID = Object.fromEntries(HAZARDS.map((h) => [h.id, h]));

export function getHazard(id) {
  const h = HAZARD_BY_ID[id];
  if (!h) throw new Error(`Unknown hazard id: ${id}`);
  return h;
}

export function hazardsByCategory() {
  const out = {};
  for (const h of HAZARDS) (out[h.category] ??= []).push(h);
  return out;
}
