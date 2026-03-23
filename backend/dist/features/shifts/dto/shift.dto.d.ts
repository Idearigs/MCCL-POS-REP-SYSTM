import { ShiftStatus } from '@prisma/client';
export declare class StartShiftDto {
    openingFloat: number;
    openingNotes?: string;
}
export declare class CloseShiftDto {
    closingFloat: number;
    closingNotes?: string;
}
export declare class GetShiftsDto {
    startDate: string;
    endDate: string;
    userId?: string;
    status?: ShiftStatus;
}
