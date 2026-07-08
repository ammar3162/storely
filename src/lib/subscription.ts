export async function isSubscriptionActive(supabase: any, orgId: string): Promise<boolean> {
  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('subscription_ends_at,subscription_type')
      .eq('org_id', orgId)
      .not('subscription_ends_at', 'is', null)
      .order('subscription_ends_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (!profile?.subscription_ends_at) return true // ما فيه تاريخ انتهاء مسجّل = بدون قيود

    const ends = new Date(profile.subscription_ends_at)
    if (ends < new Date() && profile.subscription_type !== 'paid') {
      return false
    }
    return true
  } catch {
    return true // عند أي خطأ بالتحقق، لا نمنع الإرسال (fail-open)
  }
}
