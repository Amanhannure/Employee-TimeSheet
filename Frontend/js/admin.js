// admin.js - Complete Admin Dashboard with Enhanced Misc Hours, 15-Day Editing Window Support & Monthly Reset
// ==================== COMPLETE VERSION (UPDATED WITH MONTHLY RESET) ====================

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

// Format date to YYYY-MM-DD
function formatDateYYYYMMDD(dateString) {
    if (!dateString) return '';
    try {
        const date = new Date(dateString);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    } catch (error) {
        return '';
    }
}

// ✅ NEW: Check if date is in current month (after reset day)
function isDateInCurrentPeriod(dateString, resetDay = 5, periodType = 'monthly') {
    if (!dateString) return false;
    
    try {
        const date = new Date(dateString);
        const today = new Date();
        const currentMonth = today.getMonth();
        const currentYear = today.getFullYear();
        const currentDay = today.getDate();
        
        // If current day is before reset day, look at previous month
        let targetMonth = currentMonth;
        let targetYear = currentYear;
        
        if (currentDay < resetDay) {
            // We're before the reset day, so use previous month
            targetMonth = currentMonth - 1;
            if (targetMonth < 0) {
                targetMonth = 11;
                targetYear = currentYear - 1;
            }
        }
        
        // Check if date is in target month/year
        return date.getMonth() === targetMonth && 
               date.getFullYear() === targetYear;
        
    } catch (error) {
        console.warn('Error checking date period:', error);
        return false;
    }
}

// ✅ NEW: Check if date is in current month (for misc hours reset on 1st)
function isDateInCurrentMonthForMisc(dateString) {
    if (!dateString) return false;
    
    try {
        const date = new Date(dateString);
        const today = new Date();
        
        return date.getMonth() === today.getMonth() && 
               date.getFullYear() === today.getFullYear();
        
    } catch (error) {
        console.warn('Error checking misc date period:', error);
        return false;
    }
}

// ✅ NEW: Get current period label for display
function getCurrentPeriodLabel(resetDay = 5) {
    const today = new Date();
    const currentDay = today.getDate();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    
    if (currentDay < resetDay) {
        // Before reset day - show previous month
        const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
        const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear;
        const monthName = new Date(prevYear, prevMonth, 1).toLocaleDateString('en-US', { month: 'long' });
        return `${monthName} ${prevYear} (Resets on ${resetDay}th)`;
    } else {
        // After reset day - show current month
        const monthName = today.toLocaleDateString('en-US', { month: 'long' });
        return `${monthName} ${currentYear} (Resets on ${resetDay}th next month)`;
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

// ✅ NEW: Format editing deadline information
function formatEditingDeadline(timesheet) {
    if (timesheet.status !== 'rejected') return '';
    
    const now = new Date();
    const editableUntil = timesheet.editableUntil ? new Date(timesheet.editableUntil) : null;
    
    if (!editableUntil || timesheet.isExpired) {
        return `<span class="editing-status expired">EXPIRED</span>`;
    }
    
    const daysRemaining = Math.ceil((editableUntil - now) / (24 * 60 * 60 * 1000));
    const hoursRemaining = Math.ceil((editableUntil - now) / (60 * 60 * 1000));
    
    let statusClass = 'normal';
    let statusText = `${daysRemaining} days`;
    
    if (daysRemaining === 1 && hoursRemaining <= 24) {
        statusClass = 'urgent';
        statusText = `${hoursRemaining} hours`;
    } else if (daysRemaining <= 3) {
        statusClass = 'warning';
    }
    
    return `
        <div class="editing-deadline-info">
            <span class="editing-status ${statusClass}">EDITABLE</span>
            <span class="deadline-${statusClass}">${statusText} remaining</span>
        </div>
    `;
}

function isTimesheetBlocking(timesheet) {
  if (timesheet.status !== 'rejected') return false;
  
  const fifteenDaysAgo = new Date();
  fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 15);
  fifteenDaysAgo.setHours(23, 59, 59, 999);
  
  return timesheet.rejectedAt &&  // ✅ FIX: Use rejectedAt
         new Date(timesheet.rejectedAt) < fifteenDaysAgo && 
         !timesheet.isExpired;
}

// ✅ NEW: Get blocking timesheets summary
function getBlockingTimesheetsSummary(timesheets) {
    const blockingTimesheets = timesheets.filter(isTimesheetBlocking);
    
    if (blockingTimesheets.length === 0) {
        return {
            count: 0,
            employees: new Set(),
            message: 'No blocking timesheets'
        };
    }
    
    const employees = new Set(blockingTimesheets.map(ts => ts.employeeCode));
    const oldestBlocking = blockingTimesheets.reduce((oldest, current) => {
        return (!oldest || new Date(current.submittedAt) < new Date(oldest.submittedAt)) ? current : oldest;
    }, null);
    
    const daysBlocking = oldestBlocking ? 
        Math.floor((new Date() - new Date(oldestBlocking.submittedAt)) / (24 * 60 * 60 * 1000)) - 15 : 0;
    
    return {
        count: blockingTimesheets.length,
        employees: employees.size,
        oldestBlocking: oldestBlocking,
        daysBlocking: daysBlocking,
        message: `${blockingTimesheets.length} timesheets blocking ${employees.size} employees`
    };
}

// ✅ ENHANCED: Calculate miscellaneous hours for a timesheet with monthly reset
function calculateMiscellaneousHours(timesheet, period = 'current-month') {
    if (!timesheet.entries || !Array.isArray(timesheet.entries)) {
        return 0;
    }
    
    const miscEntries = timesheet.entries.filter(entry => {
        // First check if it's a misc entry
        const isMiscActivity = entry.activityCode === 'MISC' || 
                              entry.activityCode === 'MISCELLANEOUS' ||
                              (entry.activityCode && entry.activityCode.includes('MISC'));
        
        const isMiscProject = entry.projectCode === 'MISC' || 
                             entry.projectCode === 'Miscellaneous Activity' ||
                             (entry.projectCode && entry.projectCode.includes('Misc')) ||
                             entry.projectCode === 'MISCELLANEOUS';
        
        if (!(isMiscActivity || isMiscProject)) {
            return false;
        }
        
        // Then check if it's in the current period (month)
        if (period === 'current-month') {
            return isDateInCurrentMonthForMisc(entry.date);
        }
        
        // For 'all-time' or other periods
        return true;
    });
    
    return miscEntries.reduce((total, entry) => {
        const normalHours = entry.normalHours || 0;
        const overtimeHours = entry.overtimeHours || 0;
        return total + normalHours + overtimeHours;
    }, 0);
}

// ==================== ENHANCED MISCELLANEOUS HOURS MODULE ====================

// ✅ NEW: Generate dynamic month options from timesheet data
function generateMonthOptions(timesheets) {
    const monthsSet = new Set();
    
    // Extract all unique months from timesheet entries
    timesheets.forEach(timesheet => {
        // Check daily entries
        if (timesheet.entries && Array.isArray(timesheet.entries)) {
            timesheet.entries.forEach(entry => {
                if (entry.date) {
                    try {
                        const date = new Date(entry.date);
                        if (!isNaN(date.getTime())) {
                            const year = date.getFullYear();
                            const month = date.getMonth() + 1;
                            const monthKey = `${year}-${month.toString().padStart(2, '0')}`;
                            const monthName = date.toLocaleDateString('en-US', { 
                                month: 'long', 
                                year: 'numeric' 
                            });
                            monthsSet.add(JSON.stringify({ key: monthKey, name: monthName }));
                        }
                    } catch (e) {
                        console.warn('Invalid date in entry:', entry.date);
                    }
                }
            });
        }
        
        // Also check week start date
        if (timesheet.weekStartDate) {
            try {
                const date = new Date(timesheet.weekStartDate);
                if (!isNaN(date.getTime())) {
                    const year = date.getFullYear();
                    const month = date.getMonth() + 1;
                    const monthKey = `${year}-${month.toString().padStart(2, '0')}`;
                    const monthName = date.toLocaleDateString('en-US', { 
                        month: 'long', 
                        year: 'numeric' 
                    });
                    monthsSet.add(JSON.stringify({ key: monthKey, name: monthName }));
                }
            } catch (e) {
                console.warn('Invalid weekStartDate:', timesheet.weekStartDate);
            }
        }
    });
    
    // Convert JSON strings back to objects
    const monthsArray = Array.from(monthsSet).map(str => JSON.parse(str));
    
    // Sort by date (newest first)
    monthsArray.sort((a, b) => b.key.localeCompare(a.key));
    
    // Add special options
    const specialOptions = [
        { key: 'all', name: 'All Months' },
        { key: 'last-3-months', name: 'Last 3 Months' },
        { key: 'current-month', name: 'Current Month' },
        { key: 'last-month', name: 'Last Month' }
    ];
    
    return [...specialOptions, ...monthsArray];
}

// ✅ NEW: Generate dynamic year options
function generateYearOptions(timesheets) {
    const yearsSet = new Set();
    
    timesheets.forEach(timesheet => {
        // From entries
        if (timesheet.entries && Array.isArray(timesheet.entries)) {
            timesheet.entries.forEach(entry => {
                if (entry.date) {
                    try {
                        const date = new Date(entry.date);
                        if (!isNaN(date.getTime())) {
                            yearsSet.add(date.getFullYear());
                        }
                    } catch (e) {
                        // Ignore invalid dates
                    }
                }
            });
        }
        
        // From week dates
        if (timesheet.weekStartDate) {
            try {
                const date = new Date(timesheet.weekStartDate);
                if (!isNaN(date.getTime())) {
                    yearsSet.add(date.getFullYear());
                }
            } catch (e) {
                // Ignore invalid dates
            }
        }
    });
    
    // Add current year if empty
    if (yearsSet.size === 0) {
        yearsSet.add(new Date().getFullYear());
    }
    
    // Convert to array and sort descending
    const yearsArray = Array.from(yearsSet);
    yearsArray.sort((a, b) => b - a);
    
    return yearsArray;
}

// ✅ NEW: Populate month and year filters dynamically
async function populateDateFilters() {
    try {
        // Get timesheet data
        const timesheetsResponse = await apiClient.getAllTimesheets();
        const timesheets = Array.isArray(timesheetsResponse) ? timesheetsResponse : 
                          (timesheetsResponse.timesheets || timesheetsResponse.data || []);
        
        // Generate month options
        const monthOptions = generateMonthOptions(timesheets);
        const monthFilter = document.getElementById('monthFilter');
        
        if (monthFilter) {
            monthFilter.innerHTML = '';
            monthOptions.forEach(month => {
                const option = document.createElement('option');
                option.value = month.key;
                option.textContent = month.name;
                monthFilter.appendChild(option);
            });
        }
        
        // Generate year options
        const yearOptions = generateYearOptions(timesheets);
        const yearFilter = document.getElementById('yearFilter');
        
        if (yearFilter) {
            yearFilter.innerHTML = '<option value="all">All Years</option>';
            yearOptions.forEach(year => {
                const option = document.createElement('option');
                option.value = year;
                option.textContent = year;
                // Select current year by default
                if (year === new Date().getFullYear()) {
                    option.selected = true;
                }
                yearFilter.appendChild(option);
            });
        }
        
        console.log('✅ [DEBUG] Date filters populated:', {
            months: monthOptions.length,
            years: yearOptions.length
        });
        
    } catch (error) {
        console.error('❌ [DEBUG] Error populating date filters:', error);
        // Set default options if API fails
        setDefaultDateFilters();
    }
}

// ✅ NEW: Set default date filters (fallback)
function setDefaultDateFilters() {
    const monthFilter = document.getElementById('monthFilter');
    const yearFilter = document.getElementById('yearFilter');
    
    if (monthFilter) {
        const currentDate = new Date();
        const currentYear = currentDate.getFullYear();
        const currentMonth = currentDate.getMonth() + 1;
        const currentMonthKey = `${currentYear}-${currentMonth.toString().padStart(2, '0')}`;
        const currentMonthName = currentDate.toLocaleDateString('en-US', { 
            month: 'long', 
            year: 'numeric' 
        });
        
        monthFilter.innerHTML = `
            <option value="all">All Months</option>
            <option value="last-3-months">Last 3 Months</option>
            <option value="current-month">Current Month</option>
            <option value="last-month">Last Month</option>
            <option value="${currentMonthKey}">${currentMonthName}</option>
        `;
    }
    
    if (yearFilter) {
        const currentYear = new Date().getFullYear();
        yearFilter.innerHTML = `
            <option value="all">All Years</option>
            <option value="${currentYear}" selected>${currentYear}</option>
            <option value="${currentYear - 1}">${currentYear - 1}</option>
            <option value="${currentYear - 2}">${currentYear - 2}</option>
        `;
    }
}

// ✅ NEW: Filter timesheets by date criteria
function filterTimesheetsByDate(timesheets, monthFilter, yearFilter, searchTerm = '') {
    console.log('🔍 [DEBUG] Filtering timesheets:', {
        totalTimesheets: timesheets.length,
        monthFilter,
        yearFilter,
        searchTerm
    });
    
    // First filter by search term if provided
    let filtered = timesheets;
    if (searchTerm) {
        filtered = timesheets.filter(ts => {
            const employeeName = ts.employeeName || 
                (ts.employee ? `${ts.employee.firstName || ''} ${ts.employee.lastName || ''}`.trim() : '');
            const employeeCode = ts.employeeCode || 
                (ts.employee ? ts.employee.employeeId : '');
                
            return employeeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                   employeeCode.toLowerCase().includes(searchTerm.toLowerCase());
        });
        console.log('🔍 [DEBUG] After search filter:', filtered.length);
    }
    
    // Filter by year if not "all"
    if (yearFilter !== 'all') {
        const targetYear = parseInt(yearFilter);
        filtered = filtered.filter(ts => {
            // Check entries
            const hasEntryInYear = ts.entries?.some(entry => {
                try {
                    if (!entry.date) return false;
                    const entryDate = new Date(entry.date);
                    return !isNaN(entryDate.getTime()) && entryDate.getFullYear() === targetYear;
                } catch (e) {
                    return false;
                }
            });
            
            // Check week dates
            let hasWeekInYear = false;
            if (ts.weekStartDate) {
                try {
                    const weekDate = new Date(ts.weekStartDate);
                    hasWeekInYear = !isNaN(weekDate.getTime()) && weekDate.getFullYear() === targetYear;
                } catch (e) {
                    // Ignore invalid dates
                }
            }
            
            return hasEntryInYear || hasWeekInYear;
        });
        console.log('🔍 [DEBUG] After year filter:', filtered.length);
    }
    
    // Filter by month
    if (monthFilter !== 'all') {
        filtered = filtered.filter(ts => {
            // Handle special month filters
            if (monthFilter === 'current-month') {
                const currentDate = new Date();
                const currentYear = currentDate.getFullYear();
                const currentMonth = currentDate.getMonth() + 1;
                
                return ts.entries?.some(entry => {
                    try {
                        if (!entry.date) return false;
                        const entryDate = new Date(entry.date);
                        return entryDate.getFullYear() === currentYear && 
                               (entryDate.getMonth() + 1) === currentMonth;
                    } catch (e) {
                        return false;
                    }
                });
            }
            else if (monthFilter === 'last-month') {
                const lastMonthDate = new Date();
                lastMonthDate.setMonth(lastMonthDate.getMonth() - 1);
                const lastYear = lastMonthDate.getFullYear();
                const lastMonth = lastMonthDate.getMonth() + 1;
                
                return ts.entries?.some(entry => {
                    try {
                        if (!entry.date) return false;
                        const entryDate = new Date(entry.date);
                        return entryDate.getFullYear() === lastYear && 
                               (entryDate.getMonth() + 1) === lastMonth;
                    } catch (e) {
                        return false;
                    }
                });
            }
            else if (monthFilter === 'last-3-months') {
                const threeMonthsAgo = new Date();
                threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
                
                return ts.entries?.some(entry => {
                    try {
                        if (!entry.date) return false;
                        const entryDate = new Date(entry.date);
                        return entryDate >= threeMonthsAgo;
                    } catch (e) {
                        return false;
                    }
                });
            }
            else {
                // Specific month filter (format: YYYY-MM)
                const [targetYear, targetMonth] = monthFilter.split('-').map(Number);
                
                return ts.entries?.some(entry => {
                    try {
                        if (!entry.date) return false;
                        const entryDate = new Date(entry.date);
                        return entryDate.getFullYear() === targetYear && 
                               (entryDate.getMonth() + 1) === targetMonth;
                    } catch (e) {
                        return false;
                    }
                });
            }
        });
        console.log('🔍 [DEBUG] After month filter:', filtered.length);
    }
    
    return filtered;
}

// ✅ NEW: Calculate misc hours results from filtered timesheets
function calculateMiscHoursResults(filteredTimesheets, searchTerm = '', monthFilter = 'all', yearFilter = 'all') {
    const results = {
        totalMiscHours: 0,
        totalEntries: 0,
        employees: {},
        entriesByMonth: {},
        entriesByYear: {}
    };
    
    filteredTimesheets.forEach(timesheet => {
        const employeeName = timesheet.employeeName || 
            (timesheet.employee ? `${timesheet.employee.firstName || ''} ${timesheet.employee.lastName || ''}`.trim() : 'Unknown');
        const employeeCode = timesheet.employeeCode || 
            (timesheet.employee ? timesheet.employee.employeeId : 'N/A');
        
        if (!results.employees[employeeCode]) {
            results.employees[employeeCode] = {
                name: employeeName,
                code: employeeCode,
                totalHours: 0,
                entries: []
            };
        }
        
        if (timesheet.entries && Array.isArray(timesheet.entries)) {
            timesheet.entries.forEach(entry => {
                // Check if entry is miscellaneous
                const isMisc = entry.activityCode === 'MISC' || 
                              entry.activityCode === 'MISCELLANEOUS' ||
                              (entry.activityCode && entry.activityCode.includes('MISC')) ||
                              entry.projectCode === 'MISC' ||
                              entry.projectCode === 'Miscellaneous Activity' ||
                              (entry.projectCode && entry.projectCode.includes('Misc')) ||
                              entry.projectCode === 'MISCELLANEOUS';
                
                if (isMisc && entry.date) {
                    try {
                        const entryDate = new Date(entry.date);
                        if (!isNaN(entryDate.getTime())) {
                            const normalHours = entry.normalHours || 0;
                            const overtimeHours = entry.overtimeHours || 0;
                            const totalHours = normalHours + overtimeHours;
                            
                            // Add to totals
                            results.totalMiscHours += totalHours;
                            results.totalEntries++;
                            
                            // Add to employee total
                            results.employees[employeeCode].totalHours += totalHours;
                            
                            // Create entry object
                            const entryObj = {
                                date: entryDate,
                                formattedDate: formatDate(entry.date),
                                weekRange: `${formatDate(timesheet.weekStartDate)} - ${formatDate(timesheet.weekEndDate)}`,
                                normalHours: normalHours,
                                overtimeHours: overtimeHours,
                                totalHours: totalHours,
                                projectCode: entry.projectCode || 'MISC',
                                activityCode: entry.activityCode || 'MISC',
                                remarks: entry.remarks || '',
                                timesheetId: timesheet._id,
                                timesheetStatus: timesheet.status
                            };
                            
                            results.employees[employeeCode].entries.push(entryObj);
                            
                            // Group by month
                            const monthKey = `${entryDate.getFullYear()}-${(entryDate.getMonth() + 1).toString().padStart(2, '0')}`;
                            if (!results.entriesByMonth[monthKey]) {
                                results.entriesByMonth[monthKey] = {
                                    month: entryDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
                                    totalHours: 0,
                                    entries: 0
                                };
                            }
                            results.entriesByMonth[monthKey].totalHours += totalHours;
                            results.entriesByMonth[monthKey].entries++;
                            
                            // Group by year
                            const yearKey = entryDate.getFullYear().toString();
                            if (!results.entriesByYear[yearKey]) {
                                results.entriesByYear[yearKey] = {
                                    year: yearKey,
                                    totalHours: 0,
                                    entries: 0
                                };
                            }
                            results.entriesByYear[yearKey].totalHours += totalHours;
                            results.entriesByYear[yearKey].entries++;
                        }
                    } catch (e) {
                        console.warn('Invalid entry date:', entry.date);
                    }
                }
            });
        }
    });
    
    // Sort employee entries by date (newest first)
    Object.values(results.employees).forEach(employee => {
        employee.entries.sort((a, b) => b.date - a.date);
    });
    
    console.log('📊 [DEBUG] Misc hours results:', {
        totalEmployees: Object.keys(results.employees).length,
        totalMiscHours: results.totalMiscHours,
        totalEntries: results.totalEntries
    });
    
    return results;
}

// ✅ NEW: Get display name for month filter
function getMonthFilterName(monthFilter) {
    if (monthFilter === 'all') return 'All Months';
    if (monthFilter === 'current-month') return 'Current Month';
    if (monthFilter === 'last-month') return 'Last Month';
    if (monthFilter === 'last-3-months') return 'Last 3 Months';
    
    // Parse YYYY-MM format
    const [year, month] = monthFilter.split('-').map(Number);
    if (year && month) {
        const date = new Date(year, month - 1, 1);
        return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    }
    
    return monthFilter;
}

// ✅ NEW: Display misc hours results with scrollable container
function displayMiscHoursResults(results, searchTerm = '', monthFilter = 'all', yearFilter = 'all') {
    const resultHeader = document.getElementById('searchResultCount');
    const resultsContainer = document.getElementById('miscHoursResults');
    const summaryContainer = document.getElementById('miscHoursSummary');
    
    if (!resultHeader || !resultsContainer || !summaryContainer) {
        console.error('❌ [DEBUG] Result containers not found');
        return;
    }
    
    // Update header with search summary
    const employeeCount = Object.keys(results.employees).length;
    const hasSearchTerm = searchTerm.trim() !== '';
    const hasMonthFilter = monthFilter !== 'all';
    const hasYearFilter = yearFilter !== 'all';
    
    let filterDescription = '';
    if (hasSearchTerm) filterDescription += ` for "${searchTerm}"`;
    if (hasMonthFilter) filterDescription += ` in ${getMonthFilterName(monthFilter)}`;
    if (hasYearFilter && yearFilter !== 'all') filterDescription += ` ${yearFilter}`;
    
    if (employeeCount === 0) {
        resultHeader.innerHTML = `
            <div class="search-warning">
                <i class="fas fa-info-circle"></i>
                No miscellaneous hour entries found${filterDescription}.
            </div>
        `;
        
        resultsContainer.innerHTML = `
            <div class="empty-results">
                <i class="fas fa-inbox fa-3x"></i>
                <h3>No Results Found</h3>
                <p>Try adjusting your search criteria or filters.</p>
            </div>
        `;
        
        summaryContainer.innerHTML = '';
        return;
    }
    
    // Show results summary
    resultHeader.innerHTML = `
        <div class="search-success">
            <i class="fas fa-check-circle"></i>
            Found ${results.totalEntries} miscellaneous hour entries 
            from ${employeeCount} employee(s)${filterDescription}.
        </div>
    `;
    
    // Build results HTML
    let resultsHTML = '';
    const employees = Object.values(results.employees);
    
    // Sort employees by total misc hours (highest first)
    employees.sort((a, b) => b.totalHours - a.totalHours);
    
    employees.forEach(employee => {
        resultsHTML += `
            <div class="misc-result-item">
                <div class="employee-header">
                    <div>
                        <span class="employee-name">${sanitizeHTML(employee.name)}</span>
                        <span class="employee-code">${sanitizeHTML(employee.code)}</span>
                    </div>
                    <div class="misc-hours-total">${employee.totalHours.toFixed(1)} hours</div>
                </div>
                <div class="misc-hours-breakdown">
        `;
        
        // Show top 5 entries (most recent)
        const displayEntries = employee.entries.slice(0, 5);
        displayEntries.forEach(entry => {
            resultsHTML += `
                <div class="misc-entry-item">
                    <div class="entry-date">${entry.formattedDate}</div>
                    <div class="entry-details">
                        <span class="entry-project">${sanitizeHTML(entry.projectCode)}</span>
                        <span class="entry-hours">${entry.totalHours.toFixed(1)}h 
                            (${entry.normalHours.toFixed(1)}N + ${entry.overtimeHours.toFixed(1)}OT)
                        </span>
                    </div>
                    <div class="entry-week"><small>Week: ${entry.weekRange}</small></div>
                </div>
            `;
        });
        
        // Show "more entries" indicator if there are more
        if (employee.entries.length > 5) {
            resultsHTML += `
                <div class="more-entries">
                    <small>... and ${employee.entries.length - 5} more entries</small>
                </div>
            `;
        }
        
        resultsHTML += `
                </div>
            </div>
        `;
    });
    
    resultsContainer.innerHTML = resultsHTML;
    
    // Build summary statistics
    const avgHoursPerEmployee = employeeCount > 0 ? (results.totalMiscHours / employeeCount) : 0;
    const maxEmployeeHours = employees.length > 0 ? Math.max(...employees.map(e => e.totalHours)) : 0;
    
    summaryContainer.innerHTML = `
        <div class="summary-stats">
            <div class="stat-item">
                <div class="stat-label">Total Hours</div>
                <div class="stat-value total-hours">${results.totalMiscHours.toFixed(1)}</div>
            </div>
            <div class="stat-item">
                <div class="stat-label">Total Entries</div>
                <div class="stat-value entries-count">${results.totalEntries}</div>
            </div>
            <div class="stat-item">
                <div class="stat-label">Avg per Employee</div>
                <div class="stat-value avg-hours">${avgHoursPerEmployee.toFixed(1)}</div>
            </div>
            <div class="stat-item">
                <div class="stat-label">Max per Employee</div>
                <div class="stat-value max-hours">${maxEmployeeHours.toFixed(1)}</div>
            </div>
        </div>
    `;
    
    // Ensure scrollbar appears if content overflows
    setTimeout(() => {
        if (resultsContainer.scrollHeight > resultsContainer.clientHeight) {
            console.log('📜 [DEBUG] Scrollbar enabled for results');
        }
    }, 100);
}

// ✅ ENHANCED: Main search function for misc hours
async function searchMiscellaneousHours() {
    if (isLoading) return;
    
    setLoadingState(true);
    try {
        const searchTerm = document.getElementById('searchMiscHoursModal')?.value.trim() || '';
        const monthFilter = document.getElementById('monthFilter')?.value || 'all';
        const yearFilter = document.getElementById('yearFilter')?.value || 'all';
        
        console.log('🔍 [DEBUG] Searching misc hours:', {
            searchTerm,
            monthFilter,
            yearFilter
        });
        
        // Show loading in results
        const resultsContainer = document.getElementById('miscHoursResults');
        if (resultsContainer) {
            resultsContainer.innerHTML = `
                <div class="results-loading">
                    <i class="fas fa-spinner fa-spin"></i> Searching miscellaneous hours...
                </div>
            `;
        }
        
        // Get all timesheets
        const timesheetsResponse = await apiClient.getAllTimesheets();
        const timesheets = Array.isArray(timesheetsResponse) ? timesheetsResponse : 
                          (timesheetsResponse.timesheets || timesheetsResponse.data || []);
        
        // Filter timesheets by date criteria
        const filteredTimesheets = filterTimesheetsByDate(timesheets, monthFilter, yearFilter, searchTerm);
        
        // Calculate misc hours results
        const results = calculateMiscHoursResults(filteredTimesheets, searchTerm, monthFilter, yearFilter);
        
        // Display results
        displayMiscHoursResults(results, searchTerm, monthFilter, yearFilter);
        
    } catch (error) {
        console.error('❌ [DEBUG] Error searching miscellaneous hours:', error);
        
        const resultHeader = document.getElementById('searchResultCount');
        if (resultHeader) {
            resultHeader.innerHTML = `
                <div class="search-error">
                    <i class="fas fa-exclamation-triangle"></i>
                    Error searching miscellaneous hours: ${error.message}
                </div>
            `;
        }
        
        const resultsContainer = document.getElementById('miscHoursResults');
        if (resultsContainer) {
            resultsContainer.innerHTML = `
                <div class="empty-results">
                    <i class="fas fa-exclamation-circle fa-3x"></i>
                    <h3>Search Failed</h3>
                    <p>${error.message}</p>
                </div>
            `;
        }
    } finally {
        setLoadingState(false);
    }
}

// ✅ NEW: Export misc hours to CSV
async function exportMiscellaneousHours() {
    if (isLoading) return;
    
    try {
        const searchTerm = document.getElementById('searchMiscHoursModal')?.value.trim() || '';
        const monthFilter = document.getElementById('monthFilter')?.value || 'all';
        const yearFilter = document.getElementById('yearFilter')?.value || 'all';
        
        // Get filtered data
        const timesheetsResponse = await apiClient.getAllTimesheets();
        const timesheets = Array.isArray(timesheetsResponse) ? timesheetsResponse : 
                          (timesheetsResponse.timesheets || timesheetsResponse.data || []);
        
        const filteredTimesheets = filterTimesheetsByDate(timesheets, monthFilter, yearFilter, searchTerm);
        const results = calculateMiscHoursResults(filteredTimesheets, searchTerm);
        
        // Create CSV content
        let csvContent = 'Employee Code,Employee Name,Date,Week Range,Project Code,Activity Code,Normal Hours,Overtime Hours,Total Hours,Remarks,Timesheet Status\n';
        
        Object.values(results.employees).forEach(employee => {
            employee.entries.forEach(entry => {
                csvContent += `"${employee.code}","${employee.name}","${entry.formattedDate}","${entry.weekRange}","${entry.projectCode}","${entry.activityCode}",${entry.normalHours},${entry.overtimeHours},${entry.totalHours},"${entry.remarks}","${entry.timesheetStatus}"\n`;
            });
        });
        
        // Trigger download
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        
        const fileName = `misc-hours-${searchTerm || 'all'}-${monthFilter}-${yearFilter}-${new Date().toISOString().split('T')[0]}.csv`;
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        
        showNotification(`Exported ${results.totalEntries} misc hours entries to CSV`, 'success', 5000);
        
    } catch (error) {
        console.error('❌ [DEBUG] Error exporting misc hours:', error);
        showNotification('Failed to export misc hours: ' + error.message, 'error');
    }
}

// ✅ NEW: Reset filters
function resetMiscHoursFilters() {
    const searchInput = document.getElementById('searchMiscHoursModal');
    const monthFilter = document.getElementById('monthFilter');
    const yearFilter = document.getElementById('yearFilter');
    
    if (searchInput) searchInput.value = '';
    if (monthFilter) monthFilter.value = 'all';
    if (yearFilter) yearFilter.value = 'all';
    
    // Reset quick filter buttons
    document.querySelectorAll('.quick-filter-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.filter === 'all') {
            btn.classList.add('active');
        }
    });
    
    // Clear results
    const resultHeader = document.getElementById('searchResultCount');
    const resultsContainer = document.getElementById('miscHoursResults');
    const summaryContainer = document.getElementById('miscHoursSummary');
    
    if (resultHeader) {
        resultHeader.innerHTML = `
            <div class="initial-state">
                <i class="fas fa-clock fa-2x"></i>
                <p>Enter search criteria to find miscellaneous hours</p>
            </div>
        `;
    }
    
    if (resultsContainer) resultsContainer.innerHTML = '';
    if (summaryContainer) summaryContainer.innerHTML = '';
}

// ✅ NEW: Quick filter handler
function setupQuickFilters() {
    document.querySelectorAll('.quick-filter-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            // Update active state
            document.querySelectorAll('.quick-filter-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            
            const filterType = this.dataset.filter;
            
            // Apply quick filter
            switch(filterType) {
                case 'recent':
                    // Set month filter to show recent
                    const monthFilter = document.getElementById('monthFilter');
                    if (monthFilter) {
                        monthFilter.value = 'last-3-months';
                    }
                    
                    // Clear other filters
                    const searchInput = document.getElementById('searchMiscHoursModal');
                    const yearFilter = document.getElementById('yearFilter');
                    if (searchInput) searchInput.value = '';
                    if (yearFilter) yearFilter.value = 'all';
                    
                    // Trigger search
                    searchMiscellaneousHours();
                    break;
                    
                case 'current-month':
                    // Current month
                    const monthFilter2 = document.getElementById('monthFilter');
                    if (monthFilter2) {
                        monthFilter2.value = 'current-month';
                    }
                    
                    // Trigger search
                    searchMiscellaneousHours();
                    break;
                    
                case 'high-hours':
                    // Filter for employees with high misc hours
                    // This requires a custom search - we'll implement after getting all data
                    showNotification('High hours filter will show employees with >20 misc hours', 'info');
                    break;
                    
                case 'all':
                default:
                    // Reset filters
                    resetMiscHoursFilters();
                    break;
            }
        });
    });
}

// ✅ NEW: Setup enhanced modal event listeners
function setupEnhancedModalListeners() {
    // Search button
    const searchButton = document.getElementById('searchMiscButton');
    if (searchButton) {
        searchButton.addEventListener('click', searchMiscellaneousHours);
    }
    
    // Reset button
    const resetButton = document.getElementById('resetFiltersButton');
    if (resetButton) {
        resetButton.addEventListener('click', resetMiscHoursFilters);
    }
    
    // Export button
    const exportButton = document.getElementById('exportMiscHoursButton');
    if (exportButton) {
        exportButton.addEventListener('click', exportMiscellaneousHours);
    }
    
    // Enter key for search input
    const searchInput = document.getElementById('searchMiscHoursModal');
    if (searchInput) {
        searchInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter' && !isLoading) {
                searchMiscellaneousHours();
            }
        });
    }
    
    // Quick filters
    setupQuickFilters();
    
    // Month/Year filter changes trigger search
    const monthFilter = document.getElementById('monthFilter');
    const yearFilter = document.getElementById('yearFilter');
    
    if (monthFilter) {
        monthFilter.addEventListener('change', function() {
            if (this.value !== 'all') {
                searchMiscellaneousHours();
            }
        });
    }
    
    if (yearFilter) {
        yearFilter.addEventListener('change', function() {
            if (this.value !== 'all') {
                searchMiscellaneousHours();
            }
        });
    }
}

// ✅ ENHANCED: Open misc hours modal with dynamic filters
async function openMiscellaneousHoursModal() {
    if (isLoading) return;
    
    const modal = document.getElementById('miscHoursModal');
    if (modal) {
        modal.style.display = 'block';
        
        // Reset filters first
        resetMiscHoursFilters();
        
        // Populate dynamic date filters
        await populateDateFilters();
        
        // Focus on search input
        const searchInput = document.getElementById('searchMiscHoursModal');
        if (searchInput) {
            searchInput.focus();
        }
        
        // Setup event listeners for new elements
        setupEnhancedModalListeners();
    }
}

// ✅ NEW: Close misc hours modal
function closeMiscellaneousHoursModal() {
    const modal = document.getElementById('miscHoursModal');
    if (modal) {
        modal.style.display = 'none';
        // Clean up any ongoing operations
        setLoadingState(false);
    }
}

// ==================== MAIN DASHBOARD CODE ====================

document.addEventListener('DOMContentLoaded', async function() {
    console.log('🔄 [DEBUG] Initializing Admin Dashboard with Monthly Reset Feature...');
    
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

    // Update misc card click handler
    const miscCard = document.querySelector('.card[onclick*="openMiscellaneousHoursModal"]');
    if (miscCard) {
        miscCard.onclick = openMiscellaneousHoursModal;
        console.log('🔍 [DEBUG] Misc hours card click handler updated');
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
        const rejectedModal = document.getElementById('rejectedOverviewModal');
        
        if (event.target === miscModal) {
            closeMiscellaneousHoursModal();
        }
        if (event.target === detailsModal) {
            closeTimesheetDetailsModal();
        }
        if (event.target === rejectedModal) {
            closeRejectedOverviewModal();
        }
    });

    console.log('✅ [DEBUG] Admin event listeners initialized');
}

// Hide all modals function
function hideAllModals() {
    document.getElementById('miscHoursModal').style.display = 'none';
    document.getElementById('timesheetDetailsModal').style.display = 'none';
    document.getElementById('rejectedOverviewModal').style.display = 'none';
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

// ✅ ENHANCED: Dashboard data loading with 15-day editing window info & Monthly Reset
async function loadDashboardData() {
    if (isLoading) return;
    
    setLoadingState(true);
    try {
        console.log('🔍 [DEBUG] Starting dashboard data load with monthly reset...');
        
        // Show loading state in tables
        const tbody = document.getElementById('recentTimesheetsBody');
        if (tbody) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" style="text-align: center; padding: 20px;">
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
        const timesheetsResponse = await apiClient.getAllTimesheets({ limit: 1000 }).catch(err => {
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
        let timesheets = [];
        if (Array.isArray(timesheetsResponse)) {
            timesheets = timesheetsResponse;
        } else if (timesheetsResponse && Array.isArray(timesheetsResponse.timesheets)) {
            timesheets = timesheetsResponse.timesheets;
        } else if (timesheetsResponse && Array.isArray(timesheetsResponse.data)) {
            timesheets = timesheetsResponse.data;
        } else if (timesheetsResponse && timesheetsResponse.pagination) {
            timesheets = timesheetsResponse.timesheets || [];
        } else {
            console.warn('❌ [DEBUG] Unexpected timesheets response format:', timesheetsResponse);
            timesheets = [];
        }
        console.log('🔍 [DEBUG] Final timesheets array:', timesheets);
        
        console.log('🔍 [DEBUG] Updating dashboard cards with monthly reset...');
        updateDashboardCards(users, timesheets, dashboardStats);
        
        console.log('🔍 [DEBUG] Updating recent timesheets...');
        updateRecentTimesheets(timesheets);
        
        console.log('✅ [DEBUG] Dashboard data loaded successfully with monthly reset');
        
    } catch (error) {
        console.error('❌ [DEBUG] Error loading dashboard data:', error);
        showNotification('Failed to load dashboard data: ' + error.message, 'error');
        
        // Show error state
        const tbody = document.getElementById('recentTimesheetsBody');
        if (tbody) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" style="text-align: center; padding: 20px; color: #e74c3c;">
                        <i class="fas fa-exclamation-triangle"></i> Failed to load data: ${error.message}
                    </td>
                </tr>
            `;
        }
    } finally {
        setLoadingState(false);
    }
}

// ✅ ENHANCED: Dashboard cards with blocking timesheets count & Monthly Reset
function updateDashboardCards(users, timesheets, dashboardStats = {}) {
    try {
        console.log('🔍 [DEBUG] updateDashboardCards called with:', { 
            users, 
            timesheets, 
            dashboardStats 
        });
        
        // Ensure users is an array
        let usersArray = [];
        if (Array.isArray(users)) {
            usersArray = users;
        } else if (users && Array.isArray(users.users)) {
            usersArray = users.users;
        } else if (users && Array.isArray(users.data)) {
            usersArray = users.data;
        } else {
            usersArray = [];
        }
        console.log('🔍 [DEBUG] Users array length:', usersArray.length);

        const timesheetsArray = timesheets;
        console.log('🔍 [DEBUG] Timesheets array length:', timesheetsArray.length);

        // ✅ Total Employees (static - doesn't reset)
        const totalEmployees = dashboardStats.totalUsers || usersArray.filter(user => user.role === 'employee').length;
        console.log('🔍 [DEBUG] Total employees:', totalEmployees);
        const totalEmployeesEl = document.getElementById('totalEmployees');
        if (totalEmployeesEl) {
            totalEmployeesEl.textContent = totalEmployees;
            console.log('🔍 [DEBUG] Updated total employees element');
        }

        // ✅ ENHANCED: Approved Timesheets with Monthly Reset (resets on 5th)
        const approvedTimesheets = timesheetsArray.filter(ts => {
            if (ts.status !== 'approved') return false;
            
            // Check if approved date is in current period (resets on 5th)
            return isDateInCurrentPeriod(ts.approvedAt || ts.updatedAt, 5);
        }).length;
        
        console.log('🔍 [DEBUG] Approved timesheets (with monthly reset):', approvedTimesheets);
        const approvedTimesheetsEl = document.getElementById('approvedTimesheets');
        if (approvedTimesheetsEl) {
            approvedTimesheetsEl.textContent = approvedTimesheets;
            
            // Add period info tooltip
            approvedTimesheetsEl.title = `Approved timesheets for ${getCurrentPeriodLabel(5)}`;
            console.log('🔍 [DEBUG] Updated approved timesheets element with monthly reset');
        }

        // ✅ ENHANCED: Resubmitted Timesheets with Monthly Reset
        const resubmittedTimesheets = timesheetsArray.filter(ts => {
            // Check if timesheet was resubmitted
            const isResubmitted = ts.status === 'pending' && 
                                 (ts.previousStatus === 'rejected' || ts.rejectionReason || ts.resubmitted);
            
            if (!isResubmitted) return false;
            
            // Check if resubmission date is in current period (resets on 5th)
            return isDateInCurrentPeriod(ts.updatedAt || ts.submittedAt, 5);
        }).length;
        
        const editableRejected = timesheetsArray.filter(ts => 
            ts.status === 'rejected' && 
            ts.canEdit && 
            !ts.isExpired &&
            // Check if rejection date is in current period
            isDateInCurrentPeriod(ts.rejectedAt || ts.updatedAt, 5)
        ).length;
        
        const totalResubmitted = resubmittedTimesheets + editableRejected;
        
        console.log('🔍 [DEBUG] Resubmitted/Editable timesheets (with monthly reset):', totalResubmitted);
        const resubmittedCountEl = document.getElementById('resubmittedCount');
        if (resubmittedCountEl) {
            resubmittedCountEl.textContent = totalResubmitted;
            console.log('🔍 [DEBUG] Updated resubmitted count element with monthly reset');
            
            // Add tooltip for breakdown
            resubmittedCountEl.title = `${resubmittedTimesheets} resubmitted + ${editableRejected} editable for ${getCurrentPeriodLabel(5)}`;
        }

        // ✅ ENHANCED: Miscellaneous Hours with Monthly Reset (resets on 1st)
        let miscHoursCount = 0;
        timesheetsArray.forEach(ts => {
            if (!ts.entries || !Array.isArray(ts.entries)) return;
            
            // Count only misc entries from current month (resets on 1st)
            const miscEntries = ts.entries.filter(entry => {
                const isMisc = entry.activityCode === 'MISC' || 
                              entry.activityCode === 'MISCELLANEOUS' ||
                              (entry.activityCode && entry.activityCode.includes('MISC')) ||
                              entry.projectCode === 'MISC' ||
                              entry.projectCode === 'Miscellaneous Activity' ||
                              (entry.projectCode && entry.projectCode.includes('Misc')) ||
                              entry.projectCode === 'MISCELLANEOUS';
                
                // Check if entry date is in current month (resets on 1st)
                return isMisc && isDateInCurrentMonthForMisc(entry.date);
            });
            
            miscHoursCount += miscEntries.length;
        });
        
        // ✅ NEW: Add blocking timesheets overview
        const blockingSummary = getBlockingTimesheetsSummary(timesheetsArray);
        const miscHoursCountEl = document.getElementById('miscHoursCount');
        if (miscHoursCountEl) {
            miscHoursCountEl.textContent = miscHoursCount;
            
            // Add period info tooltip
            const today = new Date();
            const currentMonth = today.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
            miscHoursCountEl.title = `Miscellaneous hour entries for ${currentMonth} (resets on 1st)`;
            
            // Make card clickable to show rejected overview
            const miscCard = miscHoursCountEl.closest('.card');
            if (miscCard && blockingSummary.count > 0) {
                miscCard.style.cursor = 'pointer';
                miscCard.style.border = '2px solid #e74c3c';
                miscCard.title = `Click to view ${blockingSummary.count} blocking timesheets`;
                miscCard.onclick = showRejectedOverviewModal;
                
                // Add blocking badge
                let blockingBadge = miscCard.querySelector('.blocking-badge');
                if (!blockingBadge) {
                    blockingBadge = document.createElement('div');
                    blockingBadge.className = 'blocking-badge';
                    blockingBadge.innerHTML = `
                        <span class="blocking-count">${blockingSummary.count}</span>
                        <span class="blocking-text">Blocking</span>
                    `;
                    miscCard.appendChild(blockingBadge);
                }
            }
            console.log('🔍 [DEBUG] Updated misc hours count element with monthly reset');
        }

        console.log('✅ [DEBUG] Dashboard cards updated successfully with monthly reset');

    } catch (error) {
        console.error('❌ [DEBUG] Error updating dashboard cards:', error);
        showNotification('Error updating dashboard data: ' + error.message, 'error');
    }
}

// ENHANCED: Recent timesheets with 15-day editing window display & Monthly Reset
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
        
        // Get recent timesheets (only from current period)
        const recentTimesheets = timesheetsArray
            .filter(ts => {
                // Filter by current period (resets on 5th)
                const activityDate = ts.submittedAt || ts.createdAt || ts.updatedAt;
                return isDateInCurrentPeriod(activityDate, 5);
            })
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

        console.log('🔍 [DEBUG] Recent timesheets to display (current period):', recentTimesheets.length);

        if (recentTimesheets.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" style="text-align: center; padding: 20px;">
                        <i class="fas fa-inbox"></i> No timesheets found for ${getCurrentPeriodLabel(5)}
                    </td>
                </tr>
            `;
            console.log('🔍 [DEBUG] No timesheets to display for current period');
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
            
            // ✅ ENHANCED: Calculate miscellaneous hours (only show for approved timesheets)
            const miscHours = calculateMiscellaneousHours(timesheet, 'current-month');
            const miscHoursDisplay = timesheet.status === 'approved' ? 
                `<span class="misc-hours ${miscHours > 0 ? 'has-misc' : 'no-misc'}">${miscHours.toFixed(1)}</span>` : 
                '<span class="misc-hours na">-</span>';
            
            // Status display formatting
            const status = timesheet.status ? 
                timesheet.status.charAt(0).toUpperCase() + timesheet.status.slice(1) : 'Unknown';
            
            // Editing deadline information for rejected timesheets
            const editingInfo = timesheet.status === 'rejected' ? formatEditingDeadline(timesheet) : '';
            
            // Show action buttons for 'pending' status
            const isPending = timesheet.status === 'pending';
            
            // Blocking indicator
            const isBlocking = isTimesheetBlocking(timesheet);
            const blockingIndicator = isBlocking ? 
                `<span class="blocking-indicator" title="Blocking new submissions">🚫</span>` : '';

            return `
                <tr class="${isBlocking ? 'blocking-row' : ''}">
                    <td>
                        ${blockingIndicator}
                        ${sanitizeHTML(employeeName)}
                    </td>
                    <td>${weekStart} - ${weekEnd}</td>
                    <td>${totalHours.toFixed(1)}</td>
                    <td class="misc-hours-cell">
                        ${miscHoursDisplay}
                    </td>
                    <td>
                        <span class="status ${timesheet.status}">${sanitizeHTML(status)}</span>
                        ${editingInfo}
                    </td>
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
                <td colspan="6" style="text-align: center; color: #e74c3c;">
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

// ENHANCED: View timesheet details with 15-day editing info and misc hours breakdown & Monthly Reset
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
        
        // ✅ ENHANCED: Monthly period info
        const periodInfo = isDateInCurrentPeriod(timesheet.submittedAt, 5) ? 
            `<p><strong>Period:</strong> <span style="color: #28a745;">${getCurrentPeriodLabel(5)}</span></p>` :
            `<p><strong>Period:</strong> <span style="color: #6c757d;">Previous period (resets on 5th)</span></p>`;
        
        // ✅ ENHANCED: Editing deadline info
        let editingInfo = '';
        if (timesheet.status === 'rejected') {
            const now = new Date();
            const editableUntil = timesheet.editableUntil ? new Date(timesheet.editableUntil) : null;
            const canEdit = timesheet.canEdit && editableUntil && editableUntil > now && !timesheet.isExpired;
            const daysRemaining = editableUntil ? Math.ceil((editableUntil - now) / (24 * 60 * 60 * 1000)) : 0;
            const isBlocking = isTimesheetBlocking(timesheet);
            
            editingInfo = `
                <div class="editing-details">
                    <h4>Editing Window Information</h4>
                    <div class="editing-status-info">
                        <p><strong>Can Edit:</strong> <span class="${canEdit ? 'status-yes' : 'status-no'}">${canEdit ? 'Yes' : 'No'}</span></p>
                        <p><strong>Days Remaining:</strong> ${daysRemaining}</p>
                        <p><strong>Editable Until:</strong> ${editableUntil ? formatDate(editableUntil) : 'N/A'}</p>
                        <p><strong>Is Expired:</strong> <span class="${timesheet.isExpired ? 'status-yes' : 'status-no'}">${timesheet.isExpired ? 'Yes' : 'No'}</span></p>
                        <p><strong>Blocking New Submissions:</strong> <span class="${isBlocking ? 'status-yes' : 'status-no'}">${isBlocking ? 'Yes' : 'No'}</span></p>
                        <p><strong>Resubmission Count:</strong> ${timesheet.resubmissionCount || 0}</p>
                    </div>
                </div>
            `;
        }
        
        // ✅ ENHANCED: Miscellaneous hours breakdown with monthly reset
        const miscHours = calculateMiscellaneousHours(timesheet, 'current-month');
        const miscEntries = timesheet.entries ? timesheet.entries.filter(entry => {
            const isMiscActivity = entry.activityCode === 'MISC' || 
                                  entry.activityCode === 'MISCELLANEOUS' ||
                                  (entry.activityCode && entry.activityCode.includes('MISC'));
            
            const isMiscProject = entry.projectCode === 'MISC' || 
                                 entry.projectCode === 'Miscellaneous Activity' ||
                                 (entry.projectCode && entry.projectCode.includes('Misc')) ||
                                 entry.projectCode === 'MISCELLANEOUS';
            
            // Check if it's in current month
            return (isMiscActivity || isMiscProject) && isDateInCurrentMonthForMisc(entry.date);
        }) : [];

        let miscBreakdownHTML = '';
        if (miscEntries.length > 0) {
            miscBreakdownHTML = `
                <div class="misc-summary">
                    <h4>Miscellaneous Hours Breakdown (Current Month)</h4>
                    <div class="misc-stats">
                        <p><strong>Total Misc Hours:</strong> ${miscHours.toFixed(1)}</p>
                        <p><strong>Misc Entries:</strong> ${miscEntries.length}</p>
                        <p><strong>Period:</strong> Current month (resets on 1st)</p>
                    </div>
                    <div class="misc-entries">
                        <h5>Miscellaneous Entries:</h5>
                        <div class="table-container">
                            <table>
                                <thead>
                                    <tr>
                                        <th>Date</th>
                                        <th>Project</th>
                                        <th>Activity</th>
                                        <th>Normal Hours</th>
                                        <th>Overtime Hours</th>
                                        <th>Total</th>
                                        <th>Remarks</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${miscEntries.map(entry => {
                                        const entryDate = new Date(entry.date);
                                        const dayName = entryDate.toLocaleDateString('en-US', { weekday: 'short' });
                                        const totalEntryHours = (entry.normalHours || 0) + (entry.overtimeHours || 0);
                                        
                                        return `
                                            <tr>
                                                <td>${formatDate(entry.date)} (${dayName})</td>
                                                <td>${sanitizeHTML(entry.projectCode)}</td>
                                                <td>${sanitizeHTML(entry.activityCode)}</td>
                                                <td>${entry.normalHours || 0}</td>
                                                <td>${entry.overtimeHours || 0}</td>
                                                <td><strong>${totalEntryHours.toFixed(1)}</strong></td>
                                                <td>${sanitizeHTML(entry.remarks || '-')}</td>
                                            </tr>
                                        `;
                                    }).join('')}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            `;
        } else {
            miscBreakdownHTML = `
                <div class="misc-summary">
                    <h4>Miscellaneous Hours</h4>
                    <div class="no-misc-entries">
                        <p><i class="fas fa-info-circle"></i> No miscellaneous hours recorded for current month (resets on 1st).</p>
                    </div>
                </div>
            `;
        }
        
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
                    ${periodInfo}
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
                    ${editingInfo}
                </div>
                ${miscBreakdownHTML}
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
                    ${timesheet.rejectionCategory ? `<p><strong>Rejection Category:</strong> ${timesheet.rejectionCategory}</p>` : ''}
                    ${timesheet.rejectedBy ? `<p><strong>Rejected By:</strong> ${timesheet.rejectedBy.firstName} ${timesheet.rejectedBy.lastName}</p>` : ''}
                </div>
            `;
        }
        
        detailsHTML += `</div>`;
        content.innerHTML = detailsHTML;
        modal.style.display = 'block';
        
        console.log('✅ [DEBUG] Timesheet details modal displayed with monthly reset info');
        
    } catch (error) {
        console.error('❌ [DEBUG] Error viewing timesheet:', error);
        showNotification('Failed to load timesheet details', 'error');
    } finally {
        setLoadingState(false);
    }
}

// ENHANCED: Approve timesheet with notification about editing windows
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

// ENHANCED: Reject timesheet with 15-day editing window information
async function rejectTimesheet(timesheetId) {
    if (isLoading) return;
    
    const remark = prompt(`Please provide a reason for rejecting this timesheet:\n\nNote: Employee will have 15 days to edit and resubmit.`);
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
        showNotification('Timesheet rejected successfully! Employee has 15 days to edit and resubmit.', 'success');
        
        // Refresh data to show updated status
        await loadDashboardData();
        
    } catch (error) {
        console.error('❌ [DEBUG] Error rejecting timesheet:', error);
        showNotification(error.message || 'Failed to reject timesheet', 'error');
    } finally {
        setLoadingState(false);
    }
}

// ✅ NEW: Show rejected timesheets overview modal with monthly reset info
async function showRejectedOverviewModal() {
    if (isLoading) return;
    
    setLoadingState(true);
    try {
        const timesheets = await apiClient.getAllTimesheets();
        const blockingSummary = getBlockingTimesheetsSummary(timesheets);
        
        let rejectedModal = document.getElementById('rejectedOverviewModal');
        
        if (!rejectedModal) {
            rejectedModal = document.createElement('div');
            rejectedModal.id = 'rejectedOverviewModal';
            rejectedModal.className = 'modal';
            rejectedModal.innerHTML = `
                <div class="modal-content large-modal">
                    <span class="close">&times;</span>
                    <h2><i class="fas fa-exclamation-triangle"></i> Rejected Timesheets Overview</h2>
                    <div class="rejected-overview-content">
                        <!-- Content will be loaded here -->
                    </div>
                </div>
            `;
            document.body.appendChild(rejectedModal);
            
            rejectedModal.querySelector('.close').addEventListener('click', () => {
                hideAllModals();
            });
        }
        
        const content = rejectedModal.querySelector('.rejected-overview-content');
        content.innerHTML = generateRejectedOverviewContent(timesheets, blockingSummary);
        
        rejectedModal.style.display = 'block';
        
    } catch (error) {
        console.error('Error loading rejected overview:', error);
        showNotification('Failed to load rejected timesheets overview', 'error');
    } finally {
        setLoadingState(false);
    }
}

// ✅ NEW: Generate rejected overview content with monthly reset info
function generateRejectedOverviewContent(timesheets, blockingSummary) {
    const rejectedTimesheets = timesheets.filter(ts => ts.status === 'rejected');
    const currentPeriodRejected = rejectedTimesheets.filter(ts => 
        isDateInCurrentPeriod(ts.rejectedAt || ts.updatedAt, 5)
    );
    const editableTimesheets = currentPeriodRejected.filter(ts => ts.canEdit && !ts.isExpired);
    const expiredTimesheets = currentPeriodRejected.filter(ts => ts.isExpired);
    const blockingTimesheets = currentPeriodRejected.filter(isTimesheetBlocking);
    
    let html = `
        <div style="background: #e8f4fd; padding: 15px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #3498db;">
            <h4 style="margin: 0 0 10px 0; color: #1565c0;">
                <i class="fas fa-calendar-alt"></i> Current Period: ${getCurrentPeriodLabel(5)}
            </h4>
            <p style="margin: 0; color: #555; font-size: 14px;">
                Timesheets reset on the 5th of each month. Statistics shown are for current period only.
            </p>
        </div>
        <div class="rejected-stats">
            <div class="stat-card">
                <h3>Total Rejected</h3>
                <div class="stat-number">${currentPeriodRejected.length}</div>
                <small>Current Period</small>
            </div>
            <div class="stat-card">
                <h3>Still Editable</h3>
                <div class="stat-number editable">${editableTimesheets.length}</div>
                <small>Within 15-day window</small>
            </div>
            <div class="stat-card">
                <h3>Editing Expired</h3>
                <div class="stat-number expired">${expiredTimesheets.length}</div>
                <small>15-day window passed</small>
            </div>
            <div class="stat-card urgent">
                <h3>Blocking Submissions</h3>
                <div class="stat-number blocking">${blockingTimesheets.length}</div>
                <small>Over 15 days rejected</small>
            </div>
        </div>
    `;
    
    if (blockingTimesheets.length > 0) {
        html += `
            <div class="blocking-section">
                <h3><i class="fas fa-ban"></i> Timesheets Blocking New Submissions</h3>
                <p style="color: #666; font-size: 14px; margin-bottom: 15px;">
                    These timesheets have been rejected for more than 15 days and are blocking new submissions.
                </p>
                <div class="blocking-list">
        `;
        
        blockingTimesheets.forEach(timesheet => {
            const daysBlocking = Math.floor((new Date() - new Date(timesheet.submittedAt)) / (24 * 60 * 60 * 1000)) - 15;
            const weekRange = `${formatDate(timesheet.weekStartDate)} - ${formatDate(timesheet.weekEndDate)}`;
            
            html += `
                <div class="blocking-item">
                    <div class="blocking-info">
                        <strong>${timesheet.employeeName}</strong> (${timesheet.employeeCode})
                        <div class="week-info">${weekRange}</div>
                        <div class="blocking-duration">Blocking for ${daysBlocking} days</div>
                    </div>
                    <div class="blocking-actions">
                        <button class="btn btn-sm btn-view" onclick="viewTimesheetDetails('${timesheet._id}')">
                            <i class="fas fa-eye"></i> View
                        </button>
                        <button class="btn btn-sm btn-contact" onclick="contactEmployee('${timesheet.employeeCode}')">
                            <i class="fas fa-envelope"></i> Contact
                        </button>
                    </div>
                </div>
            `;
        });
        
        html += `
                </div>
            </div>
        `;
    }
    
    // Show editable timesheets about to expire
    const urgentTimesheets = editableTimesheets.filter(ts => {
        const daysRemaining = Math.ceil((new Date(ts.editableUntil) - new Date()) / (24 * 60 * 60 * 1000));
        return daysRemaining <= 3;
    });
    
    if (urgentTimesheets.length > 0) {
        html += `
            <div class="urgent-section">
                <h3><i class="fas fa-clock"></i> Editing Windows Expiring Soon (≤3 days)</h3>
                <p style="color: #666; font-size: 14px; margin-bottom: 15px;">
                    These timesheets will lose editing capability soon. Consider sending reminders.
                </p>
                <div class="urgent-list">
        `;
        
        urgentTimesheets.forEach(timesheet => {
            const daysRemaining = Math.ceil((new Date(timesheet.editableUntil) - new Date()) / (24 * 60 * 60 * 1000));
            const weekRange = `${formatDate(timesheet.weekStartDate)} - ${formatDate(timesheet.weekEndDate)}`;
            
            html += `
                <div class="urgent-item">
                    <div class="urgent-info">
                        <strong>${timesheet.employeeName}</strong> (${timesheet.employeeCode})
                        <div class="week-info">${weekRange}</div>
                        <div class="deadline-info ${daysRemaining === 1 ? 'critical' : 'warning'}">
                            ${daysRemaining} day${daysRemaining !== 1 ? 's' : ''} remaining
                        </div>
                    </div>
                    <div class="urgent-actions">
                        <button class="btn btn-sm btn-view" onclick="viewTimesheetDetails('${timesheet._id}')">
                            <i class="fas fa-eye"></i> View
                        </button>
                        <button class="btn btn-sm btn-contact" onclick="contactEmployee('${timesheet.employeeCode}')">
                            <i class="fas fa-bell"></i> Remind
                        </button>
                    </div>
                </div>
            `;
        });
        
        html += `
                </div>
            </div>
        `;
    }
    
    if (blockingTimesheets.length === 0 && urgentTimesheets.length === 0) {
        html += `
            <div class="no-issues">
                <i class="fas fa-check-circle fa-3x"></i>
                <h3>No Critical Issues</h3>
                <p>All rejected timesheets in current period are being managed properly.</p>
            </div>
        `;
    }
    
    return html;
}

// ✅ NEW: Contact employee function
function contactEmployee(employeeCode) {
    // In a real implementation, this would open an email client or send a notification
    showNotification(`Contact functionality for ${employeeCode} would be implemented here`, 'info');
}

function closeRejectedOverviewModal() {
    document.getElementById('rejectedOverviewModal').style.display = 'none';
}

// Download timesheet as Excel/CSV
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
function closeTimesheetDetailsModal() {
    document.getElementById('timesheetDetailsModal').style.display = 'none';
}

// ==================== EXPORT FUNCTIONS FOR GLOBAL ACCESS ====================

window.openMiscellaneousHoursModal = openMiscellaneousHoursModal;
window.closeMiscellaneousHoursModal = closeMiscellaneousHoursModal;
window.closeTimesheetDetailsModal = closeTimesheetDetailsModal;
window.showRejectedOverviewModal = showRejectedOverviewModal;
window.closeRejectedOverviewModal = closeRejectedOverviewModal;
window.contactEmployee = contactEmployee;
window.viewTimesheetDetails = viewTimesheetDetails;
window.sanitizeHTML = sanitizeHTML;
window.formatDate = formatDate;
window.showNotification = showNotification;
window.searchMiscellaneousHours = searchMiscellaneousHours;
window.exportMiscellaneousHours = exportMiscellaneousHours;
window.resetMiscHoursFilters = resetMiscHoursFilters;

console.log('✅ [DEBUG] Complete Admin Dashboard with Enhanced Misc Hours, Dynamic Month Filtering & Monthly Reset loaded');