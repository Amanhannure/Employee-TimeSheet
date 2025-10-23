// Sample miscellaneous hours data
const miscellaneousHoursData = [
    { employee: 'Keshav Mane', hours: 5, date: '2023-05-01', activity: 'Miscellaneous Activity' },
    { employee: 'John Doe', hours: 3, date: '2023-05-02', activity: 'Miscellaneous Activity' },
    { employee: 'Jane Smith', hours: 7, date: '2023-05-03', activity: 'Miscellaneous Activity' },
    { employee: 'Mike Johnson', hours: 4, date: '2023-05-04', activity: 'Miscellaneous Activity' },
    { employee: 'Sarah Wilson', hours: 6, date: '2023-05-05', activity: 'Miscellaneous Activity' }
];

document.addEventListener('DOMContentLoaded', function() {
    // Get admin code from session storage
    const adminCode = sessionStorage.getItem('adminCode') || 'ADMIN001';

    // Mock admin data (in a real app, this would come from a database)
    const adminData = {
        'ADMIN001': { name: 'Admin User' },
        'ADMIN002': { name: 'Super Admin' }
    };

    // Set admin name
    document.getElementById('admin-name').textContent = adminData[adminCode]?.name || 'Admin';

    // Toggle sidebar
    document.getElementById('toggle-sidebar').addEventListener('click', function() {
        document.querySelector('.dashboard-container').classList.toggle('sidebar-collapsed');
    });

    // Initialize miscellaneous hours search
    document.getElementById('searchMiscHours').addEventListener('input', filterMiscellaneousHours);

    // Action buttons functionality
    const actionButtons = document.querySelectorAll('.action-btn');
    
    actionButtons.forEach(button => {
        if (!button.disabled) {
            button.addEventListener('click', function() {
                const action = this.querySelector('i').className;
                const row = this.closest('tr');
                const employee = row.cells[0].textContent;
                const week = row.cells[1].textContent;

                if (action.includes('fa-eye')) {
                    // View timesheet details
                    alert(`Viewing timesheet details for ${employee} (${week})`);
                } else if (action.includes('fa-check')) {
                    // Confirm before approving
                    if (confirm(`Are you sure you want to approve the timesheet for ${employee} (${week})?`)) {
                        row.querySelector('.status').className = 'status approved';
                        row.querySelector('.status').textContent = 'Approved';

                        // Disable approve and reject buttons
                        row.querySelectorAll('.action-btn:not(:first-child)').forEach(btn => {
                            btn.disabled = true;
                        });

                        alert(`Timesheet for ${employee} (${week}) has been approved`);
                    }
                } else if (action.includes('fa-times')) {
                    // Ask for confirmation and remark before rejecting
                    if (confirm(`Are you sure you want to reject the timesheet for ${employee} (${week})?`)) {
                        let remark = prompt("Please provide a remark for rejecting this timesheet:", "");
                        if (remark !== null) {
                            row.querySelector('.status').className = 'status rejected';
                            row.querySelector('.status').textContent = 'Rejected';

                            // Optionally, you can display the remark somewhere or log it
                            // For now, just show an alert
                            alert(`Timesheet for ${employee} (${week}) has been rejected.\nRemark: ${remark}`);

                            // Disable reject button, keep approve button active
                            row.querySelector('.action-btn:last-child').disabled = true;
                        }
                    }
                }
            });
        }
    });

// Download Dashboard Report as Excel
function downloadExcel() {
    const reportContent = `
        Employee Timesheet Dashboard Report
        Generated: ${new Date().toLocaleString()}
        
        Summary:
        - Total Employees: 24
        - Active Projects: 8
        - Approved Timesheets: 18
        
        Recent Timesheets:
        - Keshav Mane: 40 hours (Pending)
        - John Doe: 38 hours (Approved)
        - Jane Smith: 42 hours (Rejected)
    `;
    
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

// Download Dashboard Report as PDF
function downloadPDF() {
    const reportContent = `
        Employee Timesheet Dashboard Report
        Generated: ${new Date().toLocaleString()}

        Summary:
        - Total Employees: 24
        - Active Projects: 8
        - Approved Timesheets: 18

        Recent Timesheets:
        - Keshav Mane: 40 hours (Pending)
        - John Doe: 38 hours (Approved)
        - Jane Smith: 42 hours (Rejected)
    `;

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

// Download Excel Report for Specific Employee
function downloadExcelForEmployee(employeeName) {
    const reportContent = `
        Employee Timesheet Report for ${employeeName}
        Generated: ${new Date().toLocaleString()}

        Employee Details:
        - Name: ${employeeName}
        - Week: May 1 - May 7, 2023
        - Total Hours: 40 (Example)
        - Status: Pending (Example)

        Timesheet Details:
        - Monday: 8 hours
        - Tuesday: 8 hours
        - Wednesday: 8 hours
        - Thursday: 8 hours
        - Friday: 8 hours
    `;

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

    // In a real application, you would have more functionality here:
    // - Fetching real data from a backend API
    // - Pagination for tables
    // - Filtering and sorting
    // - Charts and graphs for analytics
    // - User management
    // - Project management
    // - etc.
});

document.addEventListener('DOMContentLoaded', function() {
    // Existing DOMContentLoaded code...

    // Add search button click handler for miscellaneous hours modal
    const searchButton = document.getElementById('searchMiscButton');
    if (searchButton) {
        searchButton.addEventListener('click', function() {
            const searchTerm = document.getElementById('searchMiscHours').value.toLowerCase();

            // Calculate date 1 month ago from today
            const today = new Date();
            const oneMonthAgo = new Date(today.getFullYear(), today.getMonth() - 1, today.getDate());

            // Filter data by search term and date within last 1 month
            const filteredData = miscellaneousHoursData.filter(item => {
                const itemDate = new Date(item.date);
                return (item.employee.toLowerCase().includes(searchTerm) || item.activity.toLowerCase().includes(searchTerm)) &&
                       itemDate >= oneMonthAgo && itemDate <= today;
            });

            const count = filteredData.length;
            const resultDiv = document.getElementById('searchResultCount');
            if (count > 0) {
                resultDiv.textContent = `Employee "${searchTerm}" has filled Miscellaneous Hours ${count} time(s) in the last 1 month.`;
                // Optionally, display the filtered entries below the count
                let details = filteredData.map(item => `Date: ${item.date}, Hours: ${item.hours}, Activity: ${item.activity}`).join('\n');
                resultDiv.textContent += `\n${details}`;
            } else {
                resultDiv.textContent = `No Miscellaneous Hours found for employee "${searchTerm}" in the last 1 month.`;
            }
        });
    }
});

// Miscellaneous Hours Modal Functions
function openMiscellaneousHoursModal() {
    document.getElementById('miscHoursModal').style.display = 'block';
    // Optionally clear input on open
    document.getElementById('searchMiscHours').value = '';
}

function closeMiscellaneousHoursModal() {
    document.getElementById('miscHoursModal').style.display = 'none';
}
