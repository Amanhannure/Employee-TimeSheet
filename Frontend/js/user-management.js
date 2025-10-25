document.addEventListener('DOMContentLoaded', async function() {
    try {
        await loadUsers();
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
});

async function loadUsers() {
    try {
        const users = await apiClient.getUsers();
        window.users = users;
        
        const grid = document.getElementById('usersGrid');
        grid.innerHTML = '';
        
        users.forEach(user => {
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
    
    card.innerHTML = `
        <div class="user-header">
            <div>
                <h3 class="user-name">${user.firstName} ${user.lastName}</h3>
                <p class="user-email">${user.email}</p>
            </div>
            <span class="user-role role-${user.role}">${user.role}</span>
        </div>
        
        <div class="user-stats">
            <div class="stat-item">
                <div class="stat-label">Employee ID</div>
                <div class="stat-value">${user.employeeId}</div>
            </div>
            <div class="stat-item">
                <div class="stat-label">Department</div>
                <div class="stat-value">${user.department || 'N/A'}</div>
            </div>
        </div>
        
        <div class="user-actions-card">
            <button class="btn-small btn-edit" onclick="openEditUserModal('${user._id}')">
                <i class="fas fa-edit"></i> Edit
            </button>
            <button class="btn-small btn-delete" onclick="openDeleteUserModal('${user._id}')">
                <i class="fas fa-trash"></i> Delete
            </button>
        </div>
    `;
    
    return card;
}

function updateOverviewCards() {
    const totalUsers = window.users?.length || 0;
    const activeUsers = window.users?.filter(u => u.status === 'active').length || 0;
    const inactiveUsers = window.users?.filter(u => u.status === 'inactive').length || 0;
    
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
            department: formData.get('department'),
            joinDate: formData.get('joinDate')
        };
        
        await apiClient.createUser(userData);
        await loadUsers();
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
        const user = await apiClient.getUser(userId);
        if (!user) {
            showNotification('User not found', 'error');
            return;
        }

        document.getElementById('editUserId').value = user._id;
        document.getElementById('editFirstName').value = user.firstName || '';
        document.getElementById('editLastName').value = user.lastName || '';
        document.getElementById('editEmployeeId').value = user.employeeId || '';
        document.getElementById('editUsername').value = user.username || '';
        document.getElementById('editEmail').value = user.email || '';
        document.getElementById('editPhone').value = user.phone || '';
        document.getElementById('editDepartment').value = user.department || '';
        document.getElementById('editRole').value = user.role || 'employee';
        document.getElementById('editJoinDate').value = user.joinDate ? user.joinDate.split('T')[0] : '';
        
        document.getElementById('editUserModal').style.display = 'block';
        console.log('Edit modal opened for user:', user);
    } catch (error) {
        console.error('Error loading user for edit:', error);
        showNotification('Failed to load user data', 'error');
    }
}

async function updateUser() {
    try {
        const form = document.getElementById('editUserForm');
        const formData = new FormData(form);
        
        // FIX: Get user ID directly from the hidden input
        const userId = document.getElementById('editUserId').value;
        
        if (!userId) {
            throw new Error('User ID is required');
        }
        
        const userData = {
            firstName: formData.get('firstName'),
            lastName: formData.get('lastName'),
            employeeId: formData.get('employeeId'),
            username: formData.get('username'),
            email: formData.get('email'),
            phone: formData.get('phone'),
            role: formData.get('role'),
            department: formData.get('department'),
            joinDate: formData.get('joinDate')
        };
        
        console.log('Updating user with ID:', userId);
        console.log('Update data:', userData);
        
        const result = await apiClient.updateUser(userId, userData);
        console.log('Update result:', result);
        
        await loadUsers();
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
        const user = await apiClient.getUser(userId);
        if (!user) return;

        document.getElementById('deleteUserName').textContent = `${user.firstName} ${user.lastName}`;
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
        await apiClient.deleteUser(userId);
        await loadUsers();
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
    
    const filteredUsers = (window.users || []).filter(user => {
        const matchesSearch = user.firstName.toLowerCase().includes(searchTerm) ||
                            user.lastName.toLowerCase().includes(searchTerm) ||
                            user.employeeId.toLowerCase().includes(searchTerm) || 
                            user.email.toLowerCase().includes(searchTerm) ||
                            user.username.toLowerCase().includes(searchTerm);
        const matchesRole = roleFilter === 'all' || user.role === roleFilter;
        return matchesSearch && matchesRole;
    });
    
    const grid = document.getElementById('usersGrid');
    grid.innerHTML = '';
    
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
}

function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.className = 'notification';
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
        notification.remove();
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