/**
 * Mock Learner Progress Data
 * Tracks segment-level progress for enrolled learners
 * 
 * Note: LearnerProgress in this system tracks per-segment (content) progress,
 * not course-level progress. Fields: learnerId, courseId, contentId, segmentId, etc.
 */

import { mockId, PREFIXES } from './index';
import { LEARNER_IDS } from './learners';
import { COURSE_IDS } from './courses';
import { courseContent } from './course-content';
import { customContent } from './custom-content';

const now = new Date();
const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

// Helper to get course content for a course
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

let progressCounter = 0;
const nextProgressId = () => mockId(PREFIXES.LEARNER_PROGRESS, ++progressCounter);

interface LearnerProgressItem {
  _id: ReturnType<typeof mockId>;
  learnerId: ReturnType<typeof mockId>;
  courseId: ReturnType<typeof mockId>;
  contentId: ReturnType<typeof mockId>;
  segmentId: string;
  contentType: 'custom';
  customType: string;
  status: 'not_started' | 'in_progress' | 'completed' | 'failed';
  progressPercent: number;
  score: number;
  maxScore: number;
  passed?: boolean;
  attemptCount: number;
  timeSpentSec: number;
  lastActivityAt: Date;
}

export const learnerProgress: LearnerProgressItem[] = [];

// Johnny Appleseed - EXP_C1 (completed all segments)
const johnnyExp1Content = getContentForCourse(COURSE_IDS.EXP_C1);
johnnyExp1Content.forEach((content, idx) => {
  learnerProgress.push({
    _id: nextProgressId(),
    learnerId: LEARNER_IDS.JOHNNY,
    courseId: COURSE_IDS.EXP_C1,
    contentId: content.customContentId,
    segmentId: `seg-${content.order}`,
    contentType: 'custom',
    customType: getCustomType(content),
    status: 'completed',
    progressPercent: 100,
    score: 85 + idx * 5,
    maxScore: 100,
    passed: true,
    attemptCount: 1,
    timeSpentSec: 1200 + idx * 300,
    lastActivityAt: twoWeeksAgo,
  });
});

// Johnny EXP_C2 (in progress - first segment done)
const johnnyExp2Content = getContentForCourse(COURSE_IDS.EXP_C2);
if (johnnyExp2Content[0]) {
  learnerProgress.push({
    _id: nextProgressId(),
    learnerId: LEARNER_IDS.JOHNNY,
    courseId: COURSE_IDS.EXP_C2,
    contentId: johnnyExp2Content[0].customContentId,
    segmentId: `seg-${johnnyExp2Content[0].order}`,
    contentType: 'custom',
    customType: getCustomType(johnnyExp2Content[0]),
    status: 'completed',
    progressPercent: 100,
    score: 90,
    maxScore: 100,
    passed: true,
    attemptCount: 1,
    timeSpentSec: 1500,
    lastActivityAt: twoWeeksAgo,
  });
}
if (johnnyExp2Content[1]) {
  learnerProgress.push({
    _id: nextProgressId(),
    learnerId: LEARNER_IDS.JOHNNY,
    courseId: COURSE_IDS.EXP_C2,
    contentId: johnnyExp2Content[1].customContentId,
    segmentId: `seg-${johnnyExp2Content[1].order}`,
    contentType: 'custom',
    customType: getCustomType(johnnyExp2Content[1]),
    status: 'in_progress',
    progressPercent: 40,
    score: 0,
    maxScore: 100,
    attemptCount: 0,
    timeSpentSec: 600,
    lastActivityAt: now,
  });
}

// Emily Bronte - CBT_C1 completed
const emilyCbt1Content = getContentForCourse(COURSE_IDS.CBT_C1);
emilyCbt1Content.forEach((content, idx) => {
  learnerProgress.push({
    _id: nextProgressId(),
    learnerId: LEARNER_IDS.EMILY,
    courseId: COURSE_IDS.CBT_C1,
    contentId: content.customContentId,
    segmentId: `seg-${content.order}`,
    contentType: 'custom',
    customType: getCustomType(content),
    status: 'completed',
    progressPercent: 100,
    score: 88 + idx * 4,
    maxScore: 100,
    passed: true,
    attemptCount: 1,
    timeSpentSec: 1100 + idx * 200,
    lastActivityAt: twoWeeksAgo,
  });
});

// Oscar Wilde - EMDR_C1 in progress
const oscarEmdr1Content = getContentForCourse(COURSE_IDS.EMDR_C1);
if (oscarEmdr1Content[0]) {
  learnerProgress.push({
    _id: nextProgressId(),
    learnerId: LEARNER_IDS.OSCAR,
    courseId: COURSE_IDS.EMDR_C1,
    contentId: oscarEmdr1Content[0].customContentId,
    segmentId: `seg-${oscarEmdr1Content[0].order}`,
    contentType: 'custom',
    customType: getCustomType(oscarEmdr1Content[0]),
    status: 'completed',
    progressPercent: 100,
    score: 78,
    maxScore: 100,
    passed: true,
    attemptCount: 1,
    timeSpentSec: 1500,
    lastActivityAt: oneMonthAgo,
  });
}

// Virginia Woolf - SOM_C1 completed
const virginiaSom1Content = getContentForCourse(COURSE_IDS.SOM_C1);
virginiaSom1Content.forEach((content, idx) => {
  learnerProgress.push({
    _id: nextProgressId(),
    learnerId: LEARNER_IDS.VIRGINIA,
    courseId: COURSE_IDS.SOM_C1,
    contentId: content.customContentId,
    segmentId: `seg-${content.order}`,
    contentType: 'custom',
    customType: getCustomType(content),
    status: 'completed',
    progressPercent: 100,
    score: 95 - idx * 3,
    maxScore: 100,
    passed: true,
    attemptCount: 1,
    timeSpentSec: 1400 + idx * 250,
    lastActivityAt: twoWeeksAgo,
  });
});

// Ernest Hemingway - DBT_C1 completed
const ernestDbt1Content = getContentForCourse(COURSE_IDS.DBT_C1);
ernestDbt1Content.forEach((content, idx) => {
  learnerProgress.push({
    _id: nextProgressId(),
    learnerId: LEARNER_IDS.ERNEST,
    courseId: COURSE_IDS.DBT_C1,
    contentId: content.customContentId,
    segmentId: `seg-${content.order}`,
    contentType: 'custom',
    customType: getCustomType(content),
    status: 'completed',
    progressPercent: 100,
    score: 82 + idx * 6,
    maxScore: 100,
    passed: true,
    attemptCount: 1,
    timeSpentSec: 1000 + idx * 400,
    lastActivityAt: twoWeeksAgo,
  });
});

export const PROGRESS_IDS = learnerProgress.map(lp => lp._id);
