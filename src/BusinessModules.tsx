import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import type { User } from "@supabase/supabase-js";
import { Activity, BookOpen, Check, CircleAlert, CreditCard, Plus, Search, ShieldCheck, Users, BriefcaseBusiness, RefreshCw } from "lucide-react";
import { requireSupabase } from "./lib/supabase";

type ModuleName = "Customers & CRM" | "Finance" | "Products & Services" | "Security & Audit" | "Knowledge Base" | "Reports & Settings" | "Approvals";
type Row = Record<string, any>;
const supa = () => requireSupabase();
const money = (value: number) => new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES", maximumFractionDigits: 2 }).format(value || 0);
const inputStyle = { padding: "10px 12px", borderRadius: 10, border: "1px solid var(--border, #334155)", background: "var(--surface, #101827)", color: "inherit", minWidth: 0, width: "100%" } as const;
const buttonStyle = { padding: "9px 13px", borderRadius: 10, border: "1px solid var(--border, #334155)", background: "var(--surface, #101827)", color: "inherit", cursor: "pointer" } as const;

export default function BusinessModules({ active, user }: { active: ModuleName; user: User }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [goals, setGoals] = useState<Row[]>([]);
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [editing, setEditing] = useState<Row | null>(null);
  const [form, setForm] = useState<Record<string,string>>({});
  const [refreshKey, setRefreshKey] = useState(0);
  const uid = user.id;
  const config = useMemo(() => {
    const configs: Record<ModuleName, { table: string; title: string; description: string; fields: { key: string; label: string; type?: string; required?: boolean; options?: string[] }[] }> = {
      "Customers & CRM": { table:"pruden_customers", title:"Customer register", description:"Create, search, edit and track customer relationships. Records are scoped to your signed-in account.", fields:[{key:"name",label:"Customer name",required:true},{key:"email",label:"Email",type:"email"},{key:"phone",label:"Phone"},{key:"organization",label:"Organization"},{key:"status",label:"Status",type:"select",options:["lead","prospect","active","inactive","churned"]},{key:"notes",label:"Notes",type:"textarea"}] },
      "Finance": { table:"pruden_financial_records", title:"Financial ledger", description:"Income and expense entries recorded by the workspace. Totals reflect saved ledger rows only; no estimates are inserted.", fields:[{key:"kind",label:"Record type",type:"select",options:["income","expense"],required:true},{key:"amount",label:"Amount (KES)",type:"number",required:true},{key:"category",label:"Category",required:true},{key:"description",label:"Description",required:true},{key:"occurred_on",label:"Date",type:"date",required:true}] },
      "Products & Services": { table:"pruden_products_services", title:"Products & services catalogue", description:"Maintain your actual catalogue, owners and lifecycle status.", fields:[{key:"name",label:"Name",required:true},{key:"item_type",label:"Type",type:"select",options:["product","service"]},{key:"description",label:"Description",type:"textarea"},{key:"price_kes",label:"Price (KES)",type:"number"},{key:"status",label:"Status",type:"select",options:["draft","active","paused","retired"]}] },
      "Knowledge Base": { table:"pruden_knowledge_articles", title:"Knowledge base", description:"Save searchable internal playbooks, decisions and technical notes.", fields:[{key:"title",label:"Title",required:true},{key:"category",label:"Category"},{key:"tags",label:"Tags (comma separated)"},{key:"body",label:"Content",type:"textarea",required:true}] },
      "Security & Audit": { table:"pruden_audit_events", title:"Security & audit trail", description:"Append-only event history for the signed-in owner. This module reads recorded events; it does not claim to be a full access-control or intrusion-detection system.", fields:[] },
      "Reports & Settings": { table:"", title:"Reports & workspace", description:"Live reports computed from saved CRM and ledger records. No seeded or fabricated financial values.", fields:[] },
      "Approvals": { table:"pruden_approvals", title:"Human approval queue", description:"Persist a decision on the approval record. Approval alone does not execute external actions.", fields:[] }
    };
    return configs[active];
  }, [active]);
  const load = useCallback(async () => {
    setBusy(true); setError(""); setNotice("");
    try {
      if (active === "Finance") {
        const [ledger, savings] = await Promise.all([
          supa().from("pruden_financial_records").select("*").eq("owner_id", uid).order("occurred_on", { ascending: false }).limit(200),
          supa().from("pruden_savings_goals").select("*").eq("owner_id", uid).neq("status", "archived").order("created_at", { ascending: false }).limit(100)
        ]);
        if (ledger.error) throw ledger.error;
        if (savings.error) throw savings.error;
        setRows(ledger.data || []);
        setGoals(savings.data || []);
      } else if (active === "Reports & Settings") {
        setGoals([]);
        const [customers, ledger, products, approvals] = await Promise.all([
          supa().from("pruden_customers").select("id,status").eq("owner_id",uid),
          supa().from("pruden_financial_records").select("kind,amount,currency").eq("owner_id",uid),
          supa().from("pruden_products_services").select("id,status").eq("owner_id",uid),
          supa().from("pruden_approvals").select("id,status").eq("owner_id",uid)
        ]);
        for (const result of [customers,ledger,products,approvals]) if (result.error) throw result.error;
        const ledgerRows = ledger.data || [];
        setRows([{report:"customers",count:(customers.data||[]).length},{report:"income",amount:ledgerRows.filter((r:any)=>r.kind==="income").reduce((s:number,r:any)=>s+Number(r.amount||0),0)},{report:"expenses",amount:ledgerRows.filter((r:any)=>r.kind==="expense").reduce((s:number,r:any)=>s+Number(r.amount||0),0)},{report:"products",count:(products.data||[]).length},{report:"pending approvals",count:(approvals.data||[]).filter((r:any)=>r.status==="pending").length}]);
      } else {
        setGoals([]);
        let query = supa().from(config.table).select("*").order("created_at",{ascending:false}).limit(200);
        if (active !== "Security & Audit") query = query.eq("owner_id",uid);
        const {data,error:queryError}=await query;
        if(queryError) throw queryError;
        setRows(data||[]);
      }
    } catch (e) { setError(e instanceof Error ? e.message : "Unable to load this module. Check the database migration and permissions."); }
    finally { setBusy(false); }
  },[active,config.table,uid,refreshKey]);
  useEffect(()=>{void load();},[load]);
  const startCreate = () => { setEditing(null); setForm(active==="Customers & CRM"?{status:"lead",notes:""}:active==="Finance"?{kind:"income",currency:"KES",occurred_on:new Date().toISOString().slice(0,10)}:active==="Products & Services"?{item_type:"service",status:"draft"}:{}); setNotice(""); };
  const startEdit = (row:Row) => { setEditing(row); setForm(Object.fromEntries(config.fields.map(f=>[f.key, f.key==="tags" ? (Array.isArray(row.tags)?row.tags.join(", "):"") : String(row[f.key]??"")]))); };
  async function submit(e:FormEvent) {
    e.preventDefault(); setError(""); setNotice(""); setBusy(true);
    try {
      const payload:Row={...form,owner_id:uid};
      if(active==="Finance"){payload.amount=Number(form.amount);payload.currency="KES";if(!Number.isFinite(payload.amount)||payload.amount<=0)throw new Error("Amount must be greater than zero.");}
      if(active==="Products & Services") payload.price_kes=form.price_kes===""?null:Number(form.price_kes);
      if(active==="Knowledge Base") payload.tags=(form.tags||"").split(",").map(s=>s.trim()).filter(Boolean);
      delete payload.tags_input;
      const table=config.table;
      let saved:Row;
      if(editing){const {data,error:e2}=await supa().from(table).update(payload).eq("id",editing.id).eq("owner_id",uid).select("*").single();if(e2)throw e2;saved=data;}
      else {const {data,error:e2}=await supa().from(table).insert(payload).select("*").single();if(e2)throw e2;saved=data;}
      if(active!=="Security & Audit") {
        const {error:auditError}=await supa().from("pruden_audit_events").insert({owner_id:uid,actor_id:uid,action:(editing?"updated":"created")+"."+table,entity_type:table,entity_id:String(saved.id),details:{module:active}});
        if(auditError) throw auditError;
      }
      setEditing(null);setForm({});setNotice("Saved successfully.");setRefreshKey(n=>n+1);
    } catch(e){setError(e instanceof Error?e.message:"Save failed.");}
    finally{setBusy(false);}
  }
  async function decide(row:Row,status:"approved"|"rejected") {
    setBusy(true);setError("");setNotice("");
    try { const {error:e}=await supa().from("pruden_approvals").update({status,reviewed_at:new Date().toISOString()}).eq("id",row.id).eq("owner_id",uid).eq("status","pending"); if(e)throw e;
      const {error:a}=await supa().from("pruden_audit_events").insert({owner_id:uid,actor_id:uid,action:"approval."+status,entity_type:"approval",entity_id:row.id,details:{action_type:row.action_type,executor:"none",note:"Decision recorded only; no external action executed."}});if(a)throw a;
      setNotice("Decision persisted. No external action was executed.");setRefreshKey(n=>n+1);
    }catch(e){setError(e instanceof Error?e.message:"Could not persist decision.");}finally{setBusy(false);}
  }
  const filtered=rows.filter(r=>JSON.stringify(r).toLowerCase().includes(search.toLowerCase()));
  const icon=active==="Customers & CRM"?Users:active==="Finance"?CreditCard:active==="Products & Services"?BriefcaseBusiness:active==="Security & Audit"?ShieldCheck:active==="Knowledge Base"?BookOpen:active==="Approvals"?ShieldCheck:Activity;
  const Icon=icon;
  return <section className="module-page">
    <div className="module-title-row"><div><p className="eyebrow">PRUDEN COMMAND / LIVE MODULE</p><h1>{active}</h1><p className="welcome-subtitle">{config.description}</p></div><button style={buttonStyle} onClick={()=>setRefreshKey(n=>n+1)} disabled={busy}><RefreshCw size={14}/> Refresh</button></div>
    <div className="panel module-panel" style={{padding:20,marginTop:18}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:12,flexWrap:"wrap"}}><h2 style={{display:"flex",alignItems:"center",gap:9,fontSize:18}}><Icon size={18}/>{config.title}</h2>{config.fields.length>0&&<button style={buttonStyle} onClick={startCreate}><Plus size={14}/> New record</button>}</div>
      {error&&<p role="alert" style={{color:"#fb7185",padding:10,border:"1px solid #fb718544",borderRadius:10}}><CircleAlert size={14}/> {error}</p>}
      {notice&&<p role="status" style={{color:"#34d399"}}><Check size={14}/> {notice}</p>}
      {active==="Finance" && <section aria-label="Savings goals" style={{marginTop:18}}>
        <h3 style={{fontSize:15,marginBottom:10}}>Capital & savings goals</h3>
        {goals.length===0 ? <p style={{opacity:.75}}>No savings goals saved yet. Ask Ivy to create one, or configure a goal through Ivy's Finance tools.</p> :
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(240px,1fr))",gap:10}}>
            {goals.map(goal => {
              const capital = Number(goal.mpesa_amount||0) + Number(goal.cash_amount||0);
              const target = Number(goal.target_amount||0);
              const remaining = Math.max(0,target-capital);
              const progress = target>0 ? Math.min(100,capital/target*100) : 0;
              return <article key={goal.id} style={{padding:15,border:"1px solid var(--border, #334155)",borderRadius:12}}>
                <div style={{display:"flex",justifyContent:"space-between",gap:10,alignItems:"start"}}><strong>{goal.name}</strong><small>{goal.status}</small></div>
                <h3 style={{fontSize:22,margin:"10px 0 4px"}}>{money(capital)} <small style={{fontSize:12,fontWeight:400,opacity:.75}}>of {money(target)}</small></h3>
                <div role="progressbar" aria-label={goal.name+" progress"} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress)} style={{height:7,borderRadius:99,background:"var(--border, #334155)",overflow:"hidden"}}><div style={{width:progress+"%",height:"100%",background:"#38bdf8",borderRadius:99}}/></div>
                <p style={{margin:"8px 0",fontSize:12,opacity:.85}}>M-PESA: {money(Number(goal.mpesa_amount||0))} · Cash: {money(Number(goal.cash_amount||0))}</p>
                <p style={{margin:0,fontSize:12,opacity:.85}}>Remaining: {money(remaining)} · {progress.toFixed(2)}% complete</p>
                {goal.description&&<p style={{fontSize:12,opacity:.75}}>{goal.description}</p>}
              </article>;
            })}
          </div>}
      </section>}
      {active==="Reports & Settings" ? <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(170px,1fr))",gap:12,marginTop:16}}>{rows.map(r=><article key={r.report} style={{padding:16,border:"1px solid var(--border, #334155)",borderRadius:12}}><small style={{textTransform:"uppercase",letterSpacing:1}}>{r.report}</small><h2 style={{fontSize:24,margin:"8px 0"}}>{r.amount!==undefined?money(r.amount):r.count}</h2>{r.report==="income"||r.report==="expenses"?<small>From saved KES ledger records only</small>:null}</article>)}</div>
      : active==="Approvals" ? <div style={{display:"grid",gap:10,marginTop:14}}>{filtered.map(r=><article key={r.id} style={{padding:14,border:"1px solid var(--border, #334155)",borderRadius:12}}><strong>{r.summary}</strong><p>{r.action_type} · Risk: {r.risk_level} · Status: {r.status}</p><small>Decision records intent only. Secure executor: not configured.</small>{r.status==="pending"&&<div style={{display:"flex",gap:8,marginTop:10}}><button style={buttonStyle} disabled={busy} onClick={()=>void decide(r,"approved")}>Approve decision</button><button style={buttonStyle} disabled={busy} onClick={()=>void decide(r,"rejected")}>Reject</button></div>}</article>)}</div>
      : active==="Security & Audit" ? <div style={{display:"grid",gap:8,marginTop:14}}>{filtered.map(r=><article key={r.id} style={{padding:12,borderBottom:"1px solid var(--border, #334155)"}}><strong>{r.action}</strong><p>{r.entity_type} {r.entity_id?("· "+r.entity_id):""} · {r.outcome}</p><small>{new Date(r.created_at).toLocaleString()} · {r.actor_id===uid?"You":"Recorded actor"}</small></article>)}</div>
      : <><div style={{marginTop:14,display:"flex",gap:10,flexWrap:"wrap",alignItems:"center"}}><label style={{...inputStyle,display:"flex",alignItems:"center",gap:8,maxWidth:340}}><Search size={15}/><input aria-label="Search records" style={{border:0,outline:0,background:"transparent",color:"inherit",width:"100%"}} value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search saved records..."/></label><span>{filtered.length} records loaded</span></div>
      {editing!==null||(!editing&&Object.keys(form).length>0) ? <form onSubmit={submit} style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))",gap:12,margin:"18px 0",padding:16,border:"1px solid var(--border, #334155)",borderRadius:12}}>{config.fields.map(f=><label key={f.key} style={{display:"grid",gap:6,fontSize:12}}>{f.label}{f.type==="select"?<select required={f.required} value={form[f.key]||""} onChange={e=>setForm(p=>({...p,[f.key]:e.target.value}))} style={inputStyle}>{(f.options||[]).map(o=><option key={o} value={o}>{o}</option>)}</select>:f.type==="textarea"?<textarea required={f.required} value={form[f.key]||""} onChange={e=>setForm(p=>({...p,[f.key]:e.target.value}))} style={{...inputStyle,minHeight:90}}/>:<input required={f.required} type={f.type||"text"} min={f.type==="number"?0:undefined} step={f.type==="number"?"0.01":undefined} value={form[f.key]||""} onChange={e=>setForm(p=>({...p,[f.key]:e.target.value}))} style={inputStyle}/>}</label>)}<div style={{display:"flex",gap:8,alignItems:"end"}}><button type="submit" style={buttonStyle} disabled={busy}>{busy?"Saving…":editing?"Save changes":"Create record"}</button><button type="button" style={buttonStyle} onClick={()=>{setEditing(null);setForm({});}}>Cancel</button></div></form>:null}
      <div style={{display:"grid",gap:8,marginTop:14}}>{filtered.map(r=><article key={r.id} style={{padding:14,border:"1px solid var(--border, #334155)",borderRadius:12,display:"flex",gap:12,alignItems:"center",justifyContent:"space-between",flexWrap:"wrap"}}><div style={{minWidth:0,flex:1}}><strong>{r.name||r.title||r.description||r.category||r.kind||"Record"}</strong><p style={{margin:"5px 0",opacity:.8}}>{active==="Finance"?r.kind?.toUpperCase()+" · "+money(Number(r.amount))+" · "+r.category+" · "+r.occurred_on:active==="Customers & CRM"?[r.organization,r.email,r.phone].filter(Boolean).join(" · "):active==="Products & Services"?[r.item_type,r.status,r.price_kes==null?"":money(Number(r.price_kes))].filter(Boolean).join(" · "):active==="Knowledge Base"?(r.category||"General")+" · "+(r.tags||[]).join(", "):r.body||r.notes||""}</p>{r.status&&<small>Status: {r.status}</small>}</div>{config.fields.length>0&&<button style={buttonStyle} onClick={()=>startEdit(r)}>Edit</button>}</article>)}</div></>}
      {!busy&&rows.length===0&&active!=="Reports & Settings"&&<p style={{opacity:.75,marginTop:18}}>No records yet. Create a record to begin; existing data has not been altered.</p>}
      {busy&&<p>Loading saved records…</p>}
    </div>
    <footer className="footer-note"><span>PRUDEN COMMAND · BUILD. LEARN. INVENT. EVOLVE.</span><span><Activity size={13}/> Owner-scoped Supabase records</span></footer>
  </section>;
}
