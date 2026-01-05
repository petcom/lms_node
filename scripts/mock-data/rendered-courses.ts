/**
 * Mock Rendered Courses Data
 * All published courses (4 per program × 5 = 20) get a rendered course record
 */

import { mockId, PREFIXES } from './index';
import { COURSE_IDS } from './courses';

// Published courses only (excluding draft courses ending in C5)
const publishedCourseIds = [
  COURSE_IDS.EXP_C1, COURSE_IDS.EXP_C2, COURSE_IDS.EXP_C3, COURSE_IDS.EXP_C4,
  COURSE_IDS.CBT_C1, COURSE_IDS.CBT_C2, COURSE_IDS.CBT_C3, COURSE_IDS.CBT_C4,
  COURSE_IDS.EMDR_C1, COURSE_IDS.EMDR_C2, COURSE_IDS.EMDR_C3, COURSE_IDS.EMDR_C4,
  COURSE_IDS.SOM_C1, COURSE_IDS.SOM_C2, COURSE_IDS.SOM_C3, COURSE_IDS.SOM_C4,
  COURSE_IDS.DBT_C1, COURSE_IDS.DBT_C2, COURSE_IDS.DBT_C3, COURSE_IDS.DBT_C4,
];

const now = new Date();

export const renderedCourses = publishedCourseIds.map((courseId, idx) => ({
  _id: mockId(PREFIXES.RENDERED_COURSE, idx + 1),
  courseId: courseId,
  contentVersion: now,
  html: `<div class="rendered-course" data-course-id="${courseId.toString()}">
    <h1>Mock Rendered Course Content</h1>
    <p>This is the rendered HTML content for the course.</p>
    <div class="course-segments">
      <section class="segment">
        <h2>Segment 1</h2>
        <p>Content for segment 1...</p>
      </section>
      <section class="segment">
        <h2>Segment 2</h2>
        <p>Content for segment 2...</p>
      </section>
    </div>
  </div>`,
}));

export const RENDERED_COURSE_IDS = renderedCourses.map(rc => rc._id);
