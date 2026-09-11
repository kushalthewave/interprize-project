"""
build.py — assemble the whole CET257 Assessment 1 submission.

    python assessment/build.py            build into assessment/_build/
    python assessment/build.py --zip      build and zip it, ready to upload

Folder layout follows the brief: "sectioned in sequence, with each sub folder
clearly titled (this should be the same format as the table)" — so A1 to A7,
one folder each, in order.
"""
import os
import shutil
import sys
import zipfile

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import config as CFG          # noqa: E402
import diagrams               # noqa: E402
import frames                 # noqa: E402
import storyboard             # noqa: E402
import a1, a2, a3, a4, a5, a6, a7   # noqa: E402,E401
from common import (bullets, callout, cover, h1, h2, new_doc, numbered,  # noqa: E402
                    para, save, table, todo)

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(HERE)
BUILD = os.path.join(HERE, "_build")

SECTIONS = [
    ("A1", "Initial design documents", 20),
    ("A2", "Report on group roles, rules and group registration form", 10),
    ("A3", "Evidence of interaction with clients", 10),
    ("A4", "Group meeting minutes", 10),
    ("A5", "Initial project plan", 10),
    ("A6", "Initial marketing strategy, website prototypes, corporate identity", 10),
    ("A7", "Presentation of initial solution ideas / prototypes to client", 30),
]

# (section, deliverable, state, note)
STATUS = [
    ("A1", "Functional and non-functional requirements", "Complete",
     "38 functional and 17 non-functional requirements, each with a source, a priority "
     "and a measured result."),
    ("A1", "User requirements analysis", "Complete",
     "PACT, three personas and a full Nielsen heuristic evaluation carried out against "
     "the running build."),
    ("A1", "System requirements analysis", "Complete",
     "Context diagram, use case diagram with three full specifications, three structured "
     "flowcharts, architecture, data model and a traceability matrix."),
    ("A2", "Report on group roles", "Needs your names",
     "The report is written; the names, student numbers and audit scores come from "
     "assessment/config.py."),
    ("A2", "Supporting evidence", "Needs completing",
     "Skills audits need each member's own evidence and signature. The registration form "
     "must be the official one from Canvas."),
    ("A3", "Evidence of client interaction", "Needs your records",
     "A structured log with a worked example. The entries have to come from your real "
     "emails, meetings and calls — see the note on the first page."),
    ("A4", "Group meeting minutes", "Needs your records",
     "A minute book carrying all five items the brief requires, one blank set per week, "
     "plus an attendance register and a running issue log."),
    ("A5", "Initial project plan", "Complete",
     "24 tasks over 12 weeks, six milestones with completion tests, dependencies, an "
     "eight-risk register with outcomes, and per-member individual plans."),
    ("A6", "Marketing strategy", "Complete",
     "Zero-budget plan: positioning, segments, nine free channels, calendar, objection "
     "handling and a £0 budget table."),
    ("A6", "Website ideas and prototypes", "Complete",
     "A storyboard, eight Figma-importable interface prototypes, and a company website "
     "that is built, deployed and live."),
    ("A6", "Corporate identity", "Complete",
     "Name rationale, mark with usage rules, palette, typography, mission, values and "
     "tone of voice."),
    ("A7", "Presentation plan and responsibility chart", "Complete",
     "Timed running order to 20 minutes, demonstration script, contingency plan, "
     "anticipated questions and per-member responsibilities."),
    ("A7", "Presentation with notes", "Complete",
     "18 slides with speaker notes; every note opens with a cumulative time marker."),
    ("A7", "Prototype with instructions", "Complete",
     "The offline single-file build, the full source, and operating instructions."),
]


def contents_doc(out_dir):
    doc = new_doc()
    cover(doc, "Assessment 1", "Submission Contents",
          f"{CFG.COMPANY} — {CFG.PRODUCT}. What is in this pack, where it is, "
          "and what still needs your team's own information.",
          extra=[("Live product", CFG.LIVE_URL),
                 ("Company website", CFG.LIVE_URL.rstrip('/') + '/company/'),
                 ("Source", CFG.REPO_URL)])

    h1(doc, "1  How this pack is organised")
    para(doc,
         "One folder per task, A1 to A7, in the order of the assessment brief. Every "
         "folder contains the deliverables named in that task's hand-in instructions.")
    table(doc, ["Folder", "Task", "Marks", "What is inside"], [
        ["**A1**", "Initial design documents", "20",
         "Requirements_Analysis.docx"],
        ["**A2**", "Group roles, rules and registration", "10",
         "Group_Roles_Report.docx · Skills_Audits.docx · Group_Rules.docx · "
         "Group_Registration_Form.docx"],
        ["**A3**", "Evidence of client interaction", "10",
         "Client_Interaction_Log.docx"],
        ["**A4**", "Group meeting minutes", "10",
         "Meeting_Minutes_Log.docx"],
        ["**A5**", "Initial project plan", "10",
         "Project_Plan.docx · Gantt_Chart.png"],
        ["**A6**", "Marketing, website, identity", "10",
         "Marketing_Strategy.docx · Website_Design.docx · Corporate_Identity.docx · "
         "website/ · logo/"],
        ["**A7**", "Client presentation", "30",
         "Presentation_Plan.docx · Individual_Responsibility_Chart.docx · "
         "Presentation_Slides.pptx · Prototype_Instructions.docx · Prototype/"],
    ], widths=[1.6, 4.6, 1.2, 8.6], size=9.2, align_center=(2,))

    h1(doc, "2  The product is real and you can open it now")
    para(doc,
         "Everything in this pack describes software that exists and runs. Before reading "
         "any of it, it is worth spending two minutes here:")
    table(doc, ["", ""], [
        ["**Play it**", CFG.LIVE_URL],
        ["**Offline build**", "`A7/Prototype/beat-the-hazard.html` — one file, 738 kB, "
                              "no network needed"],
        ["**Company website**", CFG.LIVE_URL.rstrip("/") + "/company/"],
        ["**Source and history**", CFG.REPO_URL],
    ], widths=[4.0, 12.0], size=9.6, zebra=None)

    h1(doc, "3  State of each deliverable")
    para(doc,
         "Stated plainly, because a pack that quietly hides its gaps is worth less than "
         "one that names them.")
    table(doc, ["Task", "Deliverable", "State", "Note"],
          [[s[0], s[1], s[2], s[3]] for s in STATUS],
          widths=[1.2, 4.4, 2.4, 8.0], size=8.8, align_center=(0,))

    h1(doc, "4  What still needs your team")
    para(doc,
         "Three deliverables are records of events rather than analysis, and they cannot "
         "be written by anyone who was not there:")
    numbered(doc, [
        "**A3 — the client interaction log.** What Vantec actually said, when, and what "
        "changed because of it. The structure is ready; the entries are yours.",
        "**A4 — the meeting minutes.** Who attended, what each person did and what went "
        "wrong. The minute book is laid out with all five items the brief requires.",
        "**A2 — the skills audits.** A skills audit is a record of what a specific person "
        "said about their own ability. The scores in `config.py` are a worked structure, "
        "not your data.",
    ])
    para(doc,
         "Everywhere something needs replacing, it is wrapped in double angle quotes, so "
         "searching any document for that character finds them all. "
         "`python assessment/audit.py` lists them for you.")

    h1(doc, "5  Before you submit")
    bullets(doc, [
        "Open `assessment/config.py`, set **TEAM_NUMBER**, the **member names**, the "
        "**student numbers**, the **audit scores** and the **submission date**, then run "
        "`python assessment/build.py --zip` again. Every document rebuilds with them.",
        "Fill in A3 and A4 from your own records, and attach the originals in their "
        "appendices.",
        "Replace `A2/Group_Registration_Form.docx` with the official form from Canvas.",
        "Have every member sign `A2/Group_Rules.docx` and their own skills audit.",
        "Confirm the company name. It is set in one place — change `COMPANY` in "
        "`config.py` and it updates everywhere, including the website and the logo.",
        "Run `python assessment/audit.py` — it lists every remaining placeholder.",
    ])

    todo(doc,
         "Delete nothing from this pack to make it look more finished. A marker "
         "distinguishes a gap that is labelled from one that is hidden, and only one of "
         "those costs marks twice.")

    return save(doc, out_dir, "00_Submission_Contents.docx")


def readme(root):
    """A note for the team, deliberately placed outside the submission folder."""
    path = os.path.join(os.path.dirname(root), "READ_ME_FIRST.txt")
    with open(path, "w", encoding="utf-8") as f:
        f.write(f"""{CFG.COMPANY} — CET257 Assessment 1 submission pack
{'=' * 62}

THIS FILE IS NOT PART OF THE SUBMISSION. Do not upload it.
Upload the folder next to it: {CFG.FOLDER}

WHAT IS DONE
------------
A1  Requirements, PACT, personas, heuristic evaluation, context and use case
    diagrams, three structured flowcharts, architecture, data model,
    traceability matrix.                                        ~5,000 words
A5  Project plan: 24 tasks, 12 weeks, six milestones, dependencies,
    eight risks with outcomes, individual plans.
A6  Zero-budget marketing strategy, website storyboard, eight interface
    prototypes, corporate identity — plus the company website, built and
    deployed at {CFG.LIVE_URL.rstrip('/')}/company/
A7  Presentation plan timed to 20 minutes, individual responsibility chart,
    the 18-slide deck with speaker notes, and the runnable prototype with
    operating instructions.
A2  The roles report is written and argued from the skills audits.

WHAT ONLY YOU CAN DO
--------------------
A3  Evidence of client interaction  (10 marks)
A4  Group meeting minutes           (10 marks)
A2  The skills audits themselves    (4 of the 10 marks)

These are records of things that actually happened - what your client said,
who attended which meeting, what each member scored themselves. They are
supplied as complete structures with every field a marker looks for, but the
content has to be yours. Inventing them would be fabricating evidence for a
graded assessment, which is a different thing from documenting software we
genuinely built.

HOW TO PERSONALISE IT
---------------------
1. Edit  assessment/config.py  - team number, member names, student numbers,
   skills-audit scores, submission date, and the company name if you want a
   different one.
2. Run   python assessment/build.py --zip
3. Run   python assessment/audit.py     - lists every placeholder still left.

Everything regenerates from that one file: documents, the Gantt chart, the
role allocation, the slide assignments and the backup pairings all stay
consistent with each other.

WHERE THE MARKS ARE
-------------------
A1 20 | A2 10 | A3 10 | A4 10 | A5 10 | A6 10 | A7 30   = 100
A7 is marked by the client, not by the module team.
""")
    print(f"  · {os.path.basename(path)}")
    return path


def make_zip(root):
    out = os.path.join(HERE, f"{CFG.FOLDER}.zip")
    base = os.path.dirname(root)
    with zipfile.ZipFile(out, "w", zipfile.ZIP_DEFLATED, compresslevel=6) as z:
        for folder, _dirs, files in os.walk(root):
            for name in files:
                full = os.path.join(folder, name)
                z.write(full, os.path.relpath(full, base))
    size = os.path.getsize(out) / (1024 * 1024)
    print(f"\nZipped: {out}  ({size:.2f} MB)")
    return out


def main():
    print(f"\nBuilding {CFG.FOLDER}\n{'=' * 60}")

    if os.path.isdir(BUILD):
        shutil.rmtree(BUILD)
    root = os.path.join(BUILD, CFG.FOLDER)
    os.makedirs(root)

    print("\nFigures")
    diagrams.build_all()
    storyboard.build_all()
    print("Prototype frames")
    frames.build_all()

    dirs = {s[0]: os.path.join(root, s[0]) for s in SECTIONS}
    for d in dirs.values():
        os.makedirs(d, exist_ok=True)

    print("\nDocuments")
    contents_doc(root)
    a1.build(dirs["A1"])
    a2.build(dirs["A2"])
    a3.build(dirs["A3"])
    a4.build(dirs["A4"])
    a5.build(dirs["A5"])
    a6.build(dirs["A6"])
    a7.build(dirs["A7"])

    print("\nNotes")
    readme(root)

    total = sum(len(f) for _r, _d, f in os.walk(root))
    print(f"\n{total} files in {CFG.FOLDER}/")

    if "--zip" in sys.argv:
        make_zip(BUILD)
    return 0


if __name__ == "__main__":
    sys.exit(main())
