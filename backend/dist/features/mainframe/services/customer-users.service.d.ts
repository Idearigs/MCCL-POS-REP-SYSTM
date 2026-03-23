import { PrismaService } from '../../../core/prisma/prisma.service';
import { CredentialsExportService } from './credentials-export.service';
import { CreateCustomerUserDto, UpdateCustomerUserDto } from '../dto/customer-profile.dto';
export declare class CustomerUsersService {
    private prisma;
    private credentialsExportService;
    constructor(prisma: PrismaService, credentialsExportService: CredentialsExportService);
    create(dto: CreateCustomerUserDto): Promise<{
        user: {
            id: string;
            firstName: string;
            lastName: string;
            email: string;
            role: import("@prisma/client").$Enums.UserRole;
            isActive: boolean;
            mustChangePassword: boolean;
            createdAt: Date;
        };
        tempPassword: string;
    }>;
    findAllByProfile(profileId: string): Promise<{
        email: string;
        firstName: string;
        lastName: string;
        role: import("@prisma/client").$Enums.UserRole;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        isActive: boolean;
        phone: string;
        mustChangePassword: boolean;
        lastLoginAt: Date;
    }[]>;
    findOne(id: string): Promise<{
        email: string;
        firstName: string;
        lastName: string;
        role: import("@prisma/client").$Enums.UserRole;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        permissions: import("@prisma/client/runtime/library").JsonValue;
        isActive: boolean;
        phone: string;
        customerProfileId: string;
        customerProfile: {
            subdomain: string;
            businessName: string;
        };
        mustChangePassword: boolean;
        lastLoginAt: Date;
        loginAttempts: number;
        lockedUntil: Date;
    }>;
    update(id: string, dto: UpdateCustomerUserDto): Promise<{
        email: string;
        firstName: string;
        lastName: string;
        role: import("@prisma/client").$Enums.UserRole;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        isActive: boolean;
        phone: string;
    }>;
    resetPassword(id: string): Promise<{
        newPassword: string;
    }>;
    deactivate(id: string): Promise<{
        success: boolean;
    }>;
    delete(id: string): Promise<{
        success: boolean;
    }>;
    private hashPassword;
}
