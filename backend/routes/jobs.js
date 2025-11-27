// routes/jobs.js
const express = require('express');
const { asyncHandler } = require('../middleware/errorhandler');
const router = express.Router();

// Get all jobs
router.get('/', asyncHandler(async (req, res) => {
  const jobs = [
    {
      id: 'job-1',
      title: 'Software Developer',
      companyName: 'Tech Solutions Lesotho',
      description: 'We are looking for a skilled software developer...',
      requirements: {
        minQualification: "Bachelor's Degree",
        experience: '2+ years',
        skills: ['JavaScript', 'React', 'Node.js']
      },
      location: 'Maseru',
      salaryRange: { min: 15000, max: 25000 },
      postedAt: new Date().toISOString(),
      deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
    }
  ];

  res.json({
    success: true,
    jobs: jobs
  });
}));

module.exports = router;