import { useState, useEffect, useCallback, useRef, useMemo, createContext, useContext } from "react";
import ReactFlow, {
  Background, BackgroundVariant,
  ReactFlowProvider, useReactFlow,
  Handle, Position, ConnectionMode, MarkerType,
  applyNodeChanges, applyEdgeChanges, addEdge,
} from "reactflow";
import "reactflow/dist/style.css";
import { supabase } from "@/lib/supabase.js";
import confetti from "canvas-confetti";

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS — Frost & Teal palette
// ─────────────────────────────────────────────────────────────────────────────
const COLOR = {
  bg: "#FFFFFF",
  panel: "#F4F8FB",
  border: "#E8E8E8",
  text: "#232A34",
  muted: "#616568",
  subtle: "#9DB5C9",
  accent: "#375971",
  arrow: "#9DB5C9",
  arrowSelected: "#375971",
  dot: "#E8E8E8",
};
const NODE_W = 180;
const NODE_H = 64;
const STATUS_CYCLE = { pending: "in_progress", in_progress: "done", done: "pending" };
const STATUS_LABEL_ADMIN = { pending: "Pending", in_progress: "In Progress", done: "✓ Done" };
const STATUS_LABEL_CLIENT = { pending: "Upcoming", in_progress: "Currently Working On", done: "Completed" };

function prefersReducedMotion() {
  if (typeof window === "undefined") return false;
  return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
}

// Builder-context for custom node ↔ parent communication
const FCContext = createContext({});

// Detect if touch device
const isTouchDevice = () => typeof window !== "undefined" && ("ontouchstart" in window || navigator.maxTouchPoints > 0);

// ─────────────────────────────────────────────────────────────────────────────
// CUSTOM NODE — clean white rectangle with editable title + status pill
// ─────────────────────────────────────────────────────────────────────────────
function StepNode({ id, data, selected }) {
  const ctx = useContext(FCContext);
  const { tool, isInternal, mobile, editingTitleId, beginTitleEdit, commitTitle, cycleStatus, openDetail, connectSource } = ctx;
  const editing = editingTitleId === id;
  const [val, setVal] = useState(data.title);

  useEffect(() => {
    if (editing) setVal(data.title);
  }, [editing, data.title]);

  const isDone = data.status === "done";
  const isInProgress = data.status === "in_progress";
  const showHandles = isInternal && tool === "arrow";
  const isConnectSource = connectSource === id;
  const handleSize = mobile ? 20 : 11;

  const badgeStyle = isDone
    ? { background: COLOR.accent, color: "#FFFFFF", border: "none" }
    : isInProgress
    ? { background: "rgba(55,89,113,0.10)", color: COLOR.accent, border: `1px solid ${COLOR.accent}` }
    : { background: COLOR.panel, color: COLOR.subtle, border: "none" };
  const badgeText = isInternal
    ? STATUS_LABEL_ADMIN[data.status] || "Pending"
    : STATUS_LABEL_CLIENT[data.status] || "Upcoming";

  const borderColor = isConnectSource
    ? COLOR.accent
    : selected
    ? COLOR.accent
    : (isInternal && tool === "arrow") ? COLOR.subtle : COLOR.border;

  function onClickNode(e) {
    if (!isInternal) {
      e.stopPropagation();
      openDetail?.(id);
      return;
    }
    if (tool === "text" && !editing) {
      e.stopPropagation();
      beginTitleEdit?.(id);
    }
  }
  function onDoubleClickNode(e) {
    if (!isInternal) return;
    if (mobile) return; // mobile uses single-tap → action bar
    e.stopPropagation();
    if (!editing) beginTitleEdit?.(id);
  }
  function onPillClick(e) {
    e.stopPropagation();
    if (!isInternal) return;
    cycleStatus?.(id);
  }

  // Node width grows a touch on mobile for easy tapping
  const nodeW = mobile ? NODE_W + 20 : NODE_W;
  const nodeH = mobile ? NODE_H + 6 : NODE_H;

  return (
    <div
      onClick={onClickNode}
      onDoubleClick={onDoubleClickNode}
      style={{
        width: nodeW, height: nodeH,
        position: "relative",
        background: isInternal ? "#FFFFFF" : "rgba(255,255,255,0.78)",
        backdropFilter: isInternal ? "none" : "blur(10px)",
        WebkitBackdropFilter: isInternal ? "none" : "blur(10px)",
        border: `1.5px solid ${borderColor}`,
        borderRadius: 10,
        boxShadow: isConnectSource
          ? `0 0 0 3px rgba(55,89,113,0.35), 0 4px 14px rgba(8,43,43,0.10)`
          : selected
          ? "0 0 0 3px rgba(55,89,113,0.18), 0 4px 14px rgba(8,43,43,0.10)"
          : "0 2px 8px rgba(8,43,43,0.08)",
        padding: "10px 14px",
        display: "flex", alignItems: "center", justifyContent: "center",
        cursor: !isInternal ? "pointer" : (tool === "text" ? "text" : "default"),
        transition: "border-color 0.15s, box-shadow 0.15s",
        animation: (isInProgress && !data.reducedMotion) ? "fc-pulse 2.6s ease-in-out infinite" : "none",
        touchAction: "none",
      }}
    >
      {/* Title */}
      {editing ? (
        <input
          autoFocus
          value={val}
          onChange={(e) => setVal(e.target.value)}
          onBlur={() => commitTitle?.(id, val)}
          onKeyDown={(e) => {
            if (e.key === "Enter") { e.preventDefault(); e.target.blur(); }
            else if (e.key === "Escape") { e.target.blur(); }
          }}
          onFocus={(e) => e.target.select()}
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
          style={{
            width: "100%", textAlign: "center", background: "transparent",
            border: `1px solid ${COLOR.accent}`, borderRadius: 4,
            color: COLOR.text, fontSize: mobile ? 15 : 14, padding: "4px 6px",
            fontFamily: "Inter, sans-serif", outline: "none",
          }}
        />
      ) : (
        <div style={{
          width: "100%", textAlign: "center",
          color: COLOR.text, fontSize: mobile ? 15 : 14, fontWeight: 500,
          fontFamily: "Inter, sans-serif", lineHeight: 1.25,
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        }}>
          {data.title}
        </div>
      )}

      {/* Status pill — bottom-right */}
      <button
        onClick={onPillClick}
        onMouseDown={(e) => e.stopPropagation()}
        title={isInternal ? "Click to cycle status" : ""}
        style={{
          position: "absolute", bottom: -10, right: 10,
          fontSize: 10, fontWeight: 600,
          padding: "3px 9px", borderRadius: 99,
          fontFamily: "Inter, sans-serif",
          letterSpacing: "0.02em",
          cursor: isInternal ? "pointer" : "default",
          minHeight: mobile ? 26 : "auto",
          ...badgeStyle,
        }}
      >
        {badgeText}
      </button>

      {/* Connection handles — only visible when arrow tool active (admin) */}
      {["top", "right", "bottom", "left"].map((side) => {
        const pos = side === "top" ? Position.Top
                  : side === "right" ? Position.Right
                  : side === "bottom" ? Position.Bottom
                  : Position.Left;
        return (
          <Handle
            key={side}
            id={side}
            type="source"
            position={pos}
            isConnectable={showHandles}
            style={{
              width: handleSize, height: handleSize,
              background: "#FFFFFF",
              border: `1.5px solid ${COLOR.accent}`,
              opacity: showHandles ? 1 : 0,
              pointerEvents: showHandles ? "auto" : "none",
              transition: "opacity 0.15s",
            }}
          />
        );
      })}
    </div>
  );
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
    const colors = ["#375971", "#375971", "rgba(55,89,113,0.6)"];
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
  return <canvas ref={canvasRef} style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 5 }} />;
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN — wrapped in ReactFlowProvider so Inner can use useReactFlow()
// ─────────────────────────────────────────────────────────────────────────────
export default function FlowchartTab(props) {
  return (
    <ReactFlowProvider>
      <FlowchartInner {...props} />
    </ReactFlowProvider>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// INNER — all the logic
// ─────────────────────────────────────────────────────────────────────────────
const NODE_TYPES = { stepNode: StepNode };

function FlowchartInner({ projectId, isInternal, userProfile, t, mobile }) {
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [missingTables, setMissingTables] = useState(false);
  const [saveStatus, setSaveStatus] = useState("");

  // Builder state
  const [tool, setTool] = useState("hand");
  const [editingTitleId, setEditingTitleId] = useState(null);
  const [contextMenu, setContextMenu] = useState(null);
  const [showTemplates, setShowTemplates] = useState(false);
  const [connectSource, setConnectSource] = useState(null); // mobile connect mode

  // Client state
  const [detailId, setDetailId] = useState(null);
  const [confettiFired, setConfettiFired] = useState(false);
  const [showToast, setShowToast] = useState(false);

  const wrapperRef = useRef(null);
  const reducedMotion = useMemo(() => prefersReducedMotion(), []);
  const rf = useReactFlow();

  const flashSaved = useCallback(() => {
    setSaveStatus("Saving…");
    setTimeout(() => setSaveStatus("Saved ✓"), 250);
    setTimeout(() => setSaveStatus(""), 1700);
  }, []);

  // ───── Convert between Supabase rows and React Flow shapes ─────
  const toRfNode = useCallback((row) => ({
    id: row.id,
    type: "stepNode",
    position: { x: row.position_x || 0, y: row.position_y || 0 },
    data: {
      title: row.title || "Step",
      status: row.status || "pending",
      reducedMotion,
      raw: row,
    },
    draggable: true,
  }), [reducedMotion]);

  const toRfEdge = useCallback((row) => ({
    id: row.id,
    source: row.source_node_id,
    target: row.target_node_id,
    type: "default",
    animated: false,
    style: { stroke: COLOR.arrow, strokeWidth: 1.5 },
    markerEnd: { type: MarkerType.ArrowClosed, color: COLOR.arrow, width: 16, height: 16 },
  }), []);

  // ───── Load + realtime ─────
  // silent=true → refresh data in background without showing the spinner (used for
  // tab-return re-fetches and realtime-triggered reloads so the UI never flashes).
  const load = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    const [nRes, aRes] = await Promise.all([
      supabase.from("flowchart_nodes").select("*").eq("project_id", projectId).order("created_at", { ascending: true }),
      supabase.from("flowchart_arrows").select("*").eq("project_id", projectId).order("created_at", { ascending: true }),
    ]);
    if (nRes.error && /relation .* does not exist|Could not find the table/i.test(nRes.error.message)) {
      setMissingTables(true); if (!silent) setLoading(false); return;
    }
    setMissingTables(false);
    setNodes((nRes.data || []).map(toRfNode));
    setEdges((aRes.data || []).map(toRfEdge));
    if (!silent) setLoading(false);
  }, [projectId, toRfNode, toRfEdge]);

  useEffect(() => { load(); }, [load]);

  // Realtime with reconnect / visibility resilience
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
        .on("postgres_changes", { event: "*", schema: "public", table: "flowchart_nodes", filter: `project_id=eq.${projectId}` }, () => load({ silent: true }))
        .on("postgres_changes", { event: "*", schema: "public", table: "flowchart_arrows", filter: `project_id=eq.${projectId}` }, () => load({ silent: true }))
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
      // Refresh data silently on tab-return — no spinner, just swap in fresh nodes/edges.
      load({ silent: true });
      if (!subscribedRef.current) { retryRef.current = 0; subscribe(); }
    };
    subscribe();
    document.addEventListener("visibilitychange", handleVisibility);
    // NOTE: window "focus" removed — it fires on any click into the window (too aggressive)
    // and would show a spinner on every browser-window refocus. visibilitychange is enough.
    return () => {
      teardown();
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [projectId, missingTables, load]);

  // Confetti when 100%
  useEffect(() => {
    if (isInternal || confettiFired || nodes.length === 0 || reducedMotion) return;
    const allDone = nodes.every(n => n.data.status === "done");
    if (!allDone) return;
    setConfettiFired(true);
    setShowToast(true);
    const colors = ["#375971", "#375971", "#375971", "#FFFFFF"];
    confetti({ particleCount: 200, spread: 160, origin: { y: 0.5 }, colors });
    setTimeout(() => confetti({ particleCount: 100, spread: 120, origin: { x: 0.2, y: 0.4 }, colors }), 250);
    setTimeout(() => confetti({ particleCount: 100, spread: 120, origin: { x: 0.8, y: 0.4 }, colors }), 500);
    setTimeout(() => setShowToast(false), 6000);
  }, [nodes, isInternal, confettiFired, reducedMotion]);

  // ───── DB helpers ─────
  async function withRetry(fn) {
    for (let attempt = 0; attempt < 3; attempt++) {
      const { error, data } = await fn();
      if (!error) return { data };
      await new Promise(r => setTimeout(r, 250 * (attempt + 1)));
    }
    return { data: null };
  }

  const persistNode = useCallback(async (id, patch) => {
    flashSaved();
    await withRetry(() => supabase.from("flowchart_nodes").update(patch).eq("id", id).select());
  }, [flashSaved]);

  const dbCreateNode = useCallback((x, y) => {
    const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const optimistic = {
      id: tempId, type: "stepNode",
      position: { x: Math.round(x), y: Math.round(y) },
      data: { title: "Step", status: "pending", reducedMotion, raw: null },
      draggable: true,
    };
    setNodes((ns) => [...ns, optimistic]);
    flashSaved();
    (async () => {
      const { data } = await withRetry(() =>
        supabase.from("flowchart_nodes").insert({
          project_id: projectId, title: "Step", status: "pending",
          description: "", estimated_date: null,
          position_x: Math.round(x), position_y: Math.round(y),
        }).select().single()
      );
      if (!data) {
        setNodes((ns) => ns.filter((n) => n.id !== tempId));
        return;
      }
      setNodes((ns) => {
        const local = ns.find((n) => n.id === tempId);
        const merged = toRfNode(data);
        if (local) {
          if (local.data.title !== "Step") merged.data.title = local.data.title;
          if (local.data.status !== "pending") merged.data.status = local.data.status;
          merged.position = local.position;
        }
        const drift = {};
        if (merged.data.title !== "Step") drift.title = merged.data.title;
        if (merged.data.status !== "pending") drift.status = merged.data.status;
        if (merged.position.x !== Math.round(x)) drift.position_x = Math.round(merged.position.x);
        if (merged.position.y !== Math.round(y)) drift.position_y = Math.round(merged.position.y);
        if (Object.keys(drift).length) {
          withRetry(() => supabase.from("flowchart_nodes").update(drift).eq("id", data.id).select());
        }
        return ns.map((n) => (n.id === tempId ? merged : n));
      });
      setEditingTitleId((prev) => (prev === tempId ? data.id : prev));
    })();
    return tempId;
  }, [projectId, flashSaved, toRfNode, reducedMotion]);

  const dbDeleteNode = useCallback(async (id) => {
    flashSaved();
    setNodes((ns) => ns.filter((n) => n.id !== id));
    setEdges((es) => es.filter((e) => e.source !== id && e.target !== id));
    if (id.startsWith("temp-")) return;
    await withRetry(() => supabase.from("flowchart_arrows").delete().or(`source_node_id.eq.${id},target_node_id.eq.${id}`).select());
    await withRetry(() => supabase.from("flowchart_nodes").delete().eq("id", id).select());
  }, [flashSaved]);

  const dbDeleteEdge = useCallback(async (id) => {
    flashSaved();
    setEdges((es) => es.filter((e) => e.id !== id));
    if (id.startsWith("temp-")) return;
    await withRetry(() => supabase.from("flowchart_arrows").delete().eq("id", id).select());
  }, [flashSaved]);

  const dbCreateEdge = useCallback(async (source, target) => {
    if (source === target) return;
    if (edges.some((e) => e.source === source && e.target === target)) return;
    if (source.startsWith("temp-") || target.startsWith("temp-")) {
      // Wait for the underlying node to be persisted; skip edge creation
      flashSaved();
      return;
    }
    flashSaved();
    const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setEdges((es) => addEdge({
      id: tempId, source, target, type: "default",
      style: { stroke: COLOR.arrow, strokeWidth: 1.5 },
      markerEnd: { type: MarkerType.ArrowClosed, color: COLOR.arrow, width: 16, height: 16 },
    }, es));
    const { data } = await withRetry(() =>
      supabase.from("flowchart_arrows").insert({
        project_id: projectId, source_node_id: source, target_node_id: target,
      }).select().single()
    );
    if (!data) {
      setEdges((es) => es.filter((e) => e.id !== tempId));
      return;
    }
    setEdges((es) => es.map((e) => (e.id === tempId ? toRfEdge(data) : e)));
  }, [edges, projectId, flashSaved, toRfEdge]);

  // ───── React Flow change handlers ─────
  const onNodesChange = useCallback((changes) => {
    setNodes((ns) => applyNodeChanges(changes, ns));
  }, []);
  const onEdgesChange = useCallback((changes) => {
    setEdges((es) => applyEdgeChanges(changes, es));
  }, []);
  const onConnect = useCallback((conn) => {
    if (!isInternal) return;
    dbCreateEdge(conn.source, conn.target);
  }, [isInternal, dbCreateEdge]);
  const onNodeDragStop = useCallback((_e, node) => {
    if (!isInternal) return;
    if (node.id.startsWith("temp-")) return;
    persistNode(node.id, {
      position_x: Math.round(node.position.x),
      position_y: Math.round(node.position.y),
    });
  }, [isInternal, persistNode]);

  // ───── Pane click — Rectangle tool drops a node ─────
  const onPaneClick = useCallback((e) => {
    if (!isInternal) return;
    setContextMenu(null);
    if (tool !== "rect") return;
    if (!rf) return;
    const pos = rf.screenToFlowPosition({ x: e.clientX, y: e.clientY });
    const newId = dbCreateNode(pos.x - NODE_W / 2, pos.y - NODE_H / 2);
    setEditingTitleId(newId);
  }, [isInternal, tool, rf, dbCreateNode]);

  // ───── Right-click context menu ─────
  const onNodeContextMenu = useCallback((e, node) => {
    if (!isInternal) return;
    e.preventDefault();
    const wrapperRect = wrapperRef.current.getBoundingClientRect();
    setContextMenu({
      kind: "node", id: node.id,
      x: e.clientX - wrapperRect.left,
      y: e.clientY - wrapperRect.top,
    });
  }, [isInternal]);
  const onEdgeContextMenu = useCallback((e, edge) => {
    if (!isInternal) return;
    e.preventDefault();
    const wrapperRect = wrapperRef.current.getBoundingClientRect();
    setContextMenu({
      kind: "edge", id: edge.id,
      x: e.clientX - wrapperRect.left,
      y: e.clientY - wrapperRect.top,
    });
  }, [isInternal]);

  // ───── Title edit ─────
  const beginTitleEdit = useCallback((id) => {
    setEditingTitleId(id);
  }, []);
  const commitTitle = useCallback((id, value) => {
    const v = (value || "").trim();
    setEditingTitleId(null);
    setNodes((ns) => ns.map((n) => (n.id === id ? { ...n, data: { ...n.data, title: v || n.data.title } } : n)));
    if (!v) return;
    if (id.startsWith("temp-")) return; // swap effect will catch new title
    persistNode(id, { title: v });
  }, [persistNode]);

  // ───── Status pill cycle ─────
  const cycleStatus = useCallback((id) => {
    setNodes((ns) => {
      const node = ns.find((n) => n.id === id);
      if (!node) return ns;
      const next = STATUS_CYCLE[node.data.status] || "pending";
      if (!id.startsWith("temp-")) persistNode(id, { status: next });
      return ns.map((n) => (n.id === id ? { ...n, data: { ...n.data, status: next } } : n));
    });
  }, [persistNode]);

  // ───── Open detail (client) ─────
  const openDetail = useCallback((id) => { setDetailId(id); }, []);

  // ───── Keyboard shortcuts ─────
  useEffect(() => {
    if (!isInternal) return;
    function onKey(e) {
      const tag = document.activeElement?.tagName;
      const inField = tag === "INPUT" || tag === "TEXTAREA" || document.activeElement?.isContentEditable;
      if (inField) {
        if (e.key === "Escape") setEditingTitleId(null);
        return;
      }
      if (e.key === "h" || e.key === "H") setTool("hand");
      else if (e.key === "r" || e.key === "R") setTool("rect");
      else if (e.key === "a" || e.key === "A") setTool("arrow");
      else if (e.key === "t" || e.key === "T") setTool("text");
      else if (e.key === "Escape") {
        setEditingTitleId(null);
        setContextMenu(null);
        setTool("hand");
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isInternal]);

  // ───── Templates ─────
  const saveTemplate = useCallback(async (name) => {
    const snapshot = {
      nodes: nodes.map((n) => ({
        _key: n.id, title: n.data.title, status: n.data.status,
        position_x: n.position.x, position_y: n.position.y,
      })),
      arrows: edges.map((e) => ({ source_key: e.source, target_key: e.target })),
    };
    flashSaved();
    const { data } = await withRetry(() =>
      supabase.from("flowchart_templates").insert({ name, project_id: projectId, snapshot }).select().single()
    );
    return data;
  }, [nodes, edges, projectId, flashSaved]);
  const applyTemplate = useCallback(async (template) => {
    const snap = template.snapshot || { nodes: [], arrows: [] };
    if (!snap.nodes?.length) return;
    const cx = snap.nodes.reduce((a, n) => a + n.position_x, 0) / snap.nodes.length;
    const cy = snap.nodes.reduce((a, n) => a + n.position_y, 0) / snap.nodes.length;
    let targetX = 0, targetY = 0;
    if (rf && wrapperRef.current) {
      const r = wrapperRef.current.getBoundingClientRect();
      const center = rf.screenToFlowPosition({ x: r.left + r.width / 2, y: r.top + r.height / 2 });
      targetX = center.x; targetY = center.y;
    }
    const dx = targetX - cx, dy = targetY - cy;
    const keyMap = {};
    flashSaved();
    for (const tn of snap.nodes) {
      const { data } = await withRetry(() =>
        supabase.from("flowchart_nodes").insert({
          project_id: projectId,
          title: tn.title, status: tn.status || "pending",
          description: "", estimated_date: null,
          position_x: Math.round(tn.position_x + dx),
          position_y: Math.round(tn.position_y + dy),
        }).select().single()
      );
      if (data) keyMap[tn._key] = data.id;
    }
    for (const ta of (snap.arrows || [])) {
      const sId = keyMap[ta.source_key], tId = keyMap[ta.target_key];
      if (sId && tId) {
        await withRetry(() =>
          supabase.from("flowchart_arrows").insert({
            project_id: projectId, source_node_id: sId, target_node_id: tId,
          }).select().single()
        );
      }
    }
    load();
  }, [rf, projectId, flashSaved, load]);
  const deleteTemplate = useCallback(async (id) => {
    await withRetry(() => supabase.from("flowchart_templates").delete().eq("id", id).select());
  }, []);

  // Mobile: node click with connect-mode support
  const onNodeClick = useCallback((_e, node) => {
    if (!isInternal || !mobile) return;
    if (connectSource) {
      // Second tap = complete the connection
      if (connectSource !== node.id) dbCreateEdge(connectSource, node.id);
      setConnectSource(null);
    }
    // First tap just selects (RF does that); action bar reads nodes.find(n=>n.selected)
  }, [isInternal, mobile, connectSource, dbCreateEdge]);

  // Context value passed to custom node
  const ctxValue = useMemo(() => ({
    tool, isInternal, mobile, editingTitleId, connectSource,
    beginTitleEdit, commitTitle, cycleStatus, openDetail,
  }), [tool, isInternal, mobile, editingTitleId, connectSource, beginTitleEdit, commitTitle, cycleStatus, openDetail]);

  // Tool → React Flow interaction props
  // On mobile all tools use pan-by-drag because connect is done via the action bar
  const interactionProps = !isInternal ? {
    nodesDraggable: false,
    nodesConnectable: false,
    elementsSelectable: false,
    panOnDrag: true,
    panOnScroll: false,
    zoomOnScroll: !mobile,
    zoomOnPinch: true,
    selectNodesOnDrag: false,
  } : mobile ? {
    // Mobile builder — always pan/drag, connections via action bar
    nodesDraggable: true,
    nodesConnectable: false,
    elementsSelectable: true,
    panOnDrag: true,
    panOnScroll: false,
    zoomOnScroll: false,
    zoomOnPinch: true,
    selectNodesOnDrag: false,
  } : tool === "hand" ? {
    nodesDraggable: true,
    nodesConnectable: false,
    elementsSelectable: true,
    panOnDrag: [0, 1, 2], // any mouse button pans on empty pane
    panOnScroll: false,
    zoomOnScroll: true,
    zoomOnPinch: true,
    selectNodesOnDrag: false,
  } : tool === "rect" ? {
    nodesDraggable: true,
    nodesConnectable: false,
    elementsSelectable: true,
    panOnDrag: false,   // clicks should drop a node, not pan
    panOnScroll: false,
    zoomOnScroll: true,
    zoomOnPinch: true,
    selectNodesOnDrag: false,
  } : tool === "arrow" ? {
    nodesDraggable: false,
    nodesConnectable: true,
    elementsSelectable: true,
    panOnDrag: false,   // dragging from a handle creates an edge
    panOnScroll: false,
    zoomOnScroll: true,
    zoomOnPinch: true,
    selectNodesOnDrag: false,
  } : { /* text */
    nodesDraggable: true,
    nodesConnectable: false,
    elementsSelectable: true,
    panOnDrag: [1, 2],  // pan with middle/right; left click on a node enters text edit
    panOnScroll: false,
    zoomOnScroll: true,
    zoomOnPinch: true,
    selectNodesOnDrag: false,
  };

  // ───── Render ─────
  if (missingTables) return <SetupNotice t={t} />;
  if (loading) return (
    <div style={{ padding: 40, textAlign: "center", color: t.textSub, fontSize: 14 }}>
      Loading flowchart…
    </div>
  );

  const doneCount = nodes.filter(n => n.data.status === "done").length;
  const progress = nodes.length ? Math.round((doneCount / nodes.length) * 100) : 0;
  const detailNode = nodes.find(n => n.id === detailId);
  const detailRaw = detailNode?.data?.raw;

  const cursor = !isInternal ? "default"
    : tool === "hand" ? "grab"
    : tool === "rect" ? "crosshair"
    : tool === "arrow" ? "crosshair"
    : "text";

  // Derive selected node id from RF node state
  const selectedNodeId = nodes.find(n => n.selected)?.id ?? null;

  return (
    <div
      ref={wrapperRef}
      style={{
        position: "relative",
        border: `1px solid ${t.border}`,
        borderRadius: mobile ? 10 : 14,
        overflow: "hidden",
        background: COLOR.bg,
        boxShadow: t.shadow,
        // Use 100dvh on modern mobile browsers (avoids address-bar jump)
        height: mobile
          ? "calc(100dvh - 190px)"
          : "calc(100vh - 200px)",
        minHeight: mobile ? 380 : 520,
        display: "flex",
        flexDirection: "column",
      }}
    >
      <style>{`
        @keyframes fc-pulse { 0%,100%{transform:scale(1);box-shadow:0 0 14px rgba(55,89,113,0.5);} 50%{transform:scale(1.02);box-shadow:0 0 22px rgba(55,89,113,0.7);} }
        @keyframes fc-shimmer { 0%{background-position:-200% 50%;} 100%{background-position:200% 50%;} }
        @keyframes fc-shine { 0%{transform:translateX(-100%);} 100%{transform:translateX(200%);} }
        @keyframes fc-fade { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes fc-slide-up { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }
        @media (prefers-reduced-motion: reduce) {
          .fc-pulse, .fc-shimmer-bg, .fc-shine { animation: none !important; }
        }
        /* React Flow overrides */
        .react-flow { background: ${COLOR.bg}; touch-action: none; }
        .react-flow__attribution { display: none !important; }
        .react-flow__edge.selected .react-flow__edge-path { stroke: ${COLOR.arrowSelected} !important; }
        .react-flow__edge:hover .react-flow__edge-path { stroke: ${COLOR.arrowSelected} !important; }
        .react-flow__handle { z-index: 10; }
        .react-flow__node { font-family: Inter, sans-serif; }
        .react-flow__controls { box-shadow: 0 4px 14px rgba(8,43,43,0.10) !important; border: 0.5px solid ${COLOR.border} !important; border-radius: 8px !important; overflow: hidden; }
        .react-flow__controls-button { background: #FFFFFF !important; border-bottom: 0.5px solid ${COLOR.border} !important; color: ${COLOR.muted} !important; }
        .react-flow__controls-button:hover { background: ${COLOR.panel} !important; }
        .react-flow__controls-button svg { fill: ${COLOR.muted} !important; }
      `}</style>

      {/* Top bar — admin builder toolbar OR client progress bar */}
      {isInternal ? (
        <div style={{
          padding: mobile ? "8px 10px" : "10px 14px",
          borderBottom: `1px solid ${t.border}`,
          display: "flex", alignItems: "center", gap: mobile ? 6 : 10,
          background: t.surfaceHigh, zIndex: 10, flexShrink: 0,
        }}>
          {/* Tool pill */}
          <div style={{
            display: "flex", alignItems: "center", gap: 2, padding: 3,
            background: COLOR.panel, border: `0.5px solid ${COLOR.border}`,
            borderRadius: 10,
          }}>
            <ToolButton mobile={mobile} active={tool === "hand"} title="Hand (H)" onClick={() => { setTool("hand"); setConnectSource(null); }}><HandIcon /></ToolButton>
            <ToolButton mobile={mobile} active={tool === "rect"} title="Add step (R)" onClick={() => { setTool("rect"); setConnectSource(null); }}><RectIcon /></ToolButton>
            {!mobile && <ToolButton active={tool === "arrow"} title="Arrow (A)" onClick={() => setTool("arrow")}><ArrowIcon /></ToolButton>}
            <ToolButton mobile={mobile} active={tool === "text"} title="Rename (T)" onClick={() => { setTool("text"); setConnectSource(null); }}><TextIcon /></ToolButton>
          </div>

          <div style={{ flex: 1 }} />

          {/* Save indicator */}
          <span style={{
            color: saveStatus.includes("Saving") ? COLOR.subtle : COLOR.accent,
            fontSize: 11, minWidth: mobile ? 0 : 64, textAlign: "right",
            transition: "color 0.2s", fontFamily: "Inter, sans-serif",
            display: saveStatus ? "block" : "none",
          }}>{saveStatus}</span>

          {/* Templates button */}
          <button
            onClick={() => setShowTemplates(true)}
            style={{
              background: "transparent", color: COLOR.text,
              border: `0.5px solid ${COLOR.border}`, borderRadius: 8,
              padding: mobile ? "7px 10px" : "6px 12px",
              fontSize: mobile ? 13 : 12, fontWeight: 500,
              cursor: "pointer", fontFamily: "inherit",
              display: "flex", alignItems: "center", gap: 5,
              minHeight: 36,
            }}
            data-tap title="Templates"
          >
            {mobile ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
              </svg>
            ) : "Templates"}
          </button>

          {/* Mobile: Add node FAB inline */}
          {mobile && (
            <button
              onClick={() => {
                // Place a node in the center of the current viewport
                if (!rf) return;
                const r = wrapperRef.current?.getBoundingClientRect();
                if (!r) return;
                const pos = rf.screenToFlowPosition({ x: r.left + r.width / 2, y: r.top + r.height / 2 });
                const newId = dbCreateNode(pos.x - (NODE_W + 20) / 2, pos.y - (NODE_H + 6) / 2);
                setEditingTitleId(newId);
              }}
              style={{
                background: COLOR.accent, color: "#FFFFFF",
                border: "none", borderRadius: 8,
                padding: "7px 12px", fontSize: 20,
                fontWeight: 300, cursor: "pointer", lineHeight: 1,
                display: "flex", alignItems: "center", justifyContent: "center",
                minHeight: 36, minWidth: 36,
              }}
              data-tap title="Add step"
            >
              +
            </button>
          )}
        </div>
      ) : (
        <div style={{ padding: mobile ? "8px 12px" : "10px 14px", borderBottom: `1px solid ${t.border}`, background: t.surfaceHigh, zIndex: 10, flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: mobile ? "wrap" : "nowrap" }}>
            <span style={{ color: t.text, fontSize: mobile ? 13 : 15, fontWeight: 400, letterSpacing: "0.04em", whiteSpace: "nowrap" }}>
              {mobile ? `${progress}% complete` : `Your Case Progress — `}
              {!mobile && <span style={{ color: t.accentLight, fontWeight: 500 }}>{progress}% Complete</span>}
            </span>
            <div style={{ flex: 1, position: "relative", height: 8, background: "rgba(8,43,43,0.08)", borderRadius: 99, overflow: "hidden", minWidth: 60 }}>
              <div style={{ width: `${progress}%`, height: "100%", background: "#375971", boxShadow: "0 0 10px #375971", borderRadius: 99, transition: "width 0.6s ease" }}>
                <div className="fc-shine" style={{ position: "absolute", inset: 0, background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.35), transparent)", animation: reducedMotion ? "none" : "fc-shine 2.4s linear infinite" }} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Canvas */}
      <div style={{ flex: 1, position: "relative", cursor: mobile ? "default" : cursor, overflow: "hidden" }}>
        <FCContext.Provider value={ctxValue}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={NODE_TYPES}
            connectionMode={ConnectionMode.Loose}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeDragStop={onNodeDragStop}
            onPaneClick={onPaneClick}
            onNodeClick={onNodeClick}
            onNodeContextMenu={onNodeContextMenu}
            onEdgeContextMenu={onEdgeContextMenu}
            defaultEdgeOptions={{
              type: "default",
              style: { stroke: COLOR.arrow, strokeWidth: 1.5 },
              markerEnd: { type: MarkerType.ArrowClosed, color: COLOR.arrow, width: 16, height: 16 },
            }}
            minZoom={0.3}
            maxZoom={2}
            fitView={false}
            proOptions={{ hideAttribution: true }}
            deleteKeyCode={null}
            edgesUpdatable={false}
            {...interactionProps}
          >
            <Background variant={BackgroundVariant.Dots} gap={24} size={1.5} color={COLOR.dot} />
          </ReactFlow>
        </FCContext.Provider>

        {/* Particles + vignette for client view */}
        {!isInternal && (
          <>
            <div style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 4, background: "radial-gradient(ellipse at center, rgba(55,89,113,0.10), transparent 65%)" }} />
            <ParticleLayer enabled={!reducedMotion} />
          </>
        )}

        {/* Empty state overlay */}
        {nodes.length === 0 && !loading && (
          <div style={{
            position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center",
            color: t.textSub, fontSize: 14, fontStyle: "italic", zIndex: 2, pointerEvents: "none",
            textAlign: "center", padding: 20,
          }}>
            {isInternal
              ? (mobile ? "Tap + in the toolbar to add your first step." : "Select the rectangle tool and click anywhere to add your first step.")
              : "No flowchart published yet."}
          </div>
        )}

        {/* Right-click context menu (desktop only) */}
        {contextMenu && !mobile && (
          <ContextMenu
            x={contextMenu.x}
            y={contextMenu.y}
            onClose={() => setContextMenu(null)}
            items={
              contextMenu.kind === "node"
                ? [{ label: "Delete step", onClick: () => dbDeleteNode(contextMenu.id) }]
                : [{ label: "Delete connection", onClick: () => dbDeleteEdge(contextMenu.id) }]
            }
          />
        )}

        {/* Mobile: floating action bar when a node is selected */}
        {mobile && isInternal && selectedNodeId && (
          <MobileActionBar
            nodeId={selectedNodeId}
            nodes={nodes}
            connectSource={connectSource}
            onRename={() => beginTitleEdit(selectedNodeId)}
            onCycleStatus={() => cycleStatus(selectedNodeId)}
            onDelete={() => {
              dbDeleteNode(selectedNodeId);
              setConnectSource(null);
            }}
            onConnect={() => {
              if (connectSource === selectedNodeId) {
                setConnectSource(null);
              } else {
                setConnectSource(selectedNodeId);
              }
            }}
            onDismiss={() => {
              setNodes(ns => ns.map(n => ({ ...n, selected: false })));
              setConnectSource(null);
            }}
          />
        )}

        {/* Mobile: connect-mode hint */}
        {mobile && isInternal && connectSource && !selectedNodeId && (
          <div style={{
            position: "absolute", bottom: 20, left: "50%", transform: "translateX(-50%)",
            background: COLOR.accent, color: "#FFFFFF",
            borderRadius: 99, padding: "10px 20px",
            fontSize: 13, fontWeight: 500, zIndex: 50,
            pointerEvents: "none", textAlign: "center",
            animation: "fc-slide-up 0.2s ease",
            boxShadow: "0 4px 18px rgba(55,89,113,0.35)",
          }}>
            Tap another step to connect →
          </div>
        )}
      </div>

      {/* Templates side panel */}
      {showTemplates && isInternal && (
        <TemplatesPanel
          t={t} mobile={mobile}
          onClose={() => setShowTemplates(false)}
          onSave={saveTemplate}
          onApply={(tpl) => { applyTemplate(tpl); setShowTemplates(false); }}
          onDelete={deleteTemplate}
          canSave={nodes.length > 0}
        />
      )}

      {/* Client detail panel */}
      {detailId && !isInternal && detailRaw && (
        <NodeDetailPanel
          key={detailId}
          node={detailRaw} t={t} mobile={mobile}
          onClose={() => setDetailId(null)}
          userProfile={userProfile}
        />
      )}

      {/* Confetti toast (client) */}
      {showToast && !isInternal && (
        <div style={{
          position: "absolute", top: "40%", left: "50%", transform: "translate(-50%,-50%)", zIndex: 100,
          background: "rgba(244,248,251,0.95)", border: `1px solid #375971`, borderRadius: 14,
          padding: "22px 36px", boxShadow: "0 12px 48px rgba(8,43,43,0.18), 0 0 40px rgba(55,89,113,0.4)",
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
// MOBILE ACTION BAR — appears when a node is selected on mobile
// ─────────────────────────────────────────────────────────────────────────────
function MobileActionBar({ nodeId, nodes, connectSource, onRename, onCycleStatus, onDelete, onConnect, onDismiss }) {
  const node = nodes.find(n => n.id === nodeId);
  const isConnecting = connectSource === nodeId;
  if (!node) return null;

  const pill = (label, onClick, accent) => (
    <button
      onClick={onClick} data-tap
      style={{
        flex: 1,
        background: accent ? COLOR.accent : "#FFFFFF",
        color: accent ? "#FFFFFF" : COLOR.text,
        border: `1px solid ${accent ? COLOR.accent : COLOR.border}`,
        borderRadius: 8, padding: "10px 4px",
        fontSize: 12, fontWeight: 500,
        cursor: "pointer", fontFamily: "Inter, sans-serif",
        display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
        letterSpacing: "0.01em",
      }}
    >
      {label}
    </button>
  );

  return (
    <div style={{
      position: "absolute", bottom: 12, left: 12, right: 12, zIndex: 50,
      background: "rgba(240,244,244,0.96)", backdropFilter: "blur(12px)",
      WebkitBackdropFilter: "blur(12px)",
      border: `1px solid ${COLOR.border}`,
      borderRadius: 14, padding: 12,
      boxShadow: "0 8px 32px rgba(8,43,43,0.18)",
      animation: "fc-slide-up 0.18s ease",
    }}>
      <div style={{ display: "flex", alignItems: "center", marginBottom: 10 }}>
        <span style={{ flex: 1, color: COLOR.text, fontSize: 13, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {node.data.title}
        </span>
        <button onClick={onDismiss} style={{ background: "transparent", border: "none", color: COLOR.subtle, fontSize: 18, cursor: "pointer", lineHeight: 1, padding: "0 4px" }} data-tap>×</button>
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        {pill("✏️ Rename", onRename, false)}
        {pill("↻ Status", onCycleStatus, false)}
        {pill(isConnecting ? "✕ Cancel" : "→ Connect", onConnect, isConnecting)}
        {pill("🗑 Delete", onDelete, false)}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TOOL BUTTONS
// ─────────────────────────────────────────────────────────────────────────────
function ToolButton({ active, mobile, title, onClick, children }) {
  const size = mobile ? 42 : 36;
  return (
    <button
      onClick={onClick} title={title} data-tap
      style={{
        width: size, height: size, borderRadius: 8,
        background: active ? COLOR.accent : "transparent",
        color: active ? "#FFFFFF" : COLOR.muted,
        border: "none", cursor: "pointer",
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
function TemplatesPanel({ t, mobile, onClose, onSave, onApply, onDelete, canSave }) {
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
// CLIENT DETAIL PANEL
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
    try {
      const result = await import("@/lib/adminFetch.js").then(m => m.dbWrite("flowchart_comments","insert",{
        node_id: node.id, author_name: author, author_initial: initial, body: newComment.trim(),
      }));
      if (result?.data) { setComments(c => [...c, result.data]); setNewComment(""); }
    } catch(err) { console.error("[FlowchartTab] comment insert failed:", err.message); }
  }

  const statusColor = node.status === "done" ? "#375971" : node.status === "in_progress" ? "#375971" : "#9DB5C9";

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
// SETUP NOTICE
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
      <pre style={{ background: "#F4F8FB", border: `1px solid ${t.border}`, borderRadius: 8, padding: 16, color: t.text, fontSize: 11, fontFamily: "'Geist Mono', monospace", overflowX: "auto", lineHeight: 1.45, maxHeight: 380, overflowY: "auto" }}>{sql}</pre>
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
