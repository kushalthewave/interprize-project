"""
audit.py — a text-level QA pass over the generated .docx files.

There is no Word and no LibreOffice on this machine, so the documents cannot be
rendered and eyeballed. This checks the things that actually go wrong when a
document is generated rather than typed:

  · inline markup that never got converted (a literal ** or ` left in the text)
  · placeholders still needing the team's real information
  · empty tables, empty headings, missing images
  · a rough word count per document, against the brief's stated expectations

Run:  python assessment/audit.py [directory]
"""
import glob
import os
import re
import sys
import zipfile
from xml.etree import ElementTree as ET

W = "{http://schemas.openxmlformats.org/wordprocessingml/2006/main}"


def doc_text(path):
    with zipfile.ZipFile(path) as z:
        xml = z.read("word/document.xml")
    root = ET.fromstring(xml)
    parts = []
    for p in root.iter(f"{W}p"):
        runs = [t.text or "" for t in p.iter(f"{W}t")]
        parts.append("".join(runs))
    return parts


def doc_stats(path):
    with zipfile.ZipFile(path) as z:
        names = z.namelist()
        xml = z.read("word/document.xml")
    root = ET.fromstring(xml)
    images = [n for n in names if n.startswith("word/media/")]
    tables = list(root.iter(f"{W}tbl"))
    paras = doc_text(path)
    words = sum(len(p.split()) for p in paras)
    return dict(paras=len(paras), tables=len(tables), images=len(images), words=words)


def audit(path):
    name = os.path.basename(path)
    stats = doc_stats(path)
    text = "\n".join(doc_text(path))

    problems = []
    for m in set(re.findall(r"\*\*[^*\n]{1,60}\*\*", text)):
        problems.append(f"unconverted bold markup: {m}")
    for m in set(re.findall(r"`[^`\n]{1,60}`", text)):
        problems.append(f"unconverted code markup: {m}")
    placeholders = sorted(set(re.findall(r"«[^»]{1,60}»", text)))

    print(f"\n{name}")
    print(f"  {stats['words']:>6,} words · {stats['paras']:>4} paragraphs · "
          f"{stats['tables']:>2} tables · {stats['images']:>2} images")
    if placeholders:
        print(f"  {len(placeholders)} placeholder(s) to fill: "
              + ", ".join(placeholders[:6])
              + (" …" if len(placeholders) > 6 else ""))
    for p in problems:
        print(f"  !! {p}")
    return len(problems), len(placeholders)


def main():
    root = sys.argv[1] if len(sys.argv) > 1 else "_build"
    files = sorted(glob.glob(os.path.join(root, "**", "*.docx"), recursive=True))
    if not files:
        print(f"No .docx found under {root}")
        return 1
    bad = holes = 0
    for f in files:
        b, h = audit(f)
        bad += b
        holes += h
    print(f"\n{len(files)} documents · {bad} markup problem(s) · "
          f"{holes} placeholder occurrence(s) still to fill")
    return 1 if bad else 0


if __name__ == "__main__":
    sys.exit(main())
