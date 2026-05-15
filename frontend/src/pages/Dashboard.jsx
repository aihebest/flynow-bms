import { useEffect, useState } from 'react';
import { dashboard } from '../api';
import {
  CalendarCheck, Globe, FileText, AlertTriangle,
  TrendingUp, Users, Banknote, RefreshCw,
} from 'lucide-react';

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({ icon: Icon, label, value, sub, color = 'text-[#003366]', bg = 'bg-blue-50' }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex items-start gap-4">
      <div className={`p-3 rounded-xl ${bg} ${color}`}>
        <Icon size={22} />
      </div>
      <div className="min-w-0">
        <p className="text-sm text-gray-500 font-medium">{label}</p>
        <p className="text-2xl font-bold text-gray-800 mt-0.5 truncate">{value ?? '—'}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

// ─── SVG Bar Chart ────────────────────────────────────────────────────────────

function BarChart({ data, valueKey, labelKey, color = '#003366', formatValue, height = 140 }) {
  if (!data || data.length === 0) return (
    <div className="flex items-center justify-center h-36 text-gray-300 text-sm">No data yet</div>
  );

  const values = data.map(d => parseFloat(d[valueKey]) || 0);
  const max    = Math.max(...values, 1);
  const width  = 100 / data.length;

  return (
    <div className="w-full">
      <svg viewBox={`0 0 ${data.length * 30} ${height + 20}`} className="w-full" style={{ height }}>
        {data.map((d, i) => {
          const val    = parseFloat(d[valueKey]) || 0;
          const barH   = Math.max(2, (val / max) * height);
          const x      = i * 30 + 3;
          const y      = height - barH;
          return (
            <g key={i}>
              <rect x={x} y={y} width={24} height={barH} rx={3} fill={color} fillOpacity={0.85} />
              {data.length <= 8 && (
                <text x={x + 12} y={height + 14} textAnchor="middle" fontSize={8} fill="#9ca3af">
                  {d[labelKey]}
                </text>
              )}
            </g>
          );
        })}
      </svg>
      {data.length > 8 && (
        <div className="flex justify-between text-xs text-gray-400 mt-1 px-1">
          <span>{data[0]?.[labelKey]}</span>
          <span>{data[Math.floor(data.length / 2)]?.[labelKey]}</span>
          <span>{data[data.length - 1]?.[labelKey]}</span>
        </div>
      )}
    </div>
  );
}

// ─── Sparkline ────────────────────────────────────────────────────────────────

function Sparkline({ data, valueKey, color = '#003366' }) {
  if (!data || data.length < 2) return (
    <div className="flex items-center justify-center h-16 text-gray-300 text-xs">No data yet</div>
  );
  const values = data.map(d => parseFloat(d[valueKey]) || 0);
  const max = Math.max(...values, 1);
  const min = Math.min(...values);
  const W = 300, H = 60;
  const pts = values.map((v, i) => {
    const x = (i / (values.length - 1)) * W;
    const y = H - ((v - min) / (max - min || 1)) * H;
    return `${x},${y}`;
  }).join(' ');
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-16" preserveAspectRatio="none">
      <polyline points={pts} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ─── Visa Pipeline Bars ───────────────────────────────────────────────────────

const STAGE_COLORS_PIPELINE = {
  'Enquiry':                '#6b7280',
  'Checklist Sent':         '#3b82f6',
  'Documents Received':     '#6366f1',
  'Documents Under Review': '#8b5cf6',
  'Submitted to Embassy':   '#f59e0b',
  'Appointment Booked':     '#f97316',
  'Processing':             '#eab308',
  'Approved':               '#22c55e',
  'Rejected':               '#ef4444',
  'Ready for Collection':   '#14b8a6',
};

function PipelineBars({ data }) {
  if (!data || data.length === 0) return (
    <p className="text-gray-400 text-sm">No active visa applications.</p>
  );
  const max = Math.max(...data.map(d => parseInt(d.count)));
  return (
    <div className="space-y-2.5">
      {data.map(d => {
        const pct = Math.round((parseInt(d.count) / max) * 100);
        const col = STAGE_COLORS_PIPELINE[d.stage] || '#003366';
        return (
          <div key={d.stage} className="flex items-center gap-3">
            <div className="w-44 text-xs text-gray-600 text-right shrink-0 truncate">{d.stage}</div>
            <div className="flex-1 bg-gray-100 rounded-full h-5 overflow-hidden">
              <div className="h-full rounded-full flex items-center justify-end pr-2 transition-all"
                style={{ width: `${Math.max(pct, 8)}%`, backgroundColor: col }}>
                <span className="text-white text-xs font-bold">{d.count}</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Expiry Alert Row ─────────────────────────────────────────────────────────

function ExpiryRow({ alert }) {
  const days = parseInt(alert.days_until_expiry);
  const urgency = days < 0 ? 'text-red-700 bg-red-50' :
                  days < 30 ? 'text-red-600 bg-red-50' :
                  days < 90 ? 'text-amber-700 bg-amber-50' : 'text-gray-600 bg-gray-50';
  const label = days < 0 ? `Expired ${Math.abs(days)}d ago` :
                days === 0 ? 'Expires today!' :
                `${days} days`;
  return (
    <div className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
      <div>
        <span className="font-medium text-gray-800 text-sm">{alert.first_name} {alert.last_name}</span>
        {alert.passport_number && (
          <span className="text-gray-400 ml-2 text-xs font-mono">{alert.passport_number}</span>
        )}
        {alert.phone && <p className="text-xs text-gray-400">{alert.phone}</p>}
      </div>
      <div className="flex flex-col items-end gap-1">
        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${urgency}`}>{label}</span>
        <span className="text-xs text-gray-400">
          {new Date(alert.passport_expiry).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
        </span>
      </div>
    </div>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────

export default function Dashboard() {
  const [summary,      setSummary]      = useState(null);
  const [bookingsChart, setBookingsChart] = useState([]);
  const [revenueChart, setRevenueChart] = useState([]);
  const [pipeline,     setPipeline]     = useState([]);
  const [alerts,       setAlerts]       = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [lastRefresh,  setLastRefresh]  = useState(new Date());

  const load = async () => {
    setLoading(true);
    try {
      const [s, bc, rc, vp, a] = await Promise.all([
        dashboard.summary(),
        dashboard.bookingsChart(),
        dashboard.revenue(),
        dashboard.visaPipeline(),
        dashboard.expiryAlerts(),
      ]);
      setSummary(s.data);
      setBookingsChart(bc.data.chart   || []);
      setRevenueChart(rc.data.revenue  || []);
      setPipeline(vp.data.pipeline     || []);
      setAlerts(a.data.alerts          || []);
      setLastRefresh(new Date());
    } catch (e) {
      console.error('Dashboard load error:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  // Format helpers
  const ngn = (n) => '₦' + Number(n || 0).toLocaleString('en-NG', { minimumFractionDigits: 0 });

  const b = summary?.bookings;
  const v = summary?.visas;
  const inv = summary?.invoices;
  const cust = summary?.customers;

  // Format chart labels
  const bookingsData = bookingsChart.map(d => ({
    ...d,
    label: new Date(d.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }),
  }));

  const revenueData = revenueChart.map(d => ({
    ...d,
    label: new Date(d.month).toLocaleDateString('en-GB', { month: 'short', year: '2-digit' }),
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#003366]">Operations Dashboard</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            {new Date().toLocaleDateString('en-NG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <button onClick={load} disabled={loading}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-[#003366] transition-colors disabled:opacity-50">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          {loading ? 'Refreshing…' : `Updated ${lastRefresh.toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit' })}`}
        </button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-4">
        <StatCard icon={CalendarCheck} label="Bookings Today"
          value={b?.today ?? '—'} color="text-[#003366]" bg="bg-blue-50"
          sub={`${b?.confirmed ?? 0} confirmed · ${b?.enquiries ?? 0} enquiries`} />
        <StatCard icon={Globe} label="Active Visa Cases"
          value={v?.active ?? '—'} color="text-teal-600" bg="bg-teal-50"
          sub={`${v?.at_embassy ?? 0} at embassy`} />
        <StatCard icon={FileText} label="Unpaid Invoices"
          value={ngn(inv?.outstanding)} color="text-amber-600" bg="bg-amber-50"
          sub={`${inv?.total ?? 0} invoices total`} />
        <StatCard icon={Banknote} label="Collected This Month"
          value={ngn(inv?.collected_this_month)} color="text-green-700" bg="bg-green-50"
          sub="Payments received" />
        <StatCard icon={Users} label="Active Customers"
          value={cust?.total ?? '—'} color="text-purple-600" bg="bg-purple-50"
          sub={`+${cust?.new_this_month ?? 0} this month`} />
        <StatCard icon={AlertTriangle} label="Passport Expiry Alerts"
          value={alerts.length} color="text-red-600" bg="bg-red-50"
          sub="Expiring within 180 days" />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Bookings — 30 day trend */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-semibold text-gray-800">Bookings — Last 30 Days</h2>
              <p className="text-xs text-gray-400 mt-0.5">Number of bookings created per day</p>
            </div>
            {bookingsChart.length > 0 && (
              <span className="text-sm font-bold text-[#003366]">
                {bookingsChart.reduce((s, d) => s + parseInt(d.count), 0)} total
              </span>
            )}
          </div>
          {loading ? (
            <div className="h-36 bg-gray-50 rounded-lg animate-pulse" />
          ) : bookingsData.length === 0 ? (
            <div className="flex items-center justify-center h-36 text-gray-300 text-sm">
              No bookings yet — add your first booking
            </div>
          ) : (
            <BarChart data={bookingsData} valueKey="count" labelKey="label" color="#003366" height={120} />
          )}
        </div>

        {/* Revenue — 6 months */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-semibold text-gray-800">Revenue — Last 6 Months</h2>
              <p className="text-xs text-gray-400 mt-0.5">Payments collected (₦)</p>
            </div>
            {revenueChart.length > 0 && (
              <span className="text-sm font-bold text-green-600">
                {ngn(revenueChart.reduce((s, d) => s + parseFloat(d.total), 0))}
              </span>
            )}
          </div>
          {loading ? (
            <div className="h-36 bg-gray-50 rounded-lg animate-pulse" />
          ) : revenueData.length === 0 ? (
            <div className="flex items-center justify-center h-36 text-gray-300 text-sm">
              No payments recorded yet
            </div>
          ) : (
            <BarChart data={revenueData} valueKey="total" labelKey="label" color="#16a34a" height={120} />
          )}
        </div>
      </div>

      {/* Visa pipeline + expiry alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Visa pipeline */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-semibold text-gray-800">Visa Application Pipeline</h2>
              <p className="text-xs text-gray-400 mt-0.5">Active applications by current stage</p>
            </div>
            {pipeline.length > 0 && (
              <span className="text-sm font-bold text-teal-600">
                {pipeline.reduce((s, d) => s + parseInt(d.count), 0)} active
              </span>
            )}
          </div>
          {loading ? (
            <div className="space-y-2">
              {[1,2,3,4].map(i => <div key={i} className="h-5 bg-gray-50 rounded-full animate-pulse" />)}
            </div>
          ) : (
            <PipelineBars data={pipeline} />
          )}
        </div>

        {/* Expiry alerts */}
        <div className={`bg-white rounded-xl shadow-sm border p-5 ${alerts.length > 0 ? 'border-red-100' : 'border-gray-100'}`}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className={`font-semibold ${alerts.length > 0 ? 'text-red-700' : 'text-gray-800'} flex items-center gap-2`}>
                {alerts.length > 0 && <AlertTriangle className="w-4 h-4" />}
                Passport Expiry Alerts
              </h2>
              <p className="text-xs text-gray-400 mt-0.5">Customers with passports expiring within 6 months</p>
            </div>
          </div>
          {loading ? (
            <div className="space-y-3">
              {[1,2,3].map(i => <div key={i} className="h-10 bg-gray-50 rounded-lg animate-pulse" />)}
            </div>
          ) : alerts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-gray-300">
              <CalendarCheck className="w-8 h-8 mb-2" />
              <p className="text-sm">No upcoming passport expiries</p>
            </div>
          ) : (
            <div className="space-y-0 max-h-64 overflow-y-auto pr-1">
              {alerts.map((a, i) => <ExpiryRow key={i} alert={a} />)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
