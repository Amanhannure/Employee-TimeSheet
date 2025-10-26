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
        const form = document.getElementById('leave-application-form');
        
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

        // Show loading state
        const submitBtn = document.getElementById('submit-leave-btn');
        const originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Submitting...';
        submitBtn.disabled = true;

        // Submit leave request
        const response = await fetch('http://localhost:5000/api/leave', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            },
            body: formData
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Failed to submit leave request');
        }

        showNotification('Leave request submitted successfully!', 'success');
        resetForm();
        loadMyLeaveRequests();

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
        const response = await fetch('http://localhost:5000/api/leave/my-requests', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
                'Content-Type': 'application/json'
            }
        });

        const leaveRequests = await response.json();

        if (!response.ok) {
            throw new Error(leaveRequests.message || 'Failed to load leave requests');
        }

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

    requestsList.innerHTML = leaveRequests.map(request => `
        <div class="leave-request-card" data-id="${request._id}">
            <div class="leave-request-header">
                <div>
                    <span class="leave-type">${request.leaveType.charAt(0).toUpperCase() + request.leaveType.slice(1)} Leave</span>
                    <div class="leave-dates">
                        <div class="date-item">
                            <span class="date-label">From</span>
                            <span class="date-value">${formatDate(request.startDate)}</span>
                        </div>
                        <div class="date-item">
                            <span class="date-label">To</span>
                            <span class="date-value">${formatDate(request.endDate)}</span>
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
                <small>Applied on: ${formatDate(request.createdAt)}</small>
                ${request.approvedAt ? `<small>Processed on: ${formatDate(request.approvedAt)}</small>` : ''}
            </div>
        </div>
    `).join('');
}

async function downloadDocument(leaveRequestId) {
    try {
        const response = await fetch(`http://localhost:5000/api/leave/download/${leaveRequestId}`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            }
        });

        if (!response.ok) {
            throw new Error('Failed to download document');
        }

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `document-${leaveRequestId}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
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
}

// Add to your existing utils.js or keep here
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
}