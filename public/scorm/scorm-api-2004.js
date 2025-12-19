/**
 * SCORM 2004 4th Edition API Adapter
 * 
 * This file provides the window.API_1484_11 object required by SCORM 2004 content.
 * It communicates with the LMS server via REST API.
 * 
 * Usage:
 * - Include this script in the SCORM player HTML before loading content
 * - SCORM content will search for window.API_1484_11 using the findAPI() pattern
 * - All CMI data operations are proxied to the server
 */

(function() {
  'use strict';

  // Configuration
  const API_BASE_URL = '/api/v1/scorm/runtime';
  const COMMIT_DEBOUNCE_MS = 2000; // Auto-commit after 2 seconds of inactivity

  // Error codes per SCORM 2004 spec
  const ERROR_CODES = {
    NO_ERROR: '0',
    GENERAL_EXCEPTION: '101',
    GENERAL_INITIALIZATION_FAILURE: '102',
    ALREADY_INITIALIZED: '103',
    CONTENT_INSTANCE_TERMINATED: '104',
    GENERAL_TERMINATION_FAILURE: '111',
    TERMINATION_BEFORE_INIT: '112',
    TERMINATION_AFTER_TERM: '113',
    RETRIEVE_BEFORE_INIT: '122',
    RETRIEVE_AFTER_TERM: '123',
    STORE_BEFORE_INIT: '132',
    STORE_AFTER_TERM: '133',
    COMMIT_BEFORE_INIT: '142',
    COMMIT_AFTER_TERM: '143',
    ARGUMENT_ERROR: '201',
    GENERAL_GET_FAILURE: '301',
    GENERAL_SET_FAILURE: '351',
    GENERAL_COMMIT_FAILURE: '391',
    UNDEFINED_DATA_MODEL_ELEMENT: '401',
    UNIMPLEMENTED_DATA_MODEL_ELEMENT: '402',
    DATA_MODEL_ELEMENT_VALUE_NOT_INITIALIZED: '403',
    DATA_MODEL_ELEMENT_IS_READ_ONLY: '404',
    DATA_MODEL_ELEMENT_IS_WRITE_ONLY: '405',
    DATA_MODEL_ELEMENT_TYPE_MISMATCH: '406',
    DATA_MODEL_ELEMENT_VALUE_OUT_OF_RANGE: '407',
    DATA_MODEL_DEPENDENCY_NOT_ESTABLISHED: '408'
  };

  const ERROR_STRINGS = {
    '0': 'No error',
    '101': 'General exception',
    '102': 'General initialization failure',
    '103': 'Already initialized',
    '104': 'Content instance terminated',
    '111': 'General termination failure',
    '112': 'Termination before initialization',
    '113': 'Termination after termination',
    '122': 'Retrieve data before initialization',
    '123': 'Retrieve data after termination',
    '132': 'Store data before initialization',
    '133': 'Store data after termination',
    '142': 'Commit before initialization',
    '143': 'Commit after termination',
    '201': 'General argument error',
    '301': 'General get failure',
    '351': 'General set failure',
    '391': 'General commit failure',
    '401': 'Undefined data model element',
    '402': 'Unimplemented data model element',
    '403': 'Data model element value not initialized',
    '404': 'Data model element is read only',
    '405': 'Data model element is write only',
    '406': 'Data model element type mismatch',
    '407': 'Data model element value out of range',
    '408': 'Data model dependency not established'
  };

  /**
   * SCORM 2004 API Implementation
   */
  class SCORM_2004_API {
    constructor(attemptId) {
      this.attemptId = attemptId;
      this.initialized = false;
      this.terminated = false;
      this.lastError = ERROR_CODES.NO_ERROR;
      this.pendingData = {}; // Local cache for uncommitted SetValue calls
      this.commitTimer = null;
      this.heartbeatInterval = null;
      
      console.log('[SCORM 2004 API] Created for attempt:', attemptId);
    }

    /**
     * Initialize - Initialize the session
     * @param {string} param - Empty string per SCORM spec
     * @returns {string} "true" or "false"
     */
    Initialize(param) {
      console.log('[SCORM 2004 API] Initialize called');

      if (this.initialized) {
        this.lastError = ERROR_CODES.ALREADY_INITIALIZED;
        console.error('[SCORM 2004 API] Already initialized');
        return 'false';
      }

      if (this.terminated) {
        this.lastError = ERROR_CODES.CONTENT_INSTANCE_TERMINATED;
        console.error('[SCORM 2004 API] Content instance terminated');
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
            
            console.log('[SCORM 2004 API] Initialized successfully');
            return 'true';
          }
        }
        
        this.lastError = response?.errorCode || ERROR_CODES.GENERAL_INITIALIZATION_FAILURE;
        console.error('[SCORM 2004 API] Initialize failed:', response);
        return 'false';
      } catch (err) {
        this.lastError = ERROR_CODES.GENERAL_INITIALIZATION_FAILURE;
        console.error('[SCORM 2004 API] Initialize error:', err);
        return 'false';
      }
    }

    /**
     * Terminate - Terminate the session
     * @param {string} param - Empty string per SCORM spec
     * @returns {string} "true" or "false"
     */
    Terminate(param) {
      console.log('[SCORM 2004 API] Terminate called');

      if (!this.initialized) {
        this.lastError = ERROR_CODES.TERMINATION_BEFORE_INIT;
        console.error('[SCORM 2004 API] Not initialized');
        return 'false';
      }

      if (this.terminated) {
        this.lastError = ERROR_CODES.TERMINATION_AFTER_TERM;
        console.error('[SCORM 2004 API] Already terminated');
        return 'false';
      }

      // Commit any pending data before terminating
      if (Object.keys(this.pendingData).length > 0) {
        this.Commit('');
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
            console.log('[SCORM 2004 API] Terminated successfully');
            return 'true';
          }
        }
        
        this.lastError = response?.errorCode || ERROR_CODES.GENERAL_TERMINATION_FAILURE;
        console.error('[SCORM 2004 API] Terminate failed:', response);
        return 'false';
      } catch (err) {
        this.lastError = ERROR_CODES.GENERAL_TERMINATION_FAILURE;
        console.error('[SCORM 2004 API] Terminate error:', err);
        return 'false';
      }
    }

    /**
     * GetValue - Get a CMI element value
     * @param {string} element - CMI element path (e.g., "cmi.score.raw")
     * @returns {string} Element value or empty string on error
     */
    GetValue(element) {
      console.log('[SCORM 2004 API] GetValue:', element);

      if (!this.initialized) {
        this.lastError = ERROR_CODES.RETRIEVE_BEFORE_INIT;
        console.error('[SCORM 2004 API] Not initialized');
        return '';
      }

      if (this.terminated) {
        this.lastError = ERROR_CODES.RETRIEVE_AFTER_TERM;
        console.error('[SCORM 2004 API] Already terminated');
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
        
        this.lastError = response?.errorCode || ERROR_CODES.UNDEFINED_DATA_MODEL_ELEMENT;
        console.error('[SCORM 2004 API] GetValue failed:', element);
        return '';
      } catch (err) {
        this.lastError = ERROR_CODES.GENERAL_GET_FAILURE;
        console.error('[SCORM 2004 API] GetValue error:', err);
        return '';
      }
    }

    /**
     * SetValue - Set a CMI element value
     * @param {string} element - CMI element path
     * @param {string} value - Value to set
     * @returns {string} "true" or "false"
     */
    SetValue(element, value) {
      console.log('[SCORM 2004 API] SetValue:', element, '=', value);

      if (!this.initialized) {
        this.lastError = ERROR_CODES.STORE_BEFORE_INIT;
        console.error('[SCORM 2004 API] Not initialized');
        return 'false';
      }

      if (this.terminated) {
        this.lastError = ERROR_CODES.STORE_AFTER_TERM;
        console.error('[SCORM 2004 API] Already terminated');
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
     * Commit - Persist pending data to server
     * @param {string} param - Empty string per SCORM spec
     * @returns {string} "true" or "false"
     */
    Commit(param) {
      console.log('[SCORM 2004 API] Commit called');

      if (!this.initialized) {
        this.lastError = ERROR_CODES.COMMIT_BEFORE_INIT;
        console.error('[SCORM 2004 API] Not initialized');
        return 'false';
      }

      if (this.terminated) {
        this.lastError = ERROR_CODES.COMMIT_AFTER_TERM;
        console.error('[SCORM 2004 API] Already terminated');
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
      try {
        // Send each pending element as a SetValue call
        for (const [element, value] of Object.entries(this.pendingData)) {
          const setXhr = new XMLHttpRequest();
          setXhr.open('PUT', `${API_BASE_URL}/${this.attemptId}/value/${encodeURIComponent(element)}`, false);
          setXhr.setRequestHeader('Content-Type', 'application/json');
          setXhr.send(JSON.stringify({ value }));
          
          if (setXhr.status !== 200) {
            console.error('[SCORM 2004 API] SetValue failed for', element);
          }
        }

        // Now commit
        const xhr = new XMLHttpRequest();
        xhr.open('POST', `${API_BASE_URL}/${this.attemptId}/commit`, false); // Synchronous
        xhr.setRequestHeader('Content-Type', 'application/json');
        xhr.send(JSON.stringify({}));
        
        if (xhr.status === 200) {
          const response = JSON.parse(xhr.responseText);
          if (response.result === 'true') {
            // Clear pending data
            this.pendingData = {};
            this.lastError = ERROR_CODES.NO_ERROR;
            console.log('[SCORM 2004 API] Commit successful');
            return 'true';
          }
        }
        
        this.lastError = ERROR_CODES.GENERAL_COMMIT_FAILURE;
        console.error('[SCORM 2004 API] Commit failed');
        return 'false';
      } catch (err) {
        this.lastError = ERROR_CODES.GENERAL_COMMIT_FAILURE;
        console.error('[SCORM 2004 API] Commit error:', err);
        return 'false';
      }
    }

    /**
     * GetLastError - Get last error code
     * @returns {string} Error code
     */
    GetLastError() {
      return this.lastError;
    }

    /**
     * GetErrorString - Get error description
     * @param {string} errorCode - Error code
     * @returns {string} Error description
     */
    GetErrorString(errorCode) {
      return ERROR_STRINGS[errorCode] || 'Unknown error';
    }

    /**
     * GetDiagnostic - Get diagnostic information
     * @param {string} errorCode - Error code
     * @returns {string} Diagnostic info
     */
    GetDiagnostic(errorCode) {
      // Return the same as error string for simplicity
      return this.GetErrorString(errorCode);
    }

    /**
     * Schedule auto-commit after debounce period
     */
    scheduleCommit() {
      if (this.commitTimer) {
        clearTimeout(this.commitTimer);
      }
      
      this.commitTimer = setTimeout(() => {
        console.log('[SCORM 2004 API] Auto-committing pending data');
        this.Commit('');
      }, COMMIT_DEBOUNCE_MS);
    }

    /**
     * Start heartbeat to keep session alive
     */
    startHeartbeat() {
      // Send heartbeat every 5 minutes
      this.heartbeatInterval = setInterval(() => {
        console.log('[SCORM 2004 API] Sending heartbeat');
        
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
  window.initializeSCORM_2004_API = function(attemptId) {
    if (!attemptId) {
      console.error('[SCORM 2004 API] Cannot initialize: attemptId is required');
      return false;
    }
    
    window.API_1484_11 = new SCORM_2004_API(attemptId);
    console.log('[SCORM 2004 API] window.API_1484_11 initialized for attempt:', attemptId);
    return true;
  };

  console.log('[SCORM 2004 API] Adapter loaded. Call window.initializeSCORM_2004_API(attemptId) to initialize.');
})();
