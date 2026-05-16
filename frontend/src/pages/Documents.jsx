import { useState, useEffect, useCallback, useRef } from 'react';
import { documents as docsApi, customers as customersApi } from '../api';
import toast from 'react-hot-toast';
import {
  FolderOpen, Search, Upload, FileText, File, Image,
  Shield, Plane, Hotel, CreditCard, Building2, Users,
  AlertTriangle, ExternalLink, Trash2, Clock, Download,
  ChevronDown, ChevronUp, Info, X, CheckCircle2, Plus,
} from 'lucide-react';

// ─── Constants ────────────────────────────────────────────────────────────────

const DOC_CATEGORIES = [
  'Customer Passport', 'Customer Visa', 'Customer Photo', 'Customer Bank Statement',
  'Customer Flight Ticket', 'Customer Hotel Voucher', 'Customer Insurance',
  'Company IATA Certificate', 'Company Registration', 'Company Contract',
  'Staff ID', 'Staff Contract', 'Other',
];

const CATEGORY_GROUPS = {
  'Customer Documents': [
    'Customer Passport', 'Customer Visa', 'Customer Photo', 'Customer Bank Statement',
    'Customer Flight Ticket', 'Customer Hotel Voucher', 'Customer Insurance',
  ],
  'Company Documents': ['Company IATA Certificate', 'Company Registration', 'Company Contract'],
  'Staff Documents':   ['Staff ID', 'Staff Contract'],
  'Other':             ['Other'],
};

const CATEGORY_ICONS = {
  'Customer Passport':        Shield,
  'Customer Visa':            FileText,
  'Customer Photo':           Image,
  'Customer Bank Statement':  CreditCard,
  'Customer Flight Ticket':   Plane,
  'Customer Hotel Voucher':   Hotel,
  'Customer Insurance':       Shield,
  'Company IATA Certificate': Building2,
  'Company Registration':     Building2,
  'Company Contract':         FileText,
  'Staff ID':                 Users,
  'Staff Contract':           FileText,
  'Other':                    File,
};

const CATEGORY_COLORS = {
  'Customer Passport':        'bg-blue-100 text-blue-700',
  'Customer Visa':            'bg-teal-100 text-teal-700',
  'Customer Photo':           'bg-purple-100 text-purple-700',
  'Customer Bank Statement':  'bg-green-100 text-green-700',
  'Customer Flight Ticket':   'bg-indigo-100 text-indigo-700',
  'Customer Hotel Voucher':   'bg-orange-100 text-orange-700',
  'Customer Insurance':       'bg-cyan-100 text-cyan-700',
  'Company IATA Certificate': 'bg-red-100 text-red-700',
  'Company Registration':     'bg-red-100 text-red-700',
  'Company Contract':         'bg-pink-100 text-pink-700',
  'Staff ID':                 'bg-amber-100 text-amber-700',
  'Staff Contract':           'bg-amber-100 text-amber-700',
  'Other':                    'bg-gray-100 text-gray-600',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function CategoryBadge({ category }) {
  const Icon = CATEGORY_ICONS[category] || File;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${CATEGORY_COLORS[category] || 'bg-gray-100 text-gray-600'}`}>
      <Icon className="w-3 h-3" />{category}
    </span>
  );
}

function fmtDate(d) {
  if (!d) return null;
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}
function fmtSize(kb) {
  if (!kb) return null;
  return kb < 1024 ? `${kb} KB` : `${(kb / 1024).toFixed(1)} MB`;
}
function isExpiringSoon(date) {
  if (!date) return false;
  const days = Math.ceil((new Date(date) - new Date()) / 86400000);
  return days >= 0 && days <= 60;
}
function isExpired(date) {
  if (!date) return false;
  return new Date(date) < new Date();
}
function getMimeIcon(mime) {
  if (!mime) return File;
  if (mime.startsWith('image/'))  return Image;
  if (mime === 'application/pdf') return FileText;
  return File;
}

// ─── SharePoint Notice ────────────────────────────────────────────────────────

function SharePointNotice({ onDismiss }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-amber-800">SharePoint integration not yet configured</p>
            <p className="text-xs text-amber-700 mt-0.5">
              Document upload/download requires Microsoft Graph API credentials in the backend{' '}
              <code className="bg-amber-100 px-1 rounded">.env</code> file.
            </p>
          </div>
        </div>
        <button onClick={() => setExpanded(e => !e)} className="text-amber-600 shrink-0 ml-2">
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>
      {expanded && (
        <div className="mt-3 ml-8 text-xs text-amber-700 space-y-1.5">
          <p className="font-medium">Add to <code className="bg-amber-100 px-1 rounded">backend/.env</code>:</p>
          <div className="bg-amber-100 rounded-lg p-3 font-mono space-y-1">
            <p>GRAPH_TENANT_ID=<span className="text-amber-600">76a5b556-...</span> <span className="text-amber-500 font-sans">(same as AZURE_TENANT_ID)</span></p>
            <p>GRAPH_CLIENT_ID=<span className="text-amber-600">your-graph-app-client-id</span></p>
            <p>GRAPH_CLIENT_SECRET=<span className="text-amber-600">your-graph-app-secret</span></p>
            <p>SHAREPOINT_SITE_ID=<span className="text-amber-600">flynowtravels.sharepoint.com,site-id,web-id</span></p>
            <p>SHAREPOINT_CUSTOMER_DOCS_DRIVE_ID=<span className="text-amber-600">your-drive-id</span></p>
            <p>OUTLOOK_SENDER_EMAIL=<span className="text-amber-600">noreply@flynowtravels.com</span></p>
          </div>
          <p>Grant the Graph app: <strong>Files.ReadWrite.All</strong>, <strong>Sites.ReadWrite.All</strong>, <strong>Mail.Send</strong> (application permissions).</p>
          <p>Get SHAREPOINT_SITE_ID via Graph Explorer: <code className="bg-amber-100 px-1">GET https://graph.microsoft.com/v1.0/sites/flynowtravels.sharepoint.com:/sites/BMS</code></p>
        </div>
      )}
    </div>
  );
}

// ─── Upload Modal ─────────────────────────────────────────────────────────────

function UploadModal({ onClose, onSuccess, defaultCategory }) {
  const [file, setFile]         = useState(null);
  const [custSearch, setCustSearch] = useState('');
  const [customers, setCustomers]   = useState([]);
  const [showDrop, setShowDrop]     = useState(false);
  const [uploading, setUploading]   = useState(false);
  const fileRef = useRef();

  const [form, setForm] = useState({
    customer_id: '',
    category:    defaultCategory || 'Customer Passport',
    expires_at:  '',
    notes:       '',
  });

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  useEffect(() => {
    if (custSearch.length < 2) { setCustomers([]); return; }
    const t = setTimeout(async () => {
      try {
        const r = await customersApi.list({ search: custSearch, limit: 8 });
        setCustomers(r.data.customers || []);
        setShowDrop(true);
      } catch { /* ignore */ }
    }, 300);
    return () => clearTimeout(t);
  }, [custSearch]);

  const selectCustomer = (c) => {
    set('customer_id', c.id);
    setCustSearch(`${c.first_name} ${c.last_name}`);
    setShowDrop(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file)           { toast.error('Please choose a file');    return; }
    if (!form.category)  { toast.error('Please select a category'); return; }

    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('category', form.category);
      if (form.customer_id) fd.append('customer_id', form.customer_id);
      if (form.expires_at)  fd.append('expires_at',  form.expires_at);
      if (form.notes)       fd.append('notes',       form.notes);

      await docsApi.upload(fd);
      toast.success(`"${file.name}" uploaded successfully`);
      onSuccess();
    } catch (err) {
      const msg = err.response?.data?.error || 'Upload failed';
      const detail = err.response?.data?.detail;
      if (err.response?.status === 501) {
        toast.error(msg, { duration: 6000 });
        if (detail) console.warn('SharePoint config needed:', detail);
      } else {
        toast.error(msg);
      }
    } finally {
      setUploading(false);
    }
  };

  const inputCls = "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#003366]/20";

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
        {/* Header */}
        <div className="p-5 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-bold text-gray-800 flex items-center gap-2">
            <Upload className="w-5 h-5 text-[#003366]" /> Upload Document
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* File picker */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">File *</label>
            <div
              onClick={() => fileRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-colors
                ${file ? 'border-green-300 bg-green-50' : 'border-gray-200 hover:border-[#003366]/40 hover:bg-gray-50'}`}>
              {file ? (
                <div className="flex items-center justify-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                  <div className="text-left">
                    <p className="text-sm font-medium text-gray-800">{file.name}</p>
                    <p className="text-xs text-gray-400">{(file.size / 1024).toFixed(0)} KB · {file.type || 'unknown type'}</p>
                  </div>
                  <button type="button" onClick={(e) => { e.stopPropagation(); setFile(null); }}
                    className="ml-auto text-gray-400 hover:text-red-400">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <>
                  <Upload className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">Click to choose file</p>
                  <p className="text-xs text-gray-400 mt-0.5">PDF, images, Word, Excel · max 15 MB</p>
                </>
              )}
            </div>
            <input ref={fileRef} type="file" className="hidden"
              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif,.xls,.xlsx,.txt"
              onChange={e => setFile(e.target.files?.[0] || null)} />
          </div>

          {/* Category */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Category *</label>
            <select value={form.category} onChange={e => set('category', e.target.value)} className={inputCls}>
              {Object.entries(CATEGORY_GROUPS).map(([group, cats]) => (
                <optgroup key={group} label={group}>
                  {cats.map(c => <option key={c} value={c}>{c}</option>)}
                </optgroup>
              ))}
            </select>
          </div>

          {/* Customer (optional) */}
          {form.category.startsWith('Customer') && (
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Customer</label>
              <div className="relative">
                <input type="text" placeholder="Search customer (optional)..."
                  value={custSearch}
                  onChange={e => { setCustSearch(e.target.value); set('customer_id', ''); }}
                  className={inputCls} autoComplete="off" />
                {showDrop && customers.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-40 overflow-y-auto">
                    {customers.map(c => (
                      <button key={c.id} type="button" onClick={() => selectCustomer(c)}
                        className="w-full text-left px-3 py-2 hover:bg-gray-50 text-sm">
                        <span className="font-medium">{c.first_name} {c.last_name}</span>
                        <span className="text-gray-400 ml-2 text-xs">{c.email}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Expiry date */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Expiry Date</label>
              <input type="date" value={form.expires_at} onChange={e => set('expires_at', e.target.value)}
                className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
              <input type="text" placeholder="e.g. Original copy" value={form.notes}
                onChange={e => set('notes', e.target.value)} className={inputCls} />
            </div>
          </div>

          <div className="flex gap-3 pt-1">
            <button type="submit" disabled={uploading}
              className="flex-1 bg-[#003366] text-white py-2.5 rounded-lg hover:bg-[#002244] text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2">
              {uploading ? (
                <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Uploading…</>
              ) : (
                <><Upload className="w-4 h-4" /> Upload to SharePoint</>
              )}
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

// ─── Document Card ────────────────────────────────────────────────────────────

function DocumentCard({ doc, onDelete, onDownload }) {
  const MimeIcon = getMimeIcon(doc.mime_type);
  const expired  = isExpired(doc.expires_at);
  const expiring = isExpiringSoon(doc.expires_at) && !expired;
  const [downloading, setDownloading] = useState(false);

  const handleDownload = async () => {
    setDownloading(true);
    try {
      await onDownload(doc);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className={`bg-white rounded-xl shadow-sm border p-4 transition-all hover:shadow-md
      ${expired ? 'border-red-200' : expiring ? 'border-amber-200' : 'border-gray-100'}`}>
      <div className="flex items-start gap-3">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0
          ${expired ? 'bg-red-50' : expiring ? 'bg-amber-50' : 'bg-gray-50'}`}>
          <MimeIcon className={`w-5 h-5 ${expired ? 'text-red-400' : expiring ? 'text-amber-500' : 'text-gray-400'}`} />
        </div>

        <div className="flex-1 min-w-0">
          <p className="font-medium text-gray-800 text-sm truncate" title={doc.file_name}>{doc.file_name}</p>
          <div className="flex flex-wrap items-center gap-2 mt-1.5">
            <CategoryBadge category={doc.category} />
            {fmtSize(doc.file_size_kb) && <span className="text-xs text-gray-400">{fmtSize(doc.file_size_kb)}</span>}
          </div>

          {doc.expires_at && (
            <div className={`flex items-center gap-1 mt-1.5 text-xs
              ${expired ? 'text-red-600' : expiring ? 'text-amber-600' : 'text-gray-400'}`}>
              <Clock className="w-3 h-3" />
              {expired ? `Expired ${fmtDate(doc.expires_at)}` : `Expires ${fmtDate(doc.expires_at)}`}
              {expiring && !expired && (
                <span className="ml-1 px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded-full text-xs font-medium">Soon</span>
              )}
            </div>
          )}

          {doc.notes && <p className="text-xs text-gray-400 mt-1 truncate">{doc.notes}</p>}

          <div className="flex items-center justify-between mt-2">
            <span className="text-xs text-gray-400">
              {doc.uploaded_by_name && `${doc.uploaded_by_name} · `}{fmtDate(doc.created_at)}
            </span>
            <div className="flex items-center gap-1.5">
              {/* SharePoint direct link */}
              {doc.sharepoint_web_url && (
                <a href={doc.sharepoint_web_url} target="_blank" rel="noopener noreferrer"
                  onClick={e => e.stopPropagation()}
                  className="p-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors"
                  title="Open in SharePoint">
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
              {/* Download URL */}
              {doc.sharepoint_item_id && (
                <button onClick={handleDownload} disabled={downloading}
                  className="p-1.5 rounded-lg bg-teal-50 text-teal-600 hover:bg-teal-100 transition-colors disabled:opacity-50"
                  title="Get download link">
                  <Download className="w-3.5 h-3.5" />
                </button>
              )}
              <button onClick={() => onDelete(doc)}
                className="p-1.5 rounded-lg bg-red-50 text-red-400 hover:bg-red-100 transition-colors"
                title="Delete document">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Category Sidebar ─────────────────────────────────────────────────────────

function CategorySidebar({ selected, onSelect, counts }) {
  return (
    <div className="w-52 shrink-0 space-y-4">
      <button onClick={() => onSelect('')}
        className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors
          ${!selected ? 'bg-[#003366] text-white' : 'text-gray-600 hover:bg-gray-100'}`}>
        All Documents
        {counts.total > 0 && <span className="float-right text-xs opacity-70">{counts.total}</span>}
      </button>

      {Object.entries(CATEGORY_GROUPS).map(([group, cats]) => (
        <div key={group}>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide px-1 mb-1">{group}</p>
          {cats.map(cat => {
            const Icon  = CATEGORY_ICONS[cat] || File;
            const count = counts[cat] || 0;
            return (
              <button key={cat} onClick={() => onSelect(cat)}
                className={`w-full text-left px-3 py-1.5 rounded-lg text-xs transition-colors flex items-center gap-2
                  ${selected === cat ? 'bg-[#003366]/10 text-[#003366] font-medium' : 'text-gray-600 hover:bg-gray-100'}`}>
                <Icon className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate flex-1">{cat.replace('Customer ', '').replace('Company ', '').replace('Staff ', '')}</span>
                {count > 0 && <span className="text-xs opacity-60">{count}</span>}
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}

// ─── Main Documents Page ──────────────────────────────────────────────────────

export default function Documents() {
  const [docs, setDocs]             = useState([]);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState('');
  const [category, setCategory]     = useState('');
  const [showExpiring, setShowExpiring] = useState(false);
  const [showUpload, setShowUpload]  = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (category) params.category = category;
      const r = await docsApi.list(params);
      setDocs(r.data.documents || []);
    } catch {
      toast.error('Failed to load documents');
    } finally {
      setLoading(false);
    }
  }, [category]);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (doc) => {
    if (!window.confirm(`Delete "${doc.file_name}"?\n\nThis will also remove the file from SharePoint (if configured).`)) return;
    try {
      await docsApi.remove(doc.id);
      toast.success('Document deleted');
      load();
    } catch {
      toast.error('Failed to delete document');
    }
  };

  const handleDownload = async (doc) => {
    try {
      const r = await docsApi.getDownloadUrl(doc.id);
      const url = r.data.download_url;
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (err) {
      const msg = err.response?.data?.error || 'Could not get download link';
      if (err.response?.status === 501) {
        toast.error('SharePoint not yet configured — open the file via the SharePoint link instead');
      } else {
        toast.error(msg);
      }
    }
  };

  // Filter
  const filtered = docs.filter(d => {
    const matchSearch = !search ||
      d.file_name.toLowerCase().includes(search.toLowerCase()) ||
      d.category.toLowerCase().includes(search.toLowerCase()) ||
      (d.notes || '').toLowerCase().includes(search.toLowerCase()) ||
      (d.uploaded_by_name || '').toLowerCase().includes(search.toLowerCase());
    const matchExpiring = !showExpiring || isExpiringSoon(d.expires_at) || isExpired(d.expires_at);
    return matchSearch && matchExpiring;
  });

  const counts = { total: docs.length };
  docs.forEach(d => { counts[d.category] = (counts[d.category] || 0) + 1; });
  const expiringCount = docs.filter(d => isExpiringSoon(d.expires_at) || isExpired(d.expires_at)).length;

  return (
    <div className="space-y-4">
      {showUpload && (
        <UploadModal
          defaultCategory={category || 'Customer Passport'}
          onClose={() => setShowUpload(false)}
          onSuccess={() => { setShowUpload(false); load(); }}
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#003366] flex items-center gap-2">
            <FolderOpen className="w-6 h-6" /> Document Vault
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">Passports, visas, tickets, contracts and company documents</p>
        </div>
        <div className="flex items-center gap-2">
          {expiringCount > 0 && (
            <button onClick={() => setShowExpiring(e => !e)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors border
                ${showExpiring
                  ? 'bg-amber-50 border-amber-300 text-amber-700'
                  : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
              <AlertTriangle className="w-4 h-4" />{expiringCount} Expiring
            </button>
          )}
          <button onClick={() => setShowUpload(true)}
            className="flex items-center gap-2 bg-[#003366] text-white px-4 py-2 rounded-lg hover:bg-[#002244] transition-colors text-sm font-medium">
            <Plus className="w-4 h-4" /> Upload Document
          </button>
        </div>
      </div>

      {/* SharePoint notice */}
      <SharePointNotice />

      {/* Body: sidebar + main */}
      <div className="flex gap-5">
        <CategorySidebar selected={category} onSelect={setCategory} counts={counts} />

        <div className="flex-1 space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input type="text" placeholder="Search file name, category, notes..."
              value={search} onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#003366]/20" />
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-48 text-gray-400 text-sm">Loading documents…</div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-gray-400 bg-white rounded-xl border border-gray-100 shadow-sm">
              <FolderOpen className="w-12 h-12 mb-2 opacity-20" />
              <p className="text-sm font-medium">No documents yet</p>
              <p className="text-xs mt-1 text-gray-300">
                {category ? `No documents in "${category}"` : 'Click "Upload Document" to add the first one'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-gray-500">
                {filtered.length} document{filtered.length !== 1 ? 's' : ''}
                {showExpiring && <span className="ml-2 text-amber-600 font-medium">· Showing expiring only</span>}
              </p>

              {filtered.some(d => isExpired(d.expires_at)) && (
                <div>
                  <p className="text-xs font-semibold text-red-500 uppercase tracking-wide mb-2 flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5" /> Expired
                  </p>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                    {filtered.filter(d => isExpired(d.expires_at)).map(d => (
                      <DocumentCard key={d.id} doc={d} onDelete={handleDelete} onDownload={handleDownload} />
                    ))}
                  </div>
                </div>
              )}

              {filtered.some(d => isExpiringSoon(d.expires_at) && !isExpired(d.expires_at)) && (
                <div>
                  <p className="text-xs font-semibold text-amber-600 uppercase tracking-wide mb-2 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" /> Expiring Within 60 Days
                  </p>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                    {filtered.filter(d => isExpiringSoon(d.expires_at) && !isExpired(d.expires_at)).map(d => (
                      <DocumentCard key={d.id} doc={d} onDelete={handleDelete} onDownload={handleDownload} />
                    ))}
                  </div>
                </div>
              )}

              {filtered.some(d => !isExpired(d.expires_at) && !isExpiringSoon(d.expires_at)) && (
                <div>
                  {(filtered.some(d => isExpired(d.expires_at)) || filtered.some(d => isExpiringSoon(d.expires_at))) && (
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">All Documents</p>
                  )}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                    {filtered.filter(d => !isExpired(d.expires_at) && !isExpiringSoon(d.expires_at)).map(d => (
                      <DocumentCard key={d.id} doc={d} onDelete={handleDelete} onDownload={handleDownload} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
