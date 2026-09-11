"""
a7.py — Task A7: Presentation of initial solution ideas / prototypes to the
client (30 marks, marked by the client).

The brief asks for three things:
  · the plan for the demonstration and presentation, including an individual
    responsibility chart
  · a copy of the presentation, with notes
  · a copy of the prototype application, with instructions for operating it

Produces:
  Presentation_Plan.docx               running order, timings, contingency, Q&A
  Individual_Responsibility_Chart.docx who does what, before / during / after
  Presentation_Slides.pptx             copied from the built deck (with notes)
  Prototype_Instructions.docx          how to run it, three ways
  Prototype/                           the runnable application
"""
import os
import shutil

import config as CFG
from common import (bullets, callout, cover, h1, h2, h3, new_doc, numbered,
                    page_break, para, save, table, todo)

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(HERE)

# (#, slide, minutes, cumulative, speaker key, note)
RUNNING_ORDER = [
    (1, "Title and team", "0:30", "0:30", "pm",
     "Names, roles and the one-sentence pitch. Do not read the slide."),
    (2, "The problem", "1:30", "2:00", "pm",
     "Induction teaches rules in a room and expects them on a floor. Ask the room how "
     "their last induction went; let them answer."),
    (3, "What we built", "1:00", "3:00", "pm",
     "One paragraph and a screenshot. Detail comes later — resist it here."),
    (4, "A hazard is never an icon", "2:00", "5:00", "design",
     "★ The design philosophy in one comparison. Give it the full two minutes and let "
     "the room search the screenshot themselves before you say anything."),
    (5, "The 15 hazards", "1:00", "6:00", "design",
     "Scope made concrete. Read three, not fifteen."),
    (6, "Decoys — learning by contrast", "1:30", "7:30", "design",
     "★ What separates this from a click-the-hotspot trainer. The signed-and-coned "
     "spill is the example to use."),
    (7, "Train then Test", "1:00", "8:30", "ux",
     "Train has no clock — a guide arrow, the location and a column of light lead to "
     "each hazard. Test is five minutes with no help. Training is optional."),
    (8, "Difficulty", "1:00", "9:30", "ux",
     "Every test is five minutes. Each level changes the fast-bonus threshold, the "
     "decoys, the lighting and the guidance — not a label."),
    (9, "Scoring, combo and ranks", "0:45", "10:15", "ux",
     "The numbers are on screen. Say why speed is scored, not what the numbers are."),
    (10, "Hazard locations", "0:45", "11:00", "ux",
     "A finding the trainee cannot describe afterwards is not a finding."),
    (11, "Three environments", "1:00", "12:00", "design",
     "Breadth, and the reason the same hazard reads differently in each."),
    (12, "Sign-in and security", "1:30", "13:30", "tech",
     "Passkeys, social sign-in, authenticator codes — and the limits, stated plainly."),
    (13, "How it is built", "0:45", "14:15", "tech",
     "Credibility, not story. First to cut if running behind."),
    (14, "9,587 → 994 draw calls", "1:00", "15:15", "tech",
     "★ A real measured problem solved with a named technique. The strongest technical "
     "moment in the talk."),
    (15, "Proven, not assumed", "1:00", "16:15", "qa",
     "266 tests, and the ones that caught bugs nothing else would have."),
    (16, "What went wrong", "1:00", "17:15", "qa",
     "★ Finding your own defects reads as competence. Do not apologise through it."),
    (17, "Honest limitations", "0:45", "18:00", "qa",
     "No VR, no central reporting, browsers not yet tested. Say it before they ask it."),
    (18, "Close and live demonstration", "2:00", "20:00", "tech",
     "Hand to the demo. Finish on the results screen and take questions."),
]

DEMO_STEPS = [
    ("Before the room fills", "Game already loaded in a second window, signed in, sitting "
     "on the menu. Never load it in front of the client — a loading screen is dead air and "
     "it looks like a risk."),
    ("Walk the Main Storage Hall", "Ten seconds of movement so the room understands it is "
     "a real space and not a slideshow."),
    ("Find the falling boxes", "A major hazard, flagged fast. Show the find panel: name, "
     "location, keywords."),
    ("Flag a decoy on purpose", "The coned-and-signed spill. Let the game explain why that "
     "one is safe. **This is the moment that sells the product** — it is the difference "
     "between teaching judgement and teaching a checklist."),
    ("Open the results screen", "Rank, breakdown, and every hazard named including the "
     "missed ones. Stop here."),
    ("Stop", "Do not explore. Do not show one more thing. Finish on results and take "
     "questions."),
]

RESPONSIBILITIES = {
    "pm": {
        "before": ["Books the room, confirms time and attendees with the client",
                   "Owns the running order and calls the rehearsals",
                   "Prints the handout and the one-page control card",
                   "Circulates the deck 24 hours ahead"],
        "during": ["Opens: introduces the team and the pitch (slides 1–3)",
                   "Keeps time against the [m:ss] markers and signals the 5-minute mark",
                   "Chairs questions and directs each one to the right member",
                   "Closes and states the next step"],
        "after": ["Writes the client's feedback into the A3 interaction log the same day",
                  "Circulates thanks and confirms agreed actions"],
    },
    "design": {
        "before": ["Prepares slides 4, 5, 6 and 11 and the screenshots in them",
                   "Checks every image renders on the projector, not just the laptop"],
        "during": ["Presents the design philosophy — the four slides that carry the talk "
                   "start with slide 4",
                   "Answers questions on environments, hazard staging and realism"],
        "after": ["Records any client request about hazard content as a requirement change"],
    },
    "ux": {
        "before": ["Prepares slides 7–10", "Prepares the accessibility answers"],
        "during": ["Presents modes, difficulty, scoring and locations",
                   "Answers questions on usability, accessibility and the trainee "
                   "experience"],
        "after": ["Logs usability feedback for the Assessment 2 test plan"],
    },
    "tech": {
        "before": ["Prepares slides 12–14 and 18",
                   "**Owns the demonstration**: machine, second window, signed in, "
                   "rehearsed to two minutes",
                   "Prepares the offline build on a USB stick as the fallback"],
        "during": ["Presents security, build and performance",
                   "Runs the live demonstration",
                   "Answers technical questions, including hostile ones"],
        "after": ["Notes any technical commitment made in the room, so it does not become "
                  "an assumed feature"],
    },
    "qa": {
        "before": ["Prepares slides 15–17",
                   "Verifies every factual claim in the deck against the running build",
                   "Prepares the limitations answer so it is delivered, not conceded"],
        "during": ["Presents testing, the defects we found, and the limitations",
                   "Answers questions on quality, coverage and what is not tested"],
        "after": ["Turns client feedback into logged defects or requirements"],
    },
}

QA_PREP = [
    ("How long does it take a trainee?",
     "A test is exactly five minutes on every difficulty, so it fits in a gap in a "
     "shift and scores compare. Training has no clock, and it is optional."),
    ("Can we see who has completed it?",
     "On the machine they used, yes — every session is recorded against their profile. "
     "Centrally, no, and that is the honest limitation. It is a small backend, and we "
     "would rather agree it with you than assume it."),
    ("What if the site has no Wi-Fi?",
     "Then use the offline build. One HTML file, 828 kB, runs from a USB stick with no "
     "network at all. We can demonstrate that now if you would like."),
    ("Is it accurate to our site?",
     "The hazards are generic warehouse hazards across seven recognised categories. "
     "Making the environment resemble your site is a content change, not a "
     "redevelopment — that is a conversation we would like to have."),
    ("Why not VR?",
     "We have no headset to test on. Building a VR mode we could not run would be "
     "guesswork presented as a feature, and this is a safety product. Also, practically: "
     "a headset does not fit into a ten-minute gap in a shift."),
    ("What does it cost?",
     "Nothing to run and nothing to host. What we want in return is feedback from a real "
     "site."),
    ("What does not work yet?",
     "Firefox and Safari are untested. Screen-reader support is untested. Touch controls "
     "are built but have not been run on physical hardware. There is no central "
     "reporting. We would rather you heard that from us."),
    ("Who did what?",
     "Point at the individual responsibility chart in the handout, and let each member "
     "answer for their own area."),
]

CONTINGENCY = [
    ("The demo machine will not run the game",
     "Open the offline build from the USB stick. If that fails, the deck carries real "
     "screenshots of every step of the demo — narrate those instead. Never spend more "
     "than 30 seconds debugging in front of the client."),
    ("No internet in the room",
     "The offline build needs none. Load it before the session as a matter of course."),
    ("The projector washes out the dark theme",
     "Check this before the room fills. If it is bad, raise the room's lighting or "
     "switch to the laptop screen for the demo and narrate."),
    ("A member is absent",
     "Their slides transfer to the member listed as backup in the responsibility chart. "
     "Every member rehearses one neighbour's section for this reason."),
    ("Running behind at slide 12",
     "Cut slide 13, then 9, then 10 — in that order, each is self-contained. **Never cut "
     "4, 6, 16 or the demonstration.**"),
    ("A question we cannot answer",
     "Say so, write it down, and say when we will come back with an answer. Guessing in "
     "front of a client is the one failure that costs more than the question did."),
]


def presentation_plan(out_dir):
    doc = new_doc()
    cover(doc, "Task A7", "Presentation and Demonstration Plan",
          f"A 20-minute client presentation to {CFG.CLIENT_ORG}, including a "
          "live demonstration of the working prototype.")

    h1(doc, "1  Objective and shape")
    para(doc,
         "Twenty minutes, including questions, with every member present and speaking. "
         "The session has to do three things: show that we understand the client's "
         "problem, show something real running, and leave them confident that this team "
         "will finish it.")
    para(doc,
         "The shape is deliberate. Eighteen minutes of presentation and a two-minute live "
         "demonstration at the end — not the other way round. A demo at the start "
         "consumes all the attention in the room and the argument never gets made; a demo "
         "at the end is the proof of an argument the room has already followed.")
    table(doc, ["", ""], [
        ["**Duration**", "20 minutes total, including questions"],
        ["**Format**", "18 slides + a 2-minute live demonstration"],
        ["**Presenters**", f"All {len(CFG.MEMBERS)} members"],
        ["**Deck**", "`Presentation_Slides.pptx` — speaker notes on every slide, each "
                     "opening with a cumulative `[m:ss]` marker"],
        ["**Prototype**", "The deployed build, with the offline build on a USB stick as "
                          "the fallback"],
    ], widths=[3.2, 12.8], size=9.6, zebra=None)

    h1(doc, "2  Running order")
    para(doc,
         "Every slide's speaker notes begin with the cumulative time, so any presenter can "
         "tell at a glance whether the talk is ahead or behind. ★ marks the four slides "
         "that carry the session.")
    rows = []
    for n, title, mins, cum, key, note in RUNNING_ORDER:
        rows.append([str(n), title, mins, cum, CFG.member(key)["short"], note])
    table(doc, ["#", "Slide", "Time", "Cum.", "Speaker", "Note to the presenter"],
          rows, widths=[0.8, 3.6, 1.1, 1.1, 1.6, 7.8], size=8.6,
          align_center=(0, 2, 3, 4))

    h2(doc, "2.1  The four slides that carry the talk")
    bullets(doc, [
        "**4 — A hazard is never an icon.** The entire design philosophy in one "
        "comparison. Give it the full two minutes and let the room search the screenshot "
        "themselves before saying anything.",
        "**6 — Decoys.** What separates this from a click-the-hotspot trainer.",
        "**14 — 9,587 → 994 draw calls.** A real measured problem solved with a named "
        "technique.",
        "**16 — What went wrong.** Finding your own defects reads as competence, not "
        "weakness. Do not apologise through this slide.",
    ])

    h1(doc, "3  The demonstration")
    para(doc,
         "Two minutes, rehearsed to the second, run by the Technical Lead. The single "
         "most common way a demonstration fails is that the presenter starts exploring. "
         "This one has six steps and stops.")
    table(doc, ["Step", "What happens, and why"],
          [[d[0], d[1]] for d in DEMO_STEPS],
          widths=[3.6, 12.4], size=9.4)
    callout(doc, "The moment that sells it",
            "Flagging the decoy **on purpose** and letting the game explain why the "
            "coned-and-signed spill is safe. That is the difference between teaching "
            "judgement and teaching a checklist, and it lands far better shown than "
            "described.")

    h1(doc, "4  Room and equipment checklist")
    para(doc, "Completed by the Project Manager 30 minutes before the session.")
    table(doc, ["✓", "Check"], [
        ["☐", "Game already loaded in a second window, signed in, sitting on the menu"],
        ["☐", "Offline build (`beat-the-hazard.html`) on the USB stick, opened once to "
              "confirm it runs on this machine"],
        ["☐", "Deck open in presenter view so the `[m:ss]` markers are visible"],
        ["☐", "Projector checked with the dark theme — this is a dark deck"],
        ["☐", "Audio tested, and confirmed unnecessary if it fails"],
        ["☐", "Handouts printed: running order, responsibility chart, the link"],
        ["☐", "Laptop on mains power, notifications silenced, screen sleep disabled"],
        ["☐", "Every member knows their slides and their neighbour's"],
    ], widths=[1.2, 14.8], size=9.6, align_center=(0,))

    page_break(doc)

    h1(doc, "5  Anticipated questions")
    para(doc,
         "Prepared in advance and assigned, so no question is answered by whoever happens "
         "to speak first. The last three are the ones we most want to be asked.")
    table(doc, ["Question", "Our answer"],
          [[q[0], q[1]] for q in QA_PREP],
          widths=[4.4, 11.6], size=9.2)

    h1(doc, "6  Contingency")
    para(doc,
         "Every one of these has a decided response, because deciding in the room costs "
         "more time than the problem does.")
    table(doc, ["If this happens", "Do this"],
          [[c[0], c[1]] for c in CONTINGENCY],
          widths=[4.4, 11.6], size=9.2)

    h1(doc, "7  Rehearsal plan")
    table(doc, ["When", "What", "Who"], [
        ["Week 11", "Read-through against the clock. No slides — establishes whether the "
                    "content fits at all.", "All"],
        ["Week 11", "Demonstration rehearsed alone, ten times, until it is two minutes "
                    "without thinking.", "Technical Lead"],
        ["Week 12", "Full dress rehearsal with the projector, in the actual room if "
                    "possible.", "All"],
        ["Week 12", "Hostile question drill — each member is asked the hardest question "
                    "about someone else's area.", "All"],
    ], widths=[2.2, 10.4, 3.4], size=9.4)

    h1(doc, "8  After the session")
    numbered(doc, [
        "The Project Manager writes the client's feedback into the A3 interaction log "
        "**the same day**, while the wording is still remembered.",
        "Any request that changes scope is written up as a requirement change against its "
        "A1 identifier, not as a note.",
        "Anything we promised in the room is entered as an action with an owner and a date.",
        "The team holds a 15-minute retrospective: what landed, what did not, what to "
        "change for the next one.",
    ])

    return save(doc, out_dir, "Presentation_Plan.docx")


def responsibility_chart(out_dir):
    doc = new_doc()
    cover(doc, "Task A7", "Individual Responsibility Chart",
          "Who is responsible for what, before, during and after the client "
          "presentation.")

    h1(doc, "1  Summary")
    rows = []
    for m in CFG.MEMBERS:
        slides = [str(r[0]) for r in RUNNING_ORDER if r[4] == m["key"]]
        rows.append([m["name"], m["role"], ", ".join(slides) or "—",
                     f"{len(slides)} slide(s)"])
    table(doc, ["Member", "Role", "Slides presented", "Share"], rows,
          widths=[4.0, 5.0, 4.6, 2.4], size=9.4)

    para(doc,
         "Slides were allocated to the member who owns that area of the work, so every "
         "answer in the question session comes from the person who actually did it. "
         "That is also why every member speaks: a team where one person presents and four "
         "sit silently invites the question of what the other four did.")

    h1(doc, "2  Detailed responsibilities")
    for m in CFG.MEMBERS:
        r = RESPONSIBILITIES[m["key"]]
        h2(doc, f"{m['name']} — {m['role']}")
        table(doc, ["Phase", "Responsibilities"], [
            ["**Before**", "\n".join("· " + x for x in r["before"])],
            ["**During**", "\n".join("· " + x for x in r["during"])],
            ["**After**", "\n".join("· " + x for x in r["after"])],
        ], widths=[2.6, 13.4], size=9.2, zebra=None)

    h1(doc, "3  Backup cover")
    para(doc,
         "Every member rehearses the section of the person listed beside them, so an "
         "absence on the day costs the presentation a little polish rather than a whole "
         "section.")
    rows = []
    for i, m in enumerate(CFG.MEMBERS):
        backup = CFG.MEMBERS[(i + 1) % len(CFG.MEMBERS)]
        rows.append([m["name"], backup["name"]])
    table(doc, ["If this member is absent", "This member covers their slides"], rows,
          widths=[7.0, 9.0], size=9.4)
    callout(doc, "One exception",
            "The live demonstration is not covered by a backup presenter. If the "
            "Technical Lead is absent, the demonstration is replaced by the screenshot "
            "walkthrough already in the deck. An unrehearsed live demo in front of a "
            "client is worse than no live demo.")

    todo(doc, "Replace the member names in `assessment/config.py` and rebuild. The slide "
              "allocation in §1 and the backup pairing in §3 are both generated from that "
              "file, so they will stay consistent with each other.")

    return save(doc, out_dir, "Individual_Responsibility_Chart.docx")


def prototype_instructions(out_dir):
    doc = new_doc()
    cover(doc, "Task A7", "Prototype — Operating Instructions",
          f"Three ways to run {CFG.PRODUCT}, in order of how little they ask "
          "of you.",
          extra=[("Live", CFG.LIVE_URL), ("Offline build", CFG.OFFLINE_URL)])

    h1(doc, "1  The quickest way")
    para(doc, f"Open **{CFG.LIVE_URL}** in Chrome or Edge. That is the whole procedure. "
              "There is nothing to install and no account to create — the first screen "
              "lets you enter a name and start.")

    h1(doc, "2  With no internet at all")
    para(doc,
         "The submission contains `Prototype/beat-the-hazard.html`. It is one file of "
         "828 kB containing the entire product — code, geometry, textures and audio. "
         "Copy it anywhere, double-click it, and it runs with the network disconnected.")
    callout(doc, "One limitation of the offline file",
            "Browsers only allow passkeys in a secure context, so opening the file "
            "directly from disk (`file://`) disables passkey sign-in. The product detects "
            "this and says so rather than failing mysteriously. Name sign-in works "
            "normally, and everything else is identical. Use the online version if you "
            "want to see passkeys.")

    h1(doc, "3  From source")
    para(doc, "Requires Node.js 20 or newer.")
    table(doc, ["Step", "Command"], [
        ["Install dependencies", "`npm ci`"],
        ["Run the development server", "`npm run dev`"],
        ["Run the test suite (266 tests)", "`npm test`"],
        ["Build for production", "`npm run build`"],
        ["Build the single offline file", "`npm run build:single`"],
    ], widths=[6.0, 10.0], size=9.6)

    h1(doc, "4  Controls")
    table(doc, ["Action", "Keyboard and mouse", "Touch"], [
        ["Move", "W A S D", "Left stick"],
        ["Look", "Move the mouse (click once to capture it)", "Drag anywhere"],
        ["Run", "Hold Shift", "—"],
        ["Crouch", "Hold C", "—"],
        ["Flag a hazard", "E, or left click", "The flag button"],
        ["Pause", "Esc or P", "The pause button"],
    ], widths=[3.6, 7.4, 5.0], size=9.6)
    para(doc,
         "If the browser refuses to capture the mouse — which happens inside embedded "
         "frames and some managed environments — the product says so and switches to "
         "click-and-drag look. Nothing is lost.")

    h1(doc, "5  A five-minute route through it")
    numbered(doc, [
        "Enter a name and continue.",
        "Choose **Training** and the **Main Storage Hall**. There is no clock, and it "
        "cannot be failed.",
        "Follow the arrow at the top of the screen and the column of light. The panel on "
        "the left names the hazard and where it is. When you can see it, aim and press **E**.",
        "Read a find panel: the hazard's name, its location on the floor, why it is a "
        "hazard, and the keywords to remember.",
        "Return to the menu, choose **Test** and **Mid**, and run the same warehouse in "
        "five minutes — no guide, no locations. Six decoys are now present.",
        "Deliberately flag the spill that has cones and a warning sign, and read what the "
        "game says. That contrast is the point of the product.",
        "Finish the round and read the results screen — every hazard is named, including "
        "the ones you walked past.",
    ])

    h1(doc, "6  If something goes wrong")
    table(doc, ["Symptom", "Cause and remedy"], [
        ["A written message saying WebGL is unavailable",
         "The browser has no WebGL 2, usually because hardware acceleration is off. "
         "Enable it in the browser's settings, or use a different browser."],
        ["“Click to look around” will not go away",
         "The browser is refusing pointer lock. Click and drag instead — the product "
         "will have said so in a message."],
        ["Passkey options are unavailable",
         "You are on `file://`. Use the online version."],
        ["It runs slowly",
         "Turn on the performance overlay in Settings and check the frame rate. Closing "
         "other GPU-heavy tabs usually resolves it."],
        ["Progress has disappeared",
         "Profiles are stored in the browser's local storage, per browser and per "
         "machine. A private window, or a different browser, starts empty by design."],
    ], widths=[5.0, 11.0], size=9.4)

    h1(doc, "7  What is in the Prototype folder")
    table(doc, ["Item", "What it is"], [
        ["`beat-the-hazard.html`", "The complete product in one file. Double-click it."],
        ["`README.txt`", "The two-line version of this document."],
        ["`source/`", "The full source, if you want to build or read it. Also at "
                      f"{CFG.REPO_URL}"],
    ], widths=[5.0, 11.0], size=9.4)

    return save(doc, out_dir, "Prototype_Instructions.docx")


def assets(out_dir):
    """Copy the deck and the runnable prototype into A7/."""
    deck = os.path.join(REPO, "Beat-The-Hazard-Presentation.pptx")
    if os.path.exists(deck):
        shutil.copyfile(deck, os.path.join(out_dir, "Presentation_Slides.pptx"))
        print("  · A7/Presentation_Slides.pptx")
    else:
        print("  !! deck not found — run `cd ppt && npm run build` first")

    proto = os.path.join(out_dir, "Prototype")
    os.makedirs(proto, exist_ok=True)

    single = os.path.join(REPO, "dist-single", "beat-the-hazard.html")
    if os.path.exists(single):
        shutil.copyfile(single, os.path.join(proto, "beat-the-hazard.html"))
        print("  · A7/Prototype/beat-the-hazard.html")
    else:
        print("  !! offline build not found — run `npm run build:single` first")

    with open(os.path.join(proto, "README.txt"), "w", encoding="utf-8") as f:
        f.write(
            f"{CFG.PRODUCT} — {CFG.COMPANY}\n"
            f"{'=' * 46}\n\n"
            "TO RUN IT, EITHER:\n\n"
            f"  1. Open {CFG.LIVE_URL} in Chrome or Edge.\n\n"
            "  2. Or double-click beat-the-hazard.html in this folder. It contains the\n"
            "     whole product in one file and needs no internet connection at all.\n\n"
            "CONTROLS\n\n"
            "  W A S D   move            E or left click   flag a hazard\n"
            "  Mouse     look            Esc or P          pause\n"
            "  Shift     run             C                 crouch\n\n"
            "  On a touch device: left stick to move, drag to look, on-screen flag button.\n\n"
            "NOTE\n\n"
            "  Opened from disk (file://) the browser will not permit passkey sign-in,\n"
            "  because passkeys require a secure context. The product says so rather than\n"
            "  failing silently. Sign in with a name instead, or use the online version.\n\n"
            "  Full instructions: Prototype_Instructions.docx in the folder above.\n"
            f"  Source: {CFG.REPO_URL}\n"
        )
    print("  · A7/Prototype/README.txt")

    # The source, minus everything that should never be shipped.
    src_dst = os.path.join(proto, "source")
    if os.path.isdir(src_dst):
        shutil.rmtree(src_dst)
    ignore = shutil.ignore_patterns(
        "node_modules", ".git", "dist", "dist-single", "*.zip", "__pycache__",
        "_figures", "_build", "_out_test", ".env", "shots", "assessment",
    )
    for item in ("src", "tests", "scripts", "docs", "public", "design",
                 "index.html", "package.json", "package-lock.json",
                 "vite.config.js", "vite.single.config.js", "README.md",
                 ".env.example"):
        s = os.path.join(REPO, item)
        d = os.path.join(src_dst, item)
        if os.path.isdir(s):
            shutil.copytree(s, d, ignore=ignore)
        elif os.path.isfile(s):
            os.makedirs(src_dst, exist_ok=True)
            shutil.copyfile(s, d)
    print("  · A7/Prototype/source/")


def build(out_dir):
    paths = [
        presentation_plan(out_dir),
        responsibility_chart(out_dir),
        prototype_instructions(out_dir),
    ]
    assets(out_dir)
    return paths
