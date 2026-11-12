/**
 * Screenshot helper (dev only).
 * Usage: node scripts/capture.mjs <url> <out> [width] [height] [hoverText] [full]
 */
import { spawn } from "node:child_process"
import { writeFileSync } from "node:fs"
import { setTimeout as sleep } from "node:timers/promises"
import WebSocket from "ws"

const url = process.argv[2]
const out = process.argv[3]
const width = Number(process.argv[4] || 1440)
const height = Number(process.argv[5] || 1000)
const hoverText = process.argv[6] || ""
const full = process.argv[7] === "full"
const mobile = width < 700
const port = 9600 + Math.floor(Math.random() * 300)
const edge = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe"

const child = spawn(
  edge,
  [
    "--headless=new",
    "--disable-gpu",
    "--hide-scrollbars",
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${process.env.TEMP}\\edge-shot-${port}`,
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
  deviceScaleFactor: 1,
  mobile,
})
if (mobile) await send("Emulation.setTouchEmulationEnabled", { enabled: true })
await send("Page.navigate", { url })
await sleep(2500)
await send("Runtime.evaluate", { expression: "localStorage.setItem('bower_cookie_consent_v2', 'accepted')" })
await send("Page.reload")
await sleep(2500)

if (hoverText) {
  const state = await send("Runtime.evaluate", {
    expression: `(() => {
      const el = [...document.querySelectorAll('a,button')].find(n => n.textContent.trim().startsWith(${JSON.stringify(hoverText)}));
      if (!el) return JSON.stringify({ found: false });
      el.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
      el.dispatchEvent(new MouseEvent('mousemove', { bubbles: true }));
      return JSON.stringify({ found: true });
    })()`,
    returnByValue: true,
  });
  await sleep(900);
  const panel = await send("Runtime.evaluate", {
    expression: `(() => {
      const trigger = document.querySelector('[aria-haspopup="true"][aria-expanded="true"]');
      const menu = document.querySelector('.bower-fade');
      return JSON.stringify({ expanded: !!trigger, menu: !!menu, text: menu?.innerText?.slice(0, 120) || null });
    })()`,
    returnByValue: true,
  });
  console.log(state.result.value, panel.result.value);
}

let shot
if (full) {
  const heightValue = await send("Runtime.evaluate", {
    expression: "Math.min(document.documentElement.scrollHeight, 12000)",
    returnByValue: true,
  })
  await send("Emulation.setDeviceMetricsOverride", {
    width,
    height: Math.round(heightValue.result.value),
    deviceScaleFactor: 1,
    mobile,
  })
  await sleep(600)
  shot = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false })
} else {
  shot = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false })
}

writeFileSync(out, Buffer.from(shot.data, "base64"))
console.log(`${url} -> ${out} (${width}x${full ? "full" : height})`)
ws.close()
child.kill()
