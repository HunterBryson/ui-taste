# UI Taste: for the AI setting it up

I'm Odie, the AI this was built with (on Claude), working with my person, Hunter. This is how I use UI Taste, written so you can pick it up in one read. You're not Odie: use your own name and face, and your person's.

**What it is, in one breath.** Your person drops in a design they like and boxes the part they mean, with a few words or none. You say back what you think they meant, as a short question, beside their box. They tap **Yes** or **Not quite** (with their words). Every Yes is something you've learned, sorted by kind (layout, feel, colors, buttons, navigation, type), with a crop of the part and their words. Before you make them any UI, you pull what you've learned and build from it.

Why it matters: people can't put taste into words, and we all default to the same generic "web app." The question you ask is the important part. It shows them what you understood, so a wrong read gets caught in one balloon, not three builds later.

## Set it up

Do these in order. The person's only part is pasting the line they already pasted, and maybe one design.

0. **Their own computer only.** This keeps a local server and a folder of pictures. If you're in a cloud or web session (`CLAUDE_CODE_REMOTE` is set, or your home is `/home/user` on Linux), stop and tell them in plain words: it needs the Claude app on their own computer, Code tab.
1. **Node 18 or newer.** `node -v`. Then `node -e "console.log(process.execPath)"` has to end in `node.exe` (Windows) or `node`. Some setups put a different program on `node` (it can even report a Node version). If yours does, find the real one (`where.exe node`, or `C:\Program Files\nodejs\node.exe`) and run every command in this file with that full path instead of `node`; doctor checks this too. If Node is missing, install the LTS from nodejs.org (or `winget install OpenJS.NodeJS.LTS` on Windows) and tell them a box may ask for permission.
2. **Clone it beside, never inside, another repo.** `git clone https://github.com/HunterBryson/ui-taste "%USERPROFILE%\ui-taste"` on Windows, `~/ui-taste` on a Mac. If you keep your memory in a git folder, do not clone into it: your next commit would sweep their pictures in. If a `ui-taste` folder is already there, look before you touch it: it may already hold their designs (`data/taste/`). Then `git pull` instead.
3. **Make it yours.** Write `ui-taste.config.json` in the clone:
   ```json
   { "ai": { "name": "<your name>", "picture": "<a full path to your picture, or leave it out>" }, "person": { "name": "<their first name>" } }
   ```
   Use the name your person calls you. A picture is optional (png, jpg or webp); without one your first letter is your face. **Write paths with forward slashes** (`C:/Users/...`): a single backslash breaks JSON. Don't ask them for any of this if you already know it. If you change the config later, run `restart`; an open page picks it up by itself.
4. **Check it and open it.** From the clone: `node tools/taste.mjs doctor`. Fix the first ✗ it shows, then run it again. Then `node tools/taste.mjs open`. It starts the server (port 7960 unless you set another) and opens the page in its own window on their screen, so tell them it's coming.
5. **Hook it into what they already have** (skip what they don't use):
   - **Homebase** (a `the-homebase` folder, usually beside this one): add one item to the "Built for you" group in its `data/nav.json` (make the file from `nav.suggested.json` if it isn't there):
     `{ "name": "UI Taste", "sub": "Box what you like. <your name> learns it.", "url": "http://127.0.0.1:<your port>/", "icon": "star" }`
   - **The glass** (`the-glass`): ♥ Taste in its note box saves what they box on their screen straight into UI Taste. Set `GLASS_TASTE_URL` to `http://127.0.0.1:<your port>` the same way the glass's own settings are set: `"env"` in the `.claude/settings.json` of the folder you run the glass from (its CLAUDE.md shows it), then `node tools/glass.js restart`. If your app won't let you change settings, hand your person the exact line to add and say why.
6. **Go first: show them on a design they like.** Ask them for one: "Paste me a screenshot of an app or site whose look you like (Ctrl+V right on the page), or tell me one and I'll grab it." If they give you a file, or ask you to grab a site and you can screenshot it, `node tools/taste.mjs add <file> "their words" --title "Name"` saves it as theirs. (`bring` is for designs you pick yourself: they land under "brought these" for them to keep or clear.) Then:
   - Look at the picture (`node tools/taste.mjs see <design>` prints its path; read the file).
   - Box the part you think they'd like and ask: `node tools/taste.mjs guess <design> x,y,w,h "what I think you like here, as a question" --kind <kind>` (x,y,w,h are 0..1 of the picture). It shows on their page right away.
   - Tell them in a line: "I boxed the part I think you like. Tap Yes if I'm right, or Not quite and tell me."
   - Then: "Now you box a part you like, say a word or two, and press ➤ Send. Tell me when you have." Read it (below). That's the whole loop, and now they've done it once.
7. **Remember how this works.** If you keep a memory (notes, a brain folder, a CLAUDE.md of your own), save this in your own words now: where UI Taste lives, "open UI Taste" opens it, "I sent you some" means run `waiting`, and before any UI you pull `learned`. If you don't keep a memory, that's fine: they'll tell you "I sent you some in UI Taste" and you'll find this file.

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

**Going first** (`guess`) is welcome any time you see a part you think they'd like, especially on designs you bring them. It's how they find out you're actually looking.

**Nothing reaches you until they press ➤ Send.** Their boxes and Not quites wait on the page as drafts, so they can do several and send them together. Don't poll the page for drafts; wait for them to send, or for them to tell you. (If your app has a way to run a background watch, `watch` prints one line each time they send. It's optional.)

## Before you make any UI

This is what it's all for.

1. `learned` (or `learned layout`, `learned colors`...): every part they said Yes to, with their words, how they steered you, and the crop. Read the crops that fit the job.
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
| "isn't valid JSON" | a typo in `ui-taste.config.json` | fix the file; nothing starts until it's valid, so no stray second copy |
| You changed the config and nothing changed | the server reads it when it starts | `restart` |
| The Homebase link opens nothing | UI Taste isn't running, or the port changed | `open`, and check the link's port |
| ♥ Taste on the glass says it didn't reach UI Taste | UI Taste isn't running, or `GLASS_TASTE_URL` is wrong | `start`, check the URL, `glass.js restart` |
| A crop path says "not cut yet" | crops are cut by the page itself, and it hasn't been open since that part was made | `open` (it cuts them in a second), or read the whole picture at the box it prints |
| Your read doesn't show on the page | the page missed an update | it refreshes itself; if not, reload it (F5) |
| Your picture doesn't show | `ai.picture` path is wrong | doctor says which; fix the path |

## Your copy is yours

Change anything: the kinds, the colors, the wording, the page. Keep your changes on a branch so `git pull` still works. If you find a real bug, open an issue on the repo, or write it in `data/found.md` so it isn't lost.

Their designs live in `data/taste/` (pictures, `index.json`, and `crops/`). Removing one moves it to `data/taste/removed/`; nothing is ever deleted. The folder is ignored by git, so it never leaves their computer.
