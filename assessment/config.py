"""
config.py — the ONE file you edit before submitting.

Everything else in assessment/ reads from here. Change a name, a team number
or a date below, run `python assessment/build.py`, and every document in the
submission is rebuilt with it. Nothing is hard-coded twice.

Anything still written as «Like This» is a placeholder that needs your real
information. Search the built .docx files for « to find any you missed.
"""

# ── Identity ────────────────────────────────────────────────────────────
TEAM_NUMBER = "[Team_Number]"      # e.g. "07"  → folder becomes 07_Himal_Interactive
COMPANY = "Himal Interactive"
COMPANY_SLUG = "Himal_Interactive"
TAGLINE = "Training people actually finish."
PRODUCT = "Beat The Hazard"
PRODUCT_SLUG = "BeatTheHazard"

MODULE = "CET257 Enterprise Project"
MODULE_LEADER = "Dr Becky Allen"
UNIVERSITY = "University of Sunderland — Faculty of Technology"
CLIENT_ORG = "Vantec"
CLIENT_CONTACT = "«Client contact name»"

ACADEMIC_YEAR = "2025/26"
SUBMISSION_DATE = "«dd Month yyyy»"

# ── Live links (real, already deployed) ─────────────────────────────────
LIVE_URL = "https://kushalthewave.github.io/interprize-project/"
OFFLINE_URL = "https://kushalthewave.github.io/interprize-project/beat-the-hazard.html"
REPO_URL = "https://github.com/kushalthewave/interprize-project"

# ── Brand ───────────────────────────────────────────────────────────────
# Lifted verbatim from src/ui/styles.css so the company, the deck, the
# website and the game never drift apart.
BRAND = {
    "bg":      "0B0F14",
    "bg2":     "11171E",
    "panel":   "151C25",
    "panel2":  "1B2530",
    "border":  "2A323B",
    "text":    "E9EEF4",
    "dim":     "97A4B2",
    "faint":   "64717F",
    "accent":  "F2B90C",   # hazard amber — the primary brand colour
    "accent2": "FF8A1F",
    "danger":  "EF4444",
    "success": "22C55E",
    "info":    "38BDF8",
    "major":   "FF4D4D",   # major hazard flash
    "minor":   "FFC14D",   # minor hazard flash
    "crimson": "DC143C",   # Nepal crimson, used sparingly
    "white":   "FFFFFF",
    "ink":     "1A1204",
}

# ── The team ────────────────────────────────────────────────────────────
# Roles are allocated from the skills audits in A2. Edit names and student
# numbers; keep the `key` values, other documents refer to them.
MEMBERS = [
    {
        "key": "pm",
        "name": "«Member 1 — full name»",
        "student_id": "«Student ID»",
        "role": "Project Manager & Client Liaison",
        "short": "PM",
        "owns": [
            "Project plan, milestones and the weekly stand-up",
            "All client contact with Vantec and the interaction log",
            "Meeting minutes and the risk register",
            "Chairing the presentation and handling questions",
        ],
        "audit": {
            "Planning & scheduling": 4,
            "Written communication": 4,
            "Client-facing communication": 5,
            "JavaScript / Three.js": 2,
            "3D modelling": 1,
            "UX & accessibility": 2,
            "Testing & QA": 2,
            "Graphic design": 2,
        },
    },
    {
        "key": "tech",
        "name": "Kushal Neupane",
        "student_id": "«Student ID»",
        "role": "Technical Lead & Lead Developer",
        "short": "Tech Lead",
        "owns": [
            "Engine, rendering pipeline and performance budget",
            "Hazard system, scoring and game state machine",
            "Authentication (passkeys, OAuth adapters, TOTP)",
            "Build, deployment and the offline single-file release",
        ],
        "audit": {
            "Planning & scheduling": 3,
            "Written communication": 4,
            "Client-facing communication": 3,
            "JavaScript / Three.js": 5,
            "3D modelling": 4,
            "UX & accessibility": 3,
            "Testing & QA": 4,
            "Graphic design": 3,
        },
    },
    {
        "key": "design",
        "name": "«Member 3 — full name»",
        "student_id": "«Student ID»",
        "role": "Environment & Technical Art Lead",
        "short": "Art Lead",
        "owns": [
            "The three warehouse environments and their layouts",
            "Procedural texture library and the Nepali visual identity",
            "Hazard staging — making each hazard readable at a glance",
            "Draw-call budget in partnership with the Technical Lead",
        ],
        "audit": {
            "Planning & scheduling": 3,
            "Written communication": 3,
            "Client-facing communication": 3,
            "JavaScript / Three.js": 3,
            "3D modelling": 5,
            "UX & accessibility": 3,
            "Testing & QA": 2,
            "Graphic design": 5,
        },
    },
    {
        "key": "ux",
        "name": "«Member 4 — full name»",
        "student_id": "«Student ID»",
        "role": "UX & Accessibility Lead",
        "short": "UX Lead",
        "owns": [
            "PACT analysis, heuristic evaluation and the usability sessions",
            "HUD, menus, settings and the feedback panel",
            "Accessibility: reduced motion, sensitivity, colour contrast, touch",
            "Figma prototype frames used in the client presentation",
        ],
        "audit": {
            "Planning & scheduling": 3,
            "Written communication": 4,
            "Client-facing communication": 4,
            "JavaScript / Three.js": 3,
            "3D modelling": 2,
            "UX & accessibility": 5,
            "Testing & QA": 3,
            "Graphic design": 4,
        },
    },
    {
        "key": "qa",
        "name": "«Member 5 — full name»",
        "student_id": "«Student ID»",
        "role": "QA, Test & Documentation Lead",
        "short": "QA Lead",
        "owns": [
            "Unit test suite and the reachability harness",
            "Cross-browser and device checks; the defect log",
            "Requirements traceability matrix",
            "Marketing collateral and the company website",
        ],
        "audit": {
            "Planning & scheduling": 4,
            "Written communication": 5,
            "Client-facing communication": 3,
            "JavaScript / Three.js": 3,
            "3D modelling": 1,
            "UX & accessibility": 3,
            "Testing & QA": 5,
            "Graphic design": 3,
        },
    },
]

SKILL_ROWS = [
    "Planning & scheduling",
    "Written communication",
    "Client-facing communication",
    "JavaScript / Three.js",
    "3D modelling",
    "UX & accessibility",
    "Testing & QA",
    "Graphic design",
]

SKILL_SCALE = (
    "1 = no experience · 2 = aware · 3 = can do it with support · "
    "4 = confident and independent · 5 = can lead and teach it"
)


def member(key):
    for m in MEMBERS:
        if m["key"] == key:
            return m
    raise KeyError(key)


def name(key):
    return member(key)["name"]


FOLDER = f"{TEAM_NUMBER}_{COMPANY_SLUG}"
