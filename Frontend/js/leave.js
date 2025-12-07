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
    
    // ✅ ADDED: Load leave balances
    loadMyLeaveBalances();
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

        // ✅ FIXED: Validate dates - allow same day (single day leave)
        const startDate = new Date(formData.get('startDate'));
        const endDate = new Date(formData.get('endDate'));
        
        // ✅ Change from >= to > (allow same day)
        if (startDate > endDate) {
            showNotification('End date must be on or after start date', 'error');
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

    } catch (error) {
        console.error('❌ Error submitting leave request:', error);
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
        console.log('📋 Loading my leave requests...');
        const leaveRequests = await apiClient.getMyLeaveRequests();
        console.log(`✅ Loaded ${leaveRequests.length} leave requests`);
        displayLeaveRequests(leaveRequests);
        
    } catch (error) {
        console.error('❌ Error loading leave requests:', error);
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
        console.log('📄 Downloading document for leave request:', leaveRequestId);
        await apiClient.downloadLeaveDocument(leaveRequestId);
    } catch (error) {
        console.error('❌ Error downloading document:', error);
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

// ==================== ✅ LEAVE BALANCE FUNCTIONS ====================

// Load personal leave balances
async function loadMyLeaveBalances() {
    try {
        console.log('📊 Loading my leave balances...');
        const balanceData = await apiClient.getMyLeaveBalance();
        console.log('✅ Leave balance data:', balanceData);
        displayLeaveBalances(balanceData);
        
    } catch (error) {
        console.error('❌ Error loading leave balances:', error);
        displayMockBalances(); // Fallback to mock data
    }
}

// Display leave balances
function displayLeaveBalances(balanceData) {
    // Create or get the container
    let container = document.getElementById('leave-balances-container');
    if (!container) {
        const mainContent = document.querySelector('.main-content');
        if (mainContent) {
            container = document.createElement('div');
            container.id = 'leave-balances-container';
            container.className = 'leave-balances-section';
            // Insert at the beginning of main content
            const leaveRequestSection = document.querySelector('.leave-application-section');
            if (leaveRequestSection) {
                mainContent.insertBefore(container, leaveRequestSection);
            } else {
                mainContent.prepend(container);
            }
        } else {
            console.error('❌ Main content not found');
            return;
        }
    }
    
    if (!balanceData || !balanceData.leaveBalance) {
        console.warn('⚠️ No leave balance data found, showing mock data');
        displayMockBalances();
        return;
    }
    
    const balance = balanceData.leaveBalance;
     console.log('🔍 DEBUG balance object:', balance);
    console.log('🔍 DEBUG balance.status:', balance.status);
    console.log('🔍 DEBUG privilegeLeave:', balance.privilegeLeave);
    console.log('🔍 DEBUG privilegeLeave.current:', balance.privilegeLeave?.current);
    
    const status = balance.status || 'probation';
    console.log('🔍 DEBUG calculated status:', status);
    
    
        const html = `
        <div class="leave-balances-header" style="margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center;">
            <h2 style="margin: 0; color: #333;">
                <i class="fas fa-chart-pie" style="color: #3498db;"></i> My Leave Balances
            </h2>
            <button class="btn btn-sm btn-primary" onclick="refreshBalances()" style="padding: 8px 15px; background: #3498db; color: white; border: none; border-radius: 4px; cursor: pointer; display: flex; align-items: center; gap: 5px;">
                <i class="fas fa-sync-alt"></i> Refresh
            </button>
        </div>
        
        <div class="leave-cards-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 20px; margin-bottom: 30px;">
            <!-- Sick Leave Card -->
            <div class="leave-card sick-leave" style="background: white; border-radius: 10px; padding: 20px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); border-left: 4px solid #4CAF50;">
                <div class="card-header" style="display: flex; align-items: center; margin-bottom: 15px;">
                    <i class="fas fa-heartbeat" style="font-size: 24px; margin-right: 10px; color: #4CAF50;"></i>
                    <h3 style="margin: 0; font-size: 18px; color: #333;">Sick Leave (SL)</h3>
                </div>
                <div class="card-body">
                    <div class="balance-amount" style="font-size: 36px; font-weight: bold; color: #333; text-align: center; margin: 10px 0;">
                        ${balance.sickLeave?.current || 0}
                    </div>
                    <div class="balance-label" style="text-align: center; color: #666; margin-bottom: 15px; font-size: 14px;">
                        Days Available
                    </div>
                    <div class="balance-details" style="font-size: 13px; color: #666;">
                        <p style="margin: 5px 0; display: flex; align-items: center;">
                            <i class="fas fa-info-circle" style="margin-right: 8px; width: 16px;"></i> Annual: 8 days
                        </p>
                        <p style="margin: 5px 0; display: flex; align-items: center;">
                            <i class="fas fa-calendar" style="margin-right: 8px; width: 16px;"></i> Reset: ${formatDate(balance.sickLeave?.lastReset)}
                        </p>
                    </div>
                </div>
            </div>
            
            <!-- Privilege Leave Card -->
            <div class="leave-card privilege-leave" style="background: white; border-radius: 10px; padding: 20px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); border-left: 4px solid #2196F3;">
                <div class="card-header" style="display: flex; align-items: center; margin-bottom: 15px;">
                    <i class="fas fa-umbrella-beach" style="font-size: 24px; margin-right: 10px; color: #2196F3;"></i>
                    <h3 style="margin: 0; font-size: 18px; color: #333;">Privilege Leave (PL)</h3>
                </div>
                <div class="card-body">
                    <div class="balance-amount" style="font-size: 36px; font-weight: bold; color: #333; text-align: center; margin: 10px 0;">
                        ${balance.privilegeLeave?.current || 0}
                    </div>
                    <div class="balance-label" style="text-align: center; color: #666; margin-bottom: 15px; font-size: 14px;">
                        Days Available
                    </div>
                    <div class="balance-details" style="font-size: 13px; color: #666;">
                        <p style="margin: 5px 0; display: flex; align-items: center;">
                            <i class="fas fa-chart-line" style="margin-right: 8px; width: 16px;"></i> Accrual: 1.5 days/month
                        </p>
                        ${status === 'probation' ? 
                            `<p style="margin: 5px 0; display: flex; align-items: center;">
                                <i class="fas fa-clock" style="margin-right: 8px; width: 16px;"></i> On Probation: PL will start after activation
                            </p>` : 
                            `<p style="margin: 5px 0; display: flex; align-items: center;">
                                <i class="fas fa-history" style="margin-right: 8px; width: 16px;"></i> Total Accrued: ${balance.privilegeLeave?.total || 0} days
                            </p>`
                        }
                    </div>
                </div>
            </div>
            
            <!-- REMOVED: Maternity Leave Card -->
            
            <!-- REMOVED: Other Leaves Card -->
            
        </div>
        
        <!-- Quick Stats -->
        <div class="leave-stats" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-top: 20px;">
            <div class="stat-card" style="background: white; border-radius: 8px; padding: 15px; display: flex; align-items: center; box-shadow: 0 1px 5px rgba(0,0,0,0.1);">
                <i class="fas fa-user-tag" style="font-size: 24px; color: #3498db; margin-right: 15px;"></i>
                <div class="stat-content">
                    <div class="stat-value" style="font-size: 18px; font-weight: bold; color: #333;">
                        ${status.toUpperCase()}
                    </div>
                    <div class="stat-label" style="font-size: 12px; color: #666;">
                        Employment Status
                    </div>
                </div>
            </div>
            <div class="stat-card" style="background: white; border-radius: 8px; padding: 15px; display: flex; align-items: center; box-shadow: 0 1px 5px rgba(0,0,0,0.1);">
                <i class="fas fa-calendar-day" style="font-size: 24px; color: #3498db; margin-right: 15px;"></i>
                <div class="stat-content">
                    <div class="stat-value" style="font-size: 18px; font-weight: bold; color: #333;">
                        ${formatDate(balance.joinDate)}
                    </div>
                    <div class="stat-label" style="font-size: 12px; color: #666;">
                        Join Date
                    </div>
                </div>
            </div>
            <div class="stat-card" style="background: white; border-radius: 8px; padding: 15px; display: flex; align-items: center; box-shadow: 0 1px 5px rgba(0,0,0,0.1);">
                <i class="fas fa-building" style="font-size: 24px; color: #3498db; margin-right: 15px;"></i>
                <div class="stat-content">
                    <div class="stat-value" style="font-size: 18px; font-weight: bold; color: #333;">
                        ${balance.department || 'Not Set'}
                    </div>
                    <div class="stat-label" style="font-size: 12px; color: #666;">
                        Department
                    </div>
                </div>
            </div>
        </div>
    `;
    
    container.innerHTML = html;
    console.log('✅ Leave balances displayed successfully');
}

// Display mock balances (fallback)
function displayMockBalances() {
    const container = document.getElementById('leave-balances-container');
    if (!container) {
        console.error('❌ Leave balances container not found');
        return;
    }
    
    const html = `
        <div class="leave-balances-header" style="margin-bottom: 20px;">
            <h2 style="margin: 0; color: #333;">
                <i class="fas fa-chart-pie" style="color: #3498db;"></i> My Leave Balances
            </h2>
        </div>
        
        <div class="mock-balances-notice" style="background: #f8f9fa; border-radius: 8px; padding: 20px; border: 1px dashed #dee2e6;">
            <div class="notice-header" style="display: flex; align-items: center; margin-bottom: 15px;">
                <i class="fas fa-info-circle" style="font-size: 24px; color: #6c757d; margin-right: 10px;"></i>
                <h3 style="margin: 0; color: #495057;">Leave Balance System Preview</h3>
            </div>
            <p style="color: #666; margin-bottom: 20px;">Your actual leave balances will be displayed here once the system is fully configured.</p>
            
            <div class="mock-cards" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 15px; margin: 20px 0;">
                <div class="mock-card" style="background: white; border-radius: 8px; padding: 15px; text-align: center; border: 1px solid #dee2e6;">
                    <h4 style="margin: 0 0 10px 0; color: #333;">Sick Leave (SL)</h4>
                    <div class="mock-value" style="font-size: 24px; font-weight: bold; color: #28a745; margin: 10px 0;">
                        8 days
                    </div>
                    <small style="color: #6c757d;">Resets annually on work anniversary</small>
                </div>
                
                <div class="mock-card" style="background: white; border-radius: 8px; padding: 15px; text-align: center; border: 1px solid #dee2e6;">
                    <h4 style="margin: 0 0 10px 0; color: #333;">Privilege Leave (PL)</h4>
                    <div class="mock-value" style="font-size: 24px; font-weight: bold; color: #28a745; margin: 10px 0;">
                        0 days
                    </div>
                    <small style="color: #6c757d;">Accrues 1.5 days per month after probation</small>
                </div>
            </div>
        </div>
    `;
    
    container.innerHTML = html;
    console.log('⚠️ Showing mock leave balances (fallback mode)');
}

// Refresh balances
function refreshBalances() {
    console.log('🔄 Refreshing leave balances...');
    loadMyLeaveBalances();
}

// Format date helper
function formatDate(dateString) {
    if (!dateString) return 'Not set';
    try {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-GB', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });
    } catch (error) {
        console.error('❌ Error formatting date:', error);
        return 'Invalid date';
    }
}


// ✅ ADDED: Logout function
function logout() {
  console.log('🚪 Logging out...');
  
  // Clear user data from localStorage
  localStorage.removeItem('userData');
  localStorage.removeItem('authToken');
  
  // Redirect to login page
  window.location.href = 'index.html';
}

// Make functions globally available
window.downloadDocument = downloadDocument;
window.refreshBalances = refreshBalances;