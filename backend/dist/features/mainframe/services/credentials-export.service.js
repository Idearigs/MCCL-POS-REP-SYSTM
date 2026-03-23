"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CredentialsExportService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../../core/prisma/prisma.service");
const crypto = __importStar(require("crypto"));
let CredentialsExportService = class CredentialsExportService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async generateCredentialsDocument(profileId) {
        const profile = await this.prisma.mf_customer_profiles.findUnique({
            where: { id: profileId },
            include: {
                subscription: true,
                customerUsers: true,
                enabledFeatures: {
                    include: { feature: true },
                },
            },
        });
        if (!profile) {
            throw new common_1.NotFoundException('Customer profile not found');
        }
        const usersWithPasswords = profile.customerUsers.map((user) => ({
            email: user.email,
            password: user.tempPassword || '[Password set by user]',
            role: user.role,
        }));
        return {
            businessName: profile.businessName,
            subdomain: profile.subdomain,
            fullDomain: `${profile.subdomain}.truedesk.co.uk`,
            adminEmail: profile.contactEmail,
            adminPassword: usersWithPasswords.find((u) => u.role === 'OWNER')?.password ||
                '[Not set]',
            users: usersWithPasswords,
            features: profile.enabledFeatures
                .filter((cf) => cf.isEnabled)
                .map((cf) => cf.feature.featureName),
            subscription: profile.subscription
                ? {
                    plan: profile.subscription.plan,
                    billingCycle: profile.subscription.billingCycle,
                    nextBillingDate: profile.subscription.nextBillingDate
                        .toISOString()
                        .split('T')[0],
                }
                : {
                    plan: 'Not configured',
                    billingCycle: 'N/A',
                    nextBillingDate: 'N/A',
                },
            createdAt: new Date().toISOString(),
        };
    }
    async generateHtmlDocument(profileId) {
        const creds = await this.generateCredentialsDocument(profileId);
        return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>TrueDesk - Account Credentials</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      max-width: 800px;
      margin: 0 auto;
      padding: 40px 20px;
      color: #1e293b;
      line-height: 1.6;
    }
    .header {
      text-align: center;
      margin-bottom: 40px;
      padding-bottom: 20px;
      border-bottom: 2px solid #e2e8f0;
    }
    .logo {
      font-size: 28px;
      font-weight: bold;
      color: #3b82f6;
      margin-bottom: 10px;
    }
    .title {
      font-size: 20px;
      color: #64748b;
    }
    .section {
      margin-bottom: 30px;
      padding: 20px;
      background: #f8fafc;
      border-radius: 12px;
      border: 1px solid #e2e8f0;
    }
    .section-title {
      font-size: 16px;
      font-weight: 600;
      color: #3b82f6;
      margin-bottom: 15px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .info-row {
      display: flex;
      margin-bottom: 10px;
      padding-bottom: 10px;
      border-bottom: 1px solid #e2e8f0;
    }
    .info-row:last-child {
      border-bottom: none;
      margin-bottom: 0;
      padding-bottom: 0;
    }
    .info-label {
      font-weight: 500;
      color: #64748b;
      width: 150px;
      flex-shrink: 0;
    }
    .info-value {
      font-weight: 600;
      color: #1e293b;
    }
    .credential-box {
      background: #1e293b;
      color: #f8fafc;
      padding: 12px 16px;
      border-radius: 8px;
      font-family: monospace;
      font-size: 14px;
    }
    .user-card {
      background: white;
      padding: 15px;
      border-radius: 8px;
      margin-bottom: 10px;
      border: 1px solid #e2e8f0;
    }
    .badge {
      display: inline-block;
      padding: 4px 10px;
      background: #3b82f6;
      color: white;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 500;
    }
    .features-list {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }
    .feature-tag {
      background: #dbeafe;
      color: #1e40af;
      padding: 6px 12px;
      border-radius: 20px;
      font-size: 13px;
    }
    .warning {
      background: #fef3c7;
      border: 1px solid #fcd34d;
      color: #92400e;
      padding: 15px;
      border-radius: 8px;
      margin-top: 30px;
    }
    .footer {
      text-align: center;
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #e2e8f0;
      color: #94a3b8;
      font-size: 14px;
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="logo">TrueDesk</div>
    <div class="title">Account Credentials & Setup Information</div>
  </div>

  <div class="section">
    <div class="section-title">Business Information</div>
    <div class="info-row">
      <span class="info-label">Business Name</span>
      <span class="info-value">${creds.businessName}</span>
    </div>
    <div class="info-row">
      <span class="info-label">Login URL</span>
      <span class="info-value">https://${creds.fullDomain}</span>
    </div>
    <div class="info-row">
      <span class="info-label">Subdomain</span>
      <span class="info-value">${creds.subdomain}</span>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Admin Login Credentials</div>
    <div class="info-row">
      <span class="info-label">Email</span>
      <span class="info-value">${creds.adminEmail}</span>
    </div>
    <div class="info-row">
      <span class="info-label">Temporary Password</span>
      <div class="credential-box">${creds.adminPassword}</div>
    </div>
  </div>

  ${creds.users.length > 1
            ? `
  <div class="section">
    <div class="section-title">User Accounts</div>
    ${creds.users
                .map((user) => `
    <div class="user-card">
      <div class="info-row">
        <span class="info-label">Email</span>
        <span class="info-value">${user.email}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Password</span>
        <div class="credential-box">${user.password}</div>
      </div>
      <div class="info-row">
        <span class="info-label">Role</span>
        <span class="badge">${user.role}</span>
      </div>
    </div>
    `)
                .join('')}
  </div>
  `
            : ''}

  <div class="section">
    <div class="section-title">Enabled Features</div>
    <div class="features-list">
      ${creds.features.map((f) => `<span class="feature-tag">${f}</span>`).join('')}
    </div>
  </div>

  <div class="section">
    <div class="section-title">Subscription Details</div>
    <div class="info-row">
      <span class="info-label">Plan</span>
      <span class="info-value">${creds.subscription.plan}</span>
    </div>
    <div class="info-row">
      <span class="info-label">Billing Cycle</span>
      <span class="info-value">${creds.subscription.billingCycle}</span>
    </div>
    <div class="info-row">
      <span class="info-label">Next Billing</span>
      <span class="info-value">${creds.subscription.nextBillingDate}</span>
    </div>
  </div>

  <div class="warning">
    <strong>Important:</strong> Please change your password after your first login.
    Keep this document secure and do not share it with unauthorized individuals.
  </div>

  <div class="footer">
    <p>Generated on ${new Date().toLocaleDateString('en-GB', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        })}</p>
    <p>TrueDesk &copy; ${new Date().getFullYear()} All rights reserved.</p>
  </div>
</body>
</html>
    `;
    }
    generateSecurePassword(length = 12) {
        const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        const lowercase = 'abcdefghijklmnopqrstuvwxyz';
        const numbers = '0123456789';
        const symbols = '@#$%&*!';
        const allChars = uppercase + lowercase + numbers + symbols;
        let password = '';
        password += uppercase[crypto.randomInt(uppercase.length)];
        password += lowercase[crypto.randomInt(lowercase.length)];
        password += numbers[crypto.randomInt(numbers.length)];
        password += symbols[crypto.randomInt(symbols.length)];
        for (let i = password.length; i < length; i++) {
            password += allChars[crypto.randomInt(allChars.length)];
        }
        return password
            .split('')
            .sort(() => crypto.randomInt(3) - 1)
            .join('');
    }
    async createUserWithCredentials(profileId, email, firstName, lastName, role = 'STAFF') {
        const tempPassword = this.generateSecurePassword();
        const passwordHash = await this.hashPassword(tempPassword);
        const user = await this.prisma.mf_customer_users.create({
            data: {
                customerProfileId: profileId,
                email: email.toLowerCase(),
                firstName,
                lastName,
                role: role,
                passwordHash,
                tempPassword,
                mustChangePassword: true,
            },
        });
        return {
            user,
            tempPassword,
        };
    }
    async hashPassword(password) {
        const hash = crypto.createHash('sha256');
        hash.update(password + process.env.PASSWORD_SALT || 'truedesk-salt');
        return hash.digest('hex');
    }
};
exports.CredentialsExportService = CredentialsExportService;
exports.CredentialsExportService = CredentialsExportService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], CredentialsExportService);
//# sourceMappingURL=credentials-export.service.js.map