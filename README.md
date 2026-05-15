# FlyNow BMS — Business Management System

**Now Travel & Tours Limited (FlyNowTravels)**  
Built on **Microsoft Azure** + **Microsoft 365**

---

## Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite + Tailwind CSS |
| Auth (Staff) | Microsoft Entra ID (MSAL) |
| Auth (Customers) | Azure AD B2C |
| Backend | Node.js 22 + Express |
| Database | Azure Database for PostgreSQL (Flexible Server) |
| File Storage | SharePoint via Microsoft Graph API |
| Email | Azure Communication Services |
| Payments | Paystack |
| SMS / WhatsApp | Termii |
| Accounting Sync | Zoho Books API |
| Automation | Power Automate (M365) |
| Reporting | Power BI (M365) |
| Hosting (API) | Azure App Service |
| Hosting (Web) | Azure Static Web Apps |
| CI/CD | GitHub Actions |
| Secrets | Azure Key Vault |
| Monitoring | Azure Monitor + Application Insights |

---

## Project Structure

```
flynow-bms/
├── .github/workflows/
│   ├── backend.yml        # Deploy backend → Azure App Service
│   └── frontend.yml       # Deploy frontend → Azure Static Web Apps
├── backend/
│   ├── db/
│   │   └── schema.sql     # Full PostgreSQL schema (all 6 modules)
│   ├── src/
│   │   ├── config/        # DB + Azure client setup
│   │   ├── middleware/    # Auth (Entra ID JWT) + RBAC
│   │   ├── routes/        # Express route definitions
│   │   ├── controllers/   # Request handlers
│   │   ├── models/        # Database query functions
│   │   └── services/      # Graph API, Paystack, Termii, Zoho
│   ├── .env.example
│   ├── package.json
│   └── server.js
├── frontend/
│   ├── src/
│   │   ├── api/           # Axios API client
│   │   ├── auth/          # MSAL configuration
│   │   ├── components/    # Shared UI components
│   │   ├── hooks/         # Custom React hooks
│   │   └── pages/         # CRM, Bookings, Visas, Invoices, Documents, Dashboard
│   ├── package.json
│   └── vite.config.js
└── README.md
```

---

## Local Development Setup

### Prerequisites
- Node.js 22+
- PostgreSQL (local) or Azure Database for PostgreSQL connection string
- Azure subscription (managed by ICT consultant)
- Microsoft 365 tenant access

### 1. Clone & Install

```bash
git clone https://github.com/YOUR_ORG/flynow-bms.git
cd flynow-bms

# Install backend dependencies
cd backend && npm install

# Install frontend dependencies
cd ../frontend && npm install
```

### 2. Configure Environment

```bash
# Backend
cp backend/.env.example backend/.env
# Fill in all values in backend/.env

# Frontend
cp frontend/.env.example frontend/.env
# Fill in Azure AD client ID and tenant ID
```

### 3. Run the Database Schema

```bash
# Against your local or Azure PostgreSQL
psql -h <host> -U <user> -d flynow_bms -f backend/db/schema.sql
```

### 4. Start Development Servers

```bash
# Terminal 1 — Backend (port 5000)
cd backend && npm run dev

# Terminal 2 — Frontend (port 5173)
cd frontend && npm run dev
```

---

## Deployment

Deployments are triggered automatically via GitHub Actions:

- **Push to `main`** → deploys both backend (Azure App Service) and frontend (Azure Static Web Apps)
- **Push to `develop`** → runs tests only (no deploy)
- **Pull Request** → runs tests and build checks

### Required GitHub Secrets

| Secret | Description |
|---|---|
| `AZURE_WEBAPP_PUBLISH_PROFILE` | Azure App Service publish profile (download from Azure portal) |
| `AZURE_STATIC_WEB_APPS_API_TOKEN` | Azure Static Web Apps deployment token |
| `DATABASE_URL` | Azure PostgreSQL connection string |

---

## Modules

1. **Customer Records (CRM)** — 360° customer profiles, interaction log, lead pipeline
2. **Bookings & Enquiry Tracker** — Enquiry → Quote → Confirmed → Ticketed → Completed
3. **Visa Application Tracker** — Document checklist, SharePoint uploads, stage notifications
4. **Invoicing & Payments** — Auto-invoice from booking, Paystack collection, Zoho Books sync
5. **Document Vault** — SharePoint-backed secure document storage with expiry tracking
6. **Staff & Operations Dashboard** — Power BI, leave management, Power Automate flows

---

## ICT Consultant Notes

- All secrets stored in **Azure Key Vault** — never in code or GitHub
- Staff auth via **Microsoft Entra ID** — manage users in the Azure portal
- Customer auth via **Azure AD B2C** — separate tenant/policy
- Document storage in **SharePoint** — managed via Microsoft Graph API
- Power Automate flows configured separately in the M365 admin portal
- Power BI dashboards connect directly to Azure PostgreSQL via DirectQuery
