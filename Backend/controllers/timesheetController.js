import Timesheet from "../models/TimeSheet.js";
import User from "../models/User.js";
import Project from "../models/Project.js";
import mongoose from "mongoose";
import { Parser } from "json2csv";
// import ExtendedAccess from "../models/ExtendedAccess.js";

// ✅ FIXED: Check for pending rejected timesheets blocking
const checkPendingRejectedBlock = async (employeeId) => {
  try {
    const fifteenDaysAgo = new Date();
    fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 15);
    fifteenDaysAgo.setHours(23, 59, 59, 999); // End of the day 15 days ago

    // Only block if rejected MORE than 15 days ago and not expired
    const pendingRejected = await Timesheet.findOne({
      employee: employeeId,
      status: 'rejected',
      rejectedAt: { $lt: fifteenDaysAgo },
      isExpired: false
    });

    return {
      isBlocked: !!pendingRejected,
      blockedTimesheet: pendingRejected,
    };
  } catch (error) {
    console.error("Error checking pending rejected block:", error);
    return { isBlocked: false, blockedTimesheet: null };
  }
};

// ✅ ADDED: Check if employee has extended access for old dates
const checkExtendedAccess = async (employeeId, targetDate) => {
  try {
    // Check if targetDate is older than 15 days
    const fifteenDaysAgo = new Date();
    fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 15);
    
    if (targetDate >= fifteenDaysAgo) {
      return false; // No need for extended access
    }
    
    // Check for active extended access
    const extendedAccess = await ExtendedAccess.findOne({
      employeeId: employeeId,
      status: "active",
      expiresAt: { $gt: new Date() },
    });
    
    return !!extendedAccess;
  } catch (error) {
    console.error("Error checking extended access:", error);
    return false;
  }
};

// ✅ FIXED: Validate no future dates in entries
const validateNoFutureDates = (entries) => {
  const today = new Date();
  today.setHours(23, 59, 59, 999); // End of today

  const futureEntries = entries.filter((entry) => {
    const entryDate = new Date(entry.date);
    return entryDate > today;
  });

  if (futureEntries.length > 0) {
    const futureDates = [
      ...new Set(
        futureEntries.map((entry) =>
          new Date(entry.date).toLocaleDateString("en-GB")
        )
      ),
    ];
    throw new Error(
      `Cannot submit hours for future dates: ${futureDates.join(", ")}`
    );
  }

  return true;
};

// ✅ ADDED: Archive old timesheets function
export const archiveOldTimesheets = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const cutoffDate = new Date();
    cutoffDate.setMonth(cutoffDate.getMonth() - 3); // Archive timesheets older than 3 months

    console.log(`🔄 Archiving timesheets older than: ${cutoffDate.toISOString()}`);

    const result = await Timesheet.updateMany(
      {
        weekEndDate: { $lt: cutoffDate },
        isArchived: { $ne: true }
      },
      {
        $set: {
          isArchived: true,
          archivedAt: new Date()
        }
      }
    ).session(session);

    await session.commitTransaction();

    console.log(`✅ Successfully archived ${result.modifiedCount} timesheets`);

    res.json({
      message: `Successfully archived ${result.modifiedCount} timesheets older than ${cutoffDate.toLocaleDateString()}`,
      archivedCount: result.modifiedCount,
      cutoffDate: cutoffDate,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    await session.abortTransaction();
    console.error("❌ Archive old timesheets error:", error);
    res.status(500).json({
      message: "Server error archiving timesheets",
      error: error.message,
    });
  } finally {
    session.endSession();
  }
};

// ✅ ADDED: Expire editing periods function
export const expireEditingPeriods = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const now = new Date();

    const result = await Timesheet.updateMany(
      {
        status: 'rejected',
        editableUntil: { $lt: now },
        isExpired: false
      },
      {
        $set: {
          isExpired: true,
          expiredAt: new Date()
        }
      }
    ).session(session);

    await session.commitTransaction();

    console.log(`✅ Successfully expired ${result.modifiedCount} editing periods`);

    res.json({
      message: `Successfully expired ${result.modifiedCount} editing periods`,
      expiredCount: result.modifiedCount,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    await session.abortTransaction();
    console.error("❌ Expire editing periods error:", error);
    res.status(500).json({
      message: "Server error expiring editing periods",
      error: error.message,
    });
  } finally {
    session.endSession();
  }
};

// ✅ ADDED: Get editable timesheets function
export const getEditableTimesheets = async (req, res) => {
  try {
    const now = new Date();

    const editableTimesheets = await Timesheet.find({
      employee: req.user.id,
      status: 'rejected',
      editableUntil: { $gt: now },
      isExpired: false
    })
      .populate("employee", "firstName lastName employeeId department")
      .populate("rejectedBy", "firstName lastName")
      .sort({ editableUntil: 1 });

    const enhancedTimesheets = editableTimesheets.map((timesheet) => {
      const timesheetObj = timesheet.toObject();
      const daysRemaining = Math.ceil((timesheet.editableUntil - now) / (24 * 60 * 60 * 1000));
      
      timesheetObj.daysRemaining = daysRemaining;
      timesheetObj.canEdit = true;
      timesheetObj.isExpired = false;

      return timesheetObj;
    });

    res.json({
      timesheets: enhancedTimesheets,
      count: enhancedTimesheets.length,
      message: enhancedTimesheets.length > 0 
        ? `You have ${enhancedTimesheets.length} timesheet(s) that can be edited` 
        : 'No editable timesheets found'
    });
  } catch (error) {
    console.error("❌ Get editable timesheets error:", error);
    res.status(500).json({
      message: "Server error loading editable timesheets",
      error: error.message,
    });
  }
};

// ✅ ADDED: Export multiple timesheets to CSV function
export const exportMultipleTimesheetsToCSV = async (req, res) => {
  try {
    const { timesheetIds, filters = {} } = req.body;

    let query = {};

    if (timesheetIds && timesheetIds.length > 0) {
      query._id = { $in: timesheetIds };
    } else {
      if (filters.status && ["draft", "pending", "approved", "rejected"].includes(filters.status)) {
        query.status = filters.status;
      }

      if (filters.department && typeof filters.department === "string") {
        query.department = filters.department;
      }

      if (filters.employeeCode && typeof filters.employeeCode === "string") {
        query.employeeCode = { $regex: filters.employeeCode, $options: "i" };
      }

      if (filters.year && !isNaN(filters.year)) {
        query.year = parseInt(filters.year);
      }

      if (filters.month && !isNaN(filters.month) && filters.year && !isNaN(filters.year)) {
        const startDate = new Date(filters.year, filters.month - 1, 1);
        const endDate = new Date(filters.year, filters.month, 0);
        query.weekStartDate = { $gte: startDate, $lte: endDate };
      }
    }

    const timesheets = await Timesheet.find(query)
      .populate("employee", "firstName lastName employeeId department")
      .populate("approvedBy", "firstName lastName")
      .populate("rejectedBy", "firstName lastName")
      .sort({ weekStartDate: -1, employeeCode: 1 });

    if (!timesheets || timesheets.length === 0) {
      return res.status(404).json({ message: "No timesheets found for export" });
    }

    const csvData = [];
    
    timesheets.forEach((timesheet) => {
      timesheet.entries.forEach((entry) => {
        csvData.push({
          "Employee Code": timesheet.employeeCode,
          "Employee Name": timesheet.employeeName,
          Department: timesheet.department,
          Date: new Date(entry.date).toLocaleDateString("en-GB"),
          Day: entry.dayOfWeek,
          "Project Code": entry.projectCode,
          Location: entry.location || "",
          "Normal Hours": entry.normalHours || 0,
          "Overtime Hours": entry.overtimeHours || 0,
          "Total Hours": (
            (entry.normalHours || 0) + (entry.overtimeHours || 0)
          ).toFixed(2),
          "Activity Code": entry.activityCode,
          Remarks: entry.remarks || "",
          Status: timesheet.status,
          "Week Start": new Date(timesheet.weekStartDate).toLocaleDateString("en-GB"),
          "Week End": new Date(timesheet.weekEndDate).toLocaleDateString("en-GB"),
          "Week Number": timesheet.weekNumber,
          Year: timesheet.year,
          "Total Normal Hours": timesheet.totalNormalHours,
          "Total Overtime Hours": timesheet.totalOvertimeHours,
          "Grand Total Hours": timesheet.totalHours,
          "Submitted At": timesheet.submittedAt ? new Date(timesheet.submittedAt).toLocaleDateString("en-GB") : "",
          "Approved By": timesheet.approvedBy ? `${timesheet.approvedBy.firstName} ${timesheet.approvedBy.lastName}` : "",
          "Approved At": timesheet.approvedAt ? new Date(timesheet.approvedAt).toLocaleDateString("en-GB") : "",
          "Rejected By": timesheet.rejectedBy ? `${timesheet.rejectedBy.firstName} ${timesheet.rejectedBy.lastName}` : "",
          "Rejected At": timesheet.rejectedAt ? new Date(timesheet.rejectedAt).toLocaleDateString("en-GB") : "",
          "Rejection Reason": timesheet.rejectionReason || "",
          "Editable Until": timesheet.editableUntil
            ? new Date(timesheet.editableUntil).toLocaleDateString("en-GB")
            : "",
          "Can Edit": timesheet.status === "rejected"
            ? timesheet.editableUntil && timesheet.editableUntil > new Date()
              ? "Yes"
              : "No"
            : "N/A",
          "Days Remaining": timesheet.status === "rejected" && timesheet.editableUntil
            ? Math.ceil((timesheet.editableUntil - new Date()) / (24 * 60 * 60 * 1000))
            : "N/A",
        });
      });
    });

    const fields = [
      "Employee Code", "Employee Name", "Department", "Date", "Day",
      "Project Code", "Location", "Normal Hours", "Overtime Hours",
      "Total Hours", "Activity Code", "Remarks", "Status", "Week Start",
      "Week End", "Week Number", "Year", "Total Normal Hours",
      "Total Overtime Hours", "Grand Total Hours", "Submitted At",
      "Approved By", "Approved At", "Rejected By", "Rejected At",
      "Rejection Reason", "Editable Until", "Can Edit", "Days Remaining",
    ];

    const json2csvParser = new Parser({ fields });
    const csv = json2csvParser.parse(csvData);

    const timestamp = new Date().toISOString().split('T')[0];
    res.header("Content-Type", "text/csv");
    res.attachment(`timesheets-bulk-export-${timestamp}.csv`);
    res.send(csv);

    console.log(`✅ Successfully exported ${timesheets.length} timesheets with ${csvData.length} entries to CSV`);

  } catch (error) {
    console.error("❌ Export multiple timesheets error:", error);
    res.status(500).json({
      message: "Server error exporting multiple timesheets",
      error: error.message,
    });
  }
};

// ✅ FIXED: Submit timesheet with extended access check
export const submitTimesheet = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { weekStartDate, weekEndDate, entries } = req.body;

    console.log("📝 Submitting timesheet:", {
      weekStartDate,
      weekEndDate,
      entriesCount: entries?.length,
    });

    // Check for pending rejected block
    const blockCheck = await checkPendingRejectedBlock(req.user.id);
    if (blockCheck.isBlocked) {
      await session.abortTransaction();
      return res.status(403).json({
        message:
          "Cannot submit new timesheets. You have rejected timesheets older than 15 days that need attention.",
        code: "PENDING_REJECTED_BLOCK",
        requiresResolution: true,
        blockedSince: blockCheck.blockedTimesheet?.submittedAt,
        timesheetId: blockCheck.blockedTimesheet?._id,
      });
    }

    // Validation
    if (!weekStartDate || !weekEndDate) {
      await session.abortTransaction();
      return res.status(400).json({ message: "Week dates are required" });
    }

    if (!entries || entries.length === 0) {
      await session.abortTransaction();
      return res
        .status(400)
        .json({ message: "At least one timesheet entry is required" });
    }

    // ✅ ADDED: Validate no old dates without extended access
    try {
      const hasExtendedAccess = await checkExtendedAccess(req.user.id, new Date(weekStartDate));
      
      if (!hasExtendedAccess) {
        // Check if any entry is older than 15 days
        const fifteenDaysAgo = new Date();
        fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 15);
        
        const oldEntries = entries.filter(entry => {
          const entryDate = new Date(entry.date);
          return entryDate < fifteenDaysAgo;
        });
        
        if (oldEntries.length > 0) {
          const oldDates = [
            ...new Set(
              oldEntries.map(entry =>
                new Date(entry.date).toLocaleDateString("en-GB")
              )
            ),
          ];
          
          await session.abortTransaction();
          return res.status(403).json({
            message: `Cannot submit hours for dates older than 15 days: ${oldDates.join(", ")}. Request extended access from admin.`,
            code: "OLD_DATES_NOT_ALLOWED",
            requiresExtendedAccess: true,
            oldDates: oldDates,
          });
        }
      }
    } catch (dateError) {
      await session.abortTransaction();
      return res.status(400).json({
        message: dateError.message,
        code: "DATE_VALIDATION_ERROR",
      });
    }

    // Validate no future dates
    try {
      validateNoFutureDates(entries);
    } catch (dateError) {
      await session.abortTransaction();
      return res.status(400).json({
        message: dateError.message,
        code: "FUTURE_DATES_NOT_ALLOWED",
      });
    }

    const user = await User.findById(req.user.id).session(session);
    if (!user) {
      await session.abortTransaction();
      return res.status(404).json({ message: "User not found" });
    }

    // Check if timesheet already exists for this week
    const existingTimesheet = await Timesheet.findOne({
      employee: req.user.id,
      weekStartDate: new Date(weekStartDate),
      weekEndDate: new Date(weekEndDate),
    }).session(session);

    if (existingTimesheet) {
      await session.abortTransaction();
      return res.status(400).json({
        message: "Timesheet already submitted for this week",
        existingTimesheet: {
          _id: existingTimesheet._id,
          status: existingTimesheet.status,
        },
      });
    }

    // Calculate week number and year
    const startDate = new Date(weekStartDate);
    const startOfYear = new Date(startDate.getFullYear(), 0, 1);
    const days = Math.floor((startDate - startOfYear) / (24 * 60 * 60 * 1000));
    const weekNumber = Math.ceil((days + 1) / 7);
    const year = startDate.getFullYear();

    // Calculate totals
    const totalNormalHours = entries.reduce(
      (sum, entry) => sum + (entry.normalHours || 0),
      0
    );
    const totalOvertimeHours = entries.reduce(
      (sum, entry) => sum + (entry.overtimeHours || 0),
      0
    );

    const timesheetData = {
      employee: req.user.id,
      employeeCode: user.employeeId,
      employeeName: `${user.firstName} ${user.lastName}`,
      department: user.department,
      weekStartDate: new Date(weekStartDate),
      weekEndDate: new Date(weekEndDate),
      weekNumber: weekNumber,
      year: year,
      entries: entries,
      totalNormalHours: totalNormalHours,
      totalOvertimeHours: totalOvertimeHours,
      totalHours: totalNormalHours + totalOvertimeHours,
      status: "pending",
      submittedAt: new Date(),
      projectHoursCounted: false,
    };

    console.log("💾 Saving timesheet data:", {
      weekNumber,
      year,
      totalNormalHours,
      totalOvertimeHours,
      status: "pending",
    });

    const timesheet = new Timesheet(timesheetData);
    await timesheet.save({ session });

    await session.commitTransaction();

    const populatedTimesheet = await Timesheet.findById(timesheet._id).populate(
      "employee",
      "firstName lastName employeeId department"
    );

    console.log("✅ Timesheet submitted successfully with status: pending");

    res.status(201).json({
      message: "Timesheet submitted successfully",
      timesheet: populatedTimesheet,
      canSubmitMore: true,
    });
  } catch (error) {
    await session.abortTransaction();
    console.error("❌ Submit timesheet error:", error);
    res.status(500).json({
      message: "Server error submitting timesheet",
      error: error.message,
      code: "SUBMISSION_ERROR",
    });
  } finally {
    session.endSession();
  }
};

// ✅ FIXED: Approve timesheet
export const approveTimesheet = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { id } = req.params;

    const timesheet = await Timesheet.findById(id).session(session);
    if (!timesheet) {
      await session.abortTransaction();
      return res.status(404).json({ message: "Timesheet not found" });
    }

    if (timesheet.status !== "pending") {
      await session.abortTransaction();
      return res.status(400).json({
        message: `Timesheet is not in pending status. Current status: ${timesheet.status}`,
      });
    }

    // Update timesheet status
    timesheet.status = "approved";
    timesheet.approvedBy = req.user.id;
    timesheet.approvedAt = new Date();

    await timesheet.save({ session });

    await session.commitTransaction();

    const populatedTimesheet = await Timesheet.findById(id)
      .populate("employee", "firstName lastName employeeId department")
      .populate("approvedBy", "firstName lastName");

    console.log("✅ Timesheet approved successfully");

    res.json({
      message: "Timesheet approved successfully",
      timesheet: populatedTimesheet,
    });
  } catch (error) {
    await session.abortTransaction();
    console.error("❌ Approve timesheet error:", error);
    res.status(500).json({
      message: "Server error approving timesheet",
      error: error.message,
    });
  } finally {
    session.endSession();
  }
};

// ✅ FIXED: Reject timesheet with proper 15-day window
export const rejectTimesheet = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { id } = req.params;
    const { remarks, category } = req.body;

    const sanitizedRemarks = remarks ? remarks.trim().substring(0, 500) : "";
    const rejectionCategory = category || "other";

    const timesheet = await Timesheet.findById(id).session(session);
    if (!timesheet) {
      await session.abortTransaction();
      return res.status(404).json({ message: "Timesheet not found" });
    }

    if (timesheet.status !== "pending") {
      await session.abortTransaction();
      return res.status(400).json({
        message: `Timesheet is not in pending status. Current status: ${timesheet.status}`,
      });
    }

    if (!sanitizedRemarks) {
      await session.abortTransaction();
      return res
        .status(400)
        .json({ message: "Rejection remarks are required" });
    }

    // Set rejection timestamp for 15-day tracking
    timesheet.status = "rejected";
    timesheet.rejectionReason = sanitizedRemarks;
    timesheet.rejectionCategory = rejectionCategory;
    timesheet.rejectedBy = req.user.id;
    timesheet.rejectedAt = new Date();

    const editableUntil = new Date();
    editableUntil.setDate(editableUntil.getDate() + 15);
    editableUntil.setHours(23, 59, 59, 999);
    timesheet.editableUntil = editableUntil;
    timesheet.isExpired = false;

    await timesheet.save({ session });

    await session.commitTransaction();

    const populatedTimesheet = await Timesheet.findById(id)
      .populate("employee", "firstName lastName employeeId department")
      .populate("rejectedBy", "firstName lastName");

    const daysRemaining = 15;
    const editableUntilFormatted = timesheet.editableUntil.toLocaleDateString();

    res.json({
      message:
        "Timesheet rejected successfully. Employee has 15 days to edit and resubmit.",
      timesheet: populatedTimesheet,
      editableUntil: timesheet.editableUntil,
      daysRemaining: daysRemaining,
      editableUntilFormatted: editableUntilFormatted,
    });
  } catch (error) {
    await session.abortTransaction();
    console.error("❌ Reject timesheet error:", error);
    res.status(500).json({
      message: "Server error rejecting timesheet",
      error: error.message,
    });
  } finally {
    session.endSession();
  }
};

// ✅ FIXED: Edit rejected timesheet with proper validation
export const editRejectedTimesheet = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { id } = req.params;
    const { entries } = req.body;

    const timesheet = await Timesheet.findById(id).session(session);
    if (!timesheet) {
      await session.abortTransaction();
      return res.status(404).json({ message: "Timesheet not found" });
    }

    if (timesheet.status !== "rejected") {
      await session.abortTransaction();
      return res.status(400).json({ 
        message: "Only rejected timesheets can be edited",
        code: "NOT_REJECTED"
      });
    }

    if (!timesheet.editableUntil) {
      await session.abortTransaction();
      return res.status(400).json({ 
        message: "This timesheet cannot be edited. No editing period was set.",
        code: "NO_EDITING_PERIOD",
        editableUntil: null
      });
    }

    if (timesheet.isExpired) {
      await session.abortTransaction();
      return res.status(400).json({ 
        message: "Editing period has expired. This timesheet can no longer be edited.",
        code: "EDITING_PERIOD_EXPIRED",
        editableUntil: timesheet.editableUntil
      });
    }

    if (new Date() > timesheet.editableUntil) {
      await session.abortTransaction();
      return res.status(400).json({ 
        message: "Editing period has ended. This timesheet can no longer be edited.",
        code: "EDITING_PERIOD_ENDED",
        editableUntil: timesheet.editableUntil
      });
    }

    if (!entries || entries.length === 0) {
      await session.abortTransaction();
      return res
        .status(400)
        .json({ message: "At least one timesheet entry is required" });
    }

    // Validate no future dates for edited entries
    try {
      validateNoFutureDates(entries);
    } catch (dateError) {
      await session.abortTransaction();
      return res.status(400).json({
        message: dateError.message,
        code: "FUTURE_DATES_NOT_ALLOWED",
      });
    }

    const originalEntries = JSON.parse(JSON.stringify(timesheet.entries));

    timesheet.entries = entries;

    const totalNormalHours = entries.reduce(
      (sum, entry) => sum + (entry.normalHours || 0),
      0
    );
    const totalOvertimeHours = entries.reduce(
      (sum, entry) => sum + (entry.overtimeHours || 0),
      0
    );

    timesheet.totalNormalHours = totalNormalHours;
    timesheet.totalOvertimeHours = totalOvertimeHours;
    timesheet.totalHours = totalNormalHours + totalOvertimeHours;

    timesheet.status = "pending";
    timesheet.resubmittedAt = new Date();
    timesheet.resubmissionCount = (timesheet.resubmissionCount || 0) + 1;
    timesheet.rejectionReason = "";
    timesheet.rejectionCategory = undefined;
    timesheet.editableUntil = null;

    await timesheet.save({ session });

    await session.commitTransaction();

    const populatedTimesheet = await Timesheet.findById(id).populate(
      "employee",
      "firstName lastName employeeId department"
    );

    res.json({
      message: "Timesheet edited and resubmitted successfully",
      timesheet: populatedTimesheet,
      resubmissionCount: timesheet.resubmissionCount,
    });
  } catch (error) {
    await session.abortTransaction();
    console.error("❌ Edit rejected timesheet error:", error);
    res.status(500).json({
      message: "Server error editing timesheet",
      error: error.message,
    });
  } finally {
    session.endSession();
  }
};

// ✅ FIXED: Get user timesheets with enhanced editing info
export const getMyTimesheets = async (req, res) => {
  try {
    const { year, month, status } = req.query;

    let filter = { employee: req.user.id };

    if (year && !isNaN(year)) {
      filter.year = parseInt(year);
    }

    if (month && !isNaN(month)) {
      const startDate = new Date(
        year || new Date().getFullYear(),
        month - 1,
        1
      );
      const endDate = new Date(year || new Date().getFullYear(), month, 0);
      filter.weekStartDate = { $gte: startDate, $lte: endDate };
    }

    if (
      status &&
      ["draft", "pending", "approved", "rejected"].includes(status)
    ) {
      filter.status = status;
    }

    const timesheets = await Timesheet.find(filter)
      .populate("employee", "firstName lastName employeeId department")
      .populate("approvedBy", "firstName lastName")
      .populate("rejectedBy", "firstName lastName")
      .sort({ weekStartDate: -1 })
      .limit(100);

    const enhancedTimesheets = timesheets.map((timesheet) => {
      const timesheetObj = timesheet.toObject();

      if (timesheet.status === "rejected") {
        const now = new Date();
        timesheetObj.canEdit =
          timesheet.editableUntil &&
          timesheet.editableUntil > now &&
          !timesheet.isExpired;
        timesheetObj.daysRemaining = timesheet.editableUntil
          ? Math.ceil((timesheet.editableUntil - now) / (24 * 60 * 60 * 1000))
          : 0;
        timesheetObj.isExpired = !timesheetObj.canEdit;

        const fifteenDaysAgo = new Date();
        fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 15);
        timesheetObj.isBlocking =
          timesheet.submittedAt &&
          new Date(timesheet.submittedAt) <= fifteenDaysAgo &&
          !timesheet.isExpired;
      }

      return timesheetObj;
    });

    res.json(enhancedTimesheets);
  } catch (error) {
    console.error("❌ Get my timesheets error:", error);
    res.status(500).json({
      message: "Server error loading timesheets",
      error: error.message,
    });
  }
};

// ✅ FIXED: Get all timesheets with enhanced editing info
export const getAllTimesheets = async (req, res) => {
  try {
    const {
      status,
      department,
      year,
      month,
      employeeCode,
      page = 1,
      limit = 50,
    } = req.query;

    let filter = {};

    if (
      status &&
      ["draft", "pending", "approved", "rejected"].includes(status)
    ) {
      filter.status = status;
    }

    if (department && typeof department === "string") {
      filter.department = department;
    }

    if (employeeCode && typeof employeeCode === "string") {
      filter.employeeCode = { $regex: employeeCode, $options: "i" };
    }

    if (year && !isNaN(year)) {
      filter.year = parseInt(year);
    }

    if (month && !isNaN(month) && year && !isNaN(year)) {
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0);
      filter.weekStartDate = { $gte: startDate, $lte: endDate };
    }

    const pageNum = parseInt(page);
    const limitNum = Math.min(parseInt(limit), 100);
    const skip = (pageNum - 1) * limitNum;

    const timesheets = await Timesheet.find(filter)
      .populate("employee", "firstName lastName employeeId department")
      .populate("approvedBy", "firstName lastName")
      .populate("rejectedBy", "firstName lastName")
      .sort({ weekStartDate: -1, createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    const total = await Timesheet.countDocuments(filter);

    const enhancedTimesheets = timesheets.map((timesheet) => {
      const timesheetObj = timesheet.toObject();

      if (timesheet.status === "rejected") {
        const now = new Date();
        timesheetObj.canEdit =
          timesheet.editableUntil &&
          timesheet.editableUntil > now &&
          !timesheet.isExpired;
        timesheetObj.daysRemaining = timesheet.editableUntil
          ? Math.ceil((timesheet.editableUntil - now) / (24 * 60 * 60 * 1000))
          : 0;
        timesheetObj.isExpired = !timesheetObj.canEdit;

        const fifteenDaysAgo = new Date();
        fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 15);
        timesheetObj.isBlocking =
          timesheet.submittedAt &&
          new Date(timesheet.submittedAt) <= fifteenDaysAgo &&
          !timesheet.isExpired;
      }

      return timesheetObj;
    });

    res.json({
      timesheets: enhancedTimesheets,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    console.error("❌ Get all timesheets error:", error);
    res.status(500).json({
      message: "Server error loading timesheets",
      error: error.message,
    });
  }
};

// ✅ FIXED: Get timesheet by ID with editing info
export const getTimesheetById = async (req, res) => {
  try {
    const timesheet = await Timesheet.findById(req.params.id)
      .populate("employee", "firstName lastName employeeId department")
      .populate("approvedBy", "firstName lastName")
      .populate("rejectedBy", "firstName lastName");

    if (!timesheet) {
      return res.status(404).json({ message: "Timesheet not found" });
    }

    const hasAccess =
      req.user.role === "admin" ||
      req.user.role === "manager" ||
      timesheet.employee._id.toString() === req.user.id;

    if (!hasAccess) {
      return res.status(403).json({
        message: "Access denied to this timesheet",
        requiredRole: "admin, manager, or timesheet owner",
      });
    }

    const enhancedTimesheet = timesheet.toObject();

    if (timesheet.status === "rejected") {
      const now = new Date();
      enhancedTimesheet.canEdit =
        timesheet.editableUntil &&
        timesheet.editableUntil > now &&
        !timesheet.isExpired;
      enhancedTimesheet.daysRemaining = timesheet.editableUntil
        ? Math.ceil((timesheet.editableUntil - now) / (24 * 60 * 60 * 1000))
        : 0;
      enhancedTimesheet.isExpired = !enhancedTimesheet.canEdit;

      const fifteenDaysAgo = new Date();
      fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 15);
      enhancedTimesheet.isBlocking =
        timesheet.submittedAt &&
        new Date(timesheet.submittedAt) <= fifteenDaysAgo &&
        !timesheet.isExpired;
    }

    res.json(enhancedTimesheet);
  } catch (error) {
    console.error("❌ Get timesheet by ID error:", error);
    res.status(500).json({
      message: "Server error loading timesheet",
      error: error.message,
    });
  }
};

// ✅ FIXED: Check submission block status
export const checkSubmissionBlock = async (req, res) => {
  try {
    const blockCheck = await checkPendingRejectedBlock(req.user.id);

    let blockingTimesheets = [];
    if (blockCheck.isBlocked) {
      const fifteenDaysAgo = new Date();
      fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 15);
      fifteenDaysAgo.setHours(23, 59, 59, 999);

      blockingTimesheets = await Timesheet.find({
        employee: req.user.id,
        status: 'rejected',
        rejectedAt: { $lt: fifteenDaysAgo },
        isExpired: false
      })
        .sort({ submittedAt: 1 })
        .select(
          "weekStartDate weekEndDate rejectionReason submittedAt editableUntil"
        );
    }

    res.json({
      canSubmit: !blockCheck.isBlocked,
      isBlocked: blockCheck.isBlocked,
      blockingTimesheets: blockingTimesheets,
      message: blockCheck.isBlocked
        ? `You have ${blockingTimesheets.length} rejected timesheet(s) older than 15 days that need attention.`
        : "You can submit new timesheets.",
    });
  } catch (error) {
    console.error("❌ Check submission block error:", error);
    res.status(500).json({
      message: "Server error checking submission status",
      error: error.message,
    });
  }
};

// ✅ FIXED: Export timesheet to CSV
export const exportTimesheetToCSV = async (req, res) => {
  try {
    const { id } = req.params;

    const timesheet = await Timesheet.findById(id)
      .populate("employee", "firstName lastName employeeId department")
      .populate("approvedBy", "firstName lastName")
      .populate("rejectedBy", "firstName lastName");

    if (!timesheet) {
      return res.status(404).json({ message: "Timesheet not found" });
    }

    const csvData = timesheet.entries.map((entry) => ({
      "Employee Code": timesheet.employeeCode,
      "Employee Name": timesheet.employeeName,
      Department: timesheet.department,
      Date: new Date(entry.date).toLocaleDateString("en-GB"),
      Day: entry.dayOfWeek,
      "Project Code": entry.projectCode,
      Location: entry.location || "",
      "Normal Hours": entry.normalHours || 0,
      "Overtime Hours": entry.overtimeHours || 0,
      "Total Hours": (
        (entry.normalHours || 0) + (entry.overtimeHours || 0)
      ).toFixed(2),
      "Activity Code": entry.activityCode,
      Remarks: entry.remarks || "",
      Status: timesheet.status,
      "Week Start": new Date(timesheet.weekStartDate).toLocaleDateString(
        "en-GB"
      ),
      "Week End": new Date(timesheet.weekEndDate).toLocaleDateString("en-GB"),
      "Rejection Reason": timesheet.rejectionReason || "",
      "Editable Until": timesheet.editableUntil
        ? new Date(timesheet.editableUntil).toLocaleDateString("en-GB")
        : "",
      "Can Edit":
        timesheet.status === "rejected"
          ? timesheet.editableUntil && timesheet.editableUntil > new Date()
            ? "Yes"
            : "No"
          : "N/A",
      "Days Remaining":
        timesheet.status === "rejected" && timesheet.editableUntil
          ? Math.ceil(
              (timesheet.editableUntil - new Date()) / (24 * 60 * 60 * 1000)
            )
          : "N/A",
    }));

    const fields = [
      "Employee Code",
      "Employee Name",
      "Department",
      "Date",
      "Day",
      "Project Code",
      "Location",
      "Normal Hours",
      "Overtime Hours",
      "Total Hours",
      "Activity Code",
      "Remarks",
      "Status",
      "Week Start",
      "Week End",
      "Rejection Reason",
      "Editable Until",
      "Can Edit",
      "Days Remaining",
    ];

    const json2csvParser = new Parser({ fields });
    const csv = json2csvParser.parse(csvData);

    res.header("Content-Type", "text/csv");
    res.attachment(
      `timesheet-${timesheet.employeeCode}-${
        timesheet.weekStartDate.toISOString().split("T")[0]
      }.csv`
    );
    res.send(csv);
  } catch (error) {
    console.error("❌ Export timesheet error:", error);
    res.status(500).json({
      message: "Server error exporting timesheet",
      error: error.message,
    });
  }
};

// ✅ FIXED: Health check endpoint
export const healthCheck = async (req, res) => {
  try {
    const timesheetCount = await Timesheet.countDocuments();
    const pendingCount = await Timesheet.countDocuments({ status: "pending" });
    const rejectedCount = await Timesheet.countDocuments({
      status: "rejected",
    });
    const editableRejected = await Timesheet.countDocuments({
      status: "rejected",
      editableUntil: { $gt: new Date() },
      isExpired: false,
    });

    res.json({
      status: "healthy",
      database: "connected",
      timesheetCount,
      pendingApprovals: pendingCount,
      rejectedTimesheets: rejectedCount,
      editableRejected: editableRejected,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      status: "unhealthy",
      database: "disconnected",
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
};

// ✅ FIXED: Export all functions
export default {
  submitTimesheet,
  approveTimesheet,
  rejectTimesheet,
  editRejectedTimesheet,
  getMyTimesheets,
  getAllTimesheets,
  getTimesheetById,
  checkSubmissionBlock,
  exportTimesheetToCSV,
  healthCheck,
  archiveOldTimesheets,
  expireEditingPeriods,
  getEditableTimesheets,
  exportMultipleTimesheetsToCSV,
};