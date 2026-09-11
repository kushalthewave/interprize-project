"""
a1.py — Task A1: Initial Design Documents (20 marks).

  · a comprehensive list of functional and non-functional requirements   (0–4)
  · evidence of user requirements analysis — PACT, personas, heuristics   (0–8)
  · evidence of system requirements analysis — context, use cases,
    structured flowcharts, architecture, data model, traceability        (0–8)

Every requirement below describes behaviour that exists in the built product
or is explicitly marked as not yet built. Nothing is aspirational without
saying so.
"""
import os

import config as CFG
from common import (AMBER, MUTED, bullets, callout, caption, cover, figure, h1, h2, h3,
                    new_doc, numbered, page_break, para, save, table)

FIG = os.path.join(os.path.dirname(os.path.abspath(__file__)), "_figures")


# ══════════════════════════════════════════════════════════════════════
# Requirements data
# ══════════════════════════════════════════════════════════════════════
# (id, requirement, MoSCoW, source, state)
FUNCTIONAL = [
    ("FR-01", "A trainee can sign in with a display name and one of five avatars, with no "
              "account and no password.", "Must", "Client brief", "Built"),
    ("FR-02", "A trainee can sign in with a passkey (WebAuthn) when the browser and device "
              "support one, including a phone or a security key.", "Should", "Team", "Built"),
    ("FR-03", "A trainee can sign in with Google or Facebook once a client ID is configured, "
              "either at build time or from Settings.", "Could", "Team", "Built"),
    ("FR-04", "GitHub sign-in is offered only when a server-side exchange endpoint is "
              "configured; otherwise the button is disabled and states the reason.",
     "Could", "Team", "Built"),
    ("FR-05", "A trainee can enrol an authenticator app (TOTP) and is then asked for a "
              "6-digit code at every subsequent sign-in.", "Could", "Team", "Built"),
    ("FR-06", "The trainee profile — identity, settings, progress, history — persists "
              "between sessions on the same browser.", "Must", "Client brief", "Built"),
    ("FR-07", "Resetting progress clears scores and history but preserves enrolled "
              "passkeys and 2FA.", "Should", "Heuristic review", "Built"),
    ("FR-08", "A trainee can sign out; the login screen then welcomes them back with their "
              "name and avatar pre-filled, and a passkey restores the same person.",
     "Must", "Defect DEF-17", "Built"),

    ("FR-09", "The system offers two modes: Training (guided) and Test (assessed).",
     "Must", "Client brief", "Built"),
    ("FR-10", "The system offers three distinct warehouse environments.",
     "Must", "Client brief", "Built"),
    ("FR-11", "Test mode offers three difficulty levels — Simple, Mid and Hard — which "
              "change the fast-bonus threshold, the decoy count, the lighting, the guidance "
              "and the aim tolerance, not merely a label.", "Must", "Client brief", "Built"),
    ("FR-12", "Training mode has no clock at all, and is optional: every Test environment "
              "and difficulty is open without it.", "Must", "Client feedback", "Built"),
    ("FR-13", "Test mode is one fixed five-minute round on every difficulty, counting down "
              "in the HUD and warning at one minute and thirty seconds.", "Must", "Client feedback", "Built"),

    ("FR-14", "The trainee moves in first person — walk, run and crouch — and is stopped "
              "by racking, walls, stock and equipment.", "Must", "Client brief", "Built"),
    ("FR-15", "Look control uses pointer lock, and falls back to click-and-drag when the "
              "browser refuses pointer lock.", "Must", "Defect DEF-04", "Built"),
    ("FR-16", "On a touch device the system presents a movement stick, drag-to-look and a "
              "flag button.", "Should", "PACT — technologies", "Built"),
    ("FR-17", "A trainee flags whatever is under the reticle with E, a left click, or the "
              "on-screen flag button.", "Must", "Client brief", "Built"),
    ("FR-18", "A flag is rejected when the target is beyond the interaction range or the "
              "line of sight is blocked by world geometry.", "Must", "Team", "Built"),
    ("FR-19", "Each environment contains 15 hazards, each constructed as the physical "
              "situation it describes rather than as a labelled marker.",
     "Must", "Client brief", "Built"),
    ("FR-20", "Difficulty injects visually similar but genuinely safe decoys — none on "
              "Simple, 6 on Mid, 12 on Hard.", "Should", "Client brief", "Built"),
    ("FR-21", "On Mid and Hard, hazards animate: forklifts patrol and unstable cartons "
              "fall and reset.", "Should", "Client brief", "Built"),
    ("FR-22", "The round pauses on Esc, on P, and automatically when the browser tab is "
              "hidden, so a test clock never runs unattended.",
     "Must", "Heuristic review", "Built"),

    ("FR-23", "Scoring follows the published table: major +15 found in time / +7 late; "
              "minor +5 / +2; a decoy or an empty flag scores 0.",
     "Must", "Client brief", "Built"),
    ("FR-24", "Three correct finds in a row activates a combo, adding +3 to every "
              "subsequent find until it is broken.", "Must", "Client brief", "Built"),
    ("FR-25", "The results screen names every hazard in the round — found and missed — "
              "with its severity and the control. After training it also gives each "
              "hazard's location; after a test it deliberately does not.", "Must", "Client brief", "Built"),
    ("FR-26", "The round awards a rank: 50 or more Safety Champion, 30–49 Getting There, "
              "below 30 Needs Practice.", "Must", "Client brief", "Built"),
    ("FR-27", "Each completed round is written to the profile's session history with "
              "score, accuracy, mode, environment and difficulty.", "Should", "Team", "Built"),
    ("FR-28", "Achievements are awarded for defined milestones and shown on the profile.",
     "Could", "Team", "Built"),

    ("FR-29", "A trainee can mute audio and set the volume.", "Should", "PACT — contexts", "Built"),
    ("FR-30", "A trainee can set look sensitivity, invert the Y axis, enable reduced "
              "motion, show a performance overlay, toggle the test clock and toggle "
              "hazard locations.", "Should", "Accessibility review", "Built"),
    ("FR-31", "A changed setting takes effect immediately, including mid-round, through a "
              "single apply path so a saved setting can never go unapplied.",
     "Must", "Defect DEF-11", "Built"),

    ("FR-32", "The whole product runs from one self-contained HTML file with no network "
              "access of any kind.", "Should", "Client brief", "Built"),
    ("FR-33", "If WebGL is unavailable the system explains why in plain language instead "
              "of presenting a blank canvas.", "Must", "Team", "Built"),
    ("FR-34", "A safety officer can review a trainee's session history on the device.",
     "Should", "Client brief", "Built"),
    ("FR-35", "Session results can be exported for record-keeping outside the browser.",
     "Won't (this release)", "Client brief", "Not built — needs a backend, see §7.3"),
    ("FR-36", "In training, a guide leads to the nearest unfound hazard: an arrow and a "
              "distance in the HUD, the location in words from the first frame, and a "
              "column of light over the spot.", "Must", "Client feedback", "Built"),
    ("FR-37", "The trainee's chosen avatar is visible to them throughout: the login "
              "preview, the menu, the profile, the results and a player card in the HUD.",
     "Should", "Client feedback", "Built"),
    ("FR-38", "An unconfigured social provider can be set up from the login screen itself, "
              "without signing in first.", "Should", "Defect DEF-18", "Built"),
    ("FR-39", "Settings in six tabs — Video, Audio, Controls, Gameplay, Accessibility, "
              "Account — reachable from the menu and mid-round from the pause menu, every "
              "change applied immediately.", "Should", "Client feedback", "Built"),
    ("FR-40", "Keys can be rebound, with a key moved off any action that already used it; "
              "any standard game controller can play.", "Should", "Client feedback", "Built"),
    ("FR-41", "Subtitles for spoken announcements, captions for important sounds, and "
              "three colour-blind palettes applied to both the menus and the 3D markers.",
     "Should", "Accessibility review", "Built"),
    ("FR-42", "A training round in progress is auto-saved and can be resumed from the menu; "
              "a test never is.", "Could", "Client feedback", "Built"),
    ("FR-43", "The game can be downloaded from the website and the menu as one file that "
              "plays offline from disk, or installed as an app that plays offline after one "
              "visit.", "Must", "Client feedback", "Built"),
]

NON_FUNCTIONAL = [
    ("NFR-01", "Performance", "Sustains 60 fps at 1920×1080 on integrated graphics.",
     "Frame rate over a 60-second walk of each environment",
     "Met — 60 fps measured on the test machine"),
    ("NFR-02", "Performance", "Fewer than 2,000 draw calls per frame.",
     "renderer.info.render.calls", "Met — 1,549 measured; 9,587 before the merge pass"),
    ("NFR-03", "Performance", "Playable within 5 seconds of pressing Start.",
     "Stopwatch from click to first frame", "Met — approximately 2 seconds"),
    ("NFR-04", "Portability", "The offline build issues no network request after load.",
     "Browser network panel, count of requests", "Met — zero requests"),
    ("NFR-05", "Portability", "The offline build is a single file of 1 MB or less.",
     "File size on disk", "Met — 828 kB"),
    ("NFR-06", "Legal", "No third-party art, model, texture or audio asset is used.",
     "Dependency and asset audit (docs/ASSET_CREDITS.md)",
     "Met — geometry, textures and audio are generated at run time"),
    ("NFR-07", "Compatibility", "Runs on the current release of Chrome and Edge.",
     "Manual run-through of every screen",
     "Met on Chrome and Edge; Firefox and Safari NOT tested"),
    ("NFR-08", "Accessibility", "Reduced-motion, invert-Y and a 0.25×–3× sensitivity "
               "range are available; body text meets 4.5:1 contrast.",
     "Settings walkthrough; contrast measured from the palette",
     "Met — screen-reader support NOT tested"),
    ("NFR-09", "Accessibility", "Fully operable with keyboard and mouse, or with touch "
               "alone.", "Manual run-through per input method",
     "Met on desktop; touch NOT tested on physical hardware"),
    ("NFR-10", "Reliability", "A lost WebGL context is recovered without losing the "
               "round.", "Forced context loss via WEBGL_lose_context", "Met"),
    ("NFR-11", "Reliability", "A browser refusing pointer lock must never leave the "
               "trainee unable to look around.", "Run inside a sandboxed iframe",
     "Met — drag-look fallback engages and is announced"),
    ("NFR-12", "Privacy", "No analytics, no cookies and no personal data leaving the "
               "device.", "Network panel and source audit",
     "Met — all state is in localStorage on the trainee's own machine"),
    ("NFR-13", "Security", "Authentication follows the published standards, and no secret "
               "is ever placed in client code.",
     "RFC 4226/6238/4648 test vectors; secret scan before every push",
     "Met — 70 vector tests pass; see the limits stated in §7.2"),
    ("NFR-14", "Maintainability", "Core logic is covered by automated tests that run in "
               "CI on every push.", "Test count and CI status",
     "Met — 266 tests across 11 suites, all passing"),
    ("NFR-15", "Deployability", "Hosting requires no server, no database and no paid "
               "service.", "Deployment procedure", "Met — static files on GitHub Pages"),
    ("NFR-16", "Content", "Every hazard maps to a recognised warehouse risk category and "
               "is described in the vocabulary a safety officer uses.",
     "Review of the hazard catalogue against the category list",
     "Met — 15 hazards across 7 categories"),
    ("NFR-17", "Usability", "A first-time trainee reaches their first correct find "
               "without being told how to play.", "Observed first-run session",
     "Partly met — formal usability sessions are planned for Assessment 2"),
]

PACT = [
    ("People",
     "Warehouse operatives aged roughly 18–60. Wide spread of gaming literacy: some have "
     "never used WASD, some play daily. Agency and seasonal staff turn over quickly, so "
     "the same induction is delivered again and again to complete beginners. English is "
     "a second language for part of the workforce. Some have uncorrected colour vision "
     "deficiency. Experienced operatives may resent training that implies they do not "
     "know their job.",
     "Never require game literacy. Adjustable sensitivity and invert-Y as first-class "
     "settings, not buried. Never encode meaning in colour alone — severity is always "
     "also stated in words. Bilingual English/Nepali signage in the world. Training mode "
     "cannot be failed, so an experienced operative is never publicly wrong."),
    ("Activities",
     "Short, one-off, individual and mandatory. It happens once at induction and perhaps "
     "annually after that, in a gap in the shift — typically 10 to 20 minutes, "
     "interruptible. The real activity being trained is not recall of a rule but a "
     "glance-and-judge decision made under time pressure while walking.",
     "Rounds are short and resumable; pause is instant and automatic when attention "
     "leaves. The scored activity is spotting under a clock, which is the real task. "
     "Training and Test are separated so learning is not conflated with assessment."),
    ("Contexts",
     "A supervisor's office, a canteen table or a training room next to a live "
     "warehouse: noisy, brightly lit, often overlooked by colleagues. The hardware is "
     "whatever the site already owns — an ageing laptop, a shared desktop, sometimes a "
     "tablet. Site Wi-Fi is unreliable and IT will not install software on request.",
     "Audio is helpful but never necessary; every audio cue has a visual equivalent. "
     "High-contrast UI readable in a bright room and legible on a projector. It runs in "
     "a browser tab with no install, and as a single offline file for sites with no "
     "usable network."),
    ("Technologies",
     "Input is keyboard and mouse, or touch. Output is a screen from 11 inches to a "
     "projector, with or without speakers. No VR hardware is available and none is "
     "assumed. There is no server, no IT project and no procurement budget.",
     "WebGL 2 in the browser, so the only dependency is a current browser. Pointer lock "
     "with a drag-look fallback, plus a full touch scheme. Everything is generated at "
     "run time, which keeps the whole product under 1 MB and removes any asset licence."),
]

PERSONAS = [
    ("Bimal, 19 — agency picker, first week",
     "First warehouse job. Confident on a phone, has never used WASD, and reads English "
     "as a second language.",
     "Get through induction without looking foolish in front of the shift.",
     "Being made to feel stupid by the controls rather than by the safety content.",
     "Touch controls and adjustable sensitivity; Training mode cannot be failed; hazard "
     "keywords are shown as plain words next to the thing itself."),
    ("Sarah, 44 — shift supervisor",
     "Runs inductions between other duties. Needs evidence that it was completed and some "
     "idea of who needs another go.",
     "Ten minutes per new starter, with a defensible record at the end.",
     "Anything requiring an IT ticket, a login she has to administer, or a licence.",
     "Runs from a browser tab or a USB stick; session history is kept per profile; the "
     "results screen is a readable summary rather than a bare score."),
    ("Dave, 51 — counterbalance driver, 22 years on the job",
     "Knows the floor better than the trainer does. Has sat through the same slide deck "
     "eleven times.",
     "Be finished, and not be patronised.",
     "Being told things he already knows, in a tone that assumes he does not.",
     "Hard difficulty is genuinely hard — dim light, twelve decoys and a short clock; "
     "the decoys reward judgement, which is the part of his expertise the slide deck "
     "never tested."),
]

# (heuristic, what we examined, finding, severity, action)
HEURISTICS = [
    ("1. Visibility of system status",
     "Whether the trainee can always tell what the system is doing and how far in they are.",
     "Training mode announced “Training complete” on the very first frame, at 0 of 15 found: "
     "a not-yet-started round was indistinguishable from a finished one.",
     "4 — Catastrophic", "Fixed. Not-started and finished are now separate states. The HUD "
     "carries score, time, found-count and an explicit untimed label."),
    ("2. Match between the system and the real world",
     "Whether hazards are described the way the workplace describes them.",
     "Good. Hazards use safety-officer vocabulary, and each is located in floor terms — "
     "“Aisle C, north end”, “Dock door 3” — rather than by coordinates.",
     "0 — Not a problem", "Kept. The location line was added to the HUD and the results "
     "screen so a finding can be acted on off-screen."),
    ("3. User control and freedom",
     "Whether every action can be left, undone or repeated.",
     "“Reset all progress” also deleted the trainee's enrolled passkeys and authenticator, "
     "which they had not asked to lose.",
     "3 — Major", "Fixed. Reset now preserves credentials; removing them is a separate, "
     "explicit action in Settings → Security."),
    ("4. Consistency and standards",
     "Whether one visual language runs through world, HUD, menus and the deck.",
     "Good. One palette defined once in styles.css and reused by the presentation and the "
     "company website.",
     "1 — Cosmetic", "Kept. The palette is imported rather than retyped, so the three "
     "cannot drift apart."),
    ("5. Error prevention",
     "Whether the system stops a wrong outcome before it happens.",
     "Good, and load-bearing: a flag is refused when the target is out of range or behind "
     "geometry, rather than being scored as a find the trainee could not actually see.",
     "0 — Not a problem", "Kept, and covered by the reachability harness."),
    ("6. Recognition rather than recall",
     "Whether the trainee is shown what to remember instead of being asked to remember it.",
     "The safety keywords for each hazard were rendered as unlabelled grey pills on a dark "
     "panel. In testing nobody realised they were the thing to remember.",
     "3 — Major", "Fixed. Keywords are now amber chips under an explicit “Remember” "
     "heading, next to the hazard they belong to."),
    ("7. Flexibility and efficiency of use",
     "Whether both a beginner and an expert are served.",
     "Good. Three difficulties that change gameplay rather than a label, plus sensitivity, "
     "invert-Y and a drag-look fallback for browsers that refuse pointer lock.",
     "1 — Cosmetic", "Kept."),
    ("8. Aesthetic and minimalist design",
     "Whether the HUD competes with the world it is asking the trainee to search.",
     "Good. The HUD is limited to score, clock, found-count and the reticle. Hints appear "
     "only in Training mode and only after a delay.",
     "1 — Cosmetic", "Kept."),
    ("9. Recognise, diagnose and recover from errors",
     "Whether a failure ever leaves the trainee stuck without an explanation.",
     "Every unavailable sign-in route now states its specific reason instead of being "
     "greyed out silently; a missing WebGL context produces a written explanation rather "
     "than a black screen.",
     "2 — Minor", "Fixed. Earlier builds refused passkeys outright on any machine without "
     "Windows Hello, which was simply wrong — phones and security keys also work."),
    ("10. Help and documentation",
     "Whether help exists where it is needed.",
     "Training mode is the help: it is untimed, escalates hints and explains why each "
     "find is a hazard. A controls panel is reachable from the pause menu.",
     "1 — Cosmetic", "Kept. A short printable one-page control card is planned for "
     "Assessment 2."),
]

USE_CASES = [
    {
        "id": "UC-02", "name": "Take a timed test",
        "actor": "Trainee (primary), Safety Officer (secondary — reviews the result)",
        "goal": "Be assessed on hazard spotting under time pressure and receive a rank.",
        "pre": "The trainee is signed in and has passed any second factor.",
        "post": "A scored session is written to the profile history and a rank is shown.",
        "main": [
            "The trainee selects Test mode.",
            "The system offers the three environments.",
            "The trainee selects an environment and a difficulty.",
            "The system builds the environment, merges its static geometry, places 15 "
            "hazards and the difficulty's decoys, and spawns the trainee.",
            "The system starts the five-minute countdown.",
            "The trainee walks the floor and flags hazards (see UC-03).",
            "The system ends the round when all 15 are found or the budget expires.",
            "The system computes the total, the combo bonus, the accuracy and the rank.",
            "The system writes the session to the profile and shows the debrief, naming "
            "every hazard including those missed.",
        ],
        "alt": [
            ("5a", "The browser refuses pointer lock: the system announces click-and-drag "
                   "look and continues."),
            ("6a", "The trainee flags a decoy: no points, accuracy falls, combo resets, "
                   "and the feedback says what the object actually was."),
            ("6b", "The tab is hidden: the system pauses immediately so the clock cannot "
                   "run unattended."),
            ("7a", "The trainee quits early: the round ends and is recorded as abandoned."),
        ],
    },
    {
        "id": "UC-03", "name": "Flag a hazard",
        "actor": "Trainee",
        "goal": "Report the thing under the reticle as unsafe.",
        "pre": "A round is in progress and not paused.",
        "post": "The flag is scored, or rejected with a reason. The streak is updated.",
        "main": [
            "The trainee centres the reticle on a suspected hazard.",
            "The trainee presses E, left-clicks, or taps the flag button.",
            "The system casts a ray from the camera through the screen centre.",
            "The system confirms the ray struck a hazard proxy within range.",
            "The system confirms the line of sight is not blocked by world geometry.",
            "The system classifies severity and whether the find was within half the time "
            "allowed for that hazard.",
            "The system awards points, updates the streak and any combo, marks the hazard "
            "found, and shows its name, location and keywords.",
        ],
        "alt": [
            ("4a", "Nothing was struck: no score change, and the system says so rather "
                   "than staying silent."),
            ("5a", "The line of sight is blocked: treated as a miss, because the trainee "
                   "could not have seen it."),
            ("6a", "The target is a decoy: zero points, accuracy falls, the streak breaks, "
                   "and the feedback explains why the object is safe."),
        ],
    },
    {
        "id": "UC-06", "name": "Enrol a second factor",
        "actor": "Trainee",
        "goal": "Protect a training profile on a shared warehouse PC.",
        "pre": "The trainee is signed in.",
        "post": "A verified TOTP secret is stored, and future sign-ins require a code.",
        "main": [
            "The trainee opens Settings → Security → Set up two-factor.",
            "The system generates a 160-bit secret and renders an otpauth:// QR code.",
            "The trainee scans it with an authenticator app, or types the Base32 key.",
            "The trainee enters one generated code.",
            "The system verifies the code, accepting one step of clock drift either way.",
            "The system stores the secret and confirms enrolment.",
        ],
        "alt": [
            ("5a", "The code is wrong: nothing is stored, so an abandoned or mistyped "
                   "setup can never lock the trainee out."),
            ("2a", "The QR encoder is unavailable: the Base32 key is always shown as well, "
                   "so manual entry is always possible."),
        ],
    },
]

DATA_MODEL = [
    ("version", "number", "Schema version, so a stored profile can be migrated rather than discarded."),
    ("name / avatar", "string", "Display identity. Never sent anywhere."),
    ("authProvider", "string", "How the trainee signed in: local, passkey, google, facebook, github."),
    ("email", "string | null", "Only ever present when a social provider supplied it."),
    ("createdAt", "timestamp", "Profile creation."),
    ("stats", "object", "bestScore, totalScore, sessions, hazardsFound, wrongFlags, "
                        "bestCombo, fastestAverage."),
    ("progress", "map", "environmentId → { train, simple, mid, hard } best scores."),
    ("achievements", "string[]", "Ids of the milestones earned."),
    ("history", "object[]", "One record per completed round: score, accuracy, mode, "
                            "environment, difficulty, rank, timestamp."),
    ("security", "object", "passkeys[], totp, lastMethod. Preserved when progress is reset."),
    ("settings", "object", "audio, volume, invertY, showFps, reducedMotion, "
                           "lookSensitivity, timedTest, showLocations."),
]

STATES = [
    ("IDLE", "Nothing loaded. The menu is showing.", "→ LOADING when a round is chosen"),
    ("LOADING", "The environment is being built, merged and populated.",
     "→ READY on success · → IDLE on failure, with a message"),
    ("READY", "Built and spawned, waiting for the start signal.", "→ PLAYING"),
    ("PLAYING", "The frame loop is running; input and clocks are live.",
     "→ PAUSED on Esc, P or tab hidden · → FINISHED when all found or time expires"),
    ("PAUSED", "Clocks stopped, input released, pause menu showing.",
     "→ PLAYING on resume · → IDLE on quit"),
    ("FINISHED", "Scored, persisted, debrief showing.", "→ LOADING on retry · → IDLE on menu"),
]

TRACE = [
    ("FR-13, FR-23, FR-24", "gameplay/Timer.js, gameplay/ScoreManager.js",
     "tests/timer.test.js (20), tests/score.test.js (27)"),
    ("FR-17, FR-18, FR-19, FR-20", "hazards/HazardSystem.js, environment/Scenarios.js",
     "tests/hazards.test.js (23) + the 24-vantage-point reachability harness"),
    ("FR-06, FR-07, FR-12, FR-27, FR-28, FR-30", "services/Profile.js",
     "tests/profile.test.js (38)"),
    ("FR-01, FR-02, FR-08", "services/auth/AuthManager.js",
     "tests/auth.test.js (14) — identity-then-commit, passkey restores its owner"),
    ("FR-37", "data/avatars.js, ui/avatars.js", "tests/avatars.test.js (12)"),
    ("FR-36", "gameplay/GameManager.js, hazards/HazardSystem.js",
     "Manual — bearing checked at 0°, ±90° and 180°; guide advances after a find"),
    ("FR-05", "services/auth/totp.js, base32.js",
     "tests/totp.test.js (53) — RFC 4226, 6238 and 4648 vectors"),
    ("FR-05 (enrolment QR)", "services/auth/qr.js",
     "tests/qr.test.js (17) — round trip through an independent decoder"),
    ("FR-02, FR-03, FR-04", "services/auth/passkey.js, providers.js, AuthManager.js",
     "Manual — see the verification table in docs/AUTHENTICATION.md"),
    ("FR-14, FR-15, FR-16, FR-31", "player/PlayerController.js, main.js",
     "Manual walkthrough per input method"),
    ("NFR-01, NFR-02", "environment/World.js optimize(), core/Engine.js",
     "In-game performance overlay, measured per environment"),
]


# ══════════════════════════════════════════════════════════════════════
def build(out_dir):
    doc = new_doc()
    cover(doc, "Task A1", "Initial Design Documents",
          "Requirements specification, user requirements analysis and "
          "system requirements analysis for Beat The Hazard.")

    # ── 1 Introduction ────────────────────────────────────────────────
    h1(doc, "1  Introduction")
    para(doc,
         f"{CFG.CLIENT_ORG} asked for something that would make warehouse safety induction "
         "stick. The problem with the induction they have is not that it is wrong; it is "
         "that it teaches rules in a room and then expects them to be recalled on a floor "
         "full of forklifts, noise and time pressure. Reading about a blocked fire exit and "
         "recognising one at the end of an aisle while walking are different skills, and "
         "only the second one matters.")
    para(doc,
         f"**{CFG.PRODUCT}** moves the training to where the decision is actually made. The "
         "trainee walks a 3D warehouse in the first person and flags what is unsafe, against "
         "a clock. It runs in a browser tab, needs no installation and no headset, and also "
         "ships as a single file that works with no network at all.")
    para(doc,
         "This document is the requirements baseline. Section 2 lists functional "
         "requirements and section 3 non-functional ones. Section 4 is the user "
         "requirements analysis — PACT, personas and a heuristic evaluation. Sections 5 to 8 "
         "are the system requirements analysis: context, use cases, structured flowcharts, "
         "architecture, data and traceability.")
    callout(doc, "A note on how requirements are marked",
            "Each requirement carries its current state. **Built** means the behaviour "
            "exists in the product deployed at the link on the cover. Anything not built "
            "says so and says why. We would rather be marked on an accurate baseline than "
            "on an impressive one.")

    h2(doc, "1.1  Scope")
    h3(doc, "In scope for this release")
    bullets(doc, [
        "Three warehouse environments with 15 hazards each, built as physical situations.",
        "Training and Test modes, with three difficulty levels that change gameplay.",
        "Scoring, combo, ranking and a per-hazard debrief.",
        "Local trainee profiles with progress, history and achievements.",
        "Sign-in by name, passkey, or a social provider, with optional authenticator 2FA.",
        "A browser deployment and a single-file offline deployment.",
    ])
    h3(doc, "Explicitly out of scope")
    bullets(doc, [
        "**Virtual reality.** No VR hardware was available to us, so none is claimed, "
        "designed for, or tested. Building a WebXR path we could not run would be "
        "guesswork presented as a feature.",
        "**A central results server.** There is no backend, so results stay on the device "
        "(FR-35). This is the main limitation to discuss with the client.",
        "**Content authoring by the client.** Hazards are defined in code, not in an editor.",
    ])

    page_break(doc)

    # ── 2 Functional ──────────────────────────────────────────────────
    h1(doc, "2  Functional requirements")
    para(doc,
         "Prioritised with MoSCoW. **Source** records where the requirement came from: the "
         "client brief, the team's own analysis, the heuristic evaluation in §4.3, or a "
         "defect found in testing.")

    for title, rng in (("2.1  Identity and profile", (0, 8)),
                       ("2.2  Modes, environments and difficulty", (8, 13)),
                       ("2.3  Movement and hazard reporting", (13, 22)),
                       ("2.4  Scoring and feedback", (22, 28)),
                       ("2.5  Settings and accessibility", (28, 31)),
                       ("2.6  Delivery and resilience", (31, 35)),
                       ("2.7  Added after client feedback", (35, 43))):
        h2(doc, title)
        table(doc, ["ID", "Requirement", "Priority", "Source", "State"],
              [[r[0], r[1], r[2], r[3], r[4]] for r in FUNCTIONAL[rng[0]:rng[1]]],
              widths=[1.6, 7.6, 1.9, 2.3, 2.6], size=8.6, align_center=(0, 2))

    page_break(doc)

    # ── 3 Non-functional ──────────────────────────────────────────────
    h1(doc, "3  Non-functional requirements")
    para(doc,
         "A non-functional requirement that cannot be measured is an opinion, so each one "
         "below carries the measurement used and the result of taking it. Where something "
         "has not been tested, the row says so rather than leaving it implied.")
    table(doc, ["ID", "Category", "Requirement", "How it is measured", "Result"],
          [[r[0], r[1], r[2], r[3], r[4]] for r in NON_FUNCTIONAL],
          widths=[1.6, 2.2, 5.2, 3.6, 3.4], size=8.4, align_center=(0,))

    callout(doc, "Where we are honestly not there yet",
            "NFR-07 (Firefox and Safari), NFR-08 (screen readers) and NFR-09 (touch on "
            "physical hardware) are unverified because we did not have the browsers or the "
            "devices to verify them on. They are scheduled for Assessment 2. Marking them "
            "green now would be the exact failure mode this product is meant to teach "
            "people to spot.")

    page_break(doc)

    # ── 4 User requirements analysis ──────────────────────────────────
    h1(doc, "4  User requirements analysis")
    h2(doc, "4.1  PACT analysis")
    para(doc,
         "PACT (Benyon) frames the design around the People, the Activities they perform, "
         "the Contexts they perform them in, and the Technologies available. The right-hand "
         "column is the point of the exercise: what each observation actually changed.")
    table(doc, ["Dimension", "What we found", "What it changed in the design"],
          [[p[0], p[1], p[2]] for p in PACT],
          widths=[2.2, 6.6, 7.2], size=8.8)

    h2(doc, "4.2  Personas")
    para(doc,
         "Three personas drawn from the PACT analysis. They are used in review as a test: "
         "a proposed change has to be defensible for all three, not just for the one who "
         "resembles the developer.")
    table(doc, ["Persona", "Background", "Goal", "Frustration", "Design consequence"],
          [[p[0], p[1], p[2], p[3], p[4]] for p in PERSONAS],
          widths=[2.8, 3.4, 2.6, 2.6, 4.6], size=8.4)

    h2(doc, "4.3  Heuristic evaluation")
    para(doc,
         "Evaluated against Nielsen's ten usability heuristics, with severity on Nielsen's "
         "0–4 scale. This was not a paper exercise: the evaluation was carried out against "
         "the running build, and four of the findings below were defects serious enough to "
         "stop a trainee completing a round. All four are fixed and the fixes are in the "
         "deployed version.")
    table(doc, ["Heuristic", "What we examined", "Finding", "Severity", "Action"],
          [[h[0], h[1], h[2], h[3], h[4]] for h in HEURISTICS],
          widths=[2.9, 3.4, 4.8, 1.9, 3.6], size=8.2, align_center=(3,))

    h2(doc, "4.4  What the analysis changed")
    para(doc,
         "The value of the two exercises above is only visible in what they altered. In "
         "summary:")
    numbered(doc, [
        "**Locations were added to every hazard.** PACT established that the trainee has to "
        "act on the finding later, on a real floor. A hazard the trainee cannot describe "
        "afterwards is not a finding, so every hazard now reports where it is — “Aisle C, "
        "north end” — in the HUD and in the debrief.",
        "**Keywords became a labelled panel.** Heuristic 6 showed that the words a trainee "
        "is meant to carry away were being rendered as decoration. They are now chips under "
        "an explicit “Remember” heading.",
        "**Accessibility settings became real.** Invert-Y and reduced motion were saved but "
        "never applied. Everything now runs through one apply path, so a setting cannot be "
        "stored and ignored (FR-31).",
        "**Pointer lock stopped being mandatory.** Persona and context work said the product "
        "would be opened in embedded and locked-down browsers. Where pointer lock is "
        "refused, click-and-drag look takes over and says so (FR-15).",
        "**Reset stopped destroying credentials.** Heuristic 3: clearing a score is not "
        "consent to delete a passkey (FR-07).",
    ])

    page_break(doc)

    # ── 5 System requirements: context & use cases ────────────────────
    h1(doc, "5  System requirements analysis — context and use cases")
    h2(doc, "5.1  System context")
    para(doc,
         "The context diagram fixes the system boundary. The single most important thing it "
         "records is what is **not** there: no application server, no database, no network "
         "service of our own. Every arrow terminates either inside the browser or at a "
         "third-party identity provider chosen by the trainee.")
    figure(doc, os.path.join(FIG, "fig_context.png"), 16.0,
           "Figure 1 — System context (level 0). The absence of a server is a design "
           "decision, not an omission: it is what makes the offline build and the "
           "zero-cost deployment possible.")

    h2(doc, "5.2  Use cases")
    figure(doc, os.path.join(FIG, "fig_usecase.png"), 15.0,
           "Figure 2 — Use case diagram. Nine use cases across three actors.")

    para(doc, "Three use cases are specified in full below: the assessed round, the single "
              "most important interaction inside it, and the enrolment flow that carries "
              "the most edge cases.")

    for uc in USE_CASES:
        h3(doc, f"{uc['id']}  {uc['name']}")
        table(doc, ["", ""], [
            ["**Actors**", uc["actor"]],
            ["**Goal**", uc["goal"]],
            ["**Pre-condition**", uc["pre"]],
            ["**Post-condition**", uc["post"]],
        ], widths=[3.2, 12.8], size=9, zebra=None)
        para(doc, "**Main success scenario**", after=3)
        numbered(doc, uc["main"], size=9.4)
        para(doc, "**Extensions**", after=3)
        table(doc, ["Step", "Alternative behaviour"],
              [[a[0], a[1]] for a in uc["alt"]],
              widths=[1.6, 14.4], size=9)

    page_break(doc)

    # ── 6 Structured flowcharts ───────────────────────────────────────
    h1(doc, "6  System requirements analysis — structured flowcharts")
    para(doc,
         "Three flowcharts, drawn to the standard shapes: rounded terminals, rectangles for "
         "process, diamonds for decisions and parallelograms for input and output. Each was "
         "produced before or alongside the code it describes, and each is a faithful "
         "description of what the built system does.")

    h2(doc, "6.1  Lifecycle of a round")
    para(doc,
         "The outer loop. Two steps are worth pointing out. The **merge pass** is a "
         "performance requirement made visible in the design: without it a single "
         "environment issues 9,587 draw calls a frame and the product misses NFR-01 on "
         "exactly the hardware the client owns. The **completion test** distinguishes "
         "not-yet-started from finished, which is the fix for the most serious usability "
         "defect we found (heuristic 1).")
    figure(doc, os.path.join(FIG, "fig_flow_round.png"), 13.5,
           "Figure 3 — Structured flowchart 1: the lifecycle of a round.")
    page_break(doc)

    h2(doc, "6.2  Resolving a hazard flag")
    para(doc,
         "The decision that the whole product exists to train, expanded. The two guard "
         "conditions before scoring — did the ray hit anything, and was the line of sight "
         "clear — are what stop the system rewarding a find the trainee could not physically "
         "have made. The severity test asks whether the find came within **half the time "
         "allowed for that hazard**, which is 45 seconds on Simple, 30 on Mid and 19 on Hard.")
    figure(doc, os.path.join(FIG, "fig_flow_flag.png"), 14.5,
           "Figure 4 — Structured flowchart 2: resolving a hazard flag.")
    page_break(doc)

    h2(doc, "6.3  Sign-in and second factor")
    para(doc,
         "Every route into the product converges on one second-factor gate before the menu, "
         "so no sign-in method can bypass 2FA. A failed attempt returns to the login screen "
         "with the specific reason, never to the menu.")
    figure(doc, os.path.join(FIG, "fig_flow_auth.png"), 14.0,
           "Figure 5 — Structured flowchart 3: sign-in and second factor.")

    page_break(doc)

    # ── 7 Architecture, data, limits ──────────────────────────────────
    h1(doc, "7  System requirements analysis — structure and data")
    h2(doc, "7.1  Module architecture")
    para(doc,
         "Five layers with a strict rule: no layer imports the layer above it. Gameplay "
         "publishes events and the UI subscribes, which is why the game logic can be unit "
         "tested with no DOM at all — the 266 tests in §8 need no browser.")
    figure(doc, os.path.join(FIG, "fig_architecture.png"), 16.0,
           "Figure 6 — Layered module architecture.")

    h2(doc, "7.2  Game state machine")
    table(doc, ["State", "Meaning", "Transitions out"],
          [[s[0], s[1], s[2]] for s in STATES],
          widths=[2.2, 6.8, 7.0], size=9)

    h2(doc, "7.3  Data model")
    para(doc,
         "One document per trainee, held in `localStorage` under a versioned key. There is "
         "no other persistent store.")
    table(doc, ["Field", "Type", "Purpose"],
          [[d[0], d[1], d[2]] for d in DATA_MODEL],
          widths=[3.0, 2.6, 10.4], size=9)
    callout(doc, "The consequence the client needs to hear",
            "Because there is no server, results live on the machine that produced them. "
            "A trainee who moves to a different PC starts with an empty history, and a "
            "safety officer cannot see results centrally (FR-35). We chose this so the "
            "product needs no IT project to adopt. If central records matter more than "
            "zero-friction adoption, that is the trade to revisit in Assessment 2, and it "
            "is a small backend rather than a redesign.")

    h2(doc, "7.4  Security boundary")
    para(doc,
         "The authentication methods are correct implementations of their standards, pinned "
         "to the official test vectors. They are not, and are not claimed to be, an "
         "authentication boundary against somebody with developer tools on the same "
         "machine — with no server there is nothing to verify a signed assertion against. "
         "What they genuinely provide is real protection against casual access on a shared "
         "warehouse PC, and a drop-in path to server-side verification, because each method "
         "already produces exactly the artefact a server would check.")

    page_break(doc)

    # ── 8 Traceability ────────────────────────────────────────────────
    h1(doc, "8  Requirements traceability")
    para(doc,
         "Each requirement is traced to the module that implements it and the evidence that "
         "it works. “Manual” means a documented walkthrough rather than an automated test.")
    table(doc, ["Requirements", "Implemented in", "Verified by"],
          [[t[0], t[1], t[2]] for t in TRACE],
          widths=[4.2, 5.6, 6.2], size=9)

    h2(doc, "8.1  Verification summary")
    table(doc, ["Suite", "Tests", "Covers"], [
        ["tests/score.test.js", "27", "Scoring table, combo, accuracy, rank boundaries"],
        ["tests/timer.test.js", "20", "Five-minute round, per-hazard clock, warning states, expiry"],
        ["tests/hazards.test.js", "23", "Registration, severity, targeting, decoys"],
        ["tests/profile.test.js", "38", "Persistence, avatar migration, open-by-default gates, history, reset"],
        ["tests/auth.test.js", "14", "Sign-in commits only after 2FA; passkeys restore their owner"],
        ["tests/avatars.test.js", "12", "Five avatars, legacy mapping, self-contained SVG"],
        ["tests/totp.test.js", "53", "RFC 4226, RFC 6238 and RFC 4648 test vectors"],
        ["tests/qr.test.js", "17", "QR encoding, round-tripped through an independent decoder"],
        ["**Total**", "**204**", "All passing; run in CI on every push to main"],
    ], widths=[4.6, 2.0, 9.4], size=9, align_center=(1,))

    para(doc,
         "Two of these earned their keep in a way worth recording. The QR round trip caught "
         "a defect where the format information was written transposed — row 8 instead of "
         "column 8. The matrix looked perfectly well formed and no scanner on earth would "
         "have read it; no amount of inspection would have found it. Separately, the "
         "reachability harness — 24 vantage points per environment — caught that all 15 "
         "hazards were unflaggable because their invisible targeting proxies had never had "
         "their world matrices updated. Both were invisible to reading the code.",
         size=9.5)

    return save(doc, out_dir, f"{CFG.PRODUCT_SLUG}_A1_Requirements_Analysis.docx")
