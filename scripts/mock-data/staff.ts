/**
 * Mock Staff & Users Data
 */

import { mockId, PREFIXES } from './index';
import { DEPT_IDS } from './departments';

// Staff IDs for reference
export const STAFF_IDS = {
  WILLIAM: mockId(PREFIXES.STAFF, 1),
  JANE: mockId(PREFIXES.STAFF, 2),
  CHARLES: mockId(PREFIXES.STAFF, 3),
  FLORENCE: mockId(PREFIXES.STAFF, 4),
};

// Users (Auth records) - same IDs as staff
export const users = [
  {
    _id: STAFF_IDS.WILLIAM,
    email: 'mock.william@example.com',
    passwordHash: '$2b$10$mockhashedpasswordwilliam000000000000000000',
    role: 'staff',
    status: 'active',
    subroles: ['instructor', 'department-admin'],
  },
  {
    _id: STAFF_IDS.JANE,
    email: 'mock.jane@example.com',
    passwordHash: '$2b$10$mockhashedpasswordjane0000000000000000000000',
    role: 'staff',
    status: 'active',
    subroles: ['instructor'],
  },
  {
    _id: STAFF_IDS.CHARLES,
    email: 'mock.charles@example.com',
    passwordHash: '$2b$10$mockhashedpasswordcharles00000000000000000',
    role: 'staff',
    status: 'active',
    subroles: ['instructor'],
  },
  {
    _id: STAFF_IDS.FLORENCE,
    email: 'mock.florence@example.com',
    passwordHash: '$2b$10$mockhashedpasswordflorence000000000000000',
    role: 'staff',
    status: 'active',
    subroles: ['content-admin', 'billing-admin'],
  },
];

// Staff records
export const staff = [
  {
    _id: STAFF_IDS.WILLIAM,
    name: { first: 'Mock William', last: 'Walton' },
    email: 'mock.william@example.com',
    department: DEPT_IDS.MET, // Primary department
    departmentMemberships: [
      {
        departmentId: DEPT_IDS.MET,
        roles: ['instructor', 'department-admin'],
      },
      {
        departmentId: DEPT_IDS.MCS,
        roles: ['instructor'],
      },
    ],
  },
  {
    _id: STAFF_IDS.JANE,
    name: { first: 'Mock Jane', last: 'Eyre' },
    email: 'mock.jane@example.com',
    department: DEPT_IDS.MCS,
    departmentMemberships: [
      {
        departmentId: DEPT_IDS.MCS,
        roles: ['instructor'],
      },
    ],
  },
  {
    _id: STAFF_IDS.CHARLES,
    name: { first: 'Mock Charles', last: 'Darwin' },
    email: 'mock.charles@example.com',
    department: DEPT_IDS.MTR, // Primary department
    departmentMemberships: [
      {
        departmentId: DEPT_IDS.MTR,
        roles: ['instructor'],
      },
      {
        departmentId: DEPT_IDS.MET,
        roles: ['instructor'],
      },
    ],
  },
  {
    _id: STAFF_IDS.FLORENCE,
    name: { first: 'Mock Florence', last: 'Nightingale' },
    email: 'mock.florence@example.com',
    department: DEPT_IDS.MCS,
    departmentMemberships: [
      {
        departmentId: DEPT_IDS.MCS,
        roles: ['content-admin', 'billing-admin'],
      },
    ],
  },
];
