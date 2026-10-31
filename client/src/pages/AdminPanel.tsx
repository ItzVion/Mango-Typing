import { useEffect, useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  FiActivity, FiUsers, FiCreditCard, FiMail, FiFileText, FiGift, FiGlobe,
  FiExternalLink, FiShield, FiSearch, FiPlus, FiTrash2, FiStar, FiCheck,
  FiAlertCircle, FiRefreshCw, FiEye, FiEyeOff, FiSave, FiLock, FiChevronRight,
  FiX, FiClock, FiUserPlus, FiSettings, FiCheckCircle, FiArrowUpRight,
} from "react-icons/fi";
import { api } from "../api/client";
import { useAuthStore } from "../stores/authStore";
import { Seo } from "../components/Seo";

type Tab = "overview" | "users" | "donations" | "payments" | "site" | "email" | "editor";
type LegalSlug = "privacy" | "refund" | "terms";

type AdminUser = {
  id: string; username: string; email: string; role: string;
  hasDonated: boolean; createdAt: string; googleId: string | null;
};
type AdminDonation = {
  id: string; amountRupees: number; status: string; createdAt: string;
  username: string; email: string | null; anonymous: boolean;
};
type UpiClaim = {
  id: string; amountRupees: number; utrNumber: string; status: "PENDING" | "APPROVED" | "REJECTED";
  createdAt: string; reviewedAt?: string | null; reviewNote?: string | null;
  username: string; email: string; hasDonated: boolean;
};

const NAV_GROUPS: { label: string; items: { key: Tab; label: string; icon: React.ReactNode }[] }[] = [
  { label: "WORKSPACE", items: [
    { key: "overview", label: "Overview", icon: <FiActivity/> },
    { key: "users", label: "Users", icon: <FiUsers/> },
    { key: "donations", label: "Donations", icon: <FiGift/> },
  ]},
  { label: "CONFIGURATION", items: [
    { key: "payments", label: "Payments", icon: <FiCreditCard/> },
    { key: "site", label: "Site status", icon: <FiGlobe/> },
    { key: "email", label: "Email delivery", icon: <FiMail/> },
    { key: "editor", label: "Legal content", icon: <FiFileText/> },
  ]},
];

const PAGE_META: Record<Tab, { title: string; description: string; eyebrow: string }> = {
  overview: { title: "Overview", description: "A clear view of your users, contributions and site configuration.", eyebrow: "WORKSPACE" },
  users: { title: "Users", description: "Find accounts, review supporter status and manage standard user access.", eyebrow: "WORKSPACE / ACCOUNTS" },
  donations: { title: "Donations", description: "Review manual UPI payment claims and inspect Razorpay transactions.", eyebrow: "WORKSPACE / CONTRIBUTIONS" },
  payments: { title: "Payments", description: "Configure Razorpay checkout and the alternative UPI QR payment method.", eyebrow: "CONFIGURATION / PAYMENTS" },
  site: { title: "Site status", description: "Control public availability without mixing it into payment settings.", eyebrow: "CONFIGURATION / AVAILABILITY" },
  email: { title: "Email delivery", description: "Configure SMTP and verify that account emails can be delivered.", eyebrow: "CONFIGURATION / EMAIL" },
  editor: { title: "Legal content", description: "Edit the policy pages displayed to visitors.", eyebrow: "CONFIGURATION / CONTENT" },
};

function formatDate(value: string | Date) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}
function formatDateTime(value: string | Date) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}
function Notice({ tone = "info", children }: { tone?: "info" | "success" | "danger"; children: React.ReactNode }) {
  return <div className={"mt-admin-notice " + tone} role="status">
    {tone === "success" ? <FiCheckCircle/> : tone === "danger" ? <FiAlertCircle/> : <FiActivity/>}
    <span>{children}</span>
  </div>;
}
function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return <label className="mt-admin-field"><span>{label}</span>{hint && <small>{hint}</small>}{children}</label>;
}
function StatusPill({ status }: { status: string }) {
  const value = status.toLowerCase();
  const tone = value === "paid" || value === "approved" || value === "online" || value === "owner" ? "green" :
    value === "pending" || value === "created" || value === "maintenance" ? "amber" :
    value === "rejected" || value === "failed" || value === "restricted" ? "red" : "neutral";
  return <span className={"mt-admin-pill " + tone}>{status}</span>;
}

export const AdminPanel = () => {
  const user = useAuthStore((s) => s.user);
  const authInitialized = useAuthStore((s) => s.authInitialized);
  const authError = useAuthStore((s) => s.authError);
  const [status, setStatus] = useState<"checking" | "allowed" | "denied" | "error">("checking");
  const [tab, setTab] = useState<Tab>("overview");

  const check = () => {
    if (!user) return;
    setStatus("checking");
    api.ownerSettings()
      .then(() => setStatus("allowed"))
      .catch((e: any) => setStatus(e?.status === 403 ? "denied" : "error"));
  };
  useEffect(() => { if (authInitialized) check(); }, [authInitialized, user]);

  if (!authInitialized) return <><Seo title="Admin" description="MangoTyping owner console." path="/admin" noindex/><div className="mt-admin-gate"><div className="mt-admin-gate-mark"><FiLock/></div><p>Checking owner session…</p></div></>;
  if (!user && authError) return <div className="mt-admin-gate"><FiAlertCircle size={22}/><h2>Couldn't restore your session</h2><p>The server didn't respond while checking your account.</p><button className="mt-admin-button primary" onClick={() => window.location.reload()}><FiRefreshCw/> Retry</button></div>;
  if (!user) return <Navigate to="/auth" state={{ from: "/admin" }} replace/>;
  if (status === "denied") return <Navigate to="/home" replace/>;
  if (status === "error") return <div className="mt-admin-gate"><FiAlertCircle size={22}/><h2>Couldn't verify owner access</h2><p>No settings have been changed. Check your connection and retry.</p><button className="mt-admin-button primary" onClick={check}><FiRefreshCw/> Retry</button></div>;
  if (status === "checking") return <div className="mt-admin-gate"><div className="mt-admin-gate-mark"><FiShield/></div><p>Verifying owner access…</p></div>;

  const active = PAGE_META[tab];
  return (
    <div className="mt-admin-shell">
      <Seo title={active.title + " · Admin"} description="MangoTyping owner console." path="/admin" noindex/>
      <aside className="mt-admin-sidebar">
        <a href="/" className="mt-admin-brand" aria-label="MangoTyping home">
          <span className="mt-admin-brand-mark">m</span>
          <span><b>MangoTyping</b><small>OWNER CONSOLE</small></span>
        </a>
        <div className="mt-admin-sidebar-label">MANAGE</div>
        {NAV_GROUPS.map(group => <div className="mt-admin-nav-group" key={group.label}>
          <p>{group.label}</p>
          {group.items.map(item => <button type="button" key={item.key} className={tab === item.key ? "active" : ""} onClick={() => setTab(item.key)} aria-current={tab === item.key ? "page" : undefined}>
            <span className="mt-admin-nav-icon">{item.icon}</span><span>{item.label}</span>{tab === item.key && <i/>}
          </button>)}
        </div>)}
        <div className="mt-admin-sidebar-bottom">
          <span className="mt-admin-owner-icon"><FiShield/></span>
          <span><b>Owner access</b><small>Verified for this session</small></span>
          <StatusPill status="Secure"/>
        </div>
      </aside>

      <main className="mt-admin-main">
        <header className="mt-admin-topbar">
          <div className="mt-admin-breadcrumb"><span>ADMIN</span><FiChevronRight/><b>{active.title.toUpperCase()}</b></div>
          <div className="mt-admin-top-actions">
            <span className="mt-admin-user-chip"><span className="mt-admin-avatar">{(user.username || "O").slice(0,1).toUpperCase()}</span><span>{user.username || "Owner"}</span><StatusPill status="Owner"/></span>
            <a className="mt-admin-button secondary" href="/" target="_blank" rel="noreferrer">View site <FiExternalLink/></a>
          </div>
        </header>
        <div className="mt-admin-content">
          <AnimatePresence mode="wait">
            <motion.div key={tab} initial={{opacity:0,y:7}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-5}} transition={{duration:.16}}>
              {tab === "overview" && <OverviewTab onNavigate={setTab}/>}
              {tab === "users" && <UsersTab/>}
              {tab === "donations" && <DonationsTab/>}
              {tab === "payments" && <PaymentsTab/>}
              {tab === "site" && <SiteStatusTab/>}
              {tab === "email" && <EmailTab/>}
              {tab === "editor" && <EditorTab/>}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
};

function OverviewTab({ onNavigate }: { onNavigate: (tab: Tab) => void }) {
  const [users, setUsers] = useState<AdminUser[] | null>(null);
  const [donations, setDonations] = useState<AdminDonation[] | null>(null);
  const [claims, setClaims] = useState<UpiClaim[] | null>(null);
  const [settings, setSettings] = useState<any>(null);
  const [failed, setFailed] = useState(false);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    Promise.all([api.adminUsers(), api.adminDonations(), api.adminUpiClaims(), api.ownerSettings()])
      .then(([u, d, c, s]) => { setUsers(u); setDonations(d); setClaims(c); setSettings(s); })
      .catch(() => setFailed(true))
      .finally(() => setLoading(false));
  }, []);
  const pending = (claims ?? []).filter(c => c.status === "PENDING").length;
  const paid = (donations ?? []).filter(d => d.status === "paid");
  const total = paid.reduce((sum, d) => sum + d.amountRupees, 0) + (claims ?? []).filter(c => c.status === "APPROVED").reduce((sum, c) => sum + c.amountRupees, 0);
  return <div className="mt-admin-page">
    <div className="mt-admin-page-heading">
      <div><p className="mt-admin-eyebrow">WORKSPACE OVERVIEW</p><h1>Good to see you.</h1><p>Here's the current picture across MangoTyping.</p></div>
      <button className="mt-admin-button secondary" onClick={() => window.location.reload()}><FiRefreshCw/> Refresh workspace</button>
    </div>
    {failed && <Notice tone="danger">Some overview data couldn't be loaded. Open the relevant section to retry.</Notice>}
    <section className="mt-admin-stats">
      <div className="mt-admin-stat blue"><span className="mt-admin-stat-icon"><FiUsers/></span><div><small>REGISTERED USERS</small><b>{loading ? "—" : (users?.length ?? "—").toLocaleString("en-IN")}</b></div></div>
      <div className="mt-admin-stat green"><span className="mt-admin-stat-icon"><FiGift/></span><div><small>VERIFIED SUPPORTERS</small><b>{loading ? "—" : (users?.filter(u => u.hasDonated).length ?? 0).toLocaleString("en-IN")}</b></div></div>
      <div className="mt-admin-stat amber"><span className="mt-admin-stat-icon"><FiCreditCard/></span><div><small>CONFIRMED CONTRIBUTIONS</small><b>{loading ? "—" : "₹" + total.toLocaleString("en-IN")}</b></div></div>
      <div className="mt-admin-stat violet"><span className="mt-admin-stat-icon"><FiClock/></span><div><small>UPI CLAIMS TO REVIEW</small><b>{loading ? "—" : pending}</b></div></div>
    </section>
    <div className="mt-admin-overview-grid">
      <section className="mt-admin-panel">
        <div className="mt-admin-panel-head"><div><p className="mt-admin-eyebrow">PUBLIC AVAILABILITY</p><h2>Website status</h2></div><StatusPill status={settings?.maintenanceMode ? "Maintenance" : "Online"}/></div>
        <p>Control public access independently from payment methods.</p>
        <button className="mt-admin-text-link" onClick={() => onNavigate("site")}>Manage site status <FiArrowUpRight/></button>
      </section>
      <section className="mt-admin-panel">
        <div className="mt-admin-panel-head"><div><p className="mt-admin-eyebrow">ACCOUNT MANAGEMENT</p><h2>User directory</h2></div><FiUsers/></div>
        <p>{loading ? "Loading account count…" : (users?.length ?? 0) + " registered accounts"} · search, filter and manage users.</p>
        <button className="mt-admin-text-link" onClick={() => onNavigate("users")}>Open users <FiArrowUpRight/></button>
      </section>
      <section className="mt-admin-panel">
        <div className="mt-admin-panel-head"><div><p className="mt-admin-eyebrow">CONTRIBUTIONS</p><h2>Donation review</h2></div><FiGift/></div>
        <p>{loading ? "Checking pending claims…" : pending + " UPI claim(s) waiting for manual verification."}</p>
        <button className="mt-admin-text-link" onClick={() => onNavigate("donations")}>Review donations <FiArrowUpRight/></button>
      </section>
      <section className="mt-admin-panel">
        <div className="mt-admin-panel-head"><div><p className="mt-admin-eyebrow">PAYMENT METHODS</p><h2>Checkout configuration</h2></div><FiCreditCard/></div>
        <p>{settings?.qrMode ? "UPI QR mode is active for visitors." : "Razorpay checkout is selected for visitors."}</p>
        <button className="mt-admin-text-link" onClick={() => onNavigate("payments")}>Configure payments <FiArrowUpRight/></button>
      </section>
    </div>
    <div className="mt-admin-footnote"><FiShield/> Admin actions are protected by server-side owner authorization.</div>
  </div>;
}

function UsersTab() {
  const [users, setUsers] = useState<AdminUser[] | null>(null);
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [supporterFilter, setSupporterFilter] = useState("ALL");
  const [confirmUser, setConfirmUser] = useState<AdminUser | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({email:"",username:"",password:""});
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loadError, setLoadError] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const load = () => { setLoadError(false); return api.adminUsers().then(setUsers).catch((e) => { console.error("Failed to load users",e); setLoadError(true); }); };
  useEffect(() => { load(); }, []);
  const filtered = useMemo(() => (users ?? []).filter(u => {
    const term = query.trim().toLowerCase();
    const matches = !term || [u.username,u.email,u.id].some(v => v.toLowerCase().includes(term));
    return matches && (roleFilter === "ALL" || u.role === roleFilter) && (supporterFilter === "ALL" || (supporterFilter === "YES" ? u.hasDonated : !u.hasDonated));
  }), [users,query,roleFilter,supporterFilter]);
  const remove = async () => {
    if (!confirmUser || busy || confirmUser.role === "OWNER") return;
    setBusy(true); setNotice("");
    try { await api.adminDeleteUser(confirmUser.id); setConfirmUser(null); setNotice("Account deleted."); await load(); }
    catch (e:any) { setNotice(e?.message || "Couldn't delete this account."); }
    finally { setBusy(false); }
  };
  const createUser = async (event: React.FormEvent) => {
    event.preventDefault(); setError("");
    if (form.username.trim().length < 3) { setError("Username must contain at least 3 characters."); return; }
    if (form.password.length < 8) { setError("Password must contain at least 8 characters."); return; }
    setBusy(true);
    try { await api.adminCreateUser({email:form.email.trim(),username:form.username.trim(),password:form.password}); setForm({email:"",username:"",password:""}); setShowAdd(false); setNotice("User account created."); await load(); }
    catch (e:any) { setError(e?.message || "Couldn't create this account."); }
    finally { setBusy(false); }
  };
  const supporters = (users ?? []).filter(u => u.hasDonated).length;
  const owners = (users ?? []).filter(u => u.role === "OWNER").length;
  return <div className="mt-admin-page">
    <div className="mt-admin-page-heading">
      <div><p className="mt-admin-eyebrow">WORKSPACE / ACCOUNTS</p><h1>Users</h1><p>One directory for accounts, roles and supporter access.</p></div>
      <button className="mt-admin-button primary" onClick={() => {setError("");setShowAdd(true);}}><FiUserPlus/> Add user</button>
    </div>
    <section className="mt-admin-stats compact">
      <div className="mt-admin-stat blue"><span className="mt-admin-stat-icon"><FiUsers/></span><div><small>ALL ACCOUNTS</small><b>{users?.length ?? "—"}</b></div></div>
      <div className="mt-admin-stat violet"><span className="mt-admin-stat-icon"><FiShield/></span><div><small>OWNER ACCOUNTS</small><b>{users ? owners : "—"}</b></div></div>
      <div className="mt-admin-stat green"><span className="mt-admin-stat-icon"><FiStar/></span><div><small>SUPPORTERS</small><b>{users ? supporters : "—"}</b></div></div>
    </section>
    <section className="mt-admin-table-panel">
      <div className="mt-admin-table-toolbar">
        <div><h2>Account directory</h2><p>{users ? filtered.length + " of " + users.length + " accounts" : "Loading account list"}</p></div>
        <div className="mt-admin-filters">
          <label className="mt-admin-search"><FiSearch/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search username, email or ID" aria-label="Search users"/></label>
          <select value={roleFilter} onChange={e=>setRoleFilter(e.target.value)} aria-label="Filter users by role"><option value="ALL">All roles</option><option value="USER">Users</option><option value="OWNER">Owners</option></select>
          <select value={supporterFilter} onChange={e=>setSupporterFilter(e.target.value)} aria-label="Filter users by supporter status"><option value="ALL">All supporters</option><option value="YES">Supporters</option><option value="NO">Non-supporters</option></select>
        </div>
      </div>
      {loadError ? <div className="mt-admin-empty"><FiAlertCircle/><b>Couldn't load users</b><p>Check your connection and try again.</p><button className="mt-admin-button secondary" onClick={load}><FiRefreshCw/> Retry</button></div> :
        !users ? <div className="mt-admin-empty"><span className="mt-admin-loader"/>Loading accounts…</div> :
        filtered.length === 0 ? <div className="mt-admin-empty"><FiSearch/><b>No matching accounts</b><p>Try a different search or clear the filters.</p><button className="mt-admin-button secondary" onClick={()=>{setQuery("");setRoleFilter("ALL");setSupporterFilter("ALL");}}>Clear filters</button></div> :
        <div className="mt-admin-table-wrap"><table className="mt-admin-table">
          <thead><tr><th>ACCOUNT</th><th>ROLE</th><th>SUPPORTER</th><th>SIGN-IN</th><th>JOINED</th><th className="actions-head">ACTIONS</th></tr></thead>
          <tbody>{filtered.map(u=><tr key={u.id}>
            <td><div className="mt-admin-account"><span className="mt-admin-avatar">{(u.username || "?").slice(0,1).toUpperCase()}</span><span><b>{u.username}</b><small>{u.email}</small><small className="account-id">ID · {u.id.slice(0,10)}</small></span></div></td>
            <td><StatusPill status={u.role === "OWNER" ? "Owner" : "User"}/></td>
            <td>{u.hasDonated ? <span className="mt-admin-supporter"><FiStar/> Supporter</span> : <span className="mt-admin-muted">No</span>}</td>
            <td><span className="mt-admin-muted">{u.googleId ? "Google" : "Email & password"}</span></td>
            <td><span className="mt-admin-date">{formatDate(u.createdAt)}</span></td>
            <td className="actions-cell"><button type="button" className="mt-admin-icon-button danger" disabled={u.role==="OWNER"} title={u.role==="OWNER" ? "Owner accounts cannot be deleted" : "Delete account"} aria-label={"Delete " + u.username} onClick={()=>{setNotice("");setConfirmUser(u);}}><FiTrash2/></button></td>
          </tr>)}</tbody>
        </table></div>}
      {notice && <div className="mt-admin-inline-status" role="status">{notice}</div>}
    </section>

    <AnimatePresence>
      {showAdd && <motion.div className="mt-admin-modal-backdrop" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} onMouseDown={e=>{if(e.target===e.currentTarget&&!busy)setShowAdd(false);}}>
        <motion.form className="mt-admin-modal" onSubmit={createUser} initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} exit={{opacity:0,y:8}}>
          <div className="mt-admin-modal-head"><span className="mt-admin-modal-icon"><FiUserPlus/></span><button type="button" className="mt-admin-icon-button" onClick={()=>setShowAdd(false)} aria-label="Close"><FiX/></button></div>
          <p className="mt-admin-eyebrow">ACCOUNT MANAGEMENT</p><h2>Create a user</h2><p className="modal-copy">Creates a standard USER account. Owner privileges cannot be granted from this form.</p>
          <Field label="Email address"><input className="mt-admin-input" type="email" autoComplete="email" required maxLength={254} value={form.email} onChange={e=>setForm({...form,email:e.target.value})} placeholder="person@example.com"/></Field>
          <Field label="Username" hint="3–32 characters"><input className="mt-admin-input" autoComplete="username" required minLength={3} maxLength={32} value={form.username} onChange={e=>setForm({...form,username:e.target.value})} placeholder="username"/></Field>
          <Field label="Temporary password" hint="At least 8 characters"><div className="mt-admin-password"><input className="mt-admin-input" type={showPassword?"text":"password"} required minLength={8} autoComplete="new-password" value={form.password} onChange={e=>setForm({...form,password:e.target.value})} placeholder="Create a password"/><button type="button" onClick={()=>setShowPassword(v=>!v)} aria-label={showPassword?"Hide password":"Show password"}>{showPassword?<FiEyeOff/>:<FiEye/>}</button></div></Field>
          {error && <Notice tone="danger">{error}</Notice>}
          <div className="mt-admin-modal-actions"><button type="button" className="mt-admin-button secondary" onClick={()=>setShowAdd(false)} disabled={busy}>Cancel</button><button type="submit" className="mt-admin-button primary" disabled={busy}>{busy?"Creating…": "Create account"} <FiChevronRight/></button></div>
        </motion.form>
      </motion.div>}
      {confirmUser && <motion.div className="mt-admin-modal-backdrop" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} onMouseDown={e=>{if(e.target===e.currentTarget&&!busy)setConfirmUser(null);}}>
        <motion.div className="mt-admin-modal narrow" initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} exit={{opacity:0,y:8}}>
          <div className="mt-admin-modal-head"><span className="mt-admin-modal-icon red"><FiTrash2/></span><button className="mt-admin-icon-button" onClick={()=>setConfirmUser(null)} aria-label="Close"><FiX/></button></div>
          <p className="mt-admin-eyebrow">PERMANENT ACTION</p><h2>Delete {confirmUser.username}?</h2><p className="modal-copy">This removes the account and its account-linked data. This action cannot be undone.</p>
          <div className="mt-admin-modal-actions"><button className="mt-admin-button secondary" onClick={()=>setConfirmUser(null)} disabled={busy}>Keep account</button><button className="mt-admin-button danger" onClick={remove} disabled={busy}>{busy?"Deleting…":"Delete account"} <FiTrash2/></button></div>
        </motion.div>
      </motion.div>}
    </AnimatePresence>
  </div>;
}

function DonationsTab() {
  const [donations,setDonations] = useState<AdminDonation[] | null>(null);
  const [claims,setClaims] = useState<UpiClaim[] | null>(null);
  const [loading,setLoading] = useState(true);
  const [loadError,setLoadError] = useState(false);
  const [busyId,setBusyId] = useState<string | null>(null);
  const [notes,setNotes] = useState<Record<string,string>>({});
  const [message,setMessage] = useState("");
  const load = () => {
    setLoading(true);setLoadError(false);
    Promise.all([api.adminDonations(),api.adminUpiClaims()])
      .then(([d,c])=>{setDonations(d);setClaims(c);})
      .catch(e=>{console.error("Failed to load donations",e);setLoadError(true);})
      .finally(()=>setLoading(false));
  };
  useEffect(()=>{load();},[]);
  const review = async (id:string,action:"approve"|"reject") => {
    setBusyId(id);setMessage("");
    try { await api.adminReviewUpiClaim(id,action,notes[id]);setMessage(action==="approve"?"UPI payment approved. Supporter status has been granted.":"UPI claim rejected.");await load(); }
    catch(e:any){setMessage(e?.message||"Couldn't review the claim.");}
    finally{setBusyId(null);}
  };
  if(loading)return <div className="mt-admin-loading"><span className="mt-admin-loader"/>Loading contribution records…</div>;
  if(loadError)return <div className="mt-admin-empty"><FiAlertCircle/><b>Couldn't load donation records</b><p>Nothing was changed. Retry the request.</p><button className="mt-admin-button secondary" onClick={load}><FiRefreshCw/> Retry</button></div>;
  const pending=(claims??[]).filter(c=>c.status==="PENDING");
  const history=(claims??[]).filter(c=>c.status!=="PENDING");
  const verified=(donations??[]).filter(d=>d.status==="paid");
  const confirmedTotal=verified.reduce((sum,d)=>sum+d.amountRupees,0)+history.filter(c=>c.status==="APPROVED").reduce((sum,c)=>sum+c.amountRupees,0);
  return <div className="mt-admin-page">
    <div className="mt-admin-page-heading"><div><p className="mt-admin-eyebrow">WORKSPACE / CONTRIBUTIONS</p><h1>Donations</h1><p>Review manual UPI transfers separately from Razorpay payments.</p></div><button className="mt-admin-button secondary" onClick={load}><FiRefreshCw/> Refresh</button></div>
    <section className="mt-admin-stats compact">
      <div className="mt-admin-stat amber"><span className="mt-admin-stat-icon"><FiClock/></span><div><small>AWAITING REVIEW</small><b>{pending.length}</b></div></div>
      <div className="mt-admin-stat green"><span className="mt-admin-stat-icon"><FiCheckCircle/></span><div><small>APPROVED UPI CLAIMS</small><b>{history.filter(c=>c.status==="APPROVED").length+verified.length}</b></div></div>
      <div className="mt-admin-stat blue"><span className="mt-admin-stat-icon"><FiCreditCard/></span><div><small>CONFIRMED AMOUNT</small><b>₹{confirmedTotal.toLocaleString("en-IN")}</b></div></div>
    </section>

    <section className="mt-admin-table-panel">
      <div className="mt-admin-section-head"><div><p className="mt-admin-eyebrow">MANUAL UPI</p><h2>Pending payment claims</h2><p>Compare the exact amount and time in your UPI app before approving.</p></div><StatusPill status={pending.length+" pending"}/></div>
      {pending.length===0 ? <div className="mt-admin-empty compact"><FiCheckCircle/><b>All caught up</b><p>There are no UPI claims waiting for review.</p></div> :
        <div className="mt-admin-claim-list">{pending.map(claim=><article className="mt-admin-claim" key={claim.id}>
          <div className="claim-identity"><span className="mt-admin-avatar">{claim.username.slice(0,1).toUpperCase()}</span><div><b>{claim.username}</b><small>{claim.email}</small><small>Submitted {formatDateTime(claim.createdAt)}</small><small className="mt-admin-utr">UTR · {claim.utrNumber}</small></div></div>
          <div className="claim-amount"><small>CLAIMED AMOUNT</small><b>₹{claim.amountRupees.toLocaleString("en-IN")}</b><StatusPill status="Pending"/></div>
          <Field label="Verification note" hint="Optional — record the matching UPI reference or note"><input className="mt-admin-input" value={notes[claim.id]??""} maxLength={500} onChange={e=>setNotes(v=>({...v,[claim.id]:e.target.value}))} placeholder="UPI transaction matched…"/></Field>
          <div className="claim-actions"><button className="mt-admin-button approve" disabled={busyId===claim.id} onClick={()=>review(claim.id,"approve")}><FiCheck/> {busyId===claim.id?"Saving…":"Approve"}</button><button className="mt-admin-button danger-outline" disabled={busyId===claim.id} onClick={()=>review(claim.id,"reject")}><FiX/> Reject</button></div>
        </article>)}</div>}
    </section>

    <section className="mt-admin-table-panel">
      <div className="mt-admin-section-head"><div><p className="mt-admin-eyebrow">UPI TRANSFER RECORDS</p><h2>Reviewed claims</h2><p>Approved claims grant the supporter star; rejected claims remain in history.</p></div></div>
      {history.length===0?<div className="mt-admin-empty compact"><p>No reviewed UPI claims yet.</p></div>:
        <div className="mt-admin-table-wrap"><table className="mt-admin-table"><thead><tr><th>ACCOUNT</th><th>AMOUNT</th><th>UTR</th><th>SUBMITTED</th><th>REVIEWED</th><th>STATUS</th></tr></thead><tbody>
          {history.map(c=><tr key={c.id}><td><div className="mt-admin-table-account"><b>{c.username}</b><small>{c.email}</small></div></td><td className="amount-cell">₹{c.amountRupees.toLocaleString("en-IN")}</td><td className="mt-admin-utr">{c.utrNumber}</td><td>{formatDateTime(c.createdAt)}</td><td>{c.reviewedAt?formatDateTime(c.reviewedAt):"—"}</td><td><StatusPill status={c.status}/></td></tr>)}
        </tbody></table></div>}
    </section>

    <section className="mt-admin-table-panel">
      <div className="mt-admin-section-head"><div><p className="mt-admin-eyebrow">RAZORPAY</p><h2>Gateway donations</h2><p>Transactions confirmed through Razorpay's verification flow.</p></div></div>
      {(donations??[]).length===0?<div className="mt-admin-empty compact"><p>No Razorpay donations recorded.</p></div>:
        <div className="mt-admin-table-wrap"><table className="mt-admin-table"><thead><tr><th>CONTRIBUTOR</th><th>AMOUNT</th><th>DATE</th><th>STATUS</th></tr></thead><tbody>
          {(donations??[]).map(d=><tr key={d.id}><td><div className="mt-admin-table-account"><b>{d.anonymous?"Anonymous":d.username}</b><small>{d.email??"No email attached"}</small></div></td><td className="amount-cell">₹{d.amountRupees.toLocaleString("en-IN")}</td><td>{formatDateTime(d.createdAt)}</td><td><StatusPill status={d.status}/></td></tr>)}
        </tbody></table></div>}
    </section>
    {message&&<Notice tone="success">{message}</Notice>}
  </div>;
}

function PaymentsTab() {
  const [form,setForm] = useState({razorpayKeyId:"",razorpayKeySecret:"",donationMessage:"",supportEmail:"",qrMode:false});
  const [status,setStatus] = useState("");
  const [saving,setSaving] = useState(false);
  const [ready,setReady] = useState(false);
  const [loadError,setLoadError] = useState(false);
  const load = () => {
    setReady(false);setLoadError(false);
    api.ownerSettings().then(s=>setForm({razorpayKeyId:s.razorpayKeyId??"",razorpayKeySecret:s.razorpayKeySecret??"",donationMessage:s.donationMessage??"",supportEmail:s.supportEmail??"",qrMode:!!s.qrMode}))
      .catch(e=>{console.error("Failed to load payment settings",e);setLoadError(true);}).finally(()=>setReady(true));
  };
  useEffect(()=>{load();},[]);
  const save = async () => {
    if(saving)return;setSaving(true);setStatus("");
    try { await api.updateSettings(form);await api.publicSettings(true);setStatus("Payment settings saved."); }
    catch(e:any){setStatus(e?.message||"Couldn't save payment settings.");}
    finally{setSaving(false);}
  };
  const onCsvSelected = async(file:File) => {
    setStatus("Reading CSV…");
    try {
      const rows=(await file.text()).split(/\r?\n/).map(line=>line.split(",").map(cell=>cell.trim().replace(/^"|"$/g,""))).filter(cells=>cells.length>=2&&cells[0]);
      let keyId="",keySecret="";
      for(const [type,value] of rows){const t=type.toLowerCase();if(t.includes("key id"))keyId=value;else if(t.includes("key secret"))keySecret=value;}
      if(!keyId&&!keySecret){setStatus("No Key ID or Key Secret was found in that CSV.");return;}
      setForm(f=>({...f,...(keyId?{razorpayKeyId:keyId}:{}),...(keySecret?{razorpayKeySecret:keySecret}:{})}));
      setStatus("Credentials imported locally. Review and save when ready.");
    }catch{setStatus("Couldn't read that CSV file.");}
  };
  if(!ready)return <div className="mt-admin-loading"><span className="mt-admin-loader"/>Loading payment configuration…</div>;
  if(loadError)return <div className="mt-admin-empty"><FiAlertCircle/><b>Payment settings unavailable</b><p>No changes have been made.</p><button className="mt-admin-button secondary" onClick={load}><FiRefreshCw/> Retry</button></div>;
  return <div className="mt-admin-page">
    <div className="mt-admin-page-heading"><div><p className="mt-admin-eyebrow">CONFIGURATION / PAYMENTS</p><h1>Payment methods</h1><p>Choose which payment experience visitors see. Existing Razorpay credentials remain saved when QR mode is active.</p></div></div>
    <section className="mt-admin-method-grid">
      <article className={"mt-admin-method-card razorpay"+(!form.qrMode?" selected":"")}><div className="method-card-head"><span className="method-icon"><FiCreditCard/></span><StatusPill status={!form.qrMode?"Selected":"Available"}/></div><p className="mt-admin-eyebrow">METHOD 01</p><h2>Razorpay checkout</h2><p>Secure hosted checkout with server-side order creation and payment signature verification.</p><div className="method-detail"><FiLock/> Credentials stay on the server.</div></article>
      <article className={"mt-admin-method-card upi"+(form.qrMode?" selected":"")}><div className="method-card-head"><span className="method-icon"><FiGlobe/></span><StatusPill status={form.qrMode?"Selected":"Available"}/></div><p className="mt-admin-eyebrow">METHOD 02</p><h2>UPI QR payment</h2><p>Visitors scan your UPI QR, submit a payment claim, and wait for you to approve it.</p><div className="method-detail"><FiShield/> Manual verification before supporter access.</div></article>
    </section>
    <section className="mt-admin-panel">
      <div className="mt-admin-panel-head"><div><p className="mt-admin-eyebrow">PUBLIC CHECKOUT</p><h2>Choose active payment method</h2><p>Switching methods does not delete the other method's configuration.</p></div></div>
      <label className="mt-admin-setting-switch"><span><b>UPI QR mode</b><small>{form.qrMode?"Visitors will see the UPI QR and payment-claim flow.":"Visitors will use Razorpay's secure checkout."}</small></span><input type="checkbox" checked={form.qrMode} onChange={e=>setForm({...form,qrMode:e.target.checked})}/><i/></label>
      {form.qrMode&&<Notice tone="info">UPI claims stay pending until you verify the exact amount in your UPI app and approve them in Donations.</Notice>}
    </section>
    <section className="mt-admin-panel">
      <div className="mt-admin-panel-head"><div><p className="mt-admin-eyebrow">RAZORPAY CONFIGURATION</p><h2>Gateway credentials</h2><p>These are retained even while UPI QR mode is selected.</p></div></div>
      <Field label="Import Razorpay CSV" hint="This file is read in your browser only. Review imported values before saving."><input className="mt-admin-input file-input" type="file" accept=".csv,text/csv" onChange={e=>{const f=e.target.files?.[0];if(f)onCsvSelected(f);e.target.value="";}}/></Field>
      <div className="mt-admin-form-grid">
        <Field label="Razorpay Key ID"><input className="mt-admin-input" value={form.razorpayKeyId} onChange={e=>setForm({...form,razorpayKeyId:e.target.value})} placeholder="rzp_live_…" autoComplete="off"/></Field>
        <Field label="Razorpay Key Secret" hint="Leave the masked value unchanged to keep the saved secret."><input className="mt-admin-input" type="password" value={form.razorpayKeySecret} onChange={e=>setForm({...form,razorpayKeySecret:e.target.value})} placeholder="••••••••••" autoComplete="new-password"/></Field>
      </div>
    </section>
    <section className="mt-admin-panel">
      <div className="mt-admin-panel-head"><div><p className="mt-admin-eyebrow">PUBLIC DONATION PAGE</p><h2>Contribution details</h2><p>Text and contact information visible on the support page.</p></div></div>
      <Field label="Donation page message"><textarea className="mt-admin-input textarea" value={form.donationMessage} maxLength={4000} onChange={e=>setForm({...form,donationMessage:e.target.value})}/></Field>
      <Field label="Support email" hint="Shown in the site footer."><input className="mt-admin-input" type="email" value={form.supportEmail} onChange={e=>setForm({...form,supportEmail:e.target.value})} placeholder="support@mangotyping.fun"/></Field>
    </section>
    <div className="mt-admin-savebar"><div>{status&&<span role="status">{status}</span>}</div><button className="mt-admin-button primary" onClick={save} disabled={saving}><FiSave/>{saving?"Saving…":"Save payment settings"}</button></div>
  </div>;
}

function SiteStatusTab() {
  const [maintenance,setMaintenance] = useState(false);
  const [ready,setReady] = useState(false);
  const [saving,setSaving] = useState(false);
  const [message,setMessage] = useState("");
  const [error,setError] = useState(false);
  useEffect(()=>{api.ownerSettings().then(s=>setMaintenance(!!s.maintenanceMode)).catch(()=>setError(true)).finally(()=>setReady(true));},[]);
  const save=async()=>{setSaving(true);setMessage("");try{await api.updateSettings({maintenanceMode:maintenance});await api.publicSettings(true);setMessage(maintenance?"Maintenance mode enabled. Visitors will see the maintenance screen.":"The website is online for visitors.");}catch(e:any){setMessage(e?.message||"Couldn't save site status.");}finally{setSaving(false);}};
  if(!ready)return <div className="mt-admin-loading"><span className="mt-admin-loader"/>Loading availability settings…</div>;
  if(error)return <div className="mt-admin-empty"><FiAlertCircle/><b>Couldn't load site status</b><button className="mt-admin-button secondary" onClick={()=>window.location.reload()}><FiRefreshCw/> Retry</button></div>;
  return <div className="mt-admin-page">
    <div className="mt-admin-page-heading"><div><p className="mt-admin-eyebrow">CONFIGURATION / AVAILABILITY</p><h1>Website availability</h1><p>Use maintenance mode during planned downtime or an active incident.</p></div><StatusPill status={maintenance?"Maintenance":"Online"}/></div>
    <section className="mt-admin-status-panel">
      <div className={"status-visual "+(maintenance?"maintenance":"online")}><FiGlobe/></div>
      <div className="status-copy"><p className="mt-admin-eyebrow">PUBLIC ACCESS</p><h2>{maintenance?"Maintenance mode is enabled":"Your website is online"}</h2><p>{maintenance?"Visitors who are not the owner see the maintenance page. Owner access to /admin remains available.":"Visitors can access MangoTyping normally. Payment and user settings are unaffected."}</p></div>
    </section>
    <section className="mt-admin-panel">
      <label className="mt-admin-setting-switch"><span><b>Website down / maintenance mode</b><small>When enabled, regular visitors see the maintenance page. The owner can still access the admin console.</small></span><input type="checkbox" checked={maintenance} onChange={e=>setMaintenance(e.target.checked)}/><i/></label>
      {maintenance&&<Notice tone="danger">The public site will be unavailable to regular visitors after you save this change.</Notice>}
      <div className="mt-admin-savebar"><div>{message&&<span role="status">{message}</span>}</div><button className="mt-admin-button primary" onClick={save} disabled={saving}><FiSave/>{saving?"Saving…":"Save site status"}</button></div>
    </section>
  </div>;
}

function EmailTab() {
  const [form,setForm]=useState({smtpHost:"",smtpPort:"",smtpSecure:false,smtpUser:"",smtpPass:"",smtpFrom:"",smtpFromName:""});
  const [status,setStatus]=useState("");const [testStatus,setTestStatus]=useState("");const [testTo,setTestTo]=useState("");
  const [testing,setTesting]=useState(false);const [saving,setSaving]=useState(false);const [ready,setReady]=useState(false);const [loadError,setLoadError]=useState(false);
  const load=()=>{setReady(false);setLoadError(false);api.ownerSettings().then(s=>setForm({smtpHost:s.smtpHost??"",smtpPort:s.smtpPort==null?"":String(s.smtpPort),smtpSecure:s.smtpSecure??false,smtpUser:s.smtpUser??"",smtpPass:s.smtpPass??"",smtpFrom:s.smtpFrom??"",smtpFromName:s.smtpFromName??""})).catch(e=>{console.error(e);setLoadError(true);}).finally(()=>setReady(true));};
  useEffect(()=>{load();},[]);
  const save=async()=>{setSaving(true);setStatus("");try{await api.updateSettings(form);setStatus("Email settings saved.");}catch(e:any){setStatus(e?.message||"Couldn't save SMTP settings.");}finally{setSaving(false);}};
  const runTest=async()=>{setTesting(true);setTestStatus("");try{const r=await api.testSmtp(testTo||undefined);setTestStatus(r.sentTo?"Test email sent to "+r.sentTo+".":"SMTP connection verified.");}catch(e:any){setTestStatus(e?.message||"SMTP test failed.");}finally{setTesting(false);}};
  if(!ready)return <div className="mt-admin-loading"><span className="mt-admin-loader"/>Loading email settings…</div>;
  if(loadError)return <div className="mt-admin-empty"><FiAlertCircle/><b>Couldn't load email settings</b><button className="mt-admin-button secondary" onClick={load}><FiRefreshCw/> Retry</button></div>;
  return <div className="mt-admin-page">
    <div className="mt-admin-page-heading"><div><p className="mt-admin-eyebrow">CONFIGURATION / EMAIL</p><h1>Email delivery</h1><p>SMTP is used for verification codes and account email.</p></div></div>
    <section className="mt-admin-panel">
      <div className="mt-admin-panel-head"><div><h2>SMTP connection</h2><p>Leave fields blank to use the server's SMTP environment variables.</p></div></div>
      <div className="mt-admin-form-grid">
        <Field label="SMTP host"><input className="mt-admin-input" value={form.smtpHost} onChange={e=>setForm({...form,smtpHost:e.target.value})} placeholder="smtp.zoho.in"/></Field>
        <Field label="SMTP port"><input className="mt-admin-input" inputMode="numeric" value={form.smtpPort} onChange={e=>setForm({...form,smtpPort:e.target.value.replace(/\D/g,"")})} placeholder="465"/></Field>
        <Field label="SMTP username"><input className="mt-admin-input" value={form.smtpUser} onChange={e=>setForm({...form,smtpUser:e.target.value})} placeholder="support@mangotyping.fun"/></Field>
        <Field label="SMTP password" hint="Keep the masked value to retain the saved password."><input className="mt-admin-input" type="password" value={form.smtpPass} onChange={e=>setForm({...form,smtpPass:e.target.value})} placeholder="••••••••"/></Field>
        <Field label="From address"><input className="mt-admin-input" type="email" value={form.smtpFrom} onChange={e=>setForm({...form,smtpFrom:e.target.value})} placeholder="support@mangotyping.fun"/></Field>
        <Field label="From name"><input className="mt-admin-input" value={form.smtpFromName} onChange={e=>setForm({...form,smtpFromName:e.target.value})} placeholder="MangoTyping"/></Field>
      </div>
      <label className="mt-admin-setting-switch"><span><b>Secure connection (SMTP_SECURE)</b><small>Enable TLS-secured SMTP, typically used with port 465.</small></span><input type="checkbox" checked={!!form.smtpSecure} onChange={e=>setForm({...form,smtpSecure:e.target.checked})}/><i/></label>
      <div className="mt-admin-savebar"><div>{status&&<span role="status">{status}</span>}</div><button className="mt-admin-button primary" onClick={save} disabled={saving}><FiSave/>{saving?"Saving…":"Save email settings"}</button></div>
    </section>
    <section className="mt-admin-panel">
      <div className="mt-admin-panel-head"><div><h2>Test delivery</h2><p>Verify the SMTP connection, optionally sending one real test email.</p></div></div>
      <div className="mt-admin-test-row"><Field label="Send test email to (optional)"><input className="mt-admin-input" type="email" value={testTo} onChange={e=>setTestTo(e.target.value)} placeholder="you@example.com"/></Field><button className="mt-admin-button secondary" onClick={runTest} disabled={testing}>{testing?"Testing…":"Test SMTP"} <FiArrowUpRight/></button></div>
      {testStatus&&<Notice tone={testStatus.includes("failed")||testStatus.includes("Couldn't")?"danger":"success"}>{testStatus}</Notice>}
    </section>
  </div>;
}

const LEGAL_PAGES: {slug:LegalSlug;label:string}[]=[{slug:"privacy",label:"Privacy policy"},{slug:"refund",label:"Refund policy"},{slug:"terms",label:"Terms of service"}];
function EditorTab() {
  const [slug,setSlug]=useState<LegalSlug>("privacy");const [content,setContent]=useState("");const [status,setStatus]=useState("");
  const [ready,setReady]=useState(false);const [loadError,setLoadError]=useState(false);const [saving,setSaving]=useState(false);
  const load=()=>{setReady(false);setLoadError(false);api.adminLegalPage(slug).then(p=>setContent(p.content)).catch(e=>{console.error(e);setLoadError(true);}).finally(()=>setReady(true));};
  useEffect(()=>{load();},[slug]);
  const save=async()=>{setSaving(true);setStatus("");try{await api.adminUpdateLegalPage(slug,content);setStatus("Content saved.");}catch(e:any){setStatus(e?.message||"Couldn't save this page.");}finally{setSaving(false);}};
  return <div className="mt-admin-page">
    <div className="mt-admin-page-heading"><div><p className="mt-admin-eyebrow">CONFIGURATION / CONTENT</p><h1>Legal content</h1><p>Edit the text shown on your public legal pages.</p></div></div>
    <section className="mt-admin-panel">
      <div className="mt-admin-tabs">{LEGAL_PAGES.map(p=><button type="button" key={p.slug} className={slug===p.slug?"active":""} onClick={()=>setSlug(p.slug)}>{p.label}</button>)}</div>
      {loadError?<div className="mt-admin-empty"><FiAlertCircle/><b>Couldn't load this page</b><button className="mt-admin-button secondary" onClick={load}><FiRefreshCw/> Retry</button></div>:!ready?<div className="mt-admin-loading"><span className="mt-admin-loader"/>Loading content…</div>:
        <><Field label={LEGAL_PAGES.find(p=>p.slug===slug)?.label??"Legal text"} hint="Separate paragraphs with a blank line."><textarea className="mt-admin-input legal-editor" value={content} onChange={e=>setContent(e.target.value)}/></Field>
        <div className="mt-admin-savebar"><div>{status&&<span role="status">{status}</span>}</div><button className="mt-admin-button primary" onClick={save} disabled={saving}><FiSave/>{saving?"Saving…":"Save content"}</button></div></>}
    </section>
  </div>;
}
