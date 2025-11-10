// admin.js - Complete Admin Dashboard Integration
/*document.addEventListener('DOMContentLoaded', async function() {
    console.log('🔄 Initializing Admin Dashboard...');
    
    // Check authentication
    const token = localStorage.getItem('authToken');
    const userData = getUserData();
    
    if (!token || !userData || (userData.role !== 'admin' && userData.role !== 'manager')) {
        console.log('❌ Unauthorized access, redirecting to login...');
        window.location.href = 'index.html';
        return;
    }

    // Update admin name
    document.getElementById('admin-name').textContent = `${userData.firstName} ${userData.lastName}`;

    // Initialize event listeners
    initializeEventListeners();

    // Load dashboard data
    await loadDashboardData();
});

function initializeEventListeners() {
    // Sidebar toggle
    document.getElementById('toggle-sidebar').addEventListener('click', function() {
        document.querySelector('.dashboard-container').classList.toggle('sidebar-collapsed');
    });

    // Miscellaneous hours search
    document.getElementById('searchMiscButton').addEventListener('click', async function() {
        const searchTerm = document.getElementById('searchMiscHours').value;
        if (validateInput(searchTerm)) {
            await searchMiscellaneousHours(searchTerm);
        } else {
            showNotification('Invalid search input', 'error');
        }
    });

    // Enter key for search
    document.getElementById('searchMiscHours').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            const searchTerm = this.value;
            if (validateInput(searchTerm)) {
                searchMiscellaneousHours(searchTerm);
            } else {
                showNotification('Invalid search input', 'error');
            }
        }
    });
}

async function loadDashboardData() {
    try {
        console.log('📊 Loading dashboard data...');
        
        // Load all data from backend using API client
        const [users, timesheets] = await Promise.all([
            apiClient.getUsers().catch(err => {
                console.warn('Users endpoint error:', err);
                return [];
            }),
            apiClient.getAllTimesheets().catch(err => {
                console.warn('Timesheets endpoint error:', err);
                return [];
            })
        ]);

        updateDashboardCards(users, timesheets);
        updateRecentTimesheets(timesheets);
        
        console.log('✅ Dashboard data loaded successfully');
        
    } catch (error) {
        console.error('❌ Error loading dashboard data:', error);
        showNotification('Failed to load dashboard data', 'error');
    }
}

function updateDashboardCards(users, timesheets) {
    try {
        // Total Employees
        const totalEmployees = users.filter(user => user.role === 'employee').length;
        document.querySelector('.card:nth-child(1) p').textContent = totalEmployees;

        // Approved Timesheets
        const approvedTimesheets = timesheets.filter(ts => ts.status === 'approved').length;
        document.querySelector('.card:nth-child(2) p').textContent = approvedTimesheets;

        // Resubmitted Timesheets (pending timesheets that were previously rejected)
        const resubmittedTimesheets = timesheets.filter(ts => 
            ts.status === 'pending' && ts.previousStatus === 'rejected'
        ).length;
        document.getElementById('resubmittedCount').textContent = resubmittedTimesheets;

        // Miscellaneous Hours (timesheets with MISC activity codes)
        const miscHoursCount = timesheets.reduce((count, ts) => {
            const miscEntries = ts.entries.filter(entry => 
                entry.activityCode === 'MISC' || 
                entry.projectCode === 'Miscellaneous Activity'
            );
            return count + miscEntries.length;
        }, 0);
        document.getElementById('miscHoursCount').textContent = miscHoursCount;

    } catch (error) {
        console.error('Error updating dashboard cards:', error);
        showNotification('Error updating dashboard data', 'error');
    }
}

function updateRecentTimesheets(timesheets) {
    const tbody = document.querySelector('.admin-table tbody');
    
    try {
        // Filter and sort recent timesheets (last 5 submitted)
        const recentTimesheets = timesheets
            .filter(ts => ts.status !== 'draft')
            .sort((a, b) => new Date(b.submittedAt || b.createdAt) - new Date(a.submittedAt || a.createdAt))
            .slice(0, 5);

        if (recentTimesheets.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 20px;">No timesheets found</td></tr>';
            return;
        }

        tbody.innerHTML = recentTimesheets.map(timesheet => {
            const employeeName = timesheet.employee ? 
                `${timesheet.employee.firstName} ${timesheet.employee.lastName}` : 
                'Unknown Employee';
            
            const weekStart = formatDate(timesheet.weekStartDate);
            const weekEnd = formatDate(timesheet.weekEndDate);
            const totalHours = (timesheet.totalNormalHours || 0) + (timesheet.totalOvertimeHours || 0);
            const status = timesheet.status.charAt(0).toUpperCase() + timesheet.status.slice(1);
            
            const isPending = timesheet.status === 'pending';

            return `
                <tr>
                    <td>${sanitizeHTML(employeeName)}</td>
                    <td>${weekStart} - ${weekEnd}</td>
                    <td>${totalHours}</td>
                    <td><span class="status ${timesheet.status}">${sanitizeHTML(status)}</span></td>
                    <td>
                        <button class="action-btn view-btn" data-id="${timesheet._id}">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="action-btn approve-btn" data-id="${timesheet._id}" 
                            ${!isPending ? 'disabled' : ''}>
                            <i class="fas fa-check"></i>
                        </button>
                        <button class="action-btn reject-btn" data-id="${timesheet._id}" 
                            ${!isPending ? 'disabled' : ''}>
                            <i class="fas fa-times"></i>
                        </button>
                        <button class="action-btn download-btn" data-id="${timesheet._id}">
                            <i class="fas fa-file-excel"></i>
                        </button>
                    </td>
                </tr>
            `;
        }).join('');

        // Add event listeners to action buttons
        setTimeout(() => {
            setupActionButtons();
        }, 100);

    } catch (error) {
        console.error('Error updating recent timesheets:', error);
        tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: #e74c3c;">Error loading timesheets</td></tr>';
    }
}

function setupActionButtons() {
    // View timesheet details
    document.querySelectorAll('.view-btn').forEach(btn => {
        btn.addEventListener('click', () => viewTimesheetDetails(btn.getAttribute('data-id')));
    });
    
    // Approve timesheet
    document.querySelectorAll('.approve-btn:not(:disabled)').forEach(btn => {
        btn.addEventListener('click', () => approveTimesheet(btn.getAttribute('data-id')));
    });
    
    // Reject timesheet
    document.querySelectorAll('.reject-btn:not(:disabled)').forEach(btn => {
        btn.addEventListener('click', () => rejectTimesheet(btn.getAttribute('data-id')));
    });
    
    // Download timesheet
    document.querySelectorAll('.download-btn').forEach(btn => {
        btn.addEventListener('click', () => downloadExcelForTimesheet(btn.getAttribute('data-id')));
    });
}

async function viewTimesheetDetails(timesheetId) {
    try {
        const timesheet = await apiClient.getAllTimesheets({ id: timesheetId });
        const timesheetData = timesheet.find(ts => ts._id === timesheetId) || timesheet[0];
        
        if (!timesheetData) {
            showNotification('Timesheet not found', 'error');
            return;
        }

        const employeeName = timesheetData.employee ? 
            `${timesheetData.employee.firstName} ${timesheetData.employee.lastName}` : 'Unknown';
        
        const weekRange = `${formatDate(timesheetData.weekStartDate)} - ${formatDate(timesheetData.weekEndDate)}`;
        const totalHours = (timesheetData.totalNormalHours || 0) + (timesheetData.totalOvertimeHours || 0);
        
        // Create detailed view
        let details = `Timesheet Details\n\n`;
        details += `Employee: ${employeeName}\n`;
        details += `Week: ${weekRange}\n`;
        details += `Status: ${timesheetData.status}\n`;
        details += `Total Hours: ${totalHours}\n`;
        details += `Normal Hours: ${timesheetData.totalNormalHours || 0}\n`;
        details += `Overtime Hours: ${timesheetData.totalOvertimeHours || 0}\n`;
        
        if (timesheetData.entries && timesheetData.entries.length > 0) {
            details += `\nDaily Entries:\n`;
            timesheetData.entries.forEach((entry, index) => {
                details += `${index + 1}. ${formatDate(entry.date)} - ${entry.projectCode || 'N/A'} - ${entry.normalHours || 0}N/${entry.overtimeHours || 0}OT\n`;
            });
        }
        
        alert(details);
        
    } catch (error) {
        console.error('Error viewing timesheet:', error);
        showNotification('Failed to load timesheet details', 'error');
    }
}

async function approveTimesheet(timesheetId) {
    if (!confirm('Are you sure you want to approve this timesheet?')) return;

    try {
        await apiClient.approveTimesheet(timesheetId);
        showNotification('Timesheet approved successfully!', 'success');
        await loadDashboardData(); // Refresh data
        
    } catch (error) {
        console.error('Error approving timesheet:', error);
        showNotification(error.message || 'Failed to approve timesheet', 'error');
    }
}

async function rejectTimesheet(timesheetId) {
    const remark = prompt("Please provide a reason for rejecting this timesheet:");
    if (remark === null) return; // User cancelled

    if (!validateInput(remark)) {
        showNotification('Invalid remark format', 'error');
        return;
    }

    try {
        await apiClient.rejectTimesheet(timesheetId, remark);
        showNotification('Timesheet rejected successfully!', 'success');
        await loadDashboardData(); // Refresh data
        
    } catch (error) {
        console.error('Error rejecting timesheet:', error);
        showNotification(error.message || 'Failed to reject timesheet', 'error');
    }
}

async function searchMiscellaneousHours(searchTerm) {
    try {
        const result = await apiClient.getEmployeeReport({ name: searchTerm });
        const resultDiv = document.getElementById('searchResultCount');
        
        if (result.timesheets && result.timesheets.length > 0) {
            const miscEntries = result.timesheets.flatMap(ts => 
                ts.entries.filter(entry => entry.activityCode === 'MISC')
            );
            
            resultDiv.innerHTML = `
                <div class="search-note">
                    <i class="fas fa-check-circle"></i> 
                    Employee "${sanitizeHTML(searchTerm)}" has ${miscEntries.length} Miscellaneous Hour entries.
                </div>
                <div style="margin-top: 10px; font-size: 14px;">
                    <strong>Recent Entries:</strong>
                    <ul style="margin-top: 5px; padding-left: 20px;">
                        ${miscEntries.slice(0, 5).map(entry => 
                            `<li>${formatDate(entry.date)}: ${entry.normalHours + entry.overtimeHours} hours</li>`
                        ).join('')}
                    </ul>
                </div>
            `;
        } else {
            resultDiv.innerHTML = `
                <div style="color: #e74c3c;">
                    <i class="fas fa-exclamation-circle"></i>
                    No Miscellaneous Hours found for employee "${sanitizeHTML(searchTerm)}".
                </div>
            `;
        }
    } catch (error) {
        console.error('Error searching miscellaneous hours:', error);
        document.getElementById('searchResultCount').innerHTML = `
            <div style="color: #e74c3c;">
                <i class="fas fa-exclamation-triangle"></i>
                Error searching miscellaneous hours. Please try again.
            </div>
        `;
    }
}

function downloadExcelForTimesheet(timesheetId) {
    // This would typically call a backend export endpoint
    // For now, we'll show a message
    showNotification('Export feature coming soon!', 'info');
}

// Modal Functions
function openMiscellaneousHoursModal() {
    document.getElementById('miscHoursModal').style.display = 'block';
    document.getElementById('searchMiscHours').value = '';
    document.getElementById('searchResultCount').innerHTML = '';
    document.getElementById('searchMiscHours').focus();
}

function closeMiscellaneousHoursModal() {
    document.getElementById('miscHoursModal').style.display = 'none';
}

// Add CSS for search results
const style = document.createElement('style');
style.textContent = `
    .search-note {
        background: #27ae60;
        color: white;
        padding: 12px 15px;
        border-radius: 5px;
        font-weight: 500;
        margin-bottom: 10px;
    }
    
    .action-btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }
    
    .action-btn:not(:disabled):hover {
        transform: scale(1.1);
        transition: transform 0.2s ease;
    }
    
    .notification {
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 12px 20px;
        border-radius: 5px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 10000;
        display: flex;
        align-items: center;
        gap: 10px;
        font-weight: 500;
        max-width: 400px;
        transform: translateX(100%);
        transition: transform 0.3s ease;
    }
    
    .notification.show {
        transform: translateX(0);
    }
    
    .notification.success {
        background: #27ae60;
        color: white;
    }
    
    .notification.error {
        background: #e74c3c;
        color: white;
    }
    
    .notification.info {
        background: #3498db;
        color: white;
    }
    
    .notification.warning {
        background: #f39c12;
        color: white;
    }
`;
document.head.appendChild(style);

*/

// admin.js - Fixed Admin Dashboard Integration
document.addEventListener('DOMContentLoaded', async function() {
    console.log('🔄 Initializing Admin Dashboard...');
    
    // Check authentication
    const token = localStorage.getItem('authToken');
    const userData = getUserData();
    
    if (!token || !userData || (userData.role !== 'admin' && userData.role !== 'manager')) {
        console.log('❌ Unauthorized access, redirecting to login...');
        window.location.href = 'index.html';
        return;
    }

    // Update admin name
    document.getElementById('admin-name').textContent = `${userData.firstName} ${userData.lastName}`;

    // Initialize event listeners
    initializeEventListeners();

    // Load dashboard data
    await loadDashboardData();
});

function initializeEventListeners() {
    // Sidebar toggle
    document.getElementById('toggle-sidebar').addEventListener('click', function() {
        document.querySelector('.dashboard-container').classList.toggle('sidebar-collapsed');
    });

    // Miscellaneous hours search
    document.getElementById('searchMiscButton').addEventListener('click', async function() {
        const searchTerm = document.getElementById('searchMiscHours').value;
        if (searchTerm.trim()) {
            await searchMiscellaneousHours(searchTerm);
        } else {
            showNotification('Please enter search term', 'error');
        }
    });

    // Enter key for search
    document.getElementById('searchMiscHours').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            const searchTerm = this.value;
            if (searchTerm.trim()) {
                searchMiscellaneousHours(searchTerm);
            } else {
                showNotification('Please enter search term', 'error');
            }
        }
    });
}

async function loadDashboardData() {
    try {
        console.log('📊 Loading dashboard data...');
        
        // Load all data from backend using API client
        const [users, timesheets] = await Promise.all([
            apiClient.getUsers().catch(err => {
                console.warn('Users endpoint error:', err);
                return [];
            }),
            apiClient.getAllTimesheets().catch(err => {
                console.warn('Timesheets endpoint error:', err);
                return [];
            })
        ]);

        updateDashboardCards(users, timesheets);
        updateRecentTimesheets(timesheets);
        
        console.log('✅ Dashboard data loaded successfully');
        
    } catch (error) {
        console.error('❌ Error loading dashboard data:', error);
        showNotification('Failed to load dashboard data', 'error');
    }
}

function updateDashboardCards(users, timesheets) {
    try {
        // Total Employees
        const totalEmployees = users.filter(user => user.role === 'employee').length;
        document.getElementById('totalEmployees').textContent = totalEmployees;

        // Approved Timesheets
        const approvedTimesheets = timesheets.filter(ts => ts.status === 'approved').length;
        document.getElementById('approvedTimesheets').textContent = approvedTimesheets;

        // Resubmitted Timesheets (pending timesheets that were previously rejected)
        const resubmittedTimesheets = timesheets.filter(ts => 
            ts.status === 'submitted' && ts.previousStatus === 'rejected'
        ).length;
        document.getElementById('resubmittedCount').textContent = resubmittedTimesheets || 0;

        // Miscellaneous Hours (timesheets with MISC activity codes)
        const miscHoursCount = timesheets.reduce((count, ts) => {
            const miscEntries = ts.entries.filter(entry => 
                entry.activityCode === 'MISC' || 
                entry.projectCode === 'Miscellaneous Activity'
            );
            return count + miscEntries.length;
        }, 0);
        document.getElementById('miscHoursCount').textContent = miscHoursCount;

    } catch (error) {
        console.error('Error updating dashboard cards:', error);
        showNotification('Error updating dashboard data', 'error');
    }
}

function updateRecentTimesheets(timesheets) {
    const tbody = document.getElementById('recentTimesheetsBody');
    
    try {
        // Filter and sort recent timesheets (last 10 submitted)
        const recentTimesheets = timesheets
            .filter(ts => ts.status === 'submitted' || ts.status === 'approved' || ts.status === 'rejected')
            .sort((a, b) => new Date(b.submittedAt || b.createdAt) - new Date(a.submittedAt || a.createdAt))
            .slice(0, 10);

        if (recentTimesheets.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 20px;">No timesheets found</td></tr>';
            return;
        }

        tbody.innerHTML = recentTimesheets.map(timesheet => {
            const employeeName = timesheet.employeeName || 
                (timesheet.employee ? `${timesheet.employee.firstName} ${timesheet.employee.lastName}` : 'Unknown Employee');
            
            const weekStart = formatDate(timesheet.weekStartDate);
            const weekEnd = formatDate(timesheet.weekEndDate);
            const totalHours = timesheet.totalHours || (timesheet.totalNormalHours || 0) + (timesheet.totalOvertimeHours || 0);
            const status = timesheet.status.charAt(0).toUpperCase() + timesheet.status.slice(1);
            
            const isSubmitted = timesheet.status === 'submitted';

            return `
                <tr>
                    <td>${sanitizeHTML(employeeName)}</td>
                    <td>${weekStart} - ${weekEnd}</td>
                    <td>${totalHours.toFixed(1)}</td>
                    <td><span class="status ${timesheet.status}">${sanitizeHTML(status)}</span></td>
                    <td>
                        <button class="action-btn view-btn" data-id="${timesheet._id}" title="View Details">
                            <i class="fas fa-eye"></i>
                        </button>
                        ${isSubmitted ? `
                        <button class="action-btn approve-btn" data-id="${timesheet._id}" title="Approve">
                            <i class="fas fa-check"></i>
                        </button>
                        <button class="action-btn reject-btn" data-id="${timesheet._id}" title="Reject">
                            <i class="fas fa-times"></i>
                        </button>
                        ` : ''}
                        <button class="action-btn download-btn" data-id="${timesheet._id}" title="Export CSV">
                            <i class="fas fa-file-excel"></i>
                        </button>
                    </td>
                </tr>
            `;
        }).join('');

        // Add event listeners to action buttons
        setTimeout(() => {
            setupActionButtons();
        }, 100);

    } catch (error) {
        console.error('Error updating recent timesheets:', error);
        tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: #e74c3c;">Error loading timesheets</td></tr>';
    }
}

function setupActionButtons() {
    // View timesheet details
    document.querySelectorAll('.view-btn').forEach(btn => {
        btn.addEventListener('click', () => viewTimesheetDetails(btn.getAttribute('data-id')));
    });
    
    // Approve timesheet
    document.querySelectorAll('.approve-btn').forEach(btn => {
        btn.addEventListener('click', () => approveTimesheet(btn.getAttribute('data-id')));
    });
    
    // Reject timesheet
    document.querySelectorAll('.reject-btn').forEach(btn => {
        btn.addEventListener('click', () => rejectTimesheet(btn.getAttribute('data-id')));
    });
    
    // Download timesheet
    document.querySelectorAll('.download-btn').forEach(btn => {
        btn.addEventListener('click', () => downloadExcelForTimesheet(btn.getAttribute('data-id')));
    });
}

async function viewTimesheetDetails(timesheetId) {
    try {
        console.log('🔍 Fetching timesheet details for:', timesheetId);
        
        // First, try to get the timesheet from the existing data
        const allTimesheets = await apiClient.getAllTimesheets();
        const timesheetFromList = allTimesheets.find(ts => ts._id === timesheetId);
        
        let timesheet = timesheetFromList;
        
        // If not found in the list, try to fetch individually
        if (!timesheet) {
            console.log('📋 Timesheet not in list, fetching individually...');
            timesheet = await apiClient.getTimesheetById(timesheetId);
        }
        
        if (!timesheet) {
            showNotification('Timesheet not found', 'error');
            return;
        }

        console.log('✅ Timesheet data loaded:', timesheet);
        
        const employeeName = timesheet.employeeName || 
            (timesheet.employee ? `${timesheet.employee.firstName} ${timesheet.employee.lastName}` : 'Unknown Employee');
        
        const employeeCode = timesheet.employeeCode || 
            (timesheet.employee ? timesheet.employee.employeeId : 'N/A');
            
        const department = timesheet.department || 
            (timesheet.employee ? timesheet.employee.department : 'N/A');
        
        const weekRange = `${formatDate(timesheet.weekStartDate)} - ${formatDate(timesheet.weekEndDate)}`;
        const totalHours = timesheet.totalHours || (timesheet.totalNormalHours || 0) + (timesheet.totalOvertimeHours || 0);
        
        // Create detailed view in modal
        const modal = document.getElementById('timesheetDetailsModal');
        const content = document.getElementById('timesheetDetailsContent');
        
        let detailsHTML = `
            <div class="timesheet-details">
                <div class="details-header">
                    <h3>Timesheet Details</h3>
                    <div class="employee-info">
                        <p><strong>Employee:</strong> ${sanitizeHTML(employeeName)}</p>
                        <p><strong>Employee Code:</strong> ${sanitizeHTML(employeeCode)}</p>
                        <p><strong>Department:</strong> ${sanitizeHTML(department)}</p>
                    </div>
                    <div class="timesheet-info">
                        <p><strong>Week:</strong> ${weekRange}</p>
                        <p><strong>Status:</strong> <span class="status ${timesheet.status}">${timesheet.status.toUpperCase()}</span></p>
                        <p><strong>Total Hours:</strong> ${totalHours.toFixed(1)}</p>
                        <p><strong>Normal Hours:</strong> ${timesheet.totalNormalHours || 0}</p>
                        <p><strong>Overtime Hours:</strong> ${timesheet.totalOvertimeHours || 0}</p>
                    </div>
                </div>
        `;

        if (timesheet.entries && timesheet.entries.length > 0) {
            detailsHTML += `
                <div class="details-table">
                    <h4>Daily Entries</h4>
                    <div class="table-container">
                        <table>
                            <thead>
                                <tr>
                                    <th>Date</th>
                                    <th>Day</th>
                                    <th>Project</th>
                                    <th>Location</th>
                                    <th>Normal Hours</th>
                                    <th>Overtime Hours</th>
                                    <th>Activity Code</th>
                                    <th>Remarks</th>
                                </tr>
                            </thead>
                            <tbody>
            `;
            
            timesheet.entries.forEach((entry, index) => {
                const entryDate = new Date(entry.date);
                const dayName = entryDate.toLocaleDateString('en-US', { weekday: 'short' });
                
                detailsHTML += `
                    <tr>
                        <td>${formatDate(entry.date)}</td>
                        <td>${dayName}</td>
                        <td>${sanitizeHTML(entry.projectCode || 'N/A')}</td>
                        <td>${sanitizeHTML(entry.location || '-')}</td>
                        <td>${entry.normalHours || 0}</td>
                        <td>${entry.overtimeHours || 0}</td>
                        <td>${sanitizeHTML(entry.activityCode || 'MISC')}</td>
                        <td>${sanitizeHTML(entry.remarks || '-')}</td>
                    </tr>
                `;
            });
            
            detailsHTML += `
                            </tbody>
                        </table>
                    </div>
                </div>
            `;
        } else {
            detailsHTML += `
                <div class="no-entries">
                    <p>No time entries found for this timesheet.</p>
                </div>
            `;
        }
        
        // Add submission info if available
        if (timesheet.submittedAt) {
            detailsHTML += `
                <div class="submission-info">
                    <p><strong>Submitted:</strong> ${new Date(timesheet.submittedAt).toLocaleString()}</p>
                </div>
            `;
        }
        
        detailsHTML += `</div>`;
        content.innerHTML = detailsHTML;
        modal.style.display = 'block';
        
    } catch (error) {
        console.error('❌ Error viewing timesheet:', error);
        
        // Fallback: Show basic info in alert
        try {
            const allTimesheets = await apiClient.getAllTimesheets();
            const timesheet = allTimesheets.find(ts => ts._id === timesheetId);
            
            if (timesheet) {
                const employeeName = timesheet.employeeName || 'Unknown Employee';
                const weekRange = `${formatDate(timesheet.weekStartDate)} - ${formatDate(timesheet.weekEndDate)}`;
                const totalHours = timesheet.totalHours || 0;
                
                let alertMessage = `Timesheet Details\n\n`;
                alertMessage += `Employee: ${employeeName}\n`;
                alertMessage += `Week: ${weekRange}\n`;
                alertMessage += `Status: ${timesheet.status}\n`;
                alertMessage += `Total Hours: ${totalHours}\n`;
                
                if (timesheet.entries && timesheet.entries.length > 0) {
                    alertMessage += `\nEntries:\n`;
                    timesheet.entries.slice(0, 5).forEach((entry, index) => {
                        alertMessage += `${index + 1}. ${formatDate(entry.date)} - ${entry.projectCode}: ${entry.normalHours || 0}N/${entry.overtimeHours || 0}OT\n`;
                    });
                    if (timesheet.entries.length > 5) {
                        alertMessage += `... and ${timesheet.entries.length - 5} more entries`;
                    }
                }
                
                alert(alertMessage);
            } else {
                showNotification('Timesheet not found', 'error');
            }
        } catch (fallbackError) {
            showNotification('Failed to load timesheet details', 'error');
        }
    }
}

async function approveTimesheet(timesheetId) {
    if (!confirm('Are you sure you want to approve this timesheet?')) return;

    try {
        await apiClient.approveTimesheet(timesheetId);
        showNotification('Timesheet approved successfully!', 'success');
        await loadDashboardData(); // Refresh data
        
    } catch (error) {
        console.error('Error approving timesheet:', error);
        showNotification(error.message || 'Failed to approve timesheet', 'error');
    }
}

async function rejectTimesheet(timesheetId) {
    const remark = prompt("Please provide a reason for rejecting this timesheet:");
    if (remark === null) return; // User cancelled

    if (!remark.trim()) {
        showNotification('Rejection reason is required', 'error');
        return;
    }

    try {
        await apiClient.rejectTimesheet(timesheetId, remark);
        showNotification('Timesheet rejected successfully!', 'success');
        await loadDashboardData(); // Refresh data
        
    } catch (error) {
        console.error('Error rejecting timesheet:', error);
        showNotification(error.message || 'Failed to reject timesheet', 'error');
    }
}

async function searchMiscellaneousHours(searchTerm) {
    try {
        // Use existing timesheets data instead of separate endpoint
        const timesheets = await apiClient.getAllTimesheets();
        
        const filteredTimesheets = timesheets.filter(ts => {
            const employeeMatch = 
                ts.employeeName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                ts.employeeCode?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (ts.employee && 
                 (ts.employee.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                  ts.employee.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                  ts.employee.employeeId?.toLowerCase().includes(searchTerm.toLowerCase())));
            
            return employeeMatch;
        });

        const resultDiv = document.getElementById('searchResultCount');
        
        if (filteredTimesheets.length > 0) {
            const miscEntries = filteredTimesheets.flatMap(ts => 
                ts.entries.filter(entry => entry.activityCode === 'MISC' || entry.projectCode === 'Miscellaneous Activity')
            );
            
            resultDiv.innerHTML = `
                <div class="search-note">
                    <i class="fas fa-check-circle"></i> 
                    Found ${miscEntries.length} Miscellaneous Hour entries for "${sanitizeHTML(searchTerm)}".
                </div>
                <div style="margin-top: 10px; font-size: 14px;">
                    <strong>Recent Entries:</strong>
                    <ul style="margin-top: 5px; padding-left: 20px;">
                        ${miscEntries.slice(0, 5).map(entry => 
                            `<li>${formatDate(entry.date)}: ${(entry.normalHours + entry.overtimeHours).toFixed(1)} hours - ${entry.projectCode || 'MISC'}</li>`
                        ).join('')}
                    </ul>
                </div>
            `;
        } else {
            resultDiv.innerHTML = `
                <div style="color: #e74c3c;">
                    <i class="fas fa-exclamation-circle"></i>
                    No Miscellaneous Hours found for "${sanitizeHTML(searchTerm)}".
                </div>
            `;
        }
    } catch (error) {
        console.error('Error searching miscellaneous hours:', error);
        document.getElementById('searchResultCount').innerHTML = `
            <div style="color: #e74c3c;">
                <i class="fas fa-exclamation-triangle"></i>
                Error searching miscellaneous hours. Please try again.
            </div>
        `;
    }
}

async function downloadExcelForTimesheet(timesheetId) {
    try {
        await apiClient.exportTimesheetToCSV(timesheetId);
        showNotification('Timesheet exported successfully!', 'success');
    } catch (error) {
        console.error('Error exporting timesheet:', error);
        showNotification(error.message || 'Failed to export timesheet', 'error');
    }
}

// Modal Functions
function openMiscellaneousHoursModal() {
    document.getElementById('miscHoursModal').style.display = 'block';
    document.getElementById('searchMiscHours').value = '';
    document.getElementById('searchResultCount').innerHTML = '';
    document.getElementById('searchMiscHours').focus();
}

function closeMiscellaneousHoursModal() {
    document.getElementById('miscHoursModal').style.display = 'none';
}

function closeTimesheetDetailsModal() {
    document.getElementById('timesheetDetailsModal').style.display = 'none';
}

// Add CSS for admin dashboard
const style = document.createElement('style');
style.textContent = `
    .search-note {
        background: #27ae60;
        color: white;
        padding: 12px 15px;
        border-radius: 5px;
        font-weight: 500;
        margin-bottom: 10px;
    }
    
    .action-btn {
        background: none;
        border: none;
        padding: 5px 8px;
        margin: 0 2px;
        cursor: pointer;
        border-radius: 3px;
        transition: all 0.2s ease;
    }
    
    .action-btn:hover {
        background: #f8f9fa;
        transform: scale(1.1);
    }
    
    .action-btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
        transform: none;
    }
    
    .status {
        padding: 4px 8px;
        border-radius: 12px;
        font-size: 12px;
        font-weight: 600;
        text-transform: uppercase;
    }
    
    .status.submitted { background: #fff3cd; color: #856404; }
    .status.approved { background: #d1edff; color: #0c5460; }
    .status.rejected { background: #f8d7da; color: #721c24; }
    .status.draft { background: #e2e3e5; color: #383d41; }
    
    .timesheet-details {
        max-height: 60vh;
        overflow-y: auto;
    }
    
    .details-header {
        background: #f8f9fa;
        padding: 15px;
        border-radius: 5px;
        margin-bottom: 15px;
    }
    
    .details-header h3 {
        margin: 0 0 10px 0;
        color: #2c3e50;
    }
    
    .details-header p {
        margin: 5px 0;
    }
    
    .details-table {
        margin-top: 15px;
    }
    
    .details-table table {
        width: 100%;
        border-collapse: collapse;
    }
    
    .details-table th,
    .details-table td {
        padding: 8px 12px;
        border: 1px solid #dee2e6;
        text-align: left;
    }
    
    .details-table th {
        background: #3498db;
        color: white;
        font-weight: 600;
    }
    
    .details-table tr:nth-child(even) {
        background: #f8f9fa;
    }
`;
document.head.appendChild(style);

// Close modals when clicking outside
window.onclick = function(event) {
    const miscModal = document.getElementById('miscHoursModal');
    const detailsModal = document.getElementById('timesheetDetailsModal');
    
    if (event.target === miscModal) {
        closeMiscellaneousHoursModal();
    }
    if (event.target === detailsModal) {
        closeTimesheetDetailsModal();
    }
};