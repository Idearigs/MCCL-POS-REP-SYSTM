# External Repairer System - Implementation Guide

## Overview
Complete system for managing external repairers with separate login portal, repair assignment tracking, and status updates.

## Backend Implementation

### Database Schema ✅
- `external_repairers` - Repairer profiles with login credentials
- `repair_assignments` - Links repairs to external repairers
- `repair_status_updates` - Status change history with notes and images
- Enum: RepairAssignmentStatus (ASSIGNED, IN_PROGRESS, COMPLETED, REJECTED, CANCELLED)

### API Endpoints (TODO)

#### Admin Endpoints (POS System):
- `POST /api/v1/external-repairers` - Create repairer profile
- `GET /api/v1/external-repairers` - Get all repairers
- `GET /api/v1/external-repairers/:id` - Get repairer details
- `PUT /api/v1/external-repairers/:id` - Update repairer
- `DELETE /api/v1/external-repairers/:id` - Deactivate repairer
- `POST /api/v1/repairs/:id/assign` - Assign repair to external repairer
- `GET /api/v1/repairs/:id/assignments` - Get repair assignments
- `GET /api/v1/repairs/:id/status-updates` - Get status update history

#### Repairer Portal Endpoints:
- `POST /api/v1/repairers/login` - Repairer login
- `GET /api/v1/repairers/my-repairs` - Get assigned repairs
- `GET /api/v1/repairers/repairs/:id` - Get repair details
- `PUT /api/v1/repairers/repairs/:id/status` - Update repair status
- `POST /api/v1/repairers/repairs/:id/updates` - Add status update with notes/images
- `GET /api/v1/repairers/stats` - Get repairer performance stats

## Frontend Implementation (TODO)

### A. POS System - Admin Features

#### 1. External Repairers Management Page (`src/pages/ExternalRepairersPage.tsx`)
```typescript
// Features:
// - List all external repairers with performance stats
// - Search and filter by specialization
// - Create new repairer profiles
// - View repairer details and assigned repairs
// - Deactivate/reactivate repairers
```

#### 2. Assign Repair Dialog (`src/components/repairs/AssignRepairDialog.tsx`)
```typescript
// Shown from Repair Detail page
// Features:
// - Select repairer from dropdown (filtered by specialization)
// - Set expected completion date
// - Add assignment notes
// - View repairer's current workload
// - Send notification to repairer
```

#### 3. Repair Assignment Tracking (`src/components/repairs/RepairAssignments.tsx`)
```typescript
// Section in Repair Detail showing:
// - Current assignment status
// - Assigned repairer info
// - Expected completion date
// - Status update timeline
// - Images uploaded by repairer
```

### B. External Repairer Portal (Separate App)

#### Create: `repairer-portal/` directory

#### 1. Repairer Login Page (`repairer-portal/src/pages/Login.tsx`)
```typescript
// Simple login form:
// - Email input
// - Password input
// - "Repairer Portal" branding
```

#### 2. Repairer Dashboard (`repairer-portal/src/pages/Dashboard.tsx`)
```typescript
// Features:
// - Stats cards (Assigned, In Progress, Completed This Month)
// - List of assigned repairs with priority
// - Quick status update buttons
// - Filters (All, In Progress, Pending)
```

#### 3. Repair Detail Page (`repairer-portal/src/pages/RepairDetail.tsx`)
```typescript
// Comprehensive repair view:
// - Customer info (name, contact)
// - Item description and issue
// - Repair images
// - Expected completion date
// - Status update form:
//   - Status dropdown
//   - Notes textarea
//   - Image upload (multiple)
//   - Submit button
// - Status history timeline
```

### Required Services:

#### Admin Service (`src/services/externalRepairerService.ts`)
```typescript
export interface ExternalRepairer {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  businessName?: string;
  specialization: string[];
  isActive: boolean;
  totalRepairs: number;
  completedRepairs: number;
  averageRating?: number;
  createdAt: string;
}

export interface RepairAssignment {
  id: string;
  repairId: string;
  repairerId: string;
  status: string;
  assignedAt: string;
  expectedCompletionDate?: string;
  completedAt?: string;
  assignmentNotes?: string;
  completionNotes?: string;
  repairer: {
    firstName: string;
    lastName: string;
    businessName?: string;
  };
}

export const externalRepairerService = {
  // Get all repairers
  getAll: () => apiClient.get('/external-repairers'),

  // Create repairer
  create: (data: {
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    businessName?: string;
    specialization?: string[];
    password: string;
  }) => apiClient.post('/external-repairers', data),

  // Update repairer
  update: (id: string, data: Partial<ExternalRepairer>) =>
    apiClient.put(`/external-repairers/${id}`, data),

  // Assign repair
  assignRepair: (repairId: string, data: {
    repairerId: string;
    expectedCompletionDate?: string;
    assignmentNotes?: string;
  }) => apiClient.post(`/repairs/${repairId}/assign`, data),

  // Get repair assignments
  getRepairAssignments: (repairId: string) =>
    apiClient.get(`/repairs/${repairId}/assignments`),

  // Get status updates
  getStatusUpdates: (repairId: string) =>
    apiClient.get(`/repairs/${repairId}/status-updates`),
};
```

#### Repairer Portal Service (`repairer-portal/src/services/repairerService.ts`)
```typescript
export const repairerService = {
  // Login
  login: (email: string, password: string) =>
    apiClient.post('/repairers/login', { email, password }),

  // Get assigned repairs
  getMyRepairs: () => apiClient.get('/repairers/my-repairs'),

  // Get repair details
  getRepairById: (id: string) => apiClient.get(`/repairers/repairs/${id}`),

  // Update repair status
  updateStatus: (id: string, data: {
    status: string;
    notes?: string;
    images?: string[];
  }) => apiClient.post(`/repairers/repairs/${id}/updates`, data),

  // Get stats
  getStats: () => apiClient.get('/repairers/stats'),
};
```

### Workflow Example:

1. **Admin creates external repairer profile**
   - Name: "John's Jewelry Repair"
   - Email: john@jewelryrepair.com
   - Specialization: ["Ring Sizing", "Stone Setting", "Polishing"]
   - Password: (auto-generated or admin-set)

2. **Customer brings in repair**
   - Admin creates repair in POS system
   - Repair requires "Stone Setting"

3. **Admin assigns repair to John**
   - Opens repair detail
   - Clicks "Assign to External Repairer"
   - Selects "John's Jewelry Repair"
   - Sets expected completion: 3 days
   - Adds note: "Please be careful with the antique setting"
   - System sends notification email to John

4. **John logs into Repairer Portal**
   - Uses john@jewelryrepair.com
   - Sees new repair in dashboard
   - Opens repair detail

5. **John updates status**
   - Changes status from "ASSIGNED" to "IN_PROGRESS"
   - Adds note: "Started work on stone setting"
   - Uploads 2 progress images

6. **Admin sees updates in POS**
   - Views repair detail
   - Sees timeline of John's updates
   - Views progress images

7. **John completes repair**
   - Changes status to "COMPLETED"
   - Adds note: "Stone securely set, prongs tightened"
   - Uploads 3 completion images
   - Admin receives notification

8. **Admin collects from John**
   - Views completed repair
   - Contacts customer
   - Updates main repair status to "READY_FOR_COLLECTION"

### UI Components Needed:

**POS System:**
1. `RepairersList` - Table of all external repairers
2. `CreateRepairerDialog` - Form to add new repairer
3. `AssignRepairDialog` - Assignment form
4. `RepairAssignmentCard` - Shows current assignment
5. `StatusUpdateTimeline` - Timeline of status changes

**Repairer Portal:**
1. `RepairCard` - Card showing assigned repair
2. `StatusUpdateForm` - Form to update status
3. `ImageUpload` - Multi-image upload component
4. `StatusBadge` - Assignment status indicator

### Specialization Options:
- Ring Sizing
- Stone Setting
- Prong Repair
- Chain Repair
- Watch Battery Replacement
- Watch Movement Repair
- Polishing & Cleaning
- Engraving
- Soldering
- Custom Design
- Appraisal
- Restoration

### Status Colors:
- ASSIGNED: Blue (#3B82F6)
- IN_PROGRESS: Yellow (#F59E0B)
- COMPLETED: Green (#10B981)
- REJECTED: Red (#EF4444)
- CANCELLED: Gray (#6B7280)

### Notifications:
**To Repairer:**
- New repair assigned
- Repair deadline approaching (1 day before)

**To Admin:**
- Repairer updated status
- Repair completed by repairer
- Repairer hasn't started work (2 days after assignment)

## Testing Checklist:
- [ ] Admin can create external repairer profiles
- [ ] Admin can assign repairs to repairers
- [ ] Repairer receives email notification on assignment
- [ ] Repairer can log into portal
- [ ] Repairer sees assigned repairs
- [ ] Repairer can update repair status
- [ ] Repairer can upload images
- [ ] Admin sees status updates in real-time
- [ ] Admin can view all status history
- [ ] Stats calculate correctly (completed repairs, etc.)
- [ ] Multiple repairers can work on same type of repairs
- [ ] Deactivated repairers cannot login

## Security Considerations:
- Separate JWT tokens for repairer portal
- Repairers can only see their assigned repairs
- Repairers cannot see other repairers' work
- Admin-only endpoints are protected
- Image uploads are validated and sanitized
- Rate limiting on status update endpoints

## Next Steps:
1. Create external repairer backend service
2. Create external repairer controller
3. Add module to app.module.ts
4. Create repairer portal as separate Vite app
5. Build admin UI for repairer management
6. Implement notification system
7. Add image upload functionality
8. Test complete workflow end-to-end
