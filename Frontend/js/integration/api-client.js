// api-client.js
class ApiClient {
    constructor() {
        this.baseURL = 'http://localhost:5000/api';
        this.token = localStorage.getItem('authToken');
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
        const config = {
            headers: this.getHeaders(),
            ...options
        };

        try {
            const response = await fetch(url, config);
            
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
            console.error('API Request failed:', error);
            throw error;
        }
    }

    handleUnauthorized() {
        localStorage.removeItem('authToken');
        localStorage.removeItem('userData');
        window.location.href = 'index.html';
    }

    // Auth methods
    async login(credentials) {
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

    // User management
    async getUsers(filters = {}) {
        const queryParams = new URLSearchParams(filters).toString();
        return await this.request(`/users?${queryParams}`);
    }

    async createUser(userData) {
        return await this.request('/users', {
            method: 'POST',
            body: JSON.stringify(userData)
        });
    }

    async updateUser(id, userData) {
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

    // Projects
    async getProjects() {
        return await this.request('/projects');
    }

    async getMyProjects() {
        return await this.request('/projects/my-projects');
    }

    async createProject(projectData) {
        return await this.request('/projects', {
            method: 'POST',
            body: JSON.stringify(projectData)
        });
    }

    async updateProject(id, projectData) {
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

    // Timesheets
    async submitTimesheet(timesheetData) {
        return await this.request('/timesheets/submit', {
            method: 'POST',
            body: JSON.stringify(timesheetData)
        });
    }

    async getMyTimesheets() {
        return await this.request('/timesheets/my-timesheets');
    }

    async getAllTimesheets(filters = {}) {
        const queryParams = new URLSearchParams(filters).toString();
        return await this.request(`/timesheets?${queryParams}`);
    }

    async approveTimesheet(id) {
        return await this.request(`/timesheets/${id}/approve`, {
            method: 'PATCH'
        });
    }

    async rejectTimesheet(id, remarks) {
        return await this.request(`/timesheets/${id}/reject`, {
            method: 'PATCH',
            body: JSON.stringify({ remarks })
        });
    }

    // Activity Codes
    async getActivityCodes(department = '') {
        const query = department ? `?department=${department}` : '';
        return await this.request(`/activity-codes${query}`);
    }

    async createActivityCode(activityData) {
        return await this.request('/activity-codes', {
            method: 'POST',
            body: JSON.stringify(activityData)
        });
    }

    async updateActivityCode(id, activityData) {
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

    // Reports
    async getHoursTracking(filters = {}) {
        const queryParams = new URLSearchParams(filters).toString();
        return await this.request(`/reports/hours-tracking?${queryParams}`);
    }

    async getEmployeeReport(filters = {}) {
        const queryParams = new URLSearchParams(filters).toString();
        return await this.request(`/reports/employee-report?${queryParams}`);
    }
}

// Global API client instance
const apiClient = new ApiClient();