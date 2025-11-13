// ==================== ENHANCED API CLIENT ====================
class ApiClient {
    constructor() {
        // Dynamic base URL - supports different environments
        this.baseURL = this.getBaseURL();
        this.token = localStorage.getItem('authToken');
        this.isOnline = true;
        
        console.log('🔗 API Client initialized with base URL:', this.baseURL);
    }

    // Get base URL with fallbacks
    getBaseURL() {
        // Priority order: window config -> localStorage -> default
        if (window.APP_CONFIG && window.APP_CONFIG.API_BASE_URL) {
            return window.APP_CONFIG.API_BASE_URL;
        }
        
        const savedURL = localStorage.getItem('apiBaseURL');
        if (savedURL) {
            return savedURL;
        }
        
        // Try common backend ports
        const ports = [3000, 5000, 8000, 8080];
        const host = window.location.hostname === 'localhost' ? 'localhost' : window.location.hostname;
        
        return `http://${host}:5000/api`; // Default to port 5000
    }

    // Set base URL dynamically
    setBaseURL(url) {
        this.baseURL = url;
        localStorage.setItem('apiBaseURL', url);
        console.log('🔗 Updated API base URL:', url);
    }

    // Set authentication token
    setToken(token) {
        this.token = token;
        localStorage.setItem('authToken', token);
        console.log('🔑 Authentication token set');
    }

    // Enhanced request method with better error handling
    async request(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        
        const config = {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        };

        // Add authentication token if available
        if (this.token) {
            config.headers['Authorization'] = `Bearer ${this.token}`;
        }

        // Add body for non-GET requests
        if (config.body && typeof config.body === 'object' && config.method !== 'GET') {
            config.body = JSON.stringify(config.body);
        }

        try {
            console.log(`🔄 API ${config.method} Request: ${url}`, config);
            
            const response = await fetch(url, config);
            
            // Handle connection errors
            if (!response.ok) {
                return this.handleErrorResponse(response, url);
            }
            
            // Handle different response types
            const contentType = response.headers.get('content-type');
            
            if (contentType && contentType.includes('application/json')) {
                const data = await response.json();
                console.log(`✅ API Response from ${endpoint}:`, data);
                return data;
            } else if (contentType && contentType.includes('text/csv')) {
                const text = await response.text();
                console.log(`✅ CSV Response from ${endpoint} (length: ${text.length})`);
                return text;
            } else {
                const text = await response.text();
                console.log(`✅ Text Response from ${endpoint}:`, text);
                return text;
            }
            
        } catch (error) {
            return this.handleRequestError(error, url, endpoint);
        }
    }

    // Handle HTTP error responses
    async handleErrorResponse(response, url) {
        console.error(`❌ HTTP Error ${response.status}: ${url}`);
        
        let errorMessage = `Server error: ${response.status}`;
        let errorData = null;

        try {
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                errorData = await response.json();
                errorMessage = errorData.message || errorMessage;
            } else {
                errorMessage = await response.text();
            }
        } catch (parseError) {
            console.warn('Could not parse error response:', parseError);
        }

        const error = new Error(errorMessage);
        error.status = response.status;
        error.data = errorData;
        
        // Handle specific status codes
        switch (response.status) {
            case 401:
                console.warn('🛑 Unauthorized - redirecting to login');
                this.handleUnauthorized();
                break;
            case 403:
                console.warn('🚫 Forbidden access');
                break;
            case 404:
                console.warn('📭 Endpoint not found:', url);
                break;
            case 500:
                console.error('💥 Server internal error');
                break;
        }

        throw error;
    }

    // Handle network/connection errors
    handleRequestError(error, url, endpoint) {
        console.error(`❌ Network Error (${endpoint}):`, error);
        
        this.isOnline = false;
        
        const enhancedError = new Error(
            error.message.includes('Failed to fetch') 
                ? 'Cannot connect to server. Please check your network connection and ensure the backend is running.'
                : error.message
        );
        enhancedError.originalError = error;
        enhancedError.isNetworkError = true;
        enhancedError.endpoint = endpoint;
        
        // Safe notification - only show if showNotification function exists
        this.safeNotification(
            'Cannot connect to server. Using offline mode.', 
            'warning'
        );
        
        throw enhancedError;
    }

    // Safe notification method that won't crash if showNotification doesn't exist
    safeNotification(message, type = 'info', duration = 5000) {
        try {
            if (typeof showNotification === 'function') {
                showNotification(message, type, duration);
            } else {
                // Fallback to console and alert for critical errors
                console.log(`📢 ${type.toUpperCase()}: ${message}`);
                if (type === 'error') {
                    // Only use alert for critical errors to avoid annoying popups
                    setTimeout(() => {
                        if (typeof alert === 'function') {
                            alert(`Error: ${message}`);
                        }
                    }, 100);
                }
            }
        } catch (notificationError) {
            console.warn('Could not show notification:', notificationError);
            console.log(`📢 ${type.toUpperCase()}: ${message}`);
        }
    }

    // Handle unauthorized access
    handleUnauthorized() {
        this.logout();
        // Safe redirect handling
        setTimeout(() => {
            if (typeof redirectToLogin === 'function') {
                redirectToLogin();
            } else {
                // Fallback redirect
                window.location.href = 'index.html';
            }
        }, 2000);
    }

    // ==================== USER MANAGEMENT ENDPOINTS ====================

    async getUsers(filters = {}) {
        try {
            const queryParams = new URLSearchParams(filters).toString();
            const endpoint = `/users${queryParams ? `?${queryParams}` : ''}`;
            const users = await this.request(endpoint);
            return Array.isArray(users) ? users : [];
        } catch (error) {
            console.warn('Could not load users, returning mock data');
            return this.getMockUsers();
        }
    }

    async getUserById(userId) {
        return await this.request(`/users/${userId}`);
    }

    async createUser(userData) {
        return await this.request('/users', {
            method: 'POST',
            body: userData
        });
    }

    async updateUser(userId, userData) {
        return await this.request(`/users/${userId}`, {
            method: 'PUT',
            body: userData
        });
    }

    async deleteUser(userId) {
        return await this.request(`/users/${userId}`, {
            method: 'DELETE'
        });
    }

    // ==================== AUTH ENDPOINTS ====================

    async getCurrentUser() {
        return await this.request('/auth/me');
    }

    async updateUserProfile(userData) {
        return await this.request('/auth/profile', {
            method: 'PUT',
            body: userData
        });
    }

    async login(credentials) {
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
            
            return response;
        } catch (error) {
            console.error('Login error:', error);
            throw error;
        }
    }

    async register(userData) {
        return await this.request('/auth/register', {
            method: 'POST',
            body: userData
        });
    }

    // ==================== TIMESHEET ENDPOINTS ====================

    async submitTimesheet(timesheetData) {
        return await this.request('/timesheets/submit', {
            method: 'POST',
            body: timesheetData
        });
    }

    async getMyTimesheets(filters = {}) {
        try {
            const queryParams = new URLSearchParams(filters).toString();
            const endpoint = `/timesheets/my-timesheets${queryParams ? `?${queryParams}` : ''}`;
            const timesheets = await this.request(endpoint);
            return Array.isArray(timesheets) ? timesheets : [];
        } catch (error) {
            console.warn('Could not load timesheets, returning mock data');
            return this.getMockTimesheets();
        }
    }

    async getAllTimesheets(filters = {}) {
        try {
            const queryParams = new URLSearchParams(filters).toString();
            const endpoint = `/timesheets${queryParams ? `?${queryParams}` : ''}`;
            const timesheets = await this.request(endpoint);
            return Array.isArray(timesheets) ? timesheets : [];
        } catch (error) {
            console.warn('Could not load all timesheets, returning mock data');
            return this.getMockTimesheets();
        }
    }

    async getTimesheetById(timesheetId) {
        return await this.request(`/timesheets/${timesheetId}`);
    }

    async approveTimesheet(timesheetId) {
        return await this.request(`/timesheets/${timesheetId}/approve`, {
            method: 'PATCH'
        });
    }

    async rejectTimesheet(timesheetId, remarks) {
        return await this.request(`/timesheets/${timesheetId}/reject`, {
            method: 'PATCH',
            body: { remarks }
        });
    }

    async exportTimesheetToCSV(timesheetId) {
        return await this.request(`/timesheets/export/${timesheetId}`, {
            headers: {
                'Accept': 'text/csv'
            }
        });
    }

    async exportMultipleTimesheetsToCSV(timesheetIds) {
        return await this.request('/timesheets/export-multiple', {
            method: 'POST',
            body: { ids: timesheetIds }
        });
    }

    // ==================== PROJECT ENDPOINTS ====================

    async getMyProjects() {
        try {
            const projects = await this.request('/projects/my-projects');
            return Array.isArray(projects) ? projects : [];
        } catch (error) {
            console.warn('Could not load projects, returning mock data');
            return this.getMockProjects();
        }
    }

    async getAllProjects() {
        try {
            const projects = await this.request('/projects');
            return Array.isArray(projects) ? projects : [];
        } catch (error) {
            console.warn('Could not load all projects, returning mock data');
            return this.getMockProjects();
        }
    }

    // ✅ ADDED: Get single project details
    async getProject(projectId) {
        return await this.request(`/projects/${projectId}`);
    }

    async createProject(projectData) {
        return await this.request('/projects', {
            method: 'POST',
            body: projectData
        });
    }

    async updateProject(projectId, projectData) {
        return await this.request(`/projects/${projectId}`, {
            method: 'PUT',
            body: projectData
        });
    }

    async deleteProject(projectId) {
        return await this.request(`/projects/${projectId}`, {
            method: 'DELETE'
        });
    }

    // ==================== ACTIVITY CODE ENDPOINTS ====================

    async getActivityCodes(department = null) {
        try {
            const endpoint = department ? `/activity-codes?department=${department}` : '/activity-codes';
            const codes = await this.request(endpoint);
            return Array.isArray(codes) ? codes : [];
        } catch (error) {
            console.warn('Could not load activity codes, returning mock data');
            return this.getMockActivityCodes(department);
        }
    }

    async createActivityCode(activityData) {
        return await this.request('/activity-codes', {
            method: 'POST',
            body: activityData
        });
    }

    async updateActivityCode(codeId, activityData) {
        return await this.request(`/activity-codes/${codeId}`, {
            method: 'PUT',
            body: activityData
        });
    }

    async deleteActivityCode(codeId) {
        return await this.request(`/activity-codes/${codeId}`, {
            method: 'DELETE'
        });
    }

    // ==================== DASHBOARD & REPORTING ENDPOINTS ====================

    async getDashboardStats() {
        try {
            return await this.request('/dashboard/stats');
        } catch (error) {
            console.warn('Could not load dashboard stats, returning mock data');
            return this.getMockDashboardStats();
        }
    }

    async getTimesheetReports(filters = {}) {
        try {
            const queryParams = new URLSearchParams(filters).toString();
            const endpoint = `/reports/timesheets${queryParams ? `?${queryParams}` : ''}`;
            return await this.request(endpoint);
        } catch (error) {
            console.warn('Could not load reports, returning mock data');
            return this.getMockReports();
        }
    }

    // ==================== MOCK DATA FOR OFFLINE USE ====================

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
                createdAt: new Date().toISOString()
            },
            {
                _id: '2',
                employeeId: 'T1167',
                firstName: 'John',
                lastName: 'Smith',
                email: 'john.smith@company.com',
                department: 'HR',
                role: 'manager',
                status: 'active',
                createdAt: new Date().toISOString()
            },
            {
                _id: '3',
                employeeId: 'T1168',
                firstName: 'Sarah',
                lastName: 'Johnson',
                email: 'sarah.johnson@company.com',
                department: 'Finance',
                role: 'employee',
                status: 'active',
                createdAt: new Date().toISOString()
            }
        ];
    }

    getMockProjects() {
        return [
            { 
                _id: '1', 
                projectCode: 'PROJ001', 
                name: 'Website Development', 
                status: 'active',
                totalHours: 200,
                consumedHours: 50,
                departmentHours: {
                    IT: 150,
                    Design: 50
                }
            },
            { 
                _id: '2', 
                projectCode: 'PROJ002', 
                name: 'Mobile App', 
                status: 'active',
                totalHours: 300,
                consumedHours: 120,
                departmentHours: {
                    IT: 200,
                    QA: 100
                }
            },
            { 
                _id: '3', 
                projectCode: 'PROJ003', 
                name: 'Database Upgrade', 
                status: 'active',
                totalHours: 100,
                consumedHours: 75,
                departmentHours: {
                    IT: 100
                }
            },
            { 
                _id: '4', 
                projectCode: 'MISC', 
                name: 'Miscellaneous Activity', 
                status: 'active',
                totalHours: 0,
                consumedHours: 0,
                departmentHours: {}
            },
            { 
                _id: '5', 
                projectCode: 'HOLIDAY', 
                name: 'Holiday', 
                status: 'active',
                totalHours: 0,
                consumedHours: 0,
                departmentHours: {}
            },
            { 
                _id: '6', 
                projectCode: 'LEAVE', 
                name: 'Leave', 
                status: 'active',
                totalHours: 0,
                consumedHours: 0,
                departmentHours: {}
            }
        ];
    }

    getMockActivityCodes(department = null) {
        const baseCodes = [
            { _id: '1', code: 'MISC', name: 'Miscellaneous Activity', department: 'All' },
            { _id: '2', code: 'DEV', name: 'Development', department: 'IT' },
            { _id: '3', code: 'TEST', name: 'Testing', department: 'IT' },
            { _id: '4', code: 'MEET', name: 'Meeting', department: 'All' },
            { _id: '5', code: 'TRAIN', name: 'Training', department: 'All' },
            { _id: '6', code: 'ADMIN', name: 'Administration', department: 'Admin' },
            { _id: '7', code: 'HR', name: 'Human Resources', department: 'HR' }
        ];
        
        if (!department) return baseCodes;
        
        return baseCodes.filter(code => 
            code.department === 'All' || code.department === department
        );
    }

    getMockTimesheets() {
        const userData = this.getSafeUserData();
        return [
            {
                _id: 'mock1',
                employee: userData?.id || 'mock-user',
                employeeCode: userData?.employeeId || 'T1166',
                employeeName: userData ? `${userData.firstName} ${userData.lastName}` : 'Ashish Dhole',
                department: userData?.department || 'IT',
                weekStartDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
                weekEndDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
                status: 'approved',
                totalHours: 40,
                totalNormalHours: 40,
                totalOvertimeHours: 0
            }
        ];
    }

    getMockDashboardStats() {
        return {
            totalUsers: 45,
            activeTimesheets: 12,
            pendingApprovals: 3,
            totalProjects: 8,
            weeklyHours: 240,
            utilizationRate: 85
        };
    }

    getMockReports() {
        return {
            summary: {
                totalHours: 240,
                averageHours: 40,
                utilization: 85
            },
            data: this.getMockTimesheets()
        };
    }

    // ==================== UTILITY METHODS ====================

    // Safe user data retrieval
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
        this.token = null;
        localStorage.removeItem('authToken');
        // Safe user data removal
        try {
            localStorage.removeItem('userData');
        } catch (error) {
            console.warn('Could not remove user data:', error);
        }
        console.log('👋 User logged out');
    }

    // Test server connection
    async testConnection() {
        try {
            // Try health endpoint first, fallback to any endpoint
            try {
                await this.request('/health');
            } catch (healthError) {
                // If health endpoint fails, try a basic timesheet request
                await this.request('/timesheets/my-timesheets?limit=1');
            }
            
            this.isOnline = true;
            return { success: true, message: 'Connected to server' };
        } catch (error) {
            this.isOnline = false;
            return { 
                success: false, 
                message: 'Cannot connect to server',
                error: error.message 
            };
        }
    }

    // Get connection status
    getConnectionStatus() {
        return {
            isOnline: this.isOnline,
            baseURL: this.baseURL,
            isAuthenticated: this.isAuthenticated()
        };
    }

    // Safe method to check if we're in a browser environment
    isBrowserEnvironment() {
        return typeof window !== 'undefined' && typeof document !== 'undefined';
    }
}

// Create and export global instance
const apiClient = new ApiClient();
window.apiClient = apiClient;

// Auto-test connection on load (only in browser environment)
if (typeof window !== 'undefined') {
    setTimeout(() => {
        apiClient.testConnection().then(status => {
            console.log('🔌 Connection test:', status);
            
            if (!status.success) {
                apiClient.safeNotification(
                    `Offline Mode: ${status.message}. Some features may be limited.`,
                    'warning',
                    8000
                );
            }
        });
    }, 1000);
}

console.log('✅ Enhanced API Client initialized with offline support and safe error handling');