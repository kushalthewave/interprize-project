"""
a3.py — Task A3: Evidence of interaction with clients (10 marks).

This one cannot be generated. The mark is for *documentary evidence* of
interactions that actually happened between this team and Vantec: what was
said, what was agreed, what changed as a result. Those are records of real
events, and inventing them would be fabricating evidence for a graded
assessment — which is a different thing entirely from documenting software we
genuinely built.

So this module produces the log itself: the structure, the fields a marker
looks for, and a worked example clearly marked as a format guide rather than a
record. The team fills it from their own emails, meetings and calls.
"""
import config as CFG
from common import (bullets, callout, cover, h1, h2, h3, new_doc, numbered,
                    page_break, para, save, table, todo)

INTERACTION_TYPES = [
    ("Client briefing", "The initial brief and any restatement of it",
     "Brief document, your notes, the questions you asked"),
    ("Formal meeting", "A scheduled meeting with an agenda",
     "Agenda, minutes, actions with owners and dates, attendee list"),
    ("Informal contact", "A corridor conversation, a phone call, a quick question",
     "A dated note written the same day, and what it changed"),
    ("Email / message", "Anything written",
     "The message itself, with the thread, dates and senders visible"),
    ("Demonstration", "Showing the client something running",
     "What you showed, what they said, what you changed afterwards"),
    ("Requirement change", "Anything that altered scope or a requirement",
     "The old requirement, the new one, who authorised it, and when"),
    ("Feedback", "Their reaction to work you presented",
     "Their words as closely as you can record them, and your response"),
]

CHECKLIST = [
    "Every entry has a **date**. An undated record is not evidence.",
    "Every entry names **who was present**, on both sides.",
    "Every entry records **what was agreed**, not just what was discussed.",
    "Every agreement has an **owner** and a **date**.",
    "Anything that changed a requirement is cross-referenced to the requirement ID "
    "in the A1 document, so the change can be traced.",
    "Raw evidence — email screenshots, message threads, meeting invitations — is "
    "attached in the appendix rather than only summarised.",
    "Entries were written **on the day**, not reconstructed at the end. It shows.",
]


def build(out_dir):
    doc = new_doc()
    cover(doc, "Task A3", "Client Interaction Log",
          f"A dated record of every interaction between {CFG.COMPANY} and "
          f"{CFG.CLIENT_ORG}.")

    todo(doc,
         "**This document is a structure, not a record.** The ten marks for A3 are for "
         "evidence of interactions that actually took place between your team and "
         "%s — their words, their feedback, and what you changed because of it. "
         "Nobody outside your team can write that, and a fabricated log is worth nothing "
         "at all. Fill in §3 from your own emails, meeting notes and calls, and attach "
         "the originals in §4." % CFG.CLIENT_ORG)

    h1(doc, "1  Purpose")
    para(doc,
         "Every contact with a client generates a record, whether or not anyone writes it "
         "down. This log is where they are written down. It exists for three reasons: so "
         "the team works from one shared account of what was agreed; so a change to the "
         "specification can be traced back to the person who asked for it; and so the "
         "client can see that what they said was heard.")
    para(doc,
         "Rule R7 of the group rules routes all client contact through the Project "
         "Manager, who is responsible for entering it here the same day.")

    h1(doc, "2  What counts as an interaction")
    para(doc,
         "All of the following are logged. The informal ones matter most, because they are "
         "the ones that get forgotten and then argued about later.")
    table(doc, ["Type", "What it covers", "Evidence to attach"],
          [[t[0], t[1], t[2]] for t in INTERACTION_TYPES],
          widths=[3.4, 5.6, 7.0], size=9.2)

    h1(doc, "3  The log")
    para(doc,
         "One entry per interaction, most recent last. Copy the block below for each.")

    h2(doc, "Entry format — worked example")
    callout(doc, "This is a format guide, not a record of a real meeting",
            "The entry below shows the level of detail a complete entry needs. It "
            "describes no meeting that took place. **Delete it** once you have entered "
            "your first real interaction.")
    table(doc, ["Field", "Example content"], [
        ["**Entry no.**", "03"],
        ["**Date and time**", "«e.g. 14 October 2025, 14:00–14:40»"],
        ["**Type**", "Formal meeting"],
        ["**Present — client**", f"«Name, job title», {CFG.CLIENT_ORG}"],
        ["**Present — team**", "«Names of the members who attended»"],
        ["**Purpose**", "Review the hazard list and confirm which are in scope."],
        ["**Discussed**",
         "«What was actually talked about. Two or three sentences, in the order it "
         "happened.»"],
        ["**Client said**",
         "«Their words, as close to verbatim as you can get. This is the part a marker "
         "is looking for — it is what makes the entry evidence rather than a summary.»"],
        ["**Agreed**",
         "«The decisions. One line each. If nothing was decided, say that — it is still "
         "a real outcome.»"],
        ["**Actions**",
         "«Action — owner — date due. One line each.»"],
        ["**Requirements affected**",
         "«e.g. FR-19 amended; FR-35 deferred. Cross-reference the A1 IDs so the change "
         "is traceable.»"],
        ["**Evidence attached**",
         "«e.g. Appendix A3-3: meeting invitation and the emailed summary sent "
         "afterwards.»"],
    ], widths=[4.2, 11.8], size=9.2, zebra=None)

    page_break(doc)

    h2(doc, "Blank entries")
    para(doc, "Six blank entries follow. Add more as needed.")
    for i in range(1, 7):
        h3(doc, f"Entry {i:02d}")
        table(doc, ["Field", ""], [
            ["Date and time", ""],
            ["Type", ""],
            ["Present — client", ""],
            ["Present — team", ""],
            ["Purpose", ""],
            ["Discussed", ""],
            ["Client said", ""],
            ["Agreed", ""],
            ["Actions (owner, date)", ""],
            ["Requirements affected", ""],
            ["Evidence attached", ""],
        ], widths=[4.2, 11.8], size=9, zebra=None)
        if i % 2 == 0:
            page_break(doc)

    h1(doc, "4  Appendix — raw evidence")
    para(doc,
         "Attach the originals here: email threads, message screenshots, meeting "
         "invitations, photographs of a whiteboard, the client's own annotated documents. "
         "Label each one with the entry number it belongs to (A3-1, A3-2, …). A marker "
         "credits the original far more readily than a summary of it.")
    callout(doc, "Before you submit, check every line of this",
            "  ·  ".join(c.replace("**", "") for c in CHECKLIST[:3]))
    bullets(doc, CHECKLIST)

    h1(doc, "5  Summary of requirement changes from client contact")
    para(doc,
         "A short table pulling every requirement change out of the log above, so the "
         "marker — and the client — can see at a glance what the conversations actually "
         "changed. This is the strongest single piece of evidence in the document: it "
         "shows the client was listened to.")
    table(doc, ["Date", "Entry", "Requirement", "Change", "Requested by"],
          [["", "", "", "", ""] for _ in range(6)],
          widths=[2.4, 1.6, 3.0, 6.4, 2.6], size=9)

    return save(doc, out_dir, f"{CFG.PRODUCT_SLUG}_A3_Client_Interaction_Log.docx")
