import { Routes, Route, Navigate } from 'react-router-dom';
import { useIsAuthenticated, useMsal } from '@azure/msal-react';
import { loginRequest } from './auth/msalConfig';
import Layout from './components/Layout';
import Dashboard   from './pages/Dashboard';
import Customers   from './pages/Customers';
import Bookings    from './pages/Bookings';
import Visas       from './pages/Visas';
import Invoices    from './pages/Invoices';
import Documents   from './pages/Documents';
import Staff       from './pages/Staff';
import Packages    from './pages/Packages';
import LoginPage   from './pages/Login';

function ProtectedRoute({ children }) {
  const isAuthenticated = useIsAuthenticated();
  return isAuthenticated ? children : <Navigate to="/login" replace />;
}

export default function App() {
  const isAuthenticated = useIsAuthenticated();
  const { instance } = useMsal();

  function handleLogin() {
    instance.loginRedirect(loginRequest).catch((err) => {
      console.error('MSAL loginRedirect error:', err);
      alert('Login failed: ' + err.message);
    });
  }

  return (
    <Routes>
      <Route path="/login" element={
        isAuthenticated
          ? <Navigate to="/" replace />
          : <LoginPage onLogin={handleLogin} />
      } />

      <Route path="/" element={
        <ProtectedRoute>
          <Layout />
        </ProtectedRoute>
      }>
        <Route index element={<Dashboard />} />
        <Route path="customers/*" element={<Customers />} />
        <Route path="bookings/*"  element={<Bookings />} />
        <Route path="visas/*"     element={<Visas />} />
        <Route path="invoices/*"  element={<Invoices />} />
        <Route path="documents/*" element={<Documents />} />
        <Route path="packages/*"  element={<Packages />} />
        <Route path="staff/*"     element={<Staff />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
