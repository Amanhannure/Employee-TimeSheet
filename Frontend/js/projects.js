// projects.js - Complete Fixed Version
document.addEventListener('DOMContentLoaded', async function() {
    console.log('🚀 Projects.js: Starting initialization...');
    
    try {
        await loadProjects();
        updateOverviewCards();
        await populateEmployeeSelect();
        console.log('✅ Projects.js initialized successfully');
    } catch (error) {
        console.error('❌ Failed to load projects:', error);
        showNotification('Failed to load projects data', 'error');
    }

    document.getElementById('addProjectForm').addEventListener('submit', function(e) {
        e.preventDefault();
        console.log('📝 Project form submitted');
        const editId = this.dataset.editId;
        if (editId) {
            console.log('✏️ Updating project:', editId);
            updateProject(editId);
        } else {
            console.log('🆕 Adding new project');
            addProject();
        }
    });

    document.getElementById('searchProjects').addEventListener('input', filterProjects);
    document.getElementById('searchPLNo').addEventListener('input', filterProjects);
    document.getElementById('filterStatus').addEventListener('change', filterProjects);
    document.getElementById('departments').addEventListener('change', handleDepartmentSelection);
});

async function loadProjects() {
    try {
        console.log('📋 Loading projects from API...');
        const projects = await apiClient.getAllProjects();
        window.projects = projects;
        console.log(`✅ Loaded ${projects.length} projects:`, projects);
        
        const grid = document.getElementById('projectsGrid');
        grid.innerHTML = '';

        projects.forEach(project => {
            const card = createProjectCard(project);
            grid.appendChild(card);
        });
    } catch (error) {
        console.error('❌ Error loading projects:', error);
        throw error;
    }
}

function createProjectCard(project) {
    console.log(`🃏 Creating project card for: ${project.name}`);
    
    const card = document.createElement('div');
    card.className = 'project-card';

    // ✅ UPDATED: Calculate progress using department hours
    const totalConsumed = project.departmentHours?.reduce((sum, dept) => sum + (dept.consumedHours || 0), 0) || 0;
    const totalAllocated = project.departmentHours?.reduce((sum, dept) => sum + (dept.allocatedHours || 0), 0) || project.totalHours || 1;
    const totalProgress = totalAllocated > 0 ? (totalConsumed / totalAllocated * 100).toFixed(1) : 0;

    console.log(`📊 Project ${project.name} progress: ${totalConsumed}/${totalAllocated} = ${totalProgress}%`);

    card.innerHTML = `
        <div class="project-header">
            <div>
                <h3 class="project-title">${project.name}</h3>
                <div class="project-pl-no">PL No: ${project.plNo}</div>
            </div>
            <span class="project-status status-${project.status}">${project.status}</span>
        </div>

        <div class="project-stats">
            <div class="stat-row">
                <div class="stat-item">
                    <div class="stat-label">Total Hours</div>
                    <div class="stat-value">${totalAllocated}</div>
                </div>
                <div class="stat-item">
                    <div class="stat-label">Consumed Hours</div>
                    <div class="stat-value">${totalConsumed}</div>
                </div>
                <div class="stat-item">
                    <div class="stat-label">Balance Hours</div>
                    <div class="stat-value">${totalAllocated - totalConsumed}</div>
                </div>
            </div>
        </div>

        <div class="progress-section">
            <div class="progress-label">
                <span>Overall Progress</span>
                <span>${totalProgress}%</span>
            </div>
            <div class="progress-bar">
                <div class="progress-fill" style="width: ${totalProgress}%"></div>
            </div>
        </div>

        <div class="project-actions">
            <button class="action-btn" onclick="showAssignedEmployees('${project._id}')">
                <i class="fas fa-users"></i> Assigned Employees
            </button>
            <button class="action-btn" onclick="editProject('${project._id}')">
                <i class="fas fa-edit"></i> Edit
            </button>
            <button class="action-btn delete" onclick="deleteProject('${project._id}')">
                <i class="fas fa-trash"></i> Delete
            </button>
        </div>

        <div class="project-download">
            <button class="download-btn" onclick="downloadProjectExcel('${project._id}')">
                <i class="fas fa-download"></i> Download Excel
            </button>
        </div>
    `;

    return card;
}

async function showAssignedEmployees(projectId) {
    try {
        console.log(`👥 Showing assigned employees for project: ${projectId}`);
        const project = await apiClient.getProject(projectId);
        if (!project) return;

        const assignedEmps = project.assignedEmployees || [];
        console.log(`📋 Found ${assignedEmps.length} assigned employees`);

        let employeeList = '';
        if (assignedEmps.length === 0) {
            employeeList = '<p>No employees assigned to this project.</p>';
        } else {
            employeeList = '<ul class="assigned-employees-list">';
            assignedEmps.forEach(emp => {
                employeeList += `<li>${emp.firstName} ${emp.lastName} (${emp.employeeId}) - ${emp.role}</li>`;
            });
            employeeList += '</ul>';
        }

        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.id = 'assignedEmployeesModal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h2>Assigned Employees - ${project.name}</h2>
                    <span class="close" onclick="closeAssignedEmployeesModal()">&times;</span>
                </div>
                <div class="modal-body">
                    ${employeeList}
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        modal.style.display = 'block';
    } catch (error) {
        console.error('❌ Error showing assigned employees:', error);
        showNotification('Failed to load assigned employees', 'error');
    }
}

// ✅ FIXED: Updated populateEmployeeSelect function
async function populateEmployeeSelect(selectedDepartments = []) {
    try {
        console.log('👤 Populating employee select...');
        
        const response = await apiClient.getUsers();
        console.log('📋 API Response:', response);
        
        // FIX: Handle different API response structures
        let users = [];
        if (Array.isArray(response)) {
            users = response;
        } else if (response && Array.isArray(response.users)) {
            users = response.users;
        } else if (response && Array.isArray(response.data)) {
            users = response.data;
        } else if (response && typeof response === 'object') {
            // If response is an object with array inside, try to find the array
            for (const key in response) {
                if (Array.isArray(response[key])) {
                    users = response[key];
                    break;
                }
            }
        }
        
        console.log('📋 Loaded users:', users.length);
        
        const employeeSelect = document.getElementById('assignedEmployees');
        if (!employeeSelect) {
            console.warn('❌ Employee select element not found');
            return;
        }

        // Clear existing options except the first one
        while (employeeSelect.options.length > 1) {
            employeeSelect.remove(1);
        }

        console.log('🏢 Selected departments for filtering:', selectedDepartments);

        // Filter users based on selected departments
        const filteredUsers = users.filter(user => {
            if (selectedDepartments.length === 0) return true;
            return selectedDepartments.includes(user.department);
        });

        console.log('👥 Filtered employees:', filteredUsers.length);

        // Add filtered users to select
        filteredUsers.forEach(user => {
            if (user.status === 'active') {
                const option = document.createElement('option');
                option.value = user._id;
                option.textContent = `${user.employeeId} - ${user.firstName} ${user.lastName} (${user.department})`;
                employeeSelect.appendChild(option);
            }
        });

        console.log('✅ Employee select populated successfully');

    } catch (error) {
        console.error('❌ Error populating employee select:', error);
    }
}

async function addProject() {
    try {
        console.log('🆕 Starting project creation...');
        const form = document.getElementById('addProjectForm');
        const formData = new FormData(form);

        const selectedEmployees = Array.from(formData.getAll('assignedEmployees'));
        const selectedDepartments = Array.from(formData.getAll('departments'));

        console.log('📊 Form data:', {
            selectedEmployees: selectedEmployees.length,
            selectedDepartments: selectedDepartments
        });

        // ✅ UPDATED: Build department hours array
        const departmentHours = selectedDepartments.map(dept => {
            const allocatedHours = parseInt(formData.get(`deptHours_${dept}`)) || 0;
            console.log(`🏢 Department ${dept}: ${allocatedHours} hours`);
            return {
                department: dept,
                allocatedHours: allocatedHours,
                consumedHours: 0
            };
        });

        // ✅ UPDATED: Project data with department hours (removed junior/senior)
        const projectData = {
            plNo: formData.get('plNo'),
            name: formData.get('projectName'),
            totalHours: parseInt(formData.get('totalHours')),
            departmentHours: departmentHours,
            status: formData.get('projectStatus') || 'active',
            assignedEmployees: selectedEmployees,
            departments: selectedDepartments
        };

        console.log('📦 Final project data to send:', projectData);

        const newProject = await apiClient.createProject(projectData);
        
        await loadProjects();
        updateOverviewCards();

        form.reset();
        toggleAddProjectModal();
        showNotification('Project added successfully!');
        console.log('✅ Project created successfully');
    } catch (error) {
        console.error('❌ Error adding project:', error);
        showNotification(error.message || 'Failed to add project', 'error');
    }
}

async function editProject(id) {
    try {
        console.log(`✏️ Loading project for editing: ${id}`);
        const project = await apiClient.getProject(id);
        if (!project) return;

        console.log('📋 Project data loaded for editing:', project);

        // ✅ UPDATED: Set basic form values
        document.getElementById('projectName').value = project.name;
        document.getElementById('plNo').value = project.plNo;
        document.getElementById('totalHours').value = project.totalHours;
        document.getElementById('projectStatus').value = project.status;

        // ✅ REMOVED: Junior/Senior hours fields

        const select = document.getElementById('assignedEmployees');
        if (select) {
            Array.from(select.options).forEach(option => {
                option.selected = false;
            });

            const assignedIds = project.assignedEmployees || [];
            console.log(`👥 Setting ${assignedIds.length} assigned employees`);
            assignedIds.forEach(employeeId => {
                const option = select.querySelector(`option[value="${employeeId}"]`);
                if (option) {
                    option.selected = true;
                }
            });
        }

        const departmentSelect = document.getElementById('departments');
        if (departmentSelect && project.departments) {
            Array.from(departmentSelect.options).forEach(option => {
                option.selected = false;
            });

            console.log(`🏢 Setting ${project.departments.length} departments`);
            project.departments.forEach(dept => {
                const option = departmentSelect.querySelector(`option[value="${dept}"]`);
                if (option) {
                    option.selected = true;
                }
            });

            // Populate department hours for editing
            handleDepartmentSelection();
            
            // Set department hours values
            if (project.departmentHours) {
                project.departmentHours.forEach(deptHours => {
                    const input = document.getElementById(`deptHours_${deptHours.department}`);
                    if (input) {
                        input.value = deptHours.allocatedHours;
                    }
                });
            }
        }

        document.querySelector('#addProjectModal .modal-header h2').textContent = 'Edit Project';
        document.querySelector('#addProjectModal .btn-primary').textContent = 'Save Changes';
        document.getElementById('addProjectForm').dataset.editId = id;
        toggleAddProjectModal();
        console.log('✅ Edit form populated successfully');
    } catch (error) {
        console.error('❌ Error editing project:', error);
        showNotification('Failed to load project data', 'error');
    }
}

async function updateProject(id) {
    try {
        console.log(`💾 Updating project: ${id}`);
        const form = document.getElementById('addProjectForm');
        const formData = new FormData(form);

        const selectedEmployees = Array.from(formData.getAll('assignedEmployees'));
        const selectedDepartments = Array.from(formData.getAll('departments'));

        console.log('📊 Update form data:', {
            selectedEmployees: selectedEmployees.length,
            selectedDepartments: selectedDepartments
        });

        // ✅ UPDATED: Build department hours array for update
        const departmentHours = selectedDepartments.map(dept => {
            const allocatedHours = parseInt(formData.get(`deptHours_${dept}`)) || 0;
            console.log(`🏢 Department ${dept}: ${allocatedHours} hours`);
            return {
                department: dept,
                allocatedHours: allocatedHours,
                consumedHours: 0 // Reset consumed hours when updating allocation
            };
        });

        // ✅ UPDATED: Project data with department hours (removed junior/senior)
        const projectData = {
            plNo: formData.get('plNo'),
            name: formData.get('projectName'),
            totalHours: parseInt(formData.get('totalHours')),
            departmentHours: departmentHours,
            status: formData.get('projectStatus') || 'active',
            assignedEmployees: selectedEmployees,
            departments: selectedDepartments
        };

        console.log('📦 Final update data:', projectData);

        await apiClient.updateProject(id, projectData);
        
        await loadProjects();
        updateOverviewCards();

        form.reset();
        toggleAddProjectModal();
        document.querySelector('#addProjectModal .modal-header h2').textContent = 'Add New Project';
        document.querySelector('#addProjectModal .btn-primary').textContent = 'Add Project';
        document.getElementById('addProjectForm').dataset.editId = '';
        showNotification('Project updated successfully!');
        console.log('✅ Project updated successfully');
    } catch (error) {
        console.error('❌ Error updating project:', error);
        showNotification(error.message || 'Failed to update project', 'error');
    }
}

function updateOverviewCards() {
    const totalProjects = window.projects?.length || 0;
    const activeProjects = window.projects?.filter(p => p.status === 'active').length || 0;
    const completedProjects = window.projects?.filter(p => p.status === 'completed').length || 0;
    const onHoldProjects = window.projects?.filter(p => p.status === 'on-hold').length || 0;

    document.getElementById('totalProjects').textContent = totalProjects;
    document.getElementById('activeProjects').textContent = activeProjects;
    document.getElementById('completedProjects').textContent = completedProjects;
    document.getElementById('onHoldProjects').textContent = onHoldProjects;

    console.log(`📊 Overview updated - Total: ${totalProjects}, Active: ${activeProjects}, Completed: ${completedProjects}, On Hold: ${onHoldProjects}`);
}

async function deleteProject(id) {
    if (confirm('Are you sure you want to delete this project?')) {
        try {
            console.log(`🗑️ Deleting project: ${id}`);
            await apiClient.deleteProject(id);
            await loadProjects();
            updateOverviewCards();
            showNotification('Project deleted successfully!');
            console.log('✅ Project deleted successfully');
        } catch (error) {
            console.error('❌ Error deleting project:', error);
            showNotification(error.message || 'Failed to delete project', 'error');
        }
    }
}

function filterProjects() {
    const searchTerm = document.getElementById('searchProjects').value.toLowerCase();
    const searchPLNoTerm = document.getElementById('searchPLNo').value.toLowerCase();
    const statusFilter = document.getElementById('filterStatus').value;

    console.log(`🔍 Filtering projects - Search: "${searchTerm}", PL No: "${searchPLNoTerm}", Status: "${statusFilter}"`);

    const filteredProjects = (window.projects || []).filter(project => {
        const matchesSearch = project.name.toLowerCase().includes(searchTerm);
        const matchesPLNo = project.plNo.toLowerCase().includes(searchPLNoTerm);
        const matchesStatus = statusFilter === 'all' || project.status === statusFilter;
        return matchesSearch && matchesPLNo && matchesStatus;
    });

    console.log(`📋 Filter results: ${filteredProjects.length} projects match criteria`);

    const grid = document.getElementById('projectsGrid');
    grid.innerHTML = '';

    filteredProjects.forEach(project => {
        const card = createProjectCard(project);
        grid.appendChild(card);
    });
}

function toggleAddProjectModal() {
    const modal = document.getElementById('addProjectModal');
    modal.style.display = modal.style.display === 'block' ? 'none' : 'block';
    console.log(`🪟 Add project modal: ${modal.style.display}`);
}

function closeAssignedEmployeesModal() {
    const modal = document.getElementById('assignedEmployeesModal');
    if (modal) {
        modal.remove();
        console.log('❌ Assigned employees modal closed');
    }
}

function handleDepartmentSelection() {
    console.log('🏢 Handling department selection...');
    const departmentSelect = document.getElementById('departments');
    if (!departmentSelect) return;

    const selectedDepartments = Array.from(departmentSelect.selectedOptions).map(option => option.value);
    const container = document.getElementById('departmentHoursContainer');
    const inputsContainer = document.getElementById('departmentHoursInputs');

    if (!container || !inputsContainer) return;

    console.log(`🏢 Selected departments: ${selectedDepartments.length} departments`);

    if (selectedDepartments.length > 0) {
        container.style.display = 'block';
        inputsContainer.innerHTML = '';

        selectedDepartments.forEach((dept, index) => {
            const deptDiv = document.createElement('div');
            deptDiv.className = 'form-row';
            // ✅ UPDATED: Simplified department hours input (only allocated hours)
            deptDiv.innerHTML = `
                <div class="form-group">
                    <label for="deptHours_${dept}">${dept} Allocated Hours *</label>
                    <input type="number" id="deptHours_${dept}" name="deptHours_${dept}" min="1" required>
                </div>
            `;
            inputsContainer.appendChild(deptDiv);
            console.log(`✅ Added department hours input for: ${dept}`);
        });

        populateEmployeeSelect(selectedDepartments);
    } else {
        container.style.display = 'none';
        inputsContainer.innerHTML = '';
        const employeeSelect = document.getElementById('assignedEmployees');
        if (employeeSelect) {
            employeeSelect.innerHTML = '';
        }
        console.log('❌ No departments selected, hiding department hours');
    }
}

function showNotification(message, type = 'info') {
    console.log(`📢 Notification: ${message}`);
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.textContent = message;
    
    // Set background color based on type
    const colors = {
        success: '#10b981',
        error: '#ef4444',
        warning: '#f59e0b',
        info: '#3b82f6'
    };
    
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${colors[type] || colors.info};
        color: white;
        padding: 1rem 1.5rem;
        border-radius: 0.5rem;
        box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
        z-index: 1000;
        animation: slideIn 0.3s ease;
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

document.getElementById('toggle-sidebar').addEventListener('click', function() {
    console.log('🔘 Sidebar toggle clicked');
    document.querySelector('.dashboard-container').classList.toggle('sidebar-collapsed');
});

window.onclick = function(event) {
    const addModal = document.getElementById('addProjectModal');
    const assignedModal = document.getElementById('assignedEmployeesModal');
    if (event.target === addModal) {
        console.log('❌ Add project modal closed (outside click)');
        addModal.style.display = 'none';
    }
    if (event.target === assignedModal) {
        console.log('❌ Assigned employees modal closed (outside click)');
        closeAssignedEmployeesModal();
    }
};

// Add download function (placeholder)
function downloadProjectExcel(projectId) {
    console.log(`📥 Downloading project excel for: ${projectId}`);
    showNotification('Excel download feature coming soon!', 'info');
}