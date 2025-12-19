import { Request, Response } from "express";
import AsyncHandler from "express-async-handler";
import ExamResult from "../../model/Academic/ExamResults";
import Student from "../../model/Academic/Student";

interface TogglePublishBody {
  publish: boolean;
}

/**
 * @description Exam results check
 * @route       POST /api/v1/exam-results/:id/check
 * @access      Private Students Only
 */
export const checkExamResults = AsyncHandler(async (req: Request<{ id: string }>, res: Response): Promise<void> => {
  // find the student with request object
  const studentFound = await Student.findById(req.userAuth?._id);
  if (!studentFound) {
    throw new Error("No student found");
  }
  // get exam result from database using params id and student's _id
  const examResult = await ExamResult.findOne({
    studentID: studentFound.studentId,
    _id: req.params.id,
  })
    .populate("exam")
    .populate("classLevel")
    .populate("academicTerm")
    .populate("academicYear");
  if (!examResult) {
    throw new Error("Exam results not found");
  }
  // check if exam is published
  if (examResult?.isPublished === false) {
    throw new Error("Exam results is not available, check out later");
  }
  res.json({
    status: "success",
    message: "Exam Results",
    data: examResult,
    student: studentFound,
  });
});

/**
 * @description Get all exam results (name, id)
 * @route       POST /api/v1/exam-results
 * @access      Private Students Only
 */
export const getExamResults = AsyncHandler(async (_req: Request, res: Response): Promise<void> => {
  const results = await ExamResult.find().select("exam").populate("exam");
  res.status(200).json({
    status: "success",
    message: "Exam results retrieved successfully",
    data: results,
  });
});

/**
 * @description Admin publish exam results
 * @route       PUT /api/v1/exam-results/:id/admin-toggle-publish
 * @access      Private Students Only
 */
export const adminToggleExamResult = AsyncHandler(async (req: Request<{ id: string }, {}, TogglePublishBody>, res: Response): Promise<void> => {
  // find the exam results
  const examResult = await ExamResult.findById(req.params.id);
  if (!examResult) {
    throw new Error("Exam result not found");
  }
  const publishResult = await ExamResult.findByIdAndUpdate(
    req.params.id,
    {
      isPublished: req.body.publish,
    },
    {
      new: true,
    }
  );
  res.status(200).json({
    status: "success",
    message: "Exam results Updated",
    data: publishResult,
  });
});
