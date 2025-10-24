document.addEventListener('DOMContentLoaded', function() {
    const token = localStorage.getItem('authToken');
    const userData = localStorage.getItem('userData');
    
    if (token && userData) {
        const user = JSON.parse(userData);
        redirectBasedOnRole(user.role);
    }

    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    tabBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            tabBtns.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            
            tabContents.forEach(content => content.classList.add('hidden'));
            
            const tabId = this.getAttribute('data-tab');
            document.getElementById(`${tabId}-tab`).classList.remove('hidden');
        });
    });

    const employeeForm = document.getElementById('employee-login-form');
    employeeForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const employeeCode = document.getElementById('employee-code').value;
        const password = document.getElementById('employee-password').value;
        
        try {
            const loginButton = this.querySelector('button[type="submit"]');
            loginButton.disabled = true;
            loginButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Signing In...';
            
            const result = await apiClient.login({
                username: employeeCode,
                password: password
            });
            
            showNotification('Login successful!', 'success');
            
            setTimeout(() => {
                redirectBasedOnRole(result.user.role);
            }, 1000);
            
        } catch (error) {
            showNotification(error.message || 'Login failed', 'error');
            
            const loginButton = this.querySelector('button[type="submit"]');
            loginButton.disabled = false;
            loginButton.innerHTML = '<i class="fas fa-sign-in-alt"></i> Sign In';
        }
    });

    const adminForm = document.getElementById('admin-login-form');
    if (adminForm) {
        adminForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const adminCode = document.getElementById('admin-code').value;
            const password = document.getElementById('admin-password').value;
            
            try {
                const loginButton = this.querySelector('button[type="submit"]');
                loginButton.disabled = true;
                loginButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Signing In...';
                
                const result = await apiClient.loginAdmin({
                    username: adminCode,
                    password: password
                });
                
                showNotification('Admin login successful!', 'success');
                
                setTimeout(() => {
                    window.location.href = 'admin-dashboard.html';
                }, 1000);
                
            } catch (error) {
                showNotification(error.message || 'Admin login failed', 'error');
                
                const loginButton = this.querySelector('button[type="submit"]');
                loginButton.disabled = false;
                loginButton.innerHTML = '<i class="fas fa-sign-in-alt"></i> Sign In';
            }
        });
    }

    function redirectBasedOnRole(role) {
        switch(role) {
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

    const forgotPasswordLinks = document.querySelectorAll('.forgot-password');
    const modal = document.getElementById('forgot-password-modal');
    const closeModal = document.querySelector('.close-modal');

    forgotPasswordLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            modal.style.display = 'block';
        });
    });

    if (closeModal) {
        closeModal.addEventListener('click', function() {
            modal.style.display = 'none';
        });
    }

    window.addEventListener('click', function(e) {
        if (e.target === modal) {
            modal.style.display = 'none';
        }
    });

    const togglePasswordBtns = document.querySelectorAll('.toggle-password');
    togglePasswordBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const targetId = this.getAttribute('data-target');
            const passwordInput = document.getElementById(targetId);
            
            if (passwordInput.type === 'password') {
                passwordInput.type = 'text';
                this.classList.remove('fa-eye');
                this.classList.add('fa-eye-slash');
            } else {
                passwordInput.type = 'password';
                this.classList.remove('fa-eye-slash');
                this.classList.add('fa-eye');
            }
        });
    });
});