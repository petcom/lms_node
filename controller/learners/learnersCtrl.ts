import AsyncHandler from 'express-async-handler';
import { Request, Response } from 'express';
import Learner from '../../model/Academic/Learner';
import { hashPassword, isPassMatched } from '../../utils/helpers';
import generateToken from '../../utils/generateToken';
import Exam from '../../model/Academic/Exam';
import ExamResult from '../../model/Academic/ExamResults';
import Admin from '../../model/Staff/Admin';
import User from '../../model/Auth/User';
import { ILearner } from '../../types/models-types';
import { normalizePersonName, PersonNameInput } from '../../utils/person';

// Request body interfaces
interface RegisterLearnerBody {
  name: PersonNameInput;
  email: string;
  password: string;
}

interface LoginBody {
  email: string;
  password: string;
}

interface UpdateProfileBody {
  email?: string;
  password?: string;
}

interface AdminUpdateLearnerBody {
  name?: PersonNameInput;
  email?: string;
}

interface WriteExamBody {
  answers: string[];
}

interface AnsweredQuestion {
  question: string;
  correctAnswers: string;
  isCorrect?: boolean;
}

/**
 * @description Admin Register Learner
 * @route       POST /api/learners/admins/register
 * @access      Private Admin Only
 */
export const adminRegisterLearner = AsyncHandler(
  async (req: Request<{}, {}, RegisterLearnerBody>, res: Response): Promise<void> => {
    const { name, email, password } = req.body;
    const normalizedName = normalizePersonName(name);
    // find the admin
    const adminFound = await Admin.findById(req.userAuth?._id);
    if (!adminFound) {
      throw new Error('Admin not found');
    }
    // check if the learner already exists
    const learnerUser = await User.findOne({ email });
    if (learnerUser) {
      throw new Error('Learner already exists');
    }
    //hash password
    const hashedPassword = await hashPassword(password);
    // DCV-001: Use roles array instead of role field
    const user = await User.create({
      email,
      passwordHash: hashedPassword,
      roles: ['learner'],
      primaryRole: 'learner',
      status: 'active',
    });
    // Learner created
    const learnerRegistered = await Learner.create({
      _id: user._id,
      name: normalizedName ?? name,
      email,
    });
    // push instructor into admin
    adminFound.learners?.push(learnerRegistered?._id);
    await adminFound.save();
    // send response
    res.status(201).json({
      status: 'success',
      message: 'Learner registered Successfuly',
      data: learnerRegistered,
    });
  }
);

/**
 * @description Login a Learner
 * @route       POST /api/learners/login
 * @access      Public
 */
export const loginLearner = AsyncHandler(
  async (req: Request<{}, {}, LoginBody>, res: Response): Promise<void> => {
    const { email, password } = req.body;

    // DCV-001: Query using roles array
    const learnerUser = await User.findOne({ email, roles: 'learner' });
    const learner = learnerUser ? await Learner.findById(learnerUser._id).lean() : null;
    if (!learner) {
      res.json({ message: 'Invalid login credentials' });
      return;
    }
    // verify the password
    const isMatched = learnerUser
      ? await isPassMatched(password, learnerUser.passwordHash)
      : false;
    if (!isMatched) {
      res.json({ message: 'Invalid login credentials' });
      return;
    } else {
      // DCV-001: Use primaryRole for token generation
      const accessToken = generateToken(String(learner?._id), learnerUser?.primaryRole || 'learner');
      await User.updateOne({ _id: learner?._id }, { $set: { lastLoginAt: new Date() } });

      res.status(200).json({
        status: 'success',
        message: 'Learner logged in successfully',
        data: {
          accessToken,
          // DCV-001: Provide both role and roles for backward compatibility
          role: learnerUser?.primaryRole || 'learner',
          roles: learnerUser?.roles || ['learner'],
        },
      });
    }
  }
);

/**
 * @description Learner Profile
 * @route       Get /api/learners/profile
 * @access      Private Learner only
 */
export const getLearnerProfile = AsyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const learner = await Learner.findById(req.userAuth?._id)
      .select('-createdAt -updatedAt')
      .populate('examResults');

    if (!learner) {
      throw new Error('Learner not found');
    }
    // Get learner profile
    const learnerProfile = {
      name: learner?.name,
      email: learner?.email,
      learnerId: learner?.learnerId,
      programEnrolmentStatuses: learner?.programEnrolmentStatuses || [],
    };
    // get learner exam results
    const learnerExamResults = learner?.examResults;
    // current exam
    const currentExamResult = learnerExamResults?.[learnerExamResults.length - 1];
    // check if exam is published
    const isPublished = (currentExamResult as any)?.isPublished;
    // send response
    res.status(200).json({
      status: 'success',
      data: {
        learnerProfile,
        currentExamResult: isPublished ? currentExamResult : [],
      },
      message: 'Learner profile fetched successfully',
    });
  }
);

/**
 * @description Get All Learners
 * @route       GET /api/v1/learners/admins
 * @access      Private admin only
 */
export const getAllLearnersByAdmin = AsyncHandler(
  async (_req: Request, res: Response): Promise<void> => {
    res.status(200).json(res.results);
  }
);

/**
 * @description Get Single a Learner
 * @route       POST /api/v1/learners/:learnerID/admins
 * @access      Private admin only
 */
export const getLearnerByAdmin = AsyncHandler(
  async (req: Request<{ learnerID: string }>, res: Response): Promise<void> => {
    const learnerID = req.params.learnerID;

    try {
      // Try to find the learner by ID
      const learner = await Learner.findById(learnerID);

      // Check if the instructor was found
      if (!learner) {
        res.status(404).json({
          status: 'error',
          message: 'Learner not found',
        });
        return;
      }

      res.status(200).json({
        status: 'success',
        message: 'Learner fetched successfully',
        data: learner,
      });
    } catch (error) {
      // If an error occurs (e.g., CastError for invalid ObjectId)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      res.status(400).json({
        status: 'error',
        message: 'Invalid learner ID format',
        error: errorMessage, // Optional: provide error message for debugging
      });
    }
  }
);

/**
 * @description Learner updating profile
 * @route       UPDATE /api/v1/learners/update
 * @access      Private Learner Only
 */
export const learnerUpdateProfile = AsyncHandler(
  async (req: Request<{}, {}, UpdateProfileBody>, res: Response): Promise<void> => {
    const { email, password } = req.body;
    const userUpdates: { email?: string; passwordHash?: string } = {};
    // if email is taken
    if (email) {
      const emailExists = await User.findOne({ email });
      if (emailExists && emailExists._id.toString() !== req.userAuth?._id?.toString()) {
        throw new Error('This email already exists');
      }
      userUpdates.email = email;
    }

    // check if user is updating password
    if (password) {
      userUpdates.passwordHash = await hashPassword(password);
      // update user
      const learner = await Learner.findByIdAndUpdate(
        req.userAuth?._id,
        {
          email,
        },
        {
          new: true,
          runValidators: true,
        }
      );
      if (Object.keys(userUpdates).length > 0) {
        await User.findByIdAndUpdate(req.userAuth?._id, userUpdates);
      }
      res.status(200).json({
        success: 'success',
        data: learner,
        message: 'Learner profile updated successfully',
      });
    } else {
      // update user email and name
      const learner = await Learner.findByIdAndUpdate(
        req.userAuth?._id,
        {
          email,
        },
        {
          new: true,
          runValidators: true,
        }
      );
      if (Object.keys(userUpdates).length > 0) {
        await User.findByIdAndUpdate(req.userAuth?._id, userUpdates);
      }
      res.status(200).json({
        success: 'success',
        data: learner,
        message: 'Learner profile updated successfully',
      });
    }
  }
);

/**
 * @description Admin Update Learner eg: Assign Classes, name, etc.
 * @route       UPDATE /api/v1/learners/:learnerID/update/admins
 * @access      Private Admin Only
 *
 * Notes:  $set operator replaces the value of a field with the specified value - mongoose handles saving those field. see docs: https://www.mongodb.com/docs/manual/reference/operator/update/set/
 * Notes:  $addToSet operator adds a value to an array UNLESS the value is already present. see docs: https://www.mongodb.com/docs/manual/reference/operator/update/addToSet/
 */
export const adminUpdateLearner = AsyncHandler(
  async (
    req: Request<{ learnerID: string }, {}, AdminUpdateLearnerBody>,
    res: Response
  ): Promise<void> => {
    const { name, email } = req.body;
    const normalizedName = normalizePersonName(name);
    const userUpdates: { email?: string } = {};

    // find the learner by id
    const learnerFound = await Learner.findById(req.params.learnerID);
    if (!learnerFound) {
      throw new Error('Learner not found');
    }
    if (email) {
      const emailExists = await User.findOne({ email });
      if (emailExists && emailExists._id.toString() !== req.params.learnerID) {
        throw new Error('This email already exists');
      }
    }
    const updateFields: {
      name?: PersonNameInput;
      email?: string;
    } = {
      email,
    };
    if (typeof name !== 'undefined') {
      updateFields.name = normalizedName ?? name;
    }
    // update
    const learnerUpdated = await Learner.findByIdAndUpdate(
      req.params.learnerID,
      {
        $set: updateFields,
      },
      {
        new: true,
      }
    );
    if (email) {
      userUpdates.email = email;
      await User.findByIdAndUpdate(req.params.learnerID, userUpdates);
    }

    // send response
    res.status(200).json({
      status: 'success',
      data: learnerUpdated,
      message: 'Learner updated successfully',
    });
  }
);

/**
 * @description Learner taking exam
 * @route       POST /api/v1/learners/exams/:examID/write
 * @access      Private Learner Only
 */
export const writeExam = AsyncHandler(
  async (req: Request<{ examID: string }, {}, WriteExamBody>, res: Response): Promise<void> => {
    // get learner taking exam
    const learnerFound = (await Learner.findById(req.userAuth?.id)) as ILearner | null;
    if (!learnerFound) {
      throw new Error('Learner not found');
    }
    // get exam
    // to populate multiple fields at once use .populate() for each field necessary
    const examFound = (await Exam.findById(req.params.examID)
      .populate('questions')
      .populate('academicTerm')) as any;

    if (!examFound) {
      throw new Error('Exam not found');
    }
    // get questions to be answered
    const questions = examFound?.questions;
    // get all answers the user submitted
    const learnerAnswers = req.body?.answers;
    // check if learner answered all questions
    if (learnerAnswers.length !== questions.length) {
      throw new Error('You have not answered all of the questions');
    }

    /** Check if users name is already in learners who took this exam using the id from learner in the exam results as the query */
    const learnerFoundInResults = await ExamResult.findOne({ learner: learnerFound?._id });
    if (learnerFoundInResults) {
      throw new Error('You have already taken this exam. Wait for your results.');
    }

    // Check learner status for this program (if specified)
    const examProgramId = examFound?.program?.toString();
    if (examProgramId) {
      const enrollmentStatus = learnerFound.programEnrolmentStatuses?.find(
        (entry) => entry.programId.toString() === examProgramId
      );
      if (enrollmentStatus && enrollmentStatus.status !== 'active') {
        throw new Error('You are withdrawn/suspended for this program and cannot take this exam.');
      }
    }

    // build report object - this will tell the learner how many answers they got right/wrong
    let correctAnswers = 0;
    let wrongAnswers = 0;
    let status: 'passed' | 'failed' = 'failed'; // failed/passed
    let grade = 0;
    let score = 0;

    // check for answers
    // loop through questions to the possible answers
    for (let i = 0; i < questions.length; i++) {
      // find the single question
      const question = questions[i];
      // check if the answer is correct
      if (question.correctAnswer === learnerAnswers[i]) {
        correctAnswers++;
        score++;
        question.isCorrect = true;
      } else {
        wrongAnswers++;
      }
    }

    // calculate reports
    grade = (correctAnswers / questions.length) * 100;
    const answeredQuestionsArray: AnsweredQuestion[] = questions.map((question: any) => {
      return {
        question: question.question,
        correctAnswers: question.correctAnswer,
        isCorrect: question.isCorrect,
      };
    });

    if (grade >= 50) {
      status = 'passed';
    } else {
      status = 'failed';
    }

    // Remarks
    let remarks = '';
    if (grade >= 80) {
      remarks = 'Excellent!';
    } else if (grade >= 70) {
      remarks = 'Very Good';
    } else if (grade >= 60) {
      remarks = 'Good';
    } else if (grade >= 50) {
      remarks = 'Fair';
    } else {
      remarks = 'Needs Improvement';
    }

    // generate exam results
    const examResults = await ExamResult.create({
      learnerID: learnerFound?.learnerId,
      exam: examFound?._id,
      grade,
      score,
      status,
      remarks,
      programLevel: examFound?.programLevel,
      academicTerm: examFound?.academicTerm,
      academicYear: examFound?.academicYear,
      answeredQuestions: answeredQuestionsArray,
    });
    // push results into learners
    learnerFound.examResults?.push(examResults?._id);
    // save
    await learnerFound.save();

    // submit request
    res.status(200).json({
      status: 'success',
      data: 'You have submitted your exam successfully. Check later for your results.',
    });
  }
);
