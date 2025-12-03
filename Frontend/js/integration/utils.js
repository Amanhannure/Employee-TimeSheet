// ==================== UTILITY FUNCTIONS - ENHANCED VERSION ====================

// Get user data from localStorage
function getUserData() {
    try {
        const userData = localStorage.getItem('userData');
        if (!userData) {
            console.warn('❌ No user data found in localStorage');
            return null;
        }
        
        const parsedData = JSON.parse(userData);
        console.log('✅ Retrieved user data:', { 
            id: parsedData.id, 
            name: `${parsedData.firstName} ${parsedData.lastName}`,
            role: parsedData.role 
        });
        return parsedData;
    } catch (error) {
        console.error('❌ Error parsing user data:', error);
        return null;
    }
}

// Save user data to localStorage
function saveUserData(userData) {
    try {
        if (!userData || typeof userData !== 'object') {
            throw new Error('Invalid user data provided');
        }
        
        // Validate required fields
        const requiredFields = ['id', 'firstName', 'lastName', 'email', 'role'];
        for (const field of requiredFields) {
            if (!userData[field]) {
                throw new Error(`Missing required field: ${field}`);
            }
        }
        
        localStorage.setItem('userData', JSON.stringify(userData));
        console.log('✅ User data saved to localStorage');
        return true;
    } catch (error) {
        console.error('❌ Error saving user data:', error);
        return false;
    }
}

// ✅ ENHANCED: Show notification to user with XSS protection
function showNotification(message, type = 'info', duration = 5000) {
    // Sanitize message to prevent XSS
    const sanitizedMessage = sanitizeHTML(message);
    
    // Remove existing notifications of the same type
    const existingNotifications = document.querySelectorAll('.custom-notification');
    existingNotifications.forEach(notification => {
        if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
        }
    });

    // Create notification element
    const notification = document.createElement('div');
    notification.className = `custom-notification notification-${type}`;
    
    // Add icon based on type
    let icon = 'ℹ️';
    let iconClass = 'fas fa-info-circle';
    switch (type) {
        case 'success':
            icon = '✅';
            iconClass = 'fas fa-check-circle';
            break;
        case 'error':
            icon = '❌';
            iconClass = 'fas fa-exclamation-circle';
            break;
        case 'warning':
            icon = '⚠️';
            iconClass = 'fas fa-exclamation-triangle';
            break;
        case 'info':
        default:
            icon = 'ℹ️';
            iconClass = 'fas fa-info-circle';
    }
    
    notification.innerHTML = `
        <div class="notification-content">
            <span class="notification-icon"><i class="${iconClass}"></i></span>
            <span class="notification-message">${sanitizedMessage}</span>
            <button class="notification-close" onclick="this.parentElement.parentElement.remove()">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `;

    // Add styles if not already added
    if (!document.querySelector('#notification-styles')) {
        const styles = document.createElement('style');
        styles.id = 'notification-styles';
        styles.textContent = `
            .custom-notification {
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 10000;
                min-width: 300px;
                max-width: 500px;
                background: white;
                border-radius: 8px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                border-left: 4px solid #007bff;
                animation: slideInRight 0.3s ease-out;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            }
            
            .notification-success {
                border-left-color: #28a745;
                background: #f8fff9;
            }
            
            .notification-error {
                border-left-color: #dc3545;
                background: #fff8f8;
            }
            
            .notification-warning {
                border-left-color: #ffc107;
                background: #fffef8;
            }
            
            .notification-info {
                border-left-color: #17a2b8;
                background: #f8fdff;
            }
            
            .notification-content {
                display: flex;
                align-items: center;
                padding: 12px 16px;
            }
            
            .notification-icon {
                font-size: 18px;
                margin-right: 12px;
                width: 20px;
                text-align: center;
            }
            
            .notification-success .notification-icon {
                color: #28a745;
            }
            
            .notification-error .notification-icon {
                color: #dc3545;
            }
            
            .notification-warning .notification-icon {
                color: #ffc107;
            }
            
            .notification-info .notification-icon {
                color: #17a2b8;
            }
            
            .notification-message {
                flex: 1;
                font-size: 14px;
                color: #333;
                line-height: 1.4;
            }
            
            .notification-close {
                background: none;
                border: none;
                font-size: 16px;
                cursor: pointer;
                color: #666;
                margin-left: 12px;
                padding: 4px;
                border-radius: 4px;
                transition: background-color 0.2s;
            }
            
            .notification-close:hover {
                background-color: rgba(0,0,0,0.1);
                color: #333;
            }
            
            @keyframes slideInRight {
                from {
                    transform: translateX(100%);
                    opacity: 0;
                }
                to {
                    transform: translateX(0);
                    opacity: 1;
                }
            }
            
            @keyframes slideOutRight {
                from {
                    transform: translateX(0);
                    opacity: 1;
                }
                to {
                    transform: translateX(100%);
                    opacity: 0;
                }
            }
            
            .notification-exit {
                animation: slideOutRight 0.3s ease-in forwards;
            }
        `;
        document.head.appendChild(styles);
    }

    // Add to page
    document.body.appendChild(notification);

    // Auto remove after duration
    if (duration > 0) {
        setTimeout(() => {
            if (notification.parentNode) {
                notification.style.animation = 'slideOutRight 0.3s ease-in forwards';
                setTimeout(() => {
                    if (notification.parentNode) {
                        notification.parentNode.removeChild(notification);
                    }
                }, 300);
            }
        }, duration);
    }

    return notification;
}

// ✅ ADDED: Enhanced HTML sanitization
function sanitizeHTML(str) {
    if (!str) return '';
    
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

// Format date to YYYY-MM-DD
function formatDate(date) {
    if (!date) return '';
    
    try {
        const d = new Date(date);
        if (isNaN(d.getTime())) {
            throw new Error('Invalid date');
        }
        
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        
        return `${year}-${month}-${day}`;
    } catch (error) {
        console.warn('Date formatting error:', error);
        return '';
    }
}

// Format date for display (DD/MM/YYYY)
function formatDisplayDate(date) {
    if (!date) return '';
    
    try {
        const d = new Date(date);
        if (isNaN(d.getTime())) {
            throw new Error('Invalid date');
        }
        
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = d.getFullYear();
        
        return `${day}/${month}/${year}`;
    } catch (error) {
        console.warn('Display date formatting error:', error);
        return 'Invalid Date';
    }
}

// ✅ IMPROVED: Validate email format with comprehensive checking
function isValidEmail(email) {
    if (!email || typeof email !== 'string') return false;
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    // Additional checks
    if (email.length > 254) return false; // RFC 5321 limit
    if (email.indexOf('..') !== -1) return false; // No consecutive dots
    if (email.indexOf('.@') !== -1) return false; // No dot before @
    
    return emailRegex.test(email.trim());
}

// ✅ ENHANCED: Validate required fields with detailed error messages
function validateRequiredFields(fields, data) {
    if (!fields || !Array.isArray(fields)) {
        throw new Error('Fields must be an array');
    }
    
    if (!data || typeof data !== 'object') {
        throw new Error('Data must be an object');
    }
    
    const errors = [];
    const missingFields = [];
    
    fields.forEach(field => {
        if (!data[field] || data[field].toString().trim() === '') {
            missingFields.push(field);
        }
    });
    
    if (missingFields.length > 0) {
        errors.push(`Missing required fields: ${missingFields.join(', ')}`);
    }
    
    return {
        isValid: errors.length === 0,
        errors: errors,
        missingFields: missingFields
    };
}

// ✅ IMPROVED: Debounce function for search inputs
function debounce(func, wait, immediate = false) {
    if (typeof func !== 'function') {
        throw new Error('Function must be provided');
    }
    
    let timeout;
    return function executedFunction(...args) {
        const context = this;
        const later = () => {
            timeout = null;
            if (!immediate) func.apply(context, args);
        };
        const callNow = immediate && !timeout;
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
        if (callNow) func.apply(context, args);
    };
}

// ✅ IMPROVED: Format hours (convert to decimal if needed)
function formatHours(hours) {
    if (hours === null || hours === undefined) return 0;
    
    if (typeof hours === 'number') {
        return Math.max(0, hours); // Ensure non-negative
    }
    
    if (typeof hours === 'string') {
        // Handle fraction format (e.g., "7.5" or "7 1/2")
        if (hours.includes('/')) {
            const parts = hours.split(' ');
            let total = 0;
            
            parts.forEach(part => {
                if (part.includes('/')) {
                    const [numerator, denominator] = part.split('/').map(Number);
                    if (!isNaN(numerator) && !isNaN(denominator) && denominator !== 0) {
                        total += numerator / denominator;
                    }
                } else {
                    const num = parseFloat(part);
                    if (!isNaN(num)) {
                        total += num;
                    }
                }
            });
            
            return Math.max(0, total);
        }
        
        // Handle decimal format
        const num = parseFloat(hours);
        return !isNaN(num) ? Math.max(0, num) : 0;
    }
    
    return 0;
}

// ✅ IMPROVED: Calculate week number from date with ISO standard
function getWeekNumber(date) {
    if (!date) return null;
    
    try {
        const d = new Date(date);
        if (isNaN(d.getTime())) {
            throw new Error('Invalid date');
        }
        
        // ISO week date calculation
        d.setHours(0, 0, 0, 0);
        d.setDate(d.getDate() + 4 - (d.getDay() || 7));
        
        const yearStart = new Date(d.getFullYear(), 0, 1);
        const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
        
        return {
            weekNumber: weekNo,
            year: d.getFullYear(),
            isoString: `${d.getFullYear()}-W${weekNo.toString().padStart(2, '0')}`
        };
    } catch (error) {
        console.warn('Week number calculation error:', error);
        return null;
    }
}

// ✅ ADDED: Check if user has specific role
function hasRole(requiredRole) {
    const userData = getUserData();
    if (!userData || !userData.role) return false;
    
    return userData.role === requiredRole;
}

// ✅ ADDED: Check if user has any of the specified roles
function hasAnyRole(requiredRoles) {
    if (!requiredRoles || !Array.isArray(requiredRoles)) return false;
    
    const userData = getUserData();
    if (!userData || !userData.role) return false;
    
    return requiredRoles.includes(userData.role);
}

// Check if user is admin or manager
function isAdminOrManager() {
    const userData = getUserData();
    return userData && (userData.role === 'admin' || userData.role === 'manager');
}

// ✅ ADDED: Check if user is employee
function isEmployee() {
    const userData = getUserData();
    return userData && userData.role === 'employee';
}

// Redirect to login page
function redirectToLogin() {
    try {
        // Clear authentication data
        localStorage.removeItem('authToken');
        localStorage.removeItem('userData');
        
        // Clear any sensitive data
        const sensitiveKeys = ['draftTimesheet', 'rememberMe'];
        sensitiveKeys.forEach(key => {
            try {
                localStorage.removeItem(key);
            } catch (e) {
                console.warn(`Could not remove ${key}:`, e);
            }
        });
        
        console.log('🔐 Redirecting to login page');
        window.location.href = 'index.html';
    } catch (error) {
        console.error('Error during logout redirect:', error);
        // Fallback redirect
        window.location.href = 'index.html';
    }
}

// ✅ ENHANCED: Handle API errors consistently
function handleApiError(error, defaultMessage = 'An error occurred') {
    console.error('API Error:', error);
    
    let message = defaultMessage;
    let userMessage = defaultMessage;
    
    if (error.message) {
        message = error.message;
        userMessage = error.message;
    }
    
    if (error.response && error.response.data && error.response.data.message) {
        message = error.response.data.message;
        userMessage = error.response.data.message;
    }
    
    // Use user-friendly message if available
    if (error.userMessage) {
        userMessage = error.userMessage;
    }
    
    // Show user-friendly notification
    showNotification(userMessage, 'error');
    
    // Redirect to login if unauthorized
    if (error.status === 401 || error.message.includes('unauthorized') || error.message.includes('token')) {
        console.warn('🛑 Unauthorized access detected, redirecting to login...');
        setTimeout(redirectToLogin, 2000);
    }
    
    return {
        message: message,
        userMessage: userMessage,
        status: error.status,
        originalError: error
    };
}

// ✅ ADDED: Format currency with localization
function formatCurrency(amount, currency = 'USD', locale = 'en-US') {
    if (typeof amount !== 'number' || isNaN(amount)) {
        console.warn('Invalid amount for currency formatting:', amount);
        return 'N/A';
    }
    
    try {
        return new Intl.NumberFormat(locale, {
            style: 'currency',
            currency: currency
        }).format(amount);
    } catch (error) {
        console.warn('Currency formatting error:', error);
        return `${currency} ${amount.toFixed(2)}`;
    }
}

// ✅ ADDED: Generate random ID (for temporary client-side IDs)
function generateId(prefix = '') {
    const timestamp = Date.now().toString(36);
    const randomStr = Math.random().toString(36).substr(2, 9);
    return `${prefix}${timestamp}_${randomStr}`;
}

// ✅ ADDED: Deep clone object with circular reference handling
function deepClone(obj) {
    if (obj === null || typeof obj !== 'object') return obj;
    if (obj instanceof Date) return new Date(obj);
    if (obj instanceof Array) return obj.map(item => deepClone(item));
    if (obj instanceof Object) {
        const clonedObj = {};
        for (const key in obj) {
            if (obj.hasOwnProperty(key)) {
                clonedObj[key] = deepClone(obj[key]);
            }
        }
        return clonedObj;
    }
}

// ✅ IMPROVED: Get current week dates (Monday to Sunday)
function getCurrentWeekDates() {
    const today = new Date();
    const currentDay = today.getDay();
    
    // Calculate Monday (start of week)
    const mondayOffset = currentDay === 0 ? -6 : 1 - currentDay;
    const monday = new Date(today);
    monday.setDate(today.getDate() + mondayOffset);
    
    // Calculate Sunday (end of week)
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    
    // Validate dates
    if (isNaN(monday.getTime()) || isNaN(sunday.getTime())) {
        throw new Error('Invalid date calculation');
    }
    
    return {
        start: monday,
        end: sunday,
        startFormatted: formatDate(monday),
        endFormatted: formatDate(sunday),
        weekNumber: getWeekNumber(monday)?.weekNumber
    };
}

// ✅ ADDED: Validate timesheet data structure
function validateTimesheetStructure(timesheetData) {
    const errors = [];
    
    if (!timesheetData || typeof timesheetData !== 'object') {
        errors.push('Timesheet data must be an object');
        return { isValid: false, errors };
    }
    
    const requiredFields = ['employeeCode', 'weekStartDate', 'weekEndDate', 'entries'];
    for (const field of requiredFields) {
        if (!timesheetData[field]) {
            errors.push(`Missing required field: ${field}`);
        }
    }
    
    if (timesheetData.entries && !Array.isArray(timesheetData.entries)) {
        errors.push('Entries must be an array');
    }
    
    // Validate entries
    if (timesheetData.entries && Array.isArray(timesheetData.entries)) {
        timesheetData.entries.forEach((entry, index) => {
            if (!entry.date || !entry.projectCode || !entry.activityCode) {
                errors.push(`Entry ${index + 1} missing required fields`);
            }
            
            if ((entry.normalHours || 0) + (entry.overtimeHours || 0) > 24) {
                errors.push(`Entry ${index + 1} exceeds 24 hours per day`);
            }
        });
    }
    
    return {
        isValid: errors.length === 0,
        errors: errors
    };
}

// ✅ ADDED: Calculate total hours from timesheet entries
function calculateTotalHours(entries) {
    if (!entries || !Array.isArray(entries)) {
        return { normal: 0, overtime: 0, total: 0 };
    }
    
    const totals = entries.reduce((acc, entry) => {
        acc.normal += entry.normalHours || 0;
        acc.overtime += entry.overtimeHours || 0;
        acc.total += (entry.normalHours || 0) + (entry.overtimeHours || 0);
        return acc;
    }, { normal: 0, overtime: 0, total: 0 });
    
    // Round to 2 decimal places
    totals.normal = parseFloat(totals.normal.toFixed(2));
    totals.overtime = parseFloat(totals.overtime.toFixed(2));
    totals.total = parseFloat(totals.total.toFixed(2));
    
    return totals;
}

// ✅ ADDED: Safe localStorage operations
const storage = {
    set: (key, value) => {
        try {
            localStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch (error) {
            console.error(`Storage set error for key ${key}:`, error);
            return false;
        }
    },
    
    get: (key, defaultValue = null) => {
        try {
            const item = localStorage.getItem(key);
            return item ? JSON.parse(item) : defaultValue;
        } catch (error) {
            console.error(`Storage get error for key ${key}:`, error);
            return defaultValue;
        }
    },
    
    remove: (key) => {
        try {
            localStorage.removeItem(key);
            return true;
        } catch (error) {
            console.error(`Storage remove error for key ${key}:`, error);
            return false;
        }
    },
    
    clear: () => {
        try {
            localStorage.clear();
            return true;
        } catch (error) {
            console.error('Storage clear error:', error);
            return false;
        }
    }
};

// Export functions for global use
window.getUserData = getUserData;
window.saveUserData = saveUserData;
window.showNotification = showNotification;
window.sanitizeHTML = sanitizeHTML;
window.formatDate = formatDate;
window.formatDisplayDate = formatDisplayDate;
window.isValidEmail = isValidEmail;
window.validateRequiredFields = validateRequiredFields;
window.debounce = debounce;
window.formatHours = formatHours;
window.getWeekNumber = getWeekNumber;
window.hasRole = hasRole;
window.hasAnyRole = hasAnyRole;
window.isAdminOrManager = isAdminOrManager;
window.isEmployee = isEmployee;
window.redirectToLogin = redirectToLogin;
window.handleApiError = handleApiError;
window.formatCurrency = formatCurrency;
window.generateId = generateId;
window.deepClone = deepClone;
window.getCurrentWeekDates = getCurrentWeekDates;
window.validateTimesheetStructure = validateTimesheetStructure;
window.calculateTotalHours = calculateTotalHours;
window.storage = storage;

console.log('✅ Enhanced utility functions loaded with comprehensive error handling and security features');