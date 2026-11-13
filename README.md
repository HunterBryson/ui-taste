# UI Taste

A learning loop between you and your AI about what you like in a UI.

It's really hard to get an AI to know what you like when you're making UIs. And it's hard for a person to explain. Sometimes you just can't put it into words. So every build starts from the same generic look, and you fight your way up from there one small fix at a time.

UI Taste is how Odie and I fixed that. It isn't just a folder where you save UIs you like. It's a direct connection to a learning loop with your AI:

1. **You drop in a design you like.** Paste a screenshot, drop a file on the page, or bring it from anywhere.
2. **You box the part you mean** and say a few words about it, as detailed as you want. Or no words, just the box.
3. **Your AI says back what it thinks you meant,** as a short question, right beside your box.
4. **You tap Yes, or Not quite** and steer it some more. It tries again until it gets it.
5. **When you say Yes, your AI has learned it.** The part gets sorted by what it is (layout, feel, colors, buttons, navigation, type), and you can see it in the top bar.

So it's not a shot in the dark. Your AI doesn't just have a pile of pictures. It has each part understood, with your own words about what you liked in it. And when it makes you something new, it starts from those parts, not from its own idea of "an app."

Built with Claude, and it works best with Claude.

## What it looks like

**Your AI can go first.** Here Odie boxed two parts of a trading screen I liked and guessed what I meant. I said Yes to the tiles on the left.

![Two of Odie's guesses on a trading screen: one I agreed with, one waiting on Yes or Not quite](docs/1-guesses.webp)

**When it's off the mark, you steer it.** Sort of. You can even mess with it a little and tell it you mean with your human eyeballs. It'll look again anyway.

![My Not quite on Odie's guess: "No, I mean with my eyeballs fella!"](docs/2-eyeballs.webp)

**Three parts of one design, all agreed.** The navigation, the quiet working space, and the art beside it. Each one is in the top bar now, sorted by what it is.

![A Railway page with three of my boxes, each with Odie's read and "you agreed"](docs/3-railway-v1.webp)

The red panda is Odie. In your copy, your AI uses its own name and face (or its first letter until it has one).

## Set it up

You need the Claude app on your own computer (Windows or Mac), with Claude Code (the Code tab) open in any folder. Paste this:

> Set up UI Taste for me from https://github.com/HunterBryson/ui-taste. Read its CLAUDE.md there first, then follow it. If anything asks for permission along the way, it's fine.

Your AI clones it, sets up its name and picture, opens the page, and shows you how it works on a design you like. There's nothing to install besides Node, and your AI checks that for you.

**Every day after:** say "open UI Taste" to your AI. When you've boxed some parts, press **➤ Send** on the page, then tell your AI "I sent you some in UI Taste." When you're about to make a UI together, say "check my UI Taste first."

If you use [Homebase](https://github.com/HunterBryson/the-homebase), UI Taste shows up in its "Built for you" list. If you use [the glass](https://github.com/HunterBryson/the-glass), you can box something on your screen and tap ♥ Taste to save it straight into UI Taste.

## Where this stands, honestly

This is v1. It's what Odie and I use, and it's already made our UIs better: the first page we built from it took four small rounds instead of a long fight. Your designs stay on your computer. Nothing is sent anywhere.

What I'm hoping for is that one day you can point at any site and your AI just knows what's good in it for you. Every Yes gets it a little closer.

Made by me, Hunter Bryson, and Odie. MIT licensed: your copy is yours to change.
