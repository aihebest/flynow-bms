import { useState, useEffect, useCallback } from 'react';
import { customers as api } from '../api';
import { format, parseISO, differenceInDays } from 'date-fns';
import toast from 'react-hot-toast';
import {
  Users, Plus, Search, X, ChevronRight, Phone, Mail, Building2,
  AlertTriangle, MessageSquare, Clock, Edit3, ArrowLeft,
} from 'lucide-react';

// ─── Constants ────────────────────────────────────────────────────────────
const CUSTOMER_TYPES = ['Individual','SME Corporate','Enterprise','VIP','Group'];
const SOURCES        = ['Walk-in','Phone','WhatsApp','Website Form','Referral','Email','Social Media','Other'];
const CHANNELS       = ['Phone','Email','WhatsApp','Walk-in','Teams','Portal','Other'];
const GENDERS        = [{ v:'M', l:'Male' }, { v:'F', l:'Female' }, { v:'O', l:'Other' }];

const TYPE_COLORS = {
  'Individual':    'bg-blue-100 text-blue-800',
  'SME Corporate': 'bg-purple-100 text-purple-800',
  'Enterprise':    'bg-indigo-100 text-indigo-800',
  'VIP':           'bg-amber-100 text-amber-800',
  'Group':         'bg-green-100 text-green-800',
};

// ─── Helpers ──────────────────────────────────────────────────────────────
function Badge({ label, colorClass }) {
  return <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${colorClass}`}>{label}</span>;
}

function PassportAlert({ expiry }) {
  if (!expiry) return null;
  const days = differenceInDays(parseISO(expiry), new Date());
  if (days > 180) return null;
  const color = days < 0 ? 'text-red-600' : days < 90 ? 'text-orange-500' : 'text-yellow-600';
  const msg   = days < 0 ? 'Passport expired' : `Passport expires in ${days} days`;
  return (
    <span className={`flex items-center gap-1 text-xs font-medium ${color}`}>
      <AlertTriangle size={12} /> {msg}
    </span>
  );
}

function initials(first, last) {
  return `${(first?.[0] || '').toUpperCase()}${(last?.[0] || '').toUpperCase()}`;
}

// ─── Reusable Field Components ────────────────────────────────────────────
function Field({ label, className = '', ...props }) {
  return (
    <div className={className}>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <input
        {...props}
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    </div>
  );
}

function SelectField({ label, children, ...props }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <select
        {...props}
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
      >
        {children}
      </select>
    </div>
  );
}

function InfoCard({ icon, label, value }) {
  return (
    <div className="flex items-start gap-3 bg-white border rounded-xl p-3">
      <span className="mt-0.5 text-gray-400">{icon}</span>
      <div>
        <p className="text-xs text-gray-400">{label}</p>
        <p className="text-sm font-medium text-gray-800">{value}</p>
      </div>
    </div>
  );
}

// ─── Customer Form (Create / Edit) ────────────────────────────────────────
function CustomerForm({ initial = {}, onSave, onCancel, saving }) {
  const [form, setForm] = useState({
    first_name: '', last_name: '', email: '', phone: '', whatsapp: '',
    customer_type: 'Individual', company_name: '', job_title: '',
    passport_number: '', passport_expiry: '', nationality: '',
    date_of_birth: '', gender: '', address: '', city: '', state: '',
    notes: '', source: 'Walk-in',
    ...initial,
  });

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  return (
    <form onSubmit={(e) => { e.preventDefault(); onSave(form); }} className="space-y-6">
      <section>
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Personal Details</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="First Name *" value={form.first_name} onChange={set('first_name')} required />
          <Field label="Last Name *"  value={form.last_name}  onChange={set('last_name')}  required />
          <Field label="Email"        value={form.email}       onChange={set('email')}       type="email" />
          <Field label="Phone *"      value={form.phone}       onChange={set('phone')}       required />
          <Field label="WhatsApp"     value={form.whatsapp}    onChange={set('whatsapp')} />
          <SelectField label="Gender" value={form.gender} onChange={set('gender')}>
            <option value="">— Select —</option>
            {GENDERS.map(g => <option key={g.v} value={g.v}>{g.l}</option>)}
          </SelectField>
          <Field label="Date of Birth" value={form.date_of_birth} onChange={set('date_of_birth')} type="date" />
        </div>
      </section>

      <section>
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Classification</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <SelectField label="Customer Type" value={form.customer_type} onChange={set('customer_type')}>
            {CUSTOMER_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </SelectField>
          <SelectField label="Source" value={form.source} onChange={set('source')}>
            {SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
          </SelectField>
          <Field label="Company Name" value={form.company_name} onChange={set('company_name')} />
          <Field label="Job Title"    value={form.job_title}    onChange={set('job_title')} />
        </div>
      </section>

      <section>
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Passport & Travel</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Passport Number"    value={form.passport_number}  onChange={set('passport_number')} />
          <Field label="Passport Expiry"    value={form.passport_expiry}  onChange={set('passport_expiry')} type="date" />
          <Field label="Nationality (ISO 2)" value={form.nationality}     onChange={set('nationality')} placeholder="e.g. NG" maxLength={2} />
        </div>
      </section>

      <section>
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Address</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Address" value={form.address} onChange={set('address')} className="sm:col-span-2" />
          <Field label="City"  value={form.city}  onChange={set('city')} />
          <Field label="State" value={form.state} onChange={set('state')} />
        </div>
      </section>

      <section>
        <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
        <textarea
          value={form.notes} onChange={set('notes')} rows={3}
          placeholder="Any relevant notes about this customer…"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </section>

      <div className="flex justify-end gap-3 pt-2 border-t">
        <button type="button" onClick={onCancel}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">
          Cancel
        </button>
        <button type="submit" disabled={saving}
          className="px-5 py-2 text-sm font-semibold text-white bg-[#003366] rounded-lg hover:bg-[#002244] disabled:opacity-60">
          {saving ? 'Saving…' : 'Save Customer'}
        </button>
      </div>
    </form>
  );
}

// ─── Interaction Form ─────────────────────────────────────────────────────
function InteractionForm({ customerId, onDone }) {
  const [form, setForm]     = useState({ channel: 'Phone', summary: '', outcome: '', follow_up_at: '' });
  const [saving, setSaving] = useState(false);
  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.logInteraction(customerId, form);
      toast.success('Interaction logged');
      onDone();
    } catch {
      toast.error('Failed to log interaction');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-gray-50 rounded-xl p-4 space-y-3 border">
      <h4 className="font-semibold text-gray-700">Log Interaction</h4>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <SelectField label="Channel" value={form.channel} onChange={set('channel')}>
          {CHANNELS.map(c => <option key={c} value={c}>{c}</option>)}
        </SelectField>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Follow-up Date</label>
          <input type="datetime-local" value={form.follow_up_at} onChange={set('follow_up_at')}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Summary *</label>
        <textarea value={form.summary} onChange={set('summary')} required rows={2}
          placeholder="What was discussed?"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Outcome</label>
        <input value={form.outcome} onChange={set('outcome')} placeholder="What was agreed / next step?"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
      </div>
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onDone}
          className="px-3 py-1.5 text-sm text-gray-600 border rounded-lg hover:bg-gray-100">Cancel</button>
        <button type="submit" disabled={saving}
          className="px-4 py-1.5 text-sm font-semibold text-white bg-[#003366] rounded-lg hover:bg-[#002244] disabled:opacity-60">
          {saving ? 'Saving…' : 'Log'}
        </button>
      </div>
    </form>
  );
}

// ─── Customer Detail View ─────────────────────────────────────────────────
function CustomerDetail({ customerId, onBack }) {
  const [data, setData]         = useState(null);
  const [loading, setLoading]   = useState(true);
  const [interactions, setInts] = useState([]);
  const [activeTab, setTab]     = useState('Interactions');
  const [showIntForm, setIntForm] = useState(false);
  const [editing, setEditing]   = useState(false);
  const [saving, setSaving]     = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.getById(customerId);
      setData(res.data);
    } catch {
      toast.error('Failed to load customer');
    } finally {
      setLoading(false);
    }
  }, [customerId]);

  const loadInts = useCallback(async () => {
    try {
      const res = await api.getInteractions(customerId);
      setInts(res.data.interactions);
    } catch { /* silent */ }
  }, [customerId]);

  useEffect(() => { load(); loadInts(); }, [load, loadInts]);

  const handleSave = async (form) => {
    setSaving(true);
    try {
      await api.update(customerId, form);
      toast.success('Customer updated');
      setEditing(false);
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Update failed');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex justify-center py-20 text-gray-400 text-sm">Loading customer…</div>;
  if (!data)   return null;

  const { customer, bookings, visas } = data;

  if (editing) {
    return (
      <div>
        <button onClick={() => setEditing(false)} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 mb-4">
          <ArrowLeft size={16} /> Back to profile
        </button>
        <h2 className="text-xl font-bold text-[#003366] mb-6">Edit Customer</h2>
        <CustomerForm initial={customer} onSave={handleSave} onCancel={() => setEditing(false)} saving={saving} />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header row */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500">
            <ArrowLeft size={18} />
          </button>
          <div className="w-12 h-12 rounded-full bg-[#003366] flex items-center justify-center text-white font-bold text-lg">
            {initials(customer.first_name, customer.last_name)}
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">{customer.first_name} {customer.last_name}</h2>
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              <Badge label={customer.customer_type} colorClass={TYPE_COLORS[customer.customer_type] || 'bg-gray-100 text-gray-700'} />
              <Badge label={customer.source} colorClass="bg-gray-100 text-gray-600" />
              <PassportAlert expiry={customer.passport_expiry} />
            </div>
          </div>
        </div>
        <button onClick={() => setEditing(true)}
          className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-[#003366] border border-[#003366] rounded-lg hover:bg-blue-50">
          <Edit3 size={14} /> Edit
        </button>
      </div>

      {/* Info cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <InfoCard icon={<Phone size={16} />} label="Phone" value={customer.phone} />
        <InfoCard icon={<Mail size={16} />} label="Email" value={customer.email || '—'} />
        <InfoCard icon={<MessageSquare size={16} />} label="WhatsApp" value={customer.whatsapp || '—'} />
        {customer.company_name && (
          <InfoCard icon={<Building2 size={16} />} label="Company"
            value={`${customer.company_name}${customer.job_title ? ` — ${customer.job_title}` : ''}`} />
        )}
        <InfoCard label="Passport"
          icon={<AlertTriangle size={16} />}
          value={customer.passport_number
            ? `${customer.passport_number}${customer.passport_expiry ? ` — exp. ${format(parseISO(customer.passport_expiry), 'd MMM yyyy')}` : ''}`
            : '—'} />
        <InfoCard icon={<Clock size={16} />} label="Customer since"
          value={format(parseISO(customer.created_at), 'd MMM yyyy')} />
      </div>

      {customer.notes && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-800">
          <span className="font-semibold">Notes: </span>{customer.notes}
        </div>
      )}

      {/* Tab bar */}
      <div className="border-b flex gap-6">
        {['Interactions','Bookings','Visas'].map(tab => (
          <button key={tab} onClick={() => setTab(tab)}
            className={`pb-2 text-sm font-medium border-b-2 transition-colors ${activeTab === tab
              ? 'border-[#003366] text-[#003366]'
              : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            {tab}
            {tab === 'Bookings' && <span className="ml-1 text-xs text-gray-400">({bookings.length})</span>}
            {tab === 'Visas'    && <span className="ml-1 text-xs text-gray-400">({visas.length})</span>}
            {tab === 'Interactions' && <span className="ml-1 text-xs text-gray-400">({interactions.length})</span>}
          </button>
        ))}
      </div>

      {/* Interactions tab */}
      {activeTab === 'Interactions' && (
        <div className="space-y-3">
          <div className="flex justify-end">
            <button onClick={() => setIntForm(v => !v)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-[#003366] rounded-lg hover:bg-[#002244]">
              <Plus size={14} /> Log Interaction
            </button>
          </div>
          {showIntForm && (
            <InteractionForm customerId={customerId} onDone={() => { setIntForm(false); loadInts(); }} />
          )}
          {interactions.length === 0
            ? <p className="text-sm text-gray-400 text-center py-8">No interactions logged yet. Log the first one above.</p>
            : interactions.map(i => (
                <div key={i.id} className="bg-white border rounded-xl p-4">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <Badge label={i.channel} colorClass="bg-gray-100 text-gray-700" />
                      <span className="text-xs text-gray-400">{format(parseISO(i.created_at), 'd MMM yyyy, h:mm a')}</span>
                    </div>
                    <span className="text-xs text-gray-500 font-medium">{i.staff_name}</span>
                  </div>
                  <p className="text-sm text-gray-800 mt-1">{i.summary}</p>
                  {i.outcome && <p className="text-sm text-gray-500 mt-1 italic">→ {i.outcome}</p>}
                  {i.follow_up_at && (
                    <p className="text-xs text-amber-600 mt-1.5 flex items-center gap-1">
                      <Clock size={11} /> Follow-up: {format(parseISO(i.follow_up_at), 'd MMM yyyy, h:mm a')}
                    </p>
                  )}
                </div>
              ))
          }
        </div>
      )}

      {/* Bookings tab */}
      {activeTab === 'Bookings' && (
        <div className="space-y-2">
          {bookings.length === 0
            ? <p className="text-sm text-gray-400 text-center py-8">No bookings yet.</p>
            : bookings.map(b => (
                <div key={b.id} className="flex items-center justify-between p-3 bg-white border rounded-xl">
                  <div>
                    <p className="text-sm font-semibold text-gray-800">{b.reference}</p>
                    <p className="text-xs text-gray-500">{b.service_type}{b.destination ? ` — ${b.destination}` : ''}</p>
                  </div>
                  <div className="text-right">
                    <Badge label={b.status} colorClass="bg-blue-50 text-blue-700" />
                    {b.travel_date && <p className="text-xs text-gray-400 mt-1">{format(parseISO(b.travel_date), 'd MMM yyyy')}</p>}
                  </div>
                </div>
              ))
          }
        </div>
      )}

      {/* Visas tab */}
      {activeTab === 'Visas' && (
        <div className="space-y-2">
          {visas.length === 0
            ? <p className="text-sm text-gray-400 text-center py-8">No visa applications yet.</p>
            : visas.map(v => (
                <div key={v.id} className="flex items-center justify-between p-3 bg-white border rounded-xl">
                  <div>
                    <p className="text-sm font-semibold text-gray-800">{v.reference}</p>
                    <p className="text-xs text-gray-500">{v.visa_type_name} — {v.country_name}</p>
                  </div>
                  <Badge label={v.stage} colorClass="bg-purple-50 text-purple-700" />
                </div>
              ))
          }
        </div>
      )}
    </div>
  );
}

// ─── Customer List ────────────────────────────────────────────────────────
function CustomerList({ onSelect }) {
  const [customers, setCustomers] = useState([]);
  const [total, setTotal]         = useState(0);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState('');
  const [typeFilter, setType]     = useState('');
  const [page, setPage]           = useState(1);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.list({ search, type: typeFilter, page, limit: 25 });
      setCustomers(res.data.customers);
      setTotal(res.data.total);
    } catch {
      toast.error('Failed to load customers');
    } finally {
      setLoading(false);
    }
  }, [search, typeFilter, page]);

  useEffect(() => { load(); }, [load]);

  const totalPages = Math.ceil(total / 25);

  return (
    <div className="space-y-4">
      {/* Search + filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search name, email, phone, company…"
            className="w-full pl-9 pr-9 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              <X size={14} />
            </button>
          )}
        </div>
        <select value={typeFilter} onChange={e => { setType(e.target.value); setPage(1); }}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="">All Types</option>
          {CUSTOMER_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>

      {/* Stats */}
      {total > 0 && (
        <p className="text-xs text-gray-400">{total} customer{total !== 1 ? 's' : ''}</p>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl border overflow-hidden">
        {loading
          ? <div className="flex justify-center py-16 text-gray-400 text-sm">Loading customers…</div>
          : customers.length === 0
            ? <div className="flex flex-col items-center py-16 text-gray-400">
                <Users size={40} className="mb-2 opacity-30" />
                <p className="text-sm">{search || typeFilter ? 'No customers match your search.' : 'No customers yet — add the first one.'}</p>
              </div>
            : <>
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      {['Customer','Contact','Type','Passport Expiry','Bookings','Visas',''].map(h => (
                        <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {customers.map(c => (
                      <tr key={c.id} onClick={() => onSelect(c.id)}
                        className="hover:bg-blue-50 cursor-pointer transition-colors group">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-[#003366] flex items-center justify-center text-white text-xs font-bold shrink-0">
                              {initials(c.first_name, c.last_name)}
                            </div>
                            <div>
                              <p className="font-semibold text-gray-900">{c.first_name} {c.last_name}</p>
                              {c.company_name && <p className="text-xs text-gray-400">{c.company_name}</p>}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-gray-700">
                          <p>{c.phone}</p>
                          {c.email && <p className="text-xs text-gray-400">{c.email}</p>}
                        </td>
                        <td className="px-4 py-3">
                          <Badge label={c.customer_type} colorClass={TYPE_COLORS[c.customer_type] || 'bg-gray-100 text-gray-700'} />
                        </td>
                        <td className="px-4 py-3">
                          {c.passport_expiry
                            ? <div>
                                <p className="text-gray-700">{format(parseISO(c.passport_expiry), 'd MMM yyyy')}</p>
                                <PassportAlert expiry={c.passport_expiry} />
                              </div>
                            : <span className="text-gray-300">—</span>
                          }
                        </td>
                        <td className="px-4 py-3 text-center font-semibold text-[#003366]">{c.booking_count}</td>
                        <td className="px-4 py-3 text-center font-semibold text-purple-700">{c.visa_count}</td>
                        <td className="px-4 py-3 text-gray-300 group-hover:text-gray-500">
                          <ChevronRight size={16} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {totalPages > 1 && (
                  <div className="flex items-center justify-between px-4 py-3 border-t text-sm text-gray-500">
                    <span>Showing {(page - 1) * 25 + 1}–{Math.min(page * 25, total)} of {total}</span>
                    <div className="flex gap-2">
                      <button disabled={page === 1} onClick={() => setPage(p => p - 1)}
                        className="px-3 py-1 rounded-lg border hover:bg-gray-50 disabled:opacity-40">Prev</button>
                      <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)}
                        className="px-3 py-1 rounded-lg border hover:bg-gray-50 disabled:opacity-40">Next</button>
                    </div>
                  </div>
                )}
              </>
        }
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────
export default function Customers() {
  const [view, setView]           = useState('list');   // 'list' | 'new' | 'detail'
  const [selectedId, setSelected] = useState(null);
  const [saving, setSaving]       = useState(false);

  const handleCreate = async (form) => {
    setSaving(true);
    try {
      await api.create(form);
      toast.success('Customer created successfully');
      setView('list');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to create customer');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#003366] flex items-center gap-2">
            <Users size={24} /> Customers
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">Traveller profiles, interaction history, and travel records</p>
        </div>
        {view === 'list' && (
          <button onClick={() => setView('new')}
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-[#003366] rounded-lg hover:bg-[#002244]">
            <Plus size={16} /> New Customer
          </button>
        )}
      </div>

      {view === 'list' && (
        <CustomerList onSelect={(id) => { setSelected(id); setView('detail'); }} />
      )}

      {view === 'new' && (
        <div className="bg-white rounded-xl border p-6">
          <h2 className="text-lg font-bold text-[#003366] mb-6">New Customer</h2>
          <CustomerForm onSave={handleCreate} onCancel={() => setView('list')} saving={saving} />
        </div>
      )}

      {view === 'detail' && selectedId && (
        <div className="bg-white rounded-xl border p-6">
          <CustomerDetail customerId={selectedId} onBack={() => { setView('list'); setSelected(null); }} />
        </div>
      )}
    </div>
  );
}
