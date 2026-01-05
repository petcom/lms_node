/**
 * Mock Program Levels Data
 */

import { mockId, PREFIXES } from './index';
import { PROGRAM_IDS } from './programs';
import { DEPT_IDS } from './departments';
import { STAFF_IDS } from './staff';

// Program Level IDs for reference
export const LEVEL_IDS = {
  // Experiential Therapy (2 levels)
  EXP_L1: mockId(PREFIXES.PROGRAM_LEVEL, 1),
  EXP_L2: mockId(PREFIXES.PROGRAM_LEVEL, 2),
  // CBT (3 levels)
  CBT_L1: mockId(PREFIXES.PROGRAM_LEVEL, 3),
  CBT_L2: mockId(PREFIXES.PROGRAM_LEVEL, 4),
  CBT_L3: mockId(PREFIXES.PROGRAM_LEVEL, 5),
  // EMDR (2 levels)
  EMDR_L1: mockId(PREFIXES.PROGRAM_LEVEL, 6),
  EMDR_L2: mockId(PREFIXES.PROGRAM_LEVEL, 7),
  // Somatic (3 levels)
  SOM_L1: mockId(PREFIXES.PROGRAM_LEVEL, 8),
  SOM_L2: mockId(PREFIXES.PROGRAM_LEVEL, 9),
  SOM_L3: mockId(PREFIXES.PROGRAM_LEVEL, 10),
  // DBT (2 levels)
  DBT_L1: mockId(PREFIXES.PROGRAM_LEVEL, 11),
  DBT_L2: mockId(PREFIXES.PROGRAM_LEVEL, 12),
};

export const programLevels = [
  // Experiential Therapy Levels
  {
    _id: LEVEL_IDS.EXP_L1,
    program: PROGRAM_IDS.EXPERIENTIAL,
    name: 'Foundations',
    description: 'Introduction to experiential therapy principles and basic techniques',
    order: 1,
    department: DEPT_IDS.MET,
    createdBy: STAFF_IDS.WILLIAM,
    courses: [],
  },
  {
    _id: LEVEL_IDS.EXP_L2,
    program: PROGRAM_IDS.EXPERIENTIAL,
    name: 'Advanced Techniques',
    description: 'Advanced experiential interventions and integration methods',
    order: 2,
    department: DEPT_IDS.MET,
    createdBy: STAFF_IDS.WILLIAM,
    courses: [],
  },

  // CBT Levels
  {
    _id: LEVEL_IDS.CBT_L1,
    program: PROGRAM_IDS.CBT,
    name: 'CBT Basics',
    description: 'Fundamental CBT concepts and the cognitive model',
    order: 1,
    department: DEPT_IDS.MCS,
    createdBy: STAFF_IDS.JANE,
    courses: [],
  },
  {
    _id: LEVEL_IDS.CBT_L2,
    program: PROGRAM_IDS.CBT,
    name: 'Cognitive Restructuring',
    description: 'Identifying and challenging cognitive distortions',
    order: 2,
    department: DEPT_IDS.MCS,
    createdBy: STAFF_IDS.JANE,
    courses: [],
  },
  {
    _id: LEVEL_IDS.CBT_L3,
    program: PROGRAM_IDS.CBT,
    name: 'Behavioral Activation',
    description: 'Behavioral interventions and activity scheduling',
    order: 3,
    department: DEPT_IDS.MCS,
    createdBy: STAFF_IDS.JANE,
    courses: [],
  },

  // EMDR Levels
  {
    _id: LEVEL_IDS.EMDR_L1,
    program: PROGRAM_IDS.EMDR,
    name: 'Protocol Training',
    description: 'Standard EMDR protocol and phases',
    order: 1,
    department: DEPT_IDS.MTR,
    createdBy: STAFF_IDS.CHARLES,
    courses: [],
  },
  {
    _id: LEVEL_IDS.EMDR_L2,
    program: PROGRAM_IDS.EMDR,
    name: 'Clinical Application',
    description: 'EMDR with complex trauma and special populations',
    order: 2,
    department: DEPT_IDS.MTR,
    createdBy: STAFF_IDS.CHARLES,
    courses: [],
  },

  // Somatic Levels
  {
    _id: LEVEL_IDS.SOM_L1,
    program: PROGRAM_IDS.SOMATIC,
    name: 'Body Awareness',
    description: 'Developing somatic awareness and tracking skills',
    order: 1,
    department: DEPT_IDS.MET,
    createdBy: STAFF_IDS.WILLIAM,
    courses: [],
  },
  {
    _id: LEVEL_IDS.SOM_L2,
    program: PROGRAM_IDS.SOMATIC,
    name: 'Movement Integration',
    description: 'Integrating movement and sensation in therapy',
    order: 2,
    department: DEPT_IDS.MET,
    createdBy: STAFF_IDS.WILLIAM,
    courses: [],
  },
  {
    _id: LEVEL_IDS.SOM_L3,
    program: PROGRAM_IDS.SOMATIC,
    name: 'Trauma Release',
    description: 'Somatic approaches to trauma resolution',
    order: 3,
    department: DEPT_IDS.MET,
    createdBy: STAFF_IDS.WILLIAM,
    courses: [],
  },

  // DBT Levels
  {
    _id: LEVEL_IDS.DBT_L1,
    program: PROGRAM_IDS.DBT,
    name: 'Mindfulness Core',
    description: 'DBT mindfulness skills and wise mind concepts',
    order: 1,
    department: DEPT_IDS.MCS,
    createdBy: STAFF_IDS.JANE,
    courses: [],
  },
  {
    _id: LEVEL_IDS.DBT_L2,
    program: PROGRAM_IDS.DBT,
    name: 'Distress Tolerance',
    description: 'Crisis survival skills and radical acceptance',
    order: 2,
    department: DEPT_IDS.MCS,
    createdBy: STAFF_IDS.JANE,
    courses: [],
  },
];
