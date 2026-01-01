import express, { Router } from 'express';
import {
  createQuestion,
  getQuestions,
  getQuestion,
  updateQuestion,
} from '../../controller/academics/questionsCtrl';
import advancedResults from '../../middlewares/advancedResults';
import Question from '../../model/Academic/Questions';
import isAuthenticated from '../../middlewares/isAuthenticated';
import roleRestriction from '../../middlewares/roleRestriction';

const questionsRouter: Router = express.Router();

questionsRouter.get(
  '/',
  isAuthenticated(),
  roleRestriction('staff'),
  advancedResults(Question),
  getQuestions
);
questionsRouter.get('/:id', isAuthenticated(), roleRestriction('staff'), getQuestion);
questionsRouter.post('/:examID', isAuthenticated(), roleRestriction('staff'), createQuestion);
questionsRouter.put('/:id', isAuthenticated(), roleRestriction('staff'), updateQuestion);

export default questionsRouter;
