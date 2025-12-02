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
    
    // ✅ ADDED: Initialize leave balance tab if it exists
    initializeLeaveBalanceTab();
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
    
    // ✅ ADDED: Leave balance form submissions
    document.getElementById('edit-balance-form')?.addEventListener('submit', handleEditBalance);
    document.getElementById('adjust-balance-form')?.addEventListener('submit', handleAdjustBalance);
    document.getElementById('status-form')?.addEventListener('submit', handleStatusChange);
    
    // Close modals
    document.querySelectorAll('.close-modal').forEach(btn => {
        btn.addEventListener('click', function() {
            document.getElementById('action-modal').style.display = 'none';
            document.getElementById('leave-details-modal').style.display = 'none';
            document.getElementById('edit-balance-modal').style.display = 'none';
            document.getElementById('adjust-balance-modal').style.display = 'none';
            document.getElementById('status-modal').style.display = 'none';
            document.getElementById('history-modal').style.display = 'none';
        });
    });
    
    // Logout
    document.getElementById('logout-btn').addEventListener('click', logout);
}

// ✅ ADDED: Initialize leave balance tab
function initializeLeaveBalanceTab() {
    const tab = document.getElementById('tab-leave-balances');
    if (tab) {
        tab.addEventListener('click', function() {
            console.log('📊 Switching to Leave Balances tab');
            loadLeaveBalances();
        });
    }
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
        console.error('❌ Error loading leave statistics:', error);
        showNotification('Failed to load statistics', 'error');
    }
}

async function loadLeaveRequests() {
    try {
        console.log('📋 Loading leave requests...');
        const statusFilter = document.getElementById('status-filter').value;
        const searchQuery = document.getElementById('search-employee').value;
        
        const filters = {};
        if (statusFilter !== 'all') filters.status = statusFilter;
        if (searchQuery) filters.employee = searchQuery;

        const leaveRequests = await apiClient.getAllLeaveRequests(filters);
        console.log(`✅ Loaded ${leaveRequests.length} leave requests`);
        displayLeaveRequests(leaveRequests);
        
    } catch (error) {
        console.error('❌ Error loading leave requests:', error);
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

        return `
            <tr>
                <td>
                    <div>
                        <strong>${sanitizeHTML(employeeName)}</strong>
                        <div style="font-size: 0.875rem; color: #666;">${employeeCode}</div>
                    </div>
                </td>
                <td>${request.leaveType.charAt(0).toUpperCase() + request.leaveType.slice(1)}</td>
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
    console.log('✅ Opening approve modal for:', leaveRequestId);
    
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
    console.log('❌ Opening reject modal for:', leaveRequestId);
    
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
        
        const summaryHTML = `
            <div class="leave-summary" style="background: #f8f9fa; padding: 15px; border-radius: 5px; margin-bottom: 15px;">
                <p><strong>Employee:</strong> ${employeeName}</p>
                <p><strong>Leave Type:</strong> ${request.leaveType.charAt(0).toUpperCase() + request.leaveType.slice(1)}</p>
                <p><strong>Period:</strong> ${startDate} to ${endDate}</p>
                <p><strong>Reason:</strong> ${request.reason}</p>
                ${request.supportingDocument ? `<p><strong>Document:</strong> ${request.supportingDocument.originalName}</p>` : ''}
                <p><strong>Current Status:</strong> <span class="leave-status status-${request.status}">${request.status.charAt(0).toUpperCase() + request.status.slice(1)}</span></p>
            </div>
        `;
        
        document.getElementById('leave-summary').innerHTML = summaryHTML;
    } catch (error) {
        console.error('❌ Error loading leave summary:', error);
        document.getElementById('leave-summary').innerHTML = '<p style="color: #e74c3c;">Error loading leave details</p>';
    }
}

async function handleLeaveAction(e) {
    e.preventDefault();
    console.log('🔄 Handling leave action...');
    
    const leaveRequestId = document.getElementById('action-leave-id').value;
    const isApproval = document.getElementById('modal-title').textContent.includes('Approve');
    
    console.log('Leave ID:', leaveRequestId, 'Is Approval:', isApproval);
    
    try {
        if (isApproval) {
            console.log('✅ Approving leave request...');
            await apiClient.approveLeaveRequest(leaveRequestId);
            showNotification('Leave request approved successfully!', 'success');
        } else {
            const rejectionReason = document.getElementById('rejection-reason').value;
            console.log('❌ Rejecting with reason:', rejectionReason);
            
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
        console.error('❌ Error processing leave action:', error);
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
                        <span>${request.leaveType.charAt(0).toUpperCase() + request.leaveType.slice(1)}</span>
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
        console.error('❌ Error viewing leave details:', error);
        showNotification('Failed to load leave details', 'error');
    }
}

async function downloadDocument(leaveRequestId) {
    try {
        console.log('📄 Downloading document for leave request:', leaveRequestId);
        await apiClient.downloadLeaveDocument(leaveRequestId);
        showNotification('Document downloaded successfully!', 'success');
    } catch (error) {
        console.error('❌ Error downloading document:', error);
        showNotification(error.message || 'Failed to download document', 'error');
    }
}

// ==================== ✅ LEAVE BALANCE FUNCTIONS ====================

// Load leave balances
async function loadLeaveBalances() {
    try {
        console.log('📊 Loading leave balances...');
        
        const departmentFilter = document.getElementById('department-filter')?.value || 'all';
        const statusFilter = document.getElementById('status-filter-balance')?.value || 'all';
        const searchQuery = document.getElementById('search-balance')?.value || '';
        
        console.log(`Filters - Department: ${departmentFilter}, Status: ${statusFilter}, Search: ${searchQuery}`);
        
        const filters = {};
        if (departmentFilter !== 'all') filters.department = departmentFilter;
        if (statusFilter !== 'all') filters.status = statusFilter;
        if (searchQuery) filters.search = searchQuery;
        
        const leaveBalances = await apiClient.getLeaveBalances(filters);
        console.log(`✅ Loaded ${leaveBalances.length} leave balances`);
        displayLeaveBalances(leaveBalances);
        
    } catch (error) {
        console.error('❌ Error loading leave balances:', error);
        showNotification('Failed to load leave balances', 'error');
        displayLeaveBalancesError();
    }
}

// Display leave balances table
function displayLeaveBalances(balances) {
    const container = document.getElementById('leave-balances-container');
    if (!container) {
        console.error('❌ Leave balances container not found');
        return;
    }
    
    if (!balances || balances.length === 0) {
        container.innerHTML = `
            <div class="no-data" style="text-align: center; padding: 40px; color: #666;">
                <i class="fas fa-users-slash" style="font-size: 48px; margin-bottom: 15px;"></i>
                <p>No leave balance data found</p>
                <p class="help-text">Try changing your filters or add employees first</p>
            </div>
        `;
        return;
    }
  
    const html = `
        <div class="leave-balances-table">
            <table style="width: 100%; border-collapse: collapse;">
                <thead>
                    <tr style="background: #f8f9fa;">
                        <th style="padding: 12px 15px; text-align: left; font-weight: 600; color: #333;">Employee</th>
                        <th style="padding: 12px 15px; text-align: left; font-weight: 600; color: #333;">Department</th>
                        <th style="padding: 12px 15px; text-align: left; font-weight: 600; color: #333;">Status</th>
                        <th style="padding: 12px 15px; text-align: left; font-weight: 600; color: #333;">Sick Leave (SL)</th>
                        <th style="padding: 12px 15px; text-align: left; font-weight: 600; color: #333;">Privilege Leave (PL)</th>
                        <th style="padding: 12px 15px; text-align: left; font-weight: 600; color: #333;">Maternity Leave (ML)</th>
                        <th style="padding: 12px 15px; text-align: left; font-weight: 600; color: #333;">Other Leaves</th>
                        <th style="padding: 12px 15px; text-align: left; font-weight: 600; color: #333;">Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${balances.map(balance => `
                        <tr style="border-bottom: 1px solid #eee;">
                            <td style="padding: 12px 15px;">
                                <div class="employee-info">
                                    <strong>${balance.firstName} ${balance.lastName}</strong>
                                    <div class="employee-code" style="font-size: 0.875rem; color: #666;">${balance.employeeId}</div>
                                </div>
                            </td>
                            <td style="padding: 12px 15px;">${balance.department || '-'}</td>
                            <td style="padding: 12px 15px;">
                                <span class="status-badge status-${balance.status}" style="display: inline-block; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: bold; ${balance.status === 'active' ? 'background: #d4edda; color: #155724;' : balance.status === 'probation' ? 'background: #fff3cd; color: #856404;' : 'background: #f8d7da; color: #721c24;'}">
                                    ${balance.status.toUpperCase()}
                                </span>
                            </td>
                            <td class="editable-balance" data-id="${balance.employeeId}" data-type="sickLeave" style="padding: 12px 15px; position: relative;">
                                <span class="balance-value" style="font-weight: bold; font-size: 16px; color: #333;">${balance.sickLeave?.current || 0}</span>
                                <button class="btn-edit-balance" title="Edit SL" style="position: absolute; right: 5px; top: 50%; transform: translateY(-50%); background: none; border: none; color: #666; cursor: pointer; padding: 5px; opacity: 0; transition: opacity 0.3s;">
                                    <i class="fas fa-edit"></i>
                                </button>
                                <div class="balance-details" style="font-size: 11px; color: #888; margin-top: 3px;">
                                    <small>Total: ${balance.sickLeave?.total || 8}</small>
                                </div>
                            </td>
                            <td class="editable-balance" data-id="${balance.employeeId}" data-type="privilegeLeave" style="padding: 12px 15px; position: relative;">
                                <span class="balance-value" style="font-weight: bold; font-size: 16px; color: #333;">${balance.privilegeLeave?.current || 0}</span>
                                <button class="btn-edit-balance" title="Edit PL" style="position: absolute; right: 5px; top: 50%; transform: translateY(-50%); background: none; border: none; color: #666; cursor: pointer; padding: 5px; opacity: 0; transition: opacity 0.3s;">
                                    <i class="fas fa-edit"></i>
                                </button>
                                <div class="balance-details" style="font-size: 11px; color: #888; margin-top: 3px;">
                                    <small>Accrual: ${balance.privilegeLeave?.accrualRate || 1.5}/month</small>
                                </div>
                            </td>
                            <td class="editable-balance" data-id="${balance.employeeId}" data-type="maternityLeave" style="padding: 12px 15px; position: relative;">
                                <span class="balance-value" style="font-weight: bold; font-size: 16px; color: #333;">${balance.maternityLeave?.current || 0}</span>
                                <button class="btn-edit-balance" title="Edit ML" style="position: absolute; right: 5px; top: 50%; transform: translateY(-50%); background: none; border: none; color: #666; cursor: pointer; padding: 5px; opacity: 0; transition: opacity 0.3s;">
                                    <i class="fas fa-edit"></i>
                                </button>
                                <div class="balance-details" style="font-size: 11px; color: #888; margin-top: 3px;">
                                    <small>Total: ${balance.maternityLeave?.total || 182}</small>
                                </div>
                            </td>
                            <td style="padding: 12px 15px;">
                                <div class="other-balances">
                                    <div style="margin-bottom: 5px;">HPPL: ${balance.halfPayWithPL?.current || 0}</div>
                                    <div style="margin-bottom: 5px;">LWP: ${balance.leaveWithoutPay?.current || 0}</div>
                                    <div>HLWP: ${balance.halfLWP?.current || 0}</div>
                                </div>
                            </td>
                            <td style="padding: 12px 15px;">
                                <div class="balance-actions" style="display: flex; gap: 5px;">
                                    <button class="btn-small btn-info" onclick="openBalanceAdjustModal('${balance.employeeId}', '${balance.firstName} ${balance.lastName}')" style="padding: 6px 10px; background: #17a2b8; color: white; border: none; border-radius: 4px; cursor: pointer;">
                                        <i class="fas fa-sliders-h"></i>
                                    </button>
                                    <button class="btn-small btn-warning" onclick="openStatusModal('${balance.employeeId}', '${balance.firstName} ${balance.lastName}', '${balance.status}')" style="padding: 6px 10px; background: #ffc107; color: #333; border: none; border-radius: 4px; cursor: pointer;">
                                        <i class="fas fa-user-cog"></i>
                                    </button>
                                    <button class="btn-small btn-secondary" onclick="openHistoryModal('${balance.employeeId}')" style="padding: 6px 10px; background: #6c757d; color: white; border: none; border-radius: 4px; cursor: pointer;">
                                        <i class="fas fa-history"></i>
                                    </button>
                                </div>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
  
    container.innerHTML = html;
    
    // Add edit button listeners
    container.querySelectorAll('.btn-edit-balance').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            const cell = this.closest('.editable-balance');
            const employeeId = cell.getAttribute('data-id');
            const leaveType = cell.getAttribute('data-type');
            const currentValue = cell.querySelector('.balance-value').textContent;
            const employeeName = cell.closest('tr').querySelector('.employee-info strong').textContent;
            openEditBalanceModal(employeeId, leaveType, currentValue, employeeName);
        });
    });
    
    // Add hover effect for edit buttons
    container.querySelectorAll('.editable-balance').forEach(cell => {
        cell.addEventListener('mouseenter', function() {
            const btn = this.querySelector('.btn-edit-balance');
            if (btn) btn.style.opacity = '1';
        });
        cell.addEventListener('mouseleave', function() {
            const btn = this.querySelector('.btn-edit-balance');
            if (btn) btn.style.opacity = '0';
        });
    });
}

function displayLeaveBalancesError() {
    const container = document.getElementById('leave-balances-container');
    if (container) {
        container.innerHTML = `
            <div class="error-state" style="text-align: center; padding: 40px; color: #e74c3c;">
                <i class="fas fa-exclamation-circle" style="font-size: 48px; margin-bottom: 15px;"></i>
                <p>Failed to load leave balances</p>
                <button class="btn btn-primary" onclick="loadLeaveBalances()" style="margin-top: 15px;">
                    <i class="fas fa-redo"></i> Retry
                </button>
            </div>
        `;
    }
}

// Modal Functions
function openEditBalanceModal(employeeId, leaveType, currentValue, employeeName) {
    console.log(`✏️ Opening edit modal for ${employeeId} - ${leaveType}: ${currentValue}`);
    
    document.getElementById('edit-balance-employee-id').value = employeeId;
    document.getElementById('edit-balance-type').value = leaveType;
    document.getElementById('edit-balance-current').value = currentValue;
    document.getElementById('edit-balance-new').value = currentValue;
    document.getElementById('edit-balance-employee-name').value = employeeName || employeeId;
    
    const typeNames = {
        'sickLeave': 'Sick Leave (SL)',
        'privilegeLeave': 'Privilege Leave (PL)',
        'maternityLeave': 'Maternity Leave (ML)'
    };
    
    document.getElementById('edit-balance-title').textContent = 
        `Edit ${typeNames[leaveType] || leaveType}`;
    
    document.getElementById('edit-balance-modal').style.display = 'block';
}

function openBalanceAdjustModal(employeeId, employeeName) {
    console.log(`⚙️ Opening adjust modal for ${employeeId}`);
    
    document.getElementById('adjust-balance-employee-id').value = employeeId;
    document.getElementById('adjust-balance-employee-name').value = employeeName || employeeId;
    document.getElementById('adjust-balance-modal').style.display = 'block';
}

function openStatusModal(employeeId, employeeName, currentStatus) {
    console.log(`👤 Opening status modal for ${employeeId} - Current status: ${currentStatus}`);
    
    document.getElementById('status-employee-id').value = employeeId;
    document.getElementById('status-employee-name').value = employeeName || employeeId;
    document.getElementById('status-employee-display').value = employeeName || employeeId;
    document.getElementById('current-status').value = currentStatus.toUpperCase();
    document.getElementById('new-status').value = currentStatus;
    
    // Show/hide probation months field
    const probationField = document.getElementById('probation-months-field');
    if (currentStatus === 'probation' && document.getElementById('new-status').value === 'active') {
        probationField.style.display = 'block';
    } else {
        probationField.style.display = 'none';
    }
    
    document.getElementById('status-modal').style.display = 'block';
}

function openHistoryModal(employeeId) {
    console.log(`📜 Opening history modal for ${employeeId}`);
    // TODO: Implement history modal functionality
    showNotification('History feature coming soon!', 'info');
}

function closeEditBalanceModal() {
    document.getElementById('edit-balance-modal').style.display = 'none';
    document.getElementById('edit-balance-form').reset();
}

function closeAdjustBalanceModal() {
    document.getElementById('adjust-balance-modal').style.display = 'none';
    document.getElementById('adjust-balance-form').reset();
}

function closeStatusModal() {
    document.getElementById('status-modal').style.display = 'none';
    document.getElementById('status-form').reset();
}

function closeHistoryModal() {
    document.getElementById('history-modal').style.display = 'none';
}

// Form Handlers
async function handleEditBalance(e) {
    e.preventDefault();
    
    const employeeId = document.getElementById('edit-balance-employee-id').value;
    const leaveType = document.getElementById('edit-balance-type').value;
    const newValue = document.getElementById('edit-balance-new').value;
    const reason = document.getElementById('edit-balance-reason').value;
    
    if (!reason.trim()) {
        showNotification('Please provide a reason for the change', 'error');
        return;
    }
    
    try {
        console.log(`💾 Updating ${leaveType} for ${employeeId} to ${newValue}`);
        
        await apiClient.updateLeaveBalance(employeeId, {
            leaveType,
            newValue: parseFloat(newValue),
            reason
        });
        
        showNotification('Leave balance updated successfully', 'success');
        closeEditBalanceModal();
        loadLeaveBalances();
        
    } catch (error) {
        console.error('❌ Error updating balance:', error);
        showNotification(error.message || 'Failed to update leave balance', 'error');
    }
}

async function handleAdjustBalance(e) {
    e.preventDefault();
    
    const employeeId = document.getElementById('adjust-balance-employee-id').value;
    const leaveType = document.getElementById('adjust-leave-type').value;
    const adjustment = document.getElementById('adjust-type').value;
    const value = document.getElementById('adjust-value').value;
    const reason = document.getElementById('adjust-reason').value;
    
    if (!reason.trim()) {
        showNotification('Please provide a reason for the adjustment', 'error');
        return;
    }
    
    try {
        console.log(`🔧 Adjusting ${leaveType} for ${employeeId}: ${adjustment} ${value} days`);
        
        // Get current balance
        const balances = await apiClient.getLeaveBalances({ search: employeeId });
        const employee = balances[0];
        
        if (!employee) {
            showNotification('Employee not found', 'error');
            return;
        }
        
        let currentValue = 0;
        switch(leaveType) {
            case 'sickLeave': currentValue = employee.sickLeave?.current || 0; break;
            case 'privilegeLeave': currentValue = employee.privilegeLeave?.current || 0; break;
            case 'maternityLeave': currentValue = employee.maternityLeave?.current || 0; break;
            case 'halfPayWithPL': currentValue = employee.halfPayWithPL?.current || 0; break;
            case 'leaveWithoutPay': currentValue = employee.leaveWithoutPay?.current || 0; break;
            case 'halfLWP': currentValue = employee.halfLWP?.current || 0; break;
        }
        
        let newValue;
        const adjustmentValue = parseFloat(value);
        if (adjustment === 'set') {
            newValue = adjustmentValue;
        } else if (adjustment === 'add') {
            newValue = currentValue + adjustmentValue;
        } else if (adjustment === 'subtract') {
            newValue = currentValue - adjustmentValue;
        }
        
        await apiClient.updateLeaveBalance(employeeId, {
            leaveType,
            newValue,
            reason: `${adjustment} ${value} days: ${reason}`
        });
        
        showNotification('Leave balance adjusted successfully', 'success');
        closeAdjustBalanceModal();
        loadLeaveBalances();
        
    } catch (error) {
        console.error('❌ Error adjusting balance:', error);
        showNotification(error.message || 'Failed to adjust leave balance', 'error');
    }
}

async function handleStatusChange(e) {
    e.preventDefault();
    
    const employeeId = document.getElementById('status-employee-id').value;
    const newStatus = document.getElementById('new-status').value;
    const probationMonths = document.getElementById('probation-months').value || 0;
    
    try {
        console.log(`🔄 Changing status for ${employeeId} to ${newStatus} with ${probationMonths} months probation`);
        
        await apiClient.updateEmployeeLeaveStatus(employeeId, {
            status: newStatus,
            probationMonths: newStatus === 'active' ? parseInt(probationMonths) : 0
        });
        
        showNotification(`Employee status updated to ${newStatus}`, 'success');
        closeStatusModal();
        loadLeaveBalances();
        
    } catch (error) {
        console.error('❌ Error updating status:', error);
        showNotification(error.message || 'Failed to update employee status', 'error');
    }
}

// Run monthly accrual
async function runMonthlyAccrual() {
    if (!confirm('⚠️ Run monthly PL accrual for all active employees?\n\nThis will add 1.5 days PL to each active employee whose next accrual date has passed.\n\nAre you sure?')) {
        return;
    }
  
    try {
        console.log('🔄 Running monthly PL accrual...');
        
        const result = await apiClient.runMonthlyAccrual();
        
        showNotification(result.message || 'Monthly PL accrual completed successfully', 'success');
        loadLeaveBalances();
        
    } catch (error) {
        console.error('❌ Error running monthly accrual:', error);
        showNotification(error.message || 'Failed to run monthly accrual', 'error');
    }
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
window.openApproveModal = openApproveModal;
window.openRejectModal = openRejectModal;
window.viewLeaveDetails = viewLeaveDetails;
window.downloadDocument = downloadDocument;

// ✅ ADDED: Leave balance functions
window.openEditBalanceModal = openEditBalanceModal;
window.openBalanceAdjustModal = openBalanceAdjustModal;
window.openStatusModal = openStatusModal;
window.openHistoryModal = openHistoryModal;
window.closeEditBalanceModal = closeEditBalanceModal;
window.closeAdjustBalanceModal = closeAdjustBalanceModal;
window.closeStatusModal = closeStatusModal;
window.closeHistoryModal = closeHistoryModal;
window.runMonthlyAccrual = runMonthlyAccrual;
window.loadLeaveBalances = loadLeaveBalances;