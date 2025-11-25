const { db, FieldValue } = require('../config/firebase');
const Application = require('../models/application');
const { validateApplication, handleMultipleAdmissions } = require('../utils/applicationValidator');
const { findMatchingJobs } = require('../services/matchingService');
const NotificationService = require('../services/notificationService');

class studentcontrollers {
  /**
   * Apply for a course
   */
  static async applyForCourse(req, res) {
    try {
      const studentId = req.user.uid;
      const { courseId, institutionId, documents = [] } = req.body;

      // Validate application
      const validation = await validateApplication(studentId, courseId, institutionId);
      
      if (!validation.isValid) {
        return res.status(400).json({ 
          success: false, 
          message: validation.message 
        });
      }

      // Create application
      const applicationData = {
        studentId,
        courseId,
        institutionId,
        status: 'pending',
        applicationDate: FieldValue.serverTimestamp(),
        documents,
        metadata: {
          appliedAt: new Date(),
          applicationSource: 'web'
        }
      };

      const application = await Application.create(applicationData);

      // Update student's application count
      await db.collection('users').doc(studentId).update({
        'profile.applicationCount': FieldValue.increment(1),
        'profile.lastApplicationDate': FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp()
      });

      // Notify institution
      await NotificationService.createNotification(
        institutionId,
        'new_application',
        'New Application Received',
        `A new student has applied to your course.`,
        { applicationId: application.id, studentId, courseId }
      );

      res.status(201).json({
        success: true,
        message: 'Application submitted successfully',
        data: { application }
      });

    } catch (error) {
      console.error('Application error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Application failed', 
        error: error.message 
      });
    }
  }

  /**
   * Get student's applications
   */
  static async getApplications(req, res) {
    try {
      const studentId = req.user.uid;
      const { status, page = 1, limit = 20 } = req.query;

      const applications = await Application.findByStudent(studentId);

      // Filter by status if provided
      let filteredApplications = applications;
      if (status) {
        filteredApplications = applications.filter(app => app.status === status);
      }

      // Apply pagination
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + parseInt(limit);
      const paginatedApplications = filteredApplications.slice(startIndex, endIndex);

      // Enrich applications with course and institution data
      const enrichedApplications = await Promise.all(
        paginatedApplications.map(async (application) => {
          const [courseDoc, institutionDoc] = await Promise.all([
            db.collection('courses').doc(application.courseId).get(),
            db.collection('users').doc(application.institutionId).get()
          ]);

          return {
            ...application,
            course: courseDoc.exists ? courseDoc.data() : null,
            institution: institutionDoc.exists ? institutionDoc.data().profile : null
          };
        })
      );

      res.json({
        success: true,
        data: {
          applications: enrichedApplications,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: filteredApplications.length,
            pages: Math.ceil(filteredApplications.length / parseInt(limit))
          }
        }
      });

    } catch (error) {
      console.error('Get applications error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to fetch applications', 
        error: error.message 
      });
    }
  }

  /**
   * Get a specific application
   */
  static async getApplicationById(req, res) {
    try {
      const { applicationId } = req.params;
      const studentId = req.user.uid;

      const application = await Application.findById(applicationId);
      
      if (!application) {
        return res.status(404).json({
          success: false,
          message: 'Application not found'
        });
      }

      // Check ownership
      if (application.studentId !== studentId) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }

      // Enrich with course and institution data
      const [courseDoc, institutionDoc] = await Promise.all([
        db.collection('courses').doc(application.courseId).get(),
        db.collection('users').doc(application.institutionId).get()
      ]);

      const enrichedApplication = {
        ...application,
        course: courseDoc.exists ? courseDoc.data() : null,
        institution: institutionDoc.exists ? institutionDoc.data().profile : null
      };

      res.json({
        success: true,
        data: { application: enrichedApplication }
      });

    } catch (error) {
      console.error('Get application error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch application',
        error: error.message
      });
    }
  }

  /**
   * Withdraw application
   */
  static async withdrawApplication(req, res) {
    try {
      const { applicationId } = req.params;
      const studentId = req.user.uid;

      const application = await Application.findById(applicationId);
      
      if (!application) {
        return res.status(404).json({
          success: false,
          message: 'Application not found'
        });
      }

      // Check ownership
      if (application.studentId !== studentId) {
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
      console.error('Withdraw application error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to withdraw application',
        error: error.message
      });
    }
  }

  /**
   * Get matching jobs for student
   */
  static async getMatchingJobs(req, res) {
    try {
      const studentId = req.user.uid;
      const { page = 1, limit = 20 } = req.query;

      const matchingJobs = await findMatchingJobs(studentId);

      // Apply pagination
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + parseInt(limit);
      const paginatedJobs = matchingJobs.slice(startIndex, endIndex);

      // Enrich jobs with company data
      const enrichedJobs = await Promise.all(
        paginatedJobs.map(async (job) => {
          const companyDoc = await db.collection('users').doc(job.companyId).get();
          return {
            ...job,
            company: companyDoc.exists ? companyDoc.data().profile : null
          };
        })
      );

      res.json({
        success: true,
        data: {
          jobs: enrichedJobs,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: matchingJobs.length,
            pages: Math.ceil(matchingJobs.length / parseInt(limit))
          }
        }
      });

    } catch (error) {
      console.error('Get matching jobs error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch matching jobs',
        error: error.message
      });
    }
  }

  /**
   * Apply for a job
   */
  static async applyForJob(req, res) {
    try {
      const studentId = req.user.uid;
      const { jobId } = req.body;

      // Check if job exists and is active
      const jobDoc = await db.collection('jobs').doc(jobId).get();
      if (!jobDoc.exists) {
        return res.status(404).json({
          success: false,
          message: 'Job not found'
        });
      }

      const job = jobDoc.data();
      if (job.status !== 'active') {
        return res.status(400).json({
          success: false,
          message: 'Job is no longer active'
        });
      }

      // Check if already applied
      const existingApplication = await db.collection('jobApplications')
        .where('studentId', '==', studentId)
        .where('jobId', '==', jobId)
        .get();

      if (!existingApplication.empty) {
        return res.status(400).json({
          success: false,
          message: 'You have already applied for this job'
        });
      }

      // Create job application
      const jobApplication = {
        studentId,
        jobId,
        applicationDate: FieldValue.serverTimestamp(),
        status: 'pending',
        coverLetter: req.body.coverLetter || '',
        resume: req.body.resume || '',
        metadata: {
          appliedAt: new Date()
        }
      };

      const applicationRef = await db.collection('jobApplications').add(jobApplication);

      // Update job applications count
      await db.collection('jobs').doc(jobId).update({
        applicationCount: FieldValue.increment(1)
      });

      // Notify company
      await NotificationService.createNotification(
        job.companyId,
        'new_job_application',
        'New Job Application',
        `A new candidate has applied for your job: ${job.title}`,
        { jobId, applicationId: applicationRef.id, studentId }
      );

      res.json({
        success: true,
        message: 'Job application submitted successfully',
        data: { applicationId: applicationRef.id }
      });

    } catch (error) {
      console.error('Job application error:', error);
      res.status(500).json({
        success: false,
        message: 'Job application failed',
        error: error.message
      });
    }
  }

  /**
   * Get student's job applications
   */
  static async getJobApplications(req, res) {
    try {
      const studentId = req.user.uid;
      const { status, page = 1, limit = 20 } = req.query;

      let query = db.collection('jobApplications')
        .where('studentId', '==', studentId);

      if (status) {
        query = query.where('status', '==', status);
      }

      const snapshot = await query
        .orderBy('applicationDate', 'desc')
        .limit(parseInt(limit))
        .offset((parseInt(page) - 1) * parseInt(limit))
        .get();

      const applications = await Promise.all(
        snapshot.docs.map(async (doc) => {
          const application = doc.data();
          const jobDoc = await db.collection('jobs').doc(application.jobId).get();
          const companyDoc = jobDoc.exists ? 
            await db.collection('users').doc(jobDoc.data().companyId).get() : null;

          return {
            id: doc.id,
            ...application,
            job: jobDoc.exists ? jobDoc.data() : null,
            company: companyDoc?.exists ? companyDoc.data().profile : null
          };
        })
      );

      // Get total count
      const countSnapshot = await query.count().get();
      const totalCount = countSnapshot.data().count;

      res.json({
        success: true,
        data: {
          applications,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: totalCount,
            pages: Math.ceil(totalCount / parseInt(limit))
          }
        }
      });

    } catch (error) {
      console.error('Get job applications error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch job applications',
        error: error.message
      });
    }
  }

  /**
   * Get student's admissions
   */
  static async getAdmissions(req, res) {
    try {
      const studentId = req.user.uid;

      const admittedApplications = await db.collection('applications')
        .where('studentId', '==', studentId)
        .where('status', '==', 'admitted')
        .get();

      const admissions = await Promise.all(
        admittedApplications.docs.map(async (doc) => {
          const application = doc.data();
          const [courseDoc, institutionDoc] = await Promise.all([
            db.collection('courses').doc(application.courseId).get(),
            db.collection('users').doc(application.institutionId).get()
          ]);

          return {
            id: doc.id,
            ...application,
            course: courseDoc.exists ? courseDoc.data() : null,
            institution: institutionDoc.exists ? institutionDoc.data().profile : null
          };
        })
      );

      res.json({
        success: true,
        data: { admissions }
      });

    } catch (error) {
      console.error('Get admissions error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch admissions',
        error: error.message
      });
    }
  }

  /**
   * Select admission (when multiple admissions)
   */
  static async selectAdmission(req, res) {
    try {
      const studentId = req.user.uid;
      const { applicationId } = req.body;

      // Verify the application exists and is admitted
      const applicationDoc = await db.collection('applications').doc(applicationId).get();
      if (!applicationDoc.exists) {
        return res.status(404).json({
          success: false,
          message: 'Application not found'
        });
      }

      const application = applicationDoc.data();
      if (application.studentId !== studentId) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }

      if (application.status !== 'admitted') {
        return res.status(400).json({
          success: false,
          message: 'Application is not admitted'
        });
      }

      // Handle multiple admissions (reject others)
      await handleMultipleAdmissions(studentId, applicationId);

      res.json({
        success: true,
        message: 'Admission selected successfully'
      });

    } catch (error) {
      console.error('Select admission error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to select admission',
        error: error.message
      });
    }
  }

  /**
   * Get student dashboard data
   */
  static async getDashboard(req, res) {
    try {
      const studentId = req.user.uid;

      // Get various counts and data in parallel
      const [
        applicationsCount,
        admittedCount,
        jobApplicationsCount,
        matchingJobsCount,
        recentApplications,
        upcomingDeadlines
      ] = await Promise.all([
        // Application count
        db.collection('applications')
          .where('studentId', '==', studentId)
          .count().get(),

        // Admitted count
        db.collection('applications')
          .where('studentId', '==', studentId)
          .where('status', '==', 'admitted')
          .count().get(),

        // Job applications count
        db.collection('jobApplications')
          .where('studentId', '==', studentId)
          .count().get(),

        // Matching jobs count (simplified)
        db.collection('jobs')
          .where('status', '==', 'active')
          .where('deadline', '>', new Date())
          .count().get(),

        // Recent applications
        db.collection('applications')
          .where('studentId', '==', studentId)
          .orderBy('applicationDate', 'desc')
          .limit(5)
          .get(),

        // Upcoming deadlines (courses with near deadlines)
        db.collection('courses')
          .where('applicationDeadline', '>', new Date())
          .orderBy('applicationDeadline', 'asc')
          .limit(5)
          .get()
      ]);

      const dashboardData = {
        statistics: {
          totalApplications: applicationsCount.data().count,
          admittedApplications: admittedCount.data().count,
          jobApplications: jobApplicationsCount.data().count,
          matchingJobs: matchingJobsCount.data().count
        },
        recentApplications: recentApplications.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })),
        upcomingDeadlines: upcomingDeadlines.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }))
      };

      res.json({
        success: true,
        data: dashboardData
      });

    } catch (error) {
      console.error('Get dashboard error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch dashboard data',
        error: error.message
      });
    }
  }
}

module.exports = studentcontrollers;