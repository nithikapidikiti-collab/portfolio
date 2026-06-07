"use client";

import { useEffect, useRef, useState } from "react";

function useFadeIn() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { el.style.opacity = "1"; el.style.transform = "translateY(0)"; } },
      { threshold: 0.15 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return ref;
}

function NetworkGraph() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    const resize = () => { canvas.width = canvas.offsetWidth; canvas.height = canvas.offsetHeight; };
    resize();
    window.addEventListener("resize", resize);
    let animId: number;
    let mouse = { x: -1000, y: -1000 };

    const categories = [
      { name: "Languages",  color: "#60a5fa", items: ["Python","Java","JavaScript","HTML5","CSS3","SQL","R","Bash"] },
      { name: "Frameworks", color: "#34d399", items: ["Tailwind","Flask","React","Next.js","Node.js"] },
      { name: "Cloud",      color: "#f59e0b", items: ["AWS","Bedrock","Supabase","SQLite"] },
      { name: "Data",       color: "#a78bfa", items: ["Excel","Tableau"] },
      { name: "AI",         color: "#f472b6", items: ["Claude","LangChain"] },
      { name: "Design",     color: "#fb923c", items: ["Figma","Adobe XD","Framer"] },
      { name: "Tools",      color: "#94a3b8", items: ["Git","GitHub","Canva","MS Office"] },
    ];

    type Node = { x: number; y: number; vx: number; vy: number; label: string; color: string; r: number; dragging: boolean; ox: number; oy: number; };
    const nodes: Node[] = [];
    categories.forEach(({ items, color }) => {
      items.forEach(label => {
        const x = 60 + Math.random() * (canvas.width - 120);
        const y = 60 + Math.random() * (canvas.height - 120);
        nodes.push({ x, y, ox: x, oy: y, vx: (Math.random()-0.5)*0.35, vy: (Math.random()-0.5)*0.35, label, color, r: 5, dragging: false });
      });
    });

    const edges: [number,number,string][] = [];
    let idx = 0;
    categories.forEach(({ items, color }) => {
      const start = idx; idx += items.length;
      for (let a = start; a < idx; a++)
        for (let b = a+1; b < idx; b++)
          if (Math.random() < 0.2) edges.push([a, b, color]);
    });
    for (let i = 0; i < 4; i++) {
      const a = Math.floor(Math.random()*nodes.length);
      const b = Math.floor(Math.random()*nodes.length);
      if (a !== b) edges.push([a, b, "rgba(255,255,255,0.04)"]);
    }
    const pulses = edges.map(() => ({ t: Math.random(), active: Math.random() < 0.3 }));

    let dragging: Node | null = null;
    const toCanvas = (e: MouseEvent) => { const r = canvas.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
    canvas.addEventListener("mousedown", e => { const { x, y } = toCanvas(e); for (const n of nodes) if (Math.hypot(n.x-x, n.y-y) < 18) { dragging = n; n.dragging = true; break; } });
    canvas.addEventListener("mousemove", e => { const { x, y } = toCanvas(e); mouse.x = x; mouse.y = y; if (dragging) { dragging.x = x; dragging.y = y; } });
    canvas.addEventListener("mouseup", () => { if (dragging) { dragging.dragging = false; dragging = null; } });

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      edges.forEach(([a, b, col], i) => {
        const na = nodes[a], nb = nodes[b];
        const dist = Math.hypot(na.x-nb.x, na.y-nb.y);
        const alpha = Math.max(0, 0.06 - dist/2800);
        if (alpha <= 0) return;
        ctx.beginPath(); ctx.moveTo(na.x, na.y); ctx.lineTo(nb.x, nb.y);
        ctx.strokeStyle = col === "rgba(255,255,255,0.04)" ? col : col.replace(")", `,${alpha})`).replace("rgb(","rgba(");
        ctx.lineWidth = 0.8; ctx.stroke();
        if (pulses[i].active) {
          pulses[i].t = (pulses[i].t + 0.004) % 1;
          const px = na.x + (nb.x - na.x) * pulses[i].t;
          const py = na.y + (nb.y - na.y) * pulses[i].t;
          ctx.beginPath(); ctx.arc(px, py, 2, 0, Math.PI*2);
          ctx.fillStyle = col.startsWith("rgba") ? "rgba(255,255,255,0.4)" : col; ctx.fill();
        }
      });
      nodes.forEach(n => {
        const d = Math.hypot(n.x - mouse.x, n.y - mouse.y);
        const hov = Math.max(0, 1 - d/90);
        if (hov > 0) {
          const g = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, 28 + hov*20);
          g.addColorStop(0, n.color + "55"); g.addColorStop(1, "transparent");
          ctx.beginPath(); ctx.arc(n.x, n.y, 28 + hov*20, 0, Math.PI*2); ctx.fillStyle = g; ctx.fill();
        }
        ctx.beginPath(); ctx.arc(n.x, n.y, n.r + hov*3, 0, Math.PI*2);
        ctx.fillStyle = hov > 0.1 ? n.color : n.color + "55"; ctx.fill();
        ctx.font = `${hov > 0.3 ? 500 : 400} ${10 + hov*3}px system-ui,sans-serif`;
        ctx.fillStyle = hov > 0.3 ? "#fff" : "rgba(255,255,255,0.3)";
        ctx.fillText(n.label, n.x + n.r + 5, n.y + 4);
        if (!n.dragging) {
          n.x += n.vx; n.y += n.vy;
          if (n.x < 40) { n.vx += 0.05; } else if (n.x > canvas.width-40) { n.vx -= 0.05; }
          if (n.y < 40) { n.vy += 0.05; } else if (n.y > canvas.height-40) { n.vy -= 0.05; }
          n.vx *= 0.999; n.vy *= 0.999;
          if (d < 120) { const angle = Math.atan2(n.y-mouse.y, n.x-mouse.x); const force = (1 - d/120) * 0.8; n.vx += Math.cos(angle) * force; n.vy += Math.sin(angle) * force; }
          nodes.forEach(other => { if (other === n) return; const dx = n.x-other.x, dy = n.y-other.y; const dd = Math.hypot(dx,dy); if (dd < 55 && dd > 0) { const f = (55-dd)/55 * 0.3; n.vx += (dx/dd)*f; n.vy += (dy/dd)*f; } });
        }
      });
      animId = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(animId); window.removeEventListener("resize", resize); };
  }, []);

  return <canvas ref={canvasRef} style={{ position:"absolute", inset:0, width:"100%", height:"100%", cursor:"grab" }} />;
}

const termLines = [
  { cmd: "whoami", out: "Nithika Pidikiti" },
  { cmd: "cat role.txt", out: "UTS Co-op Scholar · Founder · IT Architect" },
  { cmd: "ls skills/", out: "SQL  Python  R  Tableau  Linux  TCP/IP  AWS  Cisco" },
  { cmd: "cat awards.txt", out: "1st Place — ANSTO National Hackathon 2022" },
  { cmd: "echo $location", out: "Sydney, Australia" },
];

function Terminal() {
  const [lines, setLines] = useState<{ text: string; type: "cmd" | "out" | "cursor" }[]>([{ text: "", type: "cursor" }]);
  const containerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>;
    let lineIdx = 0, charIdx = 0;
    let phase: "typing" | "output" = "typing";
    const rendered: { text: string; type: "cmd" | "out" | "cursor" }[] = [{ text: "", type: "cursor" }];
    const tick = () => {
      if (lineIdx >= termLines.length) return;
      const { cmd, out } = termLines[lineIdx];
      if (phase === "typing") {
        if (charIdx < cmd.length) {
          rendered[rendered.length - 1] = { text: "> " + cmd.slice(0, charIdx + 1), type: "cursor" };
          charIdx++; setLines([...rendered]); timeout = setTimeout(tick, 55);
        } else { phase = "output"; timeout = setTimeout(tick, 200); }
      } else {
        rendered[rendered.length - 1] = { text: "> " + cmd, type: "cmd" };
        rendered.push({ text: out, type: "out" });
        rendered.push({ text: "", type: "cursor" });
        setLines([...rendered]); charIdx = 0; lineIdx++; phase = "typing";
        timeout = setTimeout(tick, 600);
      }
      containerRef.current?.scrollTo(0, 9999);
    };
    timeout = setTimeout(tick, 800);
    return () => clearTimeout(timeout);
  }, []);
  return (
    <div ref={containerRef} style={{ background: "#0a0a0a", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "4px", padding: "1.5rem", fontFamily: "monospace", fontSize: "13px", lineHeight: 1.8, maxHeight: "260px", overflowY: "auto" }}>
      <div style={{ color: "rgba(255,255,255,0.2)", marginBottom: "1rem", fontSize: "11px", letterSpacing: "0.1em" }}>TERMINAL</div>
      {lines.map((l, i) => (
        <div key={i} style={{ color: l.type === "cmd" || l.type === "cursor" ? "rgba(255,255,255,0.8)" : "rgba(255,255,255,0.4)" }}>
          {l.text}{l.type === "cursor" && <span style={{ animation: "blink 1s step-end infinite" }}>█</span>}
        </div>
      ))}
      <style>{`@keyframes blink { 50% { opacity: 0; } }`}</style>
    </div>
  );
}

function Cursor() {
  const [isMobile, setIsMobile] = useState(false);
  const dotRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (window.innerWidth < 768) { setIsMobile(true); return; }
    let rx = 0, ry = 0;
    const move = (e: MouseEvent) => {
      if (dotRef.current) { dotRef.current.style.left = e.clientX + "px"; dotRef.current.style.top = e.clientY + "px"; }
      rx += (e.clientX - rx) * 0.12; ry += (e.clientY - ry) * 0.12;
    };
    const raf = () => { if (ringRef.current) { ringRef.current.style.left = rx + "px"; ringRef.current.style.top = ry + "px"; } requestAnimationFrame(raf); };
    window.addEventListener("mousemove", move); requestAnimationFrame(raf);
    return () => window.removeEventListener("mousemove", move);
  }, []);
  if (isMobile) return null;
  return (
    <>
      <div ref={dotRef} style={{ position: "fixed", width: "5px", height: "5px", background: "#fff", borderRadius: "50%", pointerEvents: "none", zIndex: 9999, transform: "translate(-50%,-50%)", mixBlendMode: "difference" }} />
      <div ref={ringRef} style={{ position: "fixed", width: "28px", height: "28px", border: "1px solid rgba(255,255,255,0.4)", borderRadius: "50%", pointerEvents: "none", zIndex: 9998, transform: "translate(-50%,-50%)", mixBlendMode: "difference" }} />
    </>
  );
}

function Fade({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  const ref = useFadeIn();
  return (
    <div ref={ref} style={{ opacity: 0, transform: "translateY(32px)", transition: "opacity 0.8s ease, transform 0.8s ease", ...style }}>
      {children}
    </div>
  );
}

export default function Home() {
  const projects = [
    { title: "DNS resolver", desc: "Resolves DNS from scratch in C — parses wire format, pointer compression, traces full chain from root servers.", tags: ["C", "DNS", "UDP"], url: "https://github.com/nithikapidikiti-collab/dns-resolver", num: "01" },
    { title: "Data analytics portfolio", desc: "Case studies in Excel, R, Tableau, and SQL.", tags: ["SQL", "R", "Tableau"], url: "https://sites.google.com/view/nithika-datanalytics-portfolio/home", num: "02" },
    { title: "Cybersecurity portfolio", desc: "Security documentation and network design with Cisco Packet Tracer.", tags: ["NIST", "Linux", "Cisco"], url: "https://sites.google.com/view/nithika-cybersec-portfolio/home", num: "03" },
    { title: "TCP chat server", desc: "Multi-client real-time chat built with raw Python sockets.", tags: ["Python", "TCP"], url: "https://github.com/nithikapidikiti-collab/tcp-chat-server", num: "04" },
    { title: "Async port scanner", desc: "Concurrent port scanner scanning 1024 ports with asyncio.", tags: ["Python", "Asyncio"], url: "https://github.com/nithikapidikiti-collab/port-scanner", num: "05" },
    { title: "HTTP intercepting proxy", desc: "Intercepts and logs live HTTP traffic in real time.", tags: ["Python", "HTTP"], url: "https://github.com/nithikapidikiti-collab/http-proxy", num: "06" },
    { title: "Packet sniffer", desc: "Live network capture detecting real IoT and GitHub traffic.", tags: ["Scapy", "TCP"], url: "https://github.com/nithikapidikiti-collab/packet-sniffer", num: "07" },
  ];

  const certs = [
    { name: "Google cybersecurity professional certificate", issuer: "Coursera", year: "2024" },
    { name: "Google data analytics professional certificate", issuer: "Coursera", year: "2024" },
    { name: "Claude with Amazon Bedrock", issuer: "Anthropic", year: "2026" },
    { name: "AWS solutions architecture job simulation", issuer: "Forage", year: "2025" },
    { name: "IBM AI literacy", issuer: "IBM", year: "2026" },
    { name: "Deloitte Australia cyber job simulation", issuer: "Forage", year: "2025" },
    { name: "AWS cloud essentials for business leaders", issuer: "Amazon Web Services", year: "2025" },
    { name: "Building generative AI applications", issuer: "Amazon Web Services", year: "2025" },
  ];

  return (
    <main style={{ background: "#0c0c0c", minHeight: "100vh", color: "#fff", fontFamily: "'Inter',system-ui,sans-serif", cursor: "none" }}>
      <Cursor />

      {/* Nav */}
      <nav style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "1rem 1.5rem", background: "rgba(12,12,12,0.9)", backdropFilter: "blur(16px)", gap: "1rem" }}>
  <span style={{ fontSize: "13px", fontWeight: 500, letterSpacing: "0.02em", flexShrink: 0 }}>NP</span>
  <div style={{ display: "flex", gap: "1.25rem", overflowX: "auto", scrollbarWidth: "none" }}>
    {["About", "Projects", "Certifications", "Contact"].map(n => (
      <a key={n} href={`#${n.toLowerCase()}`} style={{ fontSize: "11px", color: "rgba(255,255,255,0.35)", textDecoration: "none", letterSpacing: "0.1em", transition: "color 0.2s", flexShrink: 0 }}
        onMouseEnter={e => e.currentTarget.style.color = "#fff"}
        onMouseLeave={e => e.currentTarget.style.color = "rgba(255,255,255,0.35)"}>{n.toUpperCase()}</a>
    ))}
  </div>
</nav>

      {/* Hero */}
      <section style={{ height: "100vh", position: "relative", overflow: "hidden", display: "flex", flexDirection: "column", justifyContent: "flex-end", padding: "0 1.5rem 4rem" }}>
        <NetworkGraph />
        <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", fontSize: "clamp(80px,18vw,240px)", fontWeight: 800, color: "rgba(255,255,255,0.025)", letterSpacing: "-0.06em", whiteSpace: "nowrap", userSelect: "none", lineHeight: 1, pointerEvents: "none" }}>NP</div>
        <div style={{ position: "relative", zIndex: 1 }}>
          <p style={{ fontSize: "11px", letterSpacing: "0.2em", color: "rgba(255,255,255,0.25)", marginBottom: "1.5rem" }}>INFORMATION TECHNOLOGY · SYDNEY</p>
          <h1 style={{ fontSize: "clamp(40px,10vw,96px)", fontWeight: 700, letterSpacing: "-0.04em", lineHeight: 0.95, margin: "0 0 1.5rem 0" }}>
            Nithika<br />Pidikiti
          </h1>
          <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.35)", lineHeight: 1.8, marginBottom: "2rem" }}>
            UTS Co-op Scholar
          </p>
          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
            {[{ l: "LinkedIn", u: "https://www.linkedin.com/in/nithika-pidikiti" }, { l: "GitHub", u: "https://github.com/nithikapidikiti-collab" }].map(b => (
              <a key={b.l} href={b.u} target="_blank" style={{ fontSize: "11px", padding: "8px 16px", border: "1px solid rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.5)", textDecoration: "none", letterSpacing: "0.06em", transition: "all 0.2s" }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.4)"; e.currentTarget.style.color = "#fff"; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)"; e.currentTarget.style.color = "rgba(255,255,255,0.5)"; }}>
                {b.l.toUpperCase()}
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* About */}
      <section id="about" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))" }}>
          <Fade style={{ padding: "4rem 1.5rem", borderRight: "1px solid rgba(255,255,255,0.06)" }}>
            <p style={{ fontSize: "10px", letterSpacing: "0.2em", color: "rgba(255,255,255,0.2)", marginBottom: "2rem" }}>ABOUT</p>
            <p style={{ fontSize: "clamp(16px,2vw,22px)", lineHeight: 1.6, color: "rgba(255,255,255,0.7)", fontWeight: 300, marginBottom: "1.5rem" }}>
              Passionate about the architecture of IT systems — how networks are built, secured, and scaled. Currently on a competitive Co-op Scholarship at UTS.
            </p>
          </Fade>
          <Fade style={{ padding: "4rem 1.5rem" }}>
            <p style={{ fontSize: "10px", letterSpacing: "0.2em", color: "rgba(255,255,255,0.2)", marginBottom: "2rem" }}>TERMINAL</p>
            <Terminal />
          </Fade>
        </div>
      </section>

      {/* Projects */}
      <Fade>
        <section id="projects" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          <div style={{ padding: "3rem 1.5rem 2rem", display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <p style={{ fontSize: "10px", letterSpacing: "0.2em", color: "rgba(255,255,255,0.2)" }}>PROJECTS</p>
            <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.2)" }}>07 works</p>          </div>
          {projects.map(p => (
            <a key={p.title} href={p.url} target="_blank" style={{ display: "flex", flexWrap: "wrap", gap: "8px", alignItems: "center", padding: "1.25rem 1.5rem", borderTop: "1px solid rgba(255,255,255,0.05)", textDecoration: "none", transition: "background 0.2s" }}
              onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.02)"}
              onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
              <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.2)", fontWeight: 500, minWidth: "30px" }}>{p.num}</span>
              <span style={{ fontSize: "14px", color: "rgba(255,255,255,0.85)", fontWeight: 400, flex: 1, minWidth: "150px" }}>{p.title}</span>
              <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                {p.tags.map(t => <span key={t} style={{ fontSize: "10px", padding: "3px 8px", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.35)", letterSpacing: "0.05em" }}>{t}</span>)}
                <span style={{ fontSize: "14px", color: "rgba(255,255,255,0.2)" }}>↗</span>
              </div>
            </a>
          ))}
        </section>
      </Fade>

      {/* Portfolio links */}
      <Fade>
        <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          {[
            { title: "Data analytics portfolio", sub: "Google Career Certificate · Excel, R, SQL, Tableau", url: "https://sites.google.com/view/nithika-datanalytics-portfolio/home" },
            { title: "Cybersecurity portfolio", sub: "Google Career Certificate · NIST, Linux, Cisco", url: "https://sites.google.com/view/nithika-cybersec-portfolio/home" },
          ].map((p, i) => (
            <a key={p.title} href={p.url} target="_blank" style={{ padding: "2.5rem 1.5rem", borderRight: i === 0 ? "1px solid rgba(255,255,255,0.06)" : "none", textDecoration: "none", display: "flex", flexDirection: "column", justifyContent: "space-between", minHeight: "160px", transition: "background 0.2s" }}
              onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.02)"}
              onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
              <span style={{ fontSize: "10px", letterSpacing: "0.15em", color: "rgba(255,255,255,0.2)" }}>PORTFOLIO</span>
              <div>
                <p style={{ fontSize: "16px", fontWeight: 500, color: "rgba(255,255,255,0.85)", marginBottom: "0.5rem", letterSpacing: "-0.02em" }}>{p.title}</p>
                <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.3)" }}>{p.sub}</p>
              </div>
              <span style={{ fontSize: "16px", color: "rgba(255,255,255,0.15)" }}>↗</span>
            </a>
          ))}
        </section>
      </Fade>

      {/* Certs */}
      <Fade>
        <section id="certifications" style={{ borderTop: "1px solid rgba(255,255,255,0.06)", padding: "4rem 1.5rem" }}>
          <p style={{ fontSize: "10px", letterSpacing: "0.2em", color: "rgba(255,255,255,0.2)", marginBottom: "2.5rem" }}>CERTIFICATIONS</p>
          <div style={{ display: "flex", flexDirection: "column" }}>
            {certs.map((c) => (
              <div key={c.name} style={{ padding: "1.25rem 0", borderBottom: "1px solid rgba(255,255,255,0.05)", display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: "1rem" }}>
                <div>
                  <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.7)", marginBottom: "3px" }}>{c.name}</p>
                  <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.25)" }}>{c.issuer}</p>
                </div>
                <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.2)", flexShrink: 0 }}>{c.year}</span>
              </div>
            ))}
          </div>
        </section>
      </Fade>

      {/* Contact */}
      <Fade>
        <section id="contact" style={{ borderTop: "1px solid rgba(255,255,255,0.06)", padding: "5rem 1.5rem" }}>
          <p style={{ fontSize: "10px", letterSpacing: "0.2em", color: "rgba(255,255,255,0.2)", marginBottom: "1.5rem" }}>CONTACT</p>
          <h2 style={{ fontSize: "clamp(36px,8vw,72px)", fontWeight: 700, letterSpacing: "-0.04em", lineHeight: 0.95, marginBottom: "2rem" }}>Let&apos;s<br />connect</h2>
          <p style={{ fontSize: "14px", color: "rgba(255,255,255,0.35)", maxWidth: "300px", lineHeight: 1.7, marginBottom: "2.5rem" }}>Open to industry placements, collaborations, and conversations about data, security, or startups.</p>
          <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
            {[{ l: "LinkedIn ↗", u: "https://www.linkedin.com/in/nithika-pidikiti" }, { l: "GitHub ↗", u: "https://github.com/nithikapidikiti-collab" }].map(b => (
              <a key={b.l} href={b.u} target="_blank" style={{ fontSize: "13px", padding: "10px 20px", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.5)", textDecoration: "none", letterSpacing: "0.05em", transition: "all 0.2s" }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.35)"; e.currentTarget.style.color = "#fff"; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"; e.currentTarget.style.color = "rgba(255,255,255,0.5)"; }}>
                {b.l}
              </a>
            ))}
          </div>
        </section>
      </Fade>

      <footer style={{ borderTop: "1px solid rgba(255,255,255,0.06)", padding: "1.5rem", display: "flex", justifyContent: "space-between" }}>
        <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.15)" }}>Nithika Pidikiti</span>
        <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.15)" }}>{new Date().getFullYear()}</span>
      </footer>
    </main>
  );
}