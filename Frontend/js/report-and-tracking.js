let currentFilteredProjects = [];
let currentProject = null;
let currentEmployee = null;
let currentSearchType = null;
let currentChart = null;
let currentEmployeeData = null;

// Safe DOM element selector with error handling
function getElement(id) {
    const element = document.getElementById(id);
    if (!element) {
        console.warn(`Element with id '${id}' not found`);
    }
    return element;
}

function safeInnerHTML(element, content) {
    if (element) {
        element.innerHTML = content;
    }
}

function safeDisplay(element, display) {
    if (element) {
        element.style.display = display;
    }
}

document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Report and Tracking: Starting initialization...');
    initializeTabs();
    loadHoursTrackingContent();
    loadEmployeeReportContent();
    setupEventListeners();
});

function initializeTabs() {
    const tabButtons = document.querySelectorAll('.tab');
    const tabContents = document.querySelectorAll('.tab-panel');

    tabButtons.forEach(button => {
        button.addEventListener('click', function() {
            const targetTab = this.getAttribute('data-tab') || this.textContent.toLowerCase().replace(/\s/g, '-');
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabContents.forEach(content => content.classList.remove('active'));
            this.classList.add('active');
            
            const targetElement = document.getElementById(targetTab);
            if (targetElement) {
                targetElement.classList.add('active');
            }
        });
    });
}

function setupEventListeners() {
    // Global search functionality
    document.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            const activeTab = document.querySelector('.tab.active');
            if (activeTab) {
                if (activeTab.textContent.includes('HOURS TRACKING')) {
                    searchProject();
                } else if (activeTab.textContent.includes('EMPLOYEE REPORT')) {
                    searchEmployee();
                }
            }
        }
    });
}

function loadHoursTrackingContent() {
    const hoursTrackingTab = getElement('hours-tracking');
    if (!hoursTrackingTab) {
        console.error('Hours tracking tab not found');
        return;
    }

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
                                <label for="pl-no">PL No / Project Code</label>
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

                <div class="search-results-section" id="search-results-container" style="display: none;">
                    <div class="results-header">
                        <h3><i class="fas fa-list"></i> Search Results</h3>
                        <span class="results-count" id="resultsCount">0 projects found</span>
                    </div>
                    <div class="projects-table" id="projectsTable">
                        <table>
                            <thead>
                                <tr>
                                    <th>PL No</th>
                                    <th>Project Name</th>
                                    <th>Status</th>
                                    <th>Total Hours</th>
                                    <th>Consumed</th>
                                    <th>Balance</th>
                                    <th>Assigned Employees</th>
                                </tr>
                            </thead>
                            <tbody id="projectsTableBody">
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <div class="chart-section">
                <div class="chart-card">
                    <div class="chart-header">
                        <h3><i class="fas fa-chart-pie"></i> Hours Distribution</h3>
                    </div>
                    <div class="chart-container">
                        <canvas id="hoursChart" width="300" height="300"></canvas>
                    </div>
                    <div class="chart-legend" id="chartLegend"></div>
                </div>
            </div>
        </div>
    `;

    // Setup input synchronization
    const plNoInput = getElement('pl-no');
    const projectNameInput = getElement('project-name');
    
    if (plNoInput) {
        plNoInput.addEventListener('input', function() {
            const plNo = this.value.trim();
            const project = currentFilteredProjects.find(p => p.plNo === plNo);
            if (project && projectNameInput) {
                projectNameInput.value = project.name;
            }
        });
    }

    if (projectNameInput) {
        projectNameInput.addEventListener('input', function() {
            const name = this.value.trim();
            const project = currentFilteredProjects.find(p => p.name === name);
            if (project && plNoInput) {
                plNoInput.value = project.plNo;
            }
        });
    }
}

async function searchProject() {
    const plNoInput = getElement('pl-no');
    const projectNameInput = getElement('project-name');
    
    if (!plNoInput || !projectNameInput) {
        showNotification('Search elements not found. Please refresh the page.', 'error');
        return;
    }

    const plNo = plNoInput.value.trim();
    const projectName = projectNameInput.value.trim();

    if (!plNo && !projectName) {
        showNotification('Please enter either PL No or Project Name to search.', 'error');
        return;
    }

    try {
        showNotification('Searching projects...', 'info');
        
        // Check if apiClient is available
        if (typeof apiClient === 'undefined' || !apiClient.getHoursTracking) {
            showNotification('API client not available. Please check console for errors.', 'error');
            console.error('apiClient.getHoursTracking is not a function');
            return;
        }
        
        const result = await apiClient.getHoursTracking({ plNo, projectName });
        
        if (result.success && result.projects && result.projects.length > 0) {
            currentFilteredProjects = result.projects;
            
            updateStatsDisplay(result.totals);
            initializeHoursChart(result.totals);
            displaySearchResults(result.projects);
            
            showNotification(`Found ${result.projects.length} project(s) matching the criteria.`, 'success');
        } else {
            showNotification('No projects found matching the criteria.', 'error');
            clearResults();
        }
    } catch (error) {
        console.error('Error searching projects:', error);
        showNotification('Failed to search projects. Please try again.', 'error');
        clearResults();
    }
}

function updateStatsDisplay(totals) {
    const statValues = document.querySelectorAll('.stat-value');
    if (statValues.length >= 4) {
        statValues[0].textContent = totals.totalHours ? totals.totalHours.toFixed(1) : '0';
        statValues[1].textContent = totals.consumedHours ? totals.consumedHours.toFixed(1) : '0';
        statValues[2].textContent = totals.balanceHours ? totals.balanceHours.toFixed(1) : '0';
        statValues[3].textContent = totals.totalHours > 0 ? 
            ((totals.consumedHours / totals.totalHours) * 100).toFixed(1) + '%' : '0%';
    }
}

function initializeHoursChart(totals) {
    const canvas = getElement('hoursChart');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    
    // Destroy existing chart if it exists
    if (currentChart) {
        currentChart.destroy();
    }

    // Prepare data for chart
    const data = {
        labels: ['Consumed Hours', 'Balance Hours', 'Variation Hours'],
        datasets: [{
            data: [
                Math.max(0, totals.consumedHours || 0),
                Math.max(0, totals.balanceHours || 0),
                Math.max(0, totals.variationHours || 0)
            ],
            backgroundColor: ['#4FC3F7', '#FFB74D', '#81C784'],
            borderWidth: 2,
            borderColor: '#ffffff',
            hoverOffset: 4
        }]
    };

    currentChart = new Chart(ctx, {
        type: 'doughnut',
        data: data,
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const label = context.label || '';
                            const value = context.raw || 0;
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = total > 0 ? ((value / total) * 100).toFixed(1) + '%' : '0%';
                            return `${label}: ${value.toFixed(1)} hours (${percentage})`;
                        }
                    }
                }
            },
            cutout: '60%'
        }
    });

    // Update legend
    updateChartLegend(data);
}

function updateChartLegend(data) {
    const legend = getElement('chartLegend');
    if (!legend) return;

    legend.innerHTML = '';
    
    data.labels.forEach((label, index) => {
        const color = data.datasets[0].backgroundColor[index];
        const value = data.datasets[0].data[index];
        
        const legendItem = document.createElement('div');
        legendItem.className = 'legend-item';
        legendItem.innerHTML = `
            <span class="legend-color" style="background-color: ${color}"></span>
            <span class="legend-label">${label}: ${value.toFixed(1)}h</span>
        `;
        legend.appendChild(legendItem);
    });
}

function displaySearchResults(projects) {
    const container = getElement('search-results-container');
    const tableBody = getElement('projectsTableBody');
    const resultsCount = getElement('resultsCount');

    if (!container || !tableBody || !resultsCount) return;

    // Show results section
    safeDisplay(container, 'block');
    resultsCount.textContent = `${projects.length} project(s) found`;

    // Clear existing rows
    tableBody.innerHTML = '';

    // Add project rows
    projects.forEach(project => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${project.plNo || 'N/A'}</td>
            <td>${project.name || 'N/A'}</td>
            <td><span class="status-badge status-${project.status || 'unknown'}">${project.status || 'Unknown'}</span></td>
            <td>${project.totalHours ? project.totalHours.toFixed(1) : '0.0'}</td>
            <td>${project.consumedHours ? project.consumedHours.toFixed(1) : '0.0'}</td>
            <td>${project.balanceHours ? project.balanceHours.toFixed(1) : '0.0'}</td>
            <td>${project.assignedEmployees || 0}</td>
        `;
        tableBody.appendChild(row);
    });
}

function clearResults() {
    const container = getElement('search-results-container');
    const tableBody = getElement('projectsTableBody');
    
    safeDisplay(container, 'none');
    if (tableBody) tableBody.innerHTML = '';
    
    // Reset stats
    updateStatsDisplay({ totalHours: 0, consumedHours: 0, balanceHours: 0, variationHours: 0 });
    
    // Clear chart
    if (currentChart) {
        currentChart.destroy();
        currentChart = null;
    }
    
    const legend = getElement('chartLegend');
    if (legend) legend.innerHTML = '';
}

function loadEmployeeReportContent() {
    const employeeReportTab = getElement('employee-report');
    if (!employeeReportTab) {
        console.error('Employee report tab not found');
        return;
    }

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
                            <label for="id-pl-no">Employee ID or PL No</label>
                            <input type="text" id="id-pl-no" placeholder="Enter Employee ID or Project Code">
                        </div>
                        <div class="form-group">
                            <label for="name-project">Employee Name or Project Name</label>
                            <input type="text" id="name-project" placeholder="Enter Name or Project Name">
                        </div>
                        <button class="search-btn" onclick="searchEmployee()">
                            <i class="fas fa-search"></i> Search
                        </button>
                    </div>
                </div>
            </div>

            <div class="date-filter-section">
                <div class="filter-section">
                    <label>Filter by Date Range:</label>
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
                        <button class="clear-btn" onclick="clearDateFilter()">
                            <i class="fas fa-times"></i> Clear
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

                <div class="details-card" id="projectDetailsCard" style="display:none;">
                    <div class="card-header">
                        <h3><i class="fas fa-project-diagram"></i> Project Details</h3>
                    </div>
                    <div class="details-content" id="projectDetailsContent"></div>
                </div>
            </div>

            <div class="results-section">
                <div class="results-header" id="resultsHeader" style="display:none;">
                    <h3><i class="fas fa-chart-bar"></i> Results Summary</h3>
                    <div class="results-stats" id="resultsStats"></div>
                </div>

                <div class="projects-section">
                    <div class="projects-header">
                        <h3><i class="fas fa-tasks"></i> Assigned Projects & Timesheets</h3>
                        <div class="filter-section">
                            <label>Filter:</label>
                            <select id="project-filter" onchange="filterProjects()">
                                <option value="all">All</option>
                                <option value="active">Active</option>
                                <option value="completed">Completed</option>
                                <option value="pending">Pending</option>
                                <option value="approved">Approved</option>
                            </select>
                        </div>
                    </div>

                    <div class="projects-list" id="employeeProjectsList"></div>

                    <div class="timesheets-section" id="timesheetsSection" style="display:none;">
                        <h4><i class="fas fa-file-alt"></i> Timesheet Details</h4>
                        <div class="timesheets-list" id="timesheetsList"></div>
                    </div>
                </div>
            </div>

            <div class="export-section" id="employee-export-section" style="display:none;">
                <button class="export-btn" onclick="exportEmployeeReportToExcel()">
                    <i class="fas fa-file-excel"></i> Export to Excel
                </button>
                <button class="export-btn pdf-btn" onclick="exportToPDF()">
                    <i class="fas fa-file-pdf"></i> Export to PDF
                </button>
            </div>
        </div>
    `;

    // Set default dates for date filters
    const startDate = getElement('start-date');
    const endDate = getElement('end-date');
    
    if (startDate) {
        const threeMonthsAgo = new Date();
        threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
        startDate.value = threeMonthsAgo.toISOString().split('T')[0];
    }
    
    if (endDate) {
        endDate.value = new Date().toISOString().split('T')[0];
    }

    // Setup input event listeners
    const idPlNoInput = getElement('id-pl-no');
    const nameProjectInput = getElement('name-project');
    
    if (idPlNoInput) {
        idPlNoInput.addEventListener('input', function() {
            const value = this.value.trim();
            if (value && nameProjectInput) {
                nameProjectInput.value = '';
            }
        });
    }

    if (nameProjectInput) {
        nameProjectInput.addEventListener('input', function() {
            const value = this.value.trim();
            if (value && idPlNoInput) {
                idPlNoInput.value = '';
            }
        });
    }
}

async function searchEmployee() {
    const idPlNoInput = getElement('id-pl-no');
    const nameProjectInput = getElement('name-project');
    const startDateInput = getElement('start-date');
    const endDateInput = getElement('end-date');

    if (!idPlNoInput || !nameProjectInput || !startDateInput || !endDateInput) {
        showNotification('Search elements not found. Please refresh the page.', 'error');
        return;
    }

    const idPlNo = idPlNoInput.value.trim();
    const nameProject = nameProjectInput.value.trim();
    const startDate = startDateInput.value;
    const endDate = endDateInput.value;

    if (!idPlNo && !nameProject) {
        showNotification('Please enter either Employee ID/PL No or Name/Project Name to search.', 'error');
        return;
    }

    try {
        showNotification('Searching employee data...', 'info');

        // Check if apiClient is available
        if (typeof apiClient === 'undefined' || !apiClient.getEmployeeReport) {
            showNotification('API client not available. Please check console for errors.', 'error');
            console.error('apiClient.getEmployeeReport is not a function');
            return;
        }

        const result = await apiClient.getEmployeeReport({
            employeeId: idPlNo,
            name: nameProject,
            plNo: idPlNo,
            startDate: startDate,
            endDate: endDate
        });

        if (result.success) {
            displaySearchResultsEmployee(result);
            showNotification('Search completed successfully.', 'success');
        } else {
            showNotification(result.message || 'No data found matching the criteria.', 'error');
            clearEmployeeResults();
        }
    } catch (error) {
        console.error('Error searching employee:', error);
        showNotification('Failed to search employee data. Please try again.', 'error');
        clearEmployeeResults();
    }
}

function displaySearchResultsEmployee(result) {
    const employeeDetailsCard = getElement('employeeDetailsCard');
    const projectDetailsCard = getElement('projectDetailsCard');
    const employeeDetailsContent = getElement('employeeDetailsContent');
    const projectDetailsContent = getElement('projectDetailsContent');
    const projectsList = getElement('employeeProjectsList');
    const timesheetsSection = getElement('timesheetsSection');
    const timesheetsList = getElement('timesheetsList');
    const exportSection = getElement('employee-export-section');
    const resultsHeader = getElement('resultsHeader');
    const resultsStats = getElement('resultsStats');

    // Reset displays
    safeDisplay(employeeDetailsCard, 'none');
    safeDisplay(projectDetailsCard, 'none');
    safeDisplay(timesheetsSection, 'none');
    safeDisplay(exportSection, 'none');
    safeDisplay(resultsHeader, 'none');

    if (result.type === 'employee') {
        currentEmployee = result.employee;
        currentSearchType = 'employee';
        currentEmployeeData = result;

        // Show employee details
        safeDisplay(employeeDetailsCard, 'block');
        safeInnerHTML(employeeDetailsContent, `
            <div class="detail-grid">
                <div class="detail-item">
                    <span class="detail-label">Employee ID:</span>
                    <span class="detail-value">${result.employee.employeeId}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Name:</span>
                    <span class="detail-value">${result.employee.firstName} ${result.employee.lastName}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Department:</span>
                    <span class="detail-value">${result.employee.department || 'N/A'}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Designation:</span>
                    <span class="detail-value">${result.employee.designation || 'N/A'}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Status:</span>
                    <span class="detail-value status-${result.employee.status}">${result.employee.status}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Join Date:</span>
                    <span class="detail-value">${result.employee.joinDate ? new Date(result.employee.joinDate).toLocaleDateString() : 'N/A'}</span>
                </div>
            </div>
        `);

        // Show results header with stats
        safeDisplay(resultsHeader, 'block');
        const totalHours = result.timesheets ? result.timesheets.reduce((sum, ts) => sum + (ts.totalHours || 0), 0) : 0;
        const totalTimesheets = result.timesheets ? result.timesheets.length : 0;
        const approvedTimesheets = result.timesheets ? result.timesheets.filter(ts => ts.status === 'approved').length : 0;
        
        safeInnerHTML(resultsStats, `
            <div class="stat-item">
                <span class="stat-number">${totalTimesheets}</span>
                <span class="stat-label">Total Timesheets</span>
            </div>
            <div class="stat-item">
                <span class="stat-number">${totalHours.toFixed(1)}</span>
                <span class="stat-label">Total Hours</span>
            </div>
            <div class="stat-item">
                <span class="stat-number">${approvedTimesheets}</span>
                <span class="stat-label">Approved</span>
            </div>
        `);

        displayEmployeeProjects(result.timesheets || []);
        safeDisplay(exportSection, 'block');

    } else if (result.type === 'project') {
        currentProject = result.project;
        currentSearchType = 'project';
        currentEmployeeData = result;

        // Show project details
        safeDisplay(projectDetailsCard, 'block');
        safeInnerHTML(projectDetailsContent, `
            <div class="detail-grid">
                <div class="detail-item">
                    <span class="detail-label">Project Code:</span>
                    <span class="detail-value">${result.project.plNo}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Project Name:</span>
                    <span class="detail-value">${result.project.name}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Status:</span>
                    <span class="detail-value status-${result.project.status}">${result.project.status}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Total Hours:</span>
                    <span class="detail-value">${result.project.totalHours ? result.project.totalHours.toFixed(1) : '0.0'}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Consumed Hours:</span>
                    <span class="detail-value">${result.project.consumedHours ? result.project.consumedHours.toFixed(1) : '0.0'}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Balance Hours:</span>
                    <span class="detail-value">${result.project.balanceHours ? result.project.balanceHours.toFixed(1) : '0.0'}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Start Date:</span>
                    <span class="detail-value">${result.project.startDate ? new Date(result.project.startDate).toLocaleDateString() : 'N/A'}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">End Date:</span>
                    <span class="detail-value">${result.project.endDate ? new Date(result.project.endDate).toLocaleDateString() : 'N/A'}</span>
                </div>
            </div>
        `);

        // Show assigned employees
        if (result.assignedEmployees && result.assignedEmployees.length > 0 && projectsList) {
            projectsList.innerHTML = `
                <div class="section-title">Assigned Employees (${result.assignedEmployees.length})</div>
                ${result.assignedEmployees.map(emp => `
                    <div class="employee-item">
                        <div class="employee-info">
                            <span class="employee-name">${emp.firstName} ${emp.lastName}</span>
                            <span class="employee-id">${emp.employeeId}</span>
                            <span class="employee-department">${emp.department}</span>
                        </div>
                        <div class="employee-designation">${emp.designation || 'N/A'}</div>
                    </div>
                `).join('')}
            `;
        }

        // Show timesheets for this project
        if (result.timesheets && result.timesheets.length > 0) {
            safeDisplay(timesheetsSection, 'block');
            displayProjectTimesheets(result.timesheets);
        }

        safeDisplay(exportSection, 'block');
    } else {
        if (projectsList) {
            projectsList.innerHTML = '<div class="no-results">No results found matching your search criteria.</div>';
        }
    }
}

function displayEmployeeProjects(timesheets) {
    const projectsList = getElement('employeeProjectsList');
    const timesheetsSection = getElement('timesheetsSection');
    const timesheetsList = getElement('timesheetsList');

    if (!projectsList || !timesheetsSection || !timesheetsList) return;

    projectsList.innerHTML = '';
    timesheetsList.innerHTML = '';

    if (!timesheets || timesheets.length === 0) {
        projectsList.innerHTML = '<div class="no-projects">No timesheets found for the selected period.</div>';
        safeDisplay(timesheetsSection, 'none');
        return;
    }

    // Group timesheets by project
    const projectMap = new Map();
    
    timesheets.forEach(timesheet => {
        if (timesheet.projectSummary) {
            timesheet.projectSummary.forEach(project => {
                if (!projectMap.has(project.projectCode)) {
                    projectMap.set(project.projectCode, {
                        projectCode: project.projectCode,
                        totalHours: 0,
                        timesheets: [],
                        entries: 0
                    });
                }
                const projectData = projectMap.get(project.projectCode);
                projectData.totalHours += project.totalHours || 0;
                projectData.entries += project.entries || 0;
                projectData.timesheets.push(timesheet);
            });
        }
    });

    // Display projects
    if (projectMap.size > 0) {
        projectsList.innerHTML = `
            <div class="section-title">Projects Worked On (${projectMap.size})</div>
            ${Array.from(projectMap.values()).map(project => `
                <div class="project-item">
                    <div class="project-info">
                        <span class="project-name">${project.projectCode}</span>
                        <span class="project-hours">${project.totalHours.toFixed(1)} total hours</span>
                        <span class="project-entries">${project.entries} entries</span>
                    </div>
                    <div class="project-actions">
                        <button class="view-btn" onclick="viewProjectDetails('${project.projectCode}')">
                            <i class="fas fa-eye"></i> View Details
                        </button>
                    </div>
                </div>
            `).join('')}
        `;
    }

    // Display all timesheets
    safeDisplay(timesheetsSection, 'block');
    timesheetsList.innerHTML = `
        <div class="section-title">All Timesheets (${timesheets.length})</div>
        <div class="timesheets-grid">
            ${timesheets.map(timesheet => `
                <div class="timesheet-card status-${timesheet.status}">
                    <div class="timesheet-header">
                        <span class="timesheet-period">${timesheet.weekRange || 'N/A'}</span>
                        <span class="timesheet-status">${timesheet.status || 'unknown'}</span>
                    </div>
                    <div class="timesheet-body">
                        <div class="timesheet-hours">
                            <span class="hours-total">${timesheet.totalHours ? timesheet.totalHours.toFixed(1) : '0.0'}h</span>
                            <span class="hours-breakdown">(${timesheet.totalNormalHours ? timesheet.totalNormalHours.toFixed(1) : '0.0'} normal + ${timesheet.totalOvertimeHours ? timesheet.totalOvertimeHours.toFixed(1) : '0.0'} OT)</span>
                        </div>
                        <div class="timesheet-dates">
                            <span class="submitted-date">Submitted: ${timesheet.submittedAt ? new Date(timesheet.submittedAt).toLocaleDateString() : 'Not submitted'}</span>
                            ${timesheet.approvedAt ? `<span class="approved-date">Approved: ${new Date(timesheet.approvedAt).toLocaleDateString()}</span>` : ''}
                        </div>
                    </div>
                    <div class="timesheet-footer">
                        <button class="details-btn" onclick="viewTimesheetDetails('${timesheet._id}')">
                            <i class="fas fa-list"></i> View Entries
                        </button>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

function displayProjectTimesheets(timesheets) {
    const timesheetsList = getElement('timesheetsList');
    if (!timesheetsList) return;
    
    timesheetsList.innerHTML = `
        <div class="section-title">Timesheets for this Project (${timesheets.length})</div>
        <div class="timesheets-table">
            <table>
                <thead>
                    <tr>
                        <th>Employee</th>
                        <th>Week</th>
                        <th>Total Hours</th>
                        <th>Project Hours</th>
                        <th>Status</th>
                        <th>Submitted</th>
                    </tr>
                </thead>
                <tbody>
                    ${timesheets.map(ts => `
                        <tr>
                            <td>
                                <div class="employee-cell">
                                    <span class="employee-name">${ts.employee ? `${ts.employee.firstName} ${ts.employee.lastName}` : 'Unknown'}</span>
                                    <span class="employee-id">${ts.employee ? ts.employee.employeeId : 'N/A'}</span>
                                </div>
                            </td>
                            <td>${ts.weekRange || 'N/A'}</td>
                            <td>${ts.totalHours ? ts.totalHours.toFixed(1) : '0.0'}</td>
                            <td>${ts.projectHours ? ts.projectHours.totalHours.toFixed(1) : '0.0'}</td>
                            <td><span class="status-badge status-${ts.status}">${ts.status}</span></td>
                            <td>${ts.submittedAt ? new Date(ts.submittedAt).toLocaleDateString() : 'Not submitted'}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
}

function filterProjects() {
    const filterValue = getElement('project-filter');
    if (!filterValue) return;
    
    const filter = filterValue.value;
    const timesheetCards = document.querySelectorAll('#timesheetsList .timesheet-card');
    
    timesheetCards.forEach(card => {
        if (filter === 'all') {
            card.style.display = 'block';
        } else {
            const hasStatus = card.classList.contains(`status-${filter}`);
            card.style.display = hasStatus ? 'block' : 'none';
        }
    });
}

function applyDateFilter() {
    searchEmployee();
}

function clearDateFilter() {
    const startDate = getElement('start-date');
    const endDate = getElement('end-date');
    
    if (startDate) startDate.value = '';
    if (endDate) endDate.value = '';
    searchEmployee();
}

function clearEmployeeResults() {
    const elementsToClear = [
        'employeeDetailsCard',
        'projectDetailsCard',
        'employeeProjectsList',
        'timesheetsSection',
        'employee-export-section',
        'resultsHeader'
    ];
    
    elementsToClear.forEach(id => {
        const element = getElement(id);
        safeDisplay(element, 'none');
    });
    
    const elementsToEmpty = [
        'employeeDetailsContent',
        'projectDetailsContent',
        'employeeProjectsList',
        'timesheetsList',
        'resultsStats'
    ];
    
    elementsToEmpty.forEach(id => {
        const element = getElement(id);
        if (element) element.innerHTML = '';
    });
}

async function exportEmployeeReportToExcel() {
    try {
        showNotification('Generating Excel report...', 'info');
        
        const idPlNoInput = getElement('id-pl-no');
        const nameProjectInput = getElement('name-project');
        const startDateInput = getElement('start-date');
        const endDateInput = getElement('end-date');
        
        if (!idPlNoInput || !nameProjectInput || !startDateInput || !endDateInput) {
            showNotification('Export elements not found.', 'error');
            return;
        }
        
        const idPlNo = idPlNoInput.value.trim();
        const nameProject = nameProjectInput.value.trim();
        const startDate = startDateInput.value;
        const endDate = endDateInput.value;
        
        const reportType = currentSearchType;
        
        // Check if apiClient is available
        if (typeof apiClient === 'undefined' || !apiClient.exportEmployeeReportToExcel) {
            showNotification('Export functionality not available.', 'error');
            return;
        }
        
        const blob = await apiClient.exportEmployeeReportToExcel({
            employeeId: idPlNo,
            name: nameProject,
            plNo: idPlNo,
            startDate: startDate,
            endDate: endDate,
            reportType: reportType
        });
        
        // Create download link
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = `employee_report_${new Date().toISOString().split('T')[0]}.xlsx`;
        
        document.body.appendChild(a);
        a.click();
        
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        showNotification('Excel report downloaded successfully!', 'success');
    } catch (error) {
        console.error('Error exporting to Excel:', error);
        showNotification('Failed to generate Excel report.', 'error');
    }
}

function exportToPDF() {
    showNotification('PDF export feature would generate PDF file', 'info');
    // PDF generation logic would go here
}

function viewProjectDetails(projectCode) {
    showNotification(`Viewing details for project: ${projectCode}`, 'info');
    // Implement project details view
}

function viewTimesheetDetails(timesheetId) {
    showNotification(`Viewing details for timesheet: ${timesheetId}`, 'info');
    // Implement timesheet details view
}

function showNotification(message, type = 'info') {
    // Remove existing notifications
    const existingNotifications = document.querySelectorAll('.notification');
    existingNotifications.forEach(notification => {
        if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
        }
    });

    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
        <span>${message}</span>
    `;

    document.body.appendChild(notification);
    
    // Trigger animation
    setTimeout(() => notification.classList.add('show'), 100);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
            if (notification.parentNode) {
                document.body.removeChild(notification);
            }
        }, 300);
    }, 5000);
}

// Utility function to format numbers
function formatNumber(num, decimals = 1) {
    return parseFloat(num || 0).toFixed(decimals);
}

// Utility function to format dates
function formatDate(dateString) {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-GB');
}