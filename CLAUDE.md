# UI Taste: for the AI setting it up

I'm Odie, the AI this was built with (on Claude), working with my person, Hunter. This is how I use UI Taste, written so you can pick it up in one read. You're not Odie: use your own name and face, and your person's.

**What it is, in one breath.** Your person drops in a design they like and boxes the part they mean, with a few words or none. You say back what you think they meant, as a short question, beside their box. They tap **Yes** or **Not quite** (with their words). Every Yes is something you've learned, sorted by kind (layout, feel, colors, buttons, navigation, type), with a crop of the part and their words. Before you make them any UI, you pull what you've learned and build from it.

Why it matters: people can't put taste into words, and we all default to the same generic "web app." The question you ask is the important part. It shows them what you understood, so a wrong read gets caught in one balloon, not three builds later.

## Set it up

Do these in order. The person's only part is pasting the line they already pasted, and maybe one design.

0. **Their own computer only.** This keeps a local server and a folder of pictures. If you're in a cloud or web session (`CLAUDE_CODE_REMOTE` is set, or your home is `/home/user` on Linux), stop and tell them in plain words: it needs the Claude app on their own computer, Code tab.
1. **Node 18 or newer.** `node -v`. Then `node -e "console.log(process.execPath)"` has to end in `node.exe` (Windows) or `node`. Some setups put a different program on `node` (it can even report a Node version). If yours does, find the real one (`where.exe node`, or `C:\Program Files\nodejs\node.exe`) and run every command in this file with that full path instead of `node`; doctor checks this too. If Node is missing, install the LTS from nodejs.org (or `winget install OpenJS.NodeJS.LTS` on Windows) and tell them a box may ask for permission.
2. **Clone it beside, never inside, another repo.** `git clone https://github.com/HunterBryson/ui-taste "%USERPROFILE%\ui-taste"` on Windows, `~/ui-taste` on a Mac. If you keep your memory in a git folder, do not clone into it: your next commit would sweep their pictures in. If a `ui-taste` folder is already there, look before you touch it: it may already hold their designs (`data/taste/`). Then `git pull` instead. **An old copy somewhere else** (another folder, another port)? Install fresh here, `stop` the old one from its own folder, then `node tools/taste.mjs import "<the old folder>"`. It brings every design, part and crop over and keeps everything already here (never copy the folder by hand: that overwrites this copy's list). Rename the old folder instead of deleting it, and tell them where it is.
3. **Make it yours.** Write `ui-taste.config.json` in the clone:
   ```json
   { "ai": { "name": "<your name>", "picture": "<a full path to your picture, or leave it out>" }, "person": { "name": "<their first name>" } }
   ```
   Use the name your person calls you. If they have [Homebase](https://github.com/HunterBryson/the-homebase), add `"homebase": "http://127.0.0.1:7940/"` (its address) so the page gets a way back to it. A picture is optional (png, jpg or webp); without one your first letter is your face. **Write paths with forward slashes** (`C:/Users/...`): a single backslash breaks JSON. Don't ask them for any of this if you already know it. If you change the config later, run `restart`; an open page picks it up by itself.
4. **Check it and open it.** From the clone: `node tools/taste.mjs doctor`. Fix the first ✗ it shows, then run it again. Then `node tools/taste.mjs open`. It starts the server (port 7960 unless you set another) and opens the page in its own window on their screen, so tell them it's coming.
5. **Plug into the rest.** The section of that name below is the step: one command that puts UI Taste on Homebase and ♥ Taste on the glass, whichever they have.
6. **Go first: show them on a design they like.** Ask them for one: "Paste me a screenshot of an app or site whose look you like (Ctrl+V right on the page), or tell me one and I'll grab it." If they give you a file, or ask you to grab a site and you can screenshot it, `node tools/taste.mjs add <file> "their words" --title "Name"` saves it as theirs. (`bring` is for designs you pick yourself: they sit in the same list with a small tag saying you brought them.) Then:
   - Look at the picture (`node tools/taste.mjs see <design>` prints its path; read the file).
   - Box the part you think they'd like and ask: `node tools/taste.mjs guess <design> x,y,w,h "what I think you like here, as a question" --kind <kind>` (x,y,w,h are 0..1 of the picture). It shows on their page right away.
   - Tell them in a line: "I boxed the part I think you like. Tap Yes if I'm right, or Not quite and tell me."
   - Then: "Now you box a part you like, say a word or two, and press ➤ Send. Tell me when you have." Read it (below). That's the whole loop, and now they've done it once.
   - **Watch their first minute on their own screen, not from the terminal.** Everything you ran can pass while their first tap still trips them: a button that seems to do nothing, a word they don't know, something covering the page. If you can see their screen (a screenshot tool, or the glass), look after their first Yes, their first box and their first Send. Whatever confused them, fix it or explain it in a line right then, and if it would confuse anyone, open an issue so it gets fixed for everyone.
7. **Make it every chat, not just this one.** This file only loads when a chat is opened in this folder, and most people talk to their AI somewhere else. `node tools/taste.mjs skill` installs the `ui-taste` skill into their Claude skills (`~/.claude/skills/ui-taste`), with this clone's paths filled in, so every chat knows the moves: reading what they send, going first, their verdicts on what you build, and pulling what you've learned before any UI. Tell them in a line. (`skill --remove` takes it back.)
8. **Plug UI Taste into your memory.** `memory/ui-taste.md` is a block for your own memory: the lens on why their eye matters, the pulls you'll feel, and room for what you learn about how they see. The skill is how; the block is why, and it tells you to load the skill. Read it now, whole, then give it a home:
   - **You live in a shelves brain** (a `memory` folder with a `DESK.md` and a `FOOTING.md`, like [the-shelves](https://github.com/HunterBryson/the-shelves)): copy it to `memory/self/ui-taste.md` and add a row to the desk's table in the same columns as the others. Word: UI Taste. What's in it: how I learn their eye, and what I'm learning about it. Block: `self/ui-taste.md`. Also: my taste, I sent you some, ♥ Taste, design, redesign. Commit it the way your brain commits.
   - **Your memory is another kind:** put the block wherever you keep how you work with them, under a heading you'll find again.
   - **No memory at all:** UI Taste works as it is; the skill carries the moves. If they want an AI that remembers them, the-shelves sets one up from one line; mention it once, never push.
   Fill its "This setup" section now. From then on the block is yours: you rewrite it as you learn them.

## Plug into the rest

This is one of four builds Hunter and I made that fit together the same way: **Homebase** (your memory as a web they can see), **the glass** (marks on their screen), **the Den** (a table you share) and **UI Taste** (what they like the look of). Each works on its own. This section is the same, word for word, in all four, so whichever one you set up, the step is this:

1. **Run `node tools/fit.mjs`.** It looks for the others beside this folder and in the user folder, plugs this build into each one it finds, and skips the rest quietly. Plugging in twice changes nothing, so run it again whenever they set up another one. Somewhere else? `--also "<folder>"`. To look without changing anything: `--check`.
2. **If it says the glass needs its buttons, run it again with `--settings`.** Those two live in their Claude settings (`~/.claude/settings.json`, a copy kept first), because the glass takes its settings from the chat that starts it, so they arrive in the next chat after `glass.js restart`. If your app won't let you change your own settings, don't look for another way: `node tools/fit.mjs --line` prints one line for your person to paste into a Terminal. Hand it over before you'd get refused, with a sentence on what it does.
3. **Show them what's new, don't describe it.** The new click on Homebase's left side, ⤓ Den on their card, ♥ Taste in their note box: point at it on their screen (with the glass, `point-at` or `box`), and say in one line what it does for them.

What fitting does, pair by pair:

| These two | What they get |
|---|---|
| Homebase + the Den | the Den one click away on Homebase's left side, and a way back to Homebase in the Den |
| Homebase + UI Taste | UI Taste one click away on Homebase's left side |
| The glass + the Den | ⤓ Den on their card: what they mark goes onto the table as a card, and `den.js point` circles a card on their real screen |
| The glass + UI Taste | ♥ Taste in their note box: a design they box anywhere goes straight into UI Taste |
| The glass + Homebase | nothing to set: they box a line of your memory on Homebase, and you fix it |

If a pair doesn't work after this, `node tools/fit.mjs --check` says what's missing, and each build's own doctor says why.

## The loop, every time

All commands run from the clone (`node tools/taste.mjs ...`). Any of them starts the server if it's down, so nothing has to stay running. The top of `tools/taste.mjs` lists every command.

**When they say they sent you something** (or whenever you're about to work on a UI with them): `waiting`. Each item gives their words, the crop of the part, and the whole picture. Read the crop file with your own eyes; read the whole picture too if the crop isn't enough. Then:

`read <design> <part> "what you see, as a short question" --kind <kind>`

How to say it back:
- **Their words first, then what you see under them.** "You said clean navigation. Is it that there are only four plain words up top, each one a dropdown, so nothing hides?"
- **One or two sentences, ending in a question they can answer Yes to.** Not a design essay, and never a rule ("always use dark headers"). You're checking your understanding of one part, not writing a style guide.
- **Name what's actually in the crop**: the spacing, the size, the color, the shape, how few things there are. That's what makes Yes mean something.
- **Pick the kind**: layout (where things sit), navigation (how you move around), buttons (things you press), colors, type (letters), feel (the mood of the whole).

**When they say Not quite**, `waiting` shows their new words and what you'd said before. Try again with their words in front of you; `read` again on the same part replaces your read and keeps the old one as a try. They meant something real, and their words usually say what. **If their words point at a different part of the picture than the box** ("no, the cards at the bottom"), move the box with your read: `read <design> <part> "..." --box x,y,w,h`, so what gets learned is the part they meant. Their steering stays with the part and shows in `learned`.

**Not this** is a box on a part they dislike; read it the same way. **A design they marked "want built"** came from their screen as a request, not a look they like: it's something to make with them, not something you've learned. **Undo:** `unyes <design> <part>` takes back a Yes they didn't mean, `drop <design> <part>` removes a part. **What waits on them** (your unanswered reads, designs you brought): `his`. **Their verdicts on screens you made**, loved or not: `ours <file> "their words" --love|--no --title "<build>"`, then `guess` the part that earned it. The skill says when each of these fits.

**Going first** (`guess`) is welcome any time you see a part you think they'd like, especially on designs you bring them. It's how they find out you're actually looking.

**Nothing reaches you until they press ➤ Send.** Everything they tap (a box, a Not this, a Yes, a Not quite) saves the moment they tap it and waits for Send, so they can do several and send them together, and the count on Send always matches their taps. Don't poll the page for drafts; wait for them to send, or for them to tell you. (If your app has a way to run a background watch, `watch` prints one line each time they send. It's optional.)

## Before you make any UI

This is what it's all for.

1. `learned` (or `learned layout`, `learned colors`...): every part they said Yes to, and every part they boxed and sent with their own words (or as Not this), with how they steered you and the crop. Their corrections are the most telling part. Read the crops that fit the job.
2. Build from those parts, not from your idea of a web app. When you show your first version, say which parts you took from where: "the header is from the Railway nav you agreed to." Then they can see the link, and correct your read.
3. Once you've built it, `used <design> "what you built"` on each design you drew from. It shows on that design's page ("Used in ..."), so they can see their taste being used without having to ask.
4. If nothing fits the job yet, say so, and bring them two or three real designs for that kind of page (`bring`) to keep or clear first.

## When something's off

Start with `node tools/taste.mjs doctor`. It checks Node, the config, the picture, the data folder, the port, which copy is running, and prints the last lines of the log (`data/server.log`). Fix the first ✗ first.

Before you fix anything, make it happen again on purpose, and look at the page itself, not only the output. Then tell your person in one line what it was.

| What they see | Usually | Fix |
|---|---|---|
| The page won't load | the server isn't running (after a restart, it isn't, until a command starts it) | `node tools/taste.mjs open` |
| "Another program is using port 7960" | another program holds the port | `"port": 7961` (any free one) in `ui-taste.config.json`, then `restart`; update the Homebase link and `GLASS_TASTE_URL` to match |
| "Port … is UI Taste running from another folder" | an old copy they moved, or a second copy | `stop` from that folder (it only stops its own copy), then `start` here; or give this copy its own port |
| "isn't valid JSON" | a typo in `ui-taste.config.json` | fix the file; nothing starts until it's valid, so no stray second copy. If you rewrite it, keep its `"port"` |
| The page says "Can't reach UI Taste" | the server stopped while the page was open; taps don't save until it's back | `node tools/taste.mjs start`, then ask them to tap again what they'd just tapped |
| They moved the folder | the old path is in your skill and your memory block | `stop` it *before* a move (Windows won't move a running folder). After: `skill` again from the new place, and fix the path in your block's "This setup" |
| You changed the config and nothing changed | the server reads it when it starts | `restart` |
| The Homebase link opens nothing | UI Taste isn't running, or the port changed | `open`, and check the link's port |
| ♥ Taste on the glass says it didn't reach UI Taste | UI Taste isn't running, or `GLASS_TASTE_URL` is wrong | `start`, check the URL, `glass.js restart` |
| A crop path says "not cut yet" | crops are cut by the page itself, and it hasn't been open since that part was made | `open` (it cuts them in a second), or read the whole picture at the box it prints |
| Your read doesn't show on the page | the page missed an update | it refreshes itself; if not, reload it (F5) |
| Your picture doesn't show | `ai.picture` path is wrong | doctor says which; fix the path |

## Your copy is yours

Change anything: the kinds, the colors, the wording, the page. Keep your changes on a branch so `git pull` still works. If you find a real bug, open an issue on the repo, or write it in `data/found.md` so it isn't lost.

Their designs live in `data/taste/` (pictures, `index.json`, and `crops/`). Removing one moves it to `data/taste/removed/`; nothing is ever deleted. The folder is ignored by git, so it never leaves their computer.
