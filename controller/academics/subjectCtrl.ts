import { Request, Response } from 'express';
import AsyncHandler from 'express-async-handler';
import Subject from '../../model/Academic/Subject';
import Program from '../../model/Academic/Program';
import { ISubject, IProgram } from '../../types/models';
import { Types } from 'mongoose';

// Request body interfaces
interface CreateSubjectBody {
  name: string;
  description?: string;
  academicTerm: Types.ObjectId;
}

interface UpdateSubjectBody {
  name?: string;
  description?: string;
  academicTerm?: Types.ObjectId;
}

/**
 * @description Create Subject
 * @route POST /api/admins/subjects/:programID
 * @access Private
 */
export const createSubject = AsyncHandler(async (req: Request<{ programID: string }, {}, CreateSubjectBody>, res: Response): Promise<void> => {
  const { name, description, academicTerm } = req.body;
  
  // find the program
  const programFound = await Program.findById(req.params.programID) as IProgram | null;
  if (!programFound) {
    throw new Error("Program not found");
  }
  
  // check if exists
  const subjectFound = await Subject.findOne({ name }).lean() as ISubject | null;
  if (subjectFound) {
    throw new Error("Subject already exists");
  }

  // create
  const subjectCreated = await Subject.create({
    name,
    description,
    academicTerm,
    createdBy: req.userAuth?._id
  }) as ISubject;

  // push the subject to program
  programFound.subjects?.push(subjectCreated._id);
  // save
  await programFound.save();

  res.status(201).json({
    status: "success",
    message: "Program Created Successfully",
    data: subjectCreated,
  });
});

/**
 * @description Get All Subjects
 * @route GET /api/admins/subjects
 * @access Private
 */
export const getSubjects = AsyncHandler(async (_req: Request, res: Response): Promise<void> => {
  res.status(200).json(res.results);
});

/**
 * @description Get Single Subject
 * @route GET /api/admins/subjects/:id
 * @access Private
 */
export const getSubject = AsyncHandler(async (req: Request<{ id: string }>, res: Response): Promise<void> => {
  const singleSubject = await Subject.findById(req.params.id) as ISubject | null;

  res.status(201).json({
    status: "success",
    message: "Single Subject fetched successfully",
    data: singleSubject
  });
});

/**
 * @description Update Subject
 * @route PUT /api/admins/subjects/:id
 * @access Private
 */
export const updateSubject = AsyncHandler(async (req: Request<{ id: string }, {}, UpdateSubjectBody>, res: Response): Promise<void> => {
  const { name, description, academicTerm } = req.body;
  
  const subjectFound = await Subject.findOne({ name }) as ISubject | null;
  if (subjectFound) {
    throw new Error("Subject already exists");
  }
  
  const subject = await Subject.findByIdAndUpdate(
    req.params.id,
    {
      name,
      description,
      academicTerm,
      createdBy: req.userAuth?._id,
    },
    {
      new: true, // return updated user instead of original one
    }
  ) as ISubject | null;

  res.status(201).json({
    status: "success",
    message: "Subject updated successfully",
    data: subject,
  });
});

/**
 * @description Delete Subject
 * @route DELETE /api/admins/subjects/:id
 * @access Private
 */
export const deleteSubject = AsyncHandler(async (req: Request<{ id: string }>, res: Response): Promise<void> => {
  await Subject.findByIdAndDelete(req.params.id);

  res.status(201).json({
    status: "success",
    message: "Subject Deleted Successfully",
  });
});
