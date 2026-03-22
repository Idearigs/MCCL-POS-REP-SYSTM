# MainFrame Setup Guide

## 🎯 What is MainFrame?

**MainFrame** is the **master control system** (SaaS platform) that manages all your POS customer instances.

```
┌─────────────────────────────────────┐
│        MAINFRAME (You)              │  ← Master Control
│  admin.truedesk.co.uk               │
│                                     │
│  - Create customer profiles         │
│  - Provision subdomains             │
│  - Manage subscriptions             │
│  - Control features                 │
│  - Track bugs/requests              │
└──────────────┬──────────────────────┘
               │
               │ Manages
               │
    ┌──────────┴──────────────┐
    │                         │
┌───▼────────┐      ┌────────▼────┐
│ Customer 1 │      │ Customer 2  │  ← Your Customers
│ POS System │      │ POS System  │
│ bhouse.    │      │ acmejewel.  │
│ truedesk   │      │ truedesk    │
└────────────┘      └─────────────┘
```

## 📦 Project Structure

```
MCCL-POS-REP-SYSTM/
├── backend/                 # Shared backend (port 3000)
│   └── src/features/mainframe/   # MainFrame API endpoints
│
├── src/                     # POS System frontend (port 5173)
│   ├── pages/              # Customer POS pages
│   └── components/         # POS components
│
└── mainframe-admin/        # MainFrame Admin App (port 5174) ✨ NEW
    ├── src/
    │   ├── pages/
    │   │   ├── Login.tsx          # Admin login
    │   │   └── Dashboard.tsx      # Control center
    │   ├── contexts/
    │   │   └── AuthContext.tsx    # Admin auth
    │   └── services/
    │       └── api.ts             # API client
    └── package.json
```

## 🚀 Quick Start

### Step 1: Install MainFrame Dependencies

```bash
cd mainframe-admin
npm install
```

### Step 2: Run Database Migration

```bash
cd ../backend
npx prisma migrate dev --name add_mainframe_tables
npx prisma generate
```

This creates 12 new tables:
- `mf_customer_profiles` - Customer businesses
- `mf_customer_users` - Users per customer
- `mf_features` - System features
- `mf_subscriptions` - Billing & plans
- `mf_invoices` - Invoices
- `mf_bug_reports` - Bug tracking
- `mf_feature_requests` - Feature requests
- `mf_admins` - MainFrame administrators
- And more...

### Step 3: Create Your First Admin

```bash
# Still in backend directory
node create-mainframe-admin.js
```

Or manually with Node:

```bash
node -e "
const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');
const prisma = new PrismaClient();

async function createAdmin() {
  const password = 'admin123';
  const hash = crypto.createHash('sha256');
  hash.update(password + 'truedesk-mainframe-salt');
  const passwordHash = hash.digest('hex');

  const admin = await prisma.mf_admins.create({
    data: {
      firstName: 'Admin',
      lastName: 'User',
      email: 'admin@truedesk.com',
      passwordHash,
      role: 'super_admin',
    },
  });

  console.log('✅ Admin created!');
  console.log('Email:', admin.email);
  console.log('Password: admin123');
}

createAdmin().finally(() => prisma.\$disconnect());
"
```

### Step 4: Start Everything

Open 3 terminals:

**Terminal 1 - Backend:**
```bash
cd backend
npm run start:dev
# Runs on http://localhost:3000
```

**Terminal 2 - POS System (Customer Instances):**
```bash
npm run dev
# Runs on http://localhost:5173
```

**Terminal 3 - MainFrame Admin:**
```bash
cd mainframe-admin
npm run dev
# Runs on http://localhost:5174
```

### Step 5: Login to MainFrame

1. Open http://localhost:5174
2. Login with:
   - Email: `admin@truedesk.com`
   - Password: `admin123`

## 🎮 Using MainFrame

### Create Your First Customer

1. Click "Add Customer" on the dashboard
2. Fill in:
   - **Business Name**: "Bhouse Jewellers"
   - **Subdomain**: "bhouse" (becomes bhouse.truedesk.co.uk)
   - **Email**: contact@bhouse.com
   - **Plan**: Professional - £79/mo
3. Click "Create Customer"

MainFrame will:
- ✅ Create customer profile
- ✅ Validate and reserve subdomain
- ✅ Set up subscription plan
- ✅ Log all activity

### Manage Features

Each customer can have different features enabled:
- POS System (Core)
- Repair Management (Core)
- Stock Taking (Premium)
- Financial Intelligence (Premium)
- Shift Tracking (Premium)

### Create Users for Customer

1. Go to customer detail page
2. Click "Add User"
3. System generates credentials
4. Download credentials document
5. Send to customer

### Billing & Subscriptions

- View MRR (Monthly Recurring Revenue)
- Generate invoices
- Track per-user charges
- Manage plan upgrades/downgrades

### Bug Tracking

- Customers can report bugs
- Assign priority levels (Low, Medium, High, Critical)
- Track resolution status
- Link bugs to specific features

### Feature Requests

- Customers submit feature ideas
- Vote on popular requests
- Track development status

## 🔐 Security

### Separate Authentication

- **MainFrame**: Uses `mf_admins` table (you)
- **POS System**: Uses `users` table (customers)

### Database Isolation

- Each customer gets their own isolated database
- MainFrame database stores customer profiles
- No cross-customer data leakage

### Access Control

- MainFrame accessible only to super admins
- POS systems accessible per subdomain
- Role-based permissions in each system

## 📋 API Endpoints

MainFrame APIs (All under `/api/mainframe/`):

```
POST   /mainframe/admins/login
GET    /mainframe/customer-profiles
POST   /mainframe/customer-profiles
GET    /mainframe/customer-profiles/:id
PUT    /mainframe/customer-profiles/:id
GET    /mainframe/customer-profiles/stats

GET    /mainframe/subscriptions/profile/:profileId
PUT    /mainframe/subscriptions/profile/:profileId/plan
POST   /mainframe/subscriptions/profile/:profileId/generate-invoice
GET    /mainframe/subscriptions/stats

GET    /mainframe/features
POST   /mainframe/features
POST   /mainframe/features/seed-defaults

GET    /mainframe/bug-reports
POST   /mainframe/bug-reports
PUT    /mainframe/bug-reports/:id/status
GET    /mainframe/bug-reports/stats

GET    /mainframe/feature-requests
POST   /mainframe/feature-requests
POST   /mainframe/feature-requests/:id/vote

POST   /mainframe/subdomain/validate
POST   /mainframe/subdomain/suggest
```

## 🌐 Production Deployment

### Recommended Setup

1. **MainFrame Admin**
   - Deploy to: `admin.truedesk.co.uk`
   - Port: 443 (HTTPS)
   - Build: `npm run build` in mainframe-admin/

2. **Backend API**
   - Deploy to: `api.truedesk.co.uk`
   - Port: 443 (HTTPS)
   - Serves both MainFrame and POS requests

3. **Customer POS Instances**
   - Deploy to: `*.truedesk.co.uk` (wildcard subdomain)
   - Each customer gets: `{subdomain}.truedesk.co.uk`
   - Build: `npm run build` in main directory

### Environment Variables

**MainFrame Admin (.env):**
```env
VITE_API_URL=https://api.truedesk.co.uk/api
```

**Backend (.env):**
```env
DATABASE_URL=postgresql://...
MAINFRAME_DB_URL=postgresql://...  # Separate DB for MainFrame
PASSWORD_SALT=your-secret-salt
```

## 🐛 Troubleshooting

### "Cannot find module" errors
```bash
cd mainframe-admin
npm install
```

### "mf_admins table doesn't exist"
```bash
cd backend
npx prisma migrate dev
```

### "Invalid credentials" when logging in
Make sure you created an admin user (Step 3)

### Port 5174 already in use
Change port in `mainframe-admin/vite.config.ts`:
```ts
server: {
  port: 5175,  // Change this
}
```

## 📚 Next Steps

1. ✅ Set up MainFrame (you just did this!)
2. Create your first customer
3. Set up features for that customer
4. Generate user credentials
5. Test the customer POS instance
6. Set up billing/invoicing
7. Enable bug tracking
8. Deploy to production

## 💡 Tips

- **Keep MainFrame URL secret** - Only for administrators
- **Use strong admin passwords** - Not "admin123" in production!
- **Regular backups** - Both MainFrame and customer databases
- **Monitor MRR** - Track business metrics
- **Feature requests** - Listen to customer needs

## 🎉 You're Ready!

MainFrame is now set up as a **separate application** that controls your entire POS SaaS platform. You can create customers, manage subscriptions, control features, and scale your business!

**MainFrame Login**: http://localhost:5174
**Customer POS**: http://localhost:5173
