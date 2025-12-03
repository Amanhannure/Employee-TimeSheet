// Mock data for testing without MongoDB
export const mockUsers = [
  {
    _id: '1',
    employeeId: 'ADMIN001',
    firstName: 'Super',
    lastName: 'Admin',
    username: 'admin',
    email: 'admin@company.com',
    role: 'admin',
    department: 'IT',
    passwordHash: '$2a$10$examplehashedpassword',
    status: 'active',
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    _id: '2', 
    employeeId: 'EMP001',
    firstName: 'Keshav',
    lastName: 'Mane',
    username: 'keshav.mane',
    email: 'keshav.mane@company.com',
    role: 'employee',
    department: 'Process',
    passwordHash: '$2a$10$examplehashedpassword',
    status: 'active',
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    _id: '3',
    employeeId: 'EMP002',
    firstName: 'Jane',
    lastName: 'Smith', 
    username: 'jane.smith',
    email: 'jane.smith@company.com',
    role: 'manager',
    department: 'HR',
    passwordHash: '$2a$10$examplehashedpassword',
    status: 'active',
    createdAt: new Date(),
    updatedAt: new Date()
  }
];

export const mockProjects = [
  {
    _id: '1',
    plNo: 'PL001',
    name: 'Website Redesign',
    totalHours: 120,
    juniorHours: 80,
    juniorCompleted: 65,
    seniorHours: 40,
    seniorCompleted: 30,
    status: 'active',
    startDate: '2024-01-15',
    endDate: '2024-03-15',
    assignedEmployees: ['2', '3'],
    departments: ['IT', 'HR']
  },
  {
    _id: '2',
    plNo: 'PL002', 
    name: 'Mobile App Development',
    totalHours: 200,
    juniorHours: 120,
    juniorCompleted: 90,
    seniorHours: 80,
    seniorCompleted: 60,
    status: 'active',
    assignedEmployees: ['2'],
    departments: ['IT']
  }
];

export const mockActivityCodes = [
  {
    _id: '1',
    code: 'A1',
    name: 'Process Calculation',
    department: 'Process',
    description: 'Pressure drop, line sizing, pump sizing calculations'
  },
  {
    _id: '2',
    code: 'A2',
    name: 'Heat & Mass Balance Development', 
    department: 'Process',
    description: ''
  },
  {
    _id: '3',
    code: 'A1',
    name: 'Desktop Support',
    department: 'IT',
    description: 'Desktop and laptop troubleshooting'
  }
];

export const mockTimesheets = [
  {
    _id: '1',
    employee: '2',
    employeeCode: 'EMP001',
    weekStartDate: '2024-01-15',
    weekEndDate: '2024-01-21',
    entries: [
      {
        date: '2024-01-15',
        projectCode: 'PL001',
        normalHours: 8,
        overtimeHours: 0,
        activityCode: 'A1',
        remarks: 'Process calculations'
      }
    ],
    totalNormalHours: 8,
    totalOvertimeHours: 0,
    status: 'approved'
  }
];