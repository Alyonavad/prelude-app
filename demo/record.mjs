// Records demo.html frame by frame with Playwright (a fixed clock, so every run is identical).
// usage:
//   node demo/record.mjs stills <out dir> <ms> [<ms> ...]   one PNG per moment of the loop
//   node demo/record.mjs frames <out dir> [fps]             every frame of one loop, f00000.png …
// Needs playwright-core (PLAYWRIGHT=<path to the package> if it isn't installed here) and
// Google Chrome; set CHROME=<path to the executable> if Chrome lives somewhere else.
import { mkdirSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

const { chromium } = await import(process.env.PLAYWRIGHT || 'playwright-core')
const [mode, outDir, ...rest] = process.argv.slice(2)
mkdirSync(outDir, { recursive: true })

const browser = await chromium.launch({
  executablePath: process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
})
const page = await browser.newPage({ viewport: { width: 1080, height: 1080 }, deviceScaleFactor: 1 })
await page.goto(`${pathToFileURL(resolve('demo.html')).href}?capture`)
await page.evaluate(() => window.demo.ready)
const TOTAL = await page.evaluate(() => window.demo.TOTAL)

// one silent pass first, so fonts and photos are decoded; the recorded loop is the second one
for (let ms = 0; ms < TOTAL; ms += 50) await page.evaluate((m) => window.demo.seek(m), ms)

const shoot = async (ms, file) => {
  await page.evaluate((m) => window.demo.seek(m), TOTAL + ms)
  await page.screenshot({ path: join(outDir, file) })
}

if (mode === 'stills') {
  for (const ms of rest.map(Number).sort((a, b) => a - b)) await shoot(ms, `t${String(ms).padStart(5, '0')}.png`)
} else {
  const fps = Number(rest[0] || 60)
  const n = Math.round((TOTAL / 1000) * fps)
  for (let i = 0; i < n; i++) {
    await shoot((i * 1000) / fps, `f${String(i).padStart(5, '0')}.png`)
    if (i % 60 === 0) process.stdout.write(`${i}/${n} `)
  }
  console.log(`${n}/${n}`)
}
await browser.close()
