// leave.js - Employee Leave Application Functionality
/*
// ✅ ADDED: Global variable to store leave balance
let currentLeaveBalance = {
    casualLeave: { available: 2, max: 8, used: 6 },
    sickLeave: { available: 8, max: 8, used: 0 },
    personalLeave: { available: 22, max: 22, used: 0 }
};

document.addEventListener('DOMContentLoaded', function() {
    console.log('🔄 Initializing Leave Application...');
    
    // Check authentication
    const userData = getUserData();
    if (!userData) {
        window.location.href = 'index.html';
        return;
    }

    // Update user info
    document.getElementById('employee-name').textContent = `${userData.firstName} ${userData.lastName}`;
    document.getElementById('employee-code').value = userData.employeeId;

    // Initialize event listeners
    initializeEventListeners();
    
    // ✅ ADDED: Load leave balance first
    loadLeaveBalanceForApplication();
    
    // Load leave requests
    loadMyLeaveRequests();
});

function initializeEventListeners() {
    // Sidebar toggle
    document.getElementById('toggle-sidebar').addEventListener('click', function() {
        document.querySelector('.dashboard-container').classList.toggle('sidebar-collapsed');
    });

    // File upload handling
    const fileUploadArea = document.getElementById('file-upload-area');
    const fileInput = document.getElementById('supporting-document');
    const filePreview = document.getElementById('file-preview');
    const fileName = document.getElementById('file-name');
    const removeFileBtn = document.getElementById('remove-file');

    fileUploadArea.addEventListener('click', () => fileInput.click());
    fileUploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        fileUploadArea.style.borderColor = '#3498db';
        fileUploadArea.style.backgroundColor = '#f8f9fa';
    });
    fileUploadArea.addEventListener('dragleave', () => {
        fileUploadArea.style.borderColor = '#bdc3c7';
        fileUploadArea.style.backgroundColor = 'transparent';
    });
    fileUploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        fileUploadArea.style.borderColor = '#bdc3c7';
        fileUploadArea.style.backgroundColor = 'transparent';
        
        if (e.dataTransfer.files.length > 0) {
            handleFileSelect(e.dataTransfer.files[0]);
        }
    });

    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            handleFileSelect(e.target.files[0]);
        }
    });

    removeFileBtn.addEventListener('click', () => {
        fileInput.value = '';
        filePreview.style.display = 'none';
        fileUploadArea.style.display = 'block';
    });

    // Form submission
    document.getElementById('leave-application-form').addEventListener('submit', submitLeaveRequest);
    
    // Cancel button
    document.getElementById('cancel-btn').addEventListener('click', resetForm);
    
    // Status filter
    document.getElementById('status-filter').addEventListener('change', filterLeaveRequests);
    
    // Logout
    document.getElementById('logout-btn').addEventListener('click', logout);
}

// ✅ ADDED: Load leave balance for leave application
async function loadLeaveBalanceForApplication() {
    try {
        const balance = await apiClient.request('/leave/balance');
        currentLeaveBalance = balance;
        updateAvailableLeavesDisplay();
    } catch (error) {
        console.error('Error loading leave balance:', error);
        // Use default values if API fails
        updateAvailableLeavesDisplay();
    }
}

// ✅ ADDED: Update available leaves display
function updateAvailableLeavesDisplay() {
    // Update quick view
    document.getElementById('available-cl').textContent = 
        `${currentLeaveBalance.casualLeave.available}/${currentLeaveBalance.casualLeave.max}`;
    document.getElementById('available-sl').textContent = 
        `${currentLeaveBalance.sickLeave.available}/${currentLeaveBalance.sickLeave.max}`;
    document.getElementById('available-pl').textContent = 
        `${currentLeaveBalance.personalLeave.available}/${currentLeaveBalance.personalLeave.max}`;
}

// ✅ ADDED: Update leave type info when selection changes
function updateLeaveTypeInfo() {
    const leaveType = document.getElementById('leave-type').value;
    const infoDiv = document.getElementById('leave-type-info');
    
    if (leaveType && ['casual', 'sick', 'personal'].includes(leaveType)) {
        const available = currentLeaveBalance[`${leaveType}Leave`].available;
        const max = currentLeaveBalance[`${leaveType}Leave`].max;
        
        document.getElementById('selected-leave-available').textContent = available;
        infoDiv.style.display = 'block';
        
        // Check if we need to show insufficient leave warning
        checkLeaveAvailability(leaveType);
    } else {
        infoDiv.style.display = 'none';
    }
    
    // Recalculate leave days if dates are already selected
    calculateLeaveDays();
}

// ✅ ADDED: Calculate leave days between dates
function calculateLeaveDays() {
    const startDate = document.getElementById('start-date').value;
    const endDate = document.getElementById('end-date').value;
    const durationInfo = document.getElementById('leave-duration-info');
    
    if (startDate && endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        const timeDiff = end.getTime() - start.getTime();
        const totalDays = Math.ceil(timeDiff / (1000 * 3600 * 24)) + 1; // Inclusive
        
        document.getElementById('total-days').textContent = totalDays;
        
        // Format dates for display
        const startFormatted = start.toLocaleDateString('en-GB');
        const endFormatted = end.toLocaleDateString('en-GB');
        document.getElementById('duration-dates').textContent = `(${startFormatted} to ${endFormatted})`;
        
        durationInfo.style.display = 'block';
        
        // Check leave availability for selected type
        const leaveType = document.getElementById('leave-type').value;
        if (leaveType) {
            checkLeaveAvailability(leaveType, totalDays);
        }
    } else {
        durationInfo.style.display = 'none';
    }
}

// ✅ ADDED: Check if sufficient leaves are available
function checkLeaveAvailability(leaveType, requiredDays = 0) {
    const submitBtn = document.getElementById('submit-leave-btn');
    let warningDiv = document.getElementById('insufficient-leave-warning');
    
    // Create warning div if it doesn't exist
    if (!warningDiv) {
        warningDiv = document.createElement('div');
        warningDiv.id = 'insufficient-leave-warning';
        warningDiv.className = 'insufficient-leave-warning';
        document.getElementById('leave-type').parentNode.appendChild(warningDiv);
    }
    
    if (leaveType && ['casual', 'sick', 'personal'].includes(leaveType)) {
        const available = currentLeaveBalance[`${leaveType}Leave`].available;
        
        if (requiredDays > 0 && available < requiredDays) {
            warningDiv.textContent = `Insufficient ${leaveType} leave! Available: ${available} days, Required: ${requiredDays} days`;
            warningDiv.classList.add('show');
            submitBtn.disabled = true;
            submitBtn.style.opacity = '0.6';
        } else if (available === 0) {
            warningDiv.textContent = `No ${leaveType} leave available!`;
            warningDiv.classList.add('show');
            submitBtn.disabled = true;
            submitBtn.style.opacity = '0.6';
        } else {
            warningDiv.classList.remove('show');
            submitBtn.disabled = false;
            submitBtn.style.opacity = '1';
        }
    } else {
        warningDiv.classList.remove('show');
        submitBtn.disabled = false;
        submitBtn.style.opacity = '1';
    }
}

function handleFileSelect(file) {
    // Validate file type and size
    const allowedTypes = ['.pdf', '.doc', '.docx', '.jpg', '.jpeg', '.png'];
    const fileExt = '.' + file.name.split('.').pop().toLowerCase();
    const maxSize = 5 * 1024 * 1024; // 5MB

    if (!allowedTypes.includes(fileExt)) {
        showNotification('Please select a valid file type (PDF, Word, or Image)', 'error');
        return;
    }

    if (file.size > maxSize) {
        showNotification('File size must be less than 5MB', 'error');
        return;
    }

    // Show file preview
    document.getElementById('file-name').textContent = file.name;
    document.getElementById('file-preview').style.display = 'block';
    document.getElementById('file-upload-area').style.display = 'none';
}

// ✅ ADDED: Update form submission to include validation
async function submitLeaveRequest(e) {
    e.preventDefault();

        console.log('🔍 DEBUG: Form submission started');
        console.log('Form data:', {
        leaveType: document.getElementById('leave-type').value,
        startDate: document.getElementById('start-date').value,
        endDate: document.getElementById('end-date').value,
        reason: document.getElementById('reason').value
        });
    
    try {
        const formData = new FormData();
        const leaveType = document.getElementById('leave-type').value;
        const startDate = document.getElementById('start-date').value;
        const endDate = document.getElementById('end-date').value;
        
        // Validate leave balance
        if (['casual', 'sick', 'personal'].includes(leaveType)) {
            const start = new Date(startDate);
            const end = new Date(endDate);
            const totalDays = Math.ceil((end - start) / (1000 * 3600 * 24)) + 1;
            const available = currentLeaveBalance[`${leaveType}Leave`].available;
            
            if (available < totalDays) {
                showNotification(`Insufficient ${leaveType} leave balance! Available: ${available} days, Required: ${totalDays} days`, 'error');
                return;
            }
        }
        
        // Add form data
        formData.append('startDate', startDate);
        formData.append('endDate', endDate);
        formData.append('leaveType', leaveType);
        formData.append('reason', document.getElementById('reason').value);
        
        // Add file if exists
        const fileInput = document.getElementById('supporting-document');
        if (fileInput.files.length > 0) {
            formData.append('document', fileInput.files[0]);
        }

        // Validate dates
        const start = new Date(formData.get('startDate'));
        const end = new Date(formData.get('endDate'));
        
        if (start >= end) {
            showNotification('End date must be after start date', 'error');
            return;
        }

        // Show loading state
        const submitBtn = document.getElementById('submit-leave-btn');
        const originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Submitting...';
        submitBtn.disabled = true;

        // Submit leave request using API client
        const response = await apiClient.submitLeaveRequest({
            startDate: formData.get('startDate'),
            endDate: formData.get('endDate'),
            leaveType: formData.get('leaveType'),
            reason: formData.get('reason'),
            document: fileInput.files[0] || null
        });

        showNotification('Leave request submitted successfully!', 'success');
        resetForm();
        loadMyLeaveRequests();
        
        // ✅ ADDED: Reload leave balance after submission
        loadLeaveBalanceForApplication();

    } catch (error) {
        console.error('Error submitting leave request:', error);
        showNotification(error.message || 'Failed to submit leave request', 'error');
    } finally {
        // Reset button state
        const submitBtn = document.getElementById('submit-leave-btn');
        submitBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Submit Leave Request';
        submitBtn.disabled = false;
    }
}

async function loadMyLeaveRequests() {
    try {
        const leaveRequests = await apiClient.getMyLeaveRequests();
        displayLeaveRequests(leaveRequests);
        
    } catch (error) {
        console.error('Error loading leave requests:', error);
        showNotification('Failed to load leave requests', 'error');
        document.getElementById('requests-list').innerHTML = `
            <div class="empty-state">
                <i class="fas fa-exclamation-circle"></i>
                <p>Failed to load leave requests</p>
            </div>
        `;
    }
}

function displayLeaveRequests(leaveRequests) {
    const requestsList = document.getElementById('requests-list');
    
    if (!leaveRequests || leaveRequests.length === 0) {
        requestsList.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-inbox"></i>
                <p>No leave requests found</p>
                <small>Submit your first leave request above</small>
            </div>
        `;
        return;
    }

    requestsList.innerHTML = leaveRequests.map(request => {
        const startDate = new Date(request.startDate).toLocaleDateString('en-GB');
        const endDate = new Date(request.endDate).toLocaleDateString('en-GB');
        const appliedDate = new Date(request.createdAt).toLocaleDateString('en-GB');
        const processedDate = request.approvedAt ? new Date(request.approvedAt).toLocaleDateString('en-GB') : null;
        
        return `
        <div class="leave-request-card" data-id="${request._id}">
            <div class="leave-request-header">
                <div>
                    <span class="leave-type">${request.leaveType.charAt(0).toUpperCase() + request.leaveType.slice(1)} Leave</span>
                    <div class="leave-dates">
                        <div class="date-item">
                            <span class="date-label">From</span>
                            <span class="date-value">${startDate}</span>
                        </div>
                        <div class="date-item">
                            <span class="date-label">To</span>
                            <span class="date-value">${endDate}</span>
                        </div>
                    </div>
                </div>
                <span class="leave-status status-${request.status}">
                    ${request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                </span>
            </div>
            
            <div class="leave-reason">
                <div class="reason-label">Reason</div>
                <div class="reason-text">${sanitizeHTML(request.reason)}</div>
            </div>
            
            ${request.supportingDocument ? `
            <div class="document-info">
                <div class="reason-label">Supporting Document</div>
                <button class="btn-small btn-primary" onclick="downloadDocument('${request._id}')">
                    <i class="fas fa-download"></i> Download
                </button>
            </div>
            ` : ''}
            
            ${request.rejectionReason ? `
            <div class="rejection-reason">
                <div class="reason-label">Rejection Reason</div>
                <div class="reason-text">${sanitizeHTML(request.rejectionReason)}</div>
            </div>
            ` : ''}
            
            <div class="leave-meta">
                <small>Applied on: ${appliedDate}</small>
                ${processedDate ? `<small>Processed on: ${processedDate}</small>` : ''}
            </div>
        </div>
        `;
    }).join('');
}

async function downloadDocument(leaveRequestId) {
    try {
        await apiClient.downloadLeaveDocument(leaveRequestId);
    } catch (error) {
        console.error('Error downloading document:', error);
        showNotification('Failed to download document', 'error');
    }
}

function filterLeaveRequests() {
    const statusFilter = document.getElementById('status-filter').value;
    const allRequests = document.querySelectorAll('.leave-request-card');
    
    allRequests.forEach(request => {
        const status = request.querySelector('.leave-status').textContent.toLowerCase();
        
        if (statusFilter === 'all' || status === statusFilter) {
            request.style.display = 'block';
        } else {
            request.style.display = 'none';
        }
    });
}


// ✅ ADDED: Update reset form function
function resetForm() {
    document.getElementById('leave-application-form').reset();
    document.getElementById('file-preview').style.display = 'none';
    document.getElementById('file-upload-area').style.display = 'block';
    document.getElementById('supporting-document').value = '';
    document.getElementById('leave-type-info').style.display = 'none';
    document.getElementById('leave-duration-info').style.display = 'none';
    
    // Hide any warning messages
    const warningDiv = document.getElementById('insufficient-leave-warning');
    if (warningDiv) {
        warningDiv.classList.remove('show');
    }
}


// Make functions globally available
window.downloadDocument = downloadDocument;
window.updateLeaveTypeInfo = updateLeaveTypeInfo;
window.calculateLeaveDays = calculateLeaveDays;*/

// leave.js - Employee Leave Application Functionality

// ✅ ADDED: Global variable to store leave balance with debug
let currentLeaveBalance = {
    casualLeave: { available: 8, max: 8, used: 0 },
    sickLeave: { available: 8, max: 8, used: 0 },
    personalLeave: { available: 22, max: 22, used: 0 }
};

console.log('🔄 leave.js loaded - Debug mode enabled');
console.log('🔍 DEBUG: Initial leave balance set:', currentLeaveBalance);

document.addEventListener('DOMContentLoaded', function() {
    console.log('🔄 Initializing Leave Application...');
    
    // Check authentication
    const userData = getUserData();
    if (!userData) {
        console.log('❌ DEBUG: No user data, redirecting to login');
        window.location.href = 'index.html';
        return;
    }

    console.log('✅ DEBUG: User authenticated:', userData.firstName, userData.lastName);

    // Update user info
    document.getElementById('employee-name').textContent = `${userData.firstName} ${userData.lastName}`;
    document.getElementById('employee-code').value = userData.employeeId;

    // Initialize event listeners
    initializeEventListeners();
    
    // ✅ ADDED: Load leave balance first
    loadLeaveBalanceForApplication();
    
    // Load leave requests
    loadMyLeaveRequests();
});

function initializeEventListeners() {
    console.log('🔍 DEBUG: Initializing event listeners...');
    
    // Sidebar toggle
    document.getElementById('toggle-sidebar').addEventListener('click', function() {
        document.querySelector('.dashboard-container').classList.toggle('sidebar-collapsed');
    });

    // File upload handling
    const fileUploadArea = document.getElementById('file-upload-area');
    const fileInput = document.getElementById('supporting-document');
    const filePreview = document.getElementById('file-preview');
    const fileName = document.getElementById('file-name');
    const removeFileBtn = document.getElementById('remove-file');

    fileUploadArea.addEventListener('click', () => {
        console.log('🔍 DEBUG: File upload area clicked');
        fileInput.click();
    });
    
    fileUploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        fileUploadArea.style.borderColor = '#3498db';
        fileUploadArea.style.backgroundColor = '#f8f9fa';
    });
    
    fileUploadArea.addEventListener('dragleave', () => {
        fileUploadArea.style.borderColor = '#bdc3c7';
        fileUploadArea.style.backgroundColor = 'transparent';
    });
    
    fileUploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        fileUploadArea.style.borderColor = '#bdc3c7';
        fileUploadArea.style.backgroundColor = 'transparent';
        
        if (e.dataTransfer.files.length > 0) {
            console.log('🔍 DEBUG: File dropped:', e.dataTransfer.files[0].name);
            handleFileSelect(e.dataTransfer.files[0]);
        }
    });

    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            console.log('🔍 DEBUG: File selected:', e.target.files[0].name);
            handleFileSelect(e.target.files[0]);
        }
    });

    removeFileBtn.addEventListener('click', () => {
        console.log('🔍 DEBUG: File removed');
        fileInput.value = '';
        filePreview.style.display = 'none';
        fileUploadArea.style.display = 'block';
    });

    // Form submission
    document.getElementById('leave-application-form').addEventListener('submit', submitLeaveRequest);
    
    // Cancel button
    document.getElementById('cancel-btn').addEventListener('click', resetForm);
    
    // Status filter
    document.getElementById('status-filter').addEventListener('change', function() {
        console.log('🔍 DEBUG: Status filter changed to:', this.value);
        filterLeaveRequests();
    });
    
    // Logout
    document.getElementById('logout-btn').addEventListener('click', logout);
    
    console.log('✅ DEBUG: Event listeners initialized');
}

// ✅ ADDED: Enhanced leave balance loading with debug
async function loadLeaveBalanceForApplication() {
    console.log('🔍 DEBUG: Loading leave balance from API...');
    try {
        const balance = await apiClient.request('/leave/balance');
        console.log('✅ DEBUG: Leave balance API response:', balance);
        currentLeaveBalance = balance;
        updateAvailableLeavesDisplay();
    } catch (error) {
        console.error('❌ DEBUG: Error loading leave balance:', error);
        console.log('🔄 DEBUG: Using default balance values');
        updateAvailableLeavesDisplay();
    }
}

// ✅ ADDED: Update available leaves display
function updateAvailableLeavesDisplay() {
    console.log('🔍 DEBUG: Updating available leaves display:', currentLeaveBalance);
    
    // Update quick view
    document.getElementById('available-cl').textContent = 
        `${currentLeaveBalance.casualLeave.available}/${currentLeaveBalance.casualLeave.max}`;
    document.getElementById('available-sl').textContent = 
        `${currentLeaveBalance.sickLeave.available}/${currentLeaveBalance.sickLeave.max}`;
    document.getElementById('available-pl').textContent = 
        `${currentLeaveBalance.personalLeave.available}/${currentLeaveBalance.personalLeave.max}`;
        
    console.log('✅ DEBUG: Available leaves display updated');
}

// ✅ ADDED: Update leave type info when selection changes
function updateLeaveTypeInfo() {
    const leaveType = document.getElementById('leave-type').value;
    const infoDiv = document.getElementById('leave-type-info');
    
    console.log('🔍 DEBUG: Leave type changed to:', leaveType);
    
    if (leaveType && ['casual', 'sick', 'personal'].includes(leaveType)) {
        const available = currentLeaveBalance[`${leaveType}Leave`].available;
        const max = currentLeaveBalance[`${leaveType}Leave`].max;
        
        console.log('🔍 DEBUG: Available days for', leaveType, ':', available, '/', max);
        
        document.getElementById('selected-leave-available').textContent = available;
        infoDiv.style.display = 'block';
        
        // Check if we need to show insufficient leave warning
        checkLeaveAvailability(leaveType);
    } else {
        console.log('🔍 DEBUG: No specific leave type selected or other/emergency leave');
        infoDiv.style.display = 'none';
    }
    
    // Recalculate leave days if dates are already selected
    calculateLeaveDays();
}

// ✅ ADDED: Calculate leave days between dates
function calculateLeaveDays() {
    const startDate = document.getElementById('start-date').value;
    const endDate = document.getElementById('end-date').value;
    const durationInfo = document.getElementById('leave-duration-info');
    
    console.log('🔍 DEBUG: Calculating leave days - Start:', startDate, 'End:', endDate);
    
    if (startDate && endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        const timeDiff = end.getTime() - start.getTime();
        const totalDays = Math.ceil(timeDiff / (1000 * 3600 * 24)) + 1; // Inclusive
        
        console.log('🔍 DEBUG: Total days calculated:', totalDays);
        
        document.getElementById('total-days').textContent = totalDays;
        
        // Format dates for display
        const startFormatted = start.toLocaleDateString('en-GB');
        const endFormatted = end.toLocaleDateString('en-GB');
        document.getElementById('duration-dates').textContent = `(${startFormatted} to ${endFormatted})`;
        
        durationInfo.style.display = 'block';
        
        // Check leave availability for selected type
        const leaveType = document.getElementById('leave-type').value;
        if (leaveType) {
            console.log('🔍 DEBUG: Checking availability for type:', leaveType, 'with', totalDays, 'days');
            checkLeaveAvailability(leaveType, totalDays);
        }
    } else {
        console.log('🔍 DEBUG: Missing start or end date');
        durationInfo.style.display = 'none';
    }
}

// ✅ ADDED: Check if sufficient leaves are available
function checkLeaveAvailability(leaveType, requiredDays = 0) {
    const submitBtn = document.getElementById('submit-leave-btn');
    let warningDiv = document.getElementById('insufficient-leave-warning');
    
    console.log('🔍 DEBUG: Checking leave availability - Type:', leaveType, 'Required:', requiredDays);
    
    // Create warning div if it doesn't exist
    if (!warningDiv) {
        warningDiv = document.createElement('div');
        warningDiv.id = 'insufficient-leave-warning';
        warningDiv.className = 'insufficient-leave-warning';
        document.getElementById('leave-type').parentNode.appendChild(warningDiv);
        console.log('🔍 DEBUG: Created insufficient leave warning div');
    }
    
    if (leaveType && ['casual', 'sick', 'personal'].includes(leaveType)) {
        const available = currentLeaveBalance[`${leaveType}Leave`].available;
        console.log('🔍 DEBUG: Available days:', available, 'Required:', requiredDays);
        
        if (requiredDays > 0 && available < requiredDays) {
            console.log('❌ DEBUG: Insufficient leave balance');
            warningDiv.textContent = `Insufficient ${leaveType} leave! Available: ${available} days, Required: ${requiredDays} days`;
            warningDiv.classList.add('show');
            submitBtn.disabled = true;
            submitBtn.style.opacity = '0.6';
        } else if (available === 0) {
            console.log('❌ DEBUG: No leave balance available');
            warningDiv.textContent = `No ${leaveType} leave available!`;
            warningDiv.classList.add('show');
            submitBtn.disabled = true;
            submitBtn.style.opacity = '0.6';
        } else {
            console.log('✅ DEBUG: Sufficient leave balance');
            warningDiv.classList.remove('show');
            submitBtn.disabled = false;
            submitBtn.style.opacity = '1';
        }
    } else {
        console.log('🔍 DEBUG: Other leave type or no validation needed');
        warningDiv.classList.remove('show');
        submitBtn.disabled = false;
        submitBtn.style.opacity = '1';
    }
}

function handleFileSelect(file) {
    console.log('🔍 DEBUG: Handling file selection:', file.name, file.size, 'bytes');
    
    // Validate file type and size
    const allowedTypes = ['.pdf', '.doc', '.docx', '.jpg', '.jpeg', '.png'];
    const fileExt = '.' + file.name.split('.').pop().toLowerCase();
    const maxSize = 5 * 1024 * 1024; // 5MB

    if (!allowedTypes.includes(fileExt)) {
        console.log('❌ DEBUG: Invalid file type:', fileExt);
        showNotification('Please select a valid file type (PDF, Word, or Image)', 'error');
        return;
    }

    if (file.size > maxSize) {
        console.log('❌ DEBUG: File too large:', file.size, 'bytes');
        showNotification('File size must be less than 5MB', 'error');
        return;
    }

    // Show file preview
    document.getElementById('file-name').textContent = file.name;
    document.getElementById('file-preview').style.display = 'block';
    document.getElementById('file-upload-area').style.display = 'none';
    console.log('✅ DEBUG: File preview shown');
}

// ✅ ADDED: Enhanced form submission with debug
async function submitLeaveRequest(e) {
    e.preventDefault();
    
    console.log('🔍 DEBUG: Form submission started');
    
    const formData = {
        leaveType: document.getElementById('leave-type').value,
        startDate: document.getElementById('start-date').value,
        endDate: document.getElementById('end-date').value,
        reason: document.getElementById('reason').value
    };
    
    console.log('🔍 DEBUG: Form data:', formData);

    // Validate required fields
    if (!formData.leaveType || !formData.startDate || !formData.endDate || !formData.reason) {
        console.log('❌ DEBUG: Missing required fields');
        showNotification('Please fill all required fields', 'error');
        return;
    }

    try {
        // Validate leave balance
        if (['casual', 'sick', 'personal'].includes(formData.leaveType)) {
            const start = new Date(formData.startDate);
            const end = new Date(formData.endDate);
            const totalDays = Math.ceil((end - start) / (1000 * 3600 * 24)) + 1;
            const available = currentLeaveBalance[`${formData.leaveType}Leave`].available;
            
            console.log('🔍 DEBUG: Leave validation:', {
                leaveType: formData.leaveType,
                totalDays: totalDays,
                available: available,
                startDate: start,
                endDate: end
            });
            
            if (available < totalDays) {
                console.log('❌ DEBUG: Insufficient leave balance');
                showNotification(`Insufficient ${formData.leaveType} leave balance! Available: ${available} days, Required: ${totalDays} days`, 'error');
                return;
            }
        }

        // Validate dates
        const start = new Date(formData.startDate);
        const end = new Date(formData.endDate);
        
        if (start >= end) {
            console.log('❌ DEBUG: Invalid date range');
            showNotification('End date must be after start date', 'error');
            return;
        }

        // Show loading state
        const submitBtn = document.getElementById('submit-leave-btn');
        const originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Submitting...';
        submitBtn.disabled = true;

        console.log('🔍 DEBUG: Submitting to API...');

        // Submit leave request using API client
        const response = await apiClient.submitLeaveRequest({
            startDate: formData.startDate,
            endDate: formData.endDate,
            leaveType: formData.leaveType,
            reason: formData.reason,
            document: document.getElementById('supporting-document').files[0] || null
        });

        console.log('✅ DEBUG: Leave request submitted successfully:', response);
        showNotification('Leave request submitted successfully!', 'success');
        
        resetForm();
        loadMyLeaveRequests();
        
        // Reload leave balance after submission
        console.log('🔍 DEBUG: Reloading leave balance after submission...');
        loadLeaveBalanceForApplication();

    } catch (error) {
        console.error('❌ DEBUG: Error submitting leave request:', error);
        showNotification(error.message || 'Failed to submit leave request', 'error');
    } finally {
        // Reset button state
        const submitBtn = document.getElementById('submit-leave-btn');
        submitBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Submit Leave Request';
        submitBtn.disabled = false;
        console.log('🔍 DEBUG: Submit button reset');
    }
}

// ✅ ADDED: Enhanced leave requests loading
async function loadMyLeaveRequests() {
    console.log('🔍 DEBUG: Loading my leave requests...');
    try {
        const leaveRequests = await apiClient.getMyLeaveRequests();
        console.log('✅ DEBUG: Leave requests loaded:', leaveRequests);
        displayLeaveRequests(leaveRequests);
    } catch (error) {
        console.error('❌ DEBUG: Error loading leave requests:', error);
        showNotification('Failed to load leave requests', 'error');
        document.getElementById('requests-list').innerHTML = `
            <div class="empty-state">
                <i class="fas fa-exclamation-circle"></i>
                <p>Failed to load leave requests</p>
                <small>Error: ${error.message}</small>
            </div>
        `;
    }
}

function displayLeaveRequests(leaveRequests) {
    console.log('🔍 DEBUG: Displaying leave requests:', leaveRequests ? leaveRequests.length : 0, 'requests');
    
    const requestsList = document.getElementById('requests-list');
    
    if (!leaveRequests || leaveRequests.length === 0) {
        console.log('🔍 DEBUG: No leave requests to display');
        requestsList.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-inbox"></i>
                <p>No leave requests found</p>
                <small>Submit your first leave request above</small>
            </div>
        `;
        return;
    }

    console.log('✅ DEBUG: Rendering', leaveRequests.length, 'leave requests');
    
    requestsList.innerHTML = leaveRequests.map(request => {
        const startDate = new Date(request.startDate).toLocaleDateString('en-GB');
        const endDate = new Date(request.endDate).toLocaleDateString('en-GB');
        const appliedDate = new Date(request.createdAt).toLocaleDateString('en-GB');
        const processedDate = request.approvedAt ? new Date(request.approvedAt).toLocaleDateString('en-GB') : null;
        
        return `
        <div class="leave-request-card" data-id="${request._id}">
            <div class="leave-request-header">
                <div>
                    <span class="leave-type">${request.leaveType.charAt(0).toUpperCase() + request.leaveType.slice(1)} Leave</span>
                    <div class="leave-dates">
                        <div class="date-item">
                            <span class="date-label">From</span>
                            <span class="date-value">${startDate}</span>
                        </div>
                        <div class="date-item">
                            <span class="date-label">To</span>
                            <span class="date-value">${endDate}</span>
                        </div>
                    </div>
                </div>
                <span class="leave-status status-${request.status}">
                    ${request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                </span>
            </div>
            
            <div class="leave-reason">
                <div class="reason-label">Reason</div>
                <div class="reason-text">${sanitizeHTML(request.reason)}</div>
            </div>
            
            ${request.supportingDocument ? `
            <div class="document-info">
                <div class="reason-label">Supporting Document</div>
                <button class="btn-small btn-primary" onclick="downloadDocument('${request._id}')">
                    <i class="fas fa-download"></i> Download
                </button>
            </div>
            ` : ''}
            
            ${request.rejectionReason ? `
            <div class="rejection-reason">
                <div class="reason-label">Rejection Reason</div>
                <div class="reason-text">${sanitizeHTML(request.rejectionReason)}</div>
            </div>
            ` : ''}
            
            <div class="leave-meta">
                <small>Applied on: ${appliedDate}</small>
                ${processedDate ? `<small>Processed on: ${processedDate}</small>` : ''}
            </div>
        </div>
        `;
    }).join('');
}

async function downloadDocument(leaveRequestId) {
    console.log('🔍 DEBUG: Downloading document for leave:', leaveRequestId);
    try {
        await apiClient.downloadLeaveDocument(leaveRequestId);
        console.log('✅ DEBUG: Document downloaded successfully');
    } catch (error) {
        console.error('❌ DEBUG: Error downloading document:', error);
        showNotification('Failed to download document', 'error');
    }
}

function filterLeaveRequests() {
    const statusFilter = document.getElementById('status-filter').value;
    const allRequests = document.querySelectorAll('.leave-request-card');
    
    console.log('🔍 DEBUG: Filtering leave requests by status:', statusFilter);
    
    allRequests.forEach(request => {
        const status = request.querySelector('.leave-status').textContent.toLowerCase();
        
        if (statusFilter === 'all' || status === statusFilter) {
            request.style.display = 'block';
        } else {
            request.style.display = 'none';
        }
    });
    
    console.log('✅ DEBUG: Leave requests filtered');
}

// ✅ ADDED: Update reset form function
function resetForm() {
    console.log('🔍 DEBUG: Resetting form...');
    
    document.getElementById('leave-application-form').reset();
    document.getElementById('file-preview').style.display = 'none';
    document.getElementById('file-upload-area').style.display = 'block';
    document.getElementById('supporting-document').value = '';
    document.getElementById('leave-type-info').style.display = 'none';
    document.getElementById('leave-duration-info').style.display = 'none';
    
    // Hide any warning messages
    const warningDiv = document.getElementById('insufficient-leave-warning');
    if (warningDiv) {
        warningDiv.classList.remove('show');
    }
    
    console.log('✅ DEBUG: Form reset completed');
}

// Make functions globally available
window.downloadDocument = downloadDocument;
window.updateLeaveTypeInfo = updateLeaveTypeInfo;
window.calculateLeaveDays = calculateLeaveDays;

console.log('✅ leave.js loaded successfully with debug mode');