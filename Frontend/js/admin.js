document.addEventListener('DOMContentLoaded', async function() {
    const adminCode = sessionStorage.getItem('adminCode') || 'ADMIN001';

    try {
        const userData = await apiClient.getProfile();
        document.getElementById('admin-name').textContent = `${userData.firstName} ${userData.lastName}`;
    } catch (error) {
        console.error('Error loading admin profile:', error);
        document.getElementById('admin-name').textContent = 'Admin';
    }

    document.getElementById('toggle-sidebar').addEventListener('click', function() {
        document.querySelector('.dashboard-container').classList.toggle('sidebar-collapsed');
    });

    document.getElementById('searchMiscHours').addEventListener('input', filterMiscellaneousHours);

    const actionButtons = document.querySelectorAll('.action-btn');
    actionButtons.forEach(button => {
        if (!button.disabled) {
            button.addEventListener('click', function() {
                const action = this.querySelector('i').className;
                const row = this.closest('tr');
                const employee = row.cells[0].textContent;
                const week = row.cells[1].textContent;

                if (action.includes('fa-eye')) {
                    alert(`Viewing timesheet details for ${employee} (${week})`);
                } else if (action.includes('fa-check')) {
                    if (confirm(`Are you sure you want to approve the timesheet for ${employee} (${week})?`)) {
                        row.querySelector('.status').className = 'status approved';
                        row.querySelector('.status').textContent = 'Approved';
                        row.querySelectorAll('.action-btn:not(:first-child)').forEach(btn => {
                            btn.disabled = true;
                        });
                        alert(`Timesheet for ${employee} (${week}) has been approved`);
                    }
                } else if (action.includes('fa-times')) {
                    if (confirm(`Are you sure you want to reject the timesheet for ${employee} (${week})?`)) {
                        let remark = prompt("Please provide a remark for rejecting this timesheet:", "");
                        if (remark !== null) {
                            row.querySelector('.status').className = 'status rejected';
                            row.querySelector('.status').textContent = 'Rejected';
                            alert(`Timesheet for ${employee} (${week}) has been rejected.\nRemark: ${remark}`);
                            row.querySelector('.action-btn:last-child').disabled = true;
                        }
                    }
                }
            });
        }
    });

    const searchButton = document.getElementById('searchMiscButton');
    if (searchButton) {
        searchButton.addEventListener('click', async function() {
            const searchTerm = document.getElementById('searchMiscHours').value.toLowerCase();
            await searchMiscellaneousHours(searchTerm);
        });
    }

    await loadDashboardData();
});

async function loadDashboardData() {
    try {
        const timesheets = await apiClient.getAllTimesheets();
        updateTimesheetCounts(timesheets);
        updateRecentTimesheets(timesheets);
    } catch (error) {
        console.error('Error loading dashboard data:', error);
    }
}

function updateTimesheetCounts(timesheets) {
    const approvedCount = timesheets.filter(ts => ts.status === 'approved').length;
    const pendingCount = timesheets.filter(ts => ts.status === 'pending').length;
    const rejectedCount = timesheets.filter(ts => ts.status === 'rejected').length;

    document.getElementById('approved-count').textContent = approvedCount;
    document.getElementById('pending-count').textContent = pendingCount;
    document.getElementById('rejected-count').textContent = rejectedCount;
}

function updateRecentTimesheets(timesheets) {
    const recentTimesheets = timesheets.slice(0, 3);
    // Could update the recent timesheets table with real data
}

async function searchMiscellaneousHours(searchTerm) {
    try {
        const result = await apiClient.getEmployeeReport({ name: searchTerm });
        const count = result.timesheets ? result.timesheets.length : 0;
        const resultDiv = document.getElementById('searchResultCount');
        
        if (count > 0) {
            resultDiv.textContent = `Employee "${searchTerm}" has filled Miscellaneous Hours ${count} time(s) in the last 1 month.`;
        } else {
            resultDiv.textContent = `No Miscellaneous Hours found for employee "${searchTerm}" in the last 1 month.`;
        }
    } catch (error) {
        console.error('Error searching miscellaneous hours:', error);
        document.getElementById('searchResultCount').textContent = 'Error searching miscellaneous hours';
    }
}

function filterMiscellaneousHours() {
    const searchTerm = document.getElementById('searchMiscHours').value.toLowerCase();
    // Real-time filtering could be implemented here
}

function downloadExcel() {
    const reportContent = `Employee Timesheet Dashboard Report\nGenerated: ${new Date().toLocaleString()}`;
    const blob = new Blob([reportContent], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'dashboard_report.xlsx';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
}

function downloadPDF() {
    const reportContent = `Employee Timesheet Dashboard Report\nGenerated: ${new Date().toLocaleString()}`;
    const blob = new Blob([reportContent], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'dashboard_report.pdf';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
}

function downloadExcelForEmployee(employeeName) {
    const reportContent = `Employee Timesheet Report for ${employeeName}\nGenerated: ${new Date().toLocaleString()}`;
    const blob = new Blob([reportContent], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${employeeName.replace(' ', '_')}_timesheet.xlsx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
}

function openMiscellaneousHoursModal() {
    document.getElementById('miscHoursModal').style.display = 'block';
    document.getElementById('searchMiscHours').value = '';
}

function closeMiscellaneousHoursModal() {
    document.getElementById('miscHoursModal').style.display = 'none';
}