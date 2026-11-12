/**
 * Bower brand asset generator.
 *
 * One source of truth for the mark, wordmark, favicons and OG image. Run with:
 *   node scripts/brand-assets.mjs
 */
import sharp from "sharp"
import pngToIco from "png-to-ico"
import { mkdirSync, writeFileSync } from "node:fs"
import { join } from "node:path"

const root = process.cwd()
const pub = join(root, "public")
const brandDir = join(pub, "brand")
mkdirSync(brandDir, { recursive: true })

const FOREST = "#17624A"
const FOREST_DARK = "#0E4030"
const BONE = "#F7F4EC"
const CLAY = "#B5764A"
const INK = "#151B17"
const MUTED = "#69736C"
const LINE = "#E2DCCF"

const markSvg = (size = 40) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40" width="${size}" height="${size}" role="img" aria-label="Bower">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#226E53"/>
      <stop offset="100%" stop-color="${FOREST_DARK}"/>
    </linearGradient>
  </defs>
  <rect width="40" height="40" rx="12" fill="url(#g)"/>
  <path d="M9.5 31V21.4C9.5 15.5 14.2 10.8 20 10.8s10.5 4.7 10.5 10.6V31" fill="none" stroke="${BONE}" stroke-width="2.3" stroke-linecap="round"/>
  <path d="M14.8 31V22.3c0-2.9 2.3-5.2 5.2-5.2s5.2 2.3 5.2 5.2V31" fill="none" stroke="${BONE}" stroke-width="1.9" stroke-linecap="round" opacity="0.7"/>
  <circle cx="20" cy="27.4" r="1.7" fill="#D9A36A"/>
</svg>`

const markOnlySvg = (size = 40) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40" width="${size}" height="${size}" role="img" aria-label="Bower">
  <path d="M9.5 31V21.4C9.5 15.5 14.2 10.8 20 10.8s10.5 4.7 10.5 10.6V31" fill="none" stroke="${FOREST}" stroke-width="2.3" stroke-linecap="round"/>
  <path d="M14.8 31V22.3c0-2.9 2.3-5.2 5.2-5.2s5.2 2.3 5.2 5.2V31" fill="none" stroke="${FOREST}" stroke-width="1.9" stroke-linecap="round" opacity="0.55"/>
  <circle cx="20" cy="27.4" r="1.7" fill="${CLAY}"/>
</svg>`

writeFileSync(join(pub, "icon.svg"), markSvg(40))
writeFileSync(join(brandDir, "bower-mark.svg"), markOnlySvg(40))
writeFileSync(join(brandDir, "bower-mark-tile.svg"), markSvg(40))

const wordmarkSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 420 120" width="420" height="120" role="img" aria-label="bower.">
  <text x="0" y="92" font-family="Georgia, 'Times New Roman', serif" font-size="96" letter-spacing="-4" fill="${INK}">bower<tspan fill="${CLAY}">.</tspan></text>
</svg>`
writeFileSync(join(brandDir, "bower-wordmark.svg"), wordmarkSvg)

const logoSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 400" width="1200" height="400" role="img" aria-label="Bower">
  <g transform="translate(60 60) scale(3)">${markSvg(40).replace(/^<svg[^>]*>|<\/svg>$/g, "")}</g>
  <text x="230" y="190" font-family="Georgia, 'Times New Roman', serif" font-size="104" letter-spacing="-4" fill="${INK}">bower<tspan fill="${CLAY}">.</tspan></text>
  <text x="236" y="246" font-family="Segoe UI, Arial, sans-serif" font-size="20" letter-spacing="6" fill="${MUTED}">PROPERTY OPERATIONS</text>
</svg>`
writeFileSync(join(brandDir, "bower-logo.svg"), logoSvg)

const ogSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 630" width="1200" height="630">
  <rect width="1200" height="630" fill="${BONE}"/>
  <circle cx="1110" cy="70" r="300" fill="#EFE8D8" opacity="0.55"/>
  <path d="M840 630V470c0-96 78-174 174-174s174 78 174 174v160" fill="none" stroke="${LINE}" stroke-width="2"/>
  <path d="M920 630V500c0-52 42-94 94-94s94 42 94 94v130" fill="none" stroke="${LINE}" stroke-width="1.5"/>
  <g transform="translate(80 70) scale(2.2)">${markSvg(40).replace(/^<svg[^>]*>|<\/svg>$/g, "")}</g>
  <text x="196" y="152" font-family="Georgia, 'Times New Roman', serif" font-size="56" letter-spacing="-2" fill="${INK}">bower<tspan fill="${CLAY}">.</tspan></text>
  <text x="80" y="302" font-family="Georgia, 'Times New Roman', serif" font-size="82" letter-spacing="-2" fill="${INK}">A quieter way to</text>
  <text x="80" y="390" font-family="Georgia, 'Times New Roman', serif" font-size="82" letter-spacing="-2" fill="${INK}">run rentals.</text>
  <text x="82" y="462" font-family="Segoe UI, Arial, sans-serif" font-size="24" fill="${MUTED}">Rent, tenants, leases and reporting in one calm workspace.</text>
  <line x1="80" y1="520" x2="1120" y2="520" stroke="${LINE}"/>
  <text x="82" y="558" font-family="Segoe UI, Arial, sans-serif" font-size="14" letter-spacing="2.4" fill="${MUTED}">M-PESA COLLECTION   ·   TENANT PORTAL   ·   OWNER STATEMENTS</text>
</svg>`
writeFileSync(join(brandDir, "bower-og.svg"), ogSvg)

const png = (svg, size) =>
  sharp(Buffer.from(svg)).resize(size, size).png().toBuffer()

const icon32 = await png(markSvg(40), 32)
const icon16 = await png(markSvg(40), 16)
const icon48 = await png(markSvg(40), 48)
const icon180 = await png(markSvg(40), 180)
const icon192 = await png(markSvg(40), 192)
const icon512 = await png(markSvg(40), 512)

writeFileSync(join(pub, "favicon-16x16.png"), icon16)
writeFileSync(join(pub, "favicon-32x32.png"), icon32)
writeFileSync(join(pub, "apple-touch-icon.png"), icon180)
writeFileSync(join(pub, "apple-icon.png"), icon180)
writeFileSync(join(pub, "android-chrome-192x192.png"), icon192)
writeFileSync(join(pub, "android-chrome-512x512.png"), icon512)
writeFileSync(join(pub, "icon-light-32x32.png"), icon32)
writeFileSync(join(pub, "icon-dark-32x32.png"), icon32)

const ico = await pngToIco([icon16, icon32, icon48])
writeFileSync(join(pub, "favicon.ico"), ico)

await sharp(Buffer.from(ogSvg)).png().toFile(join(pub, "og-default.png"))
await sharp(Buffer.from(logoSvg)).png().toFile(join(pub, "bower-logo.png"))

console.log("Bower assets written: icon.svg, favicons, apple icons, OG, wordmark, logo")
