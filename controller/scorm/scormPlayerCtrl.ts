/**
 * SCORM Player Controller
 * 
 * Handles SCORM content delivery and player interface
 */

import { Request, Response } from 'express';
import ScormPackage from '../../model/Scorm/ScormPackage';
import ScormAttempt from '../../model/Scorm/ScormAttempt';
import path from 'path';

/**
 * Launch SCORM player with content
 * GET /api/v1/scorm/player/:packageId/launch
 */
export const launchPlayer = async (req: Request, res: Response) => {
  try {
    const { packageId } = req.params;
    const userId = (req as any).userAuth?._id;
    const userRole = (req as any).userAuth?.role;
    const authHeader = req.headers.authorization || '';

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized - user not authenticated'
      });
    }

    // Persist token for subsequent asset/runtime requests (sent as cookie)
    if (authHeader) {
      const rawToken = authHeader.startsWith('Bearer') ? authHeader.split(' ')[1] : authHeader;
      res.cookie('token', rawToken, {
        httpOnly: true,
        sameSite: 'lax'
      });
    }

    // Get package
    const scormPackage = await ScormPackage.findOne({ packageId }).populate('createdBy');

    if (!scormPackage) {
      return res.status(404).json({
        success: false,
        message: 'SCORM package not found'
      });
    }

    // Check if package is published (unless admin/teacher)
    if (scormPackage.status !== 'published' && !['admin', 'teacher'].includes(userRole)) {
      return res.status(403).json({
        success: false,
        message: 'Package is not published'
      });
    }

    // For students, check if package is assigned to them
    if (userRole === 'student') {
      const hasAccess = await (scormPackage as any).hasStudentAccess(userId);
      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          message: 'You do not have access to this package'
        });
      }

      // Check max attempts
      if (scormPackage.trackingOptions.maxAttempts) {
        const attemptCount = await ScormAttempt.countDocuments({
          student: userId,
          package: scormPackage._id
        });

        if (attemptCount >= scormPackage.trackingOptions.maxAttempts) {
          return res.status(403).json({
            success: false,
            message: `Maximum attempts (${scormPackage.trackingOptions.maxAttempts}) reached`
          });
        }
      }
    }

    // Get or create attempt
    let attempt = await ScormAttempt.findOne({
      student: userId,
      package: scormPackage._id,
      status: { $in: ['running', 'suspended'] }
    });

    if (!attempt) {
      // Create new attempt
      const attemptNumber = await ScormAttempt.countDocuments({
        student: userId,
        package: scormPackage._id
      }) + 1;

      attempt = await ScormAttempt.create({
        attemptId: `${scormPackage.packageId}-${attemptNumber}`,
        student: userId,
        package: scormPackage._id,
        attemptNumber,
        status: 'not_started',
        cmi: {
          core: {
            student_id: String(userId),
            student_name: (req as any).userAuth?.name || 'Student',
            lesson_status: 'not attempted',
            entry: 'ab-initio',
            score: {},
            session_time: '00:00:00',
            total_time: '00:00:00'
          }
        } as any
      });
    }

    // Update package stats
    await ScormPackage.updateStats(scormPackage.packageId, scormPackage._id as any);

    // Render player HTML
    const playerHTML = generatePlayerHTML({
      packageId: scormPackage.packageId,
      attemptId: String(attempt._id),
      title: scormPackage.title,
      version: scormPackage.version,
      launchUrl: scormPackage.launchUrl,
      timeLimit: scormPackage.trackingOptions.timeLimit,
      trackTime: scormPackage.trackingOptions.trackTime,
      trackScore: scormPackage.trackingOptions.trackScore,
      authToken: authHeader
    });

    res.setHeader('Content-Type', 'text/html');
    // Allow inline scripts/styles for the player shell so the embedded JS runs
    res.setHeader(
      'Content-Security-Policy',
      "default-src 'self' data: blob: filesystem:; " +
        "script-src 'self' 'unsafe-inline' 'unsafe-eval' data: blob: filesystem:; " +
        "style-src 'self' 'unsafe-inline' data: blob: filesystem:; " +
        "img-src 'self' data: blob: filesystem: https:; " +
        "connect-src 'self' https: data: blob: filesystem:; " +
        "media-src 'self' https: data: blob: filesystem:; " +
        "frame-src 'self' https: data: blob: filesystem:; " +
        "frame-ancestors 'self';"
    );
    return res.send(playerHTML);

  } catch (error: any) {
    console.error('Launch player error:', error);
    return res.status(500).json({
      success: false,
      message: 'Error launching SCORM player',
      error: error.message
    });
  }
};

/**
 * Serve SCORM content files
 * GET /api/v1/scorm/player/:packageId/content/*
 */
export const serveContent = async (req: Request, res: Response) => {
  try {
    const { packageId } = req.params;
    const filePath = req.params[0]; // Wildcard path

    // Get package to verify access
    const scormPackage = await ScormPackage.findOne({ packageId });

    if (!scormPackage) {
      return res.status(404).json({
        success: false,
        message: 'SCORM package not found'
      });
    }

    // Verify user has access (students must be assigned)
    const userId = (req as any).userAuth?._id;
    const userRole = (req as any).userAuth?.role;

    if (userRole === 'student') {
      const hasAccess = await (scormPackage as any).hasStudentAccess(userId);
      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }
    }

    // Construct file path
    const contentPath = path.join(
      process.cwd(),
      'scorm-content',
      'packages',
      packageId,
      filePath
    );

    // Security: prevent directory traversal
    const normalizedPath = path.normalize(contentPath);
    const packageDir = path.join(process.cwd(), 'scorm-content', 'packages', packageId);
    
    if (!normalizedPath.startsWith(packageDir)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied - invalid file path'
      });
    }

    // Determine content type
    const contentType = getContentType(filePath);
    res.setHeader('Content-Type', contentType);

    // Relax CSP for SCORM content (packages often rely on inline scripts/styles)
    res.setHeader(
      'Content-Security-Policy',
      "default-src 'self' data: blob: filesystem:; " +
        "script-src 'self' 'unsafe-inline' 'unsafe-eval' data: blob: filesystem:; " +
        "style-src 'self' 'unsafe-inline' data: blob: filesystem:; " +
        "img-src 'self' data: blob: filesystem: https:; " +
        "connect-src 'self' https: data: blob: filesystem:; " +
        "media-src 'self' https: data: blob: filesystem:; " +
        "frame-src 'self' https: data: blob: filesystem:; " +
        "frame-ancestors 'self';"
    );

    // Set cache headers for static content
    res.setHeader('Cache-Control', 'public, max-age=3600');

    // Send file
    return res.sendFile(normalizedPath);

  } catch (error: any) {
    console.error('Serve content error:', error);
    return res.status(500).json({
      success: false,
      message: 'Error serving content',
      error: error.message
    });
  }
};

/**
 * Close/Exit player
 * POST /api/v1/scorm/player/:attemptId/exit
 */
export const exitPlayer = async (req: Request, res: Response) => {
  try {
    const { attemptId } = req.params;
    const userId = (req as any).userAuth?._id;

    const attempt = await ScormAttempt.findById(attemptId);

    if (!attempt) {
      return res.status(404).json({
        success: false,
        message: 'Attempt not found'
      });
    }

    // Verify ownership
    if (String(attempt.student) !== String(userId)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Return final stats
    const cmiData = attempt.cmi as any; // Type assertion for flexible CMI access
    return res.json({
      success: true,
      data: {
        attemptId: attempt._id,
        status: attempt.status,
        score: cmiData?.core?.score?.raw || cmiData?.score?.raw || 0,
        completionStatus: cmiData?.core?.lesson_status || cmiData?.completion_status || 'unknown',
        totalTime: cmiData?.core?.total_time || cmiData?.total_time || '00:00:00'
      }
    });

  } catch (error: any) {
    console.error('Exit player error:', error);
    return res.status(500).json({
      success: false,
      message: 'Error exiting player',
      error: error.message
    });
  }
};

/**
 * Generate player HTML
 */
function generatePlayerHTML(options: {
  packageId: string;
  attemptId: string;
  title: string;
  version: string;
  launchUrl: string;
  timeLimit?: number;
  trackTime: boolean;
  trackScore: boolean;
  authToken: string;
}): string {
  const { packageId, attemptId, title, version, launchUrl, timeLimit, trackTime, trackScore, authToken } = options;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} - SCORM Player</title>
  
  <!-- SCORM API Adapters -->
  ${version === 'scorm_1.2' 
    ? '<script src="/scorm/scorm-api-1.2.js"></script>' 
    : '<script src="/scorm/scorm-api-2004.js"></script>'}
  <script src="/scorm/scorm-api-finder.js"></script>
  
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body, html {
      width: 100%;
      height: 100%;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      overflow: hidden;
    }
    
    #player-container {
      display: flex;
      flex-direction: column;
      height: 100%;
    }
    
    #player-header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 15px 20px;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
      z-index: 1000;
    }
    
    #player-header h1 {
      font-size: 20px;
      font-weight: 600;
      margin-bottom: 5px;
    }
    
    #player-header .subtitle {
      font-size: 13px;
      opacity: 0.9;
    }
    
    #scorm-frame {
      flex: 1;
      width: 100%;
      border: none;
      background: white;
    }
    
    #player-controls {
      background: #2d3748;
      color: white;
      padding: 15px 20px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.1);
      z-index: 1000;
    }
    
    .control-group {
      display: flex;
      align-items: center;
      gap: 20px;
    }
    
    .stat-item {
      display: flex;
      flex-direction: column;
      gap: 3px;
    }
    
    .stat-label {
      font-size: 11px;
      text-transform: uppercase;
      opacity: 0.7;
      letter-spacing: 0.5px;
    }
    
    .stat-value {
      font-size: 16px;
      font-weight: 600;
      font-variant-numeric: tabular-nums;
    }
    
    .status-indicator {
      display: inline-block;
      width: 8px;
      height: 8px;
      border-radius: 50%;
      margin-right: 6px;
      animation: pulse 2s ease-in-out infinite;
    }
    
    .status-active {
      background: #48bb78;
    }
    
    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }
    
    .btn {
      padding: 10px 20px;
      border: none;
      border-radius: 6px;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s ease;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    
    .btn-primary {
      background: #667eea;
      color: white;
    }
    
    .btn-primary:hover {
      background: #5568d3;
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
    }
    
    .btn-danger {
      background: #f56565;
      color: white;
    }
    
    .btn-danger:hover {
      background: #e53e3e;
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(245, 101, 101, 0.4);
    }
    
    ${timeLimit ? `
    .time-warning {
      color: #f6ad55;
    }
    
    .time-critical {
      color: #fc8181;
      animation: blink 1s ease-in-out infinite;
    }
    
    @keyframes blink {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.6; }
    }
    ` : ''}
    
    #loading-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.8);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 9999;
      backdrop-filter: blur(4px);
    }
    
    .spinner {
      border: 4px solid rgba(255, 255, 255, 0.1);
      border-top-color: #667eea;
      border-radius: 50%;
      width: 50px;
      height: 50px;
      animation: spin 1s linear infinite;
    }
    
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
  </style>
</head>
<body>
  <div id="player-container">
    <!-- Header -->
    <div id="player-header">
      <h1>${title}</h1>
      <div class="subtitle">SCORM ${version === 'scorm_1.2' ? '1.2' : '2004'} Content</div>
    </div>
    
    <!-- Content Frame -->
    <iframe id="scorm-frame" title="SCORM Content"></iframe>
    
    <!-- Player Controls -->
    <div id="player-controls">
      <div class="control-group">
        <div class="stat-item">
          <div class="stat-label">Status</div>
          <div class="stat-value">
            <span class="status-indicator status-active"></span>
            <span id="status-text">Initializing...</span>
          </div>
        </div>
        ${trackScore ? `
        <div class="stat-item">
          <div class="stat-label">Score</div>
          <div class="stat-value" id="score-text">--</div>
        </div>
        ` : ''}
        ${trackTime ? `
        <div class="stat-item">
          <div class="stat-label">Time ${timeLimit ? `(Limit: ${timeLimit}min)` : ''}</div>
          <div class="stat-value" id="time-text">00:00:00</div>
        </div>
        ` : ''}
      </div>
      
      <div class="control-group">
        <button class="btn btn-primary" onclick="suspendContent()" id="suspend-btn">
          Suspend & Save
        </button>
        <button class="btn btn-danger" onclick="exitContent()" id="exit-btn">
          Exit
        </button>
      </div>
    </div>
  </div>
  
  <!-- Loading Overlay -->
  <div id="loading-overlay">
    <div class="spinner"></div>
  </div>
  
  <script>
    // Configuration
    const CONFIG = {
      packageId: '${packageId}',
      attemptId: '${attemptId}',
      version: '${version}',
      launchUrl: '${launchUrl}',
      timeLimit: ${timeLimit || 'null'},
      trackTime: ${trackTime},
      trackScore: ${trackScore},
      authToken: '${authToken || ''}'
    };

    // Make token available to runtime adapters
    window.SCORM_AUTH_TOKEN = CONFIG.authToken;
    
    // State
    let sessionStart = Date.now();
    let timeElapsed = 0;
    let timerInterval = null;
    let scoreCheckInterval = null;
    let isExiting = false;
    
    // Initialize SCORM API
    function initializeSCORMAPI() {
      try {
        if (CONFIG.version === 'scorm_1.2') {
          if (window.initializeSCORM_12_API) {
            window.initializeSCORM_12_API(CONFIG.attemptId);
            console.log('[Player] SCORM 1.2 API initialized');

            // Alias for content that only searches for 2004 API
            if (window.API && !window.API_1484_11) {
              window.API_1484_11 = window.API;
              console.log('[Player] Aliased window.API to window.API_1484_11');
            }
          }
        } else {
          if (window.initializeSCORM_2004_API) {
            window.initializeSCORM_2004_API(CONFIG.attemptId);
            console.log('[Player] SCORM 2004 API initialized');

            // Alias for content that only searches for 1.2 API
            if (window.API_1484_11 && !window.API) {
              window.API = window.API_1484_11;
              console.log('[Player] Aliased window.API_1484_11 to window.API');
            }
          }
        }
      } catch (err) {
        console.error('[Player] Error initializing SCORM API:', err);
      }
    }
    
    // Load SCORM content
    function loadContent() {
      const iframe = document.getElementById('scorm-frame');
      const tokenQuery = CONFIG.authToken ? \`?token=\${encodeURIComponent(CONFIG.authToken)}\` : '';
      const contentUrl = \`/api/v1/scorm/player/\${CONFIG.packageId}/content/\${CONFIG.launchUrl}\${tokenQuery}\`;
      
      console.log('[Player] Loading content:', contentUrl);
      iframe.src = contentUrl;
      
      iframe.onload = function() {
        console.log('[Player] Content loaded');
        document.getElementById('loading-overlay').style.display = 'none';
        updateStatus('Running');
      };
      
      iframe.onerror = function() {
        console.error('[Player] Error loading content');
        updateStatus('Error');
        document.getElementById('loading-overlay').style.display = 'none';
      };
    }
    
    // Update status display
    function updateStatus(status) {
      document.getElementById('status-text').textContent = status;
    }
    
    // Update score display
    function updateScore() {
      if (!CONFIG.trackScore) return;
      
      try {
        const api = CONFIG.version === 'scorm_1.2' ? window.API : window.API_1484_11;
        if (!api) return;
        
        const scoreElement = CONFIG.version === 'scorm_1.2' ? 'cmi.core.score.raw' : 'cmi.score.raw';
        const score = api.LMSGetValue ? api.LMSGetValue(scoreElement) : api.GetValue(scoreElement);
        
        if (score && score !== '') {
          document.getElementById('score-text').textContent = score;
        }
      } catch (err) {
        console.error('[Player] Error getting score:', err);
      }
    }
    
    // Update time display
    function updateTime() {
      if (!CONFIG.trackTime) return;
      
      timeElapsed = Math.floor((Date.now() - sessionStart) / 1000);
      
      const hours = Math.floor(timeElapsed / 3600);
      const minutes = Math.floor((timeElapsed % 3600) / 60);
      const seconds = timeElapsed % 60;
      
      const timeText = \`\${pad(hours)}:\${pad(minutes)}:\${pad(seconds)}\`;
      const timeElement = document.getElementById('time-text');
      timeElement.textContent = timeText;
      
      // Check time limit
      if (CONFIG.timeLimit) {
        const limitSeconds = CONFIG.timeLimit * 60;
        const remaining = limitSeconds - timeElapsed;
        
        if (remaining <= 0) {
          // Time's up
          timeElement.classList.add('time-critical');
          alert('Time limit reached. Your progress has been saved.');
          exitContent();
        } else if (remaining <= 300) {
          // 5 minutes remaining
          timeElement.classList.add('time-critical');
        } else if (remaining <= 600) {
          // 10 minutes remaining
          timeElement.classList.add('time-warning');
        }
      }
    }
    
    function pad(num) {
      return String(num).padStart(2, '0');
    }
    
    // Suspend content
    function suspendContent() {
      if (isExiting) return;
      
      const api = CONFIG.version === 'scorm_1.2' ? window.API : window.API_1484_11;
      if (api) {
        try {
          // Commit current data
          if (api.LMSCommit) {
            api.LMSCommit('');
          } else if (api.Commit) {
            api.Commit('');
          }
          
          alert('Progress saved successfully!');
          updateStatus('Suspended');
        } catch (err) {
          console.error('[Player] Error suspending:', err);
          alert('Error saving progress');
        }
      }
    }
    
    // Exit content
    function exitContent() {
      if (isExiting) return;
      isExiting = true;
      
      if (!confirm('Are you sure you want to exit? Your progress will be saved.')) {
        isExiting = false;
        return;
      }
      
      // Terminate SCORM session
      const api = CONFIG.version === 'scorm_1.2' ? window.API : window.API_1484_11;
      if (api) {
        try {
          if (api.LMSFinish) {
            api.LMSFinish('');
          } else if (api.Terminate) {
            api.Terminate('');
          }
        } catch (err) {
          console.error('[Player] Error terminating:', err);
        }
      }

      // Notify backend of exit for final stats (best-effort)
      fetch(`/api/v1/scorm/player/${CONFIG.attemptId}/exit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(CONFIG.authToken ? { Authorization: CONFIG.authToken } : {}),
        },
      }).catch((err) => console.warn('[Player] Exit notify failed:', err));
      
      // Clean up
      if (timerInterval) clearInterval(timerInterval);
      if (scoreCheckInterval) clearInterval(scoreCheckInterval);
      
      // Inform user and close if possible; avoid redirecting to API root
      updateStatus('Exited');
      alert('Session closed. You may now close this window.');
      if (window.opener) {
        window.close();
      }
    }
    
    // Handle page unload
    window.addEventListener('beforeunload', function(e) {
      if (isExiting) return;
      
      const api = CONFIG.version === 'scorm_1.2' ? window.API : window.API_1484_11;
      if (api) {
        try {
          if (api.LMSCommit) {
            api.LMSCommit('');
          } else if (api.Commit) {
            api.Commit('');
          }
        } catch (err) {
          console.error('[Player] Error on unload:', err);
        }
      }
      
      e.preventDefault();
      e.returnValue = '';
    });
    
    // Initialize
    document.addEventListener('DOMContentLoaded', function() {
      console.log('[Player] Initializing player...');
      
      // Initialize SCORM API
      initializeSCORMAPI();

      // Extra safety: expose API on the player window globally after init
      if (window.API && !window.API_1484_11) {
        window.API_1484_11 = window.API;
      }
      if (window.API_1484_11 && !window.API) {
        window.API = window.API_1484_11;
      }
      
      // Load content
      loadContent();
      
      // Start timer if tracking time
      if (CONFIG.trackTime) {
        timerInterval = setInterval(updateTime, 1000);
      }
      
      // Start score check if tracking score
      if (CONFIG.trackScore) {
        scoreCheckInterval = setInterval(updateScore, 5000);
      }
    });
  </script>
</body>
</html>`;
}

/**
 * Get content type for file
 */
function getContentType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  
  const types: Record<string, string> = {
    '.html': 'text/html',
    '.htm': 'text/html',
    '.css': 'text/css',
    '.js': 'application/javascript',
    '.json': 'application/json',
    '.xml': 'application/xml',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.webp': 'image/webp',
    '.mp4': 'video/mp4',
    '.webm': 'video/webm',
    '.mp3': 'audio/mpeg',
    '.wav': 'audio/wav',
    '.ogg': 'audio/ogg',
    '.pdf': 'application/pdf',
    '.swf': 'application/x-shockwave-flash',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
    '.ttf': 'font/ttf',
    '.eot': 'application/vnd.ms-fontobject'
  };
  
  return types[ext] || 'application/octet-stream';
}
