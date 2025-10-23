
document.addEventListener('DOMContentLoaded', async function() {
    console.log('🔄 Starting dashboard integration...');
    
    // Check if user is logged in
    const userData = getUserData();
    if (!userData) {
        console.log('❌ No user data found, redirecting to login...');
        window.location.href = 'index.html';
        return;
    }

    console.log('✅ User authenticated:', userData);

    // Update user info on the page
    updateUserInfo(userData);
    
    // Load data from backend (but don't wait for it)
    loadBackendData();
    
    // THEN run your existing dashboard initialization
    console.log('🚀 Starting existing dashboard initialization...');
    // Your existing DOMContentLoaded code will run next
});

function updateUserInfo(userData) {
    try {
        // Update the employee name and code displays
        const employeeNameElement = document.getElementById('employee-name');
        const employeeCodeElement = document.getElementById('employee-code');
        const employeeNameInput = document.getElementById('employee-name-input');
        const departmentSelect = document.getElementById('department');
        
        if (employeeNameElement) {
            employeeNameElement.textContent = `${userData.firstName} ${userData.lastName}`;
        }
        if (employeeCodeElement) {
            employeeCodeElement.value = userData.employeeId;
        }
        if (employeeNameInput) {
            employeeNameInput.value = `${userData.firstName} ${userData.lastName}`;
        }
        if (departmentSelect && userData.department) {
            departmentSelect.value = userData.department;
        }
        console.log('✅ User info updated on page');
    } catch (error) {
        console.error('Error updating user info:', error);
    }
}

async function loadBackendData() {
    try {
        console.log('🔄 Loading data from backend...');
        
        // Load timesheets for summary counts
        const timesheets = await apiClient.getMyTimesheets();
        updateTimesheetCounts(timesheets);
        
        // Load user's projects
        const projects = await apiClient.getMyProjects();
        window.userProjects = projects;
        console.log('📋 Loaded projects:', projects.length);
        
        // Load activity codes for user's department
        const userData = getUserData();
        const activityCodes = await apiClient.getActivityCodes(userData.department);
        window.activityCodes = activityCodes;
        console.log('🎯 Loaded activity codes:', activityCodes.length);
        
        console.log('✅ Backend data loaded successfully');
        
    } catch (error) {
        console.error('❌ Failed to load backend data:', error);
        // Don't show notification - might be expected for new users
    }
}

function updateTimesheetCounts(timesheets) {
    try {
        const approvedCount = timesheets.filter(ts => ts.status === 'approved').length;
        const pendingCount = timesheets.filter(ts => ts.status === 'pending').length;
        const rejectedCount = timesheets.filter(ts => ts.status === 'rejected').length;

        // Update the counter cards if they exist
        const approvedElement = document.getElementById('approved-count');
        const pendingElement = document.getElementById('pending-count'); 
        const rejectedElement = document.getElementById('rejected-count');

        if (approvedElement) approvedElement.textContent = approvedCount;
        if (pendingElement) pendingElement.textContent = pendingCount;
        if (rejectedElement) rejectedElement.textContent = rejectedCount;
        
        console.log(`📊 Timesheet counts - Approved: ${approvedCount}, Pending: ${pendingCount}, Rejected: ${rejectedCount}`);
    } catch (error) {
        console.error('Error updating timesheet counts:', error);
    }
}

// Enhanced activity code population using backend data
function populateActivityCodesWithBackendData() {
    try {
        const employeeDept = getUserData()?.department;
        
        if (!employeeDept) {
            console.warn('No department found for employee');
            return populateActivityCodes(); // Fallback to your existing function
        }

        const activityCodeSelect = document.getElementById('activity-code');
        if (!activityCodeSelect) return;

        // Clear existing options except the first one
        while (activityCodeSelect.children.length > 1) {
            activityCodeSelect.removeChild(activityCodeSelect.lastChild);
        }

        // Use REAL data from backend instead of hardcoded data
        const departmentCodes = window.activityCodes?.filter(code => code.department === employeeDept) || [];

        // Add department-specific activity codes
        departmentCodes.forEach(activity => {
            const option = document.createElement('option');
            option.value = activity.code;
            option.textContent = `${activity.code} - ${activity.name}`;
            activityCodeSelect.appendChild(option);
        });

        // Add Miscellaneous Activity option
        const miscOption = document.createElement('option');
        miscOption.value = 'MISC';
        miscOption.textContent = 'Miscellaneous Activity';
        activityCodeSelect.appendChild(miscOption);
        
        console.log(`✅ Populated ${departmentCodes.length} activity codes for ${employeeDept}`);
    } catch (error) {
        console.error('Error populating activity codes:', error);
        // Fallback to original function
        if (typeof populateActivityCodes === 'function') {
            populateActivityCodes();
        }
    }
}

// Enhanced project dropdown population
function populateProjectDropdownWithBackendData() {
    try {
        const projectSelects = document.querySelectorAll('select');
        projectSelects.forEach(select => {
            // Check if this is a project dropdown (you might need to adjust this condition)
            if (select.innerHTML.includes('PROJ001') || select.id === 'project-select') {
                // Clear existing options
                select.innerHTML = '<option value="">Select</option>';
                
                // Add real projects
                if (window.userProjects && window.userProjects.length > 0) {
                    window.userProjects.forEach(project => {
                        const option = document.createElement('option');
                        option.value = project.projectCode || project._id;
                        option.textContent = project.name || `Project ${project.projectCode}`;
                        select.appendChild(option);
                    });
                }
                
                // Add default options
                const defaultOptions = ['Miscellaneous Activity', 'Holiday', 'Leave'];
                defaultOptions.forEach(opt => {
                    const option = document.createElement('option');
                    option.value = opt;
                    option.textContent = opt;
                    select.appendChild(option);
                });
            }
        });
    } catch (error) {
        console.error('Error populating project dropdown:', error);
    }
}

// Override your existing populateActivityCodes function if it exists
if (typeof populateActivityCodes === 'function') {
    const originalPopulateActivityCodes = populateActivityCodes;
    window.populateActivityCodes = function() {
        // Try backend first, fallback to original
        if (window.activityCodes && window.activityCodes.length > 0) {
            populateActivityCodesWithBackendData();
        } else {
            originalPopulateActivityCodes();
        }
    };
}

// Enhanced hours modal opening with backend data
if (typeof openHoursModal === 'function') {
    const originalOpenHoursModal = openHoursModal;
    window.openHoursModal = function(cell) {
        // Populate with backend data first
        populateActivityCodesWithBackendData();
        // Then call original function
        originalOpenHoursModal(cell);
    };
}
// ==================== END OF INTEGRATION CODE ====================
document.addEventListener('DOMContentLoaded', function() {
    // Get employee code from session storage
    const employeeCode = sessionStorage.getItem('employeeCode') || 'EMP001';

    // Mock employee data (in a real app, this would come from a database)
    const employeeData = {
        'EMP001': { name: 'Keshav Mane', department: 'Process' },
        'EMP002': { name: 'John Doe', department: 'Business Development' },
        'EMP003': { name: 'Jane Smith', department: 'Project' },
        'ADMIN001': { name: 'Admin User', department: 'Admin' },
        'EMP004': { name: 'Alice Johnson', department: 'IT' },
        'EMP005': { name: 'Bob Williams', department: 'HR' }
    };
    // Sample timesheet status data (replace with actual DB/API data)
    const timesheetLogs = [
        { employee: 'EMP001', date: '2025-09-05', status: 'Approved' },
        { employee: 'EMP001', date: '2025-09-10', status: 'Pending' },
        { employee: 'EMP001', date: '2025-09-15', status: 'Rejected' },
        { employee: 'EMP002', date: '2025-09-07', status: 'Approved' }
    ];

    // Handle Summary card click
    document.getElementById('summary-card').addEventListener('click', function () {
        const modal = document.getElementById('summary-modal');
        const summaryContent = document.getElementById('summary-content');
        summaryContent.innerHTML = ''; // Clear old content

        const now = new Date();
        // Calculate Monday of current week
        const dayOfWeek = now.getDay(); // 0 (Sun) to 6 (Sat)
        const monday = new Date(now);
        monday.setDate(now.getDate() - ((dayOfWeek + 6) % 7)); // Adjust to Monday

        // Generate dates for the week (Mon to Sun)
        const weekDates = [];
        for (let i = 0; i < 7; i++) {
            const d = new Date(monday);
            d.setDate(monday.getDate() + i);
            weekDates.push(d);
        }

        // Map logs by date string for quick lookup
        const employeeLogs = timesheetLogs.filter(log => log.employee === employeeCode);
        const logMap = {};
        employeeLogs.forEach(log => {
            logMap[log.date] = log.status;
        });

        // Generate summary for each day of the week as a calendar grid
        let calendarHTML = '<div class="summary-calendar">';
        calendarHTML += '<div class="summary-calendar-header">';
        const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
        dayNames.forEach(dayName => {
            calendarHTML += `<div class="summary-calendar-dayname">${dayName}</div>`;
        });
        calendarHTML += '</div>'; // close header

        calendarHTML += '<div class="summary-calendar-body">';
        weekDates.forEach(date => {
            const dateStr = date.toISOString().split('T')[0];
            const displayDate = date.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit' });
            const status = logMap[dateStr] || 'No Entry';
            let statusClass = '';
            if (status === 'Approved') statusClass = 'status-approved';
            else if (status === 'Pending') statusClass = 'status-pending';
            else if (status === 'Rejected') statusClass = 'status-rejected';
            else statusClass = 'status-no-entry';

            calendarHTML += `
                <div class="summary-calendar-cell">
                    <div class="summary-date">${displayDate}</div>
                    <div class="summary-status ${statusClass}">${status}</div>
                </div>
            `;
        });
        calendarHTML += '</div>'; // close body
        calendarHTML += '</div>'; // close calendar

        summaryContent.innerHTML = calendarHTML;

        modal.style.display = 'block';
    });
    // Close summary modal
    document.querySelectorAll('#summary-modal .close-modal').forEach(btn => {
        btn.addEventListener('click', () => {
            document.getElementById('summary-modal').style.display = 'none';
        });
    });


    // Activity codes data organized by department
    const activityCodes = [
        // Process Department
        { department: 'Process', code: 'A1', name: 'Process Calculation (e.g., pressure drop, line sizing, pump sizing)', description: '' },
        { department: 'Process', code: 'A2', name: 'Heat & Mass Balance Development', description: '' },
        { department: 'Process', code: 'A3', name: 'Process Datasheet Preparation (for equipment, instruments, etc.)', description: '' },
        { department: 'Process', code: 'A4', name: 'Line List and Equipment List Preparation', description: '' },
        { department: 'Process', code: 'A5', name: 'Process Design Basis Preparation', description: '' },
        { department: 'Process', code: 'A6', name: 'Hydraulic Calculation', description: '' },
        { department: 'Process', code: 'A7', name: 'Control Philosophy Preparation', description: '' },
        { department: 'Process', code: 'A8', name: 'Adequacy Check Calculations (e.g., relief valve sizing, flare load calculations)', description: '' },
        { department: 'Process', code: 'A9', name: 'Design Review Participation', description: '' },
        { department: 'Process', code: 'A10', name: 'Technical Report Preparation', description: '' },
        { department: 'Process', code: 'A11', name: 'Process Engineering Deliverables Review', description: '' },
        { department: 'Process', code: 'A12', name: 'Cause & Effect Diagram Preparation', description: '' },
        { department: 'Process', code: 'A13', name: 'Alarm & Trip Settings Review', description: '' },
        { department: 'Process', code: 'A14', name: 'RFQ Response Preparation (including technical clarifications)', description: '' },
        { department: 'Process', code: 'A15', name: 'Interdisciplinary Coordination (coordination with Safety dept)', description: '' },
        { department: 'Process', code: 'A16', name: 'Process Optimization Studies', description: '' },
        { department: 'Process', code: 'A17', name: 'Revamp Feasibility Assessments', description: '' },
        { department: 'Process', code: 'A18', name: 'Operation Manuals and Process Descriptions', description: '' },
        { department: 'Process', code: 'A19', name: 'Punch List Closure (for process-related issues)', description: '' },
        { department: 'Process', code: 'A20', name: 'Preproject', description: '' },
        { department: 'Process', code: 'A21', name: 'Carrom', description: '' },
        { department: 'Process', code: 'A22', name: 'Evening Snacks', description: '' },
        { department: 'Process', code: 'A23', name: 'Technical Report Review', description: '' },
        { department: 'Process', code: 'A24', name: 'Internal Meeting', description: '' },
        { department: 'Process', code: 'A25', name: 'Training Session Given/Attended', description: '' },
        { department: 'Process', code: 'A26', name: 'Induction Session Given/Attended', description: '' },
        { department: 'Process', code: 'A27', name: 'KT Session Given/Attended', description: '' },
        { department: 'Process', code: 'A28', name: 'Client Meeting', description: '' },
        { department: 'Process', code: 'A29', name: 'Net Surfing to collect information', description: '' },

        // Admin/Accounts Department
        { department: 'Admin/Accounts', code: 'A1', name: 'Accounts Payable', description: '' },
        { department: 'Admin/Accounts', code: 'A2', name: 'Accounts Receivable', description: '' },
        { department: 'Admin/Accounts', code: 'A3', name: 'Taxation Working', description: '' },
        { department: 'Admin/Accounts', code: 'A4', name: 'GST Working', description: '' },
        { department: 'Admin/Accounts', code: 'A5', name: 'Reconciliation', description: '' },
        { department: 'Admin/Accounts', code: 'A6', name: 'Tally Journal Working', description: '' },
        { department: 'Admin/Accounts', code: 'A7', name: 'Ledger Reconciliation', description: '' },
        { department: 'Admin/Accounts', code: 'A8', name: 'Documentation with Supporting Documents', description: '' },
        { department: 'Admin/Accounts', code: 'A9', name: 'Forex Transaction / Trade Receivable', description: '' },
        { department: 'Admin/Accounts', code: 'A10', name: 'Banking Activities', description: '' },
        { department: 'Admin/Accounts', code: 'A11', name: 'BG / EMD Activity', description: '' },
        { department: 'Admin/Accounts', code: 'A12', name: 'Audit Preparation', description: '' },
        { department: 'Admin/Accounts', code: 'A13', name: 'Audit Handling', description: '' },
        { department: 'Admin/Accounts', code: 'A14', name: 'Project Data / MIS Preparation', description: '' },
        { department: 'Admin/Accounts', code: 'A15', name: 'Finalisation', description: '' },
        { department: 'Admin/Accounts', code: 'A16', name: 'Client Management / Vendor Management', description: '' },
        { department: 'Admin/Accounts', code: 'A17', name: 'Client Coordination', description: '' },
        { department: 'Admin/Accounts', code: 'A18', name: 'Vendor Coordination', description: '' },
        { department: 'Admin/Accounts', code: 'A19', name: 'PO Preparation', description: '' },
        { department: 'Admin/Accounts', code: 'A20', name: 'Investment Exploration', description: '' },
        { department: 'Admin/Accounts', code: 'A21', name: 'TEPL: Searching for Content for Posts (Digital Marketing)', description: '' },
        { department: 'Admin/Accounts', code: 'A22', name: 'TIPL: Searching for Content for Posts (Digital Marketing)', description: '' },
        { department: 'Admin/Accounts', code: 'A23', name: 'Web Surfing to Gather Information', description: '' },
        { department: 'Admin/Accounts', code: 'A24', name: 'Maintaining Records and Files', description: '' },
        { department: 'Admin/Accounts', code: 'A25', name: 'Reimbursement Payment (Processing Refunds or Expense Claims)', description: '' },
        { department: 'Admin/Accounts', code: 'A26', name: 'OT calculation (via Biometric System)', description: '' },
        { department: 'Admin/Accounts', code: 'A27', name: 'Project-Based Work (Tracked via Timesheets)', description: '' },
        { department: 'Admin/Accounts', code: 'A28', name: 'Stationery Procurement Activities', description: '' },
        { department: 'Admin/Accounts', code: 'A29', name: 'Pantry Material Purchase Activities', description: '' },
        { department: 'Admin/Accounts', code: 'A30', name: 'Travel for Notary (Including Stamp Purchases and Lawyer Meetings)', description: '' },
        { department: 'Admin/Accounts', code: 'A31', name: 'Housekeeping Material Purchase Activities', description: '' },
        { department: 'Admin/Accounts', code: 'A32', name: 'Admin – Preparation of CA (Chartered Accountant) Documents', description: '' },
        { department: 'Admin/Accounts', code: 'A33', name: 'Admin / HR / Accounts Meetings', description: '' },
        { department: 'Admin/Accounts', code: 'A34', name: 'Accounts Activities (TDS Payment, Using Tally, Vendor Payment Processing)', description: '' },
        { department: 'Admin/Accounts', code: 'A35', name: 'Carrom', description: '' },
        { department: 'Admin/Accounts', code: 'A36', name: 'Evening Snacks', description: '' },
        { department: 'Admin/Accounts', code: 'A37', name: 'Internal Meeting', description: '' },

        // Loss and Prevention Department
        { department: 'Loss and Prevention', code: 'A1', name: 'Client Data Review', description: '' },
        { department: 'Loss and Prevention', code: 'A2', name: 'Performance Grading Preparation', description: '' },
        { department: 'Loss and Prevention', code: 'A3', name: 'Phast Input Sheet Preparation', description: '' },
        { department: 'Loss and Prevention', code: 'A4', name: 'Consequence Analysis/Modelling', description: '' },
        { department: 'Loss and Prevention', code: 'A5', name: 'Result Extraction', description: '' },
        { department: 'Loss and Prevention', code: 'A6', name: 'Report Preparation', description: '' },
        { department: 'Loss and Prevention', code: 'A7', name: 'Detector Placement', description: '' },
        { department: 'Loss and Prevention', code: 'A8', name: 'Assumption Register Preparation', description: '' },
        { department: 'Loss and Prevention', code: 'A9', name: '3D Model Review', description: '' },
        { department: 'Loss and Prevention', code: 'A10', name: 'Detector Layout Preparation', description: '' },
        { department: 'Loss and Prevention', code: 'A11', name: 'PFD Markup', description: '' },
        { department: 'Loss and Prevention', code: 'A12', name: 'BFD/RBD Preparation', description: '' },
        { department: 'Loss and Prevention', code: 'A13', name: 'Material Balance sheet preparation', description: '' },
        { department: 'Loss and Prevention', code: 'A14', name: 'R&M Data entry in Software', description: '' },
        { department: 'Loss and Prevention', code: 'A15', name: 'Software Simulation/modelling', description: '' },
        { department: 'Loss and Prevention', code: 'A16', name: 'CRS Preparation', description: '' },
        { department: 'Loss and Prevention', code: 'A17', name: 'Layouts and standards Review', description: '' },
        { department: 'Loss and Prevention', code: 'A18', name: 'Octave Band Calculation', description: '' },
        { department: 'Loss and Prevention', code: 'A19', name: '3D Model Preparation', description: '' },
        { department: 'Loss and Prevention', code: 'A20', name: 'Standard Identification', description: '' },
        { department: 'Loss and Prevention', code: 'A21', name: 'Design Basis Preparation', description: '' },
        { department: 'Loss and Prevention', code: 'A22', name: 'Water Demand Calculation', description: '' },
        { department: 'Loss and Prevention', code: 'A23', name: 'Water Demand Report', description: '' },
        { department: 'Loss and Prevention', code: 'A24', name: 'Water Demand Report', description: '' },
        { department: 'Loss and Prevention', code: 'A25', name: 'Hydraulic Calculation Report', description: '' },
        { department: 'Loss and Prevention', code: 'A26', name: 'P&ID Preparation', description: '' },
        { department: 'Loss and Prevention', code: 'A27', name: 'Line List Preparation', description: '' },
        { department: 'Loss and Prevention', code: 'A28', name: 'MR Preparation', description: '' },
        { department: 'Loss and Prevention', code: 'A29', name: 'TBE Preparation', description: '' },
        { department: 'Loss and Prevention', code: 'A30', name: 'VDR Preparation', description: '' },
        { department: 'Loss and Prevention', code: 'A31', name: 'Datasheet Preparation', description: '' },
        { department: 'Loss and Prevention', code: 'A32', name: 'MTO Preparation', description: '' },
        { department: 'Loss and Prevention', code: 'A33', name: 'HAC Schedule preparation', description: '' },
        { department: 'Loss and Prevention', code: 'A34', name: 'HAC Layout Preparation', description: '' },
        { department: 'Loss and Prevention', code: 'A35', name: 'Layout Preparation', description: '' },
        { department: 'Loss and Prevention', code: 'A36', name: 'Carrom', description: '' },
        { department: 'Loss and Prevention', code: 'A37', name: 'Evening Snacks', description: '' },
        { department: 'Loss and Prevention', code: 'A38', name: 'TOR', description: '' },
        { department: 'Loss and Prevention', code: 'A39', name: 'Preproject', description: '' },
        { department: 'Loss and Prevention', code: 'A40', name: 'Technical Report Review', description: '' },
        { department: 'Loss and Prevention', code: 'A41', name: 'Internal Meeting', description: '' },
        { department: 'Loss and Prevention', code: 'A42', name: 'Training Session Given/Attendend', description: '' },
        { department: 'Loss and Prevention', code: 'A43', name: 'Induction Session Given/Attended', description: '' },
        { department: 'Loss and Prevention', code: 'A44', name: 'KT Session Given/Attended', description: '' },
        { department: 'Loss and Prevention', code: 'A45', name: 'Client Meeting', description: '' },
        { department: 'Loss and Prevention', code: 'A46', name: 'Net Surfing to collect information', description: '' },

        // Project Department
        { department: 'Project', code: 'A1', name: 'Client Co-ordination & Follow-Up', description: '' },
        { department: 'Project', code: 'A2', name: 'Internal Co-ordination & Follow-Up', description: '' },
        { department: 'Project', code: 'A3', name: 'Client Meeting', description: '' },
        { department: 'Project', code: 'A4', name: 'Internal Meeting', description: '' },
        { department: 'Project', code: 'A5', name: 'Client Progress Review Meetings', description: '' },
        { department: 'Project', code: 'A6', name: 'Schedule Preparation, Tracking and Progress Monitoring', description: '' },
        { department: 'Project', code: 'A7', name: 'Progress Reporting (Weekly/Monthly Reports)', description: '' },
        { department: 'Project', code: 'A8', name: 'Document Control & Transmittals Tracking', description: '' },
        { department: 'Project', code: 'A9', name: 'Mail, Telephonic Communication with Client & Tracking', description: '' },
        { department: 'Project', code: 'A10', name: 'Preparation of MOM', description: '' },
        { department: 'Project', code: 'A11', name: 'Change Management', description: '' },
        { department: 'Project', code: 'A12', name: 'Documentation', description: '' },
        { department: 'Project', code: 'A13', name: 'Final Documentation & Dossier Preparation', description: '' },
        { department: 'Project', code: 'A14', name: 'KOM Preparation & Participation (Internal and Client)', description: '' },
        { department: 'Project', code: 'A15', name: 'Deliverable Review and Submission to Client', description: '' },
        { department: 'Project', code: 'A16', name: 'Input Document Review and Scope Clarification', description: '' },
        { department: 'Project', code: 'A17', name: 'Workshop Participation', description: '' },
        { department: 'Project', code: 'A18', name: 'Participation in 3D Model Review', description: '' },
        { department: 'Project', code: 'A19', name: 'Audit Participation', description: '' },
        { department: 'Project', code: 'A20', name: 'Vendor Co-ordination', description: '' },
        { department: 'Project', code: 'A21', name: 'Training and Knowledge Sharing', description: '' },
        { department: 'Project', code: 'A22', name: 'Maintain Lesson Learned', description: '' },
        { department: 'Project', code: 'A23', name: 'Project Management Development', description: '' },
        { department: 'Project', code: 'A24', name: 'Out Report Preparation', description: '' },
        { department: 'Project', code: 'A25', name: 'Carrom', description: '' },
        { department: 'Project', code: 'A26', name: 'Evening Snacks', description: '' },
        { department: 'Project', code: 'A27', name: 'Mail Management', description: '' },

        // QRA Department
        { department: 'QRA', code: 'A1', name: 'Net surfing to collect information', description: '' },
        { department: 'QRA', code: 'A2', name: 'Technical – Scribing at Workshop', description: '' },
        { department: 'QRA', code: 'A3', name: 'Technical – PHAST modelling', description: '' },
        { department: 'QRA', code: 'A4', name: 'Technical – Consequence Analysis', description: '' },
        { department: 'QRA', code: 'A5', name: 'Technical – Hazard Identification', description: '' },
        { department: 'QRA', code: 'A6', name: 'Technical – Frequency analysis / parts count', description: '' },
        { department: 'QRA', code: 'A7', name: 'Technical – Report Preparation', description: '' },
        { department: 'QRA', code: 'A8', name: 'Technical – Presentation preparation', description: '' },
        { department: 'QRA', code: 'A9', name: 'Technical – Client Meeting / communication', description: '' },
        { department: 'QRA', code: 'A10', name: 'Technical – SIL Classification', description: '' },
        { department: 'QRA', code: 'A11', name: 'Technical – SIL Verification', description: '' },
        { department: 'QRA', code: 'A12', name: 'Technical – SRS Preparation', description: '' },
        { department: 'QRA', code: 'A13', name: 'Technical – Project Data verification', description: '' },
        { department: 'QRA', code: 'A14', name: 'Technical – Net surfing for technical queries', description: '' },
        { department: 'QRA', code: 'A15', name: 'Technical – Project Document Review', description: '' },
        { department: 'QRA', code: 'A16', name: 'Technical – Research', description: '' },
        { department: 'QRA', code: 'A17', name: 'Internal Meeting', description: '' },
        { department: 'QRA', code: 'A18', name: 'Project Data / Document Preparation', description: '' },
        { department: 'QRA', code: 'A19', name: 'Quality check of Document', description: '' },
        { department: 'QRA', code: 'A20', name: 'Technical Report Review', description: '' },
        { department: 'QRA', code: 'A21', name: 'Technical Risk Analysis', description: '' },
        { department: 'QRA', code: 'A22', name: 'Technical – Conference call with Client', description: '' },
        { department: 'QRA', code: 'A23', name: 'Travelling to & fro – site', description: '' },
        { department: 'QRA', code: 'A24', name: 'Participation in Audit', description: '' },
        { department: 'QRA', code: 'A25', name: 'Preparatory work for PHA / Audit', description: '' },
        { department: 'QRA', code: 'A26', name: 'Dropped Object Study', description: '' },
        { department: 'QRA', code: 'A27', name: 'Isolation Markup', description: '' },
        { department: 'QRA', code: 'A28', name: 'SIF Markup', description: '' },
        { department: 'QRA', code: 'A29', name: 'Parts Count', description: '' },
        { department: 'QRA', code: 'A30', name: 'Inventory Calculation', description: '' },
        { department: 'QRA', code: 'A31', name: 'PHAST Result Extraction', description: '' },
        { department: 'QRA', code: 'A32', name: 'Safeti Result Extraction', description: '' },
        { department: 'QRA', code: 'A33', name: 'Node Markup', description: '' },
        { department: 'QRA', code: 'A34', name: 'Standard Reading', description: '' },
        { department: 'QRA', code: 'A35', name: 'Safeti Modelling', description: '' },
        { department: 'QRA', code: 'A36', name: 'PHAST Input Sheet', description: '' },
        { department: 'QRA', code: 'A37', name: 'exSILentia Modelling', description: '' },
        { department: 'QRA', code: 'A38', name: 'Assumption Register Preparation', description: '' },
        { department: 'QRA', code: 'A39', name: 'TOR Preparation', description: '' },
        { department: 'QRA', code: 'A40', name: 'Preproject', description: '' },
        { department: 'QRA', code: 'A41', name: 'Carrom', description: '' },
        { department: 'QRA', code: 'A42', name: 'Evening Snacks', description: '' },
        { department: 'QRA', code: 'A43', name: 'Training Session Given/Attendend', description: '' },
        { department: 'QRA', code: 'A44', name: 'Induction Session Given/Attended', description: '' },
        { department: 'QRA', code: 'A45', name: 'KT Session Given/Attended', description: '' },
        { department: 'QRA', code: 'A46', name: 'Client Data Review', description: '' },

        // IT Department
        { department: 'IT', code: 'A1', name: 'Desktop / Laptop / Server Support', description: '' },
        { department: 'IT', code: 'A2', name: 'Peripheral Setup & Troubleshooting', description: '' },
        { department: 'IT', code: 'A3', name: 'Remote Support Session', description: '' },
        { department: 'IT', code: 'A4', name: 'Software Installation & Updates', description: '' },
        { department: 'IT', code: 'A5', name: 'Office Suite & Email Support', description: '' },
        { department: 'IT', code: 'A6', name: 'Hardware Troubleshooting (PC, Laptop, Server)', description: '' },
        { department: 'IT', code: 'A7', name: 'OS Installation / Reinstallation', description: '' },
        { department: 'IT', code: 'A8', name: 'Device Setup & Configuration / Replacement', description: '' },
        { department: 'IT', code: 'A9', name: 'Infrastructure Upgrade & System Rollout', description: '' },
        { department: 'IT', code: 'A10', name: 'Network, Internet & VPN Support', description: '' },
        { department: 'IT', code: 'A11', name: 'Server & File Access Management', description: '' },
        { department: 'IT', code: 'A12', name: 'Data Backup & Recovery', description: '' },
        { department: 'IT', code: 'A13', name: 'Security & Access Rights Management', description: '' },
        { department: 'IT', code: 'A14', name: 'IT Asset Management & Maintenance', description: '' },
        { department: 'IT', code: 'A15', name: 'Employee Onboarding (Asset Handover & Setup)', description: '' },
        { department: 'IT', code: 'A16', name: 'Offboarding Support (Device Collection, Access Revocation)', description: '' },
        { department: 'IT', code: 'A17', name: 'User Induction / IT Orientation', description: '' },
        { department: 'IT', code: 'A18', name: 'System Maintenance & Performance Optimization', description: '' },
        { department: 'IT', code: 'A19', name: 'Documentation & IT Reporting', description: '' },
        { department: 'IT', code: 'A20', name: 'Technical Research & Vendor Coordination', description: '' },
        { department: 'IT', code: 'A21', name: 'User Training & Internal Meetings', description: '' },
        { department: 'IT', code: 'A22', name: 'Net Surfing to Collect Information', description: '' },
        { department: 'IT', code: 'A23', name: 'Carrom', description: '' },
        { department: 'IT', code: 'A24', name: 'Evening Snacks', description: '' },
        { department: 'IT', code: 'A25', name: 'Machine Audit', description: '' },
        { department: 'IT', code: 'A26', name: 'Webinars (Trainings)', description: '' },

        // HR Department
        { department: 'HR', code: 'A1', name: 'Recruitment & Talent Acquisition', description: '' },
        { department: 'HR', code: 'A2', name: 'Job Posting & Sourcing Candidates', description: '' },
        { department: 'HR', code: 'A3', name: 'Screening, Interviewing & Selection', description: '' },
        { department: 'HR', code: 'A4', name: 'Employee Onboarding & Orientation', description: '' },
        { department: 'HR', code: 'A5', name: 'Issuing Offer Letters and Appointment Letters', description: '' },
        { department: 'HR', code: 'A6', name: 'Maintaining Employee Records & HR Database', description: '' },
        { department: 'HR', code: 'A7', name: 'Attendance & Leave Management', description: '' },
        { department: 'HR', code: 'A8', name: 'Payroll Processing & Salary Disbursement', description: '' },
        { department: 'HR', code: 'A9', name: 'Performance Management & Appraisals', description: '' },
        { department: 'HR', code: 'A10', name: 'Employee Engagement Activities', description: '' },
        { department: 'HR', code: 'A11', name: 'Training & Development', description: '' },
        { department: 'HR', code: 'A12', name: 'Policy Creation & Updates', description: '' },
        { department: 'HR', code: 'A13', name: 'Handling Employee Grievances & Conflict Resolution', description: '' },
        { department: 'HR', code: 'A14', name: 'Exit Interviews & Offboarding Process', description: '' },
        { department: 'HR', code: 'A15', name: 'HR Documentation (Contracts, NDAs, etc.)', description: '' },
        { department: 'HR', code: 'A16', name: 'Conducting Background Checks & Verification', description: '' },
        { department: 'HR', code: 'A17', name: 'Managing Employee Benefits (PF, ESI, Insurance, etc.)', description: '' },
        { department: 'HR', code: 'A18', name: 'HR Audits & Internal Reporting', description: '' },
        { department: 'HR', code: 'A19', name: 'Organizing Team-Building Events & Celebrations', description: '' },
        { department: 'HR', code: 'A20', name: 'Health & Safety Compliance', description: '' },
        { department: 'HR', code: 'A21', name: 'Supporting Management in Strategic Planning', description: '' },
        { department: 'HR', code: 'A22', name: 'Handling Promotions, Transfers & Internal Movements', description: '' },
        { department: 'HR', code: 'A23', name: 'Maintaining Confidentiality & Ethical Standards', description: '' },
        { department: 'HR', code: 'A24', name: 'Handling Travel Desk', description: '' },
        { department: 'HR', code: 'A25', name: 'Internal Meetings', description: '' },
        { department: 'HR', code: 'A26', name: 'Attending Seminars & Conferences', description: '' },
        { department: 'HR', code: 'A27', name: 'Carrom', description: '' },
        { department: 'HR', code: 'A28', name: 'Evening Snacks', description: '' },
        { department: 'HR', code: 'A29', name: 'TDS', description: '' },
        { department: 'HR', code: 'A30', name: 'Form No. 16', description: '' },

        // BD Department
        { department: 'BD', code: 'A1', name: 'Document Preparation', description: '' },
        { department: 'BD', code: 'A2', name: 'Proposal Preparation', description: '' },
        { department: 'BD', code: 'A3', name: 'Client Enquiry Follow-up', description: '' },
        { department: 'BD', code: 'A4', name: 'Meeting with Clients', description: '' },
        { department: 'BD', code: 'A5', name: 'Internal Meetings', description: '' },
        { department: 'BD', code: 'A6', name: 'New Customer Tapping', description: '' },
        { department: 'BD', code: 'A7', name: 'Client Payment Follow-ups', description: '' },
        { department: 'BD', code: 'A8', name: 'Project Co-ordination', description: '' },
        { department: 'BD', code: 'A9', name: 'Carrom', description: '' },
        { department: 'BD', code: 'A10', name: 'Evening Snacks', description: '' },    
        { department: 'BD', code: 'A11', name: 'Attending Seminar, Conference', description: '' },
        { department: 'BD', code: 'A12', name: 'Client visit', description: '' },
        { department: 'BD', code: 'A13', name: 'Market Analysis', description: '' },
        { department: 'BD', code: 'A14', name: 'NDA / Tender document review', description: '' },
        { department: 'BD', code: 'A15', name: 'Tender document preparation', description: '' },
        { department: 'BD', code: 'A16', name: 'Tender submission', description: '' },
        { department: 'BD', code: 'A17', name: 'Vendor registration on client portal', description: '' },

        // Electrical Department
        { department: 'Electrical', code: 'A1', name: 'Study of input data', description: '' },
        { department: 'Electrical', code: 'A2', name: 'Preparation of SLD', description: '' },
        { department: 'Electrical', code: 'A3', name: 'Extraction of result from ETAP software', description: '' },
        { department: 'Electrical', code: 'A4', name: 'Report generation', description: '' },
        { department: 'Electrical', code: 'A5', name: 'Client Data Review', description: '' },
        { department: 'Electrical', code: 'A6', name: 'Preparation of specifications, Datasheets – Electrical', description: '' },
        { department: 'Electrical', code: 'A7', name: 'Calculations, sizing', description: '' },
        { department: 'Electrical', code: 'A8', name: 'Cable Schedule, Termination schedule', description: '' },
        { department: 'Electrical', code: 'A9', name: 'Layout Drawings (Cable tray, earthing, lighting, etc.)', description: '' },
        { department: 'Electrical', code: 'A10', name: 'Vendor Drawing Review – Electrical', description: '' },
        { department: 'Electrical', code: 'A11', name: 'Instrument Index', description: '' },
        { department: 'Electrical', code: 'A12', name: 'Preparation of specifications, Datasheets – Instrumentation', description: '' },
        { department: 'Electrical', code: 'A13', name: 'Instrument I/O List', description: '' },
        { department: 'Electrical', code: 'A14', name: 'Instrument JB and Cable Schedule', description: '' },
        { department: 'Electrical', code: 'A15', name: 'Cable Block Diagram', description: '' },
        { department: 'Electrical', code: 'A16', name: 'Instrument Layout Drawing', description: '' },
        { department: 'Electrical', code: 'A17', name: 'Instrument Wiring Diagram', description: '' },
        { department: 'Electrical', code: 'A18', name: 'Vendor Drawing Review – Instrumentation', description: '' },
        { department: 'Electrical', code: 'A19', name: 'Enquiry / Proposal related work', description: '' },
        { department: 'Electrical', code: 'A20', name: 'Carrom', description: '' },        { department: 'Electrical', code: 'A21', name: 'Evening Snacks', description: '' },
        { department: 'Electrical', code: 'A22', name: 'Technical Report Review', description: '' },
        { department: 'Electrical', code: 'A23', name: 'Internal Meeting', description: '' },
        { department: 'Electrical', code: 'A24', name: 'Training Session Given/Attendend', description: '' },
        { department: 'Electrical', code: 'A25', name: 'Induction Session Given/Attended', description: '' },
        { department: 'Electrical', code: 'A26', name: 'KT Session Given/Attended', description: '' },
        { department: 'Electrical', code: 'A27', name: 'Client Meeting', description: '' },
        { department: 'Electrical', code: 'A28', name: 'Net Surfing to collect information', description: '' },
];

    // Set employee information
    document.getElementById('employee-code').value = employeeCode;
    document.getElementById('employee-name').textContent = employeeData[employeeCode]?.name || 'Unknown Employee';
    document.getElementById('employee-name-input').value = employeeData[employeeCode]?.name || 'Unknown Employee';

    // Store logged-in employee code for permission checks
    const loggedInEmployeeCode = employeeCode;

    // Function to enable or disable editing based on permission
    function updateEditingPermissions(viewedEmployeeCode) {
        const isOwner = viewedEmployeeCode === loggedInEmployeeCode;
        // Employee Code and Name inputs
        document.getElementById('employee-code').readOnly = !isOwner;
        document.getElementById('employee-name-input').readOnly = !isOwner;

        // Timesheet inputs and selects
        const timesheetBody = document.getElementById('timesheet-body');
        const inputs = timesheetBody.querySelectorAll('input, select, button');
        inputs.forEach(input => {
            input.disabled = !isOwner;
        });

        // Save and Submit buttons
        document.getElementById('save-timesheet-btn').disabled = !isOwner;
        document.getElementById('submit-timesheet-btn').disabled = !isOwner;
    }

    // Initial permission update
    updateEditingPermissions(employeeCode);

    // Remove event listeners to prevent changing employee code or name
    // Set employee code and name inputs readonly and fixed to logged-in employee
    document.getElementById('employee-code').value = employeeCode;
    document.getElementById('employee-name-input').value = employeeData[employeeCode]?.name || 'Unknown Employee';
    document.getElementById('employee-code').setAttribute('readonly', 'readonly');
    document.getElementById('employee-name-input').setAttribute('readonly', 'readonly');

    // Set editing permissions for logged-in employee only
    updateEditingPermissions(employeeCode);
    
    
    // Map full department to select value
    function mapDepartmentToSelectValue(department) {
        if (!department) return 'Select';
        const departments = [
            'Project',
            'Process',
            'Loss and Prevention',
            'Electrical',
            'Business Development',
            'Admin/Accounts',
            'HR',
            'QRA',
            'IT'
        ];
        if (departments.includes(department)) return department;
        return 'Select'; // default
    }
 
    const departmentValue = employeeData[employeeCode]?.department;
    document.getElementById('department').value = departmentValue && departmentValue !== '' ? mapDepartmentToSelectValue(departmentValue) : 'Select';
    
    // Set default dates for the current week
    setDefaultWeekDates();

    // Update day dates and disabled cells
    updateDayDates();

    // Add event listeners for date changes
    document.getElementById('week-start-date').addEventListener('change', updateDayDates);
    document.getElementById('week-end-date').addEventListener('change', updateDayDates);

    // Show access denied modal when admin button is clicked
    console.log("Admin button clicked"); // Debugging log
    document.getElementById('admin-btn').addEventListener('click', function() {
                console.log("Admin button clicked, showing modal.");
                const modal = document.getElementById('access-denied-modal');
                modal.style.display = 'block';
    });

    // Show access denied modal when projects button is clicked
    document.getElementById('projects-btn').addEventListener('click', function() {
        const modal = document.getElementById('access-denied-modal');
        modal.style.display = 'block';
    });

    // Close access denied modal when clicking the close button
    document.getElementById('close-access-modal').addEventListener('click', function() {
        document.getElementById('access-denied-modal').style.display = 'none';
    });

    // Close modal when clicking outside
    window.addEventListener('click', function(e) {
        const modal = document.getElementById('access-denied-modal');
        if (e.target === modal) {
            modal.style.display = 'none';
        }
    });

    // Close modal when clicking the X in modal content (fix for projects and admin modal close button)
    document.querySelectorAll('.close-modal').forEach(closeBtn => {
        closeBtn.addEventListener('click', function() {
            const modal = this.closest('.modal');
            if (modal) {
                modal.style.display = 'none';
            }
        });
    });

    // Initialize timesheet table
    initializeTimesheetTable();

    // Toggle sidebar
    document.getElementById('toggle-sidebar').addEventListener('click', function() {
        // Toggle sidebar functionality
    });

    // Save timesheet button functionality
    document.getElementById('save-timesheet-btn').addEventListener('click', function() {
        // Placeholder save functionality
        alert('Timesheet saved successfully!');
        // You can extend this function to implement actual save logic
    });

    // Submit timesheet button functionality
    document.getElementById('submit-timesheet-btn').addEventListener('click', function() {
        // Placeholder submit functionality
        alert('Timesheet submitted successfully!');
        // You can extend this function to implement actual submit logic
    });

    // Hours modal functionality
    const hoursModal = document.getElementById('hours-modal');
    const closeModal = document.querySelector('.close-modal');
    const hoursForm = document.getElementById('hours-form');
    
    let currentCell = null;

    // Close modal when clicking the X
    if (closeModal) {
       closeModal.addEventListener('click', function() {
         hoursModal.style.display = 'none';
       });
   }

    // Close modal when clicking outside
    window.addEventListener('click', function(e) {
        if (e.target === hoursModal) {
            hoursModal.style.display = 'none';
        }
    });

    // Handle hours form submission
    hoursForm.addEventListener('submit', function(e) {
        e.preventDefault();

        if (!currentCell) return;

        const hoursType = document.getElementById('hours-type').value;
        const enteredHours = parseFloat(document.getElementById('work-hours').value) || 0;
        const activityCode = document.getElementById('activity-code').value;

        if (enteredHours === 0 || !activityCode) {
            alert('Please enter hours and activity code');
            return;
        }

        // Get existing hours from the cell
        let normalHours = parseFloat(currentCell.getAttribute('data-normal-hours')) || 0;
        let overtimeHours = parseFloat(currentCell.getAttribute('data-overtime-hours')) || 0;

        // Update only the selected hours type, preserve the other
        if (hoursType === 'normal') {
            normalHours = enteredHours;
        } else if (hoursType === 'overtime') {
            overtimeHours = enteredHours;
        }

        // Update the cell with the combined hours values
        currentCell.innerHTML = `<span class="normal-hours">${normalHours}</span>/<span class="overtime-hours">${overtimeHours}</span>`;
        currentCell.setAttribute('data-normal-hours', normalHours);
        currentCell.setAttribute('data-overtime-hours', overtimeHours);
        currentCell.setAttribute('data-activity-code', activityCode);
        currentCell.classList.add('has-hours');

        // Update totals
        updateTotals();

        // Close the modal
        hoursModal.style.display = 'none';
    });
    
    // Handle delete row functionality
    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('delete-row-btn')) {
            if (confirm('Are you sure you want to delete this row?')) {
                const row = e.target.closest('tr');
                row.remove();
                updateRowNumbers();
                updateTotals();
            }
        }
    });

    // Function to set default week dates
    function setDefaultWeekDates() {
        const today = new Date();
        const currentDay = today.getDay(); // 0 = Sunday, 1 = Monday, ...
        
        // Calculate the date of Monday (start of week)
        const mondayOffset = currentDay === 0 ? -6 : 1 - currentDay; // If today is Sunday, go back 6 days, otherwise calculate days since Monday
        const monday = new Date(today);
        monday.setDate(today.getDate() + mondayOffset);
        
        // Calculate the date of Sunday (end of week)
        const sunday = new Date(monday);
        sunday.setDate(monday.getDate() + 6);
        
        // Format dates for input fields (YYYY-MM-DD)
        const formatDate = (date) => {
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        };
        
        document.getElementById('week-start-date').value = formatDate(monday);
        document.getElementById('week-end-date').value = formatDate(sunday);
    }

    // Function to initialize timesheet table
    function initializeTimesheetTable() {
        const timesheetBody = document.getElementById('timesheet-body');
        
        // Clear existing rows
        timesheetBody.innerHTML = '';
        
        // Add initial rows
        for (let i = 0; i < 3; i++) {
            addTimesheetRow();
        }
    }

    // Function to add a new timesheet row
    function addTimesheetRow() {
        const timesheetBody = document.getElementById('timesheet-body');
        const rowCount = timesheetBody.children.length;
        const row = document.createElement('tr');

         // Serial Number
        const srCell = document.createElement('td');
        srCell.textContent = rowCount + 1;
        row.appendChild(srCell);

        // Project Code
        const projectCell = document.createElement('td');
        const projectSelect = document.createElement('select');

        // Get logged in employee department
        const employeeDept = employeeData[employeeCode]?.department;

        if (employeeDept === "IT" || employeeDept === "HR") {
            // Restrict options to Department, Holiday, Leave, Misc
            projectSelect.innerHTML = `
             <option value="">Select</option>
             <option value="Miscellaneous Activity">Miscellaneous Activity</option>
             <option value="Holiday">Holiday</option>
             <option value="Leave">Leave</option>
             <option value="${employeeDept}">${employeeDept}</option>
             
            `;
        } else {
            // Default project options
            projectSelect.innerHTML = `
             <option value="">Select</option>
             <option value="Miscellaneous Activity">Miscellaneous Activity</option>
             <option value="Holiday">Holiday</option>
             <option value="Leave">Leave</option>
             <option value="PROJ001">PROJ001</option>
             <option value="PROJ002">PROJ002</option>
             <option value="PROJ003">PROJ003</option>
            `;
        }

        projectCell.appendChild(projectSelect);
        row.appendChild(projectCell);

        // Location
        const locationCell = document.createElement('td');
        const locationInput = document.createElement('input');
        locationInput.type = 'text';
        locationInput.placeholder = 'Enter location';
        locationCell.appendChild(locationInput);
        row.appendChild(locationCell);

        // Days (Mon-Sun)
        const days = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
        days.forEach(day => {
          const dayCell = document.createElement('td');
          dayCell.className = 'time-cell';
          dayCell.innerHTML = '<span class="normal-hours">0</span>/<span class="overtime-hours">0</span>';
          dayCell.setAttribute('data-day', day);
          dayCell.setAttribute('data-normal-hours', '0');
          dayCell.setAttribute('data-overtime-hours', '0');
          dayCell.setAttribute('data-activity-code', '');
          dayCell.addEventListener('click', function() {
            openHoursModal(this);
          });
          row.appendChild(dayCell);
       });

        // Action
        const actionCell = document.createElement('td');
        const deleteBtn = document.createElement('i');
        deleteBtn.className = 'fas fa-trash delete-row-btn';
        deleteBtn.title = 'Delete Row';
        actionCell.appendChild(deleteBtn);
        row.appendChild(actionCell);

        timesheetBody.appendChild(row);
        updateRowNumbers();
    }
  

    // Function to populate activity codes based on employee's department
    function populateActivityCodes() {
        const employeeDept = employeeData[employeeCode]?.department;

        if (!employeeDept) {
            console.warn('No department found for employee:', employeeCode);
            return;
        }

        // Map employee department names to activity code department names
        const departmentMapping = {
            'Process': 'Process',
            'Business Development': 'BD',
            'Project': 'Project',
            'Admin': 'Admin/Accounts',
            'HR': 'HR',
            'IT': 'IT',
            'QRA': 'QRA',
            'Loss and Prevention': 'Loss and Prevention',
            'Electrical': 'Electrical'
        };

        const activityCodeDept = departmentMapping[employeeDept] || employeeDept;
        const activityCodeSelect = document.getElementById('activity-code');
    if (!activityCodeSelect) return;

        // Clear existing options except the first one
        while (activityCodeSelect.children.length > 1) {
            activityCodeSelect.removeChild(activityCodeSelect.lastChild);
        }

        // Filter activity codes for the employee's department
        const departmentCodes = activityCodes.filter(code => code.department === activityCodeDept);

        // Add department-specific activity codes
        departmentCodes.forEach(activity => {
            const option = document.createElement('option');
            option.value = activity.code;
            option.textContent = `${activity.code} - ${activity.name}`;
            activityCodeSelect.appendChild(option);
        });

        // Add Miscellaneous Activity as a general option for all departments
        const miscOption = document.createElement('option');
        miscOption.value = 'MISC';
        miscOption.textContent = 'Miscellaneous Activity';
        activityCodeSelect.appendChild(miscOption);
}

    // Function to open hours modal
    function openHoursModal(cell) {
        currentCell = cell;

        // Populate activity codes based on employee's department
        populateActivityCodes();

        // Reset form
        const normalHours = parseFloat(cell.getAttribute('data-normal-hours')) || 0;
        const overtimeHours = parseFloat(cell.getAttribute('data-overtime-hours')) || 0;
        const activityCode = cell.getAttribute('data-activity-code') || '';

        // Determine which hours type to show based on existing data
        if (normalHours > 0) {
            document.getElementById('hours-type').value = 'normal';
            document.getElementById('work-hours').value = normalHours;
        } else if (overtimeHours > 0) {
            document.getElementById('hours-type').value = 'overtime';
            document.getElementById('work-hours').value = overtimeHours;
        } else {
            document.getElementById('hours-type').value = 'normal';
            document.getElementById('work-hours').value = '0';
        }

        document.getElementById('activity-code').value = activityCode;

        // Show modal
        document.getElementById('hours-modal').style.display = 'block';
}

    // Function to update totals
    function updateTotals() {
        const days = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
        let weekTotalNormal = 0;
        let weekTotalOvertime = 0;
        
        days.forEach(day => {
            const cells = document.querySelectorAll(`.time-cell[data-day="${day}"]`);
            let totalNormal = 0;
            let totalOvertime = 0;
            
            cells.forEach(cell => {
                const normalHours = parseFloat(cell.getAttribute('data-normal-hours')) || 0;
                const overtimeHours = parseFloat(cell.getAttribute('data-overtime-hours')) || 0;
                totalNormal += normalHours;
                totalOvertime += overtimeHours;
            });
            
            const totalElement = document.getElementById(`total-${day}`);
            totalElement.querySelector('.normal-hours').textContent = totalNormal;
            totalElement.querySelector('.overtime-hours').textContent = totalOvertime;
            
            weekTotalNormal += totalNormal;
            weekTotalOvertime += totalOvertime;
        });
        
        // Update week total
        const weekTotalElement = document.getElementById('total-week');
        weekTotalElement.querySelector('.normal-hours').textContent = weekTotalNormal;
        weekTotalElement.querySelector('.overtime-hours').textContent = weekTotalOvertime;
    }
    

    // Function to update row numbers after deletion
    function updateRowNumbers() {
        const rows = document.querySelectorAll('#timesheet-body tr');
        rows.forEach((row, index) => {
            row.cells[0].textContent = index + 1;
        });
    }

    // Function to update day dates based on start date
    function updateDayDates() {
        const startDateInput = document.getElementById('week-start-date').value;
        if (!startDateInput) return;

        const startDate = new Date(startDateInput);
        const startDay = startDate.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat

        // Adjust to Monday=0, Sunday=6
        let adjustedStartDay = startDay - 1;
        if (adjustedStartDay < 0) adjustedStartDay = 6;

        const days = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
        for (let i = 0; i < days.length; i++) {
            const date = new Date(startDate);
            date.setDate(startDate.getDate() + (i - adjustedStartDay));
            const dateStr = date.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit' });
            document.getElementById(`date-${days[i]}`).textContent = dateStr;
        }

        updateDisabledCells(adjustedStartDay);
    }

    // Function to update disabled state of time cells
    function updateDisabledCells(startDayIndex) {
        const days = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
        days.forEach((day, index) => {
            const cells = document.querySelectorAll(`.time-cell[data-day="${day}"]`);
            cells.forEach(cell => {
                if (index < startDayIndex) {
                    cell.classList.add('disabled');
                    cell.style.pointerEvents = 'none';
                    cell.style.opacity = '0.5';
                } else {
                    cell.classList.remove('disabled');
                    cell.style.pointerEvents = 'auto';
                    cell.style.opacity = '1';
                }
            });
        });
    }
})
