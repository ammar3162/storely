#!/usr/bin/env node
// فحص أداء الصفحات على جوال بطيء وشبكة ضعيفة (Playwright + CDP) — يفشل لو تعدّت صفحة الحدود.
// الحدود: برمجة الصفحة (JS) ≤ 320 كيلو، وما فيه طلب API بنفس الرابط مرتين، وظهور المحتوى (LCP) ≤ الحد المكتوب.
//
// الاستخدام:
//   node scripts/perf-check.mjs                                  # صفحات عامة على staging
//   STATE=owner_state.json node scripts/perf-check.mjs /dashboard /inventory   # صفحات المالك بجلسة محفوظة (storageState من Playwright)
//   BASE=https://www.storely.dev node scripts/perf-check.mjs     # على الإنتاج
// Playwright مو من تبعيات المشروع: يقرأه من PLAYWRIGHT_DIR أو أدوات khaam-motion (~/.cache/khaam-motion/toolkit)
import { createRequire } from 'node:module'
import os from 'node:os'
import path from 'node:path'

const dir = process.env.PLAYWRIGHT_DIR || path.join(os.homedir(), '.cache/khaam-motion/toolkit')
const { chromium } = createRequire(path.join(dir, 'package.json'))('playwright')
const BASE = process.env.BASE || 'https://staging.storely.dev'
const STATE = process.env.STATE || undefined
const paths = process.argv.slice(2).length ? process.argv.slice(2) : ['/', '/login', '/staff']
const BUDGET = { jsKb: 320, lcpMs: Number(process.env.LCP_BUDGET || 7000) }

const b = await chromium.launch()
const rows = []
for (const p of paths) {
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, storageState: STATE })
  const page = await ctx.newPage(), cdp = await ctx.newCDPSession(page)
  await cdp.send('Network.enable')
  await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 150, downloadThroughput: 1.6 * 1024 * 1024 / 8, uploadThroughput: 750 * 1024 / 8 })
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 })
  let js = 0; const urls = {}, api = {}
  cdp.on('Network.responseReceived', e => { urls[e.requestId] = e.response.url })
  cdp.on('Network.loadingFinished', e => {
    const u = urls[e.requestId] || ''
    if (/\.js(\?|$)/.test(u)) js += e.encodedDataLength
    if (u.includes('/api/')) { const k = u.replace(/^https?:\/\/[^/]+/, ''); api[k] = (api[k] || 0) + 1 }
  })
  await page.addInitScript(() => { window.__lcp = 0; new PerformanceObserver(l => { for (const e of l.getEntries()) window.__lcp = e.startTime }).observe({ type: 'largest-contentful-paint', buffered: true }) })
  await page.goto(BASE + p, { waitUntil: 'load', timeout: 120000 })
  await page.waitForLoadState('networkidle', { timeout: 60000 }).catch(() => {})
  const lcp = Math.round(await page.evaluate(() => window.__lcp))
  const dup = Object.entries(api).filter(([, n]) => n > 1).map(([k, n]) => `${k.split('?')[0]}×${n}`)
  const jsKb = Math.round(js / 1024)
  const fails = [jsKb > BUDGET.jsKb && `JS ${jsKb}KB > ${BUDGET.jsKb}KB`, lcp > BUDGET.lcpMs && `LCP ${lcp}ms > ${BUDGET.lcpMs}ms`, dup.length && `طلبات مكررة: ${dup.join(' ')}`].filter(Boolean)
  rows.push({ p, landed: new URL(page.url()).pathname, jsKb, lcp, fails })
  await ctx.close()
}
await b.close()

for (const r of rows) console.log(`${r.fails.length ? 'FAIL' : 'ok  '} ${r.p.padEnd(16)} JS ${String(r.jsKb).padStart(4)}KB  LCP ${String(r.lcp).padStart(5)}ms${r.landed !== r.p ? `  (انتهى عند ${r.landed})` : ''}${r.fails.length ? '  ← ' + r.fails.join('، ') : ''}`)
process.exit(rows.some(r => r.fails.length) ? 1 : 0)
