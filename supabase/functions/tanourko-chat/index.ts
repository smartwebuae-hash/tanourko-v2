// مساعد تنوركو الذكي — دالة Supabase Edge Function
// تستقبل محادثة الزبون + نسخة مختصرة من المنيو، وترجع رد قصير + أرقام الأطباق اللي تنعرض بصورها وأسعارها.
// المفتاح ANTHROPIC_API_KEY ينحفظ في Supabase Secrets (ما يظهر أبداً في الموقع).
// طريقة التفعيل كاملة في supabase/README-chat.md
import Anthropic from "npm:@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: Deno.env.get("ANTHROPIC_API_KEY") });
const MODEL = Deno.env.get("CHAT_MODEL") || "claude-opus-5-5";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "apikey, authorization, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// معلومات المطعم الثابتة — عدّلها هنا إذا تغيرت
const INFO = `مطعم ومطبخ تنوركو — العين، بالقرب من بوادي مول.
للطلب والاستفسار: 0500888917 (واتساب واتصال)، 0500888916، 037325055.
البوفيهات والمناسبات: 0500888916 (منيو البوفيهات في صفحة buffets.html).
الطلب من المنيو: الزبون يضيف الأطباق للسلة ويرسل الطلب عبر واتساب (استلام، توصيل، أو أكل في المطعم).
الذبائح والطبخ والحرارات: الحجز قبل 20 ساعة. صحن الفواكه مع الذبيحة: الحجز قبل 6 ساعات.`;

const SYSTEM = `أنت "مساعد تنوركو"، موظف خدمة عملاء ودود في مطعم تنوركو الإماراتي. تكلم الزبون بلهجة خليجية إماراتية بسيطة ومحترمة (وبالإنجليزي إذا كتب بالإنجليزي).

مهمتك:
- تجاوب عن الأطباق والأسعار من المنيو المرفق فقط. لا تخترع أي طبق أو سعر أو معلومة مو موجودة.
- إذا سأل الزبون عن طبق أو سعره: حط رقم الطبق في dishes (الموقع يعرض صورته وسعره تلقائياً)، وفي الرد اذكر السعر باختصار.
- اقترح دائماً بلطف أطباق تكمل الطلب: سلطة أو مقبلات، ومشروب أو عصير، وأحياناً حلى. حط أرقامها في dishes بعد الطبق المطلوب.
- إذا ذكر عدد أشخاص، اقترح طلب مناسب (مثلاً الصواني تكفي 5–6 أشخاص) واحسب المجموع التقريبي.
- خل الرد قصير (سطرين إلى أربعة)، مع إيموجي خفيف.
- إذا السؤال عن شي مو موجود في المعلومات (مثل أوقات الدوام، رسوم التوصيل، المناطق، الحجوزات الخاصة، الشكاوى، الطلبات الخاصة، أو أي شي مو متأكد منه)، أو طلب يكلم موظف: اعتذر بلطف وخل handoff = true، والموقع بيعرض له زر الاتصال والواتساب.
- إذا طلب الزبون يطلب، قول له يضغط "أضف للسلة" تحت صورة الطبق وبعدين يرسل الطلب من السلة عبر واتساب.
- لا تتكلم في مواضيع ما لها علاقة بالمطعم؛ رجّع الكلام للمنيو بلطف.

معلومات المطعم:
${INFO}`;

const SCHEMA = {
  type: "object",
  properties: {
    reply: { type: "string", description: "نص الرد للزبون" },
    dishes: { type: "array", items: { type: "integer" }, description: "أرقام الأطباق من المنيو (العمود الأول) لعرض صورها وأسعارها، بالترتيب، بحد أقصى 6" },
    handoff: { type: "boolean", description: "true إذا لازم نحول الزبون للاتصال أو الواتساب" },
  },
  required: ["reply", "dishes", "handoff"],
  additionalProperties: false,
};

// حماية بسيطة من الإساءة: حد للطلبات لكل عنوان خلال دقيقة
const hits = new Map<string, number[]>();
function limited(ip: string) {
  const now = Date.now();
  const arr = (hits.get(ip) || []).filter((t) => now - t < 60_000);
  arr.push(now);
  hits.set(ip, arr);
  if (hits.size > 5000) hits.clear();
  return arr.length > 12;
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "method" }, 405);

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "x";
  if (limited(ip)) return json({ error: "rate" }, 429);

  let body: { messages?: { role: string; content: string }[]; menu?: string };
  try { body = await req.json(); } catch { return json({ error: "body" }, 400); }

  const menu = String(body.menu || "").slice(0, 40_000);
  const msgs = (Array.isArray(body.messages) ? body.messages : [])
    .slice(-12)
    .filter((m) => (m.role === "user" || m.role === "assistant") && typeof m.content === "string" && m.content.trim())
    .map((m) => ({ role: m.role as "user" | "assistant", content: m.content.slice(0, 1200) }));
  // المحادثة لازم تبدأ برسالة من الزبون
  while (msgs.length && msgs[0].role !== "user") msgs.shift();
  if (!msgs.length || msgs[msgs.length - 1].role !== "user" || !menu) return json({ error: "empty" }, 400);

  try {
    const res = await client.beta.messages.create({
      model: MODEL,
      max_tokens: 4000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: "low", format: { type: "json_schema", schema: SCHEMA } },
      system: [
        { type: "text", text: SYSTEM },
        {
          type: "text",
          text: "المنيو (رقم|اسم الطبق|القسم|السعر|وصف|ملاحظة):\n" + menu,
          cache_control: { type: "ephemeral" },
        },
      ],
      messages: msgs,
    } as never) as Anthropic.Beta.BetaMessage;

    if (res.stop_reason === "refusal") return json({ reply: "اعذرني، ما أقدر أساعدك في هذا 🙏", dishes: [], handoff: true });
    const text = res.content.filter((b) => b.type === "text").map((b) => (b as { text: string }).text).join("");
    const out = JSON.parse(text);
    return json({
      reply: String(out.reply || "").slice(0, 1500),
      dishes: (Array.isArray(out.dishes) ? out.dishes : []).filter((n: unknown) => Number.isInteger(n)).slice(0, 6),
      handoff: !!out.handoff,
    });
  } catch (e) {
    console.error(e);
    return json({ error: "ai" }, 502);
  }
});
