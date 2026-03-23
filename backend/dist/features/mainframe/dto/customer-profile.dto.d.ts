export declare enum CustomerProfileStatus {
    PENDING_SETUP = "PENDING_SETUP",
    ACTIVE = "ACTIVE",
    SUSPENDED = "SUSPENDED",
    MAINTENANCE = "MAINTENANCE",
    DEACTIVATED = "DEACTIVATED"
}
export declare enum SubscriptionPlan {
    STARTER = "STARTER",
    PROFESSIONAL = "PROFESSIONAL",
    BUSINESS = "BUSINESS",
    ENTERPRISE = "ENTERPRISE",
    CUSTOM = "CUSTOM"
}
export declare enum BillingCycle {
    MONTHLY = "MONTHLY",
    QUARTERLY = "QUARTERLY",
    YEARLY = "YEARLY"
}
export declare class CreateCustomerProfileDto {
    businessName: string;
    businessEmail: string;
    businessPhone?: string;
    businessAddress?: string;
    city?: string;
    country?: string;
    postalCode?: string;
    subdomain: string;
    customDomain?: string;
    contactFirstName: string;
    contactLastName: string;
    contactEmail: string;
    contactPhone?: string;
    logoUrl?: string;
    primaryColor?: string;
    secondaryColor?: string;
    internalNotes?: string;
    plan?: SubscriptionPlan;
    billingCycle?: BillingCycle;
    featureKeys?: string[];
}
export declare class UpdateCustomerProfileDto {
    businessName?: string;
    businessEmail?: string;
    businessPhone?: string;
    businessAddress?: string;
    city?: string;
    country?: string;
    postalCode?: string;
    customDomain?: string;
    status?: CustomerProfileStatus;
    contactFirstName?: string;
    contactLastName?: string;
    contactEmail?: string;
    contactPhone?: string;
    logoUrl?: string;
    primaryColor?: string;
    secondaryColor?: string;
    internalNotes?: string;
}
export declare class CreateCustomerUserDto {
    customerProfileId: string;
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    role?: string;
}
export declare class UpdateCustomerUserDto {
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
    role?: string;
    isActive?: boolean;
}
export declare class CustomerProfileResponseDto {
    id: string;
    businessName: string;
    businessEmail: string;
    subdomain: string;
    fullDomain: string;
    status: CustomerProfileStatus;
    contactName: string;
    contactEmail: string;
    subscription?: {
        plan: SubscriptionPlan;
        billingCycle: BillingCycle;
        currentUsers: number;
        maxUsers: number | null;
        isOnTrial: boolean;
        nextBillingDate: Date;
    };
    enabledFeatures: string[];
    createdAt: Date;
    updatedAt: Date;
}
