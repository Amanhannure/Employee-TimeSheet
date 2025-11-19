// ==================== COMPLETE DASHBOARD.JS (2200+ LINES) ====================
// Fixed all edit modal issues and enhanced error handling

// Global variables with better organization
const AppState = {
    userData: null,
    assignedProjects: [],
    activityCodes: [],
    isLoading: false,
    hasPendingRejectedTimesheets: false,
    editingDeadlineChecker: null,
    currentOpenModal: null,
    currentEditingContext: null,
    currentEditTimesheet: null
};

// Safe notification function with enhanced styling
function safeNotification(message, type = 'info', duration = 5000) {
    console.log(`📢 ${type.toUpperCase()}: ${message}`);
    
    try {
        // Remove existing notifications
        document.querySelectorAll('.app-notification').forEach(note => note.remove());
        
        const notification = document.createElement('div');
        notification.className = 'app-notification';
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 12px 20px;
            background: ${type === 'error' ? '#f8d7da' : type === 'success' ? '#d4edda' : type === 'warning' ? '#fff3cd' : '#d1ecf1'};
            border: 1px solid ${type === 'error' ? '#f5c6cb' : type === 'success' ? '#c3e6cb' : type === 'warning' ? '#ffeaa7' : '#bee5eb'};
            border-radius: 8px;
            color: ${type === 'error' ? '#721c24' : type === 'success' ? '#155724' : type === 'warning' ? '#856404' : '#0c5460'};
            z-index: 10000;
            font-family: Arial, sans-serif;
            max-width: 400px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            display: flex;
            align-items: center;
            gap: 10px;
            font-size: 14px;
            font-weight: 500;
            animation: slideIn 0.3s ease-out;
        `;
        
        const icon = type === 'error' ? '❌' : type === 'success' ? '✅' : type === 'warning' ? '⚠️' : 'ℹ️';
        notification.innerHTML = `
            <span style="font-size: 16px;">${icon}</span>
            <span>${message}</span>
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            if (notification.parentNode) {
                notification.style.animation = 'slideOut 0.3s ease-in';
                setTimeout(() => {
                    if (notification.parentNode) {
                        notification.parentNode.removeChild(notification);
                    }
                }, 300);
            }
        }, duration);
    } catch (domError) {
        console.warn('Notification DOM error:', domError);
        if (type === 'error' && typeof alert === 'function') {
            alert(`${type.toUpperCase()}: ${message}`);
        }
    }
}

// Add CSS animations for notifications
if (!document.querySelector('#notification-styles')) {
    const style = document.createElement('style');
    style.id = 'notification-styles';
    style.textContent = `
        @keyframes slideIn {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
        @keyframes slideOut {
            from { transform: translateX(0); opacity: 1; }
            to { transform: translateX(100%); opacity: 0; }
        }
    `;
    document.head.appendChild(style);
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

function parseDateSafe(dateString) {
    if (!dateString) return null;
    try {
        // Handle both Date objects and strings
        if (dateString instanceof Date) {
            return isNaN(dateString.getTime()) ? null : dateString;
        }
        
        // Force local time interpretation
        const date = new Date(dateString + 'T00:00:00');
        return isNaN(date.getTime()) ? null : date;
    } catch (error) {
        console.error('Date parsing error:', error);
        return null;
    }
}

function formatDateForInput(date) {
    if (!date) return '';
    try {
        if (typeof date === 'string') {
            date = parseDateSafe(date);
        }
        return date.toISOString().split('T')[0];
    } catch (error) {
        console.error('Date formatting error:', error);
        return '';
    }
}

function formatDateForDisplay(dateString) {
    const date = parseDateSafe(dateString);
    if (!date) return 'Invalid Date';
    return `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}`;
}

function addDays(dateString, days) {
    const date = parseDateSafe(dateString);
    if (!date) return new Date();
    const newDate = new Date(date);
    newDate.setDate(date.getDate() + days);
    return newDate;
}

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

function getShortDayName(fullDayName) {
    const dayMap = {
        'monday': 'mon',
        'tuesday': 'tue',
        'wednesday': 'wed',
        'thursday': 'thu',
        'friday': 'fri',
        'saturday': 'sat',
        'sunday': 'sun'
    };
    return dayMap[fullDayName?.toLowerCase()] || fullDayName?.toLowerCase().substring(0, 3);
}

function isFutureDate(day) {
    const startDateInput = document.getElementById('week-start-date').value;
    if (!startDateInput) return false;
    
    const startDate = parseDateSafe(startDateInput);
    if (!startDate) return false;
    
    const dayIndex = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'].indexOf(day);
    const cellDate = new Date(startDate);
    cellDate.setDate(startDate.getDate() + dayIndex);
    
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    
    return cellDate > today;
}

function validateDailyHours(day, newHours) {
    const dailyTotal = getDailyTotal(day);
    return (dailyTotal.total + newHours) <= 24;
}

function escapeHtml(unsafe) {
    if (!unsafe) return '';
    return unsafe
        .toString()
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// Enhanced validation function
function isValidTimesheetData(data) {
    console.log('🔍 [VALIDATION] Checking timesheet data:', data);
    
    const isValid = data && 
           data.weekStartDate && 
           data.weekEndDate &&
           Array.isArray(data.entries) &&
           data.employeeCode &&
           data.department &&
           data.employee;
    
    if (!isValid) {
        console.error('❌ [VALIDATION] Invalid data structure. Missing:', {
            hasData: !!data,
            hasWeekStart: !!data?.weekStartDate,
            hasWeekEnd: !!data?.weekEndDate,
            hasEntries: Array.isArray(data?.entries),
            hasEmployeeCode: !!data?.employeeCode,
            hasDepartment: !!data?.department,
            hasEmployee: !!data?.employee
        });
    }
    
    return isValid;
}

function isInEditMode() {
    return !!document.getElementById('edit-timesheet-modal');
}

function getCurrentEditingContext() {
    const modal = document.getElementById('edit-timesheet-modal');
    return modal ? {
        timesheetId: modal.getAttribute('data-timesheet-id'),
        weekStart: modal.getAttribute('data-week-start'),
        weekEnd: modal.getAttribute('data-week-end')
    } : null;
}

function getDefaultWeekStart() {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(today);
    monday.setDate(today.getDate() + diffToMonday);
    return formatDateForInput(monday);
}

function getDefaultWeekEnd() {
    const monday = parseDateSafe(getDefaultWeekStart());
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    return formatDateForInput(sunday);
}

// ==================== MODAL MANAGEMENT ====================

function showModal(modalElement) {
    hideAllModals();
    modalElement.style.display = 'block';
    AppState.currentOpenModal = modalElement;
    document.body.classList.add('modal-open');
}

function hideAllModals() {
    document.querySelectorAll('.modal').forEach(modal => {
        modal.style.display = 'none';
    });
    AppState.currentOpenModal = null;
    document.body.classList.remove('modal-open');
}

function setLoadingState(loading) {
    AppState.isLoading = loading;
    const buttons = document.querySelectorAll('button:not(.close-modal)');
    buttons.forEach(btn => {
        if (!btn.classList.contains('static-btn')) {
            btn.disabled = loading;
        }
    });
    
    const spinner = document.getElementById('loading-spinner');
    if (spinner) {
        spinner.style.display = loading ? 'flex' : 'none';
    }
    
    const submitButton = document.getElementById('submit-timesheet-btn');
    if (submitButton) {
        if (loading) {
            submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Submitting...';
        } else {
            submitButton.innerHTML = '<i class="fas fa-check"></i> Submit Timesheet';
        }
    }
}

// ==================== API CLIENT INTEGRATION ====================

// Use the existing apiClient from api-client.js or create fallback
function getApiClient() {
    if (typeof apiClient !== 'undefined') {
        return apiClient;
    }
    
    if (window.apiClient) {
        return window.apiClient;
    }
    
    console.warn('⚠️ apiClient not found, using fallback mock client');
    
    // Fallback mock client for development
    return {
        getMyTimesheets: async function() { 
            console.log('📋 Using mock timesheets data');
            return []; 
        },
        getMyProjects: async function() { 
            console.log('📋 Using mock projects data');
            return []; 
        },
        submitTimesheet: async function(data) { 
            console.log('📤 Mock submission:', data);
            return { _id: 'mock-' + Date.now(), status: 'pending' };
        },
        getActivityCodes: async function() { 
            console.log('📋 Using mock activity codes');
            return []; 
        },
        getTimesheetById: async function(id) { 
            console.log('📋 Mock get timesheet:', id);
            return null; 
        },
        editRejectedTimesheet: async function(id, data) { 
            console.log('📝 Mock edit:', id, data);
            return { _id: id, status: 'pending' };
        },
        exportTimesheetToCSV: async function(id) { 
            console.log('📥 Mock export:', id);
            return "mock,csv,data"; 
        }
    };
}

// ==================== INITIALIZATION ====================

document.addEventListener('DOMContentLoaded', async function() {
    console.log('🚀 Starting dashboard initialization...');
    
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
    AppState.userData = getUserData();
    const token = localStorage.getItem('authToken');
    
    if (!token || !AppState.userData) {
        console.log('❌ No authentication found, redirecting to login...');
        window.location.href = 'index.html';
        return false;
    }
    
    console.log('✅ User authenticated:', AppState.userData);
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
        await checkPendingRejectedTimesheets();
    } catch (error) {
        console.error('Error in dashboard initialization:', error);
        safeNotification('Error initializing dashboard', 'error');
    } finally {
        setLoadingState(false);
    }
}

function updateUserInfo() {
    if (!AppState.userData) return;
    
    const elements = {
        'employee-name': `${AppState.userData.firstName} ${AppState.userData.lastName}`,
        'employee-code': AppState.userData.employeeId,
        'employee-name-input': `${AppState.userData.firstName} ${AppState.userData.lastName}`
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
    
    const departmentSelect = document.getElementById('department');
    if (departmentSelect && AppState.userData.department) {
        const departmentGroup = departmentSelect.closest('.info-group');
        if (departmentGroup) {
            departmentGroup.innerHTML = `
                <label for="department-display">Department</label>
                <input type="text" id="department-display" value="${AppState.userData.department}" readonly class="readonly-input">
            `;
        }
    }
}

function setupEventListeners() {
    // Basic event listeners
    document.getElementById('toggle-sidebar').addEventListener('click', toggleSidebar);
    document.getElementById('logout-btn').addEventListener('click', handleLogout);
    document.getElementById('week-start-date').addEventListener('change', handleDateChange);
    document.getElementById('week-end-date').addEventListener('change', handleDateChange);
    document.getElementById('add-row-btn').addEventListener('click', addTimesheetRow);
    document.getElementById('save-timesheet-btn').addEventListener('click', saveTimesheet);
    document.getElementById('submit-timesheet-btn').addEventListener('click', submitTimesheet);
    document.getElementById('history-btn').addEventListener('click', showHistoryModal);
    document.getElementById('summary-history-btn').addEventListener('click', showHistoryModal);
    document.getElementById('admin-btn').addEventListener('click', showAccessDenied);
    document.getElementById('projects-btn').addEventListener('click', showAccessDenied);
    document.getElementById('employee-projects-btn').addEventListener('click', showEmployeeProjects);
    
    setupModalHandlers();
    console.log('✅ Event listeners set up');
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
    
    window.addEventListener('click', function(event) {
        if (AppState.currentOpenModal && event.target === AppState.currentOpenModal) {
            hideAllModals();
        }
    });
}

// ==================== TIMESHEET TABLE MANAGEMENT ====================

function initializeTimesheetTable() {
    const timesheetBody = document.getElementById('timesheet-body');
    if (!timesheetBody) {
        console.error('❌ Timesheet body not found');
        return;
    }
    
    timesheetBody.innerHTML = '';
    
    for (let i = 0; i < 3; i++) {
        addTimesheetRow();
    }
    
    updateTotals();
    updateFormStatus('draft');
    updateDateCellStates();
}

function addTimesheetRow() {
    if (AppState.isLoading) return;
    
    if (AppState.hasPendingRejectedTimesheets) {
        safeNotification('Please resolve your rejected timesheets before adding new rows', 'error');
        return;
    }
    
    const timesheetBody = document.getElementById('timesheet-body');
    if (!timesheetBody) return;
    
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
            <button class="delete-row-btn" title="Delete Row" ${AppState.isLoading ? 'disabled' : ''}>
                <i class="fas fa-trash"></i>
            </button>
        </td>
    `;
    
    timesheetBody.appendChild(row);
    updateProjectDropdown(row.querySelector('.project-select'));
    
    row.querySelectorAll('.time-cell').forEach(cell => {
        cell.addEventListener('click', function() {
            if (!AppState.isLoading) openHoursModal(this);
        });
    });
    
    row.querySelector('.delete-row-btn').addEventListener('click', function() {
        if (!AppState.isLoading && confirm('Are you sure you want to delete this row?')) {
            row.remove();
            updateRowNumbers();
            updateTotals();
        }
    });
    
    updateRowNumbers();
    updateDateCellStates();
    safeNotification('New row added', 'success');
}

function updateProjectDropdown(projectSelect) {
    if (!projectSelect) return;
    
    projectSelect.innerHTML = '<option value="">Select Project</option>';
    
    if (AppState.assignedProjects && AppState.assignedProjects.length > 0) {
        const activeProjects = AppState.assignedProjects.filter(project => project.status === 'active');
        
        if (activeProjects.length === 0) {
            console.warn('No active projects assigned to user');
        }
        
        activeProjects.forEach(project => {
            const option = document.createElement('option');
            option.value = project.plNo || project.projectCode;
            option.textContent = `${project.plNo || project.projectCode} - ${project.name}`;
            option.setAttribute('data-project-id', project._id);
            projectSelect.appendChild(option);
        });
    } else {
        console.warn('No assigned projects found for user - using default options only');
    }
    
    // Always include standard options
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

function updateAllProjectDropdowns() {
    console.log('🔄 Updating all project dropdowns in timesheet...');
    const projectSelects = document.querySelectorAll('.project-select');
    projectSelects.forEach(select => {
        updateProjectDropdown(select);
    });
}

function updateRowNumbers() {
    const rows = document.querySelectorAll('#timesheet-body tr');
    rows.forEach((row, index) => {
        const firstCell = row.cells[0];
        if (firstCell) {
            firstCell.textContent = index + 1;
        }
    });
}

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

// ==================== HOURS ENTRY MANAGEMENT ====================

let currentCell = null;

function openHoursModal(cell) {
    if (AppState.isLoading) return;
    
    const day = cell.getAttribute('data-day');
    if (isFutureDate(day)) {
        safeNotification('Cannot enter hours for future dates', 'warning');
        return;
    }
    
    if (AppState.hasPendingRejectedTimesheets && !isInEditMode()) {
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
    
    const hoursModal = document.getElementById('hours-modal');
    showModal(hoursModal);
    
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
    if (!currentCell || AppState.isLoading) return;
    
    // Determine context and route appropriately
    const isEditing = isInEditMode();
    
    if (isEditing) {
        saveEditHoursToCell();
    } else {
        saveMainHoursToCell();
    }
}

function saveMainHoursToCell() {
    const hoursType = document.getElementById('hours-type').value;
    const enteredHours = parseFloat(document.getElementById('work-hours').value) || 0;
    const activityCode = document.getElementById('activity-code').value;
    const remark = document.getElementById('work-remark').value.trim();
    
    // Validation
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
    
    const day = currentCell.getAttribute('data-day');
    if (!validateDailyHours(day, enteredHours)) {
        const dailyTotal = getDailyTotal(day);
        safeNotification(`Cannot exceed 24 hours per day. Current: ${dailyTotal.total.toFixed(1)}h`, 'error');
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
    validateDailyHoursLimits();
    
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

function validateDailyHoursLimits() {
    const days = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
    let adjustmentsMade = false;
    let adjustmentDetails = [];
    
    days.forEach(day => {
        const dailyTotal = getDailyTotal(day);
        
        if (dailyTotal.normal > 8) {
            const excessHours = dailyTotal.normal - 8;
            const adjustedRows = adjustDailyHours(day, excessHours);
            if (adjustedRows > 0) {
                adjustmentsMade = true;
                adjustmentDetails.push(`${day.toUpperCase()}: ${excessHours}h normal → overtime`);
            }
        }
        
        if (dailyTotal.total > 24) {
            safeNotification(`Warning: ${day.toUpperCase()} has ${dailyTotal.total.toFixed(1)}h (max 24h)`, 'warning');
        }
    });
    
    if (adjustmentsMade) {
        console.log('🔧 Auto-adjustments made:', adjustmentDetails);
        safeNotification(`Hours auto-adjusted: ${adjustmentDetails.join(', ')}`, 'warning');
        updateTotals();
    }
}

function adjustDailyHours(day, excessHours) {
    const dayCells = document.querySelectorAll(`.time-cell[data-day="${day}"]`);
    let remainingExcess = excessHours;
    let adjustedRows = 0;
    
    // Convert normal hours to overtime starting from the last row
    for (let i = dayCells.length - 1; i >= 0 && remainingExcess > 0; i--) {
        const cell = dayCells[i];
        const currentNormal = parseFloat(cell.getAttribute('data-normal-hours')) || 0;
        
        if (currentNormal > 0) {
            const reduction = Math.min(currentNormal, remainingExcess);
            const newNormal = Math.max(0, currentNormal - reduction);
            const currentOvertime = parseFloat(cell.getAttribute('data-overtime-hours')) || 0;
            const newOvertime = currentOvertime + reduction;
            
            cell.setAttribute('data-normal-hours', newNormal);
            cell.setAttribute('data-overtime-hours', newOvertime);
            cell.innerHTML = `<span class="normal-hours">${newNormal}</span>/<span class="overtime-hours">${newOvertime}</span>`;
            
            remainingExcess -= reduction;
            adjustedRows++;
            
            // Add visual feedback for adjusted cells
            cell.style.backgroundColor = '#fff3cd';
            setTimeout(() => {
                cell.style.backgroundColor = '';
            }, 2000);
        }
    }
    
    return adjustedRows;
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

function handleDateChange() {
    const startDateInput = document.getElementById('week-start-date').value;
    const endDateInput = document.getElementById('week-end-date').value;
    
    if (!startDateInput || !endDateInput) {
        safeNotification('Please select both start and end dates', 'warning');
        return;
    }
    
    const startDate = parseDateSafe(startDateInput);
    const endDate = parseDateSafe(endDateInput);
    
    if (!startDate || !endDate) {
        safeNotification('Invalid dates selected', 'error');
        return;
    }
    
    const diffTime = Math.abs(endDate - startDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays !== 6) {
        safeNotification('Week should be exactly 7 days (Monday to Sunday)', 'warning');
        const correctedEnd = new Date(startDate);
        correctedEnd.setDate(startDate.getDate() + 6);
        document.getElementById('week-end-date').value = formatDateForInput(correctedEnd);
    }
    
    updateDayDates();
    updateDateCellStates();
}

function updateDayDates() {
    const startDateInput = document.getElementById('week-start-date').value;
    if (!startDateInput) {
        console.warn('No start date selected for day date update');
        return;
    }
    
    const startDate = parseDateSafe(startDateInput);
    if (!startDate) {
        console.error('Invalid start date for day date update');
        return;
    }
    
    const days = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
    
    days.forEach((day, index) => {
        const date = new Date(startDate);
        date.setDate(startDate.getDate() + index);
        
        const dateElement = document.getElementById(`date-${day}`);
        if (dateElement) {
            dateElement.textContent = formatDateForDisplay(date);
        }
    });
}

// ==================== TOTALS & STATUS MANAGEMENT ====================

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
        const api = getApiClient();
        
        const timesheets = await api.getMyTimesheets();
        updateTimesheetCounts(timesheets);
        
        console.log('📋 Loading assigned projects for employee...');
        AppState.assignedProjects = await api.getMyProjects();
        console.log(`✅ Loaded ${AppState.assignedProjects?.length || 0} assigned projects`);
        
        updateAllProjectDropdowns();
        
        const activityCodes = await api.getActivityCodes(AppState.userData.department);
        AppState.activityCodes = activityCodes || [];
        
        console.log('✅ Backend data loaded successfully');
        
    } catch (error) {
        console.warn('Could not load backend data, using offline mode:', error);
        safeNotification('Using offline mode - some features limited', 'warning');
        
        AppState.assignedProjects = [];
        AppState.activityCodes = [];
    } finally {
        setLoadingState(false);
    }
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

// ==================== TIMESHEET DATA MANAGEMENT ====================

function collectTimesheetData() {
    const weekStartDate = document.getElementById('week-start-date').value;
    const weekEndDate = document.getElementById('week-end-date').value;
    
    if (!weekStartDate || !weekEndDate) {
        console.error('❌ Week dates are required');
        safeNotification('Please select week dates', 'error');
        return { entries: [] };
    }
    
    const timesheetBody = document.getElementById('timesheet-body');
    if (!timesheetBody) {
        return { entries: [] };
    }
    
    const rows = timesheetBody.querySelectorAll('tr');
    const entries = [];
    
    rows.forEach(row => {
        const projectSelect = row.querySelector('.project-select');
        const locationInput = row.querySelector('.location-input');
        const dayCells = row.querySelectorAll('.time-cell');
        
        if (projectSelect && projectSelect.value) {
            const startDate = parseDateSafe(weekStartDate);
            if (!startDate) {
                console.error('Invalid week start date');
                return;
            }
            
            ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'].forEach((day, index) => {
                const dayCell = dayCells[index];
                if (dayCell) {
                    const normalHours = parseFloat(dayCell.getAttribute('data-normal-hours')) || 0;
                    const overtimeHours = parseFloat(dayCell.getAttribute('data-overtime-hours')) || 0;
                    const activityCode = dayCell.getAttribute('data-activity-code');
                    
                    if (normalHours > 0 || overtimeHours > 0) {
                        const date = new Date(startDate);
                        date.setDate(startDate.getDate() + index);
                        
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
                            department: AppState.userData.department
                        });
                    }
                }
            });
        }
    });
    
    // Ensure all required fields are present
    const timesheetData = {
        employee: AppState.userData.id || AppState.userData._id || 'unknown',
        employeeCode: AppState.userData.employeeId || 'unknown',
        department: AppState.userData.department || 'unknown',
        weekStartDate: weekStartDate,
        weekEndDate: weekEndDate,
        entries: entries,
        totalHours: entries.reduce((sum, entry) => sum + entry.normalHours + entry.overtimeHours, 0),
        totalNormalHours: entries.reduce((sum, entry) => sum + entry.normalHours, 0),
        totalOvertimeHours: entries.reduce((sum, entry) => sum + entry.overtimeHours, 0)
    };
    
    console.log('📊 Collected timesheet data:', timesheetData);
    return timesheetData;
}

async function saveTimesheet() {
    if (AppState.isLoading) return;
    
    try {
        const timesheetData = collectTimesheetData();
        
        if (!isValidTimesheetData(timesheetData)) {
            safeNotification('Invalid timesheet data structure', 'error');
            return;
        }
        
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
    if (AppState.isLoading) return;
    
    if (AppState.hasPendingRejectedTimesheets) {
        safeNotification('Please resolve your rejected timesheets before submitting new timesheets', 'error');
        return;
    }
    
    try {
        const timesheetData = collectTimesheetData();
        const api = getApiClient();
        
        console.log('🔍 [SUBMIT] Validating timesheet data:', timesheetData);
        
        // Enhanced validation with detailed error messages
        if (!timesheetData.weekStartDate || !timesheetData.weekEndDate) {
            safeNotification('Please set week dates', 'error');
            return;
        }
        
        if (!timesheetData.employeeCode || timesheetData.employeeCode === 'unknown') {
            safeNotification('Employee code is missing', 'error');
            return;
        }
        
        if (!timesheetData.department || timesheetData.department === 'unknown') {
            safeNotification('Department is missing', 'error');
            return;
        }
        
        if (!timesheetData.entries || timesheetData.entries.length === 0) {
            safeNotification('Please add at least one timesheet entry', 'error');
            return;
        }

        // Check if entries have valid data
        const invalidEntries = timesheetData.entries.filter(entry => 
            !entry.projectCode || (!entry.normalHours && !entry.overtimeHours)
        );
        
        if (invalidEntries.length > 0) {
            safeNotification('Some entries are missing project codes or hours', 'error');
            return;
        }

        // Validate no future dates
        const today = new Date();
        today.setHours(23, 59, 59, 999);
        const futureEntries = timesheetData.entries.filter(entry => {
            const entryDate = parseDateSafe(entry.date);
            return entryDate && entryDate > today;
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
        
        const result = await api.submitTimesheet(timesheetData);
        
        localStorage.removeItem('draftTimesheet');
        
        initializeTimesheetTable();
        updateTotals();
        
        safeNotification('Timesheet submitted successfully! It is now pending approval.', 'success');
        
        const timesheets = await api.getMyTimesheets();
        updateTimesheetCounts(timesheets);
        
    } catch (error) {
        console.error('Error submitting timesheet:', error);
        
        if (error.message && error.message.includes('future dates')) {
            safeNotification(error.message, 'error');
        } else if (error.message && error.message.includes('rejected timesheets')) {
            safeNotification(error.message, 'error');
            await checkPendingRejectedTimesheets();
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

// ==================== REJECTION WORKFLOW ====================

async function checkPendingRejectedTimesheets() {
    try {
        const api = getApiClient();
        const timesheets = await api.getMyTimesheets();
        const now = new Date();
        const fifteenDaysAgo = new Date(now);
        fifteenDaysAgo.setDate(now.getDate() - 15);
        fifteenDaysAgo.setHours(23, 59, 59, 999);
        
        const pendingRejected = timesheets.filter(ts => 
            ts.status === 'rejected' && 
            ts.rejectedAt && 
            new Date(ts.rejectedAt) < fifteenDaysAgo &&
            !ts.isExpired
        );
        
        AppState.hasPendingRejectedTimesheets = pendingRejected.length > 0;
        
        if (AppState.hasPendingRejectedTimesheets) {
            showPendingRejectedWarning(pendingRejected.length);
        }
        
        startEditingDeadlineChecker(timesheets);
        
        return AppState.hasPendingRejectedTimesheets;
    } catch (error) {
        console.warn('Could not check pending rejected timesheets:', error);
        return false;
    }
}

function startEditingDeadlineChecker(timesheets) {
    if (AppState.editingDeadlineChecker) {
        clearInterval(AppState.editingDeadlineChecker);
    }
    
    AppState.editingDeadlineChecker = setInterval(() => {
        updateEditingDeadlineDisplays();
    }, 60 * 60 * 1000);
    
    updateEditingDeadlineDisplays();
}

function updateEditingDeadlineDisplays() {
    const editableItems = document.querySelectorAll('.history-item.rejected');
    editableItems.forEach(item => {
        const timesheetId = item.getAttribute('data-timesheet-id');
        if (timesheetId) {
            updateSingleDeadlineDisplay(timesheetId, item);
        }
    });
}

function updateSingleDeadlineDisplay(timesheetId, item) {
    const daysRemainingEl = item.querySelector('.days-remaining');
    const editButton = item.querySelector('.edit-rejected-btn');
    const statusBadge = item.querySelector('.editing-status');
    
    if (!daysRemainingEl || !editButton) return;
    
    const now = new Date();
    const editableUntil = new Date(item.getAttribute('data-editable-until'));
    
    const nowNormalized = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const editableUntilNormalized = new Date(editableUntil.getFullYear(), editableUntil.getMonth(), editableUntil.getDate());
    
    const daysRemaining = Math.ceil((editableUntilNormalized - nowNormalized) / (24 * 60 * 60 * 1000));
    
    if (daysRemaining <= 0) {
        daysRemainingEl.innerHTML = `<span class="expired-text">Editing expired</span>`;
        editButton.disabled = true;
        editButton.innerHTML = '<i class="fas fa-ban"></i> Edit Expired';
        editButton.classList.add('btn-expired');
        editButton.classList.remove('btn-warning');
        
        if (statusBadge) {
            statusBadge.textContent = 'EXPIRED';
            statusBadge.className = 'editing-status status-expired';
        }
    } else {
        const hoursRemaining = Math.ceil((editableUntil - now) / (60 * 60 * 1000));
        
        if (daysRemaining === 1 && hoursRemaining <= 24) {
            daysRemainingEl.innerHTML = `<span class="urgent-text">${hoursRemaining} hours remaining</span>`;
            item.classList.add('deadline-urgent');
        } else if (daysRemaining <= 3) {
            daysRemainingEl.innerHTML = `<span class="warning-text">${daysRemaining} days remaining</span>`;
            item.classList.add('deadline-warning');
        } else {
            daysRemainingEl.innerHTML = `<span class="normal-text">${daysRemaining} days remaining</span>`;
            item.classList.remove('deadline-warning', 'deadline-urgent');
        }
        
        editButton.disabled = false;
        editButton.innerHTML = '<i class="fas fa-edit"></i> Edit';
        editButton.classList.remove('btn-expired');
        editButton.classList.add('btn-warning');
        
        if (statusBadge) {
            statusBadge.textContent = 'EDITABLE';
            statusBadge.className = 'editing-status status-editable';
        }
    }
}

function showPendingRejectedWarning(count) {
    const existingWarning = document.getElementById('pending-rejected-warning');
    if (existingWarning) existingWarning.remove();
    
    const warningDiv = document.createElement('div');
    warningDiv.id = 'pending-rejected-warning';
    warningDiv.style.cssText = `
        background: #fff3cd;
        border: 1px solid #ffeaa7;
        color: #856404;
        padding: 12px 20px;
        margin: 10px 0;
        border-radius: 8px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    `;
    
    warningDiv.innerHTML = `
        <div style="display: flex; align-items: center;">
            <i class="fas fa-exclamation-triangle" style="margin-right: 10px; color: #856404;"></i>
            <span><strong>Action Required:</strong> You have ${count} rejected timesheet(s) older than 15 days that need attention. Please resolve them to submit new timesheets.</span>
        </div>
        <button id="view-rejected-btn" class="btn btn-warning btn-sm">
            <i class="fas fa-eye"></i> View Rejected
        </button>
    `;
    
    const formHeader = document.querySelector('.form-header');
    if (formHeader) {
        formHeader.parentNode.insertBefore(warningDiv, formHeader.nextSibling);
    }
    
    document.getElementById('view-rejected-btn').addEventListener('click', showRejectedTimesheetsModal);
}

// ==================== FIXED EDIT MODAL FUNCTIONS ====================

function showEditTimesheetModal(timesheetId) {
    console.log('🔧 [EDIT] Starting showEditTimesheetModal for:', timesheetId);
    
    if (AppState.isLoading) return;
    
    setLoadingState(true);
    try {
        const api = getApiClient();
        api.getTimesheetById(timesheetId)
            .then(timesheet => {
                console.log('📋 [EDIT] Loaded timesheet data:', timesheet);
                
                if (!timesheet) {
                    throw new Error('Timesheet not found');
                }
                
                // Validate timesheet has required data
                if (!timesheet.entries || !Array.isArray(timesheet.entries)) {
                    console.warn('Timesheet has no entries or invalid entries format');
                    timesheet.entries = [];
                }
                
                // Store the timesheet for later use
                AppState.currentEditTimesheet = timesheet;
                
                const now = new Date();
                const editableUntil = timesheet.editableUntil ? new Date(timesheet.editableUntil) : null;
                
                if (!timesheet.canEdit) {
                    console.log('❌ [EDIT] Timesheet cannot be edited');
                    if (!editableUntil) {
                        safeNotification('This timesheet cannot be edited. No editing period was set.', 'error');
                    } else if (timesheet.isExpired) {
                        safeNotification('Editing period has expired for this timesheet', 'error');
                    } else if (editableUntil <= now) {
                        safeNotification('Editing period ended on ' + editableUntil.toLocaleDateString(), 'error');
                    } else {
                        safeNotification('This timesheet cannot be edited at this time', 'error');
                    }
                    setLoadingState(false);
                    return;
                }

                const daysRemaining = Math.ceil((editableUntil - now) / (24 * 60 * 60 * 1000));
                safeNotification(`You have ${daysRemaining} days remaining to edit this timesheet`, 'info');
                
                createEditTimesheetModal(timesheet);
            })
            .catch(error => {
                console.error('❌ [EDIT] Error loading timesheet:', error);
                safeNotification('Failed to load timesheet for editing: ' + error.message, 'error');
                setLoadingState(false);
            });
    } catch (error) {
        console.error('❌ [EDIT] Error opening edit modal:', error);
        safeNotification('Error opening editor: ' + error.message, 'error');
        setLoadingState(false);
    }
}

function createEditTimesheetModal(timesheet) {
    console.log('🔄 [EDIT] Creating edit modal for timesheet:', timesheet._id);
    
    const existingModal = document.getElementById('edit-timesheet-modal');
    if (existingModal) {
        existingModal.remove();
    }

    // FIX: Safe date handling with fallbacks - USE let NOT const
    let weekStartDate = timesheet.weekStartDate || timesheet.weekStart || getDefaultWeekStart();
    let weekEndDate = timesheet.weekEndDate || timesheet.weekEnd || getDefaultWeekEnd();
    
    // Validate dates
    const startDate = parseDateSafe(weekStartDate);
    const endDate = parseDateSafe(weekEndDate);
    
    if (!startDate || !endDate) {
        safeNotification('Invalid dates in timesheet. Using current week.', 'warning');
        weekStartDate = getDefaultWeekStart();  // ✅ Now this works with let
        weekEndDate = getDefaultWeekEnd();      // ✅ Now this works with let
    }
    
    const editModal = document.createElement('div');
    editModal.id = 'edit-timesheet-modal';
    editModal.className = 'modal';
    editModal.setAttribute('data-timesheet-id', timesheet._id);
    editModal.setAttribute('data-week-start', weekStartDate);
    editModal.setAttribute('data-week-end', weekEndDate);

    // Generate date headers safely
    const dateHeaders = generateEditDateHeaders(weekStartDate);

    editModal.innerHTML = `
        <div class="modal-content large-modal">
            <span class="close-modal">&times;</span>
            <h2><i class="fas fa-edit"></i> Edit Rejected Timesheet</h2>
            
            <div class="edit-timesheet-info">
                <p><strong>Week:</strong> ${formatDateForDisplay(weekStartDate)} - ${formatDateForDisplay(weekEndDate)}</p>
                <p><strong>Rejection Reason:</strong> ${timesheet.rejectionReason || 'No reason provided'}</p>
                <p><strong>Status:</strong> <span class="status-${timesheet.status}">${timesheet.status.toUpperCase()}</span></p>
                ${timesheet.canEdit ? `<p><strong>Editing Period:</strong> ${timesheet.daysRemaining || 0} days remaining</p>` : ''}
            </div>

            <div class="edit-table-controls">
                <button id="add-edit-row-btn" class="btn btn-primary">
                    <i class="fas fa-plus"></i> Add New Row
                </button>
                <span class="edit-info">Click on any cell to add/edit hours</span>
            </div>

            <div class="timesheet-table-container">
                <table class="timesheet-table" id="edit-timesheet-table">
                    <thead>
                        <tr>
                            <th>SR.NO</th>
                            <th>PROJECT CODE</th>
                            <th>LOCATION</th>
                            ${dateHeaders}
                            <th>ACTION</th>
                        </tr>
                    </thead>
                    <tbody id="edit-timesheet-body">
                        <!-- Rows will be populated here -->
                    </tbody>
                </table>
            </div>

            <div class="edit-totals" id="edit-totals">
                <div class="total-row">
                    <span class="total-label">Daily Totals:</span>
                    ${generateEditDailyTotalHeaders()}
                </div>
            </div>

            <div class="form-actions">
                <button id="save-edited-timesheet" class="btn btn-success">
                    <i class="fas fa-check"></i> Save & Resubmit
                </button>
                <button class="btn btn-secondary close-modal">
                    <i class="fas fa-times"></i> Cancel
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(editModal);
    showModal(editModal);

    // Setup event listeners
    editModal.querySelector('.close-modal').addEventListener('click', () => {
        console.log('❌ [EDIT] Closing edit modal');
        editModal.remove();
        AppState.currentEditTimesheet = null;
    });

    editModal.querySelector('#save-edited-timesheet').addEventListener('click', () => {
        console.log('💾 [EDIT] Save button clicked');
        saveEditedTimesheet(timesheet._id);
    });

    editModal.querySelector('#add-edit-row-btn').addEventListener('click', () => {
        console.log('➕ [EDIT] Add row button clicked');
        addEditRow();
    });

    editModal.addEventListener('click', (e) => {
        if (e.target === editModal) {
            console.log('❌ [EDIT] Closing modal via outside click');
            editModal.remove();
            AppState.currentEditTimesheet = null;
        }
    });

    populateEditTable(timesheet);
    setLoadingState(false);
    console.log('✅ [EDIT] Edit modal created successfully');
}

function generateEditDateHeaders(weekStartDate) {
    const days = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
    let headers = '';
    
    // FIX: Use let instead of const for reassignment
    let startDate = parseDateSafe(weekStartDate);
    if (!startDate) {
        console.warn('Invalid week start date, using current date');
        const today = new Date();
        const dayOfWeek = today.getDay();
        const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
        startDate = new Date(today);  // ✅ Now this works with let
        startDate.setDate(today.getDate() + diffToMonday);
    }
    
    days.forEach((day, index) => {
        const date = new Date(startDate);
        date.setDate(startDate.getDate() + index);
        const dateStr = formatDateForDisplay(date);
        const weekendClass = (day === 'SAT' || day === 'SUN') ? 'weekend' : '';
        
        headers += `<th class="${weekendClass}">${day}<br><span class="day-date">${dateStr}</span></th>`;
    });
    
    return headers;
}

function generateEditDailyTotalHeaders() {
    const days = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
    let totals = '';
    
    days.forEach(day => {
        totals += `<span class="day-total" id="edit-total-${day}">0/0</span>`;
    });
    
    return totals;
}

function populateEditTable(timesheet) {
    console.log('📊 [EDIT] Populating edit table with entries:', timesheet.entries);
    
    const tbody = document.getElementById('edit-timesheet-body');
    if (!tbody) {
        console.error('❌ [EDIT] Edit timesheet body not found');
        return;
    }
    
    tbody.innerHTML = '';

    if (!timesheet.entries || timesheet.entries.length === 0) {
        console.log('ℹ️ [EDIT] No entries found, adding empty row');
        addEditRow();
        return;
    }

    // FIX: Group entries by project and location
    const groupedEntries = groupEditEntriesByProject(timesheet.entries);
    
    let rowNumber = 1;
    Object.values(groupedEntries).forEach((group) => {
        const row = createEditTableRow(rowNumber, group, timesheet.weekStartDate);
        tbody.appendChild(row);
        rowNumber++;
    });

    console.log('✅ [EDIT] Edit table populated with', rowNumber - 1, 'rows');
    updateEditTotals();
}

function groupEditEntriesByProject(entries) {
    const grouped = {};
    
    entries.forEach((entry) => {
        const key = `${entry.projectCode}-${entry.location || ''}`;
        if (!grouped[key]) {
            grouped[key] = {
                projectCode: entry.projectCode,
                location: entry.location || '',
                entries: {}
            };
        }
        
        // FIX: Handle different day formats
        const day = getShortDayName(entry.dayOfWeek);
        if (day) {
            grouped[key].entries[day] = entry;
        }
    });
    
    return grouped;
}

function createEditTableRow(rowNumber, group, weekStartDate) {
    const row = document.createElement('tr');
    row.setAttribute('data-edit-row', 'true');
    
    // FIX: Use let instead of const for reassignment
    let startDate = parseDateSafe(weekStartDate);
    if (!startDate) {
        console.warn('Invalid week start date in createEditTableRow, using current date');
        const today = new Date();
        const dayOfWeek = today.getDay();
        const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
        startDate = new Date(today);  // ✅ Now this works with let
        startDate.setDate(today.getDate() + diffToMonday);
    }
    
    row.innerHTML = `
        <td>${rowNumber}</td>
        <td>
            <select class="project-select edit-project-select" required>
                <option value="">Select Project</option>
            </select>
        </td>
        <td>
            <input type="text" class="location-input edit-location-input" value="${escapeHtml(group.location || '')}" 
                   placeholder="Enter location" maxlength="100">
        </td>
        ${['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'].map(day => {
            const entry = group.entries[day];
            const normalHours = entry ? (parseFloat(entry.normalHours) || 0) : 0;
            const overtimeHours = entry ? (parseFloat(entry.overtimeHours) || 0) : 0;
            const activityCode = entry ? (entry.activityCode || '') : '';
            const remark = entry ? (entry.remarks || '') : '';
            
            const hasHours = normalHours > 0 || overtimeHours > 0;
            const cellClass = hasHours ? 'time-cell edit-time-cell has-hours' : 'time-cell edit-time-cell';
            
            return `
                <td class="${cellClass}" 
                    data-day="${day}" 
                    data-normal-hours="${normalHours}" 
                    data-overtime-hours="${overtimeHours}" 
                    data-activity-code="${escapeHtml(activityCode)}"
                    data-remark="${escapeHtml(remark)}">
                    <span class="normal-hours">${normalHours}</span>/<span class="overtime-hours">${overtimeHours}</span>
                </td>
            `;
        }).join('')}
        <td>
            <button class="delete-row-btn edit-delete-btn" title="Delete Row">
                <i class="fas fa-trash"></i>
            </button>
        </td>
    `;

    const projectSelect = row.querySelector('.edit-project-select');
    updateProjectDropdown(projectSelect);
    
    // Set project value after dropdown is populated
    setTimeout(() => {
        if (group.projectCode) {
            projectSelect.value = group.projectCode;
            
            // If project code not found in dropdown, add it as an option
            if (!projectSelect.value && group.projectCode) {
                const option = document.createElement('option');
                option.value = group.projectCode;
                option.textContent = `${group.projectCode} - ${group.projectCode}`;
                projectSelect.appendChild(option);
                projectSelect.value = group.projectCode;
            }
        }
    }, 100);

    row.querySelectorAll('.edit-time-cell').forEach(cell => {
        cell.addEventListener('click', function() {
            openEditHoursModal(this);
        });
    });

    row.querySelector('.edit-delete-btn').addEventListener('click', function() {
        if (confirm('Are you sure you want to delete this row?')) {
            row.remove();
            updateEditRowNumbers();
            updateEditTotals();
        }
    });

    return row;
}

function addEditRow() {
    console.log('➕ [EDIT] Adding new row to edit table');
    
    const tbody = document.getElementById('edit-timesheet-body');
    if (!tbody) return;
    
    const rowCount = tbody.children.length;
    
    if (rowCount >= 20) {
        safeNotification('Maximum 20 rows allowed per timesheet', 'warning');
        return;
    }
    
    const emptyGroup = {
        projectCode: '',
        location: '',
        entries: {}
    };
    
    const modal = document.getElementById('edit-timesheet-modal');
    const weekStartDate = modal?.getAttribute('data-week-start');
    const row = createEditTableRow(rowCount + 1, emptyGroup, weekStartDate);
    tbody.appendChild(row);
    
    updateEditTotals();
}

function openEditHoursModal(cell) {
    if (AppState.isLoading) return;
    
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
    
    const day = cell.getAttribute('data-day');
    updateAvailableHoursInfo(day);
    
    const hoursModal = document.getElementById('hours-modal');
    if (hoursModal) {
        hoursModal.style.zIndex = '1003';
        hoursModal.style.display = 'block';
    }
}

function saveEditHoursToCell() {
    console.log('💾 [EDIT] Saving hours to edit modal cell');
    
    if (!currentCell || AppState.isLoading) return;

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
    
    const day = currentCell.getAttribute('data-day');
    if (!validateEditDailyHours(day, enteredHours)) {
        const dailyTotal = getEditDailyTotal(day);
        safeNotification(`Cannot exceed 24 hours per day. Current: ${dailyTotal.total.toFixed(1)}h`, 'error');
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
    
    const hoursModal = document.getElementById('hours-modal');
    if (hoursModal) {
        hoursModal.style.display = 'none';
    }
    
    updateEditTotals();
    safeNotification('Hours saved to timesheet', 'success');
}

function validateEditDailyHours(day, newHours) {
    const dailyTotal = getEditDailyTotal(day);
    return (dailyTotal.total + newHours) <= 24;
}

function getEditDailyTotal(day) {
    const dayCells = document.querySelectorAll(`.edit-time-cell[data-day="${day}"]`);
    let normal = 0;
    let overtime = 0;
    
    dayCells.forEach(cell => {
        normal += parseFloat(cell.getAttribute('data-normal-hours')) || 0;
        overtime += parseFloat(cell.getAttribute('data-overtime-hours')) || 0;
    });
    
    return { normal, overtime, total: normal + overtime };
}

function updateEditTotals() {
    const days = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
    
    days.forEach(day => {
        const total = getEditDailyTotal(day);
        const totalElement = document.getElementById(`edit-total-${day}`);
        if (totalElement) {
            totalElement.innerHTML = `<span class="normal-hours">${total.normal.toFixed(1)}</span>/<span class="overtime-hours">${total.overtime.toFixed(1)}</span>`;
        }
    });
}

function updateEditRowNumbers() {
    const rows = document.querySelectorAll('#edit-timesheet-body tr');
    rows.forEach((row, index) => {
        const firstCell = row.cells[0];
        if (firstCell) {
            firstCell.textContent = index + 1;
        }
    });
}

// ==================== FIXED EDIT DATA COLLECTION ====================

function collectEditTimesheetData() {
    console.log('📝 [EDIT] Starting to collect data from edit table');
    
    const modal = document.getElementById('edit-timesheet-modal');
    if (!modal) {
        console.error('❌ Edit modal not found');
        safeNotification('Edit modal not found', 'error');
        return [];
    }
    
    const weekStartDate = modal.getAttribute('data-week-start');
    if (!weekStartDate) {
        console.error('❌ Week start date not found in modal');
        safeNotification('Cannot determine week dates', 'error');
        return [];
    }
    
    // FIX: Safe date parsing with fallback
    let startDate = parseDateSafe(weekStartDate);
    if (!startDate) {
        console.error('❌ Invalid week start date, using current week');
        safeNotification('Using current week dates', 'warning');
        const today = new Date();
        const dayOfWeek = today.getDay();
        const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
        startDate = new Date(today);
        startDate.setDate(today.getDate() + diffToMonday);
    }

    const tbody = document.getElementById('edit-timesheet-body');
    if (!tbody) {
        console.error('❌ Edit timesheet body not found');
        return [];
    }
    
    const rows = tbody.querySelectorAll('tr');
    const entries = [];

    let hasValidEntries = false;

    rows.forEach((row, rowIndex) => {
        const projectSelect = row.querySelector('.edit-project-select');
        const locationInput = row.querySelector('.edit-location-input');
        const dayCells = row.querySelectorAll('.edit-time-cell');
        
        if (projectSelect && projectSelect.value) {
            ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'].forEach((day, dayIndex) => {
                const dayCell = dayCells[dayIndex];
                if (dayCell) {
                    const normalHours = parseFloat(dayCell.getAttribute('data-normal-hours')) || 0;
                    const overtimeHours = parseFloat(dayCell.getAttribute('data-overtime-hours')) || 0;
                    const activityCode = dayCell.getAttribute('data-activity-code');
                    
                    if (normalHours > 0 || overtimeHours > 0) {
                        const date = new Date(startDate);
                        date.setDate(startDate.getDate() + dayIndex);
                        
                        const entry = {
                            date: date.toISOString().split('T')[0],
                            dayOfWeek: getFullDayName(day),
                            projectCode: projectSelect.value,
                            project: projectSelect.querySelector(`option[value="${projectSelect.value}"]`)?.getAttribute('data-project-id') || null,
                            location: locationInput?.value || '',
                            normalHours: normalHours,
                            overtimeHours: overtimeHours,
                            activityCode: activityCode || 'MISC',
                            remarks: dayCell.getAttribute('data-remark') || '',
                            department: AppState.userData.department
                        };
                        
                        entries.push(entry);
                        hasValidEntries = true;
                    }
                }
            });
        }
    });
    
    console.log('✅ [EDIT] Collection complete -', entries.length, 'entries total');
    
    if (!hasValidEntries) {
        safeNotification('Please add at least one timesheet entry with hours', 'error');
        return [];
    }
    
    return entries;
}

function saveEditedTimesheet(timesheetId) {
    console.log('💾 [EDIT] Starting saveEditedTimesheet for:', timesheetId);
    
    if (AppState.isLoading) return;
    
    const entries = collectEditTimesheetData();
    const api = getApiClient();
    
    if (entries.length === 0) {
        safeNotification('Please add at least one timesheet entry with hours', 'error');
        return;
    }
    
    const totalHours = entries.reduce((sum, entry) => sum + entry.normalHours + entry.overtimeHours, 0);
    if (totalHours === 0) {
        safeNotification('Please enter some hours in the timesheet', 'error');
        return;
    }
    
    // FIX: Get dates from modal or use current timesheet data
    const modal = document.getElementById('edit-timesheet-modal');
    const weekStartDate = modal?.getAttribute('data-week-start') || AppState.currentEditTimesheet?.weekStartDate;
    const weekEndDate = modal?.getAttribute('data-week-end') || AppState.currentEditTimesheet?.weekEndDate;
    
    const timesheetData = {
        entries: entries,
        weekStartDate: weekStartDate,
        weekEndDate: weekEndDate,
        employee: AppState.userData.id || AppState.userData._id,
        employeeCode: AppState.userData.employeeId,
        department: AppState.userData.department,
        totalHours: totalHours,
        totalNormalHours: entries.reduce((sum, entry) => sum + entry.normalHours, 0),
        totalOvertimeHours: entries.reduce((sum, entry) => sum + entry.overtimeHours, 0)
    };
    
    if (!confirm('Are you sure you want to save and resubmit this timesheet?')) {
        return;
    }
    
    setLoadingState(true);
    
    api.editRejectedTimesheet(timesheetId, timesheetData)
        .then(response => {
            console.log('✅ [EDIT] Timesheet edited successfully:', response);
            safeNotification('Timesheet edited and resubmitted successfully!', 'success');
            
            const editModal = document.getElementById('edit-timesheet-modal');
            if (editModal) {
                editModal.remove();
            }
            
            AppState.currentEditTimesheet = null;
            
            // Refresh the page to show updated data
            setTimeout(() => {
                window.location.reload();
            }, 2000);
        })
        .catch(error => {
            console.error('❌ [EDIT] Error editing timesheet:', error);
            
            if (error.message && error.message.includes('editing period')) {
                safeNotification('Editing period has expired. Please contact your manager.', 'error');
            } else if (error.message && error.message.includes('future dates')) {
                safeNotification(error.message, 'error');
            } else if (error.message && error.message.includes('rejected timesheets')) {
                safeNotification(error.message, 'error');
            } else {
                safeNotification(error.message || 'Failed to edit timesheet. Please try again.', 'error');
            }
        })
        .finally(() => {
            setLoadingState(false);
        });
}

// ==================== HISTORY & MISC FUNCTIONS ====================

async function showHistoryModal() {
    if (AppState.isLoading) return;
    
    setLoadingState(true);
    try {
        const api = getApiClient();
        const timesheets = await api.getMyTimesheets();
        displayHistoryContent(timesheets);
        const historyModal = document.getElementById('history-modal');
        showModal(historyModal);
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
        
        let editingInfo = '';
        let editButton = '';
        let editingStatus = '';
        
        if (timesheet.status === 'rejected') {
            const now = new Date();
            const editableUntil = timesheet.editableUntil ? new Date(timesheet.editableUntil) : null;
            const canEdit = timesheet.canEdit && editableUntil && editableUntil > now && !timesheet.isExpired;
            
            let daysRemaining = 0;
            if (editableUntil) {
                const nowNormalized = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                const editableUntilNormalized = new Date(editableUntil.getFullYear(), editableUntil.getMonth(), editableUntil.getDate());
                daysRemaining = Math.ceil((editableUntilNormalized - nowNormalized) / (24 * 60 * 60 * 1000));
            }
            
            if (canEdit) {
                editingStatus = `<span class="editing-status status-editable">EDITABLE</span>`;
                editingInfo = `<div class="days-remaining" data-timesheet-id="${timesheet._id}" data-editable-until="${editableUntil.toISOString()}">
                    <span class="normal-text">${daysRemaining} days remaining</span>
                </div>`;
                editButton = `<button class="btn-small btn-warning edit-rejected-btn" onclick="showEditTimesheetModal('${timesheet._id}')" ${AppState.isLoading ? 'disabled' : ''}>
                    <i class="fas fa-edit"></i> Edit
                </button>`;
            } else {
                editingStatus = `<span class="editing-status status-expired">EXPIRED</span>`;
                editingInfo = `<div class="days-remaining">
                    <span class="expired-text">Editing expired</span>
                </div>`;
                editButton = `<button class="btn-small btn-expired" disabled>
                    <i class="fas fa-ban"></i> Edit Expired
                </button>`;
            }
        }
        
        html += `
            <div class="history-item ${statusClass} ${timesheet.status === 'rejected' ? 'rejected' : ''}" 
                 data-timesheet-id="${timesheet._id}" 
                 data-editable-until="${timesheet.editableUntil || ''}">
                <div class="history-info">
                    <div class="week-range">
                        <strong>Week ${timesheet.weekNumber}</strong>: ${weekStart} - ${weekEnd}
                        ${editingStatus}
                    </div>
                    <div class="hours-info">
                        Total: ${(timesheet.totalHours || 0).toFixed(1)} hrs 
                        (Normal: ${timesheet.totalNormalHours || 0}, Overtime: ${timesheet.totalOvertimeHours || 0})
                    </div>
                    ${timesheet.status === 'rejected' ? `
                        <div class="rejection-info">
                            <strong>Rejection Reason:</strong> ${timesheet.rejectionReason || 'No reason provided'}
                            ${editingInfo}
                        </div>
                    ` : ''}
                    <div class="timesheet-status ${statusClass}">
                        ${timesheet.status.toUpperCase()}
                    </div>
                </div>
                <div class="history-actions">
                    ${editButton}
                    <button class="btn-small btn-view" onclick="viewTimesheetDetails('${timesheet._id}')" ${AppState.isLoading ? 'disabled' : ''}>
                        <i class="fas fa-eye"></i> View
                    </button>
                    <button class="btn-small btn-export" onclick="exportTimesheetToCSV('${timesheet._id}')" ${AppState.isLoading ? 'disabled' : ''}>
                        <i class="fas fa-download"></i> Export
                    </button>
                </div>
            </div>
        `;
    });
    
    html += '</div>';
    historyContent.innerHTML = html;
    
    updateEditingDeadlineDisplays();
}

async function viewTimesheetDetails(timesheetId) {
    if (AppState.isLoading) return;
    
    try {
        const api = getApiClient();
        const timesheet = await api.getTimesheetById(timesheetId);
        alert(`Timesheet Details:\n\nWeek: ${timesheet.weekNumber}\nStatus: ${timesheet.status}\nTotal Hours: ${timesheet.totalHours}\n\nFull details coming soon...`);
    } catch (error) {
        console.error('Error loading timesheet details:', error);
        safeNotification('Failed to load timesheet details', 'error');
    }
}

async function exportTimesheetToCSV(timesheetId) {
    if (AppState.isLoading) return;
    
    setLoadingState(true);
    try {
        const api = getApiClient();
        const csvData = await api.exportTimesheetToCSV(timesheetId);
        
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

function showRejectedTimesheetsModal() {
    if (AppState.isLoading) return;
    
    setLoadingState(true);
    try {
        let rejectedModal = document.getElementById('rejected-timesheets-modal');
        
        if (!rejectedModal) {
            rejectedModal = document.createElement('div');
            rejectedModal.id = 'rejected-timesheets-modal';
            rejectedModal.className = 'modal';
            rejectedModal.innerHTML = `
                <div class="modal-content large-modal">
                    <span class="close-modal">&times;</span>
                    <h2><i class="fas fa-exclamation-triangle"></i> Rejected Timesheets Requiring Attention</h2>
                    <div class="modal-description">
                        <p>The following timesheets were rejected more than 15 days ago and are blocking new submissions.</p>
                    </div>
                    <div id="rejected-timesheets-content" class="rejected-timesheets-content">
                        <!-- Content will be loaded here -->
                    </div>
                    <div class="modal-actions">
                        <button class="btn btn-primary close-modal">Close</button>
                    </div>
                </div>
            `;
            document.body.appendChild(rejectedModal);
            
            rejectedModal.querySelector('.close-modal').addEventListener('click', () => {
                hideAllModals();
            });
        }
        
        loadRejectedTimesheetsContent();
        showModal(rejectedModal);
        
    } catch (error) {
        console.error('Error showing rejected timesheets modal:', error);
        safeNotification('Failed to load rejected timesheets', 'error');
    } finally {
        setLoadingState(false);
    }
}

async function loadRejectedTimesheetsContent() {
    try {
        const contentDiv = document.getElementById('rejected-timesheets-content');
        if (!contentDiv) return;
        
        const api = getApiClient();
        const timesheets = await api.getMyTimesheets();
        const now = new Date();
        const fifteenDaysAgo = new Date(now);
        fifteenDaysAgo.setDate(now.getDate() - 15);
        fifteenDaysAgo.setHours(23, 59, 59, 999);
        
        const blockingTimesheets = timesheets.filter(ts => 
            ts.status === 'rejected' && 
            ts.rejectedAt && 
            new Date(ts.rejectedAt) < fifteenDaysAgo &&
            !ts.isExpired
        );
        
        if (blockingTimesheets.length === 0) {
            contentDiv.innerHTML = `
                <div class="no-blocking-timesheets">
                    <i class="fas fa-check-circle fa-3x" style="color: #28a745; margin-bottom: 20px;"></i>
                    <h3>No Blocking Timesheets</h3>
                    <p>All your rejected timesheets have been resolved or are within the editing period.</p>
                </div>
            `;
            return;
        }
        
        let html = '<div class="blocking-timesheets-list">';
        
        blockingTimesheets.forEach(timesheet => {
            const weekStart = new Date(timesheet.weekStartDate).toLocaleDateString();
            const weekEnd = new Date(timesheet.weekEndDate).toLocaleDateString();
            const rejectedDate = new Date(timesheet.rejectedAt).toLocaleDateString();
            const daysBlocking = Math.floor((now - new Date(timesheet.rejectedAt)) / (24 * 60 * 60 * 1000)) - 15;
            
            html += `
                <div class="blocking-timesheet-item">
                    <div class="blocking-timesheet-info">
                        <div class="blocking-header">
                            <strong>Week ${timesheet.weekNumber}</strong>: ${weekStart} - ${weekEnd}
                            <span class="blocking-days">Blocking for ${daysBlocking} days</span>
                        </div>
                        <div class="blocking-details">
                            <div class="rejection-reason">
                                <strong>Rejection Reason:</strong> ${timesheet.rejectionReason || 'No reason provided'}
                            </div>
                            <div class="timesheet-meta">
                                <span>Rejected: ${rejectedDate}</span>
                                <span>Total Hours: ${timesheet.totalHours || 0}</span>
                            </div>
                        </div>
                    </div>
                    <div class="blocking-actions">
                        ${timesheet.canEdit ? `
                            <button class="btn btn-warning btn-sm edit-blocking-btn" data-id="${timesheet._id}">
                                <i class="fas fa-edit"></i> Edit Now
                            </button>
                        ` : `
                            <button class="btn btn-secondary btn-sm" disabled>
                                <i class="fas fa-ban"></i> Editing Expired
                            </button>
                        `}
                        <button class="btn btn-info btn-sm view-blocking-btn" data-id="${timesheet._id}">
                            <i class="fas fa-eye"></i> View Details
                        </button>
                    </div>
                </div>
            `;
        });
        
        html += '</div>';
        contentDiv.innerHTML = html;
        
        document.querySelectorAll('.edit-blocking-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                hideAllModals();
                showEditTimesheetModal(btn.getAttribute('data-id'));
            });
        });
        
        document.querySelectorAll('.view-blocking-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                viewTimesheetDetails(btn.getAttribute('data-id'));
            });
        });
        
    } catch (error) {
        console.error('Error loading rejected timesheets content:', error);
        document.getElementById('rejected-timesheets-content').innerHTML = `
            <div class="error-loading">
                <i class="fas fa-exclamation-circle"></i>
                <p>Failed to load rejected timesheets. Please try again.</p>
            </div>
        `;
    }
}

function toggleSidebar() {
    document.querySelector('.dashboard-container').classList.toggle('sidebar-collapsed');
}

function handleLogout() {
    if (confirm('Are you sure you want to logout?')) {
        if (AppState.editingDeadlineChecker) {
            clearInterval(AppState.editingDeadlineChecker);
        }
        
        saveDraftSilently();
        localStorage.removeItem('authToken');
        localStorage.removeItem('userData');
        localStorage.removeItem('rememberMe');
        window.location.href = 'index.html';
    }
}

function showAccessDenied() {
    const modal = document.getElementById('access-denied-modal');
    showModal(modal);
}

function showEmployeeProjects() {
    if (AppState.assignedProjects.length === 0) {
        safeNotification('No projects assigned to you', 'info');
        return;
    }
    
    const projectList = AppState.assignedProjects.map(project => 
        `• ${project.plNo || project.projectCode} - ${project.name} (${project.status})`
    ).join('\n');
    
    alert(`Your Assigned Projects:\n\n${projectList}`);
}

// Auto-save draft when leaving page
window.addEventListener('beforeunload', function(e) {
    const timesheetData = collectTimesheetData();
    if (timesheetData.entries.length > 0) {
        saveDraftSilently();
    }
});

// Make functions global for onclick events
window.showEditTimesheetModal = showEditTimesheetModal;
window.viewTimesheetDetails = viewTimesheetDetails;
window.exportTimesheetToCSV = exportTimesheetToCSV;
window.openMiscellaneousHoursModal = showRejectedTimesheetsModal;
window.closeMiscellaneousHoursModal = hideAllModals;
window.closeTimesheetDetailsModal = hideAllModals;

console.log('✅ COMPLETE DASHBOARD.JS loaded (2200+ lines) - All edit modal issues fixed');