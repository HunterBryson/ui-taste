---
name: ui-taste
description: How to learn what makes a UI your person loves using and seeing, through UI Taste, the page where they box parts of designs and you say back what you see. Use whenever a UI Taste watch or send wakes you, or they say UI Taste, "I sent you some", "look at this design", ♥ Taste; whenever they give a verdict on a screen you made together, loved or not ("this is so good", "I hate this", "nothing stands out"); and every time before you make or redesign any interface for them.
---

# UI Taste

Your person has a page where designs they like live: screenshots of apps and sites, and screens the two of you made. They box a part and say a word or two. You say back what you think they meant, as a short question, beside their box. They tap **Yes, that's it** or **Not quite** and press **Send**. Every Yes is something you now know about their eye, sorted by kind, with a crop of the part and their words. Before you make them any interface, you start from what you know.

Written by Odie, the AI it was built with. These are the moves that made it work for us.

**Why it matters.** People can't put taste into words, and every AI's first draft of a UI is the same generic web app. Left alone, the person ends up fighting for every step: you build basic, they correct one small thing, you keep the structure, and it never gets good. UI Taste is how you stop starting basic. It isn't a folder of pictures. It's the one place their eye teaches yours.

Every command here is `"{{NODE}}" "{{TASTE}}" <command>`, written below as `taste <command>`. The top of that file lists them all. Any command starts the page's server if it's down.

## Three things that make it work
1. **Their Not quite is the most valuable thing they give you.** Your read names what you see; their correction names why they like it. "I like how big the card is" → your "one card fills the area" → their "no, I can read it from across the room." That second sentence is the taste. Aim every read at the why, and after a Not quite, read again from their words, not from your first guess.
2. **The loop closes on your own builds.** Their strongest signals are their verdicts on screens you made together, both ways. What they don't like is half of their taste.
3. **You use it before every UI, and they see you use it.** Start a look from what they've agreed with, say which design each idea came from, and mark the build as used.

## When they send
They pressed Send and they're looking at the design. Answer fast, like a reply in conversation.
1. `taste waiting`. For each part: read the crop file with your own eyes, then the whole picture if the crop isn't enough.
2. **Say it back as one short question, their words first, aimed at the why:** `taste read <design> <part> "…? Is that it?" --kind layout|navigation|buttons|colors|type|feel`. Name what the part does for them (easy to read from their chair, shows what belongs to what, calm on the eyes), not only what it is (a dot grid, a dropdown). One question, never a rule, never three.
3. **A Not quite** comes back with their words. Read again from them, shorter. If their words point at a different part than the box ("no, the cards at the bottom"), move the box with your read: `--box x,y,w,h` (0..1 of the picture). Two Not quites on one part means you're guessing: ask them plainly what caught their eye.
4. **A box marked Not this** is a part they dislike. Read it the same way ("Is it that…?"): what they avoid is taste too.
5. **A design marked "want built"** came from their screen as a request, not a look they like. Treat it as something they asked you to make, and talk about it with them; it doesn't go into what you've learned.
6. One line in chat at most. Your answer shows on their page by itself.

## Going first
- On a design they just added, box one or two parts you think they like, each as a question: `taste guess <design> x,y,w,h "…? Is that it?" --kind k`. Two at most; more is homework.
- `taste his` lists what waits on them: reads they haven't answered and designs you brought. Bring it up when you're starting UI work together, never as a nudge. If something has waited a week, ask once, then let it go.
- Bring a design (`taste bring <file> "why, for which build" --title t`) only when a real build is coming and it would teach you something for it. A pile they never look at teaches nothing.

## Their verdicts on screens you made
When they react to something you built together, either way:
1. Take a screenshot of exactly what they're looking at, and crop it to the screen.
2. `taste ours <file> "their exact words" --love|--no --title "<the build>"`. Their words go in as they said them. If the verdict came after a long fight, say so in the title: relief isn't taste.
3. `taste guess` on the part you think earned it. Their Yes turns it into something you know, marked as loved or as what to avoid.

## Before you make any UI
1. `taste learned` (or `learned <kind>`) and read the crops. Look hardest at the corrections, and at anything marked as what to avoid.
2. **Say your read first,** before you build: three or four lines, each naming the design it came from ("big type you can read from your chair, from the Railway nav you agreed to"). That's their chance to stop a wrong read before you build on it.
3. Build from those parts, not from your idea of a web app. Show two or three ways when the look is open.
4. Afterward, `taste used <design> "<what you built>"` on every design you drew from, so they see their taste being used without asking.
If nothing fits the job yet, say so, and bring two or three real designs for that kind of page first.

## Keeping it true
- **The folder is the memory.** Don't write their taste into your notes as rules ("they like dark headers"). A rule pins every future build to one look. Your read is made fresh each build from their agreed parts, and said back to them.
- **Their words are never cut or tidied.**
- **Undo is there:** `taste unyes <design> <part>` takes back a Yes they didn't mean; `taste drop <design> <part>` removes a part.

## Making it better
After a real round, ask: what slowed them, or you? Did you aim at the what instead of the why? Did a verdict on one of your builds go by without going in? Change how you do it (your notes, or your own copy of this file), not a list of what went wrong.
