/**
 * api/index.js — Axios client with automatic Entra ID token injection.
 *
 * Every request automatically adds the current user's access token
 * from MSAL session storage as  Authorization: Bearer <token>.
 */
import axios from 'axios';
import { msalInstance } from '../main.jsx';
import { loginRequest } from '../auth/msalConfig';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  headers: { 'Content-Type': 'application/json' },
});

// Attach Entra ID access token to every request
api.interceptors.request.use(async (config) => {
  try {
    const accounts = msalInstance.getAllAccounts();
    if (accounts.length === 0) throw new Error('No authenticated account');

    const response = await msalInstance.acquireTokenSilent({
      ...loginRequest,
      account: accounts[0],
    });

    config.headers.Authorization = `Bearer ${response.accessToken}`;
  } catch (err) {
    // Silent token acquisition failed — log but don't redirect (causes loops)
    console.error('Failed to acquire token silently:', err.message);
  }
  return config;
});

// Global error handler
api.interceptors.response.use(
  (res) => res,
  (err) => {
    // Don't auto-redirect on 401 — let individual pages handle errors gracefully.
    // A redirect loop occurs if the backend rejects the token and we keep redirecting to login.
    return Promise.reject(err);
  }
);

// ─── API functions ──────────────────────────────────────────────────────────

// Customers
export const customers = {
  list:            (params) => api.get('/customers', { params }),
  getById:         (id)     => api.get(`/customers/${id}`),
  create:          (data)   => api.post('/customers', data),
  update:          (id, data) => api.patch(`/customers/${id}`, data),
  logInteraction:  (id, data) => api.post(`/customers/${id}/interactions`, data),
  getInteractions: (id)     => api.get(`/customers/${id}/interactions`),
};

// Bookings
export const bookings = {
  list:         (params) => api.get('/bookings', { params }),
  getById:      (id)     => api.get(`/bookings/${id}`),
  create:       (data)   => api.post('/bookings', data),
  update:       (id, data) => api.patch(`/bookings/${id}`, data),
  updateStatus: (id, status, notes) => api.patch(`/bookings/${id}/status`, { status, notes }),
};

// Visas
export const visas = {
  list:         (params) => api.get('/visas', { params }),
  getById:      (id)     => api.get(`/visas/${id}`),
  create:       (data)   => api.post('/visas', data),
  update:       (id, data) => api.patch(`/visas/${id}`, data),
  updateStage:  (id, stage, note) => api.patch(`/visas/${id}/stage`, { stage, note }),
  uploadDoc:    (id, formData) => api.post(`/visas/${id}/documents`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  getChecklist: (visaTypeId) => api.get(`/visas/checklist/${visaTypeId}`),
  listTypes:    ()           => api.get('/visas/types/all'),
};

// Invoices
export const invoices = {
  list:         (params) => api.get('/invoices', { params }),
  getById:      (id)     => api.get(`/invoices/${id}`),
  create:       (data)   => api.post('/invoices', data),
  update:       (id, data) => api.patch(`/invoices/${id}`, data),
  send:         (id)     => api.post(`/invoices/${id}/send`),
  recordPayment:(id, data) => api.post(`/invoices/${id}/payments`, data),
  syncZoho:     (id)     => api.post(`/invoices/${id}/sync-zoho`),
};

// Documents
export const documents = {
  list:           (params)   => api.get('/documents', { params }),
  upload:         (formData) => api.post('/documents', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  getDownloadUrl: (id)       => api.get(`/documents/${id}/download-url`),
  remove:         (id)       => api.delete(`/documents/${id}`),
};

// Staff
export const staff = {
  me:            ()       => api.get('/staff/me'),
  list:          (params) => api.get('/staff', { params }),
  getById:       (id)     => api.get(`/staff/${id}`),
  applyLeave:    (data)   => api.post('/staff/leave', data),
  getMyLeave:    ()       => api.get('/staff/leave'),
  getTeamLeave:  ()       => api.get('/staff/leave/team'),
  approveLeave:  (id)     => api.patch(`/staff/leave/${id}/approve`),
  rejectLeave:   (id, reason) => api.patch(`/staff/leave/${id}/reject`, { reason }),
};

// Packages
export const packages = {
  list:    (params)   => api.get('/packages', { params }),
  getById: (id)       => api.get(`/packages/${id}`),
  create:  (data)     => api.post('/packages', data),
  update:  (id, data) => api.patch(`/packages/${id}`, data),
  remove:  (id)       => api.delete(`/packages/${id}`),
};

// Dashboard
export const dashboard = {
  summary:       () => api.get('/dashboard/summary'),
  bookingsChart: () => api.get('/dashboard/bookings-chart'),
  visaPipeline:  () => api.get('/dashboard/visa-pipeline'),
  revenue:       () => api.get('/dashboard/revenue'),
  expiryAlerts:  () => api.get('/dashboard/expiry-alerts'),
};

export default api;
