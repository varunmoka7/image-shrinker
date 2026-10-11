# image-shrinker

A Claude Code mod that shrinks big image files before Claude opens them, and tells Claude how much it shrank them. It only affects image files Claude opens with its Read tool. Screenshots that a browser tool hands straight to Claude are not changed.

## Why you might want it

Every image Claude reads stays in the conversation and is sent again with every later message. A few full-size screenshots can fill Claude's memory for the rest of the session. Shrinking them keeps long sessions going longer.

Example: Claude saves a screenshot of your app to a file after every step and reads each file back. Without this mod, each 2400 pixel wide frame piles up. With it, Claude sees a 1200 pixel wide copy and is told "multiply positions by 2.00" to get back to the original image's pixels. ("Coordinates" are the two numbers, across and down, that say where something is in a picture.) Turning those into clicks on a page depends on the screen: on a Retina screen the image has two pixels for every page pixel, so the number is not a click position by itself.

## Install

Paste these two lines into a terminal (not into Claude):

```
claude plugin marketplace add varunmoka7/image-shrinker
claude plugin install image-shrinker@image-shrinker
```

Needs Claude Code 2.1.287 or newer (mods are on by default from that version).

**Mac only.** The mod uses `sips`, a tool that ships with macOS. On Linux and Windows it does nothing: Claude reads your images as usual, with no errors.

## How to use

There are no commands. It works on its own whenever Claude reads an image file (png, jpg, gif, tiff, bmp, webp, heic):

- Images up to 1200 pixels wide, 1568 pixels tall and about 1.15 million pixels in total are read as they are. Those are the sizes Claude's image reader takes without shrinking again itself, so the number Claude is told stays correct.
- Larger images are read from a smaller copy, and Claude is told the original size, the new size and the number to multiply by to get back to the original image's pixels.
- heic and heif photos are always converted to png, because Claude cannot show them otherwise.
- To skip this mod for one image, tell Claude: "read the original image at full size" (it does this by reading with `offset: 1`). Claude may still shrink very large images itself.

## What it touches

- Network: none.
- Files read: the image Claude is about to read.
- Files written: the smaller copies, in `/tmp/claude-shrunk`. Your original is never changed. Each read gets its own copy, readable only by you, and it is deleted as soon as Claude has read it.
- Model calls: none. The mod adds no cost of its own; Claude itself costs what it normally does.
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
- Permissions are checked on your original file first. The mod shrinks only when your rules allow that file outright. If your rules would deny it or ask you first, the mod steps aside and Claude reads the original in the usual way, so you keep your protection but get no saving.

## License

MIT
