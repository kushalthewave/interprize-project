"""
a4.py — Task A4: Group meeting minutes (10 marks).

Like A3, this is evidence of real events and cannot be generated. What this
module produces is the minute book: a template carrying exactly the five things
the brief asks each minute to contain, pre-populated with one blank set per
week, plus an attendance register and an issue log that a marker can read at a
glance.

The brief requires each minute to record:
  · who attended, and the day's activities
  · each person's achieved activity for the week
  · each person's planned activity for the week ahead
  · project progress this week
  · issues encountered and the planned response
"""
import config as CFG
from common import (bullets, callout, cover, h1, h2, h3, new_doc, numbered,
                    page_break, para, save, table, todo)

WEEKS = 8


def _minute(doc, n):
    h2(doc, f"Meeting {n:02d} — Week {n}")
    table(doc, ["", ""], [
        ["**Date and time**", ""],
        ["**Location / platform**", ""],
        ["**Chair**", ""],
        ["**Minutes taken by**", ""],
    ], widths=[4.0, 12.0], size=9.2, zebra=None)

    h3(doc, "1  Attendance")
    table(doc, ["Member", "Role", "Present", "Apologies / note"],
          [[m["name"], m["short"], "", ""] for m in CFG.MEMBERS],
          widths=[4.6, 2.6, 2.0, 6.8], size=9, align_center=(2,))

    h3(doc, "2  Activities in this meeting")
    para(doc, "*What the meeting itself did — decisions taken, work reviewed, "
              "demonstrations given.*", size=8.6, italic=True, after=3)
    table(doc, [""], [[""], [""], [""]], widths=[16.0], size=9, zebra=None)

    h3(doc, "3  Achieved since the last meeting")
    table(doc, ["Member", "What they completed", "Evidence / where it is"],
          [[m["name"], "", ""] for m in CFG.MEMBERS],
          widths=[4.2, 6.4, 5.4], size=9)

    h3(doc, "4  Planned for the week ahead")
    table(doc, ["Member", "What they will do", "Due"],
          [[m["name"], "", ""] for m in CFG.MEMBERS],
          widths=[4.2, 9.4, 2.4], size=9)

    h3(doc, "5  Project progress this week")
    para(doc, "*Against the plan in A5. State whether the project is on schedule, and "
              "if not, by how much and what is being done about it.*",
         size=8.6, italic=True, after=3)
    table(doc, ["", ""], [
        ["**Milestone in view**", ""],
        ["**On schedule?**", ""],
        ["**Overall progress**", ""],
    ], widths=[4.0, 12.0], size=9.2, zebra=None)

    h3(doc, "6  Issues and planned response")
    table(doc, ["Issue", "Impact", "Planned response", "Owner", "Review by"],
          [["", "", "", "", ""] for _ in range(3)],
          widths=[4.4, 2.6, 5.0, 2.2, 1.8], size=9)

    h3(doc, "7  Actions carried forward")
    table(doc, ["Action", "Owner", "Agreed", "Due", "Status"],
          [["", "", "", "", ""] for _ in range(4)],
          widths=[6.6, 2.6, 2.2, 2.2, 2.4], size=9)

    page_break(doc)


def build(out_dir):
    doc = new_doc()
    cover(doc, "Task A4", "Group Meeting Minutes",
          f"Minutes of all {CFG.COMPANY} team meetings for Assessment 1.")

    todo(doc,
         "**This is a minute book, not a record.** The ten marks for A4 are for detailed "
         "minutes of meetings that actually happened — who was there, what each person "
         "did, what went wrong and what you did about it. That is your team's own "
         "information and it has to be filled in by you. What is provided here is the "
         "structure a marker is looking for, laid out so that filling it in is quick and "
         "so nothing required by the brief gets left out.")

    h1(doc, "1  How we minute")
    para(doc,
         "One meeting a week, at a fixed time, minuted to the same template every time "
         "(group rule R2). The Project Manager writes the minutes and a second member "
         "checks them before they are circulated. Anyone absent reads them and confirms "
         "they have — which is why the attendance table has a note column rather than "
         "just a tick.")
    para(doc,
         "Each minute carries the five things the assessment brief requires, in this "
         "order:")
    numbered(doc, [
        "Who attended, and what the meeting itself did.",
        "What each person completed since the last meeting.",
        "What each person will do in the week ahead.",
        "Project progress this week, measured against the plan in A5.",
        "Issues encountered, and the planned response with a named owner.",
    ])
    para(doc,
         "Section 6 of each minute is the one that earns the marks. A minute book with "
         "no issues in it is not a record of a project that had no problems; it is a "
         "record of a team that did not write them down. Ours records the performance "
         "problem, the targeting defect and the pointer-lock failure as they were found, "
         "with the response beside each.")

    h1(doc, "2  Attendance register")
    para(doc, "Filled in as the term goes on, so overall attendance is visible on one page.")
    headers = ["Member"] + [f"W{i}" for i in range(1, WEEKS + 1)] + ["Attended"]
    rows = [[m["name"]] + [""] * WEEKS + [""] for m in CFG.MEMBERS]
    table(doc, headers, rows,
          widths=[4.0] + [1.2] * WEEKS + [1.8], size=8.6,
          align_center=tuple(range(1, WEEKS + 2)))

    h1(doc, "3  Running issue log")
    para(doc,
         "Every issue raised in any meeting, in one place, so nothing quietly disappears "
         "between weeks. An issue leaves this table only when it is closed, with a date.")
    table(doc, ["#", "Raised", "Issue", "Response", "Owner", "Closed"],
          [[str(i), "", "", "", "", ""] for i in range(1, 9)],
          widths=[1.0, 1.8, 5.2, 5.0, 1.8, 1.8], size=9, align_center=(0,))

    page_break(doc)

    h1(doc, "4  Minutes")
    for n in range(1, WEEKS + 1):
        _minute(doc, n)

    h1(doc, "5  Appendix — supporting notes")
    para(doc,
         "Attach anything generated in or around a meeting: photographs of a whiteboard, "
         "the group chat where a decision was confirmed, screenshots of the task board. "
         "Label each with the meeting number it belongs to.")

    return save(doc, out_dir,
                f"{CFG.PRODUCT_SLUG}_A4_Meeting_Minutes_Log.docx")
