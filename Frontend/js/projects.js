// projects.js - Fixed Version with Correct Hours Validation
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

    // Safe event listener binding
    const addProjectForm = document.getElementById('addProjectForm');
    const searchProjects = document.getElementById('searchProjects');
    const searchProjectCode = document.getElementById('searchProjectCode');
    const filterStatus = document.getElementById('filterStatus');
    const departments = document.getElementById('departments');
    const totalHoursInput = document.getElementById('totalHours');

    if (addProjectForm) {
        addProjectForm.addEventListener('submit', function(e) {
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
    }

    if (searchProjects) {
        searchProjects.addEventListener('input', filterProjects);
    }

    if (searchProjectCode) {
        searchProjectCode.addEventListener('input', filterProjects);
    }

    if (filterStatus) {
        filterStatus.addEventListener('change', filterProjects);
    }

    if (departments) {
        departments.addEventListener('change', handleDepartmentSelection);
    }

    if (totalHoursInput) {
        totalHoursInput.addEventListener('change', validateHoursDistribution);
    }
});

// ✅ FIXED: Function to validate hours distribution - Now checks allocated + variable hours
function validateHoursDistribution() {
    const totalHoursInput = document.getElementById('totalHours');
    const departmentAllocatedInputs = document.querySelectorAll('input[id^="deptHours_"]');
    const departmentVariableInputs = document.querySelectorAll('input[id^="variableHours_"]');
    
    if (!totalHoursInput || !totalHoursInput.value) return true;
    
    const totalHours = parseInt(totalHoursInput.value);
    let totalDistributed = 0;
    
    // Calculate sum of ALL department hours (allocated + variable)
    departmentAllocatedInputs.forEach(input => {
        totalDistributed += parseInt(input.value) || 0;
    });
    
    // ✅ ADDED: Include variable hours in the calculation for editing
    if (departmentVariableInputs.length > 0) {
        departmentVariableInputs.forEach(input => {
            totalDistributed += parseInt(input.value) || 0;
        });
    }
    
    console.log(`📊 Hours Validation: Total=${totalHours}, Distributed=${totalDistributed}`);
    
    if (totalDistributed !== totalHours) {
        showNotification(`Total hours (${totalHours}) must equal the sum of all department hours (${totalDistributed})`, 'error');
        return false;
    }
    
    return true;
}

async function loadProjects() {
    try {
        console.log('📋 Loading projects from API...');
        const projects = await apiClient.getAllProjects();
        window.projects = projects;
        console.log(`✅ Loaded ${projects.length} projects:`, projects);
        
        const grid = document.getElementById('projectsGrid');
        if (!grid) {
            console.error('❌ projectsGrid element not found');
            return;
        }
        
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

    // ✅ UPDATED: Calculate hours including variable hours
    let totalConsumed = 0;
    let totalAllocated = 0;
    let totalVariable = 0;
    let totalAvailable = 0;

    if (project.departmentHours && Array.isArray(project.departmentHours)) {
        totalConsumed = project.departmentHours.reduce((sum, dept) => {
            const consumed = typeof dept === 'object' ? (dept.consumedHours || 0) : 0;
            return sum + consumed;
        }, 0);
        
        totalAllocated = project.departmentHours.reduce((sum, dept) => {
            const allocated = typeof dept === 'object' ? (dept.allocatedHours || 0) : 0;
            return sum + allocated;
        }, 0);
        
        totalVariable = project.departmentHours.reduce((sum, dept) => {
            const variable = typeof dept === 'object' ? (dept.variableHours || 0) : 0;
            return sum + variable;
        }, 0);
        
        totalAvailable = totalAllocated + totalVariable;
    }

    const totalProgress = totalAvailable > 0 ? (totalConsumed / totalAvailable * 100).toFixed(1) : 0;
    const balanceHours = Math.max(0, totalAvailable - totalConsumed);

    console.log(`📊 Project ${project.name}: ${totalConsumed}/${totalAvailable} = ${totalProgress}% (Allocated: ${totalAllocated}, Variable: ${totalVariable})`);

    card.innerHTML = `
        <div class="project-header">
            <div>
                <h3 class="project-title">${project.name}</h3>
                <div class="project-code">Project Code: ${project.projectCode}</div>
            </div>
            <span class="project-status status-${project.status}">${project.status}</span>
        </div>

        <div class="project-stats">
            <div class="stat-row">
                <div class="stat-item">
                    <div class="stat-label">Total Hours</div>
                    <div class="stat-value">${totalAvailable}</div>
                    ${totalVariable > 0 ? `<small style="color: #f59e0b;">(+${totalVariable} variable)</small>` : ''}
                </div>
                <div class="stat-item">
                    <div class="stat-label">Consumed Hours</div>
                    <div class="stat-value">${totalConsumed}</div>
                </div>
                <div class="stat-item">
                    <div class="stat-label">Balance Hours</div>
                    <div class="stat-value">${balanceHours}</div>
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
            ${project.status === 'on-hold' ? `
            <button class="action-btn warning" onclick="addVariableHours('${project._id}')">
                <i class="fas fa-plus-circle"></i> Add Hours
            </button>
            ` : ''}
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

// ✅ ADDED: Function to add variable hours to on-hold projects
async function addVariableHours(projectId) {
    try {
        console.log(`➕ Adding variable hours to project: ${projectId}`);
        const project = await apiClient.getProject(projectId);
        if (!project) return;

        // Create modal for adding variable hours
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.id = 'addVariableHoursModal';
        
        let departmentOptions = '';
        if (project.departmentHours && Array.isArray(project.departmentHours)) {
            project.departmentHours.forEach(dept => {
                const availableHours = (dept.allocatedHours + dept.variableHours) - dept.consumedHours;
                departmentOptions += `
                    <option value="${dept.department}">
                        ${dept.department} (Available: ${Math.max(0, availableHours)} hours)
                    </option>
                `;
            });
        }

        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h2>Add Variable Hours - ${project.name}</h2>
                    <span class="close" onclick="closeAddVariableHoursModal()">&times;</span>
                </div>
                <div class="modal-body">
                    <form id="addVariableHoursForm">
                        <div class="form-group">
                            <label for="variableHoursDepartment">Select Department *</label>
                            <select id="variableHoursDepartment" name="variableHoursDepartment" required>
                                ${departmentOptions}
                            </select>
                        </div>
                        <div class="form-group">
                            <label for="variableHours">Variable Hours to Add *</label>
                            <input type="number" id="variableHours" name="variableHours" min="1" required>
                        </div>
                        <div class="form-actions">
                            <button type="submit" class="btn-primary">Add Hours</button>
                            <button type="button" class="btn-secondary" onclick="closeAddVariableHoursModal()">Cancel</button>
                        </div>
                    </form>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        modal.style.display = 'block';

        // Handle form submission
        const form = document.getElementById('addVariableHoursForm');
        if (form) {
            form.addEventListener('submit', async function(e) {
                e.preventDefault();
                const formData = new FormData(this);
                const department = formData.get('variableHoursDepartment');
                const variableHours = parseInt(formData.get('variableHours'));

                try {
                    await apiClient.request(`/projects/${projectId}/add-variable-hours`, {
                        method: 'PATCH',
                        body: { department, variableHours }
                    });
                    
                    closeAddVariableHoursModal();
                    await loadProjects();
                    updateOverviewCards();
                    showNotification(`Successfully added ${variableHours} variable hours to ${department}`);
                } catch (error) {
                    console.error('❌ Error adding variable hours:', error);
                    showNotification(error.message || 'Failed to add variable hours', 'error');
                }
            });
        }

    } catch (error) {
        console.error('❌ Error preparing variable hours form:', error);
        showNotification('Failed to load project data', 'error');
    }
}

function closeAddVariableHoursModal() {
    const modal = document.getElementById('addVariableHoursModal');
    if (modal) {
        modal.remove();
        console.log('❌ Add variable hours modal closed');
    }
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

async function populateEmployeeSelect(selectedDepartments = [], preserveSelections = []) {
    try {
        console.log('👤 Populating employee select...');
        
        const response = await apiClient.getUsers();
        console.log('📋 API Response:', response);
        
        let users = [];
        if (Array.isArray(response)) {
            users = response;
        } else if (response && Array.isArray(response.users)) {
            users = response.users;
        } else if (response && Array.isArray(response.data)) {
            users = response.data;
        } else if (response && typeof response === 'object') {
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

        // Store currently selected values before clearing
        const currentSelections = Array.from(employeeSelect.selectedOptions).map(option => option.value);
        const selectionsToPreserve = preserveSelections.length > 0 ? preserveSelections : currentSelections;

        // Clear existing options except the first one (if it's a placeholder)
        while (employeeSelect.options.length > 0) {
            employeeSelect.remove(0);
        }

        // Add a default option
        const defaultOption = document.createElement('option');
        defaultOption.value = '';
        defaultOption.textContent = 'Select employees...';
        defaultOption.disabled = true;
        defaultOption.selected = selectionsToPreserve.length === 0;
        employeeSelect.appendChild(defaultOption);

        console.log('🏢 Selected departments for filtering:', selectedDepartments);

        const filteredUsers = users.filter(user => {
            if (selectedDepartments.length === 0) return true;
            return selectedDepartments.includes(user.department);
        });

        console.log('👥 Filtered employees:', filteredUsers.length);

        filteredUsers.forEach(user => {
            if (user.status === 'active') {
                const option = document.createElement('option');
                option.value = user._id;
                option.textContent = `${user.employeeId} - ${user.firstName} ${user.lastName} (${user.department})`;
                
                // ✅ FIXED: Preserve selection if this employee was previously selected
                if (selectionsToPreserve.includes(user._id)) {
                    option.selected = true;
                }
                
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
        if (!form) {
            showNotification('Add project form not found', 'error');
            return;
        }
        
        // ✅ ADDED: Validate hours distribution before submitting
        if (!validateHoursDistribution()) {
            return;
        }
        
        const formData = new FormData(form);

        const selectedEmployees = Array.from(formData.getAll('assignedEmployees'));
        const selectedDepartments = Array.from(formData.getAll('departments'));

        console.log('📊 Form data:', {
            selectedEmployees: selectedEmployees.length,
            selectedDepartments: selectedDepartments
        });

        // ✅ UPDATED: Build department hours array with variable hours
        const departmentHours = selectedDepartments.map(dept => {
            const allocatedHours = parseInt(formData.get(`deptHours_${dept}`)) || 0;
            console.log(`🏢 Department ${dept}: ${allocatedHours} hours`);
            return {
                department: dept,
                allocatedHours: allocatedHours,
                variableHours: 0, // ✅ ADDED: Initialize variable hours as 0
                consumedHours: 0
            };
        });

        const projectData = {
            projectCode: formData.get('projectCode'),
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

        // Safe element population
        const projectNameEl = document.getElementById('projectName');
        const projectCodeEl = document.getElementById('projectCode');
        const totalHoursEl = document.getElementById('totalHours');
        const projectStatusEl = document.getElementById('projectStatus');
        const modalHeaderEl = document.querySelector('#addProjectModal .modal-header h2');
        const primaryButtonEl = document.querySelector('#addProjectModal .btn-primary');
        const addProjectFormEl = document.getElementById('addProjectForm');

        if (projectNameEl) projectNameEl.value = project.name;
        if (projectCodeEl) projectCodeEl.value = project.projectCode;
        if (totalHoursEl) totalHoursEl.value = project.totalHours;
        if (projectStatusEl) projectStatusEl.value = project.status;

        // ✅ FIXED: Handle employee IDs properly (they might be objects or strings)
        const employeeSelect = document.getElementById('assignedEmployees');
        if (employeeSelect) {
            // Extract employee IDs properly - handle both object and string formats
            const assignedIds = (project.assignedEmployees || []).map(emp => {
                if (typeof emp === 'object' && emp._id) {
                    return emp._id; // If it's an object, get the _id
                }
                return emp; // If it's already a string, use as is
            });
            
            console.log(`👥 Processing ${assignedIds.length} assigned employees:`, assignedIds);

            // First populate the select with all employees based on departments
            await populateEmployeeSelect(project.departments || [], assignedIds);
            
            // Then set the selected employees - wait a bit for options to render
            setTimeout(() => {
                console.log(`👥 Setting ${assignedIds.length} assigned employees:`, assignedIds);
                
                // Clear any existing selections first
                Array.from(employeeSelect.options).forEach(option => {
                    option.selected = false;
                });

                // Set the selected employees
                let selectedCount = 0;
                assignedIds.forEach(employeeId => {
                    const option = employeeSelect.querySelector(`option[value="${employeeId}"]`);
                    if (option) {
                        option.selected = true;
                        selectedCount++;
                        console.log(`✅ Selected employee: ${employeeId}`);
                    } else {
                        console.warn(`❌ Employee option not found for ID: ${employeeId}`);
                    }
                });

                console.log(`✅ Successfully selected ${selectedCount} out of ${assignedIds.length} employees`);
            }, 100);
        }

        const departmentSelect = document.getElementById('departments');
        if (departmentSelect && project.departments) {
            // Clear existing selections
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

            // ✅ UPDATED: Create department hours inputs with variable hours for editing
            handleDepartmentSelectionForEdit(project.departmentHours);
        }

        if (modalHeaderEl) modalHeaderEl.textContent = 'Edit Project';
        if (primaryButtonEl) primaryButtonEl.textContent = 'Save Changes';
        if (addProjectFormEl) addProjectFormEl.dataset.editId = id;
        
        toggleAddProjectModal();
        console.log('✅ Edit form populated successfully');
    } catch (error) {
        console.error('❌ Error editing project:', error);
        showNotification('Failed to load project data', 'error');
    }
}

// ✅ ADDED: Special handler for editing with variable hours
function handleDepartmentSelectionForEdit(departmentHours) {
    console.log('🏢 Handling department selection for editing...');
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
            
            // Find existing department data
            const existingDept = departmentHours?.find(d => d.department === dept);
            const allocatedHours = existingDept?.allocatedHours || 0;
            const variableHours = existingDept?.variableHours || 0;
            const consumedHours = existingDept?.consumedHours || 0;
            
            deptDiv.innerHTML = `
                <div class="form-group">
                    <label for="deptHours_${dept}">${dept} Allocated Hours</label>
                    <input type="number" id="deptHours_${dept}" name="deptHours_${dept}" value="${allocatedHours}" min="0" readonly style="background-color: #f3f4f6;">
                    <small style="color: #6b7280;">Original allocated hours cannot be changed</small>
                </div>
                <div class="form-group">
                    <label for="variableHours_${dept}">${dept} Variable Hours</label>
                    <input type="number" id="variableHours_${dept}" name="variableHours_${dept}" value="${variableHours}" min="0" onchange="validateHoursDistribution()">
                    <small style="color: #f59e0b;">Additional hours to extend project capacity</small>
                </div>
                <div class="form-group">
                    <label>Current Status</label>
                    <div style="padding: 0.5rem; background: #f8fafc; border-radius: 0.375rem; font-size: 0.875rem;">
                        <div>Allocated: ${allocatedHours} hours</div>
                        <div>Variable: ${variableHours} hours</div>
                        <div>Consumed: ${consumedHours} hours</div>
                        <div><strong>Total Available: ${allocatedHours + variableHours} hours</strong></div>
                        <div>Balance: ${Math.max(0, (allocatedHours + variableHours) - consumedHours)} hours</div>
                    </div>
                </div>
            `;
            inputsContainer.appendChild(deptDiv);
            console.log(`✅ Added department hours input for editing: ${dept}`);
        });

        // Populate employee select with the selected departments
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

async function updateProject(id) {
    try {
        console.log(`💾 Updating project: ${id}`);
        const form = document.getElementById('addProjectForm');
        if (!form) {
            showNotification('Edit project form not found', 'error');
            return;
        }
        
        // ✅ ADDED: Validate hours distribution before submitting
        if (!validateHoursDistribution()) {
            return;
        }
        
        const formData = new FormData(form);

        const selectedEmployees = Array.from(formData.getAll('assignedEmployees'));
        const selectedDepartments = Array.from(formData.getAll('departments'));

        console.log('📊 Update form data:', {
            selectedEmployees: selectedEmployees.length,
            selectedDepartments: selectedDepartments
        });

        // ✅ FIXED: Get current project data to preserve allocated hours and consumed hours
        const currentProject = await apiClient.getProject(id);
        
        // ✅ FIXED: Build department hours array while preserving allocated hours and only updating variable hours
        const departmentHours = selectedDepartments.map(dept => {
            // Find existing department data
            const existingDept = currentProject.departmentHours?.find(d => d.department === dept);
            const allocatedHours = existingDept?.allocatedHours || 0; // Preserve original allocated hours
            const variableHours = parseInt(formData.get(`variableHours_${dept}`)) || 0; // Get new variable hours
            const consumedHours = existingDept?.consumedHours || 0; // Preserve consumed hours
            
            console.log(`🏢 Department ${dept}: ${allocatedHours} allocated, ${variableHours} variable, ${consumedHours} consumed`);
            
            return {
                department: dept,
                allocatedHours: allocatedHours, // ✅ PRESERVE original allocated hours
                variableHours: variableHours,   // ✅ UPDATE variable hours
                consumedHours: consumedHours    // ✅ PRESERVE consumed hours
            };
        });

        const projectData = {
            projectCode: formData.get('projectCode'),
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
        
        // Safe element updates
        const modalHeaderEl = document.querySelector('#addProjectModal .modal-header h2');
        const primaryButtonEl = document.querySelector('#addProjectModal .btn-primary');
        const addProjectFormEl = document.getElementById('addProjectForm');
        
        if (modalHeaderEl) modalHeaderEl.textContent = 'Add New Project';
        if (primaryButtonEl) primaryButtonEl.textContent = 'Add Project';
        if (addProjectFormEl) addProjectFormEl.dataset.editId = '';
        
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

    // Safe element updates
    const totalProjectsEl = document.getElementById('totalProjects');
    const activeProjectsEl = document.getElementById('activeProjects');
    const completedProjectsEl = document.getElementById('completedProjects');
    const onHoldProjectsEl = document.getElementById('onHoldProjects');

    if (totalProjectsEl) totalProjectsEl.textContent = totalProjects;
    if (activeProjectsEl) activeProjectsEl.textContent = activeProjects;
    if (completedProjectsEl) completedProjectsEl.textContent = completedProjects;
    if (onHoldProjectsEl) onHoldProjectsEl.textContent = onHoldProjects;

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
    const searchTermEl = document.getElementById('searchProjects');
    const searchProjectCodeEl = document.getElementById('searchProjectCode');
    const filterStatusEl = document.getElementById('filterStatus');

    if (!searchTermEl || !searchProjectCodeEl || !filterStatusEl) {
        return;
    }

    const searchTerm = searchTermEl.value.toLowerCase();
    const searchProjectCodeTerm = searchProjectCodeEl.value.toLowerCase();
    const statusFilter = filterStatusEl.value;

    console.log(`🔍 Filtering projects - Search: "${searchTerm}", Project Code: "${searchProjectCodeTerm}", Status: "${statusFilter}"`);

    const filteredProjects = (window.projects || []).filter(project => {
        const matchesSearch = project.name.toLowerCase().includes(searchTerm);
        const matchesProjectCode = project.projectCode.toLowerCase().includes(searchProjectCodeTerm);
        const matchesStatus = statusFilter === 'all' || project.status === statusFilter;
        return matchesSearch && matchesProjectCode && matchesStatus;
    });

    console.log(`📋 Filter results: ${filteredProjects.length} projects match criteria`);

    const grid = document.getElementById('projectsGrid');
    if (!grid) return;
    
    grid.innerHTML = '';

    filteredProjects.forEach(project => {
        const card = createProjectCard(project);
        grid.appendChild(card);
    });
}

function toggleAddProjectModal() {
    const modal = document.getElementById('addProjectModal');
    if (modal) {
        modal.style.display = modal.style.display === 'block' ? 'none' : 'block';
        console.log(`🪟 Add project modal: ${modal.style.display}`);
    }
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
            deptDiv.innerHTML = `
                <div class="form-group">
                    <label for="deptHours_${dept}">${dept} Allocated Hours *</label>
                    <input type="number" id="deptHours_${dept}" name="deptHours_${dept}" min="1" required 
                           onchange="validateHoursDistribution()">
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
        if (notification.parentNode) {
            notification.remove();
        }
    }, 3000);
}

// Safe event listener for sidebar toggle
const toggleSidebar = document.getElementById('toggle-sidebar');
if (toggleSidebar) {
    toggleSidebar.addEventListener('click', function() {
        console.log('🔘 Sidebar toggle clicked');
        const dashboardContainer = document.querySelector('.dashboard-container');
        if (dashboardContainer) {
            dashboardContainer.classList.toggle('sidebar-collapsed');
        }
    });
}

window.onclick = function(event) {
    const addModal = document.getElementById('addProjectModal');
    const assignedModal = document.getElementById('assignedEmployeesModal');
    const variableModal = document.getElementById('addVariableHoursModal');
    
    if (event.target === addModal) {
        console.log('❌ Add project modal closed (outside click)');
        if (addModal) addModal.style.display = 'none';
    }
    if (event.target === assignedModal) {
        console.log('❌ Assigned employees modal closed (outside click)');
        closeAssignedEmployeesModal();
    }
    if (event.target === variableModal) {
        console.log('❌ Add variable hours modal closed (outside click)');
        closeAddVariableHoursModal();
    }
};

// ✅ UPDATED: Download function with better error handling
async function downloadProjectExcel(projectId) {
    try {
        console.log(`📥 Downloading project excel for: ${projectId}`);
        showNotification('Generating project report...', 'info');
        
        // Try Excel export first
        try {
            const result = await apiClient.exportProjectToExcel(projectId);
            showNotification(`Project report downloaded: ${result.fileName}`, 'success');
            console.log('✅ Excel download completed successfully');
        } catch (excelError) {
            console.warn('❌ Excel export failed, trying alternative methods:', excelError);
            
            // Fallback: Generate client-side CSV
            try {
                await generateClientSideReport(projectId);
            } catch (clientError) {
                console.error('❌ All export methods failed:', clientError);
                showNotification('Export feature not available yet. Please try again later.', 'warning');
            }
        }
    } catch (error) {
        console.error('❌ Error downloading project report:', error);
        showNotification(error.message || 'Failed to download project report', 'error');
    }
}

// ✅ ADDED: Client-side report generation as fallback
async function generateClientSideReport(projectId) {
    try {
        console.log(`🔄 Generating client-side report for project: ${projectId}`);
        
        const project = await apiClient.getProject(projectId);
        if (!project) {
            throw new Error('Project not found');
        }

        // Create CSV content
        const headers = ['Project Code', 'Project Name', 'Status', 'Total Hours', 'Allocated Hours', 'Variable Hours', 'Consumed Hours', 'Balance Hours'];
        
        const totalAllocated = project.departmentHours.reduce((sum, dept) => sum + dept.allocatedHours, 0);
        const totalVariable = project.departmentHours.reduce((sum, dept) => sum + dept.variableHours, 0);
        const totalConsumed = project.departmentHours.reduce((sum, dept) => sum + dept.consumedHours, 0);
        const totalAvailable = totalAllocated + totalVariable;
        const balanceHours = Math.max(0, totalAvailable - totalConsumed);
        
        const row = [
            project.projectCode,
            project.name,
            project.status,
            project.totalHours,
            totalAllocated,
            totalVariable,
            totalConsumed,
            balanceHours
        ];
        
        const csvContent = [headers, row].map(row => row.map(field => `"${field}"`).join(',')).join('\n');
        
        // Create and download file
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = `${project.name.replace(/\s+/g, '_')}_report.csv`;
        
        document.body.appendChild(a);
        a.click();
        
        // Clean up
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        console.log('✅ Client-side CSV generated successfully');
        showNotification(`CSV report downloaded: ${a.download}`, 'success');
        
    } catch (error) {
        console.error('❌ Client-side report generation failed:', error);
        throw error;
    }
}

// Make functions globally available
window.showAssignedEmployees = showAssignedEmployees;
window.editProject = editProject;
window.addVariableHours = addVariableHours;
window.deleteProject = deleteProject;
window.downloadProjectExcel = downloadProjectExcel;
window.closeAssignedEmployeesModal = closeAssignedEmployeesModal;
window.closeAddVariableHoursModal = closeAddVariableHoursModal;
window.toggleAddProjectModal = toggleAddProjectModal;
window.validateHoursDistribution = validateHoursDistribution;