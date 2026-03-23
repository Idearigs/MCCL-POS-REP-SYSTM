import { PrismaService } from '../../../core/prisma/prisma.service';
export declare class MainframeAdminsService {
    private prisma;
    constructor(prisma: PrismaService);
    create(data: {
        firstName: string;
        lastName: string;
        email: string;
        password: string;
        role?: string;
    }): Promise<{
        email: string;
        firstName: string;
        lastName: string;
        role: string;
        id: string;
        createdAt: Date;
    }>;
    findAll(): Promise<{
        email: string;
        firstName: string;
        lastName: string;
        role: string;
        id: string;
        createdAt: Date;
        isActive: boolean;
        lastLoginAt: Date;
    }[]>;
    findOne(id: string): Promise<{
        email: string;
        firstName: string;
        lastName: string;
        role: string;
        id: string;
        createdAt: Date;
        permissions: import("@prisma/client/runtime/library").JsonValue;
        isActive: boolean;
        lastLoginAt: Date;
    }>;
    login(email: string, password: string): Promise<{
        id: string;
        firstName: string;
        lastName: string;
        email: string;
        role: string;
    }>;
    update(id: string, data: {
        firstName?: string;
        lastName?: string;
        role?: string;
        isActive?: boolean;
    }): Promise<{
        email: string;
        firstName: string;
        lastName: string;
        role: string;
        id: string;
        isActive: boolean;
    }>;
    changePassword(id: string, newPassword: string): Promise<{
        success: boolean;
    }>;
    private hashPassword;
}
