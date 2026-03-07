import { useState } from "react";

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

const projects = [
  {
    id:1, client:"Nautilus Law",
    project:"Intake Process & Smokeball Automation",
    phase:"Implementation", progress:65, status:"active",
    budget:4500, spent:2925, dueDate:"2026-03-28", manager:"Amresh S.",
    lastUpdate:"Mar 11, 2026",
    summary:"Redesigning and automating Nautilus Law's client intake process across all channels, with structured matter creation inside Smokeball and automated advice letter generation.",
    phases:[
      {name:"Audit & Discovery",status:"complete",progress:100,start:"Mar 1",end:"Mar 6"},
      {name:"Process Design",status:"complete",progress:100,start:"Mar 6",end:"Mar 10"},
      {name:"Smokeball Configuration",status:"active",progress:60,start:"Mar 10",end:"Mar 20"},
      {name:"Automation & Testing",status:"pending",progress:0,start:"Mar 20",end:"Mar 25"},
      {name:"Handover & Training",status:"pending",progress:0,start:"Mar 25",end:"Mar 28"},
    ],
    tasks:[
      {id:1,title:"Map current intake channels",assignee:"Priya K.",status:"done",due:"Mar 5"},
      {id:2,title:"Design unified intake form",assignee:"Priya K.",status:"done",due:"Mar 8"},
      {id:3,title:"Configure Smokeball matter categories",assignee:"Rohan M.",status:"in-progress",due:"Mar 14"},
      {id:4,title:"Set up automated advice letter templates",assignee:"Rohan M.",status:"in-progress",due:"Mar 18"},
      {id:5,title:"UAT with Nautilus team",assignee:"Amresh S.",status:"todo",due:"Mar 22"},
      {id:6,title:"Training session delivery",assignee:"Amresh S.",status:"todo",due:"Mar 27"},
    ],
    documents:[
      {name:"Intake Process Audit Report",type:"PDF",uploaded:"Mar 6",size:"1.2 MB"},
      {name:"Smokeball Configuration Guide",type:"DOCX",uploaded:"Mar 10",size:"840 KB"},
      {name:"Advice Letter Template v1",type:"DOCX",uploaded:"Mar 11",size:"210 KB"},
      {name:"Signed Proposal",type:"PDF",uploaded:"Mar 1",size:"520 KB"},
    ],
    invoices:[
      {id:"INV-001",description:"Phase 1 – Audit & Design (50%)",amount:2250,status:"paid",date:"Mar 2"},
      {id:"INV-002",description:"Phase 2 – Implementation (35%)",amount:1575,status:"pending",date:"Mar 20"},
      {id:"INV-003",description:"Phase 3 – Handover (15%)",amount:675,status:"upcoming",date:"Mar 30"},
    ],
    activity:[
      {date:"Mar 11",text:"Advice letter templates uploaded",type:"document"},
      {date:"Mar 10",text:"Smokeball configuration guide completed by Rohan M.",type:"milestone"},
      {date:"Mar 8",text:"Unified intake form design approved",type:"milestone"},
      {date:"Mar 6",text:"Audit report delivered",type:"document"},
      {date:"Mar 2",text:"INV-001 payment received — $2,250",type:"invoice"},
    ],
    software:[
      {name:"Smokeball",category:"Practice Management",status:"existing",access:"Admin",url:"https://smokeball.com",note:"Primary matter management tool"},
      {name:"Microsoft 365",category:"Productivity",status:"existing",access:"Shared",url:"",note:"Email, Word, Teams"},
      {name:"Zapier",category:"Automation",status:"new",access:"Admin",url:"https://zapier.com",note:"Set up by LexOps for intake automation"},
      {name:"Typeform",category:"Intake Forms",status:"new",access:"Admin",url:"https://typeform.com",note:"Web-based client intake form"},
    ],
    maintenance:[
      {id:1,title:"Smokeball template update — conveyancing",type:"maintenance",priority:"low",status:"complete",reported:"Feb 20",resolved:"Feb 22",notes:"Updated 3 templates per client request"},
      {id:2,title:"Intake form not submitting on mobile Safari",type:"bug",priority:"high",status:"resolved",reported:"Mar 9",resolved:"Mar 10",notes:"Fixed CSS viewport issue"},
      {id:3,title:"Add new matter category — Family Law",type:"request",priority:"medium",status:"in-progress",reported:"Mar 11",resolved:null,notes:"Scoping in progress"},
    ],
  },
  {
    id:2, client:"Meridian Legal",
    project:"Legal Ops Audit & CLM Implementation",
    phase:"Audit", progress:25, status:"active",
    budget:12000, spent:3000, dueDate:"2026-05-15", manager:"Abdurahman H.",
    lastUpdate:"Mar 7, 2026",
    summary:"Full legal operations audit followed by contract lifecycle management (CLM) implementation for Meridian Legal's growing in-house team.",
    phases:[
      {name:"Legal Ops Audit",status:"active",progress:50,start:"Mar 1",end:"Mar 25"},
      {name:"Workflow Design",status:"pending",progress:0,start:"Mar 25",end:"Apr 10"},
      {name:"CLM Implementation",status:"pending",progress:0,start:"Apr 10",end:"May 1"},
      {name:"Testing & Go-Live",status:"pending",progress:0,start:"May 1",end:"May 15"},
    ],
    tasks:[
      {id:1,title:"Stakeholder interviews",assignee:"Abdurahman H.",status:"done",due:"Mar 7"},
      {id:2,title:"Contract workflow mapping",assignee:"Priya K.",status:"in-progress",due:"Mar 15"},
      {id:3,title:"Tech stack assessment",assignee:"Rohan M.",status:"in-progress",due:"Mar 17"},
      {id:4,title:"Audit report draft",assignee:"Abdurahman H.",status:"todo",due:"Mar 25"},
    ],
    documents:[
      {name:"Signed Proposal",type:"PDF",uploaded:"Feb 28",size:"480 KB"},
      {name:"Stakeholder Interview Notes",type:"DOCX",uploaded:"Mar 7",size:"320 KB"},
    ],
    invoices:[
      {id:"INV-001",description:"Audit Phase (25%)",amount:3000,status:"paid",date:"Mar 1"},
      {id:"INV-002",description:"Workflow Design (35%)",amount:4200,status:"upcoming",date:"Apr 1"},
    ],
    activity:[
      {date:"Mar 7",text:"Stakeholder interviews completed",type:"milestone"},
      {date:"Mar 5",text:"Contract workflow mapping commenced",type:"update"},
      {date:"Mar 1",text:"INV-001 payment received — $3,000",type:"invoice"},
    ],
    software:[
      {name:"Microsoft 365",category:"Productivity",status:"existing",access:"Shared",url:"",note:"Primary collaboration suite"},
      {name:"DocuSign",category:"e-Signature",status:"existing",access:"View only",url:"",note:"Client manages directly"},
      {name:"Ironclad",category:"CLM",status:"new",access:"Admin",url:"https://ironcladapp.com",note:"Being configured by LexOps"},
    ],
    maintenance:[
      {id:1,title:"Initial CLM environment setup",type:"maintenance",priority:"medium",status:"in-progress",reported:"Mar 8",resolved:null,notes:"Sandbox environment being configured"},
    ],
  },
  {
    id:3, client:"Brightside Financial",
    project:"In-House Legal Workflow Redesign",
    phase:"Complete", progress:100, status:"complete",
    budget:8500, spent:8500, dueDate:"2026-02-28", manager:"Amresh S.",
    lastUpdate:"Feb 28, 2026",
    summary:"End-to-end legal workflow redesign for Brightside Financial's in-house team, including playbook development, process documentation, and staff training.",
    phases:[
      {name:"Audit",status:"complete",progress:100,start:"Jan 10",end:"Jan 24"},
      {name:"Process Design",status:"complete",progress:100,start:"Jan 24",end:"Feb 7"},
      {name:"Implementation",status:"complete",progress:100,start:"Feb 7",end:"Feb 21"},
      {name:"Handover",status:"complete",progress:100,start:"Feb 21",end:"Feb 28"},
    ],
    tasks:[],
    documents:[
      {name:"Final Audit Report",type:"PDF",uploaded:"Jan 20",size:"2.1 MB"},
      {name:"Legal Playbook v2",type:"DOCX",uploaded:"Feb 10",size:"1.8 MB"},
      {name:"Process Maps",type:"PDF",uploaded:"Feb 14",size:"3.2 MB"},
      {name:"Completion Sign-off",type:"PDF",uploaded:"Feb 28",size:"180 KB"},
    ],
    invoices:[
      {id:"INV-001",description:"Audit Phase",amount:2125,status:"paid",date:"Jan 15"},
      {id:"INV-002",description:"Design & Implementation",amount:4250,status:"paid",date:"Feb 1"},
      {id:"INV-003",description:"Handover & Completion",amount:2125,status:"paid",date:"Feb 28"},
    ],
    activity:[
      {date:"Feb 28",text:"Project completed — sign-off received",type:"milestone"},
      {date:"Feb 28",text:"INV-003 payment received — $2,125",type:"invoice"},
      {date:"Feb 14",text:"Process maps delivered",type:"document"},
      {date:"Feb 10",text:"Legal Playbook v2 approved",type:"milestone"},
    ],
    software:[
      {name:"Microsoft 365",category:"Productivity",status:"existing",access:"Shared",url:"",note:""},
      {name:"Notion",category:"Knowledge Management",status:"new",access:"Admin",url:"https://notion.so",note:"Legal playbook and SOPs hosted here"},
      {name:"Miro",category:"Process Mapping",status:"new",access:"View",url:"https://miro.com",note:"Process maps and workflow diagrams"},
    ],
    maintenance:[
      {id:1,title:"Notion playbook update — Q1 review",type:"request",priority:"low",status:"open",reported:"Mar 1",resolved:null,notes:"Client requested minor updates to escalation policy"},
    ],
  },
];

// ── PRIMITIVES ───────────────────────────────────────────────────────────────
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
  return <div style={{background:t.surface,border:`1px solid ${t.border}`,borderRadius:12,overflow:"hidden",boxShadow:t.shadow,...style}}>{children}</div>;
}
function CardPad({children,t,style={}}) {
  return <div style={{background:t.surface,border:`1px solid ${t.border}`,borderRadius:12,padding:"20px 24px",boxShadow:t.shadow,...style}}>{children}</div>;
}

// ── SIDEBAR ROW ───────────────────────────────────────────────────────────────
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

// ── OVERVIEW TAB ──────────────────────────────────────────────────────────────
function OverviewTab({project,isInternal,t}) {
  const daysLeft=Math.ceil((new Date(project.dueDate)-new Date())/86400000);
  const done=project.tasks.filter(tk=>tk.status==="done").length;
  const stats=[
    {label:"Progress",value:`${project.progress}%`,sub:project.phase,accent:true},
    {label:"Due Date",value:project.dueDate.slice(5).replace("-"," / "),sub:daysLeft>0?`${daysLeft} days remaining`:"Past due"},
    ...(isInternal?[{label:"Budget",value:`$${project.budget.toLocaleString()}`,sub:`$${project.spent.toLocaleString()} spent · ${Math.round(project.spent/project.budget*100)}%`}]:[]),
    {label:"Tasks",value:`${done} / ${project.tasks.length}`,sub:"completed"},
  ];
  const iconMap={milestone:"◆",document:"↑",invoice:"$",update:"·"};
  const colorMap={milestone:t.accent,document:t.green,invoice:t.amber,update:t.textSub};
  return <div style={{display:"flex",flexDirection:"column",gap:20}}>
    <CardPad t={t}><SectionLabel t={t}>Project Summary</SectionLabel><p style={{color:t.textSub,fontSize:13,lineHeight:1.75,margin:0}}>{project.summary}</p></CardPad>
    <div style={{display:"grid",gridTemplateColumns:`repeat(${stats.length},1fr)`,gap:12}}>
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

// ── TASKS TAB ─────────────────────────────────────────────────────────────────
function TasksTab({tasks,isInternal,t}) {
  const [filter,setFilter]=useState("all");
  const filtered=filter==="all"?tasks:tasks.filter(tk=>tk.status===filter);
  const tc={done:{dot:t.green,label:"Done",lc:t.green},"in-progress":{dot:t.accent,label:"Active",lc:t.accentLight},todo:{dot:t.textDim,label:"To Do",lc:t.textSub}};
  const counts={all:tasks.length,"in-progress":tasks.filter(x=>x.status==="in-progress").length,todo:tasks.filter(x=>x.status==="todo").length,done:tasks.filter(x=>x.status==="done").length};
  return <div style={{display:"flex",flexDirection:"column",gap:16}}>
    <div style={{display:"flex",gap:6}}>
      {["all","in-progress","todo","done"].map(f=>(
        <button key={f} onClick={()=>setFilter(f)} style={{background:filter===f?t.accent:"transparent",color:filter===f?"#fff":t.textSub,border:`1px solid ${filter===f?t.accent:t.border}`,borderRadius:8,padding:"5px 14px",fontSize:12,cursor:"pointer",fontWeight:500,transition:"all 0.15s",display:"flex",alignItems:"center",gap:6}}>
          {f==="all"?"All":f==="in-progress"?"Active":f==="todo"?"To Do":"Done"}
          <span style={{background:filter===f?"rgba(255,255,255,0.2)":t.border,borderRadius:99,padding:"0 6px",fontSize:10,fontWeight:700}}>{counts[f]}</span>
        </button>
      ))}
    </div>
    <Card t={t}>
      {filtered.length===0
        ?<div style={{color:t.textSub,textAlign:"center",padding:"40px 0",fontSize:13}}>No tasks to display</div>
        :filtered.map((task,i)=>{const c=tc[task.status];return(
          <div key={task.id}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"15px 22px",gap:16}}>
              <div style={{display:"flex",alignItems:"center",gap:14}}>
                <div style={{width:18,height:18,borderRadius:"50%",flexShrink:0,border:`1.5px solid ${c.dot}`,background:task.status==="done"?c.dot:"transparent",display:"flex",alignItems:"center",justifyContent:"center"}}>
                  {task.status==="done"&&<span style={{color:"#fff",fontSize:9,fontWeight:800}}>✓</span>}
                </div>
                <div>
                  <div style={{color:task.status==="done"?t.textSub:t.text,fontSize:13,fontWeight:500,textDecoration:task.status==="done"?"line-through":"none"}}>{task.title}</div>
                  {isInternal&&<div style={{color:t.textDim,fontSize:11,marginTop:1}}>{task.assignee}</div>}
                </div>
              </div>
              <div style={{display:"flex",alignItems:"center",gap:16,flexShrink:0}}>
                <span style={{color:t.textSub,fontSize:11}}>Due {task.due}</span>
                <span style={{color:c.lc,fontSize:11,fontWeight:600,minWidth:40,textAlign:"right"}}>{c.label}</span>
              </div>
            </div>
            {i<filtered.length-1&&<Line t={t}/>}
          </div>
        );})}
    </Card>
  </div>;
}

// ── DOCUMENTS TAB ─────────────────────────────────────────────────────────────
function DocumentsTab({documents,t}) {
  const tc={PDF:t.red,DOCX:t.accent,XLSX:t.green};
  return <Card t={t}>
    {documents.map((doc,i)=>{const c=tc[doc.type]||t.accent;return(
      <div key={i}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"15px 22px"}}>
          <div style={{display:"flex",alignItems:"center",gap:14}}>
            <div style={{width:36,height:36,borderRadius:8,flexShrink:0,background:c+"12",border:`1px solid ${c}22`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,fontWeight:800,color:c,letterSpacing:"0.03em"}}>{doc.type}</div>
            <div>
              <div style={{color:t.text,fontSize:13,fontWeight:500}}>{doc.name}</div>
              <div style={{color:t.textSub,fontSize:11,marginTop:1}}>{doc.size} · {doc.uploaded}</div>
            </div>
          </div>
          <button style={{background:"transparent",color:t.accentLight,border:`1px solid ${t.border}`,borderRadius:7,padding:"5px 14px",fontSize:12,cursor:"pointer",fontWeight:500}}>Download</button>
        </div>
        {i<documents.length-1&&<Line t={t}/>}
      </div>
    );})}
  </Card>;
}

// ── INVOICES TAB ──────────────────────────────────────────────────────────────
function InvoicesTab({invoices,isInternal,t}) {
  const total=invoices.reduce((s,i)=>s+i.amount,0);
  const paid=invoices.filter(i=>i.status==="paid").reduce((s,i)=>s+i.amount,0);
  return <div style={{display:"flex",flexDirection:"column",gap:16}}>
    {isInternal&&(
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12}}>
        {[{label:"Total Value",value:`$${total.toLocaleString()}`,color:t.text},{label:"Collected",value:`$${paid.toLocaleString()}`,color:t.green},{label:"Outstanding",value:`$${(total-paid).toLocaleString()}`,color:t.amber}].map((s,i)=>(
          <div key={i} style={{background:t.surface,border:`1px solid ${t.border}`,borderRadius:12,padding:"18px 20px",boxShadow:t.shadow}}>
            <div style={{color:t.textSub,fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.09em",marginBottom:10}}>{s.label}</div>
            <div style={{color:s.color,fontSize:24,fontWeight:300,letterSpacing:"-0.04em"}}>{s.value}</div>
          </div>
        ))}
      </div>
    )}
    <Card t={t}>
      {invoices.map((inv,i)=>(
        <div key={i}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"16px 22px"}}>
            <div>
              <div style={{color:t.text,fontSize:13,fontWeight:500}}>{inv.description}</div>
              <div style={{color:t.textSub,fontSize:11,marginTop:2}}>{inv.id} · Due {inv.date}</div>
            </div>
            <div style={{display:"flex",alignItems:"center",gap:16}}>
              <span style={{color:t.text,fontWeight:300,fontSize:18,letterSpacing:"-0.03em"}}>${inv.amount.toLocaleString()}</span>
              <Pill t={t} status={inv.status} label={inv.status==="paid"?"Paid":inv.status==="pending"?"Due":"Upcoming"}/>
            </div>
          </div>
          {i<invoices.length-1&&<Line t={t}/>}
        </div>
      ))}
    </Card>
  </div>;
}

// ── TIMELINE / GANTT TAB ──────────────────────────────────────────────────────
function TimelineTab({project,t}) {
  // Build a simple Gantt from phase start/end strings
  // Parse dates relative to project — we map phases across a fixed pixel canvas
  const allPhases=project.phases;
  // Convert "Mar 1" style to day-of-year offsets for positioning
  const monthMap={Jan:0,Feb:31,Mar:59,Apr:90,May:120,Jun:151,Jul:181,Aug:212,Sep:243,Oct:273,Nov:304,Dec:334};
  const parseDate=s=>{if(!s)return 0;const[m,d]=s.split(" ");return(monthMap[m]||0)+parseInt(d);};
  const starts=allPhases.map(p=>parseDate(p.start));
  const ends=allPhases.map(p=>parseDate(p.end));
  const minDay=Math.min(...starts);
  const maxDay=Math.max(...ends);
  const span=maxDay-minDay||1;
  const toPercent=d=>((d-minDay)/span*100);
  const today=parseDate("Mar 7");
  const todayPct=Math.min(100,Math.max(0,toPercent(today)));
  const phaseColors={complete:t.green,active:t.accent,pending:t.textDim};

  return <div style={{display:"flex",flexDirection:"column",gap:20}}>
    <CardPad t={t}>
      <SectionLabel t={t}>Project Timeline</SectionLabel>
      {/* Month labels */}
      <div style={{position:"relative",marginBottom:32}}>
        <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}>
          {["Jan","Feb","Mar","Apr","May"].map((m,i)=>(
            <span key={i} style={{color:t.textDim,fontSize:10,fontWeight:600,letterSpacing:"0.06em"}}>{m.toUpperCase()}</span>
          ))}
        </div>
        {/* Gantt rows */}
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          {allPhases.map((ph,i)=>{
            const left=toPercent(parseDate(ph.start));
            const width=Math.max(2,toPercent(parseDate(ph.end))-left);
            const color=phaseColors[ph.status]||t.textDim;
            return(
              <div key={i}>
                <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:5}}>
                  <div style={{width:160,flexShrink:0}}>
                    <span style={{color:ph.status==="pending"?t.textSub:t.text,fontSize:12,fontWeight:500}}>{ph.name}</span>
                  </div>
                  <div style={{flex:1,position:"relative",height:24,background:t.surfaceHigh,borderRadius:6,overflow:"hidden"}}>
                    {/* Today line */}
                    <div style={{position:"absolute",left:`${todayPct}%`,top:0,bottom:0,width:1,background:t.amber,zIndex:2,opacity:0.7}}/>
                    {/* Phase bar */}
                    <div style={{position:"absolute",left:`${left}%`,width:`${width}%`,top:"50%",transform:"translateY(-50%)",height:14,borderRadius:4,background:color,opacity:ph.status==="pending"?0.35:0.9,transition:"all 0.3s"}}/>
                    {/* Progress fill */}
                    {ph.status==="active"&&<div style={{position:"absolute",left:`${left}%`,width:`${width*ph.progress/100}%`,top:"50%",transform:"translateY(-50%)",height:14,borderRadius:4,background:color,opacity:1}}/>}
                  </div>
                  <div style={{width:60,flexShrink:0,textAlign:"right"}}>
                    <Pill t={t} status={ph.status==="complete"?"complete":ph.status==="active"?"active":"pending"} label={ph.status==="complete"?"Done":ph.status==="active"?"Active":"Pending"}/>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        {/* Today marker label */}
        <div style={{position:"relative",height:16,marginTop:8,marginLeft:172}}>
          <div style={{position:"absolute",left:`${todayPct}%`,transform:"translateX(-50%)",color:t.amber,fontSize:10,fontWeight:700,whiteSpace:"nowrap"}}>▲ Today</div>
        </div>
      </div>
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

    {/* Phase detail table */}
    <Card t={t}>
      <div style={{padding:"18px 24px 14px"}}><SectionLabel t={t}>Phase Details</SectionLabel></div>
      <Line t={t}/>
      {allPhases.map((ph,i)=>(
        <div key={i}>
          <div style={{display:"flex",alignItems:"center",padding:"14px 24px",gap:16}}>
            <div style={{flex:2}}><span style={{color:ph.status==="pending"?t.textSub:t.text,fontSize:13,fontWeight:500}}>{ph.name}</span></div>
            <div style={{flex:1,color:t.textSub,fontSize:12}}>{ph.start}</div>
            <div style={{flex:1,color:t.textSub,fontSize:12}}>{ph.end}</div>
            <div style={{flex:1}}><Thin value={ph.progress} t={t}/></div>
            <div style={{flex:1,textAlign:"right"}}><Pill t={t} status={ph.status==="complete"?"complete":ph.status==="active"?"active":"pending"} label={ph.status==="complete"?"Done":ph.status==="active"?"Active":"Pending"}/></div>
          </div>
          {i<allPhases.length-1&&<Line t={t}/>}
        </div>
      ))}
    </Card>
  </div>;
}

// ── SOFTWARE TAB ──────────────────────────────────────────────────────────────
function SoftwareTab({software,isInternal,t}) {
  const existing=software.filter(s=>s.status==="existing");
  const newTools=software.filter(s=>s.status==="new");
  const catColors={"Practice Management":t.accent,"Productivity":t.textSub,"Automation":t.green,"Intake Forms":t.amber,"CLM":t.purple||t.accent,"e-Signature":t.green,"Knowledge Management":t.purple||t.accent,"Process Mapping":t.amber};

  const SoftwareCard=({tools,title,statusKey})=>(
    <div style={{display:"flex",flexDirection:"column",gap:14}}>
      <SectionLabel t={t}>{title}</SectionLabel>
      {tools.length===0
        ?<div style={{color:t.textSub,fontSize:13,padding:"16px 0"}}>None recorded</div>
        :<Card t={t}>
          {tools.map((sw,i)=>{
            const catColor=catColors[sw.category]||t.accent;
            return(
              <div key={i}>
                <div style={{display:"flex",alignItems:"center",padding:"15px 22px",gap:14}}>
                  <div style={{width:38,height:38,borderRadius:9,flexShrink:0,background:catColor+"14",border:`1px solid ${catColor}25`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16}}>
                    {sw.category==="Practice Management"?"⚖":sw.category==="Productivity"?"📋":sw.category==="Automation"?"⚡":sw.category==="Intake Forms"?"📝":sw.category==="CLM"?"📄":sw.category==="e-Signature"?"✍":sw.category==="Knowledge Management"?"📚":"🔗"}
                  </div>
                  <div style={{flex:1}}>
                    <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:3}}>
                      <span style={{color:t.text,fontSize:13,fontWeight:600}}>{sw.name}</span>
                      <span style={{color:catColor,fontSize:10,fontWeight:700,background:catColor+"14",borderRadius:99,padding:"1px 7px"}}>{sw.category}</span>
                    </div>
                    {sw.note&&<div style={{color:t.textSub,fontSize:11}}>{sw.note}</div>}
                  </div>
                  <div style={{display:"flex",alignItems:"center",gap:10,flexShrink:0}}>
                    {isInternal&&<span style={{color:t.textSub,fontSize:11,background:t.surfaceHigh,border:`1px solid ${t.border}`,borderRadius:6,padding:"2px 8px"}}>{sw.access}</span>}
                    <Pill t={t} status={sw.status} label={sw.status==="existing"?"Client Tool":"Set Up by LexOps"}/>
                  </div>
                </div>
                {i<tools.length-1&&<Line t={t}/>}
              </div>
            );
          })}
        </Card>
      }
    </div>
  );

  return <div style={{display:"flex",flexDirection:"column",gap:24}}>
    <SoftwareCard tools={existing} title="Existing Client Software" statusKey="existing"/>
    <SoftwareCard tools={newTools} title="Tools Set Up by LexOps" statusKey="new"/>
  </div>;
}

// ── MAINTENANCE TAB ───────────────────────────────────────────────────────────
function MaintenanceTab({maintenance,isInternal,t}) {
  const [filter,setFilter]=useState("all");
  const filtered=filter==="all"?maintenance:maintenance.filter(m=>m.status===filter);
  const typeIcon={bug:"🐛",maintenance:"🔧",request:"💬"};
  const typeLabel={bug:"Bug",maintenance:"Maintenance",request:"Request"};
  const priorityStatus={high:"high",medium:"medium",low:"low"};
  const statusLabel={complete:"Complete",resolved:"Resolved","in-progress":"In Progress",open:"Open"};
  const counts={all:maintenance.length,open:maintenance.filter(m=>m.status==="open").length,"in-progress":maintenance.filter(m=>m.status==="in-progress").length,resolved:maintenance.filter(m=>m.status==="resolved"||m.status==="complete").length};

  return <div style={{display:"flex",flexDirection:"column",gap:16}}>
    {/* Stats */}
    <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12}}>
      {[{label:"Open",val:counts.open,color:t.amber},{label:"In Progress",val:counts["in-progress"],color:t.accentLight},{label:"Resolved",val:counts.resolved,color:t.green}].map((s,i)=>(
        <div key={i} style={{background:t.surface,border:`1px solid ${t.border}`,borderRadius:12,padding:"16px 20px",boxShadow:t.shadow}}>
          <div style={{color:t.textSub,fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.09em",marginBottom:8}}>{s.label}</div>
          <div style={{color:s.color,fontSize:22,fontWeight:300,letterSpacing:"-0.03em"}}>{s.val}</div>
        </div>
      ))}
    </div>

    {/* Filter */}
    <div style={{display:"flex",gap:6}}>
      {["all","open","in-progress","resolved"].map(f=>(
        <button key={f} onClick={()=>setFilter(f)} style={{background:filter===f?t.accent:"transparent",color:filter===f?"#fff":t.textSub,border:`1px solid ${filter===f?t.accent:t.border}`,borderRadius:8,padding:"5px 14px",fontSize:12,cursor:"pointer",fontWeight:500,transition:"all 0.15s",display:"flex",alignItems:"center",gap:6}}>
          {f==="all"?"All":f==="in-progress"?"In Progress":f.charAt(0).toUpperCase()+f.slice(1)}
          <span style={{background:filter===f?"rgba(255,255,255,0.2)":t.border,borderRadius:99,padding:"0 6px",fontSize:10,fontWeight:700}}>{counts[f]}</span>
        </button>
      ))}
    </div>

    <Card t={t}>
      {filtered.length===0
        ?<div style={{color:t.textSub,textAlign:"center",padding:"40px 0",fontSize:13}}>No items to display</div>
        :filtered.map((item,i)=>(
          <div key={item.id}>
            <div style={{padding:"16px 22px"}}>
              <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:16,marginBottom:8}}>
                <div style={{display:"flex",alignItems:"flex-start",gap:12}}>
                  <span style={{fontSize:16,marginTop:1,flexShrink:0}}>{typeIcon[item.type]}</span>
                  <div>
                    <div style={{color:t.text,fontSize:13,fontWeight:500,marginBottom:3}}>{item.title}</div>
                    <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                      <span style={{color:t.textSub,fontSize:11,background:t.surfaceHigh,borderRadius:6,padding:"1px 7px",border:`1px solid ${t.border}`}}>{typeLabel[item.type]}</span>
                      <Pill t={t} status={priorityStatus[item.priority]} label={item.priority.charAt(0).toUpperCase()+item.priority.slice(1)+" Priority"}/>
                    </div>
                  </div>
                </div>
                <div style={{display:"flex",alignItems:"center",gap:10,flexShrink:0}}>
                  <div style={{textAlign:"right"}}>
                    <div style={{color:t.textSub,fontSize:11}}>Reported {item.reported}</div>
                    {item.resolved&&<div style={{color:t.textSub,fontSize:11}}>Resolved {item.resolved}</div>}
                  </div>
                  <Pill t={t} status={item.status} label={statusLabel[item.status]||item.status}/>
                </div>
              </div>
              {item.notes&&<div style={{marginLeft:28,color:t.textSub,fontSize:12,lineHeight:1.5,background:t.surfaceHigh,borderRadius:8,padding:"8px 12px",border:`1px solid ${t.border}`}}>{item.notes}</div>}
            </div>
            {i<filtered.length-1&&<Line t={t}/>}
          </div>
        ))
      }
    </Card>

    {/* Report new issue */}
    <CardPad t={t} style={{border:`1px dashed ${t.border}`}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <div>
          <div style={{color:t.text,fontSize:13,fontWeight:500,marginBottom:3}}>Report an issue or request</div>
          <div style={{color:t.textSub,fontSize:12}}>Submit bugs, maintenance needs, or feature requests directly to your LexOps team.</div>
        </div>
        <button style={{background:t.accent,color:"#fff",border:"none",borderRadius:8,padding:"8px 18px",fontSize:12,fontWeight:600,cursor:"pointer",whiteSpace:"nowrap",flexShrink:0}}>+ New Request</button>
      </div>
    </CardPad>
  </div>;
}

// ── BOOK A CALL TAB ───────────────────────────────────────────────────────────
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
            <div style={{background:t.surfaceHigh,border:`1px solid ${t.border}`,borderRadius:8,padding:"9px 16px",fontSize:13,color:t.textSub,display:"flex",alignItems:"center",gap:8}}>
              <span>30 min · Video call</span>
            </div>
          </div>
        </div>
      </div>
    </CardPad>

    {/* Embedded Calendly preview */}
    <Card t={t}>
      <div style={{padding:"18px 24px 14px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <SectionLabel t={t}>Inline Booking</SectionLabel>
        <span style={{color:t.textSub,fontSize:11}}>Powered by Calendly</span>
      </div>
      <Line t={t}/>
      <div style={{padding:"0"}}>
        <iframe
          src={`${CALENDLY_URL}?embed_type=inline&hide_event_type_details=1&hide_gdpr_banner=1&primary_color=${encodeURIComponent("4a7fa5")}`}
          width="100%"
          height="520"
          frameBorder="0"
          style={{display:"block",borderRadius:"0 0 12px 12px"}}
          title="Book a time with LexOps"
        />
      </div>
    </Card>

    {/* Contact info fallback */}
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

// ── ROOT ──────────────────────────────────────────────────────────────────────
export default function LexOpsDashboard() {
  const [mode,setMode]=useState("dark");
  const [view,setView]=useState("internal");
  const [selected,setSelected]=useState(projects[0]);
  const [tab,setTab]=useState("overview");
  const t=themes[mode];

  const allTabs=["overview","timeline","tasks","documents","invoices","software","maintenance","book"];
  const tabLabels={overview:"Overview",timeline:"Timeline",tasks:"Tasks",documents:"Documents",invoices:"Invoices",software:"Software",maintenance:"Maintenance",book:"Book a Call"};

  return (
    <div style={{background:t.bg,minHeight:"100vh",fontFamily:"'DM Sans','Helvetica Neue',sans-serif",color:t.text,display:"flex",flexDirection:"column",transition:"background 0.25s,color 0.25s"}}>

      {/* NAV */}
      <div style={{background:t.surface,borderBottom:`1px solid ${t.border}`,padding:"0 28px",height:56,display:"flex",alignItems:"center",justifyContent:"space-between",position:"sticky",top:0,zIndex:100,boxShadow:t.shadow}}>
        <div style={{display:"flex",alignItems:"center",gap:20}}>
          {mode==="dark"?<LogoLight h={20}/>:<LogoDark h={20}/>}
          <div style={{width:1,height:16,background:t.border}}/>
          <span style={{color:t.textSub,fontSize:12,letterSpacing:"0.02em"}}>Client Portal</span>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{display:"flex",background:t.surfaceHigh,borderRadius:8,border:`1px solid ${t.border}`,padding:3,gap:2}}>
            {[["internal","Internal"],["client","Client View"]].map(([k,l])=>(
              <button key={k} onClick={()=>setView(k)} style={{background:view===k?t.accent:"transparent",color:view===k?"#fff":t.textSub,border:"none",borderRadius:6,padding:"5px 14px",fontSize:12,fontWeight:600,cursor:"pointer",transition:"all 0.15s"}}>{l}</button>
            ))}
          </div>
          <button onClick={()=>setMode(m=>m==="dark"?"light":"dark")} style={{background:t.surfaceHigh,border:`1px solid ${t.border}`,borderRadius:8,width:34,height:34,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",fontSize:14,color:t.textSub}}>
            {mode==="dark"?"☀":"☾"}
          </button>
        </div>
      </div>

      <div style={{display:"flex",flex:1,overflow:"hidden",height:"calc(100vh - 56px)"}}>

        {/* SIDEBAR */}
        {view==="internal"&&(
          <div style={{width:280,borderRight:`1px solid ${t.border}`,background:t.surface,display:"flex",flexDirection:"column",flexShrink:0}}>
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
                  <SidebarRow p={p} active={selected?.id===p.id} onClick={()=>{setSelected(p);setTab("overview");}} t={t}/>
                  {i<projects.length-1&&<Line t={t}/>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* MAIN */}
        <div style={{flex:1,overflowY:"auto",padding:"32px 36px"}}>
          {selected&&(
            <>
              <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:24}}>
                <div>
                  <div style={{color:t.textSub,fontSize:12,marginBottom:5,letterSpacing:"0.02em"}}>{selected.client}</div>
                  <h1 style={{margin:"0 0 7px",fontSize:22,fontWeight:300,letterSpacing:"-0.04em",color:t.text,lineHeight:1.2}}>{selected.project}</h1>
                  <div style={{display:"flex",gap:18,alignItems:"center"}}>
                    {view==="internal"&&<span style={{color:t.textSub,fontSize:12}}>Manager: <span style={{color:t.accentLight}}>{selected.manager}</span></span>}
                    <span style={{color:t.textSub,fontSize:12}}>Updated {selected.lastUpdate}</span>
                  </div>
                </div>
                <Pill t={t} status={selected.status} label={selected.status==="complete"?"Complete":selected.phase}/>
              </div>

              {/* Scrollable tab bar */}
              <div style={{borderBottom:`1px solid ${t.border}`,marginBottom:24,overflowX:"auto",display:"flex",scrollbarWidth:"none"}}>
                {allTabs.map(tb=>(
                  <button key={tb} onClick={()=>setTab(tb)} style={{background:"transparent",border:"none",borderBottom:tab===tb?`1.5px solid ${t.accent}`:"1.5px solid transparent",color:tab===tb?t.text:t.textSub,padding:"8px 18px",fontSize:13,fontWeight:tab===tb?600:400,cursor:"pointer",whiteSpace:"nowrap",transition:"all 0.15s",marginBottom:-1,letterSpacing:"0.01em",flexShrink:0}}>
                    {tabLabels[tb]}
                  </button>
                ))}
              </div>

              {tab==="overview"    &&<OverviewTab     project={selected} isInternal={view==="internal"} t={t}/>}
              {tab==="timeline"    &&<TimelineTab     project={selected} t={t}/>}
              {tab==="tasks"       &&<TasksTab        tasks={selected.tasks} isInternal={view==="internal"} t={t}/>}
              {tab==="documents"   &&<DocumentsTab    documents={selected.documents} t={t}/>}
              {tab==="invoices"    &&<InvoicesTab     invoices={selected.invoices} isInternal={view==="internal"} t={t}/>}
              {tab==="software"    &&<SoftwareTab     software={selected.software} isInternal={view==="internal"} t={t}/>}
              {tab==="maintenance" &&<MaintenanceTab  maintenance={selected.maintenance} isInternal={view==="internal"} t={t}/>}
              {tab==="book"        &&<BookingTab      project={selected} t={t}/>}
            </>
          )}
        </div>
      </div>

      <div style={{borderTop:`1px solid ${t.border}`,padding:"10px 28px",background:t.surface,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <span style={{color:t.textDim,fontSize:11}}>© 2026 LexOps · A Teams Squared Company</span>
        <span style={{color:t.textDim,fontSize:11}}>hello@teamsquared.io</span>
      </div>
    </div>
  );
}
