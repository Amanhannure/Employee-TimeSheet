import express from 'express';
import Project from '../models/Project.js';
import Timesheet from '../models/TimeSheet.js';
import User from '../models/User.js';
import ExcelJS from 'exceljs';
import { authenticate, authorizeAdmin } from '../middleware/authMiddleware.js';

const router = express.Router();

// ✅ ADDED: Project Manager Authorization Middleware
const authorizeProjectManager = (req, res, next) => {
  console.log('🔐 Checking project manager authorization...');
  console.log('👤 User role:', req.user.role);
  console.log('👤 User ID:', req.user.id);
  
  if (req.user.role !== 'project_manager' && req.user.role !== 'admin') {
    console.log('❌ Access denied - User is not project manager or admin');
    return res.status(403).json({ 
      message: 'Access denied. Project manager or admin role required.' 
    });
  }
  
  console.log('✅ User authorized as project manager or admin');
  next();
};

// Get all projects (Project Manager/Admin only) - ✅ CHANGED AUTHORIZATION
router.get('/', authenticate, authorizeProjectManager, async (req, res) => {
  try {
    console.log('📋 Fetching all projects for project manager/admin');
    
    const projects = await Project.find()
      .populate('assignedEmployees', 'firstName lastName employeeId department')
      .sort({ createdAt: -1 });
    
    console.log(`✅ Found ${projects.length} projects`);
    res.json(projects);
  } catch (error) {
    console.error('❌ Get projects error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get projects for logged-in employee - ✅ UPDATED: Only active projects
router.get('/my-projects', authenticate, async (req, res) => {
  try {
    console.log(`👤 Fetching assigned projects for employee: ${req.user.id}`);
    
    const projects = await Project.find({ 
      assignedEmployees: req.user.id,
      status: 'active' // ✅ ADDED: Only show active projects to employees
    })
    .populate('assignedEmployees', 'firstName lastName employeeId department')
    .sort({ createdAt: -1 });
    
    console.log(`✅ Found ${projects.length} active assigned projects for employee`);
    res.json(projects);
  } catch (error) {
    console.error('❌ Get my projects error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get single project - ✅ UPDATED: Enhanced access control
router.get('/:id', authenticate, async (req, res) => {
  try {
    console.log(`🔍 Fetching project details for ID: ${req.params.id}`);
    
    const project = await Project.findById(req.params.id)
      .populate('assignedEmployees', 'firstName lastName employeeId department');
    
    if (!project) {
      console.log('❌ Project not found');
      return res.status(404).json({ message: 'Project not found' });
    }

    // ✅ ENHANCED: Check if user has access to this project
    const isProjectManager = req.user.role === 'project_manager' || req.user.role === 'admin';
    const isAssignedEmployee = project.assignedEmployees.some(emp => 
      emp._id.toString() === req.user.id
    );
    
    const hasAccess = isProjectManager || isAssignedEmployee;
    
    console.log(`🔐 Access check - Project Manager: ${isProjectManager}, Assigned: ${isAssignedEmployee}, Has Access: ${hasAccess}`);
    
    if (!hasAccess) {
      console.log('❌ Access denied to project');
      return res.status(403).json({ message: 'Access denied' });
    }

    console.log('✅ Project access granted, sending project data');
    res.json(project);
  } catch (error) {
    console.error('❌ Get project error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create new project (Project Manager/Admin only) - ✅ UPDATED: Include variable hours
router.post('/', authenticate, authorizeProjectManager, async (req, res) => {
  try {
    console.log('📝 Creating new project with data:', req.body);
    
    const {
      projectCode,
      name,
      totalHours,
      departmentHours,
      status,
      assignedEmployees,
      departments,
      startDate,
      endDate
    } = req.body;

    // ✅ UPDATED: Check if projectCode already exists
    const existingProject = await Project.findOne({ projectCode });
    if (existingProject) {
      console.log('❌ Project Code already exists:', projectCode);
      return res.status(400).json({ message: 'Project Code already exists' });
    }

    console.log('✅ Project Code validation passed');

    // ✅ ADDED: Validate department hours allocation
    if (!departmentHours || !Array.isArray(departmentHours) || departmentHours.length === 0) {
      console.log('❌ Department hours allocation required');
      return res.status(400).json({ message: 'Department hours allocation is required' });
    }

    // ✅ UPDATED: Calculate total allocated hours including variable hours
    const totalAllocatedHours = departmentHours.reduce((sum, dept) => 
      sum + dept.allocatedHours + (dept.variableHours || 0), 0
    );
    console.log(`📊 Total allocated + variable hours: ${totalAllocatedHours}, Project total hours: ${totalHours}`);

    if (totalAllocatedHours > totalHours) {
      console.log('❌ Department hours (allocated + variable) exceed total project hours');
      return res.status(400).json({ 
        message: 'Sum of department allocated + variable hours cannot exceed total project hours' 
      });
    }

    // ✅ UPDATED: Create project with variable hours support
    const newProject = new Project({
      projectCode,
      name,
      totalHours: parseInt(totalHours),
      departmentHours: departmentHours.map(dept => ({
        department: dept.department,
        allocatedHours: parseInt(dept.allocatedHours),
        variableHours: parseInt(dept.variableHours) || 0, // ✅ ADDED: Variable hours
        consumedHours: 0
      })),
      status: status || 'active',
      assignedEmployees: assignedEmployees || [],
      departments: departments || [],
      startDate: startDate || null,
      endDate: endDate || null
    });

    console.log('💾 Saving new project to database...');
    await newProject.save();
    
    // Populate the response
    const populatedProject = await Project.findById(newProject._id)
      .populate('assignedEmployees', 'firstName lastName employeeId department');

    console.log('🎉 Project created successfully:', populatedProject._id);

    res.status(201).json({
      message: 'Project created successfully',
      project: populatedProject
    });

  } catch (error) {
    console.error('❌ Create project error:', error);
    
    // ✅ IMPROVED: Better error handling for duplicate key
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      console.error(`❌ Duplicate ${field}: ${error.keyValue[field]}`);
      return res.status(400).json({ 
        message: `${field} already exists: ${error.keyValue[field]}` 
      });
    }
    
    res.status(500).json({ 
      message: 'Server error creating project',
      error: error.message 
    });
  }
});

// Update project (Project Manager/Admin only) - ✅ UPDATED: Include variable hours
router.put('/:id', authenticate, authorizeProjectManager, async (req, res) => {
  try {
    console.log(`📝 Updating project ${req.params.id} with data:`, req.body);
    
    // ✅ UPDATED: Include variable hours in update data
    const updateData = {
      projectCode: req.body.projectCode,
      name: req.body.name,
      totalHours: parseInt(req.body.totalHours),
      departmentHours: req.body.departmentHours ? req.body.departmentHours.map(dept => ({
        department: dept.department,
        allocatedHours: parseInt(dept.allocatedHours),
        variableHours: parseInt(dept.variableHours) || 0, // ✅ ADDED: Variable hours
        consumedHours: parseInt(dept.consumedHours) || 0
      })) : undefined,
      status: req.body.status,
      assignedEmployees: req.body.assignedEmployees,
      departments: req.body.departments,
      startDate: req.body.startDate,
      endDate: req.body.endDate
    };

    // Remove undefined fields
    Object.keys(updateData).forEach(key => {
      if (updateData[key] === undefined) {
        delete updateData[key];
      }
    });

    console.log('📋 Final update data:', updateData);

    const updatedProject = await Project.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).populate('assignedEmployees', 'firstName lastName employeeId department');

    if (!updatedProject) {
      console.log('❌ Project not found for update');
      return res.status(404).json({ message: 'Project not found' });
    }

    console.log('✅ Project updated successfully');

    res.json({
      message: 'Project updated successfully',
      project: updatedProject
    });
  } catch (error) {
    console.error('❌ Update project error:', error);
    
    // ✅ ADDED: Handle duplicate key errors in update
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      console.error(`❌ Duplicate ${field}: ${error.keyValue[field]}`);
      return res.status(400).json({ 
        message: `${field} already exists: ${error.keyValue[field]}` 
      });
    }
    
    res.status(500).json({ 
      message: 'Server error updating project',
      error: error.message 
    });
  }
});

// ✅ ADDED: Add variable hours to project (for admin to extend hours)
router.patch('/:id/add-variable-hours', authenticate, authorizeProjectManager, async (req, res) => {
  try {
    console.log(`➕ Adding variable hours to project ${req.params.id}:`, req.body);
    
    const { department, variableHours } = req.body;
    
    if (!department || !variableHours || variableHours <= 0) {
      console.log('❌ Invalid variable hours data');
      return res.status(400).json({ 
        message: 'Department and positive variable hours are required' 
      });
    }

    const project = await Project.findById(req.params.id);
    
    if (!project) {
      console.log('❌ Project not found');
      return res.status(404).json({ message: 'Project not found' });
    }

    // Add variable hours using the model method
    await project.addVariableHours(department, parseInt(variableHours));
    
    // Get updated project
    const updatedProject = await Project.findById(req.params.id)
      .populate('assignedEmployees', 'firstName lastName employeeId department');

    console.log('✅ Variable hours added successfully');

    res.json({
      message: `Successfully added ${variableHours} variable hours to ${department}`,
      project: updatedProject
    });
  } catch (error) {
    console.error('❌ Add variable hours error:', error);
    res.status(500).json({ 
      message: 'Server error adding variable hours',
      error: error.message 
    });
  }
});

// ✅ COMPLETELY REPLACED: Export project to Excel with proper format
router.get('/:id/export', authenticate, authorizeProjectManager, async (req, res) => {
  try {
    console.log(`📊 Exporting project ${req.params.id} to Excel`);
    
    const project = await Project.findById(req.params.id)
      .populate('assignedEmployees', 'firstName lastName employeeId department');
    
    if (!project) {
      console.log('❌ Project not found for export');
      return res.status(404).json({ message: 'Project not found' });
    }

    // Get timesheets for this project
    const timesheets = await Timesheet.find({
      'entries.projectCode': project.projectCode
    })
    .populate('employee', 'firstName lastName employeeId department')
    .sort({ weekStartDate: -1 })
    .lean();

    console.log(`📊 Found ${timesheets.length} timesheets for project ${project.projectCode}`);

    // Create Excel workbook
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Project Timesheet Report');

    // === REPORT GENERATED VIA PROJECT CODE SECTION ===
    worksheet.mergeCells('A1:K1');
    worksheet.getCell('A1').value = 'Report generated via Project Code';
    worksheet.getCell('A1').alignment = { horizontal: 'center' };
    worksheet.getCell('A1').font = { bold: true, size: 14 };
    
    worksheet.addRow([]); // Empty row
    
    // Add table headers
    const headers = ['Sr no.', 'Project No.', 'Project Name', 'Employee name', 'Department', 'Activity Name', 'Consumed Hour', 'Start date', 'End Date', 'Total Hour', 'Remarks'];
    const headerRow = worksheet.addRow(headers);
    
    // Style the header row
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
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
        fgColor: { argb: 'FF2E75B6' }
      };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
    });

    // Add project timesheet data
    let srNo = 1;
    let totalConsumedHours = 0;

    // If timesheets exist, add timesheet entries
    if (timesheets && timesheets.length > 0) {
      timesheets.forEach(timesheet => {
        if (timesheet.entries && timesheet.entries.length > 0) {
          timesheet.entries.forEach(entry => {
            // Only include entries for this project
            if (entry.projectCode === project.projectCode) {
              const consumedHours = (entry.normalHours || 0) + (entry.overtimeHours || 0);
              totalConsumedHours += consumedHours;
              
              const dataRow = worksheet.addRow([
                srNo++,
                project.projectCode,
                project.name,
                `${timesheet.employee.firstName} ${timesheet.employee.lastName}`,
                timesheet.employee.department,
                entry.activityCode,
                formatTimeToHHMMSS(consumedHours),
                new Date(timesheet.weekStartDate).toLocaleDateString('en-GB'),
                new Date(timesheet.weekEndDate).toLocaleDateString('en-GB'),
                'Project Hour',
                'Things written in remarks'
              ]);
              
              // Add borders to data rows
              dataRow.eachCell((cell) => {
                cell.border = {
                  top: { style: 'thin' },
                  left: { style: 'thin' },
                  bottom: { style: 'thin' },
                  right: { style: 'thin' }
                };
              });
            }
          });
        }
      });
    }

    // If no timesheet data, show assigned employees
    if (srNo === 1) {
      if (project.assignedEmployees && project.assignedEmployees.length > 0) {
        project.assignedEmployees.forEach(employee => {
          const dataRow = worksheet.addRow([
            srNo++,
            project.projectCode,
            project.name,
            `${employee.firstName} ${employee.lastName}`,
            employee.department,
            'No Activity',
            '00:00:00',
            'N/A',
            'N/A',
            'Project Hour',
            'No timesheet data available'
          ]);
          
          // Add borders to data rows
          dataRow.eachCell((cell) => {
            cell.border = {
              top: { style: 'thin' },
              left: { style: 'thin' },
              bottom: { style: 'thin' },
              right: { style: 'thin' }
            };
          });
        });
      } else {
        const dataRow = worksheet.addRow([
          srNo++,
          project.projectCode,
          project.name,
          'No Employee Assigned',
          'N/A',
          'No Activity',
          '00:00:00',
          'N/A',
          'N/A',
          'Project Hour',
          'No employees assigned to project'
        ]);
        
        // Add borders to data rows
        dataRow.eachCell((cell) => {
          cell.border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' }
          };
        });
      }
    }

    // Add total row if we have data
    if (srNo > 1) {
      const totalRowNumber = worksheet.rowCount + 1;
      worksheet.addRow([]);
      
      // Add sum formula for consumed hours
      const sumRow = worksheet.addRow([
        '', '', '', '', '', '',
        `=SUM(G4:G${totalRowNumber - 1})`, '', '', '', 'Total Hours'
      ]);
      
      // Style the sum row
      sumRow.font = { bold: true };
      sumRow.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
        if (cell.value === 'Total Hours') {
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFFCE4D6' }
          };
        }
      });
    }

    // Set column widths
    worksheet.columns = [
      { width: 8 },   // Sr no.
      { width: 15 },  // Project No.
      { width: 25 },  // Project Name
      { width: 20 },  // Employee name
      { width: 15 },  // Department
      { width: 18 },  // Activity Name
      { width: 15 },  // Consumed Hour
      { width: 12 },  // Start date
      { width: 12 },  // End Date
      { width: 12 },  // Total Hour
      { width: 25 }   // Remarks
    ];

    // Set response headers for file download
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="project-${project.projectCode}-report.xlsx"`);
    res.setHeader('Cache-Control', 'no-cache');

    // Write workbook to response
    await workbook.xlsx.write(res);
    res.end();
    
    console.log('✅ Project exported successfully in new Excel format');

  } catch (error) {
    console.error('❌ Export project error:', error);
    res.status(500).json({ 
      message: 'Server error exporting project',
      error: error.message 
    });
  }
});

// ✅ COMPLETELY REPLACED: Export all projects to Excel with proper format
router.get('/export/all', authenticate, authorizeProjectManager, async (req, res) => {
  try {
    console.log('📊 Exporting all projects to Excel');
    
    const projects = await Project.find()
      .populate('assignedEmployees', 'firstName lastName employeeId department')
      .sort({ createdAt: -1 });

    // Create Excel workbook
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('All Projects Report');

    // Add header
    worksheet.mergeCells('A1:K1');
    worksheet.getCell('A1').value = 'All Projects Report - Generated via Project Code';
    worksheet.getCell('A1').alignment = { horizontal: 'center' };
    worksheet.getCell('A1').font = { bold: true, size: 14 };
    
    worksheet.addRow([]); // Empty row
    
    // Add table headers
    const headers = ['Sr no.', 'Project No.', 'Project Name', 'Employee name', 'Department', 'Activity Name', 'Consumed Hour', 'Start date', 'End Date', 'Total Hour', 'Remarks'];
    const headerRow = worksheet.addRow(headers);
    
    // Style the header row
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
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
        fgColor: { argb: 'FF2E75B6' }
      };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
    });

    let srNo = 1;
    let totalProjectsProcessed = 0;

    // Add data for all projects
    for (const project of projects) {
      totalProjectsProcessed++;
      
      // Get timesheets for this project
      const timesheets = await Timesheet.find({
        'entries.projectCode': project.projectCode
      })
      .populate('employee', 'firstName lastName employeeId department')
      .sort({ weekStartDate: -1 })
      .lean();

      let hasTimesheetData = false;

      // Add timesheet entries if available
      if (timesheets && timesheets.length > 0) {
        timesheets.forEach(timesheet => {
          if (timesheet.entries && timesheet.entries.length > 0) {
            timesheet.entries.forEach(entry => {
              if (entry.projectCode === project.projectCode) {
                const consumedHours = (entry.normalHours || 0) + (entry.overtimeHours || 0);
                
                const dataRow = worksheet.addRow([
                  srNo++,
                  project.projectCode,
                  project.name,
                  `${timesheet.employee.firstName} ${timesheet.employee.lastName}`,
                  timesheet.employee.department,
                  entry.activityCode,
                  formatTimeToHHMMSS(consumedHours),
                  new Date(timesheet.weekStartDate).toLocaleDateString('en-GB'),
                  new Date(timesheet.weekEndDate).toLocaleDateString('en-GB'),
                  'Project Hour',
                  'Things written in remarks'
                ]);
                
                // Add borders to data rows
                dataRow.eachCell((cell) => {
                  cell.border = {
                    top: { style: 'thin' },
                    left: { style: 'thin' },
                    bottom: { style: 'thin' },
                    right: { style: 'thin' }
                  };
                });
                
                hasTimesheetData = true;
              }
            });
          }
        });
      }

      // If no timesheet data, show assigned employees
      if (!hasTimesheetData) {
        if (project.assignedEmployees && project.assignedEmployees.length > 0) {
          project.assignedEmployees.forEach(employee => {
            const dataRow = worksheet.addRow([
              srNo++,
              project.projectCode,
              project.name,
              `${employee.firstName} ${employee.lastName}`,
              employee.department,
              'No Activity',
              '00:00:00',
              'N/A',
              'N/A',
              'Project Hour',
              'No timesheet data available'
            ]);
            
            // Add borders to data rows
            dataRow.eachCell((cell) => {
              cell.border = {
                top: { style: 'thin' },
                left: { style: 'thin' },
                bottom: { style: 'thin' },
                right: { style: 'thin' }
              };
            });
          });
        } else {
          const dataRow = worksheet.addRow([
            srNo++,
            project.projectCode,
            project.name,
            'No Employee Assigned',
            'N/A',
            'No Activity',
            '00:00:00',
            'N/A',
            'N/A',
            'Project Hour',
            'No employees assigned'
          ]);
          
          // Add borders to data rows
          dataRow.eachCell((cell) => {
            cell.border = {
              top: { style: 'thin' },
              left: { style: 'thin' },
              bottom: { style: 'thin' },
              right: { style: 'thin' }
            };
          });
        }
      }
    }

    // Add summary row
    if (srNo > 1) {
      const totalRowNumber = worksheet.rowCount + 1;
      worksheet.addRow([]);
      
      const summaryRow = worksheet.addRow([
        '', '', '', '', '', '',
        `=SUM(G4:G${totalRowNumber - 1})`, '', '', '', `Total: ${totalProjectsProcessed} Projects`
      ]);
      
      // Style the summary row
      summaryRow.font = { bold: true };
      summaryRow.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
        if (cell.value && cell.value.toString().includes('Total:')) {
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFFCE4D6' }
          };
        }
      });
    }

    // Set column widths
    worksheet.columns = [
      { width: 8 },   // Sr no.
      { width: 15 },  // Project No.
      { width: 25 },  // Project Name
      { width: 20 },  // Employee name
      { width: 15 },  // Department
      { width: 18 },  // Activity Name
      { width: 15 },  // Consumed Hour
      { width: 12 },  // Start date
      { width: 12 },  // End Date
      { width: 12 },  // Total Hour
      { width: 25 }   // Remarks
    ];

    // Set response headers
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="all-projects-report.xlsx"`);
    res.setHeader('Cache-Control', 'no-cache');

    // Write workbook to response
    await workbook.xlsx.write(res);
    res.end();
    
    console.log(`✅ Exported ${totalProjectsProcessed} projects successfully in new Excel format`);

  } catch (error) {
    console.error('❌ Export all projects error:', error);
    res.status(500).json({ 
      message: 'Server error exporting projects',
      error: error.message 
    });
  }
});

// Helper function to format hours to HH:MM:SS format
const formatTimeToHHMMSS = (hours) => {
  const totalSeconds = Math.round(hours * 3600);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

// Delete project (Project Manager/Admin only) - ✅ CHANGED AUTHORIZATION
router.delete('/:id', authenticate, authorizeProjectManager, async (req, res) => {
  try {
    console.log(`🗑️ Deleting project: ${req.params.id}`);
    
    const project = await Project.findByIdAndDelete(req.params.id);
    
    if (!project) {
      console.log('❌ Project not found for deletion');
      return res.status(404).json({ message: 'Project not found' });
    }

    console.log('✅ Project deleted successfully');
    res.json({ message: 'Project deleted successfully' });
  } catch (error) {
    console.error('❌ Delete project error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;