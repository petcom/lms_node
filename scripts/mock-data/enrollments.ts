/**
 * Mock Program Enrollments Data
 * 
 * Enrollment pattern:
 * - Johnny Appleseed: Experiential (MET) active, CBT (MCS) active
 * - Emily Bronte: CBT (MCS) active, EMDR (MTR) active
 * - Oscar Wilde: EMDR (MTR) active, Somatic (MET) suspended
 * - Virginia Woolf: Somatic (MET) active
 * - Ernest Hemingway: DBT (MCS) active
 */

import { mockId, PREFIXES } from './index';
import { LEARNER_IDS } from './learners';
import { PROGRAM_IDS } from './programs';

const now = new Date();
const threeMonthsAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

export const programEnrollments = [
  // Johnny Appleseed - 2 programs, different departments (MET + MCS)
  {
    _id: mockId(PREFIXES.PROGRAM_ENROLLMENT, 1),
    learner: LEARNER_IDS.JOHNNY,
    program: PROGRAM_IDS.EXPERIENTIAL,
    status: 'active',
    enrolledAt: threeMonthsAgo,
  },
  {
    _id: mockId(PREFIXES.PROGRAM_ENROLLMENT, 2),
    learner: LEARNER_IDS.JOHNNY,
    program: PROGRAM_IDS.CBT,
    status: 'active',
    enrolledAt: threeMonthsAgo,
  },

  // Emily Bronte - 2 programs, different departments (MCS + MTR)
  {
    _id: mockId(PREFIXES.PROGRAM_ENROLLMENT, 3),
    learner: LEARNER_IDS.EMILY,
    program: PROGRAM_IDS.CBT,
    status: 'active',
    enrolledAt: threeMonthsAgo,
  },
  {
    _id: mockId(PREFIXES.PROGRAM_ENROLLMENT, 4),
    learner: LEARNER_IDS.EMILY,
    program: PROGRAM_IDS.EMDR,
    status: 'active',
    enrolledAt: threeMonthsAgo,
  },

  // Oscar Wilde - 2 programs, one active (MTR), one suspended (MET)
  {
    _id: mockId(PREFIXES.PROGRAM_ENROLLMENT, 5),
    learner: LEARNER_IDS.OSCAR,
    program: PROGRAM_IDS.EMDR,
    status: 'active',
    enrolledAt: threeMonthsAgo,
  },
  {
    _id: mockId(PREFIXES.PROGRAM_ENROLLMENT, 6),
    learner: LEARNER_IDS.OSCAR,
    program: PROGRAM_IDS.SOMATIC,
    status: 'withdrawn', // Suspended/withdrawn
    enrolledAt: threeMonthsAgo,
  },

  // Virginia Woolf - 1 program (MET)
  {
    _id: mockId(PREFIXES.PROGRAM_ENROLLMENT, 7),
    learner: LEARNER_IDS.VIRGINIA,
    program: PROGRAM_IDS.SOMATIC,
    status: 'active',
    enrolledAt: threeMonthsAgo,
  },

  // Ernest Hemingway - 1 program (MCS)
  {
    _id: mockId(PREFIXES.PROGRAM_ENROLLMENT, 8),
    learner: LEARNER_IDS.ERNEST,
    program: PROGRAM_IDS.DBT,
    status: 'active',
    enrolledAt: threeMonthsAgo,
  },
];

export const ENROLLMENT_IDS = programEnrollments.map(pe => pe._id);
