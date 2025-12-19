/**
 * CMI Data Mapper Utility
 * 
 * Maps between SCORM CMI elements and database structure.
 * Handles validation, data type conversions, and time formatting.
 * Supports both SCORM 1.2 and SCORM 2004.
 */

import { ScormVersion } from '../../types/scorm';

/**
 * SCORM 1.2 Error Codes
 */
export const SCORM_12_ERRORS = {
  0: 'No error',
  101: 'General exception',
  201: 'Invalid argument error',
  202: 'Element cannot have children',
  203: 'Element not an array - cannot have count',
  301: 'Not initialized',
  401: 'Not implemented error',
  402: 'Invalid set value, element is a keyword',
  403: 'Element is read only',
  404: 'Element is write only',
  405: 'Incorrect data type',
};

/**
 * SCORM 2004 Error Codes
 */
export const SCORM_2004_ERRORS = {
  0: 'No error',
  101: 'General exception',
  102: 'General initialization failure',
  103: 'Already initialized',
  104: 'Content instance terminated',
  111: 'General termination failure',
  112: 'Termination before initialization',
  122: 'Retrieve data before initialization',
  123: 'Store data before initialization',
  132: 'Commit before initialization',
  133: 'Argument error',
  142: 'Retrieve data before initialization',
  143: 'Store data before initialization',
  201: 'General argument error',
  301: 'General get failure',
  351: 'General set failure',
  391: 'General commit failure',
  401: 'Undefined data model element',
  402: 'Unimplemented data model element',
  403: 'Data model element value not initialized',
  404: 'Data model element is read only',
  405: 'Data model element is write only',
  406: 'Data model element type mismatch',
  407: 'Data model element value out of range',
  408: 'Data model dependency not established',
};

/**
 * Valid SCORM 1.2 CMI elements
 */
const SCORM_12_ELEMENTS = [
  'cmi.core._children',
  'cmi.core.student_id',
  'cmi.core.student_name',
  'cmi.core.lesson_location',
  'cmi.core.credit',
  'cmi.core.lesson_status',
  'cmi.core.entry',
  'cmi.core.score._children',
  'cmi.core.score.raw',
  'cmi.core.score.min',
  'cmi.core.score.max',
  'cmi.core.total_time',
  'cmi.core.lesson_mode',
  'cmi.core.exit',
  'cmi.core.session_time',
  'cmi.suspend_data',
  'cmi.launch_data',
  'cmi.comments',
  'cmi.comments_from_lms',
  'cmi.objectives._children',
  'cmi.objectives._count',
  'cmi.student_data._children',
  'cmi.student_data.mastery_score',
  'cmi.student_data.max_time_allowed',
  'cmi.student_data.time_limit_action',
  'cmi.student_preference._children',
  'cmi.student_preference.audio',
  'cmi.student_preference.language',
  'cmi.student_preference.speed',
  'cmi.student_preference.text',
  'cmi.interactions._children',
  'cmi.interactions._count',
];

/**
 * Valid SCORM 2004 CMI elements (subset - full list is extensive)
 */
const SCORM_2004_ELEMENTS = [
  'cmi._version',
  'cmi.comments_from_learner._children',
  'cmi.comments_from_learner._count',
  'cmi.comments_from_lms._children',
  'cmi.comments_from_lms._count',
  'cmi.completion_status',
  'cmi.completion_threshold',
  'cmi.credit',
  'cmi.entry',
  'cmi.exit',
  'cmi.interactions._children',
  'cmi.interactions._count',
  'cmi.launch_data',
  'cmi.learner_id',
  'cmi.learner_name',
  'cmi.learner_preference._children',
  'cmi.learner_preference.audio_level',
  'cmi.learner_preference.language',
  'cmi.learner_preference.delivery_speed',
  'cmi.learner_preference.audio_captioning',
  'cmi.location',
  'cmi.max_time_allowed',
  'cmi.mode',
  'cmi.objectives._children',
  'cmi.objectives._count',
  'cmi.progress_measure',
  'cmi.scaled_passing_score',
  'cmi.score._children',
  'cmi.score.scaled',
  'cmi.score.raw',
  'cmi.score.min',
  'cmi.score.max',
  'cmi.session_time',
  'cmi.success_status',
  'cmi.suspend_data',
  'cmi.time_limit_action',
  'cmi.total_time',
];

/**
 * Read-only SCORM 1.2 elements
 */
const SCORM_12_READONLY = [
  'cmi.core._children',
  'cmi.core.student_id',
  'cmi.core.student_name',
  'cmi.core.credit',
  'cmi.core.entry',
  'cmi.core.score._children',
  'cmi.core.total_time',
  'cmi.core.lesson_mode',
  'cmi.suspend_data',
  'cmi.launch_data',
  'cmi.comments_from_lms',
  'cmi.objectives._children',
  'cmi.objectives._count',
  'cmi.student_data._children',
  'cmi.student_data.mastery_score',
  'cmi.student_data.max_time_allowed',
  'cmi.student_data.time_limit_action',
  'cmi.student_preference._children',
  'cmi.interactions._children',
  'cmi.interactions._count',
];

/**
 * Read-only SCORM 2004 elements
 */
const SCORM_2004_READONLY = [
  'cmi._version',
  'cmi.comments_from_learner._children',
  'cmi.comments_from_learner._count',
  'cmi.comments_from_lms._children',
  'cmi.comments_from_lms._count',
  'cmi.completion_threshold',
  'cmi.credit',
  'cmi.entry',
  'cmi.interactions._children',
  'cmi.interactions._count',
  'cmi.launch_data',
  'cmi.learner_id',
  'cmi.learner_name',
  'cmi.learner_preference._children',
  'cmi.max_time_allowed',
  'cmi.mode',
  'cmi.objectives._children',
  'cmi.objectives._count',
  'cmi.scaled_passing_score',
  'cmi.score._children',
  'cmi.time_limit_action',
  'cmi.total_time',
];

/**
 * Validate CMI element path
 */
export function validateCMIElement(element: string, version: ScormVersion): boolean {
  const validElements = version === 'scorm_1.2' ? SCORM_12_ELEMENTS : SCORM_2004_ELEMENTS;
  
  // Check exact match
  if (validElements.includes(element)) {
    return true;
  }
  
  // Check pattern match for array elements (e.g., cmi.objectives.0.id)
  // const pattern = element.replace(/\.\d+\./g, '.N.');
  if (validElements.some(e => e.includes('.N.'))) {
    return true;
  }
  
  return false;
}

/**
 * Check if element is read-only
 */
export function isReadOnly(element: string, version: ScormVersion): boolean {
  const readOnlyElements = version === 'scorm_1.2' ? SCORM_12_READONLY : SCORM_2004_READONLY;
  return readOnlyElements.includes(element);
}

/**
 * Get CMI value from nested object
 */
export function getCMIValue(cmiData: any, element: string, version: ScormVersion): any {
  // const path = element.replace(/^cmi\./, '').replace(/\./g, '_');
  
  // Handle special cases for SCORM 1.2 core elements
  if (version === 'scorm_1.2' && element.startsWith('cmi.core.')) {
    const corePath = element.replace(/^cmi\.core\./, '');
    return cmiData[corePath] !== undefined ? cmiData[corePath] : '';
  }
  
  // Handle nested paths
  const parts = element.split('.');
  let value = cmiData;
  
  for (let i = 1; i < parts.length; i++) { // Skip 'cmi' prefix
    const part = parts[i];
    if (value && typeof value === 'object') {
      value = value[part];
    } else {
      return '';
    }
  }
  
  return value !== undefined && value !== null ? value : '';
}

/**
 * Set CMI value in nested object
 */
export function setCMIValue(cmiData: any, element: string, value: any, version: ScormVersion): any {
  const updatedData = { ...cmiData };
  
  // Handle special cases for SCORM 1.2 core elements
  if (version === 'scorm_1.2' && element.startsWith('cmi.core.')) {
    const corePath = element.replace(/^cmi\.core\./, '');
    updatedData[corePath] = value;
    return updatedData;
  }
  
  // Handle nested paths
  const parts = element.split('.').slice(1); // Remove 'cmi' prefix
  let current = updatedData;
  
  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i];
    if (!(part in current) || typeof current[part] !== 'object') {
      current[part] = {};
    }
    current = current[part];
  }
  
  current[parts[parts.length - 1]] = value;
  return updatedData;
}

/**
 * Convert SCORM time string to seconds
 */
export function scormTimeToSeconds(timeString: string, version: ScormVersion): number {
  if (!timeString) return 0;
  
  if (version === 'scorm_1.2') {
    // SCORM 1.2: HHHH:MM:SS.SS format
    const parts = timeString.split(':');
    if (parts.length !== 3) return 0;
    
    const hours = parseInt(parts[0], 10);
    const minutes = parseInt(parts[1], 10);
    const seconds = parseFloat(parts[2]);
    
    return (hours * 3600) + (minutes * 60) + seconds;
  } else {
    // SCORM 2004: ISO 8601 duration (PT1H30M45S)
    const match = timeString.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:([\d.]+)S)?/);
    if (!match) return 0;
    
    const hours = parseInt(match[1] || '0', 10);
    const minutes = parseInt(match[2] || '0', 10);
    const seconds = parseFloat(match[3] || '0');
    
    return (hours * 3600) + (minutes * 60) + seconds;
  }
}

/**
 * Convert seconds to SCORM time string
 */
export function secondsToScormTime(seconds: number, version: ScormVersion): string {
  if (seconds < 0) seconds = 0;
  
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const centiseconds = Math.floor((seconds % 1) * 100);
  
  if (version === 'scorm_1.2') {
    // SCORM 1.2: HHHH:MM:SS.SS format
    return `${hours.toString().padStart(4, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${centiseconds.toString().padStart(2, '0')}`;
  } else {
    // SCORM 2004: ISO 8601 duration (PT1H30M45S)
    let result = 'PT';
    if (hours > 0) result += `${hours}H`;
    if (minutes > 0) result += `${minutes}M`;
    if (secs > 0 || (hours === 0 && minutes === 0)) {
      const totalSecs = secs + (centiseconds / 100);
      result += `${totalSecs.toFixed(2)}S`;
    }
    return result;
  }
}

/**
 * Normalize score value
 */
export function normalizeScore(score: number, version: ScormVersion): number {
  if (version === 'scorm_1.2') {
    // SCORM 1.2: 0-100 range
    return Math.min(Math.max(score, 0), 100);
  } else {
    // SCORM 2004: -1 to 1 range (scaled score)
    return Math.min(Math.max(score, -1), 1);
  }
}

/**
 * Get error string for error code
 */
export function getErrorString(errorCode: number, version: ScormVersion): string {
  const errors: Record<number, string> = version === 'scorm_1.2' ? SCORM_12_ERRORS : SCORM_2004_ERRORS;
  return errors[errorCode] || 'Unknown error';
}

/**
 * Map CMI data to database structure
 */
export function mapCMIToDatabase(cmiData: any, version: ScormVersion): any {
  // Already in database format, just ensure required fields exist
  return {
    ...cmiData,
    version,
    lastUpdated: new Date(),
  };
}

/**
 * Map database data to CMI structure
 */
export function mapDatabaseToCMI(dbData: any, version: ScormVersion): any {
  if (!dbData) {
    return version === 'scorm_1.2' ? {
      core: {},
      suspend_data: '',
      launch_data: '',
      comments: '',
      objectives: [],
      interactions: [],
    } : {
      learner_id: '',
      learner_name: '',
      completion_status: 'not attempted',
      success_status: 'unknown',
      score: {},
      session_time: 'PT0H0M0S',
      total_time: 'PT0H0M0S',
      suspend_data: '',
      launch_data: '',
    };
  }
  
  return dbData;
}
