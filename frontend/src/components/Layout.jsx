import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useMsal } from '@azure/msal-react';
import {
  LayoutDashboard, Users, CalendarCheck, Globe, FileText,
  FolderOpen, UserCog, LogOut, Plane
} from 'lucide-react';

const NAV = [
  { to: '/',          icon: LayoutDashboard, label: 'Dashboard'  },
  { to: '/customers', icon: Users,           label: 'Customers'  },
  { to: '/bookings',  icon: CalendarCheck,   label: 'Bookings'   },
  { to: '/visas',     icon: Globe,           label: 'Visas'      },
  { to: '/invoices',  icon: FileText,        label: 'Invoices'   },
  { to: '/documents', icon: FolderOpen,      label: 'Documents'  },
  { to: '/staff',     icon: UserCog,         label: 'Staff'      },
];

export default function Layout() {
  const { instance, accounts } = useMsal();
  const user = accounts[0];

  function handleLogout() {
    instance.logoutRedirect({ postLogoutRedirectUri: '/login' });
  }

  return (
    <div className="flex h-screen bg-gray-50 font-sans">
      {/* Sidebar */}
      <aside className="w-64 bg-[#003366] flex flex-col shadow-xl">
        {/* Logo */}
        <div className="px-6 py-5 border-b border-blue-800">
          <div className="flex items-center gap-2">
            <Plane className="text-[#C8921A]" size={22} />
            <span className="text-white font-bold text-lg tracking-tight">FlyNow BMS</span>
          </div>
          <p className="text-blue-300 text-xs mt-0.5">Now Travel & Tours Ltd</p>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {NAV.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors
                 ${isActive
                   ? 'bg-white/15 text-white'
                   : 'text-blue-200 hover:bg-white/10 hover:text-white'}`
              }
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* User footer */}
        <div className="px-4 py-4 border-t border-blue-800">
          <p className="text-white text-sm font-medium truncate">{user?.name}</p>
          <p className="text-blue-300 text-xs truncate mb-3">{user?.username}</p>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 text-blue-300 hover:text-white text-sm transition-colors"
          >
            <LogOut size={16} />
            Sign out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
