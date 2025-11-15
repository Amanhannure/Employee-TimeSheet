// Employee Projects Management
class EmployeeProjects {
    constructor() {
        this.projects = [];
        this.filteredProjects = [];
        this.currentUser = null;
        
        this.initializeEventListeners();
        this.loadUserData();
        this.loadProjects();
    }

    initializeEventListeners() {
        // Refresh button
        document.getElementById('refresh-projects').addEventListener('click', () => {
            this.loadProjects();
        });

        // Filter events
        document.getElementById('status-filter').addEventListener('change', () => {
            this.filterProjects();
        });

        document.getElementById('department-filter').addEventListener('change', () => {
            this.filterProjects();
        });

        // Logout button
        document.getElementById('logout-btn').addEventListener('click', () => {
            this.logout();
        });

        // Sidebar navigation
        document.getElementById('toggle-sidebar').addEventListener('click', () => {
            this.toggleSidebar();
        });

        // Admin button access control
        document.getElementById('admin-btn').addEventListener('click', (e) => {
            e.preventDefault();
            this.showAccessDenied();
        });

        // Projects button access control
        document.getElementById('projects-btn').addEventListener('click', (e) => {
            e.preventDefault();
            this.showAccessDenied();
        });

        // History button
        document.getElementById('history-btn').addEventListener('click', (e) => {
            e.preventDefault();
            window.location.href = 'dashboard.html#history';
        });

        // Modal close events
        document.querySelectorAll('.close-modal').forEach(closeBtn => {
            closeBtn.addEventListener('click', (e) => {
                const modal = e.target.closest('.modal');
                this.closeModal(modal);
            });
        });

        // Close modal when clicking outside
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.closeModal(modal);
                }
            });
        });
    }

    async loadUserData() {
        try {
            const userData = await apiClient.getCurrentUser();
            this.currentUser = userData;
            this.updateUserInterface(userData);
        } catch (error) {
            console.error('Error loading user data:', error);
            this.showNotification('Error loading user data', 'error');
        }
    }

    updateUserInterface(userData) {
        // Update employee name in top nav
        const employeeNameElement = document.getElementById('employee-name');
        if (employeeNameElement && userData) {
            employeeNameElement.textContent = `${userData.firstName} ${userData.lastName}`;
        }

        // Update department filter based on user's department
        const departmentFilter = document.getElementById('department-filter');
        if (departmentFilter && userData.department) {
            departmentFilter.value = userData.department;
            this.filterProjects();
        }
    }

    async loadProjects() {
        try {
            this.showLoading('projects-grid');
            
            this.projects = await apiClient.getMyProjects();
            
            this.filterProjects();
            this.showNotification('Projects loaded successfully', 'success');
        } catch (error) {
            console.error('Error loading projects:', error);
            this.showProjectsError();
            this.showNotification('Error loading projects', 'error');
        } finally {
            this.hideLoading('projects-grid');
        }
    }

    filterProjects() {
        const statusFilter = document.getElementById('status-filter').value;
        const departmentFilter = document.getElementById('department-filter').value;

        this.filteredProjects = this.projects.filter(project => {
            const statusMatch = !statusFilter || project.status === statusFilter;
            const departmentMatch = !departmentFilter || 
                (project.departmentHours && project.departmentHours[departmentFilter]);
            
            return statusMatch && departmentMatch;
        });

        this.renderProjects();
    }

    renderProjects() {
        const projectsGrid = document.getElementById('projects-grid');
        
        if (this.filteredProjects.length === 0) {
            projectsGrid.innerHTML = `
                <div class="no-projects">
                    <i class="fas fa-folder-open"></i>
                    <h3>No Projects Found</h3>
                    <p>You don't have any projects assigned matching the current filters.</p>
                </div>
            `;
            return;
        }

        projectsGrid.innerHTML = this.filteredProjects.map(project => this.createProjectCard(project)).join('');
        
        // Add event listeners to view details buttons
        document.querySelectorAll('.btn-view-details').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const projectId = e.target.closest('.project-card').dataset.projectId;
                this.showProjectDetails(projectId);
            });
        });
    }

    createProjectCard(project) {
        const progress = project.totalHours > 0 ? (project.consumedHours / project.totalHours) * 100 : 0;
        const progressClass = this.getProgressClass(progress);
        const statusClass = this.getStatusClass(project.status);
        
        // Get department hours for current user's department
        const userDepartment = this.currentUser?.department;
        const departmentHours = project.departmentHours && userDepartment ? 
            project.departmentHours[userDepartment] || 0 : 0;

        return `
            <div class="project-card ${project.status}" data-project-id="${project._id}">
                <div class="project-header">
                    <div class="project-code">${project.projectCode}</div>
                    <div class="project-status ${statusClass}">${project.status.toUpperCase()}</div>
                </div>
                
                <div class="project-name">${project.name}</div>
                
                ${project.description ? `
                    <div class="project-description">${project.description}</div>
                ` : ''}
                
                <div class="project-progress">
                    <div class="progress-bar">
                        <div class="progress-fill ${progressClass}" style="width: ${progress}%"></div>
                    </div>
                    <div class="progress-text">
                        <span>Progress</span>
                        <span>${Math.round(progress)}% (${project.consumedHours}/${project.totalHours} hours)</span>
                    </div>
                </div>
                
                <div class="project-details">
                    <div class="detail-row">
                        <span class="detail-label">Total Hours:</span>
                        <span class="detail-value">${project.totalHours}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Consumed Hours:</span>
                        <span class="detail-value">${project.consumedHours}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Remaining Hours:</span>
                        <span class="detail-value">${project.totalHours - project.consumedHours}</span>
                    </div>
                    
                    ${departmentHours > 0 ? `
                        <div class="department-hours">
                            <div class="department-hour-item">
                                <span class="detail-label">Your Department (${userDepartment}):</span>
                                <span class="detail-value">${departmentHours} hours</span>
                            </div>
                        </div>
                    ` : ''}
                </div>
                
                <div class="project-actions">
                    <button class="btn-view-details">
                        <i class="fas fa-eye"></i> View Details
                    </button>
                </div>
            </div>
        `;
    }

    getProgressClass(progress) {
        if (progress >= 90) return 'danger';
        if (progress >= 75) return 'warning';
        return '';
    }

    getStatusClass(status) {
        switch (status) {
            case 'active': return 'status-active';
            case 'hold': return 'status-hold';
            case 'completed': return 'status-completed';
            default: return 'status-active';
        }
    }

    async showProjectDetails(projectId) {
        try {
            this.showLoading('project-details-content');
            this.showModal('project-details-modal');
            
            const project = await apiClient.getProject(projectId);
            this.renderProjectDetails(project);
        } catch (error) {
            console.error('Error loading project details:', error);
            document.getElementById('project-details-content').innerHTML = `
                <div class="error-message">
                    <p>Error loading project details. Please try again.</p>
                </div>
            `;
        } finally {
            this.hideLoading('project-details-content');
        }
    }

    renderProjectDetails(project) {
        const progress = project.totalHours > 0 ? (project.consumedHours / project.totalHours) * 100 : 0;
        const progressClass = this.getProgressClass(progress);
        const statusClass = this.getStatusClass(project.status);
        
        const departmentHoursHTML = project.departmentHours ? 
            Object.entries(project.departmentHours).map(([dept, hours]) => `
                <div class="detail-row">
                    <span class="detail-label">${dept}:</span>
                    <span class="detail-value">${hours} hours</span>
                </div>
            `).join('') : '<div class="detail-row">No department hours allocated</div>';

        document.getElementById('project-details-content').innerHTML = `
            <div class="project-detail-header">
                <div class="project-detail-code">${project.projectCode}</div>
                <div class="project-detail-status ${statusClass}">${project.status.toUpperCase()}</div>
            </div>
            
            <div class="project-detail-name">${project.name}</div>
            
            ${project.description ? `
                <div class="project-detail-description">
                    <h4>Description</h4>
                    <p>${project.description}</p>
                </div>
            ` : ''}
            
            <div class="project-detail-progress">
                <h4>Progress Overview</h4>
                <div class="progress-bar">
                    <div class="progress-fill ${progressClass}" style="width: ${progress}%"></div>
                </div>
                <div class="progress-details">
                    <div class="detail-row">
                        <span class="detail-label">Total Hours:</span>
                        <span class="detail-value">${project.totalHours}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Consumed Hours:</span>
                        <span class="detail-value">${project.consumedHours}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Remaining Hours:</span>
                        <span class="detail-value">${project.totalHours - project.consumedHours}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Completion:</span>
                        <span class="detail-value">${Math.round(progress)}%</span>
                    </div>
                </div>
            </div>
            
            <div class="project-detail-departments">
                <h4>Department Hours Allocation</h4>
                ${departmentHoursHTML}
            </div>
            
            ${project.startDate || project.endDate ? `
                <div class="project-detail-timeline">
                    <h4>Timeline</h4>
                    <div class="detail-row">
                        <span class="detail-label">Start Date:</span>
                        <span class="detail-value">${project.startDate ? new Date(project.startDate).toLocaleDateString() : 'Not set'}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">End Date:</span>
                        <span class="detail-value">${project.endDate ? new Date(project.endDate).toLocaleDateString() : 'Not set'}</span>
                    </div>
                </div>
            ` : ''}
        `;
    }

    showProjectsError() {
        const projectsGrid = document.getElementById('projects-grid');
        projectsGrid.innerHTML = `
            <div class="no-projects">
                <i class="fas fa-exclamation-triangle"></i>
                <h3>Unable to Load Projects</h3>
                <p>Please check your connection and try again.</p>
                <button onclick="employeeProjects.loadProjects()" class="refresh-btn" style="margin-top: 15px;">
                    <i class="fas fa-sync-alt"></i> Try Again
                </button>
            </div>
        `;
    }

    showLoading(elementId) {
        const element = document.getElementById(elementId);
        if (element) {
            element.innerHTML = `
                <div class="loading-projects">
                    <i class="fas fa-spinner fa-spin"></i>
                    <p>Loading...</p>
                </div>
            `;
        }
    }

    hideLoading(elementId) {
        // Loading state is handled by render methods
    }

    showModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = 'block';
        }
    }

    closeModal(modal) {
        if (modal) {
            modal.style.display = 'none';
        }
    }

    showAccessDenied() {
        this.showModal('access-denied-modal');
    }

    showNotification(message, type = 'info') {
        if (typeof showNotification === 'function') {
            showNotification(message, type);
        } else {
            console.log(`${type.toUpperCase()}: ${message}`);
        }
    }

    toggleSidebar() {
        const sidebar = document.querySelector('.sidebar');
        sidebar.classList.toggle('collapsed');
    }

    logout() {
        apiClient.logout();
        window.location.href = 'index.html';
    }
}

// Initialize the employee projects when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    window.employeeProjects = new EmployeeProjects();
});