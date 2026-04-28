import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { supabase } from "@/lib/supabase.js";
import confetti from "canvas-confetti";

const NODE_W = 180;
const NODE_H = 88;
const GRID = 20;

const STATUS_LABELS = {
  pending: { admin:"Pending", client:"Upcoming" },
  in_progress: { admin:"In Progress", client:"Currently Working On" },
  done: { admin:"Done", client:"Completed" },
};

const TEMPLATES = [
  "Initial Consultation","Document Collection","Draft Review",
  "Filing Submission","Awaiting Court Response","Final Approval","Completion",
];

const SAMPLE_NODES = [
  { title:"Initial Consultation", status:"done", x:80, y:300, desc:"This stage covers the initial intake meeting and matter scoping with the client." },
  { title:"Document Collection", status:"done", x:320, y:300, desc:"This stage covers gathering all signed authorities, identification, and supporting documents." },
  { title:"Draft Review", status:"in_progress", x:560, y:300, desc:"This stage covers preparing the first draft of all required estate documents for client review." },
  { title:"Filing Submission", status:"pending", x:800, y:300, desc:"This stage covers lodging the executed documents with the relevant court or registry." },
  { title:"Awaiting Court Response", status:"pending", x:1040, y:300, desc:"This stage covers monitoring the matter and responding to any registry requisitions." },
  { title:"Final Approval", status:"pending", x:1280, y:300, desc:"This stage covers receiving the grant and finalising the matter with the client." },
];

function snap(v){ return Math.round(v / GRID) * GRID; }
function prefersReducedMotion(){
  if (typeof window === "undefined") return false;
  return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
}

// Compute arrow path between two node centers, clipping to node edges
function arrowPath(src, tgt) {
  const sx = src.position_x + NODE_W/2, sy = src.position_y + NODE_H/2;
  const tx = tgt.position_x + NODE_W/2, ty = tgt.position_y + NODE_H/2;
  // Pick edge intersection points
  const dx = tx - sx, dy = ty - sy;
  const angle = Math.atan2(dy, dx);
  const srcEdge = clipToRect(sx, sy, src.position_x, src.position_y, NODE_W, NODE_H, angle);
  const tgtEdge = clipToRect(tx, ty, tgt.position_x, tgt.position_y, NODE_W, NODE_H, angle + Math.PI);
  // Quadratic bezier control point bowed slightly
  const mx = (srcEdge.x + tgtEdge.x)/2;
  const my = (srcEdge.y + tgtEdge.y)/2 - Math.min(40, Math.abs(tgtEdge.x - srcEdge.x)*0.15);
  return { d:`M ${srcEdge.x} ${srcEdge.y} Q ${mx} ${my} ${tgtEdge.x} ${tgtEdge.y}`, end: tgtEdge, angle: Math.atan2(tgtEdge.y - my, tgtEdge.x - mx) };
}
function clipToRect(cx, cy, rx, ry, rw, rh, angle){
  const hx = rw/2, hy = rh/2;
  const tx = Math.cos(angle), ty = Math.sin(angle);
  const sx = Math.abs(tx) < 1e-6 ? Infinity : hx / Math.abs(tx);
  const sy = Math.abs(ty) < 1e-6 ? Infinity : hy / Math.abs(ty);
  const s = Math.min(sx, sy);
  return { x: cx + tx*s, y: cy + ty*s };
}

function autoLayout(nodes, arrows){
  // Simple left-to-right BFS levelling using arrows
  const idToNode = new Map(nodes.map(n=>[n.id, {...n}]));
  const incoming = new Map(nodes.map(n=>[n.id, 0]));
  arrows.forEach(a=>{
    if (incoming.has(a.target_node_id)) incoming.set(a.target_node_id, incoming.get(a.target_node_id)+1);
  });
  const level = new Map();
  const queue = [];
  nodes.forEach(n=>{ if((incoming.get(n.id)||0)===0){ level.set(n.id, 0); queue.push(n.id); } });
  while(queue.length){
    const id = queue.shift();
    const lv = level.get(id);
    arrows.filter(a=>a.source_node_id===id).forEach(a=>{
      const cur = level.get(a.target_node_id) ?? -1;
      if (lv+1 > cur){ level.set(a.target_node_id, lv+1); queue.push(a.target_node_id); }
    });
  }
  // group by level
  const byLevel = new Map();
  nodes.forEach(n=>{
    const lv = level.get(n.id) ?? 0;
    if(!byLevel.has(lv)) byLevel.set(lv, []);
    byLevel.get(lv).push(n.id);
  });
  const startX = 80, startY = 200, dx = 240, dy = 140;
  const result = [];
  [...byLevel.keys()].sort((a,b)=>a-b).forEach(lv=>{
    const ids = byLevel.get(lv);
    ids.forEach((id, i)=>{
      result.push({ id, position_x: startX + lv*dx, position_y: startY + i*dy });
    });
  });
  return result;
}

// ─────────────────────────────────────────────────────────────────────────────
// PARTICLES (client view ambient embers)
// ─────────────────────────────────────────────────────────────────────────────
function ParticleLayer({ enabled }) {
  const canvasRef = useRef(null);
  useEffect(() => {
    if (!enabled) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let raf;
    const colors = ["#E8823A","#F0A500","rgba(196,98,45,0.6)"];
    const particles = Array.from({length:18},()=>spawn(canvas.width, canvas.height));
    function spawn(w,h){
      return {
        x: Math.random()*w,
        y: h + Math.random()*40,
        r: 1 + Math.random()*2.2,
        vy: -0.15 - Math.random()*0.4,
        vx: (Math.random()-0.5)*0.15,
        a: 0,
        max: 0.4 + Math.random()*0.5,
        life: 0,
        ttl: 600 + Math.random()*900,
        color: colors[Math.floor(Math.random()*colors.length)],
      };
    }
    function resize(){
      const r = canvas.getBoundingClientRect();
      canvas.width = r.width; canvas.height = r.height;
    }
    resize();
    const ro = new ResizeObserver(resize); ro.observe(canvas);
    function tick(){
      ctx.clearRect(0,0,canvas.width,canvas.height);
      particles.forEach((p,i)=>{
        p.life++;
        p.x += p.vx; p.y += p.vy;
        const fadeIn = Math.min(1, p.life/40);
        const fadeOut = Math.max(0, 1 - (p.life - (p.ttl-60))/60);
        p.a = p.max * fadeIn * fadeOut;
        if (p.life > p.ttl || p.y < -10){
          Object.assign(p, spawn(canvas.width, canvas.height));
        }
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI*2);
        ctx.fillStyle = p.color.startsWith("rgba") ? p.color : `${p.color}`;
        ctx.globalAlpha = p.a;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 8;
        ctx.fill();
      });
      ctx.globalAlpha = 1; ctx.shadowBlur = 0;
      raf = requestAnimationFrame(tick);
    }
    tick();
    return () => { cancelAnimationFrame(raf); ro.disconnect(); };
  }, [enabled]);
  if (!enabled) return null;
  return <canvas ref={canvasRef} style={{position:"absolute",inset:0,pointerEvents:"none",zIndex:2}}/>;
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
export default function FlowchartTab({ projectId, isInternal, userProfile, t, mobile }) {
  const [nodes, setNodes] = useState([]);
  const [arrows, setArrows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [missingTables, setMissingTables] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [editingId, setEditingId] = useState(null);  // for side panel (admin)
  const [detailId, setDetailId] = useState(null);    // for detail panel (client)
  const [tool, setTool] = useState("select");        // select | rect | arrow | delete
  const [arrowSource, setArrowSource] = useState(null);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [saveStatus, setSaveStatus] = useState("");  // "Saving…" / "Saved ✓" / ""
  const [confettiFired, setConfettiFired] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [editingTitleId, setEditingTitleId] = useState(null);
  const [editingTitleVal, setEditingTitleVal] = useState("");

  const canvasRef = useRef(null);
  const draggingNode = useRef(null);
  const panning = useRef(null);
  const reducedMotion = useMemo(()=>prefersReducedMotion(), []);

  const flashSaved = useCallback(() => {
    setSaveStatus("Saving…");
    setTimeout(()=>setSaveStatus("Saved ✓"), 250);
    setTimeout(()=>setSaveStatus(""), 1700);
  }, []);

  // Load + realtime
  const load = useCallback(async () => {
    setLoading(true);
    const [nRes, aRes] = await Promise.all([
      supabase.from("flowchart_nodes").select("*").eq("project_id", projectId).order("created_at",{ascending:true}),
      supabase.from("flowchart_arrows").select("*").eq("project_id", projectId).order("created_at",{ascending:true}),
    ]);
    if (nRes.error && /relation .* does not exist|Could not find the table/i.test(nRes.error.message)) {
      setMissingTables(true); setLoading(false); return;
    }
    setMissingTables(false);
    setNodes(nRes.data || []);
    setArrows(aRes.data || []);
    setLoading(false);
  }, [projectId]);

  useEffect(() => { load(); }, [load]);

  // Realtime subscription
  useEffect(() => {
    if (missingTables) return;
    const ch = supabase
      .channel(`flowchart-${projectId}`)
      .on("postgres_changes", { event:"*", schema:"public", table:"flowchart_nodes", filter:`project_id=eq.${projectId}` }, () => load())
      .on("postgres_changes", { event:"*", schema:"public", table:"flowchart_arrows", filter:`project_id=eq.${projectId}` }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [projectId, missingTables, load]);

  // Auto-seed sample data (admin only, when empty)
  const seededRef = useRef(false);
  useEffect(() => {
    if (loading || missingTables || seededRef.current) return;
    if (!isInternal) return;
    if (nodes.length > 0) return;
    seededRef.current = true;
    (async () => {
      const today = new Date();
      const insertedNodes = [];
      for (let i = 0; i < SAMPLE_NODES.length; i++) {
        const s = SAMPLE_NODES[i];
        const d = new Date(today); d.setDate(d.getDate() + i*14);
        const { data, error } = await supabase.from("flowchart_nodes").insert({
          project_id: projectId, title: s.title, status: s.status,
          description: s.desc, estimated_date: d.toISOString().slice(0,10),
          position_x: s.x, position_y: s.y,
        }).select().single();
        if (!error && data) insertedNodes.push(data);
      }
      for (let i = 0; i < insertedNodes.length - 1; i++) {
        await supabase.from("flowchart_arrows").insert({
          project_id: projectId,
          source_node_id: insertedNodes[i].id,
          target_node_id: insertedNodes[i+1].id,
        });
      }
      load();
    })();
  }, [loading, missingTables, isInternal, nodes.length, projectId, load]);

  // Confetti when 100% complete (client view only)
  useEffect(() => {
    if (isInternal || confettiFired || nodes.length === 0 || reducedMotion) return;
    const allDone = nodes.every(n => n.status === "done");
    if (!allDone) return;
    setConfettiFired(true);
    setShowToast(true);
    const colors = ["#E8823A","#F0A500","#C4622D","#F5E6D3"];
    confetti({ particleCount: 200, spread: 160, origin: { y: 0.5 }, colors });
    setTimeout(()=> confetti({ particleCount: 100, spread: 120, origin: { x: 0.2, y: 0.4 }, colors }), 250);
    setTimeout(()=> confetti({ particleCount: 100, spread: 120, origin: { x: 0.8, y: 0.4 }, colors }), 500);
    setTimeout(()=> setShowToast(false), 6000);
  }, [nodes, isInternal, confettiFired, reducedMotion]);

  // Keyboard delete
  useEffect(() => {
    function onKey(e){
      if (!isInternal) return;
      if (editingTitleId || editingId || detailId) return;
      if (document.activeElement && ["INPUT","TEXTAREA"].includes(document.activeElement.tagName)) return;
      if ((e.key === "Delete" || e.key === "Backspace") && selectedId) {
        e.preventDefault();
        deleteNode(selectedId);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, isInternal, editingTitleId, editingId, detailId]);

  // ───── DB mutations ─────
  async function createNode(x, y, title="New Step") {
    const today = new Date();
    const sx = snap(x), sy = snap(y);
    const { data, error } = await supabase.from("flowchart_nodes").insert({
      project_id: projectId, title, status: "pending", description: "",
      estimated_date: today.toISOString().slice(0,10),
      position_x: sx, position_y: sy,
    }).select().single();
    if (error) { console.error("createNode", error.message); return; }
    setNodes(ns => [...ns, data]);
    flashSaved();
  }
  async function updateNode(id, patch) {
    setNodes(ns => ns.map(n => n.id === id ? { ...n, ...patch } : n));
    const { error } = await supabase.from("flowchart_nodes").update(patch).eq("id", id);
    if (error) console.error("updateNode", error.message);
    flashSaved();
  }
  async function deleteNode(id) {
    await supabase.from("flowchart_arrows").delete().or(`source_node_id.eq.${id},target_node_id.eq.${id}`);
    await supabase.from("flowchart_nodes").delete().eq("id", id);
    setNodes(ns => ns.filter(n => n.id !== id));
    setArrows(as => as.filter(a => a.source_node_id !== id && a.target_node_id !== id));
    setSelectedId(null);
    flashSaved();
  }
  async function createArrow(sourceId, targetId) {
    if (sourceId === targetId) return;
    if (arrows.some(a => a.source_node_id === sourceId && a.target_node_id === targetId)) return;
    const { data, error } = await supabase.from("flowchart_arrows").insert({
      project_id: projectId, source_node_id: sourceId, target_node_id: targetId,
    }).select().single();
    if (error) { console.error("createArrow", error.message); return; }
    setArrows(as => [...as, data]);
    flashSaved();
  }
  async function deleteArrow(id) {
    await supabase.from("flowchart_arrows").delete().eq("id", id);
    setArrows(as => as.filter(a => a.id !== id));
    flashSaved();
  }
  async function runAutoLayout() {
    const positions = autoLayout(nodes, arrows);
    setNodes(ns => ns.map(n => {
      const p = positions.find(p => p.id === n.id);
      return p ? { ...n, position_x: p.position_x, position_y: p.position_y } : n;
    }));
    for (const p of positions) {
      await supabase.from("flowchart_nodes").update({ position_x: p.position_x, position_y: p.position_y }).eq("id", p.id);
    }
    flashSaved();
  }

  // ───── Canvas mouse handlers ─────
  function getCanvasCoords(e) {
    const rect = canvasRef.current.getBoundingClientRect();
    const cx = (e.clientX - rect.left - pan.x) / zoom;
    const cy = (e.clientY - rect.top - pan.y) / zoom;
    return { x: cx, y: cy };
  }
  function onCanvasMouseDown(e) {
    if (e.target !== e.currentTarget && !e.target.dataset?.bg) return;
    if (!isInternal) {
      // Pan in client mode
      panning.current = { startX: e.clientX, startY: e.clientY, panX: pan.x, panY: pan.y };
      return;
    }
    if (tool === "rect") {
      const { x, y } = getCanvasCoords(e);
      createNode(x - NODE_W/2, y - NODE_H/2);
      setTool("select");
    } else {
      // Pan
      panning.current = { startX: e.clientX, startY: e.clientY, panX: pan.x, panY: pan.y };
      setSelectedId(null);
    }
  }
  function onMouseMove(e) {
    if (panning.current) {
      setPan({
        x: panning.current.panX + (e.clientX - panning.current.startX),
        y: panning.current.panY + (e.clientY - panning.current.startY),
      });
      return;
    }
    if (draggingNode.current) {
      const { id, offsetX, offsetY } = draggingNode.current;
      const { x, y } = getCanvasCoords(e);
      const nx = x - offsetX, ny = y - offsetY;
      setNodes(ns => ns.map(n => n.id === id ? { ...n, position_x: nx, position_y: ny } : n));
    }
  }
  function onMouseUp() {
    panning.current = null;
    if (draggingNode.current) {
      const id = draggingNode.current.id;
      const node = nodes.find(n => n.id === id);
      if (node) {
        const sx = snap(node.position_x), sy = snap(node.position_y);
        updateNode(id, { position_x: sx, position_y: sy });
      }
      draggingNode.current = null;
    }
  }
  function onWheel(e) {
    if (!e.ctrlKey && !e.metaKey && Math.abs(e.deltaY) < 8) return;
    e.preventDefault();
    const delta = -e.deltaY * 0.001;
    setZoom(z => Math.min(2.5, Math.max(0.4, z + delta)));
  }
  function onTouchStart(e){
    if (e.touches.length === 1) {
      const tch = e.touches[0];
      panning.current = { startX: tch.clientX, startY: tch.clientY, panX: pan.x, panY: pan.y };
    }
  }
  function onTouchMove(e){
    if (!panning.current || e.touches.length !== 1) return;
    const tch = e.touches[0];
    setPan({
      x: panning.current.panX + (tch.clientX - panning.current.startX),
      y: panning.current.panY + (tch.clientY - panning.current.startY),
    });
  }
  function onTouchEnd(){ panning.current = null; }

  // ───── Node mouse handlers ─────
  function onNodeMouseDown(e, node) {
    e.stopPropagation();
    if (!isInternal) return;
    if (tool === "arrow") {
      if (!arrowSource) setArrowSource(node.id);
      else { createArrow(arrowSource, node.id); setArrowSource(null); setTool("select"); }
      return;
    }
    if (tool === "delete") { deleteNode(node.id); return; }
    setSelectedId(node.id);
    const { x, y } = getCanvasCoords(e);
    draggingNode.current = { id: node.id, offsetX: x - node.position_x, offsetY: y - node.position_y };
  }
  function onNodeClick(e, node) {
    e.stopPropagation();
    if (!isInternal) {
      setDetailId(node.id);
    }
  }
  function onNodeDoubleClick(e, node) {
    if (!isInternal) return;
    e.stopPropagation();
    setEditingTitleId(node.id);
    setEditingTitleVal(node.title);
  }

  // ───── Render ─────
  if (missingTables) return <SetupNotice t={t}/>;
  if (loading) return (
    <div style={{padding:40,textAlign:"center",color:t.textSub,fontSize:14}}>
      Loading flowchart…
    </div>
  );

  const doneCount = nodes.filter(n => n.status === "done").length;
  const progress = nodes.length ? Math.round((doneCount / nodes.length) * 100) : 0;
  const detailNode = nodes.find(n => n.id === detailId);
  const editingNode = nodes.find(n => n.id === editingId);

  return (
    <div style={{position:"relative",border:`1px solid ${t.border}`,borderRadius:14,overflow:"hidden",background:t.surface,boxShadow:t.shadow,height:`calc(100vh - ${mobile?220:200}px)`,minHeight:520,display:"flex",flexDirection:"column"}}>
      <style>{`
        @keyframes fc-pulse { 0%,100%{transform:scale(1);box-shadow:0 0 14px rgba(232,130,58,0.5);} 50%{transform:scale(1.02);box-shadow:0 0 22px rgba(232,130,58,0.7);} }
        @keyframes fc-shimmer { 0%{background-position:-200% 50%;} 100%{background-position:200% 50%;} }
        @keyframes fc-dash { to { stroke-dashoffset: -20; } }
        @keyframes fc-shine { 0%{transform:translateX(-100%);} 100%{transform:translateX(200%);} }
        @keyframes fc-ember { 0%{opacity:1;transform:translate(0,0) scale(1);} 100%{opacity:0;transform:translate(var(--dx),-40px) scale(0.4);} }
        @media (prefers-reduced-motion: reduce) {
          .fc-pulse, .fc-shimmer-bg, .fc-dash-anim, .fc-shine, .fc-ember { animation: none !important; }
        }
        .fc-arrow:hover { filter: drop-shadow(0 0 4px #E8823A); }
        .fc-node-glass {
          background: rgba(61,36,16,0.55);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
        }
      `}</style>

      {/* TOP BAR */}
      <div style={{padding:"10px 14px",borderBottom:`1px solid ${t.border}`,display:"flex",alignItems:"center",gap:10,flexWrap:"wrap",background:t.surfaceHigh,zIndex:10}}>
        {isInternal ? (
          <>
            <div style={{display:"flex",gap:6,alignItems:"center"}}>
              <ToolBtn t={t} active={tool==="select"} onClick={()=>{setTool("select");setArrowSource(null);}} title="Select / Move">↖</ToolBtn>
              <ToolBtn t={t} active={tool==="rect"} onClick={()=>{setTool("rect");setArrowSource(null);}} title="Add rectangle node (click canvas)">▭</ToolBtn>
              <ToolBtn t={t} active={tool==="arrow"} onClick={()=>{setTool("arrow");setArrowSource(null);}} title="Connect: click source then target">→</ToolBtn>
              <ToolBtn t={t} active={tool==="delete"} onClick={()=>{setTool("delete");setArrowSource(null);}} title="Delete (click node)">🗑</ToolBtn>
            </div>
            <div style={{width:1,height:22,background:t.border}}/>
            <button onClick={()=>{
              const rect = canvasRef.current.getBoundingClientRect();
              const cx = (rect.width/2 - pan.x)/zoom;
              const cy = (rect.height/2 - pan.y)/zoom;
              createNode(cx - NODE_W/2, cy - NODE_H/2);
            }} style={primaryBtn(t)}>+ Add Node</button>
            <button onClick={runAutoLayout} style={ghostBtn(t)}>Auto Layout</button>
            <div style={{position:"relative"}}>
              <button onClick={()=>setShowTemplates(s=>!s)} style={ghostBtn(t)}>Templates ▾</button>
              {showTemplates && (
                <>
                  <div onClick={()=>setShowTemplates(false)} style={{position:"fixed",inset:0,zIndex:50}}/>
                  <div style={{position:"absolute",top:36,left:0,zIndex:51,background:t.surface,border:`1px solid ${t.border}`,borderRadius:8,minWidth:220,boxShadow:"0 8px 24px rgba(0,0,0,0.4)"}}>
                    {TEMPLATES.map(name => (
                      <button key={name} onClick={()=>{
                        const rect = canvasRef.current.getBoundingClientRect();
                        const cx = (rect.width/2 - pan.x)/zoom;
                        const cy = (rect.height/2 - pan.y)/zoom;
                        createNode(cx - NODE_W/2, cy - NODE_H/2, name);
                        setShowTemplates(false);
                      }} style={{display:"block",width:"100%",textAlign:"left",padding:"9px 14px",background:"transparent",border:"none",color:t.text,fontSize:13,cursor:"pointer",fontFamily:"inherit"}}>{name}</button>
                    ))}
                  </div>
                </>
              )}
            </div>
            <div style={{flex:1}}/>
            {tool === "arrow" && <span style={{color:t.accentLight,fontSize:12,fontStyle:"italic"}}>{arrowSource ? "Click target node" : "Click source node"}</span>}
            <span style={{color:saveStatus.includes("Saving") ? t.textSub : t.green, fontSize:12, minWidth:64, textAlign:"right", transition:"color 0.2s"}}>{saveStatus}</span>
            <span style={{color:t.textDim,fontSize:11}}>{Math.round(zoom*100)}%</span>
          </>
        ) : (
          <>
            <span style={{color:t.text,fontSize:15,fontWeight:400,letterSpacing:"0.04em"}}>Your Case Progress — <span style={{color:t.accentLight,fontWeight:500}}>{progress}% Complete</span></span>
            <div style={{flex:1,position:"relative",height:10,background:"rgba(245,230,211,0.08)",borderRadius:99,overflow:"hidden",marginLeft:14}}>
              <div style={{width:`${progress}%`,height:"100%",background:`linear-gradient(90deg, #C4622D, #E8823A, #F0A500)`,boxShadow:"0 0 12px #F0A500",borderRadius:99,transition:"width 0.6s ease"}}>
                <div className="fc-shine" style={{position:"absolute",inset:0,background:"linear-gradient(90deg, transparent, rgba(255,255,255,0.35), transparent)",animation:reducedMotion?"none":"fc-shine 2.4s linear infinite"}}/>
              </div>
            </div>
          </>
        )}
      </div>

      {/* CANVAS AREA */}
      <div
        ref={canvasRef}
        data-bg="1"
        onMouseDown={onCanvasMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
        onWheel={onWheel}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        style={{
          flex:1, position:"relative", overflow:"hidden", cursor: isInternal ? (tool==="rect"?"crosshair":tool==="arrow"?"alias":tool==="delete"?"not-allowed":"grab") : "grab",
          backgroundColor: t.bg,
          backgroundImage: `radial-gradient(circle, rgba(196,98,45,0.18) 1px, transparent 1px)`,
          backgroundSize: `${20*zoom}px ${20*zoom}px`,
          backgroundPosition: `${pan.x}px ${pan.y}px`,
        }}
      >
        {/* Vignette + particles for client view */}
        {!isInternal && (
          <>
            <div style={{position:"absolute",inset:0,pointerEvents:"none",zIndex:1,background:"radial-gradient(ellipse at center, rgba(232,130,58,0.10), transparent 65%)"}}/>
            <ParticleLayer enabled={!reducedMotion}/>
          </>
        )}

        {/* SVG arrows + nodes layer (transformed) */}
        <div style={{position:"absolute",left:0,top:0,transform:`translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,transformOrigin:"0 0",pointerEvents:"none",zIndex:3}}>
          <svg style={{position:"absolute",left:-2000,top:-2000,width:6000,height:6000,overflow:"visible",pointerEvents:"none"}}>
            <defs>
              <marker id={`arrowhead-${projectId}`} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                <path d="M 0 0 L 10 5 L 0 10 z" fill="#C4622D"/>
              </marker>
            </defs>
            <g transform="translate(2000, 2000)">
              {arrows.map(a => {
                const src = nodes.find(n => n.id === a.source_node_id);
                const tgt = nodes.find(n => n.id === a.target_node_id);
                if (!src || !tgt) return null;
                const { d } = arrowPath(src, tgt);
                return (
                  <g key={a.id} className="fc-arrow" style={{pointerEvents:"auto",cursor: isInternal?"pointer":"default"}}
                     onClick={()=>{ if(isInternal) deleteArrow(a.id); }}>
                    <path d={d} fill="none" stroke="#C4622D" strokeWidth="2.2" strokeDasharray="6 5"
                          markerEnd={`url(#arrowhead-${projectId})`}
                          style={{strokeDashoffset:0, animation: reducedMotion ? "none" : "fc-dash 0.9s linear infinite"}}/>
                    {/* invisible wider hit area */}
                    <path d={d} fill="none" stroke="transparent" strokeWidth="14"/>
                  </g>
                );
              })}
            </g>
          </svg>

          {nodes.map(node => {
            const isSelected = selectedId === node.id;
            const isArrowSrc = arrowSource === node.id;
            return (
              <NodeView
                key={node.id}
                node={node}
                t={t}
                isInternal={isInternal}
                selected={isSelected}
                isArrowSrc={isArrowSrc}
                editingTitle={editingTitleId === node.id}
                editingTitleVal={editingTitleVal}
                onTitleChange={setEditingTitleVal}
                onTitleBlur={()=>{
                  if (editingTitleVal.trim() && editingTitleVal !== node.title) {
                    updateNode(node.id, { title: editingTitleVal.trim() });
                  }
                  setEditingTitleId(null);
                }}
                onMouseDown={(e)=>onNodeMouseDown(e, node)}
                onClick={(e)=>onNodeClick(e, node)}
                onDoubleClick={(e)=>onNodeDoubleClick(e, node)}
                onEditOpen={()=>setEditingId(node.id)}
                onStatusChange={(s)=>updateNode(node.id, { status: s })}
                reducedMotion={reducedMotion}
              />
            );
          })}
        </div>

        {nodes.length === 0 && !loading && (
          <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",color:t.textSub,fontSize:14,fontStyle:"italic",zIndex:2,pointerEvents:"none"}}>
            {isInternal ? "Use the rectangle tool or templates to add your first step." : "No flowchart published yet."}
          </div>
        )}

        {/* Minimap (admin only) */}
        {isInternal && nodes.length > 0 && !mobile && (
          <Minimap nodes={nodes} arrows={arrows} t={t} pan={pan} zoom={zoom}
                   viewport={canvasRef.current?.getBoundingClientRect()}/>
        )}
      </div>

      {/* ADMIN EDIT PANEL */}
      {editingNode && (
        <NodeEditPanel
          key={editingNode.id}
          node={editingNode} t={t} mobile={mobile}
          onClose={()=>setEditingId(null)}
          onSave={(patch)=>updateNode(editingNode.id, patch)}
          onDelete={()=>{ deleteNode(editingNode.id); setEditingId(null); }}
          userProfile={userProfile}
        />
      )}

      {/* CLIENT DETAIL PANEL */}
      {detailNode && (
        <NodeDetailPanel
          key={detailNode.id}
          node={detailNode} t={t} mobile={mobile}
          onClose={()=>setDetailId(null)}
          userProfile={userProfile}
        />
      )}

      {/* Confetti toast */}
      {showToast && !isInternal && (
        <div style={{
          position:"absolute",top:"40%",left:"50%",transform:"translate(-50%,-50%)",zIndex:100,
          background:"rgba(61,36,16,0.95)",border:`1px solid #E8823A`,borderRadius:14,
          padding:"22px 36px",boxShadow:"0 12px 48px rgba(0,0,0,0.6), 0 0 40px rgba(232,130,58,0.4)",
          color:t.text,fontSize:22,fontWeight:400,letterSpacing:"0.04em",fontFamily:"inherit",
          animation:"fc-shimmer 4s ease-in-out infinite",
          textAlign:"center",
        }}>
          🎉 Congratulations — Your Matter is Complete!
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SUB-COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────
function NodeView({ node, t, isInternal, selected, isArrowSrc, editingTitle, editingTitleVal, onTitleChange, onTitleBlur, onMouseDown, onClick, onDoubleClick, onEditOpen, onStatusChange, reducedMotion }) {
  const isDone = node.status === "done";
  const isInProgress = node.status === "in_progress";
  const isPending = node.status === "pending";

  const stateStyle = {};
  if (isInProgress && !reducedMotion) {
    stateStyle.animation = "fc-pulse 2.5s ease-in-out infinite";
    stateStyle.borderColor = "#E8823A";
  } else if (isInProgress) {
    stateStyle.boxShadow = "0 0 14px rgba(232,130,58,0.5)";
    stateStyle.borderColor = "#E8823A";
  }
  if (isPending) { stateStyle.opacity = 0.55; }

  const statusLabel = STATUS_LABELS[node.status]?.[isInternal?"admin":"client"] || node.status;
  const statusColor = isDone ? "#F0A500" : isInProgress ? "#E8823A" : "#D4A57A";

  return (
    <div
      onMouseDown={onMouseDown}
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      className={isInternal ? "" : "fc-node-glass"}
      style={{
        position:"absolute", left: node.position_x, top: node.position_y,
        width: NODE_W, height: NODE_H, borderRadius: 12,
        background: isInternal ? "rgba(61,36,16,0.85)" : "rgba(61,36,16,0.55)",
        backdropFilter: isInternal ? "none" : "blur(12px)",
        WebkitBackdropFilter: isInternal ? "none" : "blur(12px)",
        border: `${selected?2:1}px solid ${selected ? "#E8823A" : isArrowSrc ? "#F0A500" : "rgba(196,98,45,0.4)"}`,
        boxShadow: selected ? "0 0 0 3px rgba(232,130,58,0.2), 0 4px 16px rgba(0,0,0,0.4)" : "0 4px 14px rgba(0,0,0,0.3)",
        cursor: isInternal ? "move" : "pointer",
        userSelect:"none", pointerEvents:"auto",
        padding: "12px 14px", display:"flex", flexDirection:"column", justifyContent:"space-between",
        transition: "transform 0.2s ease, box-shadow 0.2s ease",
        overflow: "hidden",
        ...stateStyle,
      }}
      onMouseEnter={e => {
        if (!isInternal) {
          e.currentTarget.style.transform = "translateY(-4px)";
          e.currentTarget.style.boxShadow = "0 8px 24px rgba(0,0,0,0.5), 0 0 20px rgba(232,130,58,0.3)";
        }
      }}
      onMouseLeave={e => {
        if (!isInternal) {
          e.currentTarget.style.transform = "translateY(0)";
          e.currentTarget.style.boxShadow = "0 4px 14px rgba(0,0,0,0.3)";
        }
      }}
    >
      {/* Done shimmer overlay */}
      {isDone && !reducedMotion && (
        <div style={{
          position:"absolute",inset:0,borderRadius:12,pointerEvents:"none",
          background:"linear-gradient(110deg, transparent 30%, rgba(240,165,0,0.35) 50%, transparent 70%)",
          backgroundSize:"200% 100%",
          animation:"fc-shimmer 6s ease-in-out infinite",
        }}/>
      )}

      <div style={{display:"flex",alignItems:"flex-start",gap:8,position:"relative",zIndex:1}}>
        {editingTitle ? (
          <input
            autoFocus value={editingTitleVal}
            onChange={e=>onTitleChange(e.target.value)}
            onBlur={onTitleBlur}
            onKeyDown={e=>{ if(e.key==="Enter"){ e.target.blur(); } if(e.key==="Escape"){ onTitleChange(""); onTitleBlur(); } }}
            onClick={e=>e.stopPropagation()}
            style={{flex:1,background:"rgba(0,0,0,0.3)",border:`1px solid ${t.accent}`,borderRadius:4,color:t.text,fontSize:14,padding:"3px 6px",fontFamily:"inherit",outline:"none"}}
          />
        ) : (
          <div style={{flex:1,color:t.text,fontSize:14,fontWeight:400,letterSpacing:"0.02em",lineHeight:1.25}}>
            {isDone && "✓ "}{node.title}
          </div>
        )}
        {isInternal && !editingTitle && (
          <button onClick={(e)=>{e.stopPropagation();onEditOpen();}} title="Edit details"
            style={{background:"transparent",border:"none",color:t.textSub,cursor:"pointer",fontSize:12,padding:0,lineHeight:1,opacity:0.7}}>✎</button>
        )}
      </div>

      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:6,position:"relative",zIndex:1}}>
        {isInternal ? (
          <select
            value={node.status}
            onChange={(e)=>onStatusChange(e.target.value)}
            onClick={e=>e.stopPropagation()}
            onMouseDown={e=>e.stopPropagation()}
            style={{background:"rgba(0,0,0,0.25)",border:`1px solid ${statusColor}40`,borderRadius:99,color:statusColor,fontSize:10,fontWeight:500,padding:"3px 8px",fontFamily:"inherit",cursor:"pointer",outline:"none",letterSpacing:"0.04em"}}>
            <option value="pending" style={{background:t.surface,color:t.text}}>Pending</option>
            <option value="in_progress" style={{background:t.surface,color:t.text}}>In Progress</option>
            <option value="done" style={{background:t.surface,color:t.text}}>Done</option>
          </select>
        ) : (
          <span style={{background:`${statusColor}1F`,border:`1px solid ${statusColor}55`,borderRadius:99,color:statusColor,fontSize:10,fontWeight:500,padding:"3px 9px",letterSpacing:"0.06em",textTransform:"uppercase"}}>
            {statusLabel}
          </span>
        )}
        {node.estimated_date && (
          <span style={{color:t.textSub,fontSize:10,letterSpacing:"0.02em"}}>{fmtDate(node.estimated_date)}</span>
        )}
      </div>
    </div>
  );
}

function NodeEditPanel({ node, t, mobile, onClose, onSave, onDelete, userProfile }) {
  const [title, setTitle] = useState(node.title);
  const [description, setDescription] = useState(node.description || "");
  const [estimatedDate, setEstimatedDate] = useState(node.estimated_date || "");
  const [status, setStatus] = useState(node.status);
  const [comments, setComments] = useState([]);
  const [attachments, setAttachments] = useState([]);
  const [newComment, setNewComment] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [linkName, setLinkName] = useState("");

  useEffect(() => { loadCommentsAndAttachments(); /* eslint-disable-next-line */ }, [node.id]);
  async function loadCommentsAndAttachments(){
    const [cRes, aRes] = await Promise.all([
      supabase.from("flowchart_comments").select("*").eq("node_id", node.id).order("created_at",{ascending:true}),
      supabase.from("flowchart_attachments").select("*").eq("node_id", node.id).order("created_at",{ascending:true}),
    ]);
    setComments(cRes.data || []);
    setAttachments(aRes.data || []);
  }

  function commit() {
    const patch = {};
    if (title !== node.title) patch.title = title;
    if (description !== (node.description||"")) patch.description = description;
    if (estimatedDate !== (node.estimated_date||"")) patch.estimated_date = estimatedDate || null;
    if (status !== node.status) patch.status = status;
    if (Object.keys(patch).length) onSave(patch);
  }

  async function addComment(){
    if (!newComment.trim()) return;
    const author = userProfile?.full_name || "Admin";
    const initial = (author[0] || "A").toUpperCase();
    const { data, error } = await supabase.from("flowchart_comments").insert({
      node_id: node.id, author_name: author, author_initial: initial, body: newComment.trim(),
    }).select().single();
    if (!error && data) { setComments(c => [...c, data]); setNewComment(""); }
  }
  async function addLink(){
    if (!linkUrl.trim()) return;
    const { data, error } = await supabase.from("flowchart_attachments").insert({
      node_id: node.id, file_name: linkName.trim() || linkUrl.trim(), file_url: linkUrl.trim(),
    }).select().single();
    if (!error && data) { setAttachments(a => [...a, data]); setLinkUrl(""); setLinkName(""); }
  }
  async function removeAttachment(id){
    await supabase.from("flowchart_attachments").delete().eq("id", id);
    setAttachments(a => a.filter(x => x.id !== id));
  }

  return (
    <SidePanel t={t} mobile={mobile} onClose={onClose}>
      <h2 style={{margin:"0 0 4px",fontSize:22,fontWeight:400,letterSpacing:"0.03em",color:t.text}}>Edit Step</h2>
      <p style={{margin:"0 0 20px",color:t.textSub,fontSize:12,letterSpacing:"0.04em"}}>Changes save automatically</p>

      <Field label="Title" t={t}>
        <input value={title} onChange={e=>setTitle(e.target.value)} onBlur={commit} style={inputStyle(t)}/>
      </Field>
      <Field label="Description / notes" t={t}>
        <textarea value={description} onChange={e=>setDescription(e.target.value)} onBlur={commit} rows={4} style={{...inputStyle(t),resize:"vertical"}}/>
      </Field>
      <Field label="Estimated completion" t={t}>
        <input type="date" value={estimatedDate} onChange={e=>setEstimatedDate(e.target.value)} onBlur={commit} style={inputStyle(t)}/>
      </Field>
      <Field label="Status" t={t}>
        <div style={{display:"flex",gap:6}}>
          {["pending","in_progress","done"].map(s => (
            <button key={s} onClick={()=>{ setStatus(s); onSave({ status: s }); }}
              style={{flex:1,padding:"7px 10px",borderRadius:99,fontSize:11,fontWeight:500,letterSpacing:"0.04em",border:`1px solid ${status===s?t.accent:t.border}`,background:status===s?t.accentSoft:"transparent",color:status===s?t.accentLight:t.textSub,cursor:"pointer",fontFamily:"inherit"}}>
              {STATUS_LABELS[s].admin}
            </button>
          ))}
        </div>
      </Field>

      <Field label={`Attachments (${attachments.length})`} t={t}>
        {attachments.map(a => (
          <div key={a.id} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"6px 10px",background:t.surfaceHigh,borderRadius:6,marginBottom:6,border:`1px solid ${t.border}`}}>
            <a href={a.file_url} target="_blank" rel="noreferrer" style={{color:t.accentLight,fontSize:12,textDecoration:"none",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",flex:1}}>{a.file_name}</a>
            <button onClick={()=>removeAttachment(a.id)} style={{background:"transparent",border:"none",color:t.red,cursor:"pointer",fontSize:14,padding:"0 4px"}}>×</button>
          </div>
        ))}
        <div style={{display:"flex",gap:6,marginTop:6}}>
          <input placeholder="Link name (optional)" value={linkName} onChange={e=>setLinkName(e.target.value)} style={{...inputStyle(t),flex:"0 1 40%"}}/>
          <input placeholder="https://…" value={linkUrl} onChange={e=>setLinkUrl(e.target.value)} style={{...inputStyle(t),flex:1}}/>
          <button onClick={addLink} style={{...primaryBtn(t),padding:"6px 12px"}}>+</button>
        </div>
      </Field>

      <Field label={`Comments (${comments.length})`} t={t}>
        <div style={{maxHeight:240,overflowY:"auto",marginBottom:8}}>
          {comments.length === 0 && <div style={{color:t.textDim,fontSize:12,fontStyle:"italic",padding:"6px 0"}}>No comments yet.</div>}
          {comments.map(c => <CommentRow key={c.id} c={c} t={t}/>)}
        </div>
        <div style={{display:"flex",gap:6}}>
          <input value={newComment} onChange={e=>setNewComment(e.target.value)} onKeyDown={e=>{if(e.key==="Enter")addComment();}} placeholder="Reply…" style={{...inputStyle(t),flex:1}}/>
          <button onClick={addComment} style={{...primaryBtn(t),padding:"6px 14px"}}>Send</button>
        </div>
      </Field>

      <button onClick={onDelete} style={{marginTop:18,background:"transparent",color:t.red,border:`1px solid ${t.red}55`,borderRadius:6,padding:"8px 14px",fontSize:12,cursor:"pointer",fontFamily:"inherit",letterSpacing:"0.04em"}}>Delete this step</button>
    </SidePanel>
  );
}

function NodeDetailPanel({ node, t, mobile, onClose, userProfile }) {
  const [comments, setComments] = useState([]);
  const [attachments, setAttachments] = useState([]);
  const [newComment, setNewComment] = useState("");

  useEffect(() => {
    (async () => {
      const [cRes, aRes] = await Promise.all([
        supabase.from("flowchart_comments").select("*").eq("node_id", node.id).order("created_at",{ascending:true}),
        supabase.from("flowchart_attachments").select("*").eq("node_id", node.id).order("created_at",{ascending:true}),
      ]);
      setComments(cRes.data || []);
      setAttachments(aRes.data || []);
    })();
  }, [node.id]);

  async function addComment(){
    if (!newComment.trim()) return;
    const author = userProfile?.full_name || "Client";
    const initial = (author[0] || "C").toUpperCase();
    const { data, error } = await supabase.from("flowchart_comments").insert({
      node_id: node.id, author_name: author, author_initial: initial, body: newComment.trim(),
    }).select().single();
    if (!error && data) { setComments(c => [...c, data]); setNewComment(""); }
  }

  const statusColor = node.status==="done" ? "#F0A500" : node.status==="in_progress" ? "#E8823A" : "#D4A57A";

  return (
    <SidePanel t={t} mobile={mobile} onClose={onClose}>
      <h2 style={{margin:"0 0 8px",fontSize:26,fontWeight:300,letterSpacing:"0.03em",color:t.text,lineHeight:1.2}}>{node.title}</h2>
      <span style={{display:"inline-block",background:`${statusColor}1F`,border:`1px solid ${statusColor}55`,borderRadius:99,color:statusColor,fontSize:11,fontWeight:500,padding:"4px 12px",letterSpacing:"0.06em",textTransform:"uppercase",marginBottom:18}}>
        {STATUS_LABELS[node.status].client}
      </span>
      {node.estimated_date && (
        <div style={{color:t.textSub,fontSize:13,marginBottom:14,letterSpacing:"0.02em"}}>
          <span style={{color:t.textDim}}>Estimated: </span>{fmtDate(node.estimated_date)}
        </div>
      )}
      {node.description && (
        <p style={{color:t.text,fontSize:14,lineHeight:1.6,fontWeight:300,marginBottom:20,letterSpacing:"0.01em"}}>{node.description}</p>
      )}

      {attachments.length > 0 && (
        <div style={{marginBottom:22}}>
          <div style={{color:t.textSub,fontSize:11,letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:8}}>Documents</div>
          {attachments.map(a => (
            <a key={a.id} href={a.file_url} target="_blank" rel="noreferrer" style={{display:"block",padding:"8px 12px",background:t.surfaceHigh,border:`1px solid ${t.border}`,borderRadius:6,color:t.accentLight,fontSize:13,textDecoration:"none",marginBottom:6}}>
              ↓ {a.file_name}
            </a>
          ))}
        </div>
      )}

      <div>
        <div style={{color:t.textSub,fontSize:11,letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:10}}>Discussion ({comments.length})</div>
        <div style={{maxHeight:280,overflowY:"auto",marginBottom:10}}>
          {comments.length === 0 && <div style={{color:t.textDim,fontSize:13,fontStyle:"italic",padding:"8px 0"}}>Be the first to comment on this step.</div>}
          {comments.map(c => <CommentRow key={c.id} c={c} t={t}/>)}
        </div>
        <div style={{display:"flex",gap:6}}>
          <input value={newComment} onChange={e=>setNewComment(e.target.value)} onKeyDown={e=>{if(e.key==="Enter")addComment();}} placeholder="Add a comment…" style={{...inputStyle(t),flex:1}}/>
          <button onClick={addComment} style={{...primaryBtn(t),padding:"8px 16px"}}>Send</button>
        </div>
      </div>
    </SidePanel>
  );
}

function SidePanel({ t, mobile, onClose, children }) {
  const [enter, setEnter] = useState(false);
  useEffect(() => { requestAnimationFrame(()=>setEnter(true)); }, []);
  return (
    <>
      <div onClick={onClose} style={{position:"absolute",inset:0,background:"rgba(0,0,0,0.3)",zIndex:40,opacity:enter?1:0,transition:"opacity 0.25s"}}/>
      <div style={{
        position:"absolute",top:0,right:0,bottom:0,zIndex:41,
        width: mobile ? "100%" : 420,
        background: t.surface,
        borderLeft: `1px solid ${t.border}`,
        boxShadow: "-12px 0 40px rgba(0,0,0,0.5)",
        padding: "24px 26px",
        overflowY:"auto",
        transform: enter ? "translateX(0)" : "translateX(100%)",
        transition: "transform 0.3s ease",
      }}>
        <button onClick={onClose} style={{position:"absolute",top:14,right:14,background:"transparent",border:"none",color:t.textSub,fontSize:22,cursor:"pointer",lineHeight:1,fontFamily:"inherit"}}>×</button>
        {children}
      </div>
    </>
  );
}

function CommentRow({ c, t }) {
  return (
    <div style={{display:"flex",gap:10,padding:"8px 0",borderBottom:`1px solid ${t.border}`}}>
      <div style={{width:30,height:30,borderRadius:"50%",background:t.accent,color:"#2C1A0E",display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:600,flexShrink:0,letterSpacing:"0.02em"}}>{c.author_initial || (c.author_name?.[0]?.toUpperCase()) || "?"}</div>
      <div style={{flex:1,minWidth:0}}>
        <div style={{display:"flex",alignItems:"baseline",gap:8}}>
          <span style={{color:t.text,fontSize:13,fontWeight:500}}>{c.author_name || "Anonymous"}</span>
          <span style={{color:t.textDim,fontSize:11}}>{fmtRelative(c.created_at)}</span>
        </div>
        <div style={{color:t.text,fontSize:13,fontWeight:300,lineHeight:1.5,marginTop:2,wordBreak:"break-word"}}>{c.body}</div>
      </div>
    </div>
  );
}

function Minimap({ nodes, arrows, t, pan, zoom, viewport }) {
  if (!viewport) return null;
  const padding = 40;
  const xs = nodes.map(n=>n.position_x);
  const ys = nodes.map(n=>n.position_y);
  const minX = Math.min(...xs) - padding;
  const minY = Math.min(...ys) - padding;
  const maxX = Math.max(...xs) + NODE_W + padding;
  const maxY = Math.max(...ys) + NODE_H + padding;
  const w = maxX - minX, h = maxY - minY;
  const mmW = 180, mmH = 120;
  const sx = mmW / w, sy = mmH / h, s = Math.min(sx, sy);
  // viewport rect in canvas coords
  const vpX = (-pan.x) / zoom;
  const vpY = (-pan.y) / zoom;
  const vpW = viewport.width / zoom;
  const vpH = viewport.height / zoom;
  return (
    <div style={{position:"absolute",bottom:14,right:14,width:mmW,height:mmH,background:"rgba(44,26,14,0.85)",border:`1px solid ${t.border}`,borderRadius:8,overflow:"hidden",zIndex:5,backdropFilter:"blur(8px)"}}>
      <svg width={mmW} height={mmH} style={{display:"block"}}>
        {nodes.map(n => (
          <rect key={n.id}
            x={(n.position_x - minX)*s} y={(n.position_y - minY)*s}
            width={NODE_W*s} height={NODE_H*s}
            fill={n.status==="done"?"#F0A500":n.status==="in_progress"?"#E8823A":"#D4A57A"}
            opacity="0.8" rx="2"/>
        ))}
        <rect x={(vpX - minX)*s} y={(vpY - minY)*s} width={vpW*s} height={vpH*s}
          fill="none" stroke="#F5E6D3" strokeWidth="1.2" opacity="0.6"/>
      </svg>
    </div>
  );
}

function SetupNotice({ t }) {
  const sql = `-- Run this in your Supabase SQL editor
CREATE TABLE IF NOT EXISTS flowchart_nodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id BIGINT NOT NULL,
  title TEXT NOT NULL DEFAULT 'New Step',
  status TEXT NOT NULL DEFAULT 'pending',
  description TEXT DEFAULT '',
  estimated_date DATE,
  position_x INTEGER NOT NULL DEFAULT 0,
  position_y INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE TABLE IF NOT EXISTS flowchart_arrows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id BIGINT NOT NULL,
  source_node_id UUID REFERENCES flowchart_nodes(id) ON DELETE CASCADE,
  target_node_id UUID REFERENCES flowchart_nodes(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE TABLE IF NOT EXISTS flowchart_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  node_id UUID REFERENCES flowchart_nodes(id) ON DELETE CASCADE,
  author_name TEXT,
  author_initial TEXT,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE TABLE IF NOT EXISTS flowchart_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  node_id UUID REFERENCES flowchart_nodes(id) ON DELETE CASCADE,
  file_name TEXT,
  file_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE flowchart_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE flowchart_arrows ENABLE ROW LEVEL SECURITY;
ALTER TABLE flowchart_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE flowchart_attachments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth all" ON flowchart_nodes FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth all" ON flowchart_arrows FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth all" ON flowchart_comments FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth all" ON flowchart_attachments FOR ALL TO authenticated USING (true) WITH CHECK (true);
ALTER PUBLICATION supabase_realtime ADD TABLE flowchart_nodes, flowchart_arrows, flowchart_comments;`;
  return (
    <div style={{padding:32,border:`1px solid ${t.border}`,borderRadius:14,background:t.surface}}>
      <h2 style={{margin:"0 0 10px",fontSize:22,fontWeight:400,color:t.text,letterSpacing:"0.03em"}}>One-time setup needed</h2>
      <p style={{color:t.textSub,fontSize:14,lineHeight:1.6,fontWeight:300,marginBottom:18}}>
        The flowchart feature needs four small tables in Supabase. Open your Supabase project → <strong style={{color:t.text}}>SQL Editor</strong> → paste the script below → click <strong style={{color:t.text}}>Run</strong>. Then refresh this page.
      </p>
      <pre style={{background:"#1f1108",border:`1px solid ${t.border}`,borderRadius:8,padding:16,color:t.text,fontSize:11,fontFamily:"'Geist Mono', monospace",overflowX:"auto",lineHeight:1.45,maxHeight:380,overflowY:"auto"}}>{sql}</pre>
      <button onClick={()=>{navigator.clipboard?.writeText(sql);}} style={{...primaryBtn(t),marginTop:12}}>Copy SQL</button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────
function ToolBtn({ children, t, active, onClick, title }) {
  return (
    <button onClick={onClick} title={title} style={{
      width:34, height:34, borderRadius:7,
      background: active ? t.accentSoft : "transparent",
      border: `1px solid ${active ? t.accent : t.border}`,
      color: active ? t.accentLight : t.textSub,
      fontSize: 14, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center",
      transition:"all 0.15s", fontFamily:"inherit",
    }}>{children}</button>
  );
}
function Field({ label, children, t }) {
  return (
    <div style={{marginBottom:16}}>
      <div style={{color:t.textSub,fontSize:11,letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:6}}>{label}</div>
      {children}
    </div>
  );
}
function inputStyle(t) {
  return {
    width:"100%", background:t.surfaceHigh, border:`1px solid ${t.border}`,
    borderRadius:6, padding:"8px 10px", fontSize:13, color:t.text, outline:"none",
    fontFamily:"inherit", boxSizing:"border-box",
  };
}
function primaryBtn(t) {
  return { background:"#E8823A", color:"#2C1A0E", border:"none", borderRadius:6, padding:"7px 14px", fontSize:12, fontWeight:500, cursor:"pointer", fontFamily:"inherit", letterSpacing:"0.04em" };
}
function ghostBtn(t) {
  return { background:"transparent", color:t.text, border:`1px solid ${t.accent}`, borderRadius:6, padding:"7px 14px", fontSize:12, fontWeight:500, cursor:"pointer", fontFamily:"inherit", letterSpacing:"0.04em" };
}
function fmtDate(s){
  if(!s) return "";
  const d = new Date(s);
  return d.toLocaleDateString("en-AU",{day:"numeric",month:"short",year:"numeric"});
}
function fmtRelative(s){
  if(!s) return "";
  const diff = (Date.now() - new Date(s).getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff/60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff/3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff/86400)}d ago`;
  return fmtDate(s);
}
