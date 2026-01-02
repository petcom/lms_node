import AsyncHandler from 'express-async-handler';
import { Request, Response } from 'express';
import Learner from '../../model/Academic/Learner';
import { hashPassword, isPassMatched } from '../../utils/helpers';
import generateToken from '../../utils/generateToken';
import Exam from '../../model/Academic/Exam';
import ExamResult from '../../model/Academic/ExamResults';
import Admin from '../../model/Staff/Admin';
import { ILearner } from '../../types/models';
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
  isSuspended?: boolean;
  isWithdrawn?: boolean;
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
    const learner = await Learner.findOne({ email: email }).lean();
    if (learner) {
      throw new Error('Learner already exists');
    }
    //hash password
    const hashedPassword = await hashPassword(password);
    // Learner created
    const learnerRegistered = await Learner.create({
      name: normalizedName ?? name,
      email,
      password: hashedPassword,
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

    //find the instructor user obj
    const learner = await Learner.findOne({ email }).lean();
    if (!learner) {
      res.json({ message: 'Invalid login credentials' });
      return;
    }
    // verify the password
    const isMatched = await isPassMatched(password, learner?.password);
    if (!isMatched) {
      res.json({ message: 'Invalid login credentials' });
      return;
    } else {
      const role = learner.role || 'learner';
      const accessToken = generateToken(String(learner?._id), role);

      res.status(200).json({
        status: 'success',
        message: 'Learner logged in successfully',
        data: {
          accessToken,
          role,
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
      .select('-password -createdAt -updatedAt')
      .populate('examResults');

    if (!learner) {
      throw new Error('Learner not found');
    }
    // Get learner profile
    const learnerProfile = {
      name: learner?.name,
      email: learner?.email,
      isSuspended: learner?.isSuspended,
      isWithdrawn: learner?.isWithdrawn,
      learnerId: learner?.learnerId,
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
 * @route       GET /api/v1/learners/admin
 * @access      Private admin only
 */
export const getAllLearnersByAdmin = AsyncHandler(
  async (_req: Request, res: Response): Promise<void> => {
    res.status(200).json(res.results);
  }
);

/**
 * @description Get Single a Learner
 * @route       POST /api/v1/learners/:learnerID/admin
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
    // if email is taken
    const emailExists = await Learner.findOne({ email });
    if (emailExists) {
      throw new Error('This email already exists');
    }

    // check if user is updating password
    if (password) {
      // update user
      const learner = await Learner.findByIdAndUpdate(
        req.userAuth?._id,
        {
          email,
          password: await hashPassword(password),
        },
        {
          new: true,
          runValidators: true,
        }
      );
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
 * @route       UPDATE /api/v1/learners/:learnerID/update/admin
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
    const { name, email, isSuspended, isWithdrawn } = req.body;
    const normalizedName = normalizePersonName(name);

    // find the learner by id
    const learnerFound = await Learner.findById(req.params.learnerID);
    if (!learnerFound) {
      throw new Error('Learner not found');
    }
    const updateFields: {
      name?: PersonNameInput;
      email?: string;
      isSuspended?: boolean;
      isWithdrawn?: boolean;
    } = {
      email,
      isSuspended,
      isWithdrawn,
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

    // Check if learner is suspended
    if (learnerFound.isWithdrawn || learnerFound.isSuspended) {
      throw new Error('You are withdrawn/suspended and cannot take this exam.');
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
