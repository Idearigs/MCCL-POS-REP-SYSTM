export declare class PaginationDto {
    page?: number;
    limit?: number;
    get skip(): number;
}
export declare class PaginationMetaDto {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
    constructor(page: number, limit: number, total: number);
}
export declare class SearchDto {
    search?: string;
}
export declare class SortDto {
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
}
export declare class PaginatedResponseDto<T> {
    data: T[];
    meta: PaginationMetaDto;
    constructor(data: T[], page: number, limit: number, total: number);
}
