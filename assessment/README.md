# CET257 Assessment 1 — submission pack generator

Everything in the submission is generated from this folder, so a change to a
name or a date is one edit and one command rather than fifteen documents to
open by hand.

```bash
pip install python-docx Pillow matplotlib svglib rlPyCairo
python assessment/build.py --zip     # build and zip
python assessment/audit.py           # list every remaining placeholder
```

## Edit one file

`config.py` holds the team number, company name, member names, student
numbers, skills-audit scores and the submission date. Everything else reads
from it — the role allocation in A2, the individual plans in A5, the slide
assignments and backup pairings in A7, the logo, the website's brand colours.

Anything still written in «double angle quotes» needs your real information.
`audit.py` finds them all.

## What is here

| File | Produces |
|---|---|
| `config.py` | The single source of truth. Edit this. |
| `common.py` | Word styling: margins, headings, tables, callouts, figures |
| `diagrams.py` | Context, use case, three flowcharts, architecture, Gantt, logo, palette |
| `storyboard.py` | A6 website storyboard and visitor journey |
| `frames.py` | Rasterises `design/frames/*.svg` into embeddable PNGs |
| `a1.py` … `a7.py` | One module per assessment task |
| `build.py` | Assembles `_build/`, then zips it |
| `audit.py` | Text-level QA over the generated .docx files |

## Why a generator rather than fifteen Word files

Three reasons. Facts appear once: the scoring table, the hazard count and the
draw-call figures are read from the same place, so the documents cannot
contradict each other or the code. Personalising the pack is one edit rather
than a search across fifteen files. And the figures are code, so a change to
the plan changes the Gantt chart rather than requiring someone to redraw it.

## What this cannot generate

A3 (client interaction log), A4 (meeting minutes) and the skills audits in A2
are records of things that actually happened. They ship as complete structures
with every field a marker looks for, and the team fills them in.
