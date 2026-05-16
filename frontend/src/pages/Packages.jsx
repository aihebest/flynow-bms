import { useState, useEffect, useCallback } from 'react';
import { useMsal } from '@azure/msal-react';
import { packages as packagesApi } from '../api';
import toast from 'react-hot-toast';
import {
  Package, Plus, Search, Edit2, Trash2, ChevronLeft,
  MapPin, Clock, Users, Tag, CheckCircle, Globe,
  Star, X, ChevronDown, ChevronUp,
} from 'lucide-react';

// ─── Constants ────────────────────────────────────────────────────────────────

const COMMON_INCLUSIONS = [
  'Return Flights', 'Hotel Accommodation', 'Airport Transfers',
  'Daily Breakfast', 'Half Board', 'Full Board', 'All Inclusive',
  'Visa Support', 'Travel Insurance', 'City Tour', 'Tour Guide',
  'Cruise', 'Desert Safari', 'Jungle Safari',
];

const DESTINATIONS = [
  'Doha, Qatar', 'Dubai, UAE', 'Abu Dhabi, UAE', 'Kigali, Rwanda',
  'Nairobi, Kenya', 'Maldives', 'Istanbul, Turkey', 'London, UK',
  'Paris, France', 'New York, USA', 'Cape Town, South Africa',
  'Cairo, Egypt', 'Accra, Ghana', 'Abuja, Nigeria',
];

const STATUS_COLORS = {
  Active:   'bg-green-100 text-green-700',
  Draft:    'bg-amber-100 text-amber-700',
  Archived: 'bg-gray-100 text-gray-500',
};

const DESTINATION_GRADIENTS = [
  'from-blue-500 to-indigo-600',
  'from-teal-500 to-cyan-600',
  'from-purple-500 to-pink-600',
  'from-orange-500 to-red-600',
  'from-green-500 to-emerald-600',
  'from-yellow-500 to-orange-600',
];

function gradientForDest(dest) {
  const idx = (dest?.charCodeAt(0) || 0) % DESTINATION_GRADIENTS.length;
  return DESTINATION_GRADIENTS[idx];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtPrice(price, currency = 'NGN') {
  if (!price && price !== 0) return '—';
  const sym = currency === 'NGN' ? '₦' : currency === 'USD' ? '$' : currency === 'EUR' ? '€' : currency + ' ';
  return sym + Number(price).toLocaleString('en-NG');
}

// ─── Package Form Modal ───────────────────────────────────────────────────────

function PackageForm({ pkg, onClose, onSaved, canEdit }) {
  const [saving, setSaving] = useState(false);
  const [showAllInclusions, setShowAllInclusions] = useState(false);
  const [customInclusion, setCustomInclusion] = useState('');
  const [customHighlight, setCustomHighlight] = useState('');

  const [form, setForm] = useState({
    name:         pkg?.name         || '',
    destination:  pkg?.destination  || '',
    origin:       pkg?.origin       || 'Lagos, Nigeria',
    duration_days:pkg?.duration_days|| 5,
    price:        pkg?.price        || '',
    currency:     pkg?.currency     || 'NGN',
    inclusions:   pkg?.inclusions   || [],
    highlights:   pkg?.highlights   || [],
    description:  pkg?.description  || '',
    status:       pkg?.status       || 'Active',
    max_pax:      pkg?.max_pax      || '',
    sort_order:   pkg?.sort_order   || 0,
  });

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const toggleInclusion = (item) => {
    setForm(f => ({
      ...f,
      inclusions: f.inclusions.includes(item)
        ? f.inclusions.filter(i => i !== item)
        : [...f.inclusions, item],
    }));
  };

  const addCustomInclusion = () => {
    if (!customInclusion.trim()) return;
    setForm(f => ({ ...f, inclusions: [...f.inclusions, customInclusion.trim()] }));
    setCustomInclusion('');
  };

  const addHighlight = () => {
    if (!customHighlight.trim()) return;
    setForm(f => ({ ...f, highlights: [...f.highlights, customHighlight.trim()] }));
    setCustomHighlight('');
  };

  const removeHighlight = (i) => {
    setForm(f => ({ ...f, highlights: f.highlights.filter((_, idx) => idx !== i) }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.destination || !form.duration_days || form.price === '') {
      toast.error('Name, destination, duration and price are required');
      return;
    }
    setSaving(true);
    try {
      if (pkg) {
        await packagesApi.update(pkg.id, form);
        toast.success('Package updated');
      } else {
        await packagesApi.create(form);
        toast.success('Package created');
      }
      onSaved();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to save package');
    } finally { setSaving(false); }
  };

  const inputCls = "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#003366]/20";
  const displayed = showAllInclusions ? COMMON_INCLUSIONS : COMMON_INCLUSIONS.slice(0, 8);

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-start justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl my-8">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-bold text-[#003366]">
            {pkg ? 'Edit Package' : 'New Holiday Package'}
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Basic info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="text-xs font-medium text-gray-600 block mb-1">Package Name *</label>
              <input type="text" value={form.name}
                placeholder="e.g. Qatar Romantic Escape — 5 Nights"
                onChange={e => set('name', e.target.value)} className={inputCls} required />
            </div>

            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Destination *</label>
              <input type="text" value={form.destination} list="dest-list"
                placeholder="e.g. Doha, Qatar"
                onChange={e => set('destination', e.target.value)} className={inputCls} required />
              <datalist id="dest-list">
                {DESTINATIONS.map(d => <option key={d} value={d} />)}
              </datalist>
            </div>

            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Origin (Departure City)</label>
              <input type="text" value={form.origin}
                placeholder="e.g. Lagos, Nigeria"
                onChange={e => set('origin', e.target.value)} className={inputCls} />
            </div>

            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Duration (Nights) *</label>
              <input type="number" min="1" value={form.duration_days}
                onChange={e => set('duration_days', e.target.value)} className={inputCls} required />
            </div>

            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Max Passengers</label>
              <input type="number" min="1" value={form.max_pax}
                placeholder="Leave blank for unlimited"
                onChange={e => set('max_pax', e.target.value)} className={inputCls} />
            </div>

            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Price *</label>
              <input type="number" min="0" step="0.01" value={form.price}
                placeholder="e.g. 2320500"
                onChange={e => set('price', e.target.value)} className={inputCls} required />
            </div>

            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Currency</label>
              <select value={form.currency} onChange={e => set('currency', e.target.value)} className={inputCls}>
                <option value="NGN">NGN (₦)</option>
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
                <option value="GBP">GBP (£)</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Status</label>
              <select value={form.status} onChange={e => set('status', e.target.value)} className={inputCls}>
                <option value="Active">Active — visible and sellable</option>
                <option value="Draft">Draft — hidden from sales</option>
                <option value="Archived">Archived — no longer offered</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Sort Order</label>
              <input type="number" min="0" value={form.sort_order}
                placeholder="Lower = shown first"
                onChange={e => set('sort_order', e.target.value)} className={inputCls} />
            </div>
          </div>

          {/* Inclusions */}
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-2">What's Included</label>
            <div className="flex flex-wrap gap-2 mb-2">
              {displayed.map(item => (
                <button key={item} type="button"
                  onClick={() => toggleInclusion(item)}
                  className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                    form.inclusions.includes(item)
                      ? 'bg-[#003366] text-white border-[#003366]'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-[#003366]'
                  }`}>
                  {item}
                </button>
              ))}
              <button type="button" onClick={() => setShowAllInclusions(v => !v)}
                className="text-xs px-2 py-1 text-[#003366] underline flex items-center gap-1">
                {showAllInclusions ? <><ChevronUp className="w-3 h-3" /> Less</> : <><ChevronDown className="w-3 h-3" /> More</>}
              </button>
            </div>
            {/* Custom inclusion */}
            <div className="flex gap-2">
              <input type="text" value={customInclusion}
                placeholder="Add custom inclusion…"
                onChange={e => setCustomInclusion(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addCustomInclusion())}
                className={`${inputCls} flex-1`} />
              <button type="button" onClick={addCustomInclusion}
                className="px-3 py-2 bg-gray-100 rounded-lg text-sm text-gray-600 hover:bg-gray-200">
                Add
              </button>
            </div>
            {form.inclusions.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {form.inclusions.map(inc => (
                  <span key={inc} className="inline-flex items-center gap-1 text-xs bg-[#003366]/10 text-[#003366] px-2.5 py-1 rounded-full">
                    <CheckCircle className="w-3 h-3" /> {inc}
                    <button type="button" onClick={() => toggleInclusion(inc)} className="ml-0.5 hover:text-red-500">×</button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Highlights */}
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-2">Package Highlights</label>
            <div className="flex gap-2">
              <input type="text" value={customHighlight}
                placeholder="e.g. Dhow cruise dinner, Desert dune bashing…"
                onChange={e => setCustomHighlight(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addHighlight())}
                className={`${inputCls} flex-1`} />
              <button type="button" onClick={addHighlight}
                className="px-3 py-2 bg-gray-100 rounded-lg text-sm text-gray-600 hover:bg-gray-200">
                Add
              </button>
            </div>
            {form.highlights.length > 0 && (
              <ul className="mt-2 space-y-1">
                {form.highlights.map((h, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm text-gray-700">
                    <Star className="w-3.5 h-3.5 text-[#C8921A] shrink-0" />
                    <span className="flex-1">{h}</span>
                    <button type="button" onClick={() => removeHighlight(i)}
                      className="text-gray-300 hover:text-red-400">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Description */}
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">Description</label>
            <textarea rows={3} value={form.description}
              placeholder="Brief description of the package for clients…"
              onChange={e => set('description', e.target.value)}
              className={`${inputCls} resize-none`} />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={saving}
              className="bg-[#003366] text-white px-6 py-2.5 rounded-lg hover:bg-[#002244] text-sm font-medium disabled:opacity-50">
              {saving ? 'Saving…' : pkg ? 'Update Package' : 'Create Package'}
            </button>
            <button type="button" onClick={onClose}
              className="px-6 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50">
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Package Card ─────────────────────────────────────────────────────────────

function PackageCard({ pkg, onEdit, onDelete, onBook, canEdit }) {
  const [expanded, setExpanded] = useState(false);
  const gradient = gradientForDest(pkg.destination);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow flex flex-col">
      {/* Destination banner */}
      <div className={`bg-gradient-to-br ${gradient} px-5 py-6 relative`}>
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-1.5 text-white/80 text-xs font-medium mb-1">
              <MapPin className="w-3.5 h-3.5" />
              {pkg.origin && <span>{pkg.origin} →</span>}
              <span>{pkg.destination}</span>
            </div>
            <h3 className="text-white font-bold text-lg leading-snug">{pkg.name}</h3>
          </div>
          <Globe className="w-8 h-8 text-white/30 shrink-0" />
        </div>
        <div className="flex items-center gap-3 mt-3">
          <span className="flex items-center gap-1 text-white/90 text-sm">
            <Clock className="w-3.5 h-3.5" /> {pkg.duration_days} night{pkg.duration_days !== 1 ? 's' : ''}
          </span>
          {pkg.max_pax && (
            <span className="flex items-center gap-1 text-white/90 text-sm">
              <Users className="w-3.5 h-3.5" /> Max {pkg.max_pax} pax
            </span>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="p-5 flex-1 flex flex-col gap-3">
        {/* Price + status */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-400 mb-0.5">Package Price</p>
            <p className="text-2xl font-bold text-[#003366]">{fmtPrice(pkg.price, pkg.currency)}</p>
          </div>
          <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${STATUS_COLORS[pkg.status]}`}>
            {pkg.status}
          </span>
        </div>

        {/* Inclusions */}
        {pkg.inclusions?.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {pkg.inclusions.slice(0, expanded ? undefined : 4).map(inc => (
              <span key={inc} className="inline-flex items-center gap-1 text-xs bg-gray-50 text-gray-600 border border-gray-100 px-2 py-0.5 rounded-full">
                <CheckCircle className="w-3 h-3 text-green-500" /> {inc}
              </span>
            ))}
            {!expanded && pkg.inclusions.length > 4 && (
              <button onClick={() => setExpanded(true)}
                className="text-xs text-[#003366] underline">
                +{pkg.inclusions.length - 4} more
              </button>
            )}
          </div>
        )}

        {/* Highlights */}
        {expanded && pkg.highlights?.length > 0 && (
          <ul className="space-y-1">
            {pkg.highlights.map((h, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                <Star className="w-3.5 h-3.5 text-[#C8921A] mt-0.5 shrink-0" /> {h}
              </li>
            ))}
          </ul>
        )}

        {/* Description */}
        {expanded && pkg.description && (
          <p className="text-sm text-gray-500">{pkg.description}</p>
        )}

        {expanded && (
          <button onClick={() => setExpanded(false)} className="text-xs text-[#003366] underline self-start">
            Show less
          </button>
        )}

        {/* Actions */}
        <div className="flex gap-2 mt-auto pt-2">
          <button
            onClick={() => onBook(pkg)}
            className="flex-1 bg-[#003366] text-white text-sm font-medium py-2 rounded-lg hover:bg-[#002244] transition-colors">
            Book This Package
          </button>
          {canEdit && (
            <>
              <button onClick={() => onEdit(pkg)}
                className="p-2 rounded-lg border border-gray-200 text-gray-500 hover:text-[#003366] hover:border-[#003366] transition-colors">
                <Edit2 className="w-4 h-4" />
              </button>
              <button onClick={() => onDelete(pkg)}
                className="p-2 rounded-lg border border-gray-200 text-gray-500 hover:text-red-500 hover:border-red-200 transition-colors">
                <Trash2 className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Book Package Modal ───────────────────────────────────────────────────────

function BookPackageModal({ pkg, onClose, onBooked }) {
  const [saving, setSaving] = useState(false);
  const [customers, setCustomers] = useState([]);
  const [custSearch, setCustSearch] = useState('');
  const [form, setForm] = useState({
    customer_id:   '',
    travel_date:   '',
    return_date:   '',
    pax_count:     1,
    internal_notes: '',
    customer_notes: '',
  });

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const inputCls = "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#003366]/20";

  useEffect(() => {
    if (custSearch.length < 2) { setCustomers([]); return; }
    const t = setTimeout(async () => {
      try {
        const api = (await import('../api')).default;
        const r = await api.get('/customers', { params: { search: custSearch, limit: 10 } });
        setCustomers(r.data.customers || []);
      } catch { setCustomers([]); }
    }, 300);
    return () => clearTimeout(t);
  }, [custSearch]);

  const handleBook = async (e) => {
    e.preventDefault();
    if (!form.customer_id) { toast.error('Please select a customer'); return; }
    setSaving(true);
    try {
      const api = (await import('../api')).default;
      await api.post('/bookings', {
        customer_id:    form.customer_id,
        service_type:   'Package',
        status:         'Enquiry',
        destination:    pkg.destination,
        origin:         pkg.origin,
        travel_date:    form.travel_date || null,
        return_date:    form.return_date || null,
        pax_count:      form.pax_count,
        selling_price:  pkg.price,
        currency:       pkg.currency,
        internal_notes: `Package: ${pkg.name}\n${form.internal_notes}`,
        customer_notes: form.customer_notes,
      });
      toast.success('Booking created from package');
      onBooked();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to create booking');
    } finally { setSaving(false); }
  };

  const selectedCustomer = form.customer_id
    ? customers.find(c => c.id === form.customer_id)
    : null;

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-start justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg my-8">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-bold text-[#003366]">Book Package</h2>
            <p className="text-sm text-gray-500 mt-0.5">{pkg.name}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleBook} className="p-6 space-y-4">
          {/* Package summary */}
          <div className="bg-[#003366]/5 rounded-xl p-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-[#003366]">{pkg.destination}</p>
              <p className="text-xs text-gray-500">{pkg.duration_days} nights · {pkg.inclusions?.length || 0} inclusions</p>
            </div>
            <p className="text-lg font-bold text-[#003366]">{fmtPrice(pkg.price, pkg.currency)}</p>
          </div>

          {/* Customer search */}
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">Customer *</label>
            {form.customer_id ? (
              <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                <span className="text-sm text-green-800 font-medium">
                  {selectedCustomer?.first_name} {selectedCustomer?.last_name}
                  <span className="text-xs text-green-600 ml-2">{selectedCustomer?.email}</span>
                </span>
                <button type="button" onClick={() => { set('customer_id', ''); setCustSearch(''); }}
                  className="text-green-500 hover:text-red-500">
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input type="text" value={custSearch} placeholder="Search customer name or email…"
                  onChange={e => setCustSearch(e.target.value)}
                  className={`${inputCls} pl-9`} />
                {customers.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 max-h-48 overflow-y-auto">
                    {customers.map(c => (
                      <button key={c.id} type="button"
                        onClick={() => { set('customer_id', c.id); setCustSearch(''); setCustomers([]); }}
                        className="w-full text-left px-4 py-2.5 hover:bg-gray-50 text-sm border-b border-gray-50 last:border-0">
                        <span className="font-medium">{c.first_name} {c.last_name}</span>
                        <span className="text-gray-400 ml-2 text-xs">{c.email || c.phone}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Travel dates */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Departure Date</label>
              <input type="date" value={form.travel_date} onChange={e => set('travel_date', e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Return Date</label>
              <input type="date" value={form.return_date} min={form.travel_date} onChange={e => set('return_date', e.target.value)} className={inputCls} />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">Number of Passengers</label>
            <input type="number" min="1" value={form.pax_count} onChange={e => set('pax_count', e.target.value)} className={inputCls} />
          </div>

          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">Notes for Client</label>
            <textarea rows={2} value={form.customer_notes} placeholder="Any special requests or notes for the client…"
              onChange={e => set('customer_notes', e.target.value)}
              className={`${inputCls} resize-none`} />
          </div>

          <div className="flex gap-3 pt-1">
            <button type="submit" disabled={saving}
              className="flex-1 bg-[#003366] text-white py-2.5 rounded-lg hover:bg-[#002244] text-sm font-medium disabled:opacity-50">
              {saving ? 'Creating Booking…' : 'Create Booking'}
            </button>
            <button type="button" onClick={onClose}
              className="px-5 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50">
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function Packages() {
  const { accounts } = useMsal();
  const [data, setData]         = useState([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState('');
  const [statusFilter, setStatusFilter] = useState('Active');
  const [showForm, setShowForm] = useState(false);
  const [editPkg, setEditPkg]   = useState(null);
  const [bookPkg, setBookPkg]   = useState(null);

  const userRoles = accounts[0]?.idTokenClaims?.roles || [];
  const canEdit   = userRoles.some(r => ['BMS.Admin', 'BMS.Manager'].includes(r));

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (statusFilter) params.status = statusFilter;
      if (search) params.search = search;
      const r = await packagesApi.list(params);
      setData(r.data.packages || []);
    } catch {
      toast.error('Failed to load packages');
    } finally { setLoading(false); }
  }, [search, statusFilter]);

  useEffect(() => {
    const t = setTimeout(load, search ? 300 : 0);
    return () => clearTimeout(t);
  }, [load, search]);

  const handleDelete = async (pkg) => {
    if (!confirm(`Delete "${pkg.name}"? This cannot be undone.`)) return;
    try {
      await packagesApi.remove(pkg.id);
      toast.success('Package deleted');
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to delete');
    }
  };

  const statusTabs = ['Active', 'Draft', 'Archived', ''];
  const statusLabels = { Active: 'Active', Draft: 'Draft', Archived: 'Archived', '': 'All' };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#003366] flex items-center gap-2">
            <Package className="w-6 h-6" /> Holiday Packages
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">Create and manage tour packages — Qatar, Dubai, Rwanda and more</p>
        </div>
        {canEdit && (
          <button onClick={() => { setEditPkg(null); setShowForm(true); }}
            className="flex items-center gap-2 bg-[#003366] text-white px-4 py-2.5 rounded-lg hover:bg-[#002244] text-sm font-medium">
            <Plus className="w-4 h-4" /> New Package
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input type="text" placeholder="Search packages or destinations…"
            value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#003366]/20" />
        </div>
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
          {statusTabs.map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                statusFilter === s ? 'bg-white shadow-sm text-[#003366]' : 'text-gray-500 hover:text-gray-700'
              }`}>
              {statusLabels[s]}
            </button>
          ))}
        </div>
      </div>

      {/* Package grid */}
      {loading ? (
        <div className="flex items-center justify-center h-48 text-gray-400 text-sm">
          Loading packages…
        </div>
      ) : data.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 text-center">
          <Package className="w-12 h-12 text-gray-200 mb-3" />
          <p className="font-medium text-gray-500">No packages found</p>
          <p className="text-sm text-gray-400 mt-1">
            {search ? 'Try a different search term.' : canEdit ? 'Click "New Package" to add your first holiday package.' : 'No packages have been added yet.'}
          </p>
          {canEdit && !search && (
            <button onClick={() => { setEditPkg(null); setShowForm(true); }}
              className="mt-4 flex items-center gap-2 bg-[#003366] text-white px-4 py-2 rounded-lg hover:bg-[#002244] text-sm font-medium">
              <Plus className="w-4 h-4" /> Add First Package
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {data.map(pkg => (
            <PackageCard key={pkg.id} pkg={pkg} canEdit={canEdit}
              onEdit={p => { setEditPkg(p); setShowForm(true); }}
              onDelete={handleDelete}
              onBook={p => setBookPkg(p)}
            />
          ))}
        </div>
      )}

      {/* Modals */}
      {showForm && (
        <PackageForm
          pkg={editPkg}
          canEdit={canEdit}
          onClose={() => { setShowForm(false); setEditPkg(null); }}
          onSaved={() => { setShowForm(false); setEditPkg(null); load(); }}
        />
      )}

      {bookPkg && (
        <BookPackageModal
          pkg={bookPkg}
          onClose={() => setBookPkg(null)}
          onBooked={() => { setBookPkg(null); }}
        />
      )}
    </div>
  );
}
