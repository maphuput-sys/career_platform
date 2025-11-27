// controllers/authController.js
const admin = require('firebase-admin');

const authController = {
  // User registration
  register: async (req, res) => {
    try {
      const { email, password, firstName, lastName, role } = req.body;
      
      // Create user in Firebase Auth
      const userRecord = await admin.auth().createUser({
        email,
        password,
        displayName: `${firstName} ${lastName}`,
      });

      // Set custom claims for role-based access
      await admin.auth().setCustomUserClaims(userRecord.uid, { role });

      res.status(201).json({
        success: true,
        message: 'User registered successfully',
        user: {
          uid: userRecord.uid,
          email: userRecord.email,
          displayName: userRecord.displayName,
          role: role
        }
      });
    } catch (error) {
      console.error('Registration error:', error);
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  },

  // User login
  login: async (req, res) => {
    try {
      // For Firebase Auth, login is handled on frontend
      // This endpoint can be used for additional server-side logic
      const { idToken } = req.body;
      
      // Verify the ID token
      const decodedToken = await admin.auth().verifyIdToken(idToken);
      
      res.status(200).json({
        success: true,
        message: 'Login successful',
        user: {
          uid: decodedToken.uid,
          email: decodedToken.email,
          role: decodedToken.role || 'user'
        }
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }
  },

  // Get user profile
  getProfile: async (req, res) => {
    try {
      const { uid } = req.user; // Assuming middleware sets req.user
      
      const userRecord = await admin.auth().getUser(uid);
      
      res.status(200).json({
        success: true,
        user: {
          uid: userRecord.uid,
          email: userRecord.email,
          displayName: userRecord.displayName,
          role: userRecord.customClaims?.role || 'user'
        }
      });
    } catch (error) {
      console.error('Profile error:', error);
      res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
  },

  // Update user profile
  updateProfile: async (req, res) => {
    try {
      const { uid } = req.user;
      const { displayName, role } = req.body;
      
      await admin.auth().updateUser(uid, {
        displayName
      });

      if (role) {
        await admin.auth().setCustomUserClaims(uid, { role });
      }

      res.status(200).json({
        success: true,
        message: 'Profile updated successfully'
      });
    } catch (error) {
      console.error('Update profile error:', error);
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  },

  // Delete user
  deleteUser: async (req, res) => {
    try {
      const { uid } = req.params;
      
      await admin.auth().deleteUser(uid);
      
      res.status(200).json({
        success: true,
        message: 'User deleted successfully'
      });
    } catch (error) {
      console.error('Delete user error:', error);
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }
};

module.exports = authController;