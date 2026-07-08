// ─────────────────────────────────────────────────────────────────────────────
// JobBot Backend — Resume Analysis API powered by Groq (LLaMA)
// ─────────────────────────────────────────────────────────────────────────────

require("dotenv").config();
const express = require("express");
const cors = require("cors");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const pdfParse = require("pdf-parse");
const mammoth = require("mammoth");
const Groq = require("groq-sdk");

// ─── CONFIGURATION ───────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
const GROQ_API_KEY = process.env.GROQ_API_KEY;

if (!GROQ_API_KEY) {
  console.error("❌  GROQ_API_KEY is missing in .env file");
  process.exit(1);
}

const groq = new Groq({ apiKey: GROQ_API_KEY });

// Models to try in order (fallback if primary fails)
const MODEL_NAMES = ["llama-3.3-70b-versatile", "llama-3.1-8b-instant", "mixtral-8x7b-32768"];

// ─── EXPRESS APP ──────────────────────────────────────────────────────────────
const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ─── MULTER SETUP ─────────────────────────────────────────────────────────────
const uploadsDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  },
});

const fileFilter = (_req, file, cb) => {
  const allowed = [".pdf", ".docx"];
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowed.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error("Only .pdf and .docx files are allowed"), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 },
});

// ─── HELPERS ──────────────────────────────────────────────────────────────────

async function extractResumeText(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const buffer = fs.readFileSync(filePath);

  if (ext === ".pdf") {
    const data = await pdfParse(buffer);
    return data.text;
  }

  if (ext === ".docx") {
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  }

  throw new Error(`Unsupported file type: ${ext}`);
}

function cleanupFile(filePath) {
  try {
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  } catch {
    // non-critical
  }
}

function buildPrompt(resumeText, jobDescription) {
  return `You are an expert career coach and ATS optimization specialist. Analyze the following resume against the provided job description and return a STRICT JSON response (no markdown, no code fences, just raw JSON).

RESUME TEXT:
${resumeText}

JOB DESCRIPTION:
${jobDescription}

PERFORM THESE 5 STEPS:

STEP 1 — JOB UNDERSTANDING
Analyze the job description and extract:
- "skills": array of required/preferred skills
- "roleExpectations": array of key role expectations
- "keywords": array of important ATS keywords
- "seniorityLevel": string (e.g., "Junior", "Mid", "Senior", "Lead", "Principal")

STEP 2 — RESUME ANALYSIS
Compare the resume against the job and produce:
- "relevantProjects": array of objects { "project": string, "relevance": string }
- "missingSkills": array of skills in the job but NOT in the resume
- "weakBullets": array of objects { "original": string, "issue": string }

STEP 3 — RESUME BULLET CUSTOMIZATION
Rewrite weak bullets to be ATS-friendly, action-verb led, and quantified.
Return as: array of objects { "original": string, "improved": string }

STEP 4 — COVER LETTER GENERATION
Write a unique, professional cover letter (300-400 words) for this specific role.
Return as a single string.

STEP 5 — JOB MATCH SCORE
- "matchScore": number 0-100
- "recommendation": one of "Apply", "Improve", or "Skip"
- "scoreBreakdown": { "skills": number, "experience": number, "projects": number, "ats": number, "education": number }
- "reasoning": string explaining the score

REQUIRED JSON FORMAT:
{
  "jobUnderstanding": { "skills": [], "roleExpectations": [], "keywords": [], "seniorityLevel": "" },
  "resumeAnalysis": { "relevantProjects": [{"project":"","relevance":""}], "missingSkills": [], "weakBullets": [{"original":"","issue":""}] },
  "customizedResumeBullets": [{"original":"","improved":""}],
  "coverLetter": "",
  "matchScore": 0,
  "recommendation": "",
  "scoreBreakdown": {"skills":0,"experience":0,"projects":0,"ats":0,"education":0},
  "reasoning": ""
}

IMPORTANT: Return ONLY the JSON object. No markdown, no code fences, no extra text.`;
}

/**
 * Call Groq with automatic retry and model fallback.
 */
async function callGroqWithRetry(prompt, maxRetries = 2) {
  for (const modelName of MODEL_NAMES) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`🤖  Trying ${modelName} (attempt ${attempt}/${maxRetries})…`);
        const chatCompletion = await groq.chat.completions.create({
          messages: [
            {
              role: "system",
              content: "You are an expert career coach and ATS optimization specialist. Always respond with valid JSON only, no markdown."
            },
            {
              role: "user",
              content: prompt
            }
          ],
          model: modelName,
          temperature: 0.3,
          max_tokens: 4096,
          response_format: { type: "json_object" },
        });

        const text = chatCompletion.choices[0]?.message?.content;
        if (!text) throw new Error("Empty response from Groq");

        console.log(`✅  ${modelName} responded successfully`);
        return text;
      } catch (err) {
        const isRateLimit = err.status === 429 || (err.message && err.message.includes("429"));
        if (isRateLimit && attempt < maxRetries) {
          const waitSec = 10 * attempt;
          console.log(`⏳  Rate limited on ${modelName}. Waiting ${waitSec}s…`);
          await new Promise(r => setTimeout(r, waitSec * 1000));
        } else if (isRateLimit) {
          console.log(`⚠️  ${modelName} rate limited, trying next model…`);
          break;
        } else {
          console.log(`⚠️  ${modelName} error: ${err.message}`);
          if (attempt >= maxRetries) break;
        }
      }
    }
  }
  throw new Error("All models failed. Please try again in a moment.");
}

// ─── ROUTES ───────────────────────────────────────────────────────────────────

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.post("/api/analyze", upload.single("resume"), async (req, res) => {
  let filePath = null;

  try {
    if (!req.file) {
      return res.status(400).json({ error: "Resume file is required." });
    }
    const jobDescription = req.body.jobDescription;
    if (!jobDescription || !jobDescription.trim()) {
      cleanupFile(req.file.path);
      return res.status(400).json({ error: "Job description text is required." });
    }

    filePath = req.file.path;
    console.log(`📄  Received: ${req.file.originalname} (${(req.file.size / 1024).toFixed(1)} KB)`);

    console.log("🔍  Extracting resume text…");
    const resumeText = await extractResumeText(filePath);

    if (!resumeText || resumeText.trim().length < 50) {
      cleanupFile(filePath);
      return res.status(400).json({ error: "Could not extract meaningful text from the resume." });
    }
    console.log(`✅  Extracted ${resumeText.length} characters`);

    const prompt = buildPrompt(resumeText, jobDescription.trim());
    let text = await callGroqWithRetry(prompt);

    // Strip markdown code fences if wrapped
    text = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();

    let analysis;
    try {
      analysis = JSON.parse(text);
    } catch (parseErr) {
      console.error("⚠️  JSON parse failed:", parseErr.message);
      cleanupFile(filePath);
      return res.status(500).json({
        error: "AI returned a malformed response. Please try again.",
        raw: text.substring(0, 500),
      });
    }

    cleanupFile(filePath);
    filePath = null;

    console.log("🎉  Analysis complete — matchScore:", analysis.matchScore);

    return res.json({ success: true, data: analysis });
  } catch (err) {
    if (filePath) cleanupFile(filePath);
    console.error("❌  Error:", err.message);

    if (err instanceof multer.MulterError) {
      if (err.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({ error: "File too large. Max 10 MB." });
      }
      return res.status(400).json({ error: `Upload error: ${err.message}` });
    }

    return res.status(500).json({ error: err.message || "Internal server error" });
  }
});

app.use((err, _req, res, _next) => {
  console.error("Unhandled error:", err.message);
  res.status(500).json({ error: err.message || "Internal server error" });
});

app.listen(PORT, () => {
  console.log(`\n🚀  JobBot Backend running on http://localhost:${PORT}`);
  console.log(`📡  POST /api/analyze — Upload resume + job description`);
  console.log(`💚  GET  /api/health  — Health check`);
  console.log(`⚡  AI: Groq (${MODEL_NAMES.join(" → ")})\n`);
});
