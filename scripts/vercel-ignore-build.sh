#!/bin/bash
# Vercel «Ignored Build Step»: exit 0 = تجاوز البناء، exit 1 = ابنِ.
# نفس الكود مربوط بمشروعين في Vercel:
#   storely.dev (الموقع الرسمي www.storely.dev) — يكفيه يبني main بس
#   storely     (staging.storely.dev والفروع)  — يبني كل شي كالعادة
# بدون هذا كل دفعة لـ staging تنبني مرتين وتنحسب دقائق بناء مضاعفة.
# نعرف المشروع برقمه، أو بدومينه الرسمي لو الرقم مو متوفر وقت البناء. مشروع غير معروف = ابنِ (الآمن).
IS_SITE=0
[ "$VERCEL_PROJECT_ID" = "prj_PGBxMwty7a3Gf6aYkcauuUiPnMNe" ] && IS_SITE=1
echo "$VERCEL_PROJECT_PRODUCTION_URL" | grep -qE '^(www\.)?storely\.dev$' && IS_SITE=1
if [ "$IS_SITE" = "1" ] && [ -n "$VERCEL_GIT_COMMIT_REF" ] && [ "$VERCEL_GIT_COMMIT_REF" != "main" ]; then
  echo "storely.dev: تجاوز بناء الفرع $VERCEL_GIT_COMMIT_REF (يبني main فقط)"
  exit 0
fi
exit 1
