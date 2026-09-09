"""
Builds a clean ZIP for submission.

Excludes everything regenerable (node_modules, build output, git history,
screenshot sources) and puts the playable game at the top level so the
recipient can double-click it without reading anything first.
"""
import os, zipfile, datetime

OUT = 'Beat-The-Hazard-SUBMISSION.zip'

INCLUDE_DIRS = ['src', 'tests', 'docs', 'scripts', '.github']
INCLUDE_FILES = [
    'index.html', 'package.json', 'package-lock.json',
    'vite.config.js', 'vite.single.config.js',
    'README.md', '.env.example', '.gitignore',
    'Beat-The-Hazard-Presentation.pptx',
]
# ppt/ source only — never its node_modules or the ~20 MB of screenshots
PPT_FILES = ['ppt/build-deck.cjs', 'ppt/audit.py', 'ppt/capture-server.mjs',
             'ppt/package.json', 'ppt/README.md']

SKIP_DIRS = {'node_modules', '.git', 'dist', 'dist-single', 'shots', '__pycache__', '.vite'}

START_HERE = """BEAT THE HAZARD
3D Interactive Health & Safety Training Game
Warehouse Forklift & Pedestrian Safety

Kushal Neupane
Packaged {date}

--------------------------------------------------------------------
TO PLAY IT RIGHT NOW  (no install, no internet)
--------------------------------------------------------------------

    Double-click:   PLAY-Beat-The-Hazard.html

That single file IS the whole game. It opens in any modern browser
(Chrome, Edge, Firefox). Nothing to install, no server, no account.

CONTROLS
    W A S D / arrows .... move
    Mouse ............... look around
    Shift ............... run
    C ................... crouch
    E  or  left click ... flag the hazard you are looking at
    Esc ................. pause

If the browser will not capture the mouse (some open the file in a
restricted mode), the game automatically switches to CLICK AND DRAG
to look around. It stays fully playable either way.

SUGGESTED 3-MINUTE TOUR
    1. Enter any name, pick an avatar
    2. TRAIN MODE -> Main Storage Hall
       Hazards are ringed. Walk up to one and press E.
       Read the card: what it is, why it is dangerous, the control.
    3. Find all 15 to complete training
    4. TEST MODE -> Main Storage Hall -> Simple
       No rings now. Find them yourself against the clock.
    5. Try flagging something that looks wrong but is not
       (a spill that IS coned and signed) to see the game teach.

--------------------------------------------------------------------
THE PRESENTATION
--------------------------------------------------------------------

    Beat-The-Hazard-Presentation.pptx    15 slides, with speaker notes

--------------------------------------------------------------------
THE DOCUMENTATION  (start here for the write-up)
--------------------------------------------------------------------

    README.md                     overview, install, controls, features,
                                  limitations
    docs/PROJECT_CONTEXT.md       orientation - read this first
    docs/ARCHITECTURE.md          how the code is structured
    docs/GAME_DESIGN.md           design reasoning
    docs/HAZARDS.md               all 15 hazards in full
    docs/ENVIRONMENTS.md          the three warehouses
    docs/DECISIONS.md             every technical decision and why
    docs/TESTING.md               what is tested and what is NOT
    docs/ASSET_CREDITS.md         asset inventory (all procedural)
    docs/DEVELOPMENT_STATUS.md    status, known issues, next steps

--------------------------------------------------------------------
THE SOURCE CODE
--------------------------------------------------------------------

    src/        the game            (30 files)
    tests/      94 automated tests   (4 files)
    scripts/    build + QA tooling
    .github/    CI and deployment workflows

To run from source you need Node.js 20 or newer:

    npm install
    npm run dev          then open http://localhost:5173
    npm test             runs all 94 tests
    npm run build        production build

node_modules is deliberately NOT included (it is ~64 MB and is
recreated by "npm install").

--------------------------------------------------------------------
ONLINE
--------------------------------------------------------------------

    Source code:  https://github.com/kushalthewave/interprize-project
""".format(date=datetime.date.today().isoformat())

added = []
with zipfile.ZipFile(OUT, 'w', zipfile.ZIP_DEFLATED, compresslevel=9) as z:
    z.writestr('START-HERE.txt', START_HERE)
    added.append(('START-HERE.txt', len(START_HERE)))

    play = 'dist-single/beat-the-hazard.html'
    if os.path.exists(play):
        z.write(play, 'PLAY-Beat-The-Hazard.html')
        added.append(('PLAY-Beat-The-Hazard.html', os.path.getsize(play)))

    for f in INCLUDE_FILES + PPT_FILES:
        if os.path.exists(f):
            z.write(f, f)
            added.append((f, os.path.getsize(f)))

    for d in INCLUDE_DIRS:
        for root, dirs, files in os.walk(d):
            dirs[:] = [x for x in dirs if x not in SKIP_DIRS]
            for fn in files:
                p = os.path.join(root, fn)
                arc = p.replace(os.sep, "/")
                z.write(p, arc)
                added.append((arc, os.path.getsize(p)))

size = os.path.getsize(OUT)
print(f'{OUT}  —  {len(added)} files, {size/1024/1024:.2f} MB\n')
top = {}
for name, sz in added:
    key = name.split('/')[0] if '/' in name else name
    top[key] = top.get(key, 0) + sz
for k, v in sorted(top.items(), key=lambda kv: -kv[1]):
    print(f'  {k:38s} {v/1024:8.0f} kB')
