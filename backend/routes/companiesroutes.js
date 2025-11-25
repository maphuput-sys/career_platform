// routes/companiesroutes.js
const express = require('express');
const { asyncHandler } = require('../middleware/errorhandler');
const router = express.Router();

// Use different variable names or check if they're already declared
const firebaseConfig = require('../config/firebase');
const { db } = firebaseConfig;

// Or if you need auth, use a different approach:
// const admin = require('firebase-admin');

// Basic company routes
router.get('/', asyncHandler(async (req, res) => {
  // Return mock companies for now
  const companies = [
    {
      id: 'company-1',
      name: 'Tech Solutions Lesotho',
      industry: 'Technology',
      description: 'Leading tech company in Lesotho',
      contactEmail: 'contact@techsolutions.ls',
      website: 'https://techsolutions.ls',
      isApproved: true
    },
    {
      id: 'company-2', 
      name: 'Creative Agency LS',
      industry: 'Marketing',
      description: 'Creative marketing agency',
      contactEmail: 'info@creativeagency.ls',
      website: 'https://creativeagency.ls',
      isApproved: true
    }
  ];

  res.json({
    success: true,
    companies: companies
  });
}));

// Get company by ID
router.get('/:id', asyncHandler(async (req, res) => {
  const companyId = req.params.id;
  
  const company = {
    id: companyId,
    name: 'Tech Solutions Lesotho',
    industry: 'Technology',
    description: 'Leading tech company in Lesotho',
    contactEmail: 'contact@techsolutions.ls',
    website: 'https://techsolutions.ls',
    isApproved: true,
    createdAt: new Date().toISOString()
  };

  res.json({
    success: true,
    company: company
  });
}));

// Create company (for company registration)
router.post('/', asyncHandler(async (req, res) => {
  const { name, industry, description, contactEmail, website } = req.body;

  if (!name || !industry || !contactEmail) {
    return res.status(400).json({
      success: false,
      error: 'Name, industry, and contact email are required'
    });
  }

  const newCompany = {
    id: 'company-' + Date.now(),
    name,
    industry,
    description: description || '',
    contactEmail,
    website: website || '',
    isApproved: false, // Needs admin approval
    createdAt: new Date().toISOString()
  };

  res.status(201).json({
    success: true,
    message: 'Company registration submitted for approval',
    company: newCompany
  });
}));

module.exports = router;