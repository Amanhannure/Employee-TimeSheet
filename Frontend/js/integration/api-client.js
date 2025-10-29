/*class ApiClient {
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
            const response = await fetch(url, config);
            
            clearTimeout(timeoutId);

            if (response.status === 401) {
                this.handleUnauthorized();
                throw new Error('Authentication required');
            }

            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.message || 'Request failed');
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

    // ADDED: Missing getUser method
    async getUser(id) {
        if (!id || typeof id !== 'string') {
            throw new Error('Invalid user ID format');
        }
        return await this.request(`/users/${id}`);
    }

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
    // Add to ApiClient class in api-client.js
    // Add to ApiClient class in api-client.js

    // Add these corrected methods to the ApiClient class

    // Add these corrected methods to the ApiClient class

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
            // Try to get error message from response
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

        // Check if response is actually a file
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
            // Response is JSON, not a file - this indicates an error
            const errorData = await response.json();
            throw new Error(errorData.message || 'Server returned error instead of file');
        }

        // Get filename from response headers or use default
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
    
    // Add to ApiClient class
    async exportTimesheetToCSV(id) {
        const response = await fetch(`${this.baseURL}/timesheets/export/${id}`, {
            headers: this.getHeaders()
        });

        if (!response.ok) {
            throw new Error('Failed to export timesheet');
        }

        return await response.text();
    }

    async exportMultipleTimesheets(ids) {
        return await this.request('/timesheets/export-multiple', {
            method: 'POST',
            body: JSON.stringify({ ids })
        });
    }

    async getTimesheetById(id) {
        return await this.request(`/timesheets/${id}`);
    }

    async archiveOldTimesheets() {
        return await this.request('/timesheets/archive-old', {
            method: 'POST'
        });
    }

    setTimeout(duration) {
        this.timeout = duration;
    }

    clearAuth() {
        this.token = null;
        localStorage.removeItem('authToken');
        localStorage.removeItem('userData');
    }
}

const apiClient = new ApiClient();*/
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
            const response = await fetch(url, config);
            
            clearTimeout(timeoutId);

            if (response.status === 401) {
                this.handleUnauthorized();
                throw new Error('Authentication required');
            }

            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.message || 'Request failed');
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

    // LEAVE MANAGEMENT METHODS - ADD THESE
    async submitLeaveRequest(leaveData) {
        const formData = new FormData();

        // Append form data
        Object.keys(leaveData).forEach(key => {
            if (key !== 'document') {
                formData.append(key, leaveData[key]);
            }
        });

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
            // Try to get error message from response
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

        // Check if response is actually a file
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
            // Response is JSON, not a file - this indicates an error
            const errorData = await response.json();
            throw new Error(errorData.message || 'Server returned error instead of file');
        }

        // Get filename from response headers or use default
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
}

const apiClient = new ApiClient();