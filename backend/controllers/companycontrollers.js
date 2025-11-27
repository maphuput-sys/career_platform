const { db, FieldValue } = require('../config/firebase');
const Job = require('../models/job');
const { findMatchingApplicants } = require('../services/matchingService');

class companycontrollers {
  static async createJob(req, res) {
    try {
      const companyId = req.user.uid;
      const {
        title,
        description,
        requirements,
        qualifications,
        location,
        salaryRange,
        jobType,
        deadline
      } = req.body;

      const jobData = {
        companyId,
        title,
        description,
        requirements: requirements || {},
        qualifications: qualifications || [],
        location,
        salaryRange,
        jobType,
        deadline: new Date(deadline),
        createdAt: FieldValue.serverTimestamp(),
        status: 'active',
        applications: []
      };

      const jobId = await Job.create(jobData);

      res.status(201).json({
        success: true,
        message: 'Job posted successfully',
        data: { jobId }
      });

    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to post job',
        error: error.message
      });
    }
  }

  static async getJobs(req, res) {
    try {
      const companyId = req.user.uid;
      const jobs = await Job.findByCompany(companyId);

      res.json({
        success: true,
        data: { jobs }
      });

    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to fetch jobs',
        error: error.message
      });
    }
  }

  static async getApplicants(req, res) {
    try {
      const { jobId } = req.params;
      const companyId = req.user.uid;

      // Verify job belongs to company
      const job = await Job.findById(jobId);
      if (!job || job.companyId !== companyId) {
        return res.status(404).json({
          success: false,
          message: 'Job not found'
        });
      }

      // Get matching applicants
      const applicants = await findMatchingApplicants(jobId);

      res.json({
        success: true,
        data: { applicants }
      });

    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to fetch applicants',
        error: error.message
      });
    }
  }

  static async updateApplicationStatus(req, res) {
    try {
      const { applicationId } = req.params;
      const { status } = req.body;

      await db.collection('jobApplications').doc(applicationId).update({
        status,
        updatedAt: FieldValue.serverTimestamp()
      });

      res.json({
        success: true,
        message: 'Application status updated successfully'
      });

    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to update application status',
        error: error.message
      });
    }
  }

  static async getJobStatistics(req, res) {
    try {
      const companyId = req.user.uid;
      const { jobId } = req.params;

      const job = await Job.findById(jobId);
      if (!job || job.companyId !== companyId) {
        return res.status(404).json({
          success: false,
          message: 'Job not found'
        });
      }

      const applicationsSnapshot = await db.collection('jobApplications')
        .where('jobId', '==', jobId)
        .get();

      const applications = applicationsSnapshot.docs.map(doc => doc.data());
      
      const statusCount = applications.reduce((acc, app) => {
        acc[app.status] = (acc[app.status] || 0) + 1;
        return acc;
      }, {});

      res.json({
        success: true,
        data: {
          totalApplications: applications.length,
          byStatus: statusCount,
          job: job
        }
      });

    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to fetch job statistics',
        error: error.message
      });
    }
  }

  static async updateProfile(req, res) {
    try {
      const companyId = req.user.uid;
      const updates = req.body;

      const updatedCompany = await User.update(companyId, {
        profile: updates
      });

      res.json({
        success: true,
        message: 'Profile updated successfully',
        data: { company: updatedCompany }
      });

    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to update profile',
        error: error.message
      });
    }
  }
}

module.exports = companycontrollers;