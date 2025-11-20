import Timesheet from '../models/TimeSheet.js';
import Project from '../models/Project.js';
import User from '../models/User.js';
import ExcelJS from 'exceljs';

export const getHoursTracking = async (req, res) => {
  try {
    const { plNo, projectName } = req.query;
    
    console.log('🔍 Hours Tracking Query:', { plNo, projectName });
    
    let filter = {};
    if (plNo) filter.projectCode = new RegExp(plNo, 'i');
    if (projectName) filter.name = new RegExp(projectName, 'i');

    const projects = await Project.find(filter)
      .populate('assignedEmployees', 'firstName lastName employeeId department')
      .lean();

    console.log(`📊 Found ${projects.length} projects matching criteria`);

    // Calculate totals
    const totals = projects.reduce((acc, project) => {
      const totalAllocated = project.departmentHours?.reduce((sum, dept) => 
        sum + dept.allocatedHours, 0) || 0;
      const totalVariable = project.departmentHours?.reduce((sum, dept) => 
        sum + dept.variableHours, 0) || 0;
      const totalConsumed = project.departmentHours?.reduce((sum, dept) => 
        sum + dept.consumedHours, 0) || 0;
      
      acc.totalHours += totalAllocated + totalVariable;
      acc.consumedHours += totalConsumed;
      acc.variationHours += totalVariable;
      
      return acc;
    }, { totalHours: 0, consumedHours: 0, variationHours: 0 });

    totals.balanceHours = totals.totalHours - totals.consumedHours;

    // Format projects for frontend
    const formattedProjects = projects.map(project => {
      const projectTotals = project.departmentHours?.reduce((acc, dept) => {
        acc.totalAllocated += dept.allocatedHours;
        acc.totalVariable += dept.variableHours;
        acc.totalConsumed += dept.consumedHours;
        return acc;
      }, { totalAllocated: 0, totalVariable: 0, totalConsumed: 0 }) || { totalAllocated: 0, totalVariable: 0, totalConsumed: 0 };

      return {
        plNo: project.projectCode,
        name: project.name,
        status: project.status,
        totalHours: projectTotals.totalAllocated + projectTotals.totalVariable,
        consumedHours: projectTotals.totalConsumed,
        balanceHours: (projectTotals.totalAllocated + projectTotals.totalVariable) - projectTotals.totalConsumed,
        assignedEmployees: project.assignedEmployees?.length || 0,
        startDate: project.startDate,
        endDate: project.endDate
      };
    });

    res.json({
      success: true,
      projects: formattedProjects,
      totals,
      count: projects.length
    });
  } catch (error) {
    console.error('Get hours tracking error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error' 
    });
  }
};

export const getEmployeeReport = async (req, res) => {
  try {
    const { employeeId, plNo, name, startDate, endDate } = req.query;
    
    console.log('🔍 Employee Report Query:', { employeeId, plNo, name, startDate, endDate });

    let employee = null;
    let project = null;

    // Find by employee
    if (employeeId) {
      employee = await User.findOne({ employeeId }).lean();
      console.log('👤 Found employee by ID:', employee?.employeeId);
    } else if (name) {
      const nameRegex = new RegExp(name, 'i');
      employee = await User.findOne({
        $or: [
          { firstName: nameRegex },
          { lastName: nameRegex },
          { 
            $expr: {
              $regexMatch: {
                input: { $concat: ["$firstName", " ", "$lastName"] },
                regex: nameRegex
              }
            }
          }
        ]
      }).lean();
      console.log('👤 Found employee by name:', employee?.employeeId);
    }

    // Find by project
    if (plNo) {
      project = await Project.findOne({ projectCode: plNo }).lean();
      console.log('📋 Found project by PL No:', project?.projectCode);
    } else if (name && !employee) {
      project = await Project.findOne({ name: new RegExp(name, 'i') }).lean();
      console.log('📋 Found project by name:', project?.projectCode);
    }

    let result = {};

    if (employee) {
      // Get employee timesheets with date filtering
      let dateFilter = {};
      if (startDate || endDate) {
        dateFilter.weekStartDate = {};
        if (startDate) dateFilter.weekStartDate.$gte = new Date(startDate);
        if (endDate) dateFilter.weekStartDate.$lte = new Date(endDate);
      }

      const timesheets = await Timesheet.find({
        employee: employee._id,
        ...dateFilter
      })
      .populate('employee', 'firstName lastName employeeId department')
      .populate('approvedBy', 'firstName lastName')
      .sort({ weekStartDate: -1 })
      .lean();

      console.log(`📊 Found ${timesheets.length} timesheets for employee ${employee.employeeId}`);

      result = {
        type: 'employee',
        employee: {
          employeeId: employee.employeeId,
          firstName: employee.firstName,
          lastName: employee.lastName,
          department: employee.department,
          designation: employee.designation,
          status: employee.status,
          joinDate: employee.joinDate
        },
        timesheets: timesheets.map(ts => ({
          _id: ts._id,
          weekStartDate: ts.weekStartDate,
          weekEndDate: ts.weekEndDate,
          weekRange: `${new Date(ts.weekStartDate).toLocaleDateString()} - ${new Date(ts.weekEndDate).toLocaleDateString()}`,
          totalHours: ts.totalHours,
          totalNormalHours: ts.totalNormalHours,
          totalOvertimeHours: ts.totalOvertimeHours,
          status: ts.status,
          submittedAt: ts.submittedAt,
          approvedAt: ts.approvedAt,
          approvedBy: ts.approvedBy,
          projectSummary: ts.entries ? getProjectSummaryFromEntries(ts.entries) : []
        }))
      };
    } else if (project) {
      // Get timesheets for this project
      const timesheets = await Timesheet.find({
        'entries.projectCode': project.projectCode
      })
      .populate('employee', 'firstName lastName employeeId department')
      .sort({ weekStartDate: -1 })
      .lean();

      // Get project hours summary
      const projectHours = project.departmentHours?.reduce((acc, dept) => {
        acc.totalAllocated += dept.allocatedHours;
        acc.totalVariable += dept.variableHours;
        acc.totalConsumed += dept.consumedHours;
        return acc;
      }, { totalAllocated: 0, totalVariable: 0, totalConsumed: 0 }) || { totalAllocated: 0, totalVariable: 0, totalConsumed: 0 };

      result = {
        type: 'project',
        project: {
          plNo: project.projectCode,
          name: project.name,
          status: project.status,
          totalHours: projectHours.totalAllocated + projectHours.totalVariable,
          consumedHours: projectHours.totalConsumed,
          balanceHours: (projectHours.totalAllocated + projectHours.totalVariable) - projectHours.totalConsumed,
          startDate: project.startDate,
          endDate: project.endDate,
          departmentBreakdown: project.departmentHours || []
        },
        timesheets: timesheets.map(ts => ({
          _id: ts._id,
          employee: ts.employee,
          weekStartDate: ts.weekStartDate,
          weekEndDate: ts.weekEndDate,
          weekRange: `${new Date(ts.weekStartDate).toLocaleDateString()} - ${new Date(ts.weekEndDate).toLocaleDateString()}`,
          totalHours: ts.totalHours,
          status: ts.status,
          projectHours: getProjectHoursFromEntries(ts.entries, project.projectCode)
        })),
        assignedEmployees: await User.find({ _id: { $in: project.assignedEmployees } })
          .select('employeeId firstName lastName department designation')
          .lean()
      };
    } else {
      result = {
        type: 'none',
        message: 'No employee or project found matching the criteria'
      };
    }

    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('Get employee report error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error' 
    });
  }
};

export const exportEmployeeReportToExcel = async (req, res) => {
  try {
    const { employeeId, plNo, name, startDate, endDate, reportType } = req.body;
    
    console.log('📊 Exporting report to Excel:', { employeeId, plNo, name, startDate, endDate, reportType });

    const workbook = new ExcelJS.Workbook();
    
    if (reportType === 'employee' || !reportType) {
      // Employee report export - FIXED: Handle both employeeId and name lookup
      let employee = null;

      // Find by employee ID first
      if (employeeId) {
        employee = await User.findOne({ employeeId }).lean();
        console.log('👤 Found employee by ID:', employee?.employeeId);
      } 
      // If no employee found by ID, try by name
      else if (name) {
        const nameRegex = new RegExp(name, 'i');
        employee = await User.findOne({
          $or: [
            { firstName: nameRegex },
            { lastName: nameRegex },
            { 
              $expr: {
                $regexMatch: {
                  input: { $concat: ["$firstName", " ", "$lastName"] },
                  regex: nameRegex
                }
              }
            }
          ]
        }).lean();
        console.log('👤 Found employee by name:', employee?.employeeId);
      }

      if (!employee) {
        return res.status(404).json({ success: false, message: 'Employee not found' });
      }

      // Get assigned projects for the employee
      const assignedProjects = await Project.find({
        assignedEmployees: employee._id
      }).lean();

      console.log(`📋 Found ${assignedProjects.length} assigned projects for employee ${employee.employeeId}`);

      let dateFilter = {};
      if (startDate || endDate) {
        dateFilter.weekStartDate = {};
        if (startDate) dateFilter.weekStartDate.$gte = new Date(startDate);
        if (endDate) dateFilter.weekStartDate.$lte = new Date(endDate);
      }

      const timesheets = await Timesheet.find({
        employee: employee._id,
        ...dateFilter
      })
      .populate('employee', 'firstName lastName employeeId department')
      .sort({ weekStartDate: -1 })
      .lean();

      console.log(`📊 Found ${timesheets.length} timesheets for employee ${employee.employeeId}`);

      // Create worksheet with exact format from your template
      const worksheet = workbook.addWorksheet('Employee Timesheet Report');
      
      // Add headers matching your template format - "Report generated via Employee Code"
      worksheet.mergeCells('A1:K1');
      worksheet.getCell('A1').value = 'Report generated via Employee Code';
      worksheet.getCell('A1').alignment = { horizontal: 'center' };
      worksheet.getCell('A1').font = { bold: true };
      
      worksheet.addRow([]); // Empty row
      
      // Add table headers matching your template
      const headers = ['Sr no.', 'Employee name', 'Department', 'Project Name', 'Project No.', 'Activity Name', 'Consumed Hour', 'Start date', 'End Date', 'Total Hour', 'Remarks'];
      const headerRow = worksheet.addRow(headers);
      
      // Style the header row
      headerRow.font = { bold: true };
      headerRow.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFE6E6FA' }
        };
        cell.alignment = { horizontal: 'center' };
      });

      // Add employee timesheet data
      let srNo = 1;
      let totalConsumedHours = 0;
      let hasData = false;

      // If timesheets exist, add timesheet entries
      if (timesheets && timesheets.length > 0) {
        timesheets.forEach(timesheet => {
          if (timesheet.entries && timesheet.entries.length > 0) {
            timesheet.entries.forEach(entry => {
              const consumedHours = (entry.normalHours || 0) + (entry.overtimeHours || 0);
              totalConsumedHours += consumedHours;
              
              // Get project name from assigned projects or use project code
              const project = assignedProjects.find(p => p.projectCode === entry.projectCode);
              const projectName = project ? project.name : entry.projectCode;
              
              worksheet.addRow([
                srNo++,
                `${employee.firstName} ${employee.lastName}`,
                employee.department,
                projectName,
                entry.projectCode,
                entry.activityCode,
                formatTimeToHHMMSS(consumedHours),
                new Date(timesheet.weekStartDate).toLocaleDateString(),
                new Date(timesheet.weekEndDate).toLocaleDateString(),
                'Project Hour',
                'Things written in remarks'
              ]);
              hasData = true;
            });
          }
        });
      }

      // If no timesheet data, still show employee information with assigned projects
      if (!hasData) {
        if (assignedProjects.length > 0) {
          // Show assigned projects even without timesheets
          assignedProjects.forEach(project => {
            worksheet.addRow([
              srNo++,
              `${employee.firstName} ${employee.lastName}`,
              employee.department,
              project.name,
              project.projectCode,
              'No Activity',
              '00:00:00',
              'N/A',
              'N/A',
              'Project Hour',
              'No timesheet data available'
            ]);
          });
        } else {
          // Show employee info even without assigned projects
          worksheet.addRow([
            srNo++,
            `${employee.firstName} ${employee.lastName}`,
            employee.department,
            'No Project Assigned',
            'N/A',
            'No Activity',
            '00:00:00',
            'N/A',
            'N/A',
            'Project Hour',
            'No projects or timesheets available'
          ]);
        }
      }

      // Add total row if we have data
      if (srNo > 1) {
        const totalRowNumber = worksheet.rowCount + 1;
        worksheet.addRow([]);
        
        // Add sum formula for consumed hours
        const sumRow = worksheet.addRow([
          '', '', '', '', '', '',
          `=SUM(G4:G${totalRowNumber - 1})`, '', '', '', ''
        ]);
        
        // Style the sum row
        sumRow.font = { bold: true };
      }

      // Auto-fit columns
      worksheet.columns.forEach(column => {
        column.width = 15;
      });

      // Set column widths specifically for better display
      worksheet.getColumn(1).width = 8;  // Sr no.
      worksheet.getColumn(2).width = 20; // Employee name
      worksheet.getColumn(3).width = 15; // Department
      worksheet.getColumn(4).width = 20; // Project Name
      worksheet.getColumn(5).width = 12; // Project No.
      worksheet.getColumn(6).width = 15; // Activity Name
      worksheet.getColumn(7).width = 12; // Consumed Hour
      worksheet.getColumn(8).width = 12; // Start date
      worksheet.getColumn(9).width = 12; // End Date
      worksheet.getColumn(10).width = 12; // Total Hour
      worksheet.getColumn(11).width = 20; // Remarks

    } else if (reportType === 'project') {
      // Project report export
      const project = await Project.findOne({ projectCode: plNo }).lean();
      if (!project) {
        return res.status(404).json({ success: false, message: 'Project not found' });
      }

      const worksheet = workbook.addWorksheet('Project Report');
      
      // Add project info
      worksheet.addRow(['Project Information']);
      worksheet.addRow([`Project Code: ${project.projectCode}`]);
      worksheet.addRow([`Project Name: ${project.name}`]);
      worksheet.addRow([`Status: ${project.status}`]);
      worksheet.addRow([`Start Date: ${project.startDate ? new Date(project.startDate).toLocaleDateString() : 'N/A'}`]);
      worksheet.addRow([`End Date: ${project.endDate ? new Date(project.endDate).toLocaleDateString() : 'N/A'}`]);
      worksheet.addRow([]);

      // Add department hours breakdown
      worksheet.addRow(['Department Hours Breakdown']);
      worksheet.addRow(['Department', 'Allocated Hours', 'Variable Hours', 'Total Available', 'Consumed Hours', 'Balance Hours']);
      
      project.departmentHours?.forEach(dept => {
        const totalAvailable = dept.allocatedHours + dept.variableHours;
        const balance = totalAvailable - dept.consumedHours;
        worksheet.addRow([
          dept.department,
          dept.allocatedHours,
          dept.variableHours,
          totalAvailable,
          dept.consumedHours,
          balance
        ]);
      });
    }

    // Set response headers for file download
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=employee-report-${Date.now()}.xlsx`);

    // Write workbook to response
    await workbook.xlsx.write(res);
    res.end();

  } catch (error) {
    console.error('Export to Excel error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to generate Excel report' 
    });
  }
};

// Helper function to format hours to HH:MM:SS format
const formatTimeToHHMMSS = (hours) => {
  const totalSeconds = Math.round(hours * 3600);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

// Helper functions
function getProjectSummaryFromEntries(entries) {
  const projectMap = new Map();
  
  entries.forEach(entry => {
    if (!projectMap.has(entry.projectCode)) {
      projectMap.set(entry.projectCode, {
        projectCode: entry.projectCode,
        totalHours: 0,
        normalHours: 0,
        overtimeHours: 0,
        entries: 0
      });
    }
    
    const project = projectMap.get(entry.projectCode);
    project.totalHours += (entry.normalHours || 0) + (entry.overtimeHours || 0);
    project.normalHours += (entry.normalHours || 0);
    project.overtimeHours += (entry.overtimeHours || 0);
    project.entries += 1;
  });
  
  return Array.from(projectMap.values());
}

function getProjectHoursFromEntries(entries, projectCode) {
  let totalHours = 0;
  let normalHours = 0;
  let overtimeHours = 0;
  
  entries.forEach(entry => {
    if (entry.projectCode === projectCode) {
      totalHours += (entry.normalHours || 0) + (entry.overtimeHours || 0);
      normalHours += (entry.normalHours || 0);
      overtimeHours += (entry.overtimeHours || 0);
    }
  });
  
  return { totalHours, normalHours, overtimeHours };
}