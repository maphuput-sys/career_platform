const { db, FieldValue } = require('../config/firebase');
const User = require('../models/user');
const Institution = require('../models/institution');
const { sendNotification } = require('../services/emailService');

class admincontrollers {
  static async getDashboard(req, res) {
    try {
      // Get statistics
      const [
        studentsCount,
        institutionsCount,
        companiesCount,
        applicationsCount,
        jobsCount
      ] = await Promise.all([
        User.countByRole('student'),
        User.countByRole('institution'),
        User.countByRole('company'),
        db.collection('applications').count().get(),
        db.collection('jobs').count().get()
      ]);

      // Get recent activities
      const recentUsers = await db.collection('users')
        .orderBy('createdAt', 'desc')
        .limit(10)
        .get();

      res.json({
        success: true,
        data: {
          statistics: {
            students: studentsCount,
            institutions: institutionsCount,
            companies: companiesCount,
            applications: applicationsCount,
            jobs: jobsCount
          },
          recentUsers: recentUsers.docs.map(doc => ({ id: doc.id, ...doc.data() }))
        }
      });

    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to fetch dashboard data',
        error: error.message
      });
    }
  }

  static async manageInstitutions(req, res) {
    try {
      const { action, institutionId } = req.body;

      const institution = await User.findById(institutionId);
      if (!institution || institution.role !== 'institution') {
        return res.status(404).json({
          success: false,
          message: 'Institution not found'
        });
      }

      let updateData = {};
      let message = '';

      switch (action) {
        case 'approve':
          updateData = { 'profile.status': 'approved' };
          message = 'Institution approved successfully';
          break;
        case 'suspend':
          updateData = { 'profile.status': 'suspended' };
          message = 'Institution suspended successfully';
          break;
        case 'delete':
          await User.delete(institutionId);
          message = 'Institution deleted successfully';
          break;
        default:
          return res.status(400).json({
            success: false,
            message: 'Invalid action'
          });
      }

      if (action !== 'delete') {
        await User.update(institutionId, updateData);
      }

      // Notify institution
      await sendNotification(
        institution.email,
        'Account Status Update',
        `Your institution account has been ${action}d by administrator.`
      );

      res.json({
        success: true,
        message
      });

    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to manage institution',
        error: error.message
      });
    }
  }

  static async manageCompanies(req, res) {
    try {
      const { action, companyId } = req.body;

      const company = await User.findById(companyId);
      if (!company || company.role !== 'company') {
        return res.status(404).json({
          success: false,
          message: 'Company not found'
        });
      }

      let updateData = {};
      let message = '';

      switch (action) {
        case 'approve':
          updateData = { 'profile.status': 'approved' };
          message = 'Company approved successfully';
          break;
        case 'suspend':
          updateData = { 'profile.status': 'suspended' };
          message = 'Company suspended successfully';
          break;
        case 'delete':
          await User.delete(companyId);
          message = 'Company deleted successfully';
          break;
        default:
          return res.status(400).json({
            success: false,
            message: 'Invalid action'
          });
      }

      if (action !== 'delete') {
        await User.update(companyId, updateData);
      }

      res.json({
        success: true,
        message
      });

    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to manage company',
        error: error.message
      });
    }
  }

  static async getSystemReports(req, res) {
    try {
      const { reportType, startDate, endDate } = req.query;

      let reportData = {};

      switch (reportType) {
        case 'applications':
          reportData = await generateApplicationsReport(startDate, endDate);
          break;
        case 'admissions':
          reportData = await generateAdmissionsReport(startDate, endDate);
          break;
        case 'jobs':
          reportData = await generateJobsReport(startDate, endDate);
          break;
        default:
          return res.status(400).json({
            success: false,
            message: 'Invalid report type'
          });
      }

      res.json({
        success: true,
        data: reportData
      });

    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to generate report',
        error: error.message
      });
    }
  }

  static async getAllUsers(req, res) {
    try {
      const { role, status, page = 1, limit = 20 } = req.query;
      
      let query = db.collection('users');
      
      if (role) {
        query = query.where('role', '==', role);
      }
      
      if (status) {
        query = query.where('profile.status', '==', status);
      }

      const snapshot = await query
        .orderBy('createdAt', 'desc')
        .limit(parseInt(limit))
        .offset((parseInt(page) - 1) * parseInt(limit))
        .get();

      const users = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      res.json({
        success: true,
        data: { users },
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: snapshot.size
        }
      });

    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to fetch users',
        error: error.message
      });
    }
  }
}

// Helper functions for reports
async function generateApplicationsReport(startDate, endDate) {
  let query = db.collection('applications');
  
  if (startDate && endDate) {
    query = query.where('createdAt', '>=', new Date(startDate))
                 .where('createdAt', '<=', new Date(endDate));
  }

  const snapshot = await query.get();
  const applications = snapshot.docs.map(doc => doc.data());

  const statusCount = applications.reduce((acc, app) => {
    acc[app.status] = (acc[app.status] || 0) + 1;
    return acc;
  }, {});

  return {
    total: applications.length,
    byStatus: statusCount,
    applications: applications.slice(0, 100) // Limit for performance
  };
}

async function generateAdmissionsReport(startDate, endDate) {
  // Implementation for admissions report
  return { message: 'Admissions report data' };
}

async function generateJobsReport(startDate, endDate) {
  // Implementation for jobs report
  return { message: 'Jobs report data' };
}

module.exports = admincontrollers;