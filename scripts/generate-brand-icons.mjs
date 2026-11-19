/**
 * Render every platform icon and tray bitmap from the repository-owned brand SVG.
 *
 * The macOS `icons:export` path starts from an Icon Composer document and needs Xcode,
 * so Windows and Linux build hosts cannot refresh `app-icon.png`, `app-icon.ico` or the
 * tray bitmaps from it. This script is the cross-platform path: `build/app-icon.svg` is
 * the single source of truth for the product mark, and everything else is derived here.
 */
import { createHash } from 'node:crypto'
import { readdir, readFile, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { join, resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')

/**
 * Channel packages that commit their own `build/` icon set.
 *
 * `tray` names the directory each runtime loads the menu-bar bitmaps from: the beta
 * channel reads `assets/`, the stable channel still reads `build/`.
 */
export const ICON_CHANNELS = Object.freeze({
  stable: { package: 'dsh-plugin-desktop', tray: 'build' },
  beta: { package: 'dsh-plugin-desktop-beta', tray: 'assets' },
})

const APP_ICON_CANVAS = 1024
const MAC_ARTWORK = 824
const MAC_INSET = (APP_ICON_CANVAS - MAC_ARTWORK) / 2
const WINDOWS_FRAME_SIZES = [16, 20, 24, 28, 30, 32, 36, 40, 48, 60, 64, 72, 80, 96, 128, 256]
const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])

/**
 * Monochrome menu-bar silhouette: the app tile with the speech bubble knocked out.
 * Template images carry shape only, so the plane and every gradient are dropped.
 */
const TEMPLATE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <path fill="#000000" fill-rule="evenodd" d="M116 0H396A116 116 0 0 1 512 116V396A116 116 0 0 1 396 512H116A116 116 0 0 1 0 396V116A116 116 0 0 1 116 0ZM174 118H338A78 78 0 0 1 416 196V276A78 78 0 0 1 338 354H174A78 78 0 0 1 96 276V196A78 78 0 0 1 174 118Z"/>
</svg>
`

const requireFromDesktop = createRequire(join(root, 'dsh-plugin-desktop/package.json'))

/** Encode one uncompressed 32-bit Windows DIB frame with its AND transparency mask. */
function encodeDibFrame(rgba, size) {
  const xorBytes = size * size * 4
  const maskRowBytes = Math.ceil(size / 32) * 4
  const maskBytes = maskRowBytes * size
  const dib = Buffer.alloc(40 + xorBytes + maskBytes)

  dib.writeUInt32LE(40, 0)
  dib.writeInt32LE(size, 4)
  dib.writeInt32LE(size * 2, 8)
  dib.writeUInt16LE(1, 12)
  dib.writeUInt16LE(32, 14)
  dib.writeUInt32LE(xorBytes, 20)

  for (let y = 0; y < size; y += 1) {
    const sourceRow = y * size * 4
    const destinationRow = 40 + (size - y - 1) * size * 4
    const destinationMaskRow = 40 + xorBytes + (size - y - 1) * maskRowBytes
    for (let x = 0; x < size; x += 1) {
      const source = sourceRow + x * 4
      const destination = destinationRow + x * 4
      dib[destination] = rgba[source + 2]
      dib[destination + 1] = rgba[source + 1]
      dib[destination + 2] = rgba[source]
      dib[destination + 3] = rgba[source + 3]
      if (rgba[source + 3] === 0) dib[destinationMaskRow + Math.floor(x / 8)] |= 0x80 >> (x % 8)
    }
  }
  return dib
}

/** Wrap ordered image payloads in one Windows ICO directory. */
function encodeIco(frames) {
  const headerSize = 6 + frames.length * 16
  const header = Buffer.alloc(headerSize)
  header.writeUInt16LE(0, 0)
  header.writeUInt16LE(1, 2)
  header.writeUInt16LE(frames.length, 4)

  let dataOffset = headerSize
  for (const [index, frame] of frames.entries()) {
    const entry = 6 + index * 16
    header[entry] = frame.size === 256 ? 0 : frame.size
    header[entry + 1] = frame.size === 256 ? 0 : frame.size
    header.writeUInt16LE(1, entry + 4)
    header.writeUInt16LE(32, entry + 6)
    header.writeUInt32LE(frame.data.length, entry + 8)
    header.writeUInt32LE(dataOffset, entry + 12)
    dataOffset += frame.data.length
  }
  return Buffer.concat([header, ...frames.map(frame => frame.data)])
}

/**
 * Render square pixels from one vector source.
 * @param {import('sharp').Sharp} sharp - the channel's sharp instance.
 * @param {string} vector - SVG markup.
 * @param {number} size - output edge length in pixels.
 * @param {number} [sharpenSigma] - small frames need an unsharp pass after downsampling.
 */
function renderSquare(sharp, vector, size, sharpenSigma) {
  let pipeline = sharp(Buffer.from(vector), { density: Math.max(72, Math.round(72 * (size / 512))) })
    .resize({ width: size, height: size, fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 }, kernel: sharp.kernel.lanczos3 })
    .toColourspace('srgb')
    .ensureAlpha()
  if (sharpenSigma !== undefined) pipeline = pipeline.sharpen({ sigma: sharpenSigma })
  return pipeline
}

/** Render the canonical app icon, the macOS safe-area variant and the Windows ICO. */
async function writeAppIcons(sharp, build, vector) {
  const png = await renderSquare(sharp, vector, APP_ICON_CANVAS)
    .png({ compressionLevel: 9, progressive: false, adaptiveFiltering: false, palette: false })
    .toBuffer()
  await writeFile(join(build, 'app-icon.png'), png)

  const mac = await renderSquare(sharp, vector, MAC_ARTWORK)
    .extend({ top: MAC_INSET, bottom: MAC_INSET, left: MAC_INSET, right: MAC_INSET, background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png({ compressionLevel: 9, progressive: false, adaptiveFiltering: false, palette: false })
    .toBuffer()
  await writeFile(join(build, 'app-icon-mac.png'), mac)

  const frames = await Promise.all(WINDOWS_FRAME_SIZES.map(async size => {
    const pipeline = renderSquare(sharp, vector, size, size <= 96 ? (size <= 32 ? 0.5 : 0.35) : undefined)
    if (size === 256) {
      return { size, data: await pipeline.png({ compressionLevel: 9, palette: false }).toBuffer() }
    }
    const { data } = await pipeline.raw({ depth: 'uchar' }).toBuffer({ resolveWithObject: true })
    return { size, data: encodeDibFrame(data, size) }
  }))
  const last = frames.at(-1)
  if (last === undefined || !last.data.subarray(0, PNG_SIGNATURE.length).equals(PNG_SIGNATURE)) {
    throw new Error('generate-brand-icons: the 256px ICO frame must stay PNG encoded')
  }
  await writeFile(join(build, 'app-icon.ico'), encodeIco(frames))
}

/** Wrap PNG payloads in the modern macOS ICNS container. */
function encodeIcns(frames) {
  const header = Buffer.alloc(8)
  header.write('icns', 0, 'ascii')
  const entries = frames.map(({ type, data }) => {
    const entry = Buffer.alloc(8)
    entry.write(type, 0, 'ascii')
    entry.writeUInt32BE(data.length + 8, 4)
    return Buffer.concat([entry, data])
  })
  const total = Buffer.concat(entries)
  header.writeUInt32BE(total.length + 8, 4)
  return Buffer.concat([header, total])
}

/** Render the macOS bundle icon (PNG-compressed ICNS entries, Retina variants included). */
async function writeMacIcon(sharp, build, vector) {
  const entries = [
    ['ic11', 32],
    ['ic12', 64],
    ['ic07', 128],
    ['ic13', 256],
    ['ic08', 256],
    ['ic14', 512],
    ['ic09', 512],
    ['ic10', 1024],
  ]
  const frames = await Promise.all(entries.map(async ([type, size]) => ({
    type,
    data: await renderSquare(sharp, vector, size, size <= 64 ? 0.4 : undefined)
      .png({ compressionLevel: 9, palette: false })
      .toBuffer(),
  })))
  await writeFile(join(build, 'app-icon.icns'), encodeIcns(frames))
}

/**
 * Re-render every Linux hicolor icon already committed under `build/icons/`.
 * The set differs per channel, so the committed files decide the sizes.
 */
async function writeLinuxIcons(sharp, build, vector) {
  const directory = join(build, 'icons')
  let names
  try {
    names = await readdir(directory)
  } catch {
    return
  }
  for (const name of names) {
    const match = /^(\d+)(?:x\d+)?\.png$/.exec(name)
    if (match === null) continue
    const size = Number(match[1])
    if (!Number.isInteger(size) || size < 8 || size > 1024) continue
    const bytes = await renderSquare(sharp, vector, size, size <= 64 ? 0.4 : undefined)
      .png({ compressionLevel: 9, palette: false })
      .toBuffer()
    await writeFile(join(directory, name), bytes)
  }
}

/** Write the tray bitmaps the runtime loads from its channel directory (and the legacy `build/` copy). */
async function writeTrayIcons(sharp, build, tray, vector, template) {
  const coloured = [['tray-icon-blue.png', 16], ['tray-icon-blue@1.25x.png', 20], ['tray-icon-blue@1.5x.png', 24], ['tray-icon-blue@2x.png', 32]]
  const monochrome = [['tray-iconTemplate.png', 16], ['tray-iconTemplate@2x.png', 32]]

  const render = async (source, size) => renderSquare(sharp, source, size, size <= 32 ? 0.35 : undefined)
    .png({ compressionLevel: 9, palette: false })
    .toBuffer()

  for (const [name, size] of coloured) {
    const bytes = await render(vector, size)
    await writeFile(join(tray, name), bytes)
    if (tray !== build) await writeFile(join(build, name), bytes)
  }
  for (const [name, size] of monochrome) {
    const bytes = await render(template, size)
    await writeFile(join(tray, name), bytes)
    if (tray !== build) await writeFile(join(build, name), bytes)
  }
}

/** Keep `app-icon.resources.json` output hashes in step with the files just written. */
async function refreshResourceRecord(build) {
  const path = join(build, 'app-icon.resources.json')
  const record = JSON.parse(await readFile(path, 'utf8'))
  const outputs = {}
  for (const name of Object.keys(record.outputs ?? {})) {
    outputs[name] = createHash('sha256').update(await readFile(join(build, name))).digest('hex')
  }
  await writeFile(path, `${JSON.stringify({ ...record, outputs }, null, 2)}\n`)
}

/**
 * Regenerate one channel's icon set from its committed brand SVG.
 * @param {string} channel - key of {@link ICON_CHANNELS}.
 */
export async function generateBrandIcons(channel) {
  const definition = ICON_CHANNELS[channel]
  if (definition === undefined) throw new Error(`generate-brand-icons: unknown channel ${channel}`)
  const packageRoot = join(root, definition.package)
  const sharp = requireFromDesktop('sharp')
  const build = join(packageRoot, 'build')
  const tray = join(packageRoot, definition.tray)
  const vector = await readFile(join(build, 'app-icon.svg'), 'utf8')

  await writeAppIcons(sharp, build, vector)
  await writeMacIcon(sharp, build, vector)
  await writeLinuxIcons(sharp, build, vector)
  await writeTrayIcons(sharp, build, tray, vector, TEMPLATE_SVG)
  await refreshResourceRecord(build)
  console.log(`icons: ${channel} rendered the app icon, macOS bundle artwork and tray bitmaps from build/app-icon.svg`)
}

if (process.argv[1] !== undefined && resolve(process.argv[1]) === import.meta.filename) {
  const requested = process.argv.includes('--channel') ? process.argv[process.argv.indexOf('--channel') + 1] : 'all'
  const channels = requested === 'all' ? Object.keys(ICON_CHANNELS) : [requested]
  for (const channel of channels) await generateBrandIcons(channel)
}