// ==================== UTILITY FUNCTIONS ====================

// Get user data from localStorage
function getUserData() {
    try {
        const userData = localStorage.getItem('userData');
        if (!userData) {
            console.warn('❌ No user data found in localStorage');
            return null;
        }
        
        const parsedData = JSON.parse(userData);
        console.log('✅ Retrieved user data:', parsedData);
        return parsedData;
    } catch (error) {
        console.error('❌ Error parsing user data:', error);
        return null;
    }
}

// Save user data to localStorage
function saveUserData(userData) {
    try {
        localStorage.setItem('userData', JSON.stringify(userData));
        console.log('✅ User data saved to localStorage');
        return true;
    } catch (error) {
        console.error('❌ Error saving user data:', error);
        return false;
    }
}

// Show notification to user
function showNotification(message, type = 'info', duration = 5000) {
    // Remove existing notifications
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
    switch (type) {
        case 'success':
            icon = '✅';
            break;
        case 'error':
            icon = '❌';
            break;
        case 'warning':
            icon = '⚠️';
            break;
        case 'info':
        default:
            icon = 'ℹ️';
    }
    
    notification.innerHTML = `
        <div class="notification-content">
            <span class="notification-icon">${icon}</span>
            <span class="notification-message">${message}</span>
            <button class="notification-close" onclick="this.parentElement.parentElement.remove()">×</button>
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
            }
            
            .notification-success {
                border-left-color: #28a745;
            }
            
            .notification-error {
                border-left-color: #dc3545;
            }
            
            .notification-warning {
                border-left-color: #ffc107;
            }
            
            .notification-info {
                border-left-color: #17a2b8;
            }
            
            .notification-content {
                display: flex;
                align-items: center;
                padding: 12px 16px;
            }
            
            .notification-icon {
                font-size: 18px;
                margin-right: 12px;
            }
            
            .notification-message {
                flex: 1;
                font-size: 14px;
                color: #333;
            }
            
            .notification-close {
                background: none;
                border: none;
                font-size: 20px;
                cursor: pointer;
                color: #666;
                margin-left: 12px;
            }
            
            .notification-close:hover {
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
        `;
        document.head.appendChild(styles);
    }

    // Add to page
    document.body.appendChild(notification);

    // Auto remove after duration
    if (duration > 0) {
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, duration);
    }

    return notification;
}

// Format date to YYYY-MM-DD
function formatDate(date) {
    if (!date) return '';
    
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    
    return `${year}-${month}-${day}`;
}

// Format date for display (DD/MM/YYYY)
function formatDisplayDate(date) {
    if (!date) return '';
    
    const d = new Date(date);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    
    return `${day}/${month}/${year}`;
}

// Validate email format
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

// Validate required fields
function validateRequiredFields(fields, data) {
    const errors = [];
    
    fields.forEach(field => {
        if (!data[field] || data[field].toString().trim() === '') {
            errors.push(`${field} is required`);
        }
    });
    
    return errors;
}

// Debounce function for search inputs
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

// Format hours (convert to decimal if needed)
function formatHours(hours) {
    if (typeof hours === 'string') {
        // Handle fraction format (e.g., "7.5" or "7 1/2")
        if (hours.includes('/')) {
            const [whole, fraction] = hours.split(' ');
            if (fraction) {
                const [numerator, denominator] = fraction.split('/');
                return parseFloat(whole) + (parseFloat(numerator) / parseFloat(denominator));
            }
        }
    }
    return parseFloat(hours) || 0;
}

// Calculate week number from date
function getWeekNumber(date) {
    if (!date) return null;
    
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + 4 - (d.getDay() || 7));
    
    const yearStart = new Date(d.getFullYear(), 0, 1);
    const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
    
    return {
        weekNumber: weekNo,
        year: d.getFullYear()
    };
}

// Check if user has specific role
function hasRole(requiredRole) {
    const userData = getUserData();
    return userData && userData.role === requiredRole;
}

// Check if user is admin or manager
function isAdminOrManager() {
    const userData = getUserData();
    return userData && (userData.role === 'admin' || userData.role === 'manager');
}

// Redirect to login page
function redirectToLogin() {
    localStorage.removeItem('authToken');
    localStorage.removeItem('userData');
    window.location.href = 'index.html';
}

// Handle API errors consistently
function handleApiError(error, defaultMessage = 'An error occurred') {
    console.error('API Error:', error);
    
    let message = defaultMessage;
    
    if (error.message) {
        message = error.message;
    }
    
    if (error.response && error.response.data && error.response.data.message) {
        message = error.response.data.message;
    }
    
    showNotification(message, 'error');
    
    // Redirect to login if unauthorized
    if (error.status === 401 || error.message.includes('unauthorized')) {
        setTimeout(redirectToLogin, 2000);
    }
    
    return message;
}

// Format currency (if needed for future features)
function formatCurrency(amount, currency = 'USD') {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency
    }).format(amount);
}

// Generate random ID (for temporary client-side IDs)
function generateId() {
    return '_' + Math.random().toString(36).substr(2, 9);
}

// Deep clone object
function deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
}

// Get current week dates (Monday to Sunday)
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
    
    return {
        start: monday,
        end: sunday,
        startFormatted: formatDate(monday),
        endFormatted: formatDate(sunday)
    };
}

// Export functions for global use
window.getUserData = getUserData;
window.saveUserData = saveUserData;
window.showNotification = showNotification;
window.formatDate = formatDate;
window.formatDisplayDate = formatDisplayDate;
window.isValidEmail = isValidEmail;
window.validateRequiredFields = validateRequiredFields;
window.debounce = debounce;
window.formatHours = formatHours;
window.getWeekNumber = getWeekNumber;
window.hasRole = hasRole;
window.isAdminOrManager = isAdminOrManager;
window.redirectToLogin = redirectToLogin;
window.handleApiError = handleApiError;
window.formatCurrency = formatCurrency;
window.generateId = generateId;
window.deepClone = deepClone;
window.getCurrentWeekDates = getCurrentWeekDates;

console.log('✅ Utility functions loaded');