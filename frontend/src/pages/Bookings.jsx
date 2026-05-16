import { useState, useEffect, useCallback, useRef } from 'react';
import { bookings as bookingsApi, customers as customersApi } from '../api';
import toast from 'react-hot-toast';
import {
  PlaneTakeoff, Hotel, Globe, Car, Shield, Package,
  Plus, Search, ChevronLeft, ChevronRight, X, Edit2,
  ArrowRight, User, Calendar, Users, Hash, Banknote,
  FileText, Phone, AlertCircle, Printer,
} from 'lucide-react';

// ─── Constants ───────────────────────────────────────────────────────────────

const SERVICE_TYPES = [
  'Flight', 'Hotel', 'Flight+Hotel', 'Visa Only',
  'Tour Package', 'Airport Transfer', 'Travel Insurance', 'Other',
];

const STATUSES = [
  'Enquiry', 'Quote Sent', 'Payment Pending',
  'Confirmed', 'Ticketed', 'Completed', 'Cancelled', 'Refunded',
];

const STATUS_COLORS = {
  'Enquiry':         'bg-gray-100 text-gray-700',
  'Quote Sent':      'bg-blue-100 text-blue-700',
  'Payment Pending': 'bg-amber-100 text-amber-700',
  'Confirmed':       'bg-green-100 text-green-700',
  'Ticketed':        'bg-indigo-100 text-indigo-700',
  'Completed':       'bg-teal-100 text-teal-700',
  'Cancelled':       'bg-red-100 text-red-700',
  'Refunded':        'bg-orange-100 text-orange-700',
};

const SERVICE_ICONS = {
  'Flight':           PlaneTakeoff,
  'Hotel':            Hotel,
  'Flight+Hotel':     PlaneTakeoff,
  'Visa Only':        Globe,
  'Tour Package':     Package,
  'Airport Transfer': Car,
  'Travel Insurance': Shield,
  'Other':            FileText,
};

// Next valid status transitions
const STATUS_TRANSITIONS = {
  'Enquiry':         ['Quote Sent', 'Cancelled'],
  'Quote Sent':      ['Payment Pending', 'Cancelled'],
  'Payment Pending': ['Confirmed', 'Cancelled'],
  'Confirmed':       ['Ticketed', 'Cancelled'],
  'Ticketed':        ['Completed', 'Cancelled'],
  'Completed':       [],
  'Cancelled':       ['Refunded'],
  'Refunded':        [],
};

const CURRENCIES = ['NGN', 'USD', 'GBP', 'EUR'];

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatusBadge({ status }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[status] || 'bg-gray-100 text-gray-600'}`}>
      {status}
    </span>
  );
}

function ServiceIcon({ type, className = 'w-4 h-4' }) {
  const Icon = SERVICE_ICONS[type] || FileText;
  return <Icon className={className} />;
}

function formatCurrency(amount, currency = 'NGN') {
  if (!amount) return '—';
  const symbol = { NGN: '₦', USD: '$', GBP: '£', EUR: '€' }[currency] || currency + ' ';
  return symbol + Number(amount).toLocaleString('en-NG', { minimumFractionDigits: 2 });
}

function formatDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

// ─── Booking List ─────────────────────────────────────────────────────────────

function BookingList({ onNew, onSelect }) {
  const [data, setData]           = useState([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState('');
  const [statusFilter, setStatus] = useState('');
  const [page, setPage]           = useState(1);
  const [hasMore, setHasMore]     = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: 25 };
      if (statusFilter) params.status = statusFilter;
      if (search)       params.search = search;
      const res = await bookingsApi.list(params);
      setData(res.data.bookings || []);
      setHasMore((res.data.bookings || []).length === 25);
    } catch {
      toast.error('Failed to load bookings');
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, search]);

  useEffect(() => { load(); }, [load]);

  const handleSearch = (e) => { setSearch(e.target.value); setPage(1); };
  const handleStatus = (e) => { setStatus(e.target.value); setPage(1); };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#003366] flex items-center gap-2">
            <PlaneTakeoff className="w-6 h-6" /> Bookings
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">Flight, hotel, visa and travel service bookings</p>
        </div>
        <button
          onClick={onNew}
          className="flex items-center gap-2 bg-[#003366] text-white px-4 py-2 rounded-lg hover:bg-[#002244] transition-colors text-sm font-medium"
        >
          <Plus className="w-4 h-4" /> New Booking
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search customer name, reference, destination..."
            value={search}
            onChange={handleSearch}
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#003366]/20"
          />
        </div>
        <select
          value={statusFilter}
          onChange={handleStatus}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#003366]/20"
        >
          <option value="">All Statuses</option>
          {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-48 text-gray-400 text-sm">Loading bookings…</div>
        ) : data.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-gray-400">
            <PlaneTakeoff className="w-10 h-10 mb-2 opacity-30" />
            <p className="text-sm">No bookings yet — create the first one.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-xs text-gray-500 uppercase tracking-wider">
                <th className="text-left px-4 py-3 font-medium">Reference</th>
                <th className="text-left px-4 py-3 font-medium">Customer</th>
                <th className="text-left px-4 py-3 font-medium">Service</th>
                <th className="text-left px-4 py-3 font-medium">Route / Details</th>
                <th className="text-left px-4 py-3 font-medium">Travel Date</th>
                <th className="text-left px-4 py-3 font-medium">Pax</th>
                <th className="text-left px-4 py-3 font-medium">Amount</th>
                <th className="text-left px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {data.map(b => (
                <tr
                  key={b.id}
                  onClick={() => onSelect(b)}
                  className="hover:bg-gray-50 cursor-pointer transition-colors"
                >
                  <td className="px-4 py-3 font-mono text-xs text-[#003366] font-medium">
                    {b.reference || '—'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-800">{b.first_name} {b.last_name}</div>
                    {b.phone && <div className="text-xs text-gray-400">{b.phone}</div>}
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1.5 text-gray-600">
                      <ServiceIcon type={b.service_type} className="w-3.5 h-3.5" />
                      {b.service_type}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {b.origin && b.destination
                      ? <span>{b.origin} <ArrowRight className="w-3 h-3 inline" /> {b.destination}</span>
                      : b.destination || b.hotel_name || '—'}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{formatDate(b.travel_date)}</td>
                  <td className="px-4 py-3 text-gray-600">{b.pax_count}</td>
                  <td className="px-4 py-3 font-medium text-gray-800">
                    {formatCurrency(b.selling_price, b.currency)}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={b.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Pagination */}
        {!loading && data.length > 0 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 text-sm text-gray-500">
            <span>{data.length} booking{data.length !== 1 ? 's' : ''}</span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-1 rounded hover:bg-gray-100 disabled:opacity-30"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-2">Page {page}</span>
              <button
                onClick={() => setPage(p => p + 1)}
                disabled={!hasMore}
                className="p-1 rounded hover:bg-gray-100 disabled:opacity-30"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Booking Form ─────────────────────────────────────────────────────────────

function BookingForm({ booking, onSave, onCancel }) {
  const isEdit = !!booking;
  const [customers, setCustomers] = useState([]);
  const [custSearch, setCustSearch] = useState(
    booking ? `${booking.first_name} ${booking.last_name}` : ''
  );
  const [showCustDropdown, setShowCustDropdown] = useState(false);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    customer_id:        booking?.customer_id    || '',
    service_type:       booking?.service_type   || 'Flight',
    status:             booking?.status         || 'Enquiry',
    origin:             booking?.origin         || '',
    destination:        booking?.destination    || '',
    travel_date:        booking?.travel_date    ? booking.travel_date.slice(0, 10) : '',
    return_date:        booking?.return_date    ? booking.return_date.slice(0, 10) : '',
    pax_count:          booking?.pax_count      || 1,
    pnr:                booking?.pnr            || '',
    airline:            booking?.airline        || '',
    flight_numbers:     booking?.flight_numbers || '',
    hotel_name:         booking?.hotel_name     || '',
    hotel_confirmation: booking?.hotel_confirmation || '',
    cost_price:         booking?.cost_price     || '',
    selling_price:      booking?.selling_price  || '',
    currency:           booking?.currency       || 'NGN',
    internal_notes:     booking?.internal_notes || '',
    customer_notes:     booking?.customer_notes || '',
  });

  // Customer search
  useEffect(() => {
    if (custSearch.length < 2) { setCustomers([]); return; }
    const t = setTimeout(async () => {
      try {
        const res = await customersApi.list({ search: custSearch, limit: 8 });
        setCustomers(res.data.customers || []);
        setShowCustDropdown(true);
      } catch { /* ignore */ }
    }, 300);
    return () => clearTimeout(t);
  }, [custSearch]);

  const selectCustomer = (c) => {
    setForm(f => ({ ...f, customer_id: c.id }));
    setCustSearch(`${c.first_name} ${c.last_name}`);
    setShowCustDropdown(false);
  };

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const isFlightType = ['Flight', 'Flight+Hotel', 'Airport Transfer'].includes(form.service_type);
  const isHotelType  = ['Hotel', 'Flight+Hotel', 'Tour Package'].includes(form.service_type);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.customer_id) { toast.error('Please select a customer'); return; }
    setSaving(true);
    try {
      const payload = { ...form };
      if (!payload.travel_date) delete payload.travel_date;
      if (!payload.return_date) delete payload.return_date;
      if (!payload.cost_price)  delete payload.cost_price;
      if (!payload.selling_price) delete payload.selling_price;

      if (isEdit) {
        await bookingsApi.update(booking.id, payload);
        toast.success('Booking updated');
      } else {
        await bookingsApi.create(payload);
        toast.success('Booking created');
      }
      onSave();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to save booking');
    } finally {
      setSaving(false);
    }
  };

  const Field = ({ label, children, required }) => (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">
        {label}{required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );

  const inputCls = "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#003366]/20";

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={onCancel} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-[#003366]">
            {isEdit ? 'Edit Booking' : 'New Booking'}
          </h1>
          {isEdit && <p className="text-sm text-gray-500 font-mono">{booking.reference}</p>}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Customer */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 space-y-4">
          <h2 className="font-semibold text-gray-700 flex items-center gap-2">
            <User className="w-4 h-4 text-[#003366]" /> Customer & Service
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Customer" required>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search customer name..."
                  value={custSearch}
                  onChange={e => { setCustSearch(e.target.value); setForm(f => ({ ...f, customer_id: '' })); }}
                  className={inputCls}
                  autoComplete="off"
                />
                {showCustDropdown && customers.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                    {customers.map(c => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => selectCustomer(c)}
                        className="w-full text-left px-3 py-2 hover:bg-gray-50 text-sm"
                      >
                        <span className="font-medium">{c.first_name} {c.last_name}</span>
                        <span className="text-gray-400 ml-2 text-xs">{c.email}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {!form.customer_id && custSearch && (
                <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> Select a customer from the list
                </p>
              )}
            </Field>

            <Field label="Service Type" required>
              <select value={form.service_type} onChange={e => set('service_type', e.target.value)} className={inputCls}>
                {SERVICE_TYPES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </Field>
          </div>
        </div>

        {/* Travel Details */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 space-y-4">
          <h2 className="font-semibold text-gray-700 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-[#003366]" /> Travel Details
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {isFlightType && (
              <Field label="Origin">
                <input type="text" placeholder="e.g. Lagos (LOS)" value={form.origin}
                  onChange={e => set('origin', e.target.value)} className={inputCls} />
              </Field>
            )}
            <Field label={isFlightType ? "Destination" : "Location / Destination"}>
              <input type="text" placeholder="e.g. London (LHR)" value={form.destination}
                onChange={e => set('destination', e.target.value)} className={inputCls} />
            </Field>
            <Field label="Travel / Check-in Date">
              <input type="date" value={form.travel_date}
                onChange={e => set('travel_date', e.target.value)} className={inputCls} />
            </Field>
            <Field label="Return / Check-out Date">
              <input type="date" value={form.return_date}
                onChange={e => set('return_date', e.target.value)} className={inputCls} />
            </Field>
            <Field label="Number of Passengers / Guests" required>
              <input type="number" min="1" max="100" value={form.pax_count}
                onChange={e => set('pax_count', e.target.value)} className={inputCls} />
            </Field>
          </div>
        </div>

        {/* Flight Details */}
        {isFlightType && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 space-y-4">
            <h2 className="font-semibold text-gray-700 flex items-center gap-2">
              <PlaneTakeoff className="w-4 h-4 text-[#003366]" /> Flight Details
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Field label="Airline">
                <input type="text" placeholder="e.g. British Airways" value={form.airline}
                  onChange={e => set('airline', e.target.value)} className={inputCls} />
              </Field>
              <Field label="Flight Number(s)">
                <input type="text" placeholder="e.g. BA 075 / BA 076" value={form.flight_numbers}
                  onChange={e => set('flight_numbers', e.target.value)} className={inputCls} />
              </Field>
              <Field label="PNR / Booking Reference">
                <input type="text" placeholder="e.g. XYZ123" value={form.pnr}
                  onChange={e => set('pnr', e.target.value.toUpperCase())} className={`${inputCls} font-mono`} />
              </Field>
            </div>
          </div>
        )}

        {/* Hotel Details */}
        {isHotelType && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 space-y-4">
            <h2 className="font-semibold text-gray-700 flex items-center gap-2">
              <Hotel className="w-4 h-4 text-[#003366]" /> Hotel Details
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Hotel Name">
                <input type="text" placeholder="e.g. Hilton London" value={form.hotel_name}
                  onChange={e => set('hotel_name', e.target.value)} className={inputCls} />
              </Field>
              <Field label="Hotel Confirmation Number">
                <input type="text" placeholder="e.g. HLT-9876543" value={form.hotel_confirmation}
                  onChange={e => set('hotel_confirmation', e.target.value)} className={`${inputCls} font-mono`} />
              </Field>
            </div>
          </div>
        )}

        {/* Pricing */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 space-y-4">
          <h2 className="font-semibold text-gray-700 flex items-center gap-2">
            <Banknote className="w-4 h-4 text-[#003366]" /> Pricing
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Field label="Currency">
              <select value={form.currency} onChange={e => set('currency', e.target.value)} className={inputCls}>
                {CURRENCIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </Field>
            <Field label="Cost Price (what we pay)">
              <input type="number" min="0" step="0.01" placeholder="0.00" value={form.cost_price}
                onChange={e => set('cost_price', e.target.value)} className={inputCls} />
            </Field>
            <Field label="Selling Price (what customer pays)">
              <input type="number" min="0" step="0.01" placeholder="0.00" value={form.selling_price}
                onChange={e => set('selling_price', e.target.value)} className={inputCls} />
            </Field>
          </div>
          {form.cost_price && form.selling_price && (
            <p className="text-sm text-gray-500">
              Margin: <span className={`font-medium ${form.selling_price - form.cost_price >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(form.selling_price - form.cost_price, form.currency)}
              </span>
            </p>
          )}
        </div>

        {/* Notes */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 space-y-4">
          <h2 className="font-semibold text-gray-700 flex items-center gap-2">
            <FileText className="w-4 h-4 text-[#003366]" /> Notes
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Internal Notes (staff only)">
              <textarea rows={3} placeholder="Internal notes, supplier info..." value={form.internal_notes}
                onChange={e => set('internal_notes', e.target.value)}
                className={`${inputCls} resize-none`} />
            </Field>
            <Field label="Customer Notes (visible to customer)">
              <textarea rows={3} placeholder="Notes for customer confirmation..." value={form.customer_notes}
                onChange={e => set('customer_notes', e.target.value)}
                className={`${inputCls} resize-none`} />
            </Field>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button type="submit" disabled={saving}
            className="flex-1 md:flex-none bg-[#003366] text-white px-6 py-2.5 rounded-lg hover:bg-[#002244] transition-colors text-sm font-medium disabled:opacity-50">
            {saving ? 'Saving…' : isEdit ? 'Update Booking' : 'Create Booking'}
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

// ─── Itinerary Modal ─────────────────────────────────────────────────────────

function ItineraryModal({ booking, onClose }) {
  const printRef = useRef(null);

  const today = new Date().toLocaleDateString('en-GB', {
    day: '2-digit', month: 'long', year: 'numeric',
  });

  function fmtFull(d) {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-GB', {
      weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
    });
  }

  function nights(d1, d2) {
    if (!d1 || !d2) return null;
    const diff = Math.round((new Date(d2) - new Date(d1)) / (1000 * 60 * 60 * 24));
    return diff > 0 ? diff : null;
  }

  const duration = nights(booking.travel_date, booking.return_date);
  const sym = { NGN: '₦', USD: '$', GBP: '£', EUR: '€' }[booking.currency] || '';
  const price = booking.selling_price
    ? sym + Number(booking.selling_price).toLocaleString('en-NG', { minimumFractionDigits: 2 })
    : null;

  const handlePrint = () => {
    const content = printRef.current.innerHTML;
    const win = window.open('', '_blank', 'width=900,height=700');
    win.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8" />
        <title>Itinerary — ${booking.reference}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: Arial, Helvetica, sans-serif; font-size: 13px; color: #333; background: #fff; }
          .page { max-width: 800px; margin: 0 auto; padding: 40px; }

          /* Header */
          .header { display: flex; align-items: flex-start; justify-content: space-between; border-bottom: 3px solid #C8921A; padding-bottom: 20px; margin-bottom: 28px; }
          .header-left img { height: 60px; }
          .header-left .tagline { font-size: 10px; color: #666; margin-top: 4px; letter-spacing: 1px; text-transform: uppercase; }
          .header-right { text-align: right; }
          .header-right .doc-title { font-size: 22px; font-weight: 800; color: #003366; letter-spacing: 1px; text-transform: uppercase; }
          .header-right .ref { font-size: 12px; color: #666; margin-top: 4px; }
          .header-right .date { font-size: 11px; color: #999; margin-top: 2px; }

          /* Hero band */
          .hero { background: #003366; color: white; border-radius: 8px; padding: 20px 24px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center; }
          .hero .dest { font-size: 20px; font-weight: 800; }
          .hero .route { font-size: 12px; color: #a0c0e0; margin-top: 3px; }
          .hero .dur { font-size: 14px; font-weight: 600; background: rgba(255,255,255,0.15); border-radius: 6px; padding: 6px 14px; white-space: nowrap; }

          /* Client box */
          .client-box { border: 1.5px solid #e0e0e0; border-radius: 8px; padding: 16px 20px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: flex-start; }
          .client-box .label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.8px; color: #999; margin-bottom: 4px; }
          .client-box .value { font-size: 14px; font-weight: 700; color: #003366; }
          .client-box .sub { font-size: 11px; color: #666; margin-top: 2px; }

          /* Section */
          .section { margin-bottom: 20px; }
          .section-title { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #003366; border-bottom: 2px solid #003366; padding-bottom: 5px; margin-bottom: 12px; }
          .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
          .grid3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; }
          .info-block .lbl { font-size: 10px; color: #999; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 3px; }
          .info-block .val { font-size: 13px; font-weight: 600; color: #222; }
          .info-block .val.mono { font-family: monospace; font-size: 12px; background: #f4f4f4; padding: 3px 6px; border-radius: 4px; display: inline-block; }

          /* Price box */
          .price-box { background: #f8f9fc; border: 1.5px solid #003366; border-radius: 8px; padding: 16px 20px; display: flex; align-items: center; justify-content: space-between; }
          .price-box .lbl { font-size: 11px; color: #666; text-transform: uppercase; letter-spacing: 0.8px; }
          .price-box .amount { font-size: 26px; font-weight: 800; color: #003366; }
          .price-box .note { font-size: 11px; color: #999; margin-top: 3px; }

          /* Notes */
          .notes-box { background: #fffbf0; border-left: 4px solid #C8921A; border-radius: 0 6px 6px 0; padding: 12px 16px; font-size: 12px; color: #555; white-space: pre-wrap; line-height: 1.6; }

          /* Footer */
          .footer { border-top: 2px solid #e0e0e0; margin-top: 32px; padding-top: 16px; display: flex; justify-content: space-between; align-items: center; }
          .footer .contact { font-size: 11px; color: #666; line-height: 1.7; }
          .footer .legal { font-size: 10px; color: #bbb; text-align: right; line-height: 1.6; }
          .footer .brand { font-weight: 700; color: #003366; font-size: 12px; }

          /* Print */
          @media print {
            body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
            .no-print { display: none !important; }
            .page { padding: 20px; }
          }

          /* Print button (screen only) */
          .print-bar { background: #003366; color: white; padding: 12px 24px; display: flex; align-items: center; justify-content: space-between; }
          .print-bar .msg { font-size: 13px; }
          .print-bar button { background: #C8921A; color: white; border: none; border-radius: 6px; padding: 8px 20px; font-size: 13px; font-weight: 600; cursor: pointer; }
          .print-bar button:hover { background: #a07010; }
        </style>
      </head>
      <body>
        <div class="print-bar no-print">
          <span class="msg">✈ Your itinerary is ready — click Print to save as PDF</span>
          <button onclick="window.print()">🖨 Print / Save as PDF</button>
        </div>
        <div class="page">
          ${content}
        </div>
        <script>
          // Auto-trigger print after a short delay to let styles load
          setTimeout(() => window.focus(), 200);
        </script>
      </body>
      </html>
    `);
    win.document.close();
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl my-6">
        {/* Modal toolbar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-[#003366] rounded-t-2xl">
          <div className="flex items-center gap-3">
            <Printer className="w-5 h-5 text-white" />
            <span className="text-white font-semibold">Travel Itinerary Preview</span>
            <span className="text-blue-300 text-sm">— {booking.reference}</span>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={handlePrint}
              className="flex items-center gap-2 bg-[#C8921A] hover:bg-[#a07010] text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors">
              <Printer className="w-4 h-4" /> Print / Save as PDF
            </button>
            <button onClick={onClose} className="text-blue-200 hover:text-white p-1">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Preview (matches print output) */}
        <div className="p-6 overflow-y-auto max-h-[80vh]">
          <div ref={printRef} style={{ fontFamily: 'Arial, Helvetica, sans-serif', fontSize: '13px', color: '#333' }}>

            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', borderBottom: '3px solid #C8921A', paddingBottom: '20px', marginBottom: '28px' }}>
              <div>
                <img src="/logo.png" alt="Now Travel & Tours" style={{ height: '56px', objectFit: 'contain' }} />
                <div style={{ fontSize: '9px', color: '#666', marginTop: '4px', letterSpacing: '1px', textTransform: 'uppercase' }}>
                  6 Tombia Street, GRA Phase 2, Port Harcourt
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '22px', fontWeight: '800', color: '#003366', letterSpacing: '1px', textTransform: 'uppercase' }}>
                  Travel Itinerary
                </div>
                <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>Ref: {booking.reference}</div>
                <div style={{ fontSize: '11px', color: '#999', marginTop: '2px' }}>Issued: {today}</div>
              </div>
            </div>

            {/* Destination hero */}
            <div style={{ background: '#003366', color: 'white', borderRadius: '8px', padding: '20px 24px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: '20px', fontWeight: '800' }}>{booking.destination || 'Travel Package'}</div>
                {booking.origin && (
                  <div style={{ fontSize: '12px', color: '#a0c0e0', marginTop: '3px' }}>
                    {booking.origin} → {booking.destination}
                  </div>
                )}
                <div style={{ fontSize: '12px', color: '#a0c0e0', marginTop: '3px' }}>
                  {booking.service_type}
                </div>
              </div>
              {duration && (
                <div style={{ fontSize: '14px', fontWeight: '600', background: 'rgba(255,255,255,0.15)', borderRadius: '6px', padding: '8px 16px', whiteSpace: 'nowrap' }}>
                  {duration} Night{duration !== 1 ? 's' : ''}
                </div>
              )}
            </div>

            {/* Client info */}
            <div style={{ border: '1.5px solid #e0e0e0', borderRadius: '8px', padding: '16px 20px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.8px', color: '#999', marginBottom: '4px' }}>Passenger / Client</div>
                <div style={{ fontSize: '16px', fontWeight: '700', color: '#003366' }}>{booking.first_name} {booking.last_name}</div>
                {booking.pax_count > 1 && (
                  <div style={{ fontSize: '11px', color: '#666', marginTop: '2px' }}>{booking.pax_count} Passengers</div>
                )}
              </div>
              <div style={{ textAlign: 'right' }}>
                {booking.email && <div style={{ fontSize: '12px', color: '#555' }}>{booking.email}</div>}
                {booking.phone && <div style={{ fontSize: '12px', color: '#555', marginTop: '2px' }}>{booking.phone}</div>}
              </div>
            </div>

            {/* Travel details */}
            <div style={{ marginBottom: '20px' }}>
              <div style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px', color: '#003366', borderBottom: '2px solid #003366', paddingBottom: '5px', marginBottom: '12px' }}>
                Travel Details
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                {booking.travel_date && (
                  <div>
                    <div style={{ fontSize: '10px', color: '#999', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '3px' }}>Departure</div>
                    <div style={{ fontSize: '13px', fontWeight: '600', color: '#222' }}>{fmtFull(booking.travel_date)}</div>
                  </div>
                )}
                {booking.return_date && (
                  <div>
                    <div style={{ fontSize: '10px', color: '#999', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '3px' }}>Return</div>
                    <div style={{ fontSize: '13px', fontWeight: '600', color: '#222' }}>{fmtFull(booking.return_date)}</div>
                  </div>
                )}
                <div>
                  <div style={{ fontSize: '10px', color: '#999', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '3px' }}>Passengers</div>
                  <div style={{ fontSize: '13px', fontWeight: '600', color: '#222' }}>{booking.pax_count || 1}</div>
                </div>
              </div>
            </div>

            {/* Flight details */}
            {(booking.airline || booking.pnr || booking.flight_numbers) && (
              <div style={{ marginBottom: '20px' }}>
                <div style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px', color: '#003366', borderBottom: '2px solid #003366', paddingBottom: '5px', marginBottom: '12px' }}>
                  ✈ Flight Details
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                  {booking.airline && (
                    <div>
                      <div style={{ fontSize: '10px', color: '#999', textTransform: 'uppercase', marginBottom: '3px' }}>Airline</div>
                      <div style={{ fontSize: '13px', fontWeight: '600', color: '#222' }}>{booking.airline}</div>
                    </div>
                  )}
                  {booking.flight_numbers && (
                    <div>
                      <div style={{ fontSize: '10px', color: '#999', textTransform: 'uppercase', marginBottom: '3px' }}>Flight Numbers</div>
                      <div style={{ fontSize: '13px', fontWeight: '600', color: '#222' }}>{booking.flight_numbers}</div>
                    </div>
                  )}
                  {booking.pnr && (
                    <div>
                      <div style={{ fontSize: '10px', color: '#999', textTransform: 'uppercase', marginBottom: '3px' }}>PNR / Booking Code</div>
                      <div style={{ fontFamily: 'monospace', fontSize: '14px', fontWeight: '700', color: '#003366', background: '#f0f4f8', padding: '4px 8px', borderRadius: '4px', display: 'inline-block' }}>{booking.pnr}</div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Hotel details */}
            {(booking.hotel_name || booking.hotel_confirmation) && (
              <div style={{ marginBottom: '20px' }}>
                <div style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px', color: '#003366', borderBottom: '2px solid #003366', paddingBottom: '5px', marginBottom: '12px' }}>
                  🏨 Hotel / Accommodation
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                  {booking.hotel_name && (
                    <div>
                      <div style={{ fontSize: '10px', color: '#999', textTransform: 'uppercase', marginBottom: '3px' }}>Hotel Name</div>
                      <div style={{ fontSize: '13px', fontWeight: '600', color: '#222' }}>{booking.hotel_name}</div>
                    </div>
                  )}
                  {booking.hotel_confirmation && (
                    <div>
                      <div style={{ fontSize: '10px', color: '#999', textTransform: 'uppercase', marginBottom: '3px' }}>Confirmation Number</div>
                      <div style={{ fontFamily: 'monospace', fontSize: '13px', fontWeight: '700', color: '#003366', background: '#f0f4f8', padding: '4px 8px', borderRadius: '4px', display: 'inline-block' }}>{booking.hotel_confirmation}</div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Price */}
            {price && (
              <div style={{ background: '#f8f9fc', border: '1.5px solid #003366', borderRadius: '8px', padding: '16px 20px', marginBottom: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: '11px', color: '#666', textTransform: 'uppercase', letterSpacing: '0.8px' }}>Total Package Price</div>
                  <div style={{ fontSize: '26px', fontWeight: '800', color: '#003366', marginTop: '4px' }}>{price}</div>
                  <div style={{ fontSize: '11px', color: '#999', marginTop: '2px' }}>All amounts in {booking.currency}</div>
                </div>
                <div style={{ fontSize: '12px', color: '#666', textAlign: 'right' }}>
                  <div style={{ fontWeight: '600', color: '#333' }}>Now Travel & Tours</div>
                  <div>admin@nowtravelandtours.com</div>
                  <div>+234 818 290 2621</div>
                </div>
              </div>
            )}

            {/* Customer notes */}
            {booking.customer_notes && (
              <div style={{ marginBottom: '20px' }}>
                <div style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px', color: '#003366', borderBottom: '2px solid #003366', paddingBottom: '5px', marginBottom: '12px' }}>
                  Important Notes
                </div>
                <div style={{ background: '#fffbf0', borderLeft: '4px solid #C8921A', borderRadius: '0 6px 6px 0', padding: '12px 16px', fontSize: '12px', color: '#555', whiteSpace: 'pre-wrap', lineHeight: '1.6' }}>
                  {booking.customer_notes}
                </div>
              </div>
            )}

            {/* Footer */}
            <div style={{ borderTop: '2px solid #e0e0e0', marginTop: '32px', paddingTop: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ fontSize: '11px', color: '#666', lineHeight: '1.7' }}>
                <div style={{ fontWeight: '700', color: '#003366', fontSize: '12px' }}>Now Travel & Tours Limited</div>
                <div>6 Tombia Street, GRA Phase 2, Port Harcourt, Rivers State</div>
                <div>📧 admin@nowtravelandtours.com &nbsp;|&nbsp; 📞 +234 818 290 2621</div>
                <div>🌐 nowtravelandtours.com</div>
              </div>
              <div style={{ fontSize: '10px', color: '#bbb', textAlign: 'right', lineHeight: '1.6', maxWidth: '240px' }}>
                <div>IATA & NANTA Certified</div>
                <div>This itinerary is subject to change. Please carry a printed copy when travelling.</div>
                <div style={{ marginTop: '4px' }}>Ref: {booking.reference}</div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Booking Detail ───────────────────────────────────────────────────────────

function BookingDetail({ booking: initial, onBack, onEdit }) {
  const [booking, setBooking] = useState(initial);
  const [updating, setUpdating] = useState(false);

  const transitions = STATUS_TRANSITIONS[booking.status] || [];

  const changeStatus = async (newStatus) => {
    if (!window.confirm(`Move booking to "${newStatus}"?`)) return;
    setUpdating(true);
    try {
      const res = await bookingsApi.updateStatus(booking.id, newStatus);
      setBooking(prev => ({ ...prev, ...res.data.booking }));
      toast.success(`Status updated to ${newStatus}`);
    } catch {
      toast.error('Failed to update status');
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

  const profit = booking.selling_price && booking.cost_price
    ? booking.selling_price - booking.cost_price : null;

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
              <h1 className="text-2xl font-bold text-[#003366] font-mono">{booking.reference}</h1>
              <StatusBadge status={booking.status} />
            </div>
            <p className="text-sm text-gray-500 mt-0.5">
              {booking.first_name} {booking.last_name} ·{' '}
              <span className="inline-flex items-center gap-1">
                <ServiceIcon type={booking.service_type} className="w-3.5 h-3.5" />
                {booking.service_type}
              </span>
            </p>
          </div>
        </div>
        <button onClick={onEdit}
          className="flex items-center gap-2 text-sm text-[#003366] border border-[#003366] px-3 py-1.5 rounded-lg hover:bg-[#003366] hover:text-white transition-colors">
          <Edit2 className="w-3.5 h-3.5" /> Edit
        </button>
      </div>

      {/* Status Actions */}
      {transitions.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <p className="text-xs text-gray-500 mb-2 font-medium uppercase tracking-wide">Move status to</p>
          <div className="flex flex-wrap gap-2">
            {transitions.map(s => (
              <button key={s} onClick={() => changeStatus(s)} disabled={updating}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors disabled:opacity-50
                  ${s === 'Cancelled' || s === 'Refunded'
                    ? 'border-red-200 text-red-600 hover:bg-red-50'
                    : 'border-[#003366]/20 text-[#003366] hover:bg-[#003366]/5'}`}>
                {s} →
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Travel Info */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <h2 className="font-semibold text-gray-700 mb-4 flex items-center gap-2">
          <Calendar className="w-4 h-4 text-[#003366]" /> Travel Details
        </h2>
        <dl className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <InfoRow label="Origin"       value={booking.origin} />
          <InfoRow label="Destination"  value={booking.destination} />
          <InfoRow label="Travel Date"  value={formatDate(booking.travel_date)} />
          <InfoRow label="Return Date"  value={formatDate(booking.return_date)} />
          <InfoRow label="Passengers"   value={booking.pax_count} />
          {booking.airline         && <InfoRow label="Airline"         value={booking.airline} />}
          {booking.flight_numbers  && <InfoRow label="Flight Numbers"  value={booking.flight_numbers} />}
          {booking.pnr             && <InfoRow label="PNR"             value={booking.pnr} mono />}
          {booking.hotel_name      && <InfoRow label="Hotel"           value={booking.hotel_name} />}
          {booking.hotel_confirmation && <InfoRow label="Hotel Conf #" value={booking.hotel_confirmation} mono />}
        </dl>
      </div>

      {/* Pricing */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <h2 className="font-semibold text-gray-700 mb-4 flex items-center gap-2">
          <Banknote className="w-4 h-4 text-[#003366]" /> Pricing
        </h2>
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <p className="text-xs text-gray-500 mb-1">Cost Price</p>
            <p className="text-lg font-bold text-gray-700">{formatCurrency(booking.cost_price, booking.currency)}</p>
          </div>
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <p className="text-xs text-gray-500 mb-1">Selling Price</p>
            <p className="text-lg font-bold text-[#003366]">{formatCurrency(booking.selling_price, booking.currency)}</p>
          </div>
          <div className={`text-center p-3 rounded-lg ${profit >= 0 ? 'bg-green-50' : 'bg-red-50'}`}>
            <p className="text-xs text-gray-500 mb-1">Margin</p>
            <p className={`text-lg font-bold ${profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {profit !== null ? formatCurrency(profit, booking.currency) : '—'}
            </p>
          </div>
        </div>
      </div>

      {/* Notes */}
      {(booking.internal_notes || booking.customer_notes) && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h2 className="font-semibold text-gray-700 mb-4 flex items-center gap-2">
            <FileText className="w-4 h-4 text-[#003366]" /> Notes
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {booking.internal_notes && (
              <div>
                <p className="text-xs text-gray-500 mb-1 font-medium">Internal Notes</p>
                <p className="text-sm text-gray-700 whitespace-pre-wrap bg-gray-50 rounded-lg p-3">{booking.internal_notes}</p>
              </div>
            )}
            {booking.customer_notes && (
              <div>
                <p className="text-xs text-gray-500 mb-1 font-medium">Customer Notes</p>
                <p className="text-sm text-gray-700 whitespace-pre-wrap bg-blue-50 rounded-lg p-3">{booking.customer_notes}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Timestamps */}
      <div className="text-xs text-gray-400 flex flex-wrap gap-4 px-1">
        <span>Created: {formatDate(booking.created_at)}</span>
        {booking.confirmed_at && <span>Confirmed: {formatDate(booking.confirmed_at)}</span>}
        {booking.ticketed_at  && <span>Ticketed: {formatDate(booking.ticketed_at)}</span>}
        {booking.completed_at && <span>Completed: {formatDate(booking.completed_at)}</span>}
      </div>
    </div>
  );
}

// ─── Main Bookings Page ───────────────────────────────────────────────────────

export default function Bookings() {
  const [view, setView]       = useState('list'); // 'list' | 'new' | 'detail' | 'edit'
  const [selected, setSelected] = useState(null);
  const [listKey, setListKey] = useState(0); // force list refresh

  const handleSelect = (b) => { setSelected(b); setView('detail'); };
  const handleNew    = ()  => { setSelected(null); setView('new'); };
  const handleEdit   = ()  => setView('edit');
  const handleBack   = ()  => { setSelected(null); setView('list'); };
  const handleSaved  = ()  => { setListKey(k => k + 1); setView('list'); setSelected(null); };
  const handleCancel = ()  => selected ? setView('detail') : setView('list');

  if (view === 'new')    return <BookingForm booking={null}     onSave={handleSaved} onCancel={handleBack} />;
  if (view === 'edit')   return <BookingForm booking={selected} onSave={handleSaved} onCancel={handleCancel} />;
  if (view === 'detail') return <BookingDetail booking={selected} onBack={handleBack} onEdit={handleEdit} />;

  return <BookingList key={listKey} onNew={handleNew} onSelect={handleSelect} />;
}
                <div style={{ fontSize: '22px', fontWeight: '800', color: '#003366', letterSpacing: '1px', textTransform: 'uppercase' }}>
                  Travel Itinerary
                </div>
                <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>Ref: {booking.reference}</div>
                <div style={{ fontSize: '11px', color: '#999', marginTop: '2px' }}>Issued: {today}</div>
              </div>
            </div>

            {/* Destination hero */}
            <div style={{ background: '#003366', color: 'white', borderRadius: '8px', padding: '20px 24px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: '20px', fontWeight: '800' }}>{booking.destination || 'Travel Package'}</div>
                {booking.origin && (
                  <div style={{ fontSize: '12px', color: '#a0c0e0', marginTop: '3px' }}>{booking.origin} → {booking.destination}</div>
                )}
                <div style={{ fontSize: '12px', color: '#a0c0e0', marginTop: '3px' }}>{booking.service_type}</div>
              </div>
              {duration && (
                <div style={{ fontSize: '14px', fontWeight: '600', background: 'rgba(255,255,255,0.15)', borderRadius: '6px', padding: '8px 16px', whiteSpace: 'nowrap' }}>
                  {duration} Night{duration !== 1 ? 's' : ''}
                </div>
              )}
            </div>

            {/* Client */}
            <div style={{ border: '1.5px solid #e0e0e0', borderRadius: '8px', padding: '16px 20px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.8px', color: '#999', marginBottom: '4px' }}>Passenger / Client</div>
                <div style={{ fontSize: '16px', fontWeight: '700', color: '#003366' }}>{booking.first_name} {booking.last_name}</div>
                {booking.pax_count > 1 && <div style={{ fontSize: '11px', color: '#666', marginTop: '2px' }}>{booking.pax_count} Passengers</div>}
              </div>
              <div style={{ textAlign: 'right' }}>
                {booking.email && <div style={{ fontSize: '12px', color: '#555' }}>{booking.email}</div>}
                {booking.phone && <div style={{ fontSize: '12px', color: '#555', marginTop: '2px' }}>{booking.phone}</div>}
              </div>
            </div>

            {/* Travel dates */}
            <div style={{ marginBottom: '20px' }}>
              <div style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px', color: '#003366', borderBottom: '2px solid #003366', paddingBottom: '5px', marginBottom: '12px' }}>Travel Details</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                {booking.travel_date && <div><div style={{ fontSize: '10px', color: '#999', textTransform: 'uppercase', marginBottom: '3px' }}>Departure</div><div style={{ fontSize: '13px', fontWeight: '600', color: '#222' }}>{fmtFull(booking.travel_date)}</div></div>}
                {booking.return_date  && <div><div style={{ fontSize: '10px', color: '#999', textTransform: 'uppercase', marginBottom: '3px' }}>Return</div><div style={{ fontSize: '13px', fontWeight: '600', color: '#222' }}>{fmtFull(booking.return_date)}</div></div>}
                <div><div style={{ fontSize: '10px', color: '#999', textTransform: 'uppercase', marginBottom: '3px' }}>Passengers</div><div style={{ fontSize: '13px', fontWeight: '600', color: '#222' }}>{booking.pax_count || 1}</div></div>
              </div>
            </div>

            {/* Flights */}
            {(booking.airline || booking.pnr || booking.flight_numbers) && (
              <div style={{ marginBottom: '20px' }}>
                <div style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px', color: '#003366', borderBottom: '2px solid #003366', paddingBottom: '5px', marginBottom: '12px' }}>Flight Details</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                  {booking.airline        && <div><div style={{ fontSize: '10px', color: '#999', textTransform: 'uppercase', marginBottom: '3px' }}>Airline</div><div style={{ fontSize: '13px', fontWeight: '600', color: '#222' }}>{booking.airline}</div></div>}
                  {booking.flight_numbers && <div><div style={{ fontSize: '10px', color: '#999', textTransform: 'uppercase', marginBottom: '3px' }}>Flight Numbers</div><div style={{ fontSize: '13px', fontWeight: '600', color: '#222' }}>{booking.flight_numbers}</div></div>}
                  {booking.pnr            && <div><div style={{ fontSize: '10px', color: '#999', textTransform: 'uppercase', marginBottom: '3px' }}>PNR</div><div style={{ fontFamily: 'monospace', fontSize: '14px', fontWeight: '700', color: '#003366', background: '#f0f4f8', padding: '4px 8px', borderRadius: '4px', display: 'inline-block' }}>{booking.pnr}</div></div>}
                </div>
              </div>
            )}

            {/* Hotel */}
            {(booking.hotel_name || booking.hotel_confirmation) && (
              <div style={{ marginBottom: '20px' }}>
                <div style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px', color: '#003366', borderBottom: '2px solid #003366', paddingBottom: '5px', marginBottom: '12px' }}>Hotel / Accommodation</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                  {booking.hotel_name         && <div><div style={{ fontSize: '10px', color: '#999', textTransform: 'uppercase', marginBottom: '3px' }}>Hotel Name</div><div style={{ fontSize: '13px', fontWeight: '600', color: '#222' }}>{booking.hotel_name}</div></div>}
                  {booking.hotel_confirmation && <div><div style={{ fontSize: '10px', color: '#999', textTransform: 'uppercase', marginBottom: '3px' }}>Confirmation Number</div><div style={{ fontFamily: 'monospace', fontSize: '13px', fontWeight: '700', color: '#003366', background: '#f0f4f8', padding: '4px 8px', borderRadius: '4px', display: 'inline-block' }}>{booking.hotel_confirmation}</div></div>}
                </div>
              </div>
            )}

            {/* Price */}
            {price && (
              <div style={{ background: '#f8f9fc', border: '1.5px solid #003366', borderRadius: '8px', padding: '16px 20px', marginBottom: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: '11px', color: '#666', textTransform: 'uppercase', letterSpacing: '0.8px' }}>Total Package Price</div>
                  <div style={{ fontSize: '26px', fontWeight: '800', color: '#003366', marginTop: '4px' }}>{price}</div>
                  <div style={{ fontSize: '11px', color: '#999', marginTop: '2px' }}>All amounts in {booking.currency}</div>
                </div>
                <div style={{ fontSize: '12px', color: '#666', textAlign: 'right' }}>
                  <div style={{ fontWeight: '600', color: '#333' }}>Now Travel &amp; Tours</div>
                  <div>admin@nowtravelandtours.com</div>
                  <div>+234 818 290 2621</div>
                </div>
              </div>
            )}

            {/* Notes */}
            {booking.customer_notes && (
              <div style={{ marginBottom: '20px' }}>
                <div style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px', color: '#003366', borderBottom: '2px solid #003366', paddingBottom: '5px', marginBottom: '12px' }}>Important Notes</div>
                <div style={{ background: '#fffbf0', borderLeft: '4px solid #C8921A', borderRadius: '0 6px 6px 0', padding: '12px 16px', fontSize: '12px', color: '#555', whiteSpace: 'pre-wrap', lineHeight: '1.6' }}>{booking.customer_notes}</div>
              </div>
            )}

            {/* Footer */}
            <div style={{ borderTop: '2px solid #e0e0e0', marginTop: '32px', paddingTop: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ fontSize: '11px', color: '#666', lineHeight: '1.7' }}>
                <div style={{ fontWeight: '700', color: '#003366', fontSize: '12px' }}>Now Travel &amp; Tours Limited</div>
                <div>6 Tombia Street, GRA Phase 2, Port Harcourt, Rivers State</div>
                <div>admin@nowtravelandtours.com | +234 818 290 2621</div>
                <div>nowtravelandtours.com</div>
              </div>
              <div style={{ fontSize: '10px', color: '#bbb', textAlign: 'right', lineHeight: '1.6', maxWidth: '240px' }}>
                <div>IATA &amp; NANTA Certified</div>
                <div>This itinerary is subject to change. Please carry a printed copy when travelling.</div>
                <div style={{ marginTop: '4px' }}>Ref: {booking.reference}</div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Booking Detail ───────────────────────────────────────────────────────────

function BookingDetail({ booking: initial, onBack, onEdit }) {
  const [booking, setBooking]   = useState(initial);
  const [updating, setUpdating] = useState(false);
  const [showItinerary, setShowItinerary] = useState(false);

  const transitions = STATUS_TRANSITIONS[booking.status] || [];

  const changeStatus = async (newStatus) => {
    if (!window.confirm(`Move booking to "${newStatus}"?`)) return;
    setUpdating(true);
    try {
      const res = await bookingsApi.updateStatus(booking.id, newStatus);
      setBooking(prev => ({ ...prev, ...res.data.booking }));
      toast.success(`Status updated to ${newStatus}`);
    } catch {
      toast.error('Failed to update status');
    } finally { setUpdating(false); }
  };

  const InfoRow = ({ label, value, mono }) => (
    <div>
      <dt className="text-xs text-gray-500 mb-0.5">{label}</dt>
      <dd className={`text-sm text-gray-800 font-medium ${mono ? 'font-mono' : ''}`}>{value || '—'}</dd>
    </div>
  );

  const profit = booking.selling_price && booking.cost_price
    ? booking.selling_price - booking.cost_price : null;

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
              <h1 className="text-2xl font-bold text-[#003366] font-mono">{booking.reference}</h1>
              <StatusBadge status={booking.status} />
            </div>
            <p className="text-sm text-gray-500 mt-0.5">
              {booking.first_name} {booking.last_name} ·{' '}
              <span className="inline-flex items-center gap-1">
                <ServiceIcon type={booking.service_type} className="w-3.5 h-3.5" />
                {booking.service_type}
              </span>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowItinerary(true)}
            className="flex items-center gap-2 text-sm bg-[#C8921A] text-white px-3 py-1.5 rounded-lg hover:bg-[#a07010] transition-colors font-medium">
            <Printer className="w-3.5 h-3.5" /> Itinerary
          </button>
          <button onClick={onEdit}
            className="flex items-center gap-2 text-sm text-[#003366] border border-[#003366] px-3 py-1.5 rounded-lg hover:bg-[#003366] hover:text-white transition-colors">
            <Edit2 className="w-3.5 h-3.5" /> Edit
          </button>
        </div>
      </div>

      {/* Status Actions */}
      {transitions.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <p className="text-xs text-gray-500 mb-2 font-medium uppercase tracking-wide">Move status to</p>
          <div className="flex flex-wrap gap-2">
            {transitions.map(s => (
              <button key={s} onClick={() => changeStatus(s)} disabled={updating}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors disabled:opacity-50
                  ${s === 'Cancelled' || s === 'Refunded'
                    ? 'border-red-200 text-red-600 hover:bg-red-50'
                    : 'border-[#003366]/20 text-[#003366] hover:bg-[#003366]/5'}`}>
                {s} →
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Travel Info */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <h2 className="font-semibold text-gray-700 mb-4 flex items-center gap-2">
          <Calendar className="w-4 h-4 text-[#003366]" /> Travel Details
        </h2>
        <dl className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <InfoRow label="Origin"       value={booking.origin} />
          <InfoRow label="Destination"  value={booking.destination} />
          <InfoRow label="Travel Date"  value={formatDate(booking.travel_date)} />
          <InfoRow label="Return Date"  value={formatDate(booking.return_date)} />
          <InfoRow label="Passengers"   value={booking.pax_count} />
          {booking.airline         && <InfoRow label="Airline"         value={booking.airline} />}
          {booking.flight_numbers  && <InfoRow label="Flight Numbers"  value={booking.flight_numbers} />}
          {booking.pnr             && <InfoRow label="PNR"             value={booking.pnr} mono />}
          {booking.hotel_name      && <InfoRow label="Hotel"           value={booking.hotel_name} />}
          {booking.hotel_confirmation && <InfoRow label="Hotel Conf #" value={booking.hotel_confirmation} mono />}
        </dl>
      </div>

      {/* Pricing */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <h2 className="font-semibold text-gray-700 mb-4 flex items-center gap-2">
          <Banknote className="w-4 h-4 text-[#003366]" /> Pricing
        </h2>
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <p className="text-xs text-gray-500 mb-1">Cost Price</p>
            <p className="text-lg font-bold text-gray-700">{formatCurrency(booking.cost_price, booking.currency)}</p>
          </div>
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <p className="text-xs text-gray-500 mb-1">Selling Price</p>
            <p className="text-lg font-bold text-[#003366]">{formatCurrency(booking.selling_price, booking.currency)}</p>
          </div>
          <div className={`text-center p-3 rounded-lg ${profit >= 0 ? 'bg-green-50' : 'bg-red-50'}`}>
            <p className="text-xs text-gray-500 mb-1">Margin</p>
            <p className={`text-lg font-bold ${profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {profit !== null ? formatCurrency(profit, booking.currency) : '—'}
            </p>
          </div>
        </div>
      </div>

      {/* Notes */}
      {(booking.internal_notes || booking.customer_notes) && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h2 className="font-semibold text-gray-700 mb-4 flex items-center gap-2">
            <FileText className="w-4 h-4 text-[#003366]" /> Notes
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {booking.internal_notes && (
              <div>
                <p className="text-xs text-gray-500 mb-1 font-medium">Internal Notes</p>
                <p className="text-sm text-gray-700 whitespace-pre-wrap bg-gray-50 rounded-lg p-3">{booking.internal_notes}</p>
              </div>
            )}
            {booking.customer_notes && (
              <div>
                <p className="text-xs text-gray-500 mb-1 font-medium">Customer Notes</p>
                <p className="text-sm text-gray-700 whitespace-pre-wrap bg-blue-50 rounded-lg p-3">{booking.customer_notes}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Timestamps */}
      <div className="text-xs text-gray-400 flex flex-wrap gap-4 px-1">
        <span>Created: {formatDate(booking.created_at)}</span>
        {booking.confirmed_at && <span>Confirmed: {formatDate(booking.confirmed_at)}</span>}
        {booking.ticketed_at  && <span>Ticketed: {formatDate(booking.ticketed_at)}</span>}
        {booking.completed_at && <span>Completed: {formatDate(booking.completed_at)}</span>}
      </div>

      {/* Itinerary Modal */}
      {showItinerary && (
        <ItineraryModal booking={booking} onClose={() => setShowItinerary(false)} />
      )}
    </div>
  );
}

// ─── Main Bookings Page ───────────────────────────────────────────────────────

export default function Bookings() {
  const [view, setView]         = useState('list');
  const [selected, setSelected] = useState(null);

  const handleBack  = ()  => setView('list');
  const handleSelect = (b) => { setSelected(b); setView('detail'); };
  const handleEdit  = ()  => setView('edit');
  const handleCancel = () => selected ? setView('detail') : setView('list');
  const handleSaved  = (b) => { setSelected(b); setView('detail'); };

  if (view === 'detail') return <BookingDetail booking={selected} onBack={handleBack} onEdit={handleEdit} />;
  if (view === 'new')    return <BookingForm booking={null}     onSave={handleSaved} onCancel={handleCancel} />;
  if (view === 'edit')   return <BookingForm booking={selected} onSave={handleSaved} onCancel={handleCancel} />;

  return <BookingList onNew={() => setView('new')} onSelect={handleSelect} />;
}
