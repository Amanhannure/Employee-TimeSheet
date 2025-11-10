import { mockUsers, mockProjects, mockActivityCodes, mockTimesheets } from './mockData.js';

// Mock database operations
class MockDB {
  constructor() {
    this.users = [...mockUsers];
    this.projects = [...mockProjects];
    this.activityCodes = [...mockActivityCodes];
    this.timesheets = [...mockTimesheets];
  }

  // User operations
  findUser(query) {
    return this.users.find(user => 
      user.username === query.username || 
      user.employeeId === query.employeeId
    );
  }

  findUserById(id) {
    return this.users.find(user => user._id === id);
  }

  createUser(userData) {
    const newUser = {
      _id: (this.users.length + 1).toString(),
      ...userData,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.users.push(newUser);
    return newUser;
  }

  // Project operations
  findProjects(filter = {}) {
    return this.projects;
  }

  findProjectById(id) {
    return this.projects.find(project => project._id === id);
  }

  createProject(projectData) {
    const newProject = {
      _id: (this.projects.length + 1).toString(),
      ...projectData,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.projects.push(newProject);
    return newProject;
  }

  // Activity code operations
  findActivityCodes(filter = {}) {
    if (filter.department) {
      return this.activityCodes.filter(code => code.department === filter.department);
    }
    return this.activityCodes;
  }

  createActivityCode(activityData) {
    const newCode = {
      _id: (this.activityCodes.length + 1).toString(),
      ...activityData,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.activityCodes.push(newCode);
    return newCode;
  }

  // Timesheet operations
  findTimesheets(filter = {}) {
    return this.timesheets;
  }

  createTimesheet(timesheetData) {
    const newTimesheet = {
      _id: (this.timesheets.length + 1).toString(),
      ...timesheetData,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.timesheets.push(newTimesheet);
    return newTimesheet;
  }
}

export default new MockDB();