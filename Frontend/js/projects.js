document.addEventListener('DOMContentLoaded', async function() {
    try {
        await loadProjects();
        updateOverviewCards();
        populateEmployeeSelect();
    } catch (error) {
        console.error('Failed to load projects:', error);
        showNotification('Failed to load projects data', 'error');
    }

    document.getElementById('addProjectForm').addEventListener('submit', function(e) {
        e.preventDefault();
        const editId = this.dataset.editId;
        if (editId) {
            updateProject(parseInt(editId));
        } else {
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
        const projects = await apiClient.getProjects();
        window.projects = projects;
        console.log('Loaded projects:', projects);
        
        const grid = document.getElementById('projectsGrid');
        grid.innerHTML = '';

        projects.forEach(project => {
            const card = createProjectCard(project);
            grid.appendChild(card);
        });
    } catch (error) {
        console.error('Error loading projects:', error);
        throw error;
    }
}

function createProjectCard(project) {
    const card = document.createElement('div');
    card.className = 'project-card';

    const juniorProgress = project.juniorHours > 0 ? (project.juniorCompleted / project.juniorHours * 100).toFixed(1) : 0;
    const seniorProgress = project.seniorHours > 0 ? (project.seniorCompleted / project.seniorHours * 100).toFixed(1) : 0;
    const totalProgress = project.totalHours > 0 ? ((project.juniorCompleted + project.seniorCompleted) / project.totalHours * 100).toFixed(1) : 0;

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
                    <div class="stat-value">${project.totalHours}</div>
                </div>
                <div class="stat-item">
                    <div class="stat-label">Balance Hours</div>
                    <div class="stat-value">${project.totalHours - (project.juniorCompleted + project.seniorCompleted)}</div>
                </div>
                <div class="stat-item">
                    <div class="stat-label">Consumed</div>
                    <div class="stat-value">${project.juniorCompleted + project.seniorCompleted}</div>
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
        const project = await apiClient.getProject(projectId);
        if (!project) return;

        const assignedEmps = project.assignedEmployees || [];

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
        console.error('Error showing assigned employees:', error);
        showNotification('Failed to load assigned employees', 'error');
    }
}

async function populateEmployeeSelect() {
    try {
        const users = await apiClient.getUsers();
        window.employees = users;
        
        const select = document.getElementById('assignedEmployees');
        if (!select) return;

        const departmentSelect = document.getElementById('departments');
        const selectedDepartments = departmentSelect ? Array.from(departmentSelect.selectedOptions).map(option => option.value) : [];

        select.innerHTML = '';

        const form = document.getElementById('addProjectForm');
        const editId = form ? form.dataset.editId : null;
        let filteredEmployees = [];

        if (editId) {
            const project = window.projects.find(p => p._id === editId);
            if (project && project.assignedEmployees) {
                const previouslyAssigned = users.filter(emp => project.assignedEmployees.includes(emp._id));
                const deptEmployees = users.filter(emp => selectedDepartments.includes(emp.department));
                const combined = [...previouslyAssigned, ...deptEmployees];
                filteredEmployees = combined.filter((emp, index, self) =>
                    index === self.findIndex(e => e._id === emp._id)
                );
            } else {
                filteredEmployees = users.filter(emp => selectedDepartments.includes(emp.department));
            }
        } else {
            filteredEmployees = users.filter(emp => selectedDepartments.includes(emp.department));
        }

        filteredEmployees.forEach(employee => {
            const option = document.createElement('option');
            option.value = employee._id;
            option.textContent = `${employee.firstName} ${employee.lastName} (${employee.employeeId}) - ${employee.role}`;
            select.appendChild(option);
        });
    } catch (error) {
        console.error('Error populating employee select:', error);
    }
}

async function addProject() {
    try {
        const form = document.getElementById('addProjectForm');
        const formData = new FormData(form);

        const selectedEmployees = Array.from(formData.getAll('assignedEmployees'));
        const selectedDepartments = Array.from(formData.getAll('departments'));

        const projectData = {
            plNo: formData.get('plNo'),
            name: formData.get('projectName'),
            totalHours: parseInt(formData.get('totalHours')),
            juniorHours: parseInt(formData.get('juniorHours')) || 0,
            juniorCompleted: parseInt(formData.get('juniorCompleted')) || 0,
            seniorHours: parseInt(formData.get('seniorHours')) || 0,
            seniorCompleted: parseInt(formData.get('seniorCompleted')) || 0,
            status: formData.get('projectStatus') || 'active',
            assignedEmployees: selectedEmployees,
            departments: selectedDepartments
        };

        const newProject = await apiClient.createProject(projectData);
        
        await loadProjects();
        updateOverviewCards();

        form.reset();
        toggleAddProjectModal();
        showNotification('Project added successfully!');
    } catch (error) {
        console.error('Error adding project:', error);
        showNotification(error.message || 'Failed to add project', 'error');
    }
}

async function editProject(id) {
    try {
        const project = await apiClient.getProject(id);
        if (!project) return;

        document.getElementById('projectName').value = project.name;
        document.getElementById('plNo').value = project.plNo;
        document.getElementById('totalHours').value = project.totalHours;
        document.getElementById('juniorHours').value = project.juniorHours;
        document.getElementById('juniorCompleted').value = project.juniorCompleted;
        document.getElementById('seniorHours').value = project.seniorHours;
        document.getElementById('seniorCompleted').value = project.seniorCompleted;
        document.getElementById('projectStatus').value = project.status;

        const select = document.getElementById('assignedEmployees');
        if (select) {
            Array.from(select.options).forEach(option => {
                option.selected = false;
            });

            const assignedIds = project.assignedEmployees || [];
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

            project.departments.forEach(dept => {
                const option = departmentSelect.querySelector(`option[value="${dept}"]`);
                if (option) {
                    option.selected = true;
                }
            });

            handleDepartmentSelection();
        }

        document.querySelector('#addProjectModal .modal-header h2').textContent = 'Edit Project';
        document.querySelector('#addProjectModal .btn-primary').textContent = 'Save Changes';
        document.getElementById('addProjectForm').dataset.editId = id;
        toggleAddProjectModal();
    } catch (error) {
        console.error('Error editing project:', error);
        showNotification('Failed to load project data', 'error');
    }
}

async function updateProject(id) {
    try {
        const form = document.getElementById('addProjectForm');
        const formData = new FormData(form);

        const selectedEmployees = Array.from(formData.getAll('assignedEmployees'));
        const selectedDepartments = Array.from(formData.getAll('departments'));

        const projectData = {
            plNo: formData.get('plNo'),
            name: formData.get('projectName'),
            totalHours: parseInt(formData.get('totalHours')),
            juniorHours: parseInt(formData.get('juniorHours')) || 0,
            juniorCompleted: parseInt(formData.get('juniorCompleted')) || 0,
            seniorHours: parseInt(formData.get('seniorHours')) || 0,
            seniorCompleted: parseInt(formData.get('seniorCompleted')) || 0,
            status: formData.get('projectStatus') || 'active',
            assignedEmployees: selectedEmployees,
            departments: selectedDepartments
        };

        await apiClient.updateProject(id, projectData);
        
        await loadProjects();
        updateOverviewCards();

        form.reset();
        toggleAddProjectModal();
        document.querySelector('#addProjectModal .modal-header h2').textContent = 'Add New Project';
        document.querySelector('#addProjectModal .btn-primary').textContent = 'Add Project';
        document.getElementById('addProjectForm').dataset.editId = '';
        showNotification('Project updated successfully!');
    } catch (error) {
        console.error('Error updating project:', error);
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
}

async function deleteProject(id) {
    if (confirm('Are you sure you want to delete this project?')) {
        try {
            await apiClient.deleteProject(id);
            await loadProjects();
            updateOverviewCards();
            showNotification('Project deleted successfully!');
        } catch (error) {
            console.error('Error deleting project:', error);
            showNotification(error.message || 'Failed to delete project', 'error');
        }
    }
}

function filterProjects() {
    const searchTerm = document.getElementById('searchProjects').value.toLowerCase();
    const searchPLNoTerm = document.getElementById('searchPLNo').value.toLowerCase();
    const statusFilter = document.getElementById('filterStatus').value;

    const filteredProjects = (window.projects || []).filter(project => {
        const matchesSearch = project.name.toLowerCase().includes(searchTerm);
        const matchesPLNo = project.plNo.toLowerCase().includes(searchPLNoTerm);
        const matchesStatus = statusFilter === 'all' || project.status === statusFilter;
        return matchesSearch && matchesPLNo && matchesStatus;
    });

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
}

function closeAssignedEmployeesModal() {
    const modal = document.getElementById('assignedEmployeesModal');
    if (modal) {
        modal.remove();
    }
}

function handleDepartmentSelection() {
    const departmentSelect = document.getElementById('departments');
    if (!departmentSelect) return;

    const selectedDepartments = Array.from(departmentSelect.selectedOptions).map(option => option.value);
    const container = document.getElementById('departmentHoursContainer');
    const inputsContainer = document.getElementById('departmentHoursInputs');

    if (!container || !inputsContainer) return;

    if (selectedDepartments.length > 0) {
        container.style.display = 'block';
        inputsContainer.innerHTML = '';

        selectedDepartments.forEach((dept, index) => {
            const deptDiv = document.createElement('div');
            deptDiv.className = 'form-row';
            deptDiv.innerHTML = `
                <div class="form-group">
                    <label for="deptHours_${dept}">${dept} Total Hours *</label>
                    <input type="number" id="deptHours_${dept}" name="deptHours_${dept}" min="0" required>
                </div>
                <div class="form-group">
                    <label for="deptCompleted_${dept}">${dept} Consumed Hours</label>
                    <input type="number" id="deptCompleted_${dept}" name="deptCompleted_${dept}" min="0" value="0">
                </div>
                <div class="form-group">
                    <label for="deptBalance_${dept}">${dept} Balance Hours</label>
                    <input type="number" id="deptBalance_${dept}" name="deptBalance_${dept}" min="0" value="0" readonly>
                </div>
            `;
            inputsContainer.appendChild(deptDiv);

            const totalInput = deptDiv.querySelector(`#deptHours_${dept}`);
            const consumedInput = deptDiv.querySelector(`#deptCompleted_${dept}`);
            const balanceInput = deptDiv.querySelector(`#deptBalance_${dept}`);

            function updateBalance() {
                const total = parseInt(totalInput.value) || 0;
                const consumed = parseInt(consumedInput.value) || 0;
                const balance = total - consumed;
                balanceInput.value = balance >= 0 ? balance : 0;
            }

            totalInput.addEventListener('input', updateBalance);
            consumedInput.addEventListener('input', updateBalance);
        });

        populateEmployeeSelect();
    } else {
        container.style.display = 'none';
        inputsContainer.innerHTML = '';
        const employeeSelect = document.getElementById('assignedEmployees');
        if (employeeSelect) {
            employeeSelect.innerHTML = '';
        }
    }
}

function showNotification(message) {
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #10b981;
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
    document.querySelector('.dashboard-container').classList.toggle('sidebar-collapsed');
});

window.onclick = function(event) {
    const addModal = document.getElementById('addProjectModal');
    const assignedModal = document.getElementById('assignedEmployeesModal');
    if (event.target === addModal) {
        addModal.style.display = 'none';
    }
    if (event.target === assignedModal) {
        closeAssignedEmployeesModal();
    }
};