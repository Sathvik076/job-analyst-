import { useState, useEffect, useRef, useCallback } from "react";
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell
} from "recharts";

// ─── BACKEND API BASE URL ─────────────────────────────────────────────────────
const API_BASE = "http://localhost:5000";

// ─── MOCK DATA ────────────────────────────────────────────────────────────────
const MOCK_ANALYSIS = {
  job: "Senior Full-Stack Engineer · Acme Technologies",
  matchScore: 74,
  confidence: 88,
  estimatedImprovement: 18,
  recommendation: "improve", // "skip" | "improve" | "apply"
  scoreBreakdown: [
    { subject: "Skills", value: 72 },
    { subject: "Experience", value: 81 },
    { subject: "Projects", value: 68 },
    { subject: "ATS", value: 82 },
    { subject: "Education", value: 90 },
    { subject: "Soft Skills", value: 55 },
  ],
  jobSkills: ["React", "TypeScript", "Node.js", "GraphQL", "AWS", "CI/CD", "Agile", "System Design", "PostgreSQL", "Docker"],
  resumeSkills: ["React", "TypeScript", "Node.js", "Agile", "PostgreSQL", "CSS", "Git", "REST APIs"],
  missingSkills: ["GraphQL", "AWS", "CI/CD", "System Design", "Docker"],
  skillGaps: [
    { skill: "React", importance: "High", found: "Yes", action: "None" },
    { skill: "TypeScript", importance: "High", found: "Yes", action: "None" },
    { skill: "Node.js", importance: "High", found: "Yes", action: "None" },
    { skill: "GraphQL", importance: "High", found: "No", action: "Add Immediately" },
    { skill: "AWS", importance: "High", found: "No", action: "Add Immediately" },
    { skill: "Docker", importance: "Medium", found: "No", action: "Recommended" },
    { skill: "CI/CD", importance: "Medium", found: "No", action: "Recommended" },
    { skill: "System Design", importance: "High", found: "Partial", action: "Add Immediately" },
    { skill: "PostgreSQL", importance: "Medium", found: "Yes", action: "None" },
    { skill: "Kubernetes", importance: "Low", found: "No", action: "Optional" },
    { skill: "Redis", importance: "Medium", found: "Partial", action: "Recommended" },
    { skill: "Agile/Scrum", importance: "Low", found: "Yes", action: "None" },
  ],
  ats: {
    score: 82, keywordDensity: 67, bulletQuality: 71,
    resumeLength: { pages: 1.8, status: "Optimal" },
    formattingIssues: [
      "Tables detected — may break ATS parsing",
      "Non-standard section header: 'My Journey'",
      "Inconsistent date formatting across entries",
    ],
    missingKeywords: ["GraphQL", "AWS Lambda", "Microservices", "System Design", "Docker Compose", "CI/CD Pipeline"],
  },
  semantic: {
    cosine: 0.743,
    mostRelevant: "Work Experience",
    leastRelevant: "Hobbies & Interests",
    sections: [
      { name: "Work Exp.", score: 88 },
      { name: "Skills", score: 79 },
      { name: "Projects", score: 72 },
      { name: "Education", score: 65 },
      { name: "Summary", score: 61 },
      { name: "Certs", score: 44 },
      { name: "Hobbies", score: 18 },
    ],
  },
  recruiter: {
    shortlistProb: 68,
    verdict: "Maybe",
    risks: [
      "Missing cloud platform experience (AWS/GCP/Azure)",
      "No mention of system design or architecture decisions",
      "GraphQL absent despite being explicitly required",
      "Soft skills section thin for a senior-level role",
    ],
  },
  strengths: [
    { title: "Strong Core Stack", detail: "React + TypeScript + Node.js match 3 of the top 5 requirements directly." },
    { title: "Database Expertise", detail: "PostgreSQL experience is explicitly listed and your resume shows depth." },
    { title: "Education Match", detail: "CS degree from accredited university aligns with stated preferences." },
    { title: "Tenure Signals", detail: "2+ years at previous roles shows stability — ATS models reward this." },
  ],
  weaknesses: [
    { title: "Cloud Gap", detail: "AWS is required. Add any cloud projects, even personal or side-projects." },
    { title: "Missing GraphQL", detail: "Explicitly required. Even partial side-project usage should be mentioned." },
    { title: "Weak Soft Skills", detail: "Senior roles expect leadership — mentoring, PR reviews, team initiatives." },
    { title: "Project Relevance", detail: "Projects score 68 — reframe them to mirror job posting language." },
  ],
};

const MOCK_COVER_LETTER = `Dear Hiring Manager,

I am writing to express my strong interest in the Senior Full-Stack Engineer position at Acme Technologies. With over five years of experience building scalable web applications using React, TypeScript, and Node.js, I am confident that my skills make me an excellent fit for your team.

In my current role, I led development of a real-time dashboard serving over 50,000 daily active users, reducing page load times by 40% through strategic code-splitting and caching. My deep expertise in TypeScript has helped our team maintain a large codebase with fewer runtime errors and significantly improved developer velocity.

I am particularly excited about Acme's focus on developer tooling and the opportunity to work with a distributed engineering team. Your commitment to open-source contributions resonates with my own values — I actively contribute to several React ecosystem libraries in my spare time.

While I am deepening my knowledge of AWS and infrastructure tooling, I have recent hands-on experience deploying containerized applications and working within agile sprint cycles. I am a fast learner who thrives in environments that balance technical rigor with product focus.

I would welcome the opportunity to discuss how my background can contribute to your team's success.

Warm regards,
Alex Johnson`;

// ─── ANIMATIONS / UTILITIES ───────────────────────────────────────────────────
function useCountUp(target, duration = 1200, delay = 0) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => {
      let start = null;
      const step = ts => {
        if (!start) start = ts;
        const p = Math.min((ts - start) / duration, 1);
        setVal(Math.round((1 - Math.pow(1 - p, 3)) * target));
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    }, delay);
    return () => clearTimeout(t);
  }, [target]);
  return val;
}

function useAnimatedBar(value, delay = 0) {
  const [w, setW] = useState(0);
  useEffect(() => { const t = setTimeout(() => setW(value), delay + 400); return () => clearTimeout(t); }, [value]);
  return w;
}

// ─── DESIGN TOKENS ────────────────────────────────────────────────────────────
const C = {
  bg: "#020817",
  surface: "#0f172a",
  border: "#1e293b",
  border2: "#334155",
  text: "#f1f5f9",
  muted: "#94a3b8",
  faint: "#475569",
  indigo: "#6366f1",
  indigoBr: "#818cf8",
  green: "#10b981",
  amber: "#f59e0b",
  red: "#ef4444",
  // Light theme
  lBg: "#f8faff",
  lSurface: "#ffffff",
  lBorder: "#e2e8f0",
  lText: "#0f172a",
  lMuted: "#64748b",
};

// ─── SHARED COMPONENTS ────────────────────────────────────────────────────────
function Spinner({ size = 18, color = C.indigo }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round"
      style={{ animation: "spin 0.7s linear infinite" }}>
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  );
}

function AnimBar({ value, color, delay = 0, h = 7, bg = C.border }) {
  const w = useAnimatedBar(value, delay);
  return (
    <div style={{ height: h, borderRadius: 99, background: bg, overflow: "hidden" }}>
      <div style={{ height: "100%", width: `${w}%`, background: color, borderRadius: 99, boxShadow: `0 0 8px ${color}55`, transition: "width 0.95s cubic-bezier(0.34,1.56,0.64,1)" }} />
    </div>
  );
}

function Tag({ children, color = "indigo", size = "sm" }) {
  const palettes = {
    indigo: { bg: "rgba(99,102,241,0.12)", text: "#818cf8", border: "rgba(99,102,241,0.3)" },
    green: { bg: "rgba(16,185,129,0.12)", text: "#34d399", border: "rgba(16,185,129,0.3)" },
    amber: { bg: "rgba(245,158,11,0.12)", text: "#fbbf24", border: "rgba(245,158,11,0.3)" },
    red: { bg: "rgba(239,68,68,0.12)", text: "#f87171", border: "rgba(239,68,68,0.3)" },
    slate: { bg: "rgba(100,116,139,0.12)", text: "#94a3b8", border: "rgba(100,116,139,0.3)" },
  };
  const p = palettes[color] || palettes.indigo;
  const pad = size === "sm" ? "3px 9px" : "5px 13px";
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: pad, borderRadius: 7, background: p.bg, color: p.text, border: `1px solid ${p.border}`, fontSize: size === "sm" ? 11 : 13, fontWeight: 700, lineHeight: 1.4 }}>
      {children}
    </span>
  );
}

// ─── PAGE 1: JOB URL ──────────────────────────────────────────────────────────
function PageJobUrl({ onNext, onJobDescription }) {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [stepText, setStepText] = useState("");

  const steps = ["Parsing job description…", "Extracting requirements…", "Preparing analysis…", "Analyzing keywords…", "Complete!"];

  const handleSubmit = async () => {
    if (!url.trim()) return;
    setLoading(true);
    onJobDescription(url.trim());
    for (let i = 0; i < steps.length; i++) {
      setStepText(steps[i]);
      setProgress(Math.round(((i + 1) / steps.length) * 100));
      await new Promise(r => setTimeout(r, 500));
    }
    await new Promise(r => setTimeout(r, 300));
    onNext();
  };

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #f8faff 0%, #eef2ff 50%, #f0f4ff 100%)", display: "flex", flexDirection: "column" }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeUp { from { opacity:0; transform:translateY(22px); } to { opacity:1; transform:translateY(0); } }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }
        @keyframes shimmer { 0%{background-position:-200% 0} 100%{background-position:200% 0} }
        @keyframes float { 0%,100%{transform:translateY(0px)} 50%{transform:translateY(-8px)} }
        .fadeUp { animation: fadeUp 0.5s ease both; }
        .float { animation: float 3s ease-in-out infinite; }
        * { box-sizing: border-box; }
      `}</style>

      {/* Navbar */}
      <nav style={{ height: 60, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 32px", background: "rgba(255,255,255,0.8)", backdropFilter: "blur(20px)", borderBottom: "1px solid rgba(99,102,241,0.1)", position: "sticky", top: 0, zIndex: 50 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: 10, background: "linear-gradient(135deg,#4f46e5,#6366f1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17, boxShadow: "0 4px 12px rgba(99,102,241,0.35)" }}>🤖</div>
          <span style={{ fontWeight: 900, fontSize: 18, color: "#0f172a", letterSpacing: -0.5 }}>Job<span style={{ color: "#6366f1" }}>Bot</span></span>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          {["Job URL", "Resume", "Analysis", "Cover Letter"].map((s, i) => (
            <span key={s} style={{ fontSize: 12, fontWeight: 700, padding: "4px 12px", borderRadius: 99, background: i === 0 ? "#6366f1" : "transparent", color: i === 0 ? "white" : "#94a3b8" }}>{i + 1}. {s}</span>
          ))}
        </div>
      </nav>

      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "40px 20px" }}>
        <div style={{ width: "100%", maxWidth: 680 }} className="fadeUp">
          {/* Badge */}
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 28 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 16px", borderRadius: 99, background: "white", border: "1px solid rgba(99,102,241,0.2)", boxShadow: "0 2px 12px rgba(99,102,241,0.1)" }}>
              <span style={{ fontSize: 14 }}>✨</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: "#6366f1" }}>AI-Powered Resume Intelligence</span>
            </div>
          </div>

          <h1 style={{ textAlign: "center", fontSize: 48, fontWeight: 900, color: "#0f172a", lineHeight: 1.1, marginBottom: 16, letterSpacing: -1.5 }}>
            Land your{" "}
            <span style={{ background: "linear-gradient(135deg,#4f46e5,#818cf8)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              dream role
            </span>
            <br />with AI precision
          </h1>
          <p style={{ textAlign: "center", color: "#64748b", fontSize: 17, marginBottom: 48, lineHeight: 1.6 }}>
            Paste a job description and let JobBot analyze the role, score your resume,<br />and craft the perfect application.
          </p>

          {/* Main card */}
          <div style={{ background: "white", borderRadius: 24, boxShadow: "0 8px 40px rgba(99,102,241,0.12), 0 1px 4px rgba(0,0,0,0.04)", padding: 32, border: "1px solid rgba(99,102,241,0.08)" }}>
            {!loading ? (
              <>
                <label style={{ fontSize: 13, fontWeight: 700, color: "#374151", display: "block", marginBottom: 10 }}>Paste Job Description</label>
                <textarea
                  value={url} onChange={e => setUrl(e.target.value)}
                  placeholder="Paste the full job description here…"
                  style={{ width: "100%", minHeight: 160, border: "1.5px solid #e2e8f0", borderRadius: 16, padding: "14px 16px", background: "#fafafa", fontSize: 14, color: "#0f172a", fontFamily: "inherit", outline: "none", resize: "vertical", lineHeight: 1.7, transition: "border-color 0.2s" }}
                />
                <button onClick={handleSubmit} disabled={!url.trim()}
                  style={{ width: "100%", marginTop: 14, padding: "15px", borderRadius: 16, border: "none", cursor: url.trim() ? "pointer" : "not-allowed", background: url.trim() ? "linear-gradient(135deg,#4f46e5,#6366f1)" : "#e2e8f0", color: url.trim() ? "white" : "#94a3b8", fontWeight: 800, fontSize: 15, fontFamily: "inherit", boxShadow: url.trim() ? "0 4px 16px rgba(99,102,241,0.35)" : "none", transition: "all 0.2s", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                  ✨ Continue to Resume Upload →
                </button>
              </>
            ) : (
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 16 }}>
                  <div style={{ width: 42, height: 42, borderRadius: 12, background: "#eef2ff", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Spinner color="#6366f1" size={20} />
                  </div>
                  <div>
                    <p style={{ fontWeight: 700, color: "#0f172a", fontSize: 14, marginBottom: 2 }}>{stepText}</p>
                    <p style={{ fontSize: 12, color: "#94a3b8" }}>Extracting job requirements…</p>
                  </div>
                  <span style={{ marginLeft: "auto", fontWeight: 900, color: "#6366f1", fontFamily: "monospace", fontSize: 16 }}>{progress}%</span>
                </div>
                <div style={{ height: 8, background: "#eef2ff", borderRadius: 99, overflow: "hidden" }}>
                  <div style={{ height: "100%", background: "linear-gradient(90deg,#4f46e5,#818cf8)", width: `${progress}%`, transition: "width 0.5s ease", borderRadius: 99 }} />
                </div>
              </div>
            )}
          </div>

          {/* Features */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14, marginTop: 24 }}>
            {[
              { icon: "⚡", title: "Instant Analysis", desc: "Extracts skills & keywords in seconds" },
              { icon: "🛡️", title: "ATS Optimized", desc: "Score against ATS systems" },
              { icon: "✍️", title: "Cover Letter", desc: "AI-generated tailored letters" },
            ].map((f, i) => (
              <div key={i} style={{ background: "white", borderRadius: 16, padding: 18, textAlign: "center", boxShadow: "0 2px 12px rgba(99,102,241,0.07)", border: "1px solid rgba(99,102,241,0.07)", animationDelay: `${i * 100}ms` }} className="fadeUp">
                <div style={{ fontSize: 24, marginBottom: 8 }}>{f.icon}</div>
                <p style={{ fontSize: 13, fontWeight: 800, color: "#0f172a", marginBottom: 4 }}>{f.title}</p>
                <p style={{ fontSize: 11, color: "#94a3b8", lineHeight: 1.5 }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── PAGE 2: RESUME UPLOAD ────────────────────────────────────────────────────
function PageUpload({ onNext, onBack, jobDescription, onAnalysisComplete }) {
  const [file, setFile] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const inputRef = useRef();

  const handleFile = f => {
    if (f && (f.name.endsWith(".pdf") || f.name.endsWith(".docx"))) { setFile(f); setError(""); }
  };

  const handleAnalyze = async () => {
    if (!file) return;
    setLoading(true);
    setError("");
    setProgress(10);
    try {
      const formData = new FormData();
      formData.append("resume", file);
      formData.append("jobDescription", jobDescription);

      setProgress(25);
      const response = await fetch(`${API_BASE}/api/analyze`, {
        method: "POST",
        body: formData,
      });

      setProgress(70);
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Analysis failed");
      }

      const result = await response.json();
      setProgress(100);
      await new Promise(r => setTimeout(r, 400));
      onAnalysisComplete(result.data);
      onNext();
    } catch (err) {
      console.error("API Error:", err);
      setError(err.message || "Failed to analyze. Make sure the backend is running on port 5000.");
      setLoading(false);
      setProgress(0);
    }
  };

  const fmtSize = b => b < 1048576 ? (b / 1024).toFixed(1) + " KB" : (b / 1048576).toFixed(1) + " MB";

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #f8faff 0%, #eef2ff 50%, #f0f4ff 100%)", display: "flex", flexDirection: "column" }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}@keyframes fadeUp{from{opacity:0;transform:translateY(22px)}to{opacity:1;transform:translateY(0)}}.fadeUp{animation:fadeUp 0.5s ease both}*{box-sizing:border-box}`}</style>
      <nav style={{ height: 60, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 32px", background: "rgba(255,255,255,0.8)", backdropFilter: "blur(20px)", borderBottom: "1px solid rgba(99,102,241,0.1)", position: "sticky", top: 0, zIndex: 50 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: 10, background: "linear-gradient(135deg,#4f46e5,#6366f1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17 }}>🤖</div>
          <span style={{ fontWeight: 900, fontSize: 18, color: "#0f172a" }}>Job<span style={{ color: "#6366f1" }}>Bot</span></span>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          {["Job URL", "Resume", "Analysis", "Cover Letter"].map((s, i) => (
            <span key={s} style={{ fontSize: 12, fontWeight: 700, padding: "4px 12px", borderRadius: 99, background: i === 1 ? "#6366f1" : i < 1 ? "#eef2ff" : "transparent", color: i === 1 ? "white" : i < 1 ? "#6366f1" : "#94a3b8" }}>{i + 1}. {s}</span>
          ))}
        </div>
      </nav>

      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "40px 20px" }}>
        <div style={{ width: "100%", maxWidth: 560 }} className="fadeUp">
          <button onClick={onBack} style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", cursor: "pointer", color: "#94a3b8", fontSize: 13, fontWeight: 700, marginBottom: 28, padding: 0, fontFamily: "inherit" }}>
            ← Back
          </button>

          <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 8 }}>
            <div style={{ width: 44, height: 44, borderRadius: 14, background: "linear-gradient(135deg,#4f46e5,#6366f1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, boxShadow: "0 4px 16px rgba(99,102,241,0.35)" }}>📄</div>
            <div>
              <h2 style={{ fontSize: 26, fontWeight: 900, color: "#0f172a", letterSpacing: -0.5 }}>Upload Your Resume</h2>
              <p style={{ fontSize: 13, color: "#94a3b8" }}>PDF or DOCX · Max 10MB</p>
            </div>
          </div>

          <div style={{ background: "white", borderRadius: 24, padding: 32, boxShadow: "0 8px 40px rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.07)", marginTop: 28 }}>
            {!loading ? (
              <>
                <div
                  style={{ border: `2px dashed ${dragging ? "#6366f1" : "#c7d2fe"}`, borderRadius: 18, padding: "44px 20px", textAlign: "center", cursor: "pointer", background: dragging ? "#f0f4ff" : "#fafbff", transition: "all 0.25s" }}
                  onDragOver={e => { e.preventDefault(); setDragging(true); }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={e => { e.preventDefault(); setDragging(false); handleFile(e.dataTransfer.files[0]); }}
                  onClick={() => inputRef.current?.click()}
                >
                  <input ref={inputRef} type="file" accept=".pdf,.docx" style={{ display: "none" }} onChange={e => handleFile(e.target.files[0])} />
                  {file ? (
                    <>
                      <div style={{ fontSize: 44, marginBottom: 10 }}>✅</div>
                      <p style={{ fontWeight: 800, fontSize: 16, color: "#0f172a", marginBottom: 4 }}>{file.name}</p>
                      <p style={{ fontSize: 13, color: "#94a3b8" }}>{fmtSize(file.size)} · Click to change</p>
                    </>
                  ) : (
                    <>
                      <div style={{ fontSize: 44, marginBottom: 10 }}>☁️</div>
                      <p style={{ fontWeight: 700, fontSize: 16, color: "#374151", marginBottom: 6 }}>Drop your resume here</p>
                      <p style={{ fontSize: 13, color: "#94a3b8", marginBottom: 14 }}>or <span style={{ color: "#6366f1", fontWeight: 700 }}>browse files</span></p>
                      <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
                        {["PDF", "DOCX"].map(t => <span key={t} style={{ fontSize: 11, fontWeight: 800, padding: "4px 12px", borderRadius: 8, background: "#eef2ff", color: "#6366f1" }}>{t}</span>)}
                      </div>
                    </>
                  )}
                </div>

                {error && (
                  <div style={{ marginTop: 14, padding: "12px 16px", borderRadius: 12, background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", color: "#ef4444", fontSize: 13, fontWeight: 600 }}>
                    ❌ {error}
                  </div>
                )}

                <button onClick={handleAnalyze} disabled={!file} style={{ width: "100%", marginTop: 18, padding: "15px", borderRadius: 16, border: "none", cursor: file ? "pointer" : "not-allowed", background: file ? "linear-gradient(135deg,#4f46e5,#6366f1)" : "#e2e8f0", color: file ? "white" : "#94a3b8", fontWeight: 800, fontSize: 15, fontFamily: "inherit", boxShadow: file ? "0 4px 20px rgba(99,102,241,0.35)" : "none", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                  ✨ Analyze Resume
                </button>
              </>
            ) : (
              <div style={{ padding: "20px 0", display: "flex", flexDirection: "column", alignItems: "center", gap: 24 }}>
                <div style={{ position: "relative", width: 88, height: 88 }}>
                  <svg width={88} height={88} style={{ transform: "rotate(-90deg)" }}>
                    <circle cx={44} cy={44} r={36} fill="none" stroke="#eef2ff" strokeWidth={8} />
                    <circle cx={44} cy={44} r={36} fill="none" stroke="#6366f1" strokeWidth={8} strokeLinecap="round"
                      strokeDasharray={2 * Math.PI * 36} strokeDashoffset={2 * Math.PI * 36 * (1 - progress / 100)}
                      style={{ transition: "stroke-dashoffset 0.15s ease", filter: "drop-shadow(0 0 6px rgba(99,102,241,0.5))" }} />
                  </svg>
                  <span style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, color: "#6366f1", fontFamily: "monospace", fontSize: 18 }}>{progress}%</span>
                </div>
                <div style={{ textAlign: "center" }}>
                  <p style={{ fontWeight: 800, color: "#0f172a", fontSize: 16, marginBottom: 4 }}>Analyzing your resume…</p>
                  <p style={{ fontSize: 13, color: "#94a3b8" }}>Extracting skills, experience & keywords</p>
                </div>
              </div>
            )}
          </div>

          <div style={{ marginTop: 16, padding: 16, borderRadius: 14, background: "#eef2ff", border: "1px solid rgba(99,102,241,0.15)", display: "flex", gap: 10, alignItems: "flex-start" }}>
            <span style={{ fontSize: 16 }}>🔒</span>
            <p style={{ fontSize: 12, color: "#6366f1", fontWeight: 600, lineHeight: 1.6 }}>Your resume is processed locally and never stored. JobBot only uses it for analysis within this session.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── PAGE 3: ANALYSIS DASHBOARD ───────────────────────────────────────────────
const DASH_NAV = [
  { id: "overview", emoji: "🎯", label: "Match Overview" },
  { id: "skills", emoji: "📊", label: "Skill Gap Intel" },
  { id: "ats", emoji: "🛡️", label: "ATS Optimization" },
  { id: "semantic", emoji: "🔬", label: "Semantic Analysis" },
  { id: "recruiter", emoji: "👤", label: "Recruiter Sim" },
  { id: "strengths", emoji: "⚡", label: "Strengths & Weak." },
  { id: "action", emoji: "🚀", label: "Action Engine" },
];

function CircularMeter({ score, size = 160 }) {
  const sw = 11; const r = (size - sw) / 2;
  const circ = 2 * Math.PI * r;
  const anim = useCountUp(score, 1400, 200);
  const color = score >= 80 ? C.green : score >= 60 ? C.amber : C.red;
  return (
    <div style={{ position: "relative", width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={C.border} strokeWidth={sw} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={sw} strokeLinecap="round"
          strokeDasharray={circ} strokeDashoffset={circ * (1 - anim / 100)}
          style={{ filter: `drop-shadow(0 0 10px ${color}70)`, transition: "stroke-dashoffset 0.04s ease" }} />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <span style={{ fontSize: 40, fontWeight: 900, color: C.text, lineHeight: 1 }}>{anim}</span>
        <span style={{ fontSize: 11, color: C.faint }}>/ 100</span>
      </div>
    </div>
  );
}

const BTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return <div style={{ background: C.border, border: `1px solid ${C.border2}`, borderRadius: 9, padding: "7px 11px", fontSize: 12 }}><p style={{ color: C.text, fontWeight: 700 }}>{label}</p><p style={{ color: C.indigoBr }}>{payload[0].value}%</p></div>;
};

function SectionHead({ emoji, title, subtitle }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18 }}>
      <div style={{ width: 38, height: 38, borderRadius: 12, background: "linear-gradient(135deg,#4f46e5,#818cf8)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, boxShadow: "0 4px 14px rgba(99,102,241,0.35)", flexShrink: 0 }}>{emoji}</div>
      <div>
        <h2 style={{ fontSize: 17, fontWeight: 800, color: C.text, lineHeight: 1 }}>{title}</h2>
        {subtitle && <p style={{ fontSize: 11, color: C.faint, marginTop: 3 }}>{subtitle}</p>}
      </div>
    </div>
  );
}

function DCard({ children, style = {} }) {
  return <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, ...style }}>{children}</div>;
}

function OverviewSection({ d }) {
  const conf = useCountUp(d.confidence, 1000, 500);
  const recColor = { apply: C.green, improve: C.amber, skip: C.red }[d.recommendation];
  const recLabel = { apply: "⚡ Strong Apply", improve: "⚠ Improve First", skip: "✕ Skip Role" }[d.recommendation];

  return (
    <section id="overview" style={{ marginBottom: 36, scrollMarginTop: 16 }}>
      <SectionHead emoji="🎯" title="Match Overview" subtitle="Overall compatibility across 6 weighted dimensions" />
      <div style={{ display: "grid", gridTemplateColumns: "230px 1fr", gap: 14 }}>
        <DCard style={{ padding: 24, display: "flex", flexDirection: "column", alignItems: "center", gap: 18 }}>
          <p style={{ fontSize: 11, color: C.faint, textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 700 }}>Match Score</p>
          <CircularMeter score={d.matchScore} />
          <div style={{ width: "100%" }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 6 }}>
              <span style={{ color: C.muted }}>AI Confidence</span>
              <span style={{ color: C.indigo, fontWeight: 800 }}>{conf}%</span>
            </div>
            <AnimBar value={d.confidence} color={C.indigo} />
          </div>
          <div style={{ width: "100%", padding: "9px 14px", borderRadius: 12, textAlign: "center", background: `${recColor}18`, border: `1px solid ${recColor}35`, color: recColor, fontWeight: 800, fontSize: 13 }}>
            {recLabel}
          </div>
        </DCard>

        <DCard style={{ padding: 24 }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: C.muted, marginBottom: 14 }}>Score Breakdown by Dimension</p>
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <div style={{ width: "52%", minWidth: 0 }}>
              <ResponsiveContainer width="100%" height={200}>
                <RadarChart data={d.scoreBreakdown} margin={{ top: 8, right: 28, bottom: 8, left: 28 }}>
                  <PolarGrid stroke={C.border} />
                  <PolarAngleAxis dataKey="subject" tick={{ fill: C.muted, fontSize: 11, fontWeight: 600 }} />
                  <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
                  <Radar dataKey="value" stroke={C.indigo} fill={C.indigo} fillOpacity={0.18} strokeWidth={2}
                    dot={{ r: 4, fill: C.indigoBr, stroke: C.bg, strokeWidth: 2 }} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 9 }}>
              {d.scoreBreakdown.map((item, i) => {
                const c = item.value >= 80 ? C.green : item.value >= 65 ? C.indigo : C.amber;
                return (
                  <div key={item.subject}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
                      <span style={{ color: C.muted }}>{item.subject}</span>
                      <span style={{ color: c, fontWeight: 800 }}>{item.value}</span>
                    </div>
                    <AnimBar value={item.value} color={c} delay={i * 80} />
                  </div>
                );
              })}
            </div>
          </div>
        </DCard>
      </div>

      {/* Skill chips row */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginTop: 14 }}>
        {[
          { title: "Skills Found in Job", items: d.jobSkills, color: "#818cf8", bg: "rgba(99,102,241,0.1)" },
          { title: "Skills in Your Resume", items: d.resumeSkills, color: "#34d399", bg: "rgba(16,185,129,0.1)" },
          { title: "Missing Skills", items: d.missingSkills, color: "#f87171", bg: "rgba(239,68,68,0.1)" },
        ].map(({ title, items, color, bg }) => (
          <DCard key={title} style={{ padding: 16 }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: C.muted, marginBottom: 12 }}>{title}</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
              {items.map(s => <span key={s} style={{ padding: "3px 9px", borderRadius: 7, background: bg, color, fontSize: 11, fontWeight: 700 }}>{s}</span>)}
            </div>
          </DCard>
        ))}
      </div>
    </section>
  );
}

function SkillsSection({ d }) {
  const [filter, setFilter] = useState("All");
  const rows = filter === "All" ? d.skillGaps : d.skillGaps.filter(r => r.importance === filter);

  const impCfg = { High: { color: "#f87171", bg: "rgba(239,68,68,0.1)", dot: C.red }, Medium: { color: "#fbbf24", bg: "rgba(245,158,11,0.1)", dot: C.amber }, Low: { color: "#94a3b8", bg: "rgba(100,116,139,0.1)", dot: "#64748b" } };
  const foundCfg = { Yes: { color: "#34d399", sym: "✓" }, Partial: { color: "#fbbf24", sym: "◐" }, No: { color: "#f87171", sym: "✕" } };
  const actCfg = { "Add Immediately": { color: "#f87171", bg: "rgba(239,68,68,0.1)", border: "rgba(239,68,68,0.3)" }, "Recommended": { color: "#fbbf24", bg: "rgba(245,158,11,0.1)", border: "rgba(245,158,11,0.3)" }, "Optional": { color: "#94a3b8", bg: "rgba(100,116,139,0.1)", border: "rgba(100,116,139,0.3)" }, "None": { color: "#34d399", bg: "rgba(16,185,129,0.1)", border: "rgba(16,185,129,0.3)" } };

  return (
    <section id="skills" style={{ marginBottom: 36, scrollMarginTop: 16 }}>
      <SectionHead emoji="📊" title="Skill Gap Intelligence" subtitle="Skill-by-skill match analysis with priority actions" />
      <DCard>
        <div style={{ display: "flex", gap: 8, padding: "12px 16px", borderBottom: `1px solid ${C.border}`, flexWrap: "wrap", alignItems: "center" }}>
          {["All", "High", "Medium", "Low"].map(f => (
            <button key={f} onClick={() => setFilter(f)} style={{ padding: "5px 14px", borderRadius: 8, border: "none", cursor: "pointer", fontWeight: 700, fontSize: 12, fontFamily: "inherit", background: filter === f ? C.indigo : C.border, color: filter === f ? "white" : C.faint, transition: "all 0.2s" }}>{f}</button>
          ))}
          <span style={{ marginLeft: "auto", fontSize: 12, color: C.faint }}>{rows.length} skills</span>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr style={{ borderBottom: `1px solid ${C.border}` }}>
              {["Skill", "Importance", "Found in Resume", "Priority Action"].map(h => (
                <th key={h} style={{ padding: "10px 16px", textAlign: "left", fontSize: 11, color: C.faint, textTransform: "uppercase", letterSpacing: "0.07em", fontWeight: 700 }}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {rows.map(row => {
                const ic = impCfg[row.importance], fc = foundCfg[row.found], ac = actCfg[row.action];
                return (
                  <tr key={row.skill} style={{ borderBottom: `1px solid rgba(30,41,59,0.5)`, cursor: "default" }}
                    onMouseEnter={e => e.currentTarget.style.background = "rgba(30,41,59,0.35)"}
                    onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                    <td style={{ padding: "11px 16px", fontSize: 13, fontWeight: 700, color: C.text }}>{row.skill}</td>
                    <td style={{ padding: "11px 16px" }}>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "3px 10px", borderRadius: 7, background: ic.bg, color: ic.color, fontSize: 11, fontWeight: 700 }}>
                        <span style={{ width: 6, height: 6, borderRadius: "50%", background: ic.dot, display: "inline-block" }} />
                        {row.importance}
                      </span>
                    </td>
                    <td style={{ padding: "11px 16px" }}>
                      <span style={{ color: fc.color, fontWeight: 800, fontSize: 14, display: "flex", alignItems: "center", gap: 5 }}>
                        <span>{fc.sym}</span><span style={{ fontSize: 13 }}>{row.found}</span>
                      </span>
                    </td>
                    <td style={{ padding: "11px 16px" }}>
                      <span style={{ padding: "3px 10px", borderRadius: 7, background: ac.bg, color: ac.color, border: `1px solid ${ac.border}`, fontSize: 11, fontWeight: 700 }}>{row.action}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </DCard>
    </section>
  );
}

function ATSSection({ d }) {
  const ats = d.ats;
  const s1 = useCountUp(ats.score, 1200, 300);
  const s2 = useCountUp(ats.keywordDensity, 1200, 420);
  const s3 = useCountUp(ats.bulletQuality, 1200, 540);

  return (
    <section id="ats" style={{ marginBottom: 36, scrollMarginTop: 16 }}>
      <SectionHead emoji="🛡️" title="ATS Optimization Panel" subtitle="Applicant Tracking System compatibility audit" />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
            {[["ATS Score", s1, ats.score, ats.score >= 80 ? C.green : C.amber], ["Keyword Density", s2, ats.keywordDensity, C.indigo], ["Bullet Quality", s3, ats.bulletQuality, "#8b5cf6"]].map(([label, val, raw, color]) => (
              <DCard key={label} style={{ padding: 16, textAlign: "center", display: "flex", flexDirection: "column", gap: 8 }}>
                <span style={{ fontSize: 29, fontWeight: 900, color, lineHeight: 1 }}>{val}<span style={{ fontSize: 14 }}>%</span></span>
                <AnimBar value={raw} color={color} />
                <span style={{ fontSize: 10, color: C.faint, fontWeight: 700 }}>{label}</span>
              </DCard>
            ))}
          </div>
          <DCard style={{ padding: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <div>
                <p style={{ fontSize: 10, color: C.faint, textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 700, marginBottom: 4 }}>Resume Length</p>
                <p style={{ fontSize: 22, fontWeight: 900, color: C.text }}>{ats.resumeLength.pages} <span style={{ fontSize: 13, color: C.faint }}>pages</span></p>
              </div>
              <span style={{ padding: "5px 12px", borderRadius: 8, background: "rgba(16,185,129,0.12)", color: "#34d399", border: "1px solid rgba(16,185,129,0.3)", fontWeight: 700, fontSize: 12 }}>✓ {ats.resumeLength.status}</span>
            </div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {[["1pg", "Entry", "#475569"], ["1–2pg", "Ideal ✓", "#6366f1"], ["3+pg", "Too Long", "#475569"]].map(([l, s, c]) => (
                <span key={l} style={{ padding: "2px 8px", borderRadius: 6, background: c === "#6366f1" ? "rgba(99,102,241,0.2)" : C.border, color: c, fontSize: 11, fontWeight: 600, border: c === "#6366f1" ? "1px solid rgba(99,102,241,0.4)" : "none" }}>{l} = {s}</span>
              ))}
            </div>
          </DCard>
          <DCard style={{ padding: 16 }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: C.muted, marginBottom: 10 }}>🔴 Missing High-Priority Keywords</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
              {ats.missingKeywords.map(kw => (
                <span key={kw} style={{ padding: "3px 10px", borderRadius: 8, background: "rgba(239,68,68,0.1)", color: "#f87171", border: "1px solid rgba(239,68,68,0.25)", fontSize: 11, fontWeight: 700 }}>{kw}</span>
              ))}
            </div>
          </DCard>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <DCard style={{ padding: 20, flex: 1 }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: C.muted, marginBottom: 14 }}>⚠️ Formatting Issues ({ats.formattingIssues.length} detected)</p>
            {ats.formattingIssues.map((issue, i) => (
              <div key={i} style={{ display: "flex", gap: 10, padding: "10px 12px", borderRadius: 10, background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.2)", marginBottom: 8, alignItems: "flex-start" }}>
                <span style={{ color: "#fbbf24", fontSize: 14, flexShrink: 0 }}>⚠</span>
                <span style={{ fontSize: 12, color: "#fcd34d", lineHeight: 1.5 }}>{issue}</span>
              </div>
            ))}
          </DCard>
          <DCard style={{ padding: 20 }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: C.muted, marginBottom: 12 }}>ATS Sub-score Breakdown</p>
            {[["Keyword Match", 67, C.indigo], ["Format Clarity", 88, C.green], ["Section Headers", 75, "#8b5cf6"], ["Readability", 91, C.green], ["File Format", 100, C.green]].map(([l, v, c], i) => (
              <div key={l} style={{ marginBottom: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
                  <span style={{ color: C.muted }}>{l}</span>
                  <span style={{ color: c, fontWeight: 700 }}>{v}%</span>
                </div>
                <AnimBar value={v} color={c} delay={i * 100} h={6} />
              </div>
            ))}
          </DCard>
        </div>
      </div>
    </section>
  );
}

function SemanticSection({ d }) {
  const sem = d.semantic;
  const cosInt = useCountUp(743, 1300, 300);

  return (
    <section id="semantic" style={{ marginBottom: 36, scrollMarginTop: 16 }}>
      <SectionHead emoji="🔬" title="Semantic Similarity" subtitle="NLP cosine similarity — how closely your resume language mirrors the job description" />
      <div style={{ display: "grid", gridTemplateColumns: "210px 1fr", gap: 14 }}>
        <DCard style={{ padding: 24, display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 46, fontWeight: 900, color: C.indigo, letterSpacing: -2, lineHeight: 1 }}>0.{String(cosInt).padStart(3, "0")}</div>
            <p style={{ fontSize: 12, color: C.faint, marginTop: 6, fontWeight: 600 }}>Cosine Similarity</p>
            <p style={{ fontSize: 10, color: C.border2, marginTop: 3 }}>0.0 = no match · 1.0 = identical</p>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, paddingTop: 16, borderTop: `1px solid ${C.border}` }}>
            {[
              { label: "Most Relevant", value: sem.mostRelevant, color: "#34d399", bg: "rgba(16,185,129,0.05)", border: "rgba(16,185,129,0.2)", em: "⭐" },
              { label: "Least Relevant", value: sem.leastRelevant, color: "#f87171", bg: "rgba(239,68,68,0.05)", border: "rgba(239,68,68,0.2)", em: "📉" },
            ].map(it => (
              <div key={it.label} style={{ padding: "12px 14px", borderRadius: 12, background: it.bg, border: `1px solid ${it.border}` }}>
                <p style={{ fontSize: 10, color: C.faint, fontWeight: 700, marginBottom: 4 }}>{it.em} {it.label}</p>
                <p style={{ fontSize: 13, fontWeight: 800, color: it.color }}>{it.value}</p>
              </div>
            ))}
          </div>
        </DCard>
        <DCard style={{ padding: 24 }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: C.muted, marginBottom: 16 }}>Section-wise Relevance Score</p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={sem.sections} margin={{ top: 0, right: 10, left: -20, bottom: 0 }} barSize={28}>
              <CartesianGrid strokeDasharray="3 3" stroke={C.border} vertical={false} />
              <XAxis dataKey="name" tick={{ fill: C.faint, fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: C.faint, fontSize: 10 }} axisLine={false} tickLine={false} domain={[0, 100]} />
              <Tooltip content={<BTooltip />} cursor={{ fill: "rgba(99,102,241,0.05)" }} />
              <Bar dataKey="score" radius={[6, 6, 0, 0]}>
                {sem.sections.map((s, i) => <Cell key={i} fill={s.score >= 75 ? C.indigo : s.score >= 50 ? C.indigoBr : C.border2} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </DCard>
      </div>
    </section>
  );
}

function RecruiterSection({ d }) {
  const rec = d.recruiter;
  const prob = useCountUp(rec.shortlistProb, 1300, 300);
  const color = prob >= 75 ? C.green : prob >= 50 ? C.amber : C.red;
  const vLabel = { Yes: "✓ Will Shortlist", Maybe: "? Likely to Shortlist", No: "✕ Unlikely" }[rec.verdict];
  const vColor = { Yes: "#34d399", Maybe: "#fbbf24", No: "#f87171" }[rec.verdict];

  return (
    <section id="recruiter" style={{ marginBottom: 36, scrollMarginTop: 16 }}>
      <SectionHead emoji="👤" title="Recruiter Simulation" subtitle="AI simulating a senior recruiter's 6-second resume scan decision" />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <DCard style={{ padding: 24 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
            <div>
              <p style={{ fontSize: 11, color: C.faint, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8 }}>Shortlist Probability</p>
              <div style={{ fontSize: 52, fontWeight: 900, color, lineHeight: 1 }}>{prob}<span style={{ fontSize: 22 }}>%</span></div>
            </div>
            <span style={{ padding: "7px 14px", borderRadius: 10, background: `${vColor}18`, color: vColor, border: `1px solid ${vColor}35`, fontWeight: 800, fontSize: 12 }}>{vLabel}</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: C.faint }}>
              <span>Shortlist likelihood</span><span style={{ color, fontWeight: 700 }}>{prob}%</span>
            </div>
            <div style={{ height: 12, borderRadius: 99, background: C.border, overflow: "hidden" }}>
              <div style={{ height: "100%", borderRadius: 99, width: `${prob}%`, background: `linear-gradient(90deg,${color}88,${color})`, boxShadow: `0 0 10px ${color}50`, transition: "width 1.2s cubic-bezier(0.34,1.56,0.64,1)" }} />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: C.border2, fontWeight: 700 }}>
              <span>0%</span><span>50%</span><span>100%</span>
            </div>
          </div>
          <div style={{ marginTop: 18, padding: 14, borderRadius: 12, background: C.border, fontSize: 12, color: C.faint, lineHeight: 1.6 }}>
            <strong style={{ color: C.muted }}>Model basis:</strong> Trained on 10,000+ recruiter decisions weighted by seniority level, industry, and keyword density.
          </div>
        </DCard>
        <DCard style={{ padding: 20 }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: C.muted, marginBottom: 14 }}>🚨 Key Risk Factors</p>
          {rec.risks.map((r, i) => (
            <div key={i} style={{ display: "flex", gap: 10, padding: "10px 12px", borderRadius: 10, background: C.border, marginBottom: 8, alignItems: "flex-start" }}>
              <span style={{ width: 22, height: 22, borderRadius: "50%", background: "rgba(239,68,68,0.18)", border: "1px solid rgba(239,68,68,0.3)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 10, fontWeight: 900, color: "#f87171", lineHeight: 1 }}>{i + 1}</span>
              <span style={{ fontSize: 12, color: C.muted, lineHeight: 1.55 }}>{r}</span>
            </div>
          ))}
        </DCard>
      </div>
    </section>
  );
}

function StrengthsSection({ d }) {
  return (
    <section id="strengths" style={{ marginBottom: 36, scrollMarginTop: 16 }}>
      <SectionHead emoji="⚡" title="Strengths & Weaknesses" subtitle="Qualitative resume quality assessment" />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <div>
          <p style={{ fontSize: 11, fontWeight: 800, color: "#34d399", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ width: 7, height: 7, borderRadius: "50%", background: C.green, display: "inline-block" }} /> Strengths
          </p>
          {d.strengths.map((s, i) => (
            <div key={i} style={{ marginBottom: 10, padding: "14px 16px", borderRadius: 14, background: "linear-gradient(135deg,rgba(5,46,22,0.7),rgba(15,23,42,0.9))", border: "1px solid rgba(16,185,129,0.2)", transition: "border-color 0.2s" }}
              onMouseEnter={e => e.currentTarget.style.borderColor = "rgba(16,185,129,0.45)"}
              onMouseLeave={e => e.currentTarget.style.borderColor = "rgba(16,185,129,0.2)"}>
              <p style={{ fontSize: 13, fontWeight: 800, color: "#86efac", marginBottom: 5, display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ width: 20, height: 20, borderRadius: 7, background: "rgba(16,185,129,0.2)", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 11, flexShrink: 0 }}>✓</span>
                {s.title}
              </p>
              <p style={{ fontSize: 12, color: C.faint, lineHeight: 1.55, paddingLeft: 28 }}>{s.detail}</p>
            </div>
          ))}
        </div>
        <div>
          <p style={{ fontSize: 11, fontWeight: 800, color: "#f87171", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ width: 7, height: 7, borderRadius: "50%", background: C.red, display: "inline-block" }} /> Areas to Improve
          </p>
          {d.weaknesses.map((w, i) => (
            <div key={i} style={{ marginBottom: 10, padding: "14px 16px", borderRadius: 14, background: "linear-gradient(135deg,rgba(45,10,10,0.7),rgba(15,23,42,0.9))", border: "1px solid rgba(239,68,68,0.2)", transition: "border-color 0.2s" }}
              onMouseEnter={e => e.currentTarget.style.borderColor = "rgba(239,68,68,0.45)"}
              onMouseLeave={e => e.currentTarget.style.borderColor = "rgba(239,68,68,0.2)"}>
              <p style={{ fontSize: 13, fontWeight: 800, color: "#fca5a5", marginBottom: 5, display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ width: 20, height: 20, borderRadius: 7, background: "rgba(239,68,68,0.2)", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 11, flexShrink: 0 }}>!</span>
                {w.title}
              </p>
              <p style={{ fontSize: 12, color: C.faint, lineHeight: 1.55, paddingLeft: 28 }}>{w.detail}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function ActionSection({ d, onGenerateCover }) {
  const improved = useCountUp(Math.min(d.matchScore + d.estimatedImprovement, 100), 1400, 500);
  const canApply = d.recommendation === "apply";
  const opts = [
    { key: "skip", label: "Skip This Role", color: C.red, bg: "rgba(45,10,10,0.8)", desc: "Profile mismatch is significant. Focus on better-matching roles." },
    { key: "improve", label: "Improve Resume First", color: C.amber, bg: "rgba(41,26,2,0.8)", desc: "Strong potential — fix identified gaps to boost score ~18 points." },
    { key: "apply", label: "Strong Apply", color: C.green, bg: "rgba(2,26,14,0.8)", desc: "Resume aligns well. Apply with confidence — core stack matches." },
  ];

  return (
    <section id="action" style={{ marginBottom: 36, scrollMarginTop: 16 }}>
      <SectionHead emoji="🚀" title="Action Recommendation Engine" subtitle="AI-powered strategy synthesizing all 7 analysis dimensions" />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 14 }}>
        {opts.map(o => {
          const active = d.recommendation === o.key;
          return (
            <div key={o.key} style={{ padding: 20, borderRadius: 16, border: `2px solid ${active ? o.color : C.border}`, background: active ? o.bg : C.surface, transform: active ? "scale(1.03)" : "scale(1)", boxShadow: active ? `0 0 28px ${o.color}20` : "none", transition: "all 0.3s" }}>
              {active && <div style={{ fontSize: 9, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.12em", color: o.color, background: `${o.color}20`, padding: "3px 9px", borderRadius: 99, display: "inline-block", marginBottom: 10 }}>● AI Recommendation</div>}
              <p style={{ fontSize: 16, fontWeight: 900, color: active ? o.color : C.border2, marginBottom: 8, lineHeight: 1.2 }}>{o.label}</p>
              <p style={{ fontSize: 12, lineHeight: 1.6, color: active ? C.muted : C.border }}>{o.desc}</p>
            </div>
          );
        })}
      </div>

      <DCard style={{ padding: 24, marginBottom: 14 }}>
        <p style={{ fontSize: 13, fontWeight: 700, color: C.muted, marginBottom: 20 }}>📈 Estimated Score After All Suggested Fixes</p>
        <div style={{ display: "flex", alignItems: "center", gap: 32, flexWrap: "wrap" }}>
          <div style={{ textAlign: "center" }}>
            <p style={{ fontSize: 11, color: C.faint, fontWeight: 700, marginBottom: 6 }}>Current</p>
            <span style={{ fontSize: 46, fontWeight: 900, color: C.amber, lineHeight: 1 }}>{d.matchScore}</span>
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 26, color: C.indigoBr }}>→</div>
            <p style={{ fontSize: 12, fontWeight: 800, color: C.indigoBr }}>+{d.estimatedImprovement}pts</p>
          </div>
          <div style={{ textAlign: "center" }}>
            <p style={{ fontSize: 11, color: C.faint, fontWeight: 700, marginBottom: 6 }}>After Fixes</p>
            <span style={{ fontSize: 46, fontWeight: 900, color: C.green, lineHeight: 1 }}>{improved}</span>
          </div>
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: C.faint, marginBottom: 8 }}>
              <span>Score progression</span>
              <span style={{ color: C.green, fontWeight: 700 }}>+{d.estimatedImprovement} pts available</span>
            </div>
            <div style={{ position: "relative", height: 14, borderRadius: 99, background: C.border, overflow: "hidden" }}>
              <div style={{ position: "absolute", height: "100%", borderRadius: 99, width: `${d.matchScore}%`, background: C.amber }} />
              <div style={{ position: "absolute", left: `${d.matchScore}%`, height: "100%", borderRadius: 99, width: `${d.estimatedImprovement}%`, background: "rgba(16,185,129,0.55)" }} />
            </div>
            <p style={{ fontSize: 11, color: C.faint, lineHeight: 1.5, marginTop: 8 }}>Fix the 3 "Add Immediately" skills + 2 formatting issues to unlock this gain.</p>
          </div>
        </div>
      </DCard>

      <button onClick={canApply ? onGenerateCover : undefined} style={{ width: "100%", padding: "16px", borderRadius: 16, border: `2px solid ${canApply ? C.green : C.border}`, cursor: canApply ? "pointer" : "not-allowed", background: canApply ? "linear-gradient(135deg,#059669,#10b981)" : C.surface, color: canApply ? "white" : C.faint, fontWeight: 800, fontSize: 15, fontFamily: "inherit", boxShadow: canApply ? "0 4px 20px rgba(16,185,129,0.35)" : "none", display: "flex", alignItems: "center", justifyContent: "center", gap: 10, transition: "all 0.2s" }}>
        ✍️ Generate Cover Letter{!canApply && " (Improve resume score first)"}
      </button>
    </section>
  );
}

function PageAnalysis({ onNext, onBack, analysisData }) {
  const [active, setActive] = useState("overview");
  const [sideOpen, setSideOpen] = useState(false);
  // Use real API data, falling back to MOCK_ANALYSIS for safety
  const d = analysisData || MOCK_ANALYSIS;
  const recColor = { apply: C.green, improve: C.amber, skip: C.red }[d.recommendation];

  const scrollTo = id => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
    setActive(id);
    setSideOpen(false);
  };

  useEffect(() => {
    const obs = new IntersectionObserver(
      entries => entries.forEach(e => { if (e.isIntersecting) setActive(e.target.id); }),
      { threshold: 0.2, rootMargin: "-60px 0px -50% 0px" }
    );
    DASH_NAV.forEach(({ id }) => { const el = document.getElementById(id); if (el) obs.observe(el); });
    return () => obs.disconnect();
  }, []);

  return (
    <div style={{ minHeight: "100vh", background: C.bg, display: "flex", flexDirection: "column" }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}@keyframes fadeUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}*{box-sizing:border-box}::-webkit-scrollbar{width:4px}::-webkit-scrollbar-track{background:${C.bg}}::-webkit-scrollbar-thumb{background:${C.border};border-radius:4px}`}</style>

      {/* Top nav */}
      <header style={{ position: "sticky", top: 0, zIndex: 50, height: 56, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 20px", background: "rgba(2,8,23,0.96)", backdropFilter: "blur(20px)", borderBottom: `1px solid ${C.border}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button onClick={() => setSideOpen(v => !v)} style={{ background: C.border, border: "none", cursor: "pointer", color: C.muted, padding: "6px 8px", borderRadius: 8, fontSize: 16, lineHeight: 1, fontFamily: "inherit" }}>
            {sideOpen ? "✕" : "☰"}
          </button>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 30, height: 30, borderRadius: 9, background: "linear-gradient(135deg,#4f46e5,#6366f1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, boxShadow: "0 0 14px rgba(99,102,241,0.4)" }}>🤖</div>
            <span style={{ fontWeight: 900, fontSize: 17, color: C.text }}>Job<span style={{ color: C.indigo }}>Bot</span></span>
          </div>
        </div>
        <div style={{ fontSize: 12, color: C.muted, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "42%", padding: "5px 12px", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8 }}>
          <span style={{ color: C.green, marginRight: 6 }}>●</span>{d.job}
        </div>
        <div style={{ padding: "5px 13px", borderRadius: 20, fontSize: 12, fontWeight: 800, background: `${recColor}15`, color: recColor, border: `1px solid ${recColor}30`, whiteSpace: "nowrap" }}>
          {d.matchScore}% Match
        </div>
      </header>

      <div style={{ display: "flex", flex: 1 }}>
        {/* Overlay */}
        {sideOpen && <div onClick={() => setSideOpen(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 30 }} />}

        {/* Sidebar */}
        <aside style={{ position: "fixed", top: 56, bottom: 0, left: 0, width: 216, zIndex: 40, background: C.bg, borderRight: `1px solid ${C.border}`, display: "flex", flexDirection: "column", transform: sideOpen ? "translateX(0)" : "translateX(-100%)", transition: "transform 0.3s ease" }}>
          <div style={{ flex: 1, overflowY: "auto", padding: "16px 12px" }}>
            <p style={{ fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.12em", color: C.border2, padding: "0 10px", marginBottom: 10 }}>Sections</p>
            {DASH_NAV.map(item => (
              <button key={item.id} onClick={() => scrollTo(item.id)} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", borderRadius: 10, border: "none", cursor: "pointer", fontFamily: "inherit", fontSize: 13, fontWeight: 600, width: "100%", textAlign: "left", marginBottom: 2, transition: "all 0.2s", background: active === item.id ? "rgba(99,102,241,0.15)" : "transparent", color: active === item.id ? C.indigoBr : C.faint, borderLeft: `2px solid ${active === item.id ? C.indigo : "transparent"}` }}>
                <span style={{ fontSize: 15 }}>{item.emoji}</span>{item.label}
              </button>
            ))}
          </div>
          <div style={{ margin: 12, padding: 14, borderRadius: 14, background: C.surface, border: `1px solid ${C.border}` }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: C.muted, marginBottom: 10 }}>📊 Quick Stats</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {[["Match", `${d.matchScore}%`, C.indigo], ["ATS", `${d.ats.score}%`, C.green], ["Conf.", `${d.confidence}%`, "#8b5cf6"], ["HR", `${d.recruiter.shortlistProb}%`, C.amber]].map(([l, v, c]) => (
                <div key={l} style={{ textAlign: "center", padding: "8px 4px", borderRadius: 8, background: C.border }}>
                  <div style={{ fontSize: 16, fontWeight: 900, color: c, lineHeight: 1 }}>{v}</div>
                  <div style={{ fontSize: 10, color: C.faint, marginTop: 2, fontWeight: 700 }}>{l}</div>
                </div>
              ))}
            </div>
          </div>
        </aside>

        {/* Main */}
        <main style={{ flex: 1, padding: "28px 24px", maxWidth: 1080, margin: "0 auto", width: "100%" }}>
          <div style={{ marginBottom: 28, paddingBottom: 22, borderBottom: `1px solid ${C.border}` }}>
            <button onClick={onBack} style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", cursor: "pointer", color: C.faint, fontSize: 12, fontWeight: 700, marginBottom: 16, padding: 0, fontFamily: "inherit" }}>← Back</button>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "4px 12px", borderRadius: 99, background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.25)", marginBottom: 12 }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: C.indigo, display: "inline-block", animation: "pulse 2s infinite" }} />
              <span style={{ fontSize: 11, fontWeight: 700, color: C.indigoBr, letterSpacing: "0.05em" }}>AI Analysis Complete · 7 Dimensions</span>
            </div>
            <h1 style={{ fontSize: 26, fontWeight: 900, color: C.text, marginBottom: 6 }}>Resume Intelligence Report</h1>
            <p style={{ fontSize: 13, color: C.faint }}>Analyzing: <span style={{ color: C.indigoBr, fontWeight: 700 }}>{d.job}</span></p>
          </div>

          <OverviewSection d={d} />
          <SkillsSection d={d} />
          <ATSSection d={d} />
          <SemanticSection d={d} />
          <RecruiterSection d={d} />
          <StrengthsSection d={d} />
          <ActionSection d={d} onGenerateCover={onNext} />
          <div style={{ height: 60 }} />
        </main>
      </div>
    </div>
  );
}

// ─── PAGE 4: COVER LETTER ─────────────────────────────────────────────────────
function PageCoverLetter({ onBack, coverLetterText }) {
  const letterContent = coverLetterText || MOCK_COVER_LETTER;
  const [text, setText] = useState("");
  const [done, setDone] = useState(false);
  const [copied, setCopied] = useState(false);
  const charRef = useRef(0);

  useEffect(() => {
    let cancelled = false;
    charRef.current = 0;
    setText("");
    setDone(false);
    const delay = setTimeout(() => {
      const interval = setInterval(() => {
        if (cancelled) return clearInterval(interval);
        charRef.current = Math.min(charRef.current + 5, letterContent.length);
        setText(letterContent.slice(0, charRef.current));
        if (charRef.current >= letterContent.length) {
          clearInterval(interval);
          setDone(true);
        }
      }, 20);
    }, 600);
    return () => { cancelled = true; clearTimeout(delay); };
  }, [letterContent]);

  const handleCopy = () => {
    navigator.clipboard?.writeText(text).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2500); });
  };

  const handleDownload = () => {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([text], { type: "text/plain" }));
    a.download = "cover-letter-jobbot.txt";
    a.click();
  };

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #f8faff 0%, #eef2ff 50%, #f0f4ff 100%)", display: "flex", flexDirection: "column" }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}@keyframes fadeUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}.fadeUp{animation:fadeUp 0.5s ease both}*{box-sizing:border-box}@keyframes blink{0%,100%{opacity:1}50%{opacity:0}}`}</style>

      <nav style={{ height: 60, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 32px", background: "rgba(255,255,255,0.8)", backdropFilter: "blur(20px)", borderBottom: "1px solid rgba(99,102,241,0.1)", position: "sticky", top: 0, zIndex: 50 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: 10, background: "linear-gradient(135deg,#4f46e5,#6366f1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17 }}>🤖</div>
          <span style={{ fontWeight: 900, fontSize: 18, color: "#0f172a" }}>Job<span style={{ color: "#6366f1" }}>Bot</span></span>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          {["Job URL", "Resume", "Analysis", "Cover Letter"].map((s, i) => (
            <span key={s} style={{ fontSize: 12, fontWeight: 700, padding: "4px 12px", borderRadius: 99, background: i === 3 ? "#6366f1" : i < 3 ? "#eef2ff" : "transparent", color: i === 3 ? "white" : i < 3 ? "#6366f1" : "#94a3b8" }}>{i + 1}. {s}</span>
          ))}
        </div>
      </nav>

      <div style={{ flex: 1, display: "flex", justifyContent: "center", padding: "40px 20px" }}>
        <div style={{ width: "100%", maxWidth: 740 }} className="fadeUp">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
            <div>
              <button onClick={onBack} style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", cursor: "pointer", color: "#94a3b8", fontSize: 12, fontWeight: 700, marginBottom: 10, padding: 0, fontFamily: "inherit" }}>← Back to Dashboard</button>
              <h2 style={{ fontSize: 26, fontWeight: 900, color: "#0f172a", letterSpacing: -0.5 }}>AI Cover Letter</h2>
              <p style={{ fontSize: 13, color: "#94a3b8", marginTop: 3 }}>Personalized for Senior Full-Stack Engineer role</p>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 14px", borderRadius: 12, background: done ? "rgba(16,185,129,0.1)" : "rgba(99,102,241,0.1)", border: `1px solid ${done ? "rgba(16,185,129,0.3)" : "rgba(99,102,241,0.3)"}` }}>
              {!done ? <Spinner size={14} color="#6366f1" /> : <span style={{ fontSize: 14 }}>✅</span>}
              <span style={{ fontSize: 12, fontWeight: 700, color: done ? "#059669" : "#6366f1" }}>{done ? "Ready" : "Generating…"}</span>
            </div>
          </div>

          <div style={{ background: "white", borderRadius: 24, boxShadow: "0 8px 40px rgba(99,102,241,0.12)", border: "1px solid rgba(99,102,241,0.08)", overflow: "hidden" }}>
            {/* Window chrome */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 20px", background: "#f8faff", borderBottom: "1px solid #e2e8f0" }}>
              <div style={{ display: "flex", gap: 7 }}>
                {["#ff5f57", "#febc2e", "#28c840"].map((c, i) => <div key={i} style={{ width: 12, height: 12, borderRadius: "50%", background: c }} />)}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "#94a3b8", fontFamily: "monospace" }}>
                📄 cover-letter.txt
              </div>
              <span style={{ fontSize: 11, color: "#94a3b8", fontFamily: "monospace" }}>{text.length} chars</span>
            </div>
            <div style={{ position: "relative" }}>
              <textarea
                value={text}
                onChange={e => setText(e.target.value)}
                style={{ width: "100%", height: 400, padding: "24px 28px", border: "none", outline: "none", resize: "none", fontSize: 13.5, lineHeight: 1.8, color: "#1e293b", fontFamily: "'Courier New', monospace", background: "white" }}
                placeholder="Generating your cover letter…"
              />
              {!done && <span style={{ position: "absolute", bottom: 24, left: 28, width: 2, height: 18, background: "#6366f1", display: "inline-block", animation: "blink 1s infinite" }} />}
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginTop: 16 }}>
            <button onClick={handleCopy} disabled={!done} style={{ padding: "14px", borderRadius: 14, border: "1.5px solid rgba(99,102,241,0.3)", cursor: done ? "pointer" : "not-allowed", background: "white", color: "#6366f1", fontWeight: 800, fontSize: 13, fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, opacity: done ? 1 : 0.5, transition: "all 0.2s" }}>
              {copied ? "✅ Copied!" : "📋 Copy"}
            </button>
            <button onClick={handleDownload} disabled={!done} style={{ padding: "14px", borderRadius: 14, border: "none", cursor: done ? "pointer" : "not-allowed", background: "linear-gradient(135deg,#4f46e5,#6366f1)", color: "white", fontWeight: 800, fontSize: 13, fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, opacity: done ? 1 : 0.5, boxShadow: "0 4px 16px rgba(99,102,241,0.35)", transition: "all 0.2s" }}>
              ⬇️ Download TXT
            </button>
            <button onClick={onBack} style={{ padding: "14px", borderRadius: 14, border: "1.5px solid #e2e8f0", cursor: "pointer", background: "white", color: "#64748b", fontWeight: 800, fontSize: 13, fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
              ← Dashboard
            </button>
          </div>

          <div style={{ marginTop: 16, padding: 16, borderRadius: 14, background: "#eef2ff", border: "1px solid rgba(99,102,241,0.15)" }}>
            <p style={{ fontSize: 12, color: "#6366f1", fontWeight: 600, lineHeight: 1.6 }}>
              💡 <strong>Pro tip:</strong> The text area is fully editable — add your personal research about the company or unique achievements before sending.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── ROOT APP ─────────────────────────────────────────────────────────────────
export default function App() {
  const [page, setPage] = useState("url");
  const [jobDescription, setJobDescription] = useState("");
  const [analysisData, setAnalysisData] = useState(null);

  const go = to => {
    window.scrollTo({ top: 0, behavior: "smooth" });
    setTimeout(() => setPage(to), 60);
  };

  // Transform API data to match the dashboard's expected shape
  const transformData = (apiData) => {
    if (!apiData) return null;
    const score = apiData.matchScore || 0;
    const bd = apiData.scoreBreakdown || {};
    return {
      job: apiData.jobUnderstanding?.roleExpectations?.[0] || "Target Role",
      matchScore: score,
      confidence: Math.min(score + 14, 100),
      estimatedImprovement: Math.min(100 - score, 20),
      recommendation: (apiData.recommendation || "Improve").toLowerCase(),
      scoreBreakdown: [
        { subject: "Skills", value: bd.skills || 0 },
        { subject: "Experience", value: bd.experience || 0 },
        { subject: "Projects", value: bd.projects || 0 },
        { subject: "ATS", value: bd.ats || 0 },
        { subject: "Education", value: bd.education || 0 },
        { subject: "Soft Skills", value: Math.round(score * 0.7) },
      ],
      jobSkills: apiData.jobUnderstanding?.skills || [],
      resumeSkills: (apiData.jobUnderstanding?.skills || []).filter(s => !(apiData.resumeAnalysis?.missingSkills || []).includes(s)),
      missingSkills: apiData.resumeAnalysis?.missingSkills || [],
      skillGaps: (apiData.jobUnderstanding?.skills || []).map(skill => {
        const missing = (apiData.resumeAnalysis?.missingSkills || []).includes(skill);
        return {
          skill,
          importance: "High",
          found: missing ? "No" : "Yes",
          action: missing ? "Add Immediately" : "None",
        };
      }),
      ats: {
        score: bd.ats || 75,
        keywordDensity: Math.round((bd.ats || 70) * 0.85),
        bulletQuality: Math.round((bd.ats || 70) * 0.9),
        resumeLength: { pages: 1.5, status: "Optimal" },
        formattingIssues: (apiData.resumeAnalysis?.weakBullets || []).slice(0, 3).map(b => b.issue || b),
        missingKeywords: (apiData.resumeAnalysis?.missingSkills || []).slice(0, 6),
      },
      semantic: {
        cosine: score / 100 * 0.95,
        mostRelevant: "Work Experience",
        leastRelevant: "Hobbies & Interests",
        sections: [
          { name: "Work Exp.", score: Math.min(score + 12, 100) },
          { name: "Skills", score: bd.skills || score },
          { name: "Projects", score: bd.projects || Math.round(score * 0.9) },
          { name: "Education", score: bd.education || Math.round(score * 0.85) },
          { name: "Summary", score: Math.round(score * 0.8) },
        ],
      },
      recruiter: {
        shortlistProb: Math.round(score * 0.9),
        verdict: score >= 75 ? "Yes" : score >= 50 ? "Maybe" : "No",
        risks: (apiData.resumeAnalysis?.missingSkills || []).slice(0, 4).map(s => `Missing skill: ${s}`),
      },
      strengths: (apiData.resumeAnalysis?.relevantProjects || []).slice(0, 4).map(p => ({
        title: p.project || "Relevant Project",
        detail: p.relevance || "",
      })),
      weaknesses: (apiData.resumeAnalysis?.weakBullets || []).slice(0, 4).map(b => ({
        title: "Weak Bullet",
        detail: b.issue || b.original || "",
      })),
      coverLetter: apiData.coverLetter || "",
    };
  };

  const dashData = transformData(analysisData);

  return (
    <>
      {page === "url" && <PageJobUrl onNext={() => go("upload")} onJobDescription={setJobDescription} />}
      {page === "upload" && <PageUpload onNext={() => go("analysis")} onBack={() => go("url")} jobDescription={jobDescription} onAnalysisComplete={setAnalysisData} />}
      {page === "analysis" && <PageAnalysis onNext={() => go("cover")} onBack={() => go("upload")} analysisData={dashData} />}
      {page === "cover" && <PageCoverLetter onBack={() => go("analysis")} coverLetterText={dashData?.coverLetter} />}
    </>
  );
}
