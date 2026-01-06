import { Request, Response } from 'express';
import AsyncHandler from 'express-async-handler';
import Exam from '../../model/Academic/Exam';
import Staff from '../../model/Staff/Staff';

interface CreateExamBody {
  name: string;
  description: string;
  course: string;
  program: string;
  academicTerm: string;
  duration: string;
  examDate: Date;
  examTime: string;
  programLevel?: string;
  examType: string;
  academicYear: string;
}

interface UpdateExamBody {
  name?: string;
  description?: string;
  course?: string;
  program?: string;
  academicTerm?: string;
  duration?: string;
  examDate?: Date;
  examTime?: string;
  programLevel?: string;
  examType?: string;
  academicYear?: string;
}

/**
 * @description Create Exam
 * @route       POST /api/v1/exams
 * @access      Private Instructors Only
 */
export const createExam = AsyncHandler(
  async (
    req: Request<Record<string, never>, any, CreateExamBody>,
    res: Response
  ): Promise<void> => {
    const {
      name,
      description,
      course,
      program,
      academicTerm,
      duration,
      examDate,
      examTime,
      programLevel,
      examType,
      academicYear,
    } = req.body;

    // find instructor
    const instructorFound = await Staff.findById(req.userAuth?._id);

    if (!instructorFound) {
      throw new Error('Staff member not found');
    }

    // check if exam exists
    const examExists = await Exam.findOne({ name });
    if (examExists) {
      throw new Error('Exam already exists!');
    }

    /**
     * Note: This is an alternative way to create an object using new Exam() very similiar to PHP/Laravel. Utilizing the `push()` method of mongoose I am pushing the examCreated object into the instructor object.
     */
    // create exam
    const examCreated = new Exam({
      name,
      description,
      academicTerm,
      academicYear,
      duration,
      examDate,
      examTime,
      examType,
      programLevel,
      createdBy: req.userAuth?._id,
      course,
      program,
    });

    // DCV-036: Removed examsCreated push - exams track their creator via createdBy
    // Query Exam.find({ createdBy: instructorId }) to get instructor's exams
    
    // save the exam
    await examCreated.save();
    // send response
    res.status(201).json({
      status: 'success',
      message: 'Exam created successfully',
      data: examCreated,
    });
  }
);

/**
 * @description Get All Exams
 * @route       GET /api/v1/exams
 * @access      Private
 *
 * Note: populating using an object allows more flexability to retrieve only the data we need
 * In the path, we are passing createdBy, which returns the instructor that created the question on the exam
 */
export const getExams = AsyncHandler(async (_req: Request, res: Response): Promise<void> => {
  res.status(200).json(res.results);
});

/**
 * @description Get Single Exam
 * @route       GET /api/v1/exams/:id
 * @access      Private Instructors Only
 */
export const getExam = AsyncHandler(
  async (req: Request<{ id: string }>, res: Response): Promise<void> => {
    const exam = await Exam.findById(req.params.id);

    res.status(201).json({
      status: 'success',
      message: 'Exam fetched successfully',
      data: exam,
    });
  }
);

/**
 * @description Update Exam
 * @route PUT /api/admins/exams/:id
 * @access Private staff only
 */
export const updateExam = AsyncHandler(
  async (req: Request<{ id: string }, any, UpdateExamBody>, res: Response): Promise<void> => {
    const {
      name,
      description,
      course,
      program,
      academicTerm,
      duration,
      examDate,
      examTime,
      programLevel,
      examType,
      academicYear,
    } = req.body;
    const examFound = await Exam.findOne({ name });

    if (examFound) {
      throw new Error('Exam already exists');
    }
    const examUpdated = await Exam.findByIdAndUpdate(
      req.params.id,
      {
        name,
        description,
        course,
        program,
        academicTerm,
        duration,
        examDate,
        examTime,
        programLevel,
        examType,
        academicYear,
        createdBy: req.userAuth?._id,
      },
      {
        new: true, // return updated user instead of original one
      }
    );

    res.status(201).json({
      status: 'success',
      message: 'Exam updated successfully',
      data: examUpdated,
    });
  }
);

/**
 * @description Delete Exam
 * @route DELETE /api/admins/exams/:id
 * @access Private Instructors
 */
export const deleteExam = AsyncHandler(
  async (req: Request<{ id: string }>, res: Response): Promise<void> => {
    await Exam.findByIdAndDelete(req.params.id);

    res.status(201).json({
      status: 'success',
      message: 'Exam Deleted Successfully',
    });
  }
);
