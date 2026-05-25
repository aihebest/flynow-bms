/**
 * CustomerSearch.jsx — Reusable customer typeahead with quick-add.
 *
 * Usage:
 *   <CustomerSearch
 *     value={custSearch}
 *     customerId={form.customer_id}
 *     onChange={(text) => { setCustSearch(text); setForm(f => ({...f, customer_id: ''})); }}
 *     onSelect={(customer) => { setForm(f => ({...f, customer_id: customer.id})); setCustSearch(`${customer.first_name} ${customer.last_name}`); }}
 *     inputClassName={inputCls}
 *   />
 */
import { useState, useEffect } from 'react';
import { customers as customersApi } from '../api';
import { UserPlus } from 'lucide-react';
import toast from 'react-hot-toast';

const DEFAULT_INPUT_CLS =
  'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#003366]/20';

export default function CustomerSearch({
  value,
  onChange,
  onSelect,
  customerId = '',
  inputClassName = DEFAULT_INPUT_CLS,
  placeholder = 'Search customer name...',
}) {
  const [results, setResults]   = useState([]);
  const [showDrop, setShowDrop] = useState(false);
  const [searched, setSearched] = useState(false);
  const [adding, setAdding]     = useState(false);

  // Debounced search
  useEffect(() => {
    if (value.length < 2) {
      setResults([]);
      setShowDrop(false);
      setSearched(false);
      return;
    }
    const t = setTimeout(async () => {
      try {
        const r = await customersApi.list({ search: value, limit: 8 });
        setResults(r.data.customers || []);
        setShowDrop(true);
        setSearched(true);
      } catch { /* silently ignore */ }
    }, 300);
    return () => clearTimeout(t);
  }, [value]);

  // Split "John Doe" → { first_name: "John", last_name: "Doe" }
  function parseName(name) {
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return { first_name: parts[0], last_name: parts[0] };
    return { first_name: parts[0], last_name: parts.slice(1).join(' ') };
  }

  async function handleQuickAdd() {
    if (!value.trim() || adding) return;
    setAdding(true);
    try {
      const { first_name, last_name } = parseName(value);
      const r = await customersApi.create({
        first_name,
        last_name,
        customer_type: 'Individual',
        source: 'Walk-in',
      });
      const c = r.data.customer;
      onSelect(c);
      setShowDrop(false);
      toast.success(`"${c.first_name} ${c.last_name}" added as a new customer`);
    } catch (err) {
      toast.error('Could not add customer: ' + (err.response?.data?.error || err.message));
    } finally {
      setAdding(false);
    }
  }

  // Show quick-add option when: has typed 2+ chars, no customer selected yet, and we've searched
  const showQuickAdd = searched && value.trim().length >= 2 && !customerId;
  const hasDropdown  = showDrop && (results.length > 0 || showQuickAdd);

  return (
    <div className="relative">
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={e => onChange(e.target.value)}
        onFocus={() => { if (results.length > 0 || searched) setShowDrop(true); }}
        onBlur={() => setTimeout(() => setShowDrop(false), 180)}
        className={inputClassName}
        autoComplete="off"
      />

      {hasDropdown && (
        <div className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
          {results.map(c => (
            <button
              key={c.id}
              type="button"
              onMouseDown={() => { onSelect(c); setShowDrop(false); }}
              className="w-full text-left px-3 py-2.5 hover:bg-gray-50 text-sm border-b border-gray-50 last:border-0 transition-colors"
            >
              <span className="font-medium text-gray-800">{c.first_name} {c.last_name}</span>
              {c.email && <span className="text-gray-400 ml-2 text-xs">{c.email}</span>}
              {!c.email && c.phone && <span className="text-gray-400 ml-2 text-xs">{c.phone}</span>}
            </button>
          ))}

          {showQuickAdd && (
            <button
              type="button"
              onMouseDown={handleQuickAdd}
              disabled={adding}
              className="w-full text-left px-3 py-2.5 flex items-center gap-2 text-sm text-[#003366] bg-blue-50/60 hover:bg-blue-100/60 border-t border-gray-100 disabled:opacity-50 transition-colors"
            >
              <UserPlus className="w-3.5 h-3.5 flex-shrink-0" />
              <span>
                {adding
                  ? 'Adding customer…'
                  : `Quick add "${value.trim()}" as new customer`}
              </span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
