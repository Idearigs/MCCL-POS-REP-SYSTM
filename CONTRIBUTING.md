# Contributing to MPS Jewelry SaaS

## Development Workflow

### 1. Branch Creation
```bash
# For new features
git checkout develop
git pull origin develop
git checkout -b feature/your-feature-name

# For bug fixes
git checkout develop
git pull origin develop
git checkout -b bugfix/your-bug-description

# For hotfixes (emergency)
git checkout main
git pull origin main
git checkout -b hotfix/critical-issue-name
```

### 2. Development
- Make your changes
- Test thoroughly
- Follow code conventions
- Add documentation

### 3. Commit Standards
```bash
# Use conventional commits
git commit -m "feat: add JWT authentication system"
git commit -m "fix: resolve customer API connection issue"
git commit -m "docs: update API documentation"
git commit -m "refactor: standardize API configuration"
```

### 4. Pull Request Process
1. Push your branch to origin
2. Create PR to develop (not main)
3. Ensure all tests pass
4. Get code review approval
5. Merge to develop

### 5. Release Process
```bash
# Create release branch from develop
git checkout develop
git pull origin develop
git checkout -b release/v1.0.0

# Finalize release, then merge to main
git checkout main
git merge release/v1.0.0
git tag v1.0.0
git push origin main --tags
```

## Current Priority Branches

### Immediate (Week 1)
- `feature/api-standardization` - Fix API configuration issues
- `feature/pos-backend` - Complete transaction system
- `feature/jwt-auth` - Implement authentication

### Next Phase (Week 2-3)
- `feature/payment-integration` - Stripe/Square integration
- `feature/repair-backend` - Complete repair management
- `release/v1.0.0` - First production release

## Code Standards
- TypeScript for all new code
- Follow existing patterns
- Add proper error handling
- Include unit tests
- Document public APIs