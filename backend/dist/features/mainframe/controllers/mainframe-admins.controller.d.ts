import { MainframeAdminsService } from '../services/mainframe-admins.service';
export declare class MainframeAdminsController {
    private readonly mainframeAdminsService;
    constructor(mainframeAdminsService: MainframeAdminsService);
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
    login(data: {
        email: string;
        password: string;
    }): Promise<{
        id: string;
        firstName: string;
        lastName: string;
        email: string;
        role: string;
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
    changePassword(id: string, password: string): Promise<{
        success: boolean;
    }>;
}
