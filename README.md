# image-shrinker

A Claude Code mod that shrinks big images before Claude reads them, and tells Claude how much it shrank them.

## Why you might want it

Every image Claude reads stays in the conversation and is sent again with every later message. A few full-size screenshots can fill Claude's memory for the rest of the session. Shrinking them keeps long sessions going longer.

Example: you ask Claude to test a web page and it takes a screenshot after every click. Without this mod, each 2400 pixel wide frame piles up. With it, Claude sees a 1200 pixel wide copy, and is told "multiply coordinates by 2.00", so its clicks still land in the right place.

## Install

```
claude plugin marketplace add varunmoka7/image-shrinker
claude plugin install image-shrinker@image-shrinker
```

Needs Claude Code 2.1.287 or newer with mods enabled.

**Mac only.** The mod uses `sips`, a tool that ships with macOS. On Linux and Windows it does nothing: Claude reads your images as usual, with no errors.

## How to use

There are no commands. It works on its own whenever Claude reads an image file (png, jpg, gif, tiff, bmp, webp, heic):

- Images up to 1200 pixels wide and 1568 pixels tall are read as they are.
- Larger images are read from a smaller copy, and Claude is told the original size, the new size and the number to multiply by.
- heic and heif photos are always converted to png, because Claude cannot show them otherwise.
- To get the original at full size, ask Claude to read the file with `offset: 1`.

## What it touches

- Network: none.
- Files read: the image Claude is about to read.
- Files written: the smaller copies, in `/tmp/claude-shrunk`. Your original is never changed. Each source file gets one copy, which is replaced on the next read.
- Model calls: none, no cost.
- On by default once installed.

## Turn it off / uninstall

```
claude plugin uninstall image-shrinker@image-shrinker
```

You can delete `/tmp/claude-shrunk` at any time.

## Known limits

- macOS only (see above).
- svg and pdf files are not shrunk.
- If the resize fails for any reason, Claude reads the original.

## License

MIT
