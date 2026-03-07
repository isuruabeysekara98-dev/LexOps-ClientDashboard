import { useState, useEffect, useCallback, useMemo } from "react";
import AdminPanel from "./AdminPanel";
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

const themes = {
  dark: {
    bg:"#0f1318", surface:"#161c24", surfaceHigh:"#1c2330",
    border:"rgba(255,255,255,0.07)", text:"#edf0f5", textSub:"#8b96a4", textDim:"#3d4650",
    accent:"#4a7fa5", accentLight:"#6a9fc0", accentSoft:"rgba(74,127,165,0.1)",
    green:"#4ade80", greenSoft:"rgba(74,222,128,0.08)",
    amber:"#f59e0b", amberSoft:"rgba(245,158,11,0.08)",
    red:"#f87171", redSoft:"rgba(248,113,113,0.08)",
    purple:"#a78bfa", purpleSoft:"rgba(167,139,250,0.08)",
    shadow:"0 1px 3px rgba(0,0,0,0.4)",
  },
  light: {
    bg:"#f4f5f7", surface:"#ffffff", surfaceHigh:"#eef0f4",
    border:"rgba(0,0,0,0.07)", text:"#1a2235", textSub:"#6b7280", textDim:"#c4cad3",
    accent:"#375971", accentLight:"#4a7fa5", accentSoft:"rgba(55,89,113,0.07)",
    green:"#16a34a", greenSoft:"rgba(22,163,74,0.07)",
    amber:"#d97706", amberSoft:"rgba(217,119,6,0.07)",
    red:"#dc2626", redSoft:"rgba(220,38,38,0.07)",
    purple:"#7c3aed", purpleSoft:"rgba(124,58,237,0.07)",
    shadow:"0 1px 3px rgba(0,0,0,0.06)",
  }
};

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
    supabase.from("phases").select("*").eq("project_id",projectId).order("id"),
    supabase.from("tasks").select("*").eq("project_id",projectId).order("id"),
    supabase.from("documents").select("*").eq("project_id",projectId).order("uploaded_at",{ascending:false}),
    supabase.from("invoices").select("*").eq("project_id",projectId).order("id"),
    supabase.from("software").select("*").eq("project_id",projectId).order("id"),
    supabase.from("maintenance").select("*").eq("project_id",projectId).order("id"),
    supabase.from("activity").select("*").eq("project_id",projectId).order("date",{ascending:false}).limit(20),
    supabase.from("document_requests").select("*").eq("project_id",projectId).order("requested_at",{ascending:false}),
  ]);
  return {
    phases:    phases.data     || [],
    tasks:     tasks.data      || [],
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
  return <div style={{color:t.textSub,fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.09em",marginBottom:14}}>{children}</div>;
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

function OverviewTab({project,isInternal,t,mobile}) {
  const daysLeft=project.dueDate ? Math.ceil((new Date(project.dueDate)-new Date())/86400000) : 0;
  const done=project.tasks.filter(tk=>tk.status==="done").length;
  const stats=[
    {label:"Progress",value:`${project.progress ?? 0}%`,sub:project.phase || "—",accent:true},
    {label:"Due Date",value:project.dueDate ? project.dueDate.slice(5).replace("-"," / ") : "TBD",sub:project.dueDate ? (daysLeft>0?`${daysLeft} days remaining`:"Past due") : ""},
    ...(isInternal?[{label:"Budget",value:`$${(project.budget ?? 0).toLocaleString()}`,sub:`$${(project.spent ?? 0).toLocaleString()} spent · ${project.budget ? Math.round((project.spent ?? 0)/project.budget*100) : 0}%`}]:[]),
    {label:"Tasks",value:`${done} / ${project.tasks.length}`,sub:"completed"},
  ];
  const iconMap={milestone:"◆",document:"↑",invoice:"$",update:"·"};
  const colorMap={milestone:t.accent,document:t.green,invoice:t.amber,update:t.textSub};
  return <div style={{display:"flex",flexDirection:"column",gap:20}}>
    <CardPad t={t}><SectionLabel t={t}>Project Summary</SectionLabel><p style={{color:t.textSub,fontSize:13,lineHeight:1.75,margin:0}}>{project.summary}</p></CardPad>
    <div style={{display:"grid",gridTemplateColumns:mobile?"1fr":`repeat(${stats.length},1fr)`,gap:12}}>
      {stats.map((s,i)=>(
        <div key={i} style={{background:t.surface,border:`1px solid ${t.border}`,borderRadius:12,padding:"18px 20px",boxShadow:t.shadow}}>
          <div style={{color:t.textSub,fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.09em",marginBottom:10}}>{s.label}</div>
          <div style={{color:s.accent?t.accentLight:t.text,fontSize:24,fontWeight:300,letterSpacing:"-0.04em",marginBottom:3}}>{s.value}</div>
          <div style={{color:t.textSub,fontSize:11}}>{s.sub}</div>
        </div>
      ))}
    </div>
    <Card t={t}>
      <div style={{padding:"18px 24px 14px"}}><SectionLabel t={t}>Project Phases</SectionLabel></div>
      <Line t={t}/>
      {project.phases.map((ph,i)=>(
        <div key={i}>
          <div style={{padding:"16px 24px",display:"flex",alignItems:"center",gap:16}}>
            <div style={{width:22,height:22,borderRadius:"50%",flexShrink:0,background:ph.status==="complete"?t.green:ph.status==="active"?t.accent:"transparent",border:`1.5px solid ${ph.status==="complete"?t.green:ph.status==="active"?t.accent:t.border}`,display:"flex",alignItems:"center",justifyContent:"center"}}>
              {ph.status==="complete"&&<span style={{color:"#fff",fontSize:10,fontWeight:800}}>✓</span>}
              {ph.status==="active"&&<span style={{width:6,height:6,borderRadius:"50%",background:"#fff",display:"block"}}/>}
            </div>
            <div style={{flex:1}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:7}}>
                <span style={{color:ph.status==="pending"?t.textSub:t.text,fontSize:13,fontWeight:500}}>{ph.name}</span>
                <Pill t={t} status={ph.status==="complete"?"complete":ph.status==="active"?"active":"pending"} label={ph.status==="complete"?"Done":ph.status==="active"?"Active":"Pending"}/>
              </div>
              <Thin value={ph.progress} t={t}/>
            </div>
          </div>
          {i<project.phases.length-1&&<Line t={t}/>}
        </div>
      ))}
    </Card>
    <Card t={t}>
      <div style={{padding:"18px 24px 14px"}}><SectionLabel t={t}>Recent Activity</SectionLabel></div>
      <Line t={t}/>
      <div style={{padding:"6px 0"}}>
        {project.activity.map((a,i)=>(
          <div key={i} style={{display:"flex",alignItems:"flex-start",gap:14,padding:"10px 24px"}}>
            <span style={{color:colorMap[a.type],fontSize:10,marginTop:2,flexShrink:0,fontWeight:700}}>{iconMap[a.type]}</span>
            <span style={{color:t.text,fontSize:13,flex:1}}>{a.text}</span>
            <span style={{color:t.textSub,fontSize:11,whiteSpace:"nowrap"}}>{a.date}</span>
          </div>
        ))}
      </div>
    </Card>
  </div>;
}

const TASK_STATUSES=[["todo","To Do"],["in-progress","In Progress"],["done","Done"]];
const EMPTY_TASK={title:"",assignee:"",due:"",status:"todo"};

function TasksTab({projectId,initialTasks,isInternal,onRefresh,t,mobile}) {
  const [tasks,setTasks]=useState(initialTasks||[]);
  const [filter,setFilter]=useState("all");
  const [showAdd,setShowAdd]=useState(false);
  const [newForm,setNewForm]=useState(EMPTY_TASK);
  const [editingId,setEditingId]=useState(null);
  const [editForm,setEditForm]=useState({});
  const [saving,setSaving]=useState(false);

  const loadTasks=useCallback(async()=>{
    const {data}=await supabase.from("tasks").select("*").eq("project_id",projectId).order("id");
    if(data) setTasks(data);
  },[projectId]);

  useEffect(()=>{loadTasks();},[loadTasks]);

  async function addTask(e){
    e.preventDefault();
    if(!newForm.title.trim()) return;
    setSaving(true);
    await supabase.from("tasks").insert({...newForm,project_id:projectId});
    setNewForm(EMPTY_TASK);
    setShowAdd(false);
    await loadTasks();
    setSaving(false);
    onRefresh?.();
  }

  function startEdit(task){
    setEditingId(task.id);
    setEditForm({title:task.title,assignee:task.assignee||"",due:task.due||"",status:task.status});
  }

  async function saveEdit(e,id){
    e.preventDefault();
    setSaving(true);
    await supabase.from("tasks").update(editForm).eq("id",id);
    setEditingId(null);
    await loadTasks();
    setSaving(false);
    onRefresh?.();
  }

  async function deleteTask(id){
    await supabase.from("tasks").delete().eq("id",id);
    setTasks(ts=>ts.filter(tk=>tk.id!==id));
    onRefresh?.();
  }

  const tc={done:{dot:t.green,label:"Done",lc:t.green},"in-progress":{dot:t.accent,label:"Active",lc:t.accentLight},todo:{dot:t.textDim,label:"To Do",lc:t.textSub}};
  const filtered=filter==="all"?tasks:tasks.filter(tk=>tk.status===filter);
  const counts={all:tasks.length,"in-progress":tasks.filter(x=>x.status==="in-progress").length,todo:tasks.filter(x=>x.status==="todo").length,done:tasks.filter(x=>x.status==="done").length};

  const inlineInput=(value,onChange,placeholder,style={})=>(
    <input value={value} onChange={onChange} placeholder={placeholder} style={{background:t.surfaceHigh,border:`1px solid ${t.border}`,borderRadius:6,padding:"5px 9px",fontSize:12,color:t.text,outline:"none",fontFamily:"inherit",minWidth:0,...style}}/>
  );
  const inlineSelect=(value,onChange)=>(
    <select value={value} onChange={onChange} style={{background:t.surfaceHigh,border:`1px solid ${t.border}`,borderRadius:6,padding:"5px 8px",fontSize:12,color:t.text,outline:"none",fontFamily:"inherit",cursor:"pointer"}}>
      {TASK_STATUSES.map(([v,l])=><option key={v} value={v}>{l}</option>)}
    </select>
  );

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
      <button onClick={()=>{setShowAdd(s=>!s);setEditingId(null);}} style={{background:t.accent,color:"#fff",border:"none",borderRadius:8,padding:"5px 14px",fontSize:12,fontWeight:600,cursor:"pointer",whiteSpace:"nowrap",fontFamily:"inherit"}}>+ Add Task</button>
    </div>

    <Card t={t} style={{overflowX:"auto"}}>
      {showAdd&&(
        <div>
          <form onSubmit={addTask} style={{display:"flex",alignItems:"center",gap:8,padding:"12px 18px",flexWrap:"wrap"}}>
            {inlineInput(newForm.title,e=>setNewForm(f=>({...f,title:e.target.value})),"Task title…",{flex:"1 1 180px"})}
            {isInternal&&inlineInput(newForm.assignee,e=>setNewForm(f=>({...f,assignee:e.target.value})),"Assignee",{flex:"0 1 120px"})}
            {inlineInput(newForm.due,e=>setNewForm(f=>({...f,due:e.target.value})),"Due date",{flex:"0 1 110px"})}
            {inlineSelect(newForm.status,e=>setNewForm(f=>({...f,status:e.target.value})))}
            <div style={{display:"flex",gap:6}}>
              <button type="submit" disabled={saving||!newForm.title.trim()} style={{background:t.accent,color:"#fff",border:"none",borderRadius:6,padding:"5px 14px",fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"inherit",opacity:saving||!newForm.title.trim()?0.5:1}}>
                {saving?"…":"Save"}
              </button>
              <button type="button" onClick={()=>{setShowAdd(false);setNewForm(EMPTY_TASK);}} style={{background:"transparent",color:t.textSub,border:`1px solid ${t.border}`,borderRadius:6,padding:"5px 10px",fontSize:12,cursor:"pointer",fontFamily:"inherit"}}>Cancel</button>
            </div>
          </form>
          <Line t={t}/>
        </div>
      )}

      {/* Task rows */}
      {filtered.length===0&&!showAdd
        ?<div style={{color:t.textSub,textAlign:"center",padding:"40px 0",fontSize:13}}>No tasks to display</div>
        :filtered.map((task,i)=>{
          const c=tc[task.status]||tc.todo;
          const isEditing=editingId===task.id;
          return(
            <div key={task.id}>
              {isEditing?(
                <form onSubmit={e=>saveEdit(e,task.id)} style={{display:"flex",alignItems:"center",gap:8,padding:"11px 18px",flexWrap:"wrap"}}>
                  {inlineInput(editForm.title,e=>setEditForm(f=>({...f,title:e.target.value})),"Title",{flex:"1 1 180px"})}
                  {isInternal&&inlineInput(editForm.assignee,e=>setEditForm(f=>({...f,assignee:e.target.value})),"Assignee",{flex:"0 1 120px"})}
                  {inlineInput(editForm.due,e=>setEditForm(f=>({...f,due:e.target.value})),"Due date",{flex:"0 1 110px"})}
                  {inlineSelect(editForm.status,e=>setEditForm(f=>({...f,status:e.target.value})))}
                  <div style={{display:"flex",gap:6}}>
                    <button type="submit" disabled={saving} style={{background:t.accent,color:"#fff",border:"none",borderRadius:6,padding:"5px 14px",fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"inherit",opacity:saving?0.5:1}}>
                      {saving?"…":"Save"}
                    </button>
                    <button type="button" onClick={()=>setEditingId(null)} style={{background:"transparent",color:t.textSub,border:`1px solid ${t.border}`,borderRadius:6,padding:"5px 10px",fontSize:12,cursor:"pointer",fontFamily:"inherit"}}>Cancel</button>
                  </div>
                </form>
              ):(
                <div style={{display:"flex",flexDirection:mobile?"column":"row",alignItems:mobile?"stretch":"center",justifyContent:"space-between",padding:mobile?"14px 16px":"13px 18px",gap:mobile?10:12}}>
                  <div style={{display:"flex",alignItems:"center",gap:12,minWidth:0}}>
                    <div style={{width:18,height:18,borderRadius:"50%",flexShrink:0,border:`1.5px solid ${c.dot}`,background:task.status==="done"?c.dot:"transparent",display:"flex",alignItems:"center",justifyContent:"center"}}>
                      {task.status==="done"&&<span style={{color:"#fff",fontSize:9,fontWeight:800}}>✓</span>}
                    </div>
                    <div style={{minWidth:0}}>
                      <div style={{color:task.status==="done"?t.textSub:t.text,fontSize:13,fontWeight:500,textDecoration:task.status==="done"?"line-through":"none",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{task.title}</div>
                      {isInternal&&task.assignee&&<div style={{color:t.textDim,fontSize:11,marginTop:1}}>{task.assignee}</div>}
                    </div>
                  </div>
                  <div style={{display:"flex",alignItems:"center",gap:mobile?8:12,flexShrink:0,justifyContent:mobile?"space-between":"flex-end"}}>
                    <span style={{color:t.textSub,fontSize:11,whiteSpace:"nowrap"}}>Due {task.due}</span>
                    <span style={{color:c.lc,fontSize:11,fontWeight:600,minWidth:40,textAlign:"right"}}>{c.label}</span>
                    <button onClick={()=>startEdit(task)} title="Edit" style={{background:"transparent",border:`1px solid ${t.border}`,borderRadius:6,width:26,height:26,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",color:t.textSub,fontSize:13,flexShrink:0}}>✏</button>
                    <button onClick={()=>deleteTask(task.id)} title="Delete" style={{background:"transparent",border:`1px solid ${t.border}`,borderRadius:6,width:26,height:26,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",color:t.red,fontSize:15,flexShrink:0}}>×</button>
                  </div>
                </div>
              )}
              {i<filtered.length-1&&<Line t={t}/>}
            </div>
          );
        })}
    </Card>
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
    await supabase.from("documents").insert({
      project_id:projectId,
      name:file.name,
      file_type:ext,
      file_size:file.size,
      file_url:publicUrl,
      storage_path:storagePath,
      uploaded_at:new Date().toISOString(),
    });
    await loadDocs();
    setUploading(false);
    onRefresh?.();
  }

  async function deleteDoc(doc){
    setDeletingId(doc.id);
    await supabase.storage.from("project-documents").remove([doc.storage_path]);
    await supabase.from("documents").delete().eq("id",doc.id);
    setDocs(ds=>ds.filter(d=>d.id!==doc.id));
    setDeletingId(null);
    onRefresh?.();
  }

  const tc={PDF:t.red,DOCX:t.accent,XLSX:t.green,PNG:t.green,JPG:t.green,CSV:t.amber};

  async function addDocRequest(e){
    e.preventDefault();
    if(!reqForm.title.trim()) return;
    setSavingReq(true);
    await supabase.from("document_requests").insert({project_id:projectId,title:reqForm.title,description:reqForm.description||null});
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

const INVOICE_STATUSES=[["upcoming","Upcoming"],["pending","Pending"],["paid","Paid"]];
const EMPTY_INVOICE={invoice_number:"",description:"",amount:"",status:"upcoming",due_date:""};

function InvoicesTab({projectId,initialInvoices,isInternal,onRefresh,t,mobile}) {
  const [invoices,setInvoices]=useState(initialInvoices||[]);
  const [showAdd,setShowAdd]=useState(false);
  const [newForm,setNewForm]=useState(EMPTY_INVOICE);
  const [editingId,setEditingId]=useState(null);
  const [editForm,setEditForm]=useState({});
  const [saving,setSaving]=useState(false);
  const [uploadingId,setUploadingId]=useState(null);
  const fileRef=useState(()=>({current:null,invoiceId:null}))[0];

  const loadInvoices=useCallback(async()=>{
    const {data}=await supabase.from("invoices").select("*").eq("project_id",projectId).order("id");
    if(data) setInvoices(data);
  },[projectId]);

  useEffect(()=>{loadInvoices();},[loadInvoices]);

  async function addInvoice(e){
    e.preventDefault();
    if(!newForm.invoice_number.trim()) return;
    setSaving(true);
    await supabase.from("invoices").insert({...newForm,amount:Number(newForm.amount)||0,project_id:projectId});
    setNewForm(EMPTY_INVOICE);
    setShowAdd(false);
    await loadInvoices();
    setSaving(false);
    onRefresh?.();
  }

  function startEdit(inv){
    setEditingId(inv.id);
    setEditForm({description:inv.description||"",status:inv.status||"upcoming",due_date:inv.due_date||""});
  }

  async function saveEdit(e,id){
    e.preventDefault();
    setSaving(true);
    await supabase.from("invoices").update(editForm).eq("id",id);
    setEditingId(null);
    await loadInvoices();
    setSaving(false);
    onRefresh?.();
  }

  async function deleteInvoice(id){
    await supabase.from("invoices").delete().eq("id",id);
    setInvoices(inv=>inv.filter(x=>x.id!==id));
    onRefresh?.();
  }

  async function handlePdfUpload(e,inv){
    const file=e.target.files?.[0];
    if(!file) return;
    e.target.value="";
    setUploadingId(inv.id);
    const storagePath=`${projectId}/invoices/${file.name}`;
    const {error:upErr}=await supabase.storage.from("project-documents").upload(storagePath,file,{upsert:true});
    if(upErr){console.error("[InvoicesTab] upload error:",upErr.message);setUploadingId(null);return;}
    const {data:{publicUrl}}=supabase.storage.from("project-documents").getPublicUrl(storagePath);
    await supabase.from("invoices").update({file_url:publicUrl}).eq("id",inv.id);
    await loadInvoices();
    setUploadingId(null);
    onRefresh?.();
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
    {isInternal&&(
      <div style={{display:"grid",gridTemplateColumns:mobile?"1fr":"repeat(3,1fr)",gap:12}}>
        {[{label:"Total Value",value:`$${(total||0).toLocaleString()}`,color:t.text},{label:"Collected",value:`$${(paid||0).toLocaleString()}`,color:t.green},{label:"Outstanding",value:`$${((total-paid)||0).toLocaleString()}`,color:t.amber}].map((s,i)=>(
          <div key={i} style={{background:t.surface,border:`1px solid ${t.border}`,borderRadius:12,padding:"18px 20px",boxShadow:t.shadow}}>
            <div style={{color:t.textSub,fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.09em",marginBottom:10}}>{s.label}</div>
            <div style={{color:s.color,fontSize:24,fontWeight:300,letterSpacing:"-0.04em"}}>{s.value}</div>
          </div>
        ))}
      </div>
    )}

    {isInternal&&(
      <div style={{display:"flex",justifyContent:"flex-end"}}>
        <button onClick={()=>{setShowAdd(s=>!s);setEditingId(null);}} style={{background:t.accent,color:"#fff",border:"none",borderRadius:8,padding:"5px 14px",fontSize:12,fontWeight:600,cursor:"pointer",whiteSpace:"nowrap",fontFamily:"inherit"}}>+ Add Invoice</button>
      </div>
    )}

    <Card t={t} style={{overflowX:"auto"}}>
      {showAdd&&isInternal&&(
        <div>
          <form onSubmit={addInvoice} style={{display:"flex",alignItems:"center",gap:8,padding:"12px 18px",flexWrap:"wrap"}}>
            {inlineInput(newForm.invoice_number,e=>setNewForm(f=>({...f,invoice_number:e.target.value})),"Invoice #",{flex:"0 1 100px"})}
            {inlineInput(newForm.description,e=>setNewForm(f=>({...f,description:e.target.value})),"Description",{flex:"1 1 180px"})}
            {inlineInput(newForm.amount,e=>setNewForm(f=>({...f,amount:e.target.value})),"Amount",{flex:"0 1 90px",type:"number"})}
            {inlineSelect(newForm.status,e=>setNewForm(f=>({...f,status:e.target.value})))}
            {inlineInput(newForm.due_date,e=>setNewForm(f=>({...f,due_date:e.target.value})),"Due date",{flex:"0 1 120px",type:"date"})}
            <div style={{display:"flex",gap:6}}>
              <button type="submit" disabled={saving||!newForm.invoice_number.trim()} style={{background:t.accent,color:"#fff",border:"none",borderRadius:6,padding:"5px 14px",fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"inherit",opacity:saving||!newForm.invoice_number.trim()?0.5:1}}>
                {saving?"…":"Save"}
              </button>
              <button type="button" onClick={()=>{setShowAdd(false);setNewForm(EMPTY_INVOICE);}} style={{background:"transparent",color:t.textSub,border:`1px solid ${t.border}`,borderRadius:6,padding:"5px 10px",fontSize:12,cursor:"pointer",fontFamily:"inherit"}}>Cancel</button>
            </div>
          </form>
          <Line t={t}/>
        </div>
      )}

      {invoices.length===0&&!showAdd
        ?<div style={{color:t.textSub,textAlign:"center",padding:"40px 0",fontSize:13}}>No invoices yet.</div>
        :invoices.map((inv,i)=>{
          const isEditing=editingId===inv.id;
          const label=inv.file_url
            ?<a href={inv.file_url} target="_blank" rel="noreferrer" style={{color:t.accentLight,textDecoration:"none",fontWeight:500,fontSize:13}}>{inv.description||inv.invoice_number}</a>
            :<span style={{color:t.text,fontSize:13,fontWeight:500}}>{inv.description||inv.invoice_number}</span>;
          return(
            <div key={inv.id}>
              {isEditing?(
                <form onSubmit={e=>saveEdit(e,inv.id)} style={{display:"flex",alignItems:"center",gap:8,padding:"12px 18px",flexWrap:"wrap"}}>
                  {inlineInput(editForm.description,e=>setEditForm(f=>({...f,description:e.target.value})),"Description",{flex:"1 1 180px"})}
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
                    {mobile&&<span style={{color:t.text,fontWeight:300,fontSize:18,letterSpacing:"-0.03em",flexShrink:0}}>${(inv.amount||0).toLocaleString()}</span>}
                  </div>
                  <div style={{display:"flex",alignItems:"center",gap:mobile?8:12,flexShrink:0,justifyContent:mobile?"space-between":"flex-end"}}>
                    {!mobile&&<span style={{color:t.text,fontWeight:300,fontSize:18,letterSpacing:"-0.03em"}}>${(inv.amount||0).toLocaleString()}</span>}
                    <Pill t={t} status={inv.status} label={inv.status==="paid"?"Paid":inv.status==="pending"?"Due":"Upcoming"}/>
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

function TimelineTab({projectId,initialPhases,onRefresh,t}) {
  const [phases,setPhases]=useState(initialPhases||[]);
  const [showAdd,setShowAdd]=useState(false);
  const [newForm,setNewForm]=useState(EMPTY_PHASE);
  const [editingId,setEditingId]=useState(null);
  const [editForm,setEditForm]=useState({});
  const [saving,setSaving]=useState(false);

  const loadPhases=useCallback(async()=>{
    const {data}=await supabase.from("phases").select("*").eq("project_id",projectId).order("id");
    if(data) setPhases(data);
  },[projectId]);

  useEffect(()=>{loadPhases();},[loadPhases]);

  async function addPhase(e){
    e.preventDefault();
    if(!newForm.name.trim()) return;
    setSaving(true);
    await supabase.from("phases").insert({...newForm,project_id:projectId,progress:Number(newForm.progress)||0});
    setNewForm(EMPTY_PHASE);
    setShowAdd(false);
    await loadPhases();
    setSaving(false);
    onRefresh?.();
  }

  function startEdit(ph){
    setEditingId(ph.id);
    setEditForm({name:ph.name,start:ph.start||"",end:ph.end||"",status:ph.status,progress:ph.progress??0});
  }

  async function saveEdit(e,id){
    e.preventDefault();
    setSaving(true);
    await supabase.from("phases").update({...editForm,progress:Number(editForm.progress)||0}).eq("id",id);
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
    await supabase.from("phases").delete().eq("id",id);
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
        ?<div style={{color:t.textSub,fontSize:13,textAlign:"center",padding:"24px 0"}}>No phases yet. Add one below.</div>
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
        <SectionLabel t={t}>Phase Details</SectionLabel>
        <button onClick={()=>{setShowAdd(s=>!s);setEditingId(null);}} style={{background:t.accent,color:"#fff",border:"none",borderRadius:8,padding:"5px 14px",fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"inherit",whiteSpace:"nowrap"}}>+ Add Phase</button>
      </div>
      <Line t={t}/>

      {/* Add phase inline form */}
      {showAdd&&(
        <div>
          <form onSubmit={addPhase} style={{display:"flex",alignItems:"center",gap:8,padding:"12px 20px",flexWrap:"wrap"}}>
            {phInput(newForm.name,e=>setNewForm(f=>({...f,name:e.target.value})),"Phase name…",{flex:"2 1 160px"})}
            {phInput(newForm.start,e=>setNewForm(f=>({...f,start:e.target.value})),"Start (e.g. Mar 1)",{flex:"1 1 120px"})}
            {phInput(newForm.end,e=>setNewForm(f=>({...f,end:e.target.value})),"End (e.g. Mar 15)",{flex:"1 1 120px"})}
            {phInput(String(newForm.progress),e=>setNewForm(f=>({...f,progress:e.target.value})),"0-100",{flex:"0 0 60px",type:"number"})}
            {phSelect(newForm.status,e=>setNewForm(f=>({...f,status:e.target.value})))}
            <div style={{display:"flex",gap:6}}>
              {saveBtn(saving||!newForm.name.trim())}
              {cancelBtn(()=>{setShowAdd(false);setNewForm(EMPTY_PHASE);})}
            </div>
          </form>
          <Line t={t}/>
        </div>
      )}

      {phases.length===0&&!showAdd
        ?<div style={{color:t.textSub,textAlign:"center",padding:"32px 0",fontSize:13}}>No phases yet.</div>
        :phases.map((ph,i)=>{
          const isEditing=editingId===ph.id;
          return(
            <div key={ph.id??i}>
              {isEditing?(
                <form onSubmit={e=>saveEdit(e,ph.id)} style={{display:"flex",alignItems:"center",gap:8,padding:"11px 20px",flexWrap:"wrap"}}>
                  {phInput(editForm.name,e=>setEditForm(f=>({...f,name:e.target.value})),"Phase name",{flex:"2 1 160px"})}
                  {phInput(editForm.start,e=>setEditForm(f=>({...f,start:e.target.value})),"Start",{flex:"1 1 120px"})}
                  {phInput(editForm.end,e=>setEditForm(f=>({...f,end:e.target.value})),"End",{flex:"1 1 120px"})}
                  {phInput(String(editForm.progress),e=>setEditForm(f=>({...f,progress:e.target.value})),"0-100",{flex:"0 0 60px",type:"number"})}
                  {phSelect(editForm.status,e=>setEditForm(f=>({...f,status:e.target.value})))}
                  <div style={{display:"flex",gap:6}}>
                    {saveBtn(saving)}
                    {cancelBtn(()=>setEditingId(null))}
                  </div>
                </form>
              ):(
                <div style={{display:"flex",alignItems:"center",padding:"13px 20px",gap:12}}>
                  <div style={{flex:2}}><span style={{color:ph.status==="pending"?t.textSub:t.text,fontSize:13,fontWeight:500}}>{ph.name}</span></div>
                  <div style={{flex:1,color:t.textSub,fontSize:12}}>{ph.start}</div>
                  <div style={{flex:1,color:t.textSub,fontSize:12}}>{ph.end}</div>
                  <div style={{flex:1}}><Thin value={ph.progress} t={t}/></div>
                  <div style={{flex:1,textAlign:"right"}}><Pill t={t} status={ph.status==="complete"?"complete":ph.status==="active"?"active":"pending"} label={ph.status==="complete"?"Done":ph.status==="active"?"Active":"Pending"}/></div>
                  <div style={{display:"flex",gap:6,flexShrink:0}}>
                    <button onClick={()=>startEdit(ph)} title="Edit" style={{background:"transparent",border:`1px solid ${t.border}`,borderRadius:6,width:26,height:26,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",color:t.textSub,fontSize:13}}>✏</button>
                    <button onClick={()=>deletePhase(ph.id)} title="Delete" style={{background:"transparent",border:`1px solid ${t.border}`,borderRadius:6,width:26,height:26,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",color:t.red,fontSize:15}}>×</button>
                  </div>
                </div>
              )}
              {i<phases.length-1&&<Line t={t}/>}
            </div>
          );
        })
      }
    </Card>
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

  function openNew(){setEditing(null);setForm(EMPTY_TOOL);setShowModal(true);}
  function openEdit(sw){setEditing(sw);setForm({name:sw.name||"",category:sw.category||"",status:sw.status||"existing",access:sw.access||"",url:sw.url||"",note:sw.note||""});setShowModal(true);}

  async function handleSubmit(e){
    e.preventDefault();
    setSaving(true);
    if(editing){
      await supabase.from("software").update(form).eq("id",editing.id);
    } else {
      await supabase.from("software").insert({...form,project_id:projectId});
    }
    setShowModal(false);
    await loadTools();
    setSaving(false);
    onRefresh?.();
  }

  async function deleteTool(id){
    setDeletingId(id);
    await supabase.from("software").delete().eq("id",id);
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

  async function addItem(e){
    e.preventDefault();
    if(!newForm.title.trim()) return;
    setSaving(true);
    const {error}=await supabase.from("maintenance").insert({
      ...newForm,
      project_id:projectId,
      status:"open",
      reported:new Date().toISOString().slice(0,10)
    });
    setSaving(false);
    if(!error){setNewForm(EMPTY_MNT);setShowNew(false);loadItems();onRefresh?.();}
  }

  function openEdit(item){
    setEditingId(item.id);
    setEditForm({status:item.status||"open",notes:item.notes||"",resolved:item.resolved||""});
  }
  async function saveEdit(id){
    setSaving(true);
    await supabase.from("maintenance").update(editForm).eq("id",id);
    setSaving(false);
    setEditingId(null);
    loadItems();
    onRefresh?.();
  }
  async function deleteItem(id){
    setDeletingId(id);
    await supabase.from("maintenance").delete().eq("id",id);
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
            {field("Title",inp(newForm.title,e=>setNewForm(f=>({...f,title:e.target.value})),"Brief description"))}
            {field("Type",sel(newForm.type,e=>setNewForm(f=>({...f,type:e.target.value})),MNT_TYPES))}
            {field("Priority",sel(newForm.priority,e=>setNewForm(f=>({...f,priority:e.target.value})),MNT_PRIORITIES))}
            {field("Notes",<textarea value={newForm.notes} onChange={e=>setNewForm(f=>({...f,notes:e.target.value}))} placeholder="Additional context…" rows={3} style={{background:t.surfaceHigh,border:`1px solid ${t.border}`,borderRadius:6,padding:"6px 10px",fontSize:12,color:t.text,width:"100%",boxSizing:"border-box",outline:"none",fontFamily:"inherit",resize:"vertical"}}/>)}
            <div style={{display:"flex",gap:8,justifyContent:"flex-end",paddingTop:4}}>
              <button type="button" onClick={()=>setShowNew(false)} style={{background:"transparent",color:t.textSub,border:`1px solid ${t.border}`,borderRadius:7,padding:"6px 14px",fontSize:12,cursor:"pointer",fontFamily:"inherit"}}>Cancel</button>
              <button type="submit" disabled={saving||!newForm.title.trim()} style={{background:t.accent,color:"#fff",border:"none",borderRadius:7,padding:"6px 16px",fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"inherit",opacity:saving||!newForm.title.trim()?0.5:1}}>{saving?"Saving…":"Submit Request"}</button>
            </div>
          </form>
        </div>
      </div>
    )}
    <div style={{display:"flex",flexDirection:"column",gap:16}}>
      <div style={{display:"grid",gridTemplateColumns:mobile?"1fr":"repeat(3,1fr)",gap:12}}>
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
        {filtered.length===0
          ?<div style={{color:t.textSub,textAlign:"center",padding:"40px 0",fontSize:13}}>No items to display</div>
          :filtered.map((item,i)=>(
            <div key={item.id}>
              {editingId===item.id?(
                <div style={{padding:"14px 22px",display:"flex",flexDirection:"column",gap:10}}>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10}}>
                    {field("Status",sel(editForm.status,e=>setEditForm(f=>({...f,status:e.target.value})),MNT_STATUSES))}
                    {field("Resolved Date",inp(editForm.resolved,e=>setEditForm(f=>({...f,resolved:e.target.value})),"YYYY-MM-DD"))}
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
  const CALENDLY_URL="https://calendly.com/lexops/project-catchup";
  return <div style={{display:"flex",flexDirection:"column",gap:20}}>
    <CardPad t={t}>
      <div style={{display:"flex",alignItems:"flex-start",gap:20}}>
        <div style={{width:48,height:48,borderRadius:12,background:t.accentSoft,border:`1px solid ${t.accent}30`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,flexShrink:0}}>📅</div>
        <div style={{flex:1}}>
          <div style={{color:t.text,fontSize:16,fontWeight:500,marginBottom:6}}>Book a Project Catchup</div>
          <div style={{color:t.textSub,fontSize:13,lineHeight:1.7,marginBottom:16}}>
            Schedule time directly with your LexOps project manager to discuss progress, answer questions, or review upcoming milestones for <strong style={{color:t.text,fontWeight:500}}>{project.project}</strong>.
          </div>
          <div style={{display:"flex",gap:10}}>
            <a href={CALENDLY_URL} target="_blank" rel="noreferrer" style={{background:t.accent,color:"#fff",border:"none",borderRadius:8,padding:"9px 20px",fontSize:13,fontWeight:600,cursor:"pointer",textDecoration:"none",display:"inline-flex",alignItems:"center",gap:8}}>
              <span>Open Booking Page</span>
              <span style={{fontSize:11,opacity:0.8}}>↗</span>
            </a>
            <div style={{background:t.surfaceHigh,border:`1px solid ${t.border}`,borderRadius:8,padding:"9px 16px",fontSize:13,color:t.textSub,display:"flex",alignItems:"center"}}>
              30 min · Video call
            </div>
          </div>
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
        src={`${CALENDLY_URL}?embed_type=inline&hide_event_type_details=1&hide_gdpr_banner=1&primary_color=${encodeURIComponent("4a7fa5")}`}
        width="100%"
        height="520"
        frameBorder="0"
        style={{display:"block",borderRadius:"0 0 12px 12px"}}
        title="Book a time with LexOps"
      />
    </Card>
    <CardPad t={t} style={{border:`1px dashed ${t.border}`}}>
      <SectionLabel t={t}>Prefer to reach out directly?</SectionLabel>
      <div style={{display:"flex",gap:20,flexWrap:"wrap"}}>
        {[{label:"Email",value:"hello@teamsquared.io",icon:"✉"},{label:"Your Manager",value:project.manager,icon:"👤"}].map((c,i)=>(
          <div key={i} style={{display:"flex",alignItems:"center",gap:10}}>
            <span style={{fontSize:14}}>{c.icon}</span>
            <div>
              <div style={{color:t.textSub,fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.06em"}}>{c.label}</div>
              <div style={{color:t.accentLight,fontSize:13,fontWeight:500}}>{c.value}</div>
            </div>
          </div>
        ))}
      </div>
    </CardPad>
  </div>;
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
      fontFamily:"'DM Sans','Helvetica Neue',sans-serif",color:t.text,padding:24,
    }}>
      <div style={{width:"100%",maxWidth:520,display:"flex",flexDirection:"column",alignItems:"center",gap:36}}>
        <LogoDark h={28}/>
        <div style={{textAlign:"center"}}>
          <h1 style={{fontSize:32,fontWeight:300,letterSpacing:"-0.04em",margin:"0 0 16px",color:t.text}}>
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
// Client Overview Tab
// ---------------------------------------------------------------------------
function ClientOverviewTab({ project, t, mobile }) {
  const deliverables = (project.tasks || []).filter(tk => tk.is_deliverable);
  const statusIcon = (s) => s === "done" ? "✅" : s === "in-progress" ? "🔄" : "⏳";
  const statusLabel = (s) => s === "done" ? "Complete" : s === "in-progress" ? "In progress" : "Upcoming";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Client Summary Card */}
      {project.client_summary && (
        <CardPad t={t} style={{ borderLeft: `3px solid ${t.accent}` }}>
          <SectionLabel t={t}>About Your Project</SectionLabel>
          <p style={{ color: t.text, fontSize: 14, lineHeight: 1.8, margin: 0 }}>
            {project.client_summary}
          </p>
        </CardPad>
      )}

      {/* Stats - simplified for clients */}
      <div style={{ display: "grid", gridTemplateColumns: mobile ? "1fr" : "repeat(3,1fr)", gap: 12 }}>
        {[
          { label: "Progress", value: `${project.progress}%`, sub: project.phase, color: t.accentLight },
          { label: "Deliverables", value: `${deliverables.filter(d => d.status === "done").length} / ${deliverables.length}`, sub: "completed", color: t.green },
          { label: "Due Date", value: project.dueDate ? project.dueDate.slice(5).replace("-", " / ") : "—", sub: project.dueDate ? `${Math.max(0, Math.ceil((new Date(project.dueDate) - new Date()) / 86400000))} days remaining` : "", color: t.text },
        ].map((s, i) => (
          <div key={i} style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: 12, padding: "18px 20px", boxShadow: t.shadow }}>
            <div style={{ color: t.textSub, fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.09em", marginBottom: 10 }}>{s.label}</div>
            <div style={{ color: s.color, fontSize: 24, fontWeight: 300, letterSpacing: "-0.04em", marginBottom: 3 }}>{s.value}</div>
            <div style={{ color: t.textSub, fontSize: 11 }}>{s.sub}</div>
          </div>
        ))}
      </div>

      {/* Deliverables Checklist */}
      {deliverables.length > 0 && (
        <Card t={t}>
          <div style={{ padding: "18px 24px 14px" }}><SectionLabel t={t}>Your Deliverables</SectionLabel></div>
          <Line t={t} />
          {deliverables.map((d, i) => (
            <div key={d.id}>
              <div style={{ padding: "16px 24px", display: "flex", alignItems: "center", gap: 14 }}>
                <span style={{ fontSize: 18, flexShrink: 0 }}>{statusIcon(d.status)}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ color: d.status === "done" ? t.textSub : t.text, fontSize: 14, fontWeight: 500, textDecoration: d.status === "done" ? "line-through" : "none" }}>
                    {d.title}
                  </div>
                  <div style={{ color: t.textSub, fontSize: 12, marginTop: 2 }}>{statusLabel(d.status)}</div>
                </div>
              </div>
              {i < deliverables.length - 1 && <Line t={t} />}
            </div>
          ))}
        </Card>
      )}

      {/* Phase Progress */}
      <Card t={t}>
        <div style={{ padding: "18px 24px 14px" }}><SectionLabel t={t}>Project Phases</SectionLabel></div>
        <Line t={t} />
        {project.phases.map((ph, i) => (
          <div key={i}>
            <div style={{ padding: "16px 24px", display: "flex", alignItems: "center", gap: 16 }}>
              <div style={{
                width: 22, height: 22, borderRadius: "50%", flexShrink: 0,
                background: ph.status === "complete" ? t.green : ph.status === "active" ? t.accent : "transparent",
                border: `1.5px solid ${ph.status === "complete" ? t.green : ph.status === "active" ? t.accent : t.border}`,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                {ph.status === "complete" && <span style={{ color: "#fff", fontSize: 10, fontWeight: 800 }}>✓</span>}
                {ph.status === "active" && <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#fff", display: "block" }} />}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 7 }}>
                  <span style={{ color: ph.status === "pending" ? t.textSub : t.text, fontSize: 13, fontWeight: 500 }}>{ph.name}</span>
                  <Pill t={t} status={ph.status === "complete" ? "complete" : ph.status === "active" ? "active" : "pending"} label={ph.status === "complete" ? "Done" : ph.status === "active" ? "Active" : "Pending"} />
                </div>
                <Thin value={ph.progress} t={t} />
              </div>
            </div>
            {i < project.phases.length - 1 && <Line t={t} />}
          </div>
        ))}
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Client Actions Tab (filtered tasks for clients)
// ---------------------------------------------------------------------------
function ClientActionsTab({ projectId, initialTasks, t, mobile }) {
  const [tasks, setTasks] = useState(initialTasks || []);

  const loadTasks = useCallback(async () => {
    const { data } = await supabase.from("tasks").select("*").eq("project_id", projectId).eq("is_internal", false).order("id");
    if (data) setTasks(data);
  }, [projectId]);

  useEffect(() => { loadTasks(); }, [loadTasks]);

  const needsAction = tasks.filter(tk => tk.status !== "done" && tk.assignee);
  const inProgress = tasks.filter(tk => tk.status === "in-progress" && !tk.assignee);
  const upcoming = tasks.filter(tk => tk.status === "todo" && !tk.assignee);
  const completed = tasks.filter(tk => tk.status === "done");

  const priorityOrder = { high: 0, medium: 1, low: 2 };
  const sortByPriority = (a, b) => (priorityOrder[a.priority] ?? 1) - (priorityOrder[b.priority] ?? 1);

  const TaskGroup = ({ title, subtitle, items, color }) => {
    if (items.length === 0) return null;
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <div>
          <div style={{ color: color || t.text, fontSize: 14, fontWeight: 600, marginBottom: 2 }}>{title}</div>
          {subtitle && <div style={{ color: t.textSub, fontSize: 12 }}>{subtitle}</div>}
        </div>
        <Card t={t}>
          {items.sort(sortByPriority).map((task, i) => (
            <div key={task.id}>
              <div style={{ padding: mobile ? "14px 16px" : "14px 22px", display: "flex", alignItems: "center", gap: 12, justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
                  <div style={{
                    width: 18, height: 18, borderRadius: "50%", flexShrink: 0,
                    border: `1.5px solid ${task.status === "done" ? t.green : task.status === "in-progress" ? t.accent : t.textDim}`,
                    background: task.status === "done" ? t.green : "transparent",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    {task.status === "done" && <span style={{ color: "#fff", fontSize: 9, fontWeight: 800 }}>✓</span>}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ color: task.status === "done" ? t.textSub : t.text, fontSize: 13, fontWeight: 500, textDecoration: task.status === "done" ? "line-through" : "none" }}>{task.title}</div>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
                  {task.due && <span style={{ color: t.textSub, fontSize: 11 }}>Due {task.due}</span>}
                  {task.priority && <Pill t={t} status={task.priority} label={task.priority.charAt(0).toUpperCase() + task.priority.slice(1)} />}
                </div>
              </div>
              {i < items.length - 1 && <Line t={t} />}
            </div>
          ))}
        </Card>
      </div>
    );
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <TaskGroup title="Things we need from you" subtitle="Action items that require your input" items={needsAction} color={t.amber} />
      <TaskGroup title="In progress by LexOps" subtitle="Currently being worked on by your team" items={inProgress} color={t.accentLight} />
      <TaskGroup title="Upcoming" items={upcoming} color={t.textSub} />
      <TaskGroup title="Completed" items={completed} color={t.green} />
      {tasks.length === 0 && (
        <CardPad t={t}>
          <div style={{ textAlign: "center", color: t.textSub, fontSize: 13, padding: "24px 0" }}>No action items at this time.</div>
        </CardPad>
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

    const { data: newDoc } = await supabase.from("documents").insert({
      project_id: projectId,
      name: file.name,
      file_type: ext,
      file_size: file.size,
      file_url: publicUrl,
      storage_path: storagePath,
      uploaded_at: new Date().toISOString(),
    }).select("id").single();

    if (newDoc) {
      await supabase.from("document_requests").update({
        fulfilled_at: new Date().toISOString(),
        fulfilled_document_id: newDoc.id,
      }).eq("id", req.id);
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

  const tc = { PDF: "#f87171", DOCX: "#4a7fa5", XLSX: "#4ade80", PNG: "#4ade80", JPG: "#4ade80", CSV: "#f59e0b" };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
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
                  <a href={doc.file_url} target="_blank" rel="noreferrer" download={doc.name} style={{ background: "transparent", color: t.accentLight, border: `1px solid ${t.border}`, borderRadius: 7, padding: "5px 14px", fontSize: 12, fontWeight: 500, textDecoration: "none", display: "inline-flex", alignItems: "center", flexShrink: 0 }}>
                    Download
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

export default function LexOpsDashboard({ onLogout, userProfile }) {
  const isClient = userProfile?.role === "client";
  const isAdmin = userProfile?.role === "lexops_admin";
  const allowedProjectIds = userProfile?.allowedProjectIds || [];
  const [projects,setProjects]=useState([]);
  const [loading,setLoading]=useState(true);
  const [mode,setMode]=useState(()=>{try{return localStorage.getItem("lexops-theme")||"light";}catch{return "light";}});
  const [profileOpen,setProfileOpen]=useState(false);
  const [view,setView]=useState(isClient ? "client" : "internal");
  const [selected,setSelected]=useState(null);
  const [tab,setTab]=useState("overview");
  const [adminOpen,setAdminOpen]=useState(false);
  const [sidebarOpen,setSidebarOpen]=useState(false);
  const [showWelcome,setShowWelcome]=useState(false);
  const mobile=useIsMobile(768);
  const t=themes[mode];

  useEffect(()=>{
    async function load(){
      setLoading(true);
      let query;
      if(isClient){
        console.log("[Dashboard] Client allowedProjectIds:", JSON.stringify(allowedProjectIds));
        if(allowedProjectIds.length===0){console.log("[Dashboard] No project memberships found — blank screen");setProjects([]);setLoading(false);return;}
        query=supabase.from("projects").select("*").in("id",allowedProjectIds);
      } else {
        query=supabase.from("projects").select("*, clients(name)");
      }
      const {data:rows,error:queryErr}=await query.order("id");
      if(isClient) console.log("[Dashboard] Projects query:", {ids: allowedProjectIds, rows, error: queryErr?.message});
      if(!rows||rows.length===0){setProjects([]);setLoading(false);return;}
      const full=await Promise.all(rows.map(async row=>{
        const related=await fetchProjectData(row.id);
        return normalizeProject(row,related);
      }));
      setProjects(full);
      setSelected(prev=>{
        if(prev){const updated=full.find(p=>p.id===prev.id);return updated||full[0]||null;}
        return full[0]||null;
      });
      // Show welcome screen for first-time client users
      if(isClient && userProfile && !userProfile.has_seen_welcome){
        setShowWelcome(true);
      }
      setLoading(false);
    }
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[]);

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
  const allTabs = isClientView
    ? ["overview","actions","documents","invoices","book"]
    : ["overview","timeline","tasks","documents","invoices","software","maintenance","book"];
  const tabLabels = isClientView
    ? {overview:"Overview",actions:"Your Actions",documents:"Documents",invoices:"Invoices",book:"Book a Call"}
    : {overview:"Overview",timeline:"Timeline",tasks:"Tasks",documents:"Documents",invoices:"Invoices",software:"Software",maintenance:"Maintenance",book:"Book a Call"};

  async function dismissWelcome(){
    setShowWelcome(false);
    if(userProfile?.id){
      await supabase.from("profiles").update({has_seen_welcome:true}).eq("id",userProfile.id);
    }
  }

  return (
    <div style={{background:t.bg,minHeight:"100vh",fontFamily:"'DM Sans','Helvetica Neue',sans-serif",color:t.text,display:"flex",flexDirection:"column",transition:"background 0.25s,color 0.25s"}}>
      {showWelcome&&<WelcomeScreen userProfile={userProfile} project={selected} t={t} onDismiss={dismissWelcome}/>}
      {adminOpen&&<AdminPanel mode={mode} onClose={()=>setAdminOpen(false)}/>}
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
          {mode==="dark"?<LogoLight h={mobile?16:20}/>:<LogoDark h={mobile?16:20}/>}
          {!mobile&&<><div style={{width:1,height:16,background:t.border}}/><span style={{color:t.textSub,fontSize:12,letterSpacing:"0.02em"}}>Client Portal</span></>}
        </div>
        <div style={{display:"flex",alignItems:"center",gap:mobile?6:10,flexWrap:mobile?"wrap":"nowrap"}}>
          {isAdmin&&<button onClick={()=>setAdminOpen(true)} style={{background:t.accentSoft,color:t.accentLight,border:`1px solid ${t.accent}30`,borderRadius:8,padding:mobile?"0 10px":"0 14px",height:34,fontSize:12,fontWeight:600,cursor:"pointer",transition:"all 0.15s"}}>{mobile?"⚙":"Admin"}</button>}
          {!isClient&&<div style={{display:"flex",background:t.surfaceHigh,borderRadius:8,border:`1px solid ${t.border}`,padding:3,gap:2}}>
            {[["internal",mobile?"Int":"Internal"],["client",mobile?"Client":"Client View"]].map(([k,l])=>(
              <button key={k} onClick={()=>{setView(k);setTab("overview");}} style={{background:view===k?t.accent:"transparent",color:view===k?"#fff":t.textSub,border:"none",borderRadius:6,padding:mobile?"5px 8px":"5px 14px",fontSize:mobile?11:12,fontWeight:600,cursor:"pointer",transition:"all 0.15s"}}>{l}</button>
            ))}
          </div>}
          <button onClick={()=>setMode(m=>{const next=m==="dark"?"light":"dark";try{localStorage.setItem("lexops-theme",next);}catch{}return next;})} style={{background:t.surfaceHigh,border:`1px solid ${t.border}`,borderRadius:8,width:34,height:34,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",fontSize:14,color:t.textSub}}>
            {mode==="dark"?"☀":"☾"}
          </button>
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
                  <h1 style={{margin:"0 0 7px",fontSize:mobile?18:22,fontWeight:300,letterSpacing:"-0.04em",color:t.text,lineHeight:1.2}}>{selected.project}</h1>
                  <div style={{display:"flex",gap:mobile?10:18,alignItems:"center",flexWrap:"wrap"}}>
                    {!isClientView&&<span style={{color:t.textSub,fontSize:12}}>Manager: <span style={{color:t.accentLight}}>{selected.manager}</span></span>}
                    <span style={{color:t.textSub,fontSize:12}}>Updated {selected.lastUpdate}</span>
                  </div>
                </div>
                <Pill t={t} status={selected.status} label={selected.status==="complete"?"Complete":selected.phase}/>
              </div>
              <div style={{borderBottom:`1px solid ${t.border}`,marginBottom:mobile?16:24,overflowX:"auto",display:"flex",scrollbarWidth:"none",WebkitOverflowScrolling:"touch"}}>
                <style>{`.hide-scrollbar::-webkit-scrollbar{display:none}`}</style>
                <div className="hide-scrollbar" style={{display:"flex",overflowX:"auto",scrollbarWidth:"none",width:"100%"}}>
                  {allTabs.map(tb=>(
                    <button key={tb} onClick={()=>setTab(tb)} style={{background:"transparent",border:"none",borderBottom:tab===tb?`1.5px solid ${t.accent}`:"1.5px solid transparent",color:tab===tb?t.text:t.textSub,padding:mobile?"8px 12px":"8px 18px",fontSize:mobile?12:13,fontWeight:tab===tb?600:400,cursor:"pointer",whiteSpace:"nowrap",transition:"all 0.15s",marginBottom:-1,letterSpacing:"0.01em",flexShrink:0}}>
                      {tabLabels[tb]}
                    </button>
                  ))}
                </div>
              </div>
              {tab==="overview"    && (isClientView
                ? <ClientOverviewTab project={selected} t={t} mobile={mobile}/>
                : <OverviewTab     project={selected} isInternal={true} t={t} mobile={mobile}/>
              )}
              {tab==="timeline"    &&!isClientView&&<TimelineTab projectId={selected.id} initialPhases={selected.phases} onRefresh={()=>refreshProject(selected.id)} t={t}/>}
              {tab==="tasks"       &&!isClientView&&<TasksTab    projectId={selected.id} initialTasks={selected.tasks} isInternal={true} onRefresh={()=>refreshProject(selected.id)} t={t} mobile={mobile}/>}
              {tab==="actions"     &&isClientView&&<ClientActionsTab projectId={selected.id} initialTasks={(selected.tasks||[]).filter(tk=>!tk.is_internal)} t={t} mobile={mobile}/>}
              {tab==="documents"   && (isClientView
                ? <ClientDocumentsTab projectId={selected.id} initialDocuments={selected.documents} initialDocRequests={selected.docRequests} onRefresh={()=>refreshProject(selected.id)} t={t}/>
                : <DocumentsTab    projectId={selected.id} initialDocuments={selected.documents} initialDocRequests={selected.docRequests} isInternal={true} onRefresh={()=>refreshProject(selected.id)} t={t}/>
              )}
              {tab==="invoices"    &&<InvoicesTab     projectId={selected.id} initialInvoices={selected.invoices} isInternal={!isClientView} onRefresh={()=>refreshProject(selected.id)} t={t} mobile={mobile}/>}
              {tab==="software"    &&!isClientView&&<SoftwareTab     projectId={selected.id} initialSoftware={selected.software} isInternal={true} onRefresh={()=>refreshProject(selected.id)} t={t}/>}
              {tab==="maintenance" &&!isClientView&&<MaintenanceTab  projectId={selected.id} initialMaintenance={selected.maintenance} isInternal={true} onRefresh={()=>refreshProject(selected.id)} t={t} mobile={mobile}/>}
              {tab==="book"        &&<BookingTab      project={selected} t={t}/>}
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
