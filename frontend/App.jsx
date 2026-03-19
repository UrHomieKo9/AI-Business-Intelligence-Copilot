import { useState, useEffect, useRef, useCallback } from "react";

// ─── API CLIENT ──────────────────────────────────────────────────────────────
const API = import.meta.env.VITE_API_URL || "http://localhost:8000";

const apiClient = {
  async post(path, body, token, isForm = false) {
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    if (!isForm) headers["Content-Type"] = "application/json";
    const res = await fetch(`${API}${path}`, {
      method: "POST",
      headers,
      body: isForm ? body : JSON.stringify(body),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: res.statusText }));
      throw new Error(err.detail || "Request failed");
    }
    return res.json();
  },
  async get(path, token) {
    const res = await fetch(`${API}${path}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error("Request failed");
    return res.json();
  },
  async streamPost(path, body, token, onChunk) {
    const res = await fetch(`${API}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      onChunk(decoder.decode(value));
    }
  },
};

// ─── ICONS ───────────────────────────────────────────────────────────────────
const Icon = ({ name, size = 20 }) => {
  const icons = {
    upload: "M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12",
    chart: "M18 20V10M12 20V4M6 20v-6",
    chat: "M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z",
    report: "M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8zM14 2v6h6M16 13H8M16 17H8M10 9H8",
    scenario: "M13 2L3 14h9l-1 8 10-12h-9l1-8z",
    logout: "M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9",
    arrow: "M5 12h14M12 5l7 7-7 7",
    check: "M20 6L9 17l-5-5",
    warning: "M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0zM12 9v4M12 17h.01",
    trending: "M23 6l-9.5 9.5-5-5L1 18M17 6h6v6",
    send: "M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z",
    loader: "M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83",
  };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      {icons[name]?.split("M").filter(Boolean).map((d, i) => (
        <path key={i} d={"M" + d} />
      ))}
    </svg>
  );
};

// ─── AUTH PAGE ────────────────────────────────────────────────────────────────
function AuthPage({ onAuth }) {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!email || !password) return setError("Please fill all fields");
    setLoading(true); setError("");
    try {
      let data;
      if (mode === "login") {
        const form = new URLSearchParams({ username: email, password });
        data = await apiClient.post("/api/auth/login", form, null, true);
      } else {
        data = await apiClient.post("/api/auth/register", { email, password });
      }
      onAuth(data.access_token, data.email);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: "#0a0a0f", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'DM Sans', sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet" />
      <div style={{ width: 420, padding: "48px", background: "#13131a", border: "1px solid #2a2a3a", borderRadius: 16 }}>
        <div style={{ marginBottom: 40 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
            <div style={{ width: 32, height: 32, background: "linear-gradient(135deg, #6366f1, #8b5cf6)", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Icon name="chart" size={16} />
            </div>
            <span style={{ color: "#fff", fontWeight: 600, fontSize: 18 }}>BizCopilot</span>
          </div>
          <h1 style={{ color: "#fff", fontSize: 28, fontWeight: 600, margin: 0 }}>
            {mode === "login" ? "Welcome back" : "Create account"}
          </h1>
          <p style={{ color: "#666", margin: "8px 0 0", fontSize: 14 }}>
            {mode === "login" ? "Sign in to your workspace" : "Start your free analytics journey"}
          </p>
        </div>

        {error && (
          <div style={{ background: "#2d1b1b", border: "1px solid #5c2626", borderRadius: 8, padding: "12px 16px", marginBottom: 20, color: "#ff6b6b", fontSize: 14 }}>
            {error}
          </div>
        )}

        <div style={{ marginBottom: 16 }}>
          <label style={{ color: "#999", fontSize: 13, display: "block", marginBottom: 6 }}>Email</label>
          <input
            value={email} onChange={e => setEmail(e.target.value)}
            placeholder="you@company.com"
            style={{ width: "100%", background: "#1a1a28", border: "1px solid #2a2a3a", borderRadius: 8, padding: "12px 16px", color: "#fff", fontSize: 14, outline: "none", boxSizing: "border-box" }}
            onKeyDown={e => e.key === "Enter" && handleSubmit()}
          />
        </div>
        <div style={{ marginBottom: 24 }}>
          <label style={{ color: "#999", fontSize: 13, display: "block", marginBottom: 6 }}>Password</label>
          <input
            type="password" value={password} onChange={e => setPassword(e.target.value)}
            placeholder="••••••••"
            style={{ width: "100%", background: "#1a1a28", border: "1px solid #2a2a3a", borderRadius: 8, padding: "12px 16px", color: "#fff", fontSize: 14, outline: "none", boxSizing: "border-box" }}
            onKeyDown={e => e.key === "Enter" && handleSubmit()}
          />
        </div>

        <button
          onClick={handleSubmit} disabled={loading}
          style={{ width: "100%", background: "linear-gradient(135deg, #6366f1, #8b5cf6)", border: "none", borderRadius: 8, padding: "13px", color: "#fff", fontWeight: 600, fontSize: 15, cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.7 : 1 }}
        >
          {loading ? "Please wait..." : mode === "login" ? "Sign In" : "Create Account"}
        </button>

        <p style={{ color: "#555", textAlign: "center", marginTop: 24, fontSize: 14 }}>
          {mode === "login" ? "No account? " : "Already have one? "}
          <span onClick={() => setMode(mode === "login" ? "register" : "login")} style={{ color: "#818cf8", cursor: "pointer" }}>
            {mode === "login" ? "Sign up free" : "Sign in"}
          </span>
        </p>
      </div>
    </div>
  );
}

// ─── KPI CARDS ────────────────────────────────────────────────────────────────
function KPICard({ label, value, sub, color = "#6366f1", icon }) {
  return (
    <div style={{ background: "#13131a", border: "1px solid #2a2a3a", borderRadius: 12, padding: "24px", flex: 1, minWidth: 180 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
        <span style={{ color: "#666", fontSize: 13 }}>{label}</span>
        <div style={{ color, opacity: 0.8 }}><Icon name={icon} size={18} /></div>
      </div>
      <div style={{ color: "#fff", fontSize: 26, fontWeight: 600, marginBottom: 4 }}>{value}</div>
      {sub && <div style={{ color: "#555", fontSize: 12 }}>{sub}</div>}
    </div>
  );
}

// ─── UPLOAD ZONE ─────────────────────────────────────────────────────────────
function UploadZone({ token, onSuccess }) {
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef();

  const handleFile = async (file) => {
    if (!file || !file.name.endsWith(".csv")) return setError("Please upload a CSV file");
    setLoading(true); setError("");
    const form = new FormData();
    form.append("file", file);
    try {
      const data = await apiClient.post("/api/upload/csv", form, token, true);
      onSuccess(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      onDragOver={e => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={e => { e.preventDefault(); setDragging(false); handleFile(e.dataTransfer.files[0]); }}
      onClick={() => !loading && inputRef.current?.click()}
      style={{
        border: `2px dashed ${dragging ? "#6366f1" : "#2a2a3a"}`,
        borderRadius: 12, padding: "60px 40px", textAlign: "center",
        background: dragging ? "#13131a" : "#0d0d14",
        cursor: loading ? "default" : "pointer",
        transition: "all 0.2s",
      }}
    >
      <input ref={inputRef} type="file" accept=".csv" style={{ display: "none" }} onChange={e => handleFile(e.target.files[0])} />
      <div style={{ color: loading ? "#6366f1" : "#444", marginBottom: 16 }}>
        <Icon name={loading ? "loader" : "upload"} size={36} />
      </div>
      <p style={{ color: "#fff", fontSize: 16, fontWeight: 500, margin: 0 }}>
        {loading ? "Processing your data..." : "Drop your CSV file here"}
      </p>
      <p style={{ color: "#555", fontSize: 13, marginTop: 8 }}>
        Required columns: Product, Date, Revenue, Cost, Quantity, Inventory
      </p>
      {error && <p style={{ color: "#ff6b6b", marginTop: 12, fontSize: 14 }}>{error}</p>}
    </div>
  );
}

// ─── CHART (simple bar) ───────────────────────────────────────────────────────
function MiniBarChart({ data, xKey, yKey, color = "#6366f1" }) {
  if (!data?.length) return null;
  const max = Math.max(...data.map(d => d[yKey]));
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 4, height: 80 }}>
      {data.map((d, i) => (
        <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
          <div style={{ width: "100%", background: color, opacity: 0.8, borderRadius: "3px 3px 0 0", height: `${(d[yKey] / max) * 68}px`, minHeight: 2, transition: "height 0.5s" }} />
          <span style={{ color: "#555", fontSize: 9, writingMode: "vertical-lr", transform: "rotate(180deg)", maxHeight: 40, overflow: "hidden" }}>{d[xKey]}</span>
        </div>
      ))}
    </div>
  );
}

// ─── CHAT PANEL ───────────────────────────────────────────────────────────────
function ChatPanel({ token, datasetId }) {
  const [messages, setMessages] = useState([
    { role: "assistant", content: "Hello! I've analyzed your business data. Ask me anything — product performance, margin analysis, risk areas, or strategic questions." }
  ]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const bottomRef = useRef();

  const send = async () => {
    if (!input.trim() || streaming) return;
    const question = input.trim();
    setInput("");
    setMessages(m => [...m, { role: "user", content: question }]);
    setStreaming(true);
    setMessages(m => [...m, { role: "assistant", content: "" }]);

    try {
      await apiClient.streamPost("/api/chat/stream", { dataset_id: datasetId, question }, token, (chunk) => {
        setMessages(m => {
          const msgs = [...m];
          msgs[msgs.length - 1] = { role: "assistant", content: msgs[msgs.length - 1].content + chunk };
          return msgs;
        });
      });
    } catch {
      setMessages(m => { const msgs = [...m]; msgs[msgs.length - 1].content = "Sorry, I couldn't process that. Is the LLM service running?"; return msgs; });
    } finally {
      setStreaming(false);
    }
  };

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const suggestions = ["Why did profits change?", "Which products are risky?", "What's our best performer?", "Show inventory concerns"];

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: "#0d0d14" }}>
      <div style={{ flex: 1, overflowY: "auto", padding: "24px", display: "flex", flexDirection: "column", gap: 16 }}>
        {messages.map((m, i) => (
          <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start" }}>
            <div style={{
              maxWidth: "75%", padding: "12px 16px", borderRadius: m.role === "user" ? "12px 12px 4px 12px" : "12px 12px 12px 4px",
              background: m.role === "user" ? "linear-gradient(135deg, #6366f1, #8b5cf6)" : "#1a1a28",
              color: "#fff", fontSize: 14, lineHeight: 1.6,
              border: m.role === "assistant" ? "1px solid #2a2a3a" : "none",
              whiteSpace: "pre-wrap",
            }}>
              {m.content || (streaming && i === messages.length - 1 ? <span style={{ opacity: 0.5 }}>▊</span> : "")}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {messages.length === 1 && (
        <div style={{ padding: "0 24px 16px", display: "flex", gap: 8, flexWrap: "wrap" }}>
          {suggestions.map(s => (
            <button key={s} onClick={() => setInput(s)}
              style={{ background: "#1a1a28", border: "1px solid #2a2a3a", borderRadius: 20, padding: "6px 14px", color: "#999", fontSize: 12, cursor: "pointer" }}>
              {s}
            </button>
          ))}
        </div>
      )}

      <div style={{ padding: "16px 24px", borderTop: "1px solid #1a1a28", display: "flex", gap: 12 }}>
        <input
          value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && send()}
          placeholder="Ask about your business data..."
          style={{ flex: 1, background: "#1a1a28", border: "1px solid #2a2a3a", borderRadius: 8, padding: "12px 16px", color: "#fff", fontSize: 14, outline: "none" }}
        />
        <button onClick={send} disabled={streaming || !input.trim()}
          style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)", border: "none", borderRadius: 8, padding: "12px 16px", color: "#fff", cursor: streaming ? "default" : "pointer", opacity: streaming || !input.trim() ? 0.5 : 1 }}>
          <Icon name="send" size={18} />
        </button>
      </div>
    </div>
  );
}

// ─── REPORT PANEL ─────────────────────────────────────────────────────────────
function ReportPanel({ token, datasetId }) {
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState(null);

  const generate = async () => {
    setLoading(true);
    try {
      const data = await apiClient.post(`/api/report/${datasetId}`, {}, token);
      setReport(data.report);
    } catch (e) {
      setReport("Error generating report. Is the LLM service running?");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: 32 }}>
      {!report ? (
        <div style={{ textAlign: "center", padding: "60px 0" }}>
          <div style={{ color: "#444", marginBottom: 24 }}><Icon name="report" size={48} /></div>
          <h3 style={{ color: "#fff", marginBottom: 8 }}>Generate Executive Report</h3>
          <p style={{ color: "#555", marginBottom: 32, fontSize: 14 }}>AI-powered performance summary with strategic recommendations</p>
          <button onClick={generate} disabled={loading}
            style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)", border: "none", borderRadius: 8, padding: "13px 32px", color: "#fff", fontWeight: 600, fontSize: 15, cursor: loading ? "default" : "pointer", opacity: loading ? 0.7 : 1 }}>
            {loading ? "Generating..." : "Generate Report"}
          </button>
        </div>
      ) : (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
            <h3 style={{ color: "#fff", margin: 0 }}>Executive Report</h3>
            <button onClick={() => setReport(null)} style={{ background: "#1a1a28", border: "1px solid #2a2a3a", borderRadius: 6, padding: "6px 14px", color: "#999", fontSize: 13, cursor: "pointer" }}>Regenerate</button>
          </div>
          <div style={{ background: "#13131a", border: "1px solid #2a2a3a", borderRadius: 12, padding: 32, color: "#ccc", fontSize: 14, lineHeight: 1.8, whiteSpace: "pre-wrap" }}>
            {report}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── SCENARIO PANEL ───────────────────────────────────────────────────────────
function ScenarioPanel({ token, datasetId, products }) {
  const [product, setProduct] = useState(products[0] || "");
  const [pct, setPct] = useState("10");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const simulate = async () => {
    setLoading(true); setResult(null);
    try {
      const data = await apiClient.post("/api/scenario/simulate", {
        dataset_id: datasetId, product, price_change_pct: parseFloat(pct)
      }, token);
      setResult(data);
    } catch (e) {
      setResult({ error: e.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: 32 }}>
      <h3 style={{ color: "#fff", marginBottom: 8 }}>What-If Scenario Simulator</h3>
      <p style={{ color: "#555", fontSize: 14, marginBottom: 32 }}>Simulate pricing changes and see AI-analyzed business impact</p>

      <div style={{ display: "flex", gap: 16, marginBottom: 24, flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: 200 }}>
          <label style={{ color: "#999", fontSize: 13, display: "block", marginBottom: 6 }}>Product</label>
          <select value={product} onChange={e => setProduct(e.target.value)}
            style={{ width: "100%", background: "#1a1a28", border: "1px solid #2a2a3a", borderRadius: 8, padding: "12px 16px", color: "#fff", fontSize: 14 }}>
            {products.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
        <div style={{ flex: 1, minWidth: 160 }}>
          <label style={{ color: "#999", fontSize: 13, display: "block", marginBottom: 6 }}>Price Change (%)</label>
          <input value={pct} onChange={e => setPct(e.target.value)} type="number"
            style={{ width: "100%", background: "#1a1a28", border: "1px solid #2a2a3a", borderRadius: 8, padding: "12px 16px", color: "#fff", fontSize: 14, boxSizing: "border-box" }} />
        </div>
        <div style={{ alignSelf: "flex-end" }}>
          <button onClick={simulate} disabled={loading}
            style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)", border: "none", borderRadius: 8, padding: "13px 28px", color: "#fff", fontWeight: 600, cursor: loading ? "default" : "pointer", opacity: loading ? 0.7 : 1 }}>
            {loading ? "Simulating..." : "Run Simulation"}
          </button>
        </div>
      </div>

      {result && !result.error && (
        <div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 }}>
            {[
              { label: "Before", data: result.simulation.original, color: "#555" },
              { label: "After", data: result.simulation.simulated, color: "#6366f1" },
            ].map(({ label, data, color }) => (
              <div key={label} style={{ background: "#13131a", border: `1px solid ${color}33`, borderRadius: 12, padding: 20 }}>
                <div style={{ color, fontSize: 12, fontWeight: 600, marginBottom: 12, textTransform: "uppercase", letterSpacing: 1 }}>{label}</div>
                <div style={{ color: "#fff", fontSize: 20, fontWeight: 600 }}>${data.total_revenue?.toLocaleString()}</div>
                <div style={{ color: "#888", fontSize: 13, marginTop: 4 }}>Revenue</div>
                <div style={{ color: data.total_profit > 0 ? "#34d399" : "#f87171", fontSize: 16, fontWeight: 500, marginTop: 12 }}>${data.total_profit?.toLocaleString()}</div>
                <div style={{ color: "#888", fontSize: 13, marginTop: 2 }}>Profit · {data.avg_margin?.toFixed(1)}% margin</div>
              </div>
            ))}
          </div>
          <div style={{ background: "#13131a", border: "1px solid #2a2a3a", borderRadius: 12, padding: 24 }}>
            <div style={{ color: "#818cf8", fontSize: 12, fontWeight: 600, marginBottom: 12, textTransform: "uppercase", letterSpacing: 1 }}>AI Analysis</div>
            <p style={{ color: "#ccc", fontSize: 14, lineHeight: 1.8, whiteSpace: "pre-wrap", margin: 0 }}>{result.ai_explanation}</p>
          </div>
        </div>
      )}
      {result?.error && <p style={{ color: "#ff6b6b" }}>{result.error}</p>}
    </div>
  );
}

// ─── DASHBOARD ────────────────────────────────────────────────────────────────
function Dashboard({ token, userEmail, onLogout }) {
  const [activeTab, setActiveTab] = useState("upload");
  const [kpis, setKpis] = useState(null);
  const [datasetId, setDatasetId] = useState(null);

  const navItems = [
    { id: "upload",   label: "Upload",   icon: "upload" },
    { id: "kpis",     label: "Analytics", icon: "chart" },
    { id: "chat",     label: "Chat",     icon: "chat" },
    { id: "report",   label: "Report",   icon: "report" },
    { id: "scenario", label: "Simulate", icon: "scenario" },
  ];

  const handleUploadSuccess = (data) => {
    setKpis(data.kpis);
    setDatasetId(data.dataset_id);
    setActiveTab("kpis");
  };

  const products = kpis?.top_products?.map(p => p.product) || [];

  return (
    <div style={{ minHeight: "100vh", background: "#0a0a0f", display: "flex", fontFamily: "'DM Sans', sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet" />

      {/* Sidebar */}
      <div style={{ width: 220, background: "#0d0d14", borderRight: "1px solid #1a1a28", display: "flex", flexDirection: "column", padding: "24px 16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 40, paddingLeft: 8 }}>
          <div style={{ width: 28, height: 28, background: "linear-gradient(135deg, #6366f1, #8b5cf6)", borderRadius: 7, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Icon name="chart" size={14} />
          </div>
          <span style={{ color: "#fff", fontWeight: 600, fontSize: 16 }}>BizCopilot</span>
        </div>

        <nav style={{ flex: 1 }}>
          {navItems.map(item => (
            <button key={item.id} onClick={() => setActiveTab(item.id)}
              disabled={item.id !== "upload" && !kpis}
              style={{
                width: "100%", display: "flex", alignItems: "center", gap: 10,
                padding: "10px 12px", borderRadius: 8, border: "none", cursor: !kpis && item.id !== "upload" ? "default" : "pointer",
                background: activeTab === item.id ? "linear-gradient(135deg, #6366f120, #8b5cf620)" : "transparent",
                color: activeTab === item.id ? "#818cf8" : !kpis && item.id !== "upload" ? "#333" : "#666",
                fontSize: 14, fontWeight: activeTab === item.id ? 500 : 400, marginBottom: 2,
                borderLeft: activeTab === item.id ? "2px solid #6366f1" : "2px solid transparent",
                transition: "all 0.15s",
              }}>
              <Icon name={item.icon} size={16} />
              {item.label}
            </button>
          ))}
        </nav>

        <div style={{ borderTop: "1px solid #1a1a28", paddingTop: 16 }}>
          <div style={{ color: "#444", fontSize: 12, paddingLeft: 12, marginBottom: 8 }}>{userEmail}</div>
          <button onClick={onLogout} style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 8, border: "none", cursor: "pointer", background: "transparent", color: "#555", fontSize: 14 }}>
            <Icon name="logout" size={16} /> Sign Out
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <div style={{ padding: "20px 32px", borderBottom: "1px solid #1a1a28", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <h2 style={{ color: "#fff", margin: 0, fontSize: 20, fontWeight: 500 }}>
            {navItems.find(n => n.id === activeTab)?.label}
          </h2>
          {kpis && <span style={{ color: "#555", fontSize: 13 }}>Dataset #{datasetId} loaded</span>}
        </div>

        <div style={{ flex: 1, overflowY: "auto" }}>
          {activeTab === "upload" && (
            <div style={{ padding: 32 }}>
              <UploadZone token={token} onSuccess={handleUploadSuccess} />
              <div style={{ marginTop: 24, padding: 20, background: "#13131a", border: "1px solid #2a2a3a", borderRadius: 12 }}>
                <h4 style={{ color: "#818cf8", margin: "0 0 12px", fontSize: 13 }}>SAMPLE CSV FORMAT</h4>
                <pre style={{ color: "#555", fontSize: 12, margin: 0, fontFamily: "'DM Mono', monospace", lineHeight: 1.8 }}>
{`Product,Date,Revenue,Cost,Quantity,Inventory
Widget A,2024-01-15,5000,3000,100,250
Widget B,2024-01-15,3200,2400,80,120
Widget C,2024-02-01,7800,4200,160,300`}
                </pre>
              </div>
            </div>
          )}

          {activeTab === "kpis" && kpis && (
            <div style={{ padding: 32 }}>
              <div style={{ display: "flex", gap: 16, marginBottom: 24, flexWrap: "wrap" }}>
                <KPICard label="Total Revenue" value={`$${kpis.total_revenue?.toLocaleString()}`} color="#6366f1" icon="trending" />
                <KPICard label="Total Profit" value={`$${kpis.total_profit?.toLocaleString()}`} color="#34d399" icon="chart" />
                <KPICard label="Avg Margin" value={`${kpis.avg_profit_margin?.toFixed(1)}%`} color="#f59e0b" icon="trending" />
                <KPICard label="Units Sold" value={kpis.total_quantity?.toLocaleString()} color="#818cf8" icon="chart" />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
                <div style={{ background: "#13131a", border: "1px solid #2a2a3a", borderRadius: 12, padding: 24 }}>
                  <h4 style={{ color: "#818cf8", margin: "0 0 16px", fontSize: 13, letterSpacing: 1 }}>TOP PRODUCTS</h4>
                  {kpis.top_products?.map((p, i) => (
                    <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: i < kpis.top_products.length - 1 ? "1px solid #1a1a28" : "none" }}>
                      <span style={{ color: "#ccc", fontSize: 14 }}>{p.product}</span>
                      <div style={{ textAlign: "right" }}>
                        <span style={{ color: "#fff", fontSize: 14, fontWeight: 500 }}>${p.revenue?.toLocaleString()}</span>
                        <span style={{ color: "#555", fontSize: 12, marginLeft: 8 }}>{p.margin?.toFixed(1)}%</span>
                      </div>
                    </div>
                  ))}
                </div>

                <div style={{ background: "#13131a", border: "1px solid #2a2a3a", borderRadius: 12, padding: 24 }}>
                  <h4 style={{ color: "#f87171", margin: "0 0 16px", fontSize: 13, letterSpacing: 1 }}>⚠ RISK ALERTS</h4>
                  {kpis.risk_products?.length > 0 ? kpis.risk_products.map((r, i) => (
                    <div key={i} style={{ display: "flex", gap: 12, padding: "10px 0", borderBottom: i < kpis.risk_products.length - 1 ? "1px solid #1a1a28" : "none" }}>
                      <div style={{ color: "#f87171", marginTop: 2 }}><Icon name="warning" size={14} /></div>
                      <div>
                        <div style={{ color: "#ccc", fontSize: 14 }}>{r.product}</div>
                        <div style={{ color: "#666", fontSize: 12 }}>{r.reason}</div>
                      </div>
                    </div>
                  )) : <p style={{ color: "#555", fontSize: 14 }}>No risks detected ✓</p>}
                </div>
              </div>

              {kpis.monthly_summary?.length > 0 && (
                <div style={{ background: "#13131a", border: "1px solid #2a2a3a", borderRadius: 12, padding: 24 }}>
                  <h4 style={{ color: "#818cf8", margin: "0 0 20px", fontSize: 13, letterSpacing: 1 }}>MONTHLY REVENUE TREND</h4>
                  <MiniBarChart data={kpis.monthly_summary} xKey="month" yKey="revenue" />
                </div>
              )}
            </div>
          )}

          {activeTab === "chat" && datasetId && (
            <div style={{ height: "calc(100vh - 80px)" }}>
              <ChatPanel token={token} datasetId={datasetId} />
            </div>
          )}

          {activeTab === "report" && datasetId && <ReportPanel token={token} datasetId={datasetId} />}
          {activeTab === "scenario" && datasetId && <ScenarioPanel token={token} datasetId={datasetId} products={products} />}
        </div>
      </div>
    </div>
  );
}

// ─── ROOT APP ─────────────────────────────────────────────────────────────────
export default function App() {
  const [token, setToken] = useState(() => localStorage.getItem("biz_token"));
  const [email, setEmail] = useState(() => localStorage.getItem("biz_email"));

  const handleAuth = (t, e) => {
    localStorage.setItem("biz_token", t);
    localStorage.setItem("biz_email", e);
    setToken(t); setEmail(e);
  };

  const handleLogout = () => {
    localStorage.removeItem("biz_token");
    localStorage.removeItem("biz_email");
    setToken(null); setEmail(null);
  };

  if (!token) return <AuthPage onAuth={handleAuth} />;
  return <Dashboard token={token} userEmail={email} onLogout={handleLogout} />;
}
