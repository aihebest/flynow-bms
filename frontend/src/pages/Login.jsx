import { Plane } from 'lucide-react';

export default function LoginPage({ onLogin }) {
  return (
    <div className="min-h-screen bg-[#003366] flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-2xl p-10 w-full max-w-md text-center">
        <div className="flex justify-center mb-4">
          <div className="bg-[#003366] rounded-full p-4">
            <Plane className="text-[#C8921A]" size={32} />
          </div>
        </div>
        <h1 className="text-2xl font-bold text-[#003366] mb-1">FlyNow BMS</h1>
        <p className="text-gray-500 text-sm mb-1">Now Travel & Tours Limited</p>
        <p className="text-gray-400 text-xs mb-8">Business Management System</p>

        <button
          onClick={onLogin}
          className="w-full flex items-center justify-center gap-3 bg-[#0078D4] hover:bg-[#106EBE]
                     text-white font-semibold py-3 px-6 rounded-lg transition-colors shadow-md"
        >
          {/* Microsoft logo */}
          <svg width="20" height="20" viewBox="0 0 21 21" xmlns="http://www.w3.org/2000/svg">
            <rect x="1"  y="1"  width="9" height="9" fill="#f25022"/>
            <rect x="11" y="1"  width="9" height="9" fill="#7fba00"/>
            <rect x="1"  y="11" width="9" height="9" fill="#00a4ef"/>
            <rect x="11" y="11" width="9" height="9" fill="#ffb900"/>
          </svg>
          Sign in with Microsoft 365
        </button>

        <p className="text-gray-400 text-xs mt-6">
          Use your FlyNowTravels Microsoft 365 account.<br />
          Contact your ICT administrator if you need access.
        </p>
      </div>
    </div>
  );
}
