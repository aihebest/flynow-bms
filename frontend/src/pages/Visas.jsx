import { useState, useEffect, useCallback } from 'react';
import { visas as visasApi } from '../api';
import CustomerSearch from '../components/CustomerSearch';
import toast from 'react-hot-toast';
import {
  Globe, Plus, Search, ChevronLeft, ChevronRight, Edit2,
  Calendar, Users, FileText, CheckCircle2,
  Clock, XCircle, CheckSquare, Square, ArrowRight, Hash,
  Banknote, ClipboardList, History,
} from 'lucide-react';

// ─── Constants ────────────────────────────────────────────────────────────────

const STAGES = [
  'Enquiry', 'Checklist Sent', 'Documents Received', 'Documents Under Review',
  'Submitted to Embassy', 'Appointment Booked', 'Processing',
  'Approved', 'Rejected', 'Ready for Collection', 'Delivered', 'Cancelled',
];

const STAGE_COLORS = {
  'Enquiry':                 'bg-gray-100 text-gray-700',
  'Checklist Sent':          'bg-blue-100 text-blue-700',
  'Documents Received':      'bg-indigo-100 text-indigo-700',
  'Documents Under Review':  'bg-purple-100 text-purple-700',
  'Submitted to Embassy':    'bg-amber-100 text-amber-700',
  'Appointment Booked':      'bg-orange-100 text-orange-700',
  'Processing':              'bg-yellow-100 text-yellow-800',
  'Approved':                'bg-green-100 text-green-700',
  'Rejected':                'bg-red-100 text-red-700',
  'Ready for Collection':    'bg-teal-100 text-teal-700',
  'Delivered':               'bg-emerald-100 text-emerald-700',
  'Cancelled':               'bg-gray-200 text-gray-500',
};

// Allowed next stages from current stage
const STAGE_TRANSITIONS = {
  'Enquiry':                ['Checklist Sent', 'Cancelled'],
  'Checklist Sent':         ['Documents Received', 'Cancelled'],
  'Documents Received':     ['Documents Under Review', 'Cancelled'],
  'Documents Under Review': ['Submitted to Embassy', 'Cancelled'],
  'Submitted to Embassy':   ['Appointment Booked', 'Processing', 'Cancelled'],
  'Appointment Booked':     ['Processing', 'Cancelled'],
  'Processing':             ['Approved', 'Rejected', 'Cancelled'],
  'Approved':               ['Ready for Collection'],
  'Rejected':               ['Enquiry', 'Cancelled'],
  'Ready for Collection':   ['Delivered'],
  'Delivered':              [],
  'Cancelled':              [],
};

// Pipeline progress stages (for the visual bar — terminal stages excluded)
const PIPELINE_STAGES = [
  'Enquiry', 'Checklist Sent', 'Documents Received', 'Documents Under Review',
  'Submitted to Embassy', 'Appointment Booked', 'Processing', 'Approved', 'Delivered',
];

const CURRENCIES = ['NGN', 'USD', 'GBP', 'EUR'];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function StageBadge({ stage }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STAGE_COLORS[stage] || 'bg-gray-100 text-gray-600'}`}>
      {stage}
    </span>
  );
}

function formatDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatCurrency(amount, currency = 'NGN') {
  if (!amount) return '—';
  const symbol = { NGN: '₦', USD: '$', GBP: '£', EUR: '€' }[currency] || currency + ' ';
  return symbol + Number(amount).toLocaleString('en-NG', { minimumFractionDigits: 2 });
}

function PipelineBar({ currentStage }) {
  const isTerminal = ['Rejected', 'Cancelled'].includes(currentStage);
  const currentIdx = PIPELINE_STAGES.indexOf(currentStage);

  return (
    <div className="relative">
      <div className="flex items-center gap-0">
        {PIPELINE_STAGES.map((stage, i) => {
          const done    = !isTerminal && i < currentIdx;
          const active  = stage === currentStage && !isTerminal;
          return (
            <div key={stage} className="flex items-center flex-1 min-w-0">
              <div className={`flex-1 h-1.5 ${i === 0 ? 'rounded-l-full' : ''} ${i === PIPELINE_STAGES.length - 1 ? 'rounded-r-full' : ''}
                ${done ? 'bg-[#003366]' : active ? 'bg-[#003366]' : 'bg-gray-200'}`} />
            </div>
          );
        })}
      </div>
      <div className="flex justify-between mt-1 text-xs text-gray-400">
        <span>Enquiry</span>
        {isTerminal
          ? <span className={`font-medium ${currentStage === 'Rejected' ? 'text-red-500' : 'text-gray-500'}`}>{currentStage}</span>
          : <span className="font-medium text-[#003366]">{currentStage}</span>}
        <span>Delivered</span>
      </div>
    </div>
  );
}

// ─── Visa List ────────────────────────────────────────────────────────────────

function VisaList({ onNew, onSelect }) {
  const [data, setData]         = useState([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState('');
  const [stageFilter, setStage] = useState('');
  const [page, setPage]         = useState(1);
  const [hasMore, setHasMore]   = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: 25 };
      if (stageFilter) params.stage  = stageFilter;
      if (search)      params.search = search;
      const res = await visasApi.list(params);
      setData(res.data.visas || []);
      setHasMore((res.data.visas || []).length === 25);
    } catch {
      toast.error('Failed to load visa applications');
    } finally {
      setLoading(false);
    }
  }, [page, stageFilter, search]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#003366] flex items-center gap-2">
            <Globe className="w-6 h-6" /> Visa Applications
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">Track applications from enquiry through to delivery</p>
        </div>
        <button onClick={onNew}
          className="flex items-center gap-2 bg-[#003366] text-white px-4 py-2 rounded-lg hover:bg-[#002244] transition-colors text-sm font-medium">
          <Plus className="w-4 h-4" /> New Application
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input type="text" placeholder="Search customer name, reference, country..."
            value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#003366]/20" />
        </div>
        <select value={stageFilter} onChange={e => { setStage(e.target.value); setPage(1); }}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#003366]/20">
          <option value="">All Stages</option>
          {STAGES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-48 text-gray-400 text-sm">Loading visa applications…</div>
        ) : data.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-gray-400">
            <Globe className="w-10 h-10 mb-2 opacity-30" />
            <p className="text-sm">No visa applications yet — create the first one.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-xs text-gray-500 uppercase tracking-wider">
                <th className="text-left px-4 py-3 font-medium">Reference</th>
                <th className="text-left px-4 py-3 font-medium">Customer</th>
                <th className="text-left px-4 py-3 font-medium">Visa Type</th>
                <th className="text-left px-4 py-3 font-medium">Country</th>
                <th className="text-left px-4 py-3 font-medium">Applicants</th>
                <th className="text-left px-4 py-3 font-medium">Travel Date</th>
                <th className="text-left px-4 py-3 font-medium">Assigned To</th>
                <th className="text-left px-4 py-3 font-medium">Stage</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {data.map(v => (
                <tr key={v.id} onClick={() => onSelect(v)}
                  className="hover:bg-gray-50 cursor-pointer transition-colors">
                  <td className="px-4 py-3 font-mono text-xs text-[#003366] font-medium">{v.reference}</td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-800">{v.first_name} {v.last_name}</div>
                    {v.phone && <div className="text-xs text-gray-400">{v.phone}</div>}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{v.visa_type_name}</td>
                  <td className="px-4 py-3 text-gray-600">{v.country_name}</td>
                  <td className="px-4 py-3 text-gray-600">{v.applicant_count}</td>
                  <td className="px-4 py-3 text-gray-600">{formatDate(v.intended_travel_date)}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{v.assigned_to_name || '—'}</td>
                  <td className="px-4 py-3"><StageBadge stage={v.stage} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {!loading && data.length > 0 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 text-sm text-gray-500">
            <span>{data.length} application{data.length !== 1 ? 's' : ''}</span>
            <div className="flex gap-2">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                className="p-1 rounded hover:bg-gray-100 disabled:opacity-30"><ChevronLeft className="w-4 h-4" /></button>
              <span className="px-2">Page {page}</span>
              <button onClick={() => setPage(p => p + 1)} disabled={!hasMore}
                className="p-1 rounded hover:bg-gray-100 disabled:opacity-30"><ChevronRight className="w-4 h-4" /></button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Shared Field component ───────────────────────────────────────────────────
// Must live at module scope — defining inside a component causes focus loss
// because React sees a new component type on every render and unmounts children.

function Field({ label, children, required }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">
        {label}{required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}

// ─── Visa Form ────────────────────────────────────────────────────────────────

function VisaForm({ visa, onSave, onCancel }) {
  const isEdit = !!visa;
  const [visaTypes, setVisaTypes] = useState([]);
  const [custSearch, setCustSearch] = useState(
    visa ? `${visa.first_name} ${visa.last_name}` : ''
  );
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    customer_id:          visa?.customer_id          || '',
    visa_type_id:         visa?.visa_type_id          || '',
    applicant_count:      visa?.applicant_count       || 1,
    travel_purpose:       visa?.travel_purpose        || '',
    intended_travel_date: visa?.intended_travel_date  ? visa.intended_travel_date.slice(0, 10) : '',
    service_fee:          visa?.service_fee            || '',
    embassy_fee:          visa?.embassy_fee            || '',
    courier_fee:          visa?.courier_fee            || '',
    currency:             visa?.currency               || 'NGN',
    internal_notes:       visa?.internal_notes         || '',
  });

  useEffect(() => {
    visasApi.listTypes().then(r => setVisaTypes(r.data.visa_types || [])).catch(() => {});
  }, []);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  // Group visa types by country for the dropdown
  const grouped = visaTypes.reduce((acc, vt) => {
    if (!acc[vt.country_name]) acc[vt.country_name] = [];
    acc[vt.country_name].push(vt);
    return acc;
  }, {});

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.customer_id)  { toast.error('Please select a customer'); return; }
    if (!form.visa_type_id) { toast.error('Please select a visa type'); return; }
    setSaving(true);
    try {
      const payload = { ...form };
      if (!payload.intended_travel_date) delete payload.intended_travel_date;
      if (!payload.service_fee) delete payload.service_fee;
      if (!payload.embassy_fee) delete payload.embassy_fee;
      if (!payload.courier_fee) delete payload.courier_fee;

      if (isEdit) {
        await visasApi.update(visa.id, payload);
        toast.success('Application updated');
      } else {
        await visasApi.create(payload);
        toast.success('Application created');
      }
      onSave();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to save application');
    } finally {
      setSaving(false);
    }
  };

  const inputCls = "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#003366]/20";

  // (Field is defined at module scope — see below VisaList)

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={onCancel} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-[#003366]">
            {isEdit ? 'Edit Application' : 'New Visa Application'}
          </h1>
          {isEdit && <p className="text-sm text-gray-500 font-mono">{visa.reference}</p>}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Customer & Visa Type */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 space-y-4">
          <h2 className="font-semibold text-gray-700 flex items-center gap-2">
            <Globe className="w-4 h-4 text-[#003366]" /> Applicant & Visa Type
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Customer" required>
              <CustomerSearch
                value={custSearch}
                customerId={form.customer_id}
                onChange={text => { setCustSearch(text); setForm(f => ({ ...f, customer_id: '' })); }}
                onSelect={c => { setForm(f => ({ ...f, customer_id: c.id })); setCustSearch(`${c.first_name} ${c.last_name}`); }}
                inputClassName={inputCls}
              />
            </Field>

            <Field label="Visa Type" required>
              <select value={form.visa_type_id} onChange={e => set('visa_type_id', e.target.value)} className={inputCls}>
                <option value="">Select visa type…</option>
                {Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b)).map(([country, types]) => (
                  <optgroup key={country} label={country}>
                    {types.map(vt => (
                      <option key={vt.id} value={vt.id}>{vt.name}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </Field>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Number of Applicants" required>
              <input type="number" min="1" max="50" value={form.applicant_count}
                onChange={e => set('applicant_count', e.target.value)} className={inputCls} />
            </Field>
            <Field label="Travel Purpose">
              <input type="text" placeholder="e.g. Tourism, Business, Study, Medical"
                value={form.travel_purpose} onChange={e => set('travel_purpose', e.target.value)} className={inputCls} />
            </Field>
          </div>

          <Field label="Intended Travel Date">
            <input type="date" value={form.intended_travel_date}
              onChange={e => set('intended_travel_date', e.target.value)}
              className={`${inputCls} max-w-xs`} />
          </Field>
        </div>

        {/* Fees */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 space-y-4">
          <h2 className="font-semibold text-gray-700 flex items-center gap-2">
            <Banknote className="w-4 h-4 text-[#003366]" /> Fees
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Field label="Currency">
              <select value={form.currency} onChange={e => set('currency', e.target.value)} className={inputCls}>
                {CURRENCIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </Field>
            <Field label="Service Fee">
              <input type="number" min="0" step="0.01" placeholder="0.00"
                value={form.service_fee} onChange={e => set('service_fee', e.target.value)} className={inputCls} />
            </Field>
            <Field label="Embassy Fee">
              <input type="number" min="0" step="0.01" placeholder="0.00"
                value={form.embassy_fee} onChange={e => set('embassy_fee', e.target.value)} className={inputCls} />
            </Field>
            <Field label="Courier / Collection Fee">
              <input type="number" min="0" step="0.01" placeholder="0.00"
                value={form.courier_fee} onChange={e => set('courier_fee', e.target.value)} className={inputCls} />
            </Field>
          </div>
          {(form.service_fee || form.embassy_fee || form.courier_fee) && (
            <p className="text-sm text-gray-500">
              Total: <span className="font-medium text-[#003366]">
                {formatCurrency(
                  (parseFloat(form.service_fee) || 0) + (parseFloat(form.embassy_fee) || 0) + (parseFloat(form.courier_fee) || 0),
                  form.currency
                )}
              </span>
            </p>
          )}
        </div>

        {/* Notes */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 space-y-4">
          <h2 className="font-semibold text-gray-700 flex items-center gap-2">
            <FileText className="w-4 h-4 text-[#003366]" /> Internal Notes
          </h2>
          <textarea rows={3} placeholder="Any special requirements, notes for processing team..."
            value={form.internal_notes} onChange={e => set('internal_notes', e.target.value)}
            className={`${inputCls} resize-none`} />
        </div>

        <div className="flex gap-3">
          <button type="submit" disabled={saving}
            className="bg-[#003366] text-white px-6 py-2.5 rounded-lg hover:bg-[#002244] transition-colors text-sm font-medium disabled:opacity-50">
            {saving ? 'Saving…' : isEdit ? 'Update Application' : 'Create Application'}
          </button>
          <button type="button" onClick={onCancel}
            className="px-6 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors">
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

// ─── Visa Detail ──────────────────────────────────────────────────────────────

function VisaDetail({ visa: initial, onBack, onEdit }) {
  const [visa, setVisa]         = useState(initial);
  const [history, setHistory]   = useState([]);
  const [checklist, setChecklist] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [stageNote, setStageNote] = useState('');
  const [showNoteFor, setShowNoteFor] = useState(null);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      try {
        const [detailRes, checkRes] = await Promise.all([
          visasApi.getById(visa.id),
          visa.visa_type_id ? visasApi.getChecklist(visa.visa_type_id) : Promise.resolve({ data: { checklist: [] } }),
        ]);
        setVisa(detailRes.data.visa);
        setHistory(detailRes.data.history || []);
        setChecklist(checkRes.data.checklist || []);
      } catch {
        toast.error('Failed to load visa details');
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, [visa.id, visa.visa_type_id]);

  const transitions = STAGE_TRANSITIONS[visa.stage] || [];

  const changeStage = async (newStage) => {
    setUpdating(true);
    try {
      await visasApi.updateStage(visa.id, newStage, stageNote);
      // Refresh detail
      const r = await visasApi.getById(visa.id);
      setVisa(r.data.visa);
      setHistory(r.data.history || []);
      setStageNote('');
      setShowNoteFor(null);
      toast.success(`Stage moved to "${newStage}"`);
    } catch {
      toast.error('Failed to update stage');
    } finally {
      setUpdating(false);
    }
  };

  const InfoRow = ({ label, value, mono }) => (
    <div>
      <dt className="text-xs text-gray-500 mb-0.5">{label}</dt>
      <dd className={`text-sm text-gray-800 font-medium ${mono ? 'font-mono' : ''}`}>{value || '—'}</dd>
    </div>
  );

  if (loading) return (
    <div className="flex items-center justify-center h-64 text-gray-400 text-sm">Loading details…</div>
  );

  const totalFees = (parseFloat(visa.service_fee) || 0) + (parseFloat(visa.embassy_fee) || 0) + (parseFloat(visa.courier_fee) || 0);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-[#003366] font-mono">{visa.reference}</h1>
              <StageBadge stage={visa.stage} />
            </div>
            <p className="text-sm text-gray-500 mt-0.5">
              {visa.first_name} {visa.last_name} · {visa.visa_type_name} · {visa.country_name}
            </p>
          </div>
        </div>
        <button onClick={onEdit}
          className="flex items-center gap-2 text-sm text-[#003366] border border-[#003366] px-3 py-1.5 rounded-lg hover:bg-[#003366] hover:text-white transition-colors">
          <Edit2 className="w-3.5 h-3.5" /> Edit
        </button>
      </div>

      {/* Pipeline bar */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <PipelineBar currentStage={visa.stage} />
      </div>

      {/* Stage Transitions */}
      {transitions.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 space-y-3">
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Advance Stage</p>
          <div className="flex flex-wrap gap-2">
            {transitions.map(s => (
              <div key={s} className="flex flex-col gap-1">
                {showNoteFor === s ? (
                  <div className="flex items-center gap-2">
                    <input type="text" placeholder="Add a note (optional)…" value={stageNote}
                      onChange={e => setStageNote(e.target.value)}
                      className="border border-gray-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-[#003366]/20 w-52" />
                    <button onClick={() => changeStage(s)} disabled={updating}
                      className="px-3 py-1.5 bg-[#003366] text-white rounded-lg text-xs font-medium disabled:opacity-50">
                      {updating ? '…' : 'Confirm'}
                    </button>
                    <button onClick={() => setShowNoteFor(null)} className="text-gray-400 hover:text-gray-600">
                      <XCircle className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <button onClick={() => setShowNoteFor(s)} disabled={updating}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors disabled:opacity-50
                      ${s === 'Cancelled' || s === 'Rejected'
                        ? 'border-red-200 text-red-600 hover:bg-red-50'
                        : 'border-[#003366]/20 text-[#003366] hover:bg-[#003366]/5'}`}>
                    {s} →
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Application Info */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <h2 className="font-semibold text-gray-700 mb-4 flex items-center gap-2">
          <Globe className="w-4 h-4 text-[#003366]" /> Application Details
        </h2>
        <dl className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <InfoRow label="Customer"        value={`${visa.first_name} ${visa.last_name}`} />
          <InfoRow label="Passport No."    value={visa.passport_number} mono />
          <InfoRow label="Passport Expiry" value={formatDate(visa.passport_expiry)} />
          <InfoRow label="Applicants"      value={visa.applicant_count} />
          <InfoRow label="Travel Purpose"  value={visa.travel_purpose} />
          <InfoRow label="Travel Date"     value={formatDate(visa.intended_travel_date)} />
          <InfoRow label="Embassy Ref"     value={visa.embassy_ref} mono />
          <InfoRow label="Assigned To"     value={visa.assigned_to_name} />
          {visa.appointment_date && <>
            <InfoRow label="Appointment Date" value={formatDate(visa.appointment_date)} />
            <InfoRow label="Appointment Time" value={visa.appointment_time} />
          </>}
          {visa.visa_valid_from && <>
            <InfoRow label="Visa Valid From" value={formatDate(visa.visa_valid_from)} />
            <InfoRow label="Visa Valid To"   value={formatDate(visa.visa_valid_to)} />
          </>}
          {visa.rejection_reason && (
            <div className="col-span-4 bg-red-50 rounded-lg p-3">
              <p className="text-xs text-red-500 font-medium mb-1">Rejection Reason</p>
              <p className="text-sm text-red-800">{visa.rejection_reason}</p>
            </div>
          )}
        </dl>
      </div>

      {/* Fees */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <h2 className="font-semibold text-gray-700 mb-4 flex items-center gap-2">
          <Banknote className="w-4 h-4 text-[#003366]" /> Fees
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Service Fee',   val: visa.service_fee },
            { label: 'Embassy Fee',   val: visa.embassy_fee },
            { label: 'Courier Fee',   val: visa.courier_fee },
            { label: 'Total',         val: totalFees || null, bold: true },
          ].map(({ label, val, bold }) => (
            <div key={label} className={`text-center p-3 rounded-lg ${bold ? 'bg-[#003366]/5' : 'bg-gray-50'}`}>
              <p className="text-xs text-gray-500 mb-1">{label}</p>
              <p className={`text-sm ${bold ? 'font-bold text-[#003366]' : 'font-medium text-gray-700'}`}>
                {formatCurrency(val, visa.currency)}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Checklist */}
      {checklist.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h2 className="font-semibold text-gray-700 mb-4 flex items-center gap-2">
            <ClipboardList className="w-4 h-4 text-[#003366]" /> Document Checklist
          </h2>
          <ul className="space-y-2">
            {checklist.map(item => (
              <li key={item.id} className="flex items-start gap-2.5 text-sm">
                {item.is_mandatory
                  ? <CheckSquare className="w-4 h-4 text-[#003366] mt-0.5 shrink-0" />
                  : <Square className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />}
                <div>
                  <span className={item.is_mandatory ? 'font-medium text-gray-800' : 'text-gray-600'}>
                    {item.item_name}
                  </span>
                  {item.notes && <p className="text-xs text-gray-400 mt-0.5">{item.notes}</p>}
                  {item.is_mandatory && <span className="ml-2 text-xs text-red-500">Required</span>}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Stage History */}
      {history.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h2 className="font-semibold text-gray-700 mb-4 flex items-center gap-2">
            <History className="w-4 h-4 text-[#003366]" /> Stage History
          </h2>
          <div className="space-y-3">
            {history.map((h, i) => (
              <div key={h.id} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <div className="w-2 h-2 rounded-full bg-[#003366] mt-1.5" />
                  {i < history.length - 1 && <div className="w-0.5 h-full bg-gray-200 mt-1" />}
                </div>
                <div className="pb-3">
                  <p className="text-sm text-gray-700">
                    {h.from_stage
                      ? <><span className="text-gray-400">{h.from_stage}</span> <ArrowRight className="w-3 h-3 inline" /> <strong>{h.to_stage}</strong></>
                      : <strong>{h.to_stage}</strong>}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {formatDate(h.changed_at)} {h.changed_by_name && `· ${h.changed_by_name}`}
                  </p>
                  {h.note && <p className="text-xs text-gray-500 mt-1 bg-gray-50 rounded px-2 py-1">{h.note}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Internal Notes */}
      {visa.internal_notes && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h2 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <FileText className="w-4 h-4 text-[#003366]" /> Internal Notes
          </h2>
          <p className="text-sm text-gray-700 whitespace-pre-wrap bg-gray-50 rounded-lg p-3">{visa.internal_notes}</p>
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function Visas() {
  const [view, setView]       = useState('list');
  const [selected, setSelected] = useState(null);
  const [listKey, setListKey] = useState(0);

  const handleSelect  = (v) => { setSelected(v); setView('detail'); };
  const handleNew     = ()  => { setSelected(null); setView('new'); };
  const handleEdit    = ()  => setView('edit');
  const handleBack    = ()  => { setSelected(null); setView('list'); };
  const handleSaved   = ()  => { setListKey(k => k + 1); setView('list'); setSelected(null); };
  const handleCancel  = ()  => selected ? setView('detail') : setView('list');

  if (view === 'new')    return <VisaForm visa={null}     onSave={handleSaved} onCancel={handleBack} />;
  if (view === 'edit')   return <VisaForm visa={selected} onSave={handleSaved} onCancel={handleCancel} />;
  if (view === 'detail') return <VisaDetail visa={selected} onBack={handleBack} onEdit={handleEdit} />;

  return <VisaList key={listKey} onNew={handleNew} onSelect={handleSelect} />;
}
tail') : setView('list');

  if (view === 'new')    return <VisaForm visa={null}     onSave={handleSaved} onCancel={handleBack} />;
  if (view === 'edit')   return <VisaForm visa={selected} onSave={handleSaved} onCancel={handleCancel} />;
  if (view === 'detail') return <VisaDetail visa={selected} onBack={handleBack} onEdit={handleEdit} />;

  return <VisaList key={listKey} onNew={handleNew} onSelect={handleSelect} />;
}
