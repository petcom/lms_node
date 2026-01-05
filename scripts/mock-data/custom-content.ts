/**
 * Mock Custom Content & Questions Data
 * Content types: quiz, exam, exercise, custom
 * Quizzes and exams have 2-3 questions each
 */

import { mockId, PREFIXES } from './index';
import { STAFF_IDS } from './staff';
import { DEPT_IDS } from './departments';

// Custom Content IDs (one per course segment)
// We'll create ~65 total (2-3 per course × 25 courses)
let customContentCounter = 0;
let questionCounter = 0;

const nextCustomContentId = () => mockId(PREFIXES.CUSTOM_CONTENT, ++customContentCounter);
const nextQuestionId = () => mockId(PREFIXES.QUESTION, ++questionCounter);

// Types to rotate through
const contentTypes = ['quiz', 'exam', 'exercise', 'custom'] as const;

// Generic questions for quizzes/exams
const genericQuestions = [
  {
    title: 'What is the primary goal of this therapeutic approach?',
    type: 'multiple-choice',
    options: ['Building connection', 'Challenging beliefs', 'Symptom reduction', 'Behavioral change'],
    correctAnswer: 0,
  },
  {
    title: 'Therapeutic attunement involves being present with the client.',
    type: 'true-false',
    correctAnswer: true,
  },
  {
    title: 'Which of the following is NOT a core skill in this approach?',
    type: 'multiple-choice',
    options: ['Active listening', 'Interpretation', 'Reflection', 'Presence'],
    correctAnswer: 1,
  },
  {
    title: 'Describe the key principles of this therapeutic method.',
    type: 'short-answer',
  },
  {
    title: 'The therapeutic relationship is secondary to technique.',
    type: 'true-false',
    correctAnswer: false,
  },
  {
    title: 'Which phase comes first in the treatment protocol?',
    type: 'multiple-choice',
    options: ['Assessment', 'Intervention', 'Termination', 'Evaluation'],
    correctAnswer: 0,
  },
];

// Generate custom content and questions for all courses
interface CustomContentItem {
  _id: ReturnType<typeof mockId>;
  title: string;
  customType: typeof contentTypes[number];
  department: ReturnType<typeof mockId>;
  createdBy: ReturnType<typeof mockId>;
  payload?: any;
  html?: string;
}

interface QuestionItem {
  _id: ReturnType<typeof mockId>;
  customContentId: ReturnType<typeof mockId>;
  title: string;
  type: string;
  options?: string[];
  correctAnswer?: number | boolean;
}

export const customContent: CustomContentItem[] = [];
export const questions: QuestionItem[] = [];

// Course segment titles by theme
const segmentTitles: Record<string, string[]> = {
  default: ['Introduction', 'Core Concepts', 'Practice Exercise', 'Assessment', 'Summary'],
};

// Helper to create content for a course
export function generateContentForCourse(
  courseIndex: number,
  department: ReturnType<typeof mockId>,
  createdBy: ReturnType<typeof mockId>,
  segmentCount: 2 | 3
): { contentIds: ReturnType<typeof mockId>[]; customContentItems: CustomContentItem[]; questionItems: QuestionItem[] } {
  const contentIds: ReturnType<typeof mockId>[] = [];
  const customContentItems: CustomContentItem[] = [];
  const questionItems: QuestionItem[] = [];

  for (let i = 0; i < segmentCount; i++) {
    const contentId = nextCustomContentId();
    contentIds.push(contentId);

    const contentType = contentTypes[(courseIndex + i) % contentTypes.length];
    const title = `Mock ${segmentTitles.default[i % segmentTitles.default.length]} ${courseIndex + 1}.${i + 1}`;

    const item: CustomContentItem = {
      _id: contentId,
      title,
      customType: contentType,
      department,
      createdBy,
    };

    // Add HTML for custom/exercise types
    if (contentType === 'custom' || contentType === 'exercise') {
      item.html = `<div class="mock-content"><h2>${title}</h2><p>This is mock ${contentType} content for testing purposes.</p></div>`;
    }

    customContentItems.push(item);

    // Generate questions for quiz/exam types
    if (contentType === 'quiz' || contentType === 'exam') {
      const questionCount = contentType === 'exam' ? 3 : 2;
      for (let q = 0; q < questionCount; q++) {
        const template = genericQuestions[(courseIndex + i + q) % genericQuestions.length];
        questionItems.push({
          _id: nextQuestionId(),
          customContentId: contentId,
          title: template.title,
          type: template.type,
          options: template.options,
          correctAnswer: template.correctAnswer,
        });
      }
    }
  }

  return { contentIds, customContentItems, questionItems };
}

// Pre-generate all content for all 25 courses
// Courses 1-25, with 2-3 segments each (alternating)
for (let courseIdx = 1; courseIdx <= 25; courseIdx++) {
  // Determine department and creator based on course
  let department = DEPT_IDS.MET;
  let createdBy = STAFF_IDS.WILLIAM;

  if (courseIdx >= 6 && courseIdx <= 10) {
    department = DEPT_IDS.MCS;
    createdBy = STAFF_IDS.JANE;
  } else if (courseIdx >= 11 && courseIdx <= 15) {
    department = DEPT_IDS.MTR;
    createdBy = STAFF_IDS.CHARLES;
  } else if (courseIdx >= 16 && courseIdx <= 20) {
    department = DEPT_IDS.MET;
    createdBy = STAFF_IDS.WILLIAM;
  } else if (courseIdx >= 21 && courseIdx <= 25) {
    department = DEPT_IDS.MCS;
    createdBy = STAFF_IDS.JANE;
  }

  const segmentCount = (courseIdx % 2 === 0) ? 3 : 2;
  const { customContentItems, questionItems } = generateContentForCourse(
    courseIdx,
    department,
    createdBy,
    segmentCount as 2 | 3
  );

  customContent.push(...customContentItems);
  questions.push(...questionItems);
}

// Export content IDs mapping for course-content generation
export const contentIdsByCourse: Record<number, ReturnType<typeof mockId>[]> = {};
let contentIdx = 0;
for (let courseIdx = 1; courseIdx <= 25; courseIdx++) {
  const segmentCount = (courseIdx % 2 === 0) ? 3 : 2;
  contentIdsByCourse[courseIdx] = [];
  for (let i = 0; i < segmentCount; i++) {
    contentIdsByCourse[courseIdx].push(customContent[contentIdx]._id);
    contentIdx++;
  }
}
