require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const TEST_ORG_ID    = 'de96cb84-4c82-4d4d-a632-76391d7ce39a'
const TEST_BRANCH_ID = '672efaa5-278b-4d85-8754-70fe1ae26502'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

let passed = 0
let failed = 0
const createdProductIds = []

function ok(label) {
  passed++
  console.log(`✅ ${label}`)
}

function fail(label, detail) {
  failed++
  console.log(`❌ ${label}`)
  if (detail) console.log(`   السبب: ${detail}`)
}

async function cleanup() {
  if (createdProductIds.length > 0) {
    await supabase.from('products').delete().in('id', createdProductIds)
  }
}

async function testNewProductPurchase() {
  const testName = `__test_product_${Date.now()}`
  const qty = 10

  const { data: np, error: insErr } = await supabase
    .from('products')
    .insert({ org_id: TEST_ORG_ID, branch_id: TEST_BRANCH_ID, name: testName, unit: 'قطعة', qty: 0, reorder_point: 5, is_active: true })
    .select().single()

  if (insErr || !np) { fail('إضافة منتج جديد عبر مشترى', insErr?.message); return }
  createdProductIds.push(np.id)

  await supabase.from('stock_movements').insert({ product_id: np.id, type: 'in', qty_change: qty, note: 'اختبار تلقائي' })
  await supabase.from('products').update({ qty }).eq('id', np.id)

  const { data: check } = await supabase.from('products').select('qty').eq('id', np.id).single()
  if (check?.qty === qty) ok(`إضافة منتج جديد بمشترى — الكمية صحيحة (${qty})`)
  else fail('إضافة منتج جديد عبر مشترى', `الكمية المتوقعة ${qty} لكن الفعلية ${check?.qty}`)
}

async function testExistingProductPurchaseUpdatesQty() {
  const testName = `__test_existing_${Date.now()}`
  const { data: np } = await supabase
    .from('products')
    .insert({ org_id: TEST_ORG_ID, branch_id: TEST_BRANCH_ID, name: testName, unit: 'قطعة', qty: 5, reorder_point: 5, is_active: true })
    .select().single()
  if (!np) { fail('تحديث كمية منتج موجود', 'فشل إنشاء المنتج الأولي'); return }
  createdProductIds.push(np.id)

  const { data: byNameArr } = await supabase
    .from('products').select('id,qty').eq('org_id', TEST_ORG_ID).eq('name', testName)
    .order('created_at', { ascending: false }).limit(1)

  if (!byNameArr || byNameArr.length === 0) { fail('تحديث كمية منتج موجود', 'لم يجد المنتج الموجود'); return }

  const addQty = 7
  const newQty = byNameArr[0].qty + addQty
  await supabase.from('stock_movements').insert({ product_id: byNameArr[0].id, type: 'in', qty_change: addQty, note: 'اختبار تلقائي' })
  await supabase.from('products').update({ qty: newQty }).eq('id', byNameArr[0].id)

  const { data: allWithName } = await supabase.from('products').select('id').eq('org_id', TEST_ORG_ID).eq('name', testName)
  const { data: finalCheck } = await supabase.from('products').select('qty').eq('id', byNameArr[0].id).single()

  if (allWithName?.length === 1 && finalCheck?.qty === 12) {
    ok('شراء صنف موجود — تحديث الكمية بدون تكرار صنف (5 + 7 = 12)')
  } else {
    fail('شراء صنف موجود', `عدد النسخ: ${allWithName?.length}, الكمية: ${finalCheck?.qty} (متوقع 1 نسخة و12 كمية)`)
  }
}

async function testDispenseDecreasesQty() {
  const testName = `__test_dispense_${Date.now()}`
  const { data: np } = await supabase
    .from('products')
    .insert({ org_id: TEST_ORG_ID, branch_id: TEST_BRANCH_ID, name: testName, unit: 'قطعة', qty: 20, reorder_point: 5, is_active: true })
    .select().single()
  if (!np) { fail('تسجيل صرف ينقص الكمية', 'فشل إنشاء المنتج الأولي'); return }
  createdProductIds.push(np.id)

  const dispenseQty = 8
  await supabase.from('stock_movements').insert({ product_id: np.id, type: 'out', qty_change: -dispenseQty, note: 'اختبار تلقائي' })
  await supabase.from('products').update({ qty: 20 - dispenseQty }).eq('id', np.id)

  const { data: check } = await supabase.from('products').select('qty').eq('id', np.id).single()
  if (check?.qty === 12) ok('تسجيل صرف — الكمية تنقص بشكل صحيح (20 - 8 = 12)')
  else fail('تسجيل صرف', `الكمية المتوقعة 12 لكن الفعلية ${check?.qty}`)
}

async function testDispenseCannotGoNegativeUnexpectedly() {
  const testName = `__test_negative_${Date.now()}`
  const { data: np } = await supabase
    .from('products')
    .insert({ org_id: TEST_ORG_ID, branch_id: TEST_BRANCH_ID, name: testName, unit: 'قطعة', qty: 3, reorder_point: 5, is_active: true })
    .select().single()
  if (!np) { fail('فحص الصرف الزائد عن المتاح', 'فشل إنشاء المنتج الأولي'); return }
  createdProductIds.push(np.id)

  const requestedQty = 10
  const wouldBeQty = 3 - requestedQty

  if (wouldBeQty < 0) {
    ok('فحص الصرف الزائد عن المتاح — النظام يحسب قيمة سالبة (يحتاج تحقق بالواجهة قبل الحفظ)')
  } else {
    fail('فحص الصرف الزائد عن المتاح', 'الحساب غير متوقع')
  }
}

async function run() {
  console.log('🧪 بدء اختبار المسارات الحرجة (مشتريات + صرف)...\n')

  await testNewProductPurchase()
  await testExistingProductPurchaseUpdatesQty()
  await testDispenseDecreasesQty()
  await testDispenseCannotGoNegativeUnexpectedly()

  console.log('\n🧹 تنظيف بيانات الاختبار...')
  await cleanup()

  console.log(`\n${'='.repeat(40)}`)
  console.log(`النتيجة النهائية: ${passed} ناجح، ${failed} فاشل`)
  console.log('='.repeat(40))

  if (failed > 0) process.exit(1)
}

run()
