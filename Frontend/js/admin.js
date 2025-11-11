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
    const toggleSidebar = document.getElementById('toggle-sidebar');
    if (toggleSidebar) {
        toggleSidebar.addEventListener('click', function() {
            document.querySelector('.dashboard-container').classList.toggle('sidebar-collapsed');
        });
    }

    // Navigation links
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const target = this.getAttribute('data-target');
            showSection(target);
        });
    });

    // Miscellaneous hours search
    const searchMiscButton = document.getElementById('searchMiscButton');
    if (searchMiscButton) {
        searchMiscButton.addEventListener('click', async function() {
            const searchTerm = document.getElementById('searchMiscHours').value;
            if (searchTerm.trim()) {
                await searchMiscellaneousHours(searchTerm);
            } else {
                showNotification('Please enter search term', 'error');
            }
        });
    }

    // Enter key for search
    const searchMiscHours = document.getElementById('searchMiscHours');
    if (searchMiscHours) {
        searchMiscHours.addEventListener('keypress', function(e) {
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

    // Logout
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function() {
            localStorage.removeItem('authToken');
            localStorage.removeItem('userData');
            window.location.href = 'index.html';
        });
    }
}

function showSection(sectionName) {
    // Hide all sections
    document.querySelectorAll('.content-section').forEach(section => {
        section.style.display = 'none';
    });
    
    // Remove active class from all nav links
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
    });
    
    // Show target section
    const targetSection = document.getElementById(sectionName);
    if (targetSection) {
        targetSection.style.display = 'block';
    }
    
    // Add active class to clicked nav link
    const activeLink = document.querySelector(`[data-target="${sectionName}"]`);
    if (activeLink) {
        activeLink.classList.add('active');
    }
    
    // Load section-specific data
    switch(sectionName) {
        case 'dashboard':
            loadDashboardData();
            break;
        case 'employees':
            loadEmployeesData();
            break;
        case 'timesheets':
            loadTimesheetsData();
            break;
        case 'reports':
            loadReportsData();
            break;
    }
}

async function loadDashboardData() {
    try {
        console.log('📊 Loading dashboard data...');
        
        // Load all data from backend using API client
        const [usersResponse, timesheets] = await Promise.all([
            apiClient.getUsers().catch(err => {
                console.warn('Users endpoint error:', err);
                return { users: [] };
            }),
            apiClient.getAllTimesheets().catch(err => {
                console.warn('Timesheets endpoint error:', err);
                return [];
            })
        ]);

        // Extract users array from response
        const users = usersResponse.users || usersResponse || [];
        
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
        console.log('📈 Updating dashboard cards with:', { users, timesheets });
        
        // Ensure users is an array
        const usersArray = Array.isArray(users) ? users : [];
        
        // Ensure timesheets is an array
        const timesheetsArray = Array.isArray(timesheets) ? timesheets : [];

        // Total Employees
        const totalEmployees = usersArray.filter(user => user.role === 'employee').length;
        const totalEmployeesEl = document.getElementById('totalEmployees');
        if (totalEmployeesEl) totalEmployeesEl.textContent = totalEmployees;

        // Approved Timesheets
        const approvedTimesheets = timesheetsArray.filter(ts => ts.status === 'approved').length;
        const approvedTimesheetsEl = document.getElementById('approvedTimesheets');
        if (approvedTimesheetsEl) approvedTimesheetsEl.textContent = approvedTimesheets;

        // Resubmitted Timesheets
        const resubmittedTimesheets = timesheetsArray.filter(ts => 
            ts.status === 'submitted' && ts.previousStatus === 'rejected'
        ).length;
        const resubmittedCountEl = document.getElementById('resubmittedCount');
        if (resubmittedCountEl) resubmittedCountEl.textContent = resubmittedTimesheets || 0;

        // Miscellaneous Hours
        const miscHoursCount = timesheetsArray.reduce((count, ts) => {
            if (!ts.entries || !Array.isArray(ts.entries)) return count;
            
            const miscEntries = ts.entries.filter(entry => 
                entry.activityCode === 'MISC' || 
                entry.projectCode === 'Miscellaneous Activity' ||
                (entry.projectCode && entry.projectCode.includes('Misc'))
            );
            return count + miscEntries.length;
        }, 0);
        const miscHoursCountEl = document.getElementById('miscHoursCount');
        if (miscHoursCountEl) miscHoursCountEl.textContent = miscHoursCount;

    } catch (error) {
        console.error('❌ Error updating dashboard cards:', error);
        showNotification('Error updating dashboard data', 'error');
    }
}

function updateRecentTimesheets(timesheets) {
    const tbody = document.getElementById('recentTimesheetsBody');
    if (!tbody) return;
    
    try {
        // Ensure timesheets is an array
        const timesheetsArray = Array.isArray(timesheets) ? timesheets : [];
        
        // Filter and sort recent timesheets (last 10 submitted)
        const recentTimesheets = timesheetsArray
            .filter(ts => ts.status === 'submitted' || ts.status === 'approved' || ts.status === 'rejected')
            .sort((a, b) => new Date(b.submittedAt || b.createdAt || b.updatedAt) - new Date(a.submittedAt || a.createdAt || a.updatedAt))
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
            const totalHours = timesheet.totalHours || 
                (timesheet.totalNormalHours || 0) + (timesheet.totalOvertimeHours || 0);
            const status = timesheet.status ? 
                timesheet.status.charAt(0).toUpperCase() + timesheet.status.slice(1) : 'Unknown';
            
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
        console.error('❌ Error updating recent timesheets:', error);
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
        
        // Get all timesheets first
        const allTimesheets = await apiClient.getAllTimesheets();
        let timesheet = allTimesheets.find(ts => ts._id === timesheetId);
        
        // If not found, try to fetch individually
        if (!timesheet) {
            console.log('📋 Timesheet not in list, fetching individually...');
            try {
                timesheet = await apiClient.getTimesheetById(timesheetId);
            } catch (individualError) {
                console.warn('Individual fetch failed, using fallback:', individualError);
            }
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
        const totalHours = timesheet.totalHours || 
            (timesheet.totalNormalHours || 0) + (timesheet.totalOvertimeHours || 0);
        
        // Create detailed view in modal
        const modal = document.getElementById('timesheetDetailsModal');
        const content = document.getElementById('timesheetDetailsContent');
        
        if (!modal || !content) {
            console.warn('Timesheet details modal elements not found');
            return;
        }
        
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
                        <p><strong>Status:</strong> <span class="status ${timesheet.status}">${timesheet.status ? timesheet.status.toUpperCase() : 'UNKNOWN'}</span></p>
                        <p><strong>Total Hours:</strong> ${totalHours.toFixed(1)}</p>
                        <p><strong>Normal Hours:</strong> ${timesheet.totalNormalHours || 0}</p>
                        <p><strong>Overtime Hours:</strong> ${timesheet.totalOvertimeHours || 0}</p>
                    </div>
                </div>
        `;

        if (timesheet.entries && Array.isArray(timesheet.entries) && timesheet.entries.length > 0) {
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
        
        if (timesheet.approvedAt) {
            detailsHTML += `
                <div class="approval-info">
                    <p><strong>Approved:</strong> ${new Date(timesheet.approvedAt).toLocaleString()}</p>
                </div>
            `;
        }
        
        detailsHTML += `</div>`;
        content.innerHTML = detailsHTML;
        modal.style.display = 'block';
        
    } catch (error) {
        console.error('❌ Error viewing timesheet:', error);
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
        console.error('❌ Error approving timesheet:', error);
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
        console.error('❌ Error rejecting timesheet:', error);
        showNotification(error.message || 'Failed to reject timesheet', 'error');
    }
}

async function searchMiscellaneousHours(searchTerm) {
    try {
        // Use existing timesheets data instead of separate endpoint
        const timesheets = await apiClient.getAllTimesheets();
        
        const filteredTimesheets = timesheets.filter(ts => {
            const employeeName = ts.employeeName || 
                (ts.employee ? `${ts.employee.firstName} ${ts.employee.lastName}` : '');
            const employeeCode = ts.employeeCode || 
                (ts.employee ? ts.employee.employeeId : '');
                
            return employeeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                   employeeCode.toLowerCase().includes(searchTerm.toLowerCase());
        });

        const resultDiv = document.getElementById('searchResultCount');
        if (!resultDiv) return;
        
        if (filteredTimesheets.length > 0) {
            const miscEntries = filteredTimesheets.flatMap(ts => 
                (ts.entries || []).filter(entry => 
                    entry.activityCode === 'MISC' || 
                    entry.projectCode === 'Miscellaneous Activity' ||
                    (entry.projectCode && entry.projectCode.includes('Misc'))
                )
            );
            
            if (miscEntries.length > 0) {
                resultDiv.innerHTML = `
                    <div class="search-note">
                        <i class="fas fa-check-circle"></i> 
                        Found ${miscEntries.length} Miscellaneous Hour entries for "${sanitizeHTML(searchTerm)}".
                    </div>
                    <div style="margin-top: 10px; font-size: 14px;">
                        <strong>Recent Entries:</strong>
                        <ul style="margin-top: 5px; padding-left: 20px;">
                            ${miscEntries.slice(0, 5).map(entry => 
                                `<li>${formatDate(entry.date)}: ${((entry.normalHours || 0) + (entry.overtimeHours || 0)).toFixed(1)} hours - ${entry.projectCode || 'MISC'}</li>`
                            ).join('')}
                        </ul>
                    </div>
                `;
            } else {
                resultDiv.innerHTML = `
                    <div style="color: #f39c12;">
                        <i class="fas fa-info-circle"></i>
                        Employee "${sanitizeHTML(searchTerm)}" found, but no Miscellaneous Hours entries.
                    </div>
                `;
            }
        } else {
            resultDiv.innerHTML = `
                <div style="color: #e74c3c;">
                    <i class="fas fa-exclamation-circle"></i>
                    No employee found for "${sanitizeHTML(searchTerm)}".
                </div>
            `;
        }
    } catch (error) {
        console.error('❌ Error searching miscellaneous hours:', error);
        const resultDiv = document.getElementById('searchResultCount');
        if (resultDiv) {
            resultDiv.innerHTML = `
                <div style="color: #e74c3c;">
                    <i class="fas fa-exclamation-triangle"></i>
                    Error searching miscellaneous hours. Please try again.
                </div>
            `;
        }
    }
}

async function downloadExcelForTimesheet(timesheetId) {
    try {
        // Check if the API client has the export method
        if (typeof apiClient.exportTimesheetToCSV === 'function') {
            await apiClient.exportTimesheetToCSV(timesheetId);
            showNotification('Timesheet exported successfully!', 'success');
        } else {
            // Fallback: Show info message
            showNotification('Export feature will be available soon!', 'info');
            console.log('Export functionality would be called for timesheet:', timesheetId);
        }
    } catch (error) {
        console.error('❌ Error exporting timesheet:', error);
        showNotification(error.message || 'Failed to export timesheet', 'error');
    }
}

// Section loading functions
async function loadEmployeesData() {
    try {
        const usersResponse = await apiClient.getUsers();
        const users = usersResponse.users || usersResponse || [];
        const employees = users.filter(user => user.role === 'employee');
        
        updateEmployeesTable(employees);
    } catch (error) {
        console.error('❌ Error loading employees:', error);
        showNotification('Failed to load employees data', 'error');
    }
}

function updateEmployeesTable(employees) {
    const tbody = document.getElementById('employeesTableBody');
    if (!tbody) return;
    
    if (!employees || !Array.isArray(employees) || employees.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 20px;">No employees found</td></tr>';
        return;
    }
    
    tbody.innerHTML = employees.map(employee => `
        <tr>
            <td>${sanitizeHTML(employee.employeeId || 'N/A')}</td>
            <td>${sanitizeHTML(employee.firstName)} ${sanitizeHTML(employee.lastName)}</td>
            <td>${sanitizeHTML(employee.email)}</td>
            <td>${sanitizeHTML(employee.department || 'N/A')}</td>
            <td>${sanitizeHTML(employee.position || 'N/A')}</td>
            <td>
                <button class="action-btn view-btn" data-id="${employee._id}" title="View Details">
                    <i class="fas fa-eye"></i>
                </button>
                <button class="action-btn edit-btn" data-id="${employee._id}" title="Edit Employee">
                    <i class="fas fa-edit"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

async function loadTimesheetsData() {
    try {
        const timesheets = await apiClient.getAllTimesheets();
        updateTimesheetsTable(timesheets);
    } catch (error) {
        console.error('❌ Error loading timesheets:', error);
        showNotification('Failed to load timesheets data', 'error');
    }
}

function updateTimesheetsTable(timesheets) {
    const tbody = document.getElementById('timesheetsTableBody');
    if (!tbody) return;
    
    const timesheetsArray = Array.isArray(timesheets) ? timesheets : [];
    
    if (timesheetsArray.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 20px;">No timesheets found</td></tr>';
        return;
    }
    
    tbody.innerHTML = timesheetsArray.map(timesheet => {
        const employeeName = timesheet.employeeName || 
            (timesheet.employee ? `${timesheet.employee.firstName} ${timesheet.employee.lastName}` : 'Unknown Employee');
        const status = timesheet.status ? 
            timesheet.status.charAt(0).toUpperCase() + timesheet.status.slice(1) : 'Unknown';
        
        return `
            <tr>
                <td>${sanitizeHTML(employeeName)}</td>
                <td>${formatDate(timesheet.weekStartDate)} - ${formatDate(timesheet.weekEndDate)}</td>
                <td>${((timesheet.totalHours || 0) + (timesheet.totalOvertimeHours || 0)).toFixed(1)}</td>
                <td><span class="status ${timesheet.status}">${sanitizeHTML(status)}</span></td>
                <td>${timesheet.submittedAt ? new Date(timesheet.submittedAt).toLocaleDateString() : 'N/A'}</td>
                <td>
                    <button class="action-btn view-btn" data-id="${timesheet._id}" title="View Details">
                        <i class="fas fa-eye"></i>
                    </button>
                    ${timesheet.status === 'submitted' ? `
                    <button class="action-btn approve-btn" data-id="${timesheet._id}" title="Approve">
                        <i class="fas fa-check"></i>
                    </button>
                    <button class="action-btn reject-btn" data-id="${timesheet._id}" title="Reject">
                        <i class="fas fa-times"></i>
                    </button>
                    ` : ''}
                </td>
            </tr>
        `;
    }).join('');
    
    // Setup action buttons for timesheets table
    setTimeout(() => {
        setupTimesheetsActionButtons();
    }, 100);
}

function setupTimesheetsActionButtons() {
    document.querySelectorAll('#timesheetsTableBody .view-btn').forEach(btn => {
        btn.addEventListener('click', () => viewTimesheetDetails(btn.getAttribute('data-id')));
    });
    
    document.querySelectorAll('#timesheetsTableBody .approve-btn').forEach(btn => {
        btn.addEventListener('click', () => approveTimesheet(btn.getAttribute('data-id')));
    });
    
    document.querySelectorAll('#timesheetsTableBody .reject-btn').forEach(btn => {
        btn.addEventListener('click', () => rejectTimesheet(btn.getAttribute('data-id')));
    });
}

async function loadReportsData() {
    try {
        showNotification('Reports section is under development', 'info');
    } catch (error) {
        console.error('❌ Error loading reports:', error);
        showNotification('Failed to load reports data', 'error');
    }
}

// Modal Functions
function openMiscellaneousHoursModal() {
    const modal = document.getElementById('miscHoursModal');
    if (modal) {
        modal.style.display = 'block';
        const searchInput = document.getElementById('searchMiscHours');
        if (searchInput) {
            searchInput.value = '';
            searchInput.focus();
        }
        const resultDiv = document.getElementById('searchResultCount');
        if (resultDiv) resultDiv.innerHTML = '';
    }
}

function closeMiscellaneousHoursModal() {
    const modal = document.getElementById('miscHoursModal');
    if (modal) modal.style.display = 'none';
}

function closeTimesheetDetailsModal() {
    const modal = document.getElementById('timesheetDetailsModal');
    if (modal) modal.style.display = 'none';
}

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

// Export functions for global access
window.openMiscellaneousHoursModal = openMiscellaneousHoursModal;
window.closeMiscellaneousHoursModal = closeMiscellaneousHoursModal;
window.closeTimesheetDetailsModal = closeTimesheetDetailsModal;