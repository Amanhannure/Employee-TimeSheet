let currentFilteredProjects = [];
let currentProject = null;
let currentEmployee = null;
let currentSearchType = null;

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
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabContents.forEach(content => content.classList.remove('active'));
            this.classList.add('active');
            document.getElementById(targetTab).classList.add('active');
        });
    });
}

function loadHoursTrackingContent() {
    const hoursTrackingTab = document.getElementById('hours-tracking');
    if (!hoursTrackingTab) return;

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

                <div class="stats-grid" id="statsGrid">
                    <div class="stat-card">
                        <div class="stat-icon">
                            <i class="fas fa-clock"></i>
                        </div>
                        <div class="stat-details">
                            <div class="stat-label">Total Hours</div>
                            <div class="stat-value">0</div>
                        </div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon">
                            <i class="fas fa-hourglass-half"></i>
                        </div>
                        <div class="stat-details">
                            <div class="stat-label">Consumed Hours</div>
                            <div class="stat-value">0</div>
                        </div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon">
                            <i class="fas fa-hourglass-end"></i>
                        </div>
                        <div class="stat-details">
                            <div class="stat-label">Balance</div>
                            <div class="stat-value">0</div>
                        </div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon">
                            <i class="fas fa-percentage"></i>
                        </div>
                        <div class="stat-details">
                            <div class="stat-label">% Consumed</div>
                            <div class="stat-value">0%</div>
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
                </div>
            </div>
        </div>
    `;

    document.getElementById('pl-no').addEventListener('input', function() {
        const plNo = this.value.trim();
        const project = currentFilteredProjects.find(p => p.plNo === plNo);
        if (project) {
            document.getElementById('project-name').value = project.name;
        }
    });

    document.getElementById('project-name').addEventListener('input', function() {
        const name = this.value.trim();
        const project = currentFilteredProjects.find(p => p.name === name);
        if (project) {
            document.getElementById('pl-no').value = project.plNo;
        }
    });
}

async function searchProject() {
    const plNo = document.getElementById('pl-no').value.trim();
    const projectName = document.getElementById('project-name').value.trim();

    try {
        const result = await apiClient.getHoursTracking({ plNo, projectName });
        currentFilteredProjects = result.projects;

        if (result.projects.length === 0) {
            showNotification('No projects found matching the criteria.', 'error');
            return;
        }

        updateStatsDisplay(result.totals);
        initializeHoursChart(result.totals);
        showNotification(`Found ${result.projects.length} project(s) matching the criteria.`, 'success');
    } catch (error) {
        console.error('Error searching projects:', error);
        showNotification('Failed to search projects', 'error');
    }
}

function updateStatsDisplay(totals) {
    const statValues = document.querySelectorAll('.stat-value');
    if (statValues.length >= 4) {
        statValues[0].textContent = totals.totalHours;
        statValues[1].textContent = totals.consumedHours;
        statValues[2].textContent = totals.balanceHours;
        statValues[3].textContent = totals.totalHours > 0 ? 
            ((totals.consumedHours / totals.totalHours) * 100).toFixed(2) + '%' : '0%';
    }
}

function initializeHoursChart(totals) {
    const canvas = document.getElementById('hoursChart');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (canvas.chart) {
        canvas.chart.destroy();
    }

    canvas.chart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Consumed Hours', 'Balance', 'Variation Hours'],
            datasets: [{
                data: [totals.consumedHours, totals.balanceHours, totals.variationHours],
                backgroundColor: ['#4FC3F7', '#FFB74D', '#81C784'],
                borderWidth: 2,
                borderColor: '#ffffff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            cutout: '60%'
        }
    });
}

function loadEmployeeReportContent() {
    const employeeReportTab = document.getElementById('employee-report');
    if (!employeeReportTab) return;

    employeeReportTab.innerHTML = `
        <div class="employee-report-container">
            <div class="report-header">
                <h2><i class="fas fa-user-tie"></i> Employee Performance Report</h2>
                <p>Comprehensive overview of employee assignments and project progress.</p>
            </div>

            <div class="employee-search-section">
                <div class="search-form">
                    <div class="search-row">
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
                    <div class="date-filters">
                        <div class="form-group">
                            <label for="start-date">Start Date</label>
                            <input type="date" id="start-date">
                        </div>
                        <div class="form-group">
                            <label for="end-date">End Date</label>
                            <input type="date" id="end-date">
                        </div>
                        <button class="filter-btn" onclick="applyDateFilter()">
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
                    <div class="details-content" id="employeeDetailsContent"></div>
                </div>
            </div>

            <div class="projects-section">
                <div class="projects-header">
                    <h3><i class="fas fa-tasks"></i> Assigned Projects</h3>
                    <div class="filter-section">
                        <label>Filter Projects:</label>
                        <select id="project-filter" onchange="filterProjects()">
                            <option value="all">All</option>
                            <option value="active">Active</option>
                            <option value="completed">Completed</option>
                        </select>
                    </div>
                </div>

                <div class="projects-list" id="employeeProjectsList"></div>

                <div class="export-section" id="employee-export-section" style="display:none;">
                    <button class="export-btn" onclick="exportEmployeeReportToExcel()">
                        <i class="fas fa-file-excel"></i> Export to Excel
                    </button>
                </div>
            </div>
        </div>
    `;

    document.getElementById('id-pl-no').addEventListener('input', function() {
        const value = this.value.trim();
        // Auto-fill logic can be added here
    });

    document.getElementById('name-project').addEventListener('input', function() {
        const value = this.value.trim();
        // Auto-fill logic can be added here
    });
}

async function searchEmployee() {
    const idPlNoInput = document.getElementById('id-pl-no').value.trim();
    const nameProjectInput = document.getElementById('name-project').value.trim();
    const startDateInput = document.getElementById('start-date').value;
    const endDateInput = document.getElementById('end-date').value;

    try {
        const result = await apiClient.getEmployeeReport({
            employeeId: idPlNoInput,
            name: nameProjectInput,
            plNo: idPlNoInput,
            startDate: startDateInput,
            endDate: endDateInput
        });

        displaySearchResults(result);
    } catch (error) {
        console.error('Error searching employee:', error);
        showNotification('Failed to search employee data', 'error');
    }
}

function displaySearchResults(result) {
    const detailsCard = document.getElementById('employeeDetailsCard');
    const detailsContent = document.getElementById('employeeDetailsContent');
    const projectsList = document.getElementById('employeeProjectsList');
    const exportSection = document.getElementById('employee-export-section');

    if (result.type === 'employee') {
        currentEmployee = result.employee;
        currentSearchType = 'employee';
        
        detailsCard.style.display = 'none';
        displayEmployeeProjects(result.timesheets);
        exportSection.style.display = 'block';
    } else if (result.type === 'project') {
        currentProject = result.project;
        currentSearchType = 'project';
        
        detailsCard.style.display = 'block';
        detailsContent.innerHTML = `
            <div class="detail-item"><span class="detail-label">Project Name:</span> ${result.project.name}</div>
            <div class="detail-item"><span class="detail-label">PL No:</span> ${result.project.plNo}</div>
            <div class="detail-item"><span class="detail-label">Status:</span> ${result.project.status}</div>
        `;
        exportSection.style.display = 'block';
    } else {
        detailsCard.style.display = 'none';
        projectsList.innerHTML = '<div class="no-projects">No results found</div>';
        exportSection.style.display = 'none';
    }
}

function displayEmployeeProjects(timesheets) {
    const projectsList = document.getElementById('employeeProjectsList');
    projectsList.innerHTML = '';

    if (!timesheets || timesheets.length === 0) {
        projectsList.innerHTML = '<div class="no-projects">No timesheets found</div>';
        return;
    }

    timesheets.forEach(timesheet => {
        const projectDiv = document.createElement('div');
        projectDiv.className = 'project-item';
        projectDiv.innerHTML = `
            <div class="project-info">
                <span class="project-name">${timesheet.project?.name || 'N/A'}</span>
                <span class="project-period">${new Date(timesheet.weekStartDate).toLocaleDateString()} - ${new Date(timesheet.weekEndDate).toLocaleDateString()}</span>
            </div>
            <div class="project-status">
                <span class="status-badge ${timesheet.status}">${timesheet.status}</span>
            </div>
        `;
        projectsList.appendChild(projectDiv);
    });
}

function filterProjects() {
    const filterValue = document.getElementById('project-filter').value;
    const projectItems = document.querySelectorAll('#employeeProjectsList .project-item');

    projectItems.forEach(item => {
        if (filterValue === 'all') {
            item.style.display = 'flex';
        } else {
            const status = item.querySelector('.status-badge').className.includes(filterValue);
            item.style.display = status ? 'flex' : 'none';
        }
    });
}

function applyDateFilter() {
    searchEmployee();
}

function exportEmployeeReportToExcel() {
    // Export logic here - would need backend support for Excel generation
    showNotification('Export feature would generate Excel file', 'info');
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