// هل المنشأة شغّالة؟ — كل الإرسال التلقائي (واتساب، طلبات الموردين، تقارير المحاسب) يمر من هنا.
// الحساب الموقوف، أو اللي انتهى اشتراكه، أو بدون مالك (انحذف) = ما يوصله شي، ولا لموردينه أو محاسبه.
export async function isSubscriptionActive(supabase: any, orgId: string): Promise<boolean> {
  try {
    const { data: owner } = await supabase
      .from('profiles')
      .select('status,subscription_ends_at')
      .eq('org_id', orgId)
      .eq('role', 'owner')
      .maybeSingle()

    if (!owner) return false // منشأة بدون مالك = محذوفة أو ناقصة
    if (owner.status === 'suspended') return false
    if (!owner.subscription_ends_at) return true // حسابات قديمة بدون تاريخ انتهاء
    return new Date(owner.subscription_ends_at) > new Date()
  } catch {
    return true // عند خطأ مؤقت بالتحقق ما نوقف تنبيهات منشأة شغّالة
  }
}
