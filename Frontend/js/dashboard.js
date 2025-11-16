// ==================== DASHBOARD.JS - COMPLETE REJECTION WORKFLOW WITH 15-DAY EDITING WINDOW ====================

// Global variables
let currentCell = null;
let userData = null;
let assignedProjects = [];
let isLoading = false;
let hasPendingRejectedTimesheets = false;
let editingDeadlineChecker = null;
let currentOpenModal = null;
let currentEditModal = null;
let isEditMode = false;

// Safe notification function
function safeNotification(message, type = 'info') {
    console.log(`📢 ${type.toUpperCase()}: ${message}`);
    
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
            z-index: 9999;
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

// Check if date is in future
function isFutureDate(day) {
    const startDate = new Date(document.getElementById('week-start-date').value);
    const dayIndex = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'].indexOf(day);
    const cellDate = new Date(startDate);
    cellDate.setDate(startDate.getDate() + dayIndex);
    
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    
    return cellDate > today;
}

// ✅ ENHANCED: Check for pending rejected timesheets with 15-day logic
async function checkPendingRejectedTimesheets() {
    try {
        const timesheets = await apiClient.getMyTimesheets();
        const now = new Date();
        const fifteenDaysAgo = new Date(now);
        fifteenDaysAgo.setDate(now.getDate() - 15);
        fifteenDaysAgo.setHours(23, 59, 59, 999);
        
        // Only show warning for timesheets rejected MORE than 15 days ago
        const pendingRejected = timesheets.filter(ts => 
            ts.status === 'rejected' && 
            ts.rejectedAt && 
            new Date(ts.rejectedAt) < fifteenDaysAgo &&
            !ts.isExpired
        );
        
        hasPendingRejectedTimesheets = pendingRejected.length > 0;
        
        if (hasPendingRejectedTimesheets) {
            showPendingRejectedWarning(pendingRejected.length);
        }
        
        // Start deadline checker for editable timesheets
        startEditingDeadlineChecker(timesheets);
        
        return hasPendingRejectedTimesheets;
    } catch (error) {
        console.warn('Could not check pending rejected timesheets:', error);
        return false;
    }
}

// ✅ NEW: Start periodic checking of editing deadlines
function startEditingDeadlineChecker(timesheets) {
    if (editingDeadlineChecker) {
        clearInterval(editingDeadlineChecker);
    }
    
    editingDeadlineChecker = setInterval(() => {
        updateEditingDeadlineDisplays();
    }, 60 * 60 * 1000);
    
    updateEditingDeadlineDisplays();
}

// ✅ NEW: Update all editing deadline displays
function updateEditingDeadlineDisplays() {
    const editableItems = document.querySelectorAll('.history-item.rejected');
    editableItems.forEach(item => {
        const timesheetId = item.getAttribute('data-timesheet-id');
        if (timesheetId) {
            updateSingleDeadlineDisplay(timesheetId, item);
        }
    });
}

// ✅ NEW: Update single deadline display
function updateSingleDeadlineDisplay(timesheetId, item) {
    const daysRemainingEl = item.querySelector('.days-remaining');
    const editButton = item.querySelector('.edit-rejected-btn');
    const statusBadge = item.querySelector('.editing-status');
    
    if (!daysRemainingEl || !editButton) return;
    
    const now = new Date();
    const editableUntil = new Date(item.getAttribute('data-editable-until'));
    
    // Normalize dates for accurate day calculation
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

// ✅ ENHANCED: Show warning for pending rejected timesheets
function showPendingRejectedWarning(count) {
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

// ✅ NEW: Show rejected timesheets in dedicated modal
function showRejectedTimesheetsModal() {
    if (isLoading) return;
    
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

// ✅ NEW: Load rejected timesheets content
async function loadRejectedTimesheetsContent() {
    try {
        const contentDiv = document.getElementById('rejected-timesheets-content');
        if (!contentDiv) return;
        
        const timesheets = await apiClient.getMyTimesheets();
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

// ✅ ENHANCED: Modal Management Functions
function showModal(modalElement) {
    hideAllModals();
    modalElement.style.display = 'block';
    currentOpenModal = modalElement;
    document.body.classList.add('modal-open');
}

function hideAllModals() {
    document.querySelectorAll('.modal').forEach(modal => {
        modal.style.display = 'none';
    });
    currentCell = null;
    currentOpenModal = null;
    document.body.classList.remove('modal-open');
}

// Loading state management
function setLoadingState(loading) {
    isLoading = loading;
    const buttons = document.querySelectorAll('button:not(.close-modal)');
    buttons.forEach(btn => {
        btn.disabled = loading;
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
        await checkPendingRejectedTimesheets();
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
    
    const departmentSelect = document.getElementById('department');
    if (departmentSelect && userData.department) {
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
        updateDateCellStates();
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
    
    // Close modal when clicking outside
    window.addEventListener('click', function(event) {
        if (currentOpenModal && event.target === currentOpenModal) {
            hideAllModals();
        }
    });
}

function toggleSidebar() {
    document.querySelector('.dashboard-container').classList.toggle('sidebar-collapsed');
}

function handleLogout() {
    if (confirm('Are you sure you want to logout?')) {
        if (editingDeadlineChecker) {
            clearInterval(editingDeadlineChecker);
        }
        
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

function showAccessDenied() {
    const modal = document.getElementById('access-denied-modal');
    showModal(modal);
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
    updateDateCellStates();
}

function addTimesheetRow() {
    if (isLoading) return;
    
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
    updateDateCellStates();
    safeNotification('New row added', 'success');
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
    
    const day = cell.getAttribute('data-day');
    if (isFutureDate(day)) {
        safeNotification('Cannot enter hours for future dates', 'warning');
        return;
    }
    
    if (hasPendingRejectedTimesheets && !cell.closest('#edit-timesheet-modal')) {
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
    console.log('💾 [MAIN] saveHoursToCell called, isEditMode:', isEditMode);
    
    if (isEditMode && currentCell) {
        saveEditHoursToCell();
        return;
    }
    
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

// ==================== FIXED EDIT MODAL FUNCTIONS WITH LOGGING ====================

// Show edit modal for rejected timesheets
function showEditTimesheetModal(timesheetId) {
    console.log('🔧 [EDIT] Starting showEditTimesheetModal for:', timesheetId);
    
    if (isLoading) return;
    
    setLoadingState(true);
    try {
        apiClient.getTimesheetById(timesheetId)
            .then(timesheet => {
                console.log('📋 [EDIT] Loaded timesheet data:', timesheet);
                console.log('📋 [EDIT] Timesheet entries:', timesheet.entries);
                
                // Enhanced validation
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
                safeNotification('Failed to load timesheet for editing', 'error');
                setLoadingState(false);
            });
    } catch (error) {
        console.error('❌ [EDIT] Error opening edit modal:', error);
        safeNotification('Error opening editor', 'error');
        setLoadingState(false);
    }
}

// Create and show edit modal
function createEditTimesheetModal(timesheet) {
    console.log('🔄 [EDIT] Creating edit modal for timesheet:', timesheet._id);
    console.log('📋 [EDIT] Original timesheet data:', {
        weekStartDate: timesheet.weekStartDate,
        weekEndDate: timesheet.weekEndDate,
        entriesCount: timesheet.entries?.length
    });
    
    // Set edit mode flag
    isEditMode = true;
    
    // Store the original timesheet data for reference
    window.currentEditingTimesheet = timesheet;
    
    // Remove existing edit modal if any
    const existingModal = document.getElementById('edit-timesheet-modal');
    if (existingModal) {
        console.log('🗑️ [EDIT] Removing existing modal');
        existingModal.remove();
    }

    // Create new modal
    const editModal = document.createElement('div');
    editModal.id = 'edit-timesheet-modal';
    editModal.className = 'modal';
    editModal.style.cssText = `
        display: block;
        position: fixed;
        z-index: 1002;
        left: 0;
        top: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(0,0,0,0.5);
        overflow: auto;
    `;

    editModal.innerHTML = `
        <div class="modal-content large-modal" style="max-width: 95%; max-height: 90vh; margin: 2% auto; background: white; border-radius: 8px; padding: 20px;">
            <span class="close-modal" style="float: right; font-size: 28px; cursor: pointer; color: #aaa; font-weight: bold;">&times;</span>
            <h2 style="margin-bottom: 20px; color: #2c3e50;">
                <i class="fas fa-edit"></i> Edit Rejected Timesheet
            </h2>
            
            <div class="edit-timesheet-info" style="background: #e3f2fd; padding: 15px; border-radius: 5px; margin-bottom: 20px; border-left: 4px solid #2196f3;">
                <p><strong>Week:</strong> ${timesheet.weekRange || 'N/A'}</p>
                <p><strong>Rejection Reason:</strong> ${timesheet.rejectionReason || 'No reason provided'}</p>
                <p><strong>Days Remaining to Edit:</strong> ${timesheet.daysRemaining || 0} days</p>
                <p><strong>Resubmission Count:</strong> ${timesheet.resubmissionCount || 0}</p>
            </div>

            <div style="margin-bottom: 15px;">
                <button id="add-edit-row-btn" class="btn btn-primary" style="padding: 8px 16px;">
                    <i class="fas fa-plus"></i> Add New Row
                </button>
            </div>

            <div class="timesheet-table-container" style="max-height: 50vh; overflow-y: auto; border: 1px solid #ddd; border-radius: 5px; background: white;">
                <table class="timesheet-table" id="edit-timesheet-table" style="width: 100%; min-width: 1200px; border-collapse: collapse;">
                    <thead style="background: #3498db; color: white; position: sticky; top: 0;">
                        <tr>
                            <th style="padding: 12px; border: 1px solid #2980b9;">SR.NO</th>
                            <th style="padding: 12px; border: 1px solid #2980b9;">PROJECT CODE</th>
                            <th style="padding: 12px; border: 1px solid #2980b9;">LOCATION</th>
                            <th style="padding: 12px; border: 1px solid #2980b9;">MON<br><span class="day-date">${formatDateForDisplay(timesheet.weekStartDate)}</span></th>
                            <th style="padding: 12px; border: 1px solid #2980b9;">TUE<br><span class="day-date">${formatDateForDisplay(addDays(timesheet.weekStartDate, 1))}</span></th>
                            <th style="padding: 12px; border: 1px solid #2980b9;">WED<br><span class="day-date">${formatDateForDisplay(addDays(timesheet.weekStartDate, 2))}</span></th>
                            <th style="padding: 12px; border: 1px solid #2980b9;">THU<br><span class="day-date">${formatDateForDisplay(addDays(timesheet.weekStartDate, 3))}</span></th>
                            <th style="padding: 12px; border: 1px solid #2980b9;">FRI<br><span class="day-date">${formatDateForDisplay(addDays(timesheet.weekStartDate, 4))}</span></th>
                            <th class="weekend" style="padding: 12px; border: 1px solid #2980b9; background: #e74c3c;">SAT<br><span class="day-date">${formatDateForDisplay(addDays(timesheet.weekStartDate, 5))}</span></th>
                            <th class="weekend" style="padding: 12px; border: 1px solid #2980b9; background: #e74c3c;">SUN<br><span class="day-date">${formatDateForDisplay(addDays(timesheet.weekStartDate, 6))}</span></th>
                            <th style="padding: 12px; border: 1px solid #2980b9;">ACTION</th>
                        </tr>
                    </thead>
                    <tbody id="edit-timesheet-body" style="background: #f8f9fa;">
                        <!-- Rows will be populated here -->
                    </tbody>
                </table>
            </div>

            <div class="form-actions" style="margin-top: 20px; display: flex; gap: 10px; justify-content: flex-end;">
                <button id="save-edited-timesheet" class="btn btn-success" style="padding: 10px 20px;">
                    <i class="fas fa-check"></i> Save & Resubmit
                </button>
                <button class="btn btn-secondary close-modal" style="padding: 10px 20px;">
                    <i class="fas fa-times"></i> Cancel
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(editModal);
    document.body.classList.add('modal-open');
    currentEditModal = editModal;

    // Setup event listeners
    editModal.querySelector('.close-modal').addEventListener('click', () => {
        console.log('❌ [EDIT] Closing edit modal');
        isEditMode = false;
        editModal.remove();
        document.body.classList.remove('modal-open');
        currentEditModal = null;
    });

    editModal.querySelector('#save-edited-timesheet').addEventListener('click', () => {
        console.log('💾 [EDIT] Save button clicked');
        saveEditedTimesheet(timesheet._id);
    });

    editModal.querySelector('#add-edit-row-btn').addEventListener('click', () => {
        console.log('➕ [EDIT] Add row button clicked');
        addEditRow();
    });

    // Close modal when clicking outside
    editModal.addEventListener('click', (e) => {
        if (e.target === editModal) {
            console.log('❌ [EDIT] Closing modal via outside click');
            isEditMode = false;
            editModal.remove();
            document.body.classList.remove('modal-open');
            currentEditModal = null;
        }
    });

    // Populate the table
    populateEditTable(timesheet);
    setLoadingState(false);
    console.log('✅ [EDIT] Edit modal created successfully');
}

// Populate edit table with timesheet data
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

    // Group entries by project code and location
    const groupedEntries = {};
    timesheet.entries.forEach((entry, index) => {
        const key = `${entry.projectCode}-${entry.location || ''}`;
        if (!groupedEntries[key]) {
            groupedEntries[key] = {
                projectCode: entry.projectCode,
                location: entry.location || '',
                entries: {}
            };
        }
        const day = entry.dayOfWeek.toLowerCase().substring(0, 3);
        groupedEntries[key].entries[day] = entry;
        console.log(`📝 [EDIT] Entry ${index}: ${entry.projectCode} - ${day} - ${entry.normalHours}/${entry.overtimeHours}h`);
    });

    console.log('📋 [EDIT] Grouped entries:', Object.keys(groupedEntries).length, 'groups');

    // Create rows from grouped entries
    let rowNumber = 1;
    Object.values(groupedEntries).forEach((group, index) => {
        console.log(`🔄 [EDIT] Creating row ${rowNumber} for project: ${group.projectCode}`);
        const row = createEditTableRow(rowNumber, group, timesheet.weekStartDate);
        tbody.appendChild(row);
        rowNumber++;
    });

    console.log('✅ [EDIT] Edit table populated with', rowNumber - 1, 'rows');
}

// Create a single row for edit table
function createEditTableRow(rowNumber, group, weekStartDate) {
    console.log(`🔄 [EDIT] Creating row ${rowNumber} with data:`, group);
    
    const row = document.createElement('tr');
    row.setAttribute('data-edit-row', 'true');
    
    row.innerHTML = `
        <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">${rowNumber}</td>
        <td style="padding: 4px; border: 1px solid #ddd;">
            <select class="project-select edit-project-select" required style="width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px; background: white;">
                <option value="">Select Project</option>
            </select>
        </td>
        <td style="padding: 4px; border: 1px solid #ddd;">
            <input type="text" class="location-input edit-location-input" value="${group.location || ''}" 
                   placeholder="Enter location" maxlength="100" 
                   style="width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px;">
        </td>
        ${['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'].map(day => {
            const entry = group.entries[day];
            const normalHours = entry ? (entry.normalHours || 0) : 0;
            const overtimeHours = entry ? (entry.overtimeHours || 0) : 0;
            const activityCode = entry ? (entry.activityCode || '') : '';
            const remark = entry ? (entry.remarks || '') : '';
            
            const hasHours = normalHours > 0 || overtimeHours > 0;
            const cellStyle = hasHours ? 
                'background-color: #d4edda; cursor: pointer; padding: 8px; border: 1px solid #ddd; text-align: center;' : 
                'cursor: pointer; padding: 8px; border: 1px solid #ddd; text-align: center;';
            
            return `
                <td class="time-cell edit-time-cell" 
                    data-day="${day}" 
                    data-normal-hours="${normalHours}" 
                    data-overtime-hours="${overtimeHours}" 
                    data-activity-code="${activityCode}"
                    data-remark="${remark}"
                    style="${cellStyle}">
                    <span class="normal-hours">${normalHours}</span>/<span class="overtime-hours">${overtimeHours}</span>
                </td>
            `;
        }).join('')}
        <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">
            <button class="delete-row-btn edit-delete-btn" title="Delete Row" style="background: none; border: none; color: #e74c3c; cursor: pointer; padding: 5px;">
                <i class="fas fa-trash"></i>
            </button>
        </td>
    `;

    // Setup project dropdown
    const projectSelect = row.querySelector('.edit-project-select');
    console.log(`🔄 [EDIT] Setting up project dropdown for row ${rowNumber}`);
    updateProjectDropdown(projectSelect);
    
    // Set project value after dropdown is populated
    setTimeout(() => {
        if (group.projectCode) {
            projectSelect.value = group.projectCode;
            console.log(`✅ [EDIT] Set project value to: ${group.projectCode}`);
        }
    }, 100);

    // Setup time cell click handlers
    row.querySelectorAll('.edit-time-cell').forEach(cell => {
        cell.addEventListener('click', function() {
            console.log('🔄 [EDIT] Time cell clicked in edit modal:', this.getAttribute('data-day'));
            openEditHoursModal(this);
        });
    });

    // Setup delete button
    row.querySelector('.edit-delete-btn').addEventListener('click', function() {
        console.log('🗑️ [EDIT] Delete button clicked for row', rowNumber);
        if (confirm('Are you sure you want to delete this row?')) {
            row.remove();
            updateEditRowNumbers();
            console.log('✅ [EDIT] Row deleted');
        }
    });

    console.log(`✅ [EDIT] Row ${rowNumber} created successfully`);
    return row;
}

// Add new row in edit mode
function addEditRow() {
    console.log('➕ [EDIT] Adding new row to edit table');
    
    const tbody = document.getElementById('edit-timesheet-body');
    if (!tbody) {
        console.error('❌ [EDIT] Edit timesheet body not found for adding row');
        return;
    }
    
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
    
    const weekStartDate = document.querySelector('#edit-timesheet-modal .day-date')?.textContent;
    const row = createEditTableRow(rowCount + 1, emptyGroup, weekStartDate);
    tbody.appendChild(row);
    
    console.log('✅ [EDIT] New row added, total rows:', rowCount + 1);
}

// Special hours modal for edit mode
function openEditHoursModal(cell) {
    console.log('🔄 [EDIT] Opening edit hours modal for cell:', cell);
    console.log('🔄 [EDIT] Cell data - day:', cell.getAttribute('data-day'), 
                'normal:', cell.getAttribute('data-normal-hours'), 
                'overtime:', cell.getAttribute('data-overtime-hours'));
    
    if (isLoading) return;
    
    // Set current cell and mark that we're in edit mode
    currentCell = cell;
    isEditMode = true;
    
    const normalHours = parseFloat(cell.getAttribute('data-normal-hours')) || 0;
    const overtimeHours = parseFloat(cell.getAttribute('data-overtime-hours')) || 0;
    const activityCode = cell.getAttribute('data-activity-code') || '';
    const remark = cell.getAttribute('data-remark') || '';
    
    console.log('📝 [EDIT] Setting form values - normal:', normalHours, 'overtime:', overtimeHours, 'activity:', activityCode);
    
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
    
    // Show the existing hours modal but ensure it's on top
    const hoursModal = document.getElementById('hours-modal');
    if (hoursModal) {
        hoursModal.style.zIndex = '1003';
        hoursModal.style.display = 'block';
        
        // Update available hours info
        const day = cell.getAttribute('data-day');
        updateAvailableHoursInfo(day);
        
        console.log('✅ [EDIT] Hours modal shown for edit mode');
        
        setTimeout(() => {
            document.getElementById('work-hours').focus();
        }, 100);
    } else {
        console.error('❌ [EDIT] Hours modal not found');
    }
}

// Save hours specifically for edit mode
function saveEditHoursToCell() {
    console.log('💾 [EDIT] Saving hours to edit modal cell');
    
    if (!currentCell || isLoading) return;

    const hoursType = document.getElementById('hours-type').value;
    const enteredHours = parseFloat(document.getElementById('work-hours').value) || 0;
    const activityCode = document.getElementById('activity-code').value;
    const remark = document.getElementById('work-remark').value.trim();
    
    console.log('📝 [EDIT] Saving - type:', hoursType, 'hours:', enteredHours, 'activity:', activityCode);

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
    
    // Update the cell in edit modal
    currentCell.innerHTML = `<span class="normal-hours">${normalHours}</span>/<span class="overtime-hours">${overtimeHours}</span>`;
    currentCell.setAttribute('data-normal-hours', normalHours);
    currentCell.setAttribute('data-overtime-hours', overtimeHours);
    currentCell.setAttribute('data-activity-code', activityCode);
    
    if (remark) {
        currentCell.setAttribute('data-remark', remark);
    }
    
    // Visual feedback
    currentCell.style.backgroundColor = '#d4edda';
    
    console.log('✅ [EDIT] Hours saved to edit cell - normal:', normalHours, 'overtime:', overtimeHours);
    
    // Close the hours modal but keep edit modal open
    const hoursModal = document.getElementById('hours-modal');
    if (hoursModal) {
        hoursModal.style.display = 'none';
    }
    
    safeNotification('Hours saved to timesheet', 'success');
}

// Update row numbers in edit mode
function updateEditRowNumbers() {
    const rows = document.querySelectorAll('#edit-timesheet-body tr');
    console.log('🔄 [EDIT] Updating row numbers for', rows.length, 'rows');
    
    rows.forEach((row, index) => {
        const firstCell = row.cells[0];
        if (firstCell) {
            firstCell.textContent = index + 1;
        }
    });
    console.log('✅ [EDIT] Row numbers updated');
}

// Fixed collectEditTimesheetData function
function collectEditTimesheetData() {
    console.log('📝 [EDIT] Starting to collect data from edit table');
    
    const tbody = document.getElementById('edit-timesheet-body');
    if (!tbody) {
        console.error('❌ [EDIT] Edit timesheet body not found for data collection');
        return [];
    }
    
    const rows = tbody.querySelectorAll('tr');
    const entries = [];
    
    console.log('📝 [EDIT] Found', rows.length, 'rows to process');

    // Get the week start date from the modal header
    const weekStartText = document.querySelector('#edit-timesheet-modal .day-date')?.textContent;
    console.log('📅 [EDIT] Week start text from modal:', weekStartText);
    
    let weekStartDate = new Date();
    
    if (weekStartText) {
        try {
            // Parse "day/month" format from the table header (e.g., "20/11")
            const [startDay, startMonth] = weekStartText.split('/');
            const currentYear = new Date().getFullYear();
            weekStartDate = new Date(currentYear, parseInt(startMonth) - 1, parseInt(startDay));
            console.log('📅 [EDIT] Parsed week start date:', weekStartDate.toISOString());
        } catch (error) {
            console.error('❌ [EDIT] Error parsing week start date:', error);
            // Fallback to current date
            weekStartDate = new Date();
        }
    }

    rows.forEach((row, rowIndex) => {
        const projectSelect = row.querySelector('.edit-project-select');
        const locationInput = row.querySelector('.edit-location-input');
        const dayCells = row.querySelectorAll('.edit-time-cell');
        
        console.log(`📝 [EDIT] Processing row ${rowIndex + 1}, project:`, projectSelect?.value);
        
        if (projectSelect && projectSelect.value) {
            ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'].forEach((day, dayIndex) => {
                const dayCell = dayCells[dayIndex];
                if (dayCell) {
                    const normalHours = parseFloat(dayCell.getAttribute('data-normal-hours')) || 0;
                    const overtimeHours = parseFloat(dayCell.getAttribute('data-overtime-hours')) || 0;
                    const activityCode = dayCell.getAttribute('data-activity-code');
                    
                    console.log(`📝 [EDIT] Cell ${day}: normal=${normalHours}, overtime=${overtimeHours}, activity=${activityCode}`);
                    
                    if (normalHours > 0 || overtimeHours > 0) {
                        // Calculate date based on week start date + day index
                        const cellDate = new Date(weekStartDate);
                        cellDate.setDate(weekStartDate.getDate() + dayIndex);
                        
                        const entry = {
                            date: cellDate.toISOString().split('T')[0],
                            dayOfWeek: getFullDayName(day),
                            projectCode: projectSelect.value,
                            project: projectSelect.querySelector(`option[value="${projectSelect.value}"]`)?.getAttribute('data-project-id') || null,
                            location: locationInput?.value || '',
                            normalHours: normalHours,
                            overtimeHours: overtimeHours,
                            activityCode: activityCode || 'MISC',
                            remarks: dayCell.getAttribute('data-remark') || '',
                            department: userData.department
                        };
                        
                        console.log(`📅 [EDIT] Entry ${entries.length + 1}:`, entry);
                        entries.push(entry);
                    } else {
                        console.log(`⏭️ [EDIT] Skipping ${day} - no hours entered`);
                    }
                }
            });
        } else {
            console.log(`⚠️ [EDIT] Row ${rowIndex + 1} skipped - no project selected`);
        }
    });
    
    console.log('✅ [EDIT] Collection complete -', entries.length, 'entries total');
    
    if (entries.length === 0) {
        console.warn('⚠️ [EDIT] No entries with hours found!');
    }
    
    return entries;
}

// Also fix the saveEditedTimesheet function to handle the response properly
function saveEditedTimesheet(timesheetId) {
    console.log('💾 [EDIT] Starting saveEditedTimesheet for:', timesheetId);
    
    if (isLoading) return;
    
    const entries = collectEditTimesheetData();
    console.log('📝 [EDIT] Collected entries for saving:', entries);
    
    if (entries.length === 0) {
        safeNotification('Please add at least one timesheet entry with hours', 'error');
        return;
    }
    
    // Validate that we have at least some hours
    const totalHours = entries.reduce((sum, entry) => sum + entry.normalHours + entry.overtimeHours, 0);
    if (totalHours === 0) {
        safeNotification('Please enter some hours in the timesheet', 'error');
        return;
    }
    
    if (!confirm('Are you sure you want to save and resubmit this timesheet?')) {
        console.log('❌ [EDIT] Save cancelled by user');
        return;
    }
    
    setLoadingState(true);
    console.log('🔄 [EDIT] Sending data to server...');
    
    // Create the complete timesheet data object
    const timesheetData = {
        entries: entries
    };
    
    console.log('📤 [EDIT] Sending timesheet data:', timesheetData);
    
    apiClient.editRejectedTimesheet(timesheetId, timesheetData)
        .then(response => {
            console.log('✅ [EDIT] Timesheet edited successfully:', response);
            safeNotification('Timesheet edited and resubmitted successfully!', 'success');
            
            // Reset edit mode
            isEditMode = false;
            
            // Close modal
            const editModal = document.getElementById('edit-timesheet-modal');
            if (editModal) {
                editModal.remove();
            }
            document.body.classList.remove('modal-open');
            currentEditModal = null;
            
            console.log('✅ [EDIT] Modal closed, refreshing page...');
            
            // Refresh the page after delay
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

// Utility functions for date formatting
function formatDateForDisplay(dateString) {
    if (!dateString) return '';
    try {
        const date = new Date(dateString);
        return `${date.getDate()}/${date.getMonth() + 1}`;
    } catch (error) {
        return '';
    }
}

function addDays(dateString, days) {
    if (!dateString) return new Date();
    try {
        const date = new Date(dateString);
        date.setDate(date.getDate() + days);
        return date;
    } catch (error) {
        return new Date();
    }
}

// ==================== HISTORY & EDIT MODAL ====================

async function showHistoryModal() {
    if (isLoading) return;
    
    setLoadingState(true);
    try {
        const timesheets = await apiClient.getMyTimesheets();
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

// ✅ ENHANCED: Display history content with 15-day editing window
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
                editButton = `<button class="btn-small btn-warning edit-rejected-btn" onclick="showEditTimesheetModal('${timesheet._id}')" ${isLoading ? 'disabled' : ''}>
                    <i class="fas fa-edit"></i> Edit
                </button>`;
            } else if (timesheet.isExpired) {
                editingStatus = `<span class="editing-status status-expired">EXPIRED</span>`;
                editingInfo = `<div class="days-remaining">
                    <span class="expired-text">Editing expired</span>
                </div>`;
                editButton = `<button class="btn-small btn-expired" disabled>
                    <i class="fas fa-ban"></i> Edit Expired
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
    
    updateEditingDeadlineDisplays();
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

// Make functions global for onclick events
window.showEditTimesheetModal = showEditTimesheetModal;
window.viewTimesheetDetails = viewTimesheetDetails;
window.exportTimesheetToCSV = exportTimesheetToCSV;
window.openMiscellaneousHoursModal = showRejectedTimesheetsModal;
window.closeMiscellaneousHoursModal = hideAllModals;
window.closeTimesheetDetailsModal = hideAllModals;
window.saveEditHoursToCell = saveEditHoursToCell;

console.log('✅ Enhanced Dashboard.js loaded with complete 15-day editing window workflow and comprehensive logging');