"""
a6.py — Task A6: Initial marketing strategy, website prototypes and corporate
identity (10 marks: 3 + 4 + 3).

Produces:
  Marketing_Strategy.docx      the zero-budget plan
  Website_Design.docx          storyboard, prototype frames, and the live site
  Corporate_Identity.docx      name, mark, palette, type, voice, usage rules
  website/                     the deployable source of the company site
  logo/                        the logo files
"""
import os
import shutil

import config as CFG
import frames
from common import (bullets, callout, caption, cover, figure, h1, h2, h3, new_doc,
                    numbered, page_break, para, save, table, todo)

HERE = os.path.dirname(os.path.abspath(__file__))
FIG = os.path.join(HERE, "_figures")
REPO = os.path.dirname(HERE)
SITE_URL = CFG.LIVE_URL.rstrip("/") + "/company/"

SEGMENTS = [
    ("Small and mid-size warehouse operators",
     "20–200 staff, high turnover, one safety officer who is also doing three other jobs. "
     "No training budget line and no appetite for a procurement process.",
     "Induction that a supervisor can run in ten minutes from the laptop they already "
     "have, with nothing to install and nothing to buy.",
     "Primary"),
    ("Third-party logistics and agency staffing",
     "Induct the same content repeatedly for staff who may be on site for a fortnight.",
     "Repeatable, self-serve, and it produces a per-trainee record without an IT project.",
     "Primary"),
    ("FE and HE logistics and safety courses",
     "Teaching warehouse safety without a warehouse to teach it in.",
     "A free, instantly accessible practical exercise that works on a classroom projector "
     "and on students' own laptops.",
     "Secondary"),
    ("Independent health-and-safety consultants",
     "Deliver training into client sites; carry their own materials.",
     "Something memorable to open a session with, that runs offline from a USB stick when "
     "the client's guest Wi-Fi does not work.",
     "Secondary"),
]

ALTERNATIVES = [
    ("A slide deck and a signature sheet",
     "Free, universal, and what almost everybody actually uses.",
     "Passive. It tests attendance, not recognition. Everybody in the industry already "
     "knows this and does it anyway because the alternatives cost money.",
     "We are also free, and we test the thing that matters. That is the entire wedge."),
    ("Commercial e-learning modules",
     "Polished, tracked, and they produce a certificate.",
     "Per-seat licensing, a procurement conversation, and still mostly click-through "
     "multiple choice.",
     "No licence, no procurement, no per-seat cost. We lose on certification and central "
     "reporting — and we say so rather than pretending otherwise."),
    ("VR safety training",
     "Genuinely immersive and genuinely effective.",
     "Headsets, a supervised space, cleaning between users, and a capital budget. It does "
     "not fit in a ten-minute gap in a shift.",
     "A browser tab reaches every site immediately. We are not claiming to beat VR on "
     "immersion; we are claiming to beat it on getting used at all."),
]

CHANNELS = [
    ("The product itself", "£0",
     "A public link to a working demo. Nobody has to be persuaded to imagine it.",
     "Everywhere. Every other channel below exists to deliver this one link.",
     "Demo opens, and whether the first question we get is about the product rather "
     "than about what it is"),
    ("Company website", "£0",
     "One static page on GitHub Pages. No CMS, no host, no domain fee.",
     "The destination for every link we publish.",
     "Repository traffic; direct questions referencing the page"),
    ("LinkedIn — five personal networks", "£0",
     "A short post per member at each milestone, with the demo link and one screenshot. "
     "Written as a build log, not as an advert.",
     "The single highest-reach free channel available to a student team.",
     "Reactions, comments, and connection requests from the sector"),
    ("A two-minute screen-recorded demo", "£0",
     "Recorded with free software, hosted free on YouTube, embedded everywhere.",
     "For people who will not click an unfamiliar link but will watch a video.",
     "Views and watch-through"),
    ("Written build notes", "£0",
     "Two or three short pieces on the interesting engineering problems — the draw-call "
     "reduction, the QR bug the round-trip test caught. Published on a free platform.",
     "Attracts a technical audience that trusts specifics over adjectives.",
     "Reads and inbound links"),
    ("University showcase and the module presentation", "£0",
     "The client presentation itself, plus any departmental showcase.",
     "A room containing exactly the audience we want, at zero cost.",
     "Conversations started; follow-up requests"),
    ("Sector communities", "£0",
     "Participate honestly in warehouse and health-and-safety groups: answer questions, "
     "and link the demo only where it genuinely answers one.",
     "Reaches practitioners directly.",
     "Replies, and whether moderators welcome or remove the post"),
    ("Direct approach to local operators", "£0",
     "A short, specific, personal email to a named safety officer at a nearby site. Ten "
     "good ones, not two hundred generic ones.",
     "The only channel that produces a real pilot conversation.",
     "Reply rate, and pilots agreed"),
]

CALENDAR = [
    ("3–4", "Identity agreed; palette, mark and voice defined.", "Art Lead"),
    ("5–6", "Website written and deployed. Repository README rewritten for a "
            "non-technical reader.", "QA Lead"),
    ("7", "Screen-recorded demo cut and published. First LinkedIn post from all five "
          "members on the same day.", "All"),
    ("8", "First build-notes article published; linked from the site.", "Tech Lead"),
    ("9", "Ten personal approaches to named local operators.", "PM"),
    ("10", "Second article; sector-community participation begins.", "QA Lead"),
    ("11", "Pre-presentation post; site updated with the offline build link.", "Art Lead"),
    ("12", "Client presentation. Post-presentation write-up published the same week.", "All"),
]

OBJECTIONS = [
    ("“It's a game. This is serious.”",
     "It is scored, timed and ranked precisely because it is serious. The debrief names "
     "every hazard the trainee walked past — which is more than a signature on a "
     "register does. Offer them a round on Hard; the objection tends not to survive it."),
    ("“Our people aren't gamers.”",
     "Neither are ours. That is why sensitivity, invert-Y and a full touch scheme are in "
     "the settings, and why Training mode cannot be failed. Bimal in our persona set is "
     "exactly this person."),
    ("“What does it cost?”",
     "Nothing to run and nothing to host. We are a student company: what we want in "
     "return is a real site's feedback."),
    ("“Where do the results go?”",
     "Onto the machine that produced them, and nowhere else. That is deliberate — it is "
     "what removes the IT project. If central reporting matters more, that is a small "
     "backend and an honest conversation about scope."),
    ("“Can we have it in VR?”",
     "Not from us, and we would rather say so. We have no headset to test on, and "
     "shipping an untested VR mode would be a claim we could not stand behind."),
    ("“Is it accurate?”",
     "Fifteen hazards across seven recognised categories, each staged as a real "
     "situation and described in the vocabulary a safety officer uses. We would welcome "
     "a review from your safety team — that is the fastest way to make it better."),
]

VALUES = [
    ("Say what is true, including when it is inconvenient",
     "Our documentation lists what we have not tested as prominently as what we have. "
     "In a product about spotting hazards, a company that quietly overstates itself is "
     "teaching the wrong lesson before the software even loads."),
    ("Ship to the hardware people actually have",
     "No headsets, no installs, no procurement. If it does not open on the laptop "
     "already in the supervisor's office, it does not get used, and training that does "
     "not get used has no effect however good it is."),
    ("Build it rather than licence it",
     "Geometry, textures, audio, the QR encoder, the cryptography — written from the "
     "specification and tested against the published vectors. It keeps the product "
     "small, free of licence conditions, and entirely ours to fix."),
]

TONE = [
    ("Plain, not corporate",
     "“Fifteen hazards. Three warehouses. A clock.”",
     "“A comprehensive, immersive safety solution leveraging cutting-edge technology.”"),
    ("Specific, not superlative",
     "“9,587 draw calls became 994, and the frame rate went to 60.”",
     "“Blazing-fast performance.”"),
    ("Honest about limits",
     "“Firefox and Safari are not tested yet.”",
     "Silence, or “works everywhere”."),
    ("Respectful of the trainee",
     "“Training mode cannot be failed.”",
     "“Even a beginner can use it!”"),
    ("Never frighten people to sell",
     "“It teaches the glance-and-judge decision.”",
     "Injury statistics used as a sales device."),
]


def marketing(out_dir):
    doc = new_doc()
    cover(doc, "Task A6", "Initial Marketing Strategy",
          f"How {CFG.COMPANY} takes {CFG.PRODUCT} to market on a budget of zero.")

    h1(doc, "1  Positioning")
    para(doc,
         f"**For** small and mid-size warehouse operators who have to induct new staff "
         f"quickly and repeatedly, **{CFG.PRODUCT}** is browser-based safety training that "
         "puts the trainee on the floor and scores whether they can actually spot a "
         "hazard. **Unlike** a slide deck, it tests recognition rather than attendance; "
         "**unlike** commercial e-learning or VR, it costs nothing, installs nothing and "
         "starts in one click.")
    para(doc,
         "The one-sentence version we use out loud: *“It is the safety induction, except "
         "they have to actually find the hazards, and it runs in a browser tab.”*")

    h1(doc, "2  Who we are selling to")
    table(doc, ["Segment", "What they look like", "What we offer them", "Priority"],
          [[s[0], s[1], s[2], s[3]] for s in SEGMENTS],
          widths=[3.4, 5.0, 5.4, 2.2], size=9, align_center=(3,))

    h1(doc, "3  What we are competing with")
    para(doc,
         "Our real competitor is not another product. It is the slide deck and the "
         "signature sheet, because that is what almost every site already uses and it is "
         "already free. Anything we say has to be an argument against *that*, not against "
         "a vendor.")
    table(doc, ["Alternative", "Its strength", "Its weakness", "Our answer"],
          [[a[0], a[1], a[2], a[3]] for a in ALTERNATIVES],
          widths=[3.2, 3.4, 4.8, 4.6], size=9)

    h1(doc, "4  The zero-budget channel plan")
    para(doc,
         "Every channel below costs nothing but time. That is not a constraint we are "
         "working around — it shapes the strategy. Because we cannot buy attention, the "
         "product has to be the advertisement: a working demo, one click away, with no "
         "sign-up in front of it. Everything else exists to put that link in front of "
         "someone.")
    table(doc, ["Channel", "Cost", "What it is", "Why it earns its place", "How we know it worked"],
          [[c[0], c[1], c[2], c[3], c[4]] for c in CHANNELS],
          widths=[2.8, 1.0, 4.2, 4.2, 3.8], size=8.6, align_center=(1,))

    h2(doc, "4.1  The visitor journey")
    figure(doc, os.path.join(FIG, "fig_visitor_journey.png"), 16.5,
           "Figure 1 — What each step of the funnel has to achieve. Every step is free "
           "to run.")

    h2(doc, "4.2  What we will not do")
    bullets(doc, [
        "**Buy advertising.** There is no budget, and a student company buying clicks "
        "would be spending money to skip the part where the product has to be good.",
        "**Post the link anywhere it is not an answer to a question somebody asked.** "
        "Spamming logistics groups would cost us the only reputation we have.",
        "**Use injury statistics as a sales device.** We are asking people to trust us "
        "with safety training; frightening them into it would be the wrong start.",
        "**Claim capability we have not tested.** No VR, no certification, no central "
        "reporting — until those exist and have been run.",
    ])

    h1(doc, "5  Message")
    para(doc, "Three messages, in this order. The order matters more than the wording.")
    table(doc, ["#", "Message", "Evidence we give for it"], [
        ["1", "**Nobody remembers the slide deck.** Induction teaches rules in a room "
              "and then expects them on a floor.",
         "The client's own experience; ask any supervisor how the last induction went."],
        ["2", "**This tests the thing that matters** — spotting a hazard under time "
              "pressure — and tells the trainee what they walked past.",
         "A live round, then the debrief screen. Two minutes, no explanation needed."],
        ["3", "**It costs nothing and installs nothing.** A browser tab, or one file on "
              "a USB stick.",
         "Open it on their machine, in front of them. Then turn the Wi-Fi off and open "
         "the offline build."],
    ], widths=[0.9, 7.6, 7.5], size=9, align_center=(0,))

    h2(doc, "5.1  Objection handling")
    table(doc, ["What they say", "What we say"],
          [[o[0], o[1]] for o in OBJECTIONS],
          widths=[4.4, 11.6], size=9)

    h1(doc, "6  Calendar")
    table(doc, ["Weeks", "Activity", "Owner"],
          [[c[0], c[1], c[2]] for c in CALENDAR],
          widths=[1.8, 11.4, 2.8], size=9.2, align_center=(0,))

    h1(doc, "7  Measurement — and an honest problem with it")
    para(doc,
         "There is a genuine tension in this plan and it is worth stating rather than "
         "hiding. We have decided the website will carry no analytics, no cookies and no "
         "third-party requests, because that is consistent with a product that keeps all "
         "its data on the trainee's own machine. The direct consequence is that we cannot "
         "measure visits.")
    para(doc, "So we measure what is left, which is coarser but real:")
    table(doc, ["What we can measure", "How", "Target by week 12"], [
        ["Repository traffic", "GitHub's own insights, no tracker needed", "Establish a baseline"],
        ["Reach of a post", "LinkedIn's built-in figures", "Every member posts at least twice"],
        ["Video watch-through", "YouTube's own figures", "Publish and measure"],
        ["Conversations started", "Counted by hand in the client interaction log",
         "Ten named approaches, any reply is a result"],
        ["Pilot interest", "Did anyone ask to try it on a real site?",
         "One genuine conversation would exceed expectations"],
    ], widths=[4.2, 6.4, 5.4], size=9)
    callout(doc, "The trade we made",
            "Adding one analytics script would give us far better numbers. We are not "
            "adding it, because “no third-party requests” is a claim we make on the "
            "website itself and it has to stay true. Being able to prove a small claim is "
            "worth more to this company than a better dashboard.")

    h1(doc, "8  Budget")
    table(doc, ["Item", "Conventional cost", "Ours", "How"], [
        ["Hosting", "£5–20 / month", "£0", "GitHub Pages"],
        ["Domain", "£10–15 / year", "£0", "github.io subdomain; a domain is the first "
                                           "thing we would buy if we ever had a budget"],
        ["Website build", "£500–3,000", "£0", "One static page written by the team"],
        ["Art and audio assets", "£100s", "£0", "Everything is generated at run time"],
        ["Analytics", "£0–20 / month", "£0", "Deliberately none"],
        ["Advertising", "Open-ended", "£0", "Not doing it"],
        ["Video production", "£300+", "£0", "Free screen recorder, edited by the team"],
        ["**Total**", "**£1,000+ to start**", "**£0**",
         "The real cost is time, and it is in the plan in A5"],
    ], widths=[3.4, 3.6, 1.8, 7.2], size=9, align_center=(2,))

    return save(doc, out_dir, "Marketing_Strategy.docx")


def website(out_dir):
    doc = new_doc()
    cover(doc, "Task A6", "Website Ideas, Prototypes and Storyboards",
          "The company website and the product's interface, from storyboard "
          "to deployed page.",
          extra=[("Live site", SITE_URL)])

    h1(doc, "1  What we built, and why it is not a mock-up")
    para(doc,
         "The website is finished, deployed and reachable at the address on the cover. We "
         "built the real thing rather than a mock-up for one reason: the whole marketing "
         "argument is that the product works in a browser with no install, and the "
         "shortest way to prove that is a page that does exactly that and links straight "
         "to a demo.")
    para(doc,
         "It is one static HTML file plus screenshots: no framework, no build step, no "
         "CDN, no cookies and no third-party requests. That keeps hosting free (§8 of the "
         "Marketing Strategy) and lets the page make a claim about privacy that is "
         "actually true.")
    table(doc, ["", ""], [
        ["**Live URL**", SITE_URL],
        ["**Source**", "`marketing-site/index.html` in the repository, and in "
                       "`A6/website/` in this submission"],
        ["**Deployment**", "Copied into the published site by the GitHub Actions workflow "
                           "on every push to `main`"],
        ["**Weight**", "One HTML file plus eleven screenshots; no external request"],
    ], widths=[3.4, 12.6], size=9.5, zebra=None)

    h1(doc, "2  Storyboard")
    para(doc,
         "The site is a single page read top to bottom, so the storyboard is the design: "
         "what a visitor meets, in what order. The sequence is deliberate — say what it "
         "is, prove it is real, explain it, then ask. The demo button appears in the "
         "first screen and again at the end, and nothing in between asks for an email "
         "address.")
    figure(doc, os.path.join(FIG, "fig_website_storyboard.png"), 16.8,
           "Figure 2 — Website storyboard. Each panel is roughly one screen of scroll.")

    h2(doc, "2.1  Design decisions worth defending")
    table(doc, ["Decision", "Why"], [
        ["The demo button is the first control on the page",
         "Every other route to a decision costs the visitor more effort than clicking "
         "it. Nothing we can write beats ninety seconds of playing it."],
        ["Proof band immediately after the hero",
         "Five real numbers — 15 hazards, 3 environments, 60 fps, 0 third-party assets, "
         "828 kB offline. Credibility before persuasion, and every figure is measured."],
        ["All fifteen hazards listed in full",
         "A visitor evaluating training wants to know the scope. A vague “many hazards” "
         "reads as though there are four."],
        ["Screenshots from the running build, labelled as such",
         "Concept art in a product pitch is the fastest way to lose a technical buyer."],
        ["No email capture anywhere",
         "A form in front of a free demo converts curiosity into friction. The company "
         "section tells them who we are; if they want us they can find us."],
        ["The game's own palette and reticle motif",
         "Site, deck and product read as one company. The palette is imported from "
         "`src/ui/styles.css` rather than retyped, so they cannot drift apart."],
    ], widths=[5.4, 10.6], size=9.2)

    h1(doc, "3  Accessibility and robustness")
    para(doc,
         "Two defects were found and fixed while testing the page in an embedded viewport, "
         "and both are worth recording because neither would have shown up on a developer's "
         "own monitor:")
    numbered(doc, [
        "The scroll-reveal animation used `IntersectionObserver`, which reports no change "
        "at all when a fast scroll or an anchor jump carries an element from below the "
        "fold to above it between two frames. Whole sections stayed invisible "
        "permanently. It was replaced with a swept check that cannot miss an element.",
        "That sweep was throttled through `requestAnimationFrame`, which is suspended "
        "outright in a hidden or throttled tab — so the throttle latched and froze every "
        "later reveal. It now races the frame callback against a timeout, the same "
        "technique the game's loader uses.",
        "A viewport reporting zero height made the fold zero and hid the entire page. "
        "When the viewport cannot be measured the page now reveals everything: content "
        "beats animation.",
    ])
    para(doc,
         "The page also honours `prefers-reduced-motion` by disabling every transition, "
         "uses semantic headings and landmarks, gives every screenshot a descriptive "
         "alt text, and holds body text above 4.5:1 contrast.")

    page_break(doc)

    h1(doc, "4  Product interface prototypes")
    para(doc,
         "Seven screen prototypes and one flow diagram, drawn as vector artboards and "
         "importable directly into Figma (`design/frames/*.svg` in the repository). These "
         "were the design target for the interface; the built product follows them "
         "closely, and where it diverges the built version won because it had been used.")

    order = [
        ("01-login", "Prototype 1 — Sign-in",
         "Every route is shown, and an unavailable one states its specific reason "
         "instead of being greyed out in silence. That rule came out of the heuristic "
         "evaluation in A1 §4.3."),
        ("02-main-menu", "Prototype 2 — Main menu",
         "Mode choice first, because it is the decision that changes everything after "
         "it. Rank and progress sit beside it as the reason to come back."),
        ("03-environment-select", "Prototype 3 — Environment select",
         "Three warehouses, each with its own character and its own best score, so the "
         "choice is meaningful rather than cosmetic."),
        ("04-difficulty-select", "Prototype 4 — Difficulty select",
         "Each level states what it actually changes — clock, decoys, lighting, "
         "guidance. A difficulty setting that only changes a number is a lie."),
        ("05-in-game-hud", "Prototype 5 — In-game HUD",
         "Deliberately sparse: reticle, clock, found count, score. The find panel "
         "carries the location and the keywords, under an explicit “Remember” heading."),
        ("06-results", "Prototype 6 — Results",
         "The most important screen in the product. Rank, then the breakdown, then "
         "every hazard named — including, especially, the ones they missed."),
        ("07-settings", "Prototype 7 — Settings",
         "Accessibility is not in a submenu. Sensitivity, invert-Y and reduced motion "
         "sit at the same level as audio."),
    ]
    for stem, title, note in order:
        h2(doc, title)
        para(doc, note, size=9.6, after=4)
        figure(doc, frames.path(stem), 15.5)
        page_break(doc)

    h2(doc, "Prototype 8 — End-to-end user flow")
    para(doc,
         "The whole journey on one artboard: first run, sign-in, mode choice, round, "
         "results and return. It is the map the seven screens above sit on.")
    figure(doc, frames.path("08-user-flow"), 16.0)

    return save(doc, out_dir, "Website_Design.docx")


def identity(out_dir):
    doc = new_doc()
    cover(doc, "Task A6", "Corporate Identity",
          f"The {CFG.COMPANY} name, mark, palette, typography and voice.")

    h1(doc, "1  The company")
    table(doc, ["", ""], [
        ["**Name**", CFG.COMPANY],
        ["**Line**", CFG.TAGLINE],
        ["**Product**", CFG.PRODUCT],
        ["**Formed for**", f"{CFG.MODULE}, {CFG.UNIVERSITY}"],
    ], widths=[3.0, 13.0], size=10, zebra=None)

    h2(doc, "1.1  Why this name")
    para(doc,
         "*The Code Crafters* says what the team does and how it does it. *Code* is the "
         "material: everything in the product — the warehouse, the textures, the sound, "
         "the sign-in — is written rather than bought in. *Crafters* is the attitude: "
         "work made carefully, by hand, and checked before it is called finished. It is "
         "plain English, easy to say to a client, and it cannot be mistaken for anything "
         "else.")
    para(doc,
         f"The product is built by {CFG.BUILT_BY}. The team's Nepali background runs "
         "through the product in a restrained way — bilingual signage in the warehouse "
         "and local place names on the company board — present because it is ours, not "
         "as a theme.")

    h1(doc, "2  Mission, vision and values")
    h2(doc, "2.1  Mission")
    para(doc,
         f"**We build training that people actually finish — and remember on the floor a "
         f"week later.**", size=13)
    h2(doc, "2.2  Vision")
    para(doc,
         "That safety induction stops being a signature on a register and becomes "
         "something a person can be shown to be able to do.")
    h2(doc, "2.3  Values")
    table(doc, ["Value", "What it means in practice"],
          [[v[0], v[1]] for v in VALUES],
          widths=[5.0, 11.0], size=9.4)

    page_break(doc)

    h1(doc, "3  The mark")
    figure(doc, os.path.join(FIG, "logo_dark.png"), 14.0,
           "Figure 1 — Primary lockup, dark. This is the default.")
    figure(doc, os.path.join(FIG, "logo_light.png"), 14.0,
           "Figure 2 — Light lockup, for print and light backgrounds.")
    figure(doc, os.path.join(FIG, "logo_mark.png"), 5.0,
           "Figure 3 — The mark alone, for favicons, avatars and small sizes.")

    h2(doc, "3.1  What it is")
    para(doc,
         "A hazard triangle inside a targeting reticle. The triangle is the universal "
         "warning sign, understood without language on any warehouse floor in the world. "
         "The reticle is the game's own crosshair, and the four ticks are the reticle "
         "from the HUD. Together they read as *spot the hazard* with no words at all — "
         "which is exactly the product's argument.")

    h2(doc, "3.2  Usage rules")
    table(doc, ["Rule", "Detail"], [
        ["**Clear space**", "Keep clear space equal to the height of the triangle on all "
                            "four sides. Nothing sits inside it."],
        ["**Minimum size**", "24 px for the mark alone; 120 px wide for the full lockup. "
                             "Below that the ticks fill in and it reads as a blob."],
        ["**Backgrounds**", "Dark ground by default. On light ground use the light "
                            "lockup. Never place the dark lockup on a mid-tone."],
        ["**Colour**", "Amber mark on dark, or the dark mark on white. No other "
                       "recolouring, and never a gradient."],
        ["**Do not**", "Stretch it, rotate it, outline it, add a drop shadow, place it on "
                       "a photograph without a scrim, or separate the ticks from the ring."],
    ], widths=[3.4, 12.6], size=9.4)

    h1(doc, "4  Colour")
    para(doc,
         "One palette, defined once in `src/ui/styles.css` and imported by the "
         "presentation deck, the website and this document set. It is not retyped "
         "anywhere, which is why the company, the product and the pitch cannot drift "
         "apart.")
    figure(doc, os.path.join(FIG, "fig_palette.png"), 15.0,
           "Figure 4 — The palette and the role of each colour.")
    para(doc,
         "**Hazard amber `#F2B90C` is the brand.** It is used for exactly one thing at a "
         "time: the primary action. When everything is highlighted, nothing is — which in "
         "a product about noticing things would be an unusually poor joke.")
    para(doc,
         "Severity is never carried by colour alone. Major and minor hazards have "
         "distinct colours *and* are always labelled in words, so the product works for "
         "someone with colour vision deficiency.")

    h1(doc, "5  Typography")
    table(doc, ["Role", "Face", "Why"], [
        ["Interface and web", "Inter, falling back to Segoe UI and the system stack",
         "Open licence, excellent at small sizes, unambiguous digits — which matters "
         "when a clock is the thing creating the pressure."],
        ["Documents", "Calibri",
         "Every marker and every client can open it, and it prints predictably."],
        ["Code and data", "JetBrains Mono, falling back to Consolas",
         "Clearly distinguishes 0/O and 1/l/I in secrets, IDs and scores."],
    ], widths=[3.0, 4.6, 8.4], size=9.4)
    para(doc,
         "All three are free. That is a brand decision as much as a budget one: a "
         "typeface we cannot afford to licence for a real client is a typeface we should "
         "not design with.")

    h1(doc, "6  Tone of voice")
    para(doc,
         "How the company writes, everywhere — the website, the deck, the product's own "
         "messages and the documentation.")
    table(doc, ["Principle", "We write", "We do not write"],
          [[t[0], t[1], t[2]] for t in TONE],
          widths=[3.6, 6.2, 6.2], size=9.2)

    h1(doc, "7  Where the identity is applied")
    table(doc, ["Application", "Status"], [
        ["Product interface", "Live — the palette originates here"],
        ["Company website", f"Live — {SITE_URL}"],
        ["Presentation deck", "Built — palette imported from the same source"],
        ["Assessment documents", "This document set"],
        ["Favicon and avatars", "The mark alone"],
    ], widths=[6.0, 10.0], size=9.4)

    return save(doc, out_dir, "Corporate_Identity.docx")


def assets(out_dir):
    """Copy the deployable website and the logo files into A6/."""
    site_src = os.path.join(REPO, "marketing-site")
    site_dst = os.path.join(out_dir, "website")
    if os.path.isdir(site_src):
        if os.path.isdir(site_dst):
            shutil.rmtree(site_dst)
        shutil.copytree(site_src, site_dst)
        print("  · A6/website/  (deployable source)")

    logo_dst = os.path.join(out_dir, "logo")
    os.makedirs(logo_dst, exist_ok=True)
    for name in ("logo_dark.png", "logo_light.png", "logo_mark.png", "fig_palette.png"):
        src = os.path.join(FIG, name)
        if os.path.exists(src):
            shutil.copyfile(src, os.path.join(logo_dst, name.replace("fig_", "")))
    print("  · A6/logo/")


def build(out_dir):
    paths = [marketing(out_dir), website(out_dir), identity(out_dir)]
    assets(out_dir)
    return paths
