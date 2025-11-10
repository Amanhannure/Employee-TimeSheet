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
            console.log(`API Call: ${options.method || 'GET'} ${url}`); // Debug log
            const response = await fetch(url, config);
            
            clearTimeout(timeoutId);

            if (response.status === 401) {
                this.handleUnauthorized();
                throw new Error('Authentication required');
            }

            // Handle 404 specifically
            if (response.status === 404) {
                throw new Error(`Endpoint not found: ${endpoint}`);
            }

            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.message || `Request failed with status ${response.status}`);
            }

            return data;
        } catch (error) {
            clearTimeout(timeoutId);
            
            if (error.name === 'AbortError') {
                throw new Error('Request timeout - please try again');
            }
            
            console.error('API Request failed:', error);
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

    // PASSWORD RESET METHODS - SINGLE DEFINITION
    async initiatePasswordReset(data) {
        if (!this.validateInput(data)) {
            throw new Error('Invalid input format');
        }
        return await this.request('/auth/forgot-password', {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }

    async verifySecurityAnswer(data) {
        if (!this.validateInput(data)) {
            throw new Error('Invalid input format');
        }
        return await this.request('/auth/verify-security-answer', {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }

    async sendEmailCode(data) {
        if (!this.validateInput(data)) {
            throw new Error('Invalid input format');
        }
        return await this.request('/auth/send-email-code', {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }

    async verifyEmailCode(data) {
        if (!this.validateInput(data)) {
            throw new Error('Invalid input format');
        }
        return await this.request('/auth/verify-email-code', {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }

    async resetPassword(data) {
        if (!this.validateInput(data)) {
            throw new Error('Invalid input format');
        }
        return await this.request('/auth/reset-password', {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }

    async setupSecurityQuestion(data) {
        if (!this.validateInput(data)) {
            throw new Error('Invalid input format');
        }
        return await this.request('/auth/setup-security-question', {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }

    async checkSecuritySetup() {
        return await this.request('/auth/check-security-setup');
    }

    // AUTHENTICATION METHODS
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

    // USER MANAGEMENT METHODS
    async getUser(id) {
        if (!id || typeof id !== 'string') {
            throw new Error('Invalid user ID format');
        }
        return await this.request(`/users/${id}`);
    }

    async getUsers(filters = {}) {
        if (!this.validateInput(filters)) {
            throw new Error('Invalid filter format');
        }
        const queryParams = new URLSearchParams(filters).toString();
        return await this.request(`/users?${queryParams}`);
    }

    async createUser(userData) {
        if (!this.validateInput(userData)) {
            throw new Error('Invalid user data format');
        }
        return await this.request('/users', {
            method: 'POST',
            body: JSON.stringify(userData)
        });
    }

    async updateUser(id, userData) {
        if (!this.validateInput(userData)) {
            throw new Error('Invalid user data format');
        }
        return await this.request(`/users/${id}`, {
            method: 'PUT',
            body: JSON.stringify(userData)
        });
    }

    async deleteUser(id) {
        return await this.request(`/users/${id}`, {
            method: 'DELETE'
        });
    }

    // PROJECTS METHODS
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

    // TIMESHEET METHODS
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

    async exportTimesheetToCSV(id) {
        const response = await fetch(`${this.baseURL}/timesheets/export/${id}`, {
            headers: this.getHeaders()
        });

        if (!response.ok) {
            throw new Error('Failed to export timesheet');
        }

        return await response.text();
    }

    // ACTIVITY CODES METHODS
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

    // REPORTS METHODS
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

    // LEAVE MANAGEMENT METHODS


        // ✅ ADDED: Get leave balance
    async getLeaveBalance() {
        return await this.request('/leave/balance');
    }


    async submitLeaveRequest(leaveData) {
        console.log('🔍 API Client: Submitting leave request', leaveData);
        const formData = new FormData();

        // Append form data
        Object.keys(leaveData).forEach(key => {
            if (key !== 'document') {
                formData.append(key, leaveData[key]);
            }
        });
        console.log('🔍 API Client: FormData entries:');
        for (let [key, value] of formData.entries()) {
            console.log(`${key}:`, value);
        }
        // Append file if exists
        
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
        console.log('🔍 API Client: Response status:', response.status);

        const data = await response.json();
        console.log('🔍 API Client: Response data:', data);

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
        console.log('API: Approving leave request:', id);
        
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
        console.log('API: Rejecting leave request:', id, rejectionReason);
        
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

    async downloadLeaveDocument(id) {
        console.log('API: Downloading document for leave:', id);
        
        const response = await fetch(`${this.baseURL}/leave/download/${id}`, {
            headers: {
                'Authorization': `Bearer ${this.token}`
            }
        });

        if (!response.ok) {
            const errorText = await response.text();
            let errorMessage = 'Failed to download document';
            
            try {
                const errorData = JSON.parse(errorText);
                errorMessage = errorData.message || errorMessage;
            } catch {
                errorMessage = errorText || errorMessage;
            }
            
            throw new Error(errorMessage);
        }

        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Server returned error instead of file');
        }

        const contentDisposition = response.headers.get('content-disposition');
        let filename = `document-${id}`;
        
        if (contentDisposition) {
            const filenameMatch = contentDisposition.match(/filename="?(.+)"?/);
            if (filenameMatch) {
                filename = filenameMatch[1];
            }
        }

        const blob = await response.blob();
        
        // Create download link
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        
        return blob;
    }

    async getLeaveRequestById(id) {
        return await this.request(`/leave/${id}`);
    }

    async getLeaveStatistics() {
        return await this.request('/leave/stats/statistics');
    }

    // UTILITY METHODS
    setTimeout(duration) {
        this.timeout = duration;
    }

    clearAuth() {
        this.token = null;
        localStorage.removeItem('authToken');
        localStorage.removeItem('userData');
    }

    // DEBUG METHOD: Check if endpoints exist
    async testEndpoints() {
        const endpoints = [
            '/auth/forgot-password',
            '/auth/verify-security-answer',
            '/auth/send-email-code',
            '/auth/verify-email-code',
            '/auth/reset-password',
            '/auth/login'
        ];

        for (const endpoint of endpoints) {
            try {
                const response = await fetch(`${this.baseURL}${endpoint}`, {
                    method: 'OPTIONS'
                });
                console.log(`${endpoint}: ${response.status === 404 ? 'NOT FOUND' : 'EXISTS'}`);
            } catch (error) {
                console.log(`${endpoint}: ERROR - ${error.message}`);
            }
        }
    }
}

const apiClient = new ApiClient();