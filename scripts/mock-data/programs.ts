/**
 * Mock Programs Data
 */

import { mockId, PREFIXES } from './index';
import { DEPT_IDS } from './departments';
import { STAFF_IDS } from './staff';

// Program IDs for reference
export const PROGRAM_IDS = {
  EXPERIENTIAL: mockId(PREFIXES.PROGRAM, 1),
  CBT: mockId(PREFIXES.PROGRAM, 2),
  EMDR: mockId(PREFIXES.PROGRAM, 3),
  SOMATIC: mockId(PREFIXES.PROGRAM, 4),
  DBT: mockId(PREFIXES.PROGRAM, 5),
};

export const programs = [
  {
    _id: PROGRAM_IDS.EXPERIENTIAL,
    name: 'Mock Experiential Therapy Fundamentals',
    description: 'Core experiential therapy techniques including gestalt, psychodrama, and expressive arts approaches',
    duration: '6 months',
    department: DEPT_IDS.MET,
    createdBy: STAFF_IDS.WILLIAM,
  },
  {
    _id: PROGRAM_IDS.CBT,
    name: 'Mock Cognitive Behavioral Therapy',
    description: 'Comprehensive CBT principles covering cognitive restructuring, behavioral activation, and exposure techniques',
    duration: '8 months',
    department: DEPT_IDS.MCS,
    createdBy: STAFF_IDS.JANE,
  },
  {
    _id: PROGRAM_IDS.EMDR,
    name: 'Mock EMDR Certification',
    description: 'Eye Movement Desensitization and Reprocessing training for trauma treatment',
    duration: '4 months',
    department: DEPT_IDS.MTR,
    createdBy: STAFF_IDS.CHARLES,
  },
  {
    _id: PROGRAM_IDS.SOMATIC,
    name: 'Mock Somatic Therapy Practice',
    description: 'Body-based therapeutic approaches including somatic experiencing and sensorimotor psychotherapy',
    duration: '6 months',
    department: DEPT_IDS.MET,
    createdBy: STAFF_IDS.WILLIAM,
  },
  {
    _id: PROGRAM_IDS.DBT,
    name: 'Mock Dialectical Behavior Therapy',
    description: 'DBT skills training including mindfulness, distress tolerance, emotion regulation, and interpersonal effectiveness',
    duration: '10 months',
    department: DEPT_IDS.MCS,
    createdBy: STAFF_IDS.JANE,
  },
];
