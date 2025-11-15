// ==================== DASHBOARD.JS - ENHANCED WITH DATE RESTRICTIONS & DEPARTMENT FIX ====================

// Global variables
let currentCell = null;
let userData = null;
let assignedProjects = [];
let isLoading = false;
let hasPendingRejectedTimesheets = false;

// Safe notification function
function safeNotification(message, type = 'info') {
    console.log(`📢 ${type.toUpperCase()}: ${message}`);
    
    // Simple DOM notification
    try {
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 12px 16px;
            background: ${type === 'error' ? '#f8d7da' : type === 'success' ? '#d4edda' : '#d1ecf1'};
            border: 1px solid ${type === 'error' ? '#f5c6cb' : type === 'success' ? '#c3e6cb' : '#bee5eb'};
            border-radius: 4px;
            color: ${type === 'error' ? '#721c24' : type === 'success' ? '#155724' : '#0c5460'};
            z-index: 10000;
            font-family: Arial, sans-serif;
            max-width: 300px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        `;
        notification.textContent = message;
        document.body.appendChild(notification);
        
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 5000);
    } catch (domError) {
        // Fallback to alert for critical errors
        if (type === 'error' && typeof alert === 'function') {
            alert(`${type.toUpperCase()}: ${message}`);
        }
    }
}

// Convert short day names to full day names for backend validation
function getFullDayName(shortDay) {
    const dayMap = {
        'mon': 'monday',
        'tue': 'tuesday', 
        'wed': 'wednesday',
        'thu': 'thursday',
        'fri': 'friday',
        'sat': 'saturday',
        'sun': 'sunday'
    };
    return dayMap[shortDay] || shortDay;
}

// ✅ NEW: Check if date is in future
function isFutureDate(day) {
    const startDate = new Date(document.getElementById('week-start-date').value);
    const dayIndex = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'].indexOf(day);
    const cellDate = new Date(startDate);
    cellDate.setDate(startDate.getDate() + dayIndex);
    
    const today = new Date();
    today.setHours(23, 59, 59, 999); // End of today
    
    return cellDate > today;
}

// ✅ NEW: Check for pending rejected timesheets
async function checkPendingRejectedTimesheets() {
    try {
        const timesheets = await apiClient.getMyTimesheets();
        const now = new Date();
        const fifteenDaysAgo = new Date(now.setDate(now.getDate() - 15));
        
        const pendingRejected = timesheets.filter(ts => 
            ts.status === 'rejected' && 
            new Date(ts.submittedAt) > fifteenDaysAgo
        );
        
        hasPendingRejectedTimesheets = pendingRejected.length > 0;
        
        if (hasPendingRejectedTimesheets) {
            showPendingRejectedWarning(pendingRejected.length);
        }
        
        return hasPendingRejectedTimesheets;
    } catch (error) {
        console.warn('Could not check pending rejected timesheets:', error);
        return false;
    }
}

// ✅ NEW: Show warning for pending rejected timesheets
function showPendingRejectedWarning(count) {
    const warningDiv = document.createElement('div');
    warningDiv.id = 'pending-rejected-warning';
    warningDiv.style.cssText = `
        background: #fff3cd;
        border: 1px solid #ffeaa7;
        color: #856404;
        padding: 12px;
        margin: 10px 0;
        border-radius: 4px;
        display: flex;
        align-items: center;
        justify-content: space-between;
    `;
    
    warningDiv.innerHTML = `
        <div style="display: flex; align-items: center;">
            <i class="fas fa-exclamation-triangle" style="margin-right: 10px;"></i>
            <span>You have ${count} rejected timesheet(s) that need attention. Please resolve them to submit new timesheets.</span>
        </div>
        <button id="view-rejected-btn" class="btn btn-warning btn-sm">
            <i class="fas fa-eye"></i> View Rejected
        </button>
    `;
    
    const formHeader = document.querySelector('.form-header');
    if (formHeader) {
        formHeader.parentNode.insertBefore(warningDiv, formHeader.nextSibling);
    }
    
    // Add event listener to view rejected button
    document.getElementById('view-rejected-btn').addEventListener('click', showRejectedTimesheetsModal);
}

// ✅ NEW: Show rejected timesheets in modal
function showRejectedTimesheetsModal() {
    // This would open a modal showing rejected timesheets with edit options
    safeNotification('Rejected timesheets view feature will be implemented in next version', 'info');
}

// Loading state management
function setLoadingState(loading) {
    isLoading = loading;
    const buttons = document.querySelectorAll('button:not(.close-modal)');
    buttons.forEach(btn => {
        btn.disabled = loading;
    });
    
    // Show/hide loading spinner
    const spinner = document.getElementById('loading-spinner');
    if (spinner) {
        spinner.style.display = loading ? 'flex' : 'none';
    }
    
    // Update submit button text
    const submitButton = document.getElementById('submit-timesheet-btn');
    if (submitButton) {
        if (loading) {
            submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Submitting...';
        } else {
            submitButton.innerHTML = '<i class="fas fa-check"></i> Submit Timesheet';
        }
    }
}

document.addEventListener('DOMContentLoaded', async function() {
    console.log('🚀 Starting dashboard initialization...');
    
    // Check authentication
    if (!checkAuthentication()) {
        return;
    }

    try {
        await initializeDashboard();
        console.log('✅ Dashboard initialized successfully');
    } catch (error) {
        console.error('❌ Dashboard initialization failed:', error);
        safeNotification('Failed to initialize dashboard', 'error');
    }
});

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

async function initializeDashboard() {
    setLoadingState(true);
    
    try {
        updateUserInfo();
        setupEventListeners();
        setDefaultWeekDates();
        initializeTimesheetTable();
        await loadBackendData();
        updateDayDates();
        loadDraftTimesheet();
        await checkPendingRejectedTimesheets(); // ✅ NEW: Check for rejected timesheets
    } catch (error) {
        console.error('Error in dashboard initialization:', error);
        safeNotification('Error initializing dashboard', 'error');
    } finally {
        setLoadingState(false);
    }
}

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
    
    // ✅ FIXED: Remove dropdown and display department directly
    const departmentSelect = document.getElementById('department');
    if (departmentSelect && userData.department) {
        // Replace dropdown with display text
        const departmentGroup = departmentSelect.closest('.info-group');
        if (departmentGroup) {
            departmentGroup.innerHTML = `
                <label for="department-display">Department</label>
                <input type="text" id="department-display" value="${userData.department}" readonly style="background: #f8f9fa; border: 1px solid #ced4da; padding: 8px; border-radius: 4px;">
            `;
        }
    }
}

function setupEventListeners() {
    // Sidebar toggle
    document.getElementById('toggle-sidebar').addEventListener('click', toggleSidebar);
    
    // Logout
    document.getElementById('logout-btn').addEventListener('click', handleLogout);
    
    // Date changes
    document.getElementById('week-start-date').addEventListener('change', handleDateChange);
    document.getElementById('week-end-date').addEventListener('change', handleDateChange);
    
    // Form actions
    document.getElementById('add-row-btn').addEventListener('click', addTimesheetRow);
    document.getElementById('save-timesheet-btn').addEventListener('click', saveTimesheet);
    document.getElementById('submit-timesheet-btn').addEventListener('click', submitTimesheet);
    
    // History and admin buttons
    document.getElementById('history-btn').addEventListener('click', showHistoryModal);
    document.getElementById('summary-history-btn').addEventListener('click', showHistoryModal);
    document.getElementById('admin-btn').addEventListener('click', showAccessDenied);
    document.getElementById('projects-btn').addEventListener('click', showAccessDenied);
    document.getElementById('employee-projects-btn').addEventListener('click', showEmployeeProjects);
    
    setupModalHandlers();
    console.log('✅ Event listeners set up');
}

function handleDateChange() {
    const startDate = document.getElementById('week-start-date').value;
    const endDate = document.getElementById('week-end-date').value;
    
    if (startDate && endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        
        const diffTime = Math.abs(end - start);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays !== 6) {
            safeNotification('Week should be exactly 7 days (Monday to Sunday)', 'warning');
            const correctedEnd = new Date(start);
            correctedEnd.setDate(start.getDate() + 6);
            document.getElementById('week-end-date').value = formatDateForInput(correctedEnd);
        }
        
        updateDayDates();
        updateDateCellStates(); // ✅ NEW: Update cell states when dates change
    }
}

function setupModalHandlers() {
    document.querySelectorAll('.close-modal').forEach(btn => {
        btn.addEventListener('click', function() {
            hideAllModals();
        });
    });
    
    document.getElementById('hours-form').addEventListener('submit', function(e) {
        e.preventDefault();
        saveHoursToCell();
    });
    
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            hideAllModals();
        }
    });
    
    const workHoursInput = document.getElementById('work-hours');
    if (workHoursInput) {
        workHoursInput.addEventListener('input', function(e) {
            let value = parseFloat(e.target.value);
            if (isNaN(value)) value = 0;
            if (value < 0) e.target.value = 0;
            if (value > 24) e.target.value = 24;
            e.target.value = Math.round(value * 2) / 2;
        });
    }
}

function toggleSidebar() {
    document.querySelector('.dashboard-container').classList.toggle('sidebar-collapsed');
}

function handleLogout() {
    if (confirm('Are you sure you want to logout?')) {
        saveDraftSilently();
        localStorage.removeItem('authToken');
        localStorage.removeItem('userData');
        localStorage.removeItem('rememberMe');
        window.location.href = 'index.html';
    }
}

function saveDraftSilently() {
    try {
        const timesheetData = collectTimesheetData();
        if (timesheetData.entries.length > 0) {
            localStorage.setItem('draftTimesheet', JSON.stringify({
                ...timesheetData,
                savedAt: new Date().toISOString()
            }));
        }
    } catch (error) {
        console.warn('Could not save draft silently:', error);
    }
}

function hideAllModals() {
    document.querySelectorAll('.modal').forEach(modal => {
        modal.style.display = 'none';
    });
    currentCell = null;
}

function showAccessDenied() {
    document.getElementById('access-denied-modal').style.display = 'block';
}

function showEmployeeProjects() {
    if (assignedProjects.length === 0) {
        safeNotification('No projects assigned to you', 'info');
        return;
    }
    
    const projectList = assignedProjects.map(project => 
        `• ${project.plNo} - ${project.name} (${project.status})`
    ).join('\n');
    
    alert(`Your Assigned Projects:\n\n${projectList}`);
}

// ==================== TIMESHEET TABLE MANAGEMENT ====================

function initializeTimesheetTable() {
    const timesheetBody = document.getElementById('timesheet-body');
    timesheetBody.innerHTML = '';
    
    for (let i = 0; i < 3; i++) {
        addTimesheetRow();
    }
    
    updateTotals();
    updateFormStatus('draft');
    updateDateCellStates(); // ✅ NEW: Set initial cell states
}

function addTimesheetRow() {
    if (isLoading) return;
    
    // ✅ NEW: Check if blocked by pending rejected timesheets
    if (hasPendingRejectedTimesheets) {
        safeNotification('Please resolve your rejected timesheets before adding new rows', 'error');
        return;
    }
    
    const timesheetBody = document.getElementById('timesheet-body');
    const rowCount = timesheetBody.children.length;
    
    if (rowCount >= 20) {
        safeNotification('Maximum 20 rows allowed per timesheet', 'warning');
        return;
    }
    
    const row = document.createElement('tr');
    row.innerHTML = `
        <td>${rowCount + 1}</td>
        <td>
            <select class="project-select" required>
                <option value="">Select Project</option>
            </select>
        </td>
        <td>
            <input type="text" class="location-input" placeholder="Enter location" maxlength="100">
        </td>
        ${['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'].map(day => `
            <td class="time-cell" data-day="${day}" data-normal-hours="0" data-overtime-hours="0" data-activity-code="">
                <span class="normal-hours">0</span>/<span class="overtime-hours">0</span>
            </td>
        `).join('')}
        <td>
            <button class="delete-row-btn" title="Delete Row" ${isLoading ? 'disabled' : ''}>
                <i class="fas fa-trash"></i>
            </button>
        </td>
    `;
    
    timesheetBody.appendChild(row);
    updateProjectDropdown(row.querySelector('.project-select'));
    
    row.querySelectorAll('.time-cell').forEach(cell => {
        cell.addEventListener('click', function() {
            if (!isLoading) openHoursModal(this);
        });
    });
    
    row.querySelector('.delete-row-btn').addEventListener('click', function() {
        if (!isLoading && confirm('Are you sure you want to delete this row?')) {
            row.remove();
            updateRowNumbers();
            updateTotals();
        }
    });
    
    updateRowNumbers();
    updateDateCellStates(); // ✅ NEW: Update cell states for new row
    safeNotification('New row added', 'success');
}

// ✅ NEW: Update date cell states based on current date
function updateDateCellStates() {
    const timeCells = document.querySelectorAll('.time-cell');
    timeCells.forEach(cell => {
        const day = cell.getAttribute('data-day');
        if (isFutureDate(day)) {
            cell.classList.add('future-date');
            cell.style.opacity = '0.5';
            cell.style.cursor = 'not-allowed';
            cell.title = 'Cannot enter hours for future dates';
        } else {
            cell.classList.remove('future-date');
            cell.style.opacity = '1';
            cell.style.cursor = 'pointer';
            cell.title = 'Click to enter hours';
        }
    });
}

function updateProjectDropdown(projectSelect) {
    if (!projectSelect) return;
    
    const firstOption = projectSelect.querySelector('option[value=""]');
    projectSelect.innerHTML = '';
    if (firstOption) {
        projectSelect.appendChild(firstOption);
    } else {
        projectSelect.innerHTML = '<option value="">Select Project</option>';
    }
    
    if (assignedProjects && assignedProjects.length > 0) {
        assignedProjects.forEach(project => {
            if (project.status === 'active') {
                const option = document.createElement('option');
                option.value = project.plNo;
                option.textContent = `${project.plNo} - ${project.name}`;
                option.setAttribute('data-project-id', project._id);
                projectSelect.appendChild(option);
            }
        });
        
        const standardOptions = [
            { value: 'MISC', text: 'MISC - Miscellaneous' },
            { value: 'HOLIDAY', text: 'HOLIDAY - Holiday' },
            { value: 'LEAVE', text: 'LEAVE - Leave' }
        ];
        
        standardOptions.forEach(opt => {
            const option = document.createElement('option');
            option.value = opt.value;
            option.textContent = opt.text;
            projectSelect.appendChild(option);
        });
    } else {
        const standardOptions = [
            { value: 'MISC', text: 'MISC - Miscellaneous' },
            { value: 'HOLIDAY', text: 'HOLIDAY - Holiday' },
            { value: 'LEAVE', text: 'LEAVE - Leave' }
        ];
        
        standardOptions.forEach(opt => {
            const option = document.createElement('option');
            option.value = opt.value;
            option.textContent = opt.text;
            projectSelect.appendChild(option);
        });
    }
}

function updateRowNumbers() {
    const rows = document.querySelectorAll('#timesheet-body tr');
    rows.forEach((row, index) => {
        row.cells[0].textContent = index + 1;
    });
}

// ==================== HOURS ENTRY MODAL ====================

function openHoursModal(cell) {
    if (isLoading) return;
    
    // ✅ NEW: Check if this is a future date
    const day = cell.getAttribute('data-day');
    if (isFutureDate(day)) {
        safeNotification('Cannot enter hours for future dates', 'warning');
        return;
    }
    
    // ✅ NEW: Check if blocked by pending rejected timesheets
    if (hasPendingRejectedTimesheets) {
        safeNotification('Please resolve your rejected timesheets before entering hours', 'error');
        return;
    }
    
    currentCell = cell;
    
    const normalHours = parseFloat(cell.getAttribute('data-normal-hours')) || 0;
    const overtimeHours = parseFloat(cell.getAttribute('data-overtime-hours')) || 0;
    const activityCode = cell.getAttribute('data-activity-code') || '';
    const remark = cell.getAttribute('data-remark') || '';
    
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
    
    updateAvailableHoursInfo(day);
    document.getElementById('hours-modal').style.display = 'block';
    
    setTimeout(() => {
        document.getElementById('work-hours').focus();
    }, 100);
}

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

function saveHoursToCell() {
    if (!currentCell || isLoading) return;
    
    const hoursType = document.getElementById('hours-type').value;
    const enteredHours = parseFloat(document.getElementById('work-hours').value) || 0;
    const activityCode = document.getElementById('activity-code').value;
    const remark = document.getElementById('work-remark').value.trim();
    
    if (enteredHours === 0) {
        safeNotification('Please enter hours greater than 0', 'error');
        return;
    }
    
    if (!activityCode) {
        safeNotification('Please select activity code', 'error');
        return;
    }
    
    if (enteredHours > 24) {
        safeNotification('Hours cannot exceed 24 per day', 'error');
        return;
    }
    
    if (enteredHours % 0.5 !== 0) {
        safeNotification('Hours must be in 0.5 hour increments', 'error');
        return;
    }
    
    let normalHours = 0;
    let overtimeHours = 0;
    
    if (hoursType === 'normal') {
        normalHours = enteredHours;
    } else {
        overtimeHours = enteredHours;
    }
    
    currentCell.innerHTML = `<span class="normal-hours">${normalHours}</span>/<span class="overtime-hours">${overtimeHours}</span>`;
    currentCell.setAttribute('data-normal-hours', normalHours);
    currentCell.setAttribute('data-overtime-hours', overtimeHours);
    currentCell.setAttribute('data-activity-code', activityCode);
    
    if (remark) {
        currentCell.setAttribute('data-remark', remark);
    }
    
    currentCell.classList.add('has-hours');
    
    hideAllModals();
    updateTotals();
    validateDailyHours();
    
    safeNotification('Hours saved successfully', 'success');
    saveDraftSilently();
}

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
        
        if (dailyTotal.total > 24) {
            safeNotification(`Warning: ${day.toUpperCase()} has ${dailyTotal.total}h (max 24h)`, 'warning');
        }
    });
    
    if (adjustmentsMade) {
        safeNotification('Hours adjusted to comply with daily limits', 'warning');
        updateTotals();
    }
}

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
            
            cell.setAttribute('data-normal-hours', newNormal);
            cell.setAttribute('data-overtime-hours', newOvertime);
            cell.innerHTML = `<span class="normal-hours">${newNormal}</span>/<span class="overtime-hours">${newOvertime}</span>`;
            
            remainingExcess -= reduction;
        }
    });
}

// ==================== DATE MANAGEMENT ====================

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

function formatDateForInput(date) {
    return date.toISOString().split('T')[0];
}

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

function updateTotals() {
    const days = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
    let weekNormal = 0;
    let weekOvertime = 0;
    
    days.forEach(day => {
        const dailyTotal = getDailyTotal(day);
        const totalElement = document.getElementById(`total-${day}`);
        
        if (totalElement) {
            totalElement.innerHTML = `
                <span class="normal-hours">${dailyTotal.normal.toFixed(1)}</span>/
                <span class="overtime-hours">${dailyTotal.overtime.toFixed(1)}</span>
            `;
        }
        
        weekNormal += dailyTotal.normal;
        weekOvertime += dailyTotal.overtime;
    });
    
    const weekTotalElement = document.getElementById('total-week');
    if (weekTotalElement) {
        weekTotalElement.innerHTML = `
            <strong>
                <span class="normal-hours">${weekNormal.toFixed(1)}</span>/
                <span class="overtime-hours">${weekOvertime.toFixed(1)}</span>
            </strong>
        `;
    }
    
    const hasEntries = document.querySelectorAll('.time-cell.has-hours').length > 0;
    updateFormStatus(hasEntries ? 'draft' : 'empty');
}

function updateFormStatus(status) {
    const statusElement = document.getElementById('form-status');
    if (!statusElement) return;
    
    const statusMap = {
        'empty': { text: 'Empty', class: 'status-empty' },
        'draft': { text: 'Draft', class: 'status-draft' },
        'saved': { text: 'Saved', class: 'status-saved' },
        'submitted': { text: 'Submitted', class: 'status-submitted' }
    };
    
    const statusInfo = statusMap[status] || statusMap['empty'];
    statusElement.innerHTML = `<span class="${statusInfo.class}">${statusInfo.text}</span>`;
}

// ==================== BACKEND INTEGRATION ====================

async function loadBackendData() {
    setLoadingState(true);
    try {
        console.log('🔄 Loading backend data...');
        
        const timesheets = await apiClient.getMyTimesheets();
        updateTimesheetCounts(timesheets);
        
        console.log('📋 Loading assigned projects for employee...');
        assignedProjects = await apiClient.getMyProjects();
        console.log(`✅ Loaded ${assignedProjects?.length || 0} assigned projects`);
        
        updateAllProjectDropdowns();
        
        const activityCodes = await apiClient.getActivityCodes(userData.department);
        window.activityCodes = activityCodes || [];
        
        console.log('✅ Backend data loaded successfully');
        
    } catch (error) {
        console.warn('Could not load backend data, using offline mode:', error);
        safeNotification('Using offline mode - some features limited', 'warning');
        
        assignedProjects = [];
        window.activityCodes = [];
    } finally {
        setLoadingState(false);
    }
}

function updateAllProjectDropdowns() {
    console.log('🔄 Updating all project dropdowns in timesheet...');
    const projectSelects = document.querySelectorAll('.project-select');
    projectSelects.forEach(select => {
        updateProjectDropdown(select);
    });
}

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

async function saveTimesheet() {
    if (isLoading) return;
    
    try {
        const timesheetData = collectTimesheetData();
        
        if (timesheetData.entries.length === 0) {
            safeNotification('Please add at least one timesheet entry before saving', 'warning');
            return;
        }
        
        localStorage.setItem('draftTimesheet', JSON.stringify({
            ...timesheetData,
            savedAt: new Date().toISOString()
        }));
        
        updateFormStatus('saved');
        safeNotification('Timesheet saved as draft successfully!', 'success');
        
    } catch (error) {
        console.error('Error saving timesheet:', error);
        safeNotification('Failed to save timesheet', 'error');
    }
}

async function submitTimesheet() {
    if (isLoading) return;
    
    // ✅ NEW: Check if blocked by pending rejected timesheets
    if (hasPendingRejectedTimesheets) {
        safeNotification('Please resolve your rejected timesheets before submitting new timesheets', 'error');
        return;
    }
    
    try {
        const timesheetData = collectTimesheetData();
        
        if (!timesheetData.weekStartDate || !timesheetData.weekEndDate) {
            safeNotification('Please set week dates', 'error');
            return;
        }
        
        if (timesheetData.entries.length === 0) {
            safeNotification('Please add at least one timesheet entry', 'error');
            return;
        }

        // ✅ NEW: Validate no future dates in backend style
        const today = new Date();
        today.setHours(23, 59, 59, 999);
        const futureEntries = timesheetData.entries.filter(entry => {
            const entryDate = new Date(entry.date);
            return entryDate > today;
        });
        
        if (futureEntries.length > 0) {
            safeNotification('Cannot submit timesheet with future dates', 'error');
            return;
        }

        if (!confirm(`Submit timesheet for ${timesheetData.weekStartDate} to ${timesheetData.weekEndDate}?`)) {
            return;
        }
        
        setLoadingState(true);
        
        console.log('📤 Submitting timesheet data:', timesheetData);
        
        const result = await apiClient.submitTimesheet(timesheetData);
        
        localStorage.removeItem('draftTimesheet');
        
        initializeTimesheetTable();
        updateTotals();
        
        safeNotification('Timesheet submitted successfully! It is now pending approval.', 'success');
        
        const timesheets = await apiClient.getMyTimesheets();
        updateTimesheetCounts(timesheets);
        
    } catch (error) {
        console.error('Error submitting timesheet:', error);
        
        // ✅ NEW: Specific error for future dates from backend
        if (error.message && error.message.includes('future dates')) {
            safeNotification(error.message, 'error');
        } else {
            safeNotification(error.message || 'Failed to submit timesheet. Please check your entries.', 'error');
        }
    } finally {
        setLoadingState(false);
    }
}

function loadDraftTimesheet() {
    try {
        const draftData = localStorage.getItem('draftTimesheet');
        if (!draftData) return;
        
        const draft = JSON.parse(draftData);
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
        
        if (new Date(draft.savedAt) < oneWeekAgo) {
            localStorage.removeItem('draftTimesheet');
            return;
        }
        
        const currentStartDate = document.getElementById('week-start-date').value;
        if (draft.weekStartDate === currentStartDate) {
            if (confirm('Found a saved draft for this week. Would you like to load it?')) {
                safeNotification('Draft loaded successfully', 'success');
                updateFormStatus('saved');
            }
        }
    } catch (error) {
        console.warn('Error loading draft:', error);
        localStorage.removeItem('draftTimesheet');
    }
}

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
                        const date = new Date(weekStartDate);
                        date.setDate(date.getDate() + index);
                        
                        const fullDayName = getFullDayName(day);
                        const projectId = projectSelect.querySelector(`option[value="${projectSelect.value}"]`)?.getAttribute('data-project-id');
                        
                        entries.push({
                            date: date.toISOString().split('T')[0],
                            dayOfWeek: fullDayName,
                            projectCode: projectSelect.value,
                            project: projectId || null,
                            location: locationInput?.value || '',
                            normalHours: normalHours,
                            overtimeHours: overtimeHours,
                            activityCode: activityCode || 'MISC',
                            remarks: dayCell.getAttribute('data-remark') || '',
                            department: userData.department
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

// ==================== UTILITY FUNCTIONS ====================

function getUserData() {
    try {
        const userData = localStorage.getItem('userData');
        return userData ? JSON.parse(userData) : null;
    } catch (error) {
        console.error('Error getting user data:', error);
        return null;
    }
}

// Auto-save draft when leaving page
window.addEventListener('beforeunload', function(e) {
    const timesheetData = collectTimesheetData();
    if (timesheetData.entries.length > 0) {
        saveDraftSilently();
    }
});

// ==================== HISTORY MODAL ====================

async function showHistoryModal() {
    if (isLoading) return;
    
    setLoadingState(true);
    try {
        const timesheets = await apiClient.getMyTimesheets();
        displayHistoryContent(timesheets);
        document.getElementById('history-modal').style.display = 'block';
    } catch (error) {
        console.error('Error loading history:', error);
        safeNotification('Failed to load timesheet history', 'error');
    } finally {
        setLoadingState(false);
    }
}

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
                        Total: ${(timesheet.totalHours || 0).toFixed(1)} hrs 
                        (Normal: ${timesheet.totalNormalHours || 0}, Overtime: ${timesheet.totalOvertimeHours || 0})
                    </div>
                    <div class="timesheet-status ${statusClass}">
                        ${timesheet.status.toUpperCase()}
                    </div>
                </div>
                <div class="history-actions">
                    <button class="btn-small btn-view" onclick="viewTimesheetDetails('${timesheet._id}')" ${isLoading ? 'disabled' : ''}>
                        <i class="fas fa-eye"></i> View
                    </button>
                    <button class="btn-small btn-export" onclick="exportTimesheetToCSV('${timesheet._id}')" ${isLoading ? 'disabled' : ''}>
                        <i class="fas fa-download"></i> Export
                    </button>
                </div>
            </div>
        `;
    });
    
    html += '</div>';
    historyContent.innerHTML = html;
}

async function viewTimesheetDetails(timesheetId) {
    if (isLoading) return;
    
    try {
        const timesheet = await apiClient.getTimesheetById(timesheetId);
        alert(`Timesheet Details:\n\nWeek: ${timesheet.weekNumber}\nStatus: ${timesheet.status}\nTotal Hours: ${timesheet.totalHours}\n\nFull details coming soon...`);
    } catch (error) {
        console.error('Error loading timesheet details:', error);
        safeNotification('Failed to load timesheet details', 'error');
    }
}

async function exportTimesheetToCSV(timesheetId) {
    if (isLoading) return;
    
    setLoadingState(true);
    try {
        const csvData = await apiClient.exportTimesheetToCSV(timesheetId);
        
        const blob = new Blob([csvData], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `timesheet-${timesheetId}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        
        safeNotification('Timesheet exported successfully!', 'success');
    } catch (error) {
        console.error('Export error:', error);
        safeNotification('Failed to export timesheet', 'error');
    } finally {
        setLoadingState(false);
    }
}

console.log('✅ Enhanced Dashboard.js loaded with date restrictions and department fix');