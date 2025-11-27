// routes/instituteroutes.js
const express = require('express');
const { asyncHandler } = require('../middleware/errorhandler');
const router = express.Router();

// Get all institutions
router.get('/', asyncHandler(async (req, res) => {
  const institutions = [
    {
      id: 'inst-1',
      name: 'National University of Lesotho',
      description: 'Premier higher education institution in Lesotho',
      location: 'Roma, Lesotho',
      contactEmail: 'admissions@nul.ls',
      website: 'https://www.nul.ls'
    },
    {
      id: 'inst-2',
      name: 'Limkokwing University',
      description: 'Creative innovation university',
      location: 'Maseru, Lesotho', 
      contactEmail: 'info@limkokwing.ls',
      website: 'https://www.limkokwing.ls'
    }
  ];

  res.json({
    success: true,
    institutions: institutions
  });
}));

module.exports = router;