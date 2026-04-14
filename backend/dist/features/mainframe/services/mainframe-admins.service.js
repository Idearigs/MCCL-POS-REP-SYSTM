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
exports.MainframeAdminsService = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const prisma_service_1 = require("../../../core/prisma/prisma.service");
const crypto = __importStar(require("crypto"));
let MainframeAdminsService = class MainframeAdminsService {
    prisma;
    jwtService;
    constructor(prisma, jwtService) {
        this.prisma = prisma;
        this.jwtService = jwtService;
    }
    async create(data) {
        const existing = await this.prisma.mf_admins.findUnique({
            where: { email: data.email.toLowerCase() },
        });
        if (existing)
            throw new common_1.ConflictException('Admin with this email already exists');
        return this.prisma.mf_admins.create({
            data: {
                firstName: data.firstName,
                lastName: data.lastName,
                email: data.email.toLowerCase(),
                passwordHash: await this.hashPassword(data.password),
                role: data.role || 'admin',
            },
            select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                role: true,
                createdAt: true,
            },
        });
    }
    async findAll() {
        return this.prisma.mf_admins.findMany({
            select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                role: true,
                isActive: true,
                lastLoginAt: true,
                createdAt: true,
            },
            orderBy: { createdAt: 'desc' },
        });
    }
    async findOne(id) {
        const admin = await this.prisma.mf_admins.findUnique({
            where: { id },
            select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                role: true,
                permissions: true,
                isActive: true,
                lastLoginAt: true,
                createdAt: true,
            },
        });
        if (!admin)
            throw new common_1.NotFoundException('Admin not found');
        return admin;
    }
    async login(email, password) {
        if (!email || !password)
            throw new common_1.UnauthorizedException('Email and password are required');
        const admin = await this.prisma.mf_admins.findUnique({
            where: { email: email.toLowerCase() },
        });
        if (!admin || !admin.isActive)
            throw new common_1.UnauthorizedException('Invalid credentials');
        const passwordHash = await this.hashPassword(password);
        if (passwordHash !== admin.passwordHash)
            throw new common_1.UnauthorizedException('Invalid credentials');
        await this.prisma.mf_admins.update({
            where: { id: admin.id },
            data: { lastLoginAt: new Date() },
        });
        const adminData = {
            id: admin.id,
            firstName: admin.firstName,
            lastName: admin.lastName,
            email: admin.email,
            role: admin.role,
        };
        const token = this.jwtService.sign({
            sub: admin.id,
            email: admin.email,
            role: admin.role,
            type: 'mainframe_admin',
        });
        return { token, admin: adminData };
    }
    async update(id, data) {
        return this.prisma.mf_admins.update({
            where: { id },
            data,
            select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                role: true,
                isActive: true,
            },
        });
    }
    async changePassword(id, newPassword) {
        await this.prisma.mf_admins.update({
            where: { id },
            data: { passwordHash: await this.hashPassword(newPassword) },
        });
        return { success: true };
    }
    async hashPassword(password) {
        const hash = crypto.createHash('sha256');
        hash.update(password + (process.env.PASSWORD_SALT || 'truedesk-mainframe-salt'));
        return hash.digest('hex');
    }
};
exports.MainframeAdminsService = MainframeAdminsService;
exports.MainframeAdminsService = MainframeAdminsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        jwt_1.JwtService])
], MainframeAdminsService);
//# sourceMappingURL=mainframe-admins.service.js.map