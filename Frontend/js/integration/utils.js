const validateInput = (input) => {
  if (typeof input !== 'string') return false;
  if (input.length > 255) return false;
  if (/[<>]/.test(input)) return false;
  return true;
};

const sanitizeHTML = (str) => {
  if (typeof str !== 'string') return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
};

// Enhanced notification system
function showNotification(message, type = 'info') {
    // Remove any existing notifications first
    const existingNotifications = document.querySelectorAll('.notification');
    existingNotifications.forEach(notification => {
        if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
        }
    });

    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    
    const icons = {
        success: 'check-circle',
        error: 'exclamation-circle',
        warning: 'exclamation-triangle',
        info: 'info-circle'
    };
    
    notification.innerHTML = `
        <div class="notification-content">
            <i class="fas fa-${icons[type] || 'info-circle'}"></i>
            <span>${sanitizeHTML(message)}</span>
        </div>
    `;

    // Add styles if not exists
    if (!document.querySelector('#notification-styles')) {
        const styles = document.createElement('style');
        styles.id = 'notification-styles';
        styles.textContent = `
            .notification {
                position: fixed;
                top: 20px;
                right: 20px;
                padding: 15px 20px;
                border-radius: 8px;
                color: white;
                z-index: 10000;
                transform: translateX(400px);
                transition: transform 0.3s ease;
                max-width: 400px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                font-family: Arial, sans-serif;
                font-size: 14px;
            }
            .notification.show {
                transform: translateX(0);
            }
            .notification-success {
                background: #28a745;
                border-left: 4px solid #1e7e34;
            }
            .notification-error {
                background: #dc3545;
                border-left: 4px solid #c82333;
            }
            .notification-warning {
                background: #ffc107;
                color: #212529;
                border-left: 4px solid #e0a800;
            }
            .notification-info {
                background: #17a2b8;
                border-left: 4px solid #138496;
            }
            .notification-content {
                display: flex;
                align-items: center;
                gap: 10px;
            }
            .notification-content i {
                font-size: 16px;
            }
        `;
        document.head.appendChild(styles);
    }

    document.body.appendChild(notification);

    // Show notification with animation
    setTimeout(() => {
        notification.classList.add('show');
    }, 100);

    // Remove after 5 seconds
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 5000);
}

// Password strength checker (updated for 4-character minimum)
function checkPasswordStrength(password) {
    if (!password || password.length === 0) {
        return { strength: 0, feedback: '', className: '' };
    }

    let strength = 0;
    let feedback = '';

    // Basic length check (minimum 4 characters)
    if (password.length >= 4) strength++;
    if (password.length >= 6) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[^A-Za-z0-9]/.test(password)) strength++;

    switch(strength) {
        case 0:
        case 1:
            feedback = 'Weak';
            break;
        case 2:
        case 3:
            feedback = 'Medium';
            break;
        case 4:
        case 5:
            feedback = 'Strong';
            break;
    }

    return {
        strength,
        feedback,
        className: `strength-${feedback.toLowerCase()}`
    };
}

// Password match checker
function checkPasswordMatch(password, confirmPassword) {
    if (!confirmPassword || confirmPassword.length === 0) {
        return { match: null, message: '', className: '' };
    }

    if (password === confirmPassword) {
        return { 
            match: true, 
            message: '✓ Passwords match', 
            className: 'match-success' 
        };
    } else {
        return { 
            match: false, 
            message: '✗ Passwords do not match', 
            className: 'match-error' 
        };
    }
}

// User data management
function getUserData() {
    try {
        const userData = localStorage.getItem('userData');
        return userData ? JSON.parse(userData) : null;
    } catch (error) {
        console.error('Error parsing user data:', error);
        return null;
    }
}

function setUserData(userData) {
    try {
        localStorage.setItem('userData', JSON.stringify(userData));
    } catch (error) {
        console.error('Error saving user data:', error);
    }
}

function clearUserData() {
    localStorage.removeItem('userData');
    localStorage.removeItem('authToken');
}

// Date formatting utilities
function formatDate(date, includeTime = false) {
    if (!date) return 'N/A';
    
    try {
        const dateObj = new Date(date);
        if (isNaN(dateObj.getTime())) return 'Invalid Date';
        
        const options = { 
            year: 'numeric', 
            month: '2-digit', 
            day: '2-digit' 
        };
        
        if (includeTime) {
            options.hour = '2-digit';
            options.minute = '2-digit';
        }
        
        return dateObj.toLocaleDateString('en-GB', options);
    } catch (error) {
        console.error('Error formatting date:', error);
        return 'Invalid Date';
    }
}

function formatTime(date) {
    if (!date) return 'N/A';
    
    try {
        const dateObj = new Date(date);
        if (isNaN(dateObj.getTime())) return 'Invalid Time';
        
        return dateObj.toLocaleTimeString('en-GB', { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
    } catch (error) {
        console.error('Error formatting time:', error);
        return 'Invalid Time';
    }
}

// Role-based utilities
function getUserRole() {
    const userData = getUserData();
    return userData ? userData.role : null;
}

function isAdmin() {
    return getUserRole() === 'admin';
}

function isManager() {
    const role = getUserRole();
    return role === 'manager' || role === 'admin';
}

function isEmployee() {
    const role = getUserRole();
    return role === 'employee' || !role;
}

// Navigation utilities
function redirectBasedOnRole() {
    const userData = getUserData();
    if (!userData) {
        window.location.href = 'index.html';
        return;
    }

    switch(userData.role) {
        case 'admin':
        case 'manager':
            window.location.href = 'admin-dashboard.html';
            break;
        case 'employee':
            window.location.href = 'dashboard.html';
            break;
        default:
            window.location.href = 'dashboard.html';
    }
}

function logout() {
    clearUserData();
    window.location.href = 'index.html';
}

// Form validation utilities
function validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

function validateEmployeeCode(code) {
    const codeRegex = /^T\d+$/;
    return codeRegex.test(code);
}

function validatePhoneNumber(phone) {
    const phoneRegex = /^[\d\s\-\+\(\)]{10,}$/;
    return phoneRegex.test(phone.replace(/\s/g, ''));
}

// Loading state management
function setLoadingState(element, isLoading, loadingText = 'Loading...') {
    if (!element) return;

    if (isLoading) {
        element.setAttribute('data-original-text', element.innerHTML);
        element.disabled = true;
        element.innerHTML = `<i class="fas fa-spinner fa-spin"></i> ${loadingText}`;
    } else {
        const originalText = element.getAttribute('data-original-text');
        if (originalText) {
            element.innerHTML = originalText;
        }
        element.disabled = false;
    }
}

// Modal management
function showModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'block';
        document.body.style.overflow = 'hidden';
        
        setTimeout(() => {
            const modalContent = modal.querySelector('.modal-content');
            if (modalContent) {
                modalContent.classList.add('modal-show');
            }
        }, 10);
    }
}

function hideModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        const modalContent = modal.querySelector('.modal-content');
        if (modalContent) {
            modalContent.classList.remove('modal-show');
        }
        
        setTimeout(() => {
            modal.style.display = 'none';
            document.body.style.overflow = '';
        }, 300);
    }
}

function hideAllModals() {
    document.querySelectorAll('.modal').forEach(modal => {
        const modalContent = modal.querySelector('.modal-content');
        if (modalContent) {
            modalContent.classList.remove('modal-show');
        }
        
        setTimeout(() => {
            modal.style.display = 'none';
            document.body.style.overflow = '';
        }, 300);
    });
}

// Auto-initialize logout functionality
document.addEventListener('DOMContentLoaded', function() {
    const userData = getUserData();
    if (userData) {
        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', logout);
        }
    }
});

// Export utilities for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        validateInput,
        sanitizeHTML,
        showNotification,
        checkPasswordStrength,
        checkPasswordMatch,
        getUserData,
        setUserData,
        clearUserData,
        formatDate,
        formatTime,
        getUserRole,
        isAdmin,
        isManager,
        isEmployee,
        redirectBasedOnRole,
        logout,
        validateEmail,
        validateEmployeeCode,
        validatePhoneNumber,
        setLoadingState,
        showModal,
        hideModal,
        hideAllModals
    };
}