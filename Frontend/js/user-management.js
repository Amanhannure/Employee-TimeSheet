// ==================== ENHANCED USER MANAGEMENT SCRIPT ====================
// Combined features from both files with better error handling and safety

document.addEventListener('DOMContentLoaded', async function() {
    try {
        await initializeUserManagement();
    } catch (error) {
        console.error('Failed to initialize user management:', error);
        showNotification('Failed to initialize user management system', 'error');
    }
});

async function initializeUserManagement() {
    try {
        await loadAllUsers();
        updateOverviewCards();
        setupEventListeners();
        console.log('✅ User management system initialized');
    } catch (error) {
        console.error('Error initializing user management:', error);
        throw error;
    }
}

function setupEventListeners() {
    // Safe event listener binding with null checks
    const addUserForm = getElementSafely('addUserForm');
    const editUserForm = getElementSafely('editUserForm');
    const searchUsers = getElementSafely('searchUsers');
    const filterRole = getElementSafely('filterRole');
    const filterStatus = getElementSafely('filterStatus');
    const toggleSidebar = getElementSafely('toggle-sidebar');
    const departmentSelect = getElementSafely('department');
    const editDepartmentSelect = getElementSafely('editDepartment');
    
    if (addUserForm) {
        addUserForm.addEventListener('submit', function(e) {
            e.preventDefault();
            addUser();
        });
    }
    
    if (editUserForm) {
        editUserForm.addEventListener('submit', function(e) {
            e.preventDefault();
            updateUser();
        });
    }
    
    if (searchUsers) {
        searchUsers.addEventListener('input', debounce(filterUsers, 300));
    }
    
    if (filterRole) {
        filterRole.addEventListener('change', filterUsers);
    }
    
    if (filterStatus) {
        filterStatus.addEventListener('change', filterUsers);
    }
    
    if (toggleSidebar) {
        toggleSidebar.addEventListener('click', function() {
            const dashboardContainer = document.querySelector('.dashboard-container');
            if (dashboardContainer) {
                dashboardContainer.classList.toggle('sidebar-collapsed');
            }
        });
    }
    
    // Department change listeners for team leader dropdown
    if (departmentSelect) {
        departmentSelect.addEventListener('change', function() {
            populateTeamLeadersByDepartment(this.value, 'teamLeader');
        });
    }
    
    if (editDepartmentSelect) {
        editDepartmentSelect.addEventListener('change', function() {
            populateTeamLeadersByDepartment(this.value, 'editTeamLeader');
        });
    }
    
    // Global click handler for modal dismissal
    window.onclick = function(event) {
        if (event.target.classList.contains('modal')) {
            event.target.style.display = 'none';
        }
    };
}

// ==================== USER DATA MANAGEMENT ====================

async function loadAllUsers() {
    try {
        console.log('🔄 Starting to load all users...');
        
        showLoadingState(true);
        
        const response = await apiClient.getUsers({ page: 1, pageSize: 1000 });
        
        // ✅ ENHANCED: Handle multiple response formats
        let users = extractUsersFromResponse(response);
        
        console.log('📊 API Response:', users.length, 'users');
        
        if (users.length > 0) {
            console.log('👤 First user sample:', users[0]);
        }
        
        // Remove duplicates based on _id
        const uniqueUsers = removeDuplicateUsers(users);
        
        window.users = uniqueUsers;
        window.filteredUsers = [...uniqueUsers]; // Initialize filtered users
        
        console.log(`✅ Successfully loaded ${uniqueUsers.length} unique users`);
        
        renderUserGrid(uniqueUsers);
        updateOverviewCards();
        
    } catch (error) {
        console.error('❌ Error loading users:', error);
        showNotification('Failed to load users. Please check your connection.', 'error');
        renderEmptyState('Unable to load users. Please try again.');
        throw error;
    } finally {
        showLoadingState(false);
    }
}

function extractUsersFromResponse(response) {
    if (Array.isArray(response)) {
        return response;
    } else if (response && Array.isArray(response.users)) {
        return response.users;
    } else if (response && Array.isArray(response.data)) {
        return response.data;
    } else if (response && response.users && Array.isArray(response.users)) {
        return response.users;
    }
    return [];
}

function removeDuplicateUsers(users) {
    const uniqueUsers = [];
    const seenIds = new Set();
    
    users.forEach(user => {
        if (user._id && !seenIds.has(user._id)) {
            seenIds.add(user._id);
            uniqueUsers.push(user);
        }
    });
    
    return uniqueUsers;
}

function renderUserGrid(users) {
    const grid = getElementSafely('usersGrid');
    if (!grid) return;
    
    grid.innerHTML = '';
    
    if (users.length === 0) {
        renderEmptyState('No users found');
        return;
    }
    
    users.forEach(user => {
        const card = createUserCard(user);
        grid.appendChild(card);
    });
}

function renderEmptyState(message) {
    const grid = getElementSafely('usersGrid');
    if (!grid) return;
    
    grid.innerHTML = `
        <div class="empty-state">
            <div class="empty-icon">👥</div>
            <h3>${message}</h3>
            <p>Try adjusting your search or add a new user</p>
            <button class="btn-primary" onclick="openAddUserModal()">
                <i class="fas fa-plus"></i> Add New User
            </button>
        </div>
    `;
}

function showLoadingState(show) {
    const grid = getElementSafely('usersGrid');
    const loadingIndicator = getElementSafely('loadingIndicator');
    
    if (show) {
        if (grid) grid.style.opacity = '0.6';
        if (loadingIndicator) loadingIndicator.style.display = 'block';
    } else {
        if (grid) grid.style.opacity = '1';
        if (loadingIndicator) loadingIndicator.style.display = 'none';
    }
}

// ==================== USER CARD CREATION ====================

function createUserCard(user) {
    const card = document.createElement('div');
    card.className = 'user-card';
    card.dataset.userId = user._id;
    
    const safeUser = createSafeUserObject(user);
    const formattedDate = formatJoinDate(safeUser.joinDate);
    const teamLeaderName = safeUser.teamLeaderName || 'Not assigned';
    
    card.innerHTML = `
        <div class="user-header">
            <div class="user-basic-info">
                <h3 class="user-name">${safeUser.firstName} ${safeUser.lastName}</h3>
                <p class="user-email">${safeUser.email}</p>
                <p class="user-employee-id"><strong>ID:</strong> ${safeUser.employeeId}</p>
            </div>
            <span class="user-role role-${safeUser.role}">${safeUser.role}</span>
        </div>
        
        <div class="user-stats">
            <div class="stat-item">
                <div class="stat-label">Username</div>
                <div class="stat-value">${safeUser.username}</div>
            </div>
            <div class="stat-item">
                <div class="stat-label">Designation</div>
                <div class="stat-value">${safeUser.designation}</div>
            </div>
            <div class="stat-item">
                <div class="stat-label">Department</div>
                <div class="stat-value">${safeUser.department}</div>
            </div>
            <div class="stat-item">
                <div class="stat-label">Join Date</div>
                <div class="stat-value">${formattedDate}</div>
            </div>
            <div class="stat-item">
                <div class="stat-label">Team Leader</div>
                <div class="stat-value">${teamLeaderName}</div>
            </div>
            <div class="stat-item">
                <div class="stat-label">Status</div>
                <div class="stat-value status-${safeUser.status}">
                    <span class="status-indicator ${safeUser.status}"></span>
                    ${safeUser.status}
                </div>
            </div>
        </div>
        
        <div class="user-actions-card">
            <button class="btn-small btn-edit" onclick="openEditUserModal('${safeUser._id}')" title="Edit User">
                <i class="fas fa-edit"></i> Edit
            </button>
            <button class="btn-small btn-delete" onclick="openDeleteUserModal('${safeUser._id}')" title="Delete User">
                <i class="fas fa-trash"></i> Delete
            </button>
            <button class="btn-small btn-view" onclick="viewUserDetails('${safeUser._id}')" title="View Details">
                <i class="fas fa-eye"></i> View
            </button>
        </div>
    `;
    
    return card;
}

function createSafeUserObject(user) {
    return {
        _id: user._id || '',
        employeeId: user.employeeId || 'N/A',
        firstName: user.firstName || 'Unknown',
        lastName: user.lastName || 'User',
        email: user.email || 'No email',
        username: user.username || 'N/A',
        role: user.role || 'employee',
        designation: user.designation || 'Not specified',
        department: user.department || 'Not assigned',
        teamLeader: user.teamLeader || null,
        teamLeaderName: user.teamLeaderName || (user.teamLeader ? `${user.teamLeader.firstName} ${user.teamLeader.lastName}` : 'Not assigned'),
        status: user.status || 'active',
        phone: user.phone || 'N/A',
        joinDate: user.joinDate || ''
    };
}

function formatJoinDate(joinDate) {
    if (!joinDate) return 'Not set';
    
    try {
        const date = new Date(joinDate);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    } catch (e) {
        return joinDate;
    }
}

// ==================== TEAM LEADER FUNCTIONALITY ====================

// ==================== TEAM LEADER FUNCTIONALITY ====================

// ==================== TEAM LEADER FUNCTIONALITY ====================

async function populateTeamLeadersByDepartment(department, selectElementId) {
    try {
        const selectElement = getElementSafely(selectElementId);
        if (!selectElement) return;
        
        // Clear current options except the first one
        const firstOption = selectElement.options[0];
        selectElement.innerHTML = '';
        if (firstOption) {
            selectElement.appendChild(firstOption);
        } else {
            selectElement.innerHTML = '<option value="">Select Team Leader</option>';
        }
        
        console.log(`🔍 Fetching team leaders for department: ${department}`);
        
        // ✅ ALWAYS ADD MR. NILESH SAKPAL AND MRS. MEDHA SAKPAL FIRST
        // Add Mr. Nilesh Sakpal (use a special ID)
        const nileshOption = document.createElement('option');
        nileshOption.value = 'nilesh_sakpal_special';
        nileshOption.textContent = 'Mr. Nilesh Sakpal';
        selectElement.appendChild(nileshOption);
        
        // Add Mrs. Medha Sakpal (use a special ID)
        const medhaOption = document.createElement('option');
        medhaOption.value = 'medha_sakpal_special';
        medhaOption.textContent = 'Mrs. Medha Sakpal';
        selectElement.appendChild(medhaOption);
        
        // Show loading state for department users
        const loadingOption = document.createElement('option');
        loadingOption.value = '';
        loadingOption.textContent = 'Loading team leaders...';
        loadingOption.disabled = true;
        selectElement.appendChild(loadingOption);
        
        let departmentUsers = [];
        
        // If department is selected, fetch users from that department
        if (department) {
            // Fetch users from the same department
            const response = await apiClient.getUsers({ 
                department: department,
                status: 'active' // Only active users
            });
            
            departmentUsers = response.users || [];
            
            // Remove loading option
            selectElement.removeChild(loadingOption);
            
            if (departmentUsers.length > 0) {
                // Add team leaders from the same department
                departmentUsers.forEach(user => {
                    if (user._id) { // Skip if no ID
                        const option = document.createElement('option');
                        option.value = user._id;
                        // Just show name and employee ID, no role tags
                        option.textContent = `${user.firstName} ${user.lastName} (${user.employeeId})`;
                        
                        selectElement.appendChild(option);
                    }
                });
            } else {
                // No users found in this department
                const noUsersOption = document.createElement('option');
                noUsersOption.value = '';
                noUsersOption.textContent = 'No team leaders found in this department';
                noUsersOption.disabled = true;
                selectElement.appendChild(noUsersOption);
            }
        } else {
            // If no department selected, remove loading option
            selectElement.removeChild(loadingOption);
            
            // Add option to select department first
            const selectDeptOption = document.createElement('option');
            selectDeptOption.value = '';
            selectDeptOption.textContent = 'Select a department to see team leaders';
            selectDeptOption.disabled = true;
            selectElement.appendChild(selectDeptOption);
        }
        
        console.log(`✅ Loaded ${departmentUsers.length} team leaders from department plus 2 special directors`);
        
    } catch (error) {
        console.error('❌ Error loading team leaders:', error);
        const selectElement = getElementSafely(selectElementId);
        if (selectElement) {
            // Clear previous options
            selectElement.innerHTML = '<option value="">Select Team Leader</option>';
            
            // Still add the special directors even on error
            const nileshOption = document.createElement('option');
            nileshOption.value = 'nilesh_sakpal_special';
            nileshOption.textContent = 'Mr. Nilesh Sakpal';
            selectElement.appendChild(nileshOption);
            
            const medhaOption = document.createElement('option');
            medhaOption.value = 'medha_sakpal_special';
            medhaOption.textContent = 'Mrs. Medha Sakpal';
            selectElement.appendChild(medhaOption);
            
            const errorOption = document.createElement('option');
            errorOption.value = '';
            errorOption.textContent = 'Error loading department team leaders';
            errorOption.disabled = true;
            selectElement.appendChild(errorOption);
        }
    }
}

async function fetchTeamLeaderName(teamLeaderId) {
    if (!teamLeaderId) return 'Not assigned';
    
    // Check for special directors first
    if (teamLeaderId === 'nilesh_sakpal_special') {
        return 'Mr. Nilesh Sakpal';
    }
    
    if (teamLeaderId === 'medha_sakpal_special') {
        return 'Mrs. Medha Sakpal';
    }
    
    try {
        // Check if we already have the user data in our loaded users
        const allUsers = window.users || [];
        const teamLeader = allUsers.find(user => user._id === teamLeaderId);
        
        if (teamLeader) {
            return `${teamLeader.firstName} ${teamLeader.lastName}`;
        }
        
        // If not found, try to fetch from API
        const userData = await apiClient.getUser(teamLeaderId);
        if (userData) {
            return `${userData.firstName} ${userData.lastName}`;
        }
        
        return 'Not assigned';
    } catch (error) {
        console.error('Error fetching team leader name:', error);
        return 'Not assigned';
    }
}

// ==================== OVERVIEW AND STATISTICS ====================

function updateOverviewCards() {
    const users = window.users || [];
    const totalUsers = users.length;
    const activeUsers = users.filter(u => u.status === 'active').length;
    const inactiveUsers = users.filter(u => u.status === 'inactive').length;
    
    // Safe element updates
    setElementTextSafely('totalUsers', totalUsers);
    setElementTextSafely('activeUsers', activeUsers);
    setElementTextSafely('InactiveUsers', inactiveUsers);
    
    console.log(`📈 Overview updated: ${totalUsers} total, ${activeUsers} active, ${inactiveUsers} inactive`);
}

// ==================== USER OPERATIONS ====================

async function addUser() {
    try {
        const form = getElementSafely('addUserForm');
        if (!form) {
            showNotification('Add user form not found', 'error');
            return;
        }
        
        const userData = extractFormData(form);
        const validation = validateUserData(userData, 'add');
        
        if (!validation.isValid) {
            showNotification(validation.message, 'error');
            return;
        }
        
        console.log('➕ Adding new user:', userData);
        
        showLoadingState(true);
        await apiClient.createUser(userData);
        
        await loadAllUsers();
        closeAddUserModal();
        showNotification('User added successfully! 🎉');
        
    } catch (error) {
        console.error('❌ Error adding user:', error);
        showNotification(error.message || 'Failed to add user', 'error');
    } finally {
        showLoadingState(false);
    }
}

async function openEditUserModal(userId) {
    try {
        console.log('📝 Loading user for edit:', userId);
        
        let user = await fetchUserData(userId);
        
        if (!user) {
            showNotification('User not found', 'error');
            return;
        }

        console.log('👤 User data for edit:', user);
        await populateEditForm(user);
        
        const modal = getElementSafely('editUserModal');
        if (modal) modal.style.display = 'block';
        
        console.log('✅ Edit modal opened successfully');
        
    } catch (error) {
        console.error('❌ Error loading user for edit:', error);
        showNotification('Failed to load user data', 'error');
    }
}

async function fetchUserData(userId) {
    try {
        // Try API first
        return await apiClient.getUser(userId);
    } catch (apiError) {
        console.log('🔍 API failed, searching in local data...');
        // Fallback to local data
        return window.users.find(u => u._id === userId);
    }
}

async function populateEditForm(user) {
    const safeUser = createSafeUserObject(user);
    
    // Populate form fields
    setElementValueSafely('editUserId', safeUser._id);
    setElementValueSafely('editEmployeeId', safeUser.employeeId);
    setElementValueSafely('editUsername', safeUser.username);
    setElementValueSafely('editFirstName', safeUser.firstName);
    setElementValueSafely('editLastName', safeUser.lastName);
    setElementValueSafely('editEmail', safeUser.email);
    setElementValueSafely('editPhone', safeUser.phone);
    setElementValueSafely('editRole', safeUser.role);
    setElementValueSafely('editDesignation', safeUser.designation);
    setElementValueSafely('editDepartment', safeUser.department);
    setElementValueSafely('editJoinDate', formatDateForInput(safeUser.joinDate));
    setElementValueSafely('editStatus', safeUser.status);
    
    // Populate team leader dropdown
    if (safeUser.department) {
        await populateTeamLeadersByDepartment(safeUser.department, 'editTeamLeader');
        
        // Set selected team leader if exists
        if (safeUser.teamLeader) {
            setTimeout(() => {
                // Handle special director IDs
                let teamLeaderValue = safeUser.teamLeader;
                if (typeof safeUser.teamLeader === 'object' && safeUser.teamLeader._id) {
                    teamLeaderValue = safeUser.teamLeader._id;
                }
                setElementValueSafely('editTeamLeader', teamLeaderValue);
            }, 100);
        }
    } else {
        // If no department, still populate with special directors
        await populateTeamLeadersByDepartment('', 'editTeamLeader');
    }
}

async function updateUser() {
    try {
        const form = getElementSafely('editUserForm');
        const userId = getElementValueSafely('editUserId');
        
        if (!form || !userId) {
            showNotification('Form or User ID not found', 'error');
            return;
        }
        
        const userData = extractFormData(form);
        const validation = validateUserData(userData, 'edit');
        
        if (!validation.isValid) {
            showNotification(validation.message, 'error');
            return;
        }
        
        console.log('✏️ Updating user with ID:', userId);
        console.log('📋 Update data:', userData);
        
        showLoadingState(true);
        
        // Handle special director IDs - convert to null for backend
        if (userData.teamLeader === 'nilesh_sakpal_special' || userData.teamLeader === 'medha_sakpal_special') {
            userData.teamLeader = null; // Send null to backend for special directors
        }
        
        const result = await apiClient.updateUser(userId, userData);
        
        console.log('✅ Update result:', result);
        
        await loadAllUsers();
        closeEditUserModal();
        showNotification('User updated successfully! ✅');
        
    } catch (error) {
        console.error('❌ Error updating user:', error);
        showNotification(error.message || 'Failed to update user', 'error');
    } finally {
        showLoadingState(false);
    }
}

async function openDeleteUserModal(userId) {
    try {
        const user = await fetchUserData(userId);
        
        if (!user) {
            showNotification('User not found', 'error');
            return;
        }

        const safeUser = createSafeUserObject(user);
        const userName = `${safeUser.firstName} ${safeUser.lastName}`.trim() || 'Unknown User';
        const userEmployeeId = safeUser.employeeId || 'No ID';
        
        setElementTextSafely('deleteUserName', `${userName} (${userEmployeeId})`);
        
        const modal = getElementSafely('deleteUserModal');
        if (modal) {
            modal.dataset.userId = userId;
            modal.style.display = 'block';
        }
        
    } catch (error) {
        console.error('❌ Error loading user for delete:', error);
        showNotification('Failed to load user data', 'error');
    }
}

async function confirmDeleteUser() {
    try {
        const modal = getElementSafely('deleteUserModal');
        const userId = modal ? modal.dataset.userId : null;
        
        if (!userId) {
            throw new Error('No user ID provided for deletion');
        }
        
        console.log('🗑️ Deleting user with ID:', userId);
        
        showLoadingState(true);
        await apiClient.deleteUser(userId);
        
        await loadAllUsers();
        closeDeleteUserModal();
        showNotification('User deleted successfully! 🗑️');
        
    } catch (error) {
        console.error('❌ Error deleting user:', error);
        showNotification(error.message || 'Failed to delete user', 'error');
    } finally {
        showLoadingState(false);
    }
}

// ==================== USER FILTERING AND SEARCH ====================

function filterUsers() {
    const searchTerm = getElementValueSafely('searchUsers').toLowerCase();
    const roleFilter = getElementValueSafely('filterRole');
    const statusFilter = getElementValueSafely('filterStatus');
    
    const users = window.users || [];
    const filteredUsers = users.filter(user => {
        return matchesSearch(user, searchTerm) && 
               matchesFilter(user, 'role', roleFilter) && 
               matchesFilter(user, 'status', statusFilter);
    });
    
    window.filteredUsers = filteredUsers;
    renderUserGrid(filteredUsers);
    
    console.log(`🔍 Filtered ${filteredUsers.length} users from ${users.length} total`);
}

function matchesSearch(user, searchTerm) {
    if (!searchTerm) return true;
    
    const searchFields = [
        user.firstName || '',
        user.lastName || '',
        user.employeeId || '',
        user.email || '',
        user.username || '',
        user.designation || '',
        user.department || ''
    ];
    
    return searchFields.some(field => 
        field.toLowerCase().includes(searchTerm)
    );
}

function matchesFilter(user, field, filterValue) {
    if (filterValue === 'all') return true;
    return user[field] === filterValue;
}

// ==================== VALIDATION UTILITIES ====================

function extractFormData(form) {
    const formData = new FormData(form);
    
    return {
        employeeId: formData.get('employeeId') || '',
        firstName: formData.get('firstName') || '',
        lastName: formData.get('lastName') || '',
        username: formData.get('username') || '',
        email: formData.get('email') || '',
        phone: formData.get('phone') || '',
        password: formData.get('password') || '',
        role: formData.get('role') || '',
        designation: formData.get('designation') || '',
        department: formData.get('department') || '',
        teamLeader: formData.get('teamLeader') || null,
        joinDate: formData.get('joinDate') || '',
        status: formData.get('status') || 'active'
    };
}

function validateUserData(userData, operation) {
    const requiredFields = ['employeeId', 'firstName', 'lastName', 'username', 'email', 'role'];
    
    if (operation === 'add') {
        requiredFields.push('password');
    }
    
    const missingFields = requiredFields.filter(field => !userData[field]);
    
    if (missingFields.length > 0) {
        return {
            isValid: false,
            message: `Please fill in all required fields: ${missingFields.join(', ')}`
        };
    }
    
    // Validate employee ID format
    if (!/^T\d+$/.test(userData.employeeId)) {
        return {
            isValid: false,
            message: 'Employee ID must start with T followed by numbers (e.g., T1040)'
        };
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (userData.email && !emailRegex.test(userData.email)) {
        return {
            isValid: false,
            message: 'Please enter a valid email address'
        };
    }
    
    // Validate password for new users
    if (operation === 'add' && userData.password.length < 4) {
        return {
            isValid: false,
            message: 'Password must be at least 4 characters long'
        };
    }
    
    return { isValid: true, message: '' };
}

// ==================== MODAL MANAGEMENT ====================

function openAddUserModal() {
    const modal = getElementSafely('addUserModal');
    if (modal) {
        // Clear form
        const form = getElementSafely('addUserForm');
        if (form) form.reset();
        
        // Clear team leader dropdown and populate with special directors
        const teamLeaderSelect = getElementSafely('teamLeader');
        if (teamLeaderSelect) {
            teamLeaderSelect.innerHTML = '<option value="">Select Team Leader</option>';
            
            // Add special directors immediately
            const nileshOption = document.createElement('option');
            nileshOption.value = 'nilesh_sakpal_special';
            nileshOption.textContent = 'Mr. Nilesh Sakpal';
            teamLeaderSelect.appendChild(nileshOption);
            
            const medhaOption = document.createElement('option');
            medhaOption.value = 'medha_sakpal_special';
            medhaOption.textContent = 'Mrs. Medha Sakpal';
            teamLeaderSelect.appendChild(medhaOption);
            
            // Show loading for department team leaders
            const loadingOption = document.createElement('option');
            loadingOption.value = '';
            loadingOption.textContent = 'Select department to load team leaders...';
            loadingOption.disabled = true;
            teamLeaderSelect.appendChild(loadingOption);
        }
        
        modal.style.display = 'block';
    }
}

function closeAddUserModal() {
    const modal = getElementSafely('addUserModal');
    const form = getElementSafely('addUserForm');
    
    if (modal) modal.style.display = 'none';
    if (form) form.reset();
}

function closeEditUserModal() {
    const modal = getElementSafely('editUserModal');
    if (modal) modal.style.display = 'none';
}

function closeDeleteUserModal() {
    const modal = getElementSafely('deleteUserModal');
    if (modal) {
        modal.style.display = 'none';
        modal.dataset.userId = '';
    }
}

// ==================== UTILITY FUNCTIONS ====================

function getElementSafely(id) {
    return document.getElementById(id);
}

function getElementValueSafely(id) {
    const element = getElementSafely(id);
    return element ? element.value : '';
}

function setElementValueSafely(id, value) {
    const element = getElementSafely(id);
    if (element) element.value = value;
}

function setElementTextSafely(id, text) {
    const element = getElementSafely(id);
    if (element) element.textContent = text;
}

function formatDateForInput(dateString) {
    if (!dateString) return '';
    
    try {
        const date = new Date(dateString);
        return date.toISOString().split('T')[0];
    } catch (e) {
        return dateString;
    }
}

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

// ==================== NOTIFICATION SYSTEM ====================

function showNotification(message, type = 'success') {
    try {
        // Remove existing notifications
        const existingNotifications = document.querySelectorAll('.user-management-notification');
        existingNotifications.forEach(notification => notification.remove());
        
        // Create new notification
        const notification = document.createElement('div');
        notification.className = `user-management-notification notification-${type}`;
        
        const icons = {
            success: '✅',
            error: '❌',
            warning: '⚠️',
            info: 'ℹ️'
        };
        
        notification.innerHTML = `
            <div class="notification-content">
                <span class="notification-icon">${icons[type] || icons.info}</span>
                <span class="notification-message">${message}</span>
            </div>
        `;
        
        const backgroundColor = type === 'error' ? '#ef4444' : 
                              type === 'warning' ? '#f59e0b' : 
                              type === 'info' ? '#3b82f6' : '#10b981';
        
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${backgroundColor};
            color: white;
            padding: 1rem 1.5rem;
            border-radius: 0.5rem;
            box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1);
            z-index: 10000;
            animation: slideInRight 0.3s ease;
            font-weight: 500;
            max-width: 400px;
            word-wrap: break-word;
            border-left: 4px solid rgba(255,255,255,0.3);
        `;
        
        document.body.appendChild(notification);
        
        // Auto remove after 4 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.style.animation = 'slideOutRight 0.3s ease';
                setTimeout(() => notification.remove(), 300);
            }
        }, 4000);
        
    } catch (error) {
        console.error('Error showing notification:', error);
        console.log(`📢 ${type.toUpperCase()}: ${message}`);
    }
}

// ==================== ADDITIONAL FEATURES ====================

async function viewUserDetails(userId) {
    try {
        const user = await fetchUserData(userId);
        if (!user) {
            showNotification('User not found', 'error');
            return;
        }
        
        const safeUser = createSafeUserObject(user);
        const modal = getElementSafely('userDetailsModal');
        
        if (modal) {
            // Populate details modal
            setElementTextSafely('detailUserName', `${safeUser.firstName} ${safeUser.lastName}`);
            setElementTextSafely('detailUserEmail', safeUser.email);
            setElementTextSafely('detailUserEmployeeId', safeUser.employeeId);
            setElementTextSafely('detailUserRole', safeUser.role);
            setElementTextSafely('detailUserDepartment', safeUser.department);
            setElementTextSafely('detailUserDesignation', safeUser.designation);
            setElementTextSafely('detailUserStatus', safeUser.status);
            setElementTextSafely('detailUserJoinDate', formatJoinDate(safeUser.joinDate));
            setElementTextSafely('detailUserPhone', safeUser.phone || 'Not provided');
            
            modal.style.display = 'block';
        }
        
    } catch (error) {
        console.error('Error viewing user details:', error);
        showNotification('Failed to load user details', 'error');
    }
}

function exportUsers() {
    try {
        const users = window.filteredUsers || window.users || [];
        if (users.length === 0) {
            showNotification('No users to export', 'warning');
            return;
        }
        
        const csvContent = convertToCSV(users);
        downloadCSV(csvContent, `users_export_${new Date().toISOString().split('T')[0]}.csv`);
        
        showNotification(`Exported ${users.length} users successfully`, 'success');
        
    } catch (error) {
        console.error('Error exporting users:', error);
        showNotification('Failed to export users', 'error');
    }
}

function convertToCSV(users) {
    const headers = ['Employee ID', 'First Name', 'Last Name', 'Email', 'Role', 'Department', 'Team Leader', 'Status', 'Join Date'];
    const rows = users.map(user => [
        user.employeeId || '',
        user.firstName || '',
        user.lastName || '',
        user.email || '',
        user.role || '',
        user.department || '',
        user.teamLeaderName || 'Not assigned',
        user.status || '',
        formatJoinDate(user.joinDate)
    ]);
    
    return [headers, ...rows]
        .map(row => row.map(field => `"${field}"`).join(','))
        .join('\n');
}

function downloadCSV(content, filename) {
    const blob = new Blob([content], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
}

function closeUserDetailsModal() {
    const modal = getElementSafely('userDetailsModal');
    if (modal) modal.style.display = 'none';
}

function editUserFromDetails() {
    const modal = getElementSafely('userDetailsModal');
    if (modal) modal.style.display = 'none';
    
    // Get the user ID from somewhere - you might need to store it
    // This is a simplified approach
    const userId = window.currentViewingUserId;
    if (userId) {
        openEditUserModal(userId);
    }
}

// ==================== GLOBAL FUNCTION EXPORTS ====================

window.openEditUserModal = openEditUserModal;
window.openDeleteUserModal = openDeleteUserModal;
window.confirmDeleteUser = confirmDeleteUser;
window.openAddUserModal = openAddUserModal;
window.closeAddUserModal = closeAddUserModal;
window.closeEditUserModal = closeEditUserModal;
window.closeDeleteUserModal = closeDeleteUserModal;
window.filterUsers = filterUsers;
window.loadAllUsers = loadAllUsers;
window.viewUserDetails = viewUserDetails;
window.exportUsers = exportUsers;

console.log('✅ Enhanced User Management Script loaded successfully with Team Leader functionality');