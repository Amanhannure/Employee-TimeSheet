document.addEventListener('DOMContentLoaded', async function() {
    try {
        await loadAllUsers();
        updateOverviewCards();
    } catch (error) {
        console.error('Failed to load users:', error);
        showNotification('Failed to load users data', 'error');
    }
    
    document.getElementById('addUserForm').addEventListener('submit', function(e) {
        e.preventDefault();
        addUser();
    });
    
    document.getElementById('editUserForm').addEventListener('submit', function(e) {
        e.preventDefault();
        updateUser();
    });
    
    document.getElementById('searchUsers').addEventListener('input', filterUsers);
    document.getElementById('filterRole').addEventListener('change', filterUsers);
    document.getElementById('filterStatus').addEventListener('change', filterUsers);
});

async function loadAllUsers() {
    try {
        let allUsers = [];
        let currentPage = 1;
        let totalPages = 1;
        
        // Fetch all pages until we have all users
        do {
            console.log(`Fetching page ${currentPage} of users...`);
            const response = await apiClient.getUsers({ page: currentPage, pageSize: 50 });
            
            // Extract users from current page
            const users = response.users || [];
            allUsers = [...allUsers, ...users];
            
            // Update pagination info
            totalPages = response.totalPages || 1;
            currentPage++;
            
            console.log(`Fetched ${users.length} users from page ${currentPage - 1}, total so far: ${allUsers.length}`);
            
        } while (currentPage <= totalPages);
        
        window.users = allUsers;
        
        console.log(`✅ Successfully loaded all ${allUsers.length} users from ${totalPages} pages`);
        
        const grid = document.getElementById('usersGrid');
        grid.innerHTML = '';
        
        if (allUsers.length === 0) {
            grid.innerHTML = '<div class="no-users">No users found</div>';
            return;
        }
        
        allUsers.forEach(user => {
            const card = createUserCard(user);
            grid.appendChild(card);
        });
        
    } catch (error) {
        console.error('Error loading users:', error);
        throw error;
    }
}

function createUserCard(user) {
    const card = document.createElement('div');
    card.className = 'user-card';
    
    // Ensure all properties have fallbacks to prevent undefined errors
    const safeUser = {
        _id: user._id || '',
        employeeId: user.employeeId || 'N/A',
        firstName: user.firstName || 'Unknown',
        lastName: user.lastName || 'User',
        email: user.email || 'No email',
        username: user.username || 'N/A',
        role: user.role || 'employee',
        designation: user.designation || 'Not specified',
        department: user.department || 'Not assigned',
        status: user.status || 'active',
        phone: user.phone || 'N/A'
    };
    
    card.innerHTML = `
        <div class="user-header">
            <div>
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
                <div class="stat-label">Status</div>
                <div class="stat-value status-${safeUser.status}">${safeUser.status}</div>
            </div>
        </div>
        
        <div class="user-actions-card">
            <button class="btn-small btn-edit" onclick="openEditUserModal('${safeUser._id}')">
                <i class="fas fa-edit"></i> Edit
            </button>
            <button class="btn-small btn-delete" onclick="openDeleteUserModal('${safeUser._id}')">
                <i class="fas fa-trash"></i> Delete
            </button>
        </div>
    `;
    
    return card;
}

function updateOverviewCards() {
    const users = window.users || [];
    const totalUsers = users.length;
    const activeUsers = users.filter(u => u.status === 'active').length;
    const inactiveUsers = users.filter(u => u.status === 'inactive').length;
    
    document.getElementById('totalUsers').textContent = totalUsers;
    document.getElementById('activeUsers').textContent = activeUsers;
    document.getElementById('InactiveUsers').textContent = inactiveUsers;
}

async function addUser() {
    try {
        const form = document.getElementById('addUserForm');
        const formData = new FormData(form);
        
        const userData = {
            employeeId: formData.get('employeeId'),
            firstName: formData.get('firstName'),
            lastName: formData.get('lastName'),
            username: formData.get('username'),
            email: formData.get('email'),
            phone: formData.get('phone'),
            password: formData.get('password'),
            role: formData.get('role'),
            designation: formData.get('designation'),
            department: formData.get('department'),
            joinDate: formData.get('joinDate'),
            status: formData.get('status') || 'active'
        };
        
        // Validate required fields
        const requiredFields = ['employeeId', 'firstName', 'lastName', 'username', 'email', 'password', 'role'];
        const missingFields = requiredFields.filter(field => !userData[field]);
        
        if (missingFields.length > 0) {
            showNotification(`Please fill in all required fields: ${missingFields.join(', ')}`, 'error');
            return;
        }
        
        // Validate employee ID format
        if (!/^T\d+$/.test(userData.employeeId)) {
            showNotification('Employee ID must start with T followed by numbers (e.g., T1040)', 'error');
            return;
        }
        
        // Validate password length
        if (userData.password.length < 4) {
            showNotification('Password must be at least 4 characters long', 'error');
            return;
        }
        
        await apiClient.registerUser(userData);
        await loadAllUsers();
        updateOverviewCards();
        closeAddUserModal();
        showNotification('User added successfully!');
    } catch (error) {
        console.error('Error adding user:', error);
        showNotification(error.message || 'Failed to add user', 'error');
    }
}

async function openEditUserModal(userId) {
    try {
        console.log('Loading user for edit:', userId);
        
        let user;
        try {
            // Try to get user from API
            user = await apiClient.getUser(userId);
        } catch (error) {
            console.log('getUser failed, trying alternative method...');
            // If API fails, find user in loaded data
            user = window.users.find(u => u._id === userId);
        }
        
        if (!user) {
            showNotification('User not found', 'error');
            return;
        }

        console.log('User data for edit:', user);

        // Populate all form fields according to schema
        document.getElementById('editUserId').value = user._id;
        document.getElementById('editEmployeeId').value = user.employeeId || '';
        document.getElementById('editUsername').value = user.username || '';
        document.getElementById('editFirstName').value = user.firstName || '';
        document.getElementById('editLastName').value = user.lastName || '';
        document.getElementById('editEmail').value = user.email || '';
        document.getElementById('editPhone').value = user.phone || '';
        document.getElementById('editRole').value = user.role || 'employee';
        document.getElementById('editDesignation').value = user.designation || '';
        document.getElementById('editDepartment').value = user.department || '';
        document.getElementById('editJoinDate').value = user.joinDate ? user.joinDate.split('T')[0] : '';
        document.getElementById('editStatus').value = user.status || 'active';
        
        document.getElementById('editUserModal').style.display = 'block';
        console.log('Edit modal opened successfully');
    } catch (error) {
        console.error('Error loading user for edit:', error);
        showNotification('Failed to load user data', 'error');
    }
}

async function updateUser() {
    try {
        const form = document.getElementById('editUserForm');
        const formData = new FormData(form);
        
        const userId = document.getElementById('editUserId').value;
        
        if (!userId) {
            throw new Error('User ID is required');
        }
        
        const userData = {
            employeeId: formData.get('employeeId'),
            firstName: formData.get('firstName'),
            lastName: formData.get('lastName'),
            username: formData.get('username'),
            email: formData.get('email'),
            phone: formData.get('phone'),
            role: formData.get('role'),
            designation: formData.get('designation'),
            department: formData.get('department'),
            joinDate: formData.get('joinDate'),
            status: formData.get('status')
        };
        
        console.log('Updating user with ID:', userId);
        console.log('Update data:', userData);
        
        // Try different update methods
        let result;
        try {
            // First try updateUser
            result = await apiClient.updateUser(userId, userData);
        } catch (error) {
            console.log('updateUser failed, trying updateUserRole...');
            // If updateUser doesn't work, try updateUserRole
            result = await apiClient.updateUserRole(userId, userData);
        }
        
        console.log('Update result:', result);
        
        await loadAllUsers();
        updateOverviewCards();
        closeEditUserModal();
        showNotification('User updated successfully!');
    } catch (error) {
        console.error('Error updating user:', error);
        showNotification(error.message || 'Failed to update user', 'error');
    }
}

async function openDeleteUserModal(userId) {
    try {
        let user;
        try {
            user = await apiClient.getUser(userId);
        } catch (error) {
            user = window.users.find(u => u._id === userId);
        }
        
        if (!user) {
            showNotification('User not found', 'error');
            return;
        }

        document.getElementById('deleteUserName').textContent = `${user.firstName || ''} ${user.lastName || ''} (${user.employeeId || ''})`.trim();
        document.getElementById('deleteUserModal').dataset.userId = userId;
        document.getElementById('deleteUserModal').style.display = 'block';
    } catch (error) {
        console.error('Error loading user for delete:', error);
        showNotification('Failed to load user data', 'error');
    }
}

async function confirmDeleteUser() {
    try {
        const userId = document.getElementById('deleteUserModal').dataset.userId;
        if (!userId) {
            throw new Error('No user ID provided for deletion');
        }
        
        await apiClient.deleteUser(userId);
        await loadAllUsers();
        updateOverviewCards();
        closeDeleteUserModal();
        showNotification('User deleted successfully!');
    } catch (error) {
        console.error('Error deleting user:', error);
        showNotification(error.message || 'Failed to delete user', 'error');
    }
}

function filterUsers() {
    const searchTerm = document.getElementById('searchUsers').value.toLowerCase();
    const roleFilter = document.getElementById('filterRole').value;
    const statusFilter = document.getElementById('filterStatus').value;
    
    const filteredUsers = (window.users || []).filter(user => {
        const searchFields = [
            user.firstName || '',
            user.lastName || '',
            user.employeeId || '',
            user.email || '',
            user.username || '',
            user.designation || '',
            user.department || ''
        ];
        
        const matchesSearch = searchFields.some(field => 
            field.toLowerCase().includes(searchTerm)
        );
        const matchesRole = roleFilter === 'all' || user.role === roleFilter;
        const matchesStatus = statusFilter === 'all' || user.status === statusFilter;
        
        return matchesSearch && matchesRole && matchesStatus;
    });
    
    const grid = document.getElementById('usersGrid');
    grid.innerHTML = '';
    
    if (filteredUsers.length === 0) {
        grid.innerHTML = '<div class="no-users">No users match your search criteria</div>';
        return;
    }
    
    filteredUsers.forEach(user => {
        const card = createUserCard(user);
        grid.appendChild(card);
    });
}

function openAddUserModal() {
    document.getElementById('addUserModal').style.display = 'block';
}

function closeAddUserModal() {
    document.getElementById('addUserModal').style.display = 'none';
    document.getElementById('addUserForm').reset();
}

function closeEditUserModal() {
    document.getElementById('editUserModal').style.display = 'none';
}

function closeDeleteUserModal() {
    document.getElementById('deleteUserModal').style.display = 'none';
    document.getElementById('deleteUserModal').dataset.userId = '';
}

function showNotification(message, type = 'success') {
    const existingNotifications = document.querySelectorAll('.notification');
    existingNotifications.forEach(notification => notification.remove());
    
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    
    const backgroundColor = type === 'error' ? '#ef4444' : '#10b981';
    
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${backgroundColor};
        color: white;
        padding: 1rem 1.5rem;
        border-radius: 0.5rem;
        box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
        z-index: 1000;
        animation: slideIn 0.3s ease;
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        if (notification.parentNode) {
            notification.remove();
        }
    }, 3000);
}

// Add CSS for animations and styling
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    .no-users {
        text-align: center;
        padding: 3rem;
        color: #6b7280;
        font-style: italic;
        grid-column: 1 / -1;
        font-size: 1.1rem;
        background: #f9fafb;
        border-radius: 0.5rem;
        margin: 1rem 0;
    }
    
    .users-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
        gap: 1.5rem;
        margin-top: 1rem;
    }
    
    .user-card {
        background: white;
        border-radius: 0.75rem;
        padding: 1.5rem;
        box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1);
        border: 1px solid #e5e7eb;
        transition: all 0.2s ease;
    }
    
    .user-card:hover {
        box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
        transform: translateY(-2px);
    }
    
    .user-employee-id {
        font-size: 0.875rem;
        color: #6b7280;
        margin: 0.25rem 0;
    }
    
    .status-active {
        color: #10b981;
        font-weight: 600;
    }
    
    .status-inactive {
        color: #ef4444;
        font-weight: 600;
    }
    
    .status-probation {
        color: #f59e0b;
        font-weight: 600;
    }
    
    .status-on notice period {
        color: #8b5cf6;
        font-weight: 600;
    }
    
    .status-resigned {
        color: #6b7280;
        font-weight: 600;
    }
    
    .role-admin {
        background: #ef4444;
        color: white;
    }
    
    .role-manager {
        background: #f59e0b;
        color: white;
    }
    
    .role-employee {
        background: #10b981;
        color: white;
    }
    
    .user-role {
        padding: 0.25rem 0.75rem;
        border-radius: 1rem;
        font-size: 0.75rem;
        font-weight: 600;
        text-transform: capitalize;
    }
    
    .input-hint {
        display: block;
        font-size: 0.75rem;
        color: #6b7280;
        margin-top: 0.25rem;
    }
    
    .password-hint {
        display: block;
        font-size: 0.75rem;
        color: #6b7280;
        margin-top: 0.25rem;
    }
    
    .search-filter {
        display: flex;
        gap: 1rem;
        align-items: center;
    }
    
    .search-filter input,
    .search-filter select {
        padding: 0.5rem 0.75rem;
        border: 1px solid #d1d5db;
        border-radius: 0.375rem;
        font-size: 0.875rem;
    }
    
    .search-filter input {
        width: 250px;
    }
`;
document.head.appendChild(style);

document.getElementById('toggle-sidebar').addEventListener('click', function() {
    document.querySelector('.dashboard-container').classList.toggle('sidebar-collapsed');
});

window.onclick = function(event) {
    if (event.target.classList.contains('modal')) {
        event.target.style.display = 'none';
    }
};

// Make functions globally available
window.openEditUserModal = openEditUserModal;
window.openDeleteUserModal = openDeleteUserModal;
window.confirmDeleteUser = confirmDeleteUser;
window.openAddUserModal = openAddUserModal;
window.closeAddUserModal = closeAddUserModal;
window.closeEditUserModal = closeEditUserModal;
window.closeDeleteUserModal = closeDeleteUserModal;
window.filterUsers = filterUsers;
window.loadAllUsers = loadAllUsers;