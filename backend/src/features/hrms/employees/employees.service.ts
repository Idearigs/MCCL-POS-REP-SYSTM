import {
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../../core/prisma/prisma.service';
import { EncryptionService } from './encryption.service';
import {
  CreateEmployeeDto,
  UpdateEmployeeDto,
  EmployeeQueryDto,
  EmployeeResponseDto,
  CreateLeaveRequestDto,
  UpdateLeaveStatusDto,
  LeaveStatus,
} from './dto/employee.dto';

@Injectable()
export class EmployeesService {
  private readonly logger = new Logger(EmployeesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly encryption: EncryptionService,
  ) {}

  // ─── Employee Number ────────────────────────────────────────────────────────

  private async generateEmployeeNumber(tenantId: string): Promise<string> {
    const count = await this.prisma.hrms_employees.count({ where: { tenantId } });
    return `EMP${String(count + 1).padStart(4, '0')}`;
  }

  // ─── Pension Eligibility Check ──────────────────────────────────────────────

  private isPensionEligible(dob: Date | null, salary: number | null, hourlyRate: number | null, contractedHours: number | null): boolean {
    if (!dob) return false;
    const today = new Date();
    const age = today.getFullYear() - dob.getFullYear() - (today < new Date(today.getFullYear(), dob.getMonth(), dob.getDate()) ? 1 : 0);
    if (age < 22 || age >= 66) return false;

    // UK 2024/25: £10,000/year (£833/month) qualifying earnings threshold
    const annualEarnings = salary
      ? Number(salary)
      : hourlyRate && contractedHours
      ? Number(hourlyRate) * Number(contractedHours) * 52
      : 0;
    return annualEarnings >= 10000;
  }

  // ─── Map to Response ────────────────────────────────────────────────────────

  private mapToResponse(emp: any, includeSensitive = false): EmployeeResponseDto {
    const niDecrypted = this.encryption.decryptOptional(emp.niNumber);
    const sortCodeDecrypted = this.encryption.decryptOptional(emp.bankSortCode);
    const accountNoDecrypted = this.encryption.decryptOptional(emp.bankAccountNo);

    return {
      id: emp.id,
      tenantId: emp.tenantId,
      employeeNumber: emp.employeeNumber,
      title: emp.title,
      firstName: emp.firstName,
      middleName: emp.middleName,
      lastName: emp.lastName,
      fullName: [emp.firstName, emp.middleName, emp.lastName].filter(Boolean).join(' '),
      preferredName: emp.preferredName,
      gender: emp.gender,
      dateOfBirth: emp.dateOfBirth?.toISOString(),
      maritalStatus: emp.maritalStatus,
      nationality: emp.nationality,
      ethnicity: emp.ethnicity,
      personalEmail: emp.personalEmail,
      workEmail: emp.workEmail,
      personalPhone: emp.personalPhone,
      workPhone: emp.workPhone,
      addressLine1: emp.addressLine1,
      addressLine2: emp.addressLine2,
      city: emp.city,
      county: emp.county,
      postcode: emp.postcode,
      country: emp.country,
      departmentId: emp.departmentId,
      departmentName: emp.department?.name,
      positionId: emp.positionId,
      positionTitle: emp.position?.title,
      managerId: emp.managerId,
      jobTitle: emp.jobTitle,
      status: emp.status,
      employmentType: emp.employmentType,
      contractType: emp.contractType,
      startDate: emp.startDate?.toISOString(),
      endDate: emp.endDate?.toISOString(),
      probationEndDate: emp.probationEndDate?.toISOString(),
      noticePeriodDays: emp.noticePeriodDays,
      // Sensitive fields — always masked in list, optionally full in detail
      niNumberMasked: niDecrypted ? this.encryption.maskNi(niDecrypted) : undefined,
      taxCode: emp.taxCode,
      niCategory: emp.niCategory,
      payFrequency: emp.payFrequency,
      salary: emp.salary ? Number(emp.salary) : undefined,
      hourlyRate: emp.hourlyRate ? Number(emp.hourlyRate) : undefined,
      contractedHours: emp.contractedHours ? Number(emp.contractedHours) : undefined,
      bankName: emp.bankName,
      bankSortCodeMasked: sortCodeDecrypted ? this.encryption.maskSortCode(sortCodeDecrypted) : undefined,
      bankAccountNoMasked: accountNoDecrypted ? `****${accountNoDecrypted.slice(-4)}` : undefined,
      starterDeclaration: emp.starterDeclaration,
      p45Received: emp.p45Received,
      pensionEligible: emp.pensionEligible,
      pensionEnrolled: emp.pensionEnrolled,
      employerPensionPct: emp.employerPensionPct ? Number(emp.employerPensionPct) : undefined,
      employeePensionPct: emp.employeePensionPct ? Number(emp.employeePensionPct) : undefined,
      annualLeaveEntitlement: Number(emp.annualLeaveEntitlement),
      studentLoanPlan: emp.studentLoanPlan,
      rightToWorkChecked: emp.rightToWorkChecked,
      rightToWorkExpiry: emp.rightToWorkExpiry?.toISOString(),
      emergencyName: emp.emergencyName,
      emergencyPhone: emp.emergencyPhone,
      emergencyRelation: emp.emergencyRelation,
      notes: emp.notes,
      isActive: emp.isActive,
      createdAt: emp.createdAt.toISOString(),
      updatedAt: emp.updatedAt.toISOString(),
    };
  }

  // ─── Self-Service ────────────────────────────────────────────────────────────

  async findMe(email: string, tenantId: string): Promise<EmployeeResponseDto | null> {
    const emp = await this.prisma.hrms_employees.findFirst({
      where: {
        tenantId,
        isActive: true,
        OR: [{ workEmail: email }, { personalEmail: email }],
      },
      include: {
        department: { select: { id: true, name: true } },
        position:   { select: { id: true, title: true } },
      },
    });
    return emp ? this.mapToResponse(emp) : null;
  }

  // ─── CRUD ───────────────────────────────────────────────────────────────────

  async create(dto: CreateEmployeeDto, tenantId: string): Promise<EmployeeResponseDto> {
    const employeeNumber = await this.generateEmployeeNumber(tenantId);

    // Check work email uniqueness
    if (dto.workEmail) {
      const existing = await this.prisma.hrms_employees.findFirst({
        where: { tenantId, workEmail: dto.workEmail },
      });
      if (existing) throw new ConflictException(`Work email ${dto.workEmail} already in use`);
    }

    const dob = dto.dateOfBirth ? new Date(dto.dateOfBirth) : null;
    const pensionEligible = this.isPensionEligible(dob, dto.salary ?? null, dto.hourlyRate ?? null, dto.contractedHours ?? null);

    const employee = await this.prisma.hrms_employees.create({
      data: {
        tenantId,
        employeeNumber,
        title: dto.title as any,
        firstName: dto.firstName,
        middleName: dto.middleName,
        lastName: dto.lastName,
        preferredName: dto.preferredName,
        gender: dto.gender as any,
        dateOfBirth: dob,
        maritalStatus: dto.maritalStatus as any,
        nationality: dto.nationality,
        ethnicity: dto.ethnicity,
        personalEmail: dto.personalEmail,
        workEmail: dto.workEmail,
        personalPhone: dto.personalPhone,
        workPhone: dto.workPhone,
        addressLine1: dto.addressLine1,
        addressLine2: dto.addressLine2,
        city: dto.city,
        county: dto.county,
        postcode: dto.postcode,
        country: dto.country ?? 'GB',
        departmentId: dto.departmentId,
        positionId: dto.positionId,
        managerId: dto.managerId,
        jobTitle: dto.jobTitle,
        status: (dto.status as any) ?? 'PROBATION',
        employmentType: (dto.employmentType as any) ?? 'FULL_TIME',
        contractType: (dto.contractType as any) ?? 'PERMANENT',
        startDate: new Date(dto.startDate),
        endDate: dto.endDate ? new Date(dto.endDate) : null,
        probationEndDate: dto.probationEndDate ? new Date(dto.probationEndDate) : null,
        noticePeriodDays: dto.noticePeriodDays,
        niNumber: this.encryption.encryptOptional(dto.niNumber),
        taxCode: dto.taxCode ?? '1257L',
        niCategory: (dto.niCategory as any) ?? 'A',
        payFrequency: (dto.payFrequency as any) ?? 'MONTHLY',
        salary: dto.salary,
        hourlyRate: dto.hourlyRate,
        contractedHours: dto.contractedHours,
        bankAccountName: this.encryption.encryptOptional(dto.bankAccountName),
        bankSortCode: this.encryption.encryptOptional(dto.bankSortCode),
        bankAccountNo: this.encryption.encryptOptional(dto.bankAccountNo),
        bankName: dto.bankName,
        starterDeclaration: dto.starterDeclaration as any,
        p45Received: dto.p45Received ?? false,
        pensionEligible,
        pensionEnrolled: false,
        annualLeaveEntitlement: dto.annualLeaveEntitlement ?? 28,
        studentLoanPlan: dto.studentLoanPlan,
        rightToWorkChecked: dto.rightToWorkChecked ?? false,
        rightToWorkExpiry: dto.rightToWorkExpiry ? new Date(dto.rightToWorkExpiry) : null,
        emergencyName: dto.emergencyName,
        emergencyPhone: dto.emergencyPhone,
        emergencyRelation: dto.emergencyRelation,
        notes: dto.notes,
      },
      include: { department: true, position: true },
    });

    this.logger.log(`✅ Employee ${employeeNumber} created for tenant ${tenantId}`);
    return this.mapToResponse(employee);
  }

  async findAll(
    tenantId: string,
    query: EmployeeQueryDto,
  ): Promise<{ data: EmployeeResponseDto[]; meta: any }> {
    const { page = 1, limit = 20, search, status, departmentId, employmentType } = query;
    const skip = (page - 1) * limit;

    const where: any = { tenantId, isActive: true };
    if (status) where.status = status;
    if (departmentId) where.departmentId = departmentId;
    if (employmentType) where.employmentType = employmentType;
    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { employeeNumber: { contains: search, mode: 'insensitive' } },
        { workEmail: { contains: search, mode: 'insensitive' } },
        { jobTitle: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [employees, total] = await Promise.all([
      this.prisma.hrms_employees.findMany({
        where,
        include: { department: true, position: true },
        orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
        skip,
        take: limit,
      }),
      this.prisma.hrms_employees.count({ where }),
    ]);

    return {
      data: employees.map((e) => this.mapToResponse(e)),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasNextPage: page * limit < total,
        hasPrevPage: page > 1,
      },
    };
  }

  async findOne(id: string, tenantId: string): Promise<EmployeeResponseDto> {
    const employee = await this.prisma.hrms_employees.findFirst({
      where: { id, tenantId },
      include: { department: true, position: true },
    });
    if (!employee) throw new NotFoundException(`Employee ${id} not found`);
    return this.mapToResponse(employee);
  }

  async update(id: string, dto: UpdateEmployeeDto, tenantId: string): Promise<EmployeeResponseDto> {
    const existing = await this.prisma.hrms_employees.findFirst({ where: { id, tenantId } });
    if (!existing) throw new NotFoundException(`Employee ${id} not found`);

    if (dto.workEmail && dto.workEmail !== existing.workEmail) {
      const conflict = await this.prisma.hrms_employees.findFirst({
        where: { tenantId, workEmail: dto.workEmail, id: { not: id } },
      });
      if (conflict) throw new ConflictException(`Work email ${dto.workEmail} already in use`);
    }

    const dob = dto.dateOfBirth ? new Date(dto.dateOfBirth) : (existing.dateOfBirth ?? null);
    const pensionEligible = this.isPensionEligible(
      dob,
      dto.salary ?? (existing.salary ? Number(existing.salary) : null),
      dto.hourlyRate ?? (existing.hourlyRate ? Number(existing.hourlyRate) : null),
      dto.contractedHours ?? (existing.contractedHours ? Number(existing.contractedHours) : null),
    );

    const updateData: any = { pensionEligible, updatedAt: new Date() };

    const strFields = ['firstName', 'middleName', 'lastName', 'preferredName', 'nationality', 'ethnicity',
      'personalEmail', 'workEmail', 'personalPhone', 'workPhone', 'addressLine1', 'addressLine2',
      'city', 'county', 'postcode', 'country', 'departmentId', 'positionId', 'managerId', 'jobTitle',
      'taxCode', 'bankName', 'studentLoanPlan', 'emergencyName', 'emergencyPhone', 'emergencyRelation', 'notes'];
    strFields.forEach((f) => { if ((dto as any)[f] !== undefined) updateData[f] = (dto as any)[f]; });

    const enumFields = ['title', 'gender', 'maritalStatus', 'status', 'employmentType', 'contractType', 'niCategory', 'payFrequency', 'starterDeclaration'];
    enumFields.forEach((f) => { if ((dto as any)[f] !== undefined) updateData[f] = (dto as any)[f]; });

    const numFields = ['noticePeriodDays', 'salary', 'hourlyRate', 'contractedHours', 'annualLeaveEntitlement'];
    numFields.forEach((f) => { if ((dto as any)[f] !== undefined) updateData[f] = (dto as any)[f]; });

    const boolFields = ['p45Received', 'rightToWorkChecked'];
    boolFields.forEach((f) => { if ((dto as any)[f] !== undefined) updateData[f] = (dto as any)[f]; });

    if (dto.dateOfBirth !== undefined) updateData.dateOfBirth = dto.dateOfBirth ? new Date(dto.dateOfBirth) : null;
    if (dto.startDate !== undefined) updateData.startDate = new Date(dto.startDate);
    if (dto.endDate !== undefined) updateData.endDate = dto.endDate ? new Date(dto.endDate) : null;
    if (dto.probationEndDate !== undefined) updateData.probationEndDate = dto.probationEndDate ? new Date(dto.probationEndDate) : null;
    if (dto.rightToWorkExpiry !== undefined) updateData.rightToWorkExpiry = dto.rightToWorkExpiry ? new Date(dto.rightToWorkExpiry) : null;

    if (dto.niNumber !== undefined) updateData.niNumber = this.encryption.encryptOptional(dto.niNumber);
    if (dto.bankAccountName !== undefined) updateData.bankAccountName = this.encryption.encryptOptional(dto.bankAccountName);
    if (dto.bankSortCode !== undefined) updateData.bankSortCode = this.encryption.encryptOptional(dto.bankSortCode);
    if (dto.bankAccountNo !== undefined) updateData.bankAccountNo = this.encryption.encryptOptional(dto.bankAccountNo);

    const updated = await this.prisma.hrms_employees.update({
      where: { id },
      data: updateData,
      include: { department: true, position: true },
    });

    return this.mapToResponse(updated);
  }

  async remove(id: string, tenantId: string): Promise<void> {
    const existing = await this.prisma.hrms_employees.findFirst({ where: { id, tenantId } });
    if (!existing) throw new NotFoundException(`Employee ${id} not found`);
    // Soft delete
    await this.prisma.hrms_employees.update({
      where: { id },
      data: { isActive: false, status: 'TERMINATED' as any },
    });
  }

  // ─── Leave Requests ─────────────────────────────────────────────────────────

  async createLeaveRequest(
    employeeId: string,
    dto: CreateLeaveRequestDto,
    tenantId: string,
  ) {
    const employee = await this.prisma.hrms_employees.findFirst({ where: { id: employeeId, tenantId } });
    if (!employee) throw new NotFoundException(`Employee ${employeeId} not found`);

    const start = new Date(dto.startDate);
    const end = new Date(dto.endDate);
    if (end < start) throw new BadRequestException('End date must be after start date');

    // Simple working-day count (Mon–Fri)
    let days = 0;
    const cursor = new Date(start);
    while (cursor <= end) {
      const dow = cursor.getDay();
      if (dow !== 0 && dow !== 6) days++;
      cursor.setDate(cursor.getDate() + 1);
    }

    return this.prisma.hrms_leave_requests.create({
      data: {
        tenantId,
        employeeId,
        leaveType: dto.leaveType as any,
        status: 'PENDING' as any,
        startDate: start,
        endDate: end,
        days,
        notes: dto.notes,
      },
    });
  }

  async getLeaveRequests(employeeId: string, tenantId: string) {
    const employee = await this.prisma.hrms_employees.findFirst({ where: { id: employeeId, tenantId } });
    if (!employee) throw new NotFoundException(`Employee ${employeeId} not found`);

    return this.prisma.hrms_leave_requests.findMany({
      where: { employeeId, tenantId },
      orderBy: { startDate: 'desc' },
    });
  }

  async updateLeaveStatus(
    leaveId: string,
    dto: UpdateLeaveStatusDto,
    tenantId: string,
    approverId: string,
  ) {
    const leave = await this.prisma.hrms_leave_requests.findFirst({ where: { id: leaveId, tenantId } });
    if (!leave) throw new NotFoundException(`Leave request ${leaveId} not found`);

    return this.prisma.hrms_leave_requests.update({
      where: { id: leaveId },
      data: {
        status: dto.status as any,
        approvedById: dto.status === LeaveStatus.APPROVED ? approverId : null,
        approvedAt: dto.status === LeaveStatus.APPROVED ? new Date() : null,
        rejectedReason: dto.status === LeaveStatus.REJECTED ? dto.rejectedReason : null,
      },
    });
  }

  // ─── Departments ────────────────────────────────────────────────────────────

  async getDepartments(tenantId: string) {
    const depts = await this.prisma.hrms_departments.findMany({
      where: { tenantId, isActive: true },
      include: { _count: { select: { employees: { where: { isActive: true } } } } },
      orderBy: { name: 'asc' },
    });
    return depts.map((d) => ({
      id: d.id,
      tenantId: d.tenantId,
      name: d.name,
      code: d.code,
      description: d.description,
      managerId: d.managerId,
      isActive: d.isActive,
      employeeCount: d._count.employees,
      createdAt: d.createdAt.toISOString(),
      updatedAt: d.updatedAt.toISOString(),
    }));
  }

  async createDepartment(dto: any, tenantId: string) {
    if (dto.code) {
      const exists = await this.prisma.hrms_departments.findFirst({ where: { tenantId, code: dto.code } });
      if (exists) throw new ConflictException(`Department code ${dto.code} already exists`);
    }
    return this.prisma.hrms_departments.create({
      data: { tenantId, name: dto.name, code: dto.code, description: dto.description, managerId: dto.managerId },
    });
  }

  async updateDepartment(id: string, dto: any, tenantId: string) {
    const existing = await this.prisma.hrms_departments.findFirst({ where: { id, tenantId } });
    if (!existing) throw new NotFoundException(`Department ${id} not found`);
    return this.prisma.hrms_departments.update({ where: { id }, data: dto });
  }

  // ─── Positions ──────────────────────────────────────────────────────────────

  async getPositions(tenantId: string) {
    return this.prisma.hrms_positions.findMany({
      where: { tenantId, isActive: true },
      orderBy: { title: 'asc' },
    });
  }

  async createPosition(dto: any, tenantId: string) {
    if (dto.code) {
      const exists = await this.prisma.hrms_positions.findFirst({ where: { tenantId, code: dto.code } });
      if (exists) throw new ConflictException(`Position code ${dto.code} already exists`);
    }
    return this.prisma.hrms_positions.create({
      data: { tenantId, title: dto.title, code: dto.code, description: dto.description, department: dto.department },
    });
  }

  // ─── Dashboard Stats ────────────────────────────────────────────────────────

  async getStats(tenantId: string) {
    const [total, byStatus, byType, pendingLeave, probationEnding] = await Promise.all([
      this.prisma.hrms_employees.count({ where: { tenantId, isActive: true } }),
      this.prisma.hrms_employees.groupBy({
        by: ['status'],
        where: { tenantId, isActive: true },
        _count: { id: true },
      }),
      this.prisma.hrms_employees.groupBy({
        by: ['employmentType'],
        where: { tenantId, isActive: true },
        _count: { id: true },
      }),
      this.prisma.hrms_leave_requests.count({
        where: { tenantId, status: 'PENDING' as any },
      }),
      this.prisma.hrms_employees.count({
        where: {
          tenantId,
          isActive: true,
          status: 'PROBATION' as any,
          probationEndDate: { lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) },
        },
      }),
    ]);

    return {
      total,
      byStatus: Object.fromEntries(byStatus.map((s) => [s.status, s._count.id])),
      byEmploymentType: Object.fromEntries(byType.map((t) => [t.employmentType, t._count.id])),
      pendingLeaveRequests: pendingLeave,
      probationEndingSoon: probationEnding,
    };
  }
}
