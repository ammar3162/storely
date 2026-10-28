import { describe, it, expect } from 'vitest'
import { classifyItems, applyAnswer, draftStatus, aliasKey } from './invoiceAgent'

const products = [
  { id: 'milk', name: 'حليب المراعي', unit: 'لتر' },
  { id: 'cup12', name: 'كوب ورقي 12 اونز', unit: 'كرتون' },
  { id: 'cup8', name: 'كوب ورقي 8 اونز', unit: 'كرتون' },
  { id: 'sugar', name: 'سكر', unit: 'كيلو' },
]

describe('invoice agent', () => {
  it('matches clear items, asks about unclear ones, and never guesses between two close products', () => {
    const r = classifyItems([
      { name: 'سكر', qty: 5, total: 50 },
      { name: 'كوب ورقي', qty: 2, total: 80 },          // 12 أو 8؟
      { name: 'زعفران', qty: 1, total: 30 },            // مو موجود
    ], products, {})
    expect(r[0]).toMatchObject({ status: 'matched', product_id: 'sugar' })
    expect(r[1]).toMatchObject({ status: 'ask', question: 'which_product', product_id: null })
    expect(r[1].candidates.map(c => c.id).sort()).toEqual(['cup12', 'cup8'])
    expect(r[2]).toMatchObject({ status: 'ask', question: 'which_product', candidates: [] })
    expect(draftStatus(r)).toBe('needs_review')
  })

  it('uses what it learned from earlier answers', () => {
    const r = classifyItems([{ name: 'حليب كامل الدسم 2L', qty: 6, total: 60 }], products, { [aliasKey('حليب كامل الدسم 2L')]: 'milk' })
    expect(r[0]).toMatchObject({ status: 'matched', product_id: 'milk', learned: true })
  })

  it('asks for a missing price or quantity even when the product is clear', () => {
    const r = classifyItems([{ name: 'سكر', qty: 5, total: null }, { name: 'سكر', qty: null, total: 20 }], products, {})
    expect(r.map(x => x.question)).toEqual(['missing_price', 'missing_qty'])
  })

  it('answers settle the item, and the draft becomes ready', () => {
    let [it] = classifyItems([{ name: 'كوب ورقي', qty: 2, total: null }], products, {})
    it = applyAnswer(it, { action: 'match', product_id: 'cup12', product_name: 'كوب ورقي 12 اونز' })
    expect(it).toMatchObject({ status: 'ask', question: 'missing_price', product_id: 'cup12' })
    it = applyAnswer(it, { action: 'set', total: 80 })
    expect(it).toMatchObject({ status: 'matched', question: null })
    expect(draftStatus([it])).toBe('ready')

    let [nw] = classifyItems([{ name: 'زعفران', qty: 1, total: 30 }], products, {})
    nw = applyAnswer(nw, { action: 'new' })
    expect(nw).toMatchObject({ status: 'new', product_id: null })
    const skipped = applyAnswer(nw, { action: 'skip' })
    expect(skipped.status).toBe('skip')
    expect(draftStatus([skipped])).toBe('needs_review')   // ما فيه شي ينسجّل
  })
  it('an expense (not inventory) only needs a price', () => {
    let [it] = classifyItems([{ name: 'منظف أرضيات', qty: null, total: 25 }], products, {})
    it = applyAnswer(it, { action: 'expense' })
    expect(it).toMatchObject({ status: 'expense', question: null })
    expect(draftStatus([it])).toBe('ready')
  })
})
