class ApiClient {
    constructor() {
        this.baseURL = 'http://localhost:5000/api';
        this.token = localStorage.getItem('authToken');
        this.timeout = 10000; // 10 seconds
    }

    setToken(token) {
        this.token = token;
        localStorage.setItem('authToken', token);
    }

    getHeaders() {
        const headers = {
            'Content-Type': 'application/json',
        };
        
        if (this.token) {
            headers['Authorization'] = `Bearer ${this.token}`;
        }
        
        return headers;
    }

    async request(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);

        const config = {
            headers: this.getHeaders(),
            signal: controller.signal,
            ...options
        };

        try {
            console.log(`🔗 API Call: ${options.method || 'GET'} ${url}`, options.body ? JSON.parse(options.body) : '');
            const response = await fetch(url, config);
            
            clearTimeout(timeoutId);

            // Log response status for debugging
            console.log(`📡 Response: ${response.status} ${response.statusText} for ${endpoint}`);

            if (response.status === 401) {
                this.handleUnauthorized();
                throw new Error('Authentication required');
            }

            const data = await response.json();
            console.log(`📦 Response data for ${endpoint}:`, data);
            
            if (!response.ok) {
                throw new Error(data.message || `Request failed with status ${response.status}`);
            }

            return data;
        } catch (error) {
            clearTimeout(timeoutId);
            
            if (error.name === 'AbortError') {
                console.error(`⏰ Timeout error for ${endpoint}`);
                throw new Error('Request timeout - please try again');
            }
            
            console.error(`❌ API Request failed for ${endpoint}:`, error);
            throw error;
        }
    }

    handleUnauthorized() {
        localStorage.removeItem('authToken');
        localStorage.removeItem('userData');
        window.location.href = 'index.html';
    }

    validateInput(data) {
        if (typeof data !== 'object' || data === null) return false;
        
        for (const [key, value] of Object.entries(data)) {
            if (typeof value === 'string' && value.length > 1000) {
                throw new Error(`Input too long: ${key}`);
            }
            if (typeof value === 'string' && /[<>]/.test(value)) {
                throw new Error(`Invalid characters in: ${key}`);
            }
        }
        return true;
    }

    // ==================== PASSWORD RESET METHODS ====================
    async initiatePasswordReset(data) {
        if (!this.validateInput(data)) {
            throw new Error('Invalid input format');
        }
        console.log('🔄 Initiating password reset for:', data);
        return await this.request('/auth/password/forgot', {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }

    async verifySecurityAnswer(data) {
        if (!this.validateInput(data)) {
            throw new Error('Invalid input format');
        }
        console.log('🔐 Verifying security answer for:', data.employeeCode);
        return await this.request('/auth/password/verify-security', {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }

    async sendEmailCode(data) {
        if (!this.validateInput(data)) {
            throw new Error('Invalid input format');
        }
        console.log('📧 Sending email code for:', data.employeeCode);
        return await this.request('/auth/password/send-code', {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }

    async verifyEmailCode(data) {
        if (!this.validateInput(data)) {
            throw new Error('Invalid input format');
        }
        console.log('✅ Verifying email code for:', data.employeeCode);
        return await this.request('/auth/password/verify-code', {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }

    async resetPassword(data) {
        if (!this.validateInput(data)) {
            throw new Error('Invalid input format');
        }
        console.log('🔄 Resetting password for:', data.employeeCode, 'Token exists:', !!data.resetToken);
        return await this.request('/auth/password/reset', {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }

    async setupSecurityQuestion(data) {
        if (!this.validateInput(data)) {
            throw new Error('Invalid input format');
        }
        return await this.request('/auth/security/setup', {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }

    async checkSecuritySetup() {
        return await this.request('/auth/security/check');
    }

    // ==================== AUTHENTICATION METHODS ====================
    async login(credentials) {
        if (!this.validateInput(credentials)) {
            throw new Error('Invalid input format');
        }

        const data = await this.request('/auth/login', {
            method: 'POST',
            body: JSON.stringify(credentials)
        });
        
        if (data.token) {
            this.setToken(data.token);
            localStorage.setItem('userData', JSON.stringify(data.user));
        }
        
        return data;
    }

    async loginAdmin(credentials) {
        if (!this.validateInput(credentials)) {
            throw new Error('Invalid input format');
        }

        const data = await this.request('/auth/login-admin', {
            method: 'POST',
            body: JSON.stringify(credentials)
        });
        
        if (data.token) {
            this.setToken(data.token);
            localStorage.setItem('userData', JSON.stringify(data.user));
        }
        
        return data;
    }

    async getProfile() {
        return await this.request('/auth/profile');
    }

    async updateProfile(profileData) {
        if (!this.validateInput(profileData)) {
            throw new Error('Invalid profile data format');
        }
        return await this.request('/auth/profile', {
            method: 'PUT',
            body: JSON.stringify(profileData)
        });
    }

    async changePassword(passwordData) {
        if (!this.validateInput(passwordData)) {
            throw new Error('Invalid password data format');
        }
        return await this.request('/auth/password/change', {
            method: 'PUT',
            body: JSON.stringify(passwordData)
        });
    }

    // ==================== USER MANAGEMENT METHODS ====================
    async getUsers(filters = {}) {
        if (!this.validateInput(filters)) {
            throw new Error('Invalid filter format');
        }
        const queryParams = new URLSearchParams(filters).toString();
        return await this.request(`/auth/admin/users?${queryParams}`);
    }

    async getTeamUsers() {
        return await this.request('/auth/team/users');
    }

    async registerUser(userData) {
        if (!this.validateInput(userData)) {
            throw new Error('Invalid user data format');
        }
        return await this.request('/auth/admin/register', {
            method: 'POST',
            body: JSON.stringify(userData)
        });
    }

    async bulkRegister(usersData) {
        if (!this.validateInput({ users: usersData })) {
            throw new Error('Invalid users data format');
        }
        return await this.request('/auth/admin/bulk-register', {
            method: 'POST',
            body: JSON.stringify({ users: usersData })
        });
    }

    async updateUserStatus(userId, status) {
        if (!userId || typeof userId !== 'string') {
            throw new Error('Invalid user ID format');
        }
        return await this.request(`/auth/admin/users/${userId}/status`, {
            method: 'PUT',
            body: JSON.stringify({ status })
        });
    }

    async updateUserRole(userId, roleData) {
        if (!userId || typeof userId !== 'string') {
            throw new Error('Invalid user ID format');
        }
        if (!this.validateInput(roleData)) {
            throw new Error('Invalid role data format');
        }
        return await this.request(`/auth/admin/users/${userId}/role`, {
            method: 'PUT',
            body: JSON.stringify(roleData)
        });
    }

    // ==================== PROJECTS METHODS ====================
    async getProjects() {
        return await this.request('/projects');
    }

    async getMyProjects() {
        return await this.request('/projects/my-projects');
    }

    async createProject(projectData) {
        if (!this.validateInput(projectData)) {
            throw new Error('Invalid project data format');
        }
        return await this.request('/projects', {
            method: 'POST',
            body: JSON.stringify(projectData)
        });
    }

    async updateProject(id, projectData) {
        if (!this.validateInput(projectData)) {
            throw new Error('Invalid project data format');
        }
        return await this.request(`/projects/${id}`, {
            method: 'PUT',
            body: JSON.stringify(projectData)
        });
    }

    async deleteProject(id) {
        return await this.request(`/projects/${id}`, {
            method: 'DELETE'
        });
    }

    // ==================== TIMESHEET METHODS ====================
    async submitTimesheet(timesheetData) {
        if (!this.validateInput(timesheetData)) {
            throw new Error('Invalid timesheet data format');
        }
        return await this.request('/timesheets/submit', {
            method: 'POST',
            body: JSON.stringify(timesheetData)
        });
    }

    async getMyTimesheets() {
        return await this.request('/timesheets/my-timesheets');
    }

    async getAllTimesheets(filters = {}) {
        if (!this.validateInput(filters)) {
            throw new Error('Invalid filter format');
        }
        const queryParams = new URLSearchParams(filters).toString();
        return await this.request(`/timesheets?${queryParams}`);
    }

    async approveTimesheet(id) {
        return await this.request(`/timesheets/${id}/approve`, {
            method: 'PATCH'
        });
    }

    async rejectTimesheet(id, remarks) {
        if (remarks && !this.validateInput({ remarks })) {
            throw new Error('Invalid remarks format');
        }
        return await this.request(`/timesheets/${id}/reject`, {
            method: 'PATCH',
            body: JSON.stringify({ remarks })
        });
    }

    async getTimesheetById(id) {
        return await this.request(`/timesheets/${id}`);
    }

    // ==================== ACTIVITY CODES METHODS ====================
    async getActivityCodes(department = '') {
        if (department && typeof department !== 'string') {
            throw new Error('Invalid department format');
        }
        const query = department ? `?department=${encodeURIComponent(department)}` : '';
        return await this.request(`/activity-codes${query}`);
    }

    async createActivityCode(activityData) {
        if (!this.validateInput(activityData)) {
            throw new Error('Invalid activity data format');
        }
        return await this.request('/activity-codes', {
            method: 'POST',
            body: JSON.stringify(activityData)
        });
    }

    async updateActivityCode(id, activityData) {
        if (!this.validateInput(activityData)) {
            throw new Error('Invalid activity data format');
        }
        return await this.request(`/activity-codes/${id}`, {
            method: 'PUT',
            body: JSON.stringify(activityData)
        });
    }

    async deleteActivityCode(id) {
        return await this.request(`/activity-codes/${id}`, {
            method: 'DELETE'
        });
    }

    // ==================== REPORTS METHODS ====================
    async getHoursTracking(filters = {}) {
        if (!this.validateInput(filters)) {
            throw new Error('Invalid filter format');
        }
        const queryParams = new URLSearchParams(filters).toString();
        return await this.request(`/reports/hours-tracking?${queryParams}`);
    }

    async getEmployeeReport(filters = {}) {
        if (!this.validateInput(filters)) {
            throw new Error('Invalid filter format');
        }
        const queryParams = new URLSearchParams(filters).toString();
        return await this.request(`/reports/employee-report?${queryParams}`);
    }

    // ==================== LEAVE MANAGEMENT METHODS ====================
    async submitLeaveRequest(leaveData) {
        const formData = new FormData();

        Object.keys(leaveData).forEach(key => {
            if (key !== 'document') {
                formData.append(key, leaveData[key]);
            }
        });

        if (leaveData.document) {
            formData.append('document', leaveData.document);
        }

        const response = await fetch(`${this.baseURL}/leave`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.token}`
            },
            body: formData
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Failed to submit leave request');
        }

        return data;
    }

    async getMyLeaveRequests() {
        return await this.request('/leave/my-requests');
    }

    async getAllLeaveRequests(filters = {}) {
        const queryParams = new URLSearchParams(filters).toString();
        return await this.request(`/leave?${queryParams}`);
    }

    async approveLeaveRequest(id) {
        const response = await fetch(`${this.baseURL}/leave/${id}/approve`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${this.token}`,
                'Content-Type': 'application/json'
            }
        });

        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.message || 'Failed to approve leave request');
        }

        return data;
    }

    async rejectLeaveRequest(id, rejectionReason) {
        const response = await fetch(`${this.baseURL}/leave/${id}/reject`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${this.token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ rejectionReason })
        });

        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.message || 'Failed to reject leave request');
        }

        return data;
    }

    async getLeaveStatistics() {
        return await this.request('/leave/stats/statistics');
    }

    // ==================== UTILITY METHODS ====================
    setTimeout(duration) {
        this.timeout = duration;
    }

    clearAuth() {
        this.token = null;
        localStorage.removeItem('authToken');
        localStorage.removeItem('userData');
    }

    // DEBUG METHOD: Test password reset endpoints
    async testPasswordResetEndpoints() {
        const endpoints = [
            '/auth/password/forgot',
            '/auth/password/verify-security', 
            '/auth/password/send-code',
            '/auth/password/verify-code',
            '/auth/password/reset'
        ];

        console.log('🧪 Testing password reset endpoints:');
        for (const endpoint of endpoints) {
            try {
                const response = await fetch(`${this.baseURL}${endpoint}`, {
                    method: 'OPTIONS'
                });
                console.log(`   ${endpoint}: ${response.status === 404 ? '❌ NOT FOUND' : '✅ EXISTS'}`);
            } catch (error) {
                console.log(`   ${endpoint}: ❌ ERROR - ${error.message}`);
            }
        }
    }
}

const apiClient = new ApiClient();