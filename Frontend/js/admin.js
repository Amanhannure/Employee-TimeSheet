// admin.js - Complete Admin Dashboard with Debug Logging

// ==================== UTILITY FUNCTIONS ====================

// Sanitize HTML to prevent XSS attacks
function sanitizeHTML(str) {
    if (!str) return '';
    
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

// Format date for display
function formatDate(dateString) {
    if (!dateString) return 'N/A';
    try {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric' 
        });
    } catch (error) {
        console.warn('Date formatting error:', error);
        return 'Invalid Date';
    }
}

// Get user data from localStorage
function getUserData() {
    try {
        const userData = localStorage.getItem('userData');
        return userData ? JSON.parse(userData) : null;
    } catch (error) {
        console.error('Error parsing user data:', error);
        return null;
    }
}

// Check if user has admin/manager role
function hasAdminAccess(userData) {
    return userData && (userData.role === 'admin' || userData.role === 'project_manager' || userData.role === 'manager');
}

// Show notification
function showNotification(message, type = 'info', duration = 5000) {
    try {
        if (typeof window.showNotification === 'function') {
            window.showNotification(message, type, duration);
        } else {
            console.log(`📢 ${type.toUpperCase()}: ${message}`);
            
            const notification = document.createElement('div');
            notification.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                padding: 15px 20px;
                border-radius: 5px;
                color: white;
                z-index: 10000;
                font-family: Arial, sans-serif;
                font-size: 14px;
                max-width: 300px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                transition: all 0.3s ease;
            `;
            
            const colors = {
                success: '#27ae60',
                error: '#e74c3c',
                warning: '#f39c12',
                info: '#3498db'
            };
            notification.style.backgroundColor = colors[type] || colors.info;
            
            notification.textContent = message;
            document.body.appendChild(notification);
            
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, duration);
        }
    } catch (error) {
        console.error('Error showing notification:', error);
        console.log(`📢 ${type.toUpperCase()}: ${message}`);
    }
}

// Loading state management
let isLoading = false;

function setLoadingState(loading) {
    isLoading = loading;
    const buttons = document.querySelectorAll('button');
    buttons.forEach(btn => {
        if (loading) {
            btn.disabled = true;
            btn.style.opacity = '0.6';
        } else {
            btn.disabled = false;
            btn.style.opacity = '1';
        }
    });
}

// ==================== MAIN DASHBOARD CODE ====================

document.addEventListener('DOMContentLoaded', async function() {
    console.log('🔄 [DEBUG] Initializing Admin Dashboard...');
    
    // Check authentication and authorization
    const token = localStorage.getItem('authToken');
    const userData = getUserData();
    
    console.log('🔍 [DEBUG] Token exists:', !!token);
    console.log('🔍 [DEBUG] User data:', userData);
    
    if (!token || !userData) {
        console.log('❌ [DEBUG] No authentication found, redirecting to login...');
        redirectToLogin();
        return;
    }

    // Strict role checking
    if (!hasAdminAccess(userData)) {
        console.log('🚫 [DEBUG] Unauthorized access attempt by:', userData.role);
        showNotification('Access denied. Admin, Project Manager, or Manager role required.', 'error');
        setTimeout(() => {
            window.location.href = 'dashboard.html';
        }, 2000);
        return;
    }

    // Update admin name
    const adminNameEl = document.getElementById('admin-name');
    if (adminNameEl) {
        adminNameEl.textContent = `${userData.firstName} ${userData.lastName} (${userData.role.toUpperCase()})`;
        console.log('🔍 [DEBUG] Updated admin name element');
    }

    // Initialize event listeners
    initializeEventListeners();

    // Load dashboard data
    await loadDashboardData();
});

function initializeEventListeners() {
    console.log('🔍 [DEBUG] Initializing event listeners...');
    
    // Sidebar toggle
    const toggleSidebar = document.getElementById('toggle-sidebar');
    if (toggleSidebar) {
        toggleSidebar.addEventListener('click', function() {
            const dashboardContainer = document.querySelector('.dashboard-container');
            if (dashboardContainer) {
                dashboardContainer.classList.toggle('sidebar-collapsed');
            }
        });
        console.log('🔍 [DEBUG] Sidebar toggle listener added');
    }

    // Navigation links
    const navLinks = document.querySelectorAll('.nav-link');
    console.log('🔍 [DEBUG] Found nav links:', navLinks.length);
    
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            if (isLoading) return;
            
            const target = this.getAttribute('data-target');
            console.log('🔍 [DEBUG] Navigation clicked:', target);
            showSection(target);
        });
    });

    // Miscellaneous hours search
    const searchMiscButton = document.getElementById('searchMiscButton');
    if (searchMiscButton) {
        searchMiscButton.addEventListener('click', async function() {
            if (isLoading) return;
            
            const searchInput = document.getElementById('searchMiscHours');
            if (searchInput) {
                const searchTerm = searchInput.value.trim();
                if (searchTerm) {
                    await searchMiscellaneousHours(searchTerm);
                } else {
                    showNotification('Please enter search term', 'warning');
                }
            }
        });
        console.log('🔍 [DEBUG] Search button listener added');
    }

    // Enter key for search
    const searchMiscHours = document.getElementById('searchMiscHours');
    if (searchMiscHours) {
        searchMiscHours.addEventListener('keypress', function(e) {
            if (e.key === 'Enter' && !isLoading) {
                const searchTerm = this.value.trim();
                if (searchTerm) {
                    searchMiscellaneousHours(searchTerm);
                } else {
                    showNotification('Please enter search term', 'warning');
                }
            }
        });
    }

    // Logout
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function() {
            if (confirm('Are you sure you want to logout?')) {
                localStorage.removeItem('authToken');
                localStorage.removeItem('userData');
                window.location.href = 'index.html';
            }
        });
        console.log('🔍 [DEBUG] Logout button listener added');
    }

    // Modal close buttons
    document.querySelectorAll('.close').forEach(btn => {
        btn.addEventListener('click', function() {
            hideAllModals();
        });
    });

    // Close modals when clicking outside
    window.addEventListener('click', function(event) {
        const miscModal = document.getElementById('miscHoursModal');
        const detailsModal = document.getElementById('timesheetDetailsModal');
        
        if (event.target === miscModal) {
            closeMiscellaneousHoursModal();
        }
        if (event.target === detailsModal) {
            closeTimesheetDetailsModal();
        }
    });

    console.log('✅ [DEBUG] Admin event listeners initialized');
}

// Hide all modals function
function hideAllModals() {
    document.getElementById('miscHoursModal').style.display = 'none';
    document.getElementById('timesheetDetailsModal').style.display = 'none';
}

function showSection(sectionName) {
    console.log('🔍 [DEBUG] Showing section:', sectionName);
    
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
        console.log('🔍 [DEBUG] Section displayed:', sectionName);
    } else {
        console.log('❌ [DEBUG] Section not found:', sectionName);
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

// DEBUG VERSION: Dashboard data loading with detailed logging
async function loadDashboardData() {
    if (isLoading) return;
    
    setLoadingState(true);
    try {
        console.log('🔍 [DEBUG] Starting dashboard data load...');
        
        // Show loading state in tables
        const tbody = document.getElementById('recentTimesheetsBody');
        if (tbody) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="5" style="text-align: center; padding: 20px;">
                        <div class="loading-spinner">
                            <i class="fas fa-spinner fa-spin"></i> Loading dashboard data...
                        </div>
                    </td>
                </tr>
            `;
        }
        
        console.log('🔍 [DEBUG] Calling apiClient.getUsers()...');
        const usersResponse = await apiClient.getUsers().catch(err => {
            console.error('❌ [DEBUG] Users endpoint error:', err);
            return { users: [] };
        });
        
        console.log('🔍 [DEBUG] Users response:', usersResponse);
        
        console.log('🔍 [DEBUG] Calling apiClient.getAllTimesheets()...');
        const timesheetsResponse = await apiClient.getAllTimesheets().catch(err => {
            console.error('❌ [DEBUG] Timesheets endpoint error:', err);
            return [];
        });
        
        console.log('🔍 [DEBUG] Timesheets response:', timesheetsResponse);
        
        console.log('🔍 [DEBUG] Calling apiClient.getDashboardStats()...');
        const dashboardStats = await apiClient.getDashboardStats().catch(err => {
            console.error('❌ [DEBUG] Dashboard stats endpoint error:', err);
            return {};
        });
        
        console.log('🔍 [DEBUG] Dashboard stats response:', dashboardStats);

        // Handle different response formats from backend
        console.log('🔍 [DEBUG] Processing users response...');
        const users = usersResponse.users || usersResponse || [];
        console.log('🔍 [DEBUG] Final users array:', users);
        
        console.log('🔍 [DEBUG] Processing timesheets response...');
        const timesheets = Array.isArray(timesheetsResponse) ? timesheetsResponse : 
                          (timesheetsResponse.timesheets || timesheetsResponse.data || []);
        console.log('🔍 [DEBUG] Final timesheets array:', timesheets);
        
        console.log('🔍 [DEBUG] Updating dashboard cards...');
        updateDashboardCards(users, timesheets, dashboardStats);
        
        console.log('🔍 [DEBUG] Updating recent timesheets...');
        updateRecentTimesheets(timesheets);
        
        console.log('✅ [DEBUG] Dashboard data loaded successfully');
        
    } catch (error) {
        console.error('❌ [DEBUG] Error loading dashboard data:', error);
        showNotification('Failed to load dashboard data: ' + error.message, 'error');
        
        // Show error state
        const tbody = document.getElementById('recentTimesheetsBody');
        if (tbody) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="5" style="text-align: center; padding: 20px; color: #e74c3c;">
                        <i class="fas fa-exclamation-triangle"></i> Failed to load data: ${error.message}
                    </td>
                </tr>
            `;
        }
    } finally {
        setLoadingState(false);
    }
}

// DEBUG VERSION: Dashboard cards with detailed logging
function updateDashboardCards(users, timesheets, dashboardStats = {}) {
    try {
        console.log('🔍 [DEBUG] updateDashboardCards called with:', { 
            users, 
            timesheets, 
            dashboardStats 
        });
        
        // Ensure users is an array
        const usersArray = Array.isArray(users) ? users : [];
        console.log('🔍 [DEBUG] Users array length:', usersArray.length);
        
        // Ensure timesheets is an array
        const timesheetsArray = Array.isArray(timesheets) ? timesheets : [];
        console.log('🔍 [DEBUG] Timesheets array length:', timesheetsArray.length);

        // Total Employees
        const totalEmployees = dashboardStats.totalUsers || usersArray.filter(user => user.role === 'employee').length;
        console.log('🔍 [DEBUG] Total employees:', totalEmployees);
        const totalEmployeesEl = document.getElementById('totalEmployees');
        if (totalEmployeesEl) {
            totalEmployeesEl.textContent = totalEmployees;
            console.log('🔍 [DEBUG] Updated total employees element');
        } else {
            console.log('❌ [DEBUG] totalEmployees element not found');
        }

        // Approved Timesheets
        const approvedTimesheets = dashboardStats.approvedTimesheets || 
                                  timesheetsArray.filter(ts => ts.status === 'approved').length;
        console.log('🔍 [DEBUG] Approved timesheets:', approvedTimesheets);
        const approvedTimesheetsEl = document.getElementById('approvedTimesheets');
        if (approvedTimesheetsEl) {
            approvedTimesheetsEl.textContent = approvedTimesheets;
            console.log('🔍 [DEBUG] Updated approved timesheets element');
        } else {
            console.log('❌ [DEBUG] approvedTimesheets element not found');
        }

        // Resubmitted Timesheets
        const resubmittedTimesheets = timesheetsArray.filter(ts => {
            return ts.status === 'pending' && 
                   (ts.previousStatus === 'rejected' || ts.rejectionReason || ts.resubmitted);
        }).length;
        console.log('🔍 [DEBUG] Resubmitted timesheets:', resubmittedTimesheets);
        const resubmittedCountEl = document.getElementById('resubmittedCount');
        if (resubmittedCountEl) {
            resubmittedCountEl.textContent = resubmittedTimesheets;
            console.log('🔍 [DEBUG] Updated resubmitted count element');
        } else {
            console.log('❌ [DEBUG] resubmittedCount element not found');
        }

        // Miscellaneous Hours
        const miscHoursCount = timesheetsArray.reduce((count, ts) => {
            if (!ts.entries || !Array.isArray(ts.entries)) return count;
            
            const miscEntries = ts.entries.filter(entry => 
                entry.activityCode === 'MISC' || 
                entry.projectCode === 'Miscellaneous Activity' ||
                (entry.projectCode && entry.projectCode.includes('Misc')) ||
                entry.projectCode === 'MISC'
            );
            return count + miscEntries.length;
        }, 0);
        console.log('🔍 [DEBUG] Misc hours count:', miscHoursCount);
        const miscHoursCountEl = document.getElementById('miscHoursCount');
        if (miscHoursCountEl) {
            miscHoursCountEl.textContent = miscHoursCount;
            console.log('🔍 [DEBUG] Updated misc hours count element');
        } else {
            console.log('❌ [DEBUG] miscHoursCount element not found');
        }

        console.log('✅ [DEBUG] Dashboard cards updated successfully');

    } catch (error) {
        console.error('❌ [DEBUG] Error updating dashboard cards:', error);
        showNotification('Error updating dashboard data: ' + error.message, 'error');
    }
}

// Recent timesheets with debug logging
function updateRecentTimesheets(timesheets) {
    const tbody = document.getElementById('recentTimesheetsBody');
    if (!tbody) {
        console.log('❌ [DEBUG] recentTimesheetsBody element not found');
        return;
    }
    
    try {
        console.log('🔍 [DEBUG] updateRecentTimesheets called with:', timesheets);
        
        // Ensure timesheets is an array
        const timesheetsArray = Array.isArray(timesheets) ? timesheets : [];
        console.log('🔍 [DEBUG] Timesheets array length:', timesheetsArray.length);
        
        // Get recent timesheets (pending first, then by date)
        const recentTimesheets = timesheetsArray
            .filter(ts => ts.status === 'pending' || ts.status === 'approved' || ts.status === 'rejected')
            .sort((a, b) => {
                // Pending timesheets first
                if (a.status === 'pending' && b.status !== 'pending') return -1;
                if (b.status === 'pending' && a.status !== 'pending') return 1;
                
                // Then by date (most recent first)
                const dateA = new Date(a.submittedAt || a.createdAt || a.updatedAt || 0);
                const dateB = new Date(b.submittedAt || b.createdAt || b.updatedAt || 0);
                return dateB - dateA;
            })
            .slice(0, 10);

        console.log('🔍 [DEBUG] Recent timesheets to display:', recentTimesheets.length);

        if (recentTimesheets.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="5" style="text-align: center; padding: 20px;">
                        <i class="fas fa-inbox"></i> No timesheets found
                    </td>
                </tr>
            `;
            console.log('🔍 [DEBUG] No timesheets to display');
            return;
        }

        tbody.innerHTML = recentTimesheets.map(timesheet => {
            const employeeName = timesheet.employeeName || 
                (timesheet.employee ? 
                    `${timesheet.employee.firstName || ''} ${timesheet.employee.lastName || ''}`.trim() 
                    : 'Unknown Employee');
            
            const weekStart = formatDate(timesheet.weekStartDate);
            const weekEnd = formatDate(timesheet.weekEndDate);
            const totalHours = timesheet.totalHours || 
                ((timesheet.totalNormalHours || 0) + (timesheet.totalOvertimeHours || 0));
            
            // Status display formatting
            const status = timesheet.status ? 
                timesheet.status.charAt(0).toUpperCase() + timesheet.status.slice(1) : 'Unknown';
            
            // Show action buttons for 'pending' status
            const isPending = timesheet.status === 'pending';

            return `
                <tr>
                    <td>${sanitizeHTML(employeeName)}</td>
                    <td>${weekStart} - ${weekEnd}</td>
                    <td>${totalHours.toFixed(1)}</td>
                    <td><span class="status ${timesheet.status}">${sanitizeHTML(status)}</span></td>
                    <td>
                        <button class="action-btn view-btn" data-id="${timesheet._id}" title="View Details" ${isLoading ? 'disabled' : ''}>
                            <i class="fas fa-eye"></i>
                        </button>
                        ${isPending ? `
                        <button class="action-btn approve-btn" data-id="${timesheet._id}" title="Approve" ${isLoading ? 'disabled' : ''}>
                            <i class="fas fa-check"></i>
                        </button>
                        <button class="action-btn reject-btn" data-id="${timesheet._id}" title="Reject" ${isLoading ? 'disabled' : ''}>
                            <i class="fas fa-times"></i>
                        </button>
                        ` : ''}
                        <button class="action-btn download-btn" data-id="${timesheet._id}" title="Export CSV" ${isLoading ? 'disabled' : ''}>
                            <i class="fas fa-file-excel"></i>
                        </button>
                    </td>
                </tr>
            `;
        }).join('');

        console.log('🔍 [DEBUG] Timesheets table updated with', recentTimesheets.length, 'rows');

        // Add event listeners to action buttons
        setTimeout(() => {
            setupActionButtons();
        }, 100);

    } catch (error) {
        console.error('❌ [DEBUG] Error updating recent timesheets:', error);
        tbody.innerHTML = `
            <tr>
                <td colspan="5" style="text-align: center; color: #e74c3c;">
                    <i class="fas fa-exclamation-triangle"></i> Error loading timesheets: ${error.message}
                </td>
            </tr>
        `;
    }
}

function setupActionButtons() {
    console.log('🔍 [DEBUG] Setting up action buttons...');
    
    // View timesheet details
    const viewButtons = document.querySelectorAll('.view-btn');
    console.log('🔍 [DEBUG] Found view buttons:', viewButtons.length);
    viewButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            if (!isLoading) viewTimesheetDetails(btn.getAttribute('data-id'));
        });
    });
    
    // Approve timesheet
    const approveButtons = document.querySelectorAll('.approve-btn');
    console.log('🔍 [DEBUG] Found approve buttons:', approveButtons.length);
    approveButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            if (!isLoading) approveTimesheet(btn.getAttribute('data-id'));
        });
    });
    
    // Reject timesheet
    const rejectButtons = document.querySelectorAll('.reject-btn');
    console.log('🔍 [DEBUG] Found reject buttons:', rejectButtons.length);
    rejectButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            if (!isLoading) rejectTimesheet(btn.getAttribute('data-id'));
        });
    });
    
    // Download timesheet
    const downloadButtons = document.querySelectorAll('.download-btn');
    console.log('🔍 [DEBUG] Found download buttons:', downloadButtons.length);
    downloadButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            if (!isLoading) downloadExcelForTimesheet(btn.getAttribute('data-id'));
        });
    });
    
    console.log('✅ [DEBUG] Action buttons setup complete');
}

// View timesheet details with debug logging
async function viewTimesheetDetails(timesheetId) {
    if (isLoading) return;
    
    setLoadingState(true);
    try {
        console.log('🔍 [DEBUG] Fetching timesheet details for:', timesheetId);
        
        let timesheet;
        try {
            // Try to get individual timesheet first
            timesheet = await apiClient.getTimesheetById(timesheetId);
        } catch (individualError) {
            console.warn('❌ [DEBUG] Individual fetch failed, trying from all timesheets:', individualError);
            // Fallback: get from all timesheets
            const allTimesheets = await apiClient.getAllTimesheets();
            timesheet = Array.isArray(allTimesheets) ? 
                allTimesheets.find(ts => ts._id === timesheetId) :
                (allTimesheets.timesheets || []).find(ts => ts._id === timesheetId);
        }
        
        if (!timesheet) {
            console.log('❌ [DEBUG] Timesheet not found:', timesheetId);
            showNotification('Timesheet not found', 'error');
            return;
        }

        console.log('✅ [DEBUG] Timesheet data loaded:', timesheet);
        
        const employeeName = timesheet.employeeName || 
            (timesheet.employee ? 
                `${timesheet.employee.firstName || ''} ${timesheet.employee.lastName || ''}`.trim() 
                : 'Unknown Employee');
        
        const employeeCode = timesheet.employeeCode || 
            (timesheet.employee ? timesheet.employee.employeeId : 'N/A');
            
        const department = timesheet.department || 
            (timesheet.employee ? timesheet.employee.department : 'N/A');
        
        const weekRange = `${formatDate(timesheet.weekStartDate)} - ${formatDate(timesheet.weekEndDate)}`;
        const totalHours = timesheet.totalHours || 
            ((timesheet.totalNormalHours || 0) + (timesheet.totalOvertimeHours || 0));
        
        // Create detailed view in modal
        const modal = document.getElementById('timesheetDetailsModal');
        const content = document.getElementById('timesheetDetailsContent');
        
        if (!modal || !content) {
            console.warn('❌ [DEBUG] Timesheet details modal elements not found');
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
                    <p><i class="fas fa-info-circle"></i> No time entries found for this timesheet.</p>
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
                    ${timesheet.approvedBy ? `<p><strong>Approved By:</strong> ${timesheet.approvedBy.firstName} ${timesheet.approvedBy.lastName}</p>` : ''}
                </div>
            `;
        }

        if (timesheet.rejectionReason) {
            detailsHTML += `
                <div class="rejection-info">
                    <p><strong>Rejection Reason:</strong> ${sanitizeHTML(timesheet.rejectionReason)}</p>
                </div>
            `;
        }
        
        detailsHTML += `</div>`;
        content.innerHTML = detailsHTML;
        modal.style.display = 'block';
        
        console.log('✅ [DEBUG] Timesheet details modal displayed');
        
    } catch (error) {
        console.error('❌ [DEBUG] Error viewing timesheet:', error);
        showNotification('Failed to load timesheet details', 'error');
    } finally {
        setLoadingState(false);
    }
}

// Approve timesheet
async function approveTimesheet(timesheetId) {
    if (isLoading) return;
    
    if (!confirm('Are you sure you want to approve this timesheet?')) return;

    setLoadingState(true);
    try {
        console.log('🔍 [DEBUG] Approving timesheet:', timesheetId);
        const result = await apiClient.approveTimesheet(timesheetId);
        showNotification('Timesheet approved successfully!', 'success');
        
        // Refresh data to show updated status
        await loadDashboardData();
        
    } catch (error) {
        console.error('❌ [DEBUG] Error approving timesheet:', error);
        showNotification(error.message || 'Failed to approve timesheet', 'error');
    } finally {
        setLoadingState(false);
    }
}

// Reject timesheet
async function rejectTimesheet(timesheetId) {
    if (isLoading) return;
    
    const remark = prompt("Please provide a reason for rejecting this timesheet:");
    if (remark === null) return; // User cancelled

    const sanitizedRemark = remark ? remark.trim() : '';
    if (!sanitizedRemark) {
        showNotification('Rejection reason is required', 'error');
        return;
    }

    if (sanitizedRemark.length > 500) {
        showNotification('Rejection reason must be less than 500 characters', 'error');
        return;
    }

    setLoadingState(true);
    try {
        console.log('🔍 [DEBUG] Rejecting timesheet:', timesheetId);
        await apiClient.rejectTimesheet(timesheetId, sanitizedRemark);
        showNotification('Timesheet rejected successfully!', 'success');
        
        // Refresh data to show updated status
        await loadDashboardData();
        
    } catch (error) {
        console.error('❌ [DEBUG] Error rejecting timesheet:', error);
        showNotification(error.message || 'Failed to reject timesheet', 'error');
    } finally {
        setLoadingState(false);
    }
}

// Miscellaneous hours search
async function searchMiscellaneousHours(searchTerm) {
    if (isLoading) return;
    
    setLoadingState(true);
    try {
        console.log('🔍 [DEBUG] Searching miscellaneous hours for:', searchTerm);
        const timesheetsResponse = await apiClient.getAllTimesheets();
        const timesheets = Array.isArray(timesheetsResponse) ? timesheetsResponse : 
                          (timesheetsResponse.timesheets || timesheetsResponse.data || []);
        
        const filteredTimesheets = timesheets.filter(ts => {
            const employeeName = ts.employeeName || 
                (ts.employee ? 
                    `${ts.employee.firstName || ''} ${ts.employee.lastName || ''}`.trim() 
                    : '');
            const employeeCode = ts.employeeCode || 
                (ts.employee ? ts.employee.employeeId : '');
                
            return employeeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                   employeeCode.toLowerCase().includes(searchTerm.toLowerCase());
        });

        const resultDiv = document.getElementById('searchResultCount');
        if (!resultDiv) {
            console.log('❌ [DEBUG] searchResultCount element not found');
            return;
        }
        
        if (filteredTimesheets.length > 0) {
            const miscEntries = filteredTimesheets.flatMap(ts => 
                (ts.entries || []).filter(entry => 
                    entry.activityCode === 'MISC' || 
                    entry.projectCode === 'Miscellaneous Activity' ||
                    (entry.projectCode && entry.projectCode.includes('Misc')) ||
                    entry.projectCode === 'MISC'
                ).map(entry => ({
                    ...entry,
                    employeeName: ts.employeeName,
                    employeeCode: ts.employeeCode,
                    week: `${formatDate(ts.weekStartDate)} - ${formatDate(ts.weekEndDate)}`
                }))
            );
            
            if (miscEntries.length > 0) {
                resultDiv.innerHTML = `
                    <div class="search-success">
                        <i class="fas fa-check-circle"></i> 
                        Found ${miscEntries.length} Miscellaneous Hour entries for "${sanitizeHTML(searchTerm)}".
                    </div>
                    <div class="recent-entries">
                        <strong>Recent Entries:</strong>
                        <ul>
                            ${miscEntries.slice(0, 5).map(entry => 
                                `<li>
                                    <strong>${sanitizeHTML(entry.employeeName)}</strong> (${sanitizeHTML(entry.employeeCode)})
                                    - ${formatDate(entry.date)}: ${((entry.normalHours || 0) + (entry.overtimeHours || 0)).toFixed(1)} hours
                                    - ${sanitizeHTML(entry.projectCode || 'MISC')}
                                    <br><small>Week: ${sanitizeHTML(entry.week)}</small>
                                </li>`
                            ).join('')}
                        </ul>
                        ${miscEntries.length > 5 ? `<p><small>... and ${miscEntries.length - 5} more entries</small></p>` : ''}
                    </div>
                `;
            } else {
                resultDiv.innerHTML = `
                    <div class="search-warning">
                        <i class="fas fa-info-circle"></i>
                        Employee "${sanitizeHTML(searchTerm)}" found, but no Miscellaneous Hours entries.
                    </div>
                `;
            }
        } else {
            resultDiv.innerHTML = `
                <div class="search-error">
                    <i class="fas fa-exclamation-circle"></i>
                    No employee found for "${sanitizeHTML(searchTerm)}".
                </div>
            `;
        }
    } catch (error) {
        console.error('❌ [DEBUG] Error searching miscellaneous hours:', error);
        const resultDiv = document.getElementById('searchResultCount');
        if (resultDiv) {
            resultDiv.innerHTML = `
                <div class="search-error">
                    <i class="fas fa-exclamation-triangle"></i>
                    Error searching miscellaneous hours. Please try again.
                </div>
            `;
        }
    } finally {
        setLoadingState(false);
    }
}

// Download Excel
async function downloadExcelForTimesheet(timesheetId) {
    if (isLoading) return;
    
    setLoadingState(true);
    try {
        console.log('🔍 [DEBUG] Exporting timesheet:', timesheetId);
        // Check if the API client has the export method
        if (typeof apiClient.exportTimesheetToCSV === 'function') {
            await apiClient.exportTimesheetToCSV(timesheetId);
            showNotification('Timesheet exported successfully!', 'success');
        } else {
            // Fallback: Show info message
            showNotification('Export feature will be available soon!', 'info');
            console.log('🔍 [DEBUG] Export functionality would be called for timesheet:', timesheetId);
        }
    } catch (error) {
        console.error('❌ [DEBUG] Error exporting timesheet:', error);
        showNotification(error.message || 'Failed to export timesheet', 'error');
    } finally {
        setLoadingState(false);
    }
}

// Section loading functions
async function loadEmployeesData() {
    if (isLoading) return;
    
    setLoadingState(true);
    try {
        console.log('🔍 [DEBUG] Loading employees data...');
        showNotification('Loading employees data...', 'info');
        // Implementation for employees section would go here
    } catch (error) {
        console.error('❌ [DEBUG] Error loading employees data:', error);
        showNotification('Failed to load employees data', 'error');
    } finally {
        setLoadingState(false);
    }
}

async function loadTimesheetsData() {
    if (isLoading) return;
    
    setLoadingState(true);
    try {
        console.log('🔍 [DEBUG] Loading timesheets data...');
        showNotification('Loading timesheets data...', 'info');
        // Implementation for timesheets section would go here
    } catch (error) {
        console.error('❌ [DEBUG] Error loading timesheets data:', error);
        showNotification('Failed to load timesheets data', 'error');
    } finally {
        setLoadingState(false);
    }
}

async function loadReportsData() {
    if (isLoading) return;
    
    setLoadingState(true);
    try {
        console.log('🔍 [DEBUG] Loading reports data...');
        showNotification('Loading reports data...', 'info');
        // Implementation for reports section would go here
    } catch (error) {
        console.error('❌ [DEBUG] Error loading reports data:', error);
        showNotification('Failed to load reports data', 'error');
    } finally {
        setLoadingState(false);
    }
}

// Redirect to login function
function redirectToLogin() {
    localStorage.removeItem('authToken');
    localStorage.removeItem('userData');
    window.location.href = 'index.html';
}

// Modal Functions
function openMiscellaneousHoursModal() {
    if (isLoading) return;
    
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
    document.getElementById('miscHoursModal').style.display = 'none';
}

function closeTimesheetDetailsModal() {
    document.getElementById('timesheetDetailsModal').style.display = 'none';
}

// Export functions for global access
window.openMiscellaneousHoursModal = openMiscellaneousHoursModal;
window.closeMiscellaneousHoursModal = closeMiscellaneousHoursModal;
window.closeTimesheetDetailsModal = closeTimesheetDetailsModal;
window.sanitizeHTML = sanitizeHTML;
window.formatDate = formatDate;
window.showNotification = showNotification;

console.log('✅ [DEBUG] Admin dashboard with debug logging loaded');