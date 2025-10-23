// report-and-tracking.js - Updated to load data from projects.js and user-management.js

let currentFilteredProjects = [];
let currentProject = null;
let currentEmployee = null;
let currentSearchType = null; // 'employee' or 'project'

document.addEventListener('DOMContentLoaded', function() {
    initializeTabs();
    loadHoursTrackingContent();
    loadEmployeeReportContent();
});

function initializeTabs() {
    const tabButtons = document.querySelectorAll('.tab');
    const tabContents = document.querySelectorAll('.tab-panel');

    tabButtons.forEach(button => {
        button.addEventListener('click', function() {
            const targetTab = this.textContent.toLowerCase().replace(/\s/g, '-');

            // Remove active class from all buttons and contents
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabContents.forEach(content => content.classList.remove('active'));

            // Add active class to clicked button and corresponding content
            this.classList.add('active');
            document.getElementById(targetTab).classList.add('active');
        });
    });
}

function loadHoursTrackingContent() {
    const hoursTrackingTab = document.getElementById('hours-tracking');
    if (!hoursTrackingTab) return;

    // Use projects data from projects.js
    let totalHours = 0;
    let consumedHours = 0;
    let balanceHours = 0;
    let variationHours = 0;

    window.projects.forEach(project => {
        totalHours += project.totalHours;
        consumedHours += (project.juniorCompleted + project.seniorCompleted);
        variationHours += project.variationHours || 0;
    });
    balanceHours = totalHours - consumedHours;

    hoursTrackingTab.innerHTML = `
        <div class="hours-tracking-container">
            <div class="tracking-form-section">
                <div class="form-card">
                    <div class="form-header">
                        <h3><i class="fas fa-search"></i> Project Search</h3>
                    </div>
                    <div class="form-content">
                        <div class="form-row">
                            <div class="form-group">
                                <label for="pl-no">PL No</label>
                                <input type="text" id="pl-no" placeholder="Enter Project Number">
                            </div>
                            <div class="form-group">
                                <label for="project-name">Project Name</label>
                                <input type="text" id="project-name" placeholder="Enter Project Name">
                            </div>
                        </div>
                        <button class="search-btn" onclick="searchProject()">
                            <i class="fas fa-search"></i> Search
                        </button>
                    </div>
                </div>

                <div class="stats-grid">
                    <div class="stat-card">
                        <div class="stat-icon">
                            <i class="fas fa-clock"></i>
                        </div>
                        <div class="stat-details">
                            <div class="stat-label">Total Hours</div>
                            <div class="stat-value">${totalHours}</div>
                        </div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon">
                            <i class="fas fa-hourglass-half"></i>
                        </div>
                        <div class="stat-details">
                            <div class="stat-label">Consumed Hours</div>
                            <div class="stat-value">${consumedHours}</div>
                        </div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon">
                            <i class="fas fa-hourglass-end"></i>
                        </div>
                        <div class="stat-details">
                            <div class="stat-label">Balance</div>
                            <div class="stat-value">${balanceHours}</div>
                        </div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon">
                            <i class="fas fa-percentage"></i>
                        </div>
                        <div class="stat-details">
                            <div class="stat-label">% Consumed</div>
                            <div class="stat-value">${((consumedHours / totalHours) * 100).toFixed(2)}%</div>
                        </div>
                    </div>
                </div>

                <div id="search-results-container"></div>
            </div>

            <div class="chart-section">
                <div class="chart-card">
                    <div class="chart-header">
                        <h3><i class="fas fa-chart-pie"></i> Hours Distribution</h3>
                    </div>
                    <div class="chart-container">
                        <canvas id="hoursChart" width="300" height="300"></canvas>
                    </div>
                    <div class="chart-legend">
                        <div class="legend-item">
                            <span class="legend-color" style="background-color: #4FC3F7;"></span>
                            <span class="legend-text">Consumed Hours</span>
                        </div>
                        <div class="legend-item">
                            <span class="legend-color" style="background-color: #FFB74D;"></span>
                            <span class="legend-text">Balance</span>
                        </div>
                        <div class="legend-item">
                            <span class="legend-color" style="background-color: #81C784;"></span>
                            <span class="legend-text">Variation Hours</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;


    setTimeout(() => {
        initializeHoursChart(totalHours, consumedHours, balanceHours, variationHours);
    }, 100);

    // Add auto-fill functionality
    document.getElementById('pl-no').addEventListener('input', function() {
        const plNo = this.value.trim();
        const project = window.projects.find(p => p.plNo === plNo);
        if (project) {
            document.getElementById('project-name').value = project.name;
        }
    });

    document.getElementById('project-name').addEventListener('input', function() {
        const name = this.value.trim();
        const project = window.projects.find(p => p.name === name);
        if (project) {
            document.getElementById('pl-no').value = project.plNo;
        }
    });
}

function initializeHoursChart(total, consumed, balance, variation) {
    const canvas = document.getElementById('hoursChart');
    const ctx = canvas.getContext('2d');

    // Destroy existing chart if it exists
    if (canvas.chart) {
        canvas.chart.destroy();
    }

    canvas.chart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Consumed Hours', 'Balance', 'Variation Hours'],
            datasets: [{
                data: [consumed, balance, variation],
                backgroundColor: ['#4FC3F7', '#FFB74D', '#81C784'],
                borderWidth: 2,
                borderColor: '#ffffff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            cutout: '60%'
        }
    });
}

function loadEmployeeReportContent() {
    const employeeReportTab = document.getElementById('employee-report');
    if (!employeeReportTab) return;

    // Use users and projects data from user-management.js and projects.js
    employeeReportTab.innerHTML = `
        <div class="employee-report-container">
            <div class="report-header">
                <h2><i class="fas fa-user-tie"></i> Employee Performance Report</h2>
                <p>Comprehensive overview of employee assignments and project progress.</p>
            </div>

            <div class="employee-search-section">
                <div class="search-form">
                    <div class="search-row" style="display: flex; align-items: center; gap: 10px;">
                        <div class="form-group">
                            <input type="text" id="id-pl-no" placeholder="Employee ID or PL No.">
                        </div>
                        <div class="form-group">
                            <input type="text" id="name-project" placeholder="Employee Name or Project Name">
                        </div>
                        <button class="search-btn" onclick="searchEmployee()">
                            <i class="fas fa-search"></i> Search
                        </button>
                    </div>
                </div>
            </div>

            <div class="date-filter-section">
                <div class="filter-section">
                    <label>Filter by Date:</label>
                    <div class="date-filters" style="display: flex; gap: 10px; align-items: center;">
                        <div class="form-group" style="margin: 0;">
                            <label for="start-date" style="font-size: 14px; margin-bottom: 1px;">Start Date</label>
                            <input type="date" id="start-date">
                        </div>
                        <div class="form-group" style="margin: 0;">
                            <label for="end-date" style="font-size: 14px; margin-bottom: 1px;">End Date</label>
                            <input type="date" id="end-date">
                        </div>
                        <button class="filter-btn" onclick="applyDateFilter()" style="padding: 8px 12px; font-size: 12px;">
                            <i class="fas fa-filter"></i> Apply Filter
                        </button>
                    </div>
                </div>
            </div>

            <div class="employee-details-section">
                <div class="details-card" id="employeeDetailsCard" style="display:none;">
                    <div class="card-header">
                        <h3><i class="fas fa-id-card"></i> Employee Details</h3>
                    </div>
                    <div class="details-content" id="employeeDetailsContent">
                    </div>
                </div>
            </div>

            <div class="projects-section">
                <div class="projects-header">
                    <h3><i class="fas fa-tasks"></i> Assigned Projects</h3>
                    <div class="filter-section">
                        <label>Filter Projects:</label>
                        <select id="project-filter" onchange="filterProjects()">
                            <option value="all">📋 All</option>
                            <option value="active">🟢 Active</option>
                            <option value="completed">✅ Completed</option>
                            <option value="on-hold">⏸️ On Hold</option>
                        </select>
                    </div>
                </div>

                <div class="projects-list" id="employeeProjectsList">
                </div>

                <div class="export-section" id="employee-export-section" style="display:none;">
                    <button class="export-btn" onclick="exportEmployeeReportToExcel()">
                        <i class="fas fa-file-excel"></i> Export to Excel
                    </button>
                </div>
            </div>
        </div>
    `;

    // Add auto-fill functionality
    document.getElementById('id-pl-no').addEventListener('input', function() {
        const value = this.value.trim();
        // Check if it's an employee ID
        const emp = window.employees.find(e => e.employeeId === value);
        if (emp) {
            document.getElementById('name-project').value = `${emp.firstName} ${emp.lastName}`;
            return;
        }
        // Check if it's a PL No.
        const project = window.projects.find(p => p.plNo === value);
        if (project) {
            document.getElementById('name-project').value = project.name;
        }
    });

    document.getElementById('name-project').addEventListener('input', function() {
        const value = this.value.trim();
        // Check if it's an employee name
        const emp = window.employees.find(e => `${e.firstName} ${e.lastName}` === value);
        if (emp) {
            document.getElementById('id-pl-no').value = emp.employeeId;
            return;
        }
        // Check if it's a project name
        const project = window.projects.find(p => p.name === value);
        if (project) {
            document.getElementById('id-pl-no').value = project.plNo;
        }
    });
}

function searchProject() {
    const plNo = document.getElementById('pl-no').value.trim().toLowerCase();
    const projectName = document.getElementById('project-name').value.trim().toLowerCase();

    console.log('Search inputs:', { plNo, projectName }); // Debug log
    console.log('Available projects:', window.projects); // Debug log

    let filteredProjects = window.projects;

    if (plNo || projectName) {
        filteredProjects = window.projects.filter(project => {
            const projectPlNo = (project.plNo || '').toLowerCase();
            const projectNameLower = (project.name || '').toLowerCase();

            const matchesPl = plNo ? projectPlNo.includes(plNo) : true;
            const matchesName = projectName ? projectNameLower.includes(projectName) : true;

            console.log(`Checking project ${project.name}: PL=${projectPlNo}, matchesPL=${matchesPl}, matchesName=${matchesName}`); // Debug log

            return matchesPl && matchesName;
        });
    }

    console.log('Filtered projects:', filteredProjects); // Debug log

    if (filteredProjects.length === 0) {
        showNotification('No projects found matching the criteria.', 'error');
        return;
    }

    // Store filtered projects globally for export
    currentFilteredProjects = filteredProjects;

    // Calculate stats for filtered projects
    let totalHours = 0;
    let consumedHours = 0;
    let balanceHours = 0;
    let variationHours = 0;

    filteredProjects.forEach(project => {
        totalHours += project.totalHours || 0;
        consumedHours += (project.juniorCompleted || 0) + (project.seniorCompleted || 0);
        variationHours += project.variationHours || 0;
    });
    balanceHours = totalHours - consumedHours;

    // Update stats display with null checks
    const statValues = document.querySelectorAll('.stat-value');
    if (statValues.length >= 4) {
        statValues[0].textContent = totalHours;
        statValues[1].textContent = consumedHours;
        statValues[2].textContent = balanceHours;
        statValues[3].textContent = totalHours > 0 ? ((consumedHours / totalHours) * 100).toFixed(2) + '%' : '0%';
    }

    // Update chart
    const canvas = document.getElementById('hoursChart');
    if (canvas && canvas.chart) {
        canvas.chart.destroy();
    }
    initializeHoursChart(totalHours, consumedHours, balanceHours, variationHours);

    showNotification(`Found ${filteredProjects.length} project(s) matching the criteria.`, 'success');
}

function searchEmployee() {
    const idPlNoInput = document.getElementById('id-pl-no').value.trim().toLowerCase();
    const nameProjectInput = document.getElementById('name-project').value.trim().toLowerCase();
    const startDateInput = document.getElementById('start-date').value;
    const endDateInput = document.getElementById('end-date').value;

    let employee = null;
    let project = null;

    // First, try to find employee by ID or name
    if (idPlNoInput) {
        employee = window.employees.find(emp => emp.employeeId.toLowerCase() === idPlNoInput);
    }
    if (!employee && nameProjectInput) {
        employee = window.employees.find(emp => `${emp.firstName} ${emp.lastName}`.toLowerCase() === nameProjectInput);
    }

    // If no employee found, try to find project by PL No or name
    if (!employee) {
        if (idPlNoInput) {
            project = window.projects.find(p => p.plNo.toLowerCase() === idPlNoInput);
        }
        if (!project && nameProjectInput) {
            project = window.projects.find(p => p.name.toLowerCase() === nameProjectInput);
        }
    }

    const detailsCard = document.getElementById('employeeDetailsCard');
    const detailsContent = document.getElementById('employeeDetailsContent');
    const projectsList = document.getElementById('employeeProjectsList');
    const projectsSection = document.querySelector('.projects-section');
    const dateFilterSection = document.querySelector('.date-filter-section');

    if (employee) {
        // Remove employee details section for employee search
        detailsCard.style.display = 'none';
        detailsContent.innerHTML = '';

        // Show assigned projects section and date filter
        projectsSection.style.display = 'block';
        if (dateFilterSection) dateFilterSection.style.display = 'block';

        // Store current employee and show export button
        currentEmployee = employee;
        currentSearchType = 'employee';
        const exportSection = document.getElementById('employee-export-section');
        if (exportSection) {
            exportSection.style.display = 'block';
            console.log('Employee found, showing export button');
        }

        // List assigned projects with date filtering
        let assignedProjects = window.projects.filter(project => project.assignedEmployees.includes(employee.id));

        // Apply date filtering if dates are provided
        if (startDateInput || endDateInput) {
            assignedProjects = assignedProjects.filter(project => {
                if (!project.activities || project.activities.length === 0) {
                    return false; // No activities, can't filter by date
                }

                return project.activities.some(activity => {
                    if (!activity.startDate) return false;

                    const activityStartDate = new Date(activity.startDate);
                    const activityEndDate = activity.endDate ? new Date(activity.endDate) : activityStartDate;

                    let matchesStartDate = true;
                    let matchesEndDate = true;

                    if (startDateInput) {
                        const startDate = new Date(startDateInput);
                        matchesStartDate = activityStartDate >= startDate || activityEndDate >= startDate;
                    }

                    if (endDateInput) {
                        const endDate = new Date(endDateInput);
                        matchesEndDate = activityStartDate <= endDate || activityEndDate <= endDate;
                    }

                    return matchesStartDate && matchesEndDate;
                });
            });
        }

        projectsList.innerHTML = '';

        if (assignedProjects.length === 0) {
            projectsList.innerHTML = '<div class="no-projects">No projects found matching the date criteria.</div>';
        } else {
            assignedProjects.forEach(project => {
                const projectDiv = document.createElement('div');
                projectDiv.className = 'project-item';
                projectDiv.dataset.status = project.status;
                projectDiv.innerHTML = `
                    <div class="project-info">
                        <span class="project-name">${project.name}</span>
                    </div>
                    <div class="project-status">
                        <span class="status-badge ${project.status}">${project.status.charAt(0).toUpperCase() + project.status.slice(1)}</span>
                    </div>
                `;
                projectsList.appendChild(projectDiv);
            });
        }
    } else if (project) {
        detailsCard.style.display = 'block';
        // Change header to "Project Details"
        const cardHeader = document.querySelector('#employeeDetailsCard .card-header h3');
        if (cardHeader) {
            cardHeader.innerHTML = '<i class="fas fa-id-card"></i> Project Details';
        }
        const assignedEmployees = window.employees.filter(emp => project.assignedEmployees.includes(emp.id));
        detailsContent.innerHTML = `
            <div class="detail-item"><span class="detail-label">Project Name:</span> <span class="detail-value">${project.name}</span></div>
            <div class="detail-item"><span class="detail-label">PL No:</span> <span class="detail-value">${project.plNo}</span></div>
            <div class="detail-item"><span class="detail-label">Status:</span> <span class="detail-value">${project.status}</span></div>
            <div class="detail-item"><span class="detail-label">Assigned Employees:</span></div>
            <ul>
                ${assignedEmployees.map(emp => `<li>${emp.firstName} ${emp.lastName} (${emp.employeeId}) - ${emp.department}</li>`).join('')}
            </ul>
            <div class="export-section" id="project-details-export-section" style="display:block; margin-top: 10px;">
                <button class="export-btn" onclick="exportEmployeeReportToExcel()">
                    <i class="fas fa-file-excel"></i> Export to Excel
                </button>
            </div>
        `;

        // Remove assigned projects section and date filter for project search
        projectsSection.style.display = 'none';
        if (dateFilterSection) dateFilterSection.style.display = 'none';

        // Store current project and show export button
        currentProject = project;
        currentSearchType = 'project';
        const exportSection = document.getElementById('employee-export-section');
        if (exportSection) {
            exportSection.style.display = 'block';
            console.log('Project found, showing export button');
            exportSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
        } else {
            console.warn('Export section element not found');
        }
    } else {
        detailsCard.style.display = 'none';
        detailsContent.innerHTML = '';
        projectsSection.style.display = 'none';

        // Hide export button
        const exportSection = document.getElementById('employee-export-section');
        if (exportSection) {
            exportSection.style.display = 'none';
            console.log('No project or employee found, hiding export button');
        }
    }
}

function filterProjects() {
    const filterValue = document.getElementById('project-filter').value;
    const projectItems = document.querySelectorAll('#employeeProjectsList .project-item');

    projectItems.forEach(item => {
        if (filterValue === 'all') {
            item.style.display = 'flex';
        } else {
            const status = item.dataset.status;
            item.style.display = status === filterValue ? 'flex' : 'none';
        }
    });
}

function applyDateFilter() {
    // Get current search values
    const idPlNoInput = document.getElementById('id-pl-no').value.trim();
    const nameProjectInput = document.getElementById('name-project').value.trim();

    // If no search criteria, show notification
    if (!idPlNoInput && !nameProjectInput) {
        showNotification('Please enter search criteria first before applying date filter.', 'error');
        return;
    }

    // Re-run the search with current date filters
    searchEmployee();
}

function exportEmployeeReportToExcel() {
    if (currentSearchType === 'employee' && currentEmployee) {
        // Get current date filters
        const startDateInput = document.getElementById('start-date').value;
        const endDateInput = document.getElementById('end-date').value;

        // Export only the searched employee's detailed activities by employee code
        const employee = currentEmployee;
        let assignedProjects = window.projects.filter(project => project.assignedEmployees.includes(employee.id));

        // Apply date filtering if dates are provided
        if (startDateInput || endDateInput) {
            assignedProjects = assignedProjects.filter(project => {
                if (!project.activities || project.activities.length === 0) {
                    return false; // No activities, can't filter by date
                }

                return project.activities.some(activity => {
                    if (!activity.startDate) return false;

                    const activityStartDate = new Date(activity.startDate);
                    const activityEndDate = activity.endDate ? new Date(activity.endDate) : activityStartDate;

                    let matchesStartDate = true;
                    let matchesEndDate = true;

                    if (startDateInput) {
                        const startDate = new Date(startDateInput);
                        matchesStartDate = activityStartDate >= startDate || activityEndDate >= startDate;
                    }

                    if (endDateInput) {
                        const endDate = new Date(endDateInput);
                        matchesEndDate = activityStartDate <= endDate || activityEndDate <= endDate;
                    }

                    return matchesStartDate && matchesEndDate;
                });
            });
        }

        const headers = ['Sr no', 'Employee name', 'Department', 'Project Name', 'Project No.', 'Activity Name', 'Consumed Hour', 'Start date', 'End Date', 'Total Hour', 'Remarks'];
        let rows = [];
        let srNo = 1;
        let totalConsumedMinutes = 0;

        assignedProjects.forEach(project => {
            if (project.activities && project.activities.length > 0) {
                project.activities.forEach(activity => {
                    // Apply date filter to individual activities
                    if (startDateInput || endDateInput) {
                        const activityStartDate = new Date(activity.startDate);
                        const activityEndDate = activity.endDate ? new Date(activity.endDate) : activityStartDate;

                        let includeActivity = true;

                        if (startDateInput) {
                            const startDate = new Date(startDateInput);
                            if (!(activityStartDate >= startDate || activityEndDate >= startDate)) {
                                includeActivity = false;
                            }
                        }

                        if (endDateInput) {
                            const endDate = new Date(endDateInput);
                            if (!(activityStartDate <= endDate || activityEndDate <= endDate)) {
                                includeActivity = false;
                            }
                        }

                        if (!includeActivity) return; // Skip this activity
                    }

                    const consumedMinutes = convertTimeToMinutes(activity.consumedHours);
                    totalConsumedMinutes += consumedMinutes;
                    rows.push([
                        srNo++,
                        `${employee.firstName} ${employee.lastName}`,
                        employee.department || '',
                        project.name || '',
                        project.plNo || '',
                        activity.name || '',
                        activity.consumedHours || '',
                        formatDate(activity.startDate),
                        formatDate(activity.endDate),
                        'Project Hour',
                        activity.remarks || ''
                    ].join(','));
                });
            } else {
                rows.push([
                    srNo++,
                    `${employee.firstName} ${employee.lastName}`,
                    employee.department || '',
                    project.name || '',
                    project.plNo || '',
                    '',
                    '',
                    '',
                    '',
                    'Project Hour',
                    ''
                ].join(','));
            }
        });

        // Add total consumed time row
        rows.push([
            '',
            '',
            '',
            '',
            '',
            '',
            convertMinutesToTime(totalConsumedMinutes),
            '',
            '',
            '',
            ''
        ].join(','));

        const csvContent = [headers.join(','), ...rows].join('\n');

        // Create a Blob and download
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'employee_code_detailed.csv';
        a.style.display = 'none';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        showNotification('Employee code detailed report exported to Excel successfully.', 'success');
    } else if (currentSearchType === 'project' && currentProject) {
        // Export project details and assigned employees
        const assignedEmployees = window.employees.filter(emp => currentProject.assignedEmployees.includes(emp.id));
        const headers = ['Sr no', 'Project No.', 'Project Name', 'Emplyee name', 'Department', 'Activity Name', 'Consumed Hour', 'Start date', 'End Date', 'Total Hour', 'Remarks'];
        let rows = [];
        let srNo = 1;
        let totalConsumedMinutes = 0;

        assignedEmployees.forEach(emp => {
            if (currentProject.activities && currentProject.activities.length > 0) {
                currentProject.activities.forEach(activity => {
                    const consumedMinutes = convertTimeToMinutes(activity.consumedHours);
                    totalConsumedMinutes += consumedMinutes;
                    rows.push([
                        srNo++,
                        currentProject.plNo || '',
                        currentProject.name || '',
                        `${emp.firstName} ${emp.lastName}`,
                        emp.department || '',
                        activity.name || '',
                        activity.consumedHours || '',
                        formatDate(activity.startDate),
                        formatDate(activity.endDate),
                        'Project Hour',
                        activity.remarks || ''
                    ].join(','));
                });
            } else {
                rows.push([
                    srNo++,
                    currentProject.plNo || '',
                    currentProject.name || '',
                    `${emp.firstName} ${emp.lastName}`,
                    emp.department || '',
                    '',
                    '',
                    '',
                    '',
                    'Project Hour',
                    ''
                ].join(','));
            }
        });

        // Add total consumed time row
        rows.push([
            '',
            '',
            '',
            '',
            '',
            '',
            convertMinutesToTime(totalConsumedMinutes),
            '',
            '',
            '',
            ''
        ].join(','));

        const csvContent = [headers.join(','), ...rows].join('\n');

        // Create a Blob and download
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'project_details_detailed.csv';
        a.style.display = 'none';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        showNotification('Project details exported to Excel successfully.', 'success');
    } else {
        showNotification('No data available to export.', 'error');
    }
}

function convertTimeToMinutes(timeStr) {
    // Expects timeStr in "HH:mm" format
    if (!timeStr) return 0;
    const parts = timeStr.split(':');
    if (parts.length !== 2) return 0;
    const hours = parseInt(parts[0], 10);
    const minutes = parseInt(parts[1], 10);
    return hours * 60 + minutes;
}

function convertMinutesToTime(totalMinutes) {
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
}

function formatDate(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    if (isNaN(date)) return '';
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
}



function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
        <span>${message}</span>
    `;

    document.body.appendChild(notification);

    setTimeout(() => notification.classList.add('show'), 100);

    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => document.body.removeChild(notification), 300);
    }, 3000);
}
