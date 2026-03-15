# TrueDesk MainFrame - Admin Control Center

The **MainFrame** is the master SaaS control system that manages all POS customer instances. This is a separate application from the POS system.

## Architecture

```
┌─────────────────────────────────────┐
│   MAINFRAME (This Application)      │
│   - Manages customer profiles       │
│   - Creates subdomains              │
│   - Provisions databases            │
│   - Handles billing                 │
│   - Feature management              │
│   - Bug tracking                    │
└──────────────┬──────────────────────┘
               │
               │ Controls
               │
    ┌──────────┴──────────────┐
    │                         │
┌───▼────────┐      ┌────────▼────┐
│ Customer 1 │      │ Customer 2  │
│ POS System │      │ POS System  │
│ bhouse.    │      │ acmejewel.  │
│ truedesk   │      │ truedesk    │
└────────────┘      └─────────────┘
```

## Setup Instructions

### 1. Install Dependencies

```bash
cd mainframe-admin
npm install
```

### 2. Run Database Migration (First Time Only)

Before running MainFrame, create the database tables:

```bash
cd ../backend
npx prisma migrate dev --name add_mainframe_tables
npx prisma generate
```

### 3. Create First Admin User

Run this script to create your first MainFrame admin:

```bash
cd backend
node -e "
const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');

const prisma = new PrismaClient();

async function createAdmin() {
  const password = 'admin123'; // Change this!
  const hash = crypto.createHash('sha256');
  hash.update(password + (process.env.PASSWORD_SALT || 'truedesk-mainframe-salt'));
  const passwordHash = hash.digest('hex');

  const admin = await prisma.mf_admins.create({
    data: {
      firstName: 'Admin',
      lastName: 'User',
      email: 'admin@truedesk.com',
      passwordHash: passwordHash,
      role: 'super_admin',
    },
  });

  console.log('✅ Admin created:');
  console.log('Email:', admin.email);
  console.log('Password: admin123');
  console.log('Please change the password after first login!');
}

createAdmin().catch(console.error).finally(() => prisma.\$disconnect());
"
```

### 4. Start the MainFrame Admin App

```bash
cd mainframe-admin
npm run dev
```

The MainFrame admin will run on: **http://localhost:5174**

### 5. Login

Use the credentials you created:
- **Email**: `admin@truedesk.com`
- **Password**: `admin123` (or what you set)

## Development

- **MainFrame Admin**: http://localhost:5174 (Port 5174)
- **POS System**: http://localhost:5173 (Port 5173)
- **Backend API**: http://localhost:3000

## Key Features

### Customer Management
- Create new customer profiles
- Assign subdomains (e.g., `bhouse.truedesk.co.uk`)
- Provision separate databases
- Manage customer status (Active, Suspended, Cancelled)

### Subscription Billing
- Multiple plan tiers (Starter, Professional, Business, Enterprise)
- Per-user pricing
- Automatic invoice generation
- Monthly Recurring Revenue (MRR) tracking

### Feature Management
- Enable/disable features per customer
- Feature versioning
- Core vs Premium features
- Feature pricing

### Bug Tracking & Feature Requests
- Customer-reported bugs with priority levels
- Feature request voting system
- Assignment and resolution tracking

### User Management
- Create users for each customer instance
- Export credentials as documents
- Password reset functionality

## Project Structure

```
mainframe-admin/
├── src/
│   ├── contexts/
│   │   └── AuthContext.tsx       # MainFrame admin authentication
│   ├── pages/
│   │   ├── Login.tsx              # Admin login page
│   │   └── Dashboard.tsx          # Main dashboard
│   ├── services/
│   │   └── api.ts                 # API client for backend
│   ├── App.tsx                    # Main app component
│   ├── main.tsx                   # Entry point
│   └── index.css                  # Global styles
├── package.json
├── vite.config.ts
└── README.md
```

## Deployment

### Production Deployment

1. **MainFrame Admin**: Deploy to `admin.truedesk.co.uk` or `mainframe.truedesk.co.uk`
2. **POS System**: Deploy each customer to `{subdomain}.truedesk.co.uk`
3. **Backend**: Shared backend for both MainFrame and POS instances

### Environment Variables

Create `.env` in the mainframe-admin folder:

```env
VITE_API_URL=http://localhost:3000/api
```

For production:

```env
VITE_API_URL=https://api.truedesk.co.uk/api
```

## Security Notes

- MainFrame admin access is separate from POS user access
- Admin authentication uses `mf_admins` table (not regular users)
- Each customer POS system has isolated database
- Subdomain provisioning validates against reserved names
- Password hashing with SHA-256 + salt

## Next Steps

1. ✅ Run the database migration
2. ✅ Create your first admin user
3. ✅ Start the MainFrame admin app
4. ✅ Login and explore the dashboard
5. Create your first customer instance
6. Provision their subdomain
7. Export user credentials

## Support

For issues or questions:
- Check backend logs in `backend/` directory
- MainFrame API endpoints: `/api/mainframe/*`
- Make sure backend server is running on port 3000
