// admin.js - Complete Admin Dashboard Integration
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

