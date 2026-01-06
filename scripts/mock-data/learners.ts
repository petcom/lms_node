/**
 * Mock Learners Data
 */

import { mockId, PREFIXES } from './index';

// Learner IDs for reference
export const LEARNER_IDS = {
  JOHNNY: mockId(PREFIXES.LEARNER, 1),
  EMILY: mockId(PREFIXES.LEARNER, 2),
  OSCAR: mockId(PREFIXES.LEARNER, 3),
  VIRGINIA: mockId(PREFIXES.LEARNER, 4),
  ERNEST: mockId(PREFIXES.LEARNER, 5),
};

// User (Auth) records for learners - allows login
// Password for all: "MockLearner123!"
const LEARNER_PASSWORD_HASH = '$2a$10$G/XtAibhvb7U0LK17THbFux9gYO6CF02hZ/Klt.chZi35tcM.8eQC';

export const learnerUsers = [
  {
    _id: LEARNER_IDS.JOHNNY,
    email: 'mock.johnny@learner.com',
    passwordHash: LEARNER_PASSWORD_HASH,
    // DCV-001: Use roles array
    roles: ['learner'],
    primaryRole: 'learner',
    status: 'active',
  },
  {
    _id: LEARNER_IDS.EMILY,
    email: 'mock.emily@learner.com',
    passwordHash: LEARNER_PASSWORD_HASH,
    roles: ['learner'],
    primaryRole: 'learner',
    status: 'active',
  },
  {
    _id: LEARNER_IDS.OSCAR,
    email: 'mock.oscar@learner.com',
    passwordHash: LEARNER_PASSWORD_HASH,
    roles: ['learner'],
    primaryRole: 'learner',
    status: 'active',
  },
  {
    _id: LEARNER_IDS.VIRGINIA,
    email: 'mock.virginia@learner.com',
    passwordHash: LEARNER_PASSWORD_HASH,
    roles: ['learner'],
    primaryRole: 'learner',
    status: 'active',
  },
  {
    _id: LEARNER_IDS.ERNEST,
    email: 'mock.ernest@learner.com',
    passwordHash: LEARNER_PASSWORD_HASH,
    roles: ['learner'],
    primaryRole: 'learner',
    status: 'active',
  },
];

export const learners = [
  {
    _id: LEARNER_IDS.JOHNNY,
    name: { first: 'Mock Johnny', last: 'Appleseed' },
    email: 'mock.johnny@learner.com',
    learnerId: 'LRN001MOCKJA',
    globalStatus: 'active',
  },
  {
    _id: LEARNER_IDS.EMILY,
    name: { first: 'Mock Emily', last: 'Bronte' },
    email: 'mock.emily@learner.com',
    learnerId: 'LRN002MOCKEB',
    globalStatus: 'active',
  },
  {
    _id: LEARNER_IDS.OSCAR,
    name: { first: 'Mock Oscar', last: 'Wilde' },
    email: 'mock.oscar@learner.com',
    learnerId: 'LRN003MOCKOW',
    globalStatus: 'active',
  },
  {
    _id: LEARNER_IDS.VIRGINIA,
    name: { first: 'Mock Virginia', last: 'Woolf' },
    email: 'mock.virginia@learner.com',
    learnerId: 'LRN004MOCKVW',
    globalStatus: 'active',
  },
  {
    _id: LEARNER_IDS.ERNEST,
    name: { first: 'Mock Ernest', last: 'Hemingway' },
    email: 'mock.ernest@learner.com',
    learnerId: 'LRN005MOCKEH',
    globalStatus: 'active',
  },
];
