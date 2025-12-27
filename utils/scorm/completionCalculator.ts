/**
 * SCORM Completion Calculator Utility
 *
 * Provides functions for calculating completion rates, scores,
 * time spent, and other analytics for SCORM attempts.
 */

import ScormAttempt from '../../model/Scorm/ScormAttempt';
import ScormPackage from '../../model/Scorm/ScormPackage';
import { scormTimeToSeconds } from './cmiDataMapper';

type IScormAttempt = InstanceType<typeof ScormAttempt>;
type IScormPackage = InstanceType<typeof ScormPackage>;

/**
 * Calculate completion percentage for an attempt
 * Based on completion_status and objectives completed
 */
export function calculateCompletionPercentage(attempt: IScormAttempt): number {
  const cmi = attempt.cmi as any;

  // If completion status is explicitly set
  if (cmi.completion_status === 'completed') {
    return 100;
  }

  if (cmi.completion_status === 'not attempted') {
    return 0;
  }

  // For SCORM 2004, check objectives
  if (cmi.objectives && Array.isArray(cmi.objectives)) {
    const totalObjectives = cmi.objectives.length;
    if (totalObjectives === 0) return 0;

    const completedObjectives = cmi.objectives.filter(
      (obj: any) => obj.completion_status === 'completed'
    ).length;

    return Math.round((completedObjectives / totalObjectives) * 100);
  }

  // For SCORM 1.2, check lesson_status
  if (cmi.lesson_status) {
    if (cmi.lesson_status === 'completed' || cmi.lesson_status === 'passed') {
      return 100;
    }
    if (cmi.lesson_status === 'incomplete' || cmi.lesson_status === 'failed') {
      // Estimate based on suspend data or interactions
      return 50; // Placeholder
    }
  }

  return 0;
}

/**
 * Determine pass/fail status based on SCORM data and package settings
 */
export function determinePassFailStatus(
  attempt: IScormAttempt,
  pkg?: IScormPackage
): 'passed' | 'failed' | 'unknown' {
  const cmi = attempt.cmi as any;

  // Check SCORM 2004 success_status
  if (cmi.success_status) {
    if (cmi.success_status === 'passed') return 'passed';
    if (cmi.success_status === 'failed') return 'failed';
  }

  // Check SCORM 1.2 lesson_status
  if (cmi.lesson_status) {
    if (cmi.lesson_status === 'passed') return 'passed';
    if (cmi.lesson_status === 'failed') return 'failed';
  }

  // Check score against mastery score
  const score = getAttemptScore(attempt);
  if (score !== null && pkg && (pkg as any).manifest?.masteryScore) {
    const masteryScore = (pkg as any).manifest.masteryScore;
    return score >= masteryScore ? 'passed' : 'failed';
  }

  return 'unknown';
}

/**
 * Get score from attempt (handles both SCORM 1.2 and 2004)
 */
export function getAttemptScore(attempt: IScormAttempt): number | null {
  const cmi = attempt.cmi as any;

  // SCORM 2004 scaled score (-1 to 1, convert to 0-100)
  if (cmi.score?.scaled !== undefined && cmi.score?.scaled !== null) {
    return Math.round((cmi.score.scaled + 1) * 50);
  }

  // SCORM 1.2 or 2004 raw score
  if (cmi.score?.raw !== undefined && cmi.score?.raw !== null) {
    return cmi.score.raw;
  }

  // SCORM 1.2 with core prefix
  if (cmi.core?.score?.raw !== undefined && cmi.core?.score?.raw !== null) {
    return cmi.core.score.raw;
  }

  return null;
}

/**
 * Calculate best score from multiple attempts
 */
export function calculateBestScore(attempts: IScormAttempt[]): number | null {
  if (!attempts || attempts.length === 0) return null;

  const scores = attempts
    .map((attempt) => getAttemptScore(attempt))
    .filter((score): score is number => score !== null);

  if (scores.length === 0) return null;

  return Math.max(...scores);
}

/**
 * Calculate average score from attempts
 */
export function calculateAverageScore(attempts: IScormAttempt[]): number | null {
  if (!attempts || attempts.length === 0) return null;

  const scores = attempts
    .map((attempt) => getAttemptScore(attempt))
    .filter((score): score is number => score !== null);

  if (scores.length === 0) return null;

  const sum = scores.reduce((acc, score) => acc + score, 0);
  return Math.round(sum / scores.length);
}

/**
 * Calculate total time spent across all attempts (in seconds)
 */
export function calculateTotalTimeSpent(attempts: IScormAttempt[]): number {
  if (!attempts || attempts.length === 0) return 0;

  return attempts.reduce((total, attempt) => {
    const cmi = attempt.cmi as any;
    const version =
      attempt.package && (attempt.package as any).version
        ? (attempt.package as any).version
        : 'scorm_1.2';

    // Get total_time
    const timeString = cmi.total_time || cmi.core?.total_time || '0';

    try {
      const seconds = scormTimeToSeconds(timeString, version);
      return total + seconds;
    } catch (error) {
      return total;
    }
  }, 0);
}

/**
 * Calculate session time for a single attempt (in seconds)
 */
export function calculateSessionTime(attempt: IScormAttempt): number {
  const cmi = attempt.cmi as any;
  const version =
    attempt.package && (attempt.package as any).version
      ? (attempt.package as any).version
      : 'scorm_1.2';

  const timeString = cmi.session_time || cmi.core?.session_time || '0';

  try {
    return scormTimeToSeconds(timeString, version);
  } catch (error) {
    return 0;
  }
}

/**
 * Calculate completion rate for a package across students
 */
export function calculateCompletionRate(totalStudents: number, completedStudents: number): number {
  if (totalStudents === 0) return 0;
  return Math.round((completedStudents / totalStudents) * 100);
}

/**
 * Aggregate score distribution into bins
 */
export function aggregateScoreDistribution(attempts: IScormAttempt[]): {
  bins: string[];
  counts: number[];
  percentages: number[];
} {
  const bins = [
    '0-10',
    '10-20',
    '20-30',
    '30-40',
    '40-50',
    '50-60',
    '60-70',
    '70-80',
    '80-90',
    '90-100',
  ];
  const counts = new Array(10).fill(0);

  attempts.forEach((attempt) => {
    const score = getAttemptScore(attempt);
    if (score !== null) {
      const binIndex = Math.min(Math.floor(score / 10), 9);
      counts[binIndex]++;
    }
  });

  const total = counts.reduce((sum, count) => sum + count, 0);
  const percentages = counts.map((count) => (total > 0 ? Math.round((count / total) * 100) : 0));

  return { bins, counts, percentages };
}

/**
 * Aggregate time distribution into bins (in minutes)
 */
export function aggregateTimeDistribution(attempts: IScormAttempt[]): {
  bins: string[];
  counts: number[];
  percentages: number[];
} {
  const bins = ['0-5', '5-10', '10-15', '15-30', '30-45', '45-60', '60+'];
  const counts = new Array(7).fill(0);

  attempts.forEach((attempt) => {
    const seconds = calculateSessionTime(attempt);
    const minutes = seconds / 60;

    if (minutes < 5) counts[0]++;
    else if (minutes < 10) counts[1]++;
    else if (minutes < 15) counts[2]++;
    else if (minutes < 30) counts[3]++;
    else if (minutes < 45) counts[4]++;
    else if (minutes < 60) counts[5]++;
    else counts[6]++;
  });

  const total = counts.reduce((sum, count) => sum + count, 0);
  const percentages = counts.map((count) => (total > 0 ? Math.round((count / total) * 100) : 0));

  return { bins, counts, percentages };
}

/**
 * Format seconds into readable time string
 */
export function formatTimeForDisplay(seconds: number): string {
  if (seconds < 60) {
    return `${seconds}s`;
  }

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m ${secs}s`;
  }

  return `${minutes}m ${secs}s`;
}

/**
 * Calculate statistical metrics for scores
 */
export function calculateScoreStatistics(attempts: IScormAttempt[]): {
  mean: number | null;
  median: number | null;
  mode: number | null;
  min: number | null;
  max: number | null;
  stdDev: number | null;
} {
  const scores = attempts
    .map((attempt) => getAttemptScore(attempt))
    .filter((score): score is number => score !== null)
    .sort((a, b) => a - b);

  if (scores.length === 0) {
    return { mean: null, median: null, mode: null, min: null, max: null, stdDev: null };
  }

  // Mean
  const mean = Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length);

  // Median
  const middle = Math.floor(scores.length / 2);
  const median =
    scores.length % 2 === 0
      ? Math.round((scores[middle - 1] + scores[middle]) / 2)
      : scores[middle];

  // Mode (most frequent score)
  const frequency: { [key: number]: number } = {};
  scores.forEach((score) => {
    frequency[score] = (frequency[score] || 0) + 1;
  });
  const maxFreq = Math.max(...Object.values(frequency));
  const mode = parseInt(
    Object.keys(frequency).find((key) => frequency[parseInt(key)] === maxFreq) || '0'
  );

  // Min and Max
  const min = scores[0];
  const max = scores[scores.length - 1];

  // Standard Deviation
  const variance =
    scores.reduce((sum, score) => sum + Math.pow(score - mean, 2), 0) / scores.length;
  const stdDev = Math.round(Math.sqrt(variance));

  return { mean, median, mode, min, max, stdDev };
}

/**
 * Calculate time statistics
 */
export function calculateTimeStatistics(attempts: IScormAttempt[]): {
  average: number;
  median: number;
  min: number;
  max: number;
} {
  const times = attempts
    .map((attempt) => calculateSessionTime(attempt))
    .filter((time) => time > 0)
    .sort((a, b) => a - b);

  if (times.length === 0) {
    return { average: 0, median: 0, min: 0, max: 0 };
  }

  const average = Math.round(times.reduce((sum, time) => sum + time, 0) / times.length);

  const middle = Math.floor(times.length / 2);
  const median =
    times.length % 2 === 0 ? Math.round((times[middle - 1] + times[middle]) / 2) : times[middle];

  const min = times[0];
  const max = times[times.length - 1];

  return { average, median, min, max };
}

/**
 * Get grade letter based on score
 */
export function getGradeLetter(score: number): string {
  if (score >= 90) return 'A';
  if (score >= 80) return 'B';
  if (score >= 70) return 'C';
  if (score >= 60) return 'D';
  return 'F';
}

/**
 * Aggregate grades distribution
 */
export function aggregateGradesDistribution(attempts: IScormAttempt[]): {
  grade: string;
  min: number;
  max: number;
  count: number;
  percentage: number;
}[] {
  const grades = [
    { grade: 'A', min: 90, max: 100, count: 0 },
    { grade: 'B', min: 80, max: 89, count: 0 },
    { grade: 'C', min: 70, max: 79, count: 0 },
    { grade: 'D', min: 60, max: 69, count: 0 },
    { grade: 'F', min: 0, max: 59, count: 0 },
  ];

  attempts.forEach((attempt) => {
    const score = getAttemptScore(attempt);
    if (score !== null) {
      const gradeObj = grades.find((g) => score >= g.min && score <= g.max);
      if (gradeObj) gradeObj.count++;
    }
  });

  const total = grades.reduce((sum, g) => sum + g.count, 0);

  return grades.map((g) => ({
    ...g,
    percentage: total > 0 ? Math.round((g.count / total) * 100) : 0,
  }));
}

/**
 * Check if attempt is completed
 */
export function isAttemptCompleted(attempt: IScormAttempt): boolean {
  const cmi = attempt.cmi as any;

  // Check completion_status
  if (cmi.completion_status === 'completed') return true;

  // Check lesson_status (SCORM 1.2)
  if (cmi.lesson_status === 'completed' || cmi.lesson_status === 'passed') return true;

  // Check attempt status
  if (attempt.status === 'completed' || attempt.status === 'passed') return true;

  return false;
}

/**
 * Check if attempt is passed
 */
export function isAttemptPassed(attempt: IScormAttempt, pkg?: IScormPackage): boolean {
  const status = determinePassFailStatus(attempt, pkg);
  return status === 'passed';
}
