document.addEventListener('DOMContentLoaded', function() {
    const activityGrid = document.getElementById('activityGrid');
    const searchInput = document.getElementById('searchActivity');
    const addActivityModal = document.getElementById('addActivityModal');
    const addActivityForm = document.getElementById('addActivityForm');
    const departmentSelect = document.getElementById('departmentSelect');
    const activityCodesHeader = document.getElementById('activityCodesHeader');

    // Updated activity codes 
    let activityCodes = [
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
        { department: 'Process', code: 'A25', name: 'Training Session Given/Attendend', description: '' },
        { department: 'Process', code: 'A26', name: 'Induction Session Given/Attended', description: '' },
        { department: 'Process', code: 'A27', name: 'KT Session Given/Attended', description: '' },
        { department: 'Process', code: 'A28', name: 'Client Meeting', description: '' },
        { department: 'Process', code: 'A29', name: 'Net Surfing to collect information', description: '' },
        { department: 'Process', code: 'A30', name: 'Miscellaneous', description: '' },

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
        { department: 'Admin/Accounts', code: 'A34', name: 'Miscellaneous Activities', description: '' },
        { department: 'Admin/Accounts', code: 'A35', name: 'Accounts Activities (TDS Payment, Using Tally, Vendor Payment Processing)', description: '' },
        { department: 'Admin/Accounts', code: 'A36', name: 'Carrom', description: '' },
        { department: 'Admin/Accounts', code: 'A37', name: 'Evening Snacks', description: '' },
        { department: 'Admin/Accounts', code: 'A38', name: 'Internal Meeting', description: '' },

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
        { department: 'Loss and Prevention', code: 'A47', name: 'Miscellaneous', description: '' },

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
        { department: 'Project', code: 'A25', name: 'Miscellaneous Activity', description: '' },
        { department: 'Project', code: 'A26', name: 'Carrom', description: '' },
        { department: 'Project', code: 'A27', name: 'Evening Snacks', description: '' },
        { department: 'Project', code: 'A28', name: 'Mail Management', description: '' },

        // QRA Department
        { department: 'QRA', code: 'A1', name: 'Net surfing to collect information', description: '' },
        { department: 'QRA', code: 'A2', name: 'Miscellaneous activities', description: '' },
        { department: 'QRA', code: 'A3', name: 'Technical – Scribing at Workshop', description: '' },
        { department: 'QRA', code: 'A4', name: 'Technical – PHAST modelling', description: '' },
        { department: 'QRA', code: 'A5', name: 'Technical – Consequence Analysis', description: '' },
        { department: 'QRA', code: 'A6', name: 'Technical – Hazard Identification', description: '' },
        { department: 'QRA', code: 'A7', name: 'Technical – Frequency analysis / parts count', description: '' },
        { department: 'QRA', code: 'A8', name: 'Technical – Report Preparation', description: '' },
        { department: 'QRA', code: 'A9', name: 'Technical – Presentation preparation', description: '' },
        { department: 'QRA', code: 'A10', name: 'Technical – Client Meeting / communication', description: '' },
        { department: 'QRA', code: 'A11', name: 'Technical – SIL Classification', description: '' },
        { department: 'QRA', code: 'A12', name: 'Technical – SIL Verification', description: '' },
        { department: 'QRA', code: 'A13', name: 'Technical – SRS Preparation', description: '' },
        { department: 'QRA', code: 'A14', name: 'Technical – Project Data verification', description: '' },
        { department: 'QRA', code: 'A15', name: 'Technical – Net surfing for technical queries', description: '' },
        { department: 'QRA', code: 'A16', name: 'Technical – Project Document Review', description: '' },
        { department: 'QRA', code: 'A17', name: 'Technical – Research', description: '' },
        { department: 'QRA', code: 'A18', name: 'Internal Meeting', description: '' },
        { department: 'QRA', code: 'A19', name: 'Project Data / Document Preparation', description: '' },
        { department: 'QRA', code: 'A20', name: 'Quality check of Document', description: '' },
        { department: 'QRA', code: 'A21', name: 'Technical Report Review', description: '' },
        { department: 'QRA', code: 'A22', name: 'Technical Risk Analysis', description: '' },
        { department: 'QRA', code: 'A23', name: 'Technical – Conference call with Client', description: '' },
        { department: 'QRA', code: 'A24', name: 'Travelling to & fro – site', description: '' },
        { department: 'QRA', code: 'A25', name: 'Participation in Audit', description: '' },
        { department: 'QRA', code: 'A26', name: 'Preparatory work for PHA / Audit', description: '' },
        { department: 'QRA', code: 'A27', name: 'Dropped Object Study', description: '' },
        { department: 'QRA', code: 'A28', name: 'Isolation Markup', description: '' },
        { department: 'QRA', code: 'A29', name: 'SIF Markup', description: '' },
        { department: 'QRA', code: 'A30', name: 'Parts Count', description: '' },
        { department: 'QRA', code: 'A31', name: 'Inventory Calculation', description: '' },
        { department: 'QRA', code: 'A32', name: 'PHAST Result Extraction', description: '' },
        { department: 'QRA', code: 'A33', name: 'Safeti Result Extraction', description: '' },
        { department: 'QRA', code: 'A34', name: 'Node Markup', description: '' },
        { department: 'QRA', code: 'A35', name: 'Standard Reading', description: '' },
        { department: 'QRA', code: 'A36', name: 'Safeti Modelling', description: '' },
        { department: 'QRA', code: 'A37', name: 'PHAST Input Sheet', description: '' },
        { department: 'QRA', code: 'A38', name: 'exSILentia Modelling', description: '' },
        { department: 'QRA', code: 'A39', name: 'Assumption Register Preparation', description: '' },
        { department: 'QRA', code: 'A40', name: 'TOR Preparation', description: '' },
        { department: 'QRA', code: 'A41', name: 'Preproject', description: '' },
        { department: 'QRA', code: 'A42', name: 'Carrom', description: '' },
        { department: 'QRA', code: 'A43', name: 'Evening Snacks', description: '' },
        { department: 'QRA', code: 'A44', name: 'Training Session Given/Attendend', description: '' },
        { department: 'QRA', code: 'A45', name: 'Induction Session Given/Attended', description: '' },
        { department: 'QRA', code: 'A46', name: 'KT Session Given/Attended', description: '' },
        { department: 'QRA', code: 'A47', name: 'Client Data Review', description: '' },

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
        { department: 'IT', code: 'A23', name: 'Miscellaneous Activities', description: '' },
        { department: 'IT', code: 'A24', name: 'Carrom', description: '' },
        { department: 'IT', code: 'A25', name: 'Evening Snacks', description: '' },
        { department: 'IT', code: 'A27', name: 'Machine Audit', description: '' },
        { department: 'IT', code: 'A28', name: 'Webinars (Trainings)', description: '' },

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
        { department: 'HR', code: 'A31', name: 'Miscellaneous Activity', description: '' },

        // BD Department
        { department: 'BD', code: 'A1', name: 'Document Preparation', description: '' },
        { department: 'BD', code: 'A2', name: 'Proposal Preparation', description: '' },
        { department: 'BD', code: 'A3', name: 'Client Enquiry Follow-up', description: '' },
        { department: 'BD', code: 'A4', name: 'Meeting with Clients', description: '' },
        { department: 'BD', code: 'A5', name: 'Internal Meetings', description: '' },
        { department: 'BD', code: 'A6', name: 'New Customer Tapping', description: '' },
        { department: 'BD', code: 'A7', name: 'Client Payment Follow-ups', description: '' },
        { department: 'BD', code: 'A8', name: 'Project Co-ordination', description: '' },
        { department: 'BD', code: 'A9', name: 'Miscellaneous Activity', description: '' },
        { department: 'BD', code: 'A10', name: 'Carrom', description: '' },
        { department: 'BD', code: 'A11', name: 'Evening Snacks', description: '' },    
        { department: 'BD', code: 'A12', name: 'Attending Seminar, Conference', description: '' },
        { department: 'BD', code: 'A13', name: 'Client visit', description: '' },
        { department: 'BD', code: 'A14', name: 'Market Analysis', description: '' },
        { department: 'BD', code: 'A15', name: 'NDA / Tender document review', description: '' },
        { department: 'BD', code: 'A16', name: 'Tender document preparation', description: '' },
        { department: 'BD', code: 'A17', name: 'Tender submission', description: '' },
        { department: 'BD', code: 'A18', name: 'Vendor registration on client portal', description: '' },

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
        { department: 'Electrical', code: 'A29', name: 'Miscellaneous', description: '' }
];

    // Function to render activity codes in the grid
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
                <button class="btn-delete" data-index="${idx}">
                    <i class="fas fa-trash"></i> Delete
                </button>
            `;
            activityGrid.appendChild(div);
        });

        // Add delete event listeners
        activityGrid.querySelectorAll('.btn-delete').forEach(btn => {
            btn.addEventListener('click', function() {
                const selectedDept = document.getElementById('departmentSelect').value;
                const query = document.getElementById('searchActivity').value.toLowerCase();
                const filtered = codes;
                const codeToDelete = filtered[Array.from(activityGrid.querySelectorAll('.btn-delete')).indexOf(btn)];
                if (confirm(`Are you sure you want to delete activity code "${codeToDelete.code}: ${codeToDelete.name}"?`)) {
                    // Remove from activityCodes array (assuming activityCodes is global)
                    const indexInAll = activityCodes.findIndex(c =>
                        c.department === codeToDelete.department &&
                        c.code === codeToDelete.code &&
                        c.name === codeToDelete.name
                    );
                    if (indexInAll !== -1) {
                        activityCodes.splice(indexInAll, 1);
                        filterAndRender();
                    }
                }
            });
        });
    }

    // Function to filter and render activity codes by selected department and search query
    function filterAndRender() {
        const selectedDept = departmentSelect.value;
        const query = searchInput.value.toLowerCase();

        if (!selectedDept) {
            activityGrid.style.display = 'none';
            activityCodesHeader.style.display = 'none';
            return;
        }

        activityGrid.style.display = 'block';
        activityCodesHeader.style.display = 'flex';

        const filtered = activityCodes.filter(code =>
            code.department === selectedDept &&
            (code.code.toLowerCase().includes(query) || code.name.toLowerCase().includes(query))
        );

        renderActivityCodes(filtered);
    }

    // Event listeners
    departmentSelect.addEventListener('change', function() {
        searchInput.value = '';
        filterAndRender();
    });

    searchInput.addEventListener('input', filterAndRender);

    // Open and close modal functions
    window.openAddActivityModal = function() {
        if (!departmentSelect.value) {
            alert('Please select a department first.');
            return;
        }
        addActivityModal.style.display = 'block';
        // Set the category select to the selected department
        addActivityForm.activityCategory.value = departmentSelect.value;
    };

    window.closeAddActivityModal = function() {
        addActivityModal.style.display = 'none';
        addActivityForm.reset();
    };

    // Handle form submission to add new activity code
    addActivityForm.addEventListener('submit', function(e) {
        e.preventDefault();
        const code = this.activityCode.value.trim();
        const name = this.activityName.value.trim();
        const description = this.activityDescription.value.trim();
        const category = this.activityCategory.value.trim();

        if (!code || !name) {
            alert('Please fill in required fields.');
            return;
        }

        // Add new activity code to the list
        activityCodes.push({
            department: category || 'Other',
            code: code,
            name: name,
            description: description
        });

        // Re-render the list filtered by current department
        filterAndRender();

        // Close modal and reset form
        closeAddActivityModal();
    });

    // Close modal when clicking outside content
    window.onclick = function(event) {
        if (event.target == addActivityModal) {
            closeAddActivityModal();
        }
    };

    // Initial state: hide activity codes section until department selected
    activityGrid.style.display = 'none';
    activityCodesHeader.style.display = 'none';
});
