import Course from '../../../model/Content/Course';
import CourseContent from '../../../model/Academic/CourseContent';
import CustomContent from '../../../model/Content/CustomContent';
import ProgramLevel from '../../../model/Academic/ProgramLevel';

describe('Course catalog schemas', () => {
  it('defines course catalog fields and defaults', () => {
    const statusPath: any = Course.schema.path('status');
    expect(statusPath).toBeTruthy();
    expect(statusPath.enumValues).toEqual(['draft', 'rendered', 'published']);
    expect(statusPath.options.default).toBe('draft');

    expect(Course.schema.path('shortDescription')).toBeTruthy();
    expect(Course.schema.path('longDescription')).toBeTruthy();
    expect(Course.schema.path('publishedAt')).toBeTruthy();
    expect(Course.schema.path('publishedBy')).toBeTruthy();

    const primaryPath: any = Course.schema.path('primaryInstructors');
    const secondaryPath: any = Course.schema.path('secondaryInstructors');
    expect(primaryPath?.instance).toBe('Array');
    expect(primaryPath?.caster?.options?.ref).toBe('Staff');
    expect(secondaryPath?.instance).toBe('Array');
    expect(secondaryPath?.caster?.options?.ref).toBe('Staff');
  });

  it('defines program level course references', () => {
    const coursesPath: any = ProgramLevel.schema.path('courses');
    expect(coursesPath?.instance).toBe('Array');
    expect(coursesPath?.caster?.options?.ref).toBe('Course');
  });

  it('defines course content descriptions', () => {
    expect(CourseContent.schema.path('shortDescription')).toBeTruthy();
    expect(CourseContent.schema.path('longDescription')).toBeTruthy();
  });

  // DCV-046: 'scorm' removed from customType enum - use CourseContent.scormPackageId
  it('defines custom content types without scorm', () => {
    const customTypePath: any = CustomContent.schema.path('customType');
    expect(customTypePath.enumValues).toEqual(['exam', 'quiz', 'exercise', 'custom']);
  });
});
