import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { supabase } from "@/lib/supabase.js";
import confetti from "canvas-confetti";

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────
const NODE_W = 160;
const NODE_H = 60;
const GRID = 24;
const ZOOM_MIN = 0.8;
const ZOOM_MAX = 1.5;

const STATUS_CYCLE = { pending: "in_progress", in_progress: "done", done: "pending" };
const STATUS_LABEL_ADMIN = { pending: "Pending", in_progress: "In Progress", done: "Done" };
const STATUS_LABEL_CLIENT = { pending: "Upcoming", in_progress: "Currently Working On", done: "Completed" };

const COLOR = {
  bg: "#FFFFFF",
  panel: "#F0F4F4",
  border: "#C5D4D4",
  text: "#082B2B",
  muted: "#3A6666",
  subtle: "#7AA8A8",
  accent: "#1A6666",
  arrow: "#7AA8A8",
  arrowHover: "#1A6666",
  dot: "#C5D4D4",
};

function snap(v) { return Math.round(v / GRID) * GRID; }
function prefersReducedMotion() {
  if (typeof window === "undefined") return false;
  return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
}

// Pick the closest of 4 sides (top/right/bottom/left) of a node for arrow attachment.
function nodeAnchor(node, side) {
  const cx = node.position_x + NODE_W / 2;
  const cy = node.position_y + NODE_H / 2;
  if (side === "top")    return { x: cx, y: node.position_y };
  if (side === "bottom") return { x: cx, y: node.position_y + NODE_H };
  if (side === "left")   return { x: node.position_x, y: cy };
  return { x: node.position_x + NODE_W, y: cy };
}
function bestSide(srcNode, tgtPoint) {
  // Choose the source side facing the target point.
  const cx = srcNode.position_x + NODE_W / 2;
  const cy = srcNode.position_y + NODE_H / 2;
  const dx = tgtPoint.x - cx;
  const dy = tgtPoint.y - cy;
  if (Math.abs(dx) > Math.abs(dy)) return dx > 0 ? "right" : "left";
  return dy > 0 ? "bottom" : "top";
}
function arrowPath(srcNode, tgtNode) {
  const sCenter = { x: srcNode.position_x + NODE_W/2, y: srcNode.position_y + NODE_H/2 };
  const tCenter = { x: tgtNode.position_x + NODE_W/2, y: tgtNode.position_y + NODE_H/2 };
  const sSide = bestSide(srcNode, tCenter);
  const tSide = bestSide(tgtNode, sCenter);
  const s = nodeAnchor(srcNode, sSide);
  const t = nodeAnchor(tgtNode, tSide);
  // Quadratic bezier control point bowed slightly perpendicular to the line.
  const mx = (s.x + t.x) / 2;
  const my = (s.y + t.y) / 2;
  const dx = t.x - s.x, dy = t.y - s.y;
  const len = Math.max(1, Math.hypot(dx, dy));
  const bow = Math.min(60, len * 0.15);
  const nx = -dy / len, ny = dx / len; // perpendicular unit vector
  const cx = mx + nx * bow;
  const cy = my + ny * bow;
  return `M ${s.x} ${s.y} Q ${cx} ${cy} ${t.x} ${t.y}`;
}
function previewArrowPath(s, t) {
  const mx = (s.x + t.x) / 2;
  const my = (s.y + t.y) / 2;
  const dx = t.x - s.x, dy = t.y - s.y;
  const len = Math.max(1, Math.hypot(dx, dy));
  const bow = Math.min(60, len * 0.15);
  const nx = -dy / len, ny = dx / len;
  const cx = mx + nx * bow;
  const cy = my + ny * bow;
  return `M ${s.x} ${s.y} Q ${cx} ${cy} ${t.x} ${t.y}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// PARTICLES (client view ambient)
// ─────────────────────────────────────────────────────────────────────────────
function ParticleLayer({ enabled }) {
  const canvasRef = useRef(null);
  useEffect(() => {
    if (!enabled) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let raf;
    const colors = ["#1A6666", "#1A6666", "rgba(26,102,102,0.6)"];
    const particles = Array.from({ length: 18 }, () => spawn(canvas.width, canvas.height));
    function spawn(w, h) {
      return {
        x: Math.random() * w, y: h + Math.random() * 40,
        r: 1 + Math.random() * 2.2,
        vy: -0.15 - Math.random() * 0.4,
        vx: (Math.random() - 0.5) * 0.15,
        a: 0, max: 0.4 + Math.random() * 0.5,
        life: 0, ttl: 600 + Math.random() * 900,
        color: colors[Math.floor(Math.random() * colors.length)],
      };
    }
    function resize() {
      const r = canvas.getBoundingClientRect();
      canvas.width = r.width; canvas.height = r.height;
    }
    resize();
    const ro = new ResizeObserver(resize); ro.observe(canvas);
    function tick() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach(p => {
        p.life++;
        p.x += p.vx; p.y += p.vy;
        const fadeIn = Math.min(1, p.life / 40);
        const fadeOut = Math.max(0, 1 - (p.life - (p.ttl - 60)) / 60);
        p.a = p.max * fadeIn * fadeOut;
        if (p.life > p.ttl || p.y < -10) Object.assign(p, spawn(canvas.width, canvas.height));
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
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
  return <canvas ref={canvasRef} style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 2 }} />;
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
export default function FlowchartTab({ projectId, isInternal, userProfile, t, mobile }) {
  const [nodes, setNodes] = useState([]);
  const [arrows, setArrows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [missingTables, setMissingTables] = useState(false);
  const [saveStatus, setSaveStatus] = useState(""); // "Saving…" | "Saved ✓" | ""

  // Builder state
  const [tool, setTool] = useState("hand"); // hand | rect | arrow | text
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [editingTitleId, setEditingTitleId] = useState(null);
  const [editingTitleVal, setEditingTitleVal] = useState("");
  const [hoveredNodeId, setHoveredNodeId] = useState(null);
  const [arrowDraft, setArrowDraft] = useState(null); // { fromNodeId, fromSide, toX, toY }
  const [selectedId, setSelectedId] = useState(null);
  const [contextMenu, setContextMenu] = useState(null); // { kind: "node"|"arrow", id, x, y }
  const [textTooltip, setTextTooltip] = useState(null); // { x, y } in screen coords
  const [showTemplates, setShowTemplates] = useState(false);

  // Client state
  const [detailId, setDetailId] = useState(null);
  const [confettiFired, setConfettiFired] = useState(false);
  const [showToast, setShowToast] = useState(false);

  const canvasRef = useRef(null);
  const draggingNode = useRef(null);
  const panning = useRef(null);
  const reducedMotion = useMemo(() => prefersReducedMotion(), []);
  const tooltipTimerRef = useRef(null);

  const flashSaved = useCallback(() => {
    setSaveStatus("Saving…");
    setTimeout(() => setSaveStatus("Saved ✓"), 250);
    setTimeout(() => setSaveStatus(""), 1700);
  }, []);

  // ───── Load + realtime ─────
  const load = useCallback(async () => {
    setLoading(true);
    const [nRes, aRes] = await Promise.all([
      supabase.from("flowchart_nodes").select("*").eq("project_id", projectId).order("created_at", { ascending: true }),
      supabase.from("flowchart_arrows").select("*").eq("project_id", projectId).order("created_at", { ascending: true }),
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

  // Realtime with status tracking, visibility re-subscribe, exponential backoff (500/1000/2000/4000ms)
  const channelRef = useRef(null);
  const subscribedRef = useRef(false);
  const retryRef = useRef(0);
  const retryTimerRef = useRef(null);
  useEffect(() => {
    if (missingTables) return;
    const teardown = () => {
      if (retryTimerRef.current) { clearTimeout(retryTimerRef.current); retryTimerRef.current = null; }
      if (channelRef.current) { supabase.removeChannel(channelRef.current); channelRef.current = null; }
      subscribedRef.current = false;
    };
    const subscribe = () => {
      teardown();
      const ch = supabase
        .channel(`flowchart-${projectId}-${Date.now()}`)
        .on("postgres_changes", { event: "*", schema: "public", table: "flowchart_nodes", filter: `project_id=eq.${projectId}` }, () => load())
        .on("postgres_changes", { event: "*", schema: "public", table: "flowchart_arrows", filter: `project_id=eq.${projectId}` }, () => load())
        .subscribe((status) => {
          if (status === "SUBSCRIBED") {
            subscribedRef.current = true;
            retryRef.current = 0;
          } else if (["CHANNEL_ERROR", "TIMED_OUT", "CLOSED"].includes(status)) {
            subscribedRef.current = false;
            const delay = Math.min(4000, 500 * Math.pow(2, retryRef.current));
            retryRef.current = Math.min(retryRef.current + 1, 3);
            retryTimerRef.current = setTimeout(subscribe, delay);
          }
        });
      channelRef.current = ch;
    };
    const handleVisibility = () => {
      if (document.visibilityState !== "visible") return;
      load();
      if (!subscribedRef.current) { retryRef.current = 0; subscribe(); }
    };
    subscribe();
    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("focus", handleVisibility);
    return () => {
      teardown();
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("focus", handleVisibility);
    };
  }, [projectId, missingTables, load]);

  // Confetti when 100% complete (client view)
  useEffect(() => {
    if (isInternal || confettiFired || nodes.length === 0 || reducedMotion) return;
    const allDone = nodes.every(n => n.status === "done");
    if (!allDone) return;
    setConfettiFired(true);
    setShowToast(true);
    const colors = ["#1A6666", "#1A6666", "#1A6666", "#FFFFFF"];
    confetti({ particleCount: 200, spread: 160, origin: { y: 0.5 }, colors });
    setTimeout(() => confetti({ particleCount: 100, spread: 120, origin: { x: 0.2, y: 0.4 }, colors }), 250);
    setTimeout(() => confetti({ particleCount: 100, spread: 120, origin: { x: 0.8, y: 0.4 }, colors }), 500);
    setTimeout(() => setShowToast(false), 6000);
  }, [nodes, isInternal, confettiFired, reducedMotion]);

  // ───── DB mutations (with silent retry up to 3 times) ─────
  async function withRetry(fn) {
    for (let attempt = 0; attempt < 3; attempt++) {
      const { error, data } = await fn();
      if (!error) return { data };
      await new Promise(r => setTimeout(r, 250 * (attempt + 1)));
    }
    return { data: null };
  }
  async function createNode(x, y, title = "Step") {
    const sx = snap(x), sy = snap(y);
    flashSaved();
    const { data } = await withRetry(() => supabase.from("flowchart_nodes").insert({
      project_id: projectId, title, status: "pending",
      description: "", estimated_date: null,
      position_x: sx, position_y: sy,
    }).select().single());
    if (data) setNodes(ns => [...ns, data]);
    return data;
  }
  async function updateNode(id, patch) {
    setNodes(ns => ns.map(n => n.id === id ? { ...n, ...patch } : n));
    flashSaved();
    await withRetry(() => supabase.from("flowchart_nodes").update(patch).eq("id", id).select());
  }
  async function deleteNode(id) {
    flashSaved();
    setNodes(ns => ns.filter(n => n.id !== id));
    setArrows(as => as.filter(a => a.source_node_id !== id && a.target_node_id !== id));
    if (selectedId === id) setSelectedId(null);
    await withRetry(() => supabase.from("flowchart_arrows").delete().or(`source_node_id.eq.${id},target_node_id.eq.${id}`).select());
    await withRetry(() => supabase.from("flowchart_nodes").delete().eq("id", id).select());
  }
  async function createArrow(sourceId, targetId) {
    if (sourceId === targetId) return;
    if (arrows.some(a => a.source_node_id === sourceId && a.target_node_id === targetId)) return;
    flashSaved();
    const { data } = await withRetry(() => supabase.from("flowchart_arrows").insert({
      project_id: projectId, source_node_id: sourceId, target_node_id: targetId,
    }).select().single());
    if (data) setArrows(as => [...as, data]);
  }
  async function deleteArrow(id) {
    flashSaved();
    setArrows(as => as.filter(a => a.id !== id));
    await withRetry(() => supabase.from("flowchart_arrows").delete().eq("id", id).select());
  }

  // ───── Coordinate helpers ─────
  function getCanvasCoords(clientX, clientY) {
    const rect = canvasRef.current.getBoundingClientRect();
    return {
      x: (clientX - rect.left - pan.x) / zoom,
      y: (clientY - rect.top - pan.y) / zoom,
    };
  }

  // ───── Tool keyboard shortcuts ─────
  useEffect(() => {
    if (!isInternal) return;
    function onKey(e) {
      const tag = document.activeElement?.tagName;
      const inField = tag === "INPUT" || tag === "TEXTAREA" || document.activeElement?.isContentEditable;
      if (inField) {
        if (e.key === "Escape") { setEditingTitleId(null); }
        return;
      }
      if (e.key === "h" || e.key === "H") { setTool("hand"); cancelArrowDraft(); }
      else if (e.key === "r" || e.key === "R") { setTool("rect"); cancelArrowDraft(); }
      else if (e.key === "a" || e.key === "A") { setTool("arrow"); cancelArrowDraft(); }
      else if (e.key === "t" || e.key === "T") { setTool("text"); cancelArrowDraft(); }
      else if (e.key === "Escape") {
        cancelArrowDraft();
        setEditingTitleId(null);
        setContextMenu(null);
        setTool("hand");
      } else if ((e.key === "Delete" || e.key === "Backspace") && selectedId) {
        e.preventDefault();
        deleteNode(selectedId);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isInternal, selectedId]);

  function cancelArrowDraft() { setArrowDraft(null); }

  // ───── Canvas event handlers (admin/builder) ─────
  function onCanvasMouseDown(e) {
    if (!isInternal) {
      // Client mode: pan only
      panning.current = { startX: e.clientX, startY: e.clientY, panX: pan.x, panY: pan.y };
      return;
    }
    // Right click handled separately (context menu)
    if (e.button === 2) return;

    setContextMenu(null);
    setSelectedId(null);

    if (tool === "hand") {
      panning.current = { startX: e.clientX, startY: e.clientY, panX: pan.x, panY: pan.y };
    } else if (tool === "rect") {
      const { x, y } = getCanvasCoords(e.clientX, e.clientY);
      (async () => {
        const created = await createNode(x - NODE_W / 2, y - NODE_H / 2, "Step");
        if (created) {
          setEditingTitleId(created.id);
          setEditingTitleVal(created.title);
        }
      })();
    } else if (tool === "text") {
      // Show subtle tooltip when clicking empty canvas
      const rect = canvasRef.current.getBoundingClientRect();
      setTextTooltip({ x: e.clientX - rect.left, y: e.clientY - rect.top });
      if (tooltipTimerRef.current) clearTimeout(tooltipTimerRef.current);
      tooltipTimerRef.current = setTimeout(() => setTextTooltip(null), 1500);
    }
    // Arrow tool: clicking empty canvas does nothing (cancels in-progress draft)
    if (tool === "arrow" && arrowDraft) cancelArrowDraft();
  }

  function onCanvasMouseMove(e) {
    if (panning.current) {
      setPan({
        x: panning.current.panX + (e.clientX - panning.current.startX),
        y: panning.current.panY + (e.clientY - panning.current.startY),
      });
      return;
    }
    if (draggingNode.current) {
      const { id, offsetX, offsetY } = draggingNode.current;
      const { x, y } = getCanvasCoords(e.clientX, e.clientY);
      const nx = x - offsetX, ny = y - offsetY;
      setNodes(ns => ns.map(n => n.id === id ? { ...n, position_x: nx, position_y: ny } : n));
      draggingNode.current.moved = true;
      return;
    }
    if (arrowDraft) {
      const { x, y } = getCanvasCoords(e.clientX, e.clientY);
      setArrowDraft(d => d ? { ...d, toX: x, toY: y } : d);
    }
  }

  async function onCanvasMouseUp() {
    panning.current = null;
    if (draggingNode.current) {
      const { id, moved } = draggingNode.current;
      const node = nodes.find(n => n.id === id);
      if (node && moved) {
        const sx = snap(node.position_x), sy = snap(node.position_y);
        await updateNode(id, { position_x: sx, position_y: sy });
      }
      draggingNode.current = null;
    }
    // If arrow draft active and not released on a node anchor → cancel silently
    if (arrowDraft) cancelArrowDraft();
  }

  function onWheel(e) {
    e.preventDefault();
    const delta = -e.deltaY * 0.0015;
    setZoom(z => Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, z + delta)));
  }
  function onTouchStart(e) {
    if (e.touches.length === 1) {
      const tch = e.touches[0];
      panning.current = { startX: tch.clientX, startY: tch.clientY, panX: pan.x, panY: pan.y };
    }
  }
  function onTouchMove(e) {
    if (!panning.current || e.touches.length !== 1) return;
    const tch = e.touches[0];
    setPan({
      x: panning.current.panX + (tch.clientX - panning.current.startX),
      y: panning.current.panY + (tch.clientY - panning.current.startY),
    });
  }
  function onTouchEnd() { panning.current = null; }

  // ───── Node interactions (builder) ─────
  function onNodeMouseDown(e, node) {
    if (!isInternal) return;
    if (e.button === 2) return; // right click handled below
    e.stopPropagation();
    setContextMenu(null);

    if (tool === "hand") {
      setSelectedId(node.id);
      const { x, y } = getCanvasCoords(e.clientX, e.clientY);
      draggingNode.current = { id: node.id, offsetX: x - node.position_x, offsetY: y - node.position_y, moved: false };
    } else if (tool === "text") {
      setEditingTitleId(node.id);
      setEditingTitleVal(node.title);
    } else if (tool === "rect") {
      // Stay on rect tool; clicking on a node is a no-op (don't create node on top of node)
    }
    // Arrow tool: handled by clicking on the connection dots specifically
  }
  function onNodeClick(e, node) {
    if (!isInternal) {
      e.stopPropagation();
      setDetailId(node.id);
    }
  }
  function onNodeDoubleClick(e, node) {
    if (!isInternal) return;
    e.stopPropagation();
    setEditingTitleId(node.id);
    setEditingTitleVal(node.title);
  }
  function onNodeContextMenu(e, node) {
    if (!isInternal) return;
    e.preventDefault();
    e.stopPropagation();
    const rect = canvasRef.current.getBoundingClientRect();
    setContextMenu({ kind: "node", id: node.id, x: e.clientX - rect.left, y: e.clientY - rect.top });
  }
  function onArrowContextMenu(e, arrow) {
    if (!isInternal) return;
    e.preventDefault();
    e.stopPropagation();
    const rect = canvasRef.current.getBoundingClientRect();
    setContextMenu({ kind: "arrow", id: arrow.id, x: e.clientX - rect.left, y: e.clientY - rect.top });
  }

  // ───── Status badge cycle ─────
  function cycleStatus(node) {
    const next = STATUS_CYCLE[node.status] || "pending";
    updateNode(node.id, { status: next });
  }

  // ───── Connection dot interactions ─────
  function onAnchorMouseDown(e, node, side) {
    if (!isInternal || tool !== "arrow") return;
    e.stopPropagation();
    e.preventDefault();
    const start = nodeAnchor(node, side);
    setArrowDraft({ fromNodeId: node.id, fromSide: side, toX: start.x, toY: start.y });
  }
  function onAnchorMouseUp(e, node, side) {
    if (!isInternal || tool !== "arrow" || !arrowDraft) return;
    e.stopPropagation();
    if (arrowDraft.fromNodeId !== node.id) {
      createArrow(arrowDraft.fromNodeId, node.id);
    }
    cancelArrowDraft();
  }

  // ───── Templates ─────
  async function loadTemplates() {
    const { data, error } = await supabase
      .from("flowchart_templates")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) return [];
    return data || [];
  }
  async function saveTemplate(name) {
    const snapshot = {
      nodes: nodes.map(n => ({
        title: n.title, status: n.status, description: n.description,
        position_x: n.position_x, position_y: n.position_y,
        // local key so we can rewire arrows after re-insert
        _key: n.id,
      })),
      arrows: arrows.map(a => ({ source_key: a.source_node_id, target_key: a.target_node_id })),
    };
    flashSaved();
    const { data } = await withRetry(() => supabase.from("flowchart_templates").insert({
      name, project_id: projectId, snapshot,
    }).select().single());
    return data;
  }
  async function applyTemplate(template) {
    const snapshot = template.snapshot || { nodes: [], arrows: [] };
    const tplNodes = snapshot.nodes || [];
    const tplArrows = snapshot.arrows || [];
    if (!tplNodes.length) return;
    // Compute centroid offset so the template lands near viewport center
    const cx = tplNodes.reduce((a, n) => a + n.position_x, 0) / tplNodes.length;
    const cy = tplNodes.reduce((a, n) => a + n.position_y, 0) / tplNodes.length;
    const rect = canvasRef.current.getBoundingClientRect();
    const targetX = (rect.width / 2 - pan.x) / zoom;
    const targetY = (rect.height / 2 - pan.y) / zoom;
    const dx = targetX - cx, dy = targetY - cy;
    const keyMap = {};
    flashSaved();
    for (const tn of tplNodes) {
      const { data } = await withRetry(() => supabase.from("flowchart_nodes").insert({
        project_id: projectId,
        title: tn.title, status: tn.status || "pending",
        description: tn.description || "", estimated_date: null,
        position_x: snap(tn.position_x + dx),
        position_y: snap(tn.position_y + dy),
      }).select().single());
      if (data) keyMap[tn._key] = data.id;
    }
    for (const ta of tplArrows) {
      const sId = keyMap[ta.source_key], tId = keyMap[ta.target_key];
      if (sId && tId) {
        await withRetry(() => supabase.from("flowchart_arrows").insert({
          project_id: projectId, source_node_id: sId, target_node_id: tId,
        }).select().single());
      }
    }
    load();
  }
  async function deleteTemplate(id) {
    await withRetry(() => supabase.from("flowchart_templates").delete().eq("id", id).select());
  }

  // ───── Render ─────
  if (missingTables) return <SetupNotice t={t} />;
  if (loading) return (
    <div style={{ padding: 40, textAlign: "center", color: t.textSub, fontSize: 14 }}>
      Loading flowchart…
    </div>
  );

  const doneCount = nodes.filter(n => n.status === "done").length;
  const progress = nodes.length ? Math.round((doneCount / nodes.length) * 100) : 0;
  const detailNode = nodes.find(n => n.id === detailId);

  // Cursor for canvas based on active tool
  const canvasCursor = !isInternal
    ? (panning.current ? "grabbing" : "grab")
    : tool === "hand" ? (panning.current ? "grabbing" : "grab")
    : tool === "rect" ? "crosshair"
    : tool === "arrow" ? "crosshair"
    : "text";

  return (
    <div
      style={{
        position: "relative",
        border: `1px solid ${t.border}`,
        borderRadius: 14,
        overflow: "hidden",
        background: COLOR.bg,
        boxShadow: t.shadow,
        height: `calc(100vh - ${mobile ? 220 : 200}px)`,
        minHeight: 520,
        display: "flex",
        flexDirection: "column",
      }}
    >
      <style>{`
        @keyframes fc-pulse { 0%,100%{transform:scale(1);box-shadow:0 0 14px rgba(26,102,102,0.5);} 50%{transform:scale(1.02);box-shadow:0 0 22px rgba(26,102,102,0.7);} }
        @keyframes fc-shimmer { 0%{background-position:-200% 50%;} 100%{background-position:200% 50%;} }
        @keyframes fc-shine { 0%{transform:translateX(-100%);} 100%{transform:translateX(200%);} }
        @keyframes fc-fade { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }
        @media (prefers-reduced-motion: reduce) {
          .fc-pulse, .fc-shimmer-bg, .fc-shine { animation: none !important; }
        }
        .fc-arrow-path { transition: stroke 0.15s; }
        .fc-arrow-hit:hover + .fc-arrow-path,
        .fc-arrow-path:hover { stroke: ${COLOR.arrowHover} !important; }
        .fc-anchor { transition: transform 0.12s, fill 0.12s; }
        .fc-anchor:hover { transform: scale(1.3); fill: ${COLOR.accent} !important; }
      `}</style>

      {/* Client view top progress bar — kept for client mode */}
      {!isInternal && (
        <div style={{ padding: "10px 14px", borderBottom: `1px solid ${t.border}`, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", background: t.surfaceHigh, zIndex: 10 }}>
          <span style={{ color: t.text, fontSize: 15, fontWeight: 400, letterSpacing: "0.04em" }}>
            Your Case Progress — <span style={{ color: t.accentLight, fontWeight: 500 }}>{progress}% Complete</span>
          </span>
          <div style={{ flex: 1, position: "relative", height: 10, background: "rgba(8,43,43,0.08)", borderRadius: 99, overflow: "hidden", marginLeft: 14 }}>
            <div style={{ width: `${progress}%`, height: "100%", background: "linear-gradient(90deg, #1A6666, #1A6666, #1A6666)", boxShadow: "0 0 12px #1A6666", borderRadius: 99, transition: "width 0.6s ease" }}>
              <div className="fc-shine" style={{ position: "absolute", inset: 0, background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.35), transparent)", animation: reducedMotion ? "none" : "fc-shine 2.4s linear infinite" }} />
            </div>
          </div>
        </div>
      )}

      {/* CANVAS AREA */}
      <div
        ref={canvasRef}
        onMouseDown={onCanvasMouseDown}
        onMouseMove={onCanvasMouseMove}
        onMouseUp={onCanvasMouseUp}
        onMouseLeave={onCanvasMouseUp}
        onWheel={onWheel}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onContextMenu={(e) => { if (isInternal) e.preventDefault(); }}
        style={{
          flex: 1,
          position: "relative",
          overflow: "hidden",
          cursor: canvasCursor,
          backgroundColor: COLOR.bg,
          backgroundImage: `radial-gradient(circle, ${COLOR.dot} 1.5px, transparent 1.5px)`,
          backgroundSize: `${GRID * zoom}px ${GRID * zoom}px`,
          backgroundPosition: `${pan.x}px ${pan.y}px`,
          touchAction: "none",
        }}
      >
        {/* Vignette + particles for client view */}
        {!isInternal && (
          <>
            <div style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 1, background: "radial-gradient(ellipse at center, rgba(26,102,102,0.10), transparent 65%)" }} />
            <ParticleLayer enabled={!reducedMotion} />
          </>
        )}

        {/* Transformed layer: arrows + nodes */}
        <div style={{ position: "absolute", left: 0, top: 0, transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`, transformOrigin: "0 0", pointerEvents: "none", zIndex: 3 }}>
          {/* Arrows SVG */}
          <svg style={{ position: "absolute", left: -4000, top: -4000, width: 12000, height: 12000, overflow: "visible", pointerEvents: "none" }}>
            <defs>
              <marker id={`fc-arrowhead-${projectId}`} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                <path d="M 0 0 L 10 5 L 0 10 z" fill={COLOR.arrow} />
              </marker>
              <marker id={`fc-arrowhead-hover-${projectId}`} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                <path d="M 0 0 L 10 5 L 0 10 z" fill={COLOR.arrowHover} />
              </marker>
            </defs>
            <g transform="translate(4000, 4000)">
              {arrows.map(a => {
                const src = nodes.find(n => n.id === a.source_node_id);
                const tgt = nodes.find(n => n.id === a.target_node_id);
                if (!src || !tgt) return null;
                const d = arrowPath(src, tgt);
                return (
                  <g key={a.id}>
                    {/* Visible curve */}
                    <path
                      d={d} fill="none"
                      stroke={COLOR.arrow}
                      strokeWidth="1.5"
                      markerEnd={`url(#fc-arrowhead-${projectId})`}
                      className="fc-arrow-path"
                      style={{ pointerEvents: "auto", cursor: isInternal ? "context-menu" : "default" }}
                      onContextMenu={(e) => onArrowContextMenu(e, a)}
                    />
                    {/* Wider invisible hit area */}
                    <path
                      d={d} fill="none" stroke="transparent" strokeWidth="14"
                      className="fc-arrow-hit"
                      style={{ pointerEvents: "auto", cursor: isInternal ? "context-menu" : "default" }}
                      onContextMenu={(e) => onArrowContextMenu(e, a)}
                    />
                  </g>
                );
              })}
              {/* Live preview arrow */}
              {arrowDraft && (() => {
                const src = nodes.find(n => n.id === arrowDraft.fromNodeId);
                if (!src) return null;
                const start = nodeAnchor(src, arrowDraft.fromSide);
                const d = previewArrowPath(start, { x: arrowDraft.toX, y: arrowDraft.toY });
                return (
                  <path d={d} fill="none" stroke={COLOR.accent} strokeWidth="1.5" strokeDasharray="6 5" />
                );
              })()}
            </g>
          </svg>

          {/* Nodes */}
          {nodes.map(node => {
            const isSelected = selectedId === node.id;
            const isHover = hoveredNodeId === node.id;
            const showAnchors = isInternal && tool === "arrow" && (isHover || (arrowDraft && arrowDraft.fromNodeId === node.id));
            return (
              <BuilderNode
                key={node.id}
                node={node}
                t={t}
                isInternal={isInternal}
                tool={tool}
                selected={isSelected}
                hovered={isHover}
                showAnchors={showAnchors}
                arrowDraftFromHere={arrowDraft && arrowDraft.fromNodeId === node.id ? arrowDraft.fromSide : null}
                editingTitle={editingTitleId === node.id}
                editingTitleVal={editingTitleVal}
                onTitleChange={setEditingTitleVal}
                onTitleBlur={() => {
                  const v = editingTitleVal.trim();
                  if (v && v !== node.title) updateNode(node.id, { title: v });
                  setEditingTitleId(null);
                }}
                onMouseEnter={() => setHoveredNodeId(node.id)}
                onMouseLeave={() => setHoveredNodeId(null)}
                onMouseDown={(e) => onNodeMouseDown(e, node)}
                onClick={(e) => onNodeClick(e, node)}
                onDoubleClick={(e) => onNodeDoubleClick(e, node)}
                onContextMenu={(e) => onNodeContextMenu(e, node)}
                onAnchorMouseDown={onAnchorMouseDown}
                onAnchorMouseUp={onAnchorMouseUp}
                onStatusClick={() => cycleStatus(node)}
                reducedMotion={reducedMotion}
              />
            );
          })}
        </div>

        {/* Empty state */}
        {nodes.length === 0 && !loading && (
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", color: t.textSub, fontSize: 14, fontStyle: "italic", zIndex: 2, pointerEvents: "none", textAlign: "center", padding: 20 }}>
            {isInternal
              ? "Select the rectangle tool and click anywhere to add your first step."
              : "No flowchart published yet."}
          </div>
        )}

        {/* FLOATING TOOLBAR (admin only) */}
        {isInternal && (
          <div
            style={{
              position: "absolute", top: 14, left: 14, zIndex: 20,
              display: "flex", alignItems: "center", gap: 4, padding: 6,
              background: COLOR.panel, border: `0.5px solid ${COLOR.border}`,
              borderRadius: 12, boxShadow: "0 4px 16px rgba(8,43,43,0.08)",
            }}
            onMouseDown={(e) => e.stopPropagation()}
            onContextMenu={(e) => e.stopPropagation()}
          >
            <ToolButton active={tool === "hand"} title="Hand (H) — pan canvas" onClick={() => { setTool("hand"); cancelArrowDraft(); }}>
              <HandIcon />
            </ToolButton>
            <ToolButton active={tool === "rect"} title="Rectangle (R) — click canvas to place" onClick={() => { setTool("rect"); cancelArrowDraft(); }}>
              <RectIcon />
            </ToolButton>
            <ToolButton active={tool === "arrow"} title="Arrow (A) — drag between nodes" onClick={() => { setTool("arrow"); cancelArrowDraft(); }}>
              <ArrowIcon />
            </ToolButton>
            <ToolButton active={tool === "text"} title="Text (T) — click a rectangle to edit" onClick={() => { setTool("text"); cancelArrowDraft(); }}>
              <TextIcon />
            </ToolButton>
          </div>
        )}

        {/* SAVE STATUS + ZOOM (admin only) */}
        {isInternal && (
          <div
            style={{
              position: "absolute", top: 18, right: 14, zIndex: 20,
              display: "flex", alignItems: "center", gap: 12,
              fontSize: 12, fontFamily: "Inter, sans-serif",
              pointerEvents: "none",
            }}
          >
            <span style={{ color: saveStatus.includes("Saving") ? COLOR.subtle : COLOR.accent, minWidth: 64, textAlign: "right", transition: "color 0.2s" }}>
              {saveStatus}
            </span>
            <span style={{ color: COLOR.subtle }}>{Math.round(zoom * 100)}%</span>
            <button
              onClick={() => setShowTemplates(true)}
              style={{
                pointerEvents: "auto",
                background: "transparent", color: COLOR.text,
                border: `0.5px solid ${COLOR.border}`,
                borderRadius: 8, padding: "6px 12px",
                fontSize: 12, fontWeight: 500, cursor: "pointer",
                fontFamily: "inherit", letterSpacing: "0.04em",
              }}
              data-tap
            >
              Templates
            </button>
          </div>
        )}

        {/* Subtle text-tool tooltip */}
        {textTooltip && tool === "text" && isInternal && (
          <div
            style={{
              position: "absolute", left: textTooltip.x + 12, top: textTooltip.y + 12,
              zIndex: 25, pointerEvents: "none",
              background: "rgba(8,43,43,0.85)", color: "#FFFFFF",
              fontSize: 12, padding: "6px 10px", borderRadius: 6,
              animation: "fc-fade 0.15s ease",
            }}
          >
            Click a rectangle to edit its text
          </div>
        )}

        {/* Context menu */}
        {contextMenu && (
          <ContextMenu
            x={contextMenu.x}
            y={contextMenu.y}
            onClose={() => setContextMenu(null)}
            items={
              contextMenu.kind === "node"
                ? [{ label: "Delete step", onClick: () => deleteNode(contextMenu.id) }]
                : [{ label: "Delete connection", onClick: () => deleteArrow(contextMenu.id) }]
            }
          />
        )}
      </div>

      {/* Templates side panel */}
      {showTemplates && isInternal && (
        <TemplatesPanel
          t={t}
          mobile={mobile}
          onClose={() => setShowTemplates(false)}
          loadTemplates={loadTemplates}
          onSave={saveTemplate}
          onApply={(tpl) => { applyTemplate(tpl); setShowTemplates(false); }}
          onDelete={deleteTemplate}
          canSave={nodes.length > 0}
        />
      )}

      {/* CLIENT DETAIL PANEL */}
      {detailNode && !isInternal && (
        <NodeDetailPanel
          key={detailNode.id}
          node={detailNode} t={t} mobile={mobile}
          onClose={() => setDetailId(null)}
          userProfile={userProfile}
        />
      )}

      {/* Confetti toast (client) */}
      {showToast && !isInternal && (
        <div style={{
          position: "absolute", top: "40%", left: "50%", transform: "translate(-50%,-50%)", zIndex: 100,
          background: "rgba(240,244,244,0.95)", border: `1px solid #1A6666`, borderRadius: 14,
          padding: "22px 36px", boxShadow: "0 12px 48px rgba(8,43,43,0.18), 0 0 40px rgba(26,102,102,0.4)",
          color: t.text, fontSize: 24, fontWeight: 600, letterSpacing: "-0.01em",
          fontFamily: "'Playfair Display', Georgia, serif",
          textAlign: "center",
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
function BuilderNode({
  node, t, isInternal, tool, selected, hovered, showAnchors, arrowDraftFromHere,
  editingTitle, editingTitleVal, onTitleChange, onTitleBlur,
  onMouseEnter, onMouseLeave, onMouseDown, onClick, onDoubleClick, onContextMenu,
  onAnchorMouseDown, onAnchorMouseUp, onStatusClick, reducedMotion,
}) {
  const isDone = node.status === "done";
  const isInProgress = node.status === "in_progress";

  // Border color: hovered when arrow tool active gets teal highlight
  const borderColor = (isInternal && tool === "arrow" && (hovered || arrowDraftFromHere))
    ? COLOR.accent
    : selected ? COLOR.accent : COLOR.border;
  const borderWidth = (selected || (isInternal && tool === "arrow" && (hovered || arrowDraftFromHere))) ? 1.5 : 1.5;

  const cursor = !isInternal
    ? "pointer"
    : tool === "hand" ? "move"
    : tool === "text" ? "text"
    : tool === "arrow" ? "crosshair"
    : "default";

  const pulseStyle = (isInProgress && !reducedMotion) ? { animation: "fc-pulse 2.5s ease-in-out infinite" } : {};

  // Status badge styles per spec
  const badgeStyle = isDone
    ? { background: COLOR.accent, color: "#FFFFFF", border: "none" }
    : isInProgress
    ? { background: "rgba(26,102,102,0.1)", color: COLOR.accent, border: `1px solid ${COLOR.accent}` }
    : { background: COLOR.panel, color: COLOR.subtle, border: "none" };
  const badgeText = isDone ? "✓ Done" : isInProgress ? "In Progress" : "Pending";

  return (
    <div
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onMouseDown={onMouseDown}
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      onContextMenu={onContextMenu}
      style={{
        position: "absolute",
        left: node.position_x, top: node.position_y,
        width: NODE_W, height: NODE_H,
        borderRadius: 8,
        background: "#FFFFFF",
        border: `${borderWidth}px solid ${borderColor}`,
        boxShadow: selected
          ? "0 0 0 3px rgba(26,102,102,0.18), 0 4px 14px rgba(8,43,43,0.10)"
          : "0 2px 8px rgba(8,43,43,0.08)",
        cursor,
        userSelect: "none",
        pointerEvents: "auto",
        padding: "8px 12px",
        display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center",
        transition: "border-color 0.15s, box-shadow 0.15s",
        overflow: "visible",
        ...pulseStyle,
      }}
    >
      {/* Title (centered) */}
      {editingTitle ? (
        <input
          autoFocus value={editingTitleVal}
          onChange={(e) => onTitleChange(e.target.value)}
          onBlur={onTitleBlur}
          onKeyDown={(e) => {
            if (e.key === "Enter") { e.preventDefault(); e.target.blur(); }
            else if (e.key === "Escape") { onTitleChange(""); onTitleBlur(); }
          }}
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
          onFocus={(e) => e.target.select()}
          style={{
            width: "100%", textAlign: "center",
            background: "transparent",
            border: `1px solid ${COLOR.accent}`,
            borderRadius: 4, color: COLOR.text,
            fontSize: 14, padding: "3px 6px",
            fontFamily: "Inter, sans-serif", outline: "none",
          }}
        />
      ) : (
        <div style={{
          width: "100%", textAlign: "center",
          color: COLOR.text, fontSize: 14, fontWeight: 500,
          fontFamily: "Inter, sans-serif",
          lineHeight: 1.25,
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        }}>
          {node.title}
        </div>
      )}

      {/* Status badge — bottom-right */}
      <button
        onClick={(e) => { e.stopPropagation(); if (isInternal) onStatusClick(); }}
        onMouseDown={(e) => e.stopPropagation()}
        onContextMenu={(e) => e.stopPropagation()}
        title={isInternal ? "Click to cycle status" : ""}
        style={{
          position: "absolute", bottom: -10, right: 8,
          fontSize: 10, fontWeight: 600,
          padding: "3px 8px", borderRadius: 99,
          fontFamily: "Inter, sans-serif",
          letterSpacing: "0.02em",
          cursor: isInternal ? "pointer" : "default",
          ...badgeStyle,
        }}
      >
        {badgeText}
      </button>

      {/* Connection anchors (only when arrow tool + hovered) */}
      {showAnchors && (
        <svg
          width={NODE_W + 24} height={NODE_H + 24}
          style={{ position: "absolute", left: -12, top: -12, pointerEvents: "none", overflow: "visible" }}
        >
          {["top", "right", "bottom", "left"].map(side => {
            const local = (() => {
              if (side === "top") return { x: NODE_W / 2 + 12, y: 12 };
              if (side === "right") return { x: NODE_W + 12, y: NODE_H / 2 + 12 };
              if (side === "bottom") return { x: NODE_W / 2 + 12, y: NODE_H + 12 };
              return { x: 12, y: NODE_H / 2 + 12 };
            })();
            const isActive = arrowDraftFromHere === side;
            return (
              <circle
                key={side}
                cx={local.x} cy={local.y} r={6}
                fill={isActive ? COLOR.accent : "#FFFFFF"}
                stroke={COLOR.accent}
                strokeWidth={1.5}
                className="fc-anchor"
                style={{ pointerEvents: "auto", cursor: "crosshair" }}
                onMouseDown={(e) => onAnchorMouseDown(e, node, side)}
                onMouseUp={(e) => onAnchorMouseUp(e, node, side)}
              />
            );
          })}
        </svg>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TOOL ICON BUTTONS
// ─────────────────────────────────────────────────────────────────────────────
function ToolButton({ active, title, onClick, children }) {
  return (
    <button
      onClick={onClick}
      title={title}
      data-tap
      style={{
        width: 36, height: 36, borderRadius: 8,
        background: active ? COLOR.accent : "transparent",
        color: active ? "#FFFFFF" : COLOR.muted,
        border: "none",
        cursor: "pointer",
        display: "flex", alignItems: "center", justifyContent: "center",
        transition: "background 0.15s, color 0.15s",
        padding: 0,
      }}
    >
      {children}
    </button>
  );
}
function HandIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 11V6a2 2 0 0 0-4 0v5" />
      <path d="M14 10V4a2 2 0 0 0-4 0v6" />
      <path d="M10 10.5V6a2 2 0 0 0-4 0v8" />
      <path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-1.6-6-4l-3-5a2 2 0 1 1 3.5-2L8 13" />
    </svg>
  );
}
function RectIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round">
      <rect x="3" y="6" width="18" height="12" rx="2" />
    </svg>
  );
}
function ArrowIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14" />
      <path d="M13 6l6 6-6 6" />
    </svg>
  );
}
function TextIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 6V4h16v2" />
      <path d="M9 20h6" />
      <path d="M12 4v16" />
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CONTEXT MENU
// ─────────────────────────────────────────────────────────────────────────────
function ContextMenu({ x, y, items, onClose }) {
  useEffect(() => {
    function dismiss() { onClose(); }
    window.addEventListener("mousedown", dismiss);
    window.addEventListener("scroll", dismiss, true);
    return () => {
      window.removeEventListener("mousedown", dismiss);
      window.removeEventListener("scroll", dismiss, true);
    };
  }, [onClose]);
  return (
    <div
      onMouseDown={(e) => e.stopPropagation()}
      style={{
        position: "absolute", top: y, left: x, zIndex: 60,
        background: "#FFFFFF", border: `0.5px solid ${COLOR.border}`,
        borderRadius: 6, padding: 4,
        boxShadow: "0 6px 22px rgba(8,43,43,0.15)",
        animation: "fc-fade 0.12s ease",
        minWidth: 140,
      }}
    >
      {items.map((it, i) => (
        <button
          key={i}
          onClick={() => { it.onClick(); onClose(); }}
          style={{
            display: "block", width: "100%", textAlign: "left",
            background: "transparent", border: "none",
            color: COLOR.text, fontSize: 13,
            fontFamily: "Inter, sans-serif",
            padding: "7px 12px", borderRadius: 4,
            cursor: "pointer",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = COLOR.panel; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
        >
          {it.label}
        </button>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TEMPLATES PANEL
// ─────────────────────────────────────────────────────────────────────────────
function TemplatesPanel({ t, mobile, onClose, loadTemplates, onSave, onApply, onDelete, canSave }) {
  const [items, setItems] = useState(null);
  const [savingMode, setSavingMode] = useState(false);
  const [name, setName] = useState("");
  const [missingTable, setMissingTable] = useState(false);

  const refresh = useCallback(async () => {
    const { data, error } = await supabase
      .from("flowchart_templates")
      .select("*")
      .order("created_at", { ascending: false });
    if (error && /relation .* does not exist|Could not find the table/i.test(error.message)) {
      setMissingTable(true); setItems([]); return;
    }
    setItems(data || []);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  async function handleSave() {
    const n = name.trim();
    if (!n) return;
    await onSave(n);
    setName(""); setSavingMode(false);
    refresh();
  }
  async function handleDelete(id) {
    await onDelete(id);
    refresh();
  }

  return (
    <SidePanel t={t} mobile={mobile} onClose={onClose}>
      <h2 style={{ margin: "0 0 4px", fontSize: 22, fontWeight: 600, letterSpacing: "-0.01em", color: t.text, fontFamily: "'Playfair Display', Georgia, serif" }}>Templates</h2>
      <p style={{ margin: "0 0 20px", color: t.textSub, fontSize: 12, letterSpacing: "0.02em" }}>
        Save and reuse flowchart layouts.
      </p>

      {missingTable && (
        <div style={{ background: COLOR.panel, border: `1px solid ${COLOR.border}`, borderRadius: 8, padding: 12, fontSize: 12, color: t.textSub, marginBottom: 16, lineHeight: 1.5 }}>
          The <code style={{ background: "rgba(8,43,43,0.06)", padding: "1px 5px", borderRadius: 3 }}>flowchart_templates</code> table is missing. Run the setup SQL in Supabase, then reopen.
        </div>
      )}

      {items === null ? (
        <div style={{ color: t.textDim, fontSize: 13, padding: "12px 0" }}>Loading…</div>
      ) : items.length === 0 ? (
        <div style={{ color: t.textDim, fontSize: 13, fontStyle: "italic", padding: "12px 0", lineHeight: 1.5 }}>
          No templates yet. Build a flowchart and save it as a template.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
          {items.map(tpl => (
            <div
              key={tpl.id}
              onContextMenu={(e) => {
                e.preventDefault();
                if (window.confirm(`Delete template "${tpl.name}"?`)) handleDelete(tpl.id);
              }}
              style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "10px 12px", background: "#FFFFFF",
                border: `0.5px solid ${COLOR.border}`, borderRadius: 8,
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ color: COLOR.text, fontSize: 13, fontWeight: 500, fontFamily: "Inter, sans-serif", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {tpl.name}
                </div>
                <div style={{ color: COLOR.subtle, fontSize: 11, marginTop: 2 }}>
                  {(tpl.snapshot?.nodes?.length || 0)} nodes · {fmtRelative(tpl.created_at)}
                </div>
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <button
                  onClick={() => onApply(tpl)}
                  style={{ background: COLOR.accent, color: "#FFFFFF", border: "none", borderRadius: 6, padding: "6px 12px", fontSize: 12, fontWeight: 500, cursor: "pointer", fontFamily: "inherit" }}
                  data-tap
                >
                  Use
                </button>
                <button
                  onClick={() => { if (window.confirm(`Delete template "${tpl.name}"?`)) handleDelete(tpl.id); }}
                  style={{ background: "transparent", color: COLOR.subtle, border: `0.5px solid ${COLOR.border}`, borderRadius: 6, padding: "6px 10px", fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}
                  title="Delete template"
                  data-tap
                >
                  ×
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div style={{ borderTop: `0.5px solid ${COLOR.border}`, paddingTop: 16, marginTop: 12 }}>
        {!savingMode ? (
          <button
            disabled={!canSave || missingTable}
            onClick={() => setSavingMode(true)}
            style={{
              width: "100%",
              background: canSave && !missingTable ? COLOR.accent : COLOR.panel,
              color: canSave && !missingTable ? "#FFFFFF" : COLOR.subtle,
              border: "none", borderRadius: 8,
              padding: "10px 14px", fontSize: 13, fontWeight: 500,
              cursor: canSave && !missingTable ? "pointer" : "not-allowed",
              fontFamily: "inherit", letterSpacing: "0.02em",
            }}
            data-tap
          >
            {canSave ? "Save current as template" : "Add nodes to save a template"}
          </button>
        ) : (
          <div style={{ display: "flex", gap: 6 }}>
            <input
              autoFocus value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleSave(); if (e.key === "Escape") { setSavingMode(false); setName(""); } }}
              placeholder="Template name…"
              style={{
                flex: 1, background: "#FFFFFF",
                border: `0.5px solid ${COLOR.border}`, borderRadius: 6,
                padding: "8px 10px", fontSize: 13, color: COLOR.text,
                fontFamily: "Inter, sans-serif", outline: "none",
              }}
            />
            <button
              onClick={handleSave}
              style={{ background: COLOR.accent, color: "#FFFFFF", border: "none", borderRadius: 6, padding: "8px 14px", fontSize: 12, fontWeight: 500, cursor: "pointer", fontFamily: "inherit" }}
              data-tap
            >
              Save
            </button>
            <button
              onClick={() => { setSavingMode(false); setName(""); }}
              style={{ background: "transparent", color: COLOR.subtle, border: `0.5px solid ${COLOR.border}`, borderRadius: 6, padding: "8px 10px", fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}
              data-tap
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    </SidePanel>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CLIENT DETAIL PANEL (read-only viewing of a step)
// ─────────────────────────────────────────────────────────────────────────────
function NodeDetailPanel({ node, t, mobile, onClose, userProfile }) {
  const [comments, setComments] = useState([]);
  const [attachments, setAttachments] = useState([]);
  const [newComment, setNewComment] = useState("");

  useEffect(() => {
    (async () => {
      const [cRes, aRes] = await Promise.all([
        supabase.from("flowchart_comments").select("*").eq("node_id", node.id).order("created_at", { ascending: true }),
        supabase.from("flowchart_attachments").select("*").eq("node_id", node.id).order("created_at", { ascending: true }),
      ]);
      setComments(cRes.data || []);
      setAttachments(aRes.data || []);
    })();
  }, [node.id]);

  async function addComment() {
    if (!newComment.trim()) return;
    const author = userProfile?.full_name || "Client";
    const initial = (author[0] || "C").toUpperCase();
    const { data, error } = await supabase.from("flowchart_comments").insert({
      node_id: node.id, author_name: author, author_initial: initial, body: newComment.trim(),
    }).select().single();
    if (!error && data) { setComments(c => [...c, data]); setNewComment(""); }
  }

  const statusColor = node.status === "done" ? "#1A6666" : node.status === "in_progress" ? "#1A6666" : "#7AA8A8";

  return (
    <SidePanel t={t} mobile={mobile} onClose={onClose}>
      <h2 style={{ margin: "0 0 8px", fontSize: 26, fontWeight: 600, letterSpacing: "-0.01em", color: t.text, lineHeight: 1.2, fontFamily: "'Playfair Display', Georgia, serif" }}>{node.title}</h2>
      <span style={{ display: "inline-block", background: `${statusColor}1F`, border: `1px solid ${statusColor}55`, borderRadius: 99, color: statusColor, fontSize: 11, fontWeight: 500, padding: "4px 12px", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 18 }}>
        {STATUS_LABEL_CLIENT[node.status]}
      </span>
      {node.estimated_date && (
        <div style={{ color: t.textSub, fontSize: 13, marginBottom: 14, letterSpacing: "0.02em" }}>
          <span style={{ color: t.textDim }}>Estimated: </span>{fmtDate(node.estimated_date)}
        </div>
      )}
      {node.description && (
        <p style={{ color: t.text, fontSize: 14, lineHeight: 1.6, fontWeight: 300, marginBottom: 20, letterSpacing: "0.01em" }}>{node.description}</p>
      )}

      {attachments.length > 0 && (
        <div style={{ marginBottom: 22 }}>
          <div style={{ color: t.textSub, fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 8 }}>Documents</div>
          {attachments.map(a => (
            <a key={a.id} href={a.file_url} target="_blank" rel="noreferrer" style={{ display: "block", padding: "8px 12px", background: t.surfaceHigh, border: `1px solid ${t.border}`, borderRadius: 6, color: t.accentLight, fontSize: 13, textDecoration: "none", marginBottom: 6 }}>
              ↓ {a.file_name}
            </a>
          ))}
        </div>
      )}

      <div>
        <div style={{ color: t.textSub, fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 10 }}>Discussion ({comments.length})</div>
        <div style={{ maxHeight: 280, overflowY: "auto", marginBottom: 10 }}>
          {comments.length === 0 && <div style={{ color: t.textDim, fontSize: 13, fontStyle: "italic", padding: "8px 0" }}>Be the first to comment on this step.</div>}
          {comments.map(c => <CommentRow key={c.id} c={c} t={t} />)}
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <input
            value={newComment} onChange={(e) => setNewComment(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") addComment(); }}
            placeholder="Add a comment…"
            style={{ flex: 1, background: t.surfaceHigh, border: `1px solid ${t.border}`, borderRadius: 6, padding: "8px 10px", fontSize: 13, color: t.text, outline: "none", fontFamily: "inherit", boxSizing: "border-box" }}
          />
          <button
            onClick={addComment}
            style={{ background: COLOR.accent, color: "#FFFFFF", border: "none", borderRadius: 6, padding: "8px 16px", fontSize: 12, fontWeight: 500, cursor: "pointer", fontFamily: "inherit", letterSpacing: "0.04em" }}
            data-tap
          >
            Send
          </button>
        </div>
      </div>
    </SidePanel>
  );
}

function SidePanel({ t, mobile, onClose, children }) {
  const [enter, setEnter] = useState(false);
  useEffect(() => { requestAnimationFrame(() => setEnter(true)); }, []);
  return (
    <>
      <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(8,43,43,0.18)", zIndex: 40, opacity: enter ? 1 : 0, transition: "opacity 0.25s" }} />
      <div style={{
        position: "absolute", top: 0, right: 0, bottom: 0, zIndex: 41,
        width: mobile ? "100%" : 420,
        background: t.surface,
        borderLeft: `1px solid ${t.border}`,
        boxShadow: "-12px 0 40px rgba(8,43,43,0.15)",
        padding: "24px 26px",
        overflowY: "auto",
        transform: enter ? "translateX(0)" : "translateX(100%)",
        transition: "transform 0.3s ease",
      }}>
        <button onClick={onClose} style={{ position: "absolute", top: 14, right: 14, background: "transparent", border: "none", color: t.textSub, fontSize: 22, cursor: "pointer", lineHeight: 1, fontFamily: "inherit" }} data-tap>×</button>
        {children}
      </div>
    </>
  );
}

function CommentRow({ c, t }) {
  return (
    <div style={{ display: "flex", gap: 10, padding: "8px 0", borderBottom: `1px solid ${t.border}` }}>
      <div style={{ width: 30, height: 30, borderRadius: "50%", background: COLOR.accent, color: "#FFFFFF", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 600, flexShrink: 0, letterSpacing: "0.02em" }}>
        {c.author_initial || (c.author_name?.[0]?.toUpperCase()) || "?"}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
          <span style={{ color: t.text, fontSize: 13, fontWeight: 500 }}>{c.author_name || "Anonymous"}</span>
          <span style={{ color: t.textDim, fontSize: 11 }}>{fmtRelative(c.created_at)}</span>
        </div>
        <div style={{ color: t.text, fontSize: 13, fontWeight: 300, lineHeight: 1.5, marginTop: 2, wordBreak: "break-word" }}>{c.body}</div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SETUP NOTICE (shown when tables are missing)
// ─────────────────────────────────────────────────────────────────────────────
function SetupNotice({ t }) {
  const sql = `-- Run this in your Supabase SQL editor
CREATE TABLE IF NOT EXISTS flowchart_nodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id BIGINT NOT NULL,
  title TEXT NOT NULL DEFAULT 'Step',
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
CREATE TABLE IF NOT EXISTS flowchart_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id BIGINT,
  name TEXT NOT NULL,
  snapshot JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE flowchart_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE flowchart_arrows ENABLE ROW LEVEL SECURITY;
ALTER TABLE flowchart_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE flowchart_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE flowchart_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth all" ON flowchart_nodes FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth all" ON flowchart_arrows FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth all" ON flowchart_comments FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth all" ON flowchart_attachments FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth all" ON flowchart_templates FOR ALL TO authenticated USING (true) WITH CHECK (true);
ALTER PUBLICATION supabase_realtime ADD TABLE flowchart_nodes, flowchart_arrows, flowchart_comments;`;
  return (
    <div style={{ padding: 32, border: `1px solid ${t.border}`, borderRadius: 14, background: t.surface }}>
      <h2 style={{ margin: "0 0 10px", fontSize: 22, fontWeight: 400, color: t.text, letterSpacing: "0.03em" }}>One-time setup needed</h2>
      <p style={{ color: t.textSub, fontSize: 14, lineHeight: 1.6, fontWeight: 300, marginBottom: 18 }}>
        The flowchart feature needs a few small tables in Supabase. Open your Supabase project → <strong style={{ color: t.text }}>SQL Editor</strong> → paste the script below → click <strong style={{ color: t.text }}>Run</strong>. Then refresh this page.
      </p>
      <pre style={{ background: "#F0F4F4", border: `1px solid ${t.border}`, borderRadius: 8, padding: 16, color: t.text, fontSize: 11, fontFamily: "'Geist Mono', monospace", overflowX: "auto", lineHeight: 1.45, maxHeight: 380, overflowY: "auto" }}>{sql}</pre>
      <button
        onClick={() => { navigator.clipboard?.writeText(sql); }}
        style={{ background: COLOR.accent, color: "#FFFFFF", border: "none", borderRadius: 6, padding: "7px 14px", fontSize: 12, fontWeight: 500, cursor: "pointer", fontFamily: "inherit", letterSpacing: "0.04em", marginTop: 12 }}
      >
        Copy SQL
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────
function fmtDate(s) {
  if (!s) return "";
  const d = new Date(s);
  return d.toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" });
}
function fmtRelative(s) {
  if (!s) return "";
  const diff = (Date.now() - new Date(s).getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return fmtDate(s);
}
