"""
a5.py — Task A5: Initial project plan (10 marks).

  "Your initial group project plan and associated individualised plans."

Produces:
  Project_Plan.docx    the plan: approach, WBS, Gantt, milestones, dependencies,
                       risk register, and one individual plan per member
  Gantt_Chart.png      the chart on its own, as the brief asks for a chart
"""
import os
import shutil

import config as CFG
import diagrams
from common import (bullets, callout, caption, cover, figure, h1, h2, h3, new_doc,
                    numbered, page_break, para, save, table, todo)

FIG = os.path.join(os.path.dirname(os.path.abspath(__file__)), "_figures")

PHASES = [
    ("Mobilisation", "1", "Team formed, roles allocated from the skills audits, rules "
     "agreed, client brief unpacked and questions raised.",
     "Group registration form, group rules, skills audits"),
    ("Analysis", "2–4", "Requirements elicited and written down; PACT and heuristic "
     "analysis; system analysis and flowcharts; a technical spike to prove the render "
     "loop before committing to it.",
     "A1 requirements document, three structured flowcharts"),
    ("Brand and market", "3–6", "Corporate identity, zero-budget marketing strategy, "
     "and the company website built and deployed.",
     "A6 identity, marketing plan, live website"),
    ("Build", "5–9", "The vertical slice first — one environment, the hazard system and "
     "scoring end to end — then breadth: two more environments, authentication, "
     "the test suite.",
     "Playable vertical slice, then feature-complete build"),
    ("Harden", "9–11", "Performance, accessibility, defect triage, deployment and the "
     "offline build. The point at which claims are checked against the running product.",
     "Deployed build, defect log, 165 passing tests"),
    ("Deliver", "11–12", "Deck, rehearsal, assessment pack, client presentation.",
     "A7 presentation and prototype demonstration"),
]

MILESTONES = [
    ("M1", "End of week 1", "Team mobilised: roles, rules and registration complete.",
     "All three A2 documents signed."),
    ("M2", "End of week 4", "Requirements signed off.",
     "A1 complete; every requirement has an ID, a priority and a source."),
    ("M3", "End of week 6", "Company presence live.",
     "Website deployed and reachable; identity applied to deck and product."),
    ("M4", "End of week 9", "Playable vertical slice.",
     "One environment, 15 hazards, scoring and results, demonstrable end to end."),
    ("M5", "End of week 11", "Feature complete and deployed.",
     "Three environments, both modes, authentication, all tests passing in CI."),
    ("M6", "Week 12", "Client presentation delivered.",
     "20-minute session run to plan, prototype demonstrated live."),
]

DEPENDENCIES = [
    ("Requirements (A1)", "Everything downstream", "Nothing is built before it is "
     "specified. The one deliberate exception was the render-loop spike, which was run "
     "*during* analysis precisely because the answer changed the requirements."),
    ("Technical spike", "The whole build plan", "If real-time 3D at 60 fps in a browser "
     "had not been demonstrable in week 3, the product concept would have had to change "
     "while there was still time to change it."),
    ("Vertical slice (M4)", "Environments 2 and 3", "One environment proven end to end "
     "before the other two are built, so a systemic mistake is made once rather than "
     "three times."),
    ("Hazard system", "Test suite, difficulty tuning", "Scoring cannot be tested before "
     "hazards can be registered and found."),
    ("Corporate identity", "Website, deck, in-product UI", "The palette is defined once "
     "and imported everywhere, so identity has to land before the things that consume it."),
    ("Feature complete (M5)", "Rehearsal", "You cannot rehearse a demonstration of "
     "software that is still changing."),
]

RISKS = [
    ("R1", "Performance: a browser cannot render a warehouse at an acceptable frame rate.",
     "High", "High",
     "Prove it in week 3 with a spike before committing. Set a hard draw-call budget "
     "(NFR-02) and measure it continuously with an in-game overlay.",
     "Occurred. A single environment issued 9,587 draw calls. A static-geometry merge "
     "pass reduced it to 994 objects in 74 batches, and 60 fps was met."),
    ("R2", "Single point of failure: one member holds most of the 3D skill.",
     "Medium", "High",
     "All work in the shared repository from day one, reviewed by a second member. "
     "Written architecture and decision records so the reasoning is not only in one "
     "person's head.",
     "Held. `docs/ARCHITECTURE.md` and `docs/DECISIONS.md` exist for this reason."),
    ("R3", "Scope creep: VR, multiplayer, an authoring tool.",
     "Medium", "Medium",
     "An explicit out-of-scope list in A1 §1.1, agreed with the client. Anything new "
     "arrives as a requirement with a priority, not as an idea in a meeting.",
     "Held. VR is refused in writing because we have no hardware to test it on."),
    ("R4", "Asset licensing: art or audio we do not have the right to ship.",
     "Low", "High",
     "Generate everything at run time. No third-party model, texture or audio file "
     "enters the project (NFR-06).",
     "Held. `docs/ASSET_CREDITS.md` records that there is nothing to credit."),
    ("R5", "Client availability: feedback arrives too late to act on.",
     "Medium", "Medium",
     "Keep a written interaction log (A3). Bring something runnable to every client "
     "contact rather than a description of something runnable.",
     "Open — depends on the client's diary, not ours."),
    ("R6", "Deployment blocked by repository or hosting settings.",
     "Medium", "Low",
     "Deploy early rather than at the end, so a blocker is found while there is time.",
     "Occurred. The GitHub Pages deployment API failed repeatedly; publishing to a "
     "`gh-pages` branch instead works without the manual settings change."),
    ("R7", "Untested claims: documentation asserting behaviour nobody verified.",
     "Medium", "High",
     "Group rule R9. Every claim about the product must be demonstrable in the running "
     "build; anything untested is labelled untested.",
     "Held. Firefox, Safari, screen readers and physical touch hardware are all "
     "recorded as NOT tested."),
    ("R8", "A member becomes unavailable through illness or other commitments.",
     "Medium", "Medium",
     "Roles are responsibilities, not walls (R8). Weekly minutes make a slipping task "
     "visible within seven days rather than at the deadline.",
     "Open — standing risk for the rest of the module."),
]


def _individual_plan(doc, member, tasks):
    h2(doc, f"{member['name']} — {member['role']}")
    para(doc, "**Responsibilities**", after=3)
    bullets(doc, member["owns"], size=9.4)
    para(doc, "**Scheduled work**", after=3)
    rows = [[t[0], f"W{t[2]}–W{t[2] + t[3] - 1}" if t[3] > 1 else f"W{t[2]}", ""]
            for t in tasks]
    table(doc, ["Task", "Weeks", "Depends on / notes"], rows,
          widths=[8.0, 2.4, 5.6], size=9)


def build(out_dir):
    doc = new_doc()
    cover(doc, "Task A5", "Initial Project Plan",
          "The overarching group plan, the individual plans that make it up, "
          "and the risks it is exposed to.")

    h1(doc, "1  Approach")
    para(doc,
         "The plan is phased rather than sprint-based, because the module's deliverables "
         "are themselves phased and dated. Within the build phases the team works "
         "iteratively: one environment proven end to end before the other two are "
         "started, so a systemic mistake is made once rather than three times.")
    para(doc,
         "Two things are deliberately early. The **technical spike** in week 3 exists to "
         "answer a question that changes everything downstream — can a browser render a "
         "warehouse at 60 fps on the hardware the client owns? Finding the answer in week "
         "3 is cheap; finding it in week 9 is a different product. The **first "
         "deployment** is early for the same reason: a hosting problem discovered in week "
         "10 is a crisis, and the same problem in week 6 is an afternoon. Both decisions "
         "were vindicated — see risks R1 and R6.")
    para(doc,
         "This is a working document. It will change, and the weekly minutes (A4 §5) "
         "record progress against it.")

    h1(doc, "2  Phases")
    table(doc, ["Phase", "Weeks", "What happens", "Output"],
          [[p[0], p[1], p[2], p[3]] for p in PHASES],
          widths=[2.6, 1.6, 7.4, 4.4], size=9.2, align_center=(1,))

    h1(doc, "3  Gantt chart")
    para(doc,
         "Twenty-four scheduled tasks across twelve weeks, coloured by phase and labelled "
         "with the owning role. The three dashed lines are the milestones the plan is "
         "steered by.")
    figure(doc, os.path.join(FIG, "fig_gantt.png"), 16.5,
           "Figure 1 — Initial project plan, weeks 1 to 12. The full-size image is "
           "supplied separately as Gantt_Chart.png.")

    h1(doc, "4  Milestones")
    para(doc,
         "Each milestone has a completion test, because a milestone without one is a date "
         "somebody can claim to have hit.")
    table(doc, ["#", "When", "Milestone", "How we know it is met"],
          [[m[0], m[1], m[2], m[3]] for m in MILESTONES],
          widths=[1.2, 2.8, 5.4, 6.6], size=9.2, align_center=(0,))

    h1(doc, "5  Critical dependencies")
    table(doc, ["This must finish", "Before this can start", "Why"],
          [[d[0], d[1], d[2]] for d in DEPENDENCIES],
          widths=[3.4, 3.6, 9.0], size=9.2)

    page_break(doc)

    h1(doc, "6  Risk register")
    para(doc,
         "Likelihood and impact were assessed at the start. The final column is what "
         "actually happened, added as the project ran — a risk register nobody revisits "
         "is a filing exercise.")
    table(doc, ["#", "Risk", "Likelihood", "Impact", "Mitigation", "Outcome"],
          [[r[0], r[1], r[2], r[3], r[4], r[5]] for r in RISKS],
          widths=[0.9, 3.6, 1.5, 1.2, 4.6, 4.2], size=8.4, align_center=(0, 2, 3))

    page_break(doc)

    h1(doc, "7  Individual plans")
    para(doc,
         "The group plan decomposed by owner. Each member's plan is the subset of the "
         "Gantt they are accountable for, plus the responsibilities that run for the whole "
         "project rather than sitting in one bar.")

    by_owner = {}
    for task in diagrams.GANTT_TASKS:
        by_owner.setdefault(task[1], []).append(task)

    for m in CFG.MEMBERS:
        _individual_plan(doc, m, by_owner.get(m["short"], []))

    shared = by_owner.get("All", [])
    if shared:
        h2(doc, "Whole team")
        table(doc, ["Task", "Weeks", "Notes"],
              [[t[0], f"W{t[2]}", "Every member present and prepared to answer questions."]
               for t in shared],
              widths=[8.0, 2.4, 5.6], size=9)

    todo(doc,
         "Replace the member names in `assessment/config.py`. The task-to-owner mapping "
         "in §7 is generated from the Gantt in `assessment/diagrams.py` — if your team "
         "splits the work differently, change the owner on the task there and both the "
         "chart and this section update together.")

    path = save(doc, out_dir, "Project_Plan.docx")

    # The brief asks for the chart itself, so supply it as an image too.
    src = os.path.join(FIG, "fig_gantt.png")
    if os.path.exists(src):
        dest = os.path.join(out_dir, "Gantt_Chart.png")
        shutil.copyfile(src, dest)
        print(f"  · {os.path.relpath(dest, os.path.dirname(os.path.dirname(dest)))}")
    return path
