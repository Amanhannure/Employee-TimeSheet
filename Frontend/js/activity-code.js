document.addEventListener('DOMContentLoaded', function() {
    const activityGrid = document.getElementById('activityGrid');
    const searchInput = document.getElementById('searchActivity');
    const addActivityModal = document.getElementById('addActivityModal');
    const addActivityForm = document.getElementById('addActivityForm');
    const departmentSelect = document.getElementById('departmentSelect');
    const activityCodesHeader = document.getElementById('activityCodesHeader');

    let activityCodes = [];

    departmentSelect.addEventListener('change', async function() {
        searchInput.value = '';
        await loadActivityCodes();
    });

    searchInput.addEventListener('input', filterAndRender);

    window.openAddActivityModal = function() {
        if (!departmentSelect.value) {
            alert('Please select a department first.');
            return;
        }
        addActivityModal.style.display = 'block';
        addActivityForm.activityCategory.value = departmentSelect.value;
    };

    window.closeAddActivityModal = function() {
        addActivityModal.style.display = 'none';
        addActivityForm.reset();
    };

    addActivityForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        const code = this.activityCode.value.trim();
        const name = this.activityName.value.trim();
        const description = this.activityDescription?.value.trim() || '';
        const category = this.activityCategory.value.trim();

        if (!code || !name) {
            alert('Please fill in required fields.');
            return;
        }

        try {
            await apiClient.createActivityCode({
                code: code,
                name: name,
                description: description,
                department: category
            });

            await loadActivityCodes();
            closeAddActivityModal();
            showNotification('Activity code added successfully!');
        } catch (error) {
            console.error('Error adding activity code:', error);
            showNotification(error.message || 'Failed to add activity code', 'error');
        }
    });

    window.onclick = function(event) {
        if (event.target == addActivityModal) {
            closeAddActivityModal();
        }
    };

    activityGrid.style.display = 'none';
    activityCodesHeader.style.display = 'none';
});

async function loadActivityCodes() {
    const departmentSelect = document.getElementById('departmentSelect');
    const activityGrid = document.getElementById('activityGrid');
    const activityCodesHeader = document.getElementById('activityCodesHeader');
    
    const selectedDept = departmentSelect.value;

    if (!selectedDept) {
        activityGrid.style.display = 'none';
        activityCodesHeader.style.display = 'none';
        return;
    }

    try {
        const codes = await apiClient.getActivityCodes(selectedDept);
        window.activityCodes = codes;
        renderActivityCodes(codes);
        
        activityGrid.style.display = 'block';
        activityCodesHeader.style.display = 'flex';
    } catch (error) {
        console.error('Error loading activity codes:', error);
        showNotification('Failed to load activity codes', 'error');
    }
}

function renderActivityCodes(codes) {
    const activityGrid = document.getElementById('activityGrid');
    activityGrid.innerHTML = '';
    
    if (codes.length === 0) {
        activityGrid.innerHTML = '<p>No activity codes found.</p>';
        return;
    }
    
    codes.forEach((code, idx) => {
        const div = document.createElement('div');
        div.classList.add('activity-code-item');
        div.innerHTML = `
            <p><strong>${code.code}:</strong> ${code.name}</p>
            <button class="btn-delete" data-id="${code._id}">
                <i class="fas fa-trash"></i> Delete
            </button>
        `;
        activityGrid.appendChild(div);
    });

    activityGrid.querySelectorAll('.btn-delete').forEach(btn => {
        btn.addEventListener('click', async function() {
            const codeId = this.getAttribute('data-id');
            const codeToDelete = codes.find(c => c._id === codeId);
            
            if (confirm(`Are you sure you want to delete activity code "${codeToDelete.code}: ${codeToDelete.name}"?`)) {
                try {
                    await apiClient.deleteActivityCode(codeId);
                    await loadActivityCodes();
                    showNotification('Activity code deleted successfully!');
                } catch (error) {
                    console.error('Error deleting activity code:', error);
                    showNotification(error.message || 'Failed to delete activity code', 'error');
                }
            }
        });
    });
}

function filterAndRender() {
    const searchInput = document.getElementById('searchActivity');
    const departmentSelect = document.getElementById('departmentSelect');
    const query = searchInput.value.toLowerCase();
    const selectedDept = departmentSelect.value;

    const filtered = window.activityCodes.filter(code =>
        code.department === selectedDept &&
        (code.code.toLowerCase().includes(query) || code.name.toLowerCase().includes(query))
    );

    renderActivityCodes(filtered);
}

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