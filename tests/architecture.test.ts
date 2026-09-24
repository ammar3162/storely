import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

/**
 * حماية الفصل بين الواجهة والباك اند: صفحات ومكونات المتصفح ما تستعلم قاعدة البيانات مباشرة.
 * لو فشل هذا الاختبار — انقل الاستعلام لـ API route واستخدم api-client (شوف AGENTS.md).
 */
const root = path.resolve(__dirname, '..')

function walk(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(e => {
    const p = path.join(dir, e.name)
    if (e.isDirectory()) return p.includes(`${path.sep}api${path.sep}`) || p.endsWith(`${path.sep}api`) ? [] : walk(p)
    return /\.(tsx?|jsx?)$/.test(e.name) && !/\.test\./.test(e.name) ? [p] : []
  })
}

// استثناءات موثّقة فقط
const ALLOWED: Record<string, string> = {
  // تسجيل مورد بدون جلسة (لو تأكيد البريد مفعّل) — ما فيه هوية نرسلها للـ API
  'src/app/supplier-portal/page.tsx': "sb.from('supplier_profiles' as any).insert",
}

describe('frontend never queries the database directly', () => {
  const clientFiles = [...walk(path.join(root, 'src/app')), ...walk(path.join(root, 'src/components'))]
    .filter(f => fs.readFileSync(f, 'utf8').includes("'use client'"))

  it('finds the client files', () => {
    expect(clientFiles.length).toBeGreaterThan(50)
  })

  it('has no .from(table) calls outside the documented exceptions', () => {
    const offenders: string[] = []
    for (const file of clientFiles) {
      const rel = path.relative(root, file)
      fs.readFileSync(file, 'utf8').split('\n').forEach((line, i) => {
        if (!/\.from\(\s*['"`]/.test(line)) return
        if (/storage\s*\.from\(|Array\.from\(/.test(line)) return
        if (ALLOWED[rel] && line.includes(ALLOWED[rel])) return
        offenders.push(`${rel}:${i + 1}  ${line.trim().slice(0, 100)}`)
      })
    }
    expect(offenders, 'استعلام مباشر لقاعدة البيانات من الواجهة — انقله لـ API route').toEqual([])
  })

  it('does not use the service role key in browser code', () => {
    const leaks = clientFiles.filter(f => fs.readFileSync(f, 'utf8').includes('SUPABASE_SERVICE_ROLE_KEY')).map(f => path.relative(root, f))
    expect(leaks).toEqual([])
  })
})
