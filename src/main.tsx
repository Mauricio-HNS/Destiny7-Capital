import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Activity, BrainCircuit, Building2, ChevronRight, CircleDollarSign, Cpu, Gauge, LineChart, Radio, ShieldCheck, TrendingDown, TrendingUp, Users } from 'lucide-react';
import './styles.css';

type Agent={id:number;name:string;role:string;strategy:string;capital:number;pnl:number;status:string;risk:number;x:number;y:number;action:string};
type Market={symbol:string;price:number;change:number};
const seedAgents:Agent[]=[
{id:1,name:'ARIA',role:'CEO / Orchestrator',strategy:'Capital Allocation',capital:420000,pnl:12840,status:'deciding',risk:1.4,x:12,y:19,action:'Reviewing company exposure'},
{id:2,name:'NOVA',role:'Quant Research',strategy:'Statistical Momentum',capital:310000,pnl:9340,status:'analyzing',risk:2.1,x:38,y:19,action:'Scanning momentum'},
{id:3,name:'ATLAS',role:'Trader',strategy:'Trend Following',capital:285000,pnl:14620,status:'executing',risk:2.8,x:64,y:19,action:'Managing NVDA position'},
{id:4,name:'VEGA',role:'Macro Analyst',strategy:'News + Macro',capital:260000,pnl:-3820,status:'monitoring',risk:1.8,x:12,y:61,action:'Monitoring rates'},
{id:5,name:'SENTINEL',role:'Risk Manager',strategy:'Dynamic Risk Limits',capital:390000,pnl:5120,status:'protecting',risk:0.9,x:38,y:61,action:'Validating orders'},
{id:6,name:'ORBIT',role:'Execution',strategy:'Smart Execution',capital:335000,pnl:7880,status:'routing',risk:1.7,x:64,y:61,action:'Routing simulated order'},
];
const initialMarkets:Market[]=[{symbol:'NVDA',price:142.31,change:1.82},{symbol:'MSFT',price:505.74,change:.64},{symbol:'AAPL',price:245.18,change:-.38},{symbol:'BTC',price:113420,change:2.41},{symbol:'SPX',price:6512.8,change:.27}];
function App(){
 const [agents,setAgents]=useState(seedAgents); const [markets,setMarkets]=useState(initialMarkets); const [selected,setSelected]=useState(3); const [events,setEvents]=useState<string[]>(['09:42:18 SENTINEL approved ATLAS order','09:42:14 ORBIT routed NVDA BUY 120','09:42:03 NOVA detected momentum anomaly','09:41:51 VEGA updated macro risk score']);
 useEffect(()=>{const id=setInterval(()=>{
   setMarkets(ms=>ms.map(m=>{const delta=(Math.random()-.46)*(m.symbol==='BTC'?180: m.symbol==='SPX'?7:.9); return {...m,price:Math.max(.01,m.price+delta),change:m.change+(Math.random()-.48)*.16}}));
   setAgents(as=>as.map(a=>{const drift=(Math.random()-.43)*850; return {...a,pnl:a.pnl+drift,status:['analyzing','monitoring','executing','protecting','routing'][Math.floor(Math.random()*5)]}}));
   const names=['NOVA','ATLAS','VEGA','SENTINEL','ORBIT']; const n=names[Math.floor(Math.random()*names.length)]; setEvents(e=>[`${new Date().toLocaleTimeString('en-GB')} ${n} updated simulation state`,...e].slice(0,7));
 },1400); return()=>clearInterval(id)},[]);
 const totalCapital=useMemo(()=>agents.reduce((s,a)=>s+a.capital,0),[agents]); const totalPnl=useMemo(()=>agents.reduce((s,a)=>s+a.pnl,0),[agents]); const a=agents.find(x=>x.id===selected)!;
 return <div className="app"><header><div className="brand"><div className="mark">D7</div><div><strong>DESTINY7 CAPITAL</strong><span>Autonomous Financial Company</span></div></div><div className="live"><i/> SIMULATION LIVE</div><div className="topstats"><div><span>AUM</span><b>€{(totalCapital/1e6).toFixed(2)}M</b></div><div><span>NET P&L</span><b className={totalPnl>=0?'up':'down'}>{totalPnl>=0?'+':''}€{Math.round(totalPnl).toLocaleString()}</b></div><div><span>AGENTS</span><b>{agents.length}</b></div></div></header>
 <main><section className="office"><div className="sectionTitle"><div><small>COMMAND CENTER</small><h1>Virtual Trading Floor</h1></div><div className="status"><Activity size={15}/> MARKET OPEN · PAPER TRADING</div></div>
 <div className="floor"><div className="wallScreen"><div><small>DESTINY7 MARKET MATRIX</small><b>REAL-TIME SIMULATION</b></div><div className="screenChart">{[28,45,36,59,50,67,61,82,74,92,86,100].map((h,i)=><span key={i} style={{height:`${h}%`}}/> )}</div><div className="screenNumbers"><span>RISK <b>1.7%</b></span><span>EXPOSURE <b>€1.82M</b></span><span>ORDERS <b>24</b></span></div></div>
 {agents.map(agent=><button className={`desk ${agent.id===selected?'selected':''}`} key={agent.id} style={{left:`${agent.x}%`,top:`${agent.y}%`}} onClick={()=>setSelected(agent.id)}><div className="monitor"><div className="pulse"/><span>{agent.action}</span><em>{agent.role}</em></div><div className="deskSurface"><div className="chair"/><div className="agent"><strong>{agent.name}</strong><small>{agent.status.toUpperCase()}</small></div></div></button>)}
 <div className="meeting"><Users size={18}/><span>BOARD ROOM</span><small>Strategy session</small></div><div className="ceo"><Building2 size={18}/><span>CEO OFFICE</span></div></div></section>
 <aside><div className="panelHead"><div><small>AI EMPLOYEE</small><h2>{a.name}</h2></div><div className="avatar">{a.name[0]}</div></div><div className="role">{a.role}<span>ACTIVE</span></div><div className="metrics"><div><span>CAPITAL</span><b>€{Math.round(a.capital/1000)}K</b></div><div><span>P&L</span><b className={a.pnl>=0?'up':'down'}>{a.pnl>=0?'+':''}€{Math.round(a.pnl).toLocaleString()}</b></div><div><span>RISK</span><b>{a.risk}%</b></div><div><span>STRATEGY</span><b>{a.strategy}</b></div></div><div className="decision"><small>CURRENT DECISION</small><strong>{a.action}</strong><div><Gauge size={16}/>Risk score <b>{(a.risk*18.4).toFixed(0)}/100</b></div></div><div className="agents"><div className="listTitle">AI WORKFORCE <span>{agents.length}/50</span></div>{agents.map(x=><button className={x.id===selected?'active':''} onClick={()=>setSelected(x.id)} key={x.id}><div className="miniAvatar">{x.name[0]}</div><div><b>{x.name}</b><small>{x.role}</small></div><ChevronRight size={14}/></button>)}</div></aside></main>
 <section className="bottom"><div className="market"><div className="bottomTitle"><LineChart size={16}/> LIVE MARKETS</div>{markets.map(m=><div className="ticker" key={m.symbol}><b>{m.symbol}</b><span>{m.price.toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}</span><em className={m.change>=0?'up':'down'}>{m.change>=0?'+':''}{m.change.toFixed(2)}%</em></div>)}</div><div className="feed"><div className="bottomTitle"><Radio size={16}/> EVENT STREAM</div>{events.slice(0,3).map((e,i)=><span key={i}>{e}</span>)}</div></section>
 <footer><span><Cpu size={13}/> AI CORE ONLINE</span><span><ShieldCheck size={13}/> RISK ENGINE ONLINE</span><span><CircleDollarSign size={13}/> PAPER CAPITAL · €2.00M</span><span>v0.1 SIMULATION</span></footer></div>
}
createRoot(document.getElementById('root')!).render(<React.StrictMode><App/></React.StrictMode>);
