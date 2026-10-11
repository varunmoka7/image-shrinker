import { expect, test } from 'claude-code/testing'
import type { On } from 'claude-code'

const OK = { exitCode: 0, stderr: '', signal: null, timedOut: false }
const START = { cwd: '/', surface: 'terminal', isInteractive: true } as const

// Stands for sips and the Read tool: the [width, height] by path, what ran, and which path the tool was given.
const host = (on: On, sizes: Record<string, [number, number]>, resizeFails = false, noSips = false) => {
  const ran: string[][] = []
  const read: string[] = []
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('process.run', (_, e) => {
    ran.push([...e.argv])
    if (noSips && e.argv[0] === 'sips') throw new Error('sips: command not found')
    if (e.argv[0] === 'sips' && e.argv[1] === '-g') {
      const path = e.argv[5]!
      const s = sizes[path]
      return { value: s === undefined ? { ...OK, exitCode: 1, stdout: '' } : { ...OK, stdout: `${path}\n  pixelWidth: ${s[0]}\n  pixelHeight: ${s[1]}\n` } }
    }
    if (e.argv[0] === 'sips') return { value: { ...OK, exitCode: resizeFails ? 1 : 0, stdout: '' } }

    return { value: { ...OK, stdout: '' } }
  })
  on('tool.call', { tool: 'Read' }, (_, e) => {
    read.push(e.file_path)
    return { result: {} } as never
  })

  return { ran, read }
}

type Engine = Parameters<Parameters<typeof test>[1]>[0]
const readImage = ($: Engine, file_path: string, extra = {}) => $.tool.call({ tool: 'Read', file_path, ...extra } as never) as Promise<any>
// Drops the 8-digit hash that starts every copy name.
const unhash = (p: string) => p.replace(/(claude-shrunk\/)[0-9a-f]{8}/, '$1')
// The -z height width arguments of the resize, if one ran.
const resized = (ran: string[][]) => ran.find(a => a[1] === '-z')?.slice(2, 4)

test('reads a copy of a wide image and tells the model the scale', async ($, on) => {
  const seen = host(on, { '/p/s.png': [2400, 1500] })
  await $.session.start(START)

  const out = await readImage($, '/p/s.png')
  expect(seen.read.map(unhash)).toEqual(['/tmp/claude-shrunk/_p_s.png'])
  expect(resized(seen.ran)).toEqual(['750', '1200'])
  expect(out.context.join(' ')).toContain('2.00')
  expect(out.context.join(' ')).toContain('offset: 1')
})

test('an image within both caps, a non-image and an unreadable file are read as they are', async ($, on) => {
  const seen = host(on, { '/p/small.png': [1200, 1568] })
  await $.session.start(START)

  await readImage($, '/p/small.png')
  await readImage($, '/p/notes.md')
  await readImage($, '/p/missing.png')
  expect(seen.read).toEqual(['/p/small.png', '/p/notes.md', '/p/missing.png'])
})

test('when the resize fails the original is read', async ($, on) => {
  const seen = host(on, { '/p/s.png': [2400, 1500] }, true)
  await $.session.start(START)

  await readImage($, '/p/s.png')
  expect(seen.read).toEqual(['/p/s.png'])
})

test('a tall image is capped by height, keeping its shape', async ($, on) => {
  const seen = host(on, { '/p/page.png': [1000, 6272] })
  await $.session.start(START)

  const out = await readImage($, '/p/page.png')
  expect(resized(seen.ran)).toEqual(['1568', '250'])
  expect(out.context.join(' ')).toContain('4.00')
})

test('an offset reads the original, however large', async ($, on) => {
  const seen = host(on, { '/p/s.png': [2400, 1500] })
  await $.session.start(START)

  await readImage($, '/p/s.png', { offset: 1 })
  expect(seen.read).toEqual(['/p/s.png'])
  expect(seen.ran).toEqual([])
})

test('webp is shrunk and heic is converted to png even when small', async ($, on) => {
  const seen = host(on, { '/p/w.webp': [2400, 1500], '/p/h.heic': [600, 400] })
  await $.session.start(START)

  await readImage($, '/p/w.webp')
  const out = await readImage($, '/p/h.heic')
  expect(seen.read.map(unhash)).toEqual(['/tmp/claude-shrunk/_p_w.webp.png', '/tmp/claude-shrunk/_p_h.heic.png'])
  expect(seen.ran.filter(a => a[1] === '-z').map(a => a.slice(2, 4))).toEqual([['750', '1200'], ['400', '600']])
  expect(out.context ?? []).toEqual([])
})

test('without sips (Linux, Windows) every image is read as it is', async ($, on) => {
  const seen = host(on, { '/p/s.png': [2400, 1500] }, false, true)
  await $.session.start(START)

  await readImage($, '/p/s.png')
  expect(seen.read).toEqual(['/p/s.png'])
})

test('paths that differ only in / versus _ get different copies', async ($, on) => {
  const seen = host(on, { '/a/b_c.png': [2400, 1500], '/a_b/c.png': [2400, 1500] })
  await $.session.start(START)

  await readImage($, '/a/b_c.png')
  await readImage($, '/a_b/c.png')
  expect(new Set(seen.read).size).toBe(2)
})
