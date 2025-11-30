// leave.js - Employee Leave Application Functionality

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
    
    // Load leave requests and balance
    loadMyLeaveRequests();
    loadLeaveBalance(); // ✅ ADDED: Load leave balance
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

    // ✅ ADDED: Date change listeners for duration calculation
    document.getElementById('start-date').addEventListener('change', calculateLeaveDuration);
    document.getElementById('end-date').addEventListener('change', calculateLeaveDuration);
    
    // ✅ ADDED: Leave type change listener for balance validation
    document.getElementById('leave-type').addEventListener('change', updateLeaveTypeInfo);
    
    // ✅ ADDED: Refresh button
    document.getElementById('refresh-requests').addEventListener('click', loadMyLeaveRequests);
}

// ✅ ADDED: Load leave balance
async function loadLeaveBalance() {
    try {
        const balance = await apiClient.getLeaveBalance();
        updateBalanceDisplay(balance);
    } catch (error) {
        console.error('Error loading leave balance:', error);
    }
}

// ✅ ADDED: Update balance display
function updateBalanceDisplay(balance) {
    document.getElementById('sick-leave-balance').textContent = balance.sickLeave;
    document.getElementById('privilege-leave-balance').textContent = balance.privilegeLeave.toFixed(1);
    
    // Show/hide probation notice
    const probationNotice = document.getElementById('probation-notice');
    const plStatusLabel = document.getElementById('pl-status-label');
    
    if (balance.employeeStatus === 'probation') {
        probationNotice.style.display = 'flex';
        plStatusLabel.textContent = 'Available after probation';
    } else {
        probationNotice.style.display = 'none';
        plStatusLabel.textContent = 'Days Available';
    }
}

// ✅ ADDED: Update leave type information
function updateLeaveTypeInfo() {
    const leaveType = document.getElementById('leave-type').value;
    const infoDiv = document.getElementById('leave-type-info');
    
    if (leaveType === 'privilege') {
        infoDiv.innerHTML = `
            <div class="info-message info-warning">
                <i class="fas fa-info-circle"></i>
                Privilege Leave (PL) is only available after probation period
            </div>
        `;
    } else if (leaveType === 'sick') {
        infoDiv.innerHTML = `
            <div class="info-message info-success">
                <i class="fas fa-info-circle"></i>
                Sick Leave (SL) can be availed during probation
            </div>
        `;
    } else {
        infoDiv.innerHTML = '';
    }
}

// ✅ ADDED: Calculate leave duration
function calculateLeaveDuration() {
    const startDate = document.getElementById('start-date').value;
    const endDate = document.getElementById('end-date').value;
    
    if (startDate && endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        
        if (start <= end) {
            const duration = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
            document.getElementById('duration-days').textContent = `${duration} day${duration > 1 ? 's' : ''}`;
        }
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

async function submitLeaveRequest(e) {
    e.preventDefault();
    
    try {
        const formData = new FormData();
        
        // Add form data
        formData.append('startDate', document.getElementById('start-date').value);
        formData.append('endDate', document.getElementById('end-date').value);
        formData.append('leaveType', document.getElementById('leave-type').value);
        formData.append('reason', document.getElementById('reason').value);
        
        // Add file if exists
        const fileInput = document.getElementById('supporting-document');
        if (fileInput.files.length > 0) {
            formData.append('document', fileInput.files[0]);
        }

        // Validate dates
        const startDate = new Date(formData.get('startDate'));
        const endDate = new Date(formData.get('endDate'));
        
        if (startDate >= endDate) {
            showNotification('End date must be after start date', 'error');
            return;
        }

        // ✅ ADDED: Validate leave type against balance
        const leaveType = formData.get('leaveType');
        const duration = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;
        
        if (leaveType === 'privilege') {
            const balance = await apiClient.getLeaveBalance();
            if (balance.employeeStatus === 'probation') {
                showNotification('Cannot avail Privilege Leave during probation period', 'error');
                return;
            }
            if (balance.privilegeLeave < duration) {
                showNotification(`Insufficient Privilege Leave balance. Available: ${balance.privilegeLeave.toFixed(1)} days`, 'error');
                return;
            }
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
        loadLeaveBalance(); // ✅ ADDED: Refresh balance after submission

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
        
        // ✅ UPDATED: Leave type display
        const leaveTypeDisplay = request.leaveType === 'sick' ? 'Sick Leave (SL)' : 'Privilege Leave (PL)';
        
        return `
        <div class="leave-request-card" data-id="${request._id}">
            <div class="leave-request-header">
                <div>
                    <span class="leave-type">${leaveTypeDisplay}</span>
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

function resetForm() {
    document.getElementById('leave-application-form').reset();
    document.getElementById('file-preview').style.display = 'none';
    document.getElementById('file-upload-area').style.display = 'block';
    document.getElementById('supporting-document').value = '';
    document.getElementById('leave-type-info').innerHTML = ''; // ✅ ADDED: Clear leave type info
    document.getElementById('duration-days').textContent = '0 days'; // ✅ ADDED: Reset duration
}

// Make functions globally available
window.downloadDocument = downloadDocument;