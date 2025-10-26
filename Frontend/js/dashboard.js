// ==================== INTEGRATED DASHBOARD.JS ====================

document.addEventListener('DOMContentLoaded', async function() {
    console.log('🔄 Starting dashboard integration...');
    
    // Check if user is logged in
    const userData = getUserData();
    if (!userData) {
        console.log('❌ No user data found, redirecting to login...');
        window.location.href = 'index.html';
        return;
    }

    console.log('✅ User authenticated:', userData);

    // Update user info on the page
    updateUserInfo(userData);
    
    try {
        // Load data from backend
        await loadBackendData();
        
        // THEN run your existing dashboard initialization
        console.log('🚀 Starting existing dashboard initialization...');
        initializeDashboard();
        
    } catch (error) {
        console.error('❌ Failed to load backend data:', error);
        // Fallback to mock data with notification
        showNotification('Using offline mode - some features limited', 'warning');
        initializeDashboard();
    }
});

function updateUserInfo(userData) {
    try {
        // Update the employee name and code displays
        const employeeNameElement = document.getElementById('employee-name');
        const employeeCodeElement = document.getElementById('employee-code');
        const employeeNameInput = document.getElementById('employee-name-input');
        const departmentSelect = document.getElementById('department');
        
        if (employeeNameElement) {
            employeeNameElement.textContent = `${userData.firstName} ${userData.lastName}`;
        }
        if (employeeCodeElement) {
            employeeCodeElement.value = userData.employeeId;
        }
        if (employeeNameInput) {
            employeeNameInput.value = `${userData.firstName} ${userData.lastName}`;
        }
        if (departmentSelect && userData.department) {
            departmentSelect.value = userData.department;
        }
        console.log('✅ User info updated on page');
    } catch (error) {
        console.error('Error updating user info:', error);
    }
}

async function loadBackendData() {
    try {
        console.log('🔄 Loading data from backend...');
        
        // Load timesheets for summary counts
        const timesheets = await apiClient.getMyTimesheets();
        updateTimesheetCounts(timesheets);
        
        // Load user's projects
        const projects = await apiClient.getMyProjects();
        window.userProjects = projects;
        console.log('📋 Loaded projects:', projects.length);
        
        // Load activity codes for user's department
        const userData = getUserData();
        const activityCodes = await apiClient.getActivityCodes(userData.department);
        window.activityCodes = activityCodes;
        console.log('🎯 Loaded activity codes:', activityCodes.length);
        
        console.log('✅ Backend data loaded successfully');
        
    } catch (error) {
        console.error('❌ Failed to load backend data:', error);
        throw error; // Re-throw to handle in calling function
    }
}

function updateTimesheetCounts(timesheets) {
    try {
        const approvedCount = timesheets.filter(ts => ts.status === 'approved').length;
        const pendingCount = timesheets.filter(ts => ts.status === 'pending').length;
        const rejectedCount = timesheets.filter(ts => ts.status === 'rejected').length;

        // Update the counter cards if they exist
        const approvedElement = document.getElementById('approved-count');
        const pendingElement = document.getElementById('pending-count'); 
        const rejectedElement = document.getElementById('rejected-count');

        if (approvedElement) approvedElement.textContent = approvedCount;
        if (pendingElement) pendingElement.textContent = pendingCount;
        if (rejectedElement) rejectedElement.textContent = rejectedCount;
        
        console.log(`📊 Timesheet counts - Approved: ${approvedCount}, Pending: ${pendingCount}, Rejected: ${rejectedCount}`);
    } catch (error) {
        console.error('Error updating timesheet counts:', error);
    }
}
    async function exportTimesheetToCSV(timesheetId) {
    try {
        const response = await apiClient.exportTimesheetToCSV(timesheetId);
        
        // Create download link
        const blob = new Blob([response], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `timesheet-${timesheetId}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        
        showNotification('Timesheet exported successfully!', 'success');
    } catch (error) {
        console.error('Export error:', error);
        showNotification('Failed to export timesheet', 'error');
    }
}

// NEW: View timesheet history
    async function loadTimesheetHistory() {
        try {
            const timesheets = await apiClient.getMyTimesheets();
        
            // Group by year and month for organized display
            const groupedTimesheets = timesheets.reduce((acc, timesheet) => {
                const year = timesheet.year;
                const month = new Date(timesheet.weekStartDate).getMonth() + 1;
            
                if (!acc[year]) acc[year] = {};
                if (!acc[year][month]) acc[year][month] = [];
            
                acc[year][month].push(timesheet);
                return acc;
            }, {});
        
            displayTimesheetHistory(groupedTimesheets);
        } catch (error) {
            console.error('Error loading timesheet history:', error);
            showNotification('Failed to load timesheet history', 'error');
        }
    }

    // NEW: Display timesheet history in modal
    function displayTimesheetHistory(groupedTimesheets) {
        const modal = document.getElementById('history-modal');
        const content = document.getElementById('history-content');
    
        let html = '<div class="timesheet-history">';
    
        Object.keys(groupedTimesheets).sort((a, b) => b - a).forEach(year => {
            html += `<h3>${year}</h3>`;
        
            Object.keys(groupedTimesheets[year]).sort((a, b) => b - a).forEach(month => {
                const monthName = new Date(parseInt(year), parseInt(month) - 1).toLocaleString('default', { month: 'long' });
                html += `<h4>${monthName}</h4>`;
                html += '<div class="history-timesheets">';
            
                groupedTimesheets[year][month].forEach(timesheet => {
                    const statusClass = `status-${timesheet.status}`;
                    html += `
                        <div class="history-item ${statusClass}">
                            <div class="history-info">
                                <span class="week-range">
                                    Week ${timesheet.weekNumber}: ${new Date(timesheet.weekStartDate).toLocaleDateString()} - ${new Date(timesheet.weekEndDate).toLocaleDateString()}
                                </span>
                                <span class="total-hours">Total: ${timesheet.totalHours} hrs</span>
                                <span class="timesheet-status ${statusClass}">${timesheet.status}</span>
                            </div>
                            <div class="history-actions">
                                <button class="btn-small btn-view" onclick="viewTimesheetDetails('${timesheet._id}')">
                                    <i class="fas fa-eye"></i> View
                                </button>
                                <button class="btn-small btn-export" onclick="exportTimesheetToCSV('${timesheet._id}')">
                                    <i class="fas fa-download"></i> Export
                                </button>
                            </div>
                        </div>
                    `;
                });
            
                html += '</div>';
            });
        });
    
        html += '</div>';
        content.innerHTML = html;
        modal.style.display = 'block';
    }

    // NEW: View timesheet details
    async function viewTimesheetDetails(timesheetId) {
        try {
            const timesheet = await apiClient.getTimesheetById(timesheetId);
            displayTimesheetDetails(timesheet);
        } catch (error) {
            console.error('Error loading timesheet details:', error);
            showNotification('Failed to load timesheet details', 'error');
        }
    }

    // Add this to your initializeDashboard function
    
function initializeDashboard() {
    console.log('🎯 Initializing dashboard components...');
    
    // Get employee code from authenticated user
    const userData = getUserData();
    const employeeCode = userData.employeeId;

    // Sample timesheet status data (replace with actual DB/API data)
    const timesheetLogs = [
        { employee: employeeCode, date: new Date().toISOString().split('T')[0], status: 'Pending' }
    ];
    

    // Handle Summary card click
    const summaryCard = document.getElementById('summary-card');
    if (summaryCard) {
        summaryCard.addEventListener('click', function () {
            showTimesheetSummary(employeeCode, timesheetLogs);
        });
    }

    // Close summary modal
    document.querySelectorAll('#summary-modal .close-modal').forEach(btn => {
        btn.addEventListener('click', () => {
            document.getElementById('summary-modal').style.display = 'none';
        });
    });

    // Set employee information
    document.getElementById('employee-code').value = employeeCode;
    document.getElementById('employee-name').textContent = `${userData.firstName} ${userData.lastName}`;
    document.getElementById('employee-name-input').value = `${userData.firstName} ${userData.lastName}`;

    // Set editing permissions for logged-in employee only
    updateEditingPermissions(employeeCode);
    
    // Map full department to select value
    function mapDepartmentToSelectValue(department) {
        if (!department) return 'Select';
        const departments = [
            'Project', 'Process', 'Loss and Prevention', 'Electrical', 
            'Business Development', 'Admin/Accounts', 'HR', 'QRA', 'IT'
        ];
        if (departments.includes(department)) return department;
        return 'Select';
    }
 
    const departmentValue = userData.department;
    document.getElementById('department').value = departmentValue && departmentValue !== '' ? 
        mapDepartmentToSelectValue(departmentValue) : 'Select';
    
    // Set default dates for the current week
    setDefaultWeekDates();

    // Update day dates and disabled cells
    updateDayDates();

    // Add event listeners for date changes
    document.getElementById('week-start-date').addEventListener('change', updateDayDates);
    document.getElementById('week-end-date').addEventListener('change', updateDayDates);

    // Show access denied modal when admin button is clicked
    document.getElementById('admin-btn').addEventListener('click', function() {
        const modal = document.getElementById('access-denied-modal');
        modal.style.display = 'block';
    });

    // Show access denied modal when projects button is clicked
    document.getElementById('projects-btn').addEventListener('click', function() {
        const modal = document.getElementById('access-denied-modal');
        modal.style.display = 'block';
    });
    const historyBtn = document.getElementById('history-btn');
        if (historyBtn) {
            historyBtn.addEventListener('click', loadTimesheetHistory);
        }

    // Close access denied modal when clicking the close button
    document.getElementById('close-access-modal').addEventListener('click', function() {
        document.getElementById('access-denied-modal').style.display = 'none';
    });

    // Close modal when clicking outside
    window.addEventListener('click', function(e) {
        const modal = document.getElementById('access-denied-modal');
        if (e.target === modal) {
            modal.style.display = 'none';
        }
    });

    // Close modal when clicking the X in modal content
    document.querySelectorAll('.close-modal').forEach(closeBtn => {
        closeBtn.addEventListener('click', function() {
            const modal = this.closest('.modal');
            if (modal) {
                modal.style.display = 'none';
            }
        });
    });

    // Initialize timesheet table
    initializeTimesheetTable();

    // Toggle sidebar
    document.getElementById('toggle-sidebar').addEventListener('click', function() {
        document.querySelector('.dashboard-container').classList.toggle('sidebar-collapsed');
    });

    // Save timesheet button functionality
    document.getElementById('save-timesheet-btn').addEventListener('click', async function() {
        await saveTimesheet();
    });

    // Submit timesheet button functionality
    document.getElementById('submit-timesheet-btn').addEventListener('click', async function() {
        await submitTimesheet();
    });

    // Add row button functionality
    document.getElementById('add-row-btn').addEventListener('click', function() {
        addTimesheetRow();
    });

    // Hours modal functionality
    const hoursModal = document.getElementById('hours-modal');
    const closeModal = document.querySelector('.close-modal');
    const hoursForm = document.getElementById('hours-form');
    
    let currentCell = null;

    // Close modal when clicking the X
    if (closeModal) {
       closeModal.addEventListener('click', function() {
         hoursModal.style.display = 'none';
       });
   }

    // Close modal when clicking outside
    window.addEventListener('click', function(e) {
        if (e.target === hoursModal) {
            hoursModal.style.display = 'none';
        }
    });

    // Handle hours form submission
    hoursForm.addEventListener('submit', function(e) {
        e.preventDefault();
        saveHoursToCell();
    });

    // Handle delete row functionality
    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('delete-row-btn')) {
            if (confirm('Are you sure you want to delete this row?')) {
                const row = e.target.closest('tr');
                row.remove();
                updateRowNumbers();
                updateTotals();
            }
        }
    });

    console.log('✅ Dashboard initialization complete');
}

// Enhanced activity code population using backend data
function populateActivityCodesWithBackendData() {
    try {
        const employeeDept = getUserData()?.department;
        
        if (!employeeDept) {
            console.warn('No department found for employee');
            return populateActivityCodes(); // Fallback to your existing function
        }

        const activityCodeSelect = document.getElementById('activity-code');
        if (!activityCodeSelect) return;

        // Clear existing options except the first one
        while (activityCodeSelect.children.length > 1) {
            activityCodeSelect.removeChild(activityCodeSelect.lastChild);
        }

        // Use REAL data from backend instead of hardcoded data
        const departmentCodes = window.activityCodes?.filter(code => code.department === employeeDept) || [];

        // Add department-specific activity codes
        departmentCodes.forEach(activity => {
            const option = document.createElement('option');
            option.value = activity.code;
            option.textContent = `${activity.code} - ${activity.name}`;
            activityCodeSelect.appendChild(option);
        });

        // Add Miscellaneous Activity option
        const miscOption = document.createElement('option');
        miscOption.value = 'MISC';
        miscOption.textContent = 'Miscellaneous Activity';
        activityCodeSelect.appendChild(miscOption);
        
        console.log(`✅ Populated ${departmentCodes.length} activity codes for ${employeeDept}`);
    } catch (error) {
        console.error('Error populating activity codes:', error);
        // Fallback to original function
        if (typeof populateActivityCodes === 'function') {
            populateActivityCodes();
        }
    }
}

// Enhanced project dropdown population
function populateProjectDropdownWithBackendData() {
    try {
        const projectSelects = document.querySelectorAll('select');
        projectSelects.forEach(select => {
            // Check if this is a project dropdown
            if (select.innerHTML.includes('PROJ001') || select.id === 'project-select') {
                // Clear existing options
                select.innerHTML = '<option value="">Select</option>';
                
                // Add real projects
                if (window.userProjects && window.userProjects.length > 0) {
                    window.userProjects.forEach(project => {
                        const option = document.createElement('option');
                        option.value = project.projectCode || project._id;
                        option.textContent = project.name || `Project ${project.projectCode}`;
                        select.appendChild(option);
                    });
                }
                
                // Add default options
                const defaultOptions = ['Miscellaneous Activity', 'Holiday', 'Leave'];
                defaultOptions.forEach(opt => {
                    const option = document.createElement('option');
                    option.value = opt;
                    option.textContent = opt;
                    select.appendChild(option);
                });
            }
        });
    } catch (error) {
        console.error('Error populating project dropdown:', error);
    }
}

// Override your existing populateActivityCodes function if it exists
if (typeof populateActivityCodes === 'function') {
    const originalPopulateActivityCodes = populateActivityCodes;
    window.populateActivityCodes = function() {
        // Try backend first, fallback to original
        if (window.activityCodes && window.activityCodes.length > 0) {
            populateActivityCodesWithBackendData();
        } else {
            originalPopulateActivityCodes();
        }
    };
}

// Enhanced hours modal opening with backend data
if (typeof openHoursModal === 'function') {
    const originalOpenHoursModal = openHoursModal;
    window.openHoursModal = function(cell) {
        // Populate with backend data first
        populateActivityCodesWithBackendData();
        // Then call original function
        originalOpenHoursModal(cell);
    };
}

// NEW: Save timesheet to backend
async function saveTimesheet() {
    try {
        const timesheetData = collectTimesheetData();
        
        // Validate data
        if (!timesheetData.weekStartDate || !timesheetData.weekEndDate) {
            showNotification('Please set week dates', 'error');
            return;
        }

        if (timesheetData.entries.length === 0) {
            showNotification('Please add at least one timesheet entry', 'error');
            return;
        }

        // Show loading state
        const saveButton = document.getElementById('save-timesheet-btn');
        const originalText = saveButton.innerHTML;
        saveButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
        saveButton.disabled = true;

        // Save to backend (you might need to create this endpoint)
        // For now, we'll store locally and show success
        localStorage.setItem('draftTimesheet', JSON.stringify(timesheetData));
        
        // Re-enable button
        setTimeout(() => {
            saveButton.innerHTML = originalText;
            saveButton.disabled = false;
            showNotification('Timesheet saved as draft successfully!', 'success');
        }, 1000);

    } catch (error) {
        console.error('Error saving timesheet:', error);
        showNotification('Failed to save timesheet', 'error');
    }
}

// NEW: Submit timesheet to backend
async function submitTimesheet() {
    try {
        const timesheetData = collectTimesheetData();
        
        // Validate data
        if (!timesheetData.weekStartDate || !timesheetData.weekEndDate) {
            showNotification('Please set week dates', 'error');
            return;
        }

        if (timesheetData.entries.length === 0) {
            showNotification('Please add at least one timesheet entry', 'error');
            return;
        }

        // Show loading state
        const submitButton = document.getElementById('submit-timesheet-btn');
        const originalText = submitButton.innerHTML;
        submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Submitting...';
        submitButton.disabled = true;

        // Submit to backend
        const result = await apiClient.submitTimesheet(timesheetData);
        
        showNotification('Timesheet submitted successfully!', 'success');
        
        // Reset form
        initializeTimesheetTable();
        updateTotals();

        // Re-enable button
        submitButton.innerHTML = originalText;
        submitButton.disabled = false;

    } catch (error) {
        console.error('Error submitting timesheet:', error);
        showNotification(error.message || 'Failed to submit timesheet', 'error');
        
        // Re-enable button on error
        const submitButton = document.getElementById('submit-timesheet-btn');
        submitButton.innerHTML = '<i class="fas fa-check"></i> Submit Timesheet';
        submitButton.disabled = false;
    }
}

// NEW: Collect timesheet data for submission
function collectTimesheetData() {
    const userData = getUserData();
    const timesheetBody = document.getElementById('timesheet-body');
    const rows = timesheetBody.querySelectorAll('tr');
    
    const entries = [];
    
    rows.forEach(row => {
        const projectSelect = row.querySelector('select');
        const locationInput = row.querySelector('input[type="text"]');
        const dayCells = row.querySelectorAll('.time-cell');
        
        if (projectSelect && projectSelect.value) {
            const weekStartDate = document.getElementById('week-start-date').value;
            const weekEndDate = document.getElementById('week-end-date').value;
            
            // Create entry for each day with hours
            const days = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
            days.forEach((day, index) => {
                const dayCell = dayCells[index];
                if (dayCell) {
                    const normalHours = parseFloat(dayCell.getAttribute('data-normal-hours')) || 0;
                    const overtimeHours = parseFloat(dayCell.getAttribute('data-overtime-hours')) || 0;
                    const activityCode = dayCell.getAttribute('data-activity-code');
                    
                    if (normalHours > 0 || overtimeHours > 0) {
                        // Calculate date for this day
                        const date = new Date(weekStartDate);
                        date.setDate(date.getDate() + index);
                        
                        entries.push({
                            date: date.toISOString().split('T')[0],
                            projectCode: projectSelect.value,
                            location: locationInput?.value || '',
                            normalHours: normalHours,
                            overtimeHours: overtimeHours,
                            activityCode: activityCode || 'MISC'
                        });
                    }
                }
            });
        }
    });
    
    return {
        employee: userData.id,
        employeeCode: userData.employeeId,
        weekStartDate: document.getElementById('week-start-date').value,
        weekEndDate: document.getElementById('week-end-date').value,
        entries: entries
    };
}

// NEW: Show timesheet summary with real data
function showTimesheetSummary(employeeCode, timesheetLogs) {
    const modal = document.getElementById('summary-modal');
    const summaryContent = document.getElementById('summary-content');
    summaryContent.innerHTML = ''; // Clear old content

    const now = new Date();
    // Calculate Monday of current week
    const dayOfWeek = now.getDay(); // 0 (Sun) to 6 (Sat)
    const monday = new Date(now);
    monday.setDate(now.getDate() - ((dayOfWeek + 6) % 7)); // Adjust to Monday

    // Generate dates for the week (Mon to Sun)
    const weekDates = [];
    for (let i = 0; i < 7; i++) {
        const d = new Date(monday);
        d.setDate(monday.getDate() + i);
        weekDates.push(d);
    }

    // Map logs by date string for quick lookup
    const employeeLogs = timesheetLogs.filter(log => log.employee === employeeCode);
    const logMap = {};
    employeeLogs.forEach(log => {
        logMap[log.date] = log.status;
    });

    // Generate summary for each day of the week as a calendar grid
    let calendarHTML = '<div class="summary-calendar">';
    calendarHTML += '<div class="summary-calendar-header">';
    const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    dayNames.forEach(dayName => {
        calendarHTML += `<div class="summary-calendar-dayname">${dayName}</div>`;
    });
    calendarHTML += '</div>';

    calendarHTML += '<div class="summary-calendar-body">';
    weekDates.forEach(date => {
        const dateStr = date.toISOString().split('T')[0];
        const displayDate = date.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit' });
        const status = logMap[dateStr] || 'No Entry';
        let statusClass = '';
        if (status === 'Approved') statusClass = 'status-approved';
        else if (status === 'Pending') statusClass = 'status-pending';
        else if (status === 'Rejected') statusClass = 'status-rejected';
        else statusClass = 'status-no-entry';

        calendarHTML += `
            <div class="summary-calendar-cell">
                <div class="summary-date">${displayDate}</div>
                <div class="summary-status ${statusClass}">${status}</div>
            </div>
        `;
    });
    calendarHTML += '</div>';
    calendarHTML += '</div>';

    summaryContent.innerHTML = calendarHTML;
    modal.style.display = 'block';
}

// NEW: Save hours to cell (enhanced version)
function saveHoursToCell() {
    if (!currentCell) return;

    const hoursType = document.getElementById('hours-type').value;
    const enteredHours = parseFloat(document.getElementById('work-hours').value) || 0;
    const activityCode = document.getElementById('activity-code').value;
    const remark = document.getElementById('work-remark').value;

    if (enteredHours === 0 || !activityCode) {
        showNotification('Please enter hours and activity code', 'error');
        return;
    }

    // Get existing hours from the cell
    let normalHours = parseFloat(currentCell.getAttribute('data-normal-hours')) || 0;
    let overtimeHours = parseFloat(currentCell.getAttribute('data-overtime-hours')) || 0;

    // Update only the selected hours type, preserve the other
    if (hoursType === 'normal') {
        normalHours = enteredHours;
    } else if (hoursType === 'overtime') {
        overtimeHours = enteredHours;
    }

    // Update the cell with the combined hours values
    currentCell.innerHTML = `<span class="normal-hours">${normalHours}</span>/<span class="overtime-hours">${overtimeHours}</span>`;
    currentCell.setAttribute('data-normal-hours', normalHours);
    currentCell.setAttribute('data-overtime-hours', overtimeHours);
    currentCell.setAttribute('data-activity-code', activityCode);
    currentCell.classList.add('has-hours');

    // Store remark if provided
    if (remark) {
        currentCell.setAttribute('data-remark', remark);
    }

    // Update totals
    updateTotals();

    // Close the modal
    document.getElementById('hours-modal').style.display = 'none';
    
    showNotification('Hours saved successfully', 'success');
}

// ==================== YOUR EXISTING FUNCTIONS (KEEP THESE) ====================

// Function to enable or disable editing based on permission
function updateEditingPermissions(viewedEmployeeCode) {
    const userData = getUserData();
    const isOwner = viewedEmployeeCode === userData.employeeId;
    
    // Employee Code and Name inputs
    document.getElementById('employee-code').readOnly = !isOwner;
    document.getElementById('employee-name-input').readOnly = !isOwner;

    // Timesheet inputs and selects
    const timesheetBody = document.getElementById('timesheet-body');
    const inputs = timesheetBody.querySelectorAll('input, select, button');
    inputs.forEach(input => {
        input.disabled = !isOwner;
    });

    // Save and Submit buttons
    document.getElementById('save-timesheet-btn').disabled = !isOwner;
    document.getElementById('submit-timesheet-btn').disabled = !isOwner;
    document.getElementById('add-row-btn').disabled = !isOwner;
}

// Function to set default week dates
function setDefaultWeekDates() {
    const today = new Date();
    const currentDay = today.getDay(); // 0 = Sunday, 1 = Monday, ...
    
    // Calculate the date of Monday (start of week)
    const mondayOffset = currentDay === 0 ? -6 : 1 - currentDay;
    const monday = new Date(today);
    monday.setDate(today.getDate() + mondayOffset);
    
    // Calculate the date of Sunday (end of week)
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    
    // Format dates for input fields (YYYY-MM-DD)
    const formatDate = (date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };
    
    document.getElementById('week-start-date').value = formatDate(monday);
    document.getElementById('week-end-date').value = formatDate(sunday);
}

// Function to initialize timesheet table
function initializeTimesheetTable() {
    const timesheetBody = document.getElementById('timesheet-body');
    
    // Clear existing rows
    timesheetBody.innerHTML = '';
    
    // Add initial rows
    for (let i = 0; i < 3; i++) {
        addTimesheetRow();
    }
}

// Function to add a new timesheet row
function addTimesheetRow() {
    const timesheetBody = document.getElementById('timesheet-body');
    const rowCount = timesheetBody.children.length;
    const row = document.createElement('tr');

     // Serial Number
    const srCell = document.createElement('td');
    srCell.textContent = rowCount + 1;
    row.appendChild(srCell);

    // Project Code
    const projectCell = document.createElement('td');
    const projectSelect = document.createElement('select');

    // Get logged in employee department
    const userData = getUserData();
    const employeeDept = userData?.department;

    if (employeeDept === "IT" || employeeDept === "HR") {
        // Restrict options to Department, Holiday, Leave, Misc
        projectSelect.innerHTML = `
         <option value="">Select</option>
         <option value="Miscellaneous Activity">Miscellaneous Activity</option>
         <option value="Holiday">Holiday</option>
         <option value="Leave">Leave</option>
         <option value="${employeeDept}">${employeeDept}</option>
        `;
    } else {
        // Use real projects from backend or fallback
        projectSelect.innerHTML = `
         <option value="">Select</option>
         <option value="Miscellaneous Activity">Miscellaneous Activity</option>
         <option value="Holiday">Holiday</option>
         <option value="Leave">Leave</option>
        `;
        
        // Add real projects if available
        if (window.userProjects && window.userProjects.length > 0) {
            window.userProjects.forEach(project => {
                const option = document.createElement('option');
                option.value = project.projectCode || project._id;
                option.textContent = project.name || `Project ${project.projectCode}`;
                projectSelect.appendChild(option);
            });
        }
    }

    projectCell.appendChild(projectSelect);
    row.appendChild(projectCell);

    // Location
    const locationCell = document.createElement('td');
    const locationInput = document.createElement('input');
    locationInput.type = 'text';
    locationInput.placeholder = 'Enter location';
    locationCell.appendChild(locationInput);
    row.appendChild(locationCell);

    // Days (Mon-Sun)
    const days = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
    days.forEach(day => {
      const dayCell = document.createElement('td');
      dayCell.className = 'time-cell';
      dayCell.innerHTML = '<span class="normal-hours">0</span>/<span class="overtime-hours">0</span>';
      dayCell.setAttribute('data-day', day);
      dayCell.setAttribute('data-normal-hours', '0');
      dayCell.setAttribute('data-overtime-hours', '0');
      dayCell.setAttribute('data-activity-code', '');
      dayCell.addEventListener('click', function() {
        currentCell = this;
        populateActivityCodesWithBackendData();
        document.getElementById('hours-modal').style.display = 'block';
      });
      row.appendChild(dayCell);
   });

    // Action
    const actionCell = document.createElement('td');
    const deleteBtn = document.createElement('i');
    deleteBtn.className = 'fas fa-trash delete-row-btn';
    deleteBtn.title = 'Delete Row';
    actionCell.appendChild(deleteBtn);
    row.appendChild(actionCell);

    timesheetBody.appendChild(row);
    updateRowNumbers();
}

// Function to populate activity codes based on employee's department (fallback)
function populateActivityCodes() {
    const userData = getUserData();
    const employeeDept = userData?.department;

    if (!employeeDept) {
        console.warn('No department found for employee:', userData.employeeId);
        return;
    }

    // Your existing hardcoded activity codes logic here...
    // This is now just a fallback if backend data fails
}

// Function to open hours modal
function openHoursModal(cell) {
    currentCell = cell;
    populateActivityCodesWithBackendData();

    // Reset form
    const normalHours = parseFloat(cell.getAttribute('data-normal-hours')) || 0;
    const overtimeHours = parseFloat(cell.getAttribute('data-overtime-hours')) || 0;
    const activityCode = cell.getAttribute('data-activity-code') || '';
    const remark = cell.getAttribute('data-remark') || '';

    // Determine which hours type to show based on existing data
    if (normalHours > 0) {
        document.getElementById('hours-type').value = 'normal';
        document.getElementById('work-hours').value = normalHours;
    } else if (overtimeHours > 0) {
        document.getElementById('hours-type').value = 'overtime';
        document.getElementById('work-hours').value = overtimeHours;
    } else {
        document.getElementById('hours-type').value = 'normal';
        document.getElementById('work-hours').value = '0';
    }

    document.getElementById('activity-code').value = activityCode;
    document.getElementById('work-remark').value = remark;

    // Show modal
    document.getElementById('hours-modal').style.display = 'block';
}

// Function to update totals
function updateTotals() {
    const days = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
    let weekTotalNormal = 0;
    let weekTotalOvertime = 0;
    
    days.forEach(day => {
        const cells = document.querySelectorAll(`.time-cell[data-day="${day}"]`);
        let totalNormal = 0;
        let totalOvertime = 0;
        
        cells.forEach(cell => {
            const normalHours = parseFloat(cell.getAttribute('data-normal-hours')) || 0;
            const overtimeHours = parseFloat(cell.getAttribute('data-overtime-hours')) || 0;
            totalNormal += normalHours;
            totalOvertime += overtimeHours;
        });
        
        const totalElement = document.getElementById(`total-${day}`);
        if (totalElement) {
            totalElement.querySelector('.normal-hours').textContent = totalNormal;
            totalElement.querySelector('.overtime-hours').textContent = totalOvertime;
        }
        
        weekTotalNormal += totalNormal;
        weekTotalOvertime += totalOvertime;
    });
    
    // Update week total
    const weekTotalElement = document.getElementById('total-week');
    if (weekTotalElement) {
        weekTotalElement.innerHTML = `<span class="normal-hours">${weekTotalNormal}</span>/<span class="overtime-hours">${weekTotalOvertime}</span>`;
    }
}

// Function to update row numbers after deletion
function updateRowNumbers() {
    const rows = document.querySelectorAll('#timesheet-body tr');
    rows.forEach((row, index) => {
        row.cells[0].textContent = index + 1;
    });
}

// Function to update day dates based on start date
function updateDayDates() {
    const startDateInput = document.getElementById('week-start-date').value;
    if (!startDateInput) return;

    const startDate = new Date(startDateInput);
    const startDay = startDate.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat

    // Adjust to Monday=0, Sunday=6
    let adjustedStartDay = startDay - 1;
    if (adjustedStartDay < 0) adjustedStartDay = 6;

    const days = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
    for (let i = 0; i < days.length; i++) {
        const date = new Date(startDate);
        date.setDate(startDate.getDate() + (i - adjustedStartDay));
        const dateStr = date.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit' });
        const dateElement = document.getElementById(`date-${days[i]}`);
        if (dateElement) {
            dateElement.textContent = dateStr;
        }
    }

    updateDisabledCells(adjustedStartDay);
}

// Function to update disabled state of time cells
function updateDisabledCells(startDayIndex) {
    const days = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
    days.forEach((day, index) => {
        const cells = document.querySelectorAll(`.time-cell[data-day="${day}"]`);
        cells.forEach(cell => {
            if (index < startDayIndex) {
                cell.classList.add('disabled');
                cell.style.pointerEvents = 'none';
                cell.style.opacity = '0.5';
            } else {
                cell.classList.remove('disabled');
                cell.style.pointerEvents = 'auto';
                cell.style.opacity = '1';
            }
        });
    });
}

// ==================== END OF INTEGRATED DASHBOARD.JS ====================