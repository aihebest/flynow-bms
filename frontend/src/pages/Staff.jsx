import { useState, useEffect, useCallback } from 'react';
import { useIsAuthenticated, useMsal } from '@azure/msal-react';
import { staff as staffApi } from '../api';
import toast from 'react-hot-toast';
import {
  Users, UserPlus, ChevronLeft, Search, Edit2,
  Calendar, CheckCircle2, XCircle, Clock, AlertCircle,
  Phone, Mail, Building2, Briefcase, UserCircle, Plus,
} from 'lucide-react';

// ─── Constants ────────────────────────────────────────────────────────────────

const BMS_ROLES = ['BMS.Admin', 'BMS.Manager', 'BMS.Finance', 'BMS.HR', 'BMS.Visa', 'BMS.Sales'];
const BRANCHES  = ['Head Office', 'Lagos Island', 'Victoria Island', 'Abuja', 'Port Harcourt', 'Other'];
const DEPARTMENTS = ['Management', 'Finance', 'HR & Admin', 'Hotel & Reservation', 'Ticketing', 'Visa Processing', 'IT', 'Other'];
const LEAVE_TYPES = ['Annual', 'Sick', 'Maternity', 'Paternity', 'Emergency', 'Unpaid'];

const ROLE_COLORS = {
  'BMS.Admin':   'bg-red-100 text-red-700',
  'BMS.Manager': 'bg-purple-100 text-purple-700',
  'BMS.Finance': 'bg-blue-100 text-blue-700',
  'BMS.HR':      'bg-pink-100 text-pink-700',
  'BMS.Visa':    'bg-teal-100 text-teal-700',
  'BMS.Sales':   'bg-green-100 text-green-700',
};

const LEAVE_STATUS_COLORS = {
  'Pending':   'bg-amber-100 text-amber-700',
  'Approved':  'bg-green-100 text-green-700',
  'Rejected':  'bg-red-100 text-red-700',
  'Cancelled': 'bg-gray-100 text-gray-500',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function RoleBadge({ role }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${ROLE_COLORS[role] || 'bg-gray-100 text-gray-600'}`}>
      {role?.replace('BMS.', '') || '—'}
    </span>
  );
}

function LeaveStatusBadge({ status }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${LEAVE_STATUS_COLORS[status] || 'bg-gray-100 text-gray-600'}`}>
      {status}
    </span>
  );
}

function Avatar({ name, size = 'md' }) {
  const initials = name ? name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : '?';
  const sizes = { sm: 'w-8 h-8 text-xs', md: 'w-10 h-10 text-sm', lg: 'w-14 h-14 text-lg' };
  return (
    <div className={`${sizes[size]} rounded-full bg-[#003366] text-white flex items-center justify-center font-semibold shrink-0`}>
      {initials}
    </div>
  );
}

function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

// ─── My Profile ──────────────────────────────────────────────────────────────

function MyProfile({ myStaff, tokenUser, onRefresh }) {
  const [editing, setEditing]   = useState(false);
  const [creating, setCreating] = useState(false);
  const [saving, setSaving]     = useState(false);

  const [form, setForm] = useState({
    entra_oid:   tokenUser?.oid    || '',
    email:       tokenUser?.email  || myStaff?.email  || '',
    full_name:   tokenUser?.name   || myStaff?.full_name || '',
    role:        myStaff?.role     || 'BMS.Sales',
    branch:      myStaff?.branch   || 'Head Office',
    phone:       myStaff?.phone    || '',
    department:  myStaff?.department || '',
    date_joined: myStaff?.date_joined ? myStaff.date_joined.slice(0, 10) : '',
  });

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const inputCls = "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#003366]/20";

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (myStaff) {
        await staffApi.update ? null : null; // update not exposed in api, use patch directly
        // Use update via patch
        const api = (await import('../api')).default;
        await api.patch(`/staff/${myStaff.id}`, form);
        toast.success('Profile updated');
      } else {
        const api = (await import('../api')).default;
        await api.post('/staff', form);
        toast.success('Staff profile created');
      }
      setEditing(false);
      setCreating(false);
      onRefresh();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  if (!myStaff && !creating) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center space-y-4">
        <UserCircle className="w-16 h-16 text-gray-200 mx-auto" />
        <div>
          <p className="font-semibold text-gray-700">No staff profile linked yet</p>
          <p className="text-sm text-gray-400 mt-1">Signed in as <strong>{tokenUser?.email}</strong></p>
        </div>
        <button onClick={() => setCreating(true)}
          className="inline-flex items-center gap-2 bg-[#003366] text-white px-5 py-2.5 rounded-lg hover:bg-[#002244] text-sm font-medium">
          <UserPlus className="w-4 h-4" /> Create My Staff Profile
        </button>
      </div>
    );
  }

  if (editing || creating) {
    return (
      <form onSubmit={handleSave} className="space-y-5">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 space-y-4">
          <h2 className="font-semibold text-gray-700">
            {creating ? 'Create Staff Profile' : 'Edit Profile'}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><label className="text-xs font-medium text-gray-600 block mb-1">Full Name *</label>
              <input type="text" value={form.full_name} onChange={e => set('full_name', e.target.value)} className={inputCls} required /></div>
            <div><label className="text-xs font-medium text-gray-600 block mb-1">Email *</label>
              <input type="email" value={form.email} onChange={e => set('email', e.target.value)} className={inputCls} required /></div>
            <div><label className="text-xs font-medium text-gray-600 block mb-1">Phone</label>
              <input type="tel" value={form.phone} placeholder="+234..." onChange={e => set('phone', e.target.value)} className={inputCls} /></div>
            <div><label className="text-xs font-medium text-gray-600 block mb-1">Role *</label>
              <select value={form.role} onChange={e => set('role', e.target.value)} className={inputCls}>
                {BMS_ROLES.map(r => <option key={r} value={r}>{r}</option>)}
              </select></div>
            <div><label className="text-xs font-medium text-gray-600 block mb-1">Branch</label>
              <select value={form.branch} onChange={e => set('branch', e.target.value)} className={inputCls}>
                {BRANCHES.map(b => <option key={b}>{b}</option>)}
              </select></div>
            <div><label className="text-xs font-medium text-gray-600 block mb-1">Department</label>
              <select value={form.department} onChange={e => set('department', e.target.value)} className={inputCls}>
                <option value="">Select…</option>
                {DEPARTMENTS.map(d => <option key={d}>{d}</option>)}
              </select></div>
            <div><label className="text-xs font-medium text-gray-600 block mb-1">Date Joined</label>
              <input type="date" value={form.date_joined} onChange={e => set('date_joined', e.target.value)} className={inputCls} /></div>
            {creating && (
              <div><label className="text-xs font-medium text-gray-600 block mb-1">Entra OID *</label>
                <input type="text" value={form.entra_oid} onChange={e => set('entra_oid', e.target.value)} className={`${inputCls} font-mono text-xs`} required /></div>
            )}
          </div>
        </div>
        <div className="flex gap-3">
          <button type="submit" disabled={saving}
            className="bg-[#003366] text-white px-6 py-2.5 rounded-lg hover:bg-[#002244] text-sm font-medium disabled:opacity-50">
            {saving ? 'Saving…' : 'Save Profile'}
          </button>
          <button type="button" onClick={() => { setEditing(false); setCreating(false); }}
            className="px-6 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50">
            Cancel
          </button>
        </div>
      </form>
    );
  }

  const s = myStaff;
  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <Avatar name={s.full_name} size="lg" />
            <div>
              <h2 className="text-xl font-bold text-gray-800">{s.full_name}</h2>
              <div className="flex items-center gap-2 mt-1">
                <RoleBadge role={s.role} />
                <span className={`text-xs px-2 py-0.5 rounded-full ${s.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                  {s.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>
          </div>
          <button onClick={() => setEditing(true)}
            className="flex items-center gap-2 text-sm text-[#003366] border border-[#003366] px-3 py-1.5 rounded-lg hover:bg-[#003366] hover:text-white transition-colors">
            <Edit2 className="w-3.5 h-3.5" /> Edit
          </button>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-5">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Mail className="w-4 h-4 text-gray-400" /> {s.email}
          </div>
          {s.phone && <div className="flex items-center gap-2 text-sm text-gray-600">
            <Phone className="w-4 h-4 text-gray-400" /> {s.phone}
          </div>}
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Building2 className="w-4 h-4 text-gray-400" /> {s.branch}
          </div>
          {s.department && <div className="flex items-center gap-2 text-sm text-gray-600">
            <Briefcase className="w-4 h-4 text-gray-400" /> {s.department}
          </div>}
          {s.date_joined && <div className="flex items-center gap-2 text-sm text-gray-600">
            <Calendar className="w-4 h-4 text-gray-400" /> Joined {fmtDate(s.date_joined)}
          </div>}
        </div>
      </div>
    </div>
  );
}

// ─── Staff Directory ──────────────────────────────────────────────────────────

function StaffDirectory() {
  const [data, setData]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState('');
  const [selected, setSelected] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [saving, setSaving]   = useState(false);

  const filtered = data.filter(s =>
    !search || s.full_name.toLowerCase().includes(search.toLowerCase()) ||
    s.email.toLowerCase().includes(search.toLowerCase()) ||
    (s.department || '').toLowerCase().includes(search.toLowerCase())
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await staffApi.list();
      setData(r.data.staff || []);
    } catch {
      toast.error('Failed to load staff list');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const [form, setForm] = useState({ entra_oid: '', email: '', full_name: '', role: 'BMS.Sales', branch: 'Head Office', phone: '', department: '', date_joined: '', is_active: true });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const inputCls = "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#003366]/20";

  const openNew = () => {
    setForm({ entra_oid: '', email: '', full_name: '', role: 'BMS.Sales', branch: 'Head Office', phone: '', department: '', date_joined: '', is_active: true });
    setEditTarget(null);
    setShowForm(true);
  };

  const openEdit = (s) => {
    setForm({ entra_oid: s.entra_oid || '', email: s.email, full_name: s.full_name, role: s.role, branch: s.branch || 'Head Office', phone: s.phone || '', department: s.department || '', date_joined: s.date_joined ? s.date_joined.slice(0, 10) : '', is_active: s.is_active });
    setEditTarget(s);
    setShowForm(true);
    setSelected(null);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const api = (await import('../api')).default;
      if (editTarget) {
        await api.patch(`/staff/${editTarget.id}`, form);
        toast.success('Staff updated');
      } else {
        await api.post('/staff', form);
        toast.success('Staff member added');
      }
      setShowForm(false);
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to save');
    } finally { setSaving(false); }
  };

  if (showForm) return (
    <form onSubmit={handleSave} className="space-y-5">
      <div className="flex items-center gap-3">
        <button type="button" onClick={() => setShowForm(false)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500"><ChevronLeft className="w-5 h-5" /></button>
        <h2 className="text-xl font-bold text-[#003366]">{editTarget ? 'Edit Staff Member' : 'Add Staff Member'}</h2>
      </div>
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div><label className="text-xs font-medium text-gray-600 block mb-1">Full Name *</label>
          <input type="text" value={form.full_name} onChange={e => set('full_name', e.target.value)} className={inputCls} required /></div>
        <div><label className="text-xs font-medium text-gray-600 block mb-1">Email *</label>
          <input type="email" value={form.email} onChange={e => set('email', e.target.value)} className={inputCls} required /></div>
        {!editTarget && <div className="md:col-span-2"><label className="text-xs font-medium text-gray-600 block mb-1">Entra Object ID (OID) *</label>
          <input type="text" placeholder="From Azure AD — xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" value={form.entra_oid} onChange={e => set('entra_oid', e.target.value)} className={`${inputCls} font-mono text-xs`} required /></div>}
        <div><label className="text-xs font-medium text-gray-600 block mb-1">Role *</label>
          <select value={form.role} onChange={e => set('role', e.target.value)} className={inputCls}>
            {BMS_ROLES.map(r => <option key={r} value={r}>{r}</option>)}
          </select></div>
        <div><label className="text-xs font-medium text-gray-600 block mb-1">Branch</label>
          <select value={form.branch} onChange={e => set('branch', e.target.value)} className={inputCls}>
            {BRANCHES.map(b => <option key={b}>{b}</option>)}
          </select></div>
        <div><label className="text-xs font-medium text-gray-600 block mb-1">Department</label>
          <select value={form.department} onChange={e => set('department', e.target.value)} className={inputCls}>
            <option value="">Select…</option>
            {DEPARTMENTS.map(d => <option key={d}>{d}</option>)}
          </select></div>
        <div><label className="text-xs font-medium text-gray-600 block mb-1">Phone</label>
          <input type="tel" value={form.phone} placeholder="+234..." onChange={e => set('phone', e.target.value)} className={inputCls} /></div>
        <div><label className="text-xs font-medium text-gray-600 block mb-1">Date Joined</label>
          <input type="date" value={form.date_joined} onChange={e => set('date_joined', e.target.value)} className={inputCls} /></div>
        {editTarget && <div className="flex items-center gap-3">
          <label className="text-xs font-medium text-gray-600">Active</label>
          <input type="checkbox" checked={form.is_active} onChange={e => set('is_active', e.target.checked)} className="w-4 h-4 rounded" />
        </div>}
      </div>
      <div className="flex gap-3">
        <button type="submit" disabled={saving} className="bg-[#003366] text-white px-6 py-2.5 rounded-lg hover:bg-[#002244] text-sm font-medium disabled:opacity-50">
          {saving ? 'Saving…' : editTarget ? 'Update Staff' : 'Add Staff'}
        </button>
        <button type="button" onClick={() => setShowForm(false)} className="px-6 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
      </div>
    </form>
  );

  if (selected) return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={() => setSelected(null)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500"><ChevronLeft className="w-5 h-5" /></button>
        <h2 className="text-xl font-bold text-[#003366]">Staff Profile</h2>
      </div>
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <Avatar name={selected.full_name} size="lg" />
            <div>
              <h3 className="text-xl font-bold text-gray-800">{selected.full_name}</h3>
              <div className="flex gap-2 mt-1"><RoleBadge role={selected.role} />
                <span className={`text-xs px-2 py-0.5 rounded-full ${selected.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                  {selected.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>
          </div>
          <button onClick={() => openEdit(selected)}
            className="flex items-center gap-2 text-sm text-[#003366] border border-[#003366] px-3 py-1.5 rounded-lg hover:bg-[#003366] hover:text-white transition-colors">
            <Edit2 className="w-3.5 h-3.5" /> Edit
          </button>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-5 text-sm">
          <div className="flex items-center gap-2 text-gray-600"><Mail className="w-4 h-4 text-gray-400" />{selected.email}</div>
          {selected.phone && <div className="flex items-center gap-2 text-gray-600"><Phone className="w-4 h-4 text-gray-400" />{selected.phone}</div>}
          <div className="flex items-center gap-2 text-gray-600"><Building2 className="w-4 h-4 text-gray-400" />{selected.branch}</div>
          {selected.department && <div className="flex items-center gap-2 text-gray-600"><Briefcase className="w-4 h-4 text-gray-400" />{selected.department}</div>}
          {selected.date_joined && <div className="flex items-center gap-2 text-gray-600"><Calendar className="w-4 h-4 text-gray-400" />Joined {fmtDate(selected.date_joined)}</div>}
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input type="text" placeholder="Search staff name, email, department..."
            value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#003366]/20" />
        </div>
        <button onClick={openNew}
          className="flex items-center gap-2 bg-[#003366] text-white px-4 py-2 rounded-lg hover:bg-[#002244] text-sm font-medium whitespace-nowrap">
          <UserPlus className="w-4 h-4" /> Add Staff
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48 text-gray-400 text-sm">Loading staff…</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map(s => (
            <div key={s.id} onClick={() => setSelected(s)}
              className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 hover:border-[#003366]/30 hover:shadow-md cursor-pointer transition-all">
              <div className="flex items-start gap-3">
                <Avatar name={s.full_name} size="md" />
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-gray-800 truncate">{s.full_name}</p>
                  <p className="text-xs text-gray-400 truncate mt-0.5">{s.email}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <RoleBadge role={s.role} />
                    {!s.is_active && <span className="text-xs text-gray-400">Inactive</span>}
                  </div>
                  {(s.branch || s.department) && (
                    <p className="text-xs text-gray-400 mt-1">{s.branch}{s.department ? ` · ${s.department}` : ''}</p>
                  )}
                </div>
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="col-span-3 flex flex-col items-center justify-center h-32 text-gray-400">
              <Users className="w-8 h-8 mb-2 opacity-30" />
              <p className="text-sm">{search ? 'No staff match your search.' : 'No staff records yet.'}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Leave Management ─────────────────────────────────────────────────────────

function LeaveManagement({ userRoles }) {
  const [myLeave, setMyLeave]     = useState([]);
  const [teamLeave, setTeamLeave] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [tab, setTab]             = useState('my');
  const [showForm, setShowForm]   = useState(false);
  const [saving, setSaving]       = useState(false);
  const [form, setForm]           = useState({ leave_type: 'Annual', start_date: '', end_date: '', days_count: '', reason: '' });

  const canManageLeave = userRoles?.some(r => ['BMS.Admin', 'BMS.Manager', 'BMS.HR'].includes(r));
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  // Auto-calculate days
  useEffect(() => {
    if (form.start_date && form.end_date) {
      const diff = Math.max(0, Math.round((new Date(form.end_date) - new Date(form.start_date)) / (1000 * 60 * 60 * 24)) + 1);
      setForm(f => ({ ...f, days_count: diff }));
    }
  }, [form.start_date, form.end_date]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [myRes] = await Promise.all([staffApi.getMyLeave()]);
      setMyLeave(myRes.data.leave_requests || []);
      if (canManageLeave) {
        const teamRes = await staffApi.getTeamLeave();
        setTeamLeave(teamRes.data.leave_requests || []);
      }
    } catch {
      toast.error('Failed to load leave data');
    } finally { setLoading(false); }
  }, [canManageLeave]);

  useEffect(() => { load(); }, [load]);

  const handleApply = async (e) => {
    e.preventDefault();
    if (!form.days_count || form.days_count < 1) { toast.error('Invalid date range'); return; }
    setSaving(true);
    try {
      await staffApi.applyLeave(form);
      toast.success('Leave request submitted');
      setShowForm(false);
      setForm({ leave_type: 'Annual', start_date: '', end_date: '', days_count: '', reason: '' });
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to submit leave request');
    } finally { setSaving(false); }
  };

  const handleApprove = async (id) => {
    try {
      await staffApi.approveLeave(id);
      toast.success('Leave approved');
      load();
    } catch { toast.error('Failed to approve'); }
  };

  const handleReject = async (id) => {
    const reason = window.prompt('Reason for rejection (optional):');
    if (reason === null) return; // cancelled
    try {
      await staffApi.rejectLeave(id, reason);
      toast.success('Leave rejected');
      load();
    } catch { toast.error('Failed to reject'); }
  };

  const inputCls = "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#003366]/20";

  const LeaveCard = ({ req, showStaff, onApprove, onReject }) => (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 space-y-2">
      <div className="flex items-start justify-between">
        <div>
          {showStaff && <p className="font-medium text-gray-800 text-sm">{req.staff_name}</p>}
          <div className="flex items-center gap-2 mt-1">
            <span className="text-sm font-medium text-gray-700">{req.leave_type} Leave</span>
            <LeaveStatusBadge status={req.status} />
          </div>
        </div>
        {req.status === 'Pending' && onApprove && (
          <div className="flex gap-1.5">
            <button onClick={() => onApprove(req.id)}
              className="p-1.5 rounded-lg bg-green-50 text-green-600 hover:bg-green-100 transition-colors">
              <CheckCircle2 className="w-4 h-4" />
            </button>
            <button onClick={() => onReject(req.id)}
              className="p-1.5 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 transition-colors">
              <XCircle className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
      <div className="flex items-center gap-2 text-xs text-gray-500">
        <Calendar className="w-3.5 h-3.5" />
        {fmtDate(req.start_date)} – {fmtDate(req.end_date)}
        <span className="font-medium text-gray-700">({req.days_count} day{req.days_count !== 1 ? 's' : ''})</span>
      </div>
      {req.reason && <p className="text-xs text-gray-500 bg-gray-50 rounded px-2 py-1">{req.reason}</p>}
      {req.approver_note && (
        <p className="text-xs text-gray-500">
          <span className="font-medium">{req.approved_by_name}: </span>{req.approver_note}
        </p>
      )}
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Tabs */}
      {canManageLeave && (
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit">
          {[['my', 'My Leave'], ['team', 'Team Leave']].map(([key, label]) => (
            <button key={key} onClick={() => setTab(key)}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${tab === key ? 'bg-white shadow-sm text-[#003366]' : 'text-gray-500 hover:text-gray-700'}`}>
              {label}
            </button>
          ))}
        </div>
      )}

      {/* Apply button */}
      <div className="flex justify-between items-center">
        <h2 className="text-base font-semibold text-gray-700">
          {tab === 'my' ? 'My Leave Requests' : 'Team Leave Requests'}
        </h2>
        {tab === 'my' && !showForm && (
          <button onClick={() => setShowForm(true)}
            className="flex items-center gap-2 bg-[#003366] text-white px-4 py-2 rounded-lg hover:bg-[#002244] text-sm font-medium">
            <Plus className="w-4 h-4" /> Apply for Leave
          </button>
        )}
      </div>

      {/* Apply form */}
      {showForm && (
        <form onSubmit={handleApply} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 space-y-4">
          <h3 className="font-semibold text-gray-700">New Leave Request</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><label className="text-xs font-medium text-gray-600 block mb-1">Leave Type *</label>
              <select value={form.leave_type} onChange={e => set('leave_type', e.target.value)} className={inputCls}>
                {LEAVE_TYPES.map(t => <option key={t}>{t}</option>)}
              </select></div>
            <div><label className="text-xs font-medium text-gray-600 block mb-1">Days</label>
              <input type="number" readOnly value={form.days_count || ''} className={`${inputCls} bg-gray-50`} placeholder="Auto-calculated" /></div>
            <div><label className="text-xs font-medium text-gray-600 block mb-1">Start Date *</label>
              <input type="date" value={form.start_date} onChange={e => set('start_date', e.target.value)} className={inputCls} required /></div>
            <div><label className="text-xs font-medium text-gray-600 block mb-1">End Date *</label>
              <input type="date" value={form.end_date} min={form.start_date} onChange={e => set('end_date', e.target.value)} className={inputCls} required /></div>
            <div className="md:col-span-2"><label className="text-xs font-medium text-gray-600 block mb-1">Reason</label>
              <textarea rows={2} value={form.reason} onChange={e => set('reason', e.target.value)}
                placeholder="Brief reason for leave request..."
                className={`${inputCls} resize-none`} /></div>
          </div>
          <div className="flex gap-3">
            <button type="submit" disabled={saving}
              className="bg-[#003366] text-white px-6 py-2 rounded-lg hover:bg-[#002244] text-sm font-medium disabled:opacity-50">
              {saving ? 'Submitting…' : 'Submit Request'}
            </button>
            <button type="button" onClick={() => setShowForm(false)}
              className="px-6 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50">
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Leave list */}
      {loading ? (
        <div className="flex items-center justify-center h-32 text-gray-400 text-sm">Loading…</div>
      ) : (
        <div className="space-y-3">
          {(tab === 'my' ? myLeave : teamLeave).length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-gray-400">
              <Calendar className="w-8 h-8 mb-2 opacity-30" />
              <p className="text-sm">{tab === 'my' ? 'No leave requests yet.' : 'No team leave requests.'}</p>
            </div>
          ) : (
            (tab === 'my' ? myLeave : teamLeave).map(req => (
              <LeaveCard key={req.id} req={req}
                showStaff={tab === 'team'}
                onApprove={tab === 'team' && req.status === 'Pending' ? handleApprove : null}
                onReject={tab === 'team' && req.status === 'Pending' ? handleReject : null}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main Staff Page ──────────────────────────────────────────────────────────

export default function Staff() {
  const { accounts } = useMsal();
  const [tab, setTab]       = useState('profile');
  const [myStaff, setMyStaff] = useState(null);
  const [tokenUser, setTokenUser] = useState(null);
  const [meLoading, setMeLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  // Get user's roles from MSAL account
  const userRoles = accounts[0]?.idTokenClaims?.roles || [];
  const canSeeDirectory = userRoles.some(r => ['BMS.Admin', 'BMS.Manager', 'BMS.HR'].includes(r));

  const loadMe = useCallback(async () => {
    setMeLoading(true);
    try {
      const r = await staffApi.me();
      setMyStaff(r.data.staff);
      setTokenUser(r.data.token_user || null);
    } catch {
      // ignore — staff record may not exist
    } finally { setMeLoading(false); }
  }, []);

  useEffect(() => { loadMe(); }, [loadMe, refreshKey]);

  const tabs = [
    { key: 'profile', label: 'My Profile' },
    ...(canSeeDirectory ? [{ key: 'directory', label: 'Staff Directory' }] : []),
    { key: 'leave', label: 'Leave' },
  ];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[#003366] flex items-center gap-2">
          <Users className="w-6 h-6" /> Staff
        </h1>
        <p className="text-sm text-gray-500 mt-0.5">Profiles, leave management and team directory</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${tab === t.key ? 'bg-white shadow-sm text-[#003366]' : 'text-gray-500 hover:text-gray-700'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === 'profile' && !meLoading && (
        <MyProfile myStaff={myStaff} tokenUser={tokenUser} onRefresh={() => setRefreshKey(k => k + 1)} />
      )}
      {tab === 'profile' && meLoading && (
        <div className="flex items-center justify-center h-32 text-gray-400 text-sm">Loading profile…</div>
      )}
      {tab === 'directory' && <StaffDirectory />}
      {tab === 'leave' && <LeaveManagement userRoles={userRoles} />}
    </div>
  );
}
