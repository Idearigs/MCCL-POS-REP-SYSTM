# MPS Jewelry POS Frontend

A clean, standalone React TypeScript frontend for the MPS Jewelry Point of Sale and Repair Management System.

## 🚀 **Pure Frontend - No Backend Required**

This frontend has been **completely cleaned** of all backend dependencies and API calls. It runs entirely in the browser using:

- **localStorage** for data persistence
- **Mock data** for demonstration
- **Simulated API delays** for realistic UX
- **No external API dependencies**

## ✨ Features

### **Customer Management**
- Complete CRUD operations for customers
- Search and filter functionality
- Customer documents management
- Data persisted in localStorage

### **Business Features** (UI Ready)
- 📊 **Dashboard** - Sales metrics and analytics
- 🛒 **Point of Sale** - Product selection and checkout
- 🔧 **Repair Management** - Job tracking and workflow
- 📦 **Inventory** - Product catalog management
- 🔔 **Notifications** - Real-time system updates
- ⚙️ **Settings** - System configuration
- 📅 **Calendar** - Appointment scheduling

## 🛠 Technology Stack

- **React 18.2.0** + TypeScript
- **React Router 6.6.2** for navigation
- **TailwindCSS** for styling
- **Class Variance Authority** for component variants
- **React Scripts 5.0.1** for build tools
- **Web Vitals** for performance monitoring

## 🚀 Getting Started

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn

### Installation
```bash
# Install dependencies
npm install

# Start development server
npm start
```

The application will open at `http://localhost:3000`

### Available Scripts
```bash
npm start    # Development server
npm build    # Production build
npm test     # Run tests
npm eject    # Eject from create-react-app (one-way operation)
```

## 📁 Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── customers/      # Customer management components
│   └── ui/            # Base UI components
├── hooks/              # Custom React hooks
├── pages/              # Route components
├── services/           # Data services (localStorage-based)
│   ├── customerService.ts
│   ├── customerDocumentService.ts
│   └── mockData.ts
├── types/              # TypeScript type definitions
└── utils/              # Utility functions
```

## 💾 Data Storage

### **Local Storage Keys**
- `mps_customers` - Customer data
- `mps_customer_documents` - Customer documents

### **Mock Data**
The application includes pre-populated mock data:
- 5 sample customers with realistic data
- Sample customer documents
- Jewelry-specific business data

### **Data Persistence**
- All changes are automatically saved to localStorage
- Data persists across browser sessions
- No external database required

## 🎨 UI Components

### **Customer Management**
- `CustomerCard` - Customer overview display
- `CustomerForm` - Add/edit customer form
- `CustomerList` - Paginated customer listing
- `DocumentCard` - Document display component
- `DocumentUploadForm` - File upload interface

### **Base UI**
- `toast` - Notification system
- `toaster` - Toast notification manager
- `use-toast` - Toast hook for components

## 🔧 Development

### **Adding New Features**
1. Create new service in `services/` folder
2. Add mock data to `mockData.ts`
3. Implement localStorage storage pattern
4. Create components in appropriate folders
5. Add routes to `App.tsx`

### **Customizing Mock Data**
Edit `src/services/mockData.ts` to add your own sample data:
```typescript
export const mockCustomers: Customer[] = [
  // Add your customers here
];
```

### **Styling**
- Uses TailwindCSS for utility-first styling
- Custom component variants with CVA
- Responsive design patterns
- Dark mode ready (if needed)

## 📱 Responsive Design

The application is fully responsive and works on:
- Desktop computers
- Tablets
- Mobile devices
- Various screen sizes

## 🔒 No Authentication Required

Since this is a pure frontend demo:
- No login system required
- No JWT tokens needed
- No user management
- Ready for demo/presentation use

## 📊 Performance

- **Fast startup** - No API calls during initialization
- **Instant operations** - All data stored locally
- **Simulated delays** - Realistic UX with loading states
- **Web Vitals** - Performance monitoring included

## 🚢 Deployment

### **Static Hosting**
This frontend can be deployed to any static hosting service:

```bash
# Build for production
npm run build

# Deploy the 'build' folder to:
```
- Netlify
- Vercel
- GitHub Pages
- AWS S3
- Any static hosting provider

### **Environment Variables**
No environment variables needed - everything runs client-side!

## 🎯 Demo Ready

This frontend is perfect for:
- **Client presentations**
- **System demonstrations** 
- **UI/UX testing**
- **Frontend development**
- **Prototype validation**

## 🔄 Future Backend Integration

When ready to connect to a real backend:
1. Replace localStorage services with HTTP clients
2. Add authentication system
3. Update API endpoints
4. Add error handling for network issues
5. Implement proper state management

---

**Built with ❤️ for MPS Jewelry Management System**