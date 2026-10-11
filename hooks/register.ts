import type { EngineInterface, Register } from 'claude-code'

const MAX_WIDTH = 1200
// The API downscales any image whose long edge is over 1568px, which would make the scale note wrong.
const MAX_HEIGHT = 1568
// Where the downscaled copies go; the original is never touched.
const DIR = '/tmp/claude-shrunk'
// sips reads these; anything else (svg, pdf) is passed through.
const IMAGE = /\.(png|jpe?g|gif|tiff?|bmp|webp|heic|heif)$/i
// The API cannot show these, so they are always converted, whatever their size.
const CONVERT = /\.(heic|heif)$/i

// The pixel size of an image, or undefined when sips cannot read it or is missing (sips ships only with macOS).
async function sizeOf($: EngineInterface, path: string) {
  const ran = await $.process.run(['sips', '-g', 'pixelWidth', '-g', 'pixelHeight', path]).catch(() => undefined)
  if (ran === undefined) return undefined
  const width = Number(/pixelWidth:\s*(\d+)/.exec(ran.stdout)?.[1])
  const height = Number(/pixelHeight:\s*(\d+)/.exec(ran.stdout)?.[1])

  return ran.exitCode === 0 && width > 0 && height > 0 ? { width, height } : undefined
}

// FNV-1a, 8 hex digits: enough to tell paths apart, no crypto needed.
function hash(text: string) {
  let h = 0x811c9dc5
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 0x01000193)

  return (h >>> 0).toString(16).padStart(8, '0')
}

// Makes the smaller copy. Undefined means "read the original": no sips, not shrinkable, or anything went wrong.
async function shrink($: EngineInterface, path: string) {
  const size = await sizeOf($, path)
  if (size === undefined) return undefined
  const scale = Math.min(MAX_WIDTH / size.width, MAX_HEIGHT / size.height, 1)
  if (scale === 1 && !CONVERT.test(path)) return undefined

  // One copy per source path, rewritten every time: a loop that overwrites s.png gets a fresh frame each read.
  // The hash keeps /a/b_c.png and /a_b/c.png apart, which the readable part alone would not.
  const name = `${hash(path)}${path.replace(/[^A-Za-z0-9.]+/g, '_')}`
  const copy = `${DIR}/${/\.png$/i.test(name) ? name : `${name}.png`}`
  const width = Math.round(size.width * scale)
  const height = Math.round(size.height * scale)
  await $.process.run(['mkdir', '-p', DIR])
  const made = await $.process.run(['sips', '-z', String(height), String(width), path, '-s', 'format', 'png', '--out', copy])

  return made.exitCode === 0 ? { copy, size, scale, width, height } : undefined
}

export const register: Register = on => {
  on('tool.call', { tool: 'Read' }, async ($, e, next) => {
    // An offset on an image asks for the original.
    if (!IMAGE.test(e.file_path) || e.offset !== undefined) return next(e)
    const small = await shrink($, e.file_path).catch(() => undefined)
    if (small === undefined) return next(e)
    const { copy, size, scale, width, height } = small

    const ran = await next({ ...e, file_path: copy })
    if (ran.deny !== undefined || scale === 1) return ran

    return {
      ...ran,
      context: [
        ...(ran.context ?? []),
        `image-shrinker: ${e.file_path} is ${size.width}x${size.height}px; this view is ${width}x${height}px. Multiply coordinates read off it by ${(size.width / width).toFixed(2)} for the real page. To see the original, Read it again with offset: 1.`,
      ],
    }
  })
}
