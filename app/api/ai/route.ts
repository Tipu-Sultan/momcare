import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";
import { connectDB } from "@/lib/mongodb";

// Models Imports
import SugarReading from "@/models/SugarReading";
import BPReading from "@/models/BPReading";
import ThyroidReading from "@/models/ThyroidReading";
import InsulinLog from "@/models/InsulinLog";
import MedicineLog from "@/models/MedicineLog";
import WaterLog from "@/models/WaterLog";
import ActivityLog from "@/models/ActivityLog";

// Lazy-initialize Groq client securely
let groqClient: Groq | null = null;
function getGroq() {
  if (!groqClient) {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      throw new Error("GROQ_API_KEY is not defined. Please add it in your environment variables.");
    }
    groqClient = new Groq({ apiKey });
  }
  return groqClient;
}

// ── DATA FORMATTING HELPER FUNCTIONS ─────────────────────────────────────────

function formatSugar(readings: any[]) {
  return readings.slice(0, 10).map(r => ({
    date: new Date(r.measuredAt).toLocaleString("en-IN"),
    value: `${r.value} mg/dL`,
    timing: r.timing,
    insulin: r.insulinName || "none",
    insulinUnits: r.insulinUnits || 0,
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

function formatMedicineLogs(logs: any[]) {
  return logs.slice(0, 5).map(l => ({
    date: new Date(l.takenAt).toLocaleString("en-IN"),
    medicine: l.medicineName,
    dosage: l.dosage,
    note: l.note || "",
  }));
}

function formatWaterLogs(logs: any[]) {
  return logs.slice(0, 5).map(l => ({
    date: new Date(l.measuredAt).toLocaleString("en-IN"),
    amount: `${l.amount} ml`,
    note: l.note || "",
  }));
}

// function formatActivityLogs(logs: any[]) {
//   return logs.slice(0, 5).map(l => ({
//     date: new Date(l.loggedDate).toLocaleDateString("en-IN"),
//     steps: l.steps,
//     heartRateAvg: `${l.heartRateAverage} bpm`,
//     spo2Avg: `${l.spo2Average}%`,
//     source: l.syncSource,
//   }));
// }

// ── SYSTEM PROMPTS CONFIGURATION ─────────────────────────────────────────────

const systemPrompts: Record<string, string> = {
  analyse: `You are a caring and knowledgeable health assistant helping a family track their mother's health (Shakila Khatoon, Age 52).
She has diabetes, high blood pressure, and thyroid issues and is taking insulin and regular medications.
Analyse the provided health logs thoroughly (including sugar, BP, thyroid, medicines, hydration, and watch activity). Give:
1. 📊 Overall health trend summary
2. 🩸 Sugar/Diabetes analysis (patterns, timing impact, insulin effectiveness)
3. 💓 Blood pressure and pulse trend
4. 🧬 Thyroid status update
5. 📋 Medication adherence & Insulin pattern observations
6. 💧 Hydration levels & 🚶 Activity/Wearable insights (steps, heart rate, SpO2)
7. ⚠️ Concerns/red flags and ✅ Positive improvements
Keep tone warm, caring, and easy to understand. End with clear family encouragement.`,

  suggest: `You are a caring health assistant helping a family manage their mother's chronic conditions.
Based on the health data provided (including activity steps and daily water intake), give practical, safe lifestyle suggestions:
1. 🥗 Tailored diet recommendations based on recent blood sugar patterns
2. 🚶 Step count & physical activity pacing (gentle walk routines based on wearable logs)
3. 💊 Medication & Insulin timing coordination
4. 😴 Sleep, stress management, and hydration optimization guidelines
5. 🍽️ Avoid vs Prefer foods matrix
6. 📅 Recommended monitoring frequency
Keep suggestions realistic, gentle, and safe. Always recommend consulting her doctor for medical decisions.`,

  insulin: `You are a health assistant specialising in insulin management for diabetic patients.
Analyse the insulin logs alongside sugar readings, medicine compliance, and hydration data to provide:
1. 💉 Evaluation of current insulin dose effectiveness on controlling sugar levels
2. 📈 Glycemic differences across timings (Fasting vs Post Meal logs)
3. ⏰ Optimal dose timing observations and consistency flags
4. 💧 Inter-relation of water consumption or physical steps on active insulin response
5. ⚠️ Hypoglycemia or severe spike risks
Always remind that insulin adjustments should only be done under doctor's supervision.`,

  chat: `You are MomCare AI, a caring health assistant for a family tracking their mother's health conditions.
You have access to her full recent health data (sugar, BP, thyroid, medications, water logs, and smartwatch activity metrics).
Answer the user's question warmly, logically, and helpfully based strictly on this unified data profile.
Always remind them to consult their doctor for medical decisions. Keep responses concise and caring.`,

  predict: `You are a medical predictive analytics AI assistant for Shakila Khatoon (Age 52, with Type 2 Diabetes, hypertension, and thyroid issues).
Based on her multi-dimensional health metrics (sugar readings, blood pressure, thyroid results, water intake, medicine logs, steps, and avg SpO2/pulse logs):
1. 📈 PREDICT her blood sugar and blood pressure stabilization levels over the next 14 days under current adherence.
2. ⚠️ IDENTIFY composite risk factors (e.g., glycemic variability, pulse variations, dehydration impact on renal parameters, hypothyroid physical fatigue).
3. 🎯 PROVIDE preemptive, multi-factor suggestions (nutritional timing, strict hydration targets based on current water deficit, target step routines, insulin adherence).
Format response using Markdown with headers, high clinical warmth, and end with encouragement. Add a disclaimer that these are predictive simulations and the doctor is the ultimate authority.`,
};

// ── MAIN API ROUTE HANDLER ───────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const { question, mode } = await req.json();

    // Fetch logs from MongoDB or fallback in-memory DB
    let sugarReadings, bpReadings, thyroidReadings, insulinLogs, medicineLogs, waterLogs, activityLogs;

    const globalAny = global as any;

    if (globalAny.isMongoOffline) {
      sugarReadings = [...(globalAny.inMemoryDb?.sugarReadings || [])].sort((a, b) => new Date(b.measuredAt).getTime() - new Date(a.measuredAt).getTime()).slice(0, 10);
      bpReadings = [...(globalAny.inMemoryDb?.bpReadings || [])].sort((a, b) => new Date(b.measuredAt).getTime() - new Date(a.measuredAt).getTime()).slice(0, 5);
      thyroidReadings = [...(globalAny.inMemoryDb?.thyroidReadings || [])].sort((a, b) => new Date(b.testedAt).getTime() - new Date(a.testedAt).getTime()).slice(0, 2);
      insulinLogs = [...(globalAny.inMemoryDb?.insulinLogs || [])].sort((a, b) => new Date(b.takenAt).getTime() - new Date(a.takenAt).getTime()).slice(0, 5);
      medicineLogs = [...(globalAny.inMemoryDb?.medicineLogs || [])].sort((a, b) => new Date(b.takenAt).getTime() - new Date(a.takenAt).getTime()).slice(0, 5);
      waterLogs = [...(globalAny.inMemoryDb?.waterLogs || [])].sort((a, b) => new Date(b.measuredAt).getTime() - new Date(a.measuredAt).getTime()).slice(0, 5);
    } else {
      try {
        [sugarReadings, bpReadings, thyroidReadings, insulinLogs, medicineLogs, waterLogs] = await Promise.all([
          SugarReading.find().sort({ measuredAt: -1 }).limit(10).lean(),
          BPReading.find().sort({ measuredAt: -1 }).limit(5).lean(),
          ThyroidReading.find().sort({ testedAt: -1 }).limit(2).lean(),
          InsulinLog.find().sort({ takenAt: -1 }).limit(5).lean(),
          MedicineLog.find().sort({ takenAt: -1 }).limit(5).lean(),
          WaterLog.find().sort({ measuredAt: -1 }).limit(5).lean(),
        ]);
      } catch (err: any) {
        console.warn("MongoDB query failed inside AI route, using fallback:", err.message);
        globalAny.isMongoOffline = true;
        
        sugarReadings = [...(globalAny.inMemoryDb?.sugarReadings || [])].sort((a, b) => new Date(b.measuredAt).getTime() - new Date(a.measuredAt).getTime()).slice(0, 10);
        bpReadings = [...(globalAny.inMemoryDb?.bpReadings || [])].sort((a, b) => new Date(b.measuredAt).getTime() - new Date(a.measuredAt).getTime()).slice(0, 5);
        thyroidReadings = [...(globalAny.inMemoryDb?.thyroidReadings || [])].sort((a, b) => new Date(b.testedAt).getTime() - new Date(a.testedAt).getTime()).slice(0, 2);
        insulinLogs = [...(globalAny.inMemoryDb?.insulinLogs || [])].sort((a, b) => new Date(b.takenAt).getTime() - new Date(a.takenAt).getTime()).slice(0, 5);
        medicineLogs = [...(globalAny.inMemoryDb?.medicineLogs || [])].sort((a, b) => new Date(b.takenAt).getTime() - new Date(a.takenAt).getTime()).slice(0, 5);
        waterLogs = [...(globalAny.inMemoryDb?.waterLogs || [])].sort((a, b) => new Date(b.measuredAt).getTime() - new Date(a.measuredAt).getTime()).slice(0, 5);
      }
    }

    // Build absolute metadata profile payload
    const healthContext = {
      sugarReadings: formatSugar(sugarReadings),
      bloodPressure: formatBP(bpReadings),
      thyroid: formatThyroid(thyroidReadings),
      insulinLogs: formatInsulinLogs(insulinLogs),
      medicineLogs: formatMedicineLogs(medicineLogs),
      waterLogs: formatWaterLogs(waterLogs),
      summary: {
        totalSugarReadings: sugarReadings.length,
        avgSugar: sugarReadings.length > 0
          ? Math.round(sugarReadings.reduce((s: number, r: any) => s + (r.value || 0), 0) / sugarReadings.length)
          : null,
        latestSugar: sugarReadings[0]?.value ?? null,
        latestBP: bpReadings[0] ? `${bpReadings[0].systolic}/${bpReadings[0].diastolic} mmHg` : null,
        latestPulse: bpReadings[0]?.pulse ?? null,
        latestTSH: thyroidReadings[0]?.tsh ?? null,
        totalWaterTodayMl: waterLogs.reduce((acc: number, item: any) => acc + (item.amount || 0), 0),
        highSugarCount: sugarReadings.filter((r: any) => r.value > 180).length,
        lowSugarCount:  sugarReadings.filter((r: any) => r.value < 70).length,
      },
    };

    const baseSystemInstruction = (systemPrompts[mode] ?? systemPrompts.chat) + 
      "\n\nYou MUST respond ONLY in valid JSON format containing exactly two keys:\n" +
      "- 'response': string, your main caring response (use Markdown formatting with clear headers, bullet points, and high clinical warmth).\n" +
      "- 'suggestedQuestions': array of exactly 3 strings containing short, relevant, and warm follow-up questions Mom's family might ask next based on this response.\n\n" +
      "Example JSON format:\n" +
      "{\n" +
      "  \"response\": \"Hello! ...\",\n" +
      "  \"suggestedQuestions\": [\"Question 1\", \"Question 2\", \"Question 3\"]\n" +
      "}";

    const primaryPrompt = `
      ${question ? `User question: ${question}` : "Please provide a complete comprehensive clinical analysis based on the latest logs."}

      === MOM'S DETAILED HEALTH PROFILE (from MomCare app) ===
      ${JSON.stringify(healthContext, null, 2)}
      === END OF UNIFIED HEALTH LOGS ===

      Respond in a highly empathetic, structured layout using appropriate health emojis. Frame medical evaluations clearly, emphasizing coordination with her treating doctor.
    `;

    // Make Groq API Request using Llama 3.3 70B
    const groq = getGroq();
    const chatCompletion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: baseSystemInstruction,
        },
        {
          role: "user",
          content: primaryPrompt,
        }
      ],
      temperature: 0.6,
    });

    const rawText = chatCompletion.choices[0]?.message?.content ?? "";
    let finalResponse = "";
    let suggestedQuestions: string[] = [];

    try {
      const parsed = JSON.parse(rawText);
      finalResponse = parsed.response || "";
      suggestedQuestions = parsed.suggestedQuestions || [];
    } catch (e) {
      console.warn("Failed to parse Groq response as JSON, cleaning output fallback:", e);
      finalResponse = rawText;
      suggestedQuestions = [
        "How do today's steps impact Mom's glucose readings?",
        "Are the insulin logs aligned properly with her meals?",
        "Is her water intake level safe for blood pressure management?"
      ];
    }

    return NextResponse.json({ 
      response: finalResponse, 
      suggestedQuestions,
      dataUsed: healthContext.summary 
    });

  } catch (err) {
    console.error("Groq route critical error:", err);
    const errMsg = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: "Server error during analysis execution", detail: errMsg }, 
      { status: 500 }
    );
  }
}