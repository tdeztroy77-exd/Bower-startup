/**
 * Mobile audit helper (dev only, not part of the app).
 * Uses the DevTools protocol to emulate a real phone viewport, measure
 * horizontal overflow, list offending elements and capture a screenshot.
 *
 * Usage: node scripts/mobile-audit.mjs <url> <outfile> [width]
 */
import { spawn } from "node:child_process"
import { writeFileSync } from "node:fs"
import { setTimeout as sleep } from "node:timers/promises"
import WebSocket from "ws"

const url = process.argv[2]
const out = process.argv[3]
const width = Number(process.argv[4] || 390)
const height = 844
const port = 9333 + Math.floor(Math.random() * 200)
const edge = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe"

const child = spawn(
  edge,
  [
    "--headless=new",
    "--disable-gpu",
    "--hide-scrollbars",
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${process.env.TEMP}\\edge-cdp-${port}`,
    "about:blank",
  ],
  { stdio: "ignore" },
)

async function getTarget() {
  for (let i = 0; i < 60; i += 1) {
    try {
      const list = await fetch(`http://127.0.0.1:${port}/json/list`).then((r) => r.json())
      const page = list.find((t) => t.type === "page")
      if (page) return page
    } catch {
      /* not ready */
    }
    await sleep(250)
  }
  throw new Error("DevTools did not start")
}

const target = await getTarget()
const ws = new WebSocket(target.webSocketDebuggerUrl)
let id = 0
const pending = new Map()

ws.on("message", (raw) => {
  const message = JSON.parse(raw.toString())
  if (message.id && pending.has(message.id)) {
    pending.get(message.id)(message)
    pending.delete(message.id)
  }
})

await new Promise((resolve) => ws.on("open", resolve))

function send(method, params = {}) {
  id += 1
  const messageId = id
  return new Promise((resolve, reject) => {
    pending.set(messageId, (message) => {
      if (message.error) reject(new Error(message.error.message))
      else resolve(message.result)
    })
    ws.send(JSON.stringify({ id: messageId, method, params }))
  })
}

await send("Page.enable")
await send("Runtime.enable")
await send("Emulation.setDeviceMetricsOverride", {
  width,
  height,
  deviceScaleFactor: 2,
  mobile: true,
})
await send("Emulation.setTouchEmulationEnabled", { enabled: true })
await send("Page.navigate", { url })
await sleep(2500)

const measure = await send("Runtime.evaluate", {
  expression: `(() => {
    const vw = window.innerWidth;
    const offenders = [...document.querySelectorAll('*')]
      .map(el => {
        const r = el.getBoundingClientRect();
        return { tag: el.tagName, cls: (el.className || '').toString().slice(0, 70), right: Math.round(r.right), w: Math.round(r.width) };
      })
      .filter(o => o.right > vw + 1 || o.w > vw + 1)
      .slice(0, 12);
    return JSON.stringify({ vw, scrollWidth: document.documentElement.scrollWidth, offenders });
  })()`,
  returnByValue: true,
})

const shot = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false })
writeFileSync(out, Buffer.from(shot.data, "base64"))

console.log(url)
console.log(measure.result.value)
ws.close()
child.kill()
