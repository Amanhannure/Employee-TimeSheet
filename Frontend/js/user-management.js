// Modern User Management JavaScript

// Sample initial users data
window.users = [
    {
        id: 1,
        firstName: "Keshav",
        lastName: "Mane",
        employeeId: "EMP001",
        username: "keshav.mane",
        email: "keshav.mane@company.com",
        phone: "+1234567890",
        role: "admin",
        department: "IT",
        joinDate: "2023-01-15",
        status: "active"
    },
    {
        id: 2,
        firstName: "Jane",
        lastName: "Smith",
        employeeId: "EMP002",
        username: "jane.smith",
        email: "jane.smith@company.com",
        phone: "+1234567891",
        role: "manager",
        department: "HR",
        joinDate: "2023-02-20",
        status: "active"
    },
    {
        id: 3,
        firstName: "Mike",
        lastName: "Johnson",
        employeeId: "EMP003",
        username: "mike.johnson",
        email: "mike.johnson@company.com",
        phone: "+1234567892",
        role: "employee",
        department: "Process",
        joinDate: "2023-03-10",
        status: "active"
    }
];

// Initialize the page
document.addEventListener('DOMContentLoaded', function() {
    loadUsers();
    updateOverviewCards();
    
    // Form submission handlers
    document.getElementById('addUserForm').addEventListener('submit', function(e) {
        e.preventDefault();
        addUser();
    });
    
    document.getElementById('editUserForm').addEventListener('submit', function(e) {
        e.preventDefault();
        updateUser();
    });
    
    // Search and filter handlers
    document.getElementById('searchUsers').addEventListener('input', filterUsers);
    document.getElementById('filterRole').addEventListener('change', filterUsers);
});

// Toggle modals
function openAddUserModal() {
    document.getElementById('addUserModal').style.display = 'block';
}

function closeAddUserModal() {
    document.getElementById('addUserModal').style.display = 'none';
    document.getElementById('addUserForm').reset();
}

function openEditUserModal(userId) {
    const user = users.find(u => u.id === userId);
    if (user) {
        document.getElementById('editUserId').value = user.id;
        document.getElementById('editFirstName').value = user.firstName;
        document.getElementById('editLastName').value = user.lastName;
        document.getElementById('editEmployeeId').value = user.employeeId;
        document.getElementById('editUsername').value = user.username;
        document.getElementById('editEmail').value = user.email;
        document.getElementById('editPhone').value = user.phone;
        document.getElementById('editDepartment').value = user.department;
        document.getElementById('editRole').value = user.role;
        document.getElementById('editJoinDate').value = user.joinDate;
        document.getElementById('editUserModal').style.display = 'block';
    }
}

function closeEditUserModal() {
    document.getElementById('editUserModal').style.display = 'none';
}

function openDeleteUserModal(userId) {
    const user = users.find(u => u.id === userId);
    if (user) {
        document.getElementById('deleteUserName').textContent = `${user.firstName} ${user.lastName}`;
        document.getElementById('deleteUserModal').dataset.userId = userId;
        document.getElementById('deleteUserModal').style.display = 'block';
    }
}

function closeDeleteUserModal() {
    document.getElementById('deleteUserModal').style.display = 'none';
}

// Load and display users
function loadUsers() {
    const grid = document.getElementById('usersGrid');
    grid.innerHTML = '';
    
    users.forEach(user => {
        const card = createUserCard(user);
        grid.appendChild(card);
    });
}

// Create user card HTML
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
                <div class="stat-label">Username</div>
                <div class="stat-value">${user.username}</div>
            </div>
            <div class="stat-item">
                <div class="stat-label">Department</div>
                <div class="stat-value">${user.department}</div>
            </div>
        </div>
        
        <div class="user-actions-card">
            <button class="btn-small btn-edit" onclick="openEditUserModal(${user.id})">
                <i class="fas fa-edit"></i> Edit
            </button>
            <button class="btn-small btn-delete" onclick="openDeleteUserModal(${user.id})">
                <i class="fas fa-trash"></i> Delete
            </button>
        </div>
    `;
    
    return card;
}

// Update overview cards
function updateOverviewCards() {
    const totalUsers = users.length;
    const activeUsers = users.filter(u => u.status === 'active').length;
    const inactiveUsers = users.filter(u => u.status === 'inactive').length;
    
    document.getElementById('totalUsers').textContent = totalUsers;
    document.getElementById('activeUsers').textContent = activeUsers;
    document.getElementById('inactiveUsers').textContent = inactiveUsers;
}

// Add new user
function addUser() {
    const form = document.getElementById('addUserForm');
    const formData = new FormData(form);
    
    const newUser = {
        id: users.length + 1,
        firstName: formData.get('firstName'),
        lastName: formData.get('lastName'),
        employeeId: formData.get('employeeId'),
        email: formData.get('email'),
        phone: formData.get('phone'),
        password: formData.get('password'),
        role: formData.get('role'),
        department: formData.get('department'),
        joinDate: formData.get('joinDate'),
        status: 'active'
    };
    
    users.push(newUser);
    loadUsers();
    updateOverviewCards();
    closeAddUserModal();
    showNotification('User added successfully!');
}

// Update user
function updateUser() {
    const form = document.getElementById('editUserForm');
    const formData = new FormData(form);
    const userId = parseInt(formData.get('userId'));
    
    const userIndex = users.findIndex(u => u.id === userId);
    if (userIndex !== -1) {
        users[userIndex].firstName = formData.get('firstName');
        users[userIndex].lastName = formData.get('lastName');
        users[userIndex].employeeId = formData.get('employeeId');
        users[userIndex].username = formData.get('username');
        users[userIndex].email = formData.get('email');
        users[userIndex].phone = formData.get('phone');
        users[userIndex].role = formData.get('role');
        users[userIndex].department = formData.get('department');
        users[userIndex].joinDate = formData.get('joinDate');
        
        loadUsers();
        updateOverviewCards();
        closeEditUserModal();
        showNotification('User updated successfully!');
    }
}

// Delete user
function confirmDeleteUser() {
    const userId = parseInt(document.getElementById('deleteUserModal').dataset.userId);
    users = users.filter(u => u.id !== userId);
    loadUsers();
    updateOverviewCards();
    closeDeleteUserModal();
    showNotification('User deleted successfully!');
}

// Filter users
function filterUsers() {
    const searchTerm = document.getElementById('searchUsers').value.toLowerCase();
    const roleFilter = document.getElementById('filterRole').value;
    
    const filteredUsers = users.filter(user => {
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

// Show notification
function showNotification(message) {
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #10b981;
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

// Toggle sidebar functionality
document.getElementById('toggle-sidebar').addEventListener('click', function() {
    document.querySelector('.dashboard-container').classList.toggle('sidebar-collapsed');
});

// Close modals when clicking outside
window.onclick = function(event) {
    if (event.target.classList.contains('modal')) {
        event.target.style.display = 'none';
    }
};

// Add CSS animation for notifications
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
`;
document.head.appendChild(style);