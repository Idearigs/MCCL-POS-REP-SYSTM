export interface TenantInfo {
    id: string;
    tenantId: string;
    tenantName: string;
}
export declare const CurrentTenant: (...dataOrPipes: unknown[]) => ParameterDecorator;
export declare const TenantId: (...dataOrPipes: unknown[]) => ParameterDecorator;
