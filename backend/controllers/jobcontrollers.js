const { db } = require('../config/firebase');
const Job = require('../models/job');

class jobcontrollers {
  static async getAllJobs(req, res) {
    try {
      const { page = 1, limit = 20, search, location, jobType } = req.query;
      
      let query = db.collection('jobs').where('status', '==', 'active');

      if (search) {
        query = query.where('title', '>=', search)
                     .where('title', '<=', search + '\uf8ff');
      }

      if (location) {
        query = query.where('location', '==', location);
      }

      if (jobType) {
        query = query.where('jobType', '==', jobType);
      }

      const snapshot = await query
        .orderBy('createdAt', 'desc')
        .limit(parseInt(limit))
        .offset((parseInt(page) - 1) * parseInt(limit))
        .get();

      const jobs = await Promise.all(
        snapshot.docs.map(async (doc) => {
          const job = doc.data();
          const company = await db.collection('users').doc(job.companyId).get();
          
          return {
            id: doc.id,
            ...job,
            company: company.exists ? company.data().profile : null
          };
        })
      );

      res.json({
        success: true,
        data: { jobs },
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: snapshot.size
        }
      });

    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to fetch jobs',
        error: error.message
      });
    }
  }

  static async getJobById(req, res) {
    try {
      const { jobId } = req.params;

      const job = await Job.findById(jobId);
      if (!job) {
        return res.status(404).json({
          success: false,
          message: 'Job not found'
        });
      }

      const company = await db.collection('users').doc(job.companyId).get();

      res.json({
        success: true,
        data: {
          job: {
            ...job,
            company: company.exists ? company.data().profile : null
          }
        }
      });

    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to fetch job',
        error: error.message
      });
    }
  }

  static async getJobCategories(req, res) {
    try {
      const snapshot = await db.collection('jobs')
        .where('status', '==', 'active')
        .get();

      const categories = [...new Set(snapshot.docs.map(doc => doc.data().jobType))];

      res.json({
        success: true,
        data: { categories }
      });

    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to fetch categories',
        error: error.message
      });
    }
  }
}

module.exports = jobcontrollers;