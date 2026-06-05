import{useState,useCallback,useMemo,useEffect,useRef}from"react";
import{AreaChart,Area,BarChart,Bar,XAxis,YAxis,Tooltip,ResponsiveContainer,Cell,LabelList}from"recharts";
import{loadAll,getAll,nuke,searchEdgar}from"./api";

const INIT=[
  {n:"Berkshire Hathaway",p:"W. Buffett",cik:"1067983",c:"#1a73e8"},
  {n:"Pershing Square",p:"B. Ackman",cik:"1336528",c:"#a142f4"},
  {n:"Bridgewater",p:"R. Dalio",cik:"1350694",c:"#1e8e3e"},
  {n:"Citadel Advisors",p:"K. Griffin",cik:"1423053",c:"#f9ab00"},
  {n:"Renaissance Tech",p:"P. Brown",cik:"1037389",c:"#d93025"},
  {n:"Appaloosa Mgmt",p:"D. Tepper",cik:"1006438",c:"#12b5cb"},
  {n:"Third Point",p:"D. Loeb",cik:"1040273",c:"#e8710a"},
  {n:"Baupost Group",p:"S. Klarman",cik:"1061768",c:"#9334e6"},
  {n:"D.E. Shaw",p:"D. Shaw",cik:"1009207",c:"#185abc"},
  {n:"Soros Fund",p:"G. Soros",cik:"1029160",c:"#ea4335"},
  {n:"Viking Global",p:"A. Halvorsen",cik:"1103804",c:"#1a73e8"},
  {n:"Two Sigma",p:"J. Overdeck",cik:"1179392",c:"#e52592"},
];

const fv=v=>{if(!v&&v!==0)return"—";const a=Math.abs(v);if(a>=1e12)return`$${(a/1e12).toFixed(1)}T`;if(a>=1e9)return`$${(a/1e9).toFixed(2)}B`;if(a>=1e6)return`$${(a/1e6).toFixed(1)}M`;if(a>=1e3)return`$${(a/1e3).toFixed(0)}K`;return`$${a}`};
const fsh=s=>{if(s==null)return"—";const a=Math.abs(s);if(a>=1e6)return`${(s/1e6).toFixed(2)}M`;if(a>=1e3)return`${(s/1e3).toFixed(0)}K`;return s.toLocaleString()};
const fs=(s,plus)=>{if(s==null)return"—";const sg=s>0?(plus?"+":""):s<0?"−":"";const a=Math.abs(s);if(a>=1e6)return`${sg}${(a/1e6).toFixed(2)}M`;if(a>=1e3)return`${sg}${(a/1e3).toFixed(0)}K`;return`${sg}${a}`};
const ql=d=>{if(!d)return"";const[y,m]=d.split("-");return`Q${Math.ceil(+m/3)} '${y.slice(2)}`};

const Tip=({active,payload})=>{
  if(!active||!payload?.[0])return null;const d=payload[0].payload;
  return<div style={{background:"#fff",border:"1px solid #e0e0e0",borderRadius:4,padding:"5px 8px",fontSize:11,boxShadow:"0 2px 6px rgba(0,0,0,.08)"}}>
    <div style={{fontWeight:600}}>{d.quarter||d.name}</div>
    {d.shares!=null&&<div style={{color:"#666"}}>{fsh(d.shares)} shares</div>}
    {d.value!=null&&<div>{fv(d.value)}</div>}
  </div>
};

export default function App(){
  const[mgrs,setMgrs]=useState(INIT);
  const[data,setData]=useState({});
  const[ldg,setLdg]=useState({});
  const[view,setView]=useState("home");
  const[tab,setTab]=useState("dashboard");
  const[cik,setCik]=useState(null);
  const[cusip,setCusip]=useState(null);
  const[filter,setFilter]=useState("");
  const[stockInput,setStockInput]=useState("");
  const[selectedStock,setSelectedStock]=useState(null);
  const[showDD,setShowDD]=useState(false);
  const[addQ,setAddQ]=useState("");
  const[addRes,setAddRes]=useState([]);
  const[addLd,setAddLd]=useState(false);
  const[kpiDetail,setKpiDetail]=useState(null);
  const loadedRef=useRef(new Set());
  const autoRef=useRef(false);

  useEffect(()=>{const c=getAll();const r={};for(const[k,v]of Object.entries(c)){const qs=Object.values(v).sort((a,b)=>b.report.localeCompare(a.report));if(qs.length){r[k]={name:"",quarters:qs};loadedRef.current.add(k)}}if(Object.keys(r).length)setData(r)},[]);

  const load=useCallback(async(cik,name)=>{
    if(ldg[cik]||loadedRef.current.has(cik))return;
    loadedRef.current.add(cik);
    setLdg(p=>({...p,[cik]:{n:0}}));
    try{await loadAll(cik,(qs,nm)=>{setData(p=>({...p,[cik]:{name:nm,quarters:[...qs]}}));setLdg(p=>({...p,[cik]:{n:qs.length}}))},8)}catch(e){console.warn(e)}
    setLdg(p=>({...p,[cik]:null}));
  },[ldg]);

  useEffect(()=>{if(autoRef.current)return;autoRef.current=true;(async()=>{for(const m of INIT){if(!loadedRef.current.has(m.cik)){await load(m.cik,m.n);await new Promise(r=>setTimeout(r,400))}}})()},[]);// eslint-disable-line

  const openFund=(c,n)=>{setCik(c);setCusip(null);setFilter("");setView("fund");if(!data[c]&&!loadedRef.current.has(c))load(c,n)};
  const openPos=cu=>{setCusip(cu);setView("pos")};
  const goBack=()=>{if(view==="pos"){setView("fund");setCusip(null)}else if(view==="kpiDetail"){setView("home");setKpiDetail(null)}else{setView("home");setCik(null)}};

  const fund=data[cik];const latest=fund?.quarters?.[0];const prev=fund?.quarters?.[1];const mgr=mgrs.find(m=>m.cik===cik);

  const holdings=useMemo(()=>{
    if(!latest?.holdings)return[];
    const pm={};if(prev?.holdings)prev.holdings.forEach(h=>pm[h.cusip]=h);
    let h=latest.holdings.map(h=>({...h,prevShares:pm[h.cusip]?.shares??null,chg:pm[h.cusip]?h.shares-pm[h.cusip].shares:null,isNew:!pm[h.cusip]}));
    if(filter)h=h.filter(x=>x.name.toLowerCase().includes(filter.toLowerCase())||x.cusip.includes(filter));
    return h;
  },[latest,prev,filter]);

  const totalAUM=latest?.holdings?.reduce((s,h)=>s+h.value,0)??0;

  // ── KPIs with BOTH shares AND value, plus percentage and quarter ──
  const kpis=useMemo(()=>{
    const buys={},sells={},newP={},exits={};
    let qtrLabel="";
    for(const m of mgrs){
      const d=data[m.cik];if(!d||d.quarters.length<2)continue;
      const curr=d.quarters[0],prv=d.quarters[1];
      if(!qtrLabel)qtrLabel=`${ql(curr.report)} vs ${ql(prv.report)}`;
      const pm={};prv.holdings.forEach(h=>pm[h.cusip]=h);
      for(const h of curr.holdings){
        const p=pm[h.cusip];
        if(!p){
          if(!newP[h.cusip])newP[h.cusip]={name:h.name,cusip:h.cusip,funds:[],shares:0,value:0};
          newP[h.cusip].funds.push(m.n);newP[h.cusip].shares+=h.shares;newP[h.cusip].value+=h.value;
        }else{
          const diff=h.shares-p.shares;
          if(diff>0){
            if(!buys[h.cusip])buys[h.cusip]={name:h.name,cusip:h.cusip,funds:[],sharesAdded:0,currValue:0,prevShares:0,currShares:0};
            buys[h.cusip].funds.push(m.n);buys[h.cusip].sharesAdded+=diff;buys[h.cusip].currValue+=h.value;buys[h.cusip].prevShares+=p.shares;buys[h.cusip].currShares+=h.shares;
          }else if(diff<0){
            if(!sells[h.cusip])sells[h.cusip]={name:h.name,cusip:h.cusip,funds:[],sharesRemoved:0,currValue:0,prevValue:0,prevShares:0,currShares:0};
            sells[h.cusip].funds.push(m.n);sells[h.cusip].sharesRemoved+=Math.abs(diff);sells[h.cusip].currValue+=h.value;sells[h.cusip].prevValue+=p.value;sells[h.cusip].prevShares+=p.shares;sells[h.cusip].currShares+=h.shares;
          }
        }
      }
      for(const h of prv.holdings){
        if(!curr.holdings.find(c=>c.cusip===h.cusip)){
          if(!exits[h.cusip])exits[h.cusip]={name:h.name,cusip:h.cusip,funds:[],prevShares:0,prevValue:0};
          exits[h.cusip].funds.push(m.n);exits[h.cusip].prevShares+=h.shares;exits[h.cusip].prevValue+=h.value;
        }
      }
    }
    return{qtrLabel,
      buys:Object.values(buys).sort((a,b)=>b.sharesAdded-a.sharesAdded).slice(0,8),
      sells:Object.values(sells).sort((a,b)=>b.sharesRemoved-a.sharesRemoved).slice(0,8),
      newP:Object.values(newP).sort((a,b)=>b.funds.length-a.funds.length||b.value-a.value).slice(0,8),
      exits:Object.values(exits).sort((a,b)=>b.funds.length-a.funds.length||b.prevValue-a.prevValue).slice(0,8),
    };
  },[data,mgrs]);

  const aumChart=useMemo(()=>{if(!fund?.quarters)return[];return[...fund.quarters].reverse().map(q=>({quarter:ql(q.report),value:q.holdings.reduce((s,h)=>s+h.value,0)}))},[fund]);
  const posChart=useMemo(()=>{if(!cusip||!fund?.quarters)return[];return[...fund.quarters].reverse().map(q=>{const h=q.holdings.find(x=>x.cusip===cusip);return{quarter:ql(q.report),shares:h?.shares??0,value:h?.value??0,pct:h?.pct??0,held:!!h}})},[cusip,fund]);
  const selH=latest?.holdings?.find(h=>h.cusip===cusip);

  const stockOpts=useMemo(()=>{if(!stockInput||stockInput.length<2)return[];const q=stockInput.toLowerCase(),seen=new Set(),r=[];for(const m of mgrs){const d=data[m.cik];if(!d?.quarters?.[0])continue;for(const h of d.quarters[0].holdings){if(!seen.has(h.cusip)&&(h.name.toLowerCase().includes(q)||h.cusip.includes(q))){seen.add(h.cusip);r.push({name:h.name,cusip:h.cusip})}}}return r.slice(0,10)},[stockInput,data,mgrs]);
  const xref=useMemo(()=>{if(!selectedStock)return[];const r=[];for(const m of mgrs){const d=data[m.cik];if(!d?.quarters?.[0])continue;const h=d.quarters[0].holdings.find(x=>x.cusip===selectedStock.cusip);if(h)r.push({...h,fn:m.n,fc:m.c,cik:m.cik})}return r.sort((a,b)=>b.value-a.value)},[selectedStock,data,mgrs]);

  const loaded=Object.keys(data).length;
  const loadingN=Object.values(ldg).filter(Boolean).length;
  const hasKpis=kpis.buys.length||kpis.sells.length||kpis.newP.length||kpis.exits.length;

  const runAdd=async()=>{if(!addQ.trim())return;setAddLd(true);try{setAddRes(await searchEdgar(addQ))}catch{setAddRes([])}setAddLd(false)};
  const addMgr=r=>{if(!mgrs.find(m=>m.cik===r.cik)){const cc=["#1a73e8","#1e8e3e","#d93025","#a142f4","#12b5cb","#e52592"];setMgrs(p=>[...p,{n:r.name,p:"—",cik:r.cik,c:cc[p.length%cc.length]}])}setAddRes([]);setAddQ("");load(r.cik,r.name)};

  return(
    <div>
      <div className="topbar">
        <div className="topbar-logo">13F Explorer</div>
        {view==="home"&&<div className="topbar-nav">
          {["dashboard","managers","stocks","add"].map(t=><button key={t} className={tab===t?"on":""} onClick={()=>setTab(t)}>{t==="add"?"+ Add":t.charAt(0).toUpperCase()+t.slice(1)}</button>)}
        </div>}
        {view!=="home"&&<button className="subhead-back" onClick={goBack}>← Back</button>}
        <div className="topbar-right">
          <span><b>{loaded}</b> mgrs</span> · <span>{loadingN>0?<span style={{color:"var(--blue)"}}>{loadingN} loading</span>:"ready"}</span>
          {loaded>0&&<>{" · "}<button className="btn" style={{padding:"2px 6px",fontSize:9}} onClick={()=>{nuke();window.location.reload()}}>Reset</button></>}
        </div>
      </div>

      <div className="content">
      {/* HOME */}
      {view==="home"&&(
        <div className="fade">
          {tab==="dashboard"&&(
            <>
              {!hasKpis&&<div className="empty">{loaded<2?"Auto-loading managers… KPIs appear once 2+ are ready.":"Computing…"}</div>}
              {hasKpis&&<>
                {kpis.qtrLabel&&<div className="section-label">Institutional activity · {kpis.qtrLabel}</div>}
                <div className="kpi-grid">
                  {[
                    {key:"buys",label:"Most Bought",color:"var(--green)",items:kpis.buys,shFn:d=>`+${fsh(d.sharesAdded)}`,amtFn:d=>fv(d.currValue),pctFn:d=>d.prevShares?`+${((d.sharesAdded/d.prevShares)*100).toFixed(1)}%`:"—"},
                    {key:"sells",label:"Most Sold",color:"var(--red)",items:kpis.sells,shFn:d=>`−${fsh(d.sharesRemoved)}`,amtFn:d=>fv(d.currValue),pctFn:d=>d.prevShares?`−${((d.sharesRemoved/d.prevShares)*100).toFixed(1)}%`:"—"},
                    {key:"new",label:"New Positions",color:"var(--blue)",items:kpis.newP,shFn:d=>fsh(d.shares),amtFn:d=>fv(d.value),pctFn:d=>`${d.funds.length} fund${d.funds.length>1?"s":""}`},
                    {key:"exits",label:"Full Exits",color:"var(--orange)",items:kpis.exits,shFn:d=>fsh(d.prevShares),amtFn:d=>fv(d.prevValue),pctFn:d=>`${d.funds.length} sold`},
                  ].map(k=>(
                    <div key={k.key} className="kpi-box" onClick={()=>{setKpiDetail(k);setView("kpiDetail")}}>
                      <div className="kpi-head"><div className="kpi-head-left"><div className="kpi-dot" style={{background:k.color}}/><span style={{color:k.color}}>{k.label}</span></div></div>
                      {k.items.slice(0,3).map(d=><div className="kpi-row" key={d.cusip}><span className="kpi-name">{d.name}</span><div className="kpi-vals"><span className="kpi-shares" style={{color:k.color}}>{k.shFn(d)}</span><span className="kpi-amt">{k.amtFn(d)}</span></div></div>)}
                      {!k.items.length&&<div className="kpi-empty">None</div>}
                    </div>
                  ))}
                </div>
              </>}
              <div className="section-label">Fund managers</div>
              <div className="tbl" style={{margin:"4px 0 10px"}}>
                <div className="tbl-head"><div className="c-name">Name</div><div className="mgr-person">Manager</div><div className="c-val">AUM</div><div className="c-pct">Pos</div><div className="mgr-status">Status</div></div>
                {mgrs.map(m=>{const d=data[m.cik],l=ldg[m.cik],aum=d?.quarters?.[0]?.holdings?.reduce((s,h)=>s+h.value,0);
                  return<div key={m.cik} className="tbl-row" onClick={()=>openFund(m.cik,m.n)}>
                    <div className="c-name"><span className="mgr-dot" style={{background:m.c}}/>{m.n}</div>
                    <div className="mgr-person">{m.p}</div>
                    <div className="c-val">{aum?fv(aum):"—"}</div>
                    <div className="c-pct">{d?d.quarters[0].holdings.length:"—"}</div>
                    <div className="mgr-status">{d?`${d.quarters.length}q ✓`:l?`${l.n||0}/8`:"queue"}</div>
                  </div>
                })}
              </div>
            </>
          )}

          {tab==="managers"&&<>
            <div className="search-box"><input className="search-input" placeholder="Filter…" value={filter} onChange={e=>setFilter(e.target.value)}/></div>
            <div className="tbl">
              <div className="tbl-head"><div className="c-name">Fund</div><div className="mgr-person">Manager</div><div className="c-val">AUM</div><div className="c-pct">Pos</div><div className="c-shares">Quarters</div></div>
              {mgrs.filter(m=>!filter||m.n.toLowerCase().includes(filter.toLowerCase())).map(m=>{const d=data[m.cik],aum=d?.quarters?.[0]?.holdings?.reduce((s,h)=>s+h.value,0);
                return<div key={m.cik} className="tbl-row" onClick={()=>openFund(m.cik,m.n)}>
                  <div className="c-name" style={{fontWeight:500}}>{m.n}</div>
                  <div className="mgr-person">{m.p}</div>
                  <div className="c-val">{aum?fv(aum):"—"}</div>
                  <div className="c-pct">{d?d.quarters[0].holdings.length:"—"}</div>
                  <div className="c-shares">{d?d.quarters.length:"—"}</div>
                </div>
              })}
            </div>
          </>}

          {tab==="stocks"&&<>
            {selectedStock?<div className="selected-chip">{selectedStock.name} <span style={{color:"#999",fontWeight:400}}>({selectedStock.cusip})</span><button onClick={()=>{setSelectedStock(null);setStockInput("")}}>×</button></div>
            :<div className="search-box">
              <input className="search-input" placeholder="Search stocks by name or CUSIP…" value={stockInput} onChange={e=>{setStockInput(e.target.value);setShowDD(true)}} onFocus={()=>setShowDD(true)} onBlur={()=>setTimeout(()=>setShowDD(false),200)}/>
              {showDD&&stockOpts.length>0&&<div className="dd">{stockOpts.map(o=><div key={o.cusip} className="dd-item" onMouseDown={()=>{setSelectedStock(o);setStockInput("");setShowDD(false)}}><b>{o.name}</b><div className="dd-sub">{o.cusip}</div></div>)}</div>}
            </div>}
            {selectedStock&&xref.length>0&&<>
              <div className="stats-row">
                <div className="stat-item"><span className="stat-label">Funds</span><span className="stat-val" style={{color:"var(--blue)"}}>{xref.length}</span></div>
                <div className="stat-item"><span className="stat-label">Total value</span><span className="stat-val">{fv(xref.reduce((s,h)=>s+h.value,0))}</span></div>
                <div className="stat-item"><span className="stat-label">Total shares</span><span className="stat-val">{fsh(xref.reduce((s,h)=>s+h.shares,0))}</span></div>
              </div>
              <div className="chart-wrap"><div className="chart-title">Value by fund</div>
                <ResponsiveContainer width="100%" height={Math.max(60,xref.length*28)}>
                  <BarChart data={xref.map(h=>({name:h.fn,val:h.value/1e9,display:fv(h.value)}))} layout="vertical" margin={{top:0,right:55,bottom:0,left:0}}>
                    <XAxis type="number" hide/><YAxis type="category" dataKey="name" tick={{fontSize:10,fill:"#666"}} axisLine={false} tickLine={false} width={100}/>
                    <Tooltip content={<Tip/>}/><Bar dataKey="val" radius={[0,3,3,0]} barSize={16}>{xref.map((h,i)=><Cell key={i} fill={h.fc}/>)}<LabelList dataKey="display" position="right" style={{fontSize:10,fontWeight:600,fill:"#333"}}/></Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="tbl">{xref.map((h,i)=><div className="tbl-row" key={i} onClick={()=>{setCik(h.cik);setCusip(h.cusip);setView("pos")}}><div className="c-name">{h.fn}</div><div className="c-shares">{fsh(h.shares)}</div><div className="c-val">{fv(h.value)}</div><div className="c-pct">{h.pct}%</div><div className="c-act">›</div></div>)}</div>
            </>}
            {!selectedStock&&<div className="empty">Select a stock from the dropdown to see which managers hold it.</div>}
          </>}

          {tab==="add"&&<>
            <div className="section-label">Search SEC EDGAR for any 13F filer</div>
            <div className="add-row"><input className="search-input" style={{flex:1}} placeholder="Fund manager name…" value={addQ} onChange={e=>setAddQ(e.target.value)} onKeyDown={e=>e.key==="Enter"&&runAdd()}/><button className="btn btn-blue" onClick={runAdd} disabled={addLd}>{addLd?"…":"Search"}</button></div>
            {addRes.length>0&&<div className="tbl">{addRes.map(r=><div key={r.cik} className="tbl-row" onClick={()=>addMgr(r)}><div className="c-name">{r.name}</div><div className="c-cusip">CIK {r.cik}</div><div className="c-act"><button className="btn btn-blue" style={{fontSize:9,padding:"2px 6px"}}>Add</button></div></div>)}</div>}
            <div className="section-label" style={{marginTop:10}}>Loaded ({mgrs.length})</div>
            <div style={{fontSize:10,color:"var(--t3)"}}>{mgrs.map(m=>m.n).join(" · ")}</div>
          </>}
        </div>
      )}

      {/* KPI DETAIL — with analytics */}
      {view==="kpiDetail"&&kpiDetail&&(
        <div className="fade">
          <div className="subhead"><div className="subhead-title">{kpiDetail.label}</div><div className="subhead-meta">{kpis.qtrLabel} · {kpiDetail.items.length} stocks</div></div>
          <div className="analytics">
            {kpiDetail.items.map((d,i)=>(
              <div className="a-row" key={d.cusip} onClick={()=>{setSelectedStock({name:d.name,cusip:d.cusip});setTab("stocks");setView("home")}}>
                <div className="a-rk">{i+1}</div>
                <div className="a-body">
                  <div className="a-name">{d.name}</div>
                  <div className="a-funds">{d.cusip} · {d.funds.join(", ")}</div>
                  <div className="a-metrics">
                    {kpiDetail.key==="buys"&&<><span>Shares added: <b>{fsh(d.sharesAdded)}</b></span><span>Prev: <b>{fsh(d.prevShares)}</b></span><span>Now: <b>{fsh(d.currShares)}</b></span></>}
                    {kpiDetail.key==="sells"&&<><span>Shares sold: <b>{fsh(d.sharesRemoved)}</b></span><span>Prev: <b>{fsh(d.prevShares)}</b></span><span>Now: <b>{fsh(d.currShares)}</b></span></>}
                    {kpiDetail.key==="new"&&<><span>Shares: <b>{fsh(d.shares)}</b></span><span>{d.funds.length} fund{d.funds.length>1?"s":""}</span></>}
                    {kpiDetail.key==="exits"&&<><span>Prev shares: <b>{fsh(d.prevShares)}</b></span><span>Prev value: <b>{fv(d.prevValue)}</b></span><span>{d.funds.length} fund{d.funds.length>1?"s":""} exited</span></>}
                  </div>
                </div>
                <div className="a-right">
                  <div className="a-val" style={{color:kpiDetail.color}}>{kpiDetail.shFn(d)}</div>
                  <div className="a-pct" style={{color:kpiDetail.color}}>{kpiDetail.pctFn(d)}</div>
                </div>
              </div>
            ))}
            {!kpiDetail.items.length&&<div className="empty">None this quarter</div>}
          </div>
        </div>
      )}

      {/* FUND DETAIL */}
      {view==="fund"&&(
        <div className="fade">
          <div className="subhead">
            <div className="subhead-title">{fund?.name||mgr?.n||"Loading…"}</div>
            <div className="subhead-meta">{mgr?.p} · {ql(latest?.report)} · Filed {latest?.filed}</div>
            {latest?.secUrl&&<a href={latest.secUrl} target="_blank" rel="noreferrer" className="subhead-link">SEC Filing ↗</a>}
          </div>
          {!fund&&<div className="empty">Loading…</div>}
          {fund&&<>
            <div className="stats-row">
              <div className="stat-item"><span className="stat-label">AUM</span><span className="stat-val" style={{color:"var(--blue)"}}>{fv(totalAUM)}</span></div>
              <div className="stat-item"><span className="stat-label">Holdings</span><span className="stat-val">{latest?.holdings?.length}</span></div>
              <div className="stat-item"><span className="stat-label">Quarters</span><span className="stat-val">{fund.quarters.length}</span></div>
              <div className="stat-item"><span className="stat-label">Top 5</span><span className="stat-val">{latest?.holdings?.slice(0,5).reduce((s,h)=>s+h.pct,0).toFixed(0)}%</span></div>
            </div>
            {aumChart.length>1&&<div className="chart-wrap"><div className="chart-title">Portfolio value</div>
              <ResponsiveContainer width="100%" height={120}>
                <AreaChart data={aumChart} margin={{top:4,right:4,bottom:0,left:0}}>
                  <defs><linearGradient id="ag" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#2962ff" stopOpacity={.1}/><stop offset="100%" stopColor="#2962ff" stopOpacity={0}/></linearGradient></defs>
                  <XAxis dataKey="quarter" tick={{fontSize:9,fill:"#999"}} axisLine={false} tickLine={false}/>
                  <YAxis tick={{fontSize:9,fill:"#999"}} axisLine={false} tickLine={false} tickFormatter={fv} width={42}/>
                  <Tooltip content={<Tip/>}/><Area type="monotone" dataKey="value" stroke="#2962ff" strokeWidth={1.5} fill="url(#ag)" dot={false} activeDot={{r:3}}/>
                </AreaChart>
              </ResponsiveContainer>
            </div>}
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"6px 0"}}><div className="section-label" style={{padding:0}}>Holdings</div><input className="filter-input" placeholder="Filter…" value={filter} onChange={e=>setFilter(e.target.value)}/></div>
            <div className="tbl">
              <div className="tbl-head"><div className="c-rk">#</div><div className="c-name">Issuer</div><div className="c-cusip">CUSIP</div><div className="c-shares">Shares</div><div className="c-val">Value</div><div className="c-pct">%</div><div className="c-chg">Chg</div><div className="c-act"/></div>
              {holdings.map((h,i)=><div className="tbl-row" key={h.cusip} onClick={()=>openPos(h.cusip)}>
                <div className="c-rk">{i+1}</div><div className="c-name">{h.name}</div><div className="c-cusip">{h.cusip}</div>
                <div className="c-shares">{fsh(h.shares)}</div><div className="c-val">{fv(h.value)}</div><div className="c-pct">{h.pct}%</div>
                <div className={`c-chg ${h.chg>0?"up":h.chg<0?"dn":""}`}>{h.isNew?<span className="tag tag-g">New</span>:h.chg?fs(h.chg,true):"—"}</div>
                <div className="c-act">›</div>
              </div>)}
            </div>
          </>}
        </div>
      )}

      {/* POSITION HISTORY */}
      {view==="pos"&&(
        <div className="fade">
          <div className="subhead">
            <div className="subhead-title">{selH?.name||"Position"}</div>
            <div className="subhead-meta">{fund?.name} · {cusip}</div>
            {latest?.secUrl&&<a href={latest.secUrl} target="_blank" rel="noreferrer" className="subhead-link">SEC Filing ↗</a>}
          </div>
          {posChart.length>1&&<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"1px",background:"var(--border)",border:"1px solid var(--border)",margin:"10px 0"}}>
            <div style={{background:"#fff",padding:"8px 6px 2px"}}>
              <div className="chart-title">Shares held</div>
              <ResponsiveContainer width="100%" height={120}>
                <BarChart data={posChart} margin={{top:2,right:4,bottom:0,left:0}}>
                  <XAxis dataKey="quarter" tick={{fontSize:8,fill:"#999"}} axisLine={false} tickLine={false}/>
                  <YAxis tick={{fontSize:8,fill:"#999"}} axisLine={false} tickLine={false} tickFormatter={fsh} width={38}/>
                  <Tooltip content={<Tip/>}/><Bar dataKey="shares" radius={[3,3,0,0]} barSize={18}>{posChart.map((d,i)=><Cell key={i} fill={d.held?"#2962ff":"#eee"}/>)}</Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div style={{background:"#fff",padding:"8px 6px 2px"}}>
              <div className="chart-title">Market value</div>
              <ResponsiveContainer width="100%" height={120}>
                <AreaChart data={posChart} margin={{top:2,right:4,bottom:0,left:0}}>
                  <defs><linearGradient id="vg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#4caf50" stopOpacity={.12}/><stop offset="100%" stopColor="#4caf50" stopOpacity={0}/></linearGradient></defs>
                  <XAxis dataKey="quarter" tick={{fontSize:8,fill:"#999"}} axisLine={false} tickLine={false}/>
                  <YAxis tick={{fontSize:8,fill:"#999"}} axisLine={false} tickLine={false} tickFormatter={fv} width={38}/>
                  <Tooltip content={<Tip/>}/><Area type="monotone" dataKey="value" stroke="#4caf50" strokeWidth={1.5} fill="url(#vg)" dot={{r:2,fill:"#4caf50"}}/>
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>}
          <div className="section-label">Quarter by quarter</div>
          <div className="tbl">
            <div className="h-head"><div className="hq">Qtr</div><div className="hs">Shares</div><div className="hv">Value</div><div className="hc">Change</div><div className="hp">%Port</div></div>
            {[...posChart].reverse().map((q,i,arr)=>{const p=arr[i+1];const chg=p&&q.shares&&p.shares?q.shares-p.shares:null;
              return<div className="h-row" key={q.quarter}><div className="hq">{q.quarter}</div>
                <div className="hs">{q.held?fsh(q.shares):<span className="tag tag-r">Exit</span>}</div>
                <div className="hv">{q.held?fv(q.value):"—"}</div>
                <div className={`hc ${chg>0?"up":chg<0?"dn":""}`}>{!q.held&&p?.held?<span className="tag tag-r">Sold</span>:q.held&&!p?.held?<span className="tag tag-g">New</span>:chg?fs(chg,true):"—"}</div>
                <div className="hp">{q.held?`${q.pct}%`:"—"}</div>
              </div>})}
          </div>
          {(()=>{const others=[];for(const m of mgrs){if(m.cik===cik)continue;const d=data[m.cik]?.quarters?.[0];if(!d)continue;const h=d.holdings.find(x=>x.cusip===cusip);if(h)others.push({...h,fn:m.n,fc:m.c,cik:m.cik})}
            if(!others.length)return null;
            return<><div className="section-label" style={{marginTop:8}}>Also held by</div><div className="tbl">{others.sort((a,b)=>b.value-a.value).map((h,i)=><div className="tbl-row" key={i} onClick={()=>setCik(h.cik)}><div className="c-name"><span className="mgr-dot" style={{background:h.fc}}/>{h.fn}</div><div className="c-shares">{fsh(h.shares)}</div><div className="c-val">{fv(h.value)}</div><div className="c-pct">{h.pct}%</div><div className="c-act">›</div></div>)}</div></>
          })()}
        </div>
      )}
      </div>
    </div>
  );
}
