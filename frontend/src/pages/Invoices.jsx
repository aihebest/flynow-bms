import { useState, useEffect, useCallback } from 'react';
import { invoices as invoicesApi } from '../api';
import CustomerSearch from '../components/CustomerSearch';
import toast from 'react-hot-toast';
import {
  FileText, Plus, Search, ChevronLeft, ChevronRight,
  Banknote, CreditCard,
  CheckCircle2, XCircle, PlusCircle, Send, RefreshCw, ExternalLink, Trash2, Printer,
} from 'lucide-react';

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUSES = ['Draft', 'Sent', 'Partially Paid', 'Paid', 'Overdue', 'Cancelled', 'Refunded'];

const STATUS_COLORS = {
  'Draft':          'bg-gray-100 text-gray-600',
  'Sent':           'bg-blue-100 text-blue-700',
  'Partially Paid': 'bg-amber-100 text-amber-700',
  'Paid':           'bg-green-100 text-green-700',
  'Overdue':        'bg-red-100 text-red-700',
  'Cancelled':      'bg-gray-200 text-gray-500',
  'Refunded':       'bg-orange-100 text-orange-700',
};

const PAYMENT_METHODS = ['Bank Transfer', 'Cash', 'POS', 'Cheque', 'Paystack Online', 'Crypto'];
const CURRENCIES       = ['NGN', 'USD', 'GBP', 'EUR'];
const CURRENCY_SYM     = { NGN: '₦', USD: '$', GBP: '£', EUR: '€' };

// ─── Helpers ──────────────────────────────────────────────────────────────────

function StatusBadge({ status }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[status] || 'bg-gray-100 text-gray-600'}`}>
      {status}
    </span>
  );
}

function fmt(amount, currency = 'NGN') {
  if (amount === null || amount === undefined || amount === '') return '—';
  const sym = CURRENCY_SYM[currency] || currency + ' ';
  return sym + Number(amount).toLocaleString('en-NG', { minimumFractionDigits: 2 });
}

function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

// Field must be defined at module scope — NOT inside a form component.
// Defining it inside a component creates a new function type on every render,
// which causes React to unmount/remount children (losing input focus).
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

function isOverdue(inv) {
  if (!inv.due_date || ['Paid', 'Cancelled', 'Refunded'].includes(inv.status)) return false;
  return new Date(inv.due_date) < new Date();
}

// ─── Invoice List ─────────────────────────────────────────────────────────────

function InvoiceList({ onNew, onSelect }) {
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
      const res = await invoicesApi.list(params);
      setData(res.data.invoices || []);
      setHasMore((res.data.invoices || []).length === 25);
    } catch {
      toast.error('Failed to load invoices');
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, search]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#003366] flex items-center gap-2">
            <FileText className="w-6 h-6" /> Invoices
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">Create, send and track customer invoices and payments</p>
        </div>
        <button onClick={onNew}
          className="flex items-center gap-2 bg-[#003366] text-white px-4 py-2 rounded-lg hover:bg-[#002244] transition-colors text-sm font-medium">
          <Plus className="w-4 h-4" /> New Invoice
        </button>
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input type="text" placeholder="Search customer name, invoice number..."
            value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#003366]/20" />
        </div>
        <select value={statusFilter} onChange={e => { setStatus(e.target.value); setPage(1); }}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#003366]/20">
          <option value="">All Statuses</option>
          {STATUSES.map(s => <option key={s}>{s}</option>)}
        </select>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-48 text-gray-400 text-sm">Loading invoices…</div>
        ) : data.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-gray-400">
            <FileText className="w-10 h-10 mb-2 opacity-30" />
            <p className="text-sm">No invoices yet — create the first one.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-xs text-gray-500 uppercase tracking-wider">
                <th className="text-left px-4 py-3 font-medium">Invoice #</th>
                <th className="text-left px-4 py-3 font-medium">Customer</th>
                <th className="text-left px-4 py-3 font-medium">Amount</th>
                <th className="text-left px-4 py-3 font-medium">Paid</th>
                <th className="text-left px-4 py-3 font-medium">Balance</th>
                <th className="text-left px-4 py-3 font-medium">Due Date</th>
                <th className="text-left px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {data.map(inv => (
                <tr key={inv.id} onClick={() => onSelect(inv)}
                  className="hover:bg-gray-50 cursor-pointer transition-colors">
                  <td className="px-4 py-3 font-mono text-xs text-[#003366] font-medium">{inv.invoice_number}</td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-800">{inv.first_name} {inv.last_name}</div>
                    <div className="text-xs text-gray-400">{inv.email}</div>
                  </td>
                  <td className="px-4 py-3 font-medium text-gray-800">{fmt(inv.total_amount, inv.currency)}</td>
                  <td className="px-4 py-3 text-green-600">{fmt(inv.amount_paid, inv.currency)}</td>
                  <td className={`px-4 py-3 font-medium ${parseFloat(inv.balance_due) > 0 ? 'text-red-600' : 'text-gray-400'}`}>
                    {fmt(inv.balance_due, inv.currency)}
                  </td>
                  <td className={`px-4 py-3 ${isOverdue(inv) ? 'text-red-600 font-medium' : 'text-gray-600'}`}>
                    {fmtDate(inv.due_date)}
                    {isOverdue(inv) && <span className="ml-1 text-xs">(overdue)</span>}
                  </td>
                  <td className="px-4 py-3"><StatusBadge status={isOverdue(inv) && inv.status === 'Sent' ? 'Overdue' : inv.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {!loading && data.length > 0 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 text-sm text-gray-500">
            <span>{data.length} invoice{data.length !== 1 ? 's' : ''}</span>
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

// ─── Line Item Row ────────────────────────────────────────────────────────────

function LineItemRow({ item, index, onChange, onRemove, currency }) {
  const lineTotal = (parseFloat(item.quantity) || 0) * (parseFloat(item.unit_price) || 0);
  const sym = CURRENCY_SYM[currency] || '';
  return (
    <tr>
      <td className="py-2 pr-2">
        <input type="text" placeholder="Description of service..."
          value={item.description}
          onChange={e => onChange(index, 'description', e.target.value)}
          className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#003366]/20" />
      </td>
      <td className="py-2 px-2 w-20">
        <input type="number" min="1" value={item.quantity}
          onChange={e => onChange(index, 'quantity', e.target.value)}
          className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-[#003366]/20" />
      </td>
      <td className="py-2 px-2 w-36">
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">{sym}</span>
          <input type="number" min="0" step="0.01" placeholder="0.00" value={item.unit_price}
            onChange={e => onChange(index, 'unit_price', e.target.value)}
            className="w-full border border-gray-200 rounded-lg pl-6 pr-3 py-1.5 text-sm text-right focus:outline-none focus:ring-2 focus:ring-[#003366]/20" />
        </div>
      </td>
      <td className="py-2 pl-2 w-32 text-right font-medium text-gray-700 text-sm">
        {lineTotal > 0 ? sym + lineTotal.toLocaleString('en-NG', { minimumFractionDigits: 2 }) : '—'}
      </td>
      <td className="py-2 pl-2 w-10">
        <button type="button" onClick={() => onRemove(index)} className="text-gray-300 hover:text-red-400 transition-colors">
          <Trash2 className="w-4 h-4" />
        </button>
      </td>
    </tr>
  );
}

// ─── Invoice Form ─────────────────────────────────────────────────────────────

function InvoiceForm({ invoice, onSave, onCancel }) {
  const isEdit = !!invoice;
  const [custSearch, setCustSearch] = useState(invoice ? `${invoice.first_name} ${invoice.last_name}` : '');
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    customer_id:     invoice?.customer_id     || '',
    currency:        invoice?.currency        || 'NGN',
    vat_rate:        invoice?.vat_rate        ?? 7.5,
    discount_amount: invoice?.discount_amount || 0,
    due_date:        invoice?.due_date        ? invoice.due_date.slice(0, 10) : '',
    notes:           invoice?.notes           || '',
  });

  const [lineItems, setLineItems] = useState(
    invoice ? [] : [{ description: '', quantity: 1, unit_price: '' }]
  );

  const updateLineItem = (i, field, value) => {
    setLineItems(items => items.map((item, idx) => idx === i ? { ...item, [field]: value } : item));
  };
  const addLineItem    = ()  => setLineItems(items => [...items, { description: '', quantity: 1, unit_price: '' }]);
  const removeLineItem = (i) => setLineItems(items => items.filter((_, idx) => idx !== i));

  // Computed totals
  const subtotal  = lineItems.reduce((s, item) => s + (parseFloat(item.quantity) || 0) * (parseFloat(item.unit_price) || 0), 0);
  const vatAmount = subtotal * (parseFloat(form.vat_rate) || 0) / 100;
  const discount  = parseFloat(form.discount_amount) || 0;
  const total     = subtotal + vatAmount - discount;

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const sym = CURRENCY_SYM[form.currency] || '';

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.customer_id) { toast.error('Please select a customer'); return; }
    if (lineItems.length === 0 || !lineItems.some(i => i.description)) {
      toast.error('Add at least one line item'); return;
    }
    if (total <= 0) { toast.error('Total must be greater than zero'); return; }
    setSaving(true);
    try {
      const payload = {
        ...form,
        subtotal,
        vat_amount: vatAmount,
        total_amount: total,
        line_items: lineItems.filter(i => i.description && i.unit_price),
      };
      if (!payload.due_date) delete payload.due_date;
      await invoicesApi.create(payload);
      toast.success('Invoice created');
      onSave();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to create invoice');
    } finally {
      setSaving(false);
    }
  };

  const inputCls = "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#003366]/20";

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={onCancel} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h1 className="text-2xl font-bold text-[#003366]">New Invoice</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Customer & Settings */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 space-y-4">
          <h2 className="font-semibold text-gray-700 flex items-center gap-2">
            <FileText className="w-4 h-4 text-[#003366]" /> Invoice Details
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-1">
              <Field label="Customer" required>
                <CustomerSearch
                  value={custSearch}
                  customerId={form.customer_id}
                  onChange={text => { setCustSearch(text); setForm(f => ({ ...f, customer_id: '' })); }}
                  onSelect={c => { setForm(f => ({ ...f, customer_id: c.id })); setCustSearch(`${c.first_name} ${c.last_name}`); }}
                  inputClassName={inputCls}
                  placeholder="Search or add customer..."
                />
              </Field>
            </div>
            <Field label="Currency">
              <select value={form.currency} onChange={e => set('currency', e.target.value)} className={inputCls}>
                {CURRENCIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </Field>
            <Field label="Due Date">
              <input type="date" value={form.due_date} onChange={e => set('due_date', e.target.value)} className={inputCls} />
            </Field>
          </div>
        </div>

        {/* Line Items */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 space-y-3">
          <h2 className="font-semibold text-gray-700 flex items-center gap-2">
            <Banknote className="w-4 h-4 text-[#003366]" /> Line Items
          </h2>
          <table className="w-full">
            <thead>
              <tr className="text-xs text-gray-500 border-b border-gray-100">
                <th className="text-left pb-2 font-medium">Description</th>
                <th className="text-center pb-2 font-medium w-20">Qty</th>
                <th className="text-right pb-2 font-medium w-36">Unit Price</th>
                <th className="text-right pb-2 font-medium w-32">Total</th>
                <th className="w-10" />
              </tr>
            </thead>
            <tbody>
              {lineItems.map((item, i) => (
                <LineItemRow key={i} item={item} index={i} currency={form.currency}
                  onChange={updateLineItem} onRemove={removeLineItem} />
              ))}
            </tbody>
          </table>
          <button type="button" onClick={addLineItem}
            className="flex items-center gap-1.5 text-sm text-[#003366] hover:text-[#002244] transition-colors">
            <PlusCircle className="w-4 h-4" /> Add line item
          </button>

          {/* Totals */}
          <div className="border-t border-gray-100 pt-3 ml-auto w-full md:w-72 space-y-1.5">
            <div className="flex justify-between text-sm text-gray-600">
              <span>Subtotal</span>
              <span className="font-medium">{sym}{subtotal.toLocaleString('en-NG', { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="flex items-center justify-between text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <span>VAT</span>
                <input type="number" min="0" max="30" step="0.5" value={form.vat_rate}
                  onChange={e => set('vat_rate', e.target.value)}
                  className="w-14 border border-gray-200 rounded px-2 py-0.5 text-xs text-center focus:outline-none" />
                <span className="text-xs">%</span>
              </div>
              <span>{sym}{vatAmount.toLocaleString('en-NG', { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="flex items-center justify-between text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <span>Discount</span>
                <input type="number" min="0" step="0.01" value={form.discount_amount}
                  onChange={e => set('discount_amount', e.target.value)}
                  className="w-24 border border-gray-200 rounded px-2 py-0.5 text-xs text-right focus:outline-none" />
              </div>
              <span className="text-red-500">-{sym}{(parseFloat(form.discount_amount) || 0).toLocaleString('en-NG', { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between text-base font-bold text-[#003366] border-t border-gray-200 pt-2 mt-2">
              <span>Total</span>
              <span>{sym}{total.toLocaleString('en-NG', { minimumFractionDigits: 2 })}</span>
            </div>
          </div>
        </div>

        {/* Notes */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h2 className="font-semibold text-gray-700 mb-3">Notes</h2>
          <textarea rows={3} placeholder="Payment instructions, bank details, terms..."
            value={form.notes} onChange={e => set('notes', e.target.value)}
            className={`${inputCls} resize-none`} />
        </div>

        <div className="flex gap-3">
          <button type="submit" disabled={saving}
            className="bg-[#003366] text-white px-6 py-2.5 rounded-lg hover:bg-[#002244] transition-colors text-sm font-medium disabled:opacity-50">
            {saving ? 'Creating…' : 'Create Invoice'}
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

// ─── Record Payment Modal ─────────────────────────────────────────────────────

function RecordPaymentModal({ invoice, onClose, onSuccess }) {
  const [form, setForm] = useState({ amount: invoice.balance_due || '', payment_method: 'Bank Transfer', reference: '', notes: '' });
  const [saving, setSaving] = useState(false);
  const sym = CURRENCY_SYM[invoice.currency] || '';
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.amount || parseFloat(form.amount) <= 0) { toast.error('Enter a valid amount'); return; }
    setSaving(true);
    try {
      await invoicesApi.recordPayment(invoice.id, form);
      toast.success(`Payment of ${sym}${Number(form.amount).toLocaleString()} recorded`);
      onSuccess();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to record payment');
    } finally {
      setSaving(false);
    }
  };

  const inputCls = "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#003366]/20";

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="p-5 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-bold text-gray-800 flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-[#003366]" /> Record Payment
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><XCircle className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="bg-gray-50 rounded-lg p-3 text-sm">
            <span className="text-gray-500">Balance Due: </span>
            <span className="font-bold text-red-600">{fmt(invoice.balance_due, invoice.currency)}</span>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Amount Received *</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">{sym}</span>
              <input type="number" min="0.01" step="0.01" value={form.amount}
                onChange={e => set('amount', e.target.value)}
                className={`${inputCls} pl-7`} required />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Payment Method *</label>
            <select value={form.payment_method} onChange={e => set('payment_method', e.target.value)} className={inputCls}>
              {PAYMENT_METHODS.map(m => <option key={m}>{m}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Reference / Teller No.</label>
            <input type="text" placeholder="Bank teller, transaction ID..." value={form.reference}
              onChange={e => set('reference', e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
            <textarea rows={2} value={form.notes} onChange={e => set('notes', e.target.value)}
              className={`${inputCls} resize-none`} />
          </div>
          <div className="flex gap-3 pt-1">
            <button type="submit" disabled={saving}
              className="flex-1 bg-[#003366] text-white py-2.5 rounded-lg hover:bg-[#002244] text-sm font-medium disabled:opacity-50">
              {saving ? 'Recording…' : 'Record Payment'}
            </button>
            <button type="button" onClick={onClose}
              className="px-4 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50">
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Invoice Detail ───────────────────────────────────────────────────────────

function InvoiceDetail({ invoice: initial, onBack }) {
  const [invoice, setInvoice]   = useState(initial);
  const [lineItems, setLineItems] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [showPayModal, setShowPayModal] = useState(false);
  const [sending, setSending]   = useState(false);
  const [syncing, setSyncing]   = useState(false);

  function handlePrint() {
    const sym = CURRENCY_SYM[invoice.currency] || invoice.currency;
    const fmtAmt = (v) => v != null ? sym + Number(v).toLocaleString('en-NG', { minimumFractionDigits: 2 }) : '—';
    const fmtD   = (d) => d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' }) : '—';

    const lineRows = lineItems.map(item => {
      const total = (parseFloat(item.quantity) || 0) * (parseFloat(item.unit_price) || 0);
      return `
        <tr>
          <td style="padding:10px 8px;border-bottom:1px solid #f0f0f0;color:#333">${item.description}</td>
          <td style="padding:10px 8px;border-bottom:1px solid #f0f0f0;text-align:center;color:#555">${item.quantity}</td>
          <td style="padding:10px 8px;border-bottom:1px solid #f0f0f0;text-align:right;color:#555">${fmtAmt(item.unit_price)}</td>
          <td style="padding:10px 8px;border-bottom:1px solid #f0f0f0;text-align:right;font-weight:600;color:#003366">${fmtAmt(total)}</td>
        </tr>`;
    }).join('');

    const payRows = payments.length ? payments.map(p => `
      <tr>
        <td style="padding:8px;border-bottom:1px solid #f5f5f5;color:#555">${fmtD(p.paid_at)}</td>
        <td style="padding:8px;border-bottom:1px solid #f5f5f5;color:#555">${p.payment_method}</td>
        <td style="padding:8px;border-bottom:1px solid #f5f5f5;font-family:monospace;font-size:12px;color:#777">${p.reference || '—'}</td>
        <td style="padding:8px;border-bottom:1px solid #f5f5f5;text-align:right;color:#16a34a;font-weight:600">${fmtAmt(p.amount)}</td>
      </tr>`).join('') : '';

    const html = `<!DOCTYPE html><html><head>
      <meta charset="UTF-8"/>
      <title>Invoice ${invoice.invoice_number}</title>
      <style>
        *{margin:0;padding:0;box-sizing:border-box}
        body{font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#333;background:#fff}
        .page{max-width:800px;margin:0 auto;padding:48px 40px}
        .print-bar{background:#003366;color:#fff;padding:12px 24px;display:flex;align-items:center;justify-content:space-between}
        .print-bar button{background:#C8921A;color:#fff;border:none;border-radius:6px;padding:8px 20px;font-size:13px;font-weight:600;cursor:pointer}
        @media print{.no-print{display:none!important}.page{padding:24px}body{print-color-adjust:exact;-webkit-print-color-adjust:exact}}
      </style>
    </head><body>
      <div class="print-bar no-print">
        <span>Invoice ${invoice.invoice_number} — ready to save as PDF</span>
        <button onclick="window.print()">Print / Save as PDF</button>
      </div>
      <div class="page">
        <!-- Header -->
        <div style="display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid #C8921A;padding-bottom:24px;margin-bottom:28px">
          <div>
            <img src="/logo.png" alt="Now Travel and Tours" style="height:52px;object-fit:contain"/>
            <div style="font-size:9px;color:#888;margin-top:6px;letter-spacing:1px;text-transform:uppercase">6 Tombia Street, GRA Phase 2, Port Harcourt</div>
            <div style="font-size:9px;color:#888;margin-top:2px">admin@nowtravelandtours.com &nbsp;|&nbsp; +234 818 290 2621</div>
          </div>
          <div style="text-align:right">
            <div style="font-size:26px;font-weight:800;color:#003366;text-transform:uppercase;letter-spacing:2px">INVOICE</div>
            <div style="font-size:14px;font-weight:700;font-family:monospace;color:#C8921A;margin-top:4px">${invoice.invoice_number}</div>
            <div style="font-size:11px;color:#888;margin-top:8px">Issue Date: ${fmtD(invoice.created_at)}</div>
            ${invoice.due_date ? `<div style="font-size:11px;color:#888;margin-top:2px">Due Date: ${fmtD(invoice.due_date)}</div>` : ''}
          </div>
        </div>

        <!-- Bill To -->
        <div style="margin-bottom:28px">
          <div style="font-size:10px;text-transform:uppercase;letter-spacing:1px;color:#999;margin-bottom:6px;font-weight:700">Bill To</div>
          <div style="font-size:16px;font-weight:700;color:#003366">${invoice.first_name} ${invoice.last_name}</div>
          ${invoice.email ? `<div style="font-size:12px;color:#555;margin-top:3px">${invoice.email}</div>` : ''}
          ${invoice.phone ? `<div style="font-size:12px;color:#555;margin-top:2px">${invoice.phone}</div>` : ''}
        </div>

        <!-- Line Items -->
        <table style="width:100%;border-collapse:collapse;margin-bottom:20px">
          <thead>
            <tr style="background:#003366;color:white">
              <th style="padding:10px 8px;text-align:left;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px">Description</th>
              <th style="padding:10px 8px;text-align:center;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;width:60px">Qty</th>
              <th style="padding:10px 8px;text-align:right;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;width:120px">Unit Price</th>
              <th style="padding:10px 8px;text-align:right;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;width:120px">Total</th>
            </tr>
          </thead>
          <tbody>${lineRows}</tbody>
        </table>

        <!-- Totals -->
        <div style="display:flex;justify-content:flex-end;margin-bottom:28px">
          <div style="width:280px">
            <div style="display:flex;justify-content:space-between;padding:6px 0;font-size:13px;color:#555;border-bottom:1px solid #eee">
              <span>Subtotal</span><span>${fmtAmt(invoice.subtotal)}</span>
            </div>
            ${parseFloat(invoice.vat_rate) > 0 ? `
            <div style="display:flex;justify-content:space-between;padding:6px 0;font-size:13px;color:#555;border-bottom:1px solid #eee">
              <span>VAT (${invoice.vat_rate}%)</span><span>${fmtAmt(invoice.vat_amount)}</span>
            </div>` : ''}
            ${parseFloat(invoice.discount_amount) > 0 ? `
            <div style="display:flex;justify-content:space-between;padding:6px 0;font-size:13px;color:#555;border-bottom:1px solid #eee">
              <span>Discount</span><span style="color:#dc2626">-${fmtAmt(invoice.discount_amount)}</span>
            </div>` : ''}
            <div style="display:flex;justify-content:space-between;padding:10px 0 6px;font-size:16px;font-weight:800;color:#003366;border-top:2px solid #003366;margin-top:4px">
              <span>Total</span><span>${fmtAmt(invoice.total_amount)}</span>
            </div>
            ${parseFloat(invoice.amount_paid) > 0 ? `
            <div style="display:flex;justify-content:space-between;padding:4px 0;font-size:13px;color:#16a34a">
              <span>Amount Paid</span><span>${fmtAmt(invoice.amount_paid)}</span>
            </div>
            <div style="display:flex;justify-content:space-between;padding:4px 0;font-size:14px;font-weight:700;color:${parseFloat(invoice.balance_due) > 0 ? '#dc2626' : '#16a34a'}">
              <span>Balance Due</span><span>${fmtAmt(invoice.balance_due)}</span>
            </div>` : ''}
          </div>
        </div>

        ${invoice.notes ? `
        <!-- Notes -->
        <div style="background:#fffbf0;border-left:4px solid #C8921A;border-radius:0 6px 6px 0;padding:12px 16px;margin-bottom:24px">
          <div style="font-size:10px;text-transform:uppercase;letter-spacing:1px;color:#888;margin-bottom:6px;font-weight:700">Payment Instructions</div>
          <div style="font-size:12px;color:#555;line-height:1.7;white-space:pre-wrap">${invoice.notes}</div>
        </div>` : ''}

        ${payRows ? `
        <!-- Payments received -->
        <div style="margin-bottom:24px">
          <div style="font-size:10px;text-transform:uppercase;letter-spacing:1px;color:#999;margin-bottom:8px;font-weight:700">Payments Received</div>
          <table style="width:100%;border-collapse:collapse;font-size:12px">
            <thead>
              <tr style="background:#f5f5f5">
                <th style="padding:8px;text-align:left;font-weight:600;color:#555">Date</th>
                <th style="padding:8px;text-align:left;font-weight:600;color:#555">Method</th>
                <th style="padding:8px;text-align:left;font-weight:600;color:#555">Reference</th>
                <th style="padding:8px;text-align:right;font-weight:600;color:#555">Amount</th>
              </tr>
            </thead>
            <tbody>${payRows}</tbody>
          </table>
        </div>` : ''}

        <!-- Footer -->
        <div style="border-top:2px solid #e5e7eb;margin-top:32px;padding-top:16px;display:flex;justify-content:space-between;align-items:flex-start">
          <div style="font-size:11px;color:#666;line-height:1.8">
            <div style="font-weight:700;color:#003366;font-size:12px">Now Travel and Tours Limited</div>
            <div>6 Tombia Street, GRA Phase 2, Port Harcourt, Rivers State</div>
            <div>admin@nowtravelandtours.com &nbsp;|&nbsp; +234 818 290 2621</div>
            <div>nowtravelandtours.com</div>
          </div>
          <div style="font-size:10px;color:#aaa;text-align:right;line-height:1.8;max-width:220px">
            <div>IATA &amp; NANTA Certified</div>
            <div>Thank you for your business!</div>
            <div style="margin-top:4px;font-family:monospace">${invoice.invoice_number}</div>
          </div>
        </div>
      </div>
    </body></html>`;

    const win = window.open('', '_blank', 'width=900,height=750');
    win.document.write(html);
    win.document.close();
  }

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const r = await invoicesApi.getById(invoice.id);
      setInvoice(r.data.invoice);
      setLineItems(r.data.line_items || []);
      setPayments(r.data.payments   || []);
    } catch {
      toast.error('Failed to load invoice details');
    } finally {
      setLoading(false);
    }
  }, [invoice.id]);

  useEffect(() => { refresh(); }, [refresh]);

  const handlePaymentSuccess = () => { setShowPayModal(false); refresh(); };

  const handleSend = async () => {
    if (!window.confirm(`Send invoice ${invoice.invoice_number} to ${invoice.email}?\n\nThis will email the invoice and generate a Paystack payment link.`)) return;
    setSending(true);
    try {
      const r = await invoicesApi.send(invoice.id);
      toast.success(`Invoice sent to ${invoice.email}`);
      if (r.data.payment_url) toast.success('Paystack payment link generated', { icon: '🔗' });
      refresh();
    } catch (err) {
      const msg = err.response?.data?.error || 'Failed to send invoice';
      toast.error(msg, { duration: 6000 });
    } finally {
      setSending(false);
    }
  };

  const handleZohoSync = async () => {
    setSyncing(true);
    try {
      await invoicesApi.syncZoho(invoice.id);
      toast.success('Invoice synced to Zoho Books');
      refresh();
    } catch (err) {
      const msg = err.response?.data?.error || 'Zoho sync failed';
      toast.error(msg, { duration: 6000 });
    } finally {
      setSyncing(false);
    }
  };

  const isFullyPaid = parseFloat(invoice.balance_due) <= 0;
  const sym = CURRENCY_SYM[invoice.currency] || '';

  if (loading) return <div className="flex items-center justify-center h-64 text-gray-400 text-sm">Loading invoice…</div>;

  return (
    <div className="space-y-4">
      {showPayModal && (
        <RecordPaymentModal invoice={invoice} onClose={() => setShowPayModal(false)} onSuccess={handlePaymentSuccess} />
      )}

      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-[#003366] font-mono">{invoice.invoice_number}</h1>
              <StatusBadge status={isOverdue(invoice) && invoice.status === 'Sent' ? 'Overdue' : invoice.status} />
            </div>
            <p className="text-sm text-gray-500 mt-0.5">
              {invoice.first_name} {invoice.last_name} · {invoice.email}
            </p>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          {/* Print / Download PDF */}
          {!loading && (
            <button onClick={handlePrint}
              className="flex items-center gap-2 bg-gray-700 text-white px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors text-sm font-medium">
              <Printer className="w-4 h-4" /> Download PDF
            </button>
          )}

          {/* Paystack link — copy / open */}
          {invoice.paystack_link && (
            <a href={invoice.paystack_link} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 transition-colors text-sm font-medium">
              <ExternalLink className="w-4 h-4" /> Payment Link
            </a>
          )}

          {/* Zoho Sync */}
          {!invoice.zoho_invoice_id && !['Cancelled', 'Refunded'].includes(invoice.status) && (
            <button onClick={handleZohoSync} disabled={syncing}
              className="flex items-center gap-2 bg-orange-500 text-white px-4 py-2 rounded-lg hover:bg-orange-600 transition-colors text-sm font-medium disabled:opacity-50">
              {syncing
                ? <><RefreshCw className="w-4 h-4 animate-spin" /> Syncing…</>
                : <><RefreshCw className="w-4 h-4" /> Sync to Zoho</>}
            </button>
          )}
          {invoice.zoho_invoice_id && (
            <span className="flex items-center gap-1.5 px-3 py-2 bg-orange-50 text-orange-700 text-sm rounded-lg border border-orange-200 font-medium">
              <CheckCircle2 className="w-4 h-4" /> In Zoho
            </span>
          )}

          {/* Send Invoice */}
          {!['Paid', 'Cancelled', 'Refunded'].includes(invoice.status) && invoice.email && (
            <button onClick={handleSend} disabled={sending}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium disabled:opacity-50">
              {sending
                ? <><RefreshCw className="w-4 h-4 animate-spin" /> Sending…</>
                : <><Send className="w-4 h-4" /> {invoice.sent_at ? 'Re-send' : 'Send Invoice'}</>}
            </button>
          )}

          {/* Record Payment */}
          {!isFullyPaid && !['Cancelled', 'Refunded'].includes(invoice.status) && (
            <button onClick={() => setShowPayModal(true)}
              className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors text-sm font-medium">
              <CreditCard className="w-4 h-4" /> Record Payment
            </button>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Invoice Total', value: fmt(invoice.total_amount, invoice.currency), color: 'text-[#003366]' },
          { label: 'Amount Paid',   value: fmt(invoice.amount_paid,  invoice.currency), color: 'text-green-600' },
          { label: 'Balance Due',   value: fmt(invoice.balance_due,  invoice.currency), color: parseFloat(invoice.balance_due) > 0 ? 'text-red-600' : 'text-gray-400' },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 text-center">
            <p className="text-xs text-gray-500 mb-1">{label}</p>
            <p className={`text-xl font-bold ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Invoice Body */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {/* Invoice header info */}
        <div className="p-5 border-b border-gray-100 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div><p className="text-xs text-gray-500 mb-0.5">Invoice Number</p><p className="font-mono font-medium">{invoice.invoice_number}</p></div>
          <div><p className="text-xs text-gray-500 mb-0.5">Issue Date</p><p className="font-medium">{fmtDate(invoice.created_at)}</p></div>
          <div><p className="text-xs text-gray-500 mb-0.5">Due Date</p><p className={`font-medium ${isOverdue(invoice) ? 'text-red-600' : ''}`}>{fmtDate(invoice.due_date)}</p></div>
          <div><p className="text-xs text-gray-500 mb-0.5">Currency</p><p className="font-medium">{invoice.currency}</p></div>
          {invoice.sent_at && (
            <div><p className="text-xs text-gray-500 mb-0.5">Sent</p><p className="font-medium text-blue-600">{fmtDate(invoice.sent_at)}</p></div>
          )}
          {invoice.zoho_invoice_id && (
            <div><p className="text-xs text-gray-500 mb-0.5">Zoho ID</p><p className="font-mono text-xs text-orange-600">{invoice.zoho_invoice_id}</p></div>
          )}
        </div>

        {/* Line items */}
        {lineItems.length > 0 && (
          <div className="p-5">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-gray-500 border-b border-gray-100">
                  <th className="text-left pb-2 font-medium">Description</th>
                  <th className="text-center pb-2 font-medium w-16">Qty</th>
                  <th className="text-right pb-2 font-medium w-32">Unit Price</th>
                  <th className="text-right pb-2 font-medium w-32">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {lineItems.map(item => {
                  const lineTotal = (parseFloat(item.quantity) || 0) * (parseFloat(item.unit_price) || 0);
                  return (
                    <tr key={item.id}>
                      <td className="py-2.5 pr-4 text-gray-700">{item.description}</td>
                      <td className="py-2.5 text-center text-gray-600">{item.quantity}</td>
                      <td className="py-2.5 text-right text-gray-600">{sym}{Number(item.unit_price).toLocaleString('en-NG', { minimumFractionDigits: 2 })}</td>
                      <td className="py-2.5 text-right font-medium text-gray-800">{sym}{lineTotal.toLocaleString('en-NG', { minimumFractionDigits: 2 })}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Totals */}
            <div className="mt-4 border-t border-gray-100 pt-3 ml-auto w-full md:w-72 space-y-1.5 text-sm">
              <div className="flex justify-between text-gray-600">
                <span>Subtotal</span><span>{fmt(invoice.subtotal, invoice.currency)}</span>
              </div>
              {parseFloat(invoice.vat_rate) > 0 && (
                <div className="flex justify-between text-gray-600">
                  <span>VAT ({invoice.vat_rate}%)</span><span>{fmt(invoice.vat_amount, invoice.currency)}</span>
                </div>
              )}
              {parseFloat(invoice.discount_amount) > 0 && (
                <div className="flex justify-between text-gray-600">
                  <span>Discount</span><span className="text-red-500">-{fmt(invoice.discount_amount, invoice.currency)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-[#003366] border-t border-gray-200 pt-2 text-base">
                <span>Total</span><span>{fmt(invoice.total_amount, invoice.currency)}</span>
              </div>
            </div>
          </div>
        )}

        {/* Notes */}
        {invoice.notes && (
          <div className="px-5 pb-5">
            <p className="text-xs text-gray-500 mb-1 font-medium">Notes / Payment Instructions</p>
            <p className="text-sm text-gray-600 bg-gray-50 rounded-lg p-3 whitespace-pre-wrap">{invoice.notes}</p>
          </div>
        )}
      </div>

      {/* Payment History */}
      {payments.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h2 className="font-semibold text-gray-700 mb-4 flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-[#003366]" /> Payment History
          </h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-500 border-b border-gray-100">
                <th className="text-left pb-2 font-medium">Date</th>
                <th className="text-left pb-2 font-medium">Method</th>
                <th className="text-left pb-2 font-medium">Reference</th>
                <th className="text-right pb-2 font-medium">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {payments.map(p => (
                <tr key={p.id}>
                  <td className="py-2.5 text-gray-600">{fmtDate(p.paid_at)}</td>
                  <td className="py-2.5 text-gray-600">{p.payment_method}</td>
                  <td className="py-2.5 text-gray-500 font-mono text-xs">{p.reference || '—'}</td>
                  <td className="py-2.5 text-right font-medium text-green-600">{fmt(p.amount, invoice.currency)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function Invoices() {
  const [view, setView]       = useState('list');
  const [selected, setSelected] = useState(null);
  const [listKey, setListKey] = useState(0);

  const handleSelect  = (inv) => { setSelected(inv); setView('detail'); };
  const handleNew     = ()    => { setSelected(null); setView('new'); };
  const handleBack    = ()    => { setSelected(null); setView('list'); };
  const handleSaved   = ()    => { setListKey(k => k + 1); setView('list'); setSelected(null); };

  if (view === 'new')    return <InvoiceForm invoice={null} onSave={handleSaved} onCancel={handleBack} />;
  if (view === 'detail') return <InvoiceDetail invoice={selected} onBack={handleBack} />;

  return <InvoiceList key={listKey} onNew={handleNew} onSelect={handleSelect} />;
}
oice={null} onSave={handleSaved} onCancel={handleBack} />;
  if (view === 'detail') return <InvoiceDetail invoice={selected} onBack={handleBack} />;

  return <InvoiceList key={listKey} onNew={handleNew} onSelect={handleSelect} />;
}
