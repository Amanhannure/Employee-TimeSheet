// ==================== COMPLETE ENHANCED API CLIENT (FIXED VERSION) ====================
// UPDATED WITH TEAM LEADER FUNCTIONALITY + LATE SUBMISSION PERMISSIONS

class ApiClient {
    constructor() {
        this.clearProblematicStorage();
       
        // Dynamic base URL - supports different environments
        this.baseURL = this.getBaseURL();
        this.token = localStorage.getItem('authToken');
        this.isOnline = true;
        this.retryCount = 0;
        this.maxRetries = 3;
        this.requestTimeout = 30000; // 30 seconds
        this.offlineQueue = [];
        this.isProcessingQueue = false;
        this.forceMockMode = window.FORCE_MOCK_MODE || false;
        
        console.log('🔗 API Client initialized with base URL:', this.baseURL);
        
        // Initialize offline support
        this.initOfflineSupport();
        
        // Initialize timesheet logging
        this.initTimesheetLogging();
        
        // Auto-test connection
        this.autoTestConnection();

        this.safeAutoTest();
    }

    clearProblematicStorage() {
        try {
            // Clear the massive offline queue that causes loops
            localStorage.removeItem('apiOfflineQueue');
            
            // Clear old failed attempts
            sessionStorage.removeItem('login_attempts');
            sessionStorage.removeItem('admin_login_attempts');
            
            // Limit timesheet logs to prevent storage bloat
            const savedLogs = localStorage.getItem('timesheetLogs');
            if (savedLogs) {
                const logs = JSON.parse(savedLogs);
                if (logs.length > 100) {
                    localStorage.setItem('timesheetLogs', JSON.stringify(logs.slice(0, 100)));
                    console.log('📋 Trimmed timesheet logs from', logs.length, 'to 100');
                }
            }
        } catch (error) {
            console.warn('Storage cleanup warning:', error);
        }
    }

    safeAutoTest() {
        // Non-blocking, single health check
        setTimeout(() => {
            this.testConnection().then(status => {
                console.log('🔌 Connection test:', status);
            }).catch(error => {
                console.log('🔌 Connection test failed (non-critical):', error.message);
            });
        }, 2000); // Delay to let page load first
    }

    clearAllQueues() {
        console.log('🧹 Clearing all queues and storage...');
        
        // Clear offline queue
        this.offlineQueue = [];
        this.saveOfflineQueue();
        
        // Clear timesheet logs if they're too big
        if (this.timesheetLogs.length > 100) {
            this.timesheetLogs = this.timesheetLogs.slice(0, 100);
            this.saveTimesheetLogs();
        }
        
        // Clear localStorage items
        localStorage.removeItem('apiOfflineQueue');
        sessionStorage.clear();
        
        console.log('✅ All queues cleared');
    }

    // ==================== CONFIGURATION & INITIALIZATION ====================

    getBaseURL() {
        if (window.APP_CONFIG && window.APP_CONFIG.API_BASE_URL) {
            return window.APP_CONFIG.API_BASE_URL;
        }
        
        const savedURL = localStorage.getItem('apiBaseURL');
        if (savedURL) {
            return savedURL;
        }
        
        // Default to current origin with /api path
        const protocol = window.location.protocol;
        const host = window.location.hostname;
        const port = window.location.port;
        
        // Use port 5000 for backend if different from frontend
        const backendPort = port === '5500' || port === '5501' ? '5000' : port;
        return `${protocol}//${host}:${backendPort}/api`;
    }

    setBaseURL(url) {
        this.baseURL = url;
        localStorage.setItem('apiBaseURL', url);
        console.log('🔗 Updated API base URL:', url);
    }

    setToken(token) {
        this.token = token;
        localStorage.setItem('authToken', token);
        console.log('🔑 Authentication token set');
    }

    async autoTestConnection() {
        const isConnected = await this.testConnection();
        if (!isConnected && !this.forceMockMode) {
            this.safeNotification(
                'Running in offline mode. Some features may be limited.',
                'warning',
                8000
            );
        }
    }

    // ==================== COMPREHENSIVE TIMESHEET LOGGING SYSTEM ====================

    initTimesheetLogging() {
        console.log('📊 Timesheet logging system initialized');
        this.timesheetLogs = [];
        this.maxLogs = 200; // Keep last 200 logs
        
        // Load existing logs from localStorage
        this.loadTimesheetLogs();
        
        // Log system startup
        this.logTimesheetOperation('SYSTEM_STARTUP', {
            baseURL: this.baseURL,
            user: this.getSafeUserData()?.employeeId || 'unknown',
            timestamp: new Date().toISOString(),
            forceMockMode: this.forceMockMode
        }, 'info');
    }

    // Enhanced logging method with comprehensive tracking
    logTimesheetOperation(operation, data, status = 'info') {
        const logEntry = {
            id: this.generateId(),
            timestamp: new Date().toISOString(),
            operation,
            data: this.sanitizeLogData(data),
            status,
            user: this.getSafeUserData()?.employeeId || 'unknown',
            sessionId: this.getSessionId(),
            userAgent: navigator.userAgent.substring(0, 100),
            url: window.location.href,
            version: '2.0.0'
        };
        
        // Add to beginning of array (most recent first)
        this.timesheetLogs.unshift(logEntry);
        
        // Keep only maxLogs entries
        if (this.timesheetLogs.length > this.maxLogs) {
            this.timesheetLogs = this.timesheetLogs.slice(0, this.maxLogs);
        }
        
        // Save to localStorage
        this.saveTimesheetLogs();
        
        // Console output with emojis and colors
        this.consoleLogWithStyle(operation, data, status);
        
        return logEntry;
    }

    // Advanced sanitization for sensitive data
    sanitizeLogData(data) {
        if (typeof data !== 'object' || data === null) return data;
        
        const sanitized = { ...data };
        const sensitiveFields = [
            'password', 'token', 'authorization', 'secret', 
            'ssn', 'creditCard', 'sessionId', 'jwt', 'apiKey'
        ];
        
        sensitiveFields.forEach(field => {
            if (sanitized[field]) {
                sanitized[field] = '***REDACTED***';
            }
            // Also check nested fields
            Object.keys(sanitized).forEach(key => {
                if (typeof sanitized[key] === 'object' && sanitized[key] !== null && sanitized[key][field]) {
                    sanitized[key][field] = '***REDACTED***';
                }
            });
        });
        
        // Sanitize nested objects recursively
        Object.keys(sanitized).forEach(key => {
            if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
                sanitized[key] = this.sanitizeLogData(sanitized[key]);
            }
        });
        
        return sanitized;
    }

    // Enhanced console logging with beautiful styles
    consoleLogWithStyle(operation, data, status) {
        const emoji = this.getStatusEmoji(status);
        const style = this.getConsoleStyle(status);
        const timestamp = new Date().toLocaleTimeString();
        
        const logMessage = `${emoji} [TIMESHEET] ${timestamp} ${operation}`;
        
        if (status === 'error') {
            console.error(`%c${logMessage}`, style, data);
        } else if (status === 'warning') {
            console.warn(`%c${logMessage}`, style, data);
        } else {
            console.log(`%c${logMessage}`, style, data);
        }
    }

    getStatusEmoji(status) {
        const emojis = {
            'info': 'ℹ️',
            'success': '✅',
            'warning': '⚠️',
            'error': '❌',
            'submission': '📤',
            'approval': '👍',
            'rejection': '👎',
            'edit': '✏️',
            'resubmission': '🔄',
            'export': '📥',
            'import': '📤',
            'archive': '🗄️',
            'delete': '🗑️',
            'search': '🔍',
            'analysis': '📊',
            'authentication': '🔐',
            'authorization': '🚫',
            'validation': '⚡',
            'network': '🌐'
        };
        return emojis[status] || '📝';
    }

    getConsoleStyle(status) {
        const styles = {
            'info': 'color: #007bff; font-weight: bold; background: #f8f9fa; padding: 2px 4px; border-radius: 3px;',
            'success': 'color: #28a745; font-weight: bold; background: #d4edda; padding: 2px 4px; border-radius: 3px;',
            'warning': 'color: #ffc107; font-weight: bold; background: #fff3cd; padding: 2px 4px; border-radius: 3px;',
            'error': 'color: #dc3545; font-weight: bold; background: #f8d7da; padding: 2px 4px; border-radius: 3px;',
            'submission': 'color: #6f42c1; font-weight: bold; background: #e9ecef; padding: 2px 4px; border-radius: 3px;',
            'approval': 'color: #20c997; font-weight: bold; background: #d1f2eb; padding: 2px 4px; border-radius: 3px;',
            'rejection': 'color: #fd7e14; font-weight: bold; background: #ffe5d0; padding: 2px 4px; border-radius: 3px;'
        };
        return styles[status] || 'color: gray; font-weight: bold; padding: 2px 4px; border-radius: 3px;';
    }

    saveTimesheetLogs() {
        try {
            localStorage.setItem('timesheetLogs', JSON.stringify(this.timesheetLogs));
        } catch (error) {
            console.warn('Could not save timesheet logs:', error);
        }
    }

    loadTimesheetLogs() {
        try {
            const savedLogs = localStorage.getItem('timesheetLogs');
            if (savedLogs) {
                this.timesheetLogs = JSON.parse(savedLogs);
                console.log(`📋 Loaded ${this.timesheetLogs.length} timesheet logs from storage`);
            }
        } catch (error) {
            console.warn('Could not load timesheet logs:', error);
            this.timesheetLogs = [];
        }
    }

    getTimesheetLogs(limit = 50, filters = {}) {
        let filteredLogs = this.timesheetLogs;
        
        if (filters.operation) {
            filteredLogs = filteredLogs.filter(log => 
                log.operation.includes(filters.operation)
            );
        }
        
        if (filters.status) {
            filteredLogs = filteredLogs.filter(log => log.status === filters.status);
        }
        
        if (filters.startDate) {
            filteredLogs = filteredLogs.filter(log => 
                new Date(log.timestamp) >= new Date(filters.startDate)
            );
        }
        
        if (filters.endDate) {
            filteredLogs = filteredLogs.filter(log => 
                new Date(log.timestamp) <= new Date(filters.endDate)
            );
        }
        
        if (filters.user) {
            filteredLogs = filteredLogs.filter(log => log.user === filters.user);
        }
        
        return filteredLogs.slice(0, limit);
    }

    clearTimesheetLogs() {
        this.timesheetLogs = [];
        this.saveTimesheetLogs();
        console.log('🗑️ Cleared timesheet logs');
    }

    getSessionId() {
        let sessionId = sessionStorage.getItem('sessionId');
        if (!sessionId) {
            sessionId = this.generateId();
            sessionStorage.setItem('sessionId', sessionId);
        }
        return sessionId;
    }

    // ==================== ADVANCED REQUEST HANDLER ====================

    async request(endpoint, options = {}) {
        // Force mock mode if enabled
        if (this.forceMockMode) {
            return this.handleMockRequest(endpoint, options);
        }

        const url = `${this.baseURL}${endpoint}`;
        const requestId = this.generateId();
        
        const config = {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'X-Request-ID': requestId,
                'X-Client-Version': '2.0.0',
                'X-Client-Timestamp': new Date().toISOString(),
                ...options.headers
            },
            ...options
        };

        if (this.token) {
            config.headers['Authorization'] = `Bearer ${this.token}`;
        }

        if (config.body && typeof config.body === 'object' && config.method !== 'GET') {
            config.body = JSON.stringify(config.body);
        }

        // Log request start with performance tracking
        const startTime = performance.now();
        this.logTimesheetOperation('API_REQUEST_START', {
            requestId,
            endpoint,
            method: config.method,
            url,
            bodySize: config.body ? config.body.length : 0
        }, 'info');

        let lastError;
        
        for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), this.requestTimeout);
                config.signal = controller.signal;
                
                const response = await fetch(url, config);
                clearTimeout(timeoutId);
                
                if (!response.ok) {
                    return await this.handleErrorResponse(response, url, attempt, requestId);
                }
                
                this.retryCount = 0;
                this.isOnline = true;
                
                if (this.offlineQueue.length > 0 && attempt === 1) {
                    this.processOfflineQueue();
                }
                
                const data = await this.parseResponse(response);
                const endTime = performance.now();
                const duration = endTime - startTime;
                
                // Log successful response with performance data
                this.logTimesheetOperation('API_REQUEST_SUCCESS', {
                    requestId,
                    endpoint,
                    method: config.method,
                    status: response.status,
                    responseSize: this.getResponseSize(data),
                    duration: duration.toFixed(2) + 'ms',
                    attempt
                }, 'success');
                
                return data;
                
            } catch (error) {
                lastError = error;
                const endTime = performance.now();
                const duration = endTime - startTime;
                
                this.logTimesheetOperation('API_REQUEST_RETRY', {
                    requestId,
                    endpoint,
                    attempt,
                    maxRetries: this.maxRetries,
                    error: error.message,
                    duration: duration.toFixed(2) + 'ms'
                }, 'warning');
                
                if (error.name === 'AbortError' || error.name === 'TypeError') {
                    break;
                }
                
                if (attempt < this.maxRetries) {
                    const delay = Math.min(1000 * Math.pow(2, attempt), 10000);
                    await this.delay(delay);
                }
            }
        }
        
        return this.handleRequestError(lastError, url, endpoint, config, requestId);
    }

    async parseResponse(response) {
        const contentType = response.headers.get('content-type');
        let data;

        try {
            if (contentType && contentType.includes('application/json')) {
                data = await response.json();
            } else if (contentType && contentType.includes('text/csv')) {
                data = await response.text();
            } else if (contentType && contentType.includes('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')) {
                data = await response.blob();
            } else if (contentType && contentType.includes('text/plain')) {
                data = await response.text();
            } else {
                data = await response.blob();
            }
        } catch (parseError) {
            console.warn('Parse error:', parseError);
            throw new Error(`Failed to parse response: ${parseError.message}`);
        }

        return data;
    }

    getResponseSize(data) {
        if (typeof data === 'string') {
            return `${data.length} characters`;
        } else if (data instanceof Blob) {
            return `${data.size} bytes`;
        } else if (typeof data === 'object') {
            return `${JSON.stringify(data).length} bytes`;
        }
        return 'unknown';
    }

    async handleErrorResponse(response, url, attempt, requestId) {
        let errorMessage = `Server error: ${response.status}`;
        let errorData = null;
        let userMessage = 'An unexpected error occurred';

        try {
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                errorData = await response.json();
                errorMessage = errorData.message || errorMessage;
                userMessage = errorData.userMessage || userMessage;
                
                if (errorData.errors) {
                    errorMessage += ` - ${JSON.stringify(errorData.errors)}`;
                    userMessage = 'Please check your input data';
                }
            } else {
                errorMessage = await response.text() || errorMessage;
            }
        } catch (parseError) {
            console.warn('Could not parse error response:', parseError);
        }

        const error = new Error(errorMessage);
        error.status = response.status;
        error.data = errorData;
        error.url = url;
        error.userMessage = userMessage;
        error.attempt = attempt;

        // Log error response
        this.logTimesheetOperation('API_REQUEST_ERROR', {
            requestId,
            url,
            status: response.status,
            attempt,
            error: errorMessage,
            userMessage
        }, 'error');

        switch (response.status) {
            case 400:
                error.userMessage = userMessage || 'Invalid request data. Please check your input.';
                break;
            case 401:
                error.userMessage = 'Your session has expired. Please login again.';
                this.handleUnauthorized();
                break;
            case 403:
                error.userMessage = 'You do not have permission to access this resource.';
                break;
            case 404:
                error.userMessage = 'The requested resource was not found.';
                break;
            case 409:
                error.userMessage = 'This action conflicts with existing data.';
                break;
            case 422:
                error.userMessage = 'Please check your input data.';
                break;
            case 429:
                error.userMessage = 'Too many requests. Please try again later.';
                break;
            case 500:
                error.userMessage = 'Server error. Please try again later.';
                break;
            case 502:
            case 503:
            case 504:
                error.userMessage = 'Service temporarily unavailable. Please try again later.';
                break;
            default:
                error.userMessage = `Server error (${response.status}). Please try again.`;
        }

        throw error;
    }

    handleRequestError(error, url, endpoint, config, requestId) {
        this.isOnline = false;
        this.retryCount++;
        
        const enhancedError = new Error(
            error.message.includes('Failed to fetch') 
                ? 'Cannot connect to server. Please check your network connection and ensure the backend is running.'
                : error.message
        );
        
        enhancedError.originalError = error;
        enhancedError.isNetworkError = true;
        enhancedError.endpoint = endpoint;
        enhancedError.userMessage = 'Network connection failed. Using offline mode.';
        enhancedError.config = config;

        // Log network error
        this.logTimesheetOperation('NETWORK_ERROR', {
            requestId,
            endpoint,
            error: error.message,
            retryCount: this.retryCount,
            isOnline: this.isOnline
        }, 'error');

        if (config.method !== 'GET') {
            this.addToOfflineQueue(endpoint, config);
        }
        
        if (this.retryCount >= this.maxRetries) {
            this.safeNotification(
                'Cannot connect to server. Using offline mode. Some features may be limited.',
                'warning',
                8000
            );
        }
        
        throw enhancedError;
    }

    // ==================== MOCK REQUEST HANDLER ====================

    async handleMockRequest(endpoint, options = {}) {
        console.log('🔧 MOCK MODE: Handling request for', endpoint);
        
        // Simulate network delay
        await this.delay(300 + Math.random() * 700);
        
        const mockResponses = {
            // Auth endpoints
            '/auth/login': this.mockLogin(options.body),
            '/auth/me': this.getSafeUserData() || this.getMockUsers()[0],
            '/auth/profile': { success: true, message: 'Profile updated successfully' },
            
            // Password reset endpoints
            '/auth/password/forgot': this.mockInitiatePasswordReset(options.body),
            '/auth/password/verify-security': { success: true, resetToken: 'mock-reset-token' },
            '/auth/password/verify-email': { success: true, resetToken: 'mock-reset-token' },
            '/auth/password/reset': { success: true, message: 'Password reset successful' },
            '/auth/password/send-code': { success: true, message: 'Verification code sent', maskedEmail: 't****@company.com' },
            
            // Timesheet endpoints
            '/timesheets/my-timesheets': this.getMockTimesheets(),
            '/timesheets/submit': this.mockSubmitTimesheet(options.body),
            '/timesheets/editable-timesheets': this.getMockEditableTimesheets(),
            '/timesheets/check-submission-block': { isBlocked: false, message: '' },
            
            // CSV export
            '/timesheets/export/mock-timesheet-id': this.generateMockCSVResponse('mock-timesheet-id'),
            
            // Project endpoints
            '/projects/my-projects': this.getMockProjects(),
            '/projects': this.getMockProjects(),
            
            // Activity code endpoints
            '/activity-codes': this.getMockActivityCodes(),
            
            // Dashboard endpoints
            '/dashboard/stats': this.getMockDashboardStats(),
            '/dashboard/analytics': this.getMockAnalytics(),
            
            // User endpoints
            '/users': { users: this.getMockUsers() },
            
            // Report endpoints
            '/reports/hours-tracking': this.getMockHoursTracking(options.body),
            '/reports/employee-report': this.getMockEmployeeReport(options.body),
            
            // Health check
            '/health': { status: 'OK', message: 'Mock server is running', timestamp: new Date().toISOString() },
            
            // Project export endpoints
            '/projects/:id/export': this.generateMockExcelResponse('project'),
            '/projects/export/all': this.generateMockExcelResponse('all-projects'),
            '/reports/export-project-excel': this.generateMockExcelResponse('project-report'),
            
            // Team leader endpoints
            '/users/team-leaders': this.getMockTeamLeaders(),
            '/users/team-leaders/:department': this.getMockTeamLeaders(),
            '/users/:id/team-members': this.getMockTeamMembers(),
            '/users/bulk-team-leader': { success: true, updated: 3, failed: 0 },
            
            // Late submission endpoints
            '/late-submissions/check': { hasPermission: true, permissionId: 'mock-permission-1' },
            '/late-submissions/employee/:id': [{ id: 'mock-permission-1', date: '2024-01-15', status: 'active' }],
            '/late-submissions/grant': { success: true, permission: { id: 'mock-permission-2', date: '2024-01-15' }},
            '/late-submissions/admin/all': [{ id: 'mock-permission-1', employeeId: 'T1166', date: '2024-01-15', status: 'active' }],
            '/late-submissions/admin/stats': { totalPermissions: 5, active: 3, used: 2, expired: 0 },
            '/late-submissions/admin/revoke/:id': { success: true, message: 'Permission revoked' },
            '/late-submissions/mark-used/:id': { success: true, message: 'Permission marked as used' },
            
            // Leave management endpoints
            '/leave/balance/my': this.getMockLeaveBalance(),
            '/leave/balance/all': [this.getMockLeaveBalance().leaveBalance],
            '/leave/balance/:id': { success: true, message: 'Balance updated' },
            '/leave/balance/:id/status': { success: true, message: 'Status updated' },
            '/leave/balance/monthly-accrual': { updatedCount: 45, date: new Date().toISOString() },
            '/leave/my-requests': [{ id: 'mock-leave-1', type: 'privilegeLeave', status: 'pending', days: 2 }],
            '/leave/submit': { id: 'mock-leave-2', type: 'sickLeave', status: 'pending', days: 1 },
            '/leave/:id/cancel': { success: true, message: 'Leave cancelled' },
            '/api/leave': [{ id: 'mock-leave-1', type: 'privilegeLeave', status: 'pending' }],
            '/leave/:id/approve': { success: true, message: 'Leave approved' },
            '/leave/:id/reject': { success: true, message: 'Leave rejected' },
            '/leave/:id': { id: 'mock-leave-1', type: 'privilegeLeave', status: 'pending' },
            '/leave/calendar': [{ id: 'mock-calendar-1', title: 'Leave', start: '2024-01-15', end: '2024-01-16' }],
            '/leave/analytics': { totalLeaves: 45, approved: 30, pending: 10, rejected: 5 }
        };

        const response = mockResponses[endpoint] || { 
            mock: true, 
            endpoint, 
            message: 'Mock response for ' + endpoint 
        };

        this.logTimesheetOperation('MOCK_REQUEST', {
            endpoint,
            method: options.method,
            response: response
        }, 'info');

        return response;
    }

    mockLogin(credentials) {
        const mockUser = {
            _id: 'mock-user-id',
            employeeId: credentials.username || 'T1166',
            firstName: 'Mock',
            lastName: 'User',
            email: `${credentials.username}@company.com`,
            department: 'IT',
            role: 'employee',
            status: 'active'
        };

        return {
            token: 'mock-jwt-token-' + Date.now(),
            user: mockUser,
            message: 'Login successful (mock mode)'
        };
    }

    mockInitiatePasswordReset(data) {
        // Handle both string (email) and object formats
        const email = typeof data === 'string' ? data : (data.email || 'T1166@company.com');
        
        return {
            success: true,
            message: 'Password reset initiated',
            user: {
                employeeId: email.split('@')[0].toUpperCase(),
                maskedEmail: 't****@company.com',
                securityQuestion: 'What is your favorite color?',
                hasSecurityQuestion: true,
                hasEmail: true
            },
            availableMethods: ['security_question', 'email'],
            autoProceed: false,
            contactAdmin: false
        };
    }

    mockSubmitTimesheet(timesheetData) {
        return {
            _id: 'mock-timesheet-' + Date.now(),
            ...timesheetData,
            status: 'pending',
            submittedAt: new Date().toISOString(),
            weekNumber: this.getWeekNumber(timesheetData.weekStartDate)
        };
    }

    // ==================== OFFLINE SUPPORT SYSTEM ====================

    initOfflineSupport() {
        window.addEventListener('online', () => {
            console.log('🌐 App is online');
            this.isOnline = true;
            this.logTimesheetOperation('NETWORK_ONLINE', {}, 'info');
            this.processOfflineQueue();
        });

        window.addEventListener('offline', () => {
            console.log('📴 App is offline');
            this.isOnline = false;
            this.logTimesheetOperation('NETWORK_OFFLINE', {}, 'warning');
        });

        this.loadOfflineQueue();
    }

    addToOfflineQueue(endpoint, config) {
        const queueItem = {
            endpoint,
            config,
            timestamp: new Date().toISOString(),
            id: this.generateId(),
            attempts: 0,
            maxAttempts: 3
        };

        this.offlineQueue.push(queueItem);
        this.saveOfflineQueue();
        
        this.logTimesheetOperation('OFFLINE_QUEUE_ADD', {
            endpoint,
            method: config.method,
            queueLength: this.offlineQueue.length
        }, 'info');
    }

    async processOfflineQueue() {
        if (this.isProcessingQueue || this.offlineQueue.length === 0 || !this.isOnline) return;

        this.isProcessingQueue = true;
        
        this.logTimesheetOperation('OFFLINE_QUEUE_PROCESSING_START', {
            queueLength: this.offlineQueue.length
        }, 'info');

        const successfulItems = [];
        const failedItems = [];

        for (let i = 0; i < this.offlineQueue.length; i++) {
            const item = this.offlineQueue[i];
            item.attempts++;
            
            try {
                this.logTimesheetOperation('OFFLINE_QUEUE_PROCESSING_ITEM', {
                    itemId: item.id,
                    endpoint: item.endpoint,
                    method: item.config.method,
                    attempt: item.attempts
                }, 'info');
                
                await this.request(item.endpoint, item.config);
                successfulItems.push(item.id);
                
                this.logTimesheetOperation('OFFLINE_QUEUE_ITEM_SUCCESS', {
                    itemId: item.id,
                    endpoint: item.endpoint
                }, 'success');
            } catch (error) {
                if (item.attempts >= item.maxAttempts) {
                    failedItems.push({ id: item.id, error: error.message });
                    this.logTimesheetOperation('OFFLINE_QUEUE_ITEM_FAILED', {
                        itemId: item.id,
                        endpoint: item.endpoint,
                        error: error.message,
                        attempts: item.attempts
                    }, 'error');
                }
            }
        }

        this.offlineQueue = this.offlineQueue.filter(item => 
            !successfulItems.includes(item.id) && item.attempts < item.maxAttempts
        );
        this.saveOfflineQueue();

        this.isProcessingQueue = false;
        
        this.logTimesheetOperation('OFFLINE_QUEUE_PROCESSING_COMPLETE', {
            successful: successfulItems.length,
            failed: failedItems.length,
            remaining: this.offlineQueue.length
        }, 'info');

        if (successfulItems.length > 0) {
            this.safeNotification(
                `Processed ${successfulItems.length} offline operations`,
                'success',
                5000
            );
        }
    }

    saveOfflineQueue() {
        try {
            localStorage.setItem('apiOfflineQueue', JSON.stringify(this.offlineQueue));
        } catch (error) {
            console.warn('Could not save offline queue:', error);
        }
    }

    loadOfflineQueue() {
        try {
            const savedQueue = localStorage.getItem('apiOfflineQueue');
            if (savedQueue) {
                this.offlineQueue = JSON.parse(savedQueue);
                console.log(`📂 Loaded offline queue: ${this.offlineQueue.length} items`);
            }
        } catch (error) {
            console.warn('Could not load offline queue:', error);
            this.offlineQueue = [];
        }
    }

    clearOfflineQueue() {
        this.offlineQueue = [];
        this.saveOfflineQueue();
        this.logTimesheetOperation('OFFLINE_QUEUE_CLEARED', {}, 'info');
    }

    // ==================== UTILITY METHODS ====================

    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    safeNotification(message, type = 'info', duration = 5000) {
        try {
            if (typeof safeNotification === 'function') {
                safeNotification(message, type, duration);
            } else if (typeof window.safeNotification === 'function') {
                window.safeNotification(message, type, duration);
            } else {
                console.log(`📢 ${type.toUpperCase()}: ${message}`);
            }
        } catch (notificationError) {
            console.warn('Could not show notification:', notificationError);
            console.log(`📢 ${type.toUpperCase()}: ${message}`);
        }
    }

    handleUnauthorized() {
        this.logTimesheetOperation('USER_UNAUTHORIZED', {
            action: 'logout',
            reason: 'Token expired or invalid'
        }, 'warning');
        
        this.logout();
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 2000);
    }

    getWeekNumber(dateString) {
        const date = new Date(dateString);
        date.setHours(0, 0, 0, 0);
        date.setDate(date.getDate() + 3 - (date.getDay() + 6) % 7);
        const week1 = new Date(date.getFullYear(), 0, 4);
        return 1 + Math.round(((date.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
    }

    // ==================== AUTH ENDPOINTS (FIXED) ====================

    async login(credentials) {
        this.logTimesheetOperation('LOGIN_ATTEMPT', {
            username: credentials.username,
            timestamp: new Date().toISOString()
        }, 'info');
        
        try {
            const response = await this.request('/auth/login', {
                method: 'POST',
                body: credentials
            });
            
            if (response.token) {
                this.setToken(response.token);
                if (response.user) {
                    try {
                        localStorage.setItem('userData', JSON.stringify(response.user));
                    } catch (storageError) {
                        console.warn('Could not save user data to localStorage:', storageError);
                    }
                }
            }
            
            this.logTimesheetOperation('LOGIN_SUCCESS', {
                userId: response.user?._id,
                email: response.user?.email,
                role: response.user?.role
            }, 'success');
            
            return response;
        } catch (error) {
            this.logTimesheetOperation('LOGIN_FAILED', {
                error: error.message,
                statusCode: error.status
            }, 'error');
            
            throw error;
        }
    }

    async loginAdmin(credentials) {
        this.logTimesheetOperation('ADMIN_LOGIN_ATTEMPT', {
            username: credentials.username,
            timestamp: new Date().toISOString()
        }, 'info');
        
        try {
            const response = await this.request('/auth/admin/login', {
                method: 'POST',
                body: credentials
            });
            
            if (response.token) {
                this.setToken(response.token);
                if (response.user) {
                    localStorage.setItem('userData', JSON.stringify(response.user));
                }
            }
            
            this.logTimesheetOperation('ADMIN_LOGIN_SUCCESS', {
                userId: response.user?._id,
                role: response.user?.role
            }, 'success');
            
            return response;
        } catch (error) {
            this.logTimesheetOperation('ADMIN_LOGIN_FAILED', {
                error: error.message,
                statusCode: error.status
            }, 'error');
            
            throw error;
        }
    }

    async getCurrentUser() {
        this.logTimesheetOperation('GET_CURRENT_USER', {}, 'info');
        return await this.request('/auth/me');
    }

    async updateUserProfile(userData) {
        this.logTimesheetOperation('UPDATE_USER_PROFILE', {
            fields: Object.keys(userData)
        }, 'info');
        
        return await this.request('/auth/profile', {
            method: 'PUT',
            body: userData
        });
    }

    async register(userData) {
        this.logTimesheetOperation('REGISTER_ATTEMPT', {
            email: userData.email,
            role: userData.role
        }, 'info');
        
        return await this.request('/auth/register', {
            method: 'POST',
            body: userData
        });
    }

    async changePassword(passwordData) {
        this.logTimesheetOperation('CHANGE_PASSWORD', {}, 'info');
        
        return await this.request('/auth/change-password', {
            method: 'POST',
            body: passwordData
        });
    }

    // ==================== PASSWORD RESET ENDPOINTS (FIXED) ====================

    async initiatePasswordReset(identifier) {
        this.logTimesheetOperation('INITIATE_PASSWORD_RESET', {
            identifier: identifier
        }, 'info');
        
        // FIXED: Handle both string and object formats
        let requestBody;
        
        if (typeof identifier === 'string') {
            // If it's a string, assume it's email/employeeCode
            requestBody = { email: identifier };
        } else if (typeof identifier === 'object' && identifier.employeeCode) {
            // If it's an object with employeeCode, convert to email format
            requestBody = { email: `${identifier.employeeCode}@company.com` };
        } else if (typeof identifier === 'object' && identifier.email) {
            // If it's an object with email, use it directly
            requestBody = { email: identifier.email };
        } else {
            throw new Error('Invalid identifier format for password reset');
        }
        
        return await this.request('/auth/password/forgot', {
            method: 'POST',
            body: requestBody
        });
    }

    async verifySecurityAnswer(data) {
        this.logTimesheetOperation('VERIFY_SECURITY_ANSWER', {
            employeeCode: data.employeeCode
        }, 'info');
        
        return await this.request('/auth/password/verify-security', {
            method: 'POST',
            body: data
        });
    }

    async verifyEmailCode(data) {
        this.logTimesheetOperation('VERIFY_EMAIL_CODE', {
            employeeCode: data.employeeCode
        }, 'info');
        
        return await this.request('/auth/password/verify-email', {
            method: 'POST',
            body: data
        });
    }

    async sendEmailCode(data) {
        this.logTimesheetOperation('SEND_EMAIL_CODE', {
            employeeCode: data.employeeCode
        }, 'info');
        
        return await this.request('/auth/password/send-code', {
            method: 'POST',
            body: data
        });
    }

    async resetPassword(data) {
        this.logTimesheetOperation('RESET_PASSWORD_FINAL', {
            employeeCode: data.employeeCode
        }, 'info');
        
        return await this.request('/auth/password/reset', {
            method: 'POST',
            body: data
        });
    }

    // ==================== TIMESHEET ENDPOINTS WITH COMPREHENSIVE LOGGING ====================

    async submitTimesheet(timesheetData) {
        const logData = {
            weekStart: timesheetData.weekStartDate,
            weekEnd: timesheetData.weekEndDate,
            totalHours: timesheetData.totalHours,
            entriesCount: timesheetData.entries?.length,
            normalHours: timesheetData.totalNormalHours,
            overtimeHours: timesheetData.totalOvertimeHours,
            projects: [...new Set(timesheetData.entries?.map(e => e.projectCode))] || []
        };
        
        this.logTimesheetOperation('TIMESHEET_SUBMIT_ATTEMPT', logData, 'submission');
        
        try {
            const response = await this.request('/timesheets/submit', {
                method: 'POST',
                body: timesheetData
            });
            
            this.logTimesheetOperation('TIMESHEET_SUBMIT_SUCCESS', {
                timesheetId: response._id,
                status: response.status,
                weekRange: `${timesheetData.weekStartDate} to ${timesheetData.weekEndDate}`,
                totalHours: timesheetData.totalHours
            }, 'success');
            
            this.safeNotification('Timesheet submitted successfully! It is now pending approval.', 'success', 5000);
            
            return response;
        } catch (error) {
            this.logTimesheetOperation('TIMESHEET_SUBMIT_FAILED', {
                error: error.message,
                weekRange: `${timesheetData.weekStartDate} to ${timesheetData.weekEndDate}`,
                statusCode: error.status,
                userMessage: error.userMessage
            }, 'error');
            
            throw error;
        }
    }

    async getMyTimesheets(filters = {}) {
        this.logTimesheetOperation('GET_MY_TIMESHEETS', { filters }, 'info');
        
        try {
            const queryParams = new URLSearchParams(filters).toString();
            const endpoint = `/timesheets/my-timesheets${queryParams ? `?${queryParams}` : ''}`;
            const response = await this.request(endpoint);
            
            let timesheets = [];
            if (Array.isArray(response)) {
                timesheets = response;
            } else if (response && Array.isArray(response.timesheets)) {
                timesheets = response.timesheets;
            } else if (response && Array.isArray(response.data)) {
                timesheets = response.data;
            } else {
                timesheets = this.getMockTimesheets();
            }
            
            const statusBreakdown = this.getTimesheetStatusBreakdown(timesheets);
            
            this.logTimesheetOperation('GET_MY_TIMESHEETS_SUCCESS', {
                count: timesheets.length,
                statusBreakdown,
                filters
            }, 'success');
            
            return timesheets;
        } catch (error) {
            this.logTimesheetOperation('GET_MY_TIMESHEETS_FAILED', {
                error: error.message,
                filters
            }, 'error');
            
            return this.getMockTimesheets();
        }
    }

    async getAllTimesheets(filters = {}) {
        this.logTimesheetOperation('GET_ALL_TIMESHEETS', { filters }, 'info');
        
        try {
            const queryParams = new URLSearchParams(filters).toString();
            const endpoint = `/timesheets${queryParams ? `?${queryParams}` : ''}`;
            const response = await this.request(endpoint);
            
            let timesheets = [];
            if (Array.isArray(response)) {
                timesheets = response;
            } else if (response && Array.isArray(response.timesheets)) {
                timesheets = response.timesheets;
            } else if (response && Array.isArray(response.data)) {
                timesheets = response.data;
            } else {
                timesheets = this.getMockTimesheets();
            }
            
            this.logTimesheetOperation('GET_ALL_TIMESHEETS_SUCCESS', {
                count: timesheets.length,
                statusBreakdown: this.getTimesheetStatusBreakdown(timesheets),
                filters
            }, 'success');
            
            return timesheets;
        } catch (error) {
            this.logTimesheetOperation('GET_ALL_TIMESHEETS_FAILED', {
                error: error.message,
                filters
            }, 'error');
            
            return this.getMockTimesheets();
        }
    }

    async getTimesheetById(timesheetId) {
        this.logTimesheetOperation('GET_TIMESHEET_BY_ID', { timesheetId }, 'info');
        
        try {
            const response = await this.request(`/timesheets/${timesheetId}`);
            
            this.logTimesheetOperation('GET_TIMESHEET_BY_ID_SUCCESS', {
                timesheetId,
                status: response.status,
                employee: response.employeeName
            }, 'success');
            
            return response;
        } catch (error) {
            this.logTimesheetOperation('GET_TIMESHEET_BY_ID_FAILED', {
                timesheetId,
                error: error.message,
                statusCode: error.status
            }, 'error');
            
            throw error;
        }
    }

    async approveTimesheet(timesheetId) {
        this.logTimesheetOperation('APPROVE_TIMESHEET_ATTEMPT', { timesheetId }, 'approval');
        
        try {
            const response = await this.request(`/timesheets/${timesheetId}/approve`, {
                method: 'PATCH'
            });
            
            this.logTimesheetOperation('APPROVE_TIMESHEET_SUCCESS', {
                timesheetId,
                newStatus: response.status,
                approvedBy: this.getSafeUserData()?.employeeId
            }, 'success');
            
            this.safeNotification('Timesheet approved successfully!', 'success', 5000);
            
            return response;
        } catch (error) {
            this.logTimesheetOperation('APPROVE_TIMESHEET_FAILED', {
                timesheetId,
                error: error.message,
                statusCode: error.status
            }, 'error');
            
            throw error;
        }
    }

    async rejectTimesheet(timesheetId, remarks) {
        this.logTimesheetOperation('REJECT_TIMESHEET_ATTEMPT', {
            timesheetId,
            hasRemarks: !!remarks,
            remarksLength: remarks?.length || 0
        }, 'rejection');
        
        try {
            const response = await this.request(`/timesheets/${timesheetId}/reject`, {
                method: 'PATCH',
                body: { remarks }
            });
            
            this.logTimesheetOperation('REJECT_TIMESHEET_SUCCESS', {
                timesheetId,
                newStatus: response.status,
                rejectedBy: this.getSafeUserData()?.employeeId,
                hasRemarks: !!remarks
            }, 'success');
            
            this.safeNotification('Timesheet rejected with remarks.', 'warning', 5000);
            
            return response;
        } catch (error) {
            this.logTimesheetOperation('REJECT_TIMESHEET_FAILED', {
                timesheetId,
                error: error.message,
                statusCode: error.status
            }, 'error');
            
            throw error;
        }
    }

    async editRejectedTimesheet(timesheetId, timesheetData) {
        const logData = {
            timesheetId,
            weekStart: timesheetData.weekStartDate,
            weekEnd: timesheetData.weekEndDate,
            totalHours: timesheetData.totalHours,
            entriesCount: timesheetData.entries?.length,
            changes: this.detectTimesheetChanges(timesheetData)
        };
        
        this.logTimesheetOperation('EDIT_REJECTED_TIMESHEET_ATTEMPT', logData, 'edit');
        
        try {
            const response = await this.request(`/timesheets/${timesheetId}/edit-rejected`, {
                method: 'PUT',
                body: timesheetData
            });
            
            this.logTimesheetOperation('EDIT_REJECTED_TIMESHEET_SUCCESS', {
                timesheetId,
                newStatus: response.status,
                changes: logData.changes
            }, 'success');
            
            this.safeNotification('Timesheet edited successfully! Ready for resubmission.', 'success', 5000);
            
            return response;
        } catch (error) {
            this.logTimesheetOperation('EDIT_REJECTED_TIMESHEET_FAILED', {
                timesheetId,
                error: error.message,
                statusCode: error.status,
                userMessage: error.userMessage
            }, 'error');
            
            throw error;
        }
    }

    async resubmitTimesheet(timesheetId, timesheetData) {
        this.logTimesheetOperation('RESUBMIT_TIMESHEET_ATTEMPT', {
            timesheetId,
            totalHours: timesheetData.totalHours,
            entriesCount: timesheetData.entries?.length
        }, 'resubmission');
        
        try {
            const response = await this.request(`/timesheets/${timesheetId}/resubmit`, {
                method: 'POST',
                body: timesheetData
            });
            
            this.logTimesheetOperation('RESUBMIT_TIMESHEET_SUCCESS', {
                timesheetId,
                newStatus: response.status,
                resubmissionCount: response.resubmissionCount
            }, 'success');
            
            this.safeNotification('Timesheet resubmitted successfully!', 'success', 5000);
            
            return response;
        } catch (error) {
            this.logTimesheetOperation('RESUBMIT_TIMESHEET_FAILED', {
                timesheetId,
                error: error.message,
                statusCode: error.status
            }, 'error');
            
            throw error;
        }
    }

    async getEditableTimesheets() {
        this.logTimesheetOperation('GET_EDITABLE_TIMESHEETS', {}, 'info');
        
        try {
            const response = await this.request('/timesheets/editable-timesheets');
            
            this.logTimesheetOperation('GET_EDITABLE_TIMESHEETS_SUCCESS', {
                count: response.length || 0
            }, 'success');
            
            return response;
        } catch (error) {
            this.logTimesheetOperation('GET_EDITABLE_TIMESHEETS_FAILED', {
                error: error.message
            }, 'error');
            
            throw error;
        }
    }

    async checkSubmissionBlock() {
        this.logTimesheetOperation('CHECK_SUBMISSION_BLOCK', {}, 'info');
        
        try {
            const response = await this.request('/timesheets/check-submission-block');
            
            this.logTimesheetOperation('CHECK_SUBMISSION_BLOCK_SUCCESS', {
                isBlocked: response.isBlocked,
                message: response.message
            }, 'success');
            
            return response;
        } catch (error) {
            this.logTimesheetOperation('CHECK_SUBMISSION_BLOCK_FAILED', {
                error: error.message
            }, 'error');
            
            throw error;
        }
    }

    async exportTimesheetToCSV(timesheetId) {
        this.logTimesheetOperation('EXPORT_TIMESHEET_CSV_ATTEMPT', { timesheetId }, 'export');
        
        try {
            const response = await this.request(`/timesheets/export/${timesheetId}`, {
                headers: {
                    'Accept': 'text/csv'
                }
            });
            
            // Create and trigger download
            const blob = new Blob([response], { type: 'text/csv' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `timesheet-${timesheetId}-${new Date().toISOString().split('T')[0]}.csv`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
            
            this.logTimesheetOperation('EXPORT_TIMESHEET_CSV_SUCCESS', {
                timesheetId,
                contentLength: response.length
            }, 'success');
            
            this.safeNotification('Timesheet exported successfully!', 'success', 3000);
            
            return { success: true, message: 'Download started' };
            
        } catch (error) {
            this.logTimesheetOperation('EXPORT_TIMESHEET_CSV_FAILED', {
                timesheetId,
                error: error.message
            }, 'error');
            
            // If the endpoint doesn't exist, provide a mock CSV
            if (error.status === 404) {
                this.safeNotification('Export feature coming soon! Generating sample CSV...', 'info', 3000);
                return this.generateMockCSV(timesheetId);
            }
            
            throw error;
        }
    }

    // Helper method for mock CSV generation
    generateMockCSV(timesheetId) {
        const csvContent = `Timesheet ID,Employee,Week Start,Week End,Total Hours,Status\n${timesheetId},Mock User,2024-01-01,2024-01-07,40.0,approved\n`;
        
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `timesheet-${timesheetId}-sample.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        
        return { success: true, message: 'Sample CSV generated' };
    }

    // Mock CSV response generator
    generateMockCSVResponse(timesheetId) {
        const csvContent = `Timesheet ID,Employee,Week Start,Week End,Total Hours,Normal Hours,Overtime Hours,Status\n${timesheetId},Mock User,2024-01-01,2024-01-07,40.0,40.0,0.0,approved\n`;
        
        return csvContent;
    }

    async exportMultipleTimesheetsToCSV(timesheetIds) {
        this.logTimesheetOperation('EXPORT_MULTIPLE_TIMESHEETS_CSV_ATTEMPT', {
            count: timesheetIds.length,
            ids: timesheetIds
        }, 'export');
        
        try {
            const response = await this.request('/timesheets/export-multiple', {
                method: 'POST',
                body: { ids: timesheetIds }
            });
            
            this.logTimesheetOperation('EXPORT_MULTIPLE_TIMESHEETS_CSV_SUCCESS', {
                count: timesheetIds.length,
                contentLength: response.length
            }, 'success');
            
            return response;
        } catch (error) {
            this.logTimesheetOperation('EXPORT_MULTIPLE_TIMESHEETS_CSV_FAILED', {
                count: timesheetIds.length,
                error: error.message
            }, 'error');
            
            throw error;
        }
    }

    async archiveOldTimesheets() {
        this.logTimesheetOperation('ARCHIVE_OLD_TIMESHEETS_ATTEMPT', {}, 'archive');
        
        try {
            const response = await this.request('/timesheets/archive-old', {
                method: 'POST'
            });
            
            this.logTimesheetOperation('ARCHIVE_OLD_TIMESHEETS_SUCCESS', {
                archivedCount: response.archivedCount,
                period: response.period
            }, 'success');
            
            this.safeNotification(`Archived ${response.archivedCount} old timesheets`, 'info', 5000);
            
            return response;
        } catch (error) {
            this.logTimesheetOperation('ARCHIVE_OLD_TIMESHEETS_FAILED', {
                error: error.message
            }, 'error');
            
            throw error;
        }
    }

    async expireEditingPeriods() {
        this.logTimesheetOperation('EXPIRE_EDITING_PERIODS_ATTEMPT', {}, 'info');
        
        try {
            const response = await this.request('/timesheets/expire-editing-periods', {
                method: 'POST'
            });
            
            this.logTimesheetOperation('EXPIRE_EDITING_PERIODS_SUCCESS', {
                expiredCount: response.expiredCount,
                affectedTimesheets: response.affectedTimesheets
            }, 'success');
            
            this.safeNotification(`Expired editing periods for ${response.expiredCount} timesheets`, 'info', 5000);
            
            return response;
        } catch (error) {
            this.logTimesheetOperation('EXPIRE_EDITING_PERIODS_FAILED', {
                error: error.message
            }, 'error');
            
            throw error;
        }
    }

    // ==================== TIMESHEET UTILITY METHODS ====================

    getTimesheetStatusBreakdown(timesheets) {
        const breakdown = {
            approved: 0,
            pending: 0,
            rejected: 0,
            draft: 0,
            total: timesheets.length
        };
        
        timesheets.forEach(ts => {
            if (breakdown.hasOwnProperty(ts.status)) {
                breakdown[ts.status]++;
            }
        });
        
        return breakdown;
    }

    detectTimesheetChanges(newTimesheetData) {
        return {
            hoursChanged: newTimesheetData.totalHours !== undefined,
            entriesChanged: newTimesheetData.entries?.length !== undefined,
            projectsUpdated: newTimesheetData.entries?.map(e => e.projectCode) || []
        };
    }

    getTimesheetStatistics() {
        const logs = this.getTimesheetLogs();
        const stats = {
            totalOperations: logs.length,
            submissions: logs.filter(log => log.operation.includes('SUBMIT')).length,
            approvals: logs.filter(log => log.operation.includes('APPROVE')).length,
            rejections: logs.filter(log => log.operation.includes('REJECT')).length,
            edits: logs.filter(log => log.operation.includes('EDIT')).length,
            exports: logs.filter(log => log.operation.includes('EXPORT')).length,
            errors: logs.filter(log => log.status === 'error').length,
            lastOperation: logs[0]?.timestamp || 'Never',
            uniqueUsers: [...new Set(logs.map(log => log.user))].length
        };
        
        return stats;
    }

    // ==================== PROJECT ENDPOINTS ====================

    async getProjects() {
        this.logTimesheetOperation('GET_PROJECTS', {}, 'info');
        
        try {
            const projects = await this.request('/projects');
            return Array.isArray(projects) ? projects : [];
        } catch (error) {
            this.logTimesheetOperation('GET_PROJECTS_FAILED', {
                error: error.message
            }, 'error');
            
            return this.getMockProjects();
        }
    }

    async getMyProjects() {
        this.logTimesheetOperation('GET_MY_PROJECTS', {}, 'info');
        
        try {
            const projects = await this.request('/projects/my-projects');
            return Array.isArray(projects) ? projects : [];
        } catch (error) {
            this.logTimesheetOperation('GET_MY_PROJECTS_FAILED', {
                error: error.message
            }, 'error');
            
            return this.getMockProjects();
        }
    }

    async getAllProjects() {
        this.logTimesheetOperation('GET_ALL_PROJECTS', {}, 'info');
        
        try {
            const projects = await this.request('/projects');
            return Array.isArray(projects) ? projects : [];
        } catch (error) {
            this.logTimesheetOperation('GET_ALL_PROJECTS_FAILED', {
                error: error.message
            }, 'error');
            
            return this.getMockProjects();
        }
    }

    async getProject(projectId) {
        this.logTimesheetOperation('GET_PROJECT', { projectId }, 'info');
        return await this.request(`/projects/${projectId}`);
    }

    async createProject(projectData) {
        this.logTimesheetOperation('CREATE_PROJECT', {
            projectCode: projectData.projectCode,
            name: projectData.name
        }, 'info');
        
        return await this.request('/projects', {
            method: 'POST',
            body: projectData
        });
    }

    async updateProject(projectId, projectData) {
        this.logTimesheetOperation('UPDATE_PROJECT', {
            projectId,
            updatedFields: Object.keys(projectData)
        }, 'info');
        
        return await this.request(`/projects/${projectId}`, {
            method: 'PUT',
            body: projectData
        });
    }

    async deleteProject(projectId) {
        this.logTimesheetOperation('DELETE_PROJECT', { projectId }, 'warning');
        
        return await this.request(`/projects/${projectId}`, {
            method: 'DELETE'
        });
    }

    async getProjectStats(projectId) {
        this.logTimesheetOperation('GET_PROJECT_STATS', { projectId }, 'info');
        return await this.request(`/projects/${projectId}/stats`);
    }

    async getProjectTimesheets(projectId, filters = {}) {
        this.logTimesheetOperation('GET_PROJECT_TIMESHEETS', {
            projectId,
            filters
        }, 'info');
        
        const queryParams = new URLSearchParams(filters).toString();
        return await this.request(`/projects/${projectId}/timesheets${queryParams ? `?${queryParams}` : ''}`);
    }

    // ==================== ACTIVITY CODE ENDPOINTS ====================

    async getActivityCodes(department = null) {
        this.logTimesheetOperation('GET_ACTIVITY_CODES', { department }, 'info');
        
        try {
            const endpoint = department ? `/activity-codes?department=${department}` : '/activity-codes';
            const codes = await this.request(endpoint);
            return Array.isArray(codes) ? codes : [];
        } catch (error) {
            this.logTimesheetOperation('GET_ACTIVITY_CODES_FAILED', {
                error: error.message,
                department
            }, 'error');
            
            return this.getMockActivityCodes(department);
        }
    }

    async createActivityCode(activityData) {
        this.logTimesheetOperation('CREATE_ACTIVITY_CODE', {
            code: activityData.code,
            name: activityData.name
        }, 'info');
        
        return await this.request('/activity-codes', {
            method: 'POST',
            body: activityData
        });
    }

    async updateActivityCode(codeId, activityData) {
        this.logTimesheetOperation('UPDATE_ACTIVITY_CODE', {
            codeId,
            updatedFields: Object.keys(activityData)
        }, 'info');
        
        return await this.request(`/activity-codes/${codeId}`, {
            method: 'PUT',
            body: activityData
        });
    }

    async deleteActivityCode(codeId) {
        this.logTimesheetOperation('DELETE_ACTIVITY_CODE', { codeId }, 'warning');
        
        return await this.request(`/activity-codes/${codeId}`, {
            method: 'DELETE'
        });
    }

    async getActivityCodeUsage(codeId, period = 'month') {
        this.logTimesheetOperation('GET_ACTIVITY_CODE_USAGE', {
            codeId,
            period
        }, 'info');
        
        return await this.request(`/activity-codes/${codeId}/usage?period=${period}`);
    }

    // ==================== USER MANAGEMENT & TEAM LEADER METHODS ====================

    /**
     * Get users with optional filters
     * @param {Object} filters - Filter parameters
     * @returns {Promise} Array of users
     */
    async getUsers(filters = {}) {
        this.logTimesheetOperation('GET_USERS', { filters }, 'info');
        
        try {
            const queryParams = new URLSearchParams(filters).toString();
            const endpoint = `/users${queryParams ? `?${queryParams}` : ''}`;
            const response = await this.request(endpoint);
            
            if (Array.isArray(response)) {
                return { users: response };
            } else if (response && Array.isArray(response.users)) {
                return response;
            } else {
                return { users: this.getMockUsers() };
            }
        } catch (error) {
            this.logTimesheetOperation('GET_USERS_FAILED', {
                error: error.message,
                filters
            }, 'error');
            
            return { users: this.getMockUsers() };
        }
    }

    /**
     * Get team leaders by department
     * @param {string} department - Department name
     * @returns {Promise} Array of team leaders
     */
    async getTeamLeadersByDepartment(department) {
        this.logTimesheetOperation('GET_TEAM_LEADERS_BY_DEPARTMENT', { department }, 'info');
        
        try {
            const response = await this.request(`/users/team-leaders/${department}`);
            return Array.isArray(response) ? response : [];
        } catch (error) {
            this.logTimesheetOperation('GET_TEAM_LEADERS_BY_DEPARTMENT_FAILED', {
                department,
                error: error.message
            }, 'error');
            
            return this.getMockTeamLeaders();
        }
    }

    /**
     * Get all available team leaders
     * @param {Object} filters - Filter parameters
     * @returns {Promise} Array of team leaders
     */
    async getAvailableTeamLeaders(filters = {}) {
        this.logTimesheetOperation('GET_AVAILABLE_TEAM_LEADERS', { filters }, 'info');
        
        try {
            const queryParams = new URLSearchParams(filters).toString();
            const endpoint = `/users/team-leaders${queryParams ? `?${queryParams}` : ''}`;
            const response = await this.request(endpoint);
            return Array.isArray(response) ? response : [];
        } catch (error) {
            this.logTimesheetOperation('GET_AVAILABLE_TEAM_LEADERS_FAILED', {
                filters,
                error: error.message
            }, 'error');
            
            return this.getMockTeamLeaders();
        }
    }

    /**
     * Get team members for a specific team leader
     * @param {string} teamLeaderId - Team leader user ID
     * @returns {Promise} Array of team members
     */
    async getTeamMembers(teamLeaderId) {
        this.logTimesheetOperation('GET_TEAM_MEMBERS', { teamLeaderId }, 'info');
        
        try {
            const response = await this.request(`/users/${teamLeaderId}/team-members`);
            return Array.isArray(response) ? response : [];
        } catch (error) {
            this.logTimesheetOperation('GET_TEAM_MEMBERS_FAILED', {
                teamLeaderId,
                error: error.message
            }, 'error');
            
            return this.getMockTeamMembers();
        }
    }

    /**
     * Bulk update team leader for multiple users
     * @param {Array} userIds - Array of user IDs
     * @param {Object|string} teamLeaderData - Team leader ID or data object
     * @returns {Promise} Update result
     */
    async bulkUpdateTeamLeader(userIds, teamLeaderData) {
        this.logTimesheetOperation('BULK_UPDATE_TEAM_LEADER', {
            userIdsCount: userIds.length,
            teamLeaderId: typeof teamLeaderData === 'string' ? teamLeaderData : teamLeaderData.teamLeaderId
        }, 'info');
        
        try {
            const response = await this.request('/users/bulk-team-leader', {
                method: 'PUT',
                body: {
                    userIds,
                    teamLeader: teamLeaderData
                }
            });
            
            this.logTimesheetOperation('BULK_UPDATE_TEAM_LEADER_SUCCESS', {
                updatedCount: response.updated || 0,
                failedCount: response.failed || 0
            }, 'success');
            
            this.safeNotification(`Updated team leader for ${response.updated || 0} users`, 'success', 5000);
            
            return response;
        } catch (error) {
            this.logTimesheetOperation('BULK_UPDATE_TEAM_LEADER_FAILED', {
                error: error.message,
                statusCode: error.status,
                userMessage: error.userMessage
            }, 'error');
            
            throw error;
        }
    }

    /**
     * Update team leader for a single user
     * @param {string} userId - User ID
     * @param {Object} teamLeaderData - Team leader data
     * @returns {Promise} Updated user
     */
    async updateUserTeamLeader(userId, teamLeaderData) {
        this.logTimesheetOperation('UPDATE_USER_TEAM_LEADER', {
            userId,
            teamLeaderData
        }, 'info');
        
        try {
            const response = await this.request(`/users/${userId}/team-leader`, {
                method: 'PUT',
                body: teamLeaderData
            });
            
            this.logTimesheetOperation('UPDATE_USER_TEAM_LEADER_SUCCESS', {
                userId,
                teamLeaderId: response.teamLeader?._id,
                teamLeaderName: response.teamLeader?.name
            }, 'success');
            
            return response;
        } catch (error) {
            this.logTimesheetOperation('UPDATE_USER_TEAM_LEADER_FAILED', {
                userId,
                error: error.message,
                statusCode: error.status
            }, 'error');
            
            throw error;
        }
    }

    /**
     * Get user by ID
     * @param {string} userId - User ID
     * @returns {Promise} User data
     */
    async getUser(userId) {
        this.logTimesheetOperation('GET_USER', { userId }, 'info');
        
        try {
            return await this.request(`/users/${userId}`);
        } catch (error) {
            this.logTimesheetOperation('GET_USER_FAILED', {
                userId,
                error: error.message
            }, 'error');
            
            const users = this.getMockUsers();
            return users.find(user => user._id === userId) || users[0];
        }
    }

    /**
     * Update user
     * @param {string} userId - User ID
     * @param {Object} userData - User data to update
     * @returns {Promise} Updated user
     */
    async updateUser(userId, userData) {
        this.logTimesheetOperation('UPDATE_USER', {
            userId,
            updatedFields: Object.keys(userData)
        }, 'info');
        
        return await this.request(`/users/${userId}`, {
            method: 'PUT',
            body: userData
        });
    }

    /**
     * Delete user
     * @param {string} userId - User ID
     * @returns {Promise} Delete result
     */
    async deleteUser(userId) {
        this.logTimesheetOperation('DELETE_USER', { userId }, 'warning');
        
        return await this.request(`/users/${userId}`, {
            method: 'DELETE'
        });
    }

    /**
     * Create new user
     * @param {Object} userData - User data
     * @returns {Promise} Created user
     */
    async createUser(userData) {
        this.logTimesheetOperation('CREATE_USER', {
            email: userData.email,
            role: userData.role
        }, 'info');
        
        return await this.request('/users', {
            method: 'POST',
            body: userData
        });
    }

    /**
     * Get users by role
     * @param {string} role - User role
     * @param {Object} filters - Additional filters
     * @returns {Promise} Array of users
     */
    async getUsersByRole(role, filters = {}) {
        this.logTimesheetOperation('GET_USERS_BY_ROLE', { role, filters }, 'info');
        
        try {
            const allFilters = { ...filters, role };
            const queryParams = new URLSearchParams(allFilters).toString();
            const endpoint = `/users${queryParams ? `?${queryParams}` : ''}`;
            const response = await this.request(endpoint);
            
            if (Array.isArray(response)) {
                return response;
            } else if (response && Array.isArray(response.users)) {
                return response.users;
            } else {
                return [];
            }
        } catch (error) {
            this.logTimesheetOperation('GET_USERS_BY_ROLE_FAILED', {
                role,
                error: error.message
            }, 'error');
            
            return [];
        }
    }

    // ==================== DASHBOARD & ANALYTICS ENDPOINTS ====================

    async getDashboardStats() {
        this.logTimesheetOperation('GET_DASHBOARD_STATS', {}, 'info');
        
        try {
            return await this.request('/dashboard/stats');
        } catch (error) {
            this.logTimesheetOperation('GET_DASHBOARD_STATS_FAILED', {
                error: error.message
            }, 'error');
            
            return this.getMockDashboardStats();
        }
    }

    async getAnalytics() {
        this.logTimesheetOperation('GET_ANALYTICS', {}, 'info');
        
        try {
            return await this.request('/dashboard/analytics');
        } catch (error) {
            this.logTimesheetOperation('GET_ANALYTICS_FAILED', {
                error: error.message
            }, 'error');
            
            return this.getMockAnalytics();
        }
    }

    async getSystemStats() {
        this.logTimesheetOperation('GET_SYSTEM_STATS', {}, 'info');
        
        try {
            const [dashboardStats, users] = await Promise.all([
                this.request('/dashboard/stats').catch(() => ({})),
                this.request('/users').catch(() => [])
            ]);
            
            return {
                totalUsers: Array.isArray(users) ? users.length : (users?.users?.length || 0),
                totalTimesheets: dashboardStats.totalTimesheets || 0,
                totalProjects: dashboardStats.totalProjects || 0,
                systemUptime: 99.8,
                storageUsed: '2.4 GB',
                lastBackup: new Date().toISOString()
            };
        } catch (error) {
            this.logTimesheetOperation('GET_SYSTEM_STATS_FAILED', {
                error: error.message
            }, 'error');
            
            return this.getMockSystemStats();
        }
    }

    // ==================== REPORT & TRACKING ENDPOINTS ====================

    async getHoursTracking(filters = {}) {
        this.logTimesheetOperation('GET_HOURS_TRACKING', { filters }, 'info');
        
        try {
            const queryParams = new URLSearchParams(filters).toString();
            const endpoint = `/reports/hours-tracking${queryParams ? `?${queryParams}` : ''}`;
            const response = await this.request(endpoint);
            
            this.logTimesheetOperation('GET_HOURS_TRACKING_SUCCESS', {
                count: response.projects?.length || 0,
                filters
            }, 'success');
            
            return response;
        } catch (error) {
            this.logTimesheetOperation('GET_HOURS_TRACKING_FAILED', {
                error: error.message,
                filters
            }, 'error');
            
            // Return mock data for development
            return {
                success: true,
                projects: this.getMockProjects(),
                totals: {
                    totalHours: 500,
                    consumedHours: 320,
                    balanceHours: 180,
                    variationHours: 0
                }
            };
        }
    }

    async getEmployeeReport(filters = {}) {
        this.logTimesheetOperation('GET_EMPLOYEE_REPORT', { filters }, 'info');
        
        try {
            const queryParams = new URLSearchParams(filters).toString();
            const endpoint = `/reports/employee-report${queryParams ? `?${queryParams}` : ''}`;
            const response = await this.request(endpoint);
            
            this.logTimesheetOperation('GET_EMPLOYEE_REPORT_SUCCESS', {
                type: response.type,
                hasData: !!(response.employee || response.project),
                filters
            }, 'success');
            
            return response;
        } catch (error) {
            this.logTimesheetOperation('GET_EMPLOYEE_REPORT_FAILED', {
                error: error.message,
                filters
            }, 'error');
            
            // Return mock data for development
            return this.getMockEmployeeReport(filters);
        }
    }

    // ==================== PROJECT EXPORT METHODS ====================

    /**
     * Export single project to Excel
     * @param {string} projectId - Project ID to export
     * @returns {Promise} - Excel blob download
     */
    async exportProjectToExcel(projectId) {
        this.logTimesheetOperation('EXPORT_PROJECT_EXCEL_ATTEMPT', { projectId }, 'export');
        
        try {
            const response = await this.request(`/projects/${projectId}/export`, {
                responseType: 'blob'
            });
            
            // Handle blob response for file download
            this.downloadBlob(response, `project-${projectId}-${new Date().toISOString().split('T')[0]}.xlsx`, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            
            this.logTimesheetOperation('EXPORT_PROJECT_EXCEL_SUCCESS', {
                projectId,
                blobSize: response.size
            }, 'success');
            
            this.safeNotification('Project Excel report downloaded successfully!', 'success', 5000);
            
            return { 
                success: true, 
                message: 'Download started', 
                projectId,
                blobSize: response.size
            };
            
        } catch (error) {
            this.logTimesheetOperation('EXPORT_PROJECT_EXCEL_FAILED', {
                projectId,
                error: error.message
            }, 'error');
            
            this.safeNotification(`Project export failed: ${error.message}`, 'error', 5000);
            throw error;
        }
    }

    /**
     * Export all projects to Excel
     * @returns {Promise} - Excel blob download
     */
    async exportAllProjectsToExcel() {
        this.logTimesheetOperation('EXPORT_ALL_PROJECTS_EXCEL_ATTEMPT', {}, 'export');
        
        try {
            const response = await this.request('/projects/export/all', {
                responseType: 'blob'
            });
            
            // Handle blob response for file download
            this.downloadBlob(response, `all-projects-${new Date().toISOString().split('T')[0]}.xlsx`, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            
            this.logTimesheetOperation('EXPORT_ALL_PROJECTS_EXCEL_SUCCESS', {
                blobSize: response.size
            }, 'success');
            
            this.safeNotification('All projects Excel report downloaded successfully!', 'success', 5000);
            
            return { 
                success: true, 
                message: 'Download started', 
                blobSize: response.size
            };
            
        } catch (error) {
            this.logTimesheetOperation('EXPORT_ALL_PROJECTS_EXCEL_FAILED', {
                error: error.message
            }, 'error');
            
            this.safeNotification(`All projects export failed: ${error.message}`, 'error', 5000);
            throw error;
        }
    }

    /**
     * Generic blob download utility method
     * @param {Blob} blob - The blob to download
     * @param {string} filename - Download filename
     * @param {string} contentType - Content type
     */
    downloadBlob(blob, filename, contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
        // Create download link
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        
        // Cleanup
        setTimeout(() => {
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        }, 100);
    }

    /**
     * Export project report to Excel with filters
     * @param {Object} filters - Report filters
     * @returns {Promise} - Excel blob download
     */
    async exportProjectReportToExcel(filters = {}) {
        this.logTimesheetOperation('EXPORT_PROJECT_REPORT_EXCEL', { filters }, 'export');
        
        try {
            const response = await fetch(`${this.baseURL}/reports/export-project-excel`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.token}`,
                    'X-Request-ID': this.generateId(),
                    'X-Client-Version': '2.0.0'
                },
                body: JSON.stringify(filters)
            });
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => null);
                throw new Error(errorData?.message || `HTTP error! status: ${response.status}`);
            }
            
            // Handle blob response for file download
            const blob = await response.blob();
            
            // Create download
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            
            // Get filename from headers or use default
            const contentDisposition = response.headers.get('Content-Disposition');
            let filename = `project-report-${new Date().toISOString().split('T')[0]}.xlsx`;
            
            if (contentDisposition) {
                const filenameMatch = contentDisposition.match(/filename="?(.+)"?/);
                if (filenameMatch && filenameMatch[1]) {
                    filename = filenameMatch[1];
                }
            }
            
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            
            // Cleanup
            setTimeout(() => {
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
            }, 100);
            
            this.logTimesheetOperation('EXPORT_PROJECT_REPORT_EXCEL_SUCCESS', {
                filters,
                filename,
                blobSize: blob.size
            }, 'success');
            
            this.safeNotification(`Project Excel report "${filename}" downloaded successfully!`, 'success', 5000);
            
            return { 
                success: true, 
                message: 'Download started', 
                filename,
                blobSize: blob.size
            };
            
        } catch (error) {
            this.logTimesheetOperation('EXPORT_PROJECT_REPORT_EXCEL_FAILED', {
                error: error.message,
                filters
            }, 'error');
            
            this.safeNotification(`Project export failed: ${error.message}`, 'error', 5000);
            throw error;
        }
    }

    /**
     * Enhanced employee report export with better error handling
     */
    async exportEmployeeReportToExcel(filters = {}) {
        this.logTimesheetOperation('EXPORT_EMPLOYEE_REPORT_EXCEL_ENHANCED', { filters }, 'export');
        
        try {
            // Validate filters to ensure we have required data
            if (!filters.employeeId && !filters.employeeName) {
                throw new Error('Employee ID or Name is required for report export');
            }

            const response = await fetch(`${this.baseURL}/reports/export-employee-excel`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.token}`,
                    'X-Request-ID': this.generateId(),
                    'X-Client-Version': '2.0.0'
                },
                body: JSON.stringify({
                    ...filters,
                    // Ensure we include employee info even without timesheets
                    includeEmployeeInfo: true,
                    includeAssignedProjects: true,
                    reportFormat: 'excel'
                })
            });
            
            if (!response.ok) {
                // Handle specific error cases
                if (response.status === 404) {
                    throw new Error('Employee not found or no data available');
                } else if (response.status === 400) {
                    const errorData = await response.json().catch(() => null);
                    throw new Error(errorData?.message || 'Invalid request parameters');
                }
                
                const errorData = await response.json().catch(() => null);
                throw new Error(errorData?.message || `HTTP error! status: ${response.status}`);
            }
            
            // Handle blob response for file download
            const blob = await response.blob();
            
            // Validate blob content
            if (blob.size === 0) {
                throw new Error('Empty report generated - no data available');
            }
            
            // Check if it's actually an Excel file
            if (blob.type !== 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
                console.warn('Unexpected content type:', blob.type);
                // Continue anyway as some servers might not set content-type correctly
            }
            
            // Create download
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            
            // Get filename from headers or use default
            const contentDisposition = response.headers.get('Content-Disposition');
            let filename = `employee-report-${filters.employeeId || filters.employeeName}-${new Date().toISOString().split('T')[0]}.xlsx`;
            
            if (contentDisposition) {
                const filenameMatch = contentDisposition.match(/filename="?(.+)"?/);
                if (filenameMatch && filenameMatch[1]) {
                    filename = filenameMatch[1];
                }
            }
            
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            
            // Cleanup
            setTimeout(() => {
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
            }, 100);
            
            this.logTimesheetOperation('EXPORT_EMPLOYEE_REPORT_EXCEL_SUCCESS_ENHANCED', {
                filters,
                filename,
                blobSize: blob.size,
                employeeId: filters.employeeId,
                employeeName: filters.employeeName
            }, 'success');
            
            this.safeNotification(`Employee Excel report "${filename}" downloaded successfully!`, 'success', 5000);
            
            return { 
                success: true, 
                message: 'Download started', 
                filename,
                blobSize: blob.size,
                employee: filters.employeeId || filters.employeeName
            };
            
        } catch (error) {
            this.logTimesheetOperation('EXPORT_EMPLOYEE_REPORT_EXCEL_FAILED_ENHANCED', {
                error: error.message,
                filters,
                employeeId: filters.employeeId,
                employeeName: filters.employeeName
            }, 'error');
            
            let userMessage = `Export failed: ${error.message}`;
            
            // Provide more user-friendly messages
            if (error.message.includes('Employee not found')) {
                userMessage = 'Employee not found. Please check the employee ID or name.';
            } else if (error.message.includes('no data available')) {
                userMessage = 'No timesheet data found for this employee. The report will include employee information and assigned projects only.';
            } else if (error.message.includes('Empty report')) {
                userMessage = 'The report is empty. No data available for the selected criteria.';
            }
            
            this.safeNotification(userMessage, 'error', 5000);
            throw error;
        }
    }

    /**
     * Generate mock Excel response for development
     * @param {string} type - Report type
     * @returns {Object} - Mock response
     */
    generateMockExcelResponse(type) {
        // Create a simple Excel file structure for mock data
        const mockData = {
            success: true,
            message: `Mock Excel export for ${type}`,
            filename: `${type}-${new Date().toISOString().split('T')[0]}.xlsx`,
            mock: true
        };
        
        // In a real scenario, this would return a blob
        // For mock purposes, we return the metadata
        return mockData;
    }

    // Mock data generator for employee reports
    getMockEmployeeReport(filters = {}) {
        const mockEmployee = {
            _id: 'mock-employee-id',
            employeeId: filters.employeeId || 'T1166',
            firstName: 'Ashish',
            lastName: 'Dhole',
            email: 'ashish.dhole@company.com',
            department: 'IT',
            designation: 'Software Engineer',
            status: 'active'
        };

        const mockTimesheets = [
            {
                _id: 'mock-ts-1',
                weekRange: '2024-01-01 to 2024-01-07',
                totalHours: 40,
                totalNormalHours: 40,
                totalOvertimeHours: 0,
                status: 'approved',
                submittedAt: '2024-01-08T10:00:00Z',
                projectSummary: [
                    { projectCode: 'PROJ001', totalHours: 25, entries: 5 },
                    { projectCode: 'PROJ002', totalHours: 15, entries: 3 }
                ]
            },
            {
                _id: 'mock-ts-2',
                weekRange: '2024-01-08 to 2024-01-14',
                totalHours: 38,
                totalNormalHours: 35,
                totalOvertimeHours: 3,
                status: 'pending',
                submittedAt: '2024-01-15T09:30:00Z',
                projectSummary: [
                    { projectCode: 'PROJ001', totalHours: 20, entries: 4 },
                    { projectCode: 'PROJ003', totalHours: 18, entries: 4 }
                ]
            }
        ];

        return {
            success: true,
            type: 'employee',
            employee: mockEmployee,
            timesheets: mockTimesheets
        };
    }

    getMockHoursTracking(filters = {}) {
        const projects = this.getMockProjects();
        const filteredProjects = projects.filter(project => {
            if (filters.plNo && !project.plNo.includes(filters.plNo)) return false;
            if (filters.projectName && !project.name.toLowerCase().includes(filters.projectName.toLowerCase())) return false;
            return true;
        });

        return {
            success: true,
            projects: filteredProjects,
            totals: {
                totalHours: 500,
                consumedHours: 320,
                balanceHours: 180,
                variationHours: 0
            }
        };
    }

    // ==================== MOCK DATA GENERATORS ====================

    getMockUsers() {
        return [
            {
                _id: '1',
                employeeId: 'T1166',
                firstName: 'Ashish',
                lastName: 'Dhole',
                email: 'ashish.dhole@company.com',
                department: 'IT',
                role: 'employee',
                status: 'active',
                teamLeader: null,
                isTeamLeader: false
            },
            {
                _id: '2',
                employeeId: 'T1136',
                firstName: 'Anjali',
                lastName: 'Kulkarni',
                email: 'anjali.kulkarni@company.com',
                department: 'HR',
                role: 'employee',
                status: 'active',
                teamLeader: null,
                isTeamLeader: false
            },
            {
                _id: '3',
                employeeId: 'T1001',
                firstName: 'Rajesh',
                lastName: 'Patil',
                email: 'rajesh.patil@company.com',
                department: 'IT',
                role: 'team_leader',
                status: 'active',
                teamLeader: null,
                isTeamLeader: true
            },
            {
                _id: '4',
                employeeId: 'T1002',
                firstName: 'Priya',
                lastName: 'Sharma',
                email: 'priya.sharma@company.com',
                department: 'HR',
                role: 'team_leader',
                status: 'active',
                teamLeader: null,
                isTeamLeader: true
            }
        ];
    }

    getMockTeamLeaders() {
        return this.getMockUsers().filter(user => user.role === 'team_leader' || user.isTeamLeader);
    }

    getMockTeamMembers() {
        const teamLeader = this.getMockUsers().find(user => user.role === 'team_leader');
        return this.getMockUsers().filter(user => 
            user.role === 'employee' && 
            user.department === teamLeader?.department
        );
    }

    getMockProjects() {
        return [
            { 
                _id: '1', 
                plNo: 'PROJ001',
                name: 'Website Development', 
                status: 'active',
                totalHours: 200,
                consumedHours: 50,
                startDate: '2024-01-01',
                endDate: '2024-12-31'
            },
            { 
                _id: '2', 
                plNo: 'PROJ002',
                name: 'Mobile App Development', 
                status: 'active',
                totalHours: 300,
                consumedHours: 120,
                startDate: '2024-02-01',
                endDate: '2024-11-30'
            },
            { 
                _id: '3', 
                plNo: 'MISC',
                name: 'Miscellaneous', 
                status: 'active',
                totalHours: 0,
                consumedHours: 0
            }
        ];
    }

    getMockActivityCodes(department = null) {
        const baseCodes = [
            { _id: '1', code: 'MISC', name: 'Miscellaneous Activity', department: 'All', isActive: true },
            { _id: '2', code: 'DEV', name: 'Development', department: 'IT', isActive: true },
            { _id: '3', code: 'TEST', name: 'Testing', department: 'IT', isActive: true },
            { _id: '4', code: 'DESIGN', name: 'Design', department: 'IT', isActive: true },
            { _id: '5', code: 'MEETING', name: 'Meeting', department: 'All', isActive: true },
            { _id: '6', code: 'TRAINING', name: 'Training', department: 'All', isActive: true }
        ];
        
        if (!department) return baseCodes;
        
        return baseCodes.filter(code => 
            code.department === 'All' || code.department === department
        );
    }

    getMockTimesheets() {
        const userData = this.getSafeUserData();
        const now = new Date();
        const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
        
        return [
            {
                _id: 'mock1',
                employee: userData?.id || 'mock-user',
                employeeCode: userData?.employeeId || 'T1136',
                employeeName: userData ? `${userData.firstName} ${userData.lastName}` : 'Anjali Kulkarni',
                department: userData?.department || 'HR',
                weekStartDate: this.formatDate(lastWeek),
                weekEndDate: this.formatDate(new Date(lastWeek.getTime() + 6 * 24 * 60 * 60 * 1000)),
                status: 'approved',
                totalHours: 40,
                totalNormalHours: 40,
                totalOvertimeHours: 0,
                entries: [],
                submittedAt: new Date(lastWeek.getTime() + 2 * 24 * 60 * 60 * 1000).toISOString()
            },
            {
                _id: 'mock2',
                employee: userData?.id || 'mock-user',
                employeeCode: userData?.employeeId || 'T1136',
                employeeName: userData ? `${userData.firstName} ${userData.lastName}` : 'Anjali Kulkarni',
                department: userData?.department || 'HR',
                weekStartDate: this.formatDate(twoWeeksAgo),
                weekEndDate: this.formatDate(new Date(twoWeeksAgo.getTime() + 6 * 24 * 60 * 60 * 1000)),
                status: 'rejected',
                totalHours: 35,
                totalNormalHours: 35,
                totalOvertimeHours: 0,
                entries: [],
                submittedAt: new Date(twoWeeksAgo.getTime() + 2 * 24 * 60 * 60 * 1000).toISOString(),
                rejectedAt: new Date(twoWeeksAgo.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString(),
                rejectionReason: 'Incomplete project codes'
            }
        ];
    }

    getMockEditableTimesheets() {
        return this.getMockTimesheets().filter(ts => ts.status === 'rejected');
    }

    getMockDashboardStats() {
        return {
            totalUsers: 45,
            activeTimesheets: 12,
            pendingApprovals: 3,
            totalProjects: 8,
            weeklyHours: 240,
            utilizationRate: 85,
            submittedThisWeek: 15,
            approvedThisWeek: 12,
            rejectedThisWeek: 3
        };
    }

    getMockAnalytics() {
        return {
            userGrowth: [
                { month: 'Jan', users: 35, timesheets: 28 },
                { month: 'Feb', users: 38, timesheets: 32 },
                { month: 'Mar', users: 42, timesheets: 38 },
                { month: 'Apr', users: 45, timesheets: 42 }
            ],
            timesheetStats: {
                submitted: 45,
                approved: 40,
                rejected: 5,
                pending: 3
            },
            projectUtilization: [
                { project: 'PROJ001', utilized: 65, allocated: 100 },
                { project: 'PROJ002', utilized: 40, allocated: 150 },
                { project: 'PROJ003', utilized: 85, allocated: 80 }
            ]
        };
    }

    getMockSystemStats() {
        return {
            totalUsers: 45,
            totalTimesheets: 245,
            totalProjects: 12,
            systemUptime: 99.8,
            storageUsed: '2.4 GB',
            lastBackup: new Date().toISOString(),
            activeSessions: 23,
            apiCallsToday: 1245
        };
    }

    formatDate(date) {
        return date.toISOString().split('T')[0];
    }

    // ==================== ADVANCED UTILITY METHODS ====================

    getSafeUserData() {
        try {
            const userData = localStorage.getItem('userData');
            return userData ? JSON.parse(userData) : null;
        } catch (error) {
            console.warn('Could not parse user data:', error);
            return null;
        }
    }

    isAuthenticated() {
        return !!this.token;
    }

    logout() {
        this.logTimesheetOperation('USER_LOGOUT', {
            userId: this.getSafeUserData()?.employeeId
        }, 'info');
        
        this.token = null;
        try {
            localStorage.removeItem('authToken');
            localStorage.removeItem('userData');
        } catch (error) {
            console.warn('Could not clear localStorage:', error);
        }
    }

    async testConnection() {
        this.logTimesheetOperation('CONNECTION_TEST', {}, 'info');
        
        try {
            await this.request('/health');
            this.isOnline = true;
            this.retryCount = 0;
            
            this.logTimesheetOperation('CONNECTION_TEST_SUCCESS', {}, 'success');
            return { success: true, message: 'Connected to server' };
        } catch (error) {
            this.isOnline = false;
            
            this.logTimesheetOperation('CONNECTION_TEST_FAILED', {
                error: error.message
            }, 'error');
            
            return { 
                success: false, 
                message: 'Cannot connect to server',
                error: error.message 
            };
        }
    }

    getConnectionStatus() {
        return {
            isOnline: this.isOnline,
            baseURL: this.baseURL,
            isAuthenticated: this.isAuthenticated(),
            retryCount: this.retryCount,
            offlineQueueLength: this.offlineQueue.length,
            timesheetLogsCount: this.timesheetLogs.length,
            forceMockMode: this.forceMockMode
        };
    }

    getTimesheetSystemStatus() {
        const stats = this.getTimesheetStatistics();
        const status = this.getConnectionStatus();
        
        return {
            ...stats,
            ...status,
            lastSync: new Date().toISOString(),
            features: {
                submission: true,
                approval: true,
                rejection: true,
                editing: true,
                resubmission: true,
                export: true,
                offlineSupport: true,
                analytics: true,
                adminFeatures: true,
                teamLeader: true,
                lateSubmissionPermissions: true,
                leaveManagement: true
            }
        };
    }

    // Performance monitoring
    async measurePerformance(endpoint, options = {}) {
        const startTime = performance.now();
        const requestId = this.generateId();
        
        this.logTimesheetOperation('PERFORMANCE_TEST_START', {
            requestId,
            endpoint
        }, 'info');
        
        try {
            const result = await this.request(endpoint, options);
            const endTime = performance.now();
            const duration = endTime - startTime;
            
            this.logTimesheetOperation('PERFORMANCE_TEST_SUCCESS', {
                requestId,
                endpoint,
                duration: duration.toFixed(2)
            }, 'success');
            
            return {
                success: true,
                data: result,
                duration: duration,
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            const endTime = performance.now();
            const duration = endTime - startTime;
            
            this.logTimesheetOperation('PERFORMANCE_TEST_FAILED', {
                requestId,
                endpoint,
                duration: duration.toFixed(2),
                error: error.message
            }, 'error');
            
            return {
                success: false,
                error: error,
                duration: duration,
                timestamp: new Date().toISOString()
            };
        }
    }

    // Export logs for debugging
    exportLogs(format = 'json') {
        const logs = this.getTimesheetLogs(1000);
        const exportData = {
            exportTimestamp: new Date().toISOString(),
            totalLogs: logs.length,
            systemStatus: this.getTimesheetSystemStatus(),
            logs: logs
        };
        
        if (format === 'csv') {
            const headers = ['Timestamp', 'Operation', 'Status', 'User', 'Session ID', 'Data'];
            const csvRows = logs.map(log => [
                log.timestamp,
                log.operation,
                log.status,
                log.user,
                log.sessionId,
                JSON.stringify(log.data)
            ]);
            
            const csvContent = [headers, ...csvRows]
                .map(row => row.map(field => `"${field}"`).join(','))
                .join('\n');
            
            return csvContent;
        } else {
            return JSON.stringify(exportData, null, 2);
        }
    }

    // System diagnostics
    async runDiagnostics() {
        const diagnostics = {
            timestamp: new Date().toISOString(),
            connection: await this.testConnection(),
            authentication: this.isAuthenticated(),
            userData: this.getSafeUserData() ? 'Present' : 'Missing',
            localStorage: {
                authToken: localStorage.getItem('authToken') ? 'Present' : 'Missing',
                userData: localStorage.getItem('userData') ? 'Present' : 'Missing',
                apiBaseURL: localStorage.getItem('apiBaseURL') || 'Not set'
            },
            system: this.getTimesheetSystemStatus(),
            performance: await this.measurePerformance('/health')
        };

        this.logTimesheetOperation('SYSTEM_DIAGNOSTICS', diagnostics, 'info');
        return diagnostics;
    }

    // ==================== LATE SUBMISSION PERMISSION METHODS ====================

    async checkLateSubmissionPermission(employeeId, date) {
        this.logTimesheetOperation('CHECK_LATE_SUBMISSION_PERMISSION', {
            employeeId,
            date
        }, 'info');
        
        try {
            const response = await this.request(`/late-submissions/check?employeeId=${employeeId}&date=${date}`);
            return response;
        } catch (error) {
            this.logTimesheetOperation('CHECK_LATE_SUBMISSION_PERMISSION_FAILED', {
                employeeId,
                date,
                error: error.message
            }, 'error');
            throw error;
        }
    }

    async getMyLateSubmissionPermissions() {
        this.logTimesheetOperation('GET_MY_LATE_SUBMISSION_PERMISSIONS', {}, 'info');
        
        try {
            const userData = this.getSafeUserData();
            const response = await this.request(`/late-submissions/employee/${userData.id}`);
            return response;
        } catch (error) {
            this.logTimesheetOperation('GET_MY_LATE_SUBMISSION_PERMISSIONS_FAILED', {
                error: error.message
            }, 'error');
            throw error;
        }
    }

    async grantLateSubmissionPermission(permissionData) {
        this.logTimesheetOperation('GRANT_LATE_SUBMISSION_PERMISSION', {
            employeeId: permissionData.employeeId,
            date: permissionData.date,
            reason: permissionData.reason
        }, 'info');
        
        try {
            const response = await this.request('/late-submissions/grant', {
                method: 'POST',
                body: permissionData
            });
            return response;
        } catch (error) {
            this.logTimesheetOperation('GRANT_LATE_SUBMISSION_PERMISSION_FAILED', {
                error: error.message
            }, 'error');
            throw error;
        }
    }

    async getAllLateSubmissionPermissions(filters = {}) {
        this.logTimesheetOperation('GET_ALL_LATE_SUBMISSION_PERMISSIONS', { filters }, 'info');
        
        try {
            const queryParams = new URLSearchParams(filters).toString();
            const response = await this.request(`/late-submissions/admin/all${queryParams ? `?${queryParams}` : ''}`);
            return response;
        } catch (error) {
            this.logTimesheetOperation('GET_ALL_LATE_SUBMISSION_PERMISSIONS_FAILED', {
                error: error.message
            }, 'error');
            throw error;
        }
    }

    async getLateSubmissionPermissionStats() {
        this.logTimesheetOperation('GET_LATE_SUBMISSION_PERMISSION_STATS', {}, 'info');
        
        try {
            const response = await this.request('/late-submissions/admin/stats');
            return response;
        } catch (error) {
            this.logTimesheetOperation('GET_LATE_SUBMISSION_PERMISSION_STATS_FAILED', {
                error: error.message
            }, 'error');
            throw error;
        }
    }

    async revokeLateSubmissionPermission(permissionId) {
        this.logTimesheetOperation('REVOKE_LATE_SUBMISSION_PERMISSION', { permissionId }, 'info');
        
        try {
            const response = await this.request(`/late-submissions/admin/revoke/${permissionId}`, {
                method: 'PUT'
            });
            return response;
        } catch (error) {
            this.logTimesheetOperation('REVOKE_LATE_SUBMISSION_PERMISSION_FAILED', {
                permissionId,
                error: error.message
            }, 'error');
            throw error;
        }
    }

    async markLateSubmissionPermissionAsUsed(permissionId) {
        this.logTimesheetOperation('MARK_LATE_SUBMISSION_PERMISSION_AS_USED', { permissionId }, 'info');
        
        try {
            const response = await this.request(`/late-submissions/mark-used/${permissionId}`, {
                method: 'PUT'
            });
            return response;
        } catch (error) {
            this.logTimesheetOperation('MARK_LATE_SUBMISSION_PERMISSION_AS_USED_FAILED', {
                permissionId,
                error: error.message
            }, 'error');
            throw error;
        }
    }

    // ==================== LEAVE MANAGEMENT ENDPOINTS ====================

    async getMyLeaveBalance() {
        this.logTimesheetOperation('GET_MY_LEAVE_BALANCE', {}, 'info');
        
        try {
            const response = await this.request('/leave/balance/my');
            
            this.logTimesheetOperation('GET_MY_LEAVE_BALANCE_SUCCESS', {
                hasBalance: !!response.leaveBalance
            }, 'success');
            
            return response;
        } catch (error) {
            this.logTimesheetOperation('GET_MY_LEAVE_BALANCE_FAILED', {
                error: error.message,
                statusCode: error.status
            }, 'error');
            
            // Return mock data if endpoint fails
            return this.getMockLeaveBalance();
        }
    }

    async getLeaveBalances(params = {}) {
        this.logTimesheetOperation('GET_ALL_LEAVE_BALANCES', { params }, 'info');
        
        try {
            const queryParams = new URLSearchParams(params).toString();
            const endpoint = `/leave/balance/all${queryParams ? `?${queryParams}` : ''}`;
            const response = await this.request(endpoint);
            
            this.logTimesheetOperation('GET_ALL_LEAVE_BALANCES_SUCCESS', {
                count: response.length || 0,
                params
            }, 'success');
            
            return response;
        } catch (error) {
            this.logTimesheetOperation('GET_ALL_LEAVE_BALANCES_FAILED', {
                error: error.message,
                params
            }, 'error');
            
            throw error;
        }
    }

    async updateLeaveBalance(employeeId, data) {
        this.logTimesheetOperation('UPDATE_LEAVE_BALANCE', {
            employeeId,
            leaveType: data.leaveType,
            newValue: data.newValue,
            reason: data.reason
        }, 'info');
        
        try {
            const response = await this.request(`/leave/balance/${employeeId}`, {
                method: 'PUT',
                body: data
            });
            
            this.logTimesheetOperation('UPDATE_LEAVE_BALANCE_SUCCESS', {
                employeeId,
                leaveType: data.leaveType,
                oldValue: response.adjustment?.oldValue,
                newValue: response.adjustment?.newValue,
                difference: response.adjustment?.difference
            }, 'success');
            
            this.safeNotification('Leave balance updated successfully!', 'success', 5000);
            
            return response;
        } catch (error) {
            this.logTimesheetOperation('UPDATE_LEAVE_BALANCE_FAILED', {
                employeeId,
                error: error.message,
                statusCode: error.status,
                userMessage: error.userMessage
            }, 'error');
            
            throw error;
        }
    }

    async updateEmployeeLeaveStatus(employeeId, data) {
        this.logTimesheetOperation('UPDATE_EMPLOYEE_LEAVE_STATUS', {
            employeeId,
            newStatus: data.status,
            probationMonths: data.probationMonths
        }, 'info');
        
        try {
            const response = await this.request(`/leave/balance/${employeeId}/status`, {
                method: 'PUT',
                body: data
            });
            
            this.logTimesheetOperation('UPDATE_EMPLOYEE_LEAVE_STATUS_SUCCESS', {
                employeeId,
                oldStatus: data.oldStatus,
                newStatus: data.status,
                probationMonths: data.probationMonths
            }, 'success');
            
            this.safeNotification(`Employee status updated to ${data.status}`, 'success', 5000);
            
            return response;
        } catch (error) {
            this.logTimesheetOperation('UPDATE_EMPLOYEE_LEAVE_STATUS_FAILED', {
                employeeId,
                error: error.message,
                statusCode: error.status
            }, 'error');
            
            throw error;
        }
    }

    async runMonthlyAccrual() {
        this.logTimesheetOperation('RUN_MONTHLY_ACCRUAL', {}, 'info');
        
        try {
            const response = await this.request('/leave/balance/monthly-accrual', {
                method: 'POST'
            });
            
            this.logTimesheetOperation('RUN_MONTHLY_ACCRUAL_SUCCESS', {
                updatedCount: response.updatedCount,
                date: response.date
            }, 'success');
            
            this.safeNotification(`Monthly PL accrual completed. Updated ${response.updatedCount} employees.`, 'success', 5000);
            
            return response;
        } catch (error) {
            this.logTimesheetOperation('RUN_MONTHLY_ACCRUAL_FAILED', {
                error: error.message,
                statusCode: error.status
            }, 'error');
            
            throw error;
        }
    }

    

    async submitLeaveRequest(leaveData) {
        this.logTimesheetOperation('SUBMIT_LEAVE_REQUEST', {
            leaveType: leaveData.leaveType,
            startDate: leaveData.startDate,
            endDate: leaveData.endDate,
            totalDays: leaveData.totalDays,
            reason: leaveData.reason
        }, 'submission');
        
        try {
            const response = await this.request('/leave/submit', {
                method: 'POST',
                body: leaveData
            });
            
            this.logTimesheetOperation('SUBMIT_LEAVE_REQUEST_SUCCESS', {
                leaveId: response._id,
                status: response.status,
                leaveType: response.leaveType,
                totalDays: response.totalDays
            }, 'success');
            
            this.safeNotification('Leave request submitted successfully! It is now pending approval.', 'success', 5000);
            
            return response;
        } catch (error) {
            this.logTimesheetOperation('SUBMIT_LEAVE_REQUEST_FAILED', {
                error: error.message,
                statusCode: error.status,
                userMessage: error.userMessage
            }, 'error');
            
            throw error;
        }
    }

    async cancelLeaveRequest(leaveId) {
        this.logTimesheetOperation('CANCEL_LEAVE_REQUEST', { leaveId }, 'info');
        
        try {
            const response = await this.request(`/leave/${leaveId}/cancel`, {
                method: 'PATCH'
            });
            
            this.logTimesheetOperation('CANCEL_LEAVE_REQUEST_SUCCESS', {
                leaveId,
                newStatus: response.status
            }, 'success');
            
            this.safeNotification('Leave request cancelled successfully!', 'success', 5000);
            
            return response;
        } catch (error) {
            this.logTimesheetOperation('CANCEL_LEAVE_REQUEST_FAILED', {
                leaveId,
                error: error.message,
                statusCode: error.status
            }, 'error');
            
            throw error;
        }
    }
    async getMyLeaveRequests(filters = {}) {
    this.logTimesheetOperation('GET_MY_LEAVE_REQUESTS', { filters }, 'info');
    
    try {
        const queryParams = new URLSearchParams(filters).toString();
        const endpoint = `/leave/my-requests${queryParams ? `?${queryParams}` : ''}`;
        const response = await this.request(endpoint);
        
        this.logTimesheetOperation('GET_MY_LEAVE_REQUESTS_SUCCESS', {
            count: response.length || 0,
            statusBreakdown: this.getLeaveStatusBreakdown(response)
        }, 'success');
        
        return response;
    } catch (error) {
        this.logTimesheetOperation('GET_MY_LEAVE_REQUESTS_FAILED', {
            error: error.message,
            filters
        }, 'error');
        
        throw error;
    }
}
    async getAllLeaveRequests(filters = {}) {
        this.logTimesheetOperation('GET_ALL_LEAVE_REQUESTS', { filters }, 'info');
        
        try {
            const queryParams = new URLSearchParams(filters).toString();
            const endpoint = `/leave${queryParams ? `?${queryParams}` : ''}`;
            const response = await this.request(endpoint);
            
            this.logTimesheetOperation('GET_ALL_LEAVE_REQUESTS_SUCCESS', {
                count: response.length || 0,
                statusBreakdown: this.getLeaveStatusBreakdown(response)
            }, 'success');
            
            return response;
        } catch (error) {
            this.logTimesheetOperation('GET_ALL_LEAVE_REQUESTS_FAILED', {
                error: error.message,
                filters
            }, 'error');
            
            throw error;
        }
    }

    async approveLeaveRequest(leaveId) {
        this.logTimesheetOperation('APPROVE_LEAVE_REQUEST', { leaveId }, 'approval');
        
        try {
            const response = await this.request(`/leave/${leaveId}/approve`, {
                method: 'PATCH'
            });
            
            this.logTimesheetOperation('APPROVE_LEAVE_REQUEST_SUCCESS', {
                leaveId,
                newStatus: response.status,
                approvedBy: this.getSafeUserData()?.employeeId
            }, 'success');
            
            this.safeNotification('Leave request approved successfully!', 'success', 5000);
            
            return response;
        } catch (error) {
            this.logTimesheetOperation('APPROVE_LEAVE_REQUEST_FAILED', {
                leaveId,
                error: error.message,
                statusCode: error.status
            }, 'error');
            
            throw error;
        }
    }

    async rejectLeaveRequest(leaveId, remarks) {
        this.logTimesheetOperation('REJECT_LEAVE_REQUEST', {
            leaveId,
            hasRemarks: !!remarks,
            remarksLength: remarks?.length || 0
        }, 'rejection');
        
        try {
            const response = await this.request(`/leave/${leaveId}/reject`, {
                method: 'PATCH',
                body: { remarks }
            });
            
            this.logTimesheetOperation('REJECT_LEAVE_REQUEST_SUCCESS', {
                leaveId,
                newStatus: response.status,
                rejectedBy: this.getSafeUserData()?.employeeId,
                hasRemarks: !!remarks
            }, 'success');
            
            this.safeNotification('Leave request rejected with remarks.', 'warning', 5000);
            
            return response;
        } catch (error) {
            this.logTimesheetOperation('REJECT_LEAVE_REQUEST_FAILED', {
                leaveId,
                error: error.message,
                statusCode: error.status
            }, 'error');
            
            throw error;
        }
    }

    async getLeaveRequestById(leaveId) {
        this.logTimesheetOperation('GET_LEAVE_REQUEST_BY_ID', { leaveId }, 'info');
        
        try {
            const response = await this.request(`/leave/${leaveId}`);
            
            this.logTimesheetOperation('GET_LEAVE_REQUEST_BY_ID_SUCCESS', {
                leaveId,
                status: response.status,
                employee: response.employeeName
            }, 'success');
            
            return response;
        } catch (error) {
            this.logTimesheetOperation('GET_LEAVE_REQUEST_BY_ID_FAILED', {
                leaveId,
                error: error.message,
                statusCode: error.status
            }, 'error');
            
            throw error;
        }
    }

    async getLeaveCalendar(params = {}) {
        this.logTimesheetOperation('GET_LEAVE_CALENDAR', { params }, 'info');
        
        try {
            const queryParams = new URLSearchParams(params).toString();
            const endpoint = `/leave/calendar${queryParams ? `?${queryParams}` : ''}`;
            const response = await this.request(endpoint);
            
            this.logTimesheetOperation('GET_LEAVE_CALENDAR_SUCCESS', {
                eventCount: response.length || 0,
                dateRange: params
            }, 'success');
            
            return response;
        } catch (error) {
            this.logTimesheetOperation('GET_LEAVE_CALENDAR_FAILED', {
                error: error.message,
                params
            }, 'error');
            
            throw error;
        }
    }

    async getLeaveAnalytics() {
        this.logTimesheetOperation('GET_LEAVE_ANALYTICS', {}, 'info');
        
        try {
            const response = await this.request('/leave/analytics');
            
            this.logTimesheetOperation('GET_LEAVE_ANALYTICS_SUCCESS', {
                hasData: !!response
            }, 'success');
            
            return response;
        } catch (error) {
            this.logTimesheetOperation('GET_LEAVE_ANALYTICS_FAILED', {
                error: error.message,
                statusCode: error.status
            }, 'error');
            
            throw error;
        }
    }

    getLeaveStatusBreakdown(leaves) {
        const breakdown = {
            pending: 0,
            approved: 0,
            rejected: 0,
            cancelled: 0,
            total: leaves.length || 0
        };
        
        if (Array.isArray(leaves)) {
            leaves.forEach(leave => {
                if (breakdown.hasOwnProperty(leave.status)) {
                    breakdown[leave.status]++;
                }
            });
        }
        
        return breakdown;
    }

    getLeaveBalanceSummary(balance) {
        if (!balance) {
            return {
                totalLeaves: 0,
                availableLeaves: 0,
                usedLeaves: 0,
                sickLeave: 0,
                privilegeLeave: 0,
                maternityLeave: 0,
                otherLeaves: 0
            };
        }

        const sickLeave = balance.sickLeave?.current || 0;
        const privilegeLeave = balance.privilegeLeave?.current || 0;
        const maternityLeave = balance.maternityLeave?.current || 0;
        const otherLeaves = 
            (balance.halfPayWithPL?.current || 0) +
            (balance.leaveWithoutPay?.current || 0) +
            (balance.halfLWP?.current || 0);

        const availableLeaves = sickLeave + privilegeLeave + maternityLeave + otherLeaves;
        
        const usedLeaves = balance.usedLeaves?.reduce((total, used) => total + used.days, 0) || 0;
        
        return {
            totalLeaves: availableLeaves + usedLeaves,
            availableLeaves,
            usedLeaves,
            sickLeave,
            privilegeLeave,
            maternityLeave,
            otherLeaves,
            status: balance.status,
            nextAccrual: balance.privilegeLeave?.nextAccrual
        };
    }

    async checkLeaveBalanceSufficiency(leaveType, daysRequested) {
        this.logTimesheetOperation('CHECK_LEAVE_BALANCE_SUFFICIENCY', {
            leaveType,
            daysRequested
        }, 'info');
        
        try {
            const balanceData = await this.getMyLeaveBalance();
            const balance = balanceData.leaveBalance;
            
            if (!balance) {
                throw new Error('Leave balance not found');
            }
            
            let availableDays = 0;
            switch(leaveType) {
                case 'sickLeave':
                    availableDays = balance.sickLeave?.current || 0;
                    break;
                case 'privilegeLeave':
                    availableDays = balance.privilegeLeave?.current || 0;
                    break;
                case 'maternityLeave':
                    availableDays = balance.maternityLeave?.current || 0;
                    break;
                case 'halfPayWithPL':
                    availableDays = balance.halfPayWithPL?.current || 0;
                    break;
                case 'leaveWithoutPay':
                    availableDays = balance.leaveWithoutPay?.current || 0;
                    break;
                case 'halfLWP':
                    availableDays = balance.halfLWP?.current || 0;
                    break;
                default:
                    throw new Error('Invalid leave type');
            }
            
            const isSufficient = availableDays >= daysRequested;
            
            return {
                isSufficient,
                availableDays,
                daysRequested,
                deficit: isSufficient ? 0 : daysRequested - availableDays,
                canProceed: isSufficient || leaveType === 'leaveWithoutPay' || leaveType === 'halfLWP'
            };
        } catch (error) {
            this.logTimesheetOperation('CHECK_LEAVE_BALANCE_SUFFICIENCY_FAILED', {
                leaveType,
                daysRequested,
                error: error.message
            }, 'error');
            
            throw error;
        }
    }

    getMockLeaveBalance() {
        const user = this.getSafeUserData();
        
        return {
            leaveBalance: {
                employee: user?._id || 'mock-user-id',
                employeeId: user?.employeeId || 'T1166',
                firstName: user?.firstName || 'Mock',
                lastName: user?.lastName || 'User',
                department: user?.department || 'IT',
                designation: user?.designation || 'Software Engineer',
                joinDate: new Date('2024-01-01').toISOString(),
                status: 'active',
                
                sickLeave: {
                    current: 8,
                    total: 8,
                    lastReset: new Date().toISOString()
                },
                
                privilegeLeave: {
                    current: 12,
                    total: 12,
                    accrualRate: 1.5,
                    nextAccrual: new Date(new Date().setMonth(new Date().getMonth() + 1)).toISOString(),
                    probationMonths: 0
                },
                
                halfPayWithPL: {
                    current: 0,
                    total: 0
                },
                
                leaveWithoutPay: {
                    current: 0,
                    total: 0
                },
                
                halfLWP: {
                    current: 0,
                    total: 0
                },
                
                maternityLeave: {
                    current: 182,
                    total: 182,
                    eligibilityDate: null
                },
                
                accrualHistory: [],
                adjustmentHistory: [],
                usedLeaves: [],
                
                notes: 'Mock leave balance for development',
                lastUpdated: new Date().toISOString(),
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            }
        };
    }
    async checkLeaveForDate(date) {
    this.logTimesheetOperation('CHECK_LEAVE_FOR_DATE', { date }, 'info');
    
    try {
        const response = await this.request(`/leave/check-date/${date}`);
        return response;
    } catch (error) {
        this.logTimesheetOperation('CHECK_LEAVE_FOR_DATE_FAILED', {
            date,
            error: error.message
        }, 'error');
        
        // Mock response for development
        return {
            hasLeave: false,
            leaveType: null,
            reason: null,
            mock: true
        };
    }
}

// ✅ ADDED: Get approved leaves for week
async getApprovedLeavesForWeek(weekStartDate) {
    this.logTimesheetOperation('GET_APPROVED_LEAVES_FOR_WEEK', { weekStartDate }, 'info');
    
    try {
        const response = await this.request(`/leave/week/${weekStartDate}`);
        return response;
    } catch (error) {
        this.logTimesheetOperation('GET_APPROVED_LEAVES_FOR_WEEK_FAILED', {
            weekStartDate,
            error: error.message
        }, 'error');
        
        // Mock response for development
        return {
            leaveDates: [],
            weekStartDate,
            mock: true
        };
    }
}
    
}

// Create and export global instance
const apiClient = new ApiClient();
window.apiClient = apiClient;

// Auto-configure on load
if (typeof window !== 'undefined') {
    // Set default config if not present
    if (!window.APP_CONFIG) {
        window.APP_CONFIG = {
            API_BASE_URL: 'http://localhost:5000/api'
        };
    }
    
    // Auto-test connection
    setTimeout(() => {
        apiClient.testConnection().then(status => {
            console.log('🔌 Connection test:', status);
        });
    }, 1000);
}

console.log('✅ COMPLETE ENHANCED API CLIENT initialized - All features loaded + Late Submission Permissions + Leave Management + All issues fixed');