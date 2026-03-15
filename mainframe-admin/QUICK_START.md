# 🚀 MainFrame Quick Start

## ✅ Setup Complete!

Your MainFrame admin application is ready to use.

## 🔐 Admin Credentials

```
Email:    admin@truedesk.com
Password: admin123
```

**⚠️ IMPORTANT: Change this password after first login!**

## 🎯 Start MainFrame

### Step 1: Install Dependencies (First Time Only)

```bash
cd mainframe-admin
npm install
```

### Step 2: Start the MainFrame Admin

```bash
npm run dev
```

MainFrame will start on: **http://localhost:5174**

## 🖥️ Full Stack Setup

To run everything, you need 3 terminals:

### Terminal 1 - Backend API
```bash
cd backend
npm run start:dev
```
Runs on: http://localhost:3000

### Terminal 2 - POS System (Customer App)
```bash
npm run dev
```
Runs on: http://localhost:5173

### Terminal 3 - MainFrame Admin
```bash
cd mainframe-admin
npm run dev
```
Runs on: http://localhost:5174

## 🎮 What Can You Do?

### 1. Login to MainFrame
- Open http://localhost:5174
- Use the credentials above
- You'll see the admin dashboard

### 2. Create Your First Customer
From the dashboard:
- Click "Add Customer"
- Enter business details:
  - Business Name: "Bhouse Jewellers"
  - Subdomain: "bhouse"
  - Email: contact@bhouse.com
  - Plan: Professional (£79/mo)
- Click "Create Customer"

### 3. Manage Features
- Enable/disable features per customer
- Core features (included): POS, Repairs, Inventory
- Premium features (extra): Stock Taking, Financial Intelligence

### 4. Create Users for Customer
- Go to customer detail
- Add users
- Download credentials
- Send to customer

### 5. Track Billing
- View MRR (Monthly Recurring Revenue)
- Generate invoices
- Manage subscriptions

## 📋 Database Tables Created

The migration created these MainFrame tables:

- ✅ `mf_customer_profiles` - Customer businesses
- ✅ `mf_customer_users` - Users per customer
- ✅ `mf_features` - System features
- ✅ `mf_feature_versions` - Feature versioning
- ✅ `mf_customer_features` - Feature assignments
- ✅ `mf_subscriptions` - Plans & billing
- ✅ `mf_invoices` - Invoice generation
- ✅ `mf_bug_reports` - Bug tracking
- ✅ `mf_feature_requests` - Feature voting
- ✅ `mf_activity_logs` - Audit trail
- ✅ `mf_admins` - MainFrame administrators
- ✅ `mf_settings` - System settings

## 🔧 Useful Commands

### Create New Admin User (Custom)
```bash
cd backend
node create-mainframe-admin.js
```
This will prompt you for custom credentials.

### Create Default Admin (Quick)
```bash
cd backend
node create-default-admin.js
```
Creates admin@truedesk.com / admin123

### Check Database Schema
```bash
cd backend
npx prisma studio
```
Opens GUI at http://localhost:5555

## 🌐 Architecture

```
┌─────────────────────────────────────┐
│   MAINFRAME (You - Admin)           │
│   http://localhost:5174              │
│   admin@truedesk.com                 │
└──────────────┬──────────────────────┘
               │
               │ Manages via API
               │
┌──────────────▼──────────────────────┐
│   BACKEND API                        │
│   http://localhost:3000/api          │
│   /mainframe/* endpoints             │
└──────────────┬──────────────────────┘
               │
               │ Serves
               │
    ┌──────────┴──────────────┐
    │                         │
┌───▼────────┐      ┌────────▼────┐
│ Customer 1 │      │ Customer 2  │
│ POS System │      │ POS System  │
│ localhost: │      │ localhost:  │
│ 5173       │      │ 5173        │
└────────────┘      └─────────────┘
```

## 🐛 Troubleshooting

### Port Already in Use
If port 5174 is taken:
```bash
# Edit mainframe-admin/vite.config.ts
server: {
  port: 5175,  # Change this
}
```

### "Cannot find module"
```bash
cd mainframe-admin
npm install
```

### Invalid Credentials
Make sure you created the admin:
```bash
cd backend
node create-default-admin.js
```

### Backend Not Running
```bash
cd backend
npm run start:dev
```

## 📚 Documentation

- **Full Setup Guide**: `../MAINFRAME_SETUP.md`
- **MainFrame README**: `README.md`
- **Backend API**: Check `/api/mainframe/*` endpoints

## 🎉 You're Ready!

MainFrame is now fully operational. You can:
- ✅ Login to admin panel
- ✅ Create customer instances
- ✅ Manage subscriptions
- ✅ Control features
- ✅ Track business metrics
- ✅ Scale your SaaS platform

**Login now**: http://localhost:5174

Email: admin@truedesk.com
Password: admin123
