# MPS Jewelry System - Testing Guide

## Overview

This document describes the comprehensive testing setup for the MPS Jewelry System using **Playwright-MCP** for end-to-end testing. The test suite covers authentication, API endpoints, and UI functionality.

## Test Structure

```
tests/
├── api/                    # API endpoint tests
│   ├── customers.spec.ts   # Customer CRUD operations
│   ├── products.spec.ts    # Product and inventory tests
│   └── sales.spec.ts       # Sales and transaction tests
├── auth/                   # Authentication tests
│   ├── login.spec.ts       # Login functionality
│   └── registration.spec.ts # User registration
├── ui/                     # Frontend UI tests
│   ├── dashboard.spec.ts   # Dashboard components
│   ├── customers.spec.ts   # Customer management UI
│   └── api-integration.spec.ts # API integration test page
├── fixtures/               # Test data and utilities
│   ├── auth.ts            # Authentication helpers
│   └── test-data.ts       # Mock data for tests
├── utils/                  # Testing utilities
│   └── test-helpers.ts    # Common test functions
├── global-setup.ts         # Global test setup
└── global-teardown.ts      # Global test cleanup
```

## Prerequisites

### 1. Install Dependencies
```bash
npm install
```

### 2. Install Playwright Browsers
```bash
npm run test:install
```

### 3. Set Up Environment

#### Frontend (Vite)
- Ensure the frontend runs on `http://localhost:8080`
- Start with: `npm run dev`

#### Backend (NestJS)
- Ensure the backend runs on `http://localhost:3000`
- Start with: `cd backend && npm run start:dev`

#### Database (PostgreSQL)
- Database: `mps_jewelry_db`
- User: `mps_user`
- Password: `MPS_Secure_2024!`
- Ensure database is running and migrated

## Running Tests

### Basic Test Commands

```bash
# Run all tests
npm test

# Run tests with UI mode (interactive)
npm run test:ui

# Run tests in headed mode (visible browser)
npm run test:headed

# Debug tests (step through)
npm run test:debug

# View test report
npm run test:report
```

### Categorized Test Commands

```bash
# Authentication tests only
npm run test:auth

# API endpoint tests only
npm run test:api

# UI tests only
npm run test:ui-tests
```

### Advanced Test Options

```bash
# Run specific test file
npx playwright test tests/auth/login.spec.ts

# Run tests in specific browser
npx playwright test --project=chromium

# Run tests with specific tag
npx playwright test --grep="@smoke"

# Run tests in parallel
npx playwright test --workers=4

# Generate test report
npx playwright test --reporter=html
```

## Test Configuration

The tests are configured in `playwright.config.ts`:

- **Browsers**: Chromium, Firefox, WebKit, Mobile Chrome, Mobile Safari
- **Base URLs**: Frontend (`http://localhost:8080`), Backend (`http://localhost:3000`)
- **Timeouts**: 10s action timeout, 5s assertion timeout
- **Retry**: 2 retries on CI, 0 locally
- **Screenshots**: On failure only
- **Videos**: On failure only
- **Traces**: On first retry

## Test Features

### 🔐 Authentication Tests
- **Login**: Valid/invalid credentials, validation, network errors
- **Registration**: New user creation, validation, duplicate prevention
- **Session**: Token persistence, logout, redirect handling

### 🌐 API Tests
- **Customers**: CRUD operations, search, pagination, validation
- **Products**: Inventory management, stock adjustments, barcode/SKU lookup
- **Sales**: Transaction processing, refunds, receipts, statistics
- **Error Handling**: Network failures, validation errors, authentication

### 🖥️ UI Tests
- **Dashboard**: Overview display, statistics, responsive design
- **Customer Management**: List, create, edit, delete, search
- **API Integration**: Test page for verifying frontend-backend connectivity
- **Responsive Design**: Mobile, tablet, desktop layouts

### 🛠️ Test Utilities

#### AuthFixture
```typescript
const auth = new AuthFixture(page);
await auth.loginAsTestUser();
await auth.logout();
```

#### TestHelpers
```typescript
const helpers = new TestHelpers(page);
await helpers.fillFormField('[data-testid="input"]', 'value');
await helpers.verifyToast('Success message');
await helpers.waitForApiResponse(/\/api\/endpoint/, 200);
```

#### Test Data
```typescript
import { testCustomers, testProducts } from '../fixtures/test-data';
// Use predefined test data for consistent testing
```

## Best Practices

### 1. Test Data Management
- Use `test-data.ts` fixtures for consistent test data
- Generate unique data using `helpers.generateRandomData()`
- Clean up created data in `afterEach` hooks

### 2. Selectors
- Use `data-testid` attributes for reliable element selection
- Avoid CSS selectors that may change with styling updates
- Use semantic selectors when `data-testid` is not available

### 3. API Testing
- Test both success and error scenarios
- Verify response structures and status codes
- Test edge cases like validation failures and network errors

### 4. UI Testing
- Test user workflows end-to-end
- Verify loading states and error handling
- Test responsive design on multiple viewports
- Use page object models for complex interactions

### 5. Async Handling
- Always await async operations
- Use `waitFor*` methods for dynamic content
- Handle network delays with appropriate timeouts

## Environment Variables

Create a `.env` file in the root directory:

```env
# Frontend
REACT_APP_API_BASE_URL=http://localhost:3000
REACT_APP_API_TIMEOUT=10000
REACT_APP_TENANT_ID=buymejewellery

# Database (for backend)
DATABASE_URL=postgresql://mps_user:MPS_Secure_2024!@localhost:5432/mps_jewelry_db?schema=public
```

## Debugging Tests

### 1. Debug Mode
```bash
npm run test:debug
```
Opens tests in debug mode where you can:
- Set breakpoints
- Step through code
- Inspect page state

### 2. Screenshots and Videos
Test failures automatically capture:
- Screenshots: `test-results/screenshots/`
- Videos: `test-results/videos/`
- Traces: `test-results/traces/`

### 3. Console Logs
View browser console logs in test output:
```typescript
page.on('console', msg => console.log(msg.text()));
```

### 4. Network Monitoring
Monitor API calls during tests:
```typescript
page.on('request', req => console.log('Request:', req.url()));
page.on('response', res => console.log('Response:', res.status()));
```

## CI/CD Integration

### GitHub Actions Example
```yaml
name: E2E Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npx playwright install --with-deps
      - run: npm run test
      - uses: actions/upload-artifact@v3
        if: failure()
        with:
          name: playwright-report
          path: playwright-report/
```

## Troubleshooting

### Common Issues

1. **Tests fail to start**
   - Check if frontend and backend servers are running
   - Verify database connection
   - Check environment variables

2. **Element not found errors**
   - Verify `data-testid` attributes exist in components
   - Check if elements are rendered conditionally
   - Increase timeout for dynamic content

3. **API errors in tests**
   - Verify backend server is running on port 3000
   - Check authentication tokens
   - Verify database connectivity

4. **Flaky tests**
   - Add proper waits for async operations
   - Use `waitForNetworkIdle()` for API calls
   - Increase timeouts for slow operations

### Getting Help

1. **View Test Report**: `npm run test:report`
2. **Check Screenshots**: Look in `test-results/screenshots/`
3. **Enable Debug Mode**: `npm run test:debug`
4. **Check Browser Console**: Enable console logging in tests

## Contributing

### Adding New Tests

1. Choose appropriate directory (`api/`, `ui/`, `auth/`)
2. Follow existing naming convention (`*.spec.ts`)
3. Use test data fixtures from `fixtures/test-data.ts`
4. Include setup/teardown for data cleanup
5. Add appropriate `data-testid` attributes to components
6. Write comprehensive test descriptions

### Test Patterns

```typescript
test.describe('Feature Name', () => {
  let helpers: TestHelpers;

  test.beforeEach(async ({ page }) => {
    helpers = new TestHelpers(page);
    // Setup for each test
  });

  test('should do something specific', async ({ page }) => {
    await test.step('Step description', async () => {
      // Test implementation
    });
  });
});
```

This testing setup provides comprehensive coverage of the MPS Jewelry System, ensuring reliability and quality across all components and integrations.