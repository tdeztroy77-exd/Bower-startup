/**
 * Pre-builds sample DOCX files for every template and writes them to
 * public/templates/preview/. The page at /dashboard/templates lists
 * downloadable .docx; this folder is the static fallback for users who
 * just want a blank copy without filling in fields.
 *
 * Run with: `npx tsx scripts/prebuild-templates.ts`
 * Or: `npm run templates:prebuild`
 */
import { writeFileSync, mkdirSync, existsSync } from "node:fs"
import { join } from "node:path"
import { listTemplates, renderTemplate } from "../lib/templates/templates"

const OUT_DIR = join(process.cwd(), "public", "templates", "preview")

async function main() {
  if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true })

  // Blank forms only. Never ship sample tenants, addresses or phone numbers in
  // a downloadable file — a "blank" template with someone else's details in it
  // is worse than no template.
  const samples: Record<string, Record<string, string>> = {}
  for (const meta of listTemplates()) {
    try {
      const fields = samples[meta.id] || {}
      const buf = await renderTemplate(meta.id, fields)
      const file = join(OUT_DIR, `${meta.id}.docx`)
      writeFileSync(file, buf)
      console.log(`✓ ${meta.id}.docx (${buf.byteLength} bytes)`)
    } catch (e: any) {
      console.error(`✗ ${meta.id}: ${e.message}`)
    }
  }
  console.log(`\nWrote sample DOCX files to ${OUT_DIR}`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})