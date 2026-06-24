import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import AdminPanel from "./AdminPanel";
import FlowchartTab from "./FlowchartTab.jsx";
import { supabase } from "@/lib/supabase.js";

function useIsMobile(breakpoint=768){
  const [mobile,setMobile]=useState(()=>typeof window!=="undefined"&&window.innerWidth<breakpoint);
  useEffect(()=>{
    const mq=window.matchMedia(`(max-width:${breakpoint-1}px)`);
    const handler=(e)=>setMobile(e.matches);
    mq.addEventListener("change",handler);
    setMobile(mq.matches);
    return()=>mq.removeEventListener("change",handler);
  },[breakpoint]);
  return mobile;
}

// Light teal palette — single light theme (rebrand 2026)
const warmTheme = {
  bg:"#FFFFFF", surface:"#F0F4F4", surfaceHigh:"#E5EDED",
  border:"#C5D4D4", text:"#082B2B", textSub:"#3A6666", textDim:"rgba(8,43,43,0.38)",
  accent:"#1A6666", accentLight:"#0F4444", accentSoft:"rgba(26,102,102,0.08)",
  green:"#1A6666", greenSoft:"rgba(26,102,102,0.08)",
  amber:"#D97706", amberSoft:"rgba(217,119,6,0.08)",
  red:"#DC2626", redSoft:"rgba(220,38,38,0.08)",
  purple:"#7C3AED", purpleSoft:"rgba(124,58,237,0.08)",
  shadow:"0 1px 3px rgba(8,43,43,0.06)",
  // Flowchart-specific tokens
  glassSurface:"rgba(240,244,244,0.7)", goldGlow:"#1A6666",
};
const themes = { dark: warmTheme, light: warmTheme };

function LogoLight({h=20}) {
  return <svg width={h*(307/97)} height={h} viewBox="0 0 307 97" fill="none">
    <path d="M7 27C7.55 27 8 27.45 8 28V71H31C31.55 71 32 71.45 32 72V78C32 78.55 31.55 79 31 79H1C.45 79 0 78.55 0 78V28C0 27.45.45 27 1 27H7Z" fill="white"/>
    <path d="M35 70C34.45 70 34 69.55 34 69V26L11 26C10.45 26 10 25.55 10 25V19C10 18.45 10.45 18 11 18H41C41.55 18 42 18.45 42 19V69C42 69.55 41.55 70 41 70H35Z" fill="#9DB5C9"/>
    <path d="M79.2 23.9V69.4H102.1V76H72.2V23.9H79.2ZM123.1 76.9C112.8 76.9 105.6 69.4 105.6 58.4C105.6 47.4 112.6 39.8 122.8 39.8C132.8 39.8 139.4 46.7 139.4 57.1V59.7L112.2 59.7C112.7 67.1 116.6 71.2 123.3 71.2C128.5 71.2 132 69.1 133.1 65.1H139.5C137.7 72.6 131.8 76.9 123.1 76.9ZM122.8 45.5C116.9 45.5 113.2 49 112.3 55.2H132.6C132.6 49.4 128.8 45.5 122.8 45.5ZM149.2 76H141.4L153.8 58.6L141.5 40.8H149.4L158.3 53.9L167 40.8H174.7L162.5 58.6L174.5 76H166.6L157.9 63.1L149.2 76ZM228.5 49.9C228.5 65.8 218.1 76.9 203.3 76.9C188.6 76.9 178.4 65.8 178.4 49.9C178.4 34.2 188.7 23 203.4 23C218.2 23 228.5 34.1 228.5 49.9ZM221 49.9C221 37.8 214 29.8 203.4 29.8C192.8 29.8 185.8 37.8 185.8 49.9C185.8 62 192.8 70.1 203.4 70.1C214 70.1 221 62 221 49.9ZM236.3 91.8V40.8H242.4L243 47.1C245.3 42.3 250.1 39.8 255.7 39.8C265.8 39.8 272 47.3 272 58.1C272 68.9 266.1 76.9 255.7 76.9C250.1 76.9 245.4 74.6 243.1 70.2V91.8H236.3ZM243.2 58.4C243.2 65.6 247.3 70.8 254.3 70.8C261.2 70.8 265.3 65.6 265.3 58.4C265.3 51.2 261.2 46 254.3 46C247.3 46 243.2 51.1 243.2 58.4ZM276.6 65.8H283.1C283.1 69.4 285.8 71.5 290.3 71.5C295.1 71.5 297.8 69.6 297.8 66.4C297.8 64 296.6 62.5 293 61.6L286.8 60.2C280.5 58.6 277.6 55.6 277.6 50.4C277.6 43.9 283 39.8 290.8 39.8C298.5 39.8 303.5 44.1 303.7 50.8H297.2C297.1 47.3 294.7 45 290.6 45C286.3 45 284 46.9 284 50.2C284 52.5 285.7 54.1 289.1 55L295.3 56.5C301.3 57.9 304.3 60.7 304.3 65.9C304.3 72.6 298.5 76.9 290.2 76.9C281.9 76.9 276.6 72.5 276.6 65.8Z" fill="white"/>
  </svg>;
}
function LogoDark({h=20}) {
  return <svg width={h*(307/97)} height={h} viewBox="0 0 307 97" fill="none">
    <path d="M7 27C7.55 27 8 27.45 8 28V71H31C31.55 71 32 71.45 32 72V78C32 78.55 31.55 79 31 79H1C.45 79 0 78.55 0 78V28C0 27.45.45 27 1 27H7Z" fill="#232A34"/>
    <path d="M35 70C34.45 70 34 69.55 34 69V26L11 26C10.45 26 10 25.55 10 25V19C10 18.45 10.45 18 11 18H41C41.55 18 42 18.45 42 19V69C42 69.55 41.55 70 41 70H35Z" fill="#375971"/>
    <path d="M79.2 23.9V69.4H102.1V76H72.2V23.9H79.2ZM123.1 76.9C112.8 76.9 105.6 69.4 105.6 58.4C105.6 47.4 112.6 39.8 122.8 39.8C132.8 39.8 139.4 46.7 139.4 57.1V59.7L112.2 59.7C112.7 67.1 116.6 71.2 123.3 71.2C128.5 71.2 132 69.1 133.1 65.1H139.5C137.7 72.6 131.8 76.9 123.1 76.9ZM122.8 45.5C116.9 45.5 113.2 49 112.3 55.2H132.6C132.6 49.4 128.8 45.5 122.8 45.5ZM149.2 76H141.4L153.8 58.6L141.5 40.8H149.4L158.3 53.9L167 40.8H174.7L162.5 58.6L174.5 76H166.6L157.9 63.1L149.2 76ZM228.5 49.9C228.5 65.8 218.1 76.9 203.3 76.9C188.6 76.9 178.4 65.8 178.4 49.9C178.4 34.2 188.7 23 203.4 23C218.2 23 228.5 34.1 228.5 49.9ZM221 49.9C221 37.8 214 29.8 203.4 29.8C192.8 29.8 185.8 37.8 185.8 49.9C185.8 62 192.8 70.1 203.4 70.1C214 70.1 221 62 221 49.9ZM236.3 91.8V40.8H242.4L243 47.1C245.3 42.3 250.1 39.8 255.7 39.8C265.8 39.8 272 47.3 272 58.1C272 68.9 266.1 76.9 255.7 76.9C250.1 76.9 245.4 74.6 243.1 70.2V91.8H236.3ZM243.2 58.4C243.2 65.6 247.3 70.8 254.3 70.8C261.2 70.8 265.3 65.6 265.3 58.4C265.3 51.2 261.2 46 254.3 46C247.3 46 243.2 51.1 243.2 58.4ZM276.6 65.8H283.1C283.1 69.4 285.8 71.5 290.3 71.5C295.1 71.5 297.8 69.6 297.8 66.4C297.8 64 296.6 62.5 293 61.6L286.8 60.2C280.5 58.6 277.6 55.6 277.6 50.4C277.6 43.9 283 39.8 290.8 39.8C298.5 39.8 303.5 44.1 303.7 50.8H297.2C297.1 47.3 294.7 45 290.6 45C286.3 45 284 46.9 284 50.2C284 52.5 285.7 54.1 289.1 55L295.3 56.5C301.3 57.9 304.3 60.7 304.3 65.9C304.3 72.6 298.5 76.9 290.2 76.9C281.9 76.9 276.6 72.5 276.6 65.8Z" fill="#232A34"/>
  </svg>;
}

function normalizeProject(row, related={}) {
  return {
    ...row,
    client:    row.clients?.name || row.client_name  || row.client   || "",
    project:   row.project_name  || row.name         || row.project  || "",
    dueDate:   row.due_date      || row.dueDate      || "",
    lastUpdate:row.last_update   || row.lastUpdate   || "",
    phases:    related.phases    || [],
    tasks:     related.tasks     || [],
    documents: related.documents || [],
    invoices:  related.invoices  || [],
    software:  related.software  || [],
    maintenance:related.maintenance||[],
    activity:  related.activity  || [],
    docRequests: related.docRequests || [],
  };
}

async function fetchProjectData(projectId) {
  const [phases,tasks,documents,invoices,software,maintenance,activity,docRequests] = await Promise.all([
    supabase.from("phases").select("*").eq("project_id",projectId).order("created_at",{ascending:true}),
    supabase.from("tasks").select("*").eq("project_id",projectId).order("id"),
    supabase.from("documents").select("*").eq("project_id",projectId).order("uploaded_at",{ascending:false}),
    supabase.from("invoices").select("*").eq("project_id",projectId).order("id"),
    supabase.from("software").select("*").eq("project_id",projectId).order("id"),
    supabase.from("maintenance").select("*").eq("project_id",projectId).order("id"),
    supabase.from("activity").select("*").eq("project_id",projectId).order("date",{ascending:false}).limit(20),
    supabase.from("document_requests").select("*").eq("project_id",projectId).order("requested_at",{ascending:false}),
  ]);
  console.log("[fetchProjectData] phases query result:",{projectId,phasesData:phases.data,phasesError:phases.error,taskCount:(tasks.data||[]).length,taskPhaseIds:[...new Set((tasks.data||[]).map(t=>t.phase_id))]});
  const rawTasks = tasks.data || [];
  const rawPhases = phases.data || [];
  return {
    phases:    computePhaseStatuses(rawPhases, rawTasks),
    tasks:     rawTasks,
    documents: documents.data  || [],
    invoices:  invoices.data   || [],
    software:  software.data   || [],
    maintenance:maintenance.data||[],
    activity:  activity.data   || [],
    docRequests: docRequests.data || [],
  };
}

function Pill({status,label,t}) {
  const m={
    active:{bg:t.greenSoft,color:t.green,b:t.green+"25"},
    complete:{bg:t.accentSoft,color:t.accentLight,b:t.accent+"30"},
    pending:{bg:t.amberSoft,color:t.amber,b:t.amber+"25"},
    paid:{bg:t.greenSoft,color:t.green,b:t.green+"25"},
    upcoming:{bg:"transparent",color:t.textSub,b:t.border},
    resolved:{bg:t.greenSoft,color:t.green,b:t.green+"25"},
    "in-progress":{bg:t.accentSoft,color:t.accentLight,b:t.accent+"30"},
    open:{bg:t.amberSoft,color:t.amber,b:t.amber+"25"},
    high:{bg:t.redSoft,color:t.red,b:t.red+"25"},
    medium:{bg:t.amberSoft,color:t.amber,b:t.amber+"25"},
    low:{bg:t.accentSoft,color:t.accentLight,b:t.accent+"20"},
    existing:{bg:t.accentSoft,color:t.accentLight,b:t.accent+"25"},
    new:{bg:t.greenSoft,color:t.green,b:t.green+"25"},
  };
  const v=m[status]||m.pending;
  return <span style={{background:v.bg,color:v.color,border:`1px solid ${v.b}`,borderRadius:999,padding:"2px 9px",fontSize:11,fontWeight:600,letterSpacing:"0.03em",display:"inline-flex",alignItems:"center",gap:4,whiteSpace:"nowrap"}}>
    <span style={{width:4,height:4,borderRadius:"50%",background:v.color,flexShrink:0}}/>
    {label}
  </span>;
}
function Line({t}) { return <div style={{height:1,background:t.border}}/>; }
function Thin({value,t,color}) {
  const c=color||(value===100?t.green:t.accent);
  return <div style={{height:3,background:t.border,borderRadius:99,overflow:"hidden",width:"100%"}}>
    <div style={{height:"100%",width:`${value}%`,background:c,borderRadius:99,transition:"width 0.6s ease"}}/>
  </div>;
}
function SectionLabel({children,t}) {
  return <div style={{color:t.text,fontSize:18,fontWeight:600,letterSpacing:"-0.01em",marginBottom:14,fontFamily:"'Playfair Display', Georgia, serif"}}>{children}</div>;
}
function Card({children,t,style={}}) {
  return <div style={{background:t.surface,border:`1px solid ${t.border}`,borderRadius:12,boxShadow:t.shadow,...style}}>{children}</div>;
}
function CardPad({children,t,style={}}) {
  return <div style={{background:t.surface,border:`1px solid ${t.border}`,borderRadius:12,padding:"20px 24px",boxShadow:t.shadow,...style}}>{children}</div>;
}

function SidebarRow({p,active,onClick,t}) {
  return <div onClick={onClick} style={{padding:"14px 20px",cursor:"pointer",background:active?t.accentSoft:"transparent",borderLeft:`2px solid ${active?t.accent:"transparent"}`,transition:"all 0.15s"}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8,gap:8}}>
      <div style={{minWidth:0}}>
        <div style={{color:active?t.text:t.textSub,fontWeight:600,fontSize:12.5,marginBottom:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{p.client}</div>
        <div style={{color:t.textSub,fontSize:11,lineHeight:1.4,overflow:"hidden",display:"-webkit-box",WebkitLineClamp:2,WebkitBoxOrient:"vertical",opacity:0.8}}>{p.project}</div>
      </div>
      <Pill t={t} status={p.status} label={p.status==="complete"?"Done":p.phase}/>
    </div>
    <div style={{display:"flex",alignItems:"center",gap:8}}>
      <div style={{flex:1}}><Thin value={p.progress} t={t}/></div>
      <span style={{color:t.textSub,fontSize:10,fontWeight:600}}>{p.progress}%</span>
    </div>
  </div>;
}

function OverviewTab({project,isInternal,t,mobile,onSetup}) {
  const daysLeft = project.dueDate ? Math.ceil((new Date(project.dueDate)-new Date())/86400000) : null;
  const tasks = project.tasks || [];
  const done = tasks.filter(tk=>tk.status==="done").length;
  const deliverables = tasks.filter(tk=>tk.is_deliverable);
  const doneDel = deliverables.filter(d=>d.status==="done").length;
  const pendingDel = deliverables.filter(d=>d.status!=="done");
  const phases = project.phases || [];
  const todayMid = new Date(); todayMid.setHours(0,0,0,0);
  const in7 = new Date(todayMid.getTime() + 7*86400000);
  const overdueActions = tasks.filter(tk => tk.status !== "done" && tk.due_date && new Date(tk.due_date) < todayMid);
  const dueSoonActions = tasks.filter(tk => tk.status !== "done" && tk.due_date && new Date(tk.due_date) >= todayMid && new Date(tk.due_date) <= in7);
  const activePhase = phases.find(p=>p.status==="active") || phases.find(p=>p.status!=="complete") || null;
  const budgetPct = project.budget ? Math.round((project.spent??0)/project.budget*100) : 0;

  // Next action timing — same logic as ClientStatusBanner
  const pendingWithDate = tasks.filter(tk => tk.status !== "done" && tk.due_date).sort((a,b) => new Date(a.due_date)-new Date(b.due_date));
  const nextAction = pendingWithDate[0] || null;
  const nextDaysDiff = nextAction ? Math.ceil((new Date(nextAction.due_date) - todayMid) / 86400000) : null;
  const nextActionVal = nextDaysDiff === null ? null : String(Math.abs(nextDaysDiff));
  const nextActionLabel = nextDaysDiff === null ? null : nextDaysDiff < 0 ? "Days Overdue" : nextDaysDiff === 0 ? "Due Today" : "Days Away";

  const iconMap={milestone:"◆",document:"↑",invoice:"$",update:"·"};
  const colorMap={milestone:t.accent,document:t.green,invoice:t.amber,update:t.textSub};

  return (
    <div style={{display:"flex",flexDirection:"column",gap:20}}>

      {/* ── Top banner ── */}
      <div style={{
        background:`linear-gradient(135deg, ${t.accent} 0%, ${t.accentLight} 100%)`,
        borderRadius:14, padding:mobile?"18px 20px":"22px 28px",
        display:"flex", alignItems:"center", justifyContent:"space-between",
        gap:16, boxShadow:"0 4px 24px rgba(26,102,102,0.22)",
        position:"relative", overflow:"hidden", flexWrap:"wrap", rowGap:16,
      }}>
        <div style={{position:"absolute",right:-40,top:-40,width:180,height:180,borderRadius:"50%",background:"rgba(255,255,255,0.05)",pointerEvents:"none"}}/>
        <div style={{position:"relative",flex:1,minWidth:180}}>
          <div style={{fontSize:10,color:"rgba(255,255,255,0.6)",fontWeight:600,letterSpacing:"0.12em",textTransform:"uppercase",marginBottom:5}}>
            {activePhase ? "Active Milestone" : "Project Status"}
          </div>
          <div style={{fontFamily:"'Playfair Display',Georgia,serif",fontSize:18,color:"#fff",fontWeight:600,marginBottom:6,lineHeight:1.2}}>
            {activePhase ? activePhase.name : project.phase || "In Progress"}
          </div>
          {project.manager && (
            <div style={{fontSize:12,color:"rgba(255,255,255,0.75)"}}>
              Manager: <strong style={{color:"#fff"}}>{project.manager}</strong>
            </div>
          )}
        </div>
        <div style={{display:"flex",gap:mobile?12:20,alignItems:"center",position:"relative",flexShrink:0,flexWrap:"wrap"}}>
          {[
            {val:`${project.progress??0}%`, label:"Progress"},
            {val:doneDel+"/"+deliverables.length, label:"Actions"},
            ...(nextActionVal!==null?[{val:nextDaysDiff===0?"Today":nextActionVal, label:nextActionLabel}]:[]),
          ].map((s,i)=>(
            <div key={i} style={{display:"flex",alignItems:"center",gap:mobile?12:20}}>
              {i>0&&<div style={{width:1,background:"rgba(255,255,255,0.2)",alignSelf:"stretch"}}/>}
              <div style={{textAlign:"center"}}>
                <div style={{fontFamily:"'Playfair Display',Georgia,serif",fontSize:mobile?20:26,fontWeight:700,color:"#fff",lineHeight:1}}>{s.val}</div>
                <div style={{fontSize:10,color:"rgba(255,255,255,0.6)",marginTop:4,whiteSpace:"nowrap"}}>{s.label}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Stat cards ── */}
      <div style={{display:"grid",gridTemplateColumns:mobile?"1fr 1fr":"repeat(4,1fr)",gap:12}}>
        {[
          {label:"Tasks Done",value:`${done}/${tasks.length}`,sub:`${tasks.length-done} remaining`,bar:tasks.length?Math.round(done/tasks.length*100):0},
          {label:"Due Date",value:project.dueDate?project.dueDate.slice(5).replace("-"," / "):"TBD",sub:daysLeft!==null?(daysLeft>0?`${daysLeft} days remaining`:daysLeft===0?"Due today":`${Math.abs(daysLeft)} days past due`):"No date set"},
          {label:"Budget",value:`$${(project.budget??0).toLocaleString()}`,sub:`$${(project.spent??0).toLocaleString()} spent`,bar:budgetPct},
          {label:"Engagement Value",value:project.total_engagement_value?`$${Number(project.total_engagement_value).toLocaleString()}`:"—",sub:"Total contracted"},
        ].map((s,i)=>(
          <div key={i} style={{background:"#fff",border:`1px solid ${t.border}`,borderRadius:12,padding:"16px 18px",boxShadow:t.shadow}}>
            <div style={{color:t.textSub,fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.09em",marginBottom:8}}>{s.label}</div>
            <div style={{color:t.text,fontSize:mobile?18:22,fontWeight:300,letterSpacing:"-0.03em",marginBottom:4}}>{s.value}</div>
            <div style={{color:t.textSub,fontSize:11,marginBottom:s.bar!==undefined?6:0}}>{s.sub}</div>
            {s.bar!==undefined&&<div style={{height:3,background:t.border,borderRadius:99,overflow:"hidden"}}>
              <div style={{height:"100%",width:`${Math.min(s.bar,100)}%`,background:s.bar>90?t.green:t.accent,borderRadius:99,transition:"width 0.6s ease"}}/>
            </div>}
          </div>
        ))}
      </div>

      {/* ── Phase milestones ── */}
      {phases.length>0&&(
        <div style={{background:"#fff",border:`1px solid ${t.border}`,borderRadius:12,overflow:"hidden",boxShadow:t.shadow}}>
          <div style={{padding:"16px 22px 12px",borderBottom:`1px solid ${t.border}`}}>
            <div style={{color:t.text,fontSize:15,fontWeight:600,letterSpacing:"-0.01em",fontFamily:"'Playfair Display',Georgia,serif"}}>Project Milestones</div>
          </div>
          <div style={{overflowX:"auto",padding:"16px 22px",display:"flex",gap:0}}>
            {phases.map((ph,i)=>{
              const isDone=ph.status==="complete";
              const isActive=ph.status==="active";
              return (
                <div key={ph.id||i} style={{display:"flex",alignItems:"flex-start",flex:1,minWidth:120,maxWidth:200}}>
                  <div style={{flex:1}}>
                    <div style={{display:"flex",alignItems:"center",marginBottom:10}}>
                      <div style={{width:20,height:20,borderRadius:"50%",flexShrink:0,background:isDone?t.green:isActive?t.accent:"transparent",border:`2px solid ${isDone?t.green:isActive?t.accent:t.border}`,display:"flex",alignItems:"center",justifyContent:"center",zIndex:1}}>
                        {isDone&&<span style={{color:"#fff",fontSize:9,fontWeight:800}}>✓</span>}
                        {isActive&&<span style={{width:5,height:5,borderRadius:"50%",background:"#fff",display:"block"}}/>}
                      </div>
                      {i<phases.length-1&&<div style={{flex:1,height:2,background:isDone?t.green:t.border,marginLeft:0}}/>}
                    </div>
                    <div style={{paddingRight:8}}>
                      <div style={{color:isDone||isActive?t.text:t.textSub,fontSize:12,fontWeight:500,lineHeight:1.3,marginBottom:4}}>{ph.name}</div>
                      <Pill t={t} status={isDone?"complete":isActive?"active":"pending"} label={isDone?"Done":isActive?"Active":"Pending"}/>
                      {ph.progress>0&&!isDone&&<div style={{marginTop:6,height:2,background:t.border,borderRadius:99,overflow:"hidden"}}>
                        <div style={{height:"100%",width:`${ph.progress}%`,background:t.accent,borderRadius:99}}/>
                      </div>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Overdue / Due-soon actions ── */}
      {(overdueActions.length > 0 || dueSoonActions.length > 0) && (
        <div style={{background:"#fff",border:`1px solid ${t.border}`,borderRadius:12,overflow:"hidden",boxShadow:t.shadow}}>
          <div style={{padding:"14px 20px",borderBottom:`1px solid ${t.border}`,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
            <div style={{fontSize:14,fontWeight:600,color:t.text,fontFamily:"'Playfair Display',Georgia,serif",letterSpacing:"-0.01em"}}>Actions Needing Attention</div>
            <span style={{fontSize:11,fontWeight:600,padding:"2px 10px",borderRadius:99,background:overdueActions.length>0?"#fdf0ee":"#fef6e8",color:overdueActions.length>0?"#c0392b":"#d4881a"}}>
              {overdueActions.length+dueSoonActions.length} flagged
            </span>
          </div>
          {overdueActions.length > 0 && (
            <div style={{padding:"10px 20px 6px"}}>
              <div style={{fontSize:10,fontWeight:700,color:"#c0392b",letterSpacing:"0.08em",textTransform:"uppercase",marginBottom:8}}>⚠️ Overdue</div>
              {overdueActions.map((tk,i) => {
                const phaseName = phases.find(p=>p.id===tk.phase_id)?.name;
                const daysLate = Math.floor((todayMid-new Date(tk.due_date))/86400000);
                return (
                  <div key={tk.id} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 0",borderTop:i>0?"1px solid #fdf0ee":"none"}}>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:13,fontWeight:500,color:t.text,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{tk.title}</div>
                      {phaseName&&<div style={{fontSize:11,color:t.textSub,marginTop:1}}>{phaseName}</div>}
                    </div>
                    {tk.owner==="client"&&<span style={{fontSize:10,fontWeight:700,padding:"2px 8px",borderRadius:99,background:"#e8f0fe",color:"#2b5fcc",flexShrink:0}}>Client</span>}
                    {tk.owner==="lexops"&&<span style={{fontSize:10,fontWeight:700,padding:"2px 8px",borderRadius:99,background:"#e8f5ef",color:"#1A6666",flexShrink:0}}>LexOps</span>}
                    <span style={{fontSize:11,fontWeight:600,padding:"2px 9px",borderRadius:99,background:"#fdf0ee",color:"#c0392b",flexShrink:0}}>
                      {daysLate===0?"Due today":`${daysLate}d overdue`}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
          {dueSoonActions.length > 0 && (
            <div style={{padding:overdueActions.length>0?"4px 20px 12px":"10px 20px 12px"}}>
              {overdueActions.length>0&&<div style={{height:1,background:"#f0f4f3",marginBottom:10}}/>}
              <div style={{fontSize:10,fontWeight:700,color:"#d4881a",letterSpacing:"0.08em",textTransform:"uppercase",marginBottom:8}}>⏳ Due Within 7 Days</div>
              {dueSoonActions.map((tk,i) => {
                const phaseName = phases.find(p=>p.id===tk.phase_id)?.name;
                const daysLeft = Math.ceil((new Date(tk.due_date)-todayMid)/86400000);
                return (
                  <div key={tk.id} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 0",borderTop:i>0?"1px solid #fef6e8":"none"}}>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:13,fontWeight:500,color:t.text,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{tk.title}</div>
                      {phaseName&&<div style={{fontSize:11,color:t.textSub,marginTop:1}}>{phaseName}</div>}
                    </div>
                    {tk.owner==="client"&&<span style={{fontSize:10,fontWeight:700,padding:"2px 8px",borderRadius:99,background:"#e8f0fe",color:"#2b5fcc",flexShrink:0}}>Client</span>}
                    {tk.owner==="lexops"&&<span style={{fontSize:10,fontWeight:700,padding:"2px 8px",borderRadius:99,background:"#e8f5ef",color:"#1A6666",flexShrink:0}}>LexOps</span>}
                    <span style={{fontSize:11,fontWeight:600,padding:"2px 9px",borderRadius:99,background:"#fef6e8",color:"#d4881a",flexShrink:0}}>
                      {daysLeft===0?"Due today":`Due in ${daysLeft}d`}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Project summary / notes ── */}
      {(project.summary||project.client_summary)&&(
        <div style={{display:"grid",gridTemplateColumns:mobile?"1fr":(project.summary&&project.client_summary?"1fr 1fr":"1fr"),gap:14}}>
          {project.summary&&(
            <div style={{background:"#fff",border:`1px solid ${t.border}`,borderRadius:12,padding:"18px 22px",boxShadow:t.shadow}}>
              <div style={{fontSize:11,fontWeight:700,color:t.textSub,letterSpacing:"0.08em",textTransform:"uppercase",marginBottom:8}}>Internal Notes</div>
              <p style={{color:t.text,fontSize:13,lineHeight:1.8,margin:0}}>{project.summary}</p>
            </div>
          )}
          {project.client_summary&&(
            <div style={{background:"#fff",border:`1px solid ${t.border}`,borderRadius:12,padding:"18px 22px",boxShadow:t.shadow}}>
              <div style={{fontSize:11,fontWeight:700,color:t.textSub,letterSpacing:"0.08em",textTransform:"uppercase",marginBottom:8}}>Client Overview (visible to client)</div>
              <p style={{color:t.text,fontSize:13,lineHeight:1.8,margin:0}}>{project.client_summary}</p>
            </div>
          )}
        </div>
      )}

      {/* ── Pending deliverables ── */}
      {pendingDel.length>0&&(
        <div style={{background:"#fff",border:`1px solid ${t.border}`,borderRadius:12,overflow:"hidden",boxShadow:t.shadow}}>
          <div style={{padding:"16px 22px 12px",borderBottom:`1px solid ${t.border}`,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
            <div style={{color:t.text,fontSize:15,fontWeight:600,letterSpacing:"-0.01em",fontFamily:"'Playfair Display',Georgia,serif"}}>Pending Deliverables</div>
            <span style={{color:t.textSub,fontSize:12}}>{pendingDel.length} outstanding</span>
          </div>
          <div style={{padding:"8px 0"}}>
            {pendingDel.slice(0,5).map((d,i)=>(
              <div key={d.id||i} style={{padding:"10px 22px",display:"flex",alignItems:"center",gap:12,borderBottom:i<Math.min(pendingDel.length,5)-1?`1px solid ${t.border}`:"none"}}>
                <span style={{fontSize:15,flexShrink:0}}>📦</span>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{color:t.text,fontSize:13,fontWeight:500,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{d.title}</div>
                  {d.due_date&&<div style={{color:t.textSub,fontSize:11,marginTop:1}}>Due {d.due_date}</div>}
                </div>
                <Pill t={t} status={d.status==="in-progress"?"in-progress":"pending"} label={d.status==="in-progress"?"In Progress":"To Do"}/>
              </div>
            ))}
            {pendingDel.length>5&&<div style={{padding:"8px 22px",color:t.textSub,fontSize:12}}>+{pendingDel.length-5} more in the Plan tab</div>}
          </div>
        </div>
      )}

      {/* ── Recent activity ── */}
      {project.activity?.length>0&&(
        <div style={{background:"#fff",border:`1px solid ${t.border}`,borderRadius:12,overflow:"hidden",boxShadow:t.shadow}}>
          <div style={{padding:"16px 22px 12px",borderBottom:`1px solid ${t.border}`}}>
            <div style={{color:t.text,fontSize:15,fontWeight:600,letterSpacing:"-0.01em",fontFamily:"'Playfair Display',Georgia,serif"}}>Recent Activity</div>
          </div>
          <div style={{padding:"4px 0"}}>
            {project.activity.map((a,i)=>(
              <div key={i} style={{display:"flex",alignItems:"flex-start",gap:14,padding:"10px 22px",borderBottom:i<project.activity.length-1?`1px solid ${t.border}`:"none"}}>
                <span style={{color:colorMap[a.type]||t.textSub,fontSize:10,marginTop:3,flexShrink:0,fontWeight:700}}>{iconMap[a.type]||"·"}</span>
                <span style={{color:t.text,fontSize:13,flex:1,lineHeight:1.5}}>{a.text}</span>
                <span style={{color:t.textSub,fontSize:11,whiteSpace:"nowrap",flexShrink:0}}>{a.date}</span>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}

const toNull=v=>v===""?null:v;

const TASK_STATUSES=[["todo","To Do"],["in-progress","In Progress"],["done","Done"]];

// Derive phase statuses from tasks — never rely solely on the stored DB value.
// Rules: if all tasks in a phase are done → complete; first non-complete → active; rest → pending.
// Phases with zero tasks keep their stored status so admin overrides are respected.
function computePhaseStatuses(phases, tasks) {
  // Sort phases by the first number found in their name (e.g. "Milestone 3 - ..."),
  // falling back to created_at then id so order is always deterministic.
  const phaseNum = name => { const m = (name || "").match(/\d+/); return m ? parseInt(m[0]) : 9999; };
  const sorted = [...(phases || [])].sort((a, b) => {
    const nd = phaseNum(a.name) - phaseNum(b.name);
    if (nd !== 0) return nd;
    const td = new Date(a.created_at) - new Date(b.created_at);
    if (td !== 0) return td;
    return (a.id || "").localeCompare(b.id || "");
  });

  const hasTasks = {};
  const allDone = {};
  for (const t of (tasks || [])) {
    if (!t.phase_id) continue;
    if (!hasTasks[t.phase_id]) { hasTasks[t.phase_id] = true; allDone[t.phase_id] = true; }
    if (t.status !== "done") allDone[t.phase_id] = false;
  }
  let activeAssigned = false;
  return sorted.map(ph => {
    if (!hasTasks[ph.id]) return ph;                     // no tasks → keep stored status
    if (allDone[ph.id]) return { ...ph, status: "complete", progress: 100 };
    if (!activeAssigned) { activeAssigned = true; return { ...ph, status: "active" }; }
    return { ...ph, status: "pending" };
  });
}

// ---------------------------------------------------------------------------
// adminFetch — wraps fetch with the current user's Bearer token.
// Routes all writes through the Express backend (service-role key, bypasses RLS).
// ---------------------------------------------------------------------------
async function adminFetch(path, options = {}) {
  // Always refresh the session so we get a valid (non-expired) token
  let session;
  try {
    const { data } = await supabase.auth.getSession();
    session = data?.session;
    if (!session) {
      const { data: refreshed } = await supabase.auth.refreshSession();
      session = refreshed?.session;
    }
  } catch (authErr) {
    console.error("[adminFetch] session error:", authErr?.message);
  }
  const token = session?.access_token;
  if (!token) console.warn("[adminFetch] no access token — request will be rejected");

  const body = options.body !== undefined
    ? (typeof options.body === "string" ? options.body : JSON.stringify(options.body))
    : undefined;

  let resp;
  try {
    resp = await fetch(`/api/admin${path}`, {
      method: options.method || "GET",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.headers || {}),
      },
      body,
    });
  } catch (netErr) {
    console.error("[adminFetch] network error:", netErr?.message, "path:", path);
    throw new Error("Network error — could not reach server");
  }

  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    console.error("[adminFetch] server error:", resp.status, err.message, "path:", path);
    throw new Error(err.message || `HTTP ${resp.status}`);
  }
  return resp.json();
}
async function dbWrite(table, operation, data, match) {
  return adminFetch("/db", { method: "POST", body: { table, operation, data: data ?? null, match: match ?? null } });
}

async function autoCompletePhaseIfDone(projectId, phaseId) {
  if (!phaseId) return;
  try {
    await adminFetch(`/phases/${phaseId}/auto-complete`, { method: "POST", body: { project_id: projectId } });
  } catch (e) {
    console.error("[autoCompletePhaseIfDone] failed:", e.message);
  }
}
const EMPTY_TASK={title:"",assignee:"",due:"",status:"todo",is_internal:true,is_deliverable:false,phase_id:null};

function TasksTab({projectId,initialTasks,isInternal,onRefresh,t,mobile,teamMembers,phases}) {
  const [tasks,setTasks]=useState(initialTasks||[]);
  const [filter,setFilter]=useState("all");
  const [showAddForPhase,setShowAddForPhase]=useState(null);
  const [newForm,setNewForm]=useState(EMPTY_TASK);
  const [editingId,setEditingId]=useState(null);
  const [editForm,setEditForm]=useState({});
  const [saving,setSaving]=useState(false);
  const [formError,setFormError]=useState("");
  const [collapsedPhases,setCollapsedPhases]=useState({});
  const [showAddPhase,setShowAddPhase]=useState(false);
  const [newPhaseForm,setNewPhaseForm]=useState({name:""});

  // Sync tasks from parent when initialTasks prop changes (e.g. after PlanTab re-fetch)
  useEffect(()=>{if(initialTasks) setTasks(initialTasks);},[initialTasks]);

  const loadTasks=useCallback(async()=>{
    const {data}=await supabase.from("tasks").select("*").eq("project_id",projectId).order("id");
    if(data) setTasks(data);
  },[projectId]);

  useEffect(()=>{loadTasks();},[loadTasks]);

  const sortedPhases=useMemo(()=>[...(phases||[])].sort((a,b)=>new Date(a.created_at)-new Date(b.created_at)),[phases]);

  function openAddForPhase(phaseId){
    setShowAddForPhase(phaseId);
    setNewForm({...EMPTY_TASK,phase_id:phaseId});
    setEditingId(null);
    setFormError("");
  }

  function openAddGlobal(){
    setShowAddForPhase("__global__");
    setNewForm(EMPTY_TASK);
    setEditingId(null);
    setFormError("");
  }

  function openAddPhaseForm(){
    setShowAddPhase(true);
    setNewPhaseForm({name:""});
    setFormError("");
  }

  async function addPhase(e){
    e.preventDefault();
    if(!newPhaseForm.name.trim()){setFormError("Milestone name is required.");return;}
    setFormError("");
    setSaving(true);
    const payload={name:newPhaseForm.name,status:"pending",progress:0,project_id:projectId};
    try{await dbWrite("phases","insert",payload);}catch(err){console.error("[TasksTab] phase insert error:",err.message);setFormError(err.message);setSaving(false);return;}
    setNewPhaseForm({name:""});
    setShowAddPhase(false);
    setSaving(false);
    onRefresh?.();
  }

  async function addTask(e){
    e.preventDefault();
    if(!newForm.title.trim()){setFormError("Title is required.");return;}
    setFormError("");
    setSaving(true);
    const payload={title:newForm.title,assignee:newForm.assignee||null,due_date:toNull(newForm.due),status:newForm.status,is_internal:newForm.is_internal,is_deliverable:newForm.is_deliverable,phase_id:toNull(newForm.phase_id),project_id:projectId};
    try {
      await adminFetch("/tasks", { method: "POST", body: payload });
      setNewForm(EMPTY_TASK);
      setShowAddForPhase(null);
    } catch(err) { console.error("[TasksTab] insert error:", err.message); setFormError(err.message); setSaving(false); return; }
    await loadTasks();
    setSaving(false);
    onRefresh?.();
  }

  function startEdit(task){
    setEditingId(task.id);
    setEditForm({title:task.title,assignee:task.assignee||"",due:task.due_date||task.due||"",status:task.status,is_internal:task.is_internal??true,is_deliverable:task.is_deliverable??false,phase_id:task.phase_id?String(task.phase_id):""});
    setFormError("");
  }

  async function saveEdit(e,id){
    e.preventDefault();
    setFormError("");
    setSaving(true);
    // Map form key "due" → DB column "due_date"; strip any extra fields not in allowed list
    const payload={
      title:editForm.title,
      assignee:editForm.assignee||null,
      due_date:toNull(editForm.due),
      status:editForm.status,
      is_internal:editForm.is_internal,
      is_deliverable:editForm.is_deliverable,
      phase_id:toNull(editForm.phase_id),
    };
    try {
      await adminFetch(`/tasks/${id}`, { method: "PATCH", body: payload });
      setEditingId(null);
      await loadTasks();
      if(editForm.status==="done") await autoCompletePhaseIfDone(projectId, editForm.phase_id);
      onRefresh?.();
    } catch(err) {
      console.error("[TasksTab] update error:", err.message);
      setFormError(err.message);
    }
    setSaving(false);
  }

  async function toggleTask(task){
    const newStatus=task.status==="done"?"todo":"done";
    try {
      await adminFetch(`/tasks/${task.id}/status`, { method: "PATCH", body: { status: newStatus } });
      await loadTasks();
      if(newStatus==="done") await autoCompletePhaseIfDone(projectId, task.phase_id);
      onRefresh?.();
    } catch(err) { console.error("[TasksTab] toggle error:", err.message); }
  }

  async function deleteTask(id){
    try {
      await adminFetch(`/tasks/${id}`, { method: "DELETE" });
      setTasks(ts=>ts.filter(tk=>tk.id!==id));
      onRefresh?.();
    } catch(err) {
      console.error("[TasksTab] delete error:", err.message);
      setFormError(err.message);
    }
  }

  const tc={done:{dot:t.green,label:"Done",lc:t.green},"in-progress":{dot:t.accent,label:"Active",lc:t.accentLight},todo:{dot:t.textDim,label:"To Do",lc:t.textSub}};
  const filtered=filter==="all"?tasks:tasks.filter(tk=>tk.status===filter);
  const counts={all:tasks.length,"in-progress":tasks.filter(x=>x.status==="in-progress").length,todo:tasks.filter(x=>x.status==="todo").length,done:tasks.filter(x=>x.status==="done").length};

  // Build Set of valid phase IDs (as strings) for robust grouping — handles int/uuid type mismatches
  const validPhaseIds=useMemo(()=>{
    const s=new Set((phases||[]).map(ph=>String(ph.id)));
    console.log('[Plan] phases fetched:',(phases||[]).length,(phases||[]).map(p=>p.id));
    return s;
  },[phases]);

  // Group filtered tasks by phase, with proper fallback to Unassigned
  const groupedTasks=useMemo(()=>{
    const grouped={};
    filtered.forEach(tk=>{
      const phaseKey=tk.phase_id?String(tk.phase_id):null;
      const key=(phaseKey&&validPhaseIds.has(phaseKey))?phaseKey:"__unassigned__";
      if(!grouped[key]) grouped[key]=[];
      grouped[key].push(tk);
    });
    // Log type info for first task to diagnose mismatches
    if(filtered.length>0){
      const sample=filtered[0];
      console.log('[Plan] sample task phase_id:',sample.phase_id,'type:',typeof sample.phase_id,'phases sample id:',(phases||[])[0]?.id,'type:',typeof (phases||[])[0]?.id);
    }
    console.log('[Plan] tasks:',tasks.length,'phases:',(phases||[]).length,'grouped:',Object.keys(grouped).map(k=>k+':'+grouped[k].length));
    return grouped;
  },[filtered,tasks,phases,validPhaseIds]);

  const inlineInput=(value,onChange,placeholder,style={})=>(
    <input value={value} onChange={onChange} placeholder={placeholder} style={{background:t.surfaceHigh,border:`1px solid ${t.border}`,borderRadius:6,padding:"5px 9px",fontSize:12,color:t.text,outline:"none",fontFamily:"inherit",minWidth:0,...style}}/>
  );
  const inlineSelect=(value,onChange)=>(
    <select value={value} onChange={onChange} style={{background:t.surfaceHigh,border:`1px solid ${t.border}`,borderRadius:6,padding:"5px 8px",fontSize:12,color:t.text,outline:"none",fontFamily:"inherit",cursor:"pointer"}}>
      {TASK_STATUSES.map(([v,l])=><option key={v} value={v}>{l}</option>)}
    </select>
  );

  const toggleCollapse=(id)=>setCollapsedPhases(prev=>({...prev,[id]:!prev[id]}));

  const phaseStatusColors={complete:t.green,active:t.accent,pending:t.textDim};

  const renderAddForm=(formKey)=>(
    showAddForPhase===formKey&&(
      <div>
        <form onSubmit={addTask} style={{display:"flex",alignItems:"center",gap:8,padding:"12px 18px",flexWrap:"wrap"}}>
          {inlineInput(newForm.title,e=>setNewForm(f=>({...f,title:e.target.value})),"Task title…",{flex:"1 1 180px"})}
          {isInternal&&(teamMembers&&teamMembers.length>0?(
            <select value={newForm.assignee} onChange={e=>setNewForm(f=>({...f,assignee:e.target.value}))} style={{background:t.surfaceHigh,border:`1px solid ${t.border}`,borderRadius:6,padding:"5px 8px",fontSize:12,color:t.text,outline:"none",fontFamily:"inherit",cursor:"pointer",flex:"0 1 140px"}}>
              <option value="">Assignee…</option>
              {teamMembers.map(m=><option key={m.id} value={m.full_name||m.email}>{(m.full_name||m.email)+(m.role&&m.role!=="lexops_admin"&&m.role!=="lexops_member"?" (Client)":"")}</option>)}
            </select>
          ):inlineInput(newForm.assignee,e=>setNewForm(f=>({...f,assignee:e.target.value})),"Assignee",{flex:"0 1 120px"}))}
          <input type="date" value={newForm.due} onChange={e=>setNewForm(f=>({...f,due:e.target.value}))} style={{background:t.surfaceHigh,border:`1px solid ${t.border}`,borderRadius:6,padding:"5px 9px",fontSize:12,color:t.text,outline:"none",fontFamily:"inherit",minWidth:0,flex:"0 1 130px"}}/>
          {inlineSelect(newForm.status,e=>setNewForm(f=>({...f,status:e.target.value})))}
          {formKey==="__global__"&&phases&&phases.length>0&&(
            <select value={newForm.phase_id||""} onChange={e=>setNewForm(f=>({...f,phase_id:e.target.value||null}))} style={{background:t.surfaceHigh,border:`1px solid ${t.border}`,borderRadius:6,padding:"5px 8px",fontSize:12,color:t.text,outline:"none",fontFamily:"inherit",cursor:"pointer",flex:"0 1 140px"}}>
              <option value="">Milestone…</option>
              {sortedPhases.map((ph,idx)=><option key={ph.id} value={ph.id}>Milestone {idx+1} — {ph.name}</option>)}
            </select>
          )}
          {isInternal&&<label style={{display:"flex",alignItems:"center",gap:4,fontSize:11,color:t.textSub,cursor:"pointer",whiteSpace:"nowrap"}}><input type="checkbox" checked={newForm.is_internal} onChange={e=>setNewForm(f=>({...f,is_internal:e.target.checked}))}/> Internal</label>}
          {isInternal&&<label style={{display:"flex",alignItems:"center",gap:4,fontSize:11,color:t.textSub,cursor:"pointer",whiteSpace:"nowrap"}}><input type="checkbox" checked={newForm.is_deliverable} onChange={e=>setNewForm(f=>({...f,is_deliverable:e.target.checked}))}/> Deliverable</label>}
          <div style={{display:"flex",gap:6}}>
            <button type="submit" disabled={saving||!newForm.title.trim()} style={{background:t.accent,color:"#fff",border:"none",borderRadius:6,padding:"5px 14px",fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"inherit",opacity:saving||!newForm.title.trim()?0.5:1}}>
              {saving?"…":"Save"}
            </button>
            <button type="button" onClick={()=>{setShowAddForPhase(null);setNewForm(EMPTY_TASK);setFormError("");}} style={{background:"transparent",color:t.textSub,border:`1px solid ${t.border}`,borderRadius:6,padding:"5px 10px",fontSize:12,cursor:"pointer",fontFamily:"inherit"}}>Cancel</button>
          </div>
        </form>
        <Line t={t}/>
      </div>
    )
  );

  const renderTaskRow=(task,i,arr)=>{
    const c=tc[task.status]||tc.todo;
    const isEditing=editingId===task.id;
    return(
      <div key={task.id}>
        {isEditing?(
          <form onSubmit={e=>saveEdit(e,task.id)} style={{display:"flex",alignItems:"center",gap:8,padding:"11px 18px",flexWrap:"wrap"}}>
            {inlineInput(editForm.title,e=>setEditForm(f=>({...f,title:e.target.value})),"Title",{flex:"1 1 180px"})}
            {isInternal&&(teamMembers&&teamMembers.length>0?(
              <select value={editForm.assignee} onChange={e=>setEditForm(f=>({...f,assignee:e.target.value}))} style={{background:t.surfaceHigh,border:`1px solid ${t.border}`,borderRadius:6,padding:"5px 8px",fontSize:12,color:t.text,outline:"none",fontFamily:"inherit",cursor:"pointer",flex:"0 1 140px"}}>
                <option value="">Assignee…</option>
                {teamMembers.map(m=><option key={m.id} value={m.full_name||m.email}>{(m.full_name||m.email)+(m.role&&m.role!=="lexops_admin"&&m.role!=="lexops_member"?" (Client)":"")}</option>)}
              </select>
            ):inlineInput(editForm.assignee,e=>setEditForm(f=>({...f,assignee:e.target.value})),"Assignee",{flex:"0 1 120px"}))}
            <input type="date" value={editForm.due} onChange={e=>setEditForm(f=>({...f,due:e.target.value}))} style={{background:t.surfaceHigh,border:`1px solid ${t.border}`,borderRadius:6,padding:"5px 9px",fontSize:12,color:t.text,outline:"none",fontFamily:"inherit",minWidth:0,flex:"0 1 130px"}}/>
            {inlineSelect(editForm.status,e=>setEditForm(f=>({...f,status:e.target.value})))}
            {phases&&phases.length>0&&(
              <select value={editForm.phase_id||""} onChange={e=>setEditForm(f=>({...f,phase_id:e.target.value||null}))} style={{background:t.surfaceHigh,border:`1px solid ${t.border}`,borderRadius:6,padding:"5px 8px",fontSize:12,color:t.text,outline:"none",fontFamily:"inherit",cursor:"pointer",flex:"0 1 140px"}}>
                <option value="">Milestone…</option>
                {sortedPhases.map((ph,idx)=><option key={ph.id} value={ph.id}>Milestone {idx+1} — {ph.name}</option>)}
              </select>
            )}
            {isInternal&&<label style={{display:"flex",alignItems:"center",gap:4,fontSize:11,color:t.textSub,cursor:"pointer",whiteSpace:"nowrap"}}><input type="checkbox" checked={editForm.is_internal??true} onChange={e=>setEditForm(f=>({...f,is_internal:e.target.checked}))}/> Internal</label>}
            {isInternal&&<label style={{display:"flex",alignItems:"center",gap:4,fontSize:11,color:t.textSub,cursor:"pointer",whiteSpace:"nowrap"}}><input type="checkbox" checked={editForm.is_deliverable??false} onChange={e=>setEditForm(f=>({...f,is_deliverable:e.target.checked}))}/> Deliverable</label>}
            <div style={{display:"flex",gap:6}}>
              <button type="submit" disabled={saving} style={{background:t.accent,color:"#fff",border:"none",borderRadius:6,padding:"5px 14px",fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"inherit",opacity:saving?0.5:1}}>
                {saving?"…":"Save"}
              </button>
              <button type="button" onClick={()=>{setEditingId(null);setFormError("");}} style={{background:"transparent",color:t.textSub,border:`1px solid ${t.border}`,borderRadius:6,padding:"5px 10px",fontSize:12,cursor:"pointer",fontFamily:"inherit"}}>Cancel</button>
            </div>
          </form>
        ):(
          <div style={{display:"flex",flexDirection:mobile?"column":"row",alignItems:mobile?"stretch":"center",justifyContent:"space-between",padding:mobile?"14px 16px":"13px 18px",gap:mobile?10:12}}>
            <div style={{display:"flex",alignItems:"center",gap:12,minWidth:0}}>
              <div onClick={()=>toggleTask(task)} style={{width:18,height:18,borderRadius:"50%",flexShrink:0,border:`1.5px solid ${c.dot}`,background:task.status==="done"?c.dot:"transparent",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer"}}>
                {task.status==="done"&&<span style={{color:"#fff",fontSize:9,fontWeight:800}}>✓</span>}
              </div>
              <div style={{minWidth:0}}>
                <div style={{color:task.status==="done"?t.textSub:t.text,fontSize:13,fontWeight:500,textDecoration:task.status==="done"?"line-through":"none",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{task.title}</div>
                {isInternal&&task.assignee&&<div style={{color:t.textDim,fontSize:11,marginTop:1}}>{task.assignee}</div>}
              </div>
            </div>
            <div style={{display:"flex",alignItems:"center",gap:mobile?8:12,flexShrink:0,justifyContent:mobile?"space-between":"flex-end"}}>
              {(task.due_date||task.due)&&<span style={{color:t.textSub,fontSize:11,whiteSpace:"nowrap"}}>Due {task.due_date||task.due}</span>}
              <span style={{color:c.lc,fontSize:11,fontWeight:600,minWidth:40,textAlign:"right"}}>{c.label}</span>
              <button onClick={()=>startEdit(task)} title="Edit" style={{background:"transparent",border:`1px solid ${t.border}`,borderRadius:6,width:26,height:26,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",color:t.textSub,fontSize:13,flexShrink:0}}>✏</button>
              <button onClick={()=>deleteTask(task.id)} title="Delete" style={{background:"transparent",border:`1px solid ${t.border}`,borderRadius:6,width:26,height:26,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",color:t.red,fontSize:15,flexShrink:0}}>×</button>
            </div>
          </div>
        )}
        {i<arr.length-1&&<Line t={t}/>}
      </div>
    );
  };

  const unassignedTasks=groupedTasks["__unassigned__"]||[];

  return <div style={{display:"flex",flexDirection:"column",gap:16}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:10,flexWrap:"wrap"}}>
      <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
        {["all","in-progress","todo","done"].map(f=>(
          <button key={f} onClick={()=>setFilter(f)} style={{background:filter===f?t.accent:"transparent",color:filter===f?"#fff":t.textSub,border:`1px solid ${filter===f?t.accent:t.border}`,borderRadius:8,padding:"5px 14px",fontSize:12,cursor:"pointer",fontWeight:500,transition:"all 0.15s",display:"flex",alignItems:"center",gap:6}}>
            {f==="all"?"All":f==="in-progress"?"Active":f==="todo"?"To Do":"Done"}
            <span style={{background:filter===f?"rgba(255,255,255,0.2)":t.border,borderRadius:99,padding:"0 6px",fontSize:10,fontWeight:700}}>{counts[f]}</span>
          </button>
        ))}
      </div>
      <button onClick={openAddPhaseForm} style={{background:t.accent,color:"#fff",border:"none",borderRadius:8,padding:"5px 14px",fontSize:12,fontWeight:600,cursor:"pointer",whiteSpace:"nowrap",fontFamily:"inherit"}}>+ Add Milestone</button>
    </div>

    {formError&&<div style={{background:t.redSoft||"rgba(248,113,113,0.08)",border:`1px solid ${t.red}30`,borderRadius:8,padding:"8px 14px",color:t.red,fontSize:12,marginBottom:8}}>{formError}</div>}

    {/* Add Milestone form */}
    {showAddPhase&&(
      <Card t={t}>
        <form onSubmit={addPhase} style={{display:"flex",alignItems:"center",gap:8,padding:"12px 18px",flexWrap:"wrap"}}>
          <input value={newPhaseForm.name} onChange={e=>setNewPhaseForm({name:e.target.value})} placeholder="Milestone name…" autoFocus style={{background:t.surfaceHigh,border:`1px solid ${t.border}`,borderRadius:6,padding:"5px 9px",fontSize:12,color:t.text,outline:"none",fontFamily:"inherit",minWidth:0,flex:"1 1 180px"}}/>
          <div style={{display:"flex",gap:6}}>
            <button type="submit" disabled={saving||!newPhaseForm.name.trim()} style={{background:t.accent,color:"#fff",border:"none",borderRadius:6,padding:"5px 14px",fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"inherit",opacity:saving||!newPhaseForm.name.trim()?0.5:1}}>
              {saving?"…":"Create"}
            </button>
            <button type="button" onClick={()=>{setShowAddPhase(false);setNewPhaseForm({name:""});setFormError("");}} style={{background:"transparent",color:t.textSub,border:`1px solid ${t.border}`,borderRadius:6,padding:"5px 10px",fontSize:12,cursor:"pointer",fontFamily:"inherit"}}>Cancel</button>
          </div>
        </form>
      </Card>
    )}

    {/* Global add form (no phase pre-filled) */}
    {showAddForPhase==="__global__"&&(
      <Card t={t}>{renderAddForm("__global__")}</Card>
    )}

    {/* Phase sections */}
    {sortedPhases.map((ph,phIdx)=>{
      const phaseTasks=groupedTasks[String(ph.id)]||[];
      const isCollapsed=collapsedPhases[ph.id];
      const statusColor=phaseStatusColors[ph.status]||t.textDim;
      return(
        <Card key={ph.id} t={t}>
          <div onClick={()=>toggleCollapse(ph.id)} style={{display:"flex",alignItems:"center",padding:"14px 18px",gap:12,cursor:"pointer",userSelect:"none"}}>
            <span style={{color:t.textSub,fontSize:10,fontWeight:700,flexShrink:0,transition:"transform 0.15s",transform:isCollapsed?"rotate(0deg)":"rotate(90deg)"}}>▶</span>
            <span style={{color:t.text,fontSize:13,fontWeight:600}}>{ph.name}</span>
            <span style={{color:t.textSub,fontSize:11,background:t.surfaceHigh,borderRadius:99,padding:"0 7px",fontWeight:700}}>{phaseTasks.length}</span>
            <Pill t={t} status={ph.status==="complete"?"complete":ph.status==="active"?"active":"pending"} label={ph.status==="complete"?"Done":ph.status==="active"?"Active":"Pending"}/>
            <div style={{flex:1}}/>
            <button onClick={e=>{e.stopPropagation();openAddForPhase(ph.id);}} style={{background:"transparent",border:`1px solid ${t.border}`,borderRadius:6,padding:"3px 10px",fontSize:11,color:t.textSub,cursor:"pointer",fontFamily:"inherit",fontWeight:500,whiteSpace:"nowrap"}}>+ Add Task</button>
          </div>
          {!isCollapsed&&<>
            <Line t={t}/>
            {renderAddForm(ph.id)}
            {phaseTasks.length===0
              ?<div style={{color:t.textSub,textAlign:"center",padding:"24px 0",fontSize:12}}>No tasks in this milestone</div>
              :phaseTasks.map((task,i)=>renderTaskRow(task,i,phaseTasks))
            }
          </>}
        </Card>
      );
    })}
  </div>;
}

function fmtBytes(b){if(!b)return"—";if(b<1024)return`${b} B`;if(b<1048576)return`${(b/1024).toFixed(1)} KB`;return`${(b/1048576).toFixed(1)} MB`;}
function fmtDate(s){if(!s)return"—";const d=new Date(s);return d.toLocaleDateString("en-AU",{day:"numeric",month:"short",year:"numeric"});}

function DocumentsTab({projectId,initialDocuments,initialDocRequests,onRefresh,t,isInternal}) {
  const [docs,setDocs]=useState(initialDocuments||[]);
  const [uploading,setUploading]=useState(false);
  const [deletingId,setDeletingId]=useState(null);
  const [uploadError,setUploadError]=useState("");
  const fileInputRef=useState(()=>({current:null}))[0];
  const [showReqModal,setShowReqModal]=useState(false);
  const [reqForm,setReqForm]=useState({title:"",description:""});
  const [savingReq,setSavingReq]=useState(false);
  const [docRequests,setDocRequests]=useState(initialDocRequests||[]);

  const loadDocs=useCallback(async()=>{
    const [{data},{data:r}]=await Promise.all([
      supabase.from("documents").select("*").eq("project_id",projectId).order("uploaded_at",{ascending:false}),
      supabase.from("document_requests").select("*").eq("project_id",projectId).order("requested_at",{ascending:false}),
    ]);
    if(data) setDocs(data);
    if(r) setDocRequests(r);
  },[projectId]);

  useEffect(()=>{loadDocs();},[loadDocs]);

  async function handleFileSelect(e){
    const file=e.target.files?.[0];
    if(!file) return;
    e.target.value="";
    setUploadError("");
    setUploading(true);
    const storagePath=`${projectId}/${file.name}`;
    const {error:upErr}=await supabase.storage.from("project-documents").upload(storagePath,file,{upsert:true});
    if(upErr){setUploadError(upErr.message);setUploading(false);return;}
    const {data:{publicUrl}}=supabase.storage.from("project-documents").getPublicUrl(storagePath);
    const ext=file.name.split(".").pop().toUpperCase();
    try{
      await dbWrite("documents","insert",{project_id:projectId,name:file.name,file_type:ext,file_size:file.size,file_url:publicUrl,storage_path:storagePath,uploaded_at:new Date().toISOString()});
    }catch(dbErr){
      console.error("[DocumentsTab] insert error:",dbErr.message);
      // Rollback: remove orphaned storage file
      await supabase.storage.from("project-documents").remove([storagePath]);
      setUploadError(dbErr.message);setUploading(false);return;
    }
    await loadDocs();
    setUploading(false);
    onRefresh?.();
  }

  async function deleteDoc(doc){
    setDeletingId(doc.id);
    let token;
    try { const { data:{ session } } = await supabase.auth.getSession(); token = session?.access_token; } catch { token = null; }
    try {
      const resp = await fetch(`/api/admin/documents/${doc.id}`, {
        method: "DELETE",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!resp.ok) { const e = await resp.json().catch(()=>({})); throw new Error(e.message || `HTTP ${resp.status}`); }
      setDocs(ds=>ds.filter(d=>d.id!==doc.id));
      onRefresh?.();
    } catch(error) {
      console.error("[DocumentsTab] delete error:", error.message);
      setUploadError(error.message);
    }
    setDeletingId(null);
  }

  const tc={PDF:t.red,DOCX:t.accent,XLSX:t.green,PNG:t.green,JPG:t.green,CSV:t.amber};

  async function addDocRequest(e){
    e.preventDefault();
    if(!reqForm.title.trim()) return;
    setSavingReq(true);
    try{await dbWrite("document_requests","insert",{project_id:projectId,title:reqForm.title,description:reqForm.description||null});}catch(error){console.error("[DocumentsTab] doc request insert error:",error.message);setUploadError(error.message);setSavingReq(false);return;}
    // Notify clients via email
    fetch("/api/notify/document-request",{
      method:"POST",headers:{"Content-Type":"application/json"},
      body:JSON.stringify({project_id:projectId,title:reqForm.title,description:reqForm.description||""}),
    }).catch(()=>{});
    setReqForm({title:"",description:""});
    setShowReqModal(false);
    setSavingReq(false);
    await loadDocs();
    onRefresh?.();
  }

  return <div style={{display:"flex",flexDirection:"column",gap:14}}>
    {/* Request Document Modal */}
    {showReqModal&&(
      <div style={{position:"fixed",inset:0,zIndex:400,background:"rgba(0,0,0,0.6)",display:"flex",alignItems:"center",justifyContent:"center",padding:24}}>
        <div style={{background:t.surface,border:`1px solid ${t.border}`,borderRadius:14,padding:"28px 28px",width:"100%",maxWidth:440,boxShadow:"0 8px 32px rgba(0,0,0,0.3)"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:22}}>
            <span style={{color:t.text,fontSize:15,fontWeight:500}}>Request Document from Client</span>
            <button onClick={()=>setShowReqModal(false)} style={{background:"none",border:"none",color:t.textSub,fontSize:18,cursor:"pointer",lineHeight:1}}>×</button>
          </div>
          <form onSubmit={addDocRequest} style={{display:"flex",flexDirection:"column",gap:14}}>
            <div style={{display:"flex",flexDirection:"column",gap:6}}>
              <label style={{color:t.textSub,fontSize:11,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.08em"}}>Title</label>
              <input value={reqForm.title} onChange={e=>setReqForm(f=>({...f,title:e.target.value}))} placeholder="e.g. Signed engagement letter" style={{width:"100%",background:t.surfaceHigh,border:`1px solid ${t.border}`,borderRadius:7,padding:"8px 12px",fontSize:13,color:t.text,outline:"none",boxSizing:"border-box",fontFamily:"inherit"}}/>
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:6}}>
              <label style={{color:t.textSub,fontSize:11,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.08em"}}>Description</label>
              <textarea value={reqForm.description} onChange={e=>setReqForm(f=>({...f,description:e.target.value}))} placeholder="What do you need and why?" rows={3} style={{width:"100%",background:t.surfaceHigh,border:`1px solid ${t.border}`,borderRadius:7,padding:"8px 12px",fontSize:13,color:t.text,outline:"none",boxSizing:"border-box",fontFamily:"inherit",resize:"vertical"}}/>
            </div>
            <div style={{display:"flex",gap:8,justifyContent:"flex-end",paddingTop:4}}>
              <button type="button" onClick={()=>setShowReqModal(false)} style={{background:"transparent",color:t.textSub,border:`1px solid ${t.border}`,borderRadius:7,padding:"6px 14px",fontSize:12,cursor:"pointer",fontFamily:"inherit"}}>Cancel</button>
              <button type="submit" disabled={savingReq||!reqForm.title.trim()} style={{background:t.accent,color:"#fff",border:"none",borderRadius:7,padding:"6px 16px",fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"inherit",opacity:savingReq||!reqForm.title.trim()?0.5:1}}>{savingReq?"Saving…":"Send Request"}</button>
            </div>
          </form>
        </div>
      </div>
    )}

    {/* Pending requests (internal view) */}
    {isInternal&&docRequests.length>0&&(
      <div style={{display:"flex",flexDirection:"column",gap:8}}>
        <SectionLabel t={t}>Document Requests ({docRequests.filter(r=>!r.fulfilled_at).length} pending)</SectionLabel>
        {docRequests.map(req=>(
          <div key={req.id} style={{
            background:req.fulfilled_at?t.greenSoft:t.amberSoft,
            border:`1px solid ${req.fulfilled_at?t.green+"25":t.amber+"25"}`,
            borderRadius:10,padding:"12px 16px",display:"flex",alignItems:"center",justifyContent:"space-between",gap:12,
          }}>
            <div style={{minWidth:0}}>
              <div style={{color:t.text,fontSize:13,fontWeight:500}}>{req.fulfilled_at?"✓ ":""}{req.title}</div>
              {req.description&&<div style={{color:t.textSub,fontSize:11,marginTop:2}}>{req.description}</div>}
            </div>
            <span style={{color:t.textSub,fontSize:11,flexShrink:0}}>{req.fulfilled_at?"Fulfilled":fmtDate(req.requested_at)}</span>
          </div>
        ))}
      </div>
    )}

    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
      <span style={{color:t.textSub,fontSize:13}}>{docs.length} document{docs.length!==1?"s":""}</span>
      <div style={{display:"flex",alignItems:"center",gap:10}}>
        {uploading&&<span style={{color:t.textSub,fontSize:12}}>Uploading…</span>}
        {isInternal&&<button onClick={()=>setShowReqModal(true)} style={{background:"transparent",color:t.accentLight,border:`1px solid ${t.border}`,borderRadius:8,padding:"5px 14px",fontSize:12,fontWeight:500,cursor:"pointer",fontFamily:"inherit",whiteSpace:"nowrap"}}>+ Request Document</button>}
        <input ref={r=>{fileInputRef.current=r;}} type="file" style={{display:"none"}} onChange={handleFileSelect}/>
        <button onClick={()=>fileInputRef.current?.click()} disabled={uploading} style={{background:t.accent,color:"#fff",border:"none",borderRadius:8,padding:"5px 14px",fontSize:12,fontWeight:600,cursor:uploading?"not-allowed":"pointer",opacity:uploading?0.6:1,fontFamily:"inherit",whiteSpace:"nowrap"}}>
          Upload Document
        </button>
      </div>
    </div>
    {uploadError&&<div style={{background:t.redSoft||"rgba(248,113,113,0.08)",border:`1px solid ${t.red}30`,borderRadius:8,padding:"8px 14px",color:t.red,fontSize:12}}>{uploadError}</div>}
    <Card t={t} style={{overflowX:"auto"}}>
      {docs.length===0
        ?<div style={{color:t.textSub,textAlign:"center",padding:"40px 0",fontSize:13}}>No documents uploaded yet.</div>
        :docs.map((doc,i)=>{
          const ext=doc.file_type||(doc.name?.split(".").pop().toUpperCase())||"FILE";
          const c=tc[ext]||t.accent;
          return(
            <div key={doc.id??i}>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"15px 22px",gap:12}}>
                <div style={{display:"flex",alignItems:"center",gap:14,minWidth:0}}>
                  <div style={{width:36,height:36,borderRadius:8,flexShrink:0,background:c+"12",border:`1px solid ${c}22`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,fontWeight:800,color:c,letterSpacing:"0.03em"}}>{ext}</div>
                  <div style={{minWidth:0}}>
                    <div style={{color:t.text,fontSize:13,fontWeight:500,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{doc.name}</div>
                    <div style={{color:t.textSub,fontSize:11,marginTop:1}}>{fmtBytes(doc.file_size)} · {fmtDate(doc.uploaded_at)}</div>
                  </div>
                </div>
                <div style={{display:"flex",gap:8,flexShrink:0}}>
                  <a href={doc.file_url} target="_blank" rel="noreferrer" download={doc.name} style={{background:"transparent",color:t.accentLight,border:`1px solid ${t.border}`,borderRadius:7,padding:"5px 14px",fontSize:12,fontWeight:500,textDecoration:"none",display:"inline-flex",alignItems:"center"}}>
                    Download
                  </a>
                  <button onClick={()=>deleteDoc(doc)} disabled={deletingId===doc.id} title="Delete" style={{background:"transparent",border:`1px solid ${t.border}`,borderRadius:7,width:30,height:30,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",color:t.red,fontSize:15,opacity:deletingId===doc.id?0.4:1}}>
                    ×
                  </button>
                </div>
              </div>
              {i<docs.length-1&&<Line t={t}/>}
            </div>
          );
        })
      }
    </Card>
  </div>;
}

// ---------------------------------------------------------------------------
// Support Tickets Tab
// ---------------------------------------------------------------------------
const TICKET_STATUSES=["open","in_progress","resolved"];
const TICKET_STATUS_LABELS={open:"Open",in_progress:"In Progress",resolved:"Resolved"};
const TICKET_PRIORITIES=["high","medium","low"];
const TICKET_CATEGORIES=["general","technical","billing","documents","other"];
const EMPTY_TICKET={title:"",description:"",priority:"medium",category:"general"};

function SupportTab({projectId,isInternal,project,t,mobile,onRefresh}){
  const [tickets,setTickets]=useState([]);
  const [editingTicketId,setEditingTicketId]=useState(null);
  const [editTicketForm,setEditTicketForm]=useState({});
  const [updateSaving,setUpdateSaving]=useState(false);
  const [showForm,setShowForm]=useState(false);
  const [form,setForm]=useState(EMPTY_TICKET);
  const [saving,setSaving]=useState(false);
  const [movingId,setMovingId]=useState(null);
  const [loading,setLoading]=useState(true);
  const [calendlyUrl,setCalendlyUrl]=useState(project?.calendly_url||"");
  const [editingCalendly,setEditingCalendly]=useState(false);
  const [calendlyDraft,setCalendlyDraft]=useState(project?.calendly_url||"");
  const [calendlySaving,setCalendlySaving]=useState(false);

  const managerName=project?.manager||"your LexOps manager";
  const managerInitial=(managerName||"L").charAt(0).toUpperCase();

  async function saveCalendlyUrl(){
    if(!project?.id) return;
    setCalendlySaving(true);
    try {
      await dbWrite("projects","update",{calendly_url:calendlyDraft.trim()||null},{id:project.id});
      setCalendlyUrl(calendlyDraft.trim());
      setEditingCalendly(false);
      onRefresh?.();
    } catch(err) {
      console.error("[SupportTab] saveCalendlyUrl failed:", err.message);
      alert("Could not save booking link: " + err.message);
    }
    setCalendlySaving(false);
  }

  const loadTickets=useCallback(async()=>{
    const {data}=await supabase.from("support_tickets").select("*").eq("project_id",projectId).order("created_at",{ascending:false});
    if(data) setTickets(data);
    setLoading(false);
  },[projectId]);

  useEffect(()=>{loadTickets();},[loadTickets]);

  async function createTicket(e){
    e.preventDefault();
    if(!form.title.trim()) return;
    setSaving(true);
    try {
      await dbWrite("support_tickets","insert",{
        project_id:projectId,title:form.title.trim(),
        description:form.description.trim()||null,
        priority:form.priority,category:form.category,
        status:"open",created_by:isInternal?"admin":"client",
      });
      setForm(EMPTY_TICKET);setShowForm(false);
      setSaving(false);
      loadTickets().catch(()=>{});
    } catch(err) {
      console.error("[SupportTab] createTicket error:",err.message);
      setSaving(false);
    }
  }

  async function moveTicket(id,newStatus){
    setMovingId(id);
    try {
      await dbWrite("support_tickets","update",{status:newStatus,client_move_requested:null,updated_at:new Date().toISOString()},{id});
    } catch(err) { console.error("[SupportTab] moveTicket error:",err.message); }
    setMovingId(null);
    loadTickets().catch(()=>{});
  }

  async function cancelRequest(id){
    try { await dbWrite("support_tickets","update",{client_move_requested:null},{id}); } catch(err) { console.error("[SupportTab] cancelRequest error:",err.message); }
    loadTickets().catch(()=>{});
  }

  async function deleteTicket(id){
    setTickets(ts=>ts.filter(tk=>tk.id!==id));
    try { await dbWrite("support_tickets","delete",null,{id}); } catch(err) {
      console.error("[SupportTab] deleteTicket error:",err.message);
      loadTickets().catch(()=>{});
    }
  }

  async function updateTicket(e){
    e.preventDefault();
    if(!editTicketForm.title?.trim()) return;
    setUpdateSaving(true);
    try {
      const payload = {
        title: editTicketForm.title.trim(),
        description: editTicketForm.description?.trim() || null,
        priority: editTicketForm.priority,
        category: editTicketForm.category,
        updated_at: new Date().toISOString()
      };
      await dbWrite("support_tickets", "update", payload, {id: editingTicketId});
      setEditingTicketId(null);
      setUpdateSaving(false);
      loadTickets().catch(()=>{});
    } catch(err) {
      console.error("[SupportTab] updateTicket failed:", err.message);
      setUpdateSaving(false);
    }
  }

  const prioBar={high:"#c0392b",medium:"#d4881a",low:"#2d7a5a"};
  const prioPillBg={high:"#fdf0ee",medium:"#fef6e8",low:"#e8f5ef"};
  const prioPillColor={high:"#c0392b",medium:"#d4881a",low:"#2d7a5a"};
  const prioEmoji={high:"🔴",medium:"🟡",low:"🟢"};

  const colConfig=[
    {status:"open",label:"Open",countBg:"#fef6e8",countColor:"#d4881a"},
    {status:"in_progress",label:"In Progress",countBg:"#e8f2f1",countColor:t.accent},
    {status:"resolved",label:"Resolved",countBg:"#e8f5ef",countColor:"#2d7a5a"},
  ];

  function TicketCard({ticket}){
    const isBusy=movingId===ticket.id;
    const hasRequest=ticket.client_move_requested;
    const isResolved=ticket.status==="resolved";
    const isEditing=editingTicketId===ticket.id;

    if(isEditing) {
      return (
        <div style={{
          background:"#fff",borderRadius:8,border:`1px solid ${t.accent}`,
          padding:"14px",marginBottom:10,boxShadow:"0 2px 8px rgba(26,102,102,0.12)",
          position:"relative"
        }}>
          <form onSubmit={updateTicket} style={{display:"flex",flexDirection:"column",gap:10}}>
            <input 
              value={editTicketForm.title} 
              onChange={e=>setEditTicketForm(f=>({...f,title:e.target.value}))} 
              placeholder="Title *" required
              autoFocus
              style={{background:"#f7fafa",border:`1px solid ${t.border}`,borderRadius:6,padding:"7px 10px",fontSize:13,color:t.text,outline:"none",fontFamily:"inherit"}}
            />
            <textarea 
              value={editTicketForm.description||""} 
              onChange={e=>setEditTicketForm(f=>({...f,description:e.target.value}))} 
              placeholder="Description" rows={3}
              style={{background:"#f7fafa",border:`1px solid ${t.border}`,borderRadius:6,padding:"7px 10px",fontSize:12,color:t.text,outline:"none",fontFamily:"inherit",resize:"vertical"}}
            />
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
              <select 
                value={editTicketForm.priority} 
                onChange={e=>setEditTicketForm(f=>({...f,priority:e.target.value}))}
                style={{background:"#f7fafa",border:`1px solid ${t.border}`,borderRadius:6,padding:"6px 8px",fontSize:12,color:t.text,fontFamily:"inherit",cursor:"pointer"}}
              >
                <option value="high">🔴 High</option>
                <option value="medium">🟡 Medium</option>
                <option value="low">🟢 Low</option>
              </select>
              <select 
                value={editTicketForm.category} 
                onChange={e=>setEditTicketForm(f=>({...f,category:e.target.value}))}
                style={{background:"#f7fafa",border:`1px solid ${t.border}`,borderRadius:6,padding:"6px 8px",fontSize:12,color:t.text,fontFamily:"inherit",cursor:"pointer"}}
              >
                {TICKET_CATEGORIES.map(c=><option key={c} value={c}>{c.charAt(0).toUpperCase()+c.slice(1)}</option>)}
              </select>
            </div>
            <div style={{display:"flex",gap:8,marginTop:4}}>
              <button type="submit" disabled={updateSaving||!editTicketForm.title?.trim()} style={{flex:1,padding:"7px",background:t.accent,color:"#fff",border:"none",borderRadius:6,fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"inherit",opacity:updateSaving?0.6:1}}>
                {updateSaving?"Saving…":"Save"}
              </button>
              <button type="button" onClick={()=>setEditingTicketId(null)} style={{flex:1,padding:"7px",background:"transparent",color:t.textSub,border:`1px solid ${t.border}`,borderRadius:6,fontSize:12,fontWeight:500,cursor:"pointer",fontFamily:"inherit"}}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      );
    }

    return(
      <div style={{
        background:"#fff",borderRadius:8,border:`1px solid ${t.border}`,
        padding:"14px",marginBottom:10,boxShadow:"0 1px 3px rgba(26,74,71,0.06)",
        position:"relative",overflow:"hidden",opacity:isResolved?0.65:1,
      }}>
        <div style={{position:"absolute",left:0,top:0,bottom:0,width:3,borderRadius:"4px 0 0 4px",background:prioBar[ticket.priority]||t.border}}/>
        <div style={{paddingLeft:8}}>
          <div style={{fontSize:13,fontWeight:600,color:t.text,marginBottom:4,lineHeight:1.35}}>{ticket.title}</div>
          {ticket.description&&<div style={{fontSize:11,color:t.textSub,lineHeight:1.4,marginBottom:8}}>{ticket.description}</div>}
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:6}}>
            <div style={{display:"flex",alignItems:"center",gap:6}}>
              <span style={{fontSize:10,fontWeight:600,padding:"2px 8px",borderRadius:99,background:prioPillBg[ticket.priority]||t.surface,color:prioPillColor[ticket.priority]||t.textSub}}>
                {prioEmoji[ticket.priority]||""} {(ticket.priority||"").charAt(0).toUpperCase()+(ticket.priority||"").slice(1)}
              </span>
              <span style={{fontSize:10,color:t.textSub}}>
                {new Date(ticket.created_at).toLocaleDateString("en-GB",{day:"numeric",month:"short",year:"numeric"})}
              </span>
            </div>
            {isInternal&& (
              <div style={{display:"flex",gap:8}}>
                <button onClick={()=>{setEditTicketForm({...ticket}); setEditingTicketId(ticket.id);}} style={{background:"transparent",border:"none",color:t.textSub,cursor:"pointer",fontSize:13,padding:0,opacity:0.4}}>✏️</button>
                <button onClick={()=>deleteTicket(ticket.id)} style={{background:"transparent",border:"none",color:t.textSub,cursor:"pointer",fontSize:14,padding:0,opacity:0.4}}>×</button>
              </div>
            )}
          </div>
          {isInternal&&hasRequest&&(
            <div style={{background:"#fef6e8",border:"1px solid rgba(212,136,26,0.25)",borderRadius:6,padding:"7px 10px",marginTop:8,display:"flex",alignItems:"center",justifyContent:"space-between",gap:8}}>
              <span style={{color:"#d4881a",fontSize:11,fontWeight:600}}>⏳ Client requested → {TICKET_STATUS_LABELS[hasRequest]}</span>
              <div style={{display:"flex",gap:5}}>
                <button onClick={()=>moveTicket(ticket.id,hasRequest)} disabled={isBusy} style={{background:t.accent,color:"#fff",border:"none",borderRadius:5,padding:"3px 10px",fontSize:11,fontWeight:600,cursor:"pointer"}}>Approve</button>
                <button onClick={()=>cancelRequest(ticket.id)} style={{background:"transparent",border:`1px solid ${t.border}`,borderRadius:5,padding:"3px 8px",fontSize:11,color:t.textSub,cursor:"pointer"}}>Reject</button>
              </div>
            </div>
          )}
          {!isInternal&&hasRequest&&(
            <div style={{background:"#fef6e8",border:"1px solid rgba(212,136,26,0.25)",borderRadius:6,padding:"7px 10px",marginTop:8,display:"flex",alignItems:"center",justifyContent:"space-between",gap:8}}>
              <span style={{color:"#d4881a",fontSize:11}}>⏳ Pending review</span>
              <button onClick={()=>cancelRequest(ticket.id)} style={{background:"transparent",border:"none",color:t.textSub,fontSize:11,cursor:"pointer",textDecoration:"underline"}}>Cancel</button>
            </div>
          )}
          {isInternal
            ?<div style={{display:"flex",gap:5,marginTop:8,flexWrap:"wrap"}}>
               {TICKET_STATUSES.filter(s=>s!==ticket.status).map(st=>(
                 <button key={st} onClick={()=>moveTicket(ticket.id,st)} disabled={isBusy} style={{background:"transparent",border:`1px solid ${t.border}`,borderRadius:6,padding:"3px 10px",fontSize:11,color:t.textSub,cursor:"pointer",fontFamily:"inherit",opacity:isBusy?0.4:1}}>
                   → {TICKET_STATUS_LABELS[st]}
                 </button>
               ))}
             </div>
            :(!isResolved&&!hasRequest
                ?(ticket.status==="open"
                    ?<button onClick={()=>moveTicket(ticket.id,"in_progress")} style={{
                        fontSize:11,fontWeight:600,color:t.accent,background:"#e8f2f1",border:"none",
                        borderRadius:99,padding:"4px 12px",cursor:"pointer",fontFamily:"inherit",marginTop:8,display:"block",
                      }}>Mark as In Progress →</button>
                    :ticket.status==="in_progress"
                      ?<button onClick={async()=>{await dbWrite("support_tickets","update",{client_move_requested:"resolved"},{id:ticket.id});await loadTickets();}} style={{
                          fontSize:11,fontWeight:600,color:"#d4881a",background:"#fef6e8",border:"none",
                          borderRadius:99,padding:"4px 12px",cursor:"pointer",fontFamily:"inherit",marginTop:8,display:"block",
                        }}>Request Resolution →</button>
                      :null
                  )
                :isResolved?<div style={{fontSize:10,color:"#2d7a5a",fontStyle:"italic",marginTop:6}}>✓ Resolved by LexOps</div>
                :null
              )
          }
        </div>
      </div>
    );
  }

  return(
    <div style={{display:"flex",flexDirection:"column",gap:16}}>

      {/* Calendly booking card */}
      <div style={{
        background:"#fff",borderRadius:12,border:`1px solid ${t.border}`,
        padding:"18px 22px",boxShadow:"0 1px 3px rgba(26,74,71,0.06)",
      }}>
        <div style={{display:"flex",alignItems:"center",gap:16}}>
          <div style={{width:44,height:44,borderRadius:"50%",background:t.accent,color:"#fff",fontSize:16,fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
            {managerInitial}
          </div>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontSize:14,fontWeight:700,color:t.text,marginBottom:2}}>Book a call with {managerName}</div>
            <div style={{fontSize:12,color:t.textSub}}>30 min · Video call · {project?.name||"this engagement"} · Typically responds within 2 hours</div>
          </div>
          <div style={{display:"flex",gap:8,alignItems:"center",flexShrink:0}}>
            {isInternal&&!editingCalendly&&(
              <button onClick={()=>{setCalendlyDraft(calendlyUrl);setEditingCalendly(true);}}
                style={{background:t.surface,border:`1px solid ${t.border}`,borderRadius:7,padding:"7px 13px",fontSize:12,fontWeight:600,color:t.textSub,cursor:"pointer",fontFamily:"inherit"}}>
                {calendlyUrl?"✏️ Edit Link":"+ Add Booking Link"}
              </button>
            )}
            {!isInternal&&calendlyUrl&&(
              <a href={calendlyUrl} target="_blank" rel="noreferrer"
                style={{padding:"9px 18px",background:t.accent,color:"#fff",border:"none",borderRadius:8,fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:"inherit",textDecoration:"none",whiteSpace:"nowrap"}}>
                📅 Book a Call
              </a>
            )}
            {!isInternal&&!calendlyUrl&&(
              <span style={{fontSize:12,color:t.textSub,fontStyle:"italic"}}>Booking link coming soon</span>
            )}
            {isInternal&&calendlyUrl&&!editingCalendly&&(
              <a href={calendlyUrl} target="_blank" rel="noreferrer"
                style={{padding:"9px 18px",background:t.accent,color:"#fff",border:"none",borderRadius:8,fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:"inherit",textDecoration:"none",whiteSpace:"nowrap"}}>
                📅 Preview
              </a>
            )}
          </div>
        </div>

        {/* Inline URL editor — internal only */}
        {isInternal&&editingCalendly&&(
          <div style={{marginTop:16,borderTop:`1px solid ${t.border}`,paddingTop:16}}>
            <label style={{display:"block",fontSize:11,fontWeight:700,color:t.textSub,letterSpacing:"0.05em",marginBottom:6,textTransform:"uppercase"}}>Calendly Booking URL</label>
            <div style={{display:"flex",gap:8,alignItems:"center"}}>
              <input
                autoFocus
                value={calendlyDraft}
                onChange={e=>setCalendlyDraft(e.target.value)}
                placeholder="https://calendly.com/your-name/30min"
                onKeyDown={e=>{if(e.key==="Enter")saveCalendlyUrl();if(e.key==="Escape"){setEditingCalendly(false);setCalendlyDraft(calendlyUrl);}}}
                style={{flex:1,background:"#f7fafa",border:`1.5px solid ${t.accent}`,borderRadius:8,padding:"9px 12px",fontSize:13,color:t.text,outline:"none",fontFamily:"inherit"}}
              />
              <button onClick={saveCalendlyUrl} disabled={calendlySaving}
                style={{background:t.accent,color:"#fff",border:"none",borderRadius:8,padding:"9px 16px",fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:"inherit",opacity:calendlySaving?0.6:1,whiteSpace:"nowrap"}}>
                {calendlySaving?"Saving…":"Save"}
              </button>
              <button onClick={()=>{setEditingCalendly(false);setCalendlyDraft(calendlyUrl);}}
                style={{background:"transparent",border:`1px solid ${t.border}`,borderRadius:8,padding:"9px 13px",fontSize:13,color:t.textSub,cursor:"pointer",fontFamily:"inherit"}}>
                Cancel
              </button>
            </div>
            <div style={{fontSize:11,color:t.textSub,marginTop:6}}>Paste your Calendly event link. Clients will be redirected here when they click "Book a Call".</div>
          </div>
        )}
      </div>

      {/* New ticket form */}
      {showForm&&(
        <div style={{background:"#fff",borderRadius:12,border:`1px solid ${t.border}`,padding:"20px 22px",boxShadow:"0 1px 3px rgba(26,74,71,0.06)"}}>
          <div style={{fontSize:15,fontWeight:700,color:t.text,marginBottom:14,fontFamily:"'Playfair Display',Georgia,serif"}}>New Support Request</div>
          <form onSubmit={createTicket} style={{display:"flex",flexDirection:"column",gap:10}}>
            <input value={form.title} onChange={e=>setForm(f=>({...f,title:e.target.value}))} placeholder="Brief description of the issue or request *" required
              style={{background:"#f7fafa",border:`1.5px solid ${t.border}`,borderRadius:8,padding:"9px 12px",fontSize:13,color:t.text,outline:"none",fontFamily:"inherit"}}/>
            <textarea value={form.description} onChange={e=>setForm(f=>({...f,description:e.target.value}))} placeholder="What's happening? What did you expect instead?" rows={3}
              style={{background:"#f7fafa",border:`1.5px solid ${t.border}`,borderRadius:8,padding:"9px 12px",fontSize:13,color:t.text,outline:"none",fontFamily:"inherit",resize:"vertical"}}/>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
              <div style={{display:"flex",flexDirection:"column",gap:5}}>
                <label style={{fontSize:11,fontWeight:600,color:t.textSub,letterSpacing:"0.04em"}}>Priority</label>
                <select value={form.priority} onChange={e=>setForm(f=>({...f,priority:e.target.value}))}
                  style={{background:"#f7fafa",border:`1.5px solid ${t.border}`,borderRadius:8,padding:"8px 10px",fontSize:13,color:t.text,fontFamily:"inherit",cursor:"pointer"}}>
                  <option value="high">🔴 High — blocking work</option>
                  <option value="medium">🟡 Medium — important but not urgent</option>
                  <option value="low">🟢 Low — nice to have</option>
                </select>
              </div>
              <div style={{display:"flex",flexDirection:"column",gap:5}}>
                <label style={{fontSize:11,fontWeight:600,color:t.textSub,letterSpacing:"0.04em"}}>Category</label>
                <select value={form.category} onChange={e=>setForm(f=>({...f,category:e.target.value}))}
                  style={{background:"#f7fafa",border:`1.5px solid ${t.border}`,borderRadius:8,padding:"8px 10px",fontSize:13,color:t.text,fontFamily:"inherit",cursor:"pointer"}}>
                  {TICKET_CATEGORIES.map(c=><option key={c} value={c}>{c.charAt(0).toUpperCase()+c.slice(1)}</option>)}
                </select>
              </div>
            </div>
            <div style={{display:"flex",gap:10,marginTop:4}}>
              <button type="submit" disabled={saving||!form.title.trim()} style={{padding:"9px 22px",background:t.accent,color:"#fff",border:"none",borderRadius:8,fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:"inherit",opacity:saving||!form.title.trim()?0.5:1}}>{saving?"Submitting…":"Submit Request"}</button>
              <button type="button" onClick={()=>{setShowForm(false);setForm(EMPTY_TICKET);}} style={{padding:"9px 16px",background:"transparent",color:t.textSub,border:`1.5px solid ${t.border}`,borderRadius:8,fontSize:13,fontWeight:500,cursor:"pointer",fontFamily:"inherit"}}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* Kanban board */}
      {loading
        ?<div style={{color:t.textSub,textAlign:"center",padding:"40px 0"}}>Loading tickets…</div>
        :<div style={{display:"grid",gridTemplateColumns:mobile?"1fr":"repeat(3,1fr)",gap:14}}>
          {colConfig.map(col=>{
            const colTickets=tickets.filter(tk=>tk.status===col.status);
            return(
              <div key={col.status} style={{background:"#f7fafa",borderRadius:12,border:`1px solid ${t.border}`,padding:14,minHeight:350}}>
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14}}>
                  <span style={{fontSize:11,fontWeight:700,color:t.text,letterSpacing:"0.06em",textTransform:"uppercase"}}>{col.label}</span>
                  <span style={{width:22,height:22,borderRadius:"50%",background:col.countBg,color:col.countColor,fontSize:11,fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center"}}>{colTickets.length}</span>
                </div>
                {colTickets.map(tk=><TicketCard key={tk.id} ticket={tk}/>)}
                {col.status==="open"&&(
                  <button onClick={()=>setShowForm(s=>!s)} style={{
                    width:"100%",padding:10,borderRadius:8,background:"transparent",
                    border:`1.5px dashed ${t.border}`,color:t.textSub,fontSize:12,
                    fontWeight:500,cursor:"pointer",fontFamily:"inherit",
                    display:"flex",alignItems:"center",justifyContent:"center",gap:6,marginTop:4,
                  }}>
                    ＋ New Request
                  </button>
                )}
              </div>
            );
          })}
        </div>
      }
    </div>
  );
}

const INVOICE_STATUSES=[["upcoming","Upcoming"],["pending","Pending"],["paid","Paid"]];
const EMPTY_INVOICE={invoice_number:"",due_date:"",amount:"",description:"",phase_name:""};

function InvoicesTab({projectId,initialInvoices,isInternal,onRefresh,project,t,mobile}) {
  const [invoices,setInvoices]=useState(initialInvoices||[]);
  const [showAdd,setShowAdd]=useState(false);
  const [newForm,setNewForm]=useState(EMPTY_INVOICE);
  const [editingId,setEditingId]=useState(null);
  const [editForm,setEditForm]=useState({});
  const [saving,setSaving]=useState(false);
  const [uploadingId,setUploadingId]=useState(null);
  const [formError,setFormError]=useState("");
  const [addFile,setAddFile]=useState(null);
  const [engValue,setEngValue]=useState(project?.total_engagement_value||0);
  const [editingEng,setEditingEng]=useState(false);
  const [engInput,setEngInput]=useState(String(project?.total_engagement_value||0));
  const addFileRef=useState(()=>({current:null}))[0];
  const fileRef=useState(()=>({current:null,invoiceId:null}))[0];

  const loadInvoices=useCallback(async()=>{
    const {data}=await supabase.from("invoices").select("*").eq("project_id",projectId).order("id");
    if(data) setInvoices(data);
  },[projectId]);

  useEffect(()=>{loadInvoices();},[loadInvoices]);

  async function addInvoice(e){
    e.preventDefault();
    if(!newForm.invoice_number.trim()){setFormError("Invoice number is required.");return;}
    setFormError("");
    setSaving(true);
    try{
      let token;
      try{ const {data:{session}}=await supabase.auth.getSession(); token=session?.access_token; }catch{ token=null; }

      const formData=new FormData();
      formData.append("project_id",projectId);
      formData.append("invoice_number",newForm.invoice_number);
      formData.append("amount",String(Number(newForm.amount)||0));
      if(newForm.description) formData.append("description",newForm.description);
      if(newForm.phase_name)  formData.append("phase_name",newForm.phase_name);
      if(newForm.due_date)    formData.append("due_date",newForm.due_date);
      formData.append("status","pending");
      if(addFile) formData.append("file",addFile);

      const resp=await fetch("/api/admin/upload-invoice",{
        method:"POST",
        headers:token?{Authorization:`Bearer ${token}`}:{},
        body:formData,
      });
      if(!resp.ok){ const err=await resp.json().catch(()=>({})); throw new Error(err.message||`HTTP ${resp.status}`); }

      setNewForm(EMPTY_INVOICE);setAddFile(null);setShowAdd(false);
      setSaving(false);
      loadInvoices().catch(()=>{});
      onRefresh?.();
    }catch(error){
      console.error("[InvoicesTab] addInvoice error:",error.message);
      setFormError(error.message);
      setSaving(false);
    }
  }

  async function saveEngValue(){
    const v=Number(engInput)||0;
    try {
      await dbWrite("projects","update",{total_engagement_value:v},{id:projectId});
      setEngValue(v);setEditingEng(false);onRefresh?.();
    } catch(err){console.error("[InvoicesTab] saveEngValue error:",err.message);}
  }

  function startEdit(inv){
    setEditingId(inv.id);
    setEditForm({description:inv.description||"",status:inv.status||"upcoming",due_date:inv.due_date||"",amount:String(inv.amount||"")});
    setFormError("");
  }

  async function saveEdit(e,id){
    e.preventDefault();
    setFormError("");
    setSaving(true);
    try{
      const payload={...editForm,due_date:toNull(editForm.due_date),amount:Number(editForm.amount)||0};
      try{await dbWrite("invoices","update",payload,{id});}catch(error){console.error("[InvoicesTab] update error:",error.message);setFormError(error.message);setSaving(false);return;}
      setEditingId(null);
      setSaving(false);
      loadInvoices().catch(()=>{});
      onRefresh?.();
    }catch{setSaving(false);}
  }

  async function deleteInvoice(id){
    let token;
    try { const { data:{ session } } = await supabase.auth.getSession(); token = session?.access_token; } catch { token = null; }
    try {
      const resp = await fetch(`/api/admin/invoices/${id}`, {
        method: "DELETE",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!resp.ok) { const e = await resp.json().catch(()=>({})); throw new Error(e.message || `HTTP ${resp.status}`); }
    } catch(error) { console.error("[InvoicesTab] delete error:", error.message); setFormError(error.message); return; }
    setInvoices(inv=>inv.filter(x=>x.id!==id));
    onRefresh?.();
  }

  async function handlePdfUpload(e,inv){
    const file=e.target.files?.[0];
    if(!file) return;
    e.target.value="";
    setUploadingId(inv.id);
    try{
      let token;
      try{ const {data:{session}}=await supabase.auth.getSession(); token=session?.access_token; }catch{ token=null; }

      const formData=new FormData();
      formData.append("project_id",projectId);
      formData.append("invoice_id",inv.id);
      formData.append("file",file);

      const resp=await fetch("/api/admin/upload-invoice",{
        method:"POST",
        headers:token?{Authorization:`Bearer ${token}`}:{},
        body:formData,
      });
      if(!resp.ok){ const err=await resp.json().catch(()=>({})); throw new Error(err.message||`HTTP ${resp.status}`); }

      await loadInvoices();
      onRefresh?.();
    }catch(error){
      console.error("[InvoicesTab] handlePdfUpload error:",error.message);
      setFormError(error.message);
    }finally{setUploadingId(null);}
  }

  const total=invoices.reduce((s,i)=>s+(i.amount||0),0);
  const paid=invoices.filter(i=>i.status==="paid").reduce((s,i)=>s+(i.amount||0),0);

  const inlineInput=(value,onChange,placeholder,style={})=>(
    <input value={value} onChange={onChange} placeholder={placeholder} style={{background:t.surfaceHigh,border:`1px solid ${t.border}`,borderRadius:6,padding:"5px 9px",fontSize:12,color:t.text,outline:"none",fontFamily:"inherit",minWidth:0,...style}}/>
  );
  const inlineSelect=(value,onChange)=>(
    <select value={value} onChange={onChange} style={{background:t.surfaceHigh,border:`1px solid ${t.border}`,borderRadius:6,padding:"5px 8px",fontSize:12,color:t.text,outline:"none",fontFamily:"inherit",cursor:"pointer"}}>
      {INVOICE_STATUSES.map(([v,l])=><option key={v} value={v}>{l}</option>)}
    </select>
  );

  return <div style={{display:"flex",flexDirection:"column",gap:16}}>
    {/* Client-view financial summary */}
    {!isInternal&&(
      <div style={{display:"flex",flexDirection:"column",gap:12}}>
        <div style={{display:"grid",gridTemplateColumns:mobile?"1fr 1fr":"repeat(3,1fr)",gap:12}}>
          <div style={{background:"#fff",border:`1px solid ${t.border}`,borderRadius:12,padding:"20px 22px",boxShadow:"0 1px 3px rgba(26,74,71,0.06)"}}>
            <div style={{color:t.textSub,fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.09em",marginBottom:8}}>Engagement Value</div>
            <div style={{color:t.text,fontSize:28,fontFamily:"'Playfair Display',Georgia,serif",fontWeight:400,letterSpacing:"-0.03em",marginBottom:2}}>{engValue?`$${engValue.toLocaleString()}`:"—"}</div>
            <div style={{color:t.textSub,fontSize:11}}>Total contracted</div>
          </div>
          <div style={{background:"#fff",border:`1px solid ${t.border}`,borderRadius:12,padding:"20px 22px",boxShadow:"0 1px 3px rgba(26,74,71,0.06)"}}>
            <div style={{color:t.textSub,fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.09em",marginBottom:8}}>Invoiced to Date</div>
            <div style={{color:t.accentLight,fontSize:28,fontFamily:"'Playfair Display',Georgia,serif",fontWeight:400,letterSpacing:"-0.03em",marginBottom:6}}>{`$${(total||0).toLocaleString()}`}</div>
            {engValue>0&&<div style={{height:4,background:"#f0f4f3",borderRadius:99,overflow:"hidden",marginBottom:4}}>
              <div style={{height:"100%",width:`${Math.min(100,Math.round(total/engValue*100))}%`,background:`linear-gradient(90deg,${t.accent},#3d8f88)`,borderRadius:99,transition:"width 0.6s ease"}}/>
            </div>}
            <div style={{color:t.textSub,fontSize:11}}>{engValue>0?`${Math.min(100,Math.round(total/engValue*100))}% of contract · `:""}{invoices.filter(i=>i.status==="paid").length} paid</div>
          </div>
          <div style={{background:"#fff",border:`1px solid ${t.border}`,borderRadius:12,padding:"20px 22px",boxShadow:"0 1px 3px rgba(26,74,71,0.06)"}}>
            <div style={{color:t.textSub,fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.09em",marginBottom:8}}>Remaining</div>
            <div style={{color:engValue&&(engValue-total)>0?t.amber:t.green,fontSize:28,fontFamily:"'Playfair Display',Georgia,serif",fontWeight:400,letterSpacing:"-0.03em",marginBottom:2}}>{`$${Math.max(0,engValue-total).toLocaleString()}`}</div>
            <div style={{color:t.textSub,fontSize:11}}>{engValue?"of contract":"pending value"}</div>
          </div>
        </div>
      </div>
    )}
    {/* Internal summary + engagement value */}
    {isInternal&&(
      <div style={{display:"grid",gridTemplateColumns:mobile?"1fr 1fr":"repeat(4,1fr)",gap:12}}>
        {[
          {label:"Engagement Value",value:engValue?`$${engValue.toLocaleString()}`:"Set value →",color:t.text,eng:true},
          {label:"Invoiced",value:`$${(total||0).toLocaleString()}`,color:t.text},
          {label:"Collected",value:`$${(paid||0).toLocaleString()}`,color:t.green},
          {label:"Outstanding",value:`$${((total-paid)||0).toLocaleString()}`,color:t.amber},
        ].map((s,i)=>(
          <div key={i} style={{background:t.surface,border:`1px solid ${t.border}`,borderRadius:12,padding:"18px 20px",boxShadow:t.shadow,position:"relative"}}>
            <div style={{color:t.textSub,fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.09em",marginBottom:10}}>{s.label}</div>
            {s.eng&&editingEng
              ?<div style={{display:"flex",gap:6,alignItems:"center"}}>
                  <input value={engInput} onChange={e=>setEngInput(e.target.value)} onKeyDown={e=>{if(e.key==="Enter")saveEngValue();if(e.key==="Escape"){setEditingEng(false);setEngInput(String(engValue));}}} autoFocus style={{background:t.surfaceHigh,border:`1px solid ${t.accent}`,borderRadius:6,padding:"4px 8px",fontSize:16,color:t.text,outline:"none",fontFamily:"inherit",width:"100%"}}/>
                  <button onClick={saveEngValue} style={{background:t.accent,color:"#fff",border:"none",borderRadius:5,padding:"4px 10px",fontSize:11,cursor:"pointer",whiteSpace:"nowrap"}}>Save</button>
                </div>
              :<div style={{display:"flex",alignItems:"center",gap:8}}>
                  <span style={{color:s.color,fontSize:22,fontWeight:300,letterSpacing:"-0.04em"}}>{s.value}</span>
                  {s.eng&&<button onClick={()=>{setEditingEng(true);setEngInput(String(engValue));}} style={{background:"transparent",border:"none",color:t.textSub,cursor:"pointer",fontSize:13,padding:0,opacity:0.6}}>✏</button>}
                </div>
            }
          </div>
        ))}
      </div>
    )}

    {isInternal&&(
      <div style={{display:"flex",justifyContent:"flex-end"}}>
        <button onClick={()=>{setShowAdd(s=>!s);setEditingId(null);}} style={{background:t.accent,color:"#fff",border:"none",borderRadius:8,padding:"5px 14px",fontSize:12,fontWeight:600,cursor:"pointer",whiteSpace:"nowrap",fontFamily:"inherit"}}>+ Add Invoice</button>
      </div>
    )}

    {formError&&<div style={{background:t.redSoft||"rgba(248,113,113,0.08)",border:`1px solid ${t.red}30`,borderRadius:8,padding:"8px 14px",color:t.red,fontSize:12,marginBottom:8}}>{formError}</div>}
    <Card t={t} style={{overflowX:"auto"}}>
      {showAdd&&isInternal&&(
        <div>
          <form onSubmit={addInvoice} style={{display:"flex",alignItems:"center",gap:8,padding:"12px 18px",flexWrap:"wrap"}}>
            {inlineInput(newForm.invoice_number,e=>setNewForm(f=>({...f,invoice_number:e.target.value})),"Invoice # *",{flex:"0 1 110px"})}
            {inlineInput(newForm.description,e=>setNewForm(f=>({...f,description:e.target.value})),"Description",{flex:"1 1 160px"})}
            <input type="number" min="0" step="0.01" value={newForm.amount} onChange={e=>setNewForm(f=>({...f,amount:e.target.value}))} placeholder="Amount $" style={{background:t.surfaceHigh,border:`1px solid ${t.border}`,borderRadius:6,padding:"5px 9px",fontSize:12,color:t.text,outline:"none",fontFamily:"inherit",minWidth:0,flex:"0 1 100px"}}/>
            {inlineInput(newForm.phase_name,e=>setNewForm(f=>({...f,phase_name:e.target.value})),"Milestone",{flex:"0 1 100px"})}
            <input type="date" value={newForm.due_date} onChange={e=>setNewForm(f=>({...f,due_date:e.target.value}))} style={{background:t.surfaceHigh,border:`1px solid ${t.border}`,borderRadius:6,padding:"5px 9px",fontSize:12,color:t.text,outline:"none",fontFamily:"inherit",minWidth:0,flex:"0 1 130px"}}/>
            <input ref={r=>{addFileRef.current=r;}} type="file" accept=".pdf" style={{display:"none"}} onChange={e=>{const f=e.target.files?.[0];if(f)setAddFile(f);e.target.value="";}}/>
            <button type="button" onClick={()=>addFileRef.current?.click()} style={{background:t.surfaceHigh,border:`1px solid ${t.border}`,borderRadius:6,padding:"5px 12px",fontSize:12,color:addFile?t.text:t.textSub,cursor:"pointer",fontFamily:"inherit",flex:"0 1 160px",textAlign:"left",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
              {addFile?addFile.name:"PDF (optional)"}
            </button>
            <div style={{display:"flex",gap:6}}>
              <button type="submit" disabled={saving||!newForm.invoice_number.trim()} style={{background:t.accent,color:"#fff",border:"none",borderRadius:6,padding:"5px 14px",fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"inherit",opacity:saving||!newForm.invoice_number.trim()?0.5:1}}>
                {saving?"Saving…":"Save"}
              </button>
              <button type="button" onClick={()=>{setShowAdd(false);setNewForm(EMPTY_INVOICE);setAddFile(null);setFormError("");}} style={{background:"transparent",color:t.textSub,border:`1px solid ${t.border}`,borderRadius:6,padding:"5px 10px",fontSize:12,cursor:"pointer",fontFamily:"inherit"}}>Cancel</button>
            </div>
          </form>
          <Line t={t}/>
        </div>
      )}

      {invoices.length===0&&!showAdd
        ?<div style={{color:t.textSub,textAlign:"center",padding:"40px 0",fontSize:13}}>No invoices yet.</div>
        :invoices.map((inv,i)=>{
          const isEditing=editingId===inv.id;
          const invName=inv.description||inv.invoice_number;
          const dlHref=inv.file_url?`${inv.file_url}${inv.file_url.includes("?")?"&":"?"}download=${encodeURIComponent(invName+".pdf")}`:"#";
          const label=inv.file_url
            ?<a href={inv.file_url} target="_blank" rel="noreferrer" style={{color:t.accentLight,textDecoration:"none",fontWeight:500,fontSize:13}}>{invName}</a>
            :<span style={{color:t.text,fontSize:13,fontWeight:500}}>{invName}</span>;
          return(
            <div key={inv.id}>
              {isEditing?(
                <form onSubmit={e=>saveEdit(e,inv.id)} style={{display:"flex",alignItems:"center",gap:8,padding:"12px 18px",flexWrap:"wrap"}}>
                  {inlineInput(editForm.description,e=>setEditForm(f=>({...f,description:e.target.value})),"Description",{flex:"1 1 160px"})}
                  <input type="number" min="0" step="0.01" value={editForm.amount} onChange={e=>setEditForm(f=>({...f,amount:e.target.value}))} placeholder="Amount $" style={{background:t.surfaceHigh,border:`1px solid ${t.border}`,borderRadius:6,padding:"5px 9px",fontSize:12,color:t.text,outline:"none",fontFamily:"inherit",minWidth:0,flex:"0 1 90px"}}/>
                  {inlineSelect(editForm.status,e=>setEditForm(f=>({...f,status:e.target.value})))}
                  {inlineInput(editForm.due_date,e=>setEditForm(f=>({...f,due_date:e.target.value})),"Due date",{flex:"0 1 120px",type:"date"})}
                  <div style={{display:"flex",gap:6}}>
                    <button type="submit" disabled={saving} style={{background:t.accent,color:"#fff",border:"none",borderRadius:6,padding:"5px 14px",fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"inherit",opacity:saving?0.5:1}}>
                      {saving?"…":"Save"}
                    </button>
                    <button type="button" onClick={()=>setEditingId(null)} style={{background:"transparent",color:t.textSub,border:`1px solid ${t.border}`,borderRadius:6,padding:"5px 10px",fontSize:12,cursor:"pointer",fontFamily:"inherit"}}>Cancel</button>
                  </div>
                </form>
              ):(
                <div style={{display:"flex",flexDirection:mobile?"column":"row",alignItems:mobile?"stretch":"center",justifyContent:"space-between",padding:mobile?"14px 16px":"16px 22px",gap:mobile?10:12}}>
                  <div style={{minWidth:0,display:"flex",alignItems:"center",justifyContent:"space-between",gap:8}}>
                    <div style={{minWidth:0}}>
                      {label}
                      <div style={{color:t.textSub,fontSize:11,marginTop:2}}>{inv.invoice_number} · Due {inv.due_date||"—"}</div>
                    </div>
                    {mobile&&<span style={{color:t.text,fontFamily:"'Playfair Display',Georgia,serif",fontWeight:400,fontSize:20,letterSpacing:"-0.03em",flexShrink:0}}>${(inv.amount||0).toLocaleString()}</span>}
                  </div>
                  <div style={{display:"flex",alignItems:"center",gap:mobile?8:12,flexShrink:0,justifyContent:mobile?"space-between":"flex-end"}}>
                    {!mobile&&<span style={{color:t.text,fontFamily:"'Playfair Display',Georgia,serif",fontWeight:400,fontSize:20,letterSpacing:"-0.03em"}}>${(inv.amount||0).toLocaleString()}</span>}
                    <Pill t={t} status={inv.status} label={inv.status==="paid"?"Paid":inv.status==="pending"?"Due":"Upcoming"}/>
                    {inv.file_url&&(
                      <a href={dlHref} target="_blank" rel="noreferrer" style={{background:t.accent,color:"#fff",border:"none",borderRadius:6,padding:"4px 10px",fontSize:11,fontWeight:600,textDecoration:"none",whiteSpace:"nowrap",flexShrink:0}}>↓ PDF</a>
                    )}
                    {isInternal&&(
                      <>
                        <input type="file" accept=".pdf" style={{display:"none"}} ref={r=>{if(fileRef.invoiceId===inv.id)fileRef.current=r;}} onChange={e=>handlePdfUpload(e,inv)}/>
                        <button onClick={()=>{fileRef.invoiceId=inv.id;setTimeout(()=>{const input=document.createElement("input");input.type="file";input.accept=".pdf";input.onchange=e=>handlePdfUpload(e,inv);input.click();},0);}} disabled={uploadingId===inv.id} title="Upload PDF" style={{background:"transparent",border:`1px solid ${t.border}`,borderRadius:6,padding:"4px 10px",fontSize:11,cursor:uploadingId===inv.id?"not-allowed":"pointer",color:t.accentLight,fontFamily:"inherit",opacity:uploadingId===inv.id?0.4:1}}>
                          {uploadingId===inv.id?"…":"PDF ↑"}
                        </button>
                        <button onClick={()=>startEdit(inv)} title="Edit" style={{background:"transparent",border:`1px solid ${t.border}`,borderRadius:6,width:26,height:26,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",color:t.textSub,fontSize:13,flexShrink:0}}>✏</button>
                        <button onClick={()=>deleteInvoice(inv.id)} title="Delete" style={{background:"transparent",border:`1px solid ${t.border}`,borderRadius:6,width:26,height:26,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",color:t.red,fontSize:15,flexShrink:0}}>×</button>
                      </>
                    )}
                  </div>
                </div>
              )}
              {i<invoices.length-1&&<Line t={t}/>}
            </div>
          );
        })}
    </Card>
  </div>;
}

const PHASE_STATUSES=[["pending","Pending"],["active","Active"],["complete","Complete"]];
const EMPTY_PHASE={name:"",start:"",end:"",status:"pending",progress:0};

function TimelineTab({projectId,initialPhases,initialTasks,onRefresh,t}) {
  const [phases,setPhases]=useState(initialPhases||[]);
  const [tasks,setTasks]=useState(initialTasks||[]);
  const [expandedPhase,setExpandedPhase]=useState(null);
  const [showAdd,setShowAdd]=useState(false);
  const [newForm,setNewForm]=useState(EMPTY_PHASE);
  const [editingId,setEditingId]=useState(null);
  const [editForm,setEditForm]=useState({});
  const [saving,setSaving]=useState(false);

  const loadPhases=useCallback(async()=>{
    const [{data},{data:taskData}]=await Promise.all([
      supabase.from("phases").select("*").eq("project_id",projectId).order("created_at",{ascending:true}),
      supabase.from("tasks").select("*").eq("project_id",projectId).order("id"),
    ]);
    if(data) setPhases(data);
    if(taskData) setTasks(taskData);
  },[projectId]);

  useEffect(()=>{loadPhases();},[loadPhases]);

  const [formError,setFormError]=useState("");

  async function addPhase(e){
    e.preventDefault();
    if(!newForm.name.trim()){setFormError("Milestone name is required.");return;}
    setFormError("");
    setSaving(true);
    const payload={name:newForm.name,start:toNull(newForm.start),end:toNull(newForm.end),status:newForm.status,progress:Number(newForm.progress)||0,project_id:projectId};
    try{await dbWrite("phases","insert",payload);}catch(error){console.error("[TimelineTab] insert error:",error.message);setFormError(error.message);setSaving(false);return;}
    setNewForm(EMPTY_PHASE);
    setShowAdd(false);
    await loadPhases();
    setSaving(false);
    onRefresh?.();
  }

  function startEdit(ph){
    setEditingId(ph.id);
    setEditForm({name:ph.name,start:ph.start||"",end:ph.end||"",status:ph.status,progress:ph.progress??0});
    setFormError("");
  }

  async function saveEdit(e,id){
    e.preventDefault();
    setFormError("");
    setSaving(true);
    const payload={...editForm,start:toNull(editForm.start),end:toNull(editForm.end),progress:Number(editForm.progress)||0};
    try{await dbWrite("phases","update",payload,{id});}catch(error){console.error("[TimelineTab] update error:",error.message);setFormError(error.message);setSaving(false);return;}
    // Notify clients when phase marked complete
    if(editForm.status==="complete"){
      fetch("/api/notify/phase-complete",{
        method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({project_id:projectId,phase_name:editForm.name}),
      }).catch(()=>{});
    }
    setEditingId(null);
    await loadPhases();
    setSaving(false);
    onRefresh?.();
  }

  async function deletePhase(id){
    try{await dbWrite("phases","delete",null,{id});}catch(error){console.error("[TimelineTab] delete error:",error.message);setFormError(error.message);return;}
    setPhases(ps=>ps.filter(ph=>ph.id!==id));
    onRefresh?.();
  }

  // Gantt helpers
  const monthMap={Jan:0,Feb:31,Mar:59,Apr:90,May:120,Jun:151,Jul:181,Aug:212,Sep:243,Oct:273,Nov:304,Dec:334};
  const parseDate=s=>{if(!s)return 0;const[m,d]=s.split(" ");return(monthMap[m]||0)+parseInt(d);};
  const starts=phases.length?phases.map(p=>parseDate(p.start)):[];
  const ends=phases.length?phases.map(p=>parseDate(p.end)):[];
  const minDay=starts.length?Math.min(...starts):0;
  const maxDay=ends.length?Math.max(...ends):365;
  const span=maxDay-minDay||1;
  const toPercent=d=>((d-minDay)/span*100);
  const now=new Date();
  const MONTHS=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const todayStr=`${MONTHS[now.getMonth()]} ${now.getDate()}`;
  const todayPct=Math.min(100,Math.max(0,toPercent(parseDate(todayStr))));
  const phaseColors={complete:t.green,active:t.accent,pending:t.textDim};

  const phInput=(value,onChange,placeholder,extra={})=>(
    <input value={value} onChange={onChange} placeholder={placeholder} style={{background:t.surfaceHigh,border:`1px solid ${t.border}`,borderRadius:6,padding:"5px 9px",fontSize:12,color:t.text,outline:"none",fontFamily:"inherit",minWidth:0,...extra}}/>
  );
  const phSelect=(value,onChange)=>(
    <select value={value} onChange={onChange} style={{background:t.surfaceHigh,border:`1px solid ${t.border}`,borderRadius:6,padding:"5px 8px",fontSize:12,color:t.text,outline:"none",fontFamily:"inherit",cursor:"pointer"}}>
      {PHASE_STATUSES.map(([v,l])=><option key={v} value={v}>{l}</option>)}
    </select>
  );
  const saveBtn=(disabled)=>(
    <button type="submit" disabled={disabled} style={{background:t.accent,color:"#fff",border:"none",borderRadius:6,padding:"5px 14px",fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"inherit",opacity:disabled?0.5:1,whiteSpace:"nowrap"}}>{disabled?"…":"Save"}</button>
  );
  const cancelBtn=(onClick)=>(
    <button type="button" onClick={onClick} style={{background:"transparent",color:t.textSub,border:`1px solid ${t.border}`,borderRadius:6,padding:"5px 10px",fontSize:12,cursor:"pointer",fontFamily:"inherit"}}>Cancel</button>
  );

  return <div style={{display:"flex",flexDirection:"column",gap:20}}>
    {/* ── Gantt chart ── */}
    <CardPad t={t}>
      <SectionLabel t={t}>Project Timeline</SectionLabel>
      {phases.length===0
        ?<div style={{color:t.textSub,fontSize:13,textAlign:"center",padding:"24px 0"}}>No milestones yet. Add one below.</div>
        :<div style={{position:"relative",marginBottom:32}}>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}>
            {MONTHS.slice(0,5).map((m,i)=>(
              <span key={i} style={{color:t.textDim,fontSize:10,fontWeight:600,letterSpacing:"0.06em"}}>{m.toUpperCase()}</span>
            ))}
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:10}}>
            {phases.map((ph,i)=>{
              const left=toPercent(parseDate(ph.start));
              const width=Math.max(2,toPercent(parseDate(ph.end))-left);
              const color=phaseColors[ph.status]||t.textDim;
              return(
                <div key={ph.id??i}>
                  <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:5}}>
                    <div style={{width:160,flexShrink:0}}>
                      <span style={{color:ph.status==="pending"?t.textSub:t.text,fontSize:12,fontWeight:500}}>{ph.name}</span>
                    </div>
                    <div style={{flex:1,position:"relative",height:24,background:t.surfaceHigh,borderRadius:6,overflow:"hidden"}}>
                      <div style={{position:"absolute",left:`${todayPct}%`,top:0,bottom:0,width:1,background:t.amber,zIndex:2,opacity:0.7}}/>
                      <div style={{position:"absolute",left:`${left}%`,width:`${width}%`,top:"50%",transform:"translateY(-50%)",height:14,borderRadius:4,background:color,opacity:ph.status==="pending"?0.35:0.9,transition:"all 0.3s"}}/>
                      {ph.status==="active"&&<div style={{position:"absolute",left:`${left}%`,width:`${width*(ph.progress/100)}%`,top:"50%",transform:"translateY(-50%)",height:14,borderRadius:4,background:color,opacity:1}}/>}
                    </div>
                    <div style={{width:60,flexShrink:0,textAlign:"right"}}>
                      <Pill t={t} status={ph.status==="complete"?"complete":ph.status==="active"?"active":"pending"} label={ph.status==="complete"?"Done":ph.status==="active"?"Active":"Pending"}/>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <div style={{position:"relative",height:16,marginTop:8,marginLeft:172}}>
            <div style={{position:"absolute",left:`${todayPct}%`,transform:"translateX(-50%)",color:t.amber,fontSize:10,fontWeight:700,whiteSpace:"nowrap"}}>▲ Today</div>
          </div>
        </div>
      }
      <div style={{display:"flex",gap:16,paddingTop:8,borderTop:`1px solid ${t.border}`}}>
        {[{label:"Complete",color:t.green},{label:"Active",color:t.accent},{label:"Pending",color:t.textDim}].map((l,i)=>(
          <div key={i} style={{display:"flex",alignItems:"center",gap:6}}>
            <div style={{width:10,height:10,borderRadius:3,background:l.color,opacity:0.85}}/>
            <span style={{color:t.textSub,fontSize:11}}>{l.label}</span>
          </div>
        ))}
        <div style={{display:"flex",alignItems:"center",gap:6}}>
          <div style={{width:1,height:12,background:t.amber}}/>
          <span style={{color:t.textSub,fontSize:11}}>Today</span>
        </div>
      </div>
    </CardPad>

    {/* ── Phase Details table ── */}
    <Card t={t}>
      <div style={{padding:"14px 24px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <SectionLabel t={t}>Milestone Details</SectionLabel>
        <button onClick={()=>{setShowAdd(s=>!s);setEditingId(null);}} style={{background:t.accent,color:"#fff",border:"none",borderRadius:8,padding:"5px 14px",fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"inherit",whiteSpace:"nowrap"}}>+ Add Milestone</button>
      </div>
      <Line t={t}/>

      {formError&&<div style={{background:t.redSoft||"rgba(248,113,113,0.08)",border:`1px solid ${t.red}30`,borderRadius:8,padding:"8px 14px",color:t.red,fontSize:12,margin:"8px 20px 0"}}>{formError}</div>}
      {/* Add phase inline form */}
      {showAdd&&(
        <div>
          <form onSubmit={addPhase} style={{display:"flex",alignItems:"center",gap:8,padding:"12px 20px",flexWrap:"wrap"}}>
            {phInput(newForm.name,e=>setNewForm(f=>({...f,name:e.target.value})),"Milestone name…",{flex:"2 1 160px"})}
            <input type="date" value={newForm.start} onChange={e=>setNewForm(f=>({...f,start:e.target.value}))} style={{background:t.surfaceHigh,border:`1px solid ${t.border}`,borderRadius:6,padding:"5px 9px",fontSize:12,color:t.text,outline:"none",fontFamily:"inherit",minWidth:0,flex:"1 1 130px"}}/>
            <input type="date" value={newForm.end} onChange={e=>setNewForm(f=>({...f,end:e.target.value}))} style={{background:t.surfaceHigh,border:`1px solid ${t.border}`,borderRadius:6,padding:"5px 9px",fontSize:12,color:t.text,outline:"none",fontFamily:"inherit",minWidth:0,flex:"1 1 130px"}}/>
            {phInput(String(newForm.progress),e=>setNewForm(f=>({...f,progress:e.target.value})),"0-100",{flex:"0 0 60px",type:"number"})}
            {phSelect(newForm.status,e=>setNewForm(f=>({...f,status:e.target.value})))}
            <div style={{display:"flex",gap:6}}>
              {saveBtn(saving||!newForm.name.trim())}
              {cancelBtn(()=>{setShowAdd(false);setNewForm(EMPTY_PHASE);setFormError("");})}
            </div>
          </form>
          <Line t={t}/>
        </div>
      )}

      {phases.length===0&&!showAdd
        ?<div style={{color:t.textSub,textAlign:"center",padding:"32px 0",fontSize:13}}>No milestones yet.</div>
        :phases.map((ph,i)=>{
          const isEditing=editingId===ph.id;
          const isExpanded=expandedPhase===ph.id;
          const phaseTasks=tasks.filter(tk=>tk.phase_id===ph.id);
          const tc={done:{dot:t.green,label:"Done"},"in-progress":{dot:t.accent,label:"Active"},todo:{dot:t.textDim,label:"To Do"}};
          return(
            <div key={ph.id??i}>
              {isEditing?(
                <form onSubmit={e=>saveEdit(e,ph.id)} style={{display:"flex",alignItems:"center",gap:8,padding:"11px 20px",flexWrap:"wrap"}}>
                  {phInput(editForm.name,e=>setEditForm(f=>({...f,name:e.target.value})),"Milestone name",{flex:"2 1 160px"})}
                  <input type="date" value={editForm.start} onChange={e=>setEditForm(f=>({...f,start:e.target.value}))} style={{background:t.surfaceHigh,border:`1px solid ${t.border}`,borderRadius:6,padding:"5px 9px",fontSize:12,color:t.text,outline:"none",fontFamily:"inherit",minWidth:0,flex:"1 1 130px"}}/>
                  <input type="date" value={editForm.end} onChange={e=>setEditForm(f=>({...f,end:e.target.value}))} style={{background:t.surfaceHigh,border:`1px solid ${t.border}`,borderRadius:6,padding:"5px 9px",fontSize:12,color:t.text,outline:"none",fontFamily:"inherit",minWidth:0,flex:"1 1 130px"}}/>
                  {phInput(String(editForm.progress),e=>setEditForm(f=>({...f,progress:e.target.value})),"0-100",{flex:"0 0 60px",type:"number"})}
                  {phSelect(editForm.status,e=>setEditForm(f=>({...f,status:e.target.value})))}
                  <div style={{display:"flex",gap:6}}>
                    {saveBtn(saving)}
                    {cancelBtn(()=>{setEditingId(null);setFormError("");})}
                  </div>
                </form>
              ):(
                <>
                  <div style={{display:"flex",alignItems:"center",padding:"13px 20px",gap:12,cursor:"pointer"}} onClick={()=>setExpandedPhase(isExpanded?null:ph.id)}>
                    <span style={{color:t.textSub,fontSize:10,fontWeight:700,flexShrink:0,transition:"transform 0.15s",transform:isExpanded?"rotate(90deg)":"rotate(0deg)"}}>▶</span>
                    <div style={{flex:2}}><span style={{color:ph.status==="pending"?t.textSub:t.text,fontSize:13,fontWeight:500}}>{ph.name}</span><span style={{color:t.textDim,fontSize:11,marginLeft:8}}>{phaseTasks.length} task{phaseTasks.length!==1?"s":""}</span></div>
                    <div style={{flex:1,color:t.textSub,fontSize:12}}>{ph.start}</div>
                    <div style={{flex:1,color:t.textSub,fontSize:12}}>{ph.end}</div>
                    <div style={{flex:1}}><Thin value={ph.progress} t={t}/></div>
                    <div style={{flex:1,textAlign:"right"}}><Pill t={t} status={ph.status==="complete"?"complete":ph.status==="active"?"active":"pending"} label={ph.status==="complete"?"Done":ph.status==="active"?"Active":"Pending"}/></div>
                    <div style={{display:"flex",gap:6,flexShrink:0}} onClick={e=>e.stopPropagation()}>
                      <button onClick={()=>startEdit(ph)} title="Edit" style={{background:"transparent",border:`1px solid ${t.border}`,borderRadius:6,width:26,height:26,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",color:t.textSub,fontSize:13}}>✏</button>
                      <button onClick={()=>deletePhase(ph.id)} title="Delete" style={{background:"transparent",border:`1px solid ${t.border}`,borderRadius:6,width:26,height:26,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",color:t.red,fontSize:15}}>×</button>
                    </div>
                  </div>
                  {isExpanded&&phaseTasks.length>0&&(
                    <div style={{paddingLeft:36,paddingBottom:8}}>
                      {phaseTasks.map(task=>{
                        const c=tc[task.status]||tc.todo;
                        return(
                          <div key={task.id} style={{display:"flex",alignItems:"center",gap:10,padding:"6px 20px"}}>
                            <div style={{width:14,height:14,borderRadius:"50%",border:`1.5px solid ${c.dot}`,background:task.status==="done"?c.dot:"transparent",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                              {task.status==="done"&&<span style={{color:"#fff",fontSize:7,fontWeight:800}}>✓</span>}
                            </div>
                            <span style={{color:task.status==="done"?t.textSub:t.text,fontSize:12,fontWeight:400,textDecoration:task.status==="done"?"line-through":"none",flex:1}}>{task.title}</span>
                            {task.assignee&&<span style={{color:t.textDim,fontSize:11}}>{task.assignee}</span>}
                            {(task.due_date||task.due)&&<span style={{color:t.textSub,fontSize:11}}>Due {task.due_date||task.due}</span>}
                            <span style={{color:c.dot,fontSize:10,fontWeight:600}}>{c.label}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  {isExpanded&&phaseTasks.length===0&&(
                    <div style={{paddingLeft:36,paddingBottom:8,color:t.textDim,fontSize:12,padding:"6px 20px 8px 56px"}}>No tasks assigned to this milestone</div>
                  )}
                </>
              )}
              {i<phases.length-1&&<Line t={t}/>}
            </div>
          );
        })
      }
    </Card>
  </div>;
}

function KanbanView({projectId,phases,tasks,teamMembers,isInternal,onRefresh,t,mobile}) {
  const [editingTask,setEditingTask]=useState(null);
  const [editForm,setEditForm]=useState({});
  const [saving,setSaving]=useState(false);
  const [formError,setFormError]=useState("");
  const [showAddForPhase,setShowAddForPhase]=useState(null);
  const [newForm,setNewForm]=useState(EMPTY_TASK);
  const [showAddPhase,setShowAddPhase]=useState(false);
  const [newPhaseForm,setNewPhaseForm]=useState({name:""});

  const sortedPhases=[...phases].sort((a,b)=>new Date(a.created_at)-new Date(b.created_at));
  const columns=[...sortedPhases.map(ph=>({id:ph.id,name:ph.name,status:ph.status}))];

  function getTasksForColumn(colId){return tasks.filter(tk=>tk.phase_id===colId);}

  function openAddForPhase(phaseId){
    setShowAddForPhase(phaseId);
    setNewForm({...EMPTY_TASK,phase_id:phaseId});
    setFormError("");
  }

  function openAddPhaseForm(){
    setShowAddPhase(true);
    setNewPhaseForm({name:""});
    setFormError("");
  }

  async function addPhase(e){
    e.preventDefault();
    if(!newPhaseForm.name.trim()){setFormError("Milestone name is required.");return;}
    setFormError("");
    setSaving(true);
    const payload={name:newPhaseForm.name,status:"pending",progress:0,project_id:projectId};
    try{await dbWrite("phases","insert",payload);}catch(error){console.error("[KanbanView] phase insert error:",error.message);setFormError(error.message);setSaving(false);return;}
    setNewPhaseForm({name:""});
    setShowAddPhase(false);
    setSaving(false);
    onRefresh?.();
  }

  async function addTask(e){
    e.preventDefault();
    if(!newForm.title.trim()){setFormError("Title is required.");return;}
    setFormError("");
    setSaving(true);
    const payload={title:newForm.title,assignee:newForm.assignee||null,due_date:toNull(newForm.due),status:newForm.status,is_internal:newForm.is_internal,is_deliverable:newForm.is_deliverable,phase_id:toNull(newForm.phase_id),project_id:projectId};
    try {
      await adminFetch("/tasks", { method: "POST", body: payload });
      setNewForm(EMPTY_TASK);
      setShowAddForPhase(null);
      onRefresh?.();
    } catch(err) { setFormError(err.message); }
    setSaving(false);
  }

  function openEdit(task){
    setEditingTask(task);
    setEditForm({title:task.title,assignee:task.assignee||"",due:task.due_date||task.due||"",status:task.status,is_internal:task.is_internal??true,is_deliverable:task.is_deliverable??false,phase_id:task.phase_id?String(task.phase_id):""});
    setFormError("");
  }

  async function saveEdit(e){
    e.preventDefault();
    if(!editingTask) return;
    setFormError("");
    setSaving(true);
    const payload={
      title:editForm.title,
      assignee:editForm.assignee||null,
      due_date:toNull(editForm.due),
      status:editForm.status,
      is_internal:editForm.is_internal,
      is_deliverable:editForm.is_deliverable,
      phase_id:toNull(editForm.phase_id),
    };
    try {
      await adminFetch(`/tasks/${editingTask.id}`, { method: "PATCH", body: payload });
      if(editForm.status==="done") await autoCompletePhaseIfDone(projectId, editForm.phase_id||editingTask.phase_id);
      setEditingTask(null);
      onRefresh?.();
    } catch(err) { setFormError(err.message); }
    setSaving(false);
  }

  const statusColors={done:t.green,"in-progress":t.accent,todo:t.textDim};
  const statusLabels={done:"Done","in-progress":"Active",todo:"To Do"};
  const phaseStatusColors={complete:t.green,active:t.accent,pending:t.textDim};

  return <>
    {/* Edit modal */}
    {editingTask&&(
      <div style={{position:"fixed",inset:0,zIndex:400,background:"rgba(0,0,0,0.6)",display:"flex",alignItems:"center",justifyContent:"center",padding:24}}>
        <div style={{background:t.surface,border:`1px solid ${t.border}`,borderRadius:14,padding:"28px 28px",width:"100%",maxWidth:440,boxShadow:"0 8px 32px rgba(0,0,0,0.3)",overflowY:"auto",maxHeight:"90vh"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:22}}>
            <span style={{color:t.text,fontSize:15,fontWeight:500}}>Edit Task</span>
            <button onClick={()=>setEditingTask(null)} style={{background:"none",border:"none",color:t.textSub,fontSize:18,cursor:"pointer",lineHeight:1}}>×</button>
          </div>
          <form onSubmit={saveEdit} style={{display:"flex",flexDirection:"column",gap:14}}>
            {formError&&<div style={{background:t.redSoft,border:`1px solid ${t.red}30`,borderRadius:8,padding:"8px 14px",color:t.red,fontSize:12}}>{formError}</div>}
            <div style={{display:"flex",flexDirection:"column",gap:6}}>
              <label style={{color:t.textSub,fontSize:11,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.08em"}}>Title</label>
              <input value={editForm.title} onChange={e=>setEditForm(f=>({...f,title:e.target.value}))} style={{width:"100%",background:t.surfaceHigh,border:`1px solid ${t.border}`,borderRadius:7,padding:"8px 12px",fontSize:13,color:t.text,outline:"none",boxSizing:"border-box",fontFamily:"inherit"}}/>
            </div>
            {isInternal&&<div style={{display:"flex",flexDirection:"column",gap:6}}>
              <label style={{color:t.textSub,fontSize:11,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.08em"}}>Assignee</label>
              {teamMembers&&teamMembers.length>0?(
                <select value={editForm.assignee} onChange={e=>setEditForm(f=>({...f,assignee:e.target.value}))} style={{width:"100%",background:t.surfaceHigh,border:`1px solid ${t.border}`,borderRadius:7,padding:"8px 10px",fontSize:13,color:t.text,outline:"none",fontFamily:"inherit",cursor:"pointer"}}>
                  <option value="">Unassigned</option>
                  {teamMembers.map(m=><option key={m.id} value={m.full_name||m.email}>{(m.full_name||m.email)+(m.role&&m.role!=="lexops_admin"&&m.role!=="lexops_member"?" (Client)":"")}</option>)}
                </select>
              ):<input value={editForm.assignee} onChange={e=>setEditForm(f=>({...f,assignee:e.target.value}))} placeholder="Assignee" style={{width:"100%",background:t.surfaceHigh,border:`1px solid ${t.border}`,borderRadius:7,padding:"8px 12px",fontSize:13,color:t.text,outline:"none",boxSizing:"border-box",fontFamily:"inherit"}}/>}
            </div>}
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
              <div style={{display:"flex",flexDirection:"column",gap:6}}>
                <label style={{color:t.textSub,fontSize:11,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.08em"}}>Due Date</label>
                <input type="date" value={editForm.due} onChange={e=>setEditForm(f=>({...f,due:e.target.value}))} style={{width:"100%",background:t.surfaceHigh,border:`1px solid ${t.border}`,borderRadius:7,padding:"8px 12px",fontSize:13,color:t.text,outline:"none",boxSizing:"border-box",fontFamily:"inherit"}}/>
              </div>
              <div style={{display:"flex",flexDirection:"column",gap:6}}>
                <label style={{color:t.textSub,fontSize:11,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.08em"}}>Status</label>
                <select value={editForm.status} onChange={e=>setEditForm(f=>({...f,status:e.target.value}))} style={{width:"100%",background:t.surfaceHigh,border:`1px solid ${t.border}`,borderRadius:7,padding:"8px 10px",fontSize:13,color:t.text,outline:"none",fontFamily:"inherit",cursor:"pointer"}}>
                  {TASK_STATUSES.map(([v,l])=><option key={v} value={v}>{l}</option>)}
                </select>
              </div>
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:6}}>
              <label style={{color:t.textSub,fontSize:11,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.08em"}}>Milestone</label>
              <select value={editForm.phase_id||""} onChange={e=>setEditForm(f=>({...f,phase_id:e.target.value||null}))} style={{width:"100%",background:t.surfaceHigh,border:`1px solid ${t.border}`,borderRadius:7,padding:"8px 10px",fontSize:13,color:t.text,outline:"none",fontFamily:"inherit",cursor:"pointer"}}>
                <option value="">Unassigned</option>
                {phases.map(ph=><option key={ph.id} value={ph.id}>{ph.name}</option>)}
              </select>
            </div>
            {isInternal&&<div style={{display:"flex",gap:16}}>
              <label style={{display:"flex",alignItems:"center",gap:6,fontSize:12,color:t.textSub,cursor:"pointer"}}><input type="checkbox" checked={editForm.is_internal??true} onChange={e=>setEditForm(f=>({...f,is_internal:e.target.checked}))}/> Internal</label>
              <label style={{display:"flex",alignItems:"center",gap:6,fontSize:12,color:t.textSub,cursor:"pointer"}}><input type="checkbox" checked={editForm.is_deliverable??false} onChange={e=>setEditForm(f=>({...f,is_deliverable:e.target.checked}))}/> Deliverable</label>
            </div>}
            <div style={{display:"flex",gap:8,justifyContent:"flex-end",paddingTop:4}}>
              <button type="button" onClick={()=>setEditingTask(null)} style={{background:"transparent",color:t.textSub,border:`1px solid ${t.border}`,borderRadius:7,padding:"6px 14px",fontSize:12,cursor:"pointer",fontFamily:"inherit"}}>Cancel</button>
              <button type="submit" disabled={saving||!editForm.title?.trim()} style={{background:t.accent,color:"#fff",border:"none",borderRadius:7,padding:"6px 16px",fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"inherit",opacity:saving||!editForm.title?.trim()?0.5:1}}>{saving?"Saving…":"Save Changes"}</button>
            </div>
          </form>
        </div>
      </div>
    )}
    <div style={{display:"flex",justifyContent:"flex-start",marginBottom:16}}>
      <button onClick={openAddPhaseForm} style={{background:t.accent,color:"#fff",border:"none",borderRadius:8,padding:"5px 14px",fontSize:12,fontWeight:600,cursor:"pointer",whiteSpace:"nowrap",fontFamily:"inherit"}}>+ Add Milestone</button>
    </div>
    {showAddPhase&&(
      <div style={{background:t.surface,border:`1px solid ${t.border}`,borderRadius:12,padding:"12px 18px",marginBottom:16}}>
        <form onSubmit={addPhase} style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
          <input value={newPhaseForm.name} onChange={e=>setNewPhaseForm({name:e.target.value})} placeholder="Milestone name…" autoFocus style={{background:t.surfaceHigh,border:`1px solid ${t.border}`,borderRadius:6,padding:"5px 9px",fontSize:12,color:t.text,outline:"none",fontFamily:"inherit",minWidth:0,flex:"1 1 180px"}}/>
          <div style={{display:"flex",gap:6}}>
            <button type="submit" disabled={saving||!newPhaseForm.name.trim()} style={{background:t.accent,color:"#fff",border:"none",borderRadius:6,padding:"5px 14px",fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"inherit",opacity:saving||!newPhaseForm.name.trim()?0.5:1}}>
              {saving?"…":"Create"}
            </button>
            <button type="button" onClick={()=>{setShowAddPhase(false);setNewPhaseForm({name:""});setFormError("");}} style={{background:"transparent",color:t.textSub,border:`1px solid ${t.border}`,borderRadius:6,padding:"5px 10px",fontSize:12,cursor:"pointer",fontFamily:"inherit"}}>Cancel</button>
          </div>
        </form>
      </div>
    )}
    <div style={{display:"flex",gap:16,overflowX:"auto",paddingBottom:16,minHeight:300,alignItems:"flex-start"}}>
      {columns.map(col=>{
        const colTasks=getTasksForColumn(col.id);
        const colColor=phaseStatusColors[col.status]||t.textDim;
        return(
          <div key={col.id??'unassigned'} style={{minWidth:260,maxWidth:320,flex:"0 0 280px",display:"flex",flexDirection:"column",gap:8}}>
            {/* Column header */}
            <div style={{background:t.surface,border:`1px solid ${t.border}`,borderRadius:10,padding:"12px 16px",boxShadow:t.shadow}}>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:8}}>
                <div style={{display:"flex",alignItems:"center",gap:8}}>
                  <div style={{width:8,height:8,borderRadius:"50%",background:colColor,flexShrink:0}}/>
                  <span style={{color:t.text,fontSize:13,fontWeight:600}}>{col.name}</span>
                  <span style={{color:t.textSub,fontSize:11,background:t.surfaceHigh,borderRadius:99,padding:"0 6px",fontWeight:700}}>{colTasks.length}</span>
                </div>
              </div>
            </div>
            {/* Add task button */}
            <button onClick={()=>openAddForPhase(col.id)} style={{background:t.surfaceHigh,border:`1px dashed ${t.border}`,borderRadius:8,padding:"8px 12px",fontSize:12,color:t.textSub,cursor:"pointer",fontFamily:"inherit",textAlign:"center",fontWeight:500}}>+ Add Task</button>
            {/* Add task inline form */}
            {showAddForPhase===col.id&&(
              <div style={{background:t.surface,border:`1px solid ${t.border}`,borderRadius:10,padding:"12px 14px",boxShadow:t.shadow}}>
                <form onSubmit={addTask} style={{display:"flex",flexDirection:"column",gap:8}}>
                  {formError&&<div style={{color:t.red,fontSize:11}}>{formError}</div>}
                  <input value={newForm.title} onChange={e=>setNewForm(f=>({...f,title:e.target.value}))} placeholder="Task title…" autoFocus style={{background:t.surfaceHigh,border:`1px solid ${t.border}`,borderRadius:6,padding:"6px 10px",fontSize:12,color:t.text,outline:"none",fontFamily:"inherit"}}/>
                  {isInternal&&teamMembers&&teamMembers.length>0&&(
                    <select value={newForm.assignee} onChange={e=>setNewForm(f=>({...f,assignee:e.target.value}))} style={{background:t.surfaceHigh,border:`1px solid ${t.border}`,borderRadius:6,padding:"6px 8px",fontSize:12,color:t.text,outline:"none",fontFamily:"inherit",cursor:"pointer"}}>
                      <option value="">Assignee…</option>
                      {teamMembers.map(m=><option key={m.id} value={m.full_name||m.email}>{(m.full_name||m.email)+(m.role&&m.role!=="lexops_admin"&&m.role!=="lexops_member"?" (Client)":"")}</option>)}
                    </select>
                  )}
                  <div style={{display:"flex",gap:6}}>
                    <button type="submit" disabled={saving||!newForm.title.trim()} style={{background:t.accent,color:"#fff",border:"none",borderRadius:6,padding:"5px 12px",fontSize:11,fontWeight:600,cursor:"pointer",fontFamily:"inherit",opacity:saving||!newForm.title.trim()?0.5:1,flex:1}}>{saving?"…":"Add"}</button>
                    <button type="button" onClick={()=>{setShowAddForPhase(null);setNewForm(EMPTY_TASK);setFormError("");}} style={{background:"transparent",color:t.textSub,border:`1px solid ${t.border}`,borderRadius:6,padding:"5px 10px",fontSize:11,cursor:"pointer",fontFamily:"inherit"}}>Cancel</button>
                  </div>
                </form>
              </div>
            )}
            {/* Task cards */}
            {colTasks.map(task=>{
              const sColor=statusColors[task.status]||t.textDim;
              return(
                <div key={task.id} onClick={()=>openEdit(task)} style={{background:t.surface,border:`1px solid ${t.border}`,borderRadius:10,padding:"14px 16px",boxShadow:t.shadow,cursor:"pointer",transition:"border-color 0.15s"}} onMouseEnter={e=>{e.currentTarget.style.borderColor=t.accent;}} onMouseLeave={e=>{e.currentTarget.style.borderColor=t.border;}}>
                  <div style={{color:t.text,fontSize:13,fontWeight:500,marginBottom:8}}>{task.title}</div>
                  <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:8}}>
                    <div style={{display:"flex",alignItems:"center",gap:6}}>
                      {task.assignee&&(
                        <div style={{width:22,height:22,borderRadius:"50%",background:t.accent,display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,fontWeight:700,color:"#fff",flexShrink:0}} title={task.assignee}>
                          {task.assignee.split(" ").map(w=>w[0]).filter(Boolean).slice(0,2).join("").toUpperCase()}
                        </div>
                      )}
                      {(task.due_date||task.due)&&<span style={{color:t.textSub,fontSize:11}}>Due {task.due_date||task.due}</span>}
                    </div>
                    <span style={{color:sColor,fontSize:10,fontWeight:600,background:sColor+"14",borderRadius:99,padding:"2px 8px",border:`1px solid ${sColor}25`}}>{statusLabels[task.status]||task.status}</span>
                  </div>
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  </>;
}

function PlanTab({projectId,initialPhases,initialTasks,isInternal,onRefresh,t,mobile,teamMembers}) {
  const [planView,setPlanView]=useState("list");
  const [phases,setPhases]=useState(initialPhases||[]);
  const [tasks,setTasks]=useState(initialTasks||[]);

  const loadData=useCallback(async()=>{
    const [{data:phData},{data:tkData}]=await Promise.all([
      supabase.from("phases").select("*").eq("project_id",projectId).order("created_at",{ascending:true}),
      supabase.from("tasks").select("*").eq("project_id",projectId).order("id"),
    ]);
    console.log('[PlanTab] loadData phases:',phData?.length,'ids:',phData?.map(p=>p.id),'tasks:',tkData?.length,'task phase_ids:',[...new Set((tkData||[]).map(t=>t.phase_id))]);
    if(phData) setPhases(phData);
    if(tkData) setTasks(tkData);
  },[projectId]);

  useEffect(()=>{loadData();},[loadData]);

  const handleRefresh=useCallback(async()=>{
    await loadData();
    onRefresh?.();
  },[loadData,onRefresh]);

  return <div style={{display:"flex",flexDirection:"column",gap:16}}>
    {/* View toggle */}
    <div style={{display:"flex",gap:2,background:t.surfaceHigh,borderRadius:8,border:`1px solid ${t.border}`,padding:3,alignSelf:"flex-start"}}>
      {[["list","List"],["kanban","Kanban"]].map(([k,l])=>(
        <button key={k} onClick={()=>setPlanView(k)} style={{background:planView===k?t.accent:"transparent",color:planView===k?"#fff":t.textSub,border:"none",borderRadius:6,padding:"5px 16px",fontSize:12,fontWeight:600,cursor:"pointer",transition:"all 0.15s",fontFamily:"inherit"}}>{l}</button>
      ))}
    </div>

    {planView==="list"&&<TasksTab projectId={projectId} initialTasks={tasks} isInternal={isInternal} onRefresh={handleRefresh} t={t} mobile={mobile} teamMembers={teamMembers} phases={phases}/>}
    {planView==="kanban"&&<KanbanView projectId={projectId} phases={phases} tasks={tasks} teamMembers={teamMembers} isInternal={isInternal} onRefresh={handleRefresh} t={t} mobile={mobile}/>}
  </div>;
}

const SW_STATUSES=[["existing","Client Tool"],["new","Set Up by LexOps"]];
const EMPTY_TOOL={name:"",category:"",status:"existing",access:"",url:"",note:""};
const CAT_ICON={"Practice Management":"⚖","Productivity":"📋","Automation":"⚡","Intake Forms":"📝","CLM":"📄","e-Signature":"✍","Knowledge Management":"📚"};

function SoftwareTab({projectId,initialSoftware,isInternal,onRefresh,t}) {
  const [tools,setTools]=useState(initialSoftware||[]);
  const [showModal,setShowModal]=useState(false);
  const [editing,setEditing]=useState(null);
  const [form,setForm]=useState(EMPTY_TOOL);
  const [saving,setSaving]=useState(false);
  const [deletingId,setDeletingId]=useState(null);

  const loadTools=useCallback(async()=>{
    const {data}=await supabase.from("software").select("*").eq("project_id",projectId).order("id");
    if(data) setTools(data);
  },[projectId]);

  useEffect(()=>{loadTools();},[loadTools]);

  const [formError,setFormError]=useState("");

  function openNew(){setEditing(null);setForm(EMPTY_TOOL);setFormError("");setShowModal(true);}
  function openEdit(sw){setEditing(sw);setForm({name:sw.name||"",category:sw.category||"",status:sw.status||"existing",access:sw.access||"",url:sw.url||"",note:sw.note||""});setFormError("");setShowModal(true);}

  async function handleSubmit(e){
    e.preventDefault();
    if(!form.name.trim()){setFormError("Name is required.");return;}
    setFormError("");
    setSaving(true);
    const payload={...form,category:toNull(form.category),access:toNull(form.access),url:toNull(form.url),note:toNull(form.note)};
    if(editing){
      try{await dbWrite("software","update",payload,{id:editing.id});}catch(error){console.error("[SoftwareTab] update error:",error.message);setFormError(error.message);setSaving(false);return;}
    } else {
      try{await dbWrite("software","insert",{...payload,project_id:projectId});}catch(error){console.error("[SoftwareTab] insert error:",error.message);setFormError(error.message);setSaving(false);return;}
    }
    setShowModal(false);
    await loadTools();
    setSaving(false);
    onRefresh?.();
  }

  async function deleteTool(id){
    setDeletingId(id);
    try{await dbWrite("software","delete",null,{id});}catch(error){console.error("[SoftwareTab] delete error:",error.message);setFormError(error.message);setDeletingId(null);return;}
    setTools(ts=>ts.filter(sw=>sw.id!==id));
    setDeletingId(null);
    onRefresh?.();
  }

  const catColors={"Practice Management":t.accent,"Productivity":t.textSub,"Automation":t.green,"Intake Forms":t.amber,"CLM":t.purple||t.accent,"e-Signature":t.green,"Knowledge Management":t.purple||t.accent,"Process Mapping":t.amber};
  const existing=tools.filter(s=>s.status==="existing");
  const newT=tools.filter(s=>s.status==="new");

  const inp=(val,onChange,ph,extra={})=>(
    <input value={val} onChange={onChange} placeholder={ph} style={{width:"100%",background:t.surfaceHigh,border:`1px solid ${t.border}`,borderRadius:7,padding:"8px 12px",fontSize:13,color:t.text,outline:"none",boxSizing:"border-box",fontFamily:"inherit",...extra}}/>
  );
  const sel=(val,onChange,opts)=>(
    <select value={val} onChange={onChange} style={{width:"100%",background:t.surfaceHigh,border:`1px solid ${t.border}`,borderRadius:7,padding:"8px 10px",fontSize:13,color:t.text,outline:"none",fontFamily:"inherit",cursor:"pointer"}}>
      {opts.map(([v,l])=><option key={v} value={v}>{l}</option>)}
    </select>
  );
  const field=(label,child)=>(
    <div style={{display:"flex",flexDirection:"column",gap:6}}>
      <label style={{color:t.textSub,fontSize:11,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.08em"}}>{label}</label>
      {child}
    </div>
  );

  const ToolGroup=({list,title})=>(
    <div style={{display:"flex",flexDirection:"column",gap:14}}>
      <SectionLabel t={t}>{title}</SectionLabel>
      {list.length===0
        ?<div style={{color:t.textSub,fontSize:13,padding:"4px 0"}}>None recorded</div>
        :<Card t={t} style={{overflowX:"auto"}}>
          {list.map((sw,i)=>{
            const catColor=catColors[sw.category]||t.accent;
            return(
              <div key={sw.id??i}>
                <div style={{display:"flex",alignItems:"center",padding:"15px 22px",gap:14}}>
                  <div style={{width:38,height:38,borderRadius:9,flexShrink:0,background:catColor+"14",border:`1px solid ${catColor}25`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16}}>
                    {CAT_ICON[sw.category]||"🔗"}
                  </div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:3}}>
                      <span style={{color:t.text,fontSize:13,fontWeight:600}}>{sw.name}</span>
                      <span style={{color:catColor,fontSize:10,fontWeight:700,background:catColor+"14",borderRadius:99,padding:"1px 7px"}}>{sw.category}</span>
                    </div>
                    {sw.note&&<div style={{color:t.textSub,fontSize:11}}>{sw.note}</div>}
                  </div>
                  <div style={{display:"flex",alignItems:"center",gap:8,flexShrink:0}}>
                    {isInternal&&<span style={{color:t.textSub,fontSize:11,background:t.surfaceHigh,border:`1px solid ${t.border}`,borderRadius:6,padding:"2px 8px"}}>{sw.access}</span>}
                    <Pill t={t} status={sw.status} label={sw.status==="existing"?"Client Tool":"Set Up by LexOps"}/>
                    {isInternal&&<>
                      <button onClick={()=>openEdit(sw)} title="Edit" style={{background:"transparent",border:`1px solid ${t.border}`,borderRadius:6,width:26,height:26,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",color:t.textSub,fontSize:13}}>✏</button>
                      <button onClick={()=>deleteTool(sw.id)} disabled={deletingId===sw.id} title="Delete" style={{background:"transparent",border:`1px solid ${t.border}`,borderRadius:6,width:26,height:26,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",color:t.red,fontSize:15,opacity:deletingId===sw.id?0.4:1}}>×</button>
                    </>}
                  </div>
                </div>
                {i<list.length-1&&<Line t={t}/>}
              </div>
            );
          })}
        </Card>
      }
    </div>
  );

  return <>
    {showModal&&(
      <div style={{position:"fixed",inset:0,zIndex:400,background:"rgba(0,0,0,0.6)",display:"flex",alignItems:"center",justifyContent:"center",padding:24}}>
        <div style={{background:t.surface,border:`1px solid ${t.border}`,borderRadius:14,padding:"28px 28px",width:"100%",maxWidth:440,boxShadow:"0 8px 32px rgba(0,0,0,0.3)",overflowY:"auto",maxHeight:"90vh"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:22}}>
            <span style={{color:t.text,fontSize:15,fontWeight:500}}>{editing?"Edit Tool":"Add Tool"}</span>
            <button onClick={()=>setShowModal(false)} style={{background:"none",border:"none",color:t.textSub,fontSize:18,cursor:"pointer",lineHeight:1}}>×</button>
          </div>
          <form onSubmit={handleSubmit} style={{display:"flex",flexDirection:"column",gap:14}}>
            {formError&&<div style={{background:t.redSoft||"rgba(248,113,113,0.08)",border:`1px solid ${t.red}30`,borderRadius:8,padding:"8px 14px",color:t.red,fontSize:12}}>{formError}</div>}
            {field("Name",inp(form.name,e=>setForm(f=>({...f,name:e.target.value})),"e.g. Smokeball"))}
            {field("Category",inp(form.category,e=>setForm(f=>({...f,category:e.target.value})),"e.g. Practice Management"))}
            {field("Status",sel(form.status,e=>setForm(f=>({...f,status:e.target.value})),SW_STATUSES))}
            {field("Access Level",inp(form.access,e=>setForm(f=>({...f,access:e.target.value})),"e.g. Admin"))}
            {field("URL",inp(form.url,e=>setForm(f=>({...f,url:e.target.value})),"https://…"))}
            {field("Note",inp(form.note,e=>setForm(f=>({...f,note:e.target.value})),"Optional note"))}
            <div style={{display:"flex",gap:8,justifyContent:"flex-end",paddingTop:4}}>
              <button type="button" onClick={()=>setShowModal(false)} style={{background:"transparent",color:t.textSub,border:`1px solid ${t.border}`,borderRadius:7,padding:"6px 14px",fontSize:12,cursor:"pointer",fontFamily:"inherit"}}>Cancel</button>
              <button type="submit" disabled={saving||!form.name.trim()} style={{background:t.accent,color:"#fff",border:"none",borderRadius:7,padding:"6px 16px",fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"inherit",opacity:saving||!form.name.trim()?0.5:1}}>{saving?"Saving…":editing?"Save Changes":"Add Tool"}</button>
            </div>
          </form>
        </div>
      </div>
    )}
    <div style={{display:"flex",flexDirection:"column",gap:24}}>
      {isInternal&&<div style={{display:"flex",justifyContent:"flex-end"}}><button onClick={openNew} style={{background:t.accent,color:"#fff",border:"none",borderRadius:8,padding:"5px 14px",fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>+ Add Tool</button></div>}
      <ToolGroup list={existing} title="Existing Client Software"/>
      <ToolGroup list={newT} title="Tools Set Up by LexOps"/>
    </div>
  </>;
}

const MNT_TYPES=[["bug","Bug"],["maintenance","Maintenance"],["request","Request"]];
const MNT_PRIORITIES=[["high","High"],["medium","Medium"],["low","Low"]];
const MNT_STATUSES=[["open","Open"],["in-progress","In Progress"],["resolved","Resolved"]];
const EMPTY_MNT={title:"",type:"bug",priority:"medium",notes:""};
const EMPTY_EDIT_MNT={status:"open",notes:"",resolved:""};
function MaintenanceTab({projectId,initialMaintenance,isInternal,onRefresh,t,mobile}) {
  const [items,setItems]=useState(initialMaintenance||[]);
  const [filter,setFilter]=useState("all");
  const [showNew,setShowNew]=useState(false);
  const [newForm,setNewForm]=useState(EMPTY_MNT);
  const [saving,setSaving]=useState(false);
  const [editingId,setEditingId]=useState(null);
  const [editForm,setEditForm]=useState(EMPTY_EDIT_MNT);
  const [deletingId,setDeletingId]=useState(null);
  const typeIcon={bug:"🐛",maintenance:"🔧",request:"💬"};
  const typeLabel={bug:"Bug",maintenance:"Maintenance",request:"Request"};
  const statusLabel={resolved:"Resolved","in-progress":"In Progress",open:"Open"};

  const loadItems=useCallback(async()=>{
    const {data}=await supabase.from("maintenance").select("*").eq("project_id",projectId).order("id");
    if(data) setItems(data);
  },[projectId]);
  useEffect(()=>{loadItems();},[loadItems]);

  const counts={
    all:items.length,
    open:items.filter(m=>m.status==="open").length,
    "in-progress":items.filter(m=>m.status==="in-progress").length,
    resolved:items.filter(m=>m.status==="resolved").length
  };
  const filtered=filter==="all"?items:items.filter(m=>m.status===filter);

  const [formError,setFormError]=useState("");

  async function addItem(e){
    e.preventDefault();
    if(!newForm.title.trim()){setFormError("Title is required.");return;}
    setFormError("");
    setSaving(true);
    try{await dbWrite("maintenance","insert",{...newForm,notes:toNull(newForm.notes),project_id:projectId,status:"open",reported:new Date().toISOString().slice(0,10)});}catch(error){console.error("[MaintenanceTab] insert error:",error.message);setSaving(false);setFormError(error.message);return;}
    setSaving(false);
    setNewForm(EMPTY_MNT);setShowNew(false);loadItems();onRefresh?.();
  }

  function openEdit(item){
    setEditingId(item.id);
    setEditForm({status:item.status||"open",notes:item.notes||"",resolved:item.resolved||""});
    setFormError("");
  }
  async function saveEdit(id){
    setFormError("");
    setSaving(true);
    const payload={...editForm,resolved:toNull(editForm.resolved),notes:toNull(editForm.notes)};
    try{await dbWrite("maintenance","update",payload,{id});}catch(error){console.error("[MaintenanceTab] update error:",error.message);setSaving(false);setFormError(error.message);return;}
    setSaving(false);
    setEditingId(null);
    loadItems();
    onRefresh?.();
  }
  async function deleteItem(id){
    setDeletingId(id);
    try{await dbWrite("maintenance","delete",null,{id});}catch(error){console.error("[MaintenanceTab] delete error:",error.message);setFormError(error.message);setDeletingId(null);return;}
    setDeletingId(null);
    setItems(prev=>prev.filter(m=>m.id!==id));
    onRefresh?.();
  }

  const inp=(val,onChange,ph="")=><input value={val} onChange={onChange} placeholder={ph} style={{background:t.surfaceHigh,border:`1px solid ${t.border}`,borderRadius:6,padding:"6px 10px",fontSize:12,color:t.text,width:"100%",boxSizing:"border-box",outline:"none",fontFamily:"inherit"}}/>;
  const sel=(val,onChange,opts)=><select value={val} onChange={onChange} style={{background:t.surfaceHigh,border:`1px solid ${t.border}`,borderRadius:6,padding:"6px 10px",fontSize:12,color:t.text,width:"100%",boxSizing:"border-box",outline:"none",fontFamily:"inherit"}}>{opts.map(([v,l])=><option key={v} value={v}>{l}</option>)}</select>;
  const field=(label,input)=><div><div style={{color:t.textSub,fontSize:11,marginBottom:4,fontWeight:500}}>{label}</div>{input}</div>;

  return <>
    {showNew&&(
      <div style={{position:"fixed",inset:0,zIndex:400,background:"rgba(0,0,0,0.6)",display:"flex",alignItems:"center",justifyContent:"center",padding:24}}>
        <div style={{background:t.surface,border:`1px solid ${t.border}`,borderRadius:14,padding:"28px 28px",width:"100%",maxWidth:440,boxShadow:"0 8px 32px rgba(0,0,0,0.3)",overflowY:"auto",maxHeight:"90vh"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:22}}>
            <span style={{color:t.text,fontSize:15,fontWeight:500}}>New Request</span>
            <button onClick={()=>setShowNew(false)} style={{background:"none",border:"none",color:t.textSub,fontSize:18,cursor:"pointer",lineHeight:1}}>×</button>
          </div>
          <form onSubmit={addItem} style={{display:"flex",flexDirection:"column",gap:14}}>
            {formError&&<div style={{background:t.redSoft||"rgba(248,113,113,0.08)",border:`1px solid ${t.red}30`,borderRadius:8,padding:"8px 14px",color:t.red,fontSize:12}}>{formError}</div>}
            {field("Title",inp(newForm.title,e=>setNewForm(f=>({...f,title:e.target.value})),"Brief description"))}
            {field("Type",sel(newForm.type,e=>setNewForm(f=>({...f,type:e.target.value})),MNT_TYPES))}
            {field("Priority",sel(newForm.priority,e=>setNewForm(f=>({...f,priority:e.target.value})),MNT_PRIORITIES))}
            {field("Notes",<textarea value={newForm.notes} onChange={e=>setNewForm(f=>({...f,notes:e.target.value}))} placeholder="Additional context…" rows={3} style={{background:t.surfaceHigh,border:`1px solid ${t.border}`,borderRadius:6,padding:"6px 10px",fontSize:12,color:t.text,width:"100%",boxSizing:"border-box",outline:"none",fontFamily:"inherit",resize:"vertical"}}/>)}
            <div style={{display:"flex",gap:8,justifyContent:"flex-end",paddingTop:4}}>
              <button type="button" onClick={()=>{setShowNew(false);setFormError("");}} style={{background:"transparent",color:t.textSub,border:`1px solid ${t.border}`,borderRadius:7,padding:"6px 14px",fontSize:12,cursor:"pointer",fontFamily:"inherit"}}>Cancel</button>
              <button type="submit" disabled={saving||!newForm.title.trim()} style={{background:t.accent,color:"#fff",border:"none",borderRadius:7,padding:"6px 16px",fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"inherit",opacity:saving||!newForm.title.trim()?0.5:1}}>{saving?"Saving…":"Submit Request"}</button>
            </div>
          </form>
        </div>
      </div>
    )}
    <div style={{display:"flex",flexDirection:"column",gap:16}}>
      <div style={{display:"grid",gridTemplateColumns:mobile?"1fr 1fr":"repeat(3,1fr)",gap:12}}>
        {[{label:"Open",val:counts.open,color:t.amber},{label:"In Progress",val:counts["in-progress"],color:t.accentLight},{label:"Resolved",val:counts.resolved,color:t.green}].map((s,i)=>(
          <div key={i} style={{background:t.surface,border:`1px solid ${t.border}`,borderRadius:12,padding:"16px 20px",boxShadow:t.shadow}}>
            <div style={{color:t.textSub,fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.09em",marginBottom:8}}>{s.label}</div>
            <div style={{color:s.color,fontSize:22,fontWeight:300,letterSpacing:"-0.03em"}}>{s.val}</div>
          </div>
        ))}
      </div>
      <div style={{display:"flex",gap:6}}>
        {["all","open","in-progress","resolved"].map(f=>(
          <button key={f} onClick={()=>setFilter(f)} style={{background:filter===f?t.accent:"transparent",color:filter===f?"#fff":t.textSub,border:`1px solid ${filter===f?t.accent:t.border}`,borderRadius:8,padding:"5px 14px",fontSize:12,cursor:"pointer",fontWeight:500,transition:"all 0.15s",display:"flex",alignItems:"center",gap:6}}>
            {f==="all"?"All":f==="in-progress"?"In Progress":f.charAt(0).toUpperCase()+f.slice(1)}
            <span style={{background:filter===f?"rgba(255,255,255,0.2)":t.border,borderRadius:99,padding:"0 6px",fontSize:10,fontWeight:700}}>{counts[f]}</span>
          </button>
        ))}
      </div>
      <Card t={t} style={{overflowX:"auto"}}>
        {formError&&!showNew&&<div style={{background:t.redSoft||"rgba(248,113,113,0.08)",border:`1px solid ${t.red}30`,borderRadius:8,padding:"8px 14px",color:t.red,fontSize:12,margin:"8px 22px"}}>{formError}</div>}
        {filtered.length===0
          ?<div style={{color:t.textSub,textAlign:"center",padding:"40px 0",fontSize:13}}>No items to display</div>
          :filtered.map((item,i)=>(
            <div key={item.id}>
              {editingId===item.id?(
                <div style={{padding:"14px 22px",display:"flex",flexDirection:"column",gap:10}}>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10}}>
                    {field("Status",sel(editForm.status,e=>setEditForm(f=>({...f,status:e.target.value})),MNT_STATUSES))}
                    {field("Resolved Date",<input type="date" value={editForm.resolved} onChange={e=>setEditForm(f=>({...f,resolved:e.target.value}))} style={{background:t.surfaceHigh,border:`1px solid ${t.border}`,borderRadius:6,padding:"6px 10px",fontSize:12,color:t.text,width:"100%",boxSizing:"border-box",outline:"none",fontFamily:"inherit"}}/>)}
                    {field("Notes",inp(editForm.notes,e=>setEditForm(f=>({...f,notes:e.target.value})),"Update notes"))}
                  </div>
                  <div style={{display:"flex",gap:6,justifyContent:"flex-end"}}>
                    <button onClick={()=>setEditingId(null)} style={{background:"transparent",color:t.textSub,border:`1px solid ${t.border}`,borderRadius:6,padding:"4px 12px",fontSize:12,cursor:"pointer",fontFamily:"inherit"}}>Cancel</button>
                    <button onClick={()=>saveEdit(item.id)} disabled={saving} style={{background:t.accent,color:"#fff",border:"none",borderRadius:6,padding:"4px 14px",fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"inherit",opacity:saving?0.5:1}}>{saving?"Saving…":"Save"}</button>
                  </div>
                </div>
              ):(
                <div style={{padding:mobile?"14px 16px":"16px 22px"}}>
                  <div style={{display:"flex",flexDirection:mobile?"column":"row",alignItems:mobile?"stretch":"flex-start",justifyContent:"space-between",gap:mobile?10:16,marginBottom:8}}>
                    <div style={{display:"flex",alignItems:"flex-start",gap:12}}>
                      <span style={{fontSize:16,marginTop:1,flexShrink:0}}>{typeIcon[item.type]||"📋"}</span>
                      <div>
                        <div style={{color:t.text,fontSize:13,fontWeight:500,marginBottom:3}}>{item.title}</div>
                        <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                          <span style={{color:t.textSub,fontSize:11,background:t.surfaceHigh,borderRadius:6,padding:"1px 7px",border:`1px solid ${t.border}`}}>{typeLabel[item.type]||item.type}</span>
                          <Pill t={t} status={item.priority} label={item.priority.charAt(0).toUpperCase()+item.priority.slice(1)+" Priority"}/>
                        </div>
                      </div>
                    </div>
                    <div style={{display:"flex",alignItems:"center",gap:8,flexShrink:0,justifyContent:mobile?"space-between":"flex-end"}}>
                      <div style={{textAlign:mobile?"left":"right"}}>
                        <div style={{color:t.textSub,fontSize:11}}>Reported {item.reported}</div>
                        {item.resolved&&<div style={{color:t.textSub,fontSize:11}}>Resolved {item.resolved}</div>}
                      </div>
                      <Pill t={t} status={item.status} label={statusLabel[item.status]||item.status}/>
                      {isInternal&&<>
                        <button onClick={()=>openEdit(item)} title="Edit" style={{background:"transparent",border:`1px solid ${t.border}`,borderRadius:6,width:26,height:26,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",color:t.textSub,fontSize:13}}>✏</button>
                        <button onClick={()=>deleteItem(item.id)} disabled={deletingId===item.id} title="Delete" style={{background:"transparent",border:`1px solid ${t.border}`,borderRadius:6,width:26,height:26,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",color:t.red,fontSize:15,opacity:deletingId===item.id?0.4:1}}>×</button>
                      </>}
                    </div>
                  </div>
                  {item.notes&&<div style={{marginLeft:28,color:t.textSub,fontSize:12,lineHeight:1.5,background:t.surfaceHigh,borderRadius:8,padding:"8px 12px",border:`1px solid ${t.border}`}}>{item.notes}</div>}
                </div>
              )}
              {i<filtered.length-1&&<Line t={t}/>}
            </div>
          ))
        }
      </Card>
      <CardPad t={t} style={{border:`1px dashed ${t.border}`}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <div>
            <div style={{color:t.text,fontSize:13,fontWeight:500,marginBottom:3}}>Report an issue or request</div>
            <div style={{color:t.textSub,fontSize:12}}>Submit bugs, maintenance needs, or feature requests directly to your LexOps team.</div>
          </div>
          <button onClick={()=>setShowNew(true)} style={{background:t.accent,color:"#fff",border:"none",borderRadius:8,padding:"8px 18px",fontSize:12,fontWeight:600,cursor:"pointer",whiteSpace:"nowrap",flexShrink:0}}>+ New Request</button>
        </div>
      </CardPad>
    </div>
  </>;
}

function BookingTab({project,t}) {
  const CALENDLY_URL=project?.calendly_url||"https://calendly.com/lexops/project-catchup";
  const hasCustomUrl=!!project?.calendly_url;
  return <div style={{display:"flex",flexDirection:"column",gap:20}}>
    <CardPad t={t}>
      <div style={{display:"flex",alignItems:"flex-start",gap:20}}>
        <div style={{width:48,height:48,borderRadius:12,background:t.accentSoft,border:`1px solid ${t.accent}30`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,flexShrink:0}}>📅</div>
        <div style={{flex:1}}>
          <div style={{color:t.text,fontSize:16,fontWeight:500,marginBottom:6}}>Book a Project Catchup</div>
          <div style={{color:t.textSub,fontSize:13,lineHeight:1.7,marginBottom:16}}>
            Schedule time directly with your LexOps project manager to discuss progress, answer questions, or review upcoming milestones for <strong style={{color:t.text,fontWeight:500}}>{project?.name||project?.project}</strong>.
          </div>
          <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
            <a href={CALENDLY_URL} target="_blank" rel="noreferrer" style={{background:t.accent,color:"#fff",border:"none",borderRadius:8,padding:"9px 20px",fontSize:13,fontWeight:600,cursor:"pointer",textDecoration:"none",display:"inline-flex",alignItems:"center",gap:8}}>
              <span>Open Booking Page</span>
              <span style={{fontSize:11,opacity:0.8}}>↗</span>
            </a>
            <div style={{background:t.surfaceHigh,border:`1px solid ${t.border}`,borderRadius:8,padding:"9px 16px",fontSize:13,color:t.textSub,display:"flex",alignItems:"center"}}>
              30 min · Video call
            </div>
          </div>
          {!hasCustomUrl&&<div style={{marginTop:12,color:t.textSub,fontSize:11}}>Admin tip: set a Calendly URL on this project to use your team member's personal booking link.</div>}
        </div>
      </div>
    </CardPad>
    <Card t={t}>
      <div style={{padding:"18px 24px 14px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <SectionLabel t={t}>Inline Booking</SectionLabel>
        <span style={{color:t.textSub,fontSize:11}}>Powered by Calendly</span>
      </div>
      <Line t={t}/>
      <iframe
        src={`${CALENDLY_URL}?embed_type=inline&hide_event_type_details=1&hide_gdpr_banner=1&primary_color=${encodeURIComponent("1A6666")}`}
        width="100%"
        height="580"
        frameBorder="0"
        style={{display:"block",borderRadius:"0 0 12px 12px"}}
        title="Book a time with LexOps"
      />
    </Card>
    <CardPad t={t} style={{border:`1px dashed ${t.border}`}}>
      <SectionLabel t={t}>Prefer to reach out directly?</SectionLabel>
      <div style={{display:"flex",gap:20,flexWrap:"wrap"}}>
        {[{label:"Email",value:"hello@teamsquared.io",icon:"✉"},{label:"Your Manager",value:project?.manager,icon:"👤"}].map((c,i)=>(
          <div key={i} style={{display:"flex",alignItems:"center",gap:10}}>
            <span style={{fontSize:14}}>{c.icon}</span>
            <div>
              <div style={{color:t.textSub,fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.06em"}}>{c.label}</div>
              <div style={{color:t.accentLight,fontSize:13,fontWeight:500}}>{c.value||"—"}</div>
            </div>
          </div>
        ))}
      </div>
    </CardPad>
  </div>;
}

// ---------------------------------------------------------------------------
// Project Setup Drawer
// ---------------------------------------------------------------------------
function ProjectSetupDrawer({ project, onClose, onRefresh, t, mobile }) {
  const [section, setSection] = useState("details");

  // ── Core details form ──
  const [det, setDet] = useState({
    name: project.name || project.project || "",
    client_name: project.client_name || project.client || "",
    manager: project.manager || "",
    calendly_url: project.calendly_url || "",
    due_date: project.due_date || project.dueDate || "",
    status: project.status || "active",
    progress: String(project.progress ?? 0),
    budget: String(project.budget ?? 0),
    total_engagement_value: String(project.total_engagement_value ?? 0),
    summary: project.summary || "",
    client_summary: project.client_summary || "",
  });
  const [detSaving, setDetSaving] = useState(false);
  const [detOk, setDetOk] = useState(false);

  // ── Linked proposal (for pre-fill) ──
  const [proposal, setProposal] = useState(null);

  // ── Phases ──
  const [phases, setPhases] = useState(project.phases || []);
  const [showAddPhase, setShowAddPhase] = useState(false);
  const [newPhase, setNewPhase] = useState({ name: "", status: "pending", progress: "0", start_date: "", end_date: "" });
  const [phSaving, setPhSaving] = useState(false);
  const [importingPh, setImportingPh] = useState(false);

  // ── Tasks / Deliverables ──
  const [tasks, setTasks] = useState(project.tasks || []);
  const [showAddTask, setShowAddTask] = useState(false);
  const [newTask, setNewTask] = useState({ title: "", due_date: "", is_deliverable: true, is_internal: false, status: "todo" });

  // ── Documents ──
  const [docs, setDocs] = useState(project.documents || []);
  const [docUploading, setDocUploading] = useState(false);

  // ── Invoices ──
  const [invoices, setInvoices] = useState(project.invoices || []);
  const [showAddInv, setShowAddInv] = useState(false);
  const [newInv, setNewInv] = useState({ invoice_number: "", description: "", amount: "", phase_name: "", due_date: "" });
  const [invFile, setInvFile] = useState(null);
  const [invSaving, setInvSaving] = useState(false);

  // ── Tools ──
  const [tools, setTools] = useState([]);
  const [showAddTool, setShowAddTool] = useState(false);
  const [editingToolId, setEditingToolId] = useState(null);
  const [editToolForm, setEditToolForm] = useState({ name: "", purpose: "", url: "", logo_emoji: "🔧" });
  const [newTool, setNewTool] = useState({ name: "", purpose: "", url: "", logo_emoji: "🔧" });
  const [toolSaving, setToolSaving] = useState(false);
  const [toolError, setToolError] = useState("");

  // ── Load live data + linked proposal ──
  useEffect(() => { loadAll(); }, [project.id]);

  async function loadAll() {
    const [phRes, tkRes, docRes, invRes, prRes, tlRes] = await Promise.all([
      supabase.from("phases").select("*").eq("project_id", project.id).order("created_at", { ascending: true }),
      supabase.from("tasks").select("*").eq("project_id", project.id).order("id"),
      supabase.from("documents").select("*").eq("project_id", project.id).order("uploaded_at", { ascending: false }),
      supabase.from("invoices").select("*").eq("project_id", project.id).order("id"),
      supabase.from("proposals").select("id, name, description, client_summary").eq("project_id", project.id).limit(1),
      supabase.from("project_tools").select("*").eq("project_id", project.id).order("sort_order").then(r => r.error ? { data: [] } : r),
    ]);
    if (phRes.data) setPhases(phRes.data);
    if (tkRes.data) setTasks(tkRes.data);
    if (docRes.data) setDocs(docRes.data);
    if (invRes.data) setInvoices(invRes.data);
    if (tlRes?.data) {
      setTools(tlRes.data);
    }
    if (prRes.data?.[0]) {
      const pr = prRes.data[0];
      // Also fetch workflow stages for this proposal
      const { data: wfRows } = await supabase.from("workflows").select("id").eq("proposal_id", pr.id).limit(1);
      let stages = [];
      if (wfRows?.[0]) {
        const { data: stRows } = await supabase.from("workflow_stages").select("*").eq("workflow_id", wfRows[0].id).order("order_index", { ascending: true });
        stages = stRows || [];
      }
      setProposal({ ...pr, stages });
    }
  }

  // ── Save core details ──
  async function saveDetails(e) {
    e.preventDefault();
    setDetSaving(true);
    try {
      await dbWrite("projects","update",{
        name: det.name,
        client_name: det.client_name,
        manager: det.manager || null,
        calendly_url: det.calendly_url || null,
        due_date: det.due_date || null,
        status: det.status,
        progress: Number(det.progress) || 0,
        budget: Number(det.budget) || 0,
        total_engagement_value: Number(det.total_engagement_value) || 0,
        summary: det.summary || null,
        client_summary: det.client_summary || null,
      },{id: project.id});
      setDetOk(true);
      setTimeout(() => setDetOk(false), 2500);
      onRefresh?.();
    } catch(err) {
      console.error("[ProjectSetupDrawer] saveDetails error:", err.message);
    }
    setDetSaving(false);
  }

  // ── Import phases from proposal workflow stages ──
  async function importPhases() {
    if (!proposal?.stages?.length) return;
    setImportingPh(true);
    for (const st of proposal.stages) {
      await dbWrite("phases","insert",{
        project_id: project.id,
        name: st.title || st.name || `Stage ${st.order_index + 1}`,
        status: "pending",
        progress: 0,
        sort_order: st.order_index ?? 0,
      });
    }
    await loadAll();
    setImportingPh(false);
    onRefresh?.();
  }

  // ── Add phase ──
  async function addPhase(e) {
    e.preventDefault();
    if (!newPhase.name.trim()) return;
    setPhSaving(true);
    try {
      await dbWrite("phases","insert",{
        project_id: project.id,
        name: newPhase.name.trim(),
        status: newPhase.status,
        progress: Number(newPhase.progress) || 0,
        start_date: newPhase.start_date || null,
        end_date: newPhase.end_date || null,
      });
      setNewPhase({ name: "", status: "pending", progress: "0", start_date: "", end_date: "" });
      setShowAddPhase(false);
      await loadAll();
      onRefresh?.();
    } catch(err) {
      console.error("[ProjectSetupDrawer] addPhase error:", err.message);
    }
    setPhSaving(false);
  }

  async function deletePhase(id) {
    await dbWrite("phases","delete",null,{id});
    setPhases(ps => ps.filter(p => p.id !== id));
    onRefresh?.();
  }

  // ── Add task ──
  async function addTask(e) {
    e.preventDefault();
    if (!newTask.title.trim()) return;
    try {
      await adminFetch("/tasks", { method: "POST", body: {
        project_id: project.id,
        title: newTask.title.trim(),
        due_date: newTask.due_date || null,
        is_deliverable: newTask.is_deliverable,
        is_internal: newTask.is_internal,
        status: "todo",
      }});
      setNewTask({ title: "", due_date: "", is_deliverable: true, is_internal: false, status: "todo" });
      setShowAddTask(false);
      await loadAll();
      onRefresh?.();
    } catch(err) { console.error("[ProjectTab] addTask failed:", err.message); }
  }

  async function deleteTask(id) {
    try {
      await adminFetch(`/tasks/${id}`, { method: "DELETE" });
      setTasks(ts => ts.filter(t => t.id !== id));
      onRefresh?.();
    } catch(err) { console.error("[ProjectTab] deleteTask failed:", err.message); }
  }

  // ── Upload document ──
  async function uploadDoc(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    setDocUploading(true);
    const storagePath = `${project.id}/${Date.now()}_${file.name}`;
    const { error: upErr } = await supabase.storage.from("project-documents").upload(storagePath, file, { upsert: true });
    if (!upErr) {
      const { data: { publicUrl } } = supabase.storage.from("project-documents").getPublicUrl(storagePath);
      await dbWrite("documents","insert",{
        project_id: project.id, name: file.name,
        file_type: file.name.split(".").pop().toUpperCase(),
        file_size: file.size, file_url: publicUrl,
        storage_path: storagePath, uploaded_at: new Date().toISOString(),
      });
      await loadAll();
      onRefresh?.();
    }
    setDocUploading(false);
  }

  // ── Add invoice ──
  async function addInvoice(e) {
    e.preventDefault();
    if (!newInv.invoice_number.trim()) return;
    setInvSaving(true);
    try {
      let token;
      try { const { data:{ session } } = await supabase.auth.getSession(); token = session?.access_token; } catch { token = null; }

      const formData = new FormData();
      formData.append("project_id", project.id);
      formData.append("invoice_number", newInv.invoice_number.trim());
      formData.append("amount", String(Number(newInv.amount) || 0));
      if (newInv.description)  formData.append("description", newInv.description);
      if (newInv.phase_name)   formData.append("phase_name", newInv.phase_name);
      if (newInv.due_date)     formData.append("due_date", newInv.due_date);
      formData.append("status", "upcoming");
      if (invFile) formData.append("file", invFile);

      const resp = await fetch("/api/admin/upload-invoice", {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });
      if (!resp.ok) { const err = await resp.json().catch(() => ({})); throw new Error(err.message || `HTTP ${resp.status}`); }

      setNewInv({ invoice_number: "", description: "", amount: "", phase_name: "", due_date: "" });
      setInvFile(null);
      setInvSaving(false);
      loadAll().catch(() => {});
      onRefresh?.();
    } catch(err) {
      console.error("[ProjectSetupDrawer] addInvoice error:", err.message);
      setInvSaving(false);
    }
  }

  async function deleteInvoice(id) {
    let token;
    try { const { data:{ session } } = await supabase.auth.getSession(); token = session?.access_token; } catch { token = null; }
    try {
      const resp = await fetch(`/api/admin/invoices/${id}`, {
        method: "DELETE",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!resp.ok) { const e = await resp.json().catch(()=>({})); throw new Error(e.message || `HTTP ${resp.status}`); }
    } catch(err) { console.error("[ProjectSetupDrawer] deleteInvoice error:", err.message); return; }
    setInvoices(ivs => ivs.filter(i => i.id !== id));
    onRefresh?.();
  }

  // ── Reusable style helpers ──
  const inp = (val, onChange, placeholder, type = "text", extra = {}) => (
    <input type={type} value={val} onChange={onChange} placeholder={placeholder}
      style={{ background: "#fff", border: `1px solid ${t.border}`, borderRadius: 7, padding: "8px 12px", fontSize: 13, color: t.text, outline: "none", fontFamily: "inherit", width: "100%", boxSizing: "border-box", ...extra }} />
  );
  const fld = (label, child, required = false) => (
    <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
      <div style={{ color: t.textSub, fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em" }}>{label}{required && <span style={{ color: t.accent }}> *</span>}</div>
      {child}
    </div>
  );

  async function addTool(e) {
    e.preventDefault();
    if (!newTool.name.trim()) return;
    setToolSaving(true);
    setToolError("");
    try {
      await dbWrite("project_tools","insert",{
        project_id: project.id,
        name: newTool.name.trim(),
        purpose: newTool.purpose.trim() || null,
        url: newTool.url.trim() || null,
        logo_emoji: newTool.logo_emoji || "🔧",
        sort_order: tools.length,
      });
      setNewTool({ name: "", purpose: "", url: "", logo_emoji: "🔧" });
      setShowAddTool(false);
      await loadAll();
    } catch(err) {
      console.error("[ProjectSetupDrawer] addTool failed:", err.message);
      setToolError(err.message || "Could not save tool");
    }
    setToolSaving(false);
  }

  async function updateTool(e) {
    e.preventDefault();
    if (!editToolForm.name.trim()) return;
    setToolSaving(true);
    setToolError("");
    try {
      await dbWrite("project_tools", "update", {
        name: editToolForm.name.trim(),
        purpose: editToolForm.purpose.trim() || null,
        url: editToolForm.url.trim() || null,
        logo_emoji: editToolForm.logo_emoji || "🔧"
      }, { id: editingToolId });
      setEditingToolId(null);
      await loadAll();
    } catch(err) {
      console.error("[ProjectSetupDrawer] updateTool failed:", err.message);
      setToolError(err.message || "Could not save tool");
    }
    setToolSaving(false);
  }

  async function deleteTool(id) {
    try {
      await dbWrite("project_tools","delete",null,{id});
      setTools(ts => ts.filter(t => t.id !== id));
    } catch(err) {
      console.error("[ProjectSetupDrawer] deleteTool failed:", err.message);
    }
  }

  const SECTIONS = [
    { key: "details",    label: "Project Details" },
    { key: "milestones", label: "Milestones" },
    { key: "actions",    label: "Actions" },
    { key: "documents",  label: "Documents" },
    { key: "invoices",   label: "Invoices" },
    { key: "tools",      label: "Tools" },
  ];

  const deliverables = tasks.filter(tk => tk.is_deliverable);
  const actions      = tasks.filter(tk => !tk.is_deliverable);

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 350, display: "flex", alignItems: "stretch" }}>
      {/* Backdrop */}
      <div onClick={onClose} style={{ flex: 1, background: "rgba(8,43,43,0.45)", backdropFilter: "blur(2px)" }} />

      {/* Drawer panel */}
      <div style={{ width: mobile ? "100%" : 840, maxWidth: "100%", background: t.bg, display: "flex", flexDirection: "column", boxShadow: "-8px 0 48px rgba(0,0,0,0.22)", overflowY: "hidden" }}>

        {/* Header */}
        <div style={{ padding: "18px 26px", borderBottom: `1px solid ${t.border}`, background: t.surface, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 600, color: t.text, fontFamily: "'Playfair Display', Georgia, serif", letterSpacing: "-0.01em" }}>Project Setup</div>
            <div style={{ fontSize: 12, color: t.textSub, marginTop: 2 }}>{det.client_name || project.client} · {det.name || project.project}</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {proposal && (
              <div style={{ fontSize: 11, color: t.accentLight, background: t.accentSoft || "#E5EDED", border: `1px solid ${t.accent}30`, borderRadius: 6, padding: "3px 10px", fontWeight: 600 }}>
                Linked: {proposal.name}
              </div>
            )}
            <button onClick={onClose} style={{ background: "transparent", border: "none", color: t.textSub, fontSize: 22, cursor: "pointer", lineHeight: 1, padding: "2px 6px" }}>×</button>
          </div>
        </div>

        {/* Section tabs */}
        <div style={{ display: "flex", borderBottom: `1px solid ${t.border}`, background: t.surface, flexShrink: 0, overflowX: "auto" }}>
          {SECTIONS.map(s => (
            <button key={s.key} onClick={() => setSection(s.key)} style={{
              background: "transparent", border: "none",
              borderBottom: section === s.key ? `2px solid ${t.accent}` : "2px solid transparent",
              color: section === s.key ? t.text : t.textSub,
              padding: "11px 20px", fontSize: 13, fontWeight: section === s.key ? 600 : 400,
              cursor: "pointer", whiteSpace: "nowrap", fontFamily: "inherit", transition: "color 0.12s",
            }}>{s.label}</button>
          ))}
        </div>

        {/* Scrollable content */}
        <div style={{ flex: 1, overflowY: "auto", padding: 28 }}>

          {/* ═══ PROJECT DETAILS ═══ */}
          {section === "details" && (
            <form onSubmit={saveDetails} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <div style={{ display: "grid", gridTemplateColumns: mobile ? "1fr" : "1fr 1fr", gap: 16 }}>
                {fld("Project Name", inp(det.name, e => setDet(d => ({ ...d, name: e.target.value })), "e.g. Estates Automation"), true)}
                {fld("Client Name", inp(det.client_name, e => setDet(d => ({ ...d, client_name: e.target.value })), "e.g. Acme Corp"), true)}
                {fld("Project Manager", inp(det.manager, e => setDet(d => ({ ...d, manager: e.target.value })), "e.g. Jane Smith"))}
                {fld("Calendly Booking URL", inp(det.calendly_url, e => setDet(d => ({ ...d, calendly_url: e.target.value })), "https://calendly.com/..."))}
                {fld("Due Date", inp(det.due_date, e => setDet(d => ({ ...d, due_date: e.target.value })), "", "date"))}
                {fld("Status",
                  <select value={det.status} onChange={e => setDet(d => ({ ...d, status: e.target.value }))}
                    style={{ background: "#fff", border: `1px solid ${t.border}`, borderRadius: 7, padding: "8px 12px", fontSize: 13, color: t.text, fontFamily: "inherit", cursor: "pointer", width: "100%" }}>
                    {[["active","Active"],["on-hold","On Hold"],["paused","Paused"],["complete","Complete"]].map(([v,l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                )}
                {fld("Progress (%)", inp(det.progress, e => setDet(d => ({ ...d, progress: e.target.value })), "0", "number"))}
                {fld("Budget ($)", inp(det.budget, e => setDet(d => ({ ...d, budget: e.target.value })), "0", "number"))}
                {fld("Total Engagement Value ($)", inp(det.total_engagement_value, e => setDet(d => ({ ...d, total_engagement_value: e.target.value })), "0", "number"))}
              </div>

              {fld("Internal Summary",
                <textarea value={det.summary} onChange={e => setDet(d => ({ ...d, summary: e.target.value }))}
                  placeholder="Brief internal description of this project…" rows={3}
                  style={{ background: "#fff", border: `1px solid ${t.border}`, borderRadius: 7, padding: "8px 12px", fontSize: 13, color: t.text, outline: "none", fontFamily: "inherit", resize: "vertical", boxSizing: "border-box", width: "100%" }} />
              )}

              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                  <div style={{ color: t.textSub, fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", flex: 1 }}>Client-Facing Overview</div>
                  {proposal?.description && (
                    <button type="button" onClick={() => setDet(d => ({ ...d, client_summary: proposal.description }))}
                      style={{ background: "transparent", border: `1px solid ${t.border}`, borderRadius: 6, padding: "3px 12px", fontSize: 11, color: t.accentLight, cursor: "pointer", fontFamily: "inherit", fontWeight: 600 }}>
                      ↓ Pull from proposal
                    </button>
                  )}
                  {proposal?.client_summary && !proposal?.description && (
                    <button type="button" onClick={() => setDet(d => ({ ...d, client_summary: proposal.client_summary }))}
                      style={{ background: "transparent", border: `1px solid ${t.border}`, borderRadius: 6, padding: "3px 12px", fontSize: 11, color: t.accentLight, cursor: "pointer", fontFamily: "inherit", fontWeight: 600 }}>
                      ↓ Pull from proposal
                    </button>
                  )}
                </div>
                <textarea value={det.client_summary} onChange={e => setDet(d => ({ ...d, client_summary: e.target.value }))}
                  placeholder="What the client sees on their Overview page. Describe the project scope, objectives, and what success looks like…"
                  rows={6}
                  style={{ background: "#fff", border: `1px solid ${t.border}`, borderRadius: 7, padding: "10px 14px", fontSize: 13, color: t.text, outline: "none", fontFamily: "inherit", resize: "vertical", boxSizing: "border-box", width: "100%", lineHeight: 1.7 }} />
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 12, paddingTop: 4 }}>
                <button type="submit" disabled={detSaving}
                  style={{ background: t.accent, color: "#fff", border: "none", borderRadius: 8, padding: "10px 28px", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", opacity: detSaving ? 0.65 : 1 }}>
                  {detSaving ? "Saving…" : "Save Details"}
                </button>
                {detOk && <span style={{ color: t.green, fontSize: 12, fontWeight: 600 }}>✓ Saved successfully</span>}
              </div>
            </form>
          )}

          {/* ═══ MILESTONES ═══ */}
          {section === "milestones" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <div style={{ flex: 1, color: t.textSub, fontSize: 12 }}>
                  {phases.length} milestone{phases.length !== 1 ? "s" : ""}
                </div>
                {proposal?.stages?.length > 0 && (
                  <button onClick={importPhases} disabled={importingPh}
                    style={{ background: "transparent", border: `1px solid ${t.border}`, borderRadius: 7, padding: "6px 14px", fontSize: 12, color: t.accentLight, cursor: importingPh ? "not-allowed" : "pointer", fontFamily: "inherit", fontWeight: 600, opacity: importingPh ? 0.6 : 1 }}>
                    {importingPh ? "Importing…" : `↓ Import ${proposal.stages.length} stages from proposal`}
                  </button>
                )}
                <button onClick={() => setShowAddPhase(s => !s)}
                  style={{ background: t.accent, color: "#fff", border: "none", borderRadius: 7, padding: "6px 18px", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
                  + Add Milestone
                </button>
              </div>

              {showAddPhase && (
                <form onSubmit={addPhase} style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: 10, padding: "18px 20px", display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-end" }}>
                  <div style={{ flex: "2 1 180px" }}>
                    <div style={{ color: t.textSub, fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 5 }}>Name *</div>
                    <input autoFocus value={newPhase.name} onChange={e => setNewPhase(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Discovery & Scoping" required
                      style={{ background: "#fff", border: `1px solid ${t.border}`, borderRadius: 7, padding: "8px 12px", fontSize: 13, color: t.text, outline: "none", fontFamily: "inherit", width: "100%", boxSizing: "border-box" }} />
                  </div>
                  <div style={{ flex: "0 1 130px" }}>
                    <div style={{ color: t.textSub, fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 5 }}>Status</div>
                    <select value={newPhase.status} onChange={e => setNewPhase(f => ({ ...f, status: e.target.value }))}
                      style={{ background: "#fff", border: `1px solid ${t.border}`, borderRadius: 7, padding: "8px 10px", fontSize: 12, color: t.text, fontFamily: "inherit", cursor: "pointer", width: "100%" }}>
                      {[["pending","Pending"],["active","Active"],["complete","Complete"]].map(([v,l]) => <option key={v} value={v}>{l}</option>)}
                    </select>
                  </div>
                  <div style={{ flex: "0 1 110px" }}>
                    <div style={{ color: t.textSub, fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 5 }}>Progress %</div>
                    <input type="number" min="0" max="100" value={newPhase.progress} onChange={e => setNewPhase(f => ({ ...f, progress: e.target.value }))}
                      style={{ background: "#fff", border: `1px solid ${t.border}`, borderRadius: 7, padding: "8px 10px", fontSize: 12, color: t.text, outline: "none", fontFamily: "inherit", width: "100%", boxSizing: "border-box" }} />
                  </div>
                  <div style={{ flex: "0 1 140px" }}>
                    <div style={{ color: t.textSub, fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 5 }}>Start Date</div>
                    <input type="date" value={newPhase.start_date} onChange={e => setNewPhase(f => ({ ...f, start_date: e.target.value }))}
                      style={{ background: "#fff", border: `1px solid ${t.border}`, borderRadius: 7, padding: "8px 10px", fontSize: 12, color: t.text, outline: "none", fontFamily: "inherit", width: "100%", boxSizing: "border-box" }} />
                  </div>
                  <div style={{ flex: "0 1 140px" }}>
                    <div style={{ color: t.textSub, fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 5 }}>End Date</div>
                    <input type="date" value={newPhase.end_date} onChange={e => setNewPhase(f => ({ ...f, end_date: e.target.value }))}
                      style={{ background: "#fff", border: `1px solid ${t.border}`, borderRadius: 7, padding: "8px 10px", fontSize: 12, color: t.text, outline: "none", fontFamily: "inherit", width: "100%", boxSizing: "border-box" }} />
                  </div>
                  <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                    <button type="submit" disabled={phSaving || !newPhase.name.trim()}
                      style={{ background: t.accent, color: "#fff", border: "none", borderRadius: 7, padding: "8px 18px", fontSize: 12, fontWeight: 600, cursor: "pointer", opacity: !newPhase.name.trim() ? 0.5 : 1 }}>
                      {phSaving ? "…" : "Add"}
                    </button>
                    <button type="button" onClick={() => setShowAddPhase(false)}
                      style={{ background: "transparent", border: `1px solid ${t.border}`, borderRadius: 7, padding: "8px 12px", fontSize: 12, color: t.textSub, cursor: "pointer" }}>
                      Cancel
                    </button>
                  </div>
                </form>
              )}

              {phases.length === 0
                ? (
                  <div style={{ textAlign: "center", padding: "40px 24px", color: t.textSub, fontSize: 13 }}>
                    <div style={{ fontSize: 28, marginBottom: 10, opacity: 0.4 }}>◆</div>
                    No milestones yet.{proposal?.stages?.length > 0 ? " Use the import button above to pull stages from the linked proposal, or add them manually." : " Add milestones above to define the project phases."}
                  </div>
                )
                : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {phases.map((ph, i) => (
                      <div key={ph.id} style={{ background: "#fff", border: `1px solid ${t.border}`, borderRadius: 10, padding: "14px 18px", display: "flex", alignItems: "center", gap: 14 }}>
                        <div style={{ width: 10, height: 10, borderRadius: "50%", flexShrink: 0, background: ph.status === "complete" ? t.green : ph.status === "active" ? t.accent : t.border }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ color: t.text, fontSize: 13, fontWeight: 500, marginBottom: 4 }}>{ph.name}</div>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <div style={{ flex: 1, height: 3, background: t.border, borderRadius: 99, overflow: "hidden", maxWidth: 160 }}>
                              <div style={{ height: "100%", width: `${ph.progress || 0}%`, background: ph.status === "complete" ? t.green : t.accent, borderRadius: 99 }} />
                            </div>
                            <span style={{ color: t.textSub, fontSize: 11 }}>{ph.progress || 0}%</span>
                            {ph.start_date && <span style={{ color: t.textSub, fontSize: 11 }}>{ph.start_date.slice(5).replace("-","/")} → {ph.end_date ? ph.end_date.slice(5).replace("-","/") : "—"}</span>}
                          </div>
                        </div>
                        <Pill t={t} status={ph.status === "complete" ? "complete" : ph.status === "active" ? "active" : "pending"} label={ph.status === "complete" ? "Done" : ph.status === "active" ? "Active" : "Pending"} />
                        <button onClick={() => deletePhase(ph.id)}
                          style={{ background: "transparent", border: "none", color: t.textSub, cursor: "pointer", fontSize: 16, padding: "2px 4px", opacity: 0.45, lineHeight: 1, flexShrink: 0 }}>×</button>
                      </div>
                    ))}
                  </div>
                )
              }
            </div>
          )}

          {/* ═══ ACTIONS ═══ */}
          {section === "actions" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <div style={{ flex: 1, color: t.textSub, fontSize: 12 }}>{tasks.length} item{tasks.length !== 1 ? "s" : ""} — {deliverables.length} deliverable{deliverables.length !== 1 ? "s" : ""}, {actions.length} action{actions.length !== 1 ? "s" : ""}</div>
                <button onClick={() => setShowAddTask(s => !s)}
                  style={{ background: t.accent, color: "#fff", border: "none", borderRadius: 7, padding: "6px 18px", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
                  + Add Action
                </button>
              </div>

              {showAddTask && (
                <form onSubmit={addTask} style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: 10, padding: "18px 20px", display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-end" }}>
                  <div style={{ flex: "2 1 200px" }}>
                    <div style={{ color: t.textSub, fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 5 }}>Title *</div>
                    <input autoFocus value={newTask.title} onChange={e => setNewTask(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Review scope document" required
                      style={{ background: "#fff", border: `1px solid ${t.border}`, borderRadius: 7, padding: "8px 12px", fontSize: 13, color: t.text, outline: "none", fontFamily: "inherit", width: "100%", boxSizing: "border-box" }} />
                  </div>
                  <div style={{ flex: "0 1 150px" }}>
                    <div style={{ color: t.textSub, fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 5 }}>Due Date</div>
                    <input type="date" value={newTask.due_date} onChange={e => setNewTask(f => ({ ...f, due_date: e.target.value }))}
                      style={{ background: "#fff", border: `1px solid ${t.border}`, borderRadius: 7, padding: "8px 10px", fontSize: 12, color: t.text, outline: "none", fontFamily: "inherit", width: "100%", boxSizing: "border-box" }} />
                  </div>
                  <div style={{ flex: "0 1 160px" }}>
                    <div style={{ color: t.textSub, fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 5 }}>Type</div>
                    <select value={String(newTask.is_deliverable)} onChange={e => setNewTask(f => ({ ...f, is_deliverable: e.target.value === "true" }))}
                      style={{ background: "#fff", border: `1px solid ${t.border}`, borderRadius: 7, padding: "8px 10px", fontSize: 12, color: t.text, fontFamily: "inherit", cursor: "pointer", width: "100%" }}>
                      <option value="false">Action / Task</option>
                      <option value="true">Deliverable</option>
                    </select>
                  </div>
                  <div style={{ flex: "0 1 150px" }}>
                    <div style={{ color: t.textSub, fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 5 }}>Visibility</div>
                    <select value={String(newTask.is_internal)} onChange={e => setNewTask(f => ({ ...f, is_internal: e.target.value === "true" }))}
                      style={{ background: "#fff", border: `1px solid ${t.border}`, borderRadius: 7, padding: "8px 10px", fontSize: 12, color: t.text, fontFamily: "inherit", cursor: "pointer", width: "100%" }}>
                      <option value="false">Client visible</option>
                      <option value="true">Internal only</option>
                    </select>
                  </div>
                  <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                    <button type="submit" disabled={!newTask.title.trim()}
                      style={{ background: t.accent, color: "#fff", border: "none", borderRadius: 7, padding: "8px 18px", fontSize: 12, fontWeight: 600, cursor: "pointer", opacity: !newTask.title.trim() ? 0.5 : 1 }}>
                      Add
                    </button>
                    <button type="button" onClick={() => setShowAddTask(false)}
                      style={{ background: "transparent", border: `1px solid ${t.border}`, borderRadius: 7, padding: "8px 12px", fontSize: 12, color: t.textSub, cursor: "pointer" }}>
                      Cancel
                    </button>
                  </div>
                </form>
              )}

              {tasks.length === 0
                ? (
                  <div style={{ textAlign: "center", padding: "40px 24px", color: t.textSub, fontSize: 13 }}>
                    <div style={{ fontSize: 28, marginBottom: 10, opacity: 0.4 }}>✅</div>
                    No actions yet. Add tasks and deliverables to define the project work.
                  </div>
                )
                : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {tasks.map(tk => (
                      <div key={tk.id} style={{ background: "#fff", border: `1px solid ${t.border}`, borderRadius: 9, padding: "12px 16px", display: "flex", alignItems: "center", gap: 12 }}>
                        <span style={{ fontSize: 15, flexShrink: 0 }}>{tk.is_deliverable ? "📦" : "✅"}</span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ color: t.text, fontSize: 13, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{tk.title}</div>
                          <div style={{ color: t.textSub, fontSize: 11, marginTop: 1 }}>
                            {tk.is_deliverable ? "Deliverable" : "Action"} · {tk.is_internal ? "Internal" : "Client visible"} · {tk.status}
                            {tk.due_date ? ` · Due ${tk.due_date}` : ""}
                          </div>
                        </div>
                        <button onClick={() => deleteTask(tk.id)}
                          style={{ background: "transparent", border: "none", color: t.textSub, cursor: "pointer", fontSize: 16, padding: "2px 4px", opacity: 0.4, lineHeight: 1, flexShrink: 0 }}>×</button>
                      </div>
                    ))}
                  </div>
                )
              }
            </div>
          )}

          {/* ═══ DOCUMENTS ═══ */}
          {section === "documents" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ background: t.surface, border: `1.5px dashed ${t.border}`, borderRadius: 12, padding: "28px 24px", textAlign: "center" }}>
                <div style={{ fontSize: 28, marginBottom: 10, opacity: 0.45 }}>↑</div>
                <div style={{ color: t.text, fontSize: 14, fontWeight: 500, marginBottom: 4 }}>Upload Project Documents</div>
                <div style={{ color: t.textSub, fontSize: 12, marginBottom: 18 }}>PDFs, Word docs, spreadsheets — any format</div>
                <input type="file" id="setup-doc-inp" style={{ display: "none" }} onChange={uploadDoc} />
                <label htmlFor="setup-doc-inp" style={{ background: t.accent, color: "#fff", borderRadius: 8, padding: "10px 26px", fontSize: 13, fontWeight: 600, cursor: docUploading ? "not-allowed" : "pointer", opacity: docUploading ? 0.65 : 1, display: "inline-block" }}>
                  {docUploading ? "Uploading…" : "Choose File"}
                </label>
              </div>

              {docs.length === 0
                ? <div style={{ textAlign: "center", padding: "16px 0", color: t.textSub, fontSize: 13 }}>No documents uploaded yet.</div>
                : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {docs.map(doc => (
                      <div key={doc.id} style={{ background: "#fff", border: `1px solid ${t.border}`, borderRadius: 9, padding: "12px 16px", display: "flex", alignItems: "center", gap: 12 }}>
                        <div style={{ width: 32, height: 32, borderRadius: 6, background: t.surface, border: `1px solid ${t.border}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 800, color: t.accentLight, letterSpacing: "0.03em", flexShrink: 0 }}>
                          {(doc.file_type || doc.name?.split(".").pop() || "FILE").toUpperCase().slice(0, 4)}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ color: t.text, fontSize: 13, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{doc.name}</div>
                          <div style={{ color: t.textSub, fontSize: 11, marginTop: 1 }}>{fmtBytes(doc.file_size)} · {fmtDate(doc.uploaded_at)}</div>
                        </div>
                        <a href={doc.file_url} target="_blank" rel="noreferrer"
                          style={{ color: t.accentLight, fontSize: 12, textDecoration: "none", border: `1px solid ${t.border}`, borderRadius: 6, padding: "4px 12px", flexShrink: 0 }}>
                          Download
                        </a>
                      </div>
                    ))}
                  </div>
                )
              }
            </div>
          )}

          {/* ═══ INVOICES ═══ */}
          {section === "invoices" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <button onClick={() => setShowAddInv(s => !s)}
                  style={{ background: t.accent, color: "#fff", border: "none", borderRadius: 7, padding: "6px 18px", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
                  + Add Invoice
                </button>
              </div>

              {showAddInv && (
                <form onSubmit={addInvoice} style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: 10, padding: "18px 20px", display: "flex", flexDirection: "column", gap: 12 }}>
                  <div style={{ display: "grid", gridTemplateColumns: mobile ? "1fr" : "1fr 1fr 1fr", gap: 12 }}>
                    <div>
                      <div style={{ color: t.textSub, fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 5 }}>Invoice # *</div>
                      <input autoFocus value={newInv.invoice_number} onChange={e => setNewInv(f => ({ ...f, invoice_number: e.target.value }))} placeholder="INV-001" required
                        style={{ background: "#fff", border: `1px solid ${t.border}`, borderRadius: 7, padding: "8px 12px", fontSize: 13, color: t.text, outline: "none", fontFamily: "inherit", width: "100%", boxSizing: "border-box" }} />
                    </div>
                    <div>
                      <div style={{ color: t.textSub, fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 5 }}>Amount ($)</div>
                      <input type="number" min="0" step="0.01" value={newInv.amount} onChange={e => setNewInv(f => ({ ...f, amount: e.target.value }))} placeholder="0.00"
                        style={{ background: "#fff", border: `1px solid ${t.border}`, borderRadius: 7, padding: "8px 12px", fontSize: 13, color: t.text, outline: "none", fontFamily: "inherit", width: "100%", boxSizing: "border-box" }} />
                    </div>
                    <div>
                      <div style={{ color: t.textSub, fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 5 }}>Due Date</div>
                      <input type="date" value={newInv.due_date} onChange={e => setNewInv(f => ({ ...f, due_date: e.target.value }))}
                        style={{ background: "#fff", border: `1px solid ${t.border}`, borderRadius: 7, padding: "8px 10px", fontSize: 12, color: t.text, outline: "none", fontFamily: "inherit", width: "100%", boxSizing: "border-box" }} />
                    </div>
                    <div>
                      <div style={{ color: t.textSub, fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 5 }}>Description</div>
                      <input value={newInv.description} onChange={e => setNewInv(f => ({ ...f, description: e.target.value }))} placeholder="e.g. Phase 1 — Discovery"
                        style={{ background: "#fff", border: `1px solid ${t.border}`, borderRadius: 7, padding: "8px 12px", fontSize: 13, color: t.text, outline: "none", fontFamily: "inherit", width: "100%", boxSizing: "border-box" }} />
                    </div>
                    <div>
                      <div style={{ color: t.textSub, fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 5 }}>Milestone</div>
                      <select value={newInv.phase_name} onChange={e => setNewInv(f => ({ ...f, phase_name: e.target.value }))}
                        style={{ background: "#fff", border: `1px solid ${t.border}`, borderRadius: 7, padding: "8px 10px", fontSize: 12, color: t.text, fontFamily: "inherit", cursor: "pointer", width: "100%", boxSizing: "border-box" }}>
                        <option value="">— None —</option>
                        {phases.map(ph => <option key={ph.id} value={ph.name}>{ph.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <div style={{ color: t.textSub, fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 5 }}>PDF (optional)</div>
                      <input type="file" accept=".pdf" onChange={e => setInvFile(e.target.files?.[0] || null)}
                        style={{ fontSize: 12, color: t.textSub, fontFamily: "inherit" }} />
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                    <button type="button" onClick={() => setShowAddInv(false)}
                      style={{ background: "transparent", border: `1px solid ${t.border}`, borderRadius: 7, padding: "8px 16px", fontSize: 12, color: t.textSub, cursor: "pointer" }}>
                      Cancel
                    </button>
                    <button type="submit" disabled={invSaving || !newInv.invoice_number.trim()}
                      style={{ background: t.accent, color: "#fff", border: "none", borderRadius: 7, padding: "8px 20px", fontSize: 12, fontWeight: 600, cursor: "pointer", opacity: !newInv.invoice_number.trim() ? 0.5 : 1 }}>
                      {invSaving ? "Saving…" : "Add Invoice"}
                    </button>
                  </div>
                </form>
              )}

              {invoices.length === 0
                ? <div style={{ textAlign: "center", padding: "24px 0", color: t.textSub, fontSize: 13 }}>No invoices yet. Add the first invoice above.</div>
                : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {invoices.map(inv => (
                      <div key={inv.id} style={{ background: "#fff", border: `1px solid ${t.border}`, borderRadius: 9, padding: "13px 16px", display: "flex", alignItems: "center", gap: 12 }}>
                        <div style={{ width: 36, height: 36, borderRadius: 8, background: t.surface, border: `1px solid ${t.border}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                          <span style={{ fontSize: 14 }}>$</span>
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ color: t.text, fontSize: 13, fontWeight: 600 }}>{inv.invoice_number}</div>
                          <div style={{ color: t.textSub, fontSize: 11, marginTop: 1 }}>
                            {inv.amount ? `$${Number(inv.amount).toLocaleString()}` : "—"}
                            {inv.description ? ` · ${inv.description}` : ""}
                            {inv.due_date ? ` · Due ${inv.due_date}` : ""}
                          </div>
                        </div>
                        <Pill t={t} status={inv.status === "paid" ? "paid" : "upcoming"} label={inv.status === "paid" ? "Paid" : inv.status === "pending" ? "Pending" : "Upcoming"} />
                        {inv.file_url && (
                          <a href={inv.file_url} target="_blank" rel="noreferrer"
                            style={{ color: t.accentLight, fontSize: 11, textDecoration: "none", border: `1px solid ${t.border}`, borderRadius: 6, padding: "3px 10px", flexShrink: 0 }}>
                            PDF
                          </a>
                        )}
                        <button onClick={() => deleteInvoice(inv.id)}
                          style={{ background: "transparent", border: "none", color: t.textSub, cursor: "pointer", fontSize: 16, padding: "2px 4px", opacity: 0.4, lineHeight: 1, flexShrink: 0 }}>×</button>
                      </div>
                    ))}
                  </div>
                )
              }
            </div>
          )}

          {/* ═══ TOOLS ═══ */}
          {section === "tools" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ color: t.textSub, fontSize: 12, lineHeight: 1.6 }}>
                Tools listed here appear in the client's <strong style={{ color: t.text }}>Resources</strong> tab. Add links to platforms, portals, or software your team has set up for this project.
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <button onClick={() => setShowAddTool(s => !s)}
                  style={{ background: t.accent, color: "#fff", border: "none", borderRadius: 7, padding: "6px 18px", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
                  + Add Tool
                </button>
              </div>

              {showAddTool && (
                <form onSubmit={addTool} style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: 10, padding: "18px 20px", display: "flex", flexDirection: "column", gap: 12 }}>
                  <div style={{ display: "grid", gridTemplateColumns: mobile ? "1fr" : "1fr 1fr", gap: 12 }}>
                    <div>
                      <div style={{ color: t.textSub, fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 5 }}>Tool Name *</div>
                      <input autoFocus value={newTool.name} onChange={e => setNewTool(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Client Portal, Notion, Jira" required
                        style={{ background: "#fff", border: `1px solid ${t.border}`, borderRadius: 7, padding: "8px 12px", fontSize: 13, color: t.text, outline: "none", fontFamily: "inherit", width: "100%", boxSizing: "border-box" }} />
                    </div>
                    <div>
                      <div style={{ color: t.textSub, fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 5 }}>Logo Emoji</div>
                      <input value={newTool.logo_emoji} onChange={e => setNewTool(f => ({ ...f, logo_emoji: e.target.value }))} placeholder="🔧"
                        style={{ background: "#fff", border: `1px solid ${t.border}`, borderRadius: 7, padding: "8px 12px", fontSize: 18, color: t.text, outline: "none", fontFamily: "inherit", width: "100%", boxSizing: "border-box" }} />
                    </div>
                    <div style={{ gridColumn: "1 / -1" }}>
                      <div style={{ color: t.textSub, fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 5 }}>Purpose / Description</div>
                      <input value={newTool.purpose} onChange={e => setNewTool(f => ({ ...f, purpose: e.target.value }))} placeholder="e.g. Your project management workspace"
                        style={{ background: "#fff", border: `1px solid ${t.border}`, borderRadius: 7, padding: "8px 12px", fontSize: 13, color: t.text, outline: "none", fontFamily: "inherit", width: "100%", boxSizing: "border-box" }} />
                    </div>
                    <div style={{ gridColumn: "1 / -1" }}>
                      <div style={{ color: t.textSub, fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 5 }}>Launch URL</div>
                      <input value={newTool.url} onChange={e => setNewTool(f => ({ ...f, url: e.target.value }))} placeholder="https://…"
                        style={{ background: "#fff", border: `1px solid ${t.border}`, borderRadius: 7, padding: "8px 12px", fontSize: 13, color: t.text, outline: "none", fontFamily: "inherit", width: "100%", boxSizing: "border-box" }} />
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                    <button type="button" onClick={() => setShowAddTool(false)}
                      style={{ background: "transparent", border: `1px solid ${t.border}`, borderRadius: 7, padding: "8px 16px", fontSize: 12, color: t.textSub, cursor: "pointer" }}>Cancel</button>
                    <button type="submit" disabled={toolSaving || !newTool.name.trim()}
                      style={{ background: t.accent, color: "#fff", border: "none", borderRadius: 7, padding: "8px 20px", fontSize: 12, fontWeight: 600, cursor: "pointer", opacity: !newTool.name.trim() ? 0.5 : 1 }}>
                      {toolSaving ? "Saving…" : "Add Tool"}
                    </button>
                  </div>
                  {toolError&&<div style={{padding:"6px 10px",background:"rgba(192,57,43,0.08)",border:"1px solid rgba(192,57,43,0.2)",borderRadius:6,fontSize:11,color:"#c0392b"}}>{toolError}</div>}
                </form>
              )}
              {toolError&&!showAddTool&&!editingToolId&&<div style={{marginBottom:8,padding:"6px 10px",background:"rgba(192,57,43,0.08)",border:"1px solid rgba(192,57,43,0.2)",borderRadius:6,fontSize:11,color:"#c0392b"}}>{toolError}</div>}

              {tools.length === 0 && !showAddTool && (
                <div style={{ textAlign: "center", padding: "32px 24px", background: t.surface, borderRadius: 10, border: `1px solid ${t.border}` }}>
                  <div style={{ fontSize: 24, marginBottom: 8 }}>🔧</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: t.text, marginBottom: 4 }}>No tools yet</div>
                  <div style={{ fontSize: 12, color: t.textSub }}>Add tools your team has set up for this client — they'll see them in Resources.</div>
                </div>
              )}

              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {tools.map(tool => (
                  <div key={tool.id} style={{ background: "#fff", border: `1px solid ${t.border}`, borderRadius: 9, padding: "14px 16px", display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ width: 40, height: 40, borderRadius: 8, background: t.surface, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>
                      {tool.logo_emoji || "🔧"}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ color: t.text, fontSize: 13, fontWeight: 600 }}>{tool.name}</div>
                      {tool.purpose && <div style={{ color: t.textSub, fontSize: 11, marginTop: 1 }}>{tool.purpose}</div>}
                      {tool.url && <div style={{ color: t.accentLight, fontSize: 11, marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{tool.url}</div>}
                    </div>
                    {tool.url && (
                      <a href={tool.url} target="_blank" rel="noreferrer"
                        style={{ color: t.accentLight, fontSize: 11, textDecoration: "none", border: `1px solid ${t.border}`, borderRadius: 6, padding: "4px 10px", flexShrink: 0 }}>
                        ↗ Open
                      </a>
                    )}
                    <button onClick={() => deleteTool(tool.id)}
                      style={{ background: "transparent", border: "none", color: t.textSub, cursor: "pointer", fontSize: 16, padding: "2px 4px", opacity: 0.4, lineHeight: 1, flexShrink: 0 }}>×</button>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Welcome Screen (first login only for clients)
// ---------------------------------------------------------------------------
function WelcomeScreen({ userProfile, project, t, onDismiss }) {
  const firstName = (userProfile?.full_name || "").split(" ")[0] || "there";
  return (
    <div style={{
      position:"fixed",inset:0,zIndex:500,background:t.bg,
      display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",
      fontFamily:"'Inter', sans-serif",color:t.text,padding:24,
    }}>
      <div style={{width:"100%",maxWidth:520,display:"flex",flexDirection:"column",alignItems:"center",gap:36}}>
        <LogoDark h={28}/>
        <div style={{textAlign:"center"}}>
          <h1 style={{fontSize:36,fontWeight:600,letterSpacing:"-0.01em",margin:"0 0 16px",color:t.text,fontFamily:"'Playfair Display', Georgia, serif"}}>
            Welcome, {firstName}.
          </h1>
          {project?.client_summary ? (
            <p style={{color:t.textSub,fontSize:15,lineHeight:1.8,margin:"0 0 16px",maxWidth:480}}>
              {project.client_summary}
            </p>
          ) : null}
          <p style={{color:t.textSub,fontSize:14,lineHeight:1.8,margin:0,maxWidth:480}}>
            Your project is now live on LexOps. Use this portal to track progress, access documents, and stay connected with your team.
          </p>
        </div>

        <button onClick={onDismiss} style={{
          background:t.accent,color:"#fff",border:"none",borderRadius:10,
          padding:"14px 36px",fontSize:15,fontWeight:600,cursor:"pointer",
          fontFamily:"inherit",transition:"background 0.15s",letterSpacing:"0.01em",
        }}>
          View your project →
        </button>

        <div style={{color:t.textDim,fontSize:11}}>© 2026 LexOps · A Teams Squared Company</div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Client Overview — Status Banner
// ---------------------------------------------------------------------------
function ClientStatusBanner({ project, phases, t }) {
  const activePhase = phases.find(p => p.status === "active") || phases.find(p => p.status !== "complete") || phases[phases.length - 1];
  const allTasks = project.tasks || [];

  // Actions completed in current milestone
  const milestoneTasks = activePhase ? allTasks.filter(tk => tk.phase_id === activePhase.id) : [];
  const milestoneDone = milestoneTasks.filter(tk => tk.status === "done").length;
  const milestoneTotal = milestoneTasks.length;

  // Next upcoming action timing
  const todayMs = new Date(); todayMs.setHours(0,0,0,0);
  const pendingWithDate = allTasks
    .filter(tk => tk.status !== "done" && tk.due_date)
    .sort((a, b) => new Date(a.due_date) - new Date(b.due_date));
  const nextAction = pendingWithDate[0] || null;
  const nextDaysDiff = nextAction ? Math.ceil((new Date(nextAction.due_date) - todayMs) / 86400000) : null;
  const nextActionLabel = nextDaysDiff === null ? "—"
    : nextDaysDiff < 0 ? `${Math.abs(nextDaysDiff)}d overdue`
    : nextDaysDiff === 0 ? "Due today"
    : `${nextDaysDiff}d left`;
  const nextActionUrgent = nextDaysDiff !== null && nextDaysDiff < 0;

  const pendingActions = allTasks.filter(tk => !tk.is_internal && tk.status !== "done" && tk.assignee).length;

  return (
    <div style={{
      background: `linear-gradient(135deg, ${t.accent} 0%, ${t.accentLight} 100%)`,
      borderRadius: 14, padding: "22px 28px", display: "flex", alignItems: "center",
      justifyContent: "space-between", gap: 20, boxShadow: "0 4px 24px rgba(26,102,102,0.22)",
      position: "relative", overflow: "hidden", flexWrap: "wrap", rowGap: 16,
    }}>
      <div style={{ position: "absolute", right: -40, top: -40, width: 180, height: 180, borderRadius: "50%", background: "rgba(255,255,255,0.05)", pointerEvents: "none" }} />
      <div style={{ position: "relative", flex: 1, minWidth: 200 }}>
        <div style={{ fontSize: 10, color: "rgba(255,255,255,0.6)", fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 5 }}>Currently Active</div>
        <div style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 19, color: "#fff", fontWeight: 600, marginBottom: 6, lineHeight: 1.2 }}>
          {activePhase ? activePhase.name : project.phase || "In Progress"}
        </div>
        <div style={{ fontSize: 13, color: "rgba(255,255,255,0.8)", lineHeight: 1.5 }}>
          {pendingActions > 0
            ? <><strong style={{ color: "#fff" }}>{pendingActions} action{pendingActions !== 1 ? "s" : ""} need your input</strong> to keep this engagement on track.</>
            : <><strong style={{ color: "#fff" }}>All caught up!</strong> LexOps is progressing the next deliverable.</>}
        </div>
      </div>
      <div style={{ display: "flex", gap: 20, alignItems: "center", position: "relative", flexShrink: 0, flexWrap: "wrap" }}>
        {[
          { val: `${project.progress ?? 0}%`, label: "Overall Progress" },
          {
            val: milestoneTotal > 0 ? `${milestoneDone}/${milestoneTotal}` : "—",
            label: "Milestone Actions",
          },
          {
            val: nextActionLabel,
            label: nextAction ? "Next Action" : "Next Action",
            urgent: nextActionUrgent,
          },
        ].map((s, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 20 }}>
            {i > 0 && <div style={{ width: 1, background: "rgba(255,255,255,0.2)", alignSelf: "stretch" }} />}
            <div style={{ textAlign: "center" }}>
              <div style={{
                fontFamily: "'Playfair Display', Georgia, serif", fontSize: 26, fontWeight: 700, lineHeight: 1,
                color: s.urgent ? "#ffcdd2" : "#fff",
              }}>{s.val}</div>
              <div style={{ fontSize: 10, color: "rgba(255,255,255,0.6)", marginTop: 5, whiteSpace: "nowrap" }}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Client Overview — Horizontal Phase Timeline
// ---------------------------------------------------------------------------
function ClientPhaseTimeline({ phases, t, mobile, onPhaseClick }) {
  const [popup, setPopup] = useState(null);
  return (
    <div>
      <style>{`
        @keyframes clientRingPulse {
          0%,100% { box-shadow: 0 0 0 4px ${t.accent}22; }
          50%      { box-shadow: 0 0 0 10px ${t.accent}0a; }
        }
      `}</style>
      <div style={{ fontSize: 11, fontWeight: 600, color: t.textSub, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 12 }}>Engagement Phases — hover for detail</div>
      <div style={{
        background: "#fff", border: `1px solid ${t.border}`, borderRadius: 12,
        padding: mobile ? "20px 16px" : "24px 28px", boxShadow: t.shadow,
        display: "flex", alignItems: "flex-start", overflowX: "auto",
        scrollbarWidth: "none",
      }}>
        {phases.map((ph, i) => {
          const isDone = ph.status === "complete";
          const isActive = ph.status === "active";
          const isFuture = !isDone && !isActive;
          return (
            <div key={ph.id || i} style={{ display: "flex", alignItems: "flex-start", flex: 1 }}>
              <div
                style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: 1, minWidth: mobile ? 72 : 84, cursor: "pointer", position: "relative" }}
                onMouseEnter={() => setPopup(i)} onMouseLeave={() => setPopup(null)}
                onClick={() => onPhaseClick && onPhaseClick(ph, i)}>
                <div style={{
                  width: 40, height: 40, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 13, fontWeight: 700, marginBottom: 10, transition: "box-shadow 0.3s",
                  ...(isDone ? { background: t.accent, color: "#fff", boxShadow: `0 0 0 8px ${t.accent}18` } : {}),
                  ...(isActive ? { background: "#fff", color: t.accent, border: `2px solid ${t.accent}`, animation: "clientRingPulse 2.2s infinite" } : {}),
                  ...(isFuture ? { background: t.surface, color: t.border, border: `2px solid ${t.border}` } : {}),
                }}>
                  {isDone ? "✓" : <span style={{ fontSize: 12 }}>{i + 1}</span>}
                </div>
                <div style={{ fontSize: 11, fontWeight: 600, textAlign: "center", marginBottom: 3, color: isDone ? t.accentLight : isActive ? t.accent : t.border }}>
                  {ph.name}
                </div>
                <div style={{ fontSize: 11, color: isActive ? t.accent : t.textSub, fontWeight: isActive ? 600 : 400 }}>
                  {isDone ? "100%" : isActive ? `${ph.progress || 0}%` : "—"}
                </div>
                {popup === i && (
                  <div style={{
                    position: "absolute", bottom: "calc(100% + 12px)", left: "50%", transform: "translateX(-50%)",
                    background: t.text, color: "#fff", borderRadius: 10, padding: "13px 15px", width: 195, zIndex: 50,
                    boxShadow: "0 8px 28px rgba(0,0,0,0.22)", pointerEvents: "none", lineHeight: 1.5,
                  }}>
                    <div style={{ fontWeight: 700, fontSize: 12, marginBottom: 5 }}>Milestone {i + 1} — {ph.name}</div>
                    <div style={{ fontSize: 11, color: "rgba(255,255,255,0.72)" }}>
                      {isDone ? "Completed. No further actions required for this phase."
                        : isActive ? `In progress — ${ph.progress || 0}% complete.`
                          : "Upcoming — unlocks when the previous phase is complete."}
                    </div>
                    {!isFuture && (
                      <div style={{ fontSize: 11, color: t.accent, marginTop: 7, fontWeight: 600 }}>
                        View actions →
                      </div>
                    )}
                    <div style={{ position: "absolute", top: "100%", left: "50%", transform: "translateX(-50%)", width: 0, height: 0, borderLeft: "7px solid transparent", borderRight: "7px solid transparent", borderTop: `7px solid ${t.text}` }} />
                  </div>
                )}
              </div>
              {i < phases.length - 1 && (
                <div style={{
                  flex: 1, height: 2, alignSelf: "flex-start", marginTop: 19, minWidth: 12,
                  background: isDone ? t.accent : isActive ? `linear-gradient(90deg, ${t.accent}, ${t.accentLight}50)` : t.surface,
                  transition: "background 0.5s",
                }} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Client Overview — Proposal Workflow Snake
// ---------------------------------------------------------------------------
function WorkflowSnake({ workflow, t, mobile }) {
  const { stages, workflow: wf } = workflow;
  const [openStage, setOpenStage] = useState(null);
  const NODES_PER_ROW = mobile ? 2 : 3;

  const rows = [];
  for (let i = 0; i < stages.length; i += NODES_PER_ROW) rows.push(stages.slice(i, i + NODES_PER_ROW));

  function extractEmoji(name = "") {
    const m = name.match(/^([\u{1F300}-\u{1FFFF}\u{2600}-\u{27BF}\u{FE00}-\u{FEFF}]+)/u);
    return m ? m[1].trim() : "";
  }
  function stripEmoji(name = "") {
    return name.replace(/^[\u{1F300}-\u{1FFFF}\u{2600}-\u{27BF}\u{FE00}-\u{FEFF}]+\s*/u, "").trim();
  }

  function nodeStatus(idx) {
    const halfway = Math.floor(stages.length / 2);
    if (idx < halfway) return "done";
    if (idx === halfway) return "active";
    return "future";
  }

  const dotColors = {
    done: { bg: `${t.accent}1a`, border: `${t.accent}70` },
    active: { bg: t.accent, border: t.accent, shadow: `0 0 0 5px ${t.accent}22` },
    future: { bg: t.surface, border: t.border },
  };

  const connColor = (rowIdx, nodeIdx, status) =>
    status === "done" ? `${t.accent}70` : status === "active" ? `${t.accent}40` : t.surface;

  return (
    <>
      <div style={{ background: "#fff", border: `1px solid ${t.border}`, borderRadius: 12, padding: "20px 22px", boxShadow: t.shadow }}>
        <div style={{ marginBottom: 18 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: t.textSub, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 4 }}>Reimagined Workflow</div>
          <div style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 16, fontWeight: 600, color: t.text, marginBottom: 4 }}>{wf?.title || "Proposed Workflow"}</div>
          <div style={{ fontSize: 12, color: t.textSub, lineHeight: 1.6 }}>Click any stage to see details, inputs, and outputs.</div>
        </div>

        {rows.map((row, rowIdx) => {
          const isRtl = rowIdx % 2 === 1;
          return (
            <div key={rowIdx}>
              {rowIdx > 0 && (
                <div style={{ display: "flex", height: 30, position: "relative", justifyContent: isRtl ? "flex-start" : "flex-end" }}>
                  <div style={{ position: "absolute", [isRtl ? "left" : "right"]: 16, top: 0, bottom: 0, width: 2, background: t.border }} />
                </div>
              )}
              <div style={{ display: "flex", alignItems: "flex-start", flexDirection: isRtl ? "row-reverse" : "row" }}>
                {row.map((stage, nodeIdx) => {
                  const globalIdx = rowIdx * NODES_PER_ROW + nodeIdx;
                  const status = nodeStatus(globalIdx);
                  const dc = dotColors[status];
                  const emoji = extractEmoji(stage.title || stage.name || "");
                  const label = stripEmoji(stage.title || stage.name || "");
                  return (
                    <div key={stage.id || `${rowIdx}-${nodeIdx}`} style={{ display: "flex", alignItems: "flex-start", flex: 1 }}>
                      <div
                        onClick={() => setOpenStage(stage)}
                        style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", padding: "0 4px", cursor: "pointer" }}>
                        <div style={{
                          width: 38, height: 38, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: 16, marginBottom: 7, border: `2px solid ${dc.border}`,
                          background: dc.bg, boxShadow: dc.shadow || "none",
                          transition: "transform 0.2s", position: "relative",
                        }}>
                          <span>{emoji || "●"}</span>
                          {status === "active" && (
                            <div style={{ position: "absolute", bottom: -4, right: -4, width: 14, height: 14, borderRadius: "50%", background: t.amber, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 7, color: "#fff", border: "1.5px solid #fff" }}>▶</div>
                          )}
                        </div>
                        <div style={{ fontSize: 10, fontWeight: 700, color: status === "active" ? t.accent : status === "done" ? t.accentLight : t.textSub, textAlign: "center", maxWidth: 82, lineHeight: 1.35, marginBottom: 2 }}>{label}</div>
                        {stage.subtitle && <div style={{ fontSize: 9, color: t.textSub, textAlign: "center", maxWidth: 82, lineHeight: 1.3 }}>{stage.subtitle}</div>}
                      </div>
                      {nodeIdx < row.length - 1 && (
                        <div style={{ height: 2, flex: "0 0 12px", background: connColor(rowIdx, nodeIdx, status), marginTop: 18 }} />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {openStage && (
        <>
          <div onClick={() => setOpenStage(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.28)", zIndex: 900 }} />
          <div style={{
            position: "fixed", right: 0, top: 0, bottom: 0, width: mobile ? "100vw" : 420,
            background: "#fff", zIndex: 901, display: "flex", flexDirection: "column", overflowY: "auto",
            boxShadow: "-4px 0 40px rgba(0,0,0,0.14)",
          }}>
            <div style={{ padding: "22px 24px 16px", borderBottom: `1px solid ${t.border}`, display: "flex", alignItems: "flex-start", justifyContent: "space-between", position: "sticky", top: 0, background: "#fff", zIndex: 1 }}>
              <div style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 18, fontWeight: 700, color: t.text, flex: 1, lineHeight: 1.3, paddingRight: 12 }}>
                {openStage.title || openStage.name}
              </div>
              <button onClick={() => setOpenStage(null)} style={{ width: 28, height: 28, borderRadius: "50%", border: "none", background: t.surface, color: t.text, cursor: "pointer", fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>✕</button>
            </div>
            <div style={{ padding: "18px 24px", flex: 1 }}>
              {openStage.description && (
                <p style={{ color: t.textSub, fontSize: 13, lineHeight: 1.75, margin: "0 0 20px" }}>{openStage.description}</p>
              )}
              {(openStage.inputs?.length > 0 || openStage.outputs?.length > 0) && (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 18 }}>
                  {openStage.inputs?.length > 0 && (
                    <div style={{ background: t.amberSoft, border: `1px solid ${t.amber}30`, borderRadius: 10, padding: "12px 14px" }}>
                      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: t.amber, marginBottom: 7 }}>Inputs</div>
                      {openStage.inputs.map((inp, i) => (
                        <div key={i} style={{ fontSize: 12, color: t.text, lineHeight: 1.55, marginBottom: 3 }}>· {typeof inp === "string" ? inp : inp.label || inp.name || JSON.stringify(inp)}</div>
                      ))}
                    </div>
                  )}
                  {openStage.outputs?.length > 0 && (
                    <div style={{ background: t.greenSoft, border: `1px solid ${t.green}30`, borderRadius: 10, padding: "12px 14px" }}>
                      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: t.green, marginBottom: 7 }}>Outputs</div>
                      {openStage.outputs.map((out, i) => (
                        <div key={i} style={{ fontSize: 12, color: t.text, lineHeight: 1.55, marginBottom: 3 }}>· {typeof out === "string" ? out : out.label || out.name || JSON.stringify(out)}</div>
                      ))}
                    </div>
                  )}
                </div>
              )}
              {openStage.case_example && (
                <div style={{ background: `${t.accent}08`, border: `1px solid ${t.accent}20`, borderRadius: 10, padding: 14 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: t.accentLight, marginBottom: 6 }}>In Your Case</div>
                  <div style={{ fontSize: 12, color: t.text, lineHeight: 1.65 }}>{openStage.case_example}</div>
                </div>
              )}
              {openStage.stats && (
                <div style={{ marginTop: 16, display: "flex", gap: 10, flexWrap: "wrap" }}>
                  {Object.entries(openStage.stats).map(([k, v]) => (
                    <div key={k} style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: 8, padding: "8px 12px" }}>
                      <div style={{ fontSize: 15, fontWeight: 700, color: t.accent }}>{v}</div>
                      <div style={{ fontSize: 10, color: t.textSub, marginTop: 2 }}>{k}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// Client Overview — Inline Documents Grid
// ---------------------------------------------------------------------------
function ClientDocsInline({ projectId, initialDocuments, t, mobile }) {
  const [docs, setDocs] = useState(initialDocuments || []);
  useEffect(() => {
    supabase.from("documents").select("*").eq("project_id", projectId)
      .order("uploaded_at", { ascending: false }).limit(6)
      .then(({ data }) => { if (data) setDocs(data); });
  }, [projectId]);

  if (docs.length === 0) return null;

  const extColor = { PDF: "#ef4444", DOCX: "#3b82f6", XLSX: "#16a34a", PNG: "#8b5cf6", JPG: "#8b5cf6", CSV: "#f59e0b" };
  const extIcon  = { PDF: "📄", DOCX: "📝", XLSX: "📊", PNG: "🖼️", JPG: "🖼️", CSV: "📊" };

  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 600, color: t.textSub, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 12 }}>Your Documents</div>
      <div style={{ display: "grid", gridTemplateColumns: mobile ? "1fr" : "1fr 1fr", gap: 8 }}>
        {docs.slice(0, 6).map(doc => {
          const ext = (doc.file_type || "").toUpperCase();
          return (
            <a key={doc.id} href={doc.file_url ? `${doc.file_url}${doc.file_url.includes("?")?"&":"?"}download=${encodeURIComponent(doc.name||"file")}` : "#"} target="_blank" rel="noreferrer" style={{ textDecoration: "none" }}>
              <div style={{ background: "#fff", border: `1px solid ${t.border}`, borderRadius: 10, padding: "12px 14px", display: "flex", alignItems: "center", gap: 10, transition: "border-color 0.15s, box-shadow 0.15s", boxShadow: t.shadow }}>
                <div style={{ width: 34, height: 34, borderRadius: 8, background: `${extColor[ext] || t.accent}18`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, flexShrink: 0 }}>
                  {extIcon[ext] || "📁"}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: t.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{doc.name}</div>
                  <div style={{ fontSize: 10, color: t.textSub, marginTop: 2 }}>
                    {ext}{doc.uploaded_at ? ` · ${new Date(doc.uploaded_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}` : ""}
                  </div>
                </div>
                <span style={{ fontSize: 11, fontWeight: 600, color: t.accent, flexShrink: 0 }}>↓ Download</span>
              </div>
            </a>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Client Overview — Deliverables Grid
// ---------------------------------------------------------------------------
function ClientDeliverablesGrid({ deliverables, t, mobile }) {
  if (deliverables.length === 0) return null;
  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 600, color: t.textSub, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 12 }}>Pending Deliverables</div>
      <div style={{ display: "grid", gridTemplateColumns: mobile ? "1fr" : "1fr 1fr", gap: 8 }}>
        {deliverables.map(d => {
          const isDone = d.status === "done";
          const isActive = d.status === "in-progress";
          return (
            <div key={d.id} style={{
              background: "#fff", border: `1px solid ${isDone ? t.green + "50" : t.border}`,
              borderRadius: 10, padding: "12px 14px", display: "flex", alignItems: "flex-start", gap: 10, boxShadow: t.shadow,
            }}>
              <span style={{ fontSize: 15, flexShrink: 0, marginTop: 1 }}>{isDone ? "✅" : isActive ? "🔄" : "⏳"}</span>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: isDone ? t.textSub : t.text, textDecoration: isDone ? "line-through" : "none", marginBottom: 2 }}>{d.title}</div>
                <div style={{ fontSize: 11, color: isDone ? t.green : isActive ? t.accent : t.textSub }}>{isDone ? "Complete" : isActive ? "In progress" : "Upcoming"}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Client Overview Tab — orchestrates everything
// ---------------------------------------------------------------------------
function ClientOverviewTab({ project, t, mobile }) {
  const [proposalWorkflow, setProposalWorkflow] = useState(null);

  useEffect(() => {
    async function loadWorkflow() {
      const { data: props } = await supabase
        .from("proposals").select("id, title")
        .eq("project_id", project.id).limit(1);
      if (!props?.length) return;

      const { data: wfs } = await supabase
        .from("workflows").select("id, title, description")
        .eq("proposal_id", props[0].id).limit(1);
      if (!wfs?.length) return;

      const { data: stages } = await supabase
        .from("workflow_stages").select("*")
        .eq("workflow_id", wfs[0].id)
        .order("order_index", { ascending: true });

      setProposalWorkflow({ proposal: props[0], workflow: wfs[0], stages: stages || [] });
    }
    loadWorkflow();
  }, [project.id]);

  const phases = project.phases || [];
  const deliverables = (project.tasks || []).filter(tk => tk.is_deliverable && tk.status !== "done");
  const clientTasks = (project.tasks || []).filter(tk => !tk.is_internal && tk.owner === "client");
  const todayMidC = new Date(); todayMidC.setHours(0,0,0,0);
  const in7C = new Date(todayMidC.getTime() + 7*86400000);
  const overdueClient = clientTasks.filter(tk => tk.status !== "done" && tk.due_date && new Date(tk.due_date) < todayMidC);
  const dueSoonClient = clientTasks.filter(tk => tk.status !== "done" && tk.due_date && new Date(tk.due_date) >= todayMidC && new Date(tk.due_date) <= in7C);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <ClientStatusBanner project={project} phases={phases} t={t} />

      {phases.length > 0 && (
        <ClientPhaseTimeline phases={phases} t={t} mobile={mobile} />
      )}

      {(overdueClient.length > 0 || dueSoonClient.length > 0) && (
        <div style={{ background: "#fff", border: `1px solid ${t.border}`, borderRadius: 12, overflow: "hidden", boxShadow: t.shadow }}>
          <div style={{ padding: "14px 20px", borderBottom: `1px solid ${t.border}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: t.text, fontFamily: "'Playfair Display',Georgia,serif", letterSpacing: "-0.01em" }}>Actions Needing Attention</div>
            <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 10px", borderRadius: 99, background: overdueClient.length > 0 ? "#fdf0ee" : "#fef6e8", color: overdueClient.length > 0 ? "#c0392b" : "#d4881a" }}>
              {overdueClient.length + dueSoonClient.length} flagged
            </span>
          </div>
          {overdueClient.length > 0 && (
            <div style={{ padding: "10px 20px 6px" }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: "#c0392b", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 8 }}>⚠️ Overdue</div>
              {overdueClient.map((tk, i) => {
                const phaseName = phases.find(p => p.id === tk.phase_id)?.name;
                const daysLate = Math.floor((todayMidC - new Date(tk.due_date)) / 86400000);
                return (
                  <div key={tk.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderTop: i > 0 ? "1px solid #fdf0ee" : "none" }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 500, color: t.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{tk.title}</div>
                      {phaseName && <div style={{ fontSize: 11, color: t.textSub, marginTop: 1 }}>{phaseName}</div>}
                    </div>
                    {tk.owner === "client" && <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 99, background: "#e8f0fe", color: "#2b5fcc", flexShrink: 0 }}>Client</span>}
                    {tk.owner === "lexops" && <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 99, background: "#e8f5ef", color: "#1A6666", flexShrink: 0 }}>LexOps</span>}
                    <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 9px", borderRadius: 99, background: "#fdf0ee", color: "#c0392b", flexShrink: 0 }}>
                      {daysLate === 0 ? "Due today" : `${daysLate}d overdue`}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
          {dueSoonClient.length > 0 && (
            <div style={{ padding: overdueClient.length > 0 ? "4px 20px 12px" : "10px 20px 12px" }}>
              {overdueClient.length > 0 && <div style={{ height: 1, background: "#f0f4f3", marginBottom: 10 }} />}
              <div style={{ fontSize: 10, fontWeight: 700, color: "#d4881a", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 8 }}>⏳ Due Within 7 Days</div>
              {dueSoonClient.map((tk, i) => {
                const phaseName = phases.find(p => p.id === tk.phase_id)?.name;
                const daysLeft = Math.ceil((new Date(tk.due_date) - todayMidC) / 86400000);
                return (
                  <div key={tk.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderTop: i > 0 ? "1px solid #fef6e8" : "none" }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 500, color: t.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{tk.title}</div>
                      {phaseName && <div style={{ fontSize: 11, color: t.textSub, marginTop: 1 }}>{phaseName}</div>}
                    </div>
                    {tk.owner === "client" && <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 99, background: "#e8f0fe", color: "#2b5fcc", flexShrink: 0 }}>Client</span>}
                    {tk.owner === "lexops" && <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 99, background: "#e8f5ef", color: "#1A6666", flexShrink: 0 }}>LexOps</span>}
                    <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 9px", borderRadius: 99, background: "#fef6e8", color: "#d4881a", flexShrink: 0 }}>
                      {daysLeft === 0 ? "Due today" : `Due in ${daysLeft}d`}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {proposalWorkflow && proposalWorkflow.stages.length > 0 && (
        <WorkflowSnake workflow={proposalWorkflow} t={t} mobile={mobile} />
      )}

      {project.client_summary && (
        <div style={{ background: "#fff", border: `1px solid ${t.border}`, borderRadius: 12, padding: "18px 22px", boxShadow: t.shadow }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: t.textSub, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 8 }}>About Your Engagement</div>
          <p style={{ color: t.text, fontSize: 13, lineHeight: 1.8, margin: 0 }}>{project.client_summary}</p>
        </div>
      )}

      <ClientDeliverablesGrid deliverables={deliverables} t={t} mobile={mobile} />
      <ClientDocsInline projectId={project.id} initialDocuments={project.documents} t={t} mobile={mobile} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Client Actions Tab (filtered tasks for clients)
// ---------------------------------------------------------------------------
function ClientActionsTab({ projectId, initialTasks, initialPhases, t, mobile }) {
  const [tasks, setTasks] = useState(initialTasks || []);
  const [phases, setPhases] = useState(initialPhases || []);
  const [collapsed, setCollapsed] = useState({});
  const [completing, setCompleting] = useState(null);
  const [toastMsg, setToastMsg] = useState("");

  const loadData = useCallback(async () => {
    const [{ data: td }, { data: pd }] = await Promise.all([
      supabase.from("tasks").select("*").eq("project_id", projectId).eq("is_internal", false).eq("owner", "client").order("id"),
      supabase.from("phases").select("*").eq("project_id", projectId).order("created_at", { ascending: true }),
    ]);
    if (td) setTasks(td);
    if (pd) setPhases(computePhaseStatuses(pd, td));
  }, [projectId]);

  useEffect(() => { loadData(); }, [loadData]);

  function showToast(msg) {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(""), 3200);
  }

  async function markComplete(task) {
    if (task.status === "done" || completing === task.id) return;
    setCompleting(task.id);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const resp = await fetch(`/api/admin/tasks/${task.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ status: "done" }),
      });
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        console.error("[ClientActionsTab] markComplete failed:", err);
        // Still reflect locally so UI doesn't snap back
        setTasks(prev => prev.map(tk => tk.id === task.id ? { ...tk, status: "done" } : tk));
      } else {
        await autoCompletePhaseIfDone(projectId, task.phase_id);
        await loadData();
      }
    } catch (e) {
      console.error("[ClientActionsTab] markComplete error:", e);
      setTasks(prev => prev.map(tk => tk.id === task.id ? { ...tk, status: "done" } : tk));
    }
    setCompleting(null);
    showToast("✅ Marked complete — LexOps will verify shortly.");
  }

  const allDeliverables = tasks.filter(tk => tk.is_deliverable);
  const doneDeliverables = allDeliverables.filter(d => d.status === "done").length;
  const progress = allDeliverables.length > 0 ? Math.round(doneDeliverables / allDeliverables.length * 100) : 0;

  const phaseTaskMap = {};
  phases.forEach(ph => { phaseTaskMap[ph.id] = []; });
  const unphased = [];
  tasks.forEach(tk => {
    if (tk.phase_id && phaseTaskMap[tk.phase_id] !== undefined) phaseTaskMap[tk.phase_id].push(tk);
    else unphased.push(tk);
  });

  const todayMidnight = new Date(); todayMidnight.setHours(0,0,0,0);
  const overdueClient = tasks.filter(tk => tk.status !== "done" && tk.owner === "client" && tk.due_date && new Date(tk.due_date) < todayMidnight);
  const overdueLexops = tasks.filter(tk => tk.status !== "done" && tk.owner === "lexops" && tk.due_date && new Date(tk.due_date) < todayMidnight);

  function getDueStatus(due_date) {
    if (!due_date) return null;
    const days = Math.ceil((new Date(due_date) - new Date()) / 86400000);
    if (days < 0) return "overdue";
    if (days <= 7) return "soon";
    return "normal";
  }
  const dueBg = { overdue: "#fdf0ee", soon: "#fef6e8", normal: "#f0f4f3" };
  const dueColor = { overdue: "#c0392b", soon: "#d4881a", normal: "#6b7c7a" };

  function PhaseSection({ phase, phaseTasks }) {
    const isOpen = collapsed[phase.id] === true ? false : (phase.status === "active" || phase.status === "pending" || !phases.length);
    const isDone = phase.status === "complete";
    const isActive = phase.status === "active";
    const pendingCount = phaseTasks.filter(tk => tk.status !== "done").length;
    return (
      <div style={{ marginBottom: 14 }}>
        <div
          onClick={() => setCollapsed(c => ({ ...c, [phase.id]: isOpen }))}
          style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", background: "#fff", border: `1px solid ${t.border}`, borderRadius: 8, cursor: "pointer", marginBottom: isOpen ? 10 : 0, boxShadow: "0 1px 3px rgba(26,74,71,0.04)" }}
        >
          <div style={{ width: 10, height: 10, borderRadius: "50%", flexShrink: 0, background: isDone ? "#2d7a5a" : isActive ? t.accent : t.border }} />
          <div style={{ flex: 1, fontSize: 13, fontWeight: 700, color: t.text }}>{phase.name}</div>
          <div style={{ fontSize: 11, padding: "3px 10px", borderRadius: 99, fontWeight: 500, background: isDone ? "#e8f5ef" : isActive && pendingCount > 0 ? "#fef6e8" : "#f0f4f3", color: isDone ? "#2d7a5a" : isActive && pendingCount > 0 ? "#d4881a" : "#6b7c7a" }}>
            {isDone ? "All complete" : pendingCount > 0 ? `${pendingCount} action${pendingCount !== 1 ? "s" : ""} needed` : "Upcoming"}
          </div>
          <span style={{ fontSize: 11, color: t.textSub, transform: isOpen ? "none" : "rotate(-90deg)", transition: "transform 0.2s", display: "inline-block" }}>▼</span>
        </div>
        {isOpen && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {phaseTasks.length === 0 ? (
              <div style={{ color: t.textSub, fontSize: 12, padding: "12px 16px", background: "#fff", borderRadius: 8, border: `1px solid ${t.border}`, opacity: 0.6 }}>No actions for this phase.</div>
            ) : phaseTasks.map(task => {
              const dc = getDueStatus(task.due_date);
              const isDoneTask = task.status === "done";
              const isBusy = completing === task.id;
              return (
                <div key={task.id} style={{ background: "#fff", borderRadius: 8, border: `1px solid ${t.border}`, padding: "14px 18px", display: "flex", alignItems: "flex-start", gap: 14, opacity: isDoneTask ? 0.55 : 1, boxShadow: "0 1px 3px rgba(26,74,71,0.06)" }}>
                  <div onClick={() => !isDoneTask && markComplete(task)} style={{ width: 20, height: 20, borderRadius: "50%", flexShrink: 0, marginTop: 1, border: `2px solid ${isDoneTask ? t.accent : "#b8c4c2"}`, background: isDoneTask || isBusy ? t.accent : "transparent", display: "flex", alignItems: "center", justifyContent: "center", cursor: isDoneTask ? "default" : "pointer", transition: "all 0.2s" }}>
                    {(isDoneTask || isBusy) && <span style={{ color: "#fff", fontSize: 10, fontWeight: 800 }}>✓</span>}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "#1a1f1e", marginBottom: 3, textDecoration: isDoneTask ? "line-through" : "none", lineHeight: 1.35 }}>{task.title}</div>
                    {task.description && <div style={{ fontSize: 12, color: "#6b7c7a", lineHeight: 1.4, marginBottom: 6 }}>{task.description}</div>}
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      {task.owner === "client" && <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 99, background: "#e8f0fe", color: "#2b5fcc", letterSpacing: "0.03em" }}>Client</span>}
                      {task.owner === "lexops" && <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 99, background: "#e8f5ef", color: "#1A6666", letterSpacing: "0.03em" }}>LexOps</span>}
                      {task.due_date && dc && (
                        <span style={{ fontSize: 11, fontWeight: 500, padding: "2px 8px", borderRadius: 99, background: dueBg[dc], color: dueColor[dc] }}>
                          {dc === "overdue" ? "Overdue — " : dc === "soon" ? "Due soon — " : "Due "}
                          {new Date(task.due_date).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                        </span>
                      )}
                      {isDoneTask && <span style={{ fontSize: 11, color: "#2d7a5a", fontStyle: "italic" }}>Pending LexOps verification</span>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      {toastMsg && (
        <div style={{ position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)", background: "#1a1f1e", color: "#fff", padding: "12px 20px", borderRadius: 8, fontSize: 13, fontWeight: 500, zIndex: 999, boxShadow: "0 8px 32px rgba(0,0,0,0.3)" }}>
          {toastMsg}
        </div>
      )}

      {/* Overall progress card */}
      <div style={{ background: "#fff", borderRadius: 12, padding: "20px 24px", border: `1px solid ${t.border}`, boxShadow: "0 1px 3px rgba(26,74,71,0.06)", marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: t.text }}>Overall Engagement Progress</span>
          <span style={{ fontSize: 13, color: t.textSub }}>{doneDeliverables} of {allDeliverables.length} actions complete</span>
        </div>
        <div style={{ height: 6, background: "#f0f4f3", borderRadius: 99, overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${progress}%`, background: `linear-gradient(90deg, ${t.accent}, #3d8f88)`, borderRadius: 99, transition: "width 0.6s ease" }} />
        </div>
        {phases.length > 0 && (
          <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
            {phases.map(ph => (
              <div key={ph.id} onClick={() => setCollapsed(c => ({ ...c, [ph.id]: false }))} style={{ padding: "4px 12px", borderRadius: 99, fontSize: 11, fontWeight: 500, cursor: "pointer", background: ph.status === "complete" ? "#e8f5ef" : ph.status === "active" ? t.accent : "#f0f4f3", color: ph.status === "complete" ? "#2d7a5a" : ph.status === "active" ? "#fff" : "#6b7c7a", border: ph.status === "complete" ? "1.5px solid rgba(45,122,90,0.2)" : "1.5px solid transparent" }}>
                {ph.status === "complete" ? "✓ " : ph.status === "active" ? "● " : ""}{ph.name}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Overdue client actions ── */}
      {overdueClient.length > 0 && (
        <div style={{ background: "#fff8f6", border: "1.5px solid rgba(192,57,43,0.22)", borderRadius: 12, padding: "18px 22px", marginBottom: 4 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
            <span style={{ fontSize: 18, lineHeight: 1 }}>⚠️</span>
            <div style={{ flex: 1, fontSize: 13, fontWeight: 700, color: "#c0392b", fontFamily: "'Playfair Display', Georgia, serif" }}>Actions on your part that require immediate attention</div>
            <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 10px", borderRadius: 99, background: "rgba(192,57,43,0.1)", color: "#c0392b", flexShrink: 0 }}>
              {overdueClient.length} overdue
            </span>
          </div>
          {overdueClient.map((task, i) => {
            const daysLate = Math.floor((todayMidnight - new Date(task.due_date)) / 86400000);
            return (
              <div key={task.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderTop: i === 0 ? "1px solid rgba(192,57,43,0.1)" : "1px solid rgba(192,57,43,0.08)" }}>
                <div onClick={() => markComplete(task)} style={{ width: 18, height: 18, borderRadius: "50%", flexShrink: 0, border: "2px solid rgba(192,57,43,0.4)", background: "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }} title="Mark complete" />
                <div style={{ flex: 1, fontSize: 13, fontWeight: 500, color: "#1a1f1e" }}>{task.title}</div>
                <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 9px", borderRadius: 99, background: "#fdf0ee", color: "#c0392b", flexShrink: 0 }}>
                  {daysLate === 0 ? "Due today" : `${daysLate}d overdue`}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Overdue LexOps actions ── */}
      {overdueLexops.length > 0 && (
        <div style={{ background: "#f8fbfb", border: `1.5px solid ${t.border}`, borderRadius: 12, padding: "18px 22px", marginBottom: 4 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
            <span style={{ fontSize: 18, lineHeight: 1 }}>⏳</span>
            <div style={{ flex: 1, fontSize: 13, fontWeight: 700, color: t.text, fontFamily: "'Playfair Display', Georgia, serif" }}>Pending actions from Lex Ops</div>
            <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 10px", borderRadius: 99, background: "#e8f5ef", color: "#1A6666", flexShrink: 0 }}>
              {overdueLexops.length} delayed
            </span>
          </div>
          {overdueLexops.map((task, i) => {
            const daysLate = Math.floor((todayMidnight - new Date(task.due_date)) / 86400000);
            return (
              <div key={task.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderTop: i === 0 ? `1px solid ${t.border}` : `1px solid rgba(197,212,212,0.5)` }}>
                <div style={{ width: 18, height: 18, borderRadius: "50%", flexShrink: 0, border: `2px solid ${t.border}`, background: "transparent" }} />
                <div style={{ flex: 1, fontSize: 13, fontWeight: 500, color: t.text }}>{task.title}</div>
                <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 9px", borderRadius: 99, background: "#f0f4f3", color: "#6b7c7a", flexShrink: 0 }}>
                  {daysLate === 0 ? "Due today" : `${daysLate}d delayed`}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* Phase sections */}
      {phases.length > 0
        ? phases.map(ph => <PhaseSection key={ph.id} phase={ph} phaseTasks={phaseTaskMap[ph.id] || []} />)
        : tasks.length === 0
          ? <div style={{ background: "#fff", borderRadius: 12, padding: "40px 24px", border: `1px solid ${t.border}`, textAlign: "center" }}>
              <div style={{ fontSize: 28, marginBottom: 10 }}>✅</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: t.text, marginBottom: 5 }}>All clear for now</div>
              <div style={{ fontSize: 12, color: t.textSub }}>No action items at this time.</div>
            </div>
          : <PhaseSection phase={{ id: "all", name: "Your Actions", status: "active" }} phaseTasks={tasks} />
      }
      {unphased.length > 0 && phases.length > 0 && (
        <PhaseSection phase={{ id: "unphased", name: "Other Actions", status: "active" }} phaseTasks={unphased} />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Client Documents Tab (with document requests)
// ---------------------------------------------------------------------------
function ClientDocumentsTab({ projectId, initialDocuments, initialDocRequests, onRefresh, t }) {
  const [docs, setDocs] = useState(initialDocuments || []);
  const [requests, setRequests] = useState((initialDocRequests || []).filter(r => !r.fulfilled_at));
  const [uploading, setUploading] = useState(null);
  const [uploadError, setUploadError] = useState("");
  const [selfUploading, setSelfUploading] = useState(false);

  const loadDocs = useCallback(async () => {
    const [{ data: d }, { data: r }] = await Promise.all([
      supabase.from("documents").select("*").eq("project_id", projectId).order("uploaded_at", { ascending: false }),
      supabase.from("document_requests").select("*").eq("project_id", projectId).order("requested_at", { ascending: false }),
    ]);
    if (d) setDocs(d);
    if (r) setRequests(r.filter(req => !req.fulfilled_at));
  }, [projectId]);

  useEffect(() => { loadDocs(); }, [loadDocs]);

  async function handleRequestUpload(e, req) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    setUploadError("");
    setUploading(req.id);

    const storagePath = `${projectId}/${file.name}`;
    const { error: upErr } = await supabase.storage.from("project-documents").upload(storagePath, file, { upsert: true });
    if (upErr) { setUploadError(upErr.message); setUploading(null); return; }

    const { data: { publicUrl } } = supabase.storage.from("project-documents").getPublicUrl(storagePath);
    const ext = file.name.split(".").pop().toUpperCase();

    const insertResult = await dbWrite("documents","insert",{
      project_id: projectId,
      name: file.name,
      file_type: ext,
      file_size: file.size,
      file_url: publicUrl,
      storage_path: storagePath,
      uploaded_at: new Date().toISOString(),
    });
    const newDoc = insertResult?.data;

    if (newDoc) {
      await dbWrite("document_requests","update",{
        fulfilled_at: new Date().toISOString(),
        fulfilled_document_id: newDoc.id,
      },{id: req.id});
      // Notify admins that document was uploaded
      fetch("/api/notify/document-uploaded",{
        method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({project_id:projectId,document_name:file.name}),
      }).catch(()=>{});
    }

    await loadDocs();
    setUploading(null);
    onRefresh?.();
  }

  async function handleSelfUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    setUploadError("");
    setSelfUploading(true);
    const storagePath = `${projectId}/${file.name}`;
    const { error: upErr } = await supabase.storage.from("project-documents").upload(storagePath, file, { upsert: true });
    if (upErr) { setUploadError(upErr.message); setSelfUploading(false); return; }
    const { data: { publicUrl } } = supabase.storage.from("project-documents").getPublicUrl(storagePath);
    const ext = file.name.split(".").pop().toUpperCase();
    await dbWrite("documents","insert",{
      project_id: projectId, name: file.name, file_type: ext,
      file_size: file.size, file_url: publicUrl, storage_path: storagePath,
      uploaded_at: new Date().toISOString(),
    });
    await loadDocs();
    setSelfUploading(false);
    onRefresh?.();
  }

  const tc = { PDF: "#f87171", DOCX: "#4a7fa5", XLSX: "#4ade80", PNG: "#4ade80", JPG: "#4ade80", CSV: "#f59e0b" };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Generic uploader */}
      <div style={{ background: t.surface, border: `1px dashed ${t.border}`, borderRadius: 12, padding: "18px 22px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
        <div>
          <div style={{ color: t.text, fontSize: 14, fontWeight: 600, marginBottom: 3 }}>Upload a Document</div>
          <div style={{ color: t.textSub, fontSize: 12 }}>Share any file with your LexOps team (PDF, DOCX, XLSX, images…)</div>
        </div>
        <div>
          <input type="file" id="self-upload-input" style={{ display: "none" }} onChange={handleSelfUpload} />
          <label htmlFor="self-upload-input" style={{
            background: t.accent, color: "#fff", borderRadius: 8, padding: "9px 20px",
            fontSize: 13, fontWeight: 600, cursor: selfUploading ? "not-allowed" : "pointer",
            opacity: selfUploading ? 0.6 : 1, display: "inline-flex", alignItems: "center", gap: 6, whiteSpace: "nowrap",
          }}>
            {selfUploading ? "Uploading…" : "↑ Upload File"}
          </label>
        </div>
      </div>
      {/* Pending Document Requests */}
      {requests.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <SectionLabel t={t}>Requested Documents</SectionLabel>
          {requests.map(req => (
            <div key={req.id} style={{
              background: t.amberSoft, border: `1px solid ${t.amber}25`, borderRadius: 12,
              padding: "18px 22px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16,
            }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                  <span style={{ fontSize: 16 }}>📋</span>
                  <span style={{ color: t.text, fontSize: 14, fontWeight: 600 }}>{req.title}</span>
                </div>
                {req.description && <div style={{ color: t.textSub, fontSize: 12, lineHeight: 1.5, marginLeft: 24 }}>{req.description}</div>}
              </div>
              <div>
                <input type="file" id={`req-upload-${req.id}`} style={{ display: "none" }}
                  onChange={e => handleRequestUpload(e, req)} />
                <label htmlFor={`req-upload-${req.id}`} style={{
                  background: t.accent, color: "#fff", border: "none", borderRadius: 8,
                  padding: "8px 18px", fontSize: 12, fontWeight: 600, cursor: uploading === req.id ? "not-allowed" : "pointer",
                  opacity: uploading === req.id ? 0.6 : 1, display: "inline-flex", alignItems: "center", gap: 6,
                  whiteSpace: "nowrap",
                }}>
                  {uploading === req.id ? "Uploading…" : "Upload ↑"}
                </label>
              </div>
            </div>
          ))}
        </div>
      )}

      {uploadError && <div style={{ background: t.redSoft || "rgba(248,113,113,0.08)", border: `1px solid ${t.red}30`, borderRadius: 8, padding: "8px 14px", color: t.red, fontSize: 12 }}>{uploadError}</div>}

      {/* Existing Documents */}
      <SectionLabel t={t}>Your Documents ({docs.length})</SectionLabel>
      <Card t={t} style={{ overflowX: "auto" }}>
        {docs.length === 0
          ? <div style={{ color: t.textSub, textAlign: "center", padding: "40px 0", fontSize: 13 }}>No documents yet.</div>
          : docs.map((doc, i) => {
            const ext = doc.file_type || (doc.name?.split(".").pop().toUpperCase()) || "FILE";
            const c = tc[ext] || t.accent;
            return (
              <div key={doc.id ?? i}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "15px 22px", gap: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 14, minWidth: 0 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 8, flexShrink: 0, background: c + "12", border: `1px solid ${c}22`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 800, color: c, letterSpacing: "0.03em" }}>{ext}</div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ color: t.text, fontSize: 13, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{doc.name}</div>
                      <div style={{ color: t.textSub, fontSize: 11, marginTop: 1 }}>{fmtBytes(doc.file_size)} · {fmtDate(doc.uploaded_at)}</div>
                    </div>
                  </div>
                  <a href={doc.file_url ? `${doc.file_url}${doc.file_url.includes("?")?"&":"?"}download=${encodeURIComponent(doc.name||"file")}` : "#"} target="_blank" rel="noreferrer" style={{ background: t.accent, color: "#fff", border: "none", borderRadius: 7, padding: "5px 14px", fontSize: 12, fontWeight: 600, textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 5, flexShrink: 0 }}>
                    ↓ Download
                  </a>
                </div>
                {i < docs.length - 1 && <Line t={t} />}
              </div>
            );
          })}
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Client Resources Tab (documents + tools for client view)
// ---------------------------------------------------------------------------
function ClientResourcesTab({ projectId, initialDocuments, t, mobile }) {
  const [docs, setDocs] = useState(initialDocuments || []);
  const [tools, setTools] = useState([]);
  const [phaseFilter, setPhaseFilter] = useState("all");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const [{ data: d }, { data: tl }] = await Promise.all([
      supabase.from("documents").select("*").eq("project_id", projectId).order("uploaded_at", { ascending: false }),
      supabase.from("project_tools").select("*").eq("project_id", projectId).order("sort_order").then(r => r.error ? { data: [] } : r),
    ]);
    if (d) setDocs(d);
    if (tl) setTools(tl);
    setLoading(false);
  }, [projectId]);

  useEffect(() => { load(); }, [load]);

  const phases = [...new Set(docs.map(d => d.phase_name).filter(Boolean))];
  const filteredDocs = phaseFilter === "all" ? docs : docs.filter(d => d.phase_name === phaseFilter);

  function docIcon(fileType) {
    const e = (fileType || "").toLowerCase();
    if (e === "pdf") return { emoji: "📄", bg: "#fde8e8" };
    if (["xls","xlsx","csv"].includes(e)) return { emoji: "📊", bg: "#e8f5e8" };
    return { emoji: "📝", bg: "#e8eef8" };
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: mobile ? "1fr" : "1fr 1fr", gap: 28 }}>
      {/* Documents */}
      <div>
        <div style={{ fontSize: 11, fontWeight: 600, color: t.textSub, letterSpacing: "1px", textTransform: "uppercase", marginBottom: 14, paddingBottom: 10, borderBottom: `1.5px solid ${t.border}` }}>
          📁 Documents
        </div>
        {phases.length > 0 && (
          <div style={{ display: "flex", gap: 6, marginBottom: 14, flexWrap: "wrap" }}>
            {["all", ...phases].map(ph => (
              <button key={ph} onClick={() => setPhaseFilter(ph)} style={{ padding: "4px 12px", borderRadius: 99, fontSize: 11, fontWeight: 500, background: phaseFilter === ph ? "#e8f2f1" : t.surface, color: phaseFilter === ph ? t.accent : t.textSub, border: `1.5px solid ${phaseFilter === ph ? "rgba(26,102,102,0.25)" : "transparent"}`, cursor: "pointer", fontFamily: "inherit" }}>
                {ph === "all" ? "All" : ph}
              </button>
            ))}
          </div>
        )}
        {loading ? (
          <div style={{ color: t.textSub, fontSize: 12, padding: "20px 0" }}>Loading…</div>
        ) : filteredDocs.length === 0 ? (
          <div style={{ textAlign: "center", padding: "32px 24px", background: "#fff", borderRadius: 10, border: `1px solid ${t.border}` }}>
            <div style={{ fontSize: 24, marginBottom: 8 }}>📁</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: t.text, marginBottom: 4 }}>No documents yet</div>
            <div style={{ fontSize: 12, color: t.textSub, lineHeight: 1.5, maxWidth: 240, margin: "0 auto" }}>Documents will appear here as your engagement progresses.</div>
          </div>
        ) : filteredDocs.map(doc => {
          const ext = doc.file_type || doc.name?.split(".").pop()?.toUpperCase() || "FILE";
          const icon = docIcon(ext);
          return (
            <div key={doc.id} style={{ display: "flex", alignItems: "center", gap: 12, background: "#fff", borderRadius: 8, border: `1px solid ${t.border}`, padding: "14px 16px", marginBottom: 8, boxShadow: "0 1px 3px rgba(26,74,71,0.06)" }}>
              <div style={{ width: 36, height: 36, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0, background: icon.bg }}>
                {icon.emoji}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: t.text, marginBottom: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{doc.name}</div>
                <div style={{ fontSize: 11, color: t.textSub }}>
                  {doc.uploaded_at ? new Date(doc.uploaded_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : ""}
                  {doc.file_type ? ` · ${doc.file_type}` : ""}
                </div>
              </div>
              {doc.phase_name && (
                <span style={{ fontSize: 10, padding: "2px 8px", background: "#e8f2f1", color: t.accent, borderRadius: 99, fontWeight: 500, flexShrink: 0 }}>{doc.phase_name}</span>
              )}
              <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                <a href={doc.file_url} target="_blank" rel="noreferrer" style={{ fontSize: 11, padding: "4px 10px", borderRadius: 6, border: `1px solid ${t.border}`, color: t.textSub, textDecoration: "none", fontWeight: 500 }}>View</a>
                <a href={doc.file_url ? `${doc.file_url}${doc.file_url.includes("?")?"&":"?"}download=${encodeURIComponent(doc.name||"file")}` : "#"} target="_blank" rel="noreferrer" style={{ fontSize: 11, padding: "4px 10px", borderRadius: 6, background: t.accent, color: "#fff", textDecoration: "none", fontWeight: 600 }}>↓ Download</a>
              </div>
            </div>
          );
        })}
      </div>

      {/* Tools */}
      <div>
        <div style={{ fontSize: 11, fontWeight: 600, color: t.textSub, letterSpacing: "1px", textTransform: "uppercase", marginBottom: 14, paddingBottom: 10, borderBottom: `1.5px solid ${t.border}` }}>
          🔧 Tools Set Up by LexOps
        </div>
        {loading ? (
          <div style={{ color: t.textSub, fontSize: 12, padding: "20px 0" }}>Loading…</div>
        ) : tools.length === 0 ? (
          <div style={{ textAlign: "center", padding: "32px 24px", background: "#fff", borderRadius: 10, border: `1px solid ${t.border}` }}>
            <div style={{ fontSize: 24, marginBottom: 8 }}>🔧</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: t.text, marginBottom: 4 }}>No tools configured yet</div>
            <div style={{ fontSize: 12, color: t.textSub, lineHeight: 1.5, maxWidth: 240, margin: "0 auto" }}>LexOps will add tools relevant to your engagement here.</div>
          </div>
        ) : tools.map(tool => (
          <div key={tool.id} style={{ background: "#fff", borderRadius: 8, border: `1px solid ${t.border}`, padding: "16px 18px", marginBottom: 8, display: "flex", alignItems: "center", gap: 14, boxShadow: "0 1px 3px rgba(26,74,71,0.06)" }}>
            <div style={{ width: 40, height: 40, borderRadius: 8, background: t.surface, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>
              {tool.logo_emoji || "🔧"}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: t.text, marginBottom: 2 }}>{tool.name}</div>
              {tool.purpose && <div style={{ fontSize: 12, color: t.textSub, lineHeight: 1.4 }}>{tool.purpose}</div>}
            </div>
            {tool.url && (
              <a href={tool.url} target="_blank" rel="noreferrer" style={{ marginLeft: "auto", padding: "6px 14px", borderRadius: 8, background: t.accent, color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", textDecoration: "none", whiteSpace: "nowrap", flexShrink: 0 }}>
                Launch ↗
              </a>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Manager inline editor (click-to-edit pencil)
// ---------------------------------------------------------------------------
function ManagerEditor({ projectId, value, t, onSaved }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value || "");
  const [saving, setSaving] = useState(false);
  async function save() {
    setSaving(true);
    try {
      await dbWrite("projects","update",{ manager: draft.trim() || null },{id: projectId});
      setEditing(false);
      onSaved?.(draft.trim());
    } catch(err){console.error("[ManagerField] save error:",err.message);}
    setSaving(false);
  }
  if (editing) return (
    <span style={{ display:"inline-flex", alignItems:"center", gap:6 }}>
      <span style={{ color:t.textSub, fontSize:12 }}>Manager:</span>
      <input autoFocus value={draft} onChange={e=>setDraft(e.target.value)}
        onKeyDown={e=>{ if(e.key==="Enter") save(); if(e.key==="Escape") setEditing(false); }}
        onBlur={save}
        style={{ background:"#fff", border:`1.5px solid ${t.accent}`, borderRadius:5, padding:"2px 8px", fontSize:12, color:t.text, fontFamily:"inherit", width:150 }}
      />
      {saving&&<span style={{fontSize:11,color:t.textSub}}>…</span>}
    </span>
  );
  return (
    <button onClick={()=>{ setDraft(value||""); setEditing(true); }}
      style={{ background:"transparent", border:"none", padding:0, cursor:"pointer", display:"inline-flex", alignItems:"center", gap:4 }}>
      <span style={{color:t.textSub,fontSize:12}}>Manager: </span>
      <span style={{color:t.accentLight,fontSize:12}}>{value||"—"}</span>
      <span style={{fontSize:10,color:t.textSub,opacity:0.5,marginLeft:2}}>✏</span>
    </button>
  );
}

// ---------------------------------------------------------------------------
// Internal Actions Tab (phase-grouped, admin-editable version)
// ---------------------------------------------------------------------------
function InternalActionsTab({ projectId, initialTasks, initialPhases, t, mobile, onRefresh }) {
  const [tasks, setTasks] = useState(initialTasks || []);
  const [phases, setPhases] = useState(initialPhases || []);
  const [collapsed, setCollapsed] = useState({});
  const [editingId, setEditingId] = useState(null);
  const [editDraft, setEditDraft] = useState({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [ownerColMissing, setOwnerColMissing] = useState(false);
  const [showAddIn, setShowAddIn] = useState(null);
  const [newTask, setNewTask] = useState({ title: "", due_date: "", owner: "" });

  const loadData = useCallback(async () => {
    const [{ data: td }, { data: pd }] = await Promise.all([
      supabase.from("tasks").select("*").eq("project_id", projectId).eq("is_internal", false).order("id"),
      supabase.from("phases").select("*").eq("project_id", projectId).order("created_at", { ascending: true }),
    ]);
    if (td) setTasks(td);
    if (pd) setPhases(computePhaseStatuses(pd, td));
  }, [projectId]);
  useEffect(() => { loadData(); }, [loadData]);

  function startEdit(task) {
    setEditingId(task.id);
    setEditDraft({ title: task.title || "", status: task.status || "pending", due_date: task.due_date || "", phase_id: task.phase_id || "", owner: task.owner || "" });
  }
  async function saveEdit(taskId) {
    setSaving(true);
    setSaveError("");
    try {
      // Step 1: save core fields (title, status, due_date, phase_id) — always works
      await adminFetch(`/tasks/${taskId}`, { method: "PATCH", body: {
        title: editDraft.title,
        status: editDraft.status,
        due_date: editDraft.due_date || null,
        phase_id: editDraft.phase_id || null,
      }});
      if (editDraft.status === "done") await autoCompletePhaseIfDone(projectId, editDraft.phase_id);

      // Step 2: save owner via dedicated endpoint — gracefully handles missing column
      try {
        await adminFetch(`/tasks/${taskId}/owner`, { method: "PATCH", body: { owner: editDraft.owner || null } });
        setOwnerColMissing(false);
      } catch(ownerErr) {
        if (ownerErr.message === "owner_column_missing") {
          setOwnerColMissing(true);
        }
      }

      // Update local state immediately — no re-fetch needed
      setTasks(ts => ts.map(tk => tk.id === taskId ? {
        ...tk,
        title: editDraft.title,
        status: editDraft.status,
        due_date: editDraft.due_date || null,
        phase_id: editDraft.phase_id || null,
        owner: ownerColMissing ? tk.owner : (editDraft.owner || null),
      } : tk));
      setEditingId(null);
      setSaving(false);
      onRefresh?.();
    } catch(err) {
      console.error("[InternalActionsTab] saveEdit failed:", err.message);
      setSaveError(err.message);
      setSaving(false);
    }
  }
  async function deleteTask(taskId) {
    try {
      await adminFetch(`/tasks/${taskId}`, { method: "DELETE" });
      setTasks(ts => ts.filter(t => t.id !== taskId));
      onRefresh?.();
    } catch(err) { console.error("[InternalActionsTab] deleteTask failed:", err.message); }
  }
  async function addTask(phaseId) {
    if (!newTask.title.trim()) return;
    setSaving(true);
    try {
      const payload = { project_id: projectId, title: newTask.title.trim(), status: "pending", is_internal: false, is_deliverable: false, due_date: newTask.due_date || null, phase_id: phaseId || null };
      const res = await dbWrite("tasks", "insert", payload);
      const added = res?.data || { ...payload, id: Date.now().toString() };
      setTasks(ts => [...ts, added]);
      setNewTask({ title: "", due_date: "", owner: "" });
      setShowAddIn(null);
      onRefresh?.();
    } catch(err) { console.error("[InternalActionsTab] addTask failed:", err.message); }
    setSaving(false);
  }

  const phaseTaskMap = {};
  phases.forEach(ph => { phaseTaskMap[ph.id] = []; });
  const unphased = [];
  tasks.forEach(tk => { if (tk.phase_id && phaseTaskMap[tk.phase_id] !== undefined) phaseTaskMap[tk.phase_id].push(tk); else unphased.push(tk); });

  const statusOpts = [["pending","Pending"],["in_progress","In Progress"],["done","Done"]];
  const stStyle = { pending: { bg:"#f0f4f3", color:"#6b7c7a" }, in_progress: { bg:"#fef6e8", color:"#d4881a" }, done: { bg:"#e8f5ef", color:"#2d7a5a" } };

  function TaskRow({ task }) {
    const isEd = editingId === task.id;
    const st = stStyle[task.status] || stStyle.pending;
    if (isEd) return (
      <div style={{ background:"#fff", border:`1.5px solid ${t.accent}`, borderRadius:8, padding:"14px 16px", marginBottom:8 }}>
        <input autoFocus value={editDraft.title} onChange={e=>setEditDraft(d=>({...d,title:e.target.value}))}
          style={{ width:"100%", background:t.surface, border:`1px solid ${t.border}`, borderRadius:6, padding:"7px 10px", fontSize:13, color:t.text, fontFamily:"inherit", boxSizing:"border-box", marginBottom:10 }}/>
        <div style={{ display:"flex", gap:8, flexWrap:"wrap", alignItems:"center" }}>
          <select value={editDraft.status} onChange={e=>setEditDraft(d=>({...d,status:e.target.value}))}
            style={{ background:"#fff", border:`1px solid ${t.border}`, borderRadius:6, padding:"5px 8px", fontSize:12, fontFamily:"inherit", color:t.text }}>
            {statusOpts.map(([v,l])=><option key={v} value={v}>{l}</option>)}
          </select>
          <select value={editDraft.phase_id} onChange={e=>setEditDraft(d=>({...d,phase_id:e.target.value}))}
            style={{ background:"#fff", border:`1px solid ${t.border}`, borderRadius:6, padding:"5px 8px", fontSize:12, fontFamily:"inherit", color:t.text }}>
            <option value="">— No Milestone —</option>
            {phases.map(ph=><option key={ph.id} value={ph.id}>{ph.name}</option>)}
          </select>
          <select value={editDraft.owner} onChange={e=>setEditDraft(d=>({...d,owner:e.target.value}))}
            style={{ background:"#fff", border:`1px solid ${t.border}`, borderRadius:6, padding:"5px 8px", fontSize:12, fontFamily:"inherit", color:t.text }}>
            <option value="">— No Owner —</option>
            <option value="client">Client</option>
            <option value="lexops">LexOps</option>
          </select>
          <input type="date" value={editDraft.due_date} onChange={e=>setEditDraft(d=>({...d,due_date:e.target.value}))}
            style={{ background:"#fff", border:`1px solid ${t.border}`, borderRadius:6, padding:"5px 8px", fontSize:12, fontFamily:"inherit", color:t.text }}/>
          <div style={{ marginLeft:"auto", display:"flex", gap:6 }}>
            <button onClick={()=>{setEditingId(null);setSaveError("");}} style={{ background:"transparent", border:`1px solid ${t.border}`, borderRadius:6, padding:"5px 12px", fontSize:12, cursor:"pointer", color:t.textSub, fontFamily:"inherit" }}>Cancel</button>
            <button onClick={()=>saveEdit(task.id)} disabled={saving} style={{ background:t.accent, border:"none", borderRadius:6, padding:"5px 14px", fontSize:12, fontWeight:600, cursor:"pointer", color:"#fff", fontFamily:"inherit" }}>{saving?"Saving…":"Save"}</button>
          </div>
        </div>
        {saveError&&<div style={{marginTop:8,color:"#c0392b",fontSize:11,background:"rgba(192,57,43,0.08)",borderRadius:5,padding:"5px 10px"}}>{saveError}</div>}
      </div>
    );
    const ownerStyle = { client:{bg:"#e8f0fe",color:"#2b5fcc",label:"Client"}, lexops:{bg:"#e8f5ef",color:"#1A6666",label:"LexOps"} };
    const ow = ownerStyle[task.owner];
    return (
      <div style={{ background:"#fff", border:`1px solid ${t.border}`, borderRadius:8, padding:"12px 16px", marginBottom:8, display:"flex", alignItems:"flex-start", gap:12, boxShadow:"0 1px 3px rgba(26,74,71,0.04)" }}>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontSize:13, fontWeight:500, color:task.status==="done"?t.textSub:t.text, textDecoration:task.status==="done"?"line-through":"none", marginBottom:4 }}>{task.title}</div>
          <div style={{ display:"flex", gap:6, alignItems:"center", flexWrap:"wrap" }}>
            {ow && <span style={{ fontSize:10, fontWeight:700, padding:"2px 8px", borderRadius:99, background:ow.bg, color:ow.color, letterSpacing:"0.03em" }}>{ow.label}</span>}
            {task.due_date&&<span style={{ fontSize:11, color:t.textSub }}>{new Date(task.due_date).toLocaleDateString("en-GB",{day:"numeric",month:"short",year:"numeric"})}</span>}
          </div>
        </div>
        <span style={{ fontSize:11, fontWeight:600, padding:"3px 10px", borderRadius:99, background:st.bg, color:st.color, flexShrink:0 }}>
          {task.status==="done"?"✓ Done":task.status==="in_progress"?"In Progress":"Pending"}
        </span>
        <button onClick={()=>startEdit(task)} style={{ background:"transparent", border:`1px solid ${t.border}`, borderRadius:6, padding:"4px 10px", fontSize:11, cursor:"pointer", color:t.textSub, fontFamily:"inherit", flexShrink:0 }}>Edit</button>
        <button onClick={()=>deleteTask(task.id)} style={{ background:"transparent", border:"none", color:t.textSub, cursor:"pointer", fontSize:14, padding:"2px 4px", opacity:0.4, lineHeight:1, flexShrink:0 }}>×</button>
      </div>
    );
  }

  function PhaseSection({ phase, phaseTasks }) {
    const isOpen = collapsed[phase.id] === true ? false : true;
    const isDone = phase.status === "complete";
    const isActive = phase.status === "active";
    const doneC = phaseTasks.filter(tk => tk.status === "done").length;
    return (
      <div style={{ marginBottom:14 }}>
        <div onClick={()=>setCollapsed(c=>({...c,[phase.id]:isOpen}))}
          style={{ display:"flex", alignItems:"center", gap:10, padding:"12px 16px", background:"#fff", border:`1px solid ${t.border}`, borderRadius:8, cursor:"pointer", boxShadow:"0 1px 3px rgba(26,74,71,0.04)" }}>
          <div style={{ width:10, height:10, borderRadius:"50%", flexShrink:0, background:isDone?"#2d7a5a":isActive?t.accent:t.border }}/>
          <div style={{ flex:1, fontSize:13, fontWeight:700, color:t.text }}>{phase.name}</div>
          <div style={{ fontSize:11, color:t.textSub }}>{doneC}/{phaseTasks.length} done</div>
          <span style={{ fontSize:11, color:t.textSub, transform:isOpen?"none":"rotate(-90deg)", transition:"transform 0.2s", display:"inline-block" }}>▼</span>
        </div>
        {isOpen&&(
          <div style={{ marginTop:8, paddingLeft:4 }}>
            {phaseTasks.map(task=><TaskRow key={task.id} task={task}/>)}
            {showAddIn===phase.id?(
              <div style={{ background:"#fff", border:`1.5px dashed ${t.border}`, borderRadius:8, padding:"10px 14px", marginBottom:8, display:"flex", gap:8, alignItems:"center", flexWrap:"wrap" }}>
                <input autoFocus value={newTask.title} onChange={e=>setNewTask(n=>({...n,title:e.target.value}))} placeholder="Task title…"
                  onKeyDown={e=>{ if(e.key==="Enter") addTask(phase.id); if(e.key==="Escape") setShowAddIn(null); }}
                  style={{ flex:1, minWidth:120, background:t.surface, border:`1px solid ${t.border}`, borderRadius:6, padding:"6px 10px", fontSize:13, fontFamily:"inherit", color:t.text }}/>
                <select value={newTask.owner} onChange={e=>setNewTask(n=>({...n,owner:e.target.value}))}
                  style={{ background:"#fff", border:`1px solid ${t.border}`, borderRadius:6, padding:"6px 8px", fontSize:12, fontFamily:"inherit", color:t.text }}>
                  <option value="">— Owner —</option>
                  <option value="client">Client</option>
                  <option value="lexops">LexOps</option>
                </select>
                <input type="date" value={newTask.due_date} onChange={e=>setNewTask(n=>({...n,due_date:e.target.value}))}
                  style={{ background:"#fff", border:`1px solid ${t.border}`, borderRadius:6, padding:"6px 8px", fontSize:12, fontFamily:"inherit" }}/>
                <button onClick={()=>addTask(phase.id)} disabled={saving||!newTask.title.trim()} style={{ background:t.accent, border:"none", borderRadius:6, padding:"6px 14px", fontSize:12, fontWeight:600, color:"#fff", cursor:"pointer", fontFamily:"inherit" }}>Add</button>
                <button onClick={()=>setShowAddIn(null)} style={{ background:"transparent", border:`1px solid ${t.border}`, borderRadius:6, padding:"6px 12px", fontSize:12, color:t.textSub, cursor:"pointer" }}>Cancel</button>
              </div>
            ):(
              <button onClick={()=>{ setShowAddIn(phase.id); setNewTask({title:"",due_date:"",owner:""}); }}
                style={{ background:"transparent", border:`1px dashed ${t.border}`, borderRadius:8, padding:"8px 16px", fontSize:12, color:t.textSub, cursor:"pointer", width:"100%", textAlign:"left", fontFamily:"inherit" }}>
                + Add action to {phase.name}
              </button>
            )}
          </div>
        )}
      </div>
    );
  }

  const totalT = tasks.length, doneT = tasks.filter(tk => tk.status === "done").length;
  const todayMid = new Date(); todayMid.setHours(0,0,0,0);
  const intOverdueClient = tasks.filter(tk => tk.status !== "done" && tk.owner === "client" && tk.due_date && new Date(tk.due_date) < todayMid);
  const intOverdueLexops = tasks.filter(tk => tk.status !== "done" && tk.owner === "lexops" && tk.due_date && new Date(tk.due_date) < todayMid);

  function copyOwnerSql() {
    navigator.clipboard.writeText("ALTER TABLE tasks ADD COLUMN IF NOT EXISTS owner text;").catch(()=>{});
  }

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
      {ownerColMissing && (
        <div style={{ background:"#fffbea", border:"1.5px solid #f5c542", borderRadius:10, padding:"14px 18px", display:"flex", gap:14, alignItems:"flex-start" }}>
          <span style={{ fontSize:18, lineHeight:1, flexShrink:0 }}>⚙️</span>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:13, fontWeight:700, color:"#7a5f00", marginBottom:4 }}>One-time database setup needed for Owner field</div>
            <div style={{ fontSize:12, color:"#7a5f00", marginBottom:8 }}>Run this SQL once in your <strong>Supabase dashboard → SQL Editor</strong> to enable the Owner (Client / LexOps) column:</div>
            <div style={{ display:"flex", alignItems:"center", gap:8 }}>
              <code style={{ background:"rgba(0,0,0,0.06)", borderRadius:5, padding:"5px 10px", fontSize:12, flex:1, fontFamily:"monospace", color:"#3a3000" }}>ALTER TABLE tasks ADD COLUMN IF NOT EXISTS owner text;</code>
              <button onClick={copyOwnerSql} style={{ flexShrink:0, background:"#f5c542", border:"none", borderRadius:6, padding:"5px 12px", fontSize:12, fontWeight:600, cursor:"pointer", color:"#3a3000", fontFamily:"inherit" }}>Copy SQL</button>
            </div>
          </div>
        </div>
      )}
      <div style={{ background:"#fff", border:`1px solid ${t.border}`, borderRadius:10, padding:"14px 20px", display:"flex", alignItems:"center", gap:16, boxShadow:"0 1px 3px rgba(26,74,71,0.06)" }}>
        <div style={{ flex:1 }}>
          <div style={{ fontSize:12, color:t.textSub, marginBottom:6 }}>{doneT} of {totalT} actions complete</div>
          <div style={{ height:4, background:t.surface, borderRadius:99, overflow:"hidden" }}>
            <div style={{ height:"100%", width:`${totalT>0?Math.round(doneT/totalT*100):0}%`, background:`linear-gradient(90deg,${t.accent},#3d8f88)`, borderRadius:99, transition:"width 0.6s ease" }}/>
          </div>
        </div>
        <span style={{ fontSize:22, fontFamily:"'Playfair Display',Georgia,serif", fontWeight:400, color:t.text }}>{totalT>0?`${Math.round(doneT/totalT*100)}%`:"—"}</span>
      </div>

      {/* ── Client overdue ── */}
      {intOverdueClient.length > 0 && (
        <div style={{ background:"#fff8f6", border:"1.5px solid rgba(192,57,43,0.22)", borderRadius:12, padding:"16px 20px" }}>
          <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:12 }}>
            <span style={{ fontSize:16, lineHeight:1 }}>⚠️</span>
            <div style={{ flex:1, fontSize:13, fontWeight:700, color:"#c0392b", fontFamily:"'Playfair Display',Georgia,serif" }}>Client actions overdue — awaiting their response</div>
            <span style={{ fontSize:11, fontWeight:600, padding:"2px 10px", borderRadius:99, background:"rgba(192,57,43,0.1)", color:"#c0392b", flexShrink:0 }}>{intOverdueClient.length} overdue</span>
          </div>
          {intOverdueClient.map((task, i) => {
            const daysLate = Math.floor((todayMid - new Date(task.due_date)) / 86400000);
            return (
              <div key={task.id} style={{ display:"flex", alignItems:"center", gap:12, padding:"9px 0", borderTop: i===0?"1px solid rgba(192,57,43,0.1)":"1px solid rgba(192,57,43,0.07)" }}>
                <div style={{ flex:1, fontSize:13, fontWeight:500, color:"#1a1f1e" }}>{task.title}</div>
                <span style={{ fontSize:11, fontWeight:600, padding:"2px 9px", borderRadius:99, background:"#fdf0ee", color:"#c0392b", flexShrink:0 }}>
                  {daysLate === 0 ? "Due today" : `${daysLate}d overdue`}
                </span>
                <button onClick={()=>startEdit(task)} style={{ background:"transparent", border:`1px solid ${t.border}`, borderRadius:6, padding:"3px 9px", fontSize:11, cursor:"pointer", color:t.textSub, fontFamily:"inherit", flexShrink:0 }}>Edit</button>
              </div>
            );
          })}
        </div>
      )}

      {/* ── LexOps overdue ── */}
      {intOverdueLexops.length > 0 && (
        <div style={{ background:"#fffbf0", border:"1.5px solid rgba(212,136,26,0.25)", borderRadius:12, padding:"16px 20px" }}>
          <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:12 }}>
            <span style={{ fontSize:16, lineHeight:1 }}>⏳</span>
            <div style={{ flex:1, fontSize:13, fontWeight:700, color:"#d4881a", fontFamily:"'Playfair Display',Georgia,serif" }}>LexOps actions overdue — action required from your team</div>
            <span style={{ fontSize:11, fontWeight:600, padding:"2px 10px", borderRadius:99, background:"rgba(212,136,26,0.12)", color:"#d4881a", flexShrink:0 }}>{intOverdueLexops.length} delayed</span>
          </div>
          {intOverdueLexops.map((task, i) => {
            const daysLate = Math.floor((todayMid - new Date(task.due_date)) / 86400000);
            return (
              <div key={task.id} style={{ display:"flex", alignItems:"center", gap:12, padding:"9px 0", borderTop: i===0?"1px solid rgba(212,136,26,0.12)":"1px solid rgba(212,136,26,0.08)" }}>
                <div style={{ flex:1, fontSize:13, fontWeight:500, color:"#1a1f1e" }}>{task.title}</div>
                <span style={{ fontSize:11, fontWeight:600, padding:"2px 9px", borderRadius:99, background:"#fef6e8", color:"#d4881a", flexShrink:0 }}>
                  {daysLate === 0 ? "Due today" : `${daysLate}d delayed`}
                </span>
                <button onClick={()=>startEdit(task)} style={{ background:"transparent", border:`1px solid ${t.border}`, borderRadius:6, padding:"3px 9px", fontSize:11, cursor:"pointer", color:t.textSub, fontFamily:"inherit", flexShrink:0 }}>Edit</button>
              </div>
            );
          })}
        </div>
      )}

      {phases.map(ph=><PhaseSection key={ph.id} phase={ph} phaseTasks={phaseTaskMap[ph.id]||[]}/>)}
      {unphased.length>0&&(
        <div>
          <div style={{ fontSize:11, fontWeight:600, color:t.textSub, textTransform:"uppercase", letterSpacing:"0.07em", padding:"8px 4px", marginBottom:8 }}>No Milestone Assigned</div>
          {unphased.map(task=><TaskRow key={task.id} task={task}/>)}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Internal Resources Tab (admin-editable docs + tools, mirrors client view)
// ---------------------------------------------------------------------------
function InternalResourcesTab({ projectId, initialDocuments, t, mobile, onRefresh }) {
  const [docs, setDocs] = useState(initialDocuments || []);
  const [tools, setTools] = useState([]);
  const [projectPhases, setProjectPhases] = useState([]);
  const [uploadError, setUploadError] = useState(null);
  const [phaseFilter, setPhaseFilter] = useState("all");
  const [uploading, setUploading] = useState(false);
  const [uploadPhase, setUploadPhase] = useState("");
  const [deletingDocId, setDeletingDocId] = useState(null);
  const [editingDocId, setEditingDocId] = useState(null);
  const [editDocForm, setEditDocForm] = useState({ name: "", phase_name: "" });
  const [docSaving, setDocSaving] = useState(false);
  const [docSaveError, setDocSaveError] = useState("");
  const [showAddTool, setShowAddTool] = useState(false);
  const [editingToolId, setEditingToolId] = useState(null);
  const [editToolForm, setEditToolForm] = useState({ name: "", purpose: "", url: "", logo_emoji: "🔧" });
  const [newTool, setNewTool] = useState({ name:"", purpose:"", url:"", logo_emoji:"🔧" });
  const [toolSaving, setToolSaving] = useState(false);
  const [toolError, setToolError] = useState("");

  const load = useCallback(async () => {
    const [{ data:d }, tl, { data:ph }] = await Promise.all([
      supabase.from("documents").select("*").eq("project_id", projectId).order("uploaded_at",{ascending:false}),
      supabase.from("project_tools").select("*").eq("project_id", projectId).order("sort_order").then(r => r),
      supabase.from("phases").select("id,name,sort_order").eq("project_id", projectId).order("sort_order"),
    ]);
    if (d) setDocs(d);
    if (ph) setProjectPhases(ph);
    if (tl?.data) {
      setTools(tl.data);
    }
  }, [projectId]);
  useEffect(() => { load(); }, [load]);

  // Phase names: merge project phases + any names already embedded in docs (preserves old tags)
  const phaseNames = [...new Set([
    ...projectPhases.map(p => p.name),
    ...docs.map(d => d.phase_name).filter(Boolean),
  ])];
  const filteredDocs = phaseFilter === "all" ? docs : docs.filter(d => d.phase_name === phaseFilter);

  async function handleUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    setUploading(true);
    setUploadError(null);

    // Get auth token
    let token;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      token = session?.access_token;
    } catch { token = null; }

    if (!token) {
      setUploadError("Not authenticated — please refresh and sign in again.");
      setUploading(false);
      return;
    }

    // Send file to backend via multipart — backend uses service-role key for storage + DB
    const formData = new FormData();
    formData.append("file", file);
    formData.append("project_id", projectId);
    if (uploadPhase) formData.append("phase_name", uploadPhase);

    try {
      const resp = await fetch("/api/admin/upload-document", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err.message || `Upload failed (HTTP ${resp.status})`);
      }
      const result = await resp.json();
      const newDoc = result?.data || {
        id: Date.now().toString(), project_id:projectId, name:file.name,
        file_type: file.name.split(".").pop()?.toUpperCase() || "FILE",
        file_size: file.size, uploaded_at: new Date().toISOString(),
        phase_name: uploadPhase || null,
      };
      setDocs(ds => [newDoc, ...ds]);
      onRefresh?.();
    } catch(err) {
      setUploadError(err.message || "Upload failed");
    }
    setUploading(false);
  }

  async function deleteDoc(doc) {
    setDeletingDocId(doc.id);
    let token;
    try { const { data:{ session } } = await supabase.auth.getSession(); token = session?.access_token; } catch { token = null; }
    try {
      const resp = await fetch(`/api/admin/documents/${doc.id}`, {
        method: "DELETE",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!resp.ok) { const e = await resp.json().catch(()=>({})); throw new Error(e.message || `HTTP ${resp.status}`); }
      setDocs(ds => ds.filter(d => d.id !== doc.id));
      onRefresh?.();
    } catch(err) {
      console.error("[InternalResourcesTab] delete error:", err.message);
    }
    setDeletingDocId(null);
  }

  async function updateDoc(e) {
    e.preventDefault();
    if (!editDocForm.name.trim()) return;
    setDocSaving(true);
    setDocSaveError("");
    const updatedName = editDocForm.name.trim();
    const updatedPhase = editDocForm.phase_name || null;

    // Use the dedicated phase endpoint which auto-falls-back if phase_name column missing
    let token;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      token = session?.access_token;
    } catch { token = null; }

    try {
      const resp = await fetch(`/api/admin/documents/${editingDocId}/phase`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ name: updatedName, phase_name: updatedPhase }),
      });
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err.message || `Save failed (HTTP ${resp.status})`);
      }
      setDocs(ds => ds.map(d => d.id === editingDocId ? { ...d, name: updatedName, phase_name: updatedPhase } : d));
      setEditingDocId(null);
      onRefresh?.();
    } catch(err) {
      setDocSaveError(err.message || "Could not save changes");
    }
    setDocSaving(false);
  }

  async function addTool(e) {
    e.preventDefault();
    if (!newTool.name.trim()) return;
    setToolSaving(true);
    setToolError("");
    const payload = { project_id:projectId, name:newTool.name.trim(), purpose:newTool.purpose.trim()||null, url:newTool.url.trim()||null, logo_emoji:newTool.logo_emoji||"🔧", sort_order:tools.length };
    try {
      const res = await dbWrite("project_tools","insert", payload);
      const added = res?.data || payload;
      setTools(ts => [...ts, added]);
      setNewTool({ name:"", purpose:"", url:"", logo_emoji:"🔧" });
      setShowAddTool(false);
      onRefresh?.();
    } catch(err) {
      console.error("[InternalResourcesTab] addTool failed:", err.message);
      setToolError(err.message || "Could not save tool");
    }
    setToolSaving(false);
  }

  async function updateTool(e) {
    e.preventDefault();
    if (!editToolForm.name.trim()) return;
    setToolSaving(true);
    setToolError("");
    const updates = { name: editToolForm.name.trim(), purpose: editToolForm.purpose.trim()||null, url: editToolForm.url.trim()||null, logo_emoji: editToolForm.logo_emoji||"🔧" };
    try {
      await dbWrite("project_tools", "update", updates, { id: editingToolId });
      setTools(ts => ts.map(t => t.id === editingToolId ? { ...t, ...updates } : t));
      setEditingToolId(null);
      onRefresh?.();
    } catch(err) {
      console.error("[InternalResourcesTab] updateTool failed:", err.message);
      setToolError(err.message || "Could not save tool");
    }
    setToolSaving(false);
  }

  async function deleteTool(id) {
    try {
      await dbWrite("project_tools","delete",null,{id});
      setTools(ts => ts.filter(t => t.id !== id));
    } catch(err) {
      console.error("[InternalResourcesTab] deleteTool failed:", err.message);
    }
  }

  function docIcon(ft) {
    const e = (ft||"").toLowerCase();
    if (e==="pdf") return { emoji:"📄", bg:"#fde8e8" };
    if (["xls","xlsx","csv"].includes(e)) return { emoji:"📊", bg:"#e8f5e8" };
    return { emoji:"📝", bg:"#e8eef8" };
  }

  return (
    <div style={{ display:"grid", gridTemplateColumns:mobile?"1fr":"1fr 1fr", gap:28 }}>
      {/* ── Docs ── */}
      <div>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:14, paddingBottom:10, borderBottom:`1.5px solid ${t.border}` }}>
          <span style={{ fontSize:11, fontWeight:600, color:t.textSub, letterSpacing:"1px", textTransform:"uppercase" }}>📁 Documents</span>
          <label style={{ background:t.accent, color:"#fff", borderRadius:6, padding:"4px 12px", fontSize:11, fontWeight:600, cursor:"pointer", fontFamily:"inherit", whiteSpace:"nowrap" }}>
            {uploading?"Uploading…":"+ Upload"}
            <input type="file" style={{ display:"none" }} onChange={handleUpload} disabled={uploading}/>
          </label>
        </div>
        {uploadError&&<div style={{marginBottom:8,padding:"7px 12px",background:"rgba(192,57,43,0.08)",border:"1px solid rgba(192,57,43,0.2)",borderRadius:6,fontSize:11,color:"#c0392b"}}>{uploadError}</div>}
        <div style={{ display:"flex", gap:6, marginBottom:10, flexWrap:"wrap", alignItems:"center" }}>
          <select value={uploadPhase} onChange={e=>setUploadPhase(e.target.value)}
            style={{ background:"#fff", border:`1px solid ${t.border}`, borderRadius:6, padding:"4px 8px", fontSize:11, color:t.textSub, fontFamily:"inherit" }}>
            <option value="">Tag with milestone (optional)</option>
            {phaseNames.map(ph=><option key={ph} value={ph}>{ph}</option>)}
          </select>
        </div>
        {phaseNames.length>0&&(
          <div style={{ display:"flex", gap:6, marginBottom:14, flexWrap:"wrap" }}>
            {["all",...phaseNames].map(ph=>(
              <button key={ph} onClick={()=>setPhaseFilter(ph)} style={{ padding:"4px 12px", borderRadius:99, fontSize:11, fontWeight:500, background:phaseFilter===ph?"#e8f2f1":t.surface, color:phaseFilter===ph?t.accent:t.textSub, border:`1.5px solid ${phaseFilter===ph?"rgba(26,102,102,0.25)":"transparent"}`, cursor:"pointer", fontFamily:"inherit" }}>
                {ph==="all"?"All":ph}
              </button>
            ))}
          </div>
        )}
        {filteredDocs.length===0?(
          <div style={{ textAlign:"center", padding:"32px 24px", background:"#fff", borderRadius:10, border:`1px solid ${t.border}` }}>
            <div style={{ fontSize:24, marginBottom:8 }}>📁</div>
            <div style={{ fontSize:13, fontWeight:600, color:t.text, marginBottom:4 }}>No documents yet</div>
            <div style={{ fontSize:12, color:t.textSub }}>Upload files using the button above.</div>
          </div>
        ):filteredDocs.map(doc=>{
          const ext=doc.file_type||doc.name?.split(".").pop()?.toUpperCase()||"FILE";
          const icon=docIcon(ext);
          const isEditing = editingDocId === doc.id;

          if (isEditing) {
            return (
              <form key={doc.id} onSubmit={updateDoc} style={{ background:"#fff", borderRadius:8, border:`2px solid ${t.accent}`, padding:"12px 14px", marginBottom:8, display:"flex", flexDirection:"column", gap:10, boxShadow:t.shadow }}>
                <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                  <div style={{ width:34, height:34, borderRadius:7, display:"flex", alignItems:"center", justifyContent:"center", fontSize:15, flexShrink:0, background:icon.bg }}>{icon.emoji}</div>
                  <input autoFocus value={editDocForm.name} onChange={e=>{setEditDocForm(f=>({...f,name:e.target.value}));setDocSaveError("");}}
                    style={{ background:t.surface, border:`1px solid ${t.border}`, borderRadius:6, padding:"6px 10px", fontSize:13, fontFamily:"inherit", color:t.text, flex:1 }}/>
                </div>
                <div style={{ display:"flex", gap:8, alignItems:"center", justifyContent:"space-between" }}>
                  <select value={editDocForm.phase_name || ""} onChange={e=>{setEditDocForm(f=>({...f,phase_name:e.target.value}));setDocSaveError("");}}
                    style={{ background:t.surface, border:`1px solid ${t.border}`, borderRadius:6, padding:"4px 8px", fontSize:11, color:t.textSub, fontFamily:"inherit" }}>
                    <option value="">No milestone</option>
                    {phaseNames.map(ph=><option key={ph} value={ph}>{ph}</option>)}
                  </select>
                  <div style={{ display:"flex", gap:6 }}>
                    <button type="button" onClick={()=>{setEditingDocId(null);setDocSaveError("");}} style={{ background:"transparent", border:`1px solid ${t.border}`, borderRadius:6, padding:"4px 10px", fontSize:11, color:t.textSub, cursor:"pointer" }}>Cancel</button>
                    <button type="submit" disabled={docSaving || !editDocForm.name.trim()} style={{ background:t.accent, border:"none", borderRadius:6, padding:"4px 12px", fontSize:11, fontWeight:600, color:"#fff", cursor:"pointer" }}>
                      {docSaving?"Saving…":"Save"}
                    </button>
                  </div>
                </div>
                {docSaveError && docSaveError !== "__phase_missing__" && (
                  <div style={{ fontSize:11, color:"#c0392b", background:"#fdf3f2", border:"1px solid #f5c6c6", borderRadius:6, padding:"6px 10px" }}>
                    Could not save: {docSaveError}
                  </div>
                )}
              </form>
            );
          }

          return(
            <div key={doc.id} style={{ display:"flex", alignItems:"center", gap:12, background:"#fff", borderRadius:8, border:`1px solid ${t.border}`, padding:"12px 14px", marginBottom:8, boxShadow:"0 1px 3px rgba(26,74,71,0.06)" }}>
              <div style={{ width:34, height:34, borderRadius:7, display:"flex", alignItems:"center", justifyContent:"center", fontSize:15, flexShrink:0, background:icon.bg }}>{icon.emoji}</div>
              <div style={{ flex:1, minWidth:0 }}>
                <a href={doc.file_url} target="_blank" rel="noreferrer" style={{ fontSize:13, fontWeight:600, color:t.text, textDecoration:"none", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", display:"block" }}>{doc.name}</a>
                <div style={{ fontSize:11, color:t.textSub }}>{doc.uploaded_at?new Date(doc.uploaded_at).toLocaleDateString("en-GB",{day:"numeric",month:"short",year:"numeric"}):""}{doc.file_type?` · ${doc.file_type}`:""}</div>
              </div>
              {doc.phase_name&&<span style={{ fontSize:10, padding:"2px 8px", background:"#e8f2f1", color:t.accent, borderRadius:99, fontWeight:500, flexShrink:0 }}>{doc.phase_name}</span>}
              <div style={{ display:"flex", alignItems:"center", gap:4 }}>
                <button onClick={() => { setEditingDocId(doc.id); setEditDocForm({ name: doc.name, phase_name: doc.phase_name || "" }); }} style={{ background:"transparent", border:"none", color:t.textSub, cursor:"pointer", fontSize:14, padding:"2px", opacity:0.5 }}>✏️</button>
                <button onClick={()=>deleteDoc(doc)} disabled={deletingDocId===doc.id} style={{ background:"transparent", border:"none", color:t.textSub, cursor:"pointer", fontSize:16, padding:"2px 4px", opacity:deletingDocId===doc.id?0.3:0.5, lineHeight:1, flexShrink:0 }}>×</button>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Tools ── */}
      <div>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:14, paddingBottom:10, borderBottom:`1.5px solid ${t.border}` }}>
          <span style={{ fontSize:11, fontWeight:600, color:t.textSub, letterSpacing:"1px", textTransform:"uppercase" }}>🔧 Tools</span>
          <button onClick={()=>setShowAddTool(s=>!s)} style={{ background:t.accent, color:"#fff", border:"none", borderRadius:6, padding:"4px 12px", fontSize:11, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>+ Add Tool</button>
        </div>

        {showAddTool&&(
          <form onSubmit={addTool} style={{ background:t.surface, border:`1px solid ${t.border}`, borderRadius:10, padding:"14px 16px", marginBottom:14, display:"flex", flexDirection:"column", gap:10 }}>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 60px", gap:8 }}>
              <input autoFocus value={newTool.name} onChange={e=>setNewTool(f=>({...f,name:e.target.value}))} placeholder="Tool name *" required
                style={{ background:"#fff", border:`1px solid ${t.border}`, borderRadius:6, padding:"7px 10px", fontSize:12, fontFamily:"inherit", color:t.text, width:"100%", boxSizing:"border-box" }}/>
              <input value={newTool.logo_emoji} onChange={e=>setNewTool(f=>({...f,logo_emoji:e.target.value}))} placeholder="🔧"
                style={{ background:"#fff", border:`1px solid ${t.border}`, borderRadius:6, padding:"7px 8px", fontSize:16, textAlign:"center", width:"100%", boxSizing:"border-box" }}/>
            </div>
            <input value={newTool.purpose} onChange={e=>setNewTool(f=>({...f,purpose:e.target.value}))} placeholder="Purpose / description"
              style={{ background:"#fff", border:`1px solid ${t.border}`, borderRadius:6, padding:"7px 10px", fontSize:12, fontFamily:"inherit", color:t.text, width:"100%", boxSizing:"border-box" }}/>
            <input value={newTool.url} onChange={e=>setNewTool(f=>({...f,url:e.target.value}))} placeholder="https://…"
              style={{ background:"#fff", border:`1px solid ${t.border}`, borderRadius:6, padding:"7px 10px", fontSize:12, fontFamily:"inherit", color:t.text, width:"100%", boxSizing:"border-box" }}/>
            <div style={{ display:"flex", gap:8, justifyContent:"flex-end" }}>
              <button type="button" onClick={()=>setShowAddTool(false)} style={{ background:"transparent", border:`1px solid ${t.border}`, borderRadius:6, padding:"6px 14px", fontSize:12, color:t.textSub, cursor:"pointer" }}>Cancel</button>
              <button type="submit" disabled={toolSaving||!newTool.name.trim()} style={{ background:t.accent, border:"none", borderRadius:6, padding:"6px 16px", fontSize:12, fontWeight:600, color:"#fff", cursor:"pointer", opacity:!newTool.name.trim()?0.5:1 }}>
                {toolSaving?"Saving…":"Add"}
              </button>
            </div>
            {toolError&&<div style={{padding:"6px 10px",background:"rgba(192,57,43,0.08)",border:"1px solid rgba(192,57,43,0.2)",borderRadius:6,fontSize:11,color:"#c0392b"}}>{toolError}</div>}
          </form>
        )}
        {toolError&&!showAddTool&&!editingToolId&&<div style={{marginBottom:8,padding:"6px 10px",background:"rgba(192,57,43,0.08)",border:"1px solid rgba(192,57,43,0.2)",borderRadius:6,fontSize:11,color:"#c0392b"}}>{toolError}</div>}
        {tools.length===0&&!showAddTool?(
          <div style={{ textAlign:"center", padding:"32px 24px", background:"#fff", borderRadius:10, border:`1px solid ${t.border}` }}>
            <div style={{ fontSize:24, marginBottom:8 }}>🔧</div>
            <div style={{ fontSize:13, fontWeight:600, color:t.text, marginBottom:4 }}>No tools yet</div>
            <div style={{ fontSize:12, color:t.textSub }}>Add platforms and tools set up for this client.</div>
          </div>
        ):tools.map(tool=>{
          const isEditing = editingToolId === tool.id;
          if (isEditing) {
            return (
              <form key={tool.id} onSubmit={updateTool} style={{ background:t.surface, border:`1px solid ${t.accent}`, borderRadius:10, padding:"14px 16px", marginBottom:10, display:"flex", flexDirection:"column", gap:10 }}>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 60px", gap:8 }}>
                  <input autoFocus value={editToolForm.name} onChange={e=>setEditToolForm(f=>({...f,name:e.target.value}))} placeholder="Tool name *" required
                    style={{ background:"#fff", border:`1px solid ${t.border}`, borderRadius:6, padding:"7px 10px", fontSize:12, fontFamily:"inherit", color:t.text, width:"100%", boxSizing:"border-box" }}/>
                  <input value={editToolForm.logo_emoji} onChange={e=>setEditToolForm(f=>({...f,logo_emoji:e.target.value}))} placeholder="🔧"
                    style={{ background:"#fff", border:`1px solid ${t.border}`, borderRadius:6, padding:"7px 8px", fontSize:16, textAlign:"center", width:"100%", boxSizing:"border-box" }}/>
                </div>
                <input value={editToolForm.purpose} onChange={e=>setEditToolForm(f=>({...f,purpose:e.target.value}))} placeholder="Purpose / description"
                  style={{ background:"#fff", border:`1px solid ${t.border}`, borderRadius:6, padding:"7px 10px", fontSize:12, fontFamily:"inherit", color:t.text, width:"100%", boxSizing:"border-box" }}/>
                <input value={editToolForm.url} onChange={e=>setEditToolForm(f=>({...f,url:e.target.value}))} placeholder="https://…"
                  style={{ background:"#fff", border:`1px solid ${t.border}`, borderRadius:6, padding:"7px 10px", fontSize:12, fontFamily:"inherit", color:t.text, width:"100%", boxSizing:"border-box" }}/>
                <div style={{ display:"flex", gap:8, justifyContent:"flex-end" }}>
                  <button type="button" onClick={()=>setEditingToolId(null)} style={{ background:"transparent", border:`1px solid ${t.border}`, borderRadius:6, padding:"6px 14px", fontSize:12, color:t.textSub, cursor:"pointer" }}>Cancel</button>
                  <button type="submit" disabled={toolSaving||!editToolForm.name.trim()} style={{ background:t.accent, border:"none", borderRadius:6, padding:"6px 16px", fontSize:12, fontWeight:600, color:"#fff", cursor:"pointer" }}>
                    {toolSaving?"Saving…":"Save"}
                  </button>
                </div>
              </form>
            );
          }
          return (
            <div key={tool.id} style={{ background:"#fff", border:`1px solid ${t.border}`, borderRadius:10, padding:"14px 16px", marginBottom:10, display:"flex", alignItems:"center", gap:14, boxShadow:"0 1px 3px rgba(26,74,71,0.06)" }}>
              <div style={{ width:38, height:38, borderRadius:8, background:t.surface, display:"flex", alignItems:"center", justifyContent:"center", fontSize:18, flexShrink:0 }}>{tool.logo_emoji||"🔧"}</div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:13, fontWeight:600, color:t.text, marginBottom:2 }}>{tool.name}</div>
                {tool.purpose&&<div style={{ fontSize:12, color:t.textSub, lineHeight:1.4 }}>{tool.purpose}</div>}
              </div>
              <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                {tool.url&&<a href={tool.url} target="_blank" rel="noreferrer" style={{ padding:"6px 14px", borderRadius:8, background:t.accent, color:"#fff", fontSize:12, fontWeight:600, textDecoration:"none", whiteSpace:"nowrap", flexShrink:0 }}>Launch ↗</a>}
                <button onClick={() => { setEditingToolId(tool.id); setEditToolForm({ name: tool.name, purpose: tool.purpose || "", url: tool.url || "", logo_emoji: tool.logo_emoji || "🔧" }); }}
                  style={{ background:"transparent", border:"none", color:t.textSub, cursor:"pointer", fontSize:14, padding:"2px 4px", opacity:0.5 }}>✏️</button>
                <button onClick={()=>deleteTool(tool.id)} style={{ background:"transparent", border:"none", color:t.textSub, cursor:"pointer", fontSize:16, padding:"2px 4px", opacity:0.4, lineHeight:1, flexShrink:0 }}>×</button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function LexOpsDashboard({ onLogout, userProfile, navigate }) {
  const isClient = userProfile?.role === "client";
  const isAdmin = userProfile?.role === "lexops_admin";
  const allowedProjectIds = userProfile?.allowedProjectIds || [];
  const [projects,setProjects]=useState([]);
  const [loading,setLoading]=useState(true);
  const [mode,setMode]=useState("dark");
  const [profileOpen,setProfileOpen]=useState(false);
  const [view,setView]=useState(isClient ? "client" : "internal");
  const [selected,setSelected]=useState(null);
  const [tab,setTab]=useState("overview");
  const [adminOpen,setAdminOpen]=useState(false);
  const [sidebarOpen,setSidebarOpen]=useState(false);
  const [setupOpen,setSetupOpen]=useState(false);
  const [showWelcome,setShowWelcome]=useState(false);
  const [teamMembers,setTeamMembers]=useState([]);
  const lastLoadRef=useRef(0);
  const mobile=useIsMobile(768);
  const t=themes[mode];

  // Fetch team members for assignee dropdown: internal staff + project client members
  useEffect(()=>{
    if(isClient||!selected) return;
    (async()=>{
      const [{data:internalUsers,error:intErr},{data:projectMembers,error:pmErr}]=await Promise.all([
        supabase.from("profiles").select("id,full_name,email,role").in("role",["lexops_admin","lexops_member"]).order("full_name",{ascending:true}),
        supabase.from("project_members").select("user_id, profiles(id, full_name, email, role)").eq("project_id",selected.id),
      ]);
      if(intErr) console.error("[Dashboard] Failed to fetch internal users:",intErr.message);
      if(pmErr) console.error("[Dashboard] Failed to fetch project members:",pmErr.message);
      const clientUsers=(projectMembers||[]).map(pm=>pm.profiles).filter(Boolean);
      const internalIds=new Set((internalUsers||[]).map(u=>u.id));
      const allUsers=[
        ...(internalUsers||[]),
        ...clientUsers.filter(u=>!internalIds.has(u.id)),
      ];
      setTeamMembers(allUsers);
    })();
  },[isClient,selected?.id]);

  const loadProjects=useCallback(async({silent=false}={})=>{
    if(!silent) setLoading(true);
    let query;
    if(isClient){
      console.log("[Dashboard] Client allowedProjectIds:", JSON.stringify(allowedProjectIds));
      if(allowedProjectIds.length===0){console.log("[Dashboard] No project memberships found — blank screen");setProjects([]);lastLoadRef.current=Date.now();setLoading(false);return;}
      query=supabase.from("projects").select("*").in("id",allowedProjectIds);
    } else {
      query=supabase.from("projects").select("*, clients(name)");
    }
    const {data:rows,error:queryErr}=await query.order("id");
    if(isClient) console.log("[Dashboard] Projects query:", {ids: allowedProjectIds, rows, error: queryErr?.message});
    if(!rows||rows.length===0){setProjects([]);lastLoadRef.current=Date.now();setLoading(false);return;}
    const full=await Promise.all(rows.map(async row=>{
      const related=await fetchProjectData(row.id);
      return normalizeProject(row,related);
    }));
    setProjects(full);
    setSelected(prev=>{
      if(prev){const updated=full.find(p=>p.id===prev.id);return updated||full[0]||null;}
      return full[0]||null;
    });
    if(isClient && userProfile && !userProfile.has_seen_welcome){
      setShowWelcome(true);
    }
    lastLoadRef.current=Date.now();
    setLoading(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[]);

  useEffect(()=>{ loadProjects(); },[loadProjects]);

  // Resilience: re-fetch data when tab becomes visible again after a long absence.
  // Uses a 5-minute cooldown so quick tab switches don't trigger a reload.
  // Focus listener removed — it fires on any window focus change which is too aggressive.
  useEffect(()=>{
    const handleVisibility=async()=>{
      if(document.visibilityState!=="visible") return;
      // Do NOT call onLogout on null session — getSession() can transiently return null
      // during a token refresh on tab-return, which would incorrectly sign the user out.
      // Actual sign-outs are handled by the onAuthStateChange listener in App.tsx.
      if(Date.now()-lastLoadRef.current < 5*60*1000) return;
      loadProjects({silent:true});
    };
    document.addEventListener("visibilitychange",handleVisibility);
    return()=>{
      document.removeEventListener("visibilitychange",handleVisibility);
    };
  },[loadProjects,onLogout]);

  // Safety timeout: force loading to false after 5 seconds
  useEffect(()=>{
    if(!loading) return;
    const timer=setTimeout(()=>setLoading(false),5000);
    return()=>clearTimeout(timer);
  },[loading]);

  useEffect(()=>{
    if(adminOpen) document.title="LexOps | Admin";
    else if(selected?.project) document.title=`LexOps | ${selected.project}`;
    else document.title="LexOps | Client Portal";
  },[selected,adminOpen]);

  async function refreshProject(projectId){
    const related=await fetchProjectData(projectId);
    const {data:row}=await supabase.from("projects").select("*, clients(name)").eq("id",projectId).single();
    if(!row) return;
    const updated=normalizeProject(row,related);
    setProjects(prev=>prev.map(p=>p.id===projectId?updated:p));
    setSelected(prev=>prev?.id===projectId?updated:prev);
  }

  if(loading) return(
    <div style={{minHeight:"100vh",background:t.bg,display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:12}}>
      <div style={{width:32,height:32,border:`2px solid ${t.border}`,borderTop:`2px solid ${t.accent}`,borderRadius:"50%",animation:"spin 0.8s linear infinite"}}/>
      <span style={{color:t.textSub,fontSize:13}}>Loading projects…</span>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
  const isClientView = view === "client";
  const allTabs = ["overview","actions","resources","invoices","support"];
  const tabLabels = isClientView
    ? {overview:"Overview",actions:"Your Actions",resources:"Resources",invoices:"Invoices",support:"Support"}
    : {overview:"Overview",actions:"Actions",resources:"Resources",invoices:"Invoices",support:"Support"};

  async function dismissWelcome(){
    setShowWelcome(false);
    if(userProfile?.id){
      await dbWrite("profiles","update",{has_seen_welcome:true},{id:userProfile.id});
    }
  }

  return (
    <div style={{background:t.bg,minHeight:"100vh",fontFamily:"'Inter', sans-serif",color:t.text,display:"flex",flexDirection:"column",letterSpacing:"0.01em"}}>
      {showWelcome&&<WelcomeScreen userProfile={userProfile} project={selected} t={t} onDismiss={dismissWelcome}/>}
      {adminOpen&&<AdminPanel mode={mode} onClose={()=>setAdminOpen(false)}/>}
      {setupOpen&&selected&&<ProjectSetupDrawer project={selected} onClose={()=>setSetupOpen(false)} onRefresh={()=>refreshProject(selected.id)} t={t} mobile={mobile}/>}
      {/* Mobile sidebar overlay */}
      {mobile&&sidebarOpen&&<div onClick={()=>setSidebarOpen(false)} style={{position:"fixed",inset:0,zIndex:149,background:"rgba(0,0,0,0.5)"}}/>}
      {/* Nav bar */}
      <div style={{background:t.surface,borderBottom:`1px solid ${t.border}`,padding:mobile?"0 14px":"0 28px",height:56,display:"flex",alignItems:"center",justifyContent:"space-between",position:"sticky",top:0,zIndex:100,boxShadow:t.shadow}}>
        <div style={{display:"flex",alignItems:"center",gap:mobile?12:20}}>
          {mobile&&view==="internal"&&(
            <button onClick={()=>setSidebarOpen(s=>!s)} style={{background:"transparent",border:"none",color:t.textSub,fontSize:20,cursor:"pointer",padding:4,lineHeight:1,display:"flex",alignItems:"center"}}>
              {sidebarOpen?"✕":"☰"}
            </button>
          )}
          <LogoDark h={mobile?16:20}/>
          {!mobile&&<><div style={{width:1,height:16,background:t.border}}/><span style={{color:t.textSub,fontSize:12,letterSpacing:"0.02em"}}>Client Portal</span></>}
        </div>
        <div style={{display:"flex",alignItems:"center",gap:mobile?6:10,flexWrap:mobile?"wrap":"nowrap"}}>
          {isAdmin&&navigate&&<button onClick={()=>navigate("/admin/proposals")} style={{background:"transparent",border:`1px solid ${t.border}`,borderRadius:8,padding:mobile?"0 10px":"0 14px",height:34,fontSize:12,fontWeight:500,cursor:"pointer",color:t.textSub,transition:"all 0.15s",fontFamily:"inherit"}}>{mobile?"📋":"📋 Proposals"}</button>}{isAdmin&&<button onClick={()=>setAdminOpen(true)} style={{background:t.accentSoft,color:t.accentLight,border:`1px solid ${t.accent}30`,borderRadius:8,padding:mobile?"0 10px":"0 14px",height:34,fontSize:12,fontWeight:600,cursor:"pointer",transition:"all 0.15s"}}>{mobile?"⚙":"Admin"}</button>}
          {!isClient&&<div style={{display:"flex",background:t.surfaceHigh,borderRadius:8,border:`1px solid ${t.border}`,padding:3,gap:2}}>
            {[["internal",mobile?"Int":"Internal"],["client",mobile?"Client":"Client View"]].map(([k,l])=>(
              <button key={k} onClick={()=>{setView(k);setTab("overview");}} style={{background:view===k?t.accent:"transparent",color:view===k?"#fff":t.textSub,border:"none",borderRadius:6,padding:mobile?"5px 8px":"5px 14px",fontSize:mobile?11:12,fontWeight:600,cursor:"pointer",transition:"all 0.15s"}}>{l}</button>
            ))}
          </div>}
          {/* Profile avatar + dropdown */}
          <div style={{position:"relative"}}>
            <button onClick={()=>setProfileOpen(o=>!o)} style={{
              width:34,height:34,borderRadius:"50%",background:t.accent,border:"none",
              display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",
              fontSize:12,fontWeight:700,color:"#fff",letterSpacing:"0.02em",flexShrink:0,
            }}>
              {(userProfile?.full_name||"").split(" ").map(w=>w[0]).filter(Boolean).slice(0,2).join("").toUpperCase()||"?"}
            </button>
            {profileOpen&&(
              <>
                <div onClick={()=>setProfileOpen(false)} style={{position:"fixed",inset:0,zIndex:199}}/>
                <div style={{
                  position:"absolute",right:0,top:42,zIndex:200,width:240,
                  background:t.surface,border:`1px solid ${t.border}`,borderRadius:12,
                  boxShadow:"0 8px 32px rgba(0,0,0,0.25)",overflow:"hidden",
                }}>
                  <div style={{padding:"16px 18px",borderBottom:`1px solid ${t.border}`}}>
                    <div style={{color:t.text,fontSize:14,fontWeight:600,marginBottom:2}}>{userProfile?.full_name||"User"}</div>
                    <div style={{color:t.textSub,fontSize:12,marginBottom:10}}>{userProfile?.email||""}</div>
                    <span style={{
                      display:"inline-flex",alignItems:"center",gap:4,
                      background:t.accentSoft,color:t.accentLight,border:`1px solid ${t.accent}30`,
                      borderRadius:99,padding:"2px 9px",fontSize:11,fontWeight:600,
                    }}>
                      {userProfile?.role==="lexops_admin"?"Admin":userProfile?.role==="lexops_member"?"Team Member":"Client"}
                    </span>
                  </div>
                  {onLogout&&(
                    <button onClick={()=>{setProfileOpen(false);onLogout();}} style={{
                      width:"100%",padding:"12px 18px",background:"transparent",border:"none",
                      color:t.red,fontSize:13,fontWeight:500,cursor:"pointer",textAlign:"left",
                      fontFamily:"inherit",
                    }}>
                      Sign out
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
      <div style={{display:"flex",flex:1,overflow:"visible",...(mobile?{minHeight:"calc(100vh - 56px)"}:{height:"calc(100vh - 56px)"})}}>
        {view==="internal"&&(
          <div style={{
            width:280,borderRight:`1px solid ${t.border}`,background:t.surface,display:"flex",flexDirection:"column",flexShrink:0,
            ...(mobile?{position:"fixed",top:56,bottom:0,left:0,zIndex:150,transform:sidebarOpen?"translateX(0)":"translateX(-100%)",transition:"transform 0.25s ease",boxShadow:sidebarOpen?"4px 0 20px rgba(0,0,0,0.3)":"none"}:{}),
          }}>
            <div style={{padding:"20px 20px 16px"}}>
              <div style={{color:t.textSub,fontSize:10,fontWeight:700,letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:14}}>Projects</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                {[{label:"Active",val:projects.filter(p=>p.status==="active").length,color:t.green},{label:"Complete",val:projects.filter(p=>p.status==="complete").length,color:t.accentLight}].map((s,i)=>(
                  <div key={i} style={{background:t.surfaceHigh,border:`1px solid ${t.border}`,borderRadius:9,padding:"11px 14px"}}>
                    <div style={{color:s.color,fontSize:22,fontWeight:300,letterSpacing:"-0.04em"}}>{s.val}</div>
                    <div style={{color:t.textSub,fontSize:11,marginTop:1}}>{s.label}</div>
                  </div>
                ))}
              </div>
            </div>
            <Line t={t}/>
            <div style={{flex:1,overflowY:"auto"}}>
              {projects.map((p,i)=>(
                <div key={p.id}>
                  <SidebarRow p={p} active={selected?.id===p.id} onClick={()=>{setSelected(p);setTab("overview");if(mobile)setSidebarOpen(false);}} t={t}/>
                  {i<projects.length-1&&<Line t={t}/>}
                </div>
              ))}
            </div>
          </div>
        )}
        <div style={{flex:1,overflowY:"auto",padding:mobile?"20px 16px":"32px 36px",paddingBottom:mobile?80:32}}>
          {selected&&(
            <>
              <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:mobile?16:24,gap:8}}>
                <div style={{minWidth:0}}>
                  <div style={{color:t.textSub,fontSize:12,marginBottom:5,letterSpacing:"0.02em"}}>{selected.client}</div>
                  <h1 style={{margin:"0 0 7px",fontSize:mobile?22:28,fontWeight:600,letterSpacing:"-0.01em",color:t.text,lineHeight:1.2,fontFamily:"'Playfair Display', Georgia, serif"}}>{selected.project}</h1>
                  <div style={{display:"flex",gap:mobile?10:18,alignItems:"center",flexWrap:"wrap"}}>
                    {!isClientView&&<ManagerEditor projectId={selected.id} value={selected.manager} t={t} onSaved={()=>refreshProject(selected.id)}/>}
                    <span style={{color:t.textSub,fontSize:12}}>Updated {selected.lastUpdate}</span>
                  </div>
                </div>
                <div style={{display:"flex",alignItems:"center",gap:10,flexShrink:0}}>
                  <Pill t={t} status={selected.status} label={selected.status==="complete"?"Complete":selected.phase}/>
                  {!isClientView&&<button onClick={()=>setSetupOpen(true)} style={{background:t.accent,color:"#fff",border:"none",borderRadius:8,padding:mobile?"6px 12px":"7px 16px",fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"inherit",display:"inline-flex",alignItems:"center",gap:6,whiteSpace:"nowrap",flexShrink:0}}>
                    <span style={{fontSize:13}}>⚙</span>{!mobile&&" Setup"}
                  </button>}
                </div>
              </div>
              <div style={{borderBottom:`1px solid ${t.border}`,marginBottom:mobile?16:24,overflowX:"auto",display:"flex",scrollbarWidth:"none",WebkitOverflowScrolling:"touch"}}>
                <style>{`.hide-scrollbar::-webkit-scrollbar{display:none}`}</style>
                <div className="hide-scrollbar" style={{display:"flex",overflowX:"auto",scrollbarWidth:"none",width:"100%"}}>
                  {allTabs.map(tb=>(
                    <button key={tb} data-tap onClick={()=>setTab(tb)} style={{background:"transparent",border:"none",borderBottom:tab===tb?`1.5px solid ${t.accent}`:"1.5px solid transparent",color:tab===tb?t.text:t.textSub,padding:mobile?"12px 14px":"8px 18px",fontSize:mobile?13:13,fontWeight:tab===tb?600:400,cursor:"pointer",whiteSpace:"nowrap",transition:"all 0.15s",marginBottom:-1,letterSpacing:"0.01em",flexShrink:0,minHeight:mobile?44:undefined}}>
                      {tabLabels[tb]}
                    </button>
                  ))}
                </div>
              </div>
              {tab==="overview"    && (isClientView
                ? <ClientOverviewTab project={selected} t={t} mobile={mobile}/>
                : <OverviewTab     project={selected} isInternal={true} t={t} mobile={mobile} onSetup={()=>setSetupOpen(true)}/>
              )}
              {tab==="actions"     && isClientView  && <ClientActionsTab   projectId={selected.id} initialTasks={(selected.tasks||[]).filter(tk=>!tk.is_internal && tk.owner==="client")} initialPhases={selected.phases} t={t} mobile={mobile}/>}
              {tab==="actions"     && !isClientView && <InternalActionsTab  projectId={selected.id} initialTasks={(selected.tasks||[]).filter(tk=>!tk.is_internal)} initialPhases={selected.phases} t={t} mobile={mobile} onRefresh={()=>refreshProject(selected.id)}/>}
              {tab==="resources"   && isClientView  && <ClientResourcesTab  projectId={selected.id} initialDocuments={selected.documents} t={t} mobile={mobile}/>}
              {tab==="resources"   && !isClientView && <InternalResourcesTab projectId={selected.id} initialDocuments={selected.documents} t={t} mobile={mobile} onRefresh={()=>refreshProject(selected.id)}/>}
              {tab==="invoices"    && <InvoicesTab     projectId={selected.id} initialInvoices={selected.invoices} isInternal={!isClientView} onRefresh={()=>refreshProject(selected.id)} project={selected} t={t} mobile={mobile}/>}
              {tab==="support"     && <SupportTab      projectId={selected.id} isInternal={!isClientView} project={selected} t={t} mobile={mobile} onRefresh={()=>refreshProject(selected.id)}/>}
            </>
          )}
        </div>
      </div>
      <div style={{borderTop:`1px solid ${t.border}`,padding:mobile?"10px 14px":"10px 28px",background:t.surface,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <span style={{color:t.textDim,fontSize:11}}>© 2026 LexOps · A Teams Squared Company</span>
        {!mobile&&<span style={{color:t.textDim,fontSize:11}}>hello@teamsquared.io</span>}
      </div>
    </div>
  );
}
