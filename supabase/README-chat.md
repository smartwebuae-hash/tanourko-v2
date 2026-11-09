# مساعد تنوركو الذكي (الشات)

زر «اسأل مساعد تنوركو» يظهر في المنيو، ويظهر كمان في صفحة الروابط والبوفيهات ويفتح المنيو والشات مفتوح.

- يعرض صورة الطبق وسعره من المنيو نفسه، وزر «أضف للسلة».
- يقترح سلطات ومشروبات وحلويات تكمل الطلب.
- إذا ما عرف الجواب يطلع للزبون زر واتساب برسالة جاهزة ورقم الاتصال.
- كل المحادثات تظهر في `visitors.html` في قسم «🤖 محادثات المساعد».

## 1) جدول المحادثات (مرة وحدة)
Supabase ← SQL Editor ← الصق محتوى `supabase/chat_logs.sql` ← Run.
(صفحة «زوار الموقع» تعرض نفس الكود مع زر نسخ إذا الجدول مو موجود.)

## 2) تفعيل الذكاء الاصطناعي
بدون هذي الخطوة الشات يشتغل بالبحث العادي في المنيو، ويحوّل للواتساب إذا ما لقى الجواب.

1. سوّ مفتاح API من https://platform.claude.com (Settings ← API Keys).
2. من جهاز فيه Supabase CLI، داخل مجلد المشروع:
   ```bash
   supabase login
   supabase link --project-ref iekotptltmkjmieauhqc
   supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
   supabase functions deploy tanourko-chat --no-verify-jwt
   ```
   أو من لوحة Supabase: Edge Functions ← Deploy a new function ← الاسم `tanourko-chat` ← الصق كود
   `supabase/functions/tanourko-chat/index.ts` ← وطفّي خيار «Verify JWT». وبعدها من
   Edge Functions ← Secrets أضف `ANTHROPIC_API_KEY`.

الموديل الافتراضي `claude-opus-5-5`. تقدر تغيره بدون تعديل الكود بإضافة Secret اسمه `CHAT_MODEL`،
مثلاً `claude-haiku-5-5` أرخص بكثير ويكفي لأسئلة المنيو.

## تعديل معلومات المطعم
النص `INFO` في أعلى `supabase/functions/tanourko-chat/index.ts` (الأرقام، الحجز المسبق…).
أضف أوقات الدوام ورسوم التوصيل هناك عشان المساعد يجاوب عليها بدل ما يحوّل للواتساب، وبعدين أعد النشر.
