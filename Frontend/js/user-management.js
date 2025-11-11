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
        console.log('Starting to load all users...');
        
        // Just fetch the first page since pagination isn't working properly
        console.log('Fetching users...');
        const users = await apiClient.getUsers({ page: 1, pageSize: 1000 });
        
        console.log('API Response:', users?.length || 0, 'users');
        
        // Remove duplicates based on _id since pagination might return same data
        const uniqueUsers = [];
        const seenIds = new Set();
        
        if (users && users.length > 0) {
            users.forEach(user => {
                if (user._id && !seenIds.has(user._id)) {
                    seenIds.add(user._id);
                    uniqueUsers.push(user);
                }
            });
        }
        
        window.users = uniqueUsers;
        
        console.log(`✅ Successfully loaded ${uniqueUsers.length} unique users`);
        
        const grid = document.getElementById('usersGrid');
        grid.innerHTML = '';
        
        if (uniqueUsers.length === 0) {
            grid.innerHTML = '<div class="no-users">No users found</div>';
            return;
        }
        
        uniqueUsers.forEach(user => {
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
        phone: user.phone || 'N/A',
        joinDate: user.joinDate || ''
    };
    
    // Format join date if available
    let formattedDate = 'Not set';
    if (safeUser.joinDate) {
        try {
            const date = new Date(safeUser.joinDate);
            formattedDate = date.toLocaleDateString();
        } catch (e) {
            formattedDate = safeUser.joinDate;
        }
    }
    
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
                <div class="stat-label">Join Date</div>
                <div class="stat-value">${formattedDate}</div>
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
    
    console.log(`Overview updated: ${totalUsers} total, ${activeUsers} active, ${inactiveUsers} inactive`);
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
        
        console.log('Adding new user:', userData);
        await apiClient.register(userData);
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
            // Use the correct API client method
            user = await apiClient.getUserById(userId);
        } catch (error) {
            console.log('getUserById failed, trying alternative method...');
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
        
        // Handle join date formatting
        let joinDateValue = '';
        if (user.joinDate) {
            try {
                const date = new Date(user.joinDate);
                joinDateValue = date.toISOString().split('T')[0];
            } catch (e) {
                joinDateValue = user.joinDate;
            }
        }
        document.getElementById('editJoinDate').value = joinDateValue;
        
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
        
        // Use the correct API client method
        const result = await apiClient.updateUser(userId, userData);
        
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
            user = await apiClient.getUserById(userId);
        } catch (error) {
            user = window.users.find(u => u._id === userId);
        }
        
        if (!user) {
            showNotification('User not found', 'error');
            return;
        }

        const userName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Unknown User';
        const userEmployeeId = user.employeeId || 'No ID';
        
        document.getElementById('deleteUserName').textContent = `${userName} (${userEmployeeId})`;
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
        
        console.log('Deleting user with ID:', userId);
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
    
    const users = window.users || [];
    const filteredUsers = users.filter(user => {
        const searchFields = [
            user.firstName || '',
            user.lastName || '',
            user.employeeId || '',
            user.email || '',
            user.username || '',
            user.designation || '',
            user.department || ''
        ];
        
        const matchesSearch = searchTerm === '' || searchFields.some(field => 
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
    
    console.log(`Filtered ${filteredUsers.length} users from ${users.length} total`);
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
        font-weight: 500;
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        if (notification.parentNode) {
            notification.remove();
        }
    }, 3000);
}

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