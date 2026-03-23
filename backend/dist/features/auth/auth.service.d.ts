import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../core/prisma/prisma.service';
import { CacheService } from '../../core/cache/cache.service';
import { LoginDto, RegisterDto, AuthResponseDto, RefreshTokenDto, ChangePasswordDto } from './dto/auth.dto';
export declare class AuthService {
    private prismaService;
    private jwtService;
    private configService;
    private cacheService;
    private readonly logger;
    constructor(prismaService: PrismaService, jwtService: JwtService, configService: ConfigService, cacheService: CacheService);
    login(loginDto: LoginDto, tenantId: string): Promise<AuthResponseDto>;
    register(registerDto: RegisterDto, tenantId: string): Promise<AuthResponseDto>;
    refreshToken(refreshTokenDto: RefreshTokenDto): Promise<AuthResponseDto>;
    logout(userId: string): Promise<void>;
    changePassword(userId: string, changePasswordDto: ChangePasswordDto): Promise<void>;
    private generateTokens;
    provisionTenant(data: {
        tenantId: string;
        businessName: string;
        subdomain: string;
        ownerEmail: string;
        ownerFirstName: string;
        ownerLastName: string;
        ownerPassword: string;
    }): Promise<{
        tenantId: string;
        userId: string;
    }>;
    seedDefaultCategories(tenantId: string): Promise<void>;
    private getExpirationTime;
    getUsers(tenantId: string, role?: string, isActive?: boolean, page?: number, limit?: number): Promise<{
        data: any[];
        total: number;
        page: number;
        limit: number;
    }>;
    getUserById(tenantId: string, userId: string): Promise<any>;
    updateUser(tenantId: string, userId: string, updateData: any): Promise<any>;
    resetUserPassword(tenantId: string, userId: string, newPassword: string): Promise<void>;
}
