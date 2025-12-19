/**
 * SCORM 1.2 API Adapter
 * 
 * This file provides the window.API object required by SCORM 1.2 content.
 * It communicates with the LMS server via REST API.
 * 
 * Usage:
 * - Include this script in the SCORM player HTML before loading content
 * - SCORM content will search for window.API using the findAPI() pattern
 * - All CMI data operations are proxied to the server
 */

(function() {
  'use strict';

  // Configuration
  const API_BASE_URL = '/api/v1/scorm/runtime';
  const COMMIT_DEBOUNCE_MS = 2000; // Auto-commit after 2 seconds of inactivity

  // Error codes per SCORM 1.2 spec
  const ERROR_CODES = {
    NO_ERROR: '0',
    GENERAL_EXCEPTION: '101',
    INVALID_ARGUMENT: '201',
    ELEMENT_NOT_IMPLEMENTED: '202',
    ELEMENT_VALUE_INCORRECT: '203',
    NOT_INITIALIZED: '301',
    NOT_IMPLEMENTED: '401',
    INVALID_SET_VALUE: '402',
    ELEMENT_READ_ONLY: '403',
    ELEMENT_WRITE_ONLY: '404',
    INCORRECT_DATA_TYPE: '405'
  };

  const ERROR_STRINGS = {
    '0': 'No error',
    '101': 'General exception',
    '201': 'Invalid argument error',
    '202': 'Element cannot be implemented',
    '203': 'Element value is incorrect',
    '301': 'Not initialized',
    '401': 'Not implemented error',
    '402': 'Invalid set value, element is a keyword',
    '403': 'Element is read only',
    '404': 'Element is write only',
    '405': 'Incorrect data type'
  };

  /**
   * SCORM 1.2 API Implementation
   */
  class SCORM_12_API {
    constructor(attemptId) {
      this.attemptId = attemptId;
      this.initialized = false;
      this.terminated = false;
      this.lastError = ERROR_CODES.NO_ERROR;
      this.pendingData = {}; // Local cache for uncommitted SetValue calls
      this.commitTimer = null;
      this.heartbeatInterval = null;
      
      console.log('[SCORM 1.2 API] Created for attempt:', attemptId);
    }

    /**
     * LMSInitialize - Initialize the session
     * @param {string} param - Empty string per SCORM spec
     * @returns {string} "true" or "false"
     */
    LMSInitialize(param) {
      console.log('[SCORM 1.2 API] LMSInitialize called');

      if (this.initialized) {
        this.lastError = ERROR_CODES.GENERAL_EXCEPTION;
        console.error('[SCORM 1.2 API] Already initialized');
        return 'false';
      }

      if (this.terminated) {
        this.lastError = ERROR_CODES.GENERAL_EXCEPTION;
        console.error('[SCORM 1.2 API] Session already terminated');
        return 'false';
      }

      // Call server to initialize session
      const xhr = new XMLHttpRequest();
      xhr.open('POST', `${API_BASE_URL}/${this.attemptId}/initialize`, false); // Synchronous
      xhr.setRequestHeader('Content-Type', 'application/json');
      
      try {
        xhr.send(JSON.stringify({}));
        
        if (xhr.status === 200) {
          const response = JSON.parse(xhr.responseText);
          if (response.result === 'true') {
            this.initialized = true;
            this.lastError = ERROR_CODES.NO_ERROR;
            
            // Start heartbeat to keep session alive
            this.startHeartbeat();
            
            console.log('[SCORM 1.2 API] Initialized successfully');
            return 'true';
          }
        }
        
        this.lastError = response?.errorCode || ERROR_CODES.GENERAL_EXCEPTION;
        console.error('[SCORM 1.2 API] Initialize failed:', response);
        return 'false';
      } catch (err) {
        this.lastError = ERROR_CODES.GENERAL_EXCEPTION;
        console.error('[SCORM 1.2 API] Initialize error:', err);
        return 'false';
      }
    }

    /**
     * LMSFinish - Terminate the session
     * @param {string} param - Empty string per SCORM spec
     * @returns {string} "true" or "false"
     */
    LMSFinish(param) {
      console.log('[SCORM 1.2 API] LMSFinish called');

      if (!this.initialized) {
        this.lastError = ERROR_CODES.NOT_INITIALIZED;
        console.error('[SCORM 1.2 API] Not initialized');
        return 'false';
      }

      if (this.terminated) {
        this.lastError = ERROR_CODES.GENERAL_EXCEPTION;
        console.error('[SCORM 1.2 API] Already terminated');
        return 'false';
      }

      // Commit any pending data before terminating
      if (Object.keys(this.pendingData).length > 0) {
        this.LMSCommit('');
      }

      // Stop heartbeat
      this.stopHeartbeat();

      // Call server to terminate session
      const xhr = new XMLHttpRequest();
      xhr.open('POST', `${API_BASE_URL}/${this.attemptId}/terminate`, false); // Synchronous
      xhr.setRequestHeader('Content-Type', 'application/json');
      
      try {
        xhr.send(JSON.stringify({}));
        
        if (xhr.status === 200) {
          const response = JSON.parse(xhr.responseText);
          if (response.result === 'true') {
            this.terminated = true;
            this.initialized = false;
            this.lastError = ERROR_CODES.NO_ERROR;
            console.log('[SCORM 1.2 API] Terminated successfully');
            return 'true';
          }
        }
        
        this.lastError = response?.errorCode || ERROR_CODES.GENERAL_EXCEPTION;
        console.error('[SCORM 1.2 API] Terminate failed:', response);
        return 'false';
      } catch (err) {
        this.lastError = ERROR_CODES.GENERAL_EXCEPTION;
        console.error('[SCORM 1.2 API] Terminate error:', err);
        return 'false';
      }
    }

    /**
     * LMSGetValue - Get a CMI element value
     * @param {string} element - CMI element path (e.g., "cmi.core.score.raw")
     * @returns {string} Element value or empty string on error
     */
    LMSGetValue(element) {
      console.log('[SCORM 1.2 API] LMSGetValue:', element);

      if (!this.initialized) {
        this.lastError = ERROR_CODES.NOT_INITIALIZED;
        console.error('[SCORM 1.2 API] Not initialized');
        return '';
      }

      // Check local cache first for pending writes
      if (this.pendingData.hasOwnProperty(element)) {
        this.lastError = ERROR_CODES.NO_ERROR;
        return String(this.pendingData[element]);
      }

      // Fetch from server
      const xhr = new XMLHttpRequest();
      xhr.open('GET', `${API_BASE_URL}/${this.attemptId}/value/${encodeURIComponent(element)}`, false); // Synchronous
      
      try {
        xhr.send();
        
        if (xhr.status === 200) {
          const response = JSON.parse(xhr.responseText);
          if (response.errorCode === '0') {
            this.lastError = ERROR_CODES.NO_ERROR;
            return String(response.value || '');
          }
        }
        
        this.lastError = response?.errorCode || ERROR_CODES.INVALID_ARGUMENT;
        console.error('[SCORM 1.2 API] GetValue failed:', element);
        return '';
      } catch (err) {
        this.lastError = ERROR_CODES.GENERAL_EXCEPTION;
        console.error('[SCORM 1.2 API] GetValue error:', err);
        return '';
      }
    }

    /**
     * LMSSetValue - Set a CMI element value
     * @param {string} element - CMI element path
     * @param {string} value - Value to set
     * @returns {string} "true" or "false"
     */
    LMSSetValue(element, value) {
      console.log('[SCORM 1.2 API] LMSSetValue:', element, '=', value);

      if (!this.initialized) {
        this.lastError = ERROR_CODES.NOT_INITIALIZED;
        console.error('[SCORM 1.2 API] Not initialized');
        return 'false';
      }

      // Cache locally (don't send to server until Commit)
      this.pendingData[element] = value;
      this.lastError = ERROR_CODES.NO_ERROR;

      // Schedule auto-commit
      this.scheduleCommit();

      return 'true';
    }

    /**
     * LMSCommit - Persist pending data to server
     * @param {string} param - Empty string per SCORM spec
     * @returns {string} "true" or "false"
     */
    LMSCommit(param) {
      console.log('[SCORM 1.2 API] LMSCommit called');

      if (!this.initialized) {
        this.lastError = ERROR_CODES.NOT_INITIALIZED;
        console.error('[SCORM 1.2 API] Not initialized');
        return 'false';
      }

      // Clear auto-commit timer
      if (this.commitTimer) {
        clearTimeout(this.commitTimer);
        this.commitTimer = null;
      }

      // Nothing to commit
      if (Object.keys(this.pendingData).length === 0) {
        this.lastError = ERROR_CODES.NO_ERROR;
        return 'true';
      }

      // Send all pending SetValue calls to server
      const xhr = new XMLHttpRequest();
      xhr.open('POST', `${API_BASE_URL}/${this.attemptId}/commit`, false); // Synchronous
      xhr.setRequestHeader('Content-Type', 'application/json');
      
      try {
        // Send each pending element as a SetValue call
        const setValuePromises = [];
        for (const [element, value] of Object.entries(this.pendingData)) {
          const setXhr = new XMLHttpRequest();
          setXhr.open('PUT', `${API_BASE_URL}/${this.attemptId}/value/${encodeURIComponent(element)}`, false);
          setXhr.setRequestHeader('Content-Type', 'application/json');
          setXhr.send(JSON.stringify({ value }));
          
          if (setXhr.status !== 200) {
            console.error('[SCORM 1.2 API] SetValue failed for', element);
          }
        }

        // Now commit
        xhr.send(JSON.stringify({}));
        
        if (xhr.status === 200) {
          const response = JSON.parse(xhr.responseText);
          if (response.result === 'true') {
            // Clear pending data
            this.pendingData = {};
            this.lastError = ERROR_CODES.NO_ERROR;
            console.log('[SCORM 1.2 API] Commit successful');
            return 'true';
          }
        }
        
        this.lastError = response?.errorCode || ERROR_CODES.GENERAL_EXCEPTION;
        console.error('[SCORM 1.2 API] Commit failed');
        return 'false';
      } catch (err) {
        this.lastError = ERROR_CODES.GENERAL_EXCEPTION;
        console.error('[SCORM 1.2 API] Commit error:', err);
        return 'false';
      }
    }

    /**
     * LMSGetLastError - Get last error code
     * @returns {string} Error code
     */
    LMSGetLastError() {
      return this.lastError;
    }

    /**
     * LMSGetErrorString - Get error description
     * @param {string} errorCode - Error code
     * @returns {string} Error description
     */
    LMSGetErrorString(errorCode) {
      return ERROR_STRINGS[errorCode] || 'Unknown error';
    }

    /**
     * LMSGetDiagnostic - Get diagnostic information
     * @param {string} errorCode - Error code
     * @returns {string} Diagnostic info
     */
    LMSGetDiagnostic(errorCode) {
      // Return the same as error string for simplicity
      return this.LMSGetErrorString(errorCode);
    }

    /**
     * Schedule auto-commit after debounce period
     */
    scheduleCommit() {
      if (this.commitTimer) {
        clearTimeout(this.commitTimer);
      }
      
      this.commitTimer = setTimeout(() => {
        console.log('[SCORM 1.2 API] Auto-committing pending data');
        this.LMSCommit('');
      }, COMMIT_DEBOUNCE_MS);
    }

    /**
     * Start heartbeat to keep session alive
     */
    startHeartbeat() {
      // Send heartbeat every 5 minutes
      this.heartbeatInterval = setInterval(() => {
        console.log('[SCORM 1.2 API] Sending heartbeat');
        
        const xhr = new XMLHttpRequest();
        xhr.open('POST', `${API_BASE_URL}/${this.attemptId}/heartbeat`, true); // Async
        xhr.setRequestHeader('Content-Type', 'application/json');
        xhr.send(JSON.stringify({}));
      }, 5 * 60 * 1000); // 5 minutes
    }

    /**
     * Stop heartbeat
     */
    stopHeartbeat() {
      if (this.heartbeatInterval) {
        clearInterval(this.heartbeatInterval);
        this.heartbeatInterval = null;
      }
    }
  }

  /**
   * Initialize the API object
   * The attemptId should be set by the player before loading content
   */
  window.initializeSCORM_12_API = function(attemptId) {
    if (!attemptId) {
      console.error('[SCORM 1.2 API] Cannot initialize: attemptId is required');
      return false;
    }
    
    window.API = new SCORM_12_API(attemptId);
    console.log('[SCORM 1.2 API] window.API initialized for attempt:', attemptId);
    return true;
  };

  console.log('[SCORM 1.2 API] Adapter loaded. Call window.initializeSCORM_12_API(attemptId) to initialize.');
})();
