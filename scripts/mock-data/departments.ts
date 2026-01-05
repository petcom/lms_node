/**
 * Mock Departments Data
 */

import { mockId, PREFIXES } from './index';

export const departments = [
  {
    _id: mockId(PREFIXES.DEPARTMENT, 1),
    name: 'Mock Experiential Therapy Dept',
    code: 'MET',
    level: 'top',
    parent: null,
    ancestors: [],
    passingStyleScore: 70,
  },
  {
    _id: mockId(PREFIXES.DEPARTMENT, 2),
    name: 'Mock Cognitive Sciences Dept',
    code: 'MCS',
    level: 'top',
    parent: null,
    ancestors: [],
    passingStyleScore: 75,
  },
  {
    _id: mockId(PREFIXES.DEPARTMENT, 3),
    name: 'Mock Trauma Recovery Dept',
    code: 'MTR',
    level: 'top',
    parent: null,
    ancestors: [],
    passingStyleScore: 80,
  },
];

// Export department IDs for reference
export const DEPT_IDS = {
  MET: mockId(PREFIXES.DEPARTMENT, 1),
  MCS: mockId(PREFIXES.DEPARTMENT, 2),
  MTR: mockId(PREFIXES.DEPARTMENT, 3),
};
