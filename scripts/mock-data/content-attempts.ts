/**
 * Mock Content Attempts Data
 * Tracks individual segment/content attempts for learners
 * 
 * ContentAttempt fields: learner, courseContent, contentType, status, score, etc.
 */

import { mockId, PREFIXES } from './index';
import { LEARNER_IDS } from './learners';
import { courseContent } from './course-content';
import { customContent } from './custom-content';
import { COURSE_IDS } from './courses';

const now = new Date();
const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

// Helper to get course content IDs for a specific course
function getContentForCourse(courseId: ReturnType<typeof mockId>) {
  return courseContent.filter(cc => cc.course.toString() === courseId.toString());
}

// Helper to get the custom content type for a course content
function getCustomType(courseContentItem: typeof courseContent[0]) {
  const custom = customContent.find(
    cc => cc._id.toString() === courseContentItem.customContentId.toString()
  );
  return custom?.customType || 'custom';
}

let attemptCounter = 0;
const nextAttemptId = () => mockId(PREFIXES.CONTENT_ATTEMPT, ++attemptCounter);

interface ContentAttemptItem {
  _id: ReturnType<typeof mockId>;
  learner: ReturnType<typeof mockId>;
  courseContent: ReturnType<typeof mockId>;
  contentType: 'custom';
  customType: string;
  status: 'completed' | 'in_progress' | 'abandoned';
  score?: number;
  maxScore?: number;
  passed?: boolean;
  timeSpentSec: number;
  startedAt: Date;
  completedAt?: Date;
}

export const contentAttempts: ContentAttemptItem[] = [];

// Johnny Appleseed - EXP_C1 (completed all segments)
const exp1Content = getContentForCourse(COURSE_IDS.EXP_C1);
exp1Content.forEach((content, idx) => {
  contentAttempts.push({
    _id: nextAttemptId(),
    learner: LEARNER_IDS.JOHNNY,
    courseContent: content._id,
    contentType: 'custom',
    customType: getCustomType(content),
    status: 'completed',
    score: 85 + idx * 5,
    maxScore: 100,
    passed: true,
    timeSpentSec: 1200 + idx * 300,
    startedAt: oneMonthAgo,
    completedAt: twoWeeksAgo,
  });
});

// Johnny EXP_C2 (in progress)
const exp2Content = getContentForCourse(COURSE_IDS.EXP_C2);
if (exp2Content[0]) {
  contentAttempts.push({
    _id: nextAttemptId(),
    learner: LEARNER_IDS.JOHNNY,
    courseContent: exp2Content[0]._id,
    contentType: 'custom',
    customType: getCustomType(exp2Content[0]),
    status: 'completed',
    score: 90,
    maxScore: 100,
    passed: true,
    timeSpentSec: 1800,
    startedAt: twoWeeksAgo,
    completedAt: oneWeekAgo,
  });
}
if (exp2Content[1]) {
  contentAttempts.push({
    _id: nextAttemptId(),
    learner: LEARNER_IDS.JOHNNY,
    courseContent: exp2Content[1]._id,
    contentType: 'custom',
    customType: getCustomType(exp2Content[1]),
    status: 'in_progress',
    timeSpentSec: 600,
    startedAt: oneWeekAgo,
  });
}

// Emily Bronte - CBT_C1 (completed) and CBT_C2 (in progress)
const cbt1Content = getContentForCourse(COURSE_IDS.CBT_C1);
cbt1Content.forEach((content, idx) => {
  contentAttempts.push({
    _id: nextAttemptId(),
    learner: LEARNER_IDS.EMILY,
    courseContent: content._id,
    contentType: 'custom',
    customType: getCustomType(content),
    status: 'completed',
    score: 88 + idx * 4,
    maxScore: 100,
    passed: true,
    timeSpentSec: 1100 + idx * 200,
    startedAt: oneMonthAgo,
    completedAt: twoWeeksAgo,
  });
});

const cbt2Content = getContentForCourse(COURSE_IDS.CBT_C2);
if (cbt2Content[0]) {
  contentAttempts.push({
    _id: nextAttemptId(),
    learner: LEARNER_IDS.EMILY,
    courseContent: cbt2Content[0]._id,
    contentType: 'custom',
    customType: getCustomType(cbt2Content[0]),
    status: 'completed',
    score: 92,
    maxScore: 100,
    passed: true,
    timeSpentSec: 900,
    startedAt: twoWeeksAgo,
    completedAt: oneWeekAgo,
  });
}
if (cbt2Content[1]) {
  contentAttempts.push({
    _id: nextAttemptId(),
    learner: LEARNER_IDS.EMILY,
    courseContent: cbt2Content[1]._id,
    contentType: 'custom',
    customType: getCustomType(cbt2Content[1]),
    status: 'in_progress',
    timeSpentSec: 1200,
    startedAt: twoWeeksAgo,
  });
}

// Oscar Wilde - EMDR_C1 (in progress)
const emdr1Content = getContentForCourse(COURSE_IDS.EMDR_C1);
if (emdr1Content[0]) {
  contentAttempts.push({
    _id: nextAttemptId(),
    learner: LEARNER_IDS.OSCAR,
    courseContent: emdr1Content[0]._id,
    contentType: 'custom',
    customType: getCustomType(emdr1Content[0]),
    status: 'completed',
    score: 78,
    maxScore: 100,
    passed: true,
    timeSpentSec: 1500,
    startedAt: oneMonthAgo,
    completedAt: twoWeeksAgo,
  });
}
if (emdr1Content[1]) {
  contentAttempts.push({
    _id: nextAttemptId(),
    learner: LEARNER_IDS.OSCAR,
    courseContent: emdr1Content[1]._id,
    contentType: 'custom',
    customType: getCustomType(emdr1Content[1]),
    status: 'in_progress',
    timeSpentSec: 450,
    startedAt: twoWeeksAgo,
  });
}

// Virginia Woolf - SOM_C1 (completed) and SOM_C2 (in progress)
const som1Content = getContentForCourse(COURSE_IDS.SOM_C1);
som1Content.forEach((content, idx) => {
  contentAttempts.push({
    _id: nextAttemptId(),
    learner: LEARNER_IDS.VIRGINIA,
    courseContent: content._id,
    contentType: 'custom',
    customType: getCustomType(content),
    status: 'completed',
    score: 95 - idx * 3,
    maxScore: 100,
    passed: true,
    timeSpentSec: 1400 + idx * 250,
    startedAt: oneMonthAgo,
    completedAt: twoWeeksAgo,
  });
});

const som2Content = getContentForCourse(COURSE_IDS.SOM_C2);
if (som2Content[0]) {
  contentAttempts.push({
    _id: nextAttemptId(),
    learner: LEARNER_IDS.VIRGINIA,
    courseContent: som2Content[0]._id,
    contentType: 'custom',
    customType: getCustomType(som2Content[0]),
    status: 'in_progress',
    timeSpentSec: 800,
    startedAt: twoWeeksAgo,
  });
}

// Ernest Hemingway - DBT_C1 (completed), DBT_C2 (in progress)
const dbt1Content = getContentForCourse(COURSE_IDS.DBT_C1);
dbt1Content.forEach((content, idx) => {
  contentAttempts.push({
    _id: nextAttemptId(),
    learner: LEARNER_IDS.ERNEST,
    courseContent: content._id,
    contentType: 'custom',
    customType: getCustomType(content),
    status: 'completed',
    score: 82 + idx * 6,
    maxScore: 100,
    passed: true,
    timeSpentSec: 1000 + idx * 400,
    startedAt: oneMonthAgo,
    completedAt: twoWeeksAgo,
  });
});

const dbt2Content = getContentForCourse(COURSE_IDS.DBT_C2);
if (dbt2Content[0]) {
  contentAttempts.push({
    _id: nextAttemptId(),
    learner: LEARNER_IDS.ERNEST,
    courseContent: dbt2Content[0]._id,
    contentType: 'custom',
    customType: getCustomType(dbt2Content[0]),
    status: 'completed',
    score: 88,
    maxScore: 100,
    passed: true,
    timeSpentSec: 1100,
    startedAt: twoWeeksAgo,
    completedAt: oneWeekAgo,
  });
}
if (dbt2Content[1]) {
  contentAttempts.push({
    _id: nextAttemptId(),
    learner: LEARNER_IDS.ERNEST,
    courseContent: dbt2Content[1]._id,
    contentType: 'custom',
    customType: getCustomType(dbt2Content[1]),
    status: 'in_progress',
    timeSpentSec: 1300,
    startedAt: twoWeeksAgo,
  });
}

export const ATTEMPT_IDS = contentAttempts.map(ca => ca._id);
