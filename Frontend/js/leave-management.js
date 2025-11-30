// leave-management.js - Admin Leave Management

document.addEventListener('DOMContentLoaded', function() {
    console.log('🔄 Initializing Leave Management...');
    
    // Check authentication and admin role
    const userData = getUserData();
    if (!userData || (userData.role !== 'admin' && userData.role !== 'manager')) {
        window.location.href = 'index.html';
        return;
    }

    // Update admin name
    document.getElementById('admin-name').textContent = `${userData.firstName} ${userData.lastName}`;

    // Initialize event listeners
    initializeEventListeners();
    
    // Load leave requests and statistics
    loadLeaveRequests();
    loadLeaveStatistics();
});

function initializeEventListeners() {
    // Sidebar toggle
    document.getElementById('toggle-sidebar').addEventListener('click', function() {
        document.querySelector('.dashboard-container').classList.toggle('sidebar-collapsed');
    });

    // Filters
    document.getElementById('status-filter').addEventListener('change', loadLeaveRequests);
    document.getElementById('search-employee').addEventListener('input', debounce(loadLeaveRequests, 300));
    
    // Modal events
    document.getElementById('cancel-action').addEventListener('click', closeActionModal);
    document.getElementById('action-form').addEventListener('submit', handleLeaveAction);
    
    // Close modals
    document.querySelectorAll('.close-modal').forEach(btn => {
        btn.addEventListener('click', function() {
            document.getElementById('action-modal').style.display = 'none';
            document.getElementById('leave-details-modal').style.display = 'none';
            document.getElementById('status-update-modal').style.display = 'none';
            document.getElementById('balance-adjustment-modal').style.display = 'none';
            document.getElementById('all-balances-modal').style.display = 'none';
        });
    });
    
    // ✅ ADDED: Admin action buttons
    document.getElementById('update-status-btn').addEventListener('click', openStatusUpdateModal);
    document.getElementById('adjust-balance-btn').addEventListener('click', openBalanceAdjustmentModal);
    document.getElementById('view-balances-btn').addEventListener('click', openAllBalancesModal);
    
    // ✅ ADDED: Admin form submissions
    document.getElementById('status-update-form').addEventListener('submit', handleStatusUpdate);
    document.getElementById('balance-adjustment-form').addEventListener('submit', handleBalanceAdjustment);
    
    // ✅ ADDED: Cancel buttons for new modals
    document.getElementById('cancel-status-update').addEventListener('click', () => {
        document.getElementById('status-update-modal').style.display = 'none';
    });
    document.getElementById('cancel-balance-adjust').addEventListener('click', () => {
        document.getElementById('balance-adjustment-modal').style.display = 'none';
    });
    
    // ✅ ADDED: Refresh button
    document.getElementById('refresh-requests').addEventListener('click', loadLeaveRequests);
    
    // Logout
    document.getElementById('logout-btn').addEventListener('click', logout);
}

async function loadLeaveStatistics() {
    try {
        const allRequests = await apiClient.getAllLeaveRequests();
        const pending = allRequests.filter(req => req.status === 'pending').length;
        const approved = allRequests.filter(req => req.status === 'approved').length;
        const rejected = allRequests.filter(req => req.status === 'rejected').length;
        const total = allRequests.length;

        document.getElementById('pending-count').textContent = pending;
        document.getElementById('approved-count').textContent = approved;
        document.getElementById('rejected-count').textContent = rejected;
        document.getElementById('total-count').textContent = total;
        
    } catch (error) {
        console.error('Error loading leave statistics:', error);
        showNotification('Failed to load statistics', 'error');
    }
}

async function loadLeaveRequests() {
    try {
        const statusFilter = document.getElementById('status-filter').value;
        const searchQuery = document.getElementById('search-employee').value;
        
        const filters = {};
        if (statusFilter !== 'all') filters.status = statusFilter;
        if (searchQuery) filters.employee = searchQuery;

        const leaveRequests = await apiClient.getAllLeaveRequests(filters);
        displayLeaveRequests(leaveRequests);
        
    } catch (error) {
        console.error('Error loading leave requests:', error);
        showNotification('Failed to load leave requests', 'error');
        document.getElementById('leave-requests-body').innerHTML = `
            <tr>
                <td colspan="8" style="text-align: center; color: #e74c3c;">
                    <i class="fas fa-exclamation-circle"></i> Failed to load leave requests
                </td>
            </tr>
        `;
    }
}

function displayLeaveRequests(leaveRequests) {
    const tbody = document.getElementById('leave-requests-body');
    
    if (!leaveRequests || leaveRequests.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" style="text-align: center; padding: 40px;">
                    <div class="empty-state">
                        <i class="fas fa-inbox"></i>
                        <p>No leave requests found</p>
                    </div>
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = leaveRequests.map(request => {
        const employeeName = request.employee ? 
            `${request.employee.firstName} ${request.employee.lastName}` : 'Unknown';
        const employeeCode = request.employee ? request.employee.employeeId : 'N/A';
        const startDate = new Date(request.startDate).toLocaleDateString('en-GB');
        const endDate = new Date(request.endDate).toLocaleDateString('en-GB');
        const appliedDate = new Date(request.createdAt).toLocaleDateString('en-GB');
        
        // Calculate duration
        const start = new Date(request.startDate);
        const end = new Date(request.endDate);
        const duration = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
        
        const isPending = request.status === 'pending';

        // ✅ UPDATED: Leave type display
        const leaveTypeDisplay = request.leaveType === 'sick' ? 'Sick Leave (SL)' : 'Privilege Leave (PL)';

        return `
            <tr>
                <td>
                    <div>
                        <strong>${sanitizeHTML(employeeName)}</strong>
                        <div style="font-size: 0.875rem; color: #666;">${employeeCode}</div>
                    </div>
                </td>
                <td>${leaveTypeDisplay}</td>
                <td>${startDate}</td>
                <td>${endDate}</td>
                <td>${duration} day${duration > 1 ? 's' : ''}</td>
                <td>
                    <span class="leave-status status-${request.status}">
                        ${request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                    </span>
                </td>
                <td>${appliedDate}</td>
                <td>
                    <div class="leave-actions">
                        <button class="btn-small btn-primary" onclick="viewLeaveDetails('${request._id}')">
                            <i class="fas fa-eye"></i>
                        </button>
                        ${isPending ? `
                        <button class="btn-small btn-success" onclick="openApproveModal('${request._id}')">
                            <i class="fas fa-check"></i>
                        </button>
                        <button class="btn-small btn-danger" onclick="openRejectModal('${request._id}')">
                            <i class="fas fa-times"></i>
                        </button>
                        ` : ''}
                        ${request.supportingDocument ? `
                        <button class="btn-small btn-info" onclick="downloadDocument('${request._id}')">
                            <i class="fas fa-download"></i>
                        </button>
                        ` : ''}
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

function openApproveModal(leaveRequestId) {
    console.log('Opening approve modal for:', leaveRequestId);
    
    document.getElementById('action-leave-id').value = leaveRequestId;
    document.getElementById('modal-title').textContent = 'Approve Leave Request';
    
    // FIX: Remove required attribute and hide rejection reason for approval
    const rejectionReasonTextarea = document.getElementById('rejection-reason');
    rejectionReasonTextarea.removeAttribute('required');
    document.getElementById('rejection-reason-group').style.display = 'none';
    
    document.getElementById('confirm-action').className = 'btn btn-success';
    document.getElementById('confirm-action').textContent = 'Approve';
    
    // Load leave request details for summary
    loadLeaveSummary(leaveRequestId);
    document.getElementById('action-modal').style.display = 'block';
}

function openRejectModal(leaveRequestId) {
    console.log('Opening reject modal for:', leaveRequestId);
    
    document.getElementById('action-leave-id').value = leaveRequestId;
    document.getElementById('modal-title').textContent = 'Reject Leave Request';
    
    // FIX: Add required attribute and show rejection reason for rejection
    const rejectionReasonTextarea = document.getElementById('rejection-reason');
    rejectionReasonTextarea.setAttribute('required', 'required');
    document.getElementById('rejection-reason-group').style.display = 'block';
    
    document.getElementById('confirm-action').className = 'btn btn-danger';
    document.getElementById('confirm-action').textContent = 'Reject';
    
    // Load leave request details for summary
    loadLeaveSummary(leaveRequestId);
    document.getElementById('action-modal').style.display = 'block';
}

async function loadLeaveSummary(leaveRequestId) {
    try {
        const request = await apiClient.getLeaveRequestById(leaveRequestId);
        
        const employeeName = request.employee ? 
            `${request.employee.firstName} ${request.employee.lastName}` : 'Unknown Employee';
        const startDate = new Date(request.startDate).toLocaleDateString('en-GB');
        const endDate = new Date(request.endDate).toLocaleDateString('en-GB');
        
        // ✅ UPDATED: Leave type display
        const leaveTypeDisplay = request.leaveType === 'sick' ? 'Sick Leave (SL)' : 'Privilege Leave (PL)';

        const summaryHTML = `
            <div class="leave-summary" style="background: #f8f9fa; padding: 15px; border-radius: 5px; margin-bottom: 15px;">
                <p><strong>Employee:</strong> ${employeeName}</p>
                <p><strong>Leave Type:</strong> ${leaveTypeDisplay}</p>
                <p><strong>Period:</strong> ${startDate} to ${endDate}</p>
                <p><strong>Reason:</strong> ${request.reason}</p>
                ${request.supportingDocument ? `<p><strong>Document:</strong> ${request.supportingDocument.originalName}</p>` : ''}
                <p><strong>Current Status:</strong> <span class="leave-status status-${request.status}">${request.status.charAt(0).toUpperCase() + request.status.slice(1)}</span></p>
            </div>
        `;
        
        document.getElementById('leave-summary').innerHTML = summaryHTML;
    } catch (error) {
        console.error('Error loading leave summary:', error);
        document.getElementById('leave-summary').innerHTML = '<p style="color: #e74c3c;">Error loading leave details</p>';
    }
}

async function handleLeaveAction(e) {
    e.preventDefault();
    console.log('Handling leave action...');
    
    const leaveRequestId = document.getElementById('action-leave-id').value;
    const isApproval = document.getElementById('modal-title').textContent.includes('Approve');
    
    console.log('Leave ID:', leaveRequestId, 'Is Approval:', isApproval);
    
    try {
        if (isApproval) {
            console.log('Approving leave request...');
            await apiClient.approveLeaveRequest(leaveRequestId);
            showNotification('Leave request approved successfully!', 'success');
        } else {
            const rejectionReason = document.getElementById('rejection-reason').value;
            console.log('Rejecting with reason:', rejectionReason);
            
            if (!rejectionReason.trim()) {
                showNotification('Please provide a rejection reason', 'error');
                return;
            }
            await apiClient.rejectLeaveRequest(leaveRequestId, rejectionReason);
            showNotification('Leave request rejected successfully!', 'success');
        }
        
        closeActionModal();
        // Reload data after short delay to ensure backend processed the request
        setTimeout(() => {
            loadLeaveRequests();
            loadLeaveStatistics();
        }, 500);
        
    } catch (error) {
        console.error('Error processing leave action:', error);
        showNotification(error.message || 'Failed to process leave request', 'error');
    }
}

function closeActionModal() {
    document.getElementById('action-modal').style.display = 'none';
    document.getElementById('action-form').reset();
    
    // Reset the rejection reason field
    const rejectionReasonTextarea = document.getElementById('rejection-reason');
    rejectionReasonTextarea.removeAttribute('required');
}

async function viewLeaveDetails(leaveRequestId) {
    try {
        const request = await apiClient.getLeaveRequestById(leaveRequestId);
        
        const employeeName = request.employee ? 
            `${request.employee.firstName} ${request.employee.lastName}` : 'Unknown Employee';
        const employeeCode = request.employee ? request.employee.employeeId : 'N/A';
        const startDate = new Date(request.startDate).toLocaleDateString('en-GB');
        const endDate = new Date(request.endDate).toLocaleDateString('en-GB');
        const appliedDate = new Date(request.createdAt).toLocaleDateString('en-GB');
        const processedDate = request.approvedAt ? new Date(request.approvedAt).toLocaleDateString('en-GB') : 'Not processed';
        const processedBy = request.approvedBy ? `${request.approvedBy.firstName} ${request.approvedBy.lastName}` : 'N/A';
        
        // ✅ UPDATED: Leave type display
        const leaveTypeDisplay = request.leaveType === 'sick' ? 'Sick Leave (SL)' : 'Privilege Leave (PL)';

        const detailsHTML = `
            <div class="leave-details">
                <h3>Leave Request Details</h3>
                <div class="details-grid">
                    <div class="detail-item">
                        <label>Employee:</label>
                        <span>${employeeName} (${employeeCode})</span>
                    </div>
                    <div class="detail-item">
                        <label>Leave Type:</label>
                        <span>${leaveTypeDisplay}</span>
                    </div>
                    <div class="detail-item">
                        <label>Start Date:</label>
                        <span>${startDate}</span>
                    </div>
                    <div class="detail-item">
                        <label>End Date:</label>
                        <span>${endDate}</span>
                    </div>
                    <div class="detail-item">
                        <label>Applied On:</label>
                        <span>${appliedDate}</span>
                    </div>
                    <div class="detail-item">
                        <label>Status:</label>
                        <span class="leave-status status-${request.status}">
                            ${request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                        </span>
                    </div>
                    <div class="detail-item">
                        <label>Processed By:</label>
                        <span>${processedBy}</span>
                    </div>
                    <div class="detail-item">
                        <label>Processed On:</label>
                        <span>${processedDate}</span>
                    </div>
                    ${request.rejectionReason ? `
                    <div class="detail-item full-width">
                        <label>Rejection Reason:</label>
                        <span>${request.rejectionReason}</span>
                    </div>
                    ` : ''}
                    <div class="detail-item full-width">
                        <label>Reason for Leave:</label>
                        <p>${request.reason}</p>
                    </div>
                    ${request.supportingDocument ? `
                    <div class="detail-item full-width">
                        <label>Supporting Document:</label>
                        <button class="btn btn-primary" onclick="downloadDocument('${request._id}')">
                            <i class="fas fa-download"></i> Download ${request.supportingDocument.originalName}
                        </button>
                    </div>
                    ` : ''}
                </div>
            </div>
        `;
        
        document.getElementById('leave-details-content').innerHTML = detailsHTML;
        document.getElementById('leave-details-modal').style.display = 'block';
        
    } catch (error) {
        console.error('Error viewing leave details:', error);
        showNotification('Failed to load leave details', 'error');
    }
}

async function downloadDocument(leaveRequestId) {
    try {
        console.log('Downloading document for leave request:', leaveRequestId);
        await apiClient.downloadLeaveDocument(leaveRequestId);
        showNotification('Document downloaded successfully!', 'success');
    } catch (error) {
        console.error('Error downloading document:', error);
        showNotification(error.message || 'Failed to download document', 'error');
    }
}

// ✅ ADDED: Status Update Modal Functions
async function openStatusUpdateModal() {
    try {
        // Load employees for dropdown
        const users = await apiClient.getAllUsers();
        const employeeSelect = document.getElementById('employee-select');
        
        employeeSelect.innerHTML = '<option value="">Select Employee</option>';
        users.forEach(user => {
            const option = document.createElement('option');
            option.value = user._id;
            option.textContent = `${user.firstName} ${user.lastName} (${user.employeeId}) - ${user.status}`;
            employeeSelect.appendChild(option);
        });
        
        document.getElementById('status-update-modal').style.display = 'block';
    } catch (error) {
        console.error('Error opening status update modal:', error);
        showNotification('Failed to load employees', 'error');
    }
}

async function handleStatusUpdate(e) {
    e.preventDefault();
    
    const employeeId = document.getElementById('employee-select').value;
    const status = document.getElementById('status-select').value;
    
    if (!employeeId) {
        showNotification('Please select an employee', 'error');
        return;
    }
    
    try {
        const result = await apiClient.updateEmployeeStatus(employeeId, status);
        showNotification(result.message, 'success');
        document.getElementById('status-update-modal').style.display = 'none';
        document.getElementById('status-update-form').reset();
    } catch (error) {
        console.error('Error updating employee status:', error);
        showNotification(error.message || 'Failed to update employee status', 'error');
    }
}

// ✅ ADDED: Balance Adjustment Modal Functions
async function openBalanceAdjustmentModal() {
    try {
        // Load employees for dropdown
        const users = await apiClient.getAllUsers();
        const employeeSelect = document.getElementById('adjust-employee-select');
        
        employeeSelect.innerHTML = '<option value="">Select Employee</option>';
        users.forEach(user => {
            const option = document.createElement('option');
            option.value = user._id;
            option.textContent = `${user.firstName} ${user.lastName} (${user.employeeId})`;
            employeeSelect.appendChild(option);
        });
        
        document.getElementById('balance-adjustment-modal').style.display = 'block';
    } catch (error) {
        console.error('Error opening balance adjustment modal:', error);
        showNotification('Failed to load employees', 'error');
    }
}

async function handleBalanceAdjustment(e) {
    e.preventDefault();
    
    const employeeId = document.getElementById('adjust-employee-select').value;
    const sickLeave = document.getElementById('sick-leave-adjust').value;
    const privilegeLeave = document.getElementById('privilege-leave-adjust').value;
    
    if (!employeeId) {
        showNotification('Please select an employee', 'error');
        return;
    }
    
    if (!sickLeave && !privilegeLeave) {
        showNotification('Please enter at least one leave balance to update', 'error');
        return;
    }
    
    try {
        const updateData = {};
        if (sickLeave) updateData.sickLeave = parseFloat(sickLeave);
        if (privilegeLeave) updateData.privilegeLeave = parseFloat(privilegeLeave);
        
        const result = await apiClient.updateLeaveBalance(employeeId, updateData);
        showNotification(result.message, 'success');
        document.getElementById('balance-adjustment-modal').style.display = 'none';
        document.getElementById('balance-adjustment-form').reset();
    } catch (error) {
        console.error('Error updating leave balance:', error);
        showNotification(error.message || 'Failed to update leave balance', 'error');
    }
}

// ✅ ADDED: All Balances Modal Functions
async function openAllBalancesModal() {
    try {
        const balances = await apiClient.getAllLeaveBalances();
        displayAllBalances(balances);
        document.getElementById('all-balances-modal').style.display = 'block';
    } catch (error) {
        console.error('Error opening all balances modal:', error);
        showNotification('Failed to load leave balances', 'error');
    }
}

function displayAllBalances(balances) {
    const tbody = document.getElementById('balances-table-body');
    
    if (!balances || balances.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" style="text-align: center; padding: 20px;">
                    <div class="empty-state">
                        <i class="fas fa-inbox"></i>
                        <p>No leave balances found</p>
                    </div>
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = balances.map(balance => {
        const employeeName = balance.employee ? 
            `${balance.employee.firstName} ${balance.employee.lastName}` : 'Unknown';
        const lastUpdated = new Date(balance.lastUpdated).toLocaleDateString('en-GB');
        
        return `
            <tr>
                <td>
                    <div>
                        <strong>${sanitizeHTML(employeeName)}</strong>
                        <div style="font-size: 0.875rem; color: #666;">${balance.employee?.employeeId || 'N/A'}</div>
                    </div>
                </td>
                <td>
                    <span class="leave-status status-${balance.employeeStatus}">
                        ${balance.employeeStatus.charAt(0).toUpperCase() + balance.employeeStatus.slice(1)}
                    </span>
                </td>
                <td><strong>${balance.sickLeave}</strong> days</td>
                <td><strong>${balance.privilegeLeave.toFixed(1)}</strong> days</td>
                <td>${lastUpdated}</td>
            </tr>
        `;
    }).join('');
}

// Utility function for debouncing
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Make functions globally available
window.openApproveModal = openApproveModal;
window.openRejectModal = openRejectModal;
window.viewLeaveDetails = viewLeaveDetails;
window.downloadDocument = downloadDocument;
// ✅ ADDED: Make new functions globally available
window.openStatusUpdateModal = openStatusUpdateModal;
window.openBalanceAdjustmentModal = openBalanceAdjustmentModal;
window.openAllBalancesModal = openAllBalancesModal;