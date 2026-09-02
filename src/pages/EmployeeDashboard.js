import React from "react";
import { Link } from "react-router-dom";
import Layout from "../components/Layout";
import { useAuth } from "../context/AuthContext";
import { useGet } from "../hooks/useEmployeeApi";
import StatusPill from "../components/StatusPill";
import CountUp from "../components/CountUp";

function avatarBg(name){const c=["#1a56db","#059669","#7c3aed","#b45309","#be185d","#0284c7"];return c[(name||"A").charCodeAt(0)%c.length];}
function initials(name){return(name||"U").split(" ").map((w)=>w[0]).join("").toUpperCase().slice(0,2);}

const QUICK_ACTIONS=[
  {label:"My Assets",      icon:"💻", color:"#1a56db", bg:"#eff6ff", sub:"View assigned devices", link:"/emp/assets"},
  {label:"Raise Request",  icon:"📋", color:"#059669", bg:"#ecfdf5", sub:"Request new equipment", link:"/emp/request"},
  {label:"My Profile",     icon:"👤", color:"#7c3aed", bg:"#f5f3ff", sub:"View your details",     link:"/emp/profile"},
  {label:"Change Password",icon:"🔒", color:"#d97706", bg:"#fffbeb", sub:"Update credentials",    link:"/emp/password"},
];

export default function EmployeeDashboard() {
  const { user } = useAuth();
  const { data: db, loading, error } = useGet("/dashboard");
  const { data: assetList, loading: aLoading } = useGet("/assets");

  const now = new Date();
  const greeting = now.getHours()<12?"Good morning":now.getHours()<17?"Good afternoon":"Good evening";

  const recentAssets = (assetList||[]).slice(0,4);
  const name = loading?"…":(db?.name||user?.name||"Employee");

  return (
    <Layout title="My Dashboard" subtitle="Your personal asset portal">
      {/* Welcome Banner */}
      <div style={{
        background:"linear-gradient(135deg,#1a56db 0%,#2563eb 60%,#3b82f6 100%)",
        borderRadius:16, padding:"28px 32px", marginBottom:24,
        display:"flex", alignItems:"center", justifyContent:"space-between",
        flexWrap:"wrap", gap:16,
        position:"relative", overflow:"hidden",
        boxShadow:"0 8px 32px rgba(26,86,219,0.28)",
      }}>
        {/* Decorative circles */}
        <div style={{position:"absolute",right:-60,top:-60,width:220,height:220,borderRadius:"50%",background:"rgba(255,255,255,0.06)"}}/>
        <div style={{position:"absolute",right:80,bottom:-80,width:160,height:160,borderRadius:"50%",background:"rgba(255,255,255,0.04)"}}/>

        <div style={{display:"flex",alignItems:"center",gap:18,position:"relative",zIndex:1}}>
          <div style={{
            width:56,height:56,borderRadius:15,
            background:avatarBg(name),
            border:"3px solid rgba(255,255,255,0.3)",
            display:"flex",alignItems:"center",justifyContent:"center",
            fontSize:20,fontWeight:800,color:"#fff",flexShrink:0,
            boxShadow:"0 4px 14px rgba(0,0,0,0.2)",
          }}>
            {initials(name)}
          </div>
          <div>
            <div style={{fontSize:13,color:"rgba(255,255,255,0.75)",marginBottom:4,fontWeight:500}}>
              {greeting} 👋
            </div>
            <div style={{fontSize:22,fontWeight:800,color:"#fff",letterSpacing:"-0.5px",lineHeight:1.2}}>
              Hi, {name}
            </div>
            <div style={{fontSize:13,color:"rgba(255,255,255,0.7)",marginTop:5,display:"flex",gap:12,flexWrap:"wrap"}}>
              {db?.department&&<span>🏢 {db.department}</span>}
              {db?.designation&&<span>💼 {db.designation}</span>}
              {db?.employeeId&&<span style={{fontFamily:"monospace",fontSize:12}}>🆔 {db.employeeId}</span>}
            </div>
          </div>
        </div>

        <div className="welcome-banner-icon" style={{fontSize:56,opacity:0.6,position:"relative",zIndex:1,flexShrink:0}}>🏢</div>
      </div>

      {error&&(
        <div style={{marginBottom:20,borderRadius:10,padding:"12px 18px",background:"#fef2f2",border:"1px solid #fecaca",fontSize:13,color:"#991b1b"}}>
          ⚠️ {error}
        </div>
      )}

      {/* KPI Cards */}
      <div className="kpi-row kpi-row-3 stagger-in" style={{marginBottom:24}}>
        <div className="kpi-card-vivid" style={{background:"linear-gradient(135deg,#60a5fa,#1d4ed8)",boxShadow:"0 8px 24px #1d4ed840"}}>
          <div className="kpi-vivid-icon">💻</div>
          <div className="kpi-vivid-value">{loading?"—":<CountUp value={db?.assignedAssets??0} />}</div>
          <div className="kpi-vivid-label">Assigned Assets</div>
          <div style={{fontSize:11,color:"rgba(255,255,255,0.7)",marginTop:4}}>Devices in your care</div>
        </div>

        <div className="kpi-card-vivid" style={{background:"linear-gradient(135deg,#fbbf24,#d97706)",boxShadow:"0 8px 24px #d9770640"}}>
          <div className="kpi-vivid-icon">📋</div>
          <div className="kpi-vivid-value">{loading?"—":<CountUp value={db?.pendingRequests??0} />}</div>
          <div className="kpi-vivid-label">Pending Requests</div>
          <div style={{fontSize:11,color:"rgba(255,255,255,0.7)",marginTop:4}}>Awaiting IT team review</div>
        </div>

        <div className="kpi-card-vivid" style={{background:"linear-gradient(135deg,#34d399,#059669)",boxShadow:"0 8px 24px #10b98140"}}>
          <div className="kpi-vivid-icon">✅</div>
          <div className="kpi-vivid-value">{loading?"—":(db?.profileStatus||"Active")}</div>
          <div className="kpi-vivid-label">Profile Status</div>
          <div style={{fontSize:11,color:"rgba(255,255,255,0.7)",marginTop:4}}>{db?.designation||user?.roleTitle||"Employee"}</div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="card" style={{marginBottom:24}}>
        <div className="card-header">
          <div className="card-title">Quick Actions</div>
          <div className="card-subtitle" style={{fontSize:12,color:"var(--gray-400)"}}>What would you like to do?</div>
        </div>
        <div className="card-body">
          <div className="action-grid">
            {QUICK_ACTIONS.map((a)=>(
              <Link key={a.label} to={a.link} style={{
                display:"flex",flexDirection:"column",alignItems:"center",gap:10,
                padding:"20px 12px",borderRadius:12,textDecoration:"none",
                background:a.bg,border:`1.5px solid ${a.color}22`,
                transition:"all 0.18s",
              }}
                onMouseEnter={(e)=>{e.currentTarget.style.transform="translateY(-2px)";e.currentTarget.style.boxShadow=`0 4px 16px ${a.color}22`;}}
                onMouseLeave={(e)=>{e.currentTarget.style.transform="translateY(0)";e.currentTarget.style.boxShadow="none";}}
              >
                <div style={{width:48,height:48,borderRadius:12,background:"#fff",border:`1.5px solid ${a.color}30`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,boxShadow:`0 2px 8px ${a.color}20`}}>
                  {a.icon}
                </div>
                <div style={{textAlign:"center"}}>
                  <div style={{fontSize:12.5,fontWeight:700,color:a.color,lineHeight:1.2}}>{a.label}</div>
                  <div style={{fontSize:11,color:"var(--gray-400)",marginTop:3}}>{a.sub}</div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* My Assets Summary */}
      <div className="card">
        <div className="card-header">
          <div>
            <div className="card-title">My Assigned Assets</div>
            <div className="card-subtitle">
              {aLoading?"Loading…":`${(assetList||[]).length} asset${(assetList||[]).length!==1?"s":""} currently assigned to you`}
            </div>
          </div>
          <Link to="/emp/assets" className="btn btn-secondary btn-sm">View All</Link>
        </div>

        {aLoading?(
          <div style={{padding:"40px 0",textAlign:"center",color:"var(--gray-400)"}}>
            <div className="loading-spinner" style={{margin:"0 auto 10px"}} />
            <div style={{fontSize:13,fontWeight:600}}>Loading your assets…</div>
          </div>
        ):recentAssets.length===0?(
          <div style={{padding:"48px 20px",textAlign:"center"}}>
            <div style={{fontSize:44,marginBottom:12,opacity:0.3}}>📭</div>
            <div style={{fontSize:14,fontWeight:700,color:"var(--gray-600)",marginBottom:6}}>No assets assigned yet</div>
            <div style={{fontSize:12.5,color:"var(--gray-400)",marginBottom:16}}>Contact your IT team or raise an asset request.</div>
            <Link to="/emp/request" className="btn btn-primary" style={{display:"inline-flex"}}>➕ Raise Request</Link>
          </div>
        ):(
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Type</th><th>Asset Name</th><th>Brand</th><th>Serial No.</th><th>Assigned On</th><th>Status</th>
                </tr>
              </thead>
              <tbody>
                {recentAssets.map((a)=>(
                  <tr key={a.assetId}>
                    <td><span style={{padding:"2px 8px",borderRadius:5,background:"#eff6ff",color:"#1d4ed8",fontSize:11,fontWeight:700}}>{a.assetType}</span></td>
                    <td style={{fontWeight:600,color:"var(--gray-900)"}}>{a.laptopName}</td>
                    <td style={{color:"var(--gray-600)"}}>{a.brand}</td>
                    <td><span style={{fontFamily:"monospace",fontSize:11.5,background:"var(--gray-100)",padding:"2px 6px",borderRadius:4,color:"var(--gray-600)"}}>{a.serialNumber}</span></td>
                    <td style={{color:"var(--gray-500)",fontSize:12.5}}>{a.assignedDate||"—"}</td>
                    <td><StatusPill status={a.assetStatus}/></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Layout>
  );
}
