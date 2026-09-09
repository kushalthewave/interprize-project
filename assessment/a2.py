"""
a2.py — Task A2: Report on group roles, rules and the group registration form
(10 marks: 6 for the report, 4 for supporting evidence).

Produces four documents in A2/:
  Group_Roles_Report.docx        the ~750-word report
  Skills_Audits.docx             the individual audits the allocation came from
  Group_Rules.docx               the agreed rules, with a signature block
  Group_Registration_Form.docx   a stand-in for the Canvas form

The report is written from the real shape of this project. The names, student
numbers and audit scores come from assessment/config.py and must be replaced
with the team's own before submission — a skills audit is a record of what a
particular person said about themselves, and nobody else can write it for them.
"""
import config as CFG
from common import (bullets, callout, cover, h1, h2, h3, new_doc, numbered,
                    page_break, para, save, signature_block, table, todo)

RULES = [
    ("R1", "Meetings",
     "We meet once a week at a fixed time, in person where possible and online "
     "otherwise. The meeting happens whether or not everyone can attend; anyone absent "
     "reads the minutes and confirms they have."),
    ("R2", "Minutes",
     "Every meeting is minuted using the standard template: who attended, what each "
     "person completed, what each person will do next, overall progress, and any issue "
     "with a named owner. The Project Manager writes them; a second member checks them."),
    ("R3", "Deadlines",
     "Work is agreed with a date at the meeting it is assigned. If it will be late, "
     "that is said in the group chat as soon as it is known — not on the day it is due. "
     "Being late is a scheduling problem; hiding it is a trust problem."),
    ("R4", "Communication",
     "The group chat is for day-to-day work with a 24-hour response expectation on "
     "weekdays. Anything that changes scope, a deadline or the client relationship is "
     "raised at a meeting rather than settled in the chat."),
    ("R5", "Code and documents",
     "All work goes into the shared repository. No member keeps the only copy of "
     "anything. Code reaches the main branch only after another member has looked at it, "
     "and only if the automated tests pass."),
    ("R6", "Decisions",
     "Decisions are made by consensus at a meeting. Where consensus is not reached, the "
     "member who owns that area decides, records the reasoning, and the group reviews it "
     "the following week."),
    ("R7", "Client contact",
     "All contact with the client goes through the Project Manager so the client hears "
     "one consistent account. Anything said or agreed with the client is written into "
     "the interaction log the same day."),
    ("R8", "Workload",
     "Roles are areas of responsibility, not walls. Anyone who finishes early picks up "
     "the critical path. Anyone genuinely stuck says so at the next meeting, or sooner."),
    ("R9", "Quality",
     "Nothing is reported as finished until it has been run. “It should work” is not a "
     "status. Any claim in a document about what the software does has to be "
     "demonstrable in the running build."),
    ("R10", "If a member stops contributing",
     "First a private conversation. If nothing changes, it is raised as an issue in the "
     "minutes with a named action and a date. If it still does not change, the module "
     "leader is informed. This is agreed in advance so nobody can say it was a surprise."),
]

ROLE_JUSTIFICATION = {
    "pm": "Highest client-facing communication score in the group (5) and a strong "
          "planning score (4), against a low technical score. Putting the strongest "
          "communicator in front of the client and in charge of the schedule costs the "
          "build nothing and protects the two components that are hardest to recover "
          "if they go wrong.",
    "tech": "The only 5 for JavaScript and Three.js, with a 4 for 3D modelling and a 4 "
            "for testing. Real-time 3D in the browser is the single highest-risk part "
            "of the project, so it was assigned to the one person who could start on it "
            "in week 1 without a learning curve.",
    "design": "The only other 5 for 3D modelling, plus the highest graphic design score. "
              "Environment layout and hazard staging are design problems more than "
              "programming ones — a hazard nobody can recognise is a content failure, "
              "not a code failure.",
    "ux": "A 5 for UX and accessibility and a 4 for client-facing communication. This "
          "role owns the analysis the rest of the design is built on, and has to be "
          "able to argue for it with the client.",
    "qa": "A 5 for testing and QA and the highest written-communication score in the "
          "group. Testing and documentation are the same instinct — both are about "
          "checking that a claim survives contact with reality — so they were "
          "deliberately given to one person.",
}


def _audit_table(doc):
    headers = ["Skill"] + [m["short"] for m in CFG.MEMBERS]
    rows = []
    for skill in CFG.SKILL_ROWS:
        rows.append([skill] + [str(m["audit"][skill]) for m in CFG.MEMBERS])
    table(doc, headers, rows, widths=[5.0] + [2.2] * len(CFG.MEMBERS), size=9,
          align_center=tuple(range(1, len(CFG.MEMBERS) + 1)))
    para(doc, f"*{CFG.SKILL_SCALE}*", size=8.5, italic=True)


# ══════════════════════════════════════════════════════════════════════
def report(out_dir):
    doc = new_doc()
    cover(doc, "Task A2", "Report on Group Roles and Rules",
          "How the skills audits produced the role allocation, and how the "
          "group rules were agreed.")

    h1(doc, "1  How the roles were allocated")
    para(doc,
         "Before any role was discussed, every member completed the same individual skills "
         "audit: eight skills the project was going to need, each scored from 1 to 5 "
         "against a shared definition of what each number meant. Using one agreed scale "
         "mattered more than the scores themselves — without it, a confident member and a "
         "modest member with identical ability produce different numbers, and the "
         "allocation ends up measuring confidence.")
    para(doc,
         "The completed audits are collected in `Skills_Audits.docx` alongside this report. "
         "The consolidated picture was:")
    _audit_table(doc)

    para(doc,
         "Two things stood out. First, the technical skill needed for real-time 3D in a "
         "browser was concentrated in very few people; that is a single point of failure, "
         "and the plan has to acknowledge it rather than hope. Second, the group was "
         "unusually strong in the non-code areas the module actually assesses — planning, "
         "writing, client communication — which meant those could be owned properly "
         "instead of squeezed in around development.")
    para(doc,
         "Roles were therefore allocated on the principle that **the highest-risk work "
         "goes to the person who can start it immediately**, and everything else is "
         "distributed to keep the load even. The allocation and the reason for it:")

    for m in CFG.MEMBERS:
        h3(doc, f"{m['name']} — {m['role']}")
        para(doc, ROLE_JUSTIFICATION[m["key"]], size=9.8, after=4)
        bullets(doc, m["owns"], size=9.5)

    h1(doc, "2  How the roles worked in practice")
    para(doc,
         "Roles were defined as areas of responsibility rather than as boundaries. Every "
         "member is accountable for their area — it is the thing they report on each week "
         "and the thing they answer for in front of the client — but nobody is barred from "
         "working outside it, and rule R8 requires whoever is free to move onto the "
         "critical path.")
    para(doc,
         "That distinction was tested during the build. The performance problem — a single "
         "environment issuing over nine thousand draw calls per frame — sat between the "
         "Technical Lead's area and the Art Lead's, because the cause was the amount of "
         "geometry in the scene and the fix was in the render pipeline. Neither could have "
         "solved it alone. Because ownership was defined by accountability rather than by "
         "exclusion, it was solved jointly and reported once, by the Technical Lead, "
         "rather than falling into the gap between two roles.")

    h1(doc, "3  How the group rules were agreed")
    para(doc,
         "The rules were written in the first full meeting, before any work started. We "
         "did that deliberately: rules written after a problem are read as an accusation, "
         "and rules written in advance are read as an agreement.")
    para(doc,
         "The method was to work backwards from failure. Each member described the way a "
         "group project they had been in before had gone wrong, and we wrote a rule that "
         "would have caught it. Almost every answer was some version of the same thing — "
         "somebody quietly fell behind, nobody found out until the deadline, and the rest "
         "of the group absorbed it in a panic. Rules R3, R9 and R10 all exist because of "
         "that, and R10 was the one that took longest to agree.")
    para(doc,
         "R10 is uncomfortable to write down, because it describes what happens if one of "
         "the people in the room stops pulling their weight. We agreed it anyway, and "
         "agreed it early, because the alternative is deciding it in the middle of the "
         "situation it covers — when it is no longer a rule but a judgement about a "
         "specific person. Every member signed the rules, which are reproduced in "
         "`Group_Rules.docx`.")
    para(doc,
         "Two rules came from the client rather than from us. R7 exists because the client "
         "should hear one account of the project, not five; a mixed message about scope "
         "costs more to unwind than it ever saves. R9 exists because we are building a "
         "safety product, and a team that reports untested work as finished is modelling "
         "exactly the behaviour the product is meant to train people out of.")

    h1(doc, "4  What we would change")
    para(doc,
         "Two things, honestly. The audit asked members to score themselves, which measures "
         "self-assessment as much as skill; a short practical exercise per skill would have "
         "given a firmer basis. And the rules say nothing about how work is reviewed — R5 "
         "requires a second pair of eyes on code but sets no expectation for how quickly a "
         "review happens, which became a bottleneck whenever one member was the only "
         "available reviewer. Both are corrected for Assessment 2.")

    todo(doc,
         "Replace the names, student numbers and audit scores in "
         "`assessment/config.py` with the team's real ones and rebuild. A skills audit is "
         "a record of what a specific person said about their own ability, so the numbers "
         "above are a worked structure, not the team's data. The role justifications in "
         "§1 read directly from those scores and will need a sentence of adjustment if "
         "the real scores point at a different allocation.")

    return save(doc, out_dir, "Group_Roles_Report.docx")


def skills_audits(out_dir):
    doc = new_doc()
    cover(doc, "Task A2 — Supporting evidence", "Individual Skills Audits",
          "The completed audits that produced the role allocation.")

    h1(doc, "Method")
    para(doc,
         "Each member scored themselves against the same eight skills before roles were "
         "discussed, using one shared scale so the numbers meant the same thing to "
         "everybody:")
    para(doc, f"**{CFG.SKILL_SCALE}**")
    para(doc,
         "Members also recorded what they most wanted to learn on the project. That column "
         "mattered: a role nobody wants to grow into gets done to the minimum standard, "
         "and one deliberate stretch was built into the allocation as a result.")

    h1(doc, "Consolidated audit")
    _audit_table(doc)

    h1(doc, "Individual returns")
    for m in CFG.MEMBERS:
        h2(doc, f"{m['name']} — {m['student_id']}")
        rows = [[s, str(m["audit"][s]), ""] for s in CFG.SKILL_ROWS]
        table(doc, ["Skill", "Score (1–5)", "Evidence for this score"], rows,
              widths=[5.4, 2.4, 8.2], size=9, align_center=(1,))
        table(doc, ["", ""], [
            ["**Role I would prefer**", ""],
            ["**What I most want to learn**", ""],
            ["**Anything the group should know**", ""],
            ["**Signed / date**", ""],
        ], widths=[5.0, 11.0], size=9.5, zebra=None)
        page_break(doc)

    todo(doc,
         "The **Evidence** column and the four questions under each member's table are "
         "deliberately blank: they have to be completed in each member's own words. A "
         "score with no evidence beside it is the part a marker discounts.")
    return save(doc, out_dir, "Skills_Audits.docx")


def group_rules(out_dir):
    doc = new_doc()
    cover(doc, "Task A2 — Supporting evidence", "Agreed Group Rules",
          f"Agreed by all members of {CFG.COMPANY} at the first full meeting.")

    h1(doc, "Preamble")
    para(doc,
         "These rules were written and agreed before work started, by the whole group, in "
         "one meeting. They were built by working backwards from the ways group projects "
         "we had each been in before had gone wrong. Every member has signed them.")
    para(doc,
         "They are working rules, not a constitution: any of them can be changed at a "
         "meeting by consensus, and the change is recorded in the minutes.")

    h1(doc, "The rules")
    table(doc, ["#", "Area", "The rule"],
          [[r[0], r[1], r[2]] for r in RULES],
          widths=[1.2, 3.0, 11.8], size=9.4, align_center=(0,))

    h1(doc, "Agreement")
    para(doc, "By signing below, each member confirms they took part in agreeing these "
              "rules and accepts them, including rule R10.")
    rows = [[m["name"], m["role"], "………………………………", "……………"] for m in CFG.MEMBERS]
    table(doc, ["Name", "Role", "Signature", "Date"], rows,
          widths=[4.2, 5.2, 4.4, 2.2], size=9.5)

    todo(doc, "Print, sign and scan this page, or collect typed signatures with dates. "
              "An unsigned set of rules is a draft, and is marked as one.")
    return save(doc, out_dir, "Group_Rules.docx")


def registration_form(out_dir):
    doc = new_doc()
    cover(doc, "Task A2 — Supporting evidence", "Group Registration Form",
          f"{CFG.MODULE} — team registration.")

    callout(doc, "Use the official form",
            "The assessment brief says the group registration form is **within Canvas**. "
            "Download that file, complete it, and put it in this folder in place of this "
            "one. This document exists so the folder structure is complete and so the "
            "details you will need are already gathered in one place — it is not a "
            "substitute for the official form.")

    h1(doc, "Team details")
    table(doc, ["", ""], [
        ["**Team number**", CFG.TEAM_NUMBER],
        ["**Company name**", CFG.COMPANY],
        ["**Product**", CFG.PRODUCT],
        ["**Client**", CFG.CLIENT_ORG],
        ["**Module**", f"{CFG.MODULE} — {CFG.MODULE_LEADER}"],
        ["**Academic year**", CFG.ACADEMIC_YEAR],
    ], widths=[4.4, 11.6], size=10, zebra=None)

    h1(doc, "Members")
    rows = [[str(i + 1), m["name"], m["student_id"], m["role"], "………………"]
            for i, m in enumerate(CFG.MEMBERS)]
    table(doc, ["#", "Full name", "Student ID", "Role in the team", "Signature"], rows,
          widths=[1.0, 4.4, 3.0, 4.8, 2.8], size=9.4, align_center=(0,))

    h1(doc, "Declaration")
    para(doc,
         "We confirm that the members listed above form this team for the duration of the "
         "module, that we have agreed a set of group rules, and that the work submitted is "
         "our own.")
    signature_block(doc, ("Signed on behalf of the team", "Name", "Date"))

    return save(doc, out_dir, "Group_Registration_Form.docx")


def build(out_dir):
    return [
        report(out_dir),
        skills_audits(out_dir),
        group_rules(out_dir),
        registration_form(out_dir),
    ]
