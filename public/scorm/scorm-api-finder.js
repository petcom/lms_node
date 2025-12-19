/**
 * SCORM API Discovery Helper
 * 
 * This utility helps SCORM content find the API object in the window hierarchy.
 * Per SCORM spec, content should search up to 7 levels in the window parent chain.
 * 
 * Usage:
 * - Include this script in SCORM content or player
 * - Call findAPI() or findAPI_1484_11() to locate the API
 */

(function() {
  'use strict';

  /**
   * Find SCORM 1.2 API object
   * Searches window hierarchy for window.API
   * 
   * @param {Window} win - Window object to start search from
   * @returns {Object|null} API object or null if not found
   */
  function findAPI(win) {
    let findAttempts = 0;
    const maxAttempts = 7;

    while ((win.API == null) && (win.parent != null) && (win.parent != win)) {
      findAttempts++;
      
      // Check if we've reached the max attempts
      if (findAttempts > maxAttempts) {
        console.error('[SCORM API Finder] API not found after', maxAttempts, 'attempts');
        return null;
      }

      win = win.parent;
    }

    if (win.API != null) {
      console.log('[SCORM API Finder] SCORM 1.2 API found at level', findAttempts);
      return win.API;
    }

    console.error('[SCORM API Finder] SCORM 1.2 API not found');
    return null;
  }

  /**
   * Find SCORM 2004 API object
   * Searches window hierarchy for window.API_1484_11
   * 
   * @param {Window} win - Window object to start search from
   * @returns {Object|null} API object or null if not found
   */
  function findAPI_1484_11(win) {
    let findAttempts = 0;
    const maxAttempts = 7;

    while ((win.API_1484_11 == null) && (win.parent != null) && (win.parent != win)) {
      findAttempts++;
      
      // Check if we've reached the max attempts
      if (findAttempts > maxAttempts) {
        console.error('[SCORM API Finder] API_1484_11 not found after', maxAttempts, 'attempts');
        return null;
      }

      win = win.parent;
    }

    if (win.API_1484_11 != null) {
      console.log('[SCORM API Finder] SCORM 2004 API found at level', findAttempts);
      return win.API_1484_11;
    }

    console.error('[SCORM API Finder] SCORM 2004 API not found');
    return null;
  }

  /**
   * Auto-detect SCORM version and find appropriate API
   * Tries SCORM 2004 first, then falls back to SCORM 1.2
   * 
   * @param {Window} win - Window object to start search from
   * @returns {Object|null} API object with version info, or null if not found
   */
  function findSCORMAPI(win) {
    // Try SCORM 2004 first
    let api = findAPI_1484_11(win);
    if (api != null) {
      return {
        version: '2004',
        api: api
      };
    }

    // Fall back to SCORM 1.2
    api = findAPI(win);
    if (api != null) {
      return {
        version: '1.2',
        api: api
      };
    }

    console.error('[SCORM API Finder] No SCORM API found (tried 1.2 and 2004)');
    return null;
  }

  /**
   * Get SCORM API from opener window (for popup windows)
   * 
   * @returns {Object|null} API object or null if not found
   */
  function getAPIFromOpener() {
    if (window.opener != null) {
      console.log('[SCORM API Finder] Searching in opener window');
      return findSCORMAPI(window.opener);
    }
    return null;
  }

  /**
   * Initialize SCORM API connection
   * Searches in parent hierarchy and opener window
   * 
   * @returns {Object|null} API object with version info, or null if not found
   */
  function initializeSCORMAPI() {
    // Try parent hierarchy first
    let result = findSCORMAPI(window);
    
    // If not found, try opener window
    if (result == null) {
      result = getAPIFromOpener();
    }

    if (result != null) {
      console.log('[SCORM API Finder] SCORM API initialized:', result.version);
      
      // Store globally for easy access
      window.SCORM_API = result.api;
      window.SCORM_VERSION = result.version;
      
      return result;
    }

    console.error('[SCORM API Finder] Failed to initialize SCORM API');
    return null;
  }

  // Export functions
  window.findAPI = findAPI;
  window.findAPI_1484_11 = findAPI_1484_11;
  window.findSCORMAPI = findSCORMAPI;
  window.getAPIFromOpener = getAPIFromOpener;
  window.initializeSCORMAPI = initializeSCORMAPI;

  console.log('[SCORM API Finder] Helper functions loaded');
  console.log('Available functions: findAPI(), findAPI_1484_11(), findSCORMAPI(), initializeSCORMAPI()');
})();
