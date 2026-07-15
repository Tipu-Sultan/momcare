import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";
import { connectDB } from "@/lib/mongodb";
import SugarReading from "@/models/SugarReading";
import BPReading from "@/models/BPReading";
import ThyroidReading from "@/models/ThyroidReading";
import InsulinLog from "@/models/InsulinLog";

// Initialize official Groq client securely
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// ── DATA FORMATTING HELPER FUNCTIONS ─────────────────────────────────────────

function formatSugar(readings: any[]) {
  return readings.slice(0, 10).map(r => ({
    date: new Date(r.measuredAt).toLocaleString("en-IN"),
    value: `${r.value} mg/dL`,
    timing: r.timing,
    insulin: r.insulinName || "none",
    insulinTakenAt: r.insulinTakenAt ? new Date(r.insulinTakenAt).toLocaleString("en-IN") : null,
    note: r.note || "",
  }));
}

function formatBP(readings: any[]) {
  return readings.slice(0, 5).map(r => ({
    date: new Date(r.measuredAt).toLocaleString("en-IN"),
    bp: `${r.systolic}/${r.diastolic} mmHg`,
    pulse: r.pulse ? `${r.pulse} bpm` : null,
    note: r.note || "",
  }));
}

function formatThyroid(readings: any[]) {
  return readings.slice(0, 2).map(r => ({
    date: new Date(r.testedAt).toLocaleString("en-IN"),
    tsh: `${r.tsh} mIU/L`,
    t3: r.t3 ? `${r.t3} pg/mL` : null,
    t4: r.t4 ? `${r.t4} ng/dL` : null,
    note: r.note || "",
  }));
}

function formatInsulinLogs(logs: any[]) {
  return logs.slice(0, 5).map(l => ({
    date: new Date(l.takenAt).toLocaleString("en-IN"),
    insulin: l.insulinName,
    units: l.units,
    note: l.note || "",
  }));
}

// ── SYSTEM PROMPTS CONFIGURATION ─────────────────────────────────────────────

const systemPrompts: Record<string, string> = {
  analyse: `You are a caring and knowledgeable health assistant helping a family track their mother's health. 
She has diabetes, high blood pressure, and thyroid issues and is taking insulin.
Analyse the provided health data thoroughly. Give:
1. 📊 Overall health trend summary
2. 🩸 Sugar/Diabetes analysis (patterns, high/low events, insulin effectiveness)
3. 💓 Blood pressure trend
4. 🧬 Thyroid status
5. 💉 Insulin pattern observations
6. ⚠️ Any concerns or red flags
7. ✅ Positive improvements
Keep tone warm, caring, and easy to understand. Use simple language. End with encouragement.`,

  suggest: `You are a caring health assistant helping a family manage their mother's diabetes, blood pressure, and thyroid.
Based on the health data provided, give practical, safe lifestyle and diet suggestions:
1. 🥗 Diet recommendations for better sugar control
2. 🚶 Activity/exercise suggestions (gentle, suitable for her condition)
3. 💊 Medication timing tips (insulin, BP meds)
4. 😴 Sleep and stress management
5. 🍽️ Foods to avoid and prefer
6. 📅 Monitoring frequency suggestions
Keep suggestions realistic, gentle, and safe. Always recommend consulting her doctor for medical decisions.`,

  insulin: `You are a health assistant specialising in insulin management for diabetic patients.
Analyse the insulin logs and sugar readings to provide:
1. 💉 How well the current insulin is controlling sugar
2. 📈 Sugar levels before vs after insulin doses
3. ⏰ Optimal timing observations
4. 🔄 Patterns in insulin effectiveness
5. ⚠️ Any concerning patterns
Always remind that insulin adjustments should only be done under doctor's supervision.`,

  chat: `You are MomCare AI, a caring health assistant for a family tracking their mother's health conditions: diabetes, blood pressure, and thyroid issues. She is on insulin therapy.
You have access to her recent health data. Answer the user's question warmly and helpfully based on this data.
Always remind them to consult their doctor for medical decisions. Keep responses concise and caring.`,
};

// ── MAIN API ROUTE HANDLER ───────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const { question, mode } = await req.json();

    // Fetch essential logs from MongoDB
    const [sugarReadings, bpReadings, thyroidReadings, insulinLogs] = await Promise.all([
      SugarReading.find().sort({ measuredAt: -1 }).limit(10),
      BPReading.find().sort({ measuredAt: -1 }).limit(5),
      ThyroidReading.find().sort({ testedAt: -1 }).limit(2),
      InsulinLog.find().sort({ takenAt: -1 }).limit(5).populate("insulinTypeId", "name units timing"),
    ]);

    const healthContext = {
      sugarReadings: formatSugar(sugarReadings),
      bloodPressure: formatBP(bpReadings),
      thyroid: formatThyroid(thyroidReadings),
      insulinLogs: formatInsulinLogs(insulinLogs),
      summary: {
        totalSugarReadings: sugarReadings.length,
        avgSugar: sugarReadings.length > 0
          ? Math.round(sugarReadings.reduce((s, r) => s + (r.value || 0), 0) / sugarReadings.length)
          : null,
        latestSugar: sugarReadings[0]?.value ?? null,
        latestBP: bpReadings[0] ? `${bpReadings[0].systolic}/${bpReadings[0].diastolic}` : null,
        latestTSH: thyroidReadings[0]?.tsh ?? null,
        highSugarCount: sugarReadings.filter(r => r.value > 180).length,
        lowSugarCount:  sugarReadings.filter(r => r.value < 70).length,
      },
    };

    const baseSystemInstruction = systemPrompts[mode] ?? systemPrompts.chat;

    const primaryPrompt = `
      ${question ? `User question: ${question}` : "Please provide a complete analysis based on the data provided."}

      === MOM'S HEALTH DATA (from MomCare app) ===
      ${JSON.stringify(healthContext, null, 2)}
      === END OF DATA ===

      Respond in a warm, caring, structured way. Use emojis appropriately. Keep medical advice general and always suggest consulting a doctor for specific decisions.
    `;

    // Make Groq Cloud API Request
    const chatCompletion = await groq.chat.completions.create({
      messages: [
        { role: "system", content: baseSystemInstruction },
        { role: "user", content: primaryPrompt }
      ],
      model: "llama-3.3-70b-versatile",
      temperature: 0.7,
      max_tokens: 1024,
    });

    const text = chatCompletion.choices[0]?.message?.content ?? "No response from AI.";

    return NextResponse.json({ 
      response: text, 
      dataUsed: healthContext.summary 
    });

  } catch (err: any) {
    console.error("Groq route error:", err);
    return NextResponse.json(
      { error: "Server error", detail: err?.message || String(err) }, 
      { status: 500 }
    );
  }
}