# Employee Timesheet System

## Overview
This is a web-based Employee Timesheet System that allows employees to log their work hours and administrators to manage and approve timesheets. The system features a responsive design and intuitive user interface.

## Features

### Login Page
- Separate login for employees and administrators
- Password visibility toggle
- "Remember me" functionality
- Forgot password option

### Employee Dashboard
- Auto-filled employee information based on employee code
- Weekly timesheet with customizable start and end dates
- Interactive timesheet table with the following columns:
  - SR.NO
  - PROJECT CODE
  - LOCATION
  - Days of the week (MON-SUN)
- Click on day cells to enter work hours and activity codes via popup
- Add new rows to the timesheet
- Download timesheet as Excel

### Admin Dashboard
- Overview of key metrics (total employees, active projects, etc.)
- Recent timesheets with approval/rejection functionality
- Project hours visualization

## Project Structure

```
timesheet_trial_2/
├── index.html              # Login page
├── dashboard.html          # Employee dashboard
├── admin-dashboard.html    # Admin dashboard
├── css/
│   ├── styles.css          # Styles for login page
│   ├── dashboard.css       # Styles for employee dashboard
│   └── admin.css           # Additional styles for admin dashboard
├── js/
│   ├── login.js            # Login page functionality
│   ├── dashboard.js        # Employee dashboard functionality
│   └── admin.js            # Admin dashboard functionality
└── README.md               # Project documentation
```

## Usage

1. Open `index.html` in a web browser to access the login page
2. Login as an employee or admin (no actual authentication in this demo)
3. For employees:
   - View and fill out the weekly timesheet
   - Click on day cells to enter work hours
   - Add new rows as needed
4. For admins:
   - View overview of all timesheets
   - Approve or reject employee timesheets
   - Monitor project hours

## Future Enhancements

- Backend integration with a database
- User authentication and authorization
- Email notifications for timesheet approvals/rejections
- Advanced reporting and analytics
- Mobile app version

## Notes

This is a front-end only implementation. In a production environment, this would be connected to a backend server with a database to store and retrieve data.