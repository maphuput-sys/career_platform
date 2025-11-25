const { db, FieldValue } = require('../config/firebase');
const Application = require('../models/application');

class applicationcontrollers {
  static async getApplicationStats(req, res) {
    try {
      const userId = req.user.uid;
      const userRole = req.user.role;

      let stats = {};

      if (userRole === 'student') {
        const applications = await Application.findByStudent(userId);
        
        stats = applications.reduce((acc, app) => {
          acc.total = (acc.total || 0) + 1;
          acc[app.status] = (acc[app.status] || 0) + 1;
          return acc;
        }, {});

      } else if (userRole === 'institution') {
        const applications = await Application.findByInstitution(userId);
        
        stats = applications.reduce((acc, app) => {
          acc.total = (acc.total || 0) + 1;
          acc[app.status] = (acc[app.status] || 0) + 1;
          return acc;
        }, {});
      }

      res.json({
        success: true,
        data: { stats }
      });

    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to fetch application statistics',
        error: error.message
      });
    }
  }

  static async withdrawApplication(req, res) {
    try {
      const { applicationId } = req.params;
      const userId = req.user.uid;

      const application = await Application.findById(applicationId);
      
      if (!application) {
        return res.status(404).json({
          success: false,
          message: 'Application not found'
        });
      }

      // Verify ownership
      if (application.studentId !== userId) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }

      if (application.status !== 'pending') {
        return res.status(400).json({
          success: false,
          message: 'Cannot withdraw application that is not pending'
        });
      }

      await Application.updateStatus(applicationId, 'withdrawn');

      res.json({
        success: true,
        message: 'Application withdrawn successfully'
      });

    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to withdraw application',
        error: error.message
      });
    }
  }
}

module.exports = applicationcontrollers;