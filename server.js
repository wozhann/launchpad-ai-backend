import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import OpenAI from "openai";

dotenv.config();

const app = express();
app.use(cors({ origin: "*", methods: ["GET","POST","OPTIONS"], allowedHeaders: ["Content-Type"] }));
app.use(express.json());

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

app.get("/", (_req, res) => res.json({ ok: true }));

app.post("/api/respond", async (req, res) => {
  try {
    const { message } = req.body || {};
    if (!message) return res.status(400).json({ error: "message is required" });

    const resp = await client.responses.create({
      model: "gpt-4o-mini",
      instructions: "You are a helpful onboarding/task copilot for young professionals.",
      input: message,
      max_output_tokens: 500
    });

    res.json({ text: resp.output_text ?? "No output" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "AI request failed" });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("AI backend running on port " + PORT));
