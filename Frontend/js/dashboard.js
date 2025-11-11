// ==================== DASHBOARD.JS - COMPLETE REWRITE ====================

// Global variables
let currentCell = null;
let userData = null;

document.addEventListener('DOMContentLoaded', async function() {
    console.log('🚀 Starting dashboard initialization...');
    
    // Check authentication
    if (!checkAuthentication()) {
        return;
    }

    try {
        // Initialize all components
        await initializeDashboard();
        console.log('✅ Dashboard initialized successfully');
    } catch (error) {
        console.error('❌ Dashboard initialization failed:', error);
        showNotification('Failed to initialize dashboard', 'error');
    }
});

// Check if user is authenticated
function checkAuthentication() {
    userData = getUserData();
    const token = localStorage.getItem('authToken');
    
    if (!token || !userData) {
        console.log('❌ No authentication found, redirecting to login...');
        window.location.href = 'index.html';
        return false;
    }
    
    console.log('✅ User authenticated:', userData);
    return true;
}

// Main initialization function
async function initializeDashboard() {
    showLoading(true);
    
    try {
        // Update UI with user data
        updateUserInfo();
        
        // Set up event listeners
        setupEventListeners();
        
        // Set default dates
        setDefaultWeekDates();
        
        // Initialize timesheet table
        initializeTimesheetTable();
        
        // Load backend data
        await loadBackendData();
        
        // Update day dates
        updateDayDates();
        
    } catch (error) {
        console.error('Error in dashboard initialization:', error);
        showNotification('Error initializing dashboard', 'error');
    } finally {
        showLoading(false);
    }
}

// Update user information in the UI
function updateUserInfo() {
    if (!userData) return;
    
    const elements = {
        'employee-name': `${userData.firstName} ${userData.lastName}`,
        'employee-code': userData.employeeId,
        'employee-name-input': `${userData.firstName} ${userData.lastName}`
    };
    
    for (const [id, value] of Object.entries(elements)) {
        const element = document.getElementById(id);
        if (element) {
            if (element.tagName === 'INPUT') {
                element.value = value;
            } else {
                element.textContent = value;
            }
        }
    }
    
    // Set department if available
    const departmentSelect = document.getElementById('department');
    if (departmentSelect && userData.department) {
        departmentSelect.value = userData.department;
    }
}

// Set up all event listeners
function setupEventListeners() {
    // Sidebar toggle
    document.getElementById('toggle-sidebar').addEventListener('click', toggleSidebar);
    
    // Logout
    document.getElementById('logout-btn').addEventListener('click', handleLogout);
    
    // Date changes
    document.getElementById('week-start-date').addEventListener('change', updateDayDates);
    document.getElementById('week-end-date').addEventListener('change', updateDayDates);
    
    // Form actions
    document.getElementById('add-row-btn').addEventListener('click', addTimesheetRow);
    document.getElementById('save-timesheet-btn').addEventListener('click', saveTimesheet);
    document.getElementById('submit-timesheet-btn').addEventListener('click', submitTimesheet);
    
    // History and admin buttons
    document.getElementById('history-btn').addEventListener('click', showHistoryModal);
    document.getElementById('summary-history-btn').addEventListener('click', showHistoryModal);
    document.getElementById('admin-btn').addEventListener('click', showAccessDenied);
    document.getElementById('projects-btn').addEventListener('click', showAccessDenied);
    
    // Modal handlers
    setupModalHandlers();
    
    console.log('✅ Event listeners set up');
}

// Setup modal event handlers
function setupModalHandlers() {
    // Close modals when clicking X or outside
    document.querySelectorAll('.close-modal').forEach(btn => {
        btn.addEventListener('click', function() {
            hideAllModals();
        });
    });
    
    // Hours form submission
    document.getElementById('hours-form').addEventListener('submit', function(e) {
        e.preventDefault();
        saveHoursToCell();
    });
    
    // Close modals with Escape key
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            hideAllModals();
        }
    });
}

// Toggle sidebar
function toggleSidebar() {
    document.querySelector('.dashboard-container').classList.toggle('sidebar-collapsed');
}

// Handle logout
function handleLogout() {
    if (confirm('Are you sure you want to logout?')) {
        // Clear all stored data
        localStorage.removeItem('authToken');
        localStorage.removeItem('userData');
        localStorage.removeItem('rememberMe');
        
        // Clear API client token
        if (window.apiClient) {
            apiClient.logout();
        }
        
        // Redirect to login
        window.location.href = 'index.html';
    }
}

// Show loading spinner
function showLoading(show) {
    const spinner = document.getElementById('loading-spinner');
    if (spinner) {
        spinner.style.display = show ? 'flex' : 'none';
    }
}

// Hide all modals
function hideAllModals() {
    document.querySelectorAll('.modal').forEach(modal => {
        modal.style.display = 'none';
    });
}

// Show access denied modal
function showAccessDenied() {
    document.getElementById('access-denied-modal').style.display = 'block';
}

// ==================== TIMESHEET TABLE MANAGEMENT ====================

// Initialize timesheet table with empty rows
function initializeTimesheetTable() {
    const timesheetBody = document.getElementById('timesheet-body');
    timesheetBody.innerHTML = '';
    
    // Add 3 initial empty rows
    for (let i = 0; i < 3; i++) {
        addTimesheetRow();
    }
    
    updateTotals();
}

// Add a new timesheet row
function addTimesheetRow() {
    const timesheetBody = document.getElementById('timesheet-body');
    const rowCount = timesheetBody.children.length;
    
    const row = document.createElement('tr');
    row.innerHTML = `
        <td>${rowCount + 1}</td>
        <td>
            <select class="project-select">
                <option value="">Select Project</option>
                <option value="PROJ001">PROJ001 - Website Development</option>
                <option value="PROJ002">PROJ002 - Mobile App</option>
                <option value="PROJ003">PROJ003 - Database Upgrade</option>
                <option value="MISC">MISC - Miscellaneous</option>
                <option value="HOLIDAY">HOLIDAY - Holiday</option>
                <option value="LEAVE">LEAVE - Leave</option>
            </select>
        </td>
        <td>
            <input type="text" class="location-input" placeholder="Enter location">
        </td>
        ${['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'].map(day => `
            <td class="time-cell" data-day="${day}" data-normal-hours="0" data-overtime-hours="0" data-activity-code="">
                <span class="normal-hours">0</span>/<span class="overtime-hours">0</span>
            </td>
        `).join('')}
        <td>
            <i class="fas fa-trash delete-row-btn" title="Delete Row"></i>
        </td>
    `;
    
    timesheetBody.appendChild(row);
    
    // Add event listeners to new cells
    row.querySelectorAll('.time-cell').forEach(cell => {
        cell.addEventListener('click', function() {
            openHoursModal(this);
        });
    });
    
    // Add delete row functionality
    row.querySelector('.delete-row-btn').addEventListener('click', function() {
        if (confirm('Are you sure you want to delete this row?')) {
            row.remove();
            updateRowNumbers();
            updateTotals();
        }
    });
    
    updateRowNumbers();
}

// Update row numbers after changes
function updateRowNumbers() {
    const rows = document.querySelectorAll('#timesheet-body tr');
    rows.forEach((row, index) => {
        row.cells[0].textContent = index + 1;
    });
}

// ==================== HOURS ENTRY MODAL ====================

// Open hours entry modal
function openHoursModal(cell) {
    currentCell = cell;
    const day = cell.getAttribute('data-day');
    
    // Get current values
    const normalHours = parseFloat(cell.getAttribute('data-normal-hours')) || 0;
    const overtimeHours = parseFloat(cell.getAttribute('data-overtime-hours')) || 0;
    const activityCode = cell.getAttribute('data-activity-code') || '';
    const remark = cell.getAttribute('data-remark') || '';
    
    // Set form values
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
    
    // Show available hours info
    updateAvailableHoursInfo(day);
    
    // Show modal
    document.getElementById('hours-modal').style.display = 'block';
}

// Update available hours information
function updateAvailableHoursInfo(day) {
    const dailyTotal = getDailyTotal(day);
    const availableNormal = Math.max(0, 8 - dailyTotal.normal);
    const infoElement = document.getElementById('available-hours-info');
    
    if (availableNormal <= 0) {
        infoElement.innerHTML = `
            <div class="warning-info">
                <i class="fas fa-exclamation-triangle"></i>
                No normal hours available for ${day.toUpperCase()}. All hours will be overtime.
            </div>
        `;
        infoElement.style.display = 'block';
        document.getElementById('hours-type').value = 'overtime';
        document.getElementById('hours-type').disabled = true;
    } else {
        infoElement.innerHTML = `
            <div class="info-message">
                <i class="fas fa-info-circle"></i>
                ${availableNormal.toFixed(1)} normal hours available for ${day.toUpperCase()} (max 8 per day)
            </div>
        `;
        infoElement.style.display = 'block';
        document.getElementById('hours-type').disabled = false;
    }
}

// Save hours to cell
function saveHoursToCell() {
    if (!currentCell) return;
    
    const hoursType = document.getElementById('hours-type').value;
    const enteredHours = parseFloat(document.getElementById('work-hours').value) || 0;
    const activityCode = document.getElementById('activity-code').value;
    const remark = document.getElementById('work-remark').value;
    
    if (enteredHours === 0 || !activityCode) {
        showNotification('Please enter hours and select activity code', 'error');
        return;
    }
    
    if (enteredHours > 24) {
        showNotification('Hours cannot exceed 24 per day', 'error');
        return;
    }
    
    let normalHours = 0;
    let overtimeHours = 0;
    
    if (hoursType === 'normal') {
        normalHours = enteredHours;
    } else {
        overtimeHours = enteredHours;
    }
    
    // Update cell
    currentCell.innerHTML = `<span class="normal-hours">${normalHours}</span>/<span class="overtime-hours">${overtimeHours}</span>`;
    currentCell.setAttribute('data-normal-hours', normalHours);
    currentCell.setAttribute('data-overtime-hours', overtimeHours);
    currentCell.setAttribute('data-activity-code', activityCode);
    
    if (remark) {
        currentCell.setAttribute('data-remark', remark);
    }
    
    currentCell.classList.add('has-hours');
    
    // Close modal and update totals
    hideAllModals();
    updateTotals();
    validateDailyHours();
    
    showNotification('Hours saved successfully', 'success');
}

// Get daily total for a specific day
function getDailyTotal(day) {
    const dayCells = document.querySelectorAll(`.time-cell[data-day="${day}"]`);
    let normal = 0;
    let overtime = 0;
    
    dayCells.forEach(cell => {
        normal += parseFloat(cell.getAttribute('data-normal-hours')) || 0;
        overtime += parseFloat(cell.getAttribute('data-overtime-hours')) || 0;
    });
    
    return { normal, overtime, total: normal + overtime };
}

// Validate and adjust daily hours (8-hour normal limit)
function validateDailyHours() {
    const days = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
    let adjustmentsMade = false;
    
    days.forEach(day => {
        const dailyTotal = getDailyTotal(day);
        
        if (dailyTotal.normal > 8) {
            const excessHours = dailyTotal.normal - 8;
            adjustDailyHours(day, excessHours);
            adjustmentsMade = true;
        }
    });
    
    if (adjustmentsMade) {
        showNotification('Hours adjusted to comply with daily limits (max 8 normal hours)', 'warning');
        updateTotals();
    }
}

// Adjust hours for a specific day
function adjustDailyHours(day, excessHours) {
    const dayCells = document.querySelectorAll(`.time-cell[data-day="${day}"]`);
    let remainingExcess = excessHours;
    
    dayCells.forEach(cell => {
        if (remainingExcess <= 0) return;
        
        const currentNormal = parseFloat(cell.getAttribute('data-normal-hours')) || 0;
        
        if (currentNormal > 0) {
            const reduction = Math.min(currentNormal, remainingExcess);
            const newNormal = currentNormal - reduction;
            const currentOvertime = parseFloat(cell.getAttribute('data-overtime-hours')) || 0;
            const newOvertime = currentOvertime + reduction;
            
            // Update cell
            cell.setAttribute('data-normal-hours', newNormal);
            cell.setAttribute('data-overtime-hours', newOvertime);
            cell.innerHTML = `<span class="normal-hours">${newNormal}</span>/<span class="overtime-hours">${newOvertime}</span>`;
            
            remainingExcess -= reduction;
        }
    });
}

// ==================== DATE MANAGEMENT ====================

// Set default week dates (current week)
function setDefaultWeekDates() {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    
    const monday = new Date(today);
    monday.setDate(today.getDate() + diffToMonday);
    
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    
    document.getElementById('week-start-date').value = formatDateForInput(monday);
    document.getElementById('week-end-date').value = formatDateForInput(sunday);
}

// Format date for input field (YYYY-MM-DD)
function formatDateForInput(date) {
    return date.toISOString().split('T')[0];
}

// Update day dates based on week start date
function updateDayDates() {
    const startDateInput = document.getElementById('week-start-date').value;
    if (!startDateInput) return;
    
    const startDate = new Date(startDateInput);
    const days = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
    
    days.forEach((day, index) => {
        const date = new Date(startDate);
        date.setDate(startDate.getDate() + index);
        
        const dateElement = document.getElementById(`date-${day}`);
        if (dateElement) {
            dateElement.textContent = date.toLocaleDateString('en-GB', { 
                day: '2-digit', 
                month: '2-digit' 
            });
        }
    });
}

// ==================== TOTALS CALCULATION ====================

// Update all totals
function updateTotals() {
    const days = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
    let weekNormal = 0;
    let weekOvertime = 0;
    
    days.forEach(day => {
        const dailyTotal = getDailyTotal(day);
        const totalElement = document.getElementById(`total-${day}`);
        
        if (totalElement) {
            totalElement.innerHTML = `
                <span class="normal-hours">${dailyTotal.normal}</span>/
                <span class="overtime-hours">${dailyTotal.overtime}</span>
            `;
        }
        
        weekNormal += dailyTotal.normal;
        weekOvertime += dailyTotal.overtime;
    });
    
    // Update week total
    const weekTotalElement = document.getElementById('total-week');
    if (weekTotalElement) {
        weekTotalElement.innerHTML = `
            <strong>
                <span class="normal-hours">${weekNormal}</span>/
                <span class="overtime-hours">${weekOvertime}</span>
            </strong>
        `;
    }
}

// ==================== BACKEND INTEGRATION ====================

// Load data from backend
async function loadBackendData() {
    try {
        console.log('🔄 Loading backend data...');
        
        // Load timesheets for summary
        const timesheets = await apiClient.getMyTimesheets();
        updateTimesheetCounts(timesheets);
        
        // Load projects
        const projects = await apiClient.getMyProjects();
        window.userProjects = projects || [];
        
        // Load activity codes
        const activityCodes = await apiClient.getActivityCodes(userData.department);
        window.activityCodes = activityCodes || [];
        
        console.log('✅ Backend data loaded successfully');
        
    } catch (error) {
        console.warn('Could not load backend data, using offline mode:', error);
        showNotification('Using offline mode - some features limited', 'warning');
        
        // Set default data
        window.userProjects = [];
        window.activityCodes = [];
    }
}

// Update timesheet counts in summary cards
function updateTimesheetCounts(timesheets) {
    if (!timesheets || !Array.isArray(timesheets)) {
        timesheets = [];
    }
    
    const approvedCount = timesheets.filter(ts => ts.status === 'approved').length;
    const pendingCount = timesheets.filter(ts => ts.status === 'pending').length;
    const rejectedCount = timesheets.filter(ts => ts.status === 'rejected').length;
    
    document.getElementById('approved-count').textContent = approvedCount;
    document.getElementById('pending-count').textContent = pendingCount;
    document.getElementById('rejected-count').textContent = rejectedCount;
}

// ==================== TIMESHEET SUBMISSION ====================

// Save timesheet as draft
async function saveTimesheet() {
    try {
        const timesheetData = collectTimesheetData();
        
        if (timesheetData.entries.length === 0) {
            showNotification('Please add at least one timesheet entry', 'error');
            return;
        }
        
        // Save to localStorage as draft
        localStorage.setItem('draftTimesheet', JSON.stringify(timesheetData));
        showNotification('Timesheet saved as draft successfully!', 'success');
        
    } catch (error) {
        console.error('Error saving timesheet:', error);
        showNotification('Failed to save timesheet', 'error');
    }
}

// Submit timesheet
async function submitTimesheet() {
    try {
        const timesheetData = collectTimesheetData();
        
        // Validation
        if (!timesheetData.weekStartDate || !timesheetData.weekEndDate) {
            showNotification('Please set week dates', 'error');
            return;
        }
        
        if (timesheetData.entries.length === 0) {
            showNotification('Please add at least one timesheet entry', 'error');
            return;
        }
        
        // Validate daily limits
        validateDailyHours();
        
        // Show loading
        const submitButton = document.getElementById('submit-timesheet-btn');
        const originalText = submitButton.innerHTML;
        submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Submitting...';
        submitButton.disabled = true;
        
        // Submit to backend
        const result = await apiClient.submitTimesheet(timesheetData);
        
        // Clear draft
        localStorage.removeItem('draftTimesheet');
        
        // Reset form
        initializeTimesheetTable();
        updateTotals();
        
        showNotification('Timesheet submitted successfully!', 'success');
        
        // Reload timesheet counts
        const timesheets = await apiClient.getMyTimesheets();
        updateTimesheetCounts(timesheets);
        
    } catch (error) {
        console.error('Error submitting timesheet:', error);
        showNotification(error.message || 'Failed to submit timesheet', 'error');
    } finally {
        // Reset button state
        const submitButton = document.getElementById('submit-timesheet-btn');
        submitButton.innerHTML = '<i class="fas fa-check"></i> Submit Timesheet';
        submitButton.disabled = false;
    }
}

// Collect timesheet data for submission
function collectTimesheetData() {
    const timesheetBody = document.getElementById('timesheet-body');
    const rows = timesheetBody.querySelectorAll('tr');
    const entries = [];
    
    rows.forEach(row => {
        const projectSelect = row.querySelector('.project-select');
        const locationInput = row.querySelector('.location-input');
        const dayCells = row.querySelectorAll('.time-cell');
        
        if (projectSelect && projectSelect.value) {
            const weekStartDate = document.getElementById('week-start-date').value;
            
            ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'].forEach((day, index) => {
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
                            dayOfWeek: day,
                            projectCode: projectSelect.value,
                            location: locationInput?.value || '',
                            normalHours: normalHours,
                            overtimeHours: overtimeHours,
                            activityCode: activityCode || 'MISC',
                            remarks: dayCell.getAttribute('data-remark') || ''
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

// ==================== HISTORY MODAL ====================

// Show history modal
async function showHistoryModal() {
    try {
        showLoading(true);
        
        const timesheets = await apiClient.getMyTimesheets();
        displayHistoryContent(timesheets);
        
        document.getElementById('history-modal').style.display = 'block';
        
    } catch (error) {
        console.error('Error loading history:', error);
        showNotification('Failed to load timesheet history', 'error');
    } finally {
        showLoading(false);
    }
}

// Display history content
function displayHistoryContent(timesheets) {
    const historyContent = document.getElementById('history-content');
    
    if (!timesheets || timesheets.length === 0) {
        historyContent.innerHTML = `
            <div class="no-history">
                <i class="fas fa-inbox fa-3x"></i>
                <h3>No Timesheets Found</h3>
                <p>You haven't submitted any timesheets yet.</p>
            </div>
        `;
        return;
    }
    
    let html = '<div class="history-list">';
    
    timesheets.forEach(timesheet => {
        const statusClass = `status-${timesheet.status}`;
        const weekStart = new Date(timesheet.weekStartDate).toLocaleDateString();
        const weekEnd = new Date(timesheet.weekEndDate).toLocaleDateString();
        
        html += `
            <div class="history-item ${statusClass}">
                <div class="history-info">
                    <div class="week-range">
                        <strong>Week ${timesheet.weekNumber}</strong>: ${weekStart} - ${weekEnd}
                    </div>
                    <div class="hours-info">
                        Total: ${timesheet.totalHours || 0} hrs 
                        (Normal: ${timesheet.totalNormalHours || 0}, Overtime: ${timesheet.totalOvertimeHours || 0})
                    </div>
                    <div class="timesheet-status ${statusClass}">
                        ${timesheet.status.toUpperCase()}
                    </div>
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
    historyContent.innerHTML = html;
}

// View timesheet details
async function viewTimesheetDetails(timesheetId) {
    try {
        const timesheet = await apiClient.getTimesheetById(timesheetId);
        alert(`Timesheet Details:\n\nWeek: ${timesheet.weekNumber}\nStatus: ${timesheet.status}\nTotal Hours: ${timesheet.totalHours}\n\nFull details coming soon...`);
    } catch (error) {
        console.error('Error loading timesheet details:', error);
        showNotification('Failed to load timesheet details', 'error');
    }
}

// Export timesheet to CSV
async function exportTimesheetToCSV(timesheetId) {
    try {
        const csvData = await apiClient.exportTimesheetToCSV(timesheetId);
        
        // Create download link
        const blob = new Blob([csvData], { type: 'text/csv' });
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

// ==================== UTILITY FUNCTIONS ====================

// Show notification
function showNotification(message, type = 'info') {
    if (typeof window.showNotification === 'function') {
        window.showNotification(message, type);
    } else {
        // Fallback notification
        alert(`${type.toUpperCase()}: ${message}`);
    }
}

// Get user data
function getUserData() {
    try {
        const userData = localStorage.getItem('userData');
        return userData ? JSON.parse(userData) : null;
    } catch (error) {
        console.error('Error getting user data:', error);
        return null;
    }
}

console.log('✅ Dashboard.js loaded successfully');