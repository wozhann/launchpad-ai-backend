// server.js (Render backend)

import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import OpenAI from "openai";

dotenv.config();

const app = express();
app.use(cors({ origin: "*", methods: ["GET","POST","OPTIONS"], allowedHeaders: ["Content-Type"] }));
app.use(express.json());

// OpenAI client (reads OPENAI_API_KEY from Render env)
const client = new OpenAI();

// In-memory demo data (reset on redeploy)
const DB = {
  onboardingTasks: [
    { id: "acct", title: "Set up company email & SSO", done: false },
    { id: "laptop", title: "Laptop + VPN + MFA", done: false },
    { id: "dev", title: "Dev environment (Node, Git, repo access)", done: false },
    { id: "policy", title: "Read Code of Conduct & Security Policy", done: false },
    { id: "timesheet", title: "Timesheet access & submission test", done: false }
  ]
};

// Health checks
app.get("/", (_req, res) => res.json({ ok: true }));
app.get("/env-check", (_req, res) => {
  const key = process.env.OPENAI_API_KEY || "";
  res.json({ hasOpenAIKey: Boolean(key && key.trim().length > 20), prefix: key ? key.slice(0, 8) : null });
});

// ---------- Onboarding checklist ----------
app.get("/api/onboarding/tasks", (_req, res) => {
  res.json({ tasks: DB.onboardingTasks });
});

app.post("/api/onboarding/toggle", (req, res) => {
  const { id, done } = req.body || {};
  const t = DB.onboardingTasks.find(x => x.id === id);
  if (!t) return res.status(404).json({ error: "task not found" });
  if (typeof done === "boolean") t.done = done; else t.done = !t.done;
  res.json({ ok: true, task: t });
});

// ---------- Unified agent chat ----------
const SYSTEM = {
  onboarding:
    "You are an Onboarding Agent. Give concise, actionable steps for a brand-new employee. Refer to tasks like email setup, VPN/MFA, dev env, policies, timesheets. If user asks 'where do I submit timesheet', answer plainly and suggest next step.",
  learning:
    "You are a Learning & Skills Agent. Recommend concrete courses, tutorials, videos, or articles. Tailor by role/skill level. Suggest next steps and small practice tasks. Keep each suggestion with a 1-line why.",
  career:
    "You are a Career Guidance Agent. Provide role ladders, skills for next level, internal mobility ideas, and mentor/buddy guidance. Offer simple 'what-if' planning and timelines.",
  faq:
    "You are an FAQ/Support Agent. Answer HR/IT/policy questions succinctly; when likely internal doc paths exist, say 'Check: /docs/hr/timesheets or HR portal'. Escalate to human when needed."
};

app.post("/api/agent/respond", async (req, res) => {
  try {
    const { agent = "faq", message = "", role = "New Hire", level = "Beginner" } = req.body || {};
    if (!message.trim()) return res.status(400).json({ error: "message is required" });

    const instructions = SYSTEM[agent] || SYSTEM.faq;
    const prompt = `Employee role: ${role}\nSeniority: ${level}\nAgent: ${agent}\nUser: ${message}\n\nReturn a helpful, concrete answer with steps. Use bullet lists when useful.`;

    const resp = await client.responses.create({
      model: "gpt-4o-mini",
      instructions,
      input: prompt,
      max_output_tokens: 600
    });

    res.json({ text: resp.output_text ?? "No output" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "AI request failed" });
  }
});

// ---------- Start ----------
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("AI backend running on port " + PORT));

