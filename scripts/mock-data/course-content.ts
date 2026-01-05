/**
 * Mock Course Content (Segments) Data
 * Links courses to their custom content items
 */

import { mockId, PREFIXES } from './index';
import { COURSE_IDS } from './courses';
import { STAFF_IDS } from './staff';
import { customContent } from './custom-content';

// Course Content IDs
let courseContentCounter = 0;
const nextCourseContentId = () => mockId(PREFIXES.COURSE_CONTENT, ++courseContentCounter);

// Course IDs in order
const allCourseIds = [
  COURSE_IDS.EXP_C1, COURSE_IDS.EXP_C2, COURSE_IDS.EXP_C3, COURSE_IDS.EXP_C4, COURSE_IDS.EXP_C5,
  COURSE_IDS.CBT_C1, COURSE_IDS.CBT_C2, COURSE_IDS.CBT_C3, COURSE_IDS.CBT_C4, COURSE_IDS.CBT_C5,
  COURSE_IDS.EMDR_C1, COURSE_IDS.EMDR_C2, COURSE_IDS.EMDR_C3, COURSE_IDS.EMDR_C4, COURSE_IDS.EMDR_C5,
  COURSE_IDS.SOM_C1, COURSE_IDS.SOM_C2, COURSE_IDS.SOM_C3, COURSE_IDS.SOM_C4, COURSE_IDS.SOM_C5,
  COURSE_IDS.DBT_C1, COURSE_IDS.DBT_C2, COURSE_IDS.DBT_C3, COURSE_IDS.DBT_C4, COURSE_IDS.DBT_C5,
];

// Staff assignment by course range
function getCreatedBy(courseIdx: number) {
  if (courseIdx <= 5) return STAFF_IDS.WILLIAM;
  if (courseIdx <= 10) return STAFF_IDS.JANE;
  if (courseIdx <= 15) return STAFF_IDS.CHARLES;
  if (courseIdx <= 20) return STAFF_IDS.WILLIAM;
  return STAFF_IDS.JANE;
}

interface CourseContentItem {
  _id: ReturnType<typeof mockId>;
  course: ReturnType<typeof mockId>;
  contentType: 'custom';
  customContentId: ReturnType<typeof mockId>;
  order: number;
  isRequired: boolean;
  shortDescription: string;
  longDescription: string;
  createdBy: ReturnType<typeof mockId>;
}

export const courseContent: CourseContentItem[] = [];

// Build course content by iterating through courses and their segments
let customContentIdx = 0;

for (let courseIdx = 1; courseIdx <= 25; courseIdx++) {
  const courseId = allCourseIds[courseIdx - 1];
  const segmentCount = (courseIdx % 2 === 0) ? 3 : 2;
  const createdBy = getCreatedBy(courseIdx);

  for (let order = 1; order <= segmentCount; order++) {
    const customContentItem = customContent[customContentIdx];
    customContentIdx++;

    courseContent.push({
      _id: nextCourseContentId(),
      course: courseId,
      contentType: 'custom',
      customContentId: customContentItem._id,
      order,
      isRequired: true,
      shortDescription: `Segment ${order}: ${customContentItem.title}`,
      longDescription: `This is segment ${order} of the course, covering ${customContentItem.customType} content.`,
      createdBy,
    });
  }
}

// Export course content IDs for reference
export const COURSE_CONTENT_IDS = courseContent.map(cc => cc._id);
