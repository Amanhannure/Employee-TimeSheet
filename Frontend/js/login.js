document.addEventListener('DOMContentLoaded', function() {
    // ==================== INITIALIZATION ====================
    const token = localStorage.getItem('authToken');
    const userData = JSON.parse(localStorage.getItem('userData') || 'null');
    
    // Redirect if already logged in
    if (token && userData) {
        redirectBasedOnRole(userData.role);
        return;
    }

    // ==================== MAIN LOGIN FUNCTIONALITY ====================
    
    // Employee login form
    const employeeForm = document.getElementById('employee-login-form');
    if (employeeForm) {
        employeeForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const employeeCode = document.getElementById('employee-code').value.trim();
            const password = document.getElementById('employee-password').value;
            const rememberMe = document.getElementById('employee-remember').checked;
            
            if (!employeeCode || !password) {
                showNotification('Please enter both employee code and password', 'error');
                return;
            }

            await handleLogin({
                username: employeeCode,
                password: password
            }, employeeForm, 'employee');
        });
    }

    // Admin login form
    const adminForm = document.getElementById('admin-login-form');
    if (adminForm) {
        adminForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const adminCode = document.getElementById('admin-code').value.trim();
            const password = document.getElementById('admin-password').value;
            const rememberMe = document.getElementById('admin-remember').checked;
            
            if (!adminCode || !password) {
                showNotification('Please enter both admin code and password', 'error');
                return;
            }

            await handleLogin({
                username: adminCode,
                password: password
            }, adminForm, 'admin');
        });
    }

    // ==================== PASSWORD RESET FUNCTIONALITY ====================
    
    // Initialize password reset modals
    createPasswordResetModals();
    
    // Forgot password links
    const forgotPasswordLinks = document.querySelectorAll('.forgot-password');
    forgotPasswordLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            showModal('initiate-reset-modal');
        });
    });

    // Toggle password visibility
    const togglePasswordBtns = document.querySelectorAll('.toggle-password');
    togglePasswordBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const targetId = this.getAttribute('data-target');
            const passwordInput = document.getElementById(targetId);
            
            if (passwordInput) {
                if (passwordInput.type === 'password') {
                    passwordInput.type = 'text';
                    this.classList.remove('fa-eye');
                    this.classList.add('fa-eye-slash');
                } else {
                    passwordInput.type = 'password';
                    this.classList.remove('fa-eye-slash');
                    this.classList.add('fa-eye');
                }
            }
        });
    });

    // Modal close functionality
    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('close-modal') || e.target.classList.contains('modal')) {
            hideAllModals();
        }
    });

    // Escape key to close modals
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            hideAllModals();
        }
    });

    // ==================== CORE FUNCTIONS ====================
    
    async function handleLogin(credentials, form, userType) {
        try {
            const loginButton = form.querySelector('button[type="submit"]');
            setLoadingState(loginButton, true, 'Signing In...');
            
            let result;
            if (userType === 'admin') {
                result = await apiClient.loginAdmin(credentials);
            } else {
                result = await apiClient.login(credentials);
            }
            
            showNotification('Login successful!', 'success');
            
            // Store remember me preference
            if (document.getElementById(`${userType}-remember`).checked) {
                localStorage.setItem('rememberMe', 'true');
            }
            
            setTimeout(() => {
                redirectBasedOnRole(result.user.role);
            }, 1000);
            
        } catch (error) {
            console.error('Login error:', error);
            showNotification(error.message || 'Login failed. Please check your credentials.', 'error');
            
            const loginButton = form.querySelector('button[type="submit"]');
            setLoadingState(loginButton, false);
        }
    }

    function createPasswordResetModals() {
        if (document.getElementById('initiate-reset-modal')) {
            return;
        }

        const modalsHTML = `
            <!-- Initiate Reset Modal -->
            <div id="initiate-reset-modal" class="modal">
                <div class="modal-content">
                    <span class="close-modal">&times;</span>
                    <h2>Reset Your Password</h2>
                    <p>Enter your employee code to start the password reset process.</p>
                    <form id="initiate-reset-form">
                        <div class="form-group">
                            <label for="reset-employee-code">Employee Code</label>
                            <input type="text" id="reset-employee-code" name="employeeCode" required 
                                   placeholder="Enter your employee code (e.g., T1040)">
                        </div>
                        <button type="submit" class="reset-btn">
                            <i class="fas fa-key"></i> Continue
                        </button>
                    </form>
                </div>
            </div>

            <!-- Method Selection Modal -->
            <div id="method-selection-modal" class="modal">
                <div class="modal-content">
                    <span class="close-modal">&times;</span>
                    <h2>Choose Reset Method</h2>
                    <p>How would you like to reset your password?</p>
                    <div class="method-options">
                        <button class="method-btn" data-method="security_question">
                            <i class="fas fa-shield-alt"></i>
                            <div>
                                <span class="method-title">Security Question</span>
                                <span class="method-desc">Answer your security question</span>
                            </div>
                        </button>
                        <button class="method-btn" data-method="email">
                            <i class="fas fa-envelope"></i>
                            <div>
                                <span class="method-title">Email Verification</span>
                                <span class="method-desc">Get a code sent to your email</span>
                            </div>
                        </button>
                    </div>
                    <div id="method-info" class="method-info"></div>
                    <button type="button" id="back-to-initiate" class="back-btn">
                        <i class="fas fa-arrow-left"></i> Back
                    </button>
                </div>
            </div>

            <!-- Security Question Modal -->
            <div id="security-question-modal" class="modal">
                <div class="modal-content">
                    <span class="close-modal">&times;</span>
                    <h2>Security Verification</h2>
                    <form id="security-question-form">
                        <div class="security-question-display">
                            <label>Your Security Question:</label>
                            <div id="security-question-text" class="question-text"></div>
                        </div>
                        <div class="form-group">
                            <label for="security-answer">Your Answer</label>
                            <input type="text" id="security-answer" name="securityAnswer" required 
                                   placeholder="Enter your answer">
                        </div>
                        <div class="button-group">
                            <button type="button" id="back-to-method-from-security" class="back-btn">
                                <i class="fas fa-arrow-left"></i> Back
                            </button>
                            <button type="submit" class="reset-btn">
                                <i class="fas fa-check"></i> Verify Answer
                            </button>
                        </div>
                    </form>
                </div>
            </div>

            <!-- Email Verification Modal -->
            <div id="email-verification-modal" class="modal">
                <div class="modal-content">
                    <span class="close-modal">&times;</span>
                    <h2>Email Verification</h2>
                    <div class="email-display">
                        <i class="fas fa-envelope"></i>
                        Code sent to: <span id="user-email"></span>
                    </div>
                    <form id="email-verification-form">
                        <div class="form-group">
                            <label for="email-code">Enter Verification Code</label>
                            <input type="text" id="email-code" name="emailCode" maxlength="6" required 
                                   placeholder="Enter 6-digit code" class="code-input">
                            <div class="code-hint">Check your email for the 6-digit verification code</div>
                        </div>
                        <div class="button-group">
                            <button type="button" id="back-to-method-from-email" class="back-btn">
                                <i class="fas fa-arrow-left"></i> Back
                            </button>
                            <button type="submit" class="reset-btn">
                                <i class="fas fa-check"></i> Verify Code
                            </button>
                        </div>
                    </form>
                    <div class="resend-section">
                        <p>Didn't receive the code?</p>
                        <button type="button" id="resend-code-btn" class="resend-btn">
                            <i class="fas fa-redo"></i> Resend Code
                        </button>
                    </div>
                </div>
            </div>

            <!-- Reset Password Modal -->
            <div id="reset-password-modal" class="modal">
                <div class="modal-content">
                    <span class="close-modal">&times;</span>
                    <h2>Create New Password</h2>
                    <p>Please create a new password for your account.</p>
                    <form id="reset-password-form">
                        <div class="form-group">
                            <label for="new-password">New Password</label>
                            <input type="password" id="new-password" name="newPassword" required 
                                   placeholder="Enter new password (min. 4 characters)"
                                   minlength="4">
                            <i class="fas fa-eye toggle-password" data-target="new-password"></i>
                            <div id="password-strength" class="password-strength"></div>
                        </div>
                        <div class="form-group">
                            <label for="confirm-password">Confirm Password</label>
                            <input type="password" id="confirm-password" name="confirmPassword" required 
                                   placeholder="Confirm your new password"
                                   minlength="4">
                            <i class="fas fa-eye toggle-password" data-target="confirm-password"></i>
                            <div id="password-match" class="password-match"></div>
                        </div>
                        <div class="button-group">
                            <button type="button" id="back-to-verification" class="back-btn">
                                <i class="fas fa-arrow-left"></i> Back
                            </button>
                            <button type="submit" class="reset-btn">
                                <i class="fas fa-key"></i> Reset Password
                            </button>
                        </div>
                    </form>
                </div>
            </div>

            <!-- Success Modal -->
            <div id="success-modal" class="modal">
                <div class="modal-content success-modal">
                    <div class="success-icon">
                        <i class="fas fa-check-circle"></i>
                    </div>
                    <h2>Password Reset Successful!</h2>
                    <p>Your password has been reset successfully. You can now log in with your new password.</p>
                    <button type="button" id="go-to-login" class="login-btn">
                        <i class="fas fa-sign-in-alt"></i> Go to Login
                    </button>
                </div>
            </div>

            <!-- Contact Admin Modal -->
            <div id="contact-admin-modal" class="modal">
                <div class="modal-content">
                    <span class="close-modal">&times;</span>
                    <div class="warning-icon">
                        <i class="fas fa-exclamation-triangle"></i>
                    </div>
                    <h2>Reset Not Available</h2>
                    <div class="warning-message">
                        <p>No password reset methods are available for your account.</p>
                        <p>Please contact your system administrator to set up password recovery options.</p>
                    </div>
                    <button type="button" id="close-contact-modal" class="reset-btn">OK</button>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalsHTML);
        setupPasswordResetEventListeners();
        setupPasswordValidation();
    }

    function setupPasswordResetEventListeners() {
        let currentEmployeeCode = '';
        let currentResetToken = '';
        let currentMethod = '';

        // Initiate Reset Form
        const initiateResetForm = document.getElementById('initiate-reset-form');
        if (initiateResetForm) {
            initiateResetForm.addEventListener('submit', async function(e) {
                e.preventDefault();
                const employeeCode = document.getElementById('reset-employee-code').value.trim();
                
                if (!employeeCode) {
                    showNotification('Please enter your employee code', 'error');
                    return;
                }

                currentEmployeeCode = employeeCode;

                try {
                    const button = this.querySelector('button[type="submit"]');
                    setLoadingState(button, true, 'Checking...');

                    const result = await apiClient.initiatePasswordReset({ employeeCode });
                    
                    setLoadingState(button, false);
                    button.innerHTML = '<i class="fas fa-key"></i> Continue';

                    if (result.contactAdmin) {
                        showModal('contact-admin-modal');
                        return;
                    }

                    if (result.autoProceed) {
                        currentMethod = result.method;
                        if (result.method === 'security_question') {
                            document.getElementById('security-question-text').textContent = result.user.securityQuestion;
                            showModal('security-question-modal');
                        } else if (result.method === 'email') {
                            document.getElementById('user-email').textContent = result.user.maskedEmail;
                            showModal('email-verification-modal');
                        }
                    } else {
                        showMethodSelectionModal(result);
                    }
                } catch (error) {
                    const button = document.querySelector('#initiate-reset-form button[type="submit"]');
                    setLoadingState(button, false);
                    showNotification(error.message || 'Failed to initiate password reset', 'error');
                }
            });
        }

        // Method Selection
        document.querySelectorAll('.method-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const method = this.getAttribute('data-method');
                handleMethodSelection(method, currentEmployeeCode);
            });
        });

        // Back Buttons
        setupBackButton('back-to-initiate', 'initiate-reset-modal');
        setupBackButton('back-to-method-from-security', 'method-selection-modal');
        setupBackButton('back-to-method-from-email', 'method-selection-modal');
        setupBackButton('back-to-verification', () => {
            if (currentMethod === 'security_question') {
                showModal('security-question-modal');
            } else {
                showModal('email-verification-modal');
            }
        });

        // Security Question Form
        const securityQuestionForm = document.getElementById('security-question-form');
        if (securityQuestionForm) {
            securityQuestionForm.addEventListener('submit', async function(e) {
                e.preventDefault();
                const securityAnswer = document.getElementById('security-answer').value.trim();

                if (!securityAnswer) {
                    showNotification('Please enter your security answer', 'error');
                    return;
                }

                try {
                    const button = this.querySelector('button[type="submit"]');
                    setLoadingState(button, true, 'Verifying...');

                    const result = await apiClient.verifySecurityAnswer({
                        employeeCode: currentEmployeeCode,
                        securityAnswer
                    });
                    
                    currentResetToken = result.resetToken;
                    currentMethod = 'security_question';
                    showModal('reset-password-modal');
                    
                } catch (error) {
                    const button = document.querySelector('#security-question-form button[type="submit"]');
                    setLoadingState(button, false);
                    showNotification(error.message || 'Incorrect security answer', 'error');
                }
            });
        }

        // Email Verification Form
        const emailVerificationForm = document.getElementById('email-verification-form');
        if (emailVerificationForm) {
            emailVerificationForm.addEventListener('submit', async function(e) {
                e.preventDefault();
                const emailCode = document.getElementById('email-code').value.trim();

                if (!emailCode || emailCode.length !== 6) {
                    showNotification('Please enter the 6-digit verification code', 'error');
                    return;
                }

                try {
                    const button = this.querySelector('button[type="submit"]');
                    setLoadingState(button, true, 'Verifying...');

                    const result = await apiClient.verifyEmailCode({
                        employeeCode: currentEmployeeCode,
                        emailCode
                    });
                    
                    currentResetToken = result.resetToken;
                    currentMethod = 'email';
                    showModal('reset-password-modal');
                    
                } catch (error) {
                    const button = document.querySelector('#email-verification-form button[type="submit"]');
                    setLoadingState(button, false);
                    showNotification(error.message || 'Invalid verification code', 'error');
                }
            });
        }

        // Resend Code Button
        const resendCodeBtn = document.getElementById('resend-code-btn');
        if (resendCodeBtn) {
            resendCodeBtn.addEventListener('click', async function() {
                try {
                    setLoadingState(this, true, 'Sending...');

                    const result = await apiClient.sendEmailCode({ employeeCode: currentEmployeeCode });
                    
                    setLoadingState(this, false);
                    this.innerHTML = '<i class="fas fa-redo"></i> Resend Code';
                    
                    showNotification('Verification code sent successfully', 'success');
                    
                } catch (error) {
                    setLoadingState(resendCodeBtn, false);
                    showNotification(error.message || 'Failed to resend code', 'error');
                }
            });
        }

        // Final Password Reset Form
        const resetPasswordForm = document.getElementById('reset-password-form');
        if (resetPasswordForm) {
            resetPasswordForm.addEventListener('submit', async function(e) {
                e.preventDefault();
                const newPassword = document.getElementById('new-password').value;
                const confirmPassword = document.getElementById('confirm-password').value;

                if (newPassword !== confirmPassword) {
                    showNotification('Passwords do not match', 'error');
                    return;
                }

                if (newPassword.length < 4) {
                    showNotification('Password must be at least 4 characters', 'error');
                    return;
                }

                try {
                    const button = this.querySelector('button[type="submit"]');
                    setLoadingState(button, true, 'Resetting...');

                    await apiClient.resetPassword({
                        employeeCode: currentEmployeeCode,
                        resetToken: currentResetToken,
                        newPassword
                    });
                    
                    showModal('success-modal');
                    
                } catch (error) {
                    const button = document.querySelector('#reset-password-form button[type="submit"]');
                    setLoadingState(button, false);
                    showNotification(error.message || 'Password reset failed', 'error');
                }
            });
        }

        // Success Modal - Go to Login
        const goToLoginBtn = document.getElementById('go-to-login');
        if (goToLoginBtn) {
            goToLoginBtn.addEventListener('click', function() {
                hideAllModals();
                resetPasswordResetForms();
            });
        }

        // Contact Admin Modal Close
        const closeContactModal = document.getElementById('close-contact-modal');
        if (closeContactModal) {
            closeContactModal.addEventListener('click', function() {
                hideAllModals();
                resetPasswordResetForms();
            });
        }
    }

    function setupBackButton(buttonId, targetModal) {
        const button = document.getElementById(buttonId);
        if (button) {
            button.addEventListener('click', () => {
                if (typeof targetModal === 'function') {
                    targetModal();
                } else {
                    showModal(targetModal);
                }
            });
        }
    }

    function setupPasswordValidation() {
        const newPasswordInput = document.getElementById('new-password');
        const confirmPasswordInput = document.getElementById('confirm-password');

        if (newPasswordInput) {
            newPasswordInput.addEventListener('input', function() {
                const strength = checkPasswordStrength(this.value);
                const strengthElement = document.getElementById('password-strength');
                if (strengthElement) {
                    strengthElement.textContent = strength.feedback ? `Password strength: ${strength.feedback}` : '';
                    strengthElement.className = `password-strength ${strength.className}`;
                }
            });
        }

        if (confirmPasswordInput) {
            confirmPasswordInput.addEventListener('input', function() {
                const newPassword = document.getElementById('new-password').value;
                const match = checkPasswordMatch(newPassword, this.value);
                const matchElement = document.getElementById('password-match');
                if (matchElement) {
                    matchElement.textContent = match.message;
                    matchElement.className = `password-match ${match.className}`;
                }
            });
        }
    }

    function showMethodSelectionModal(result) {
        const modal = document.getElementById('method-selection-modal');
        const methodInfo = document.getElementById('method-info');
        
        if (!modal || !methodInfo) return;

        // Update method info
        let infoHTML = `<p><strong>Available methods for ${result.user.employeeId}:</strong></p><ul>`;
        
        if (result.availableMethods.includes('security_question')) {
            infoHTML += `<li>🔒 Security Question: ${result.user.securityQuestion || 'Personal security question'}</li>`;
        }
        
        if (result.availableMethods.includes('email')) {
            infoHTML += `<li>📧 Email: Code will be sent to ${result.user.maskedEmail}</li>`;
        }
        
        infoHTML += '</ul>';
        methodInfo.innerHTML = infoHTML;

        // Enable/disable method buttons based on availability
        document.querySelectorAll('.method-btn').forEach(btn => {
            const method = btn.getAttribute('data-method');
            if (result.availableMethods.includes(method)) {
                btn.disabled = false;
                btn.style.opacity = '1';
                btn.style.cursor = 'pointer';
            } else {
                btn.disabled = true;
                btn.style.opacity = '0.5';
                btn.style.cursor = 'not-allowed';
            }
        });

        showModal('method-selection-modal');
    }

    async function handleMethodSelection(method, employeeCode) {
        currentMethod = method;
        
        if (method === 'security_question') {
            try {
                const result = await apiClient.initiatePasswordReset({ employeeCode });
                document.getElementById('security-question-text').textContent = result.user.securityQuestion;
                showModal('security-question-modal');
            } catch (error) {
                showNotification(error.message || 'Failed to load security question', 'error');
            }
        } else if (method === 'email') {
            try {
                const result = await apiClient.sendEmailCode({ employeeCode });
                document.getElementById('user-email').textContent = result.maskedEmail;
                showModal('email-verification-modal');
            } catch (error) {
                showNotification(error.message || 'Failed to send verification code', 'error');
            }
        }
    }

    function resetPasswordResetForms() {
        // Clear all forms
        document.querySelectorAll('form').forEach(form => form.reset());
        
        // Clear password strength indicators
        const strengthElement = document.getElementById('password-strength');
        const matchElement = document.getElementById('password-match');
        if (strengthElement) strengthElement.textContent = '';
        if (matchElement) matchElement.textContent = '';
        
        // Reset state variables
        currentEmployeeCode = '';
        currentResetToken = '';
        currentMethod = '';
    }
});