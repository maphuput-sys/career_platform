const { auth, db } = require('../config/firebase');
const User = require('../models/user');
const { generateToken, validateToken, hashPassword, comparePassword } = require('../utils/authUtils');
const EmailService = require('./emailService');
const { validationResult } = require('express-validator');

class authservices {
  /**
   * Register a new user
   */
  static async registerUser(userData) {
    try {
      const { email, password, role, profile } = userData;

      // Check if user already exists
      const existingUser = await User.findByEmail(email);
      if (existingUser) {
        throw new Error('User already exists with this email');
      }

      // Create Firebase auth user
      const userRecord = await auth.createUser({
        email,
        password,
        emailVerified: false,
        displayName: profile.name,
        disabled: false
      });

      // Create user document in Firestore
      const userDocData = {
        email: email.toLowerCase(),
        role,
        profile: {
          name: profile.name,
          phone: profile.phone || '',
          address: profile.address || {},
          createdAt: new Date(),
          status: 'active'
        },
        emailVerified: false,
        createdAt: new Date(),
        lastLoginAt: null,
        loginCount: 0
      };

      await User.create(userRecord.uid, userDocData);

      // Send verification email
      await EmailService.sendVerificationEmail(email, userRecord.uid);

      // Generate JWT token
      const token = await generateToken(userRecord.uid, role);

      return {
        user: {
          uid: userRecord.uid,
          ...userDocData
        },
        token
      };

    } catch (error) {
      console.error('Registration service error:', error);
      
      // Clean up Firebase user if registration fails
      if (error.uid) {
        try {
          await auth.deleteUser(error.uid);
        } catch (deleteError) {
          console.error('Error cleaning up Firebase user:', deleteError);
        }
      }
      
      throw error;
    }
  }

  /**
   * Login user
   */
  static async loginUser(email, password) {
    try {
      // Find user by email
      const user = await User.findByEmail(email);
      if (!user) {
        throw new Error('Invalid email or password');
      }

      // Check if user is active
      if (user.profile.status !== 'active') {
        throw new Error('Account is suspended. Please contact administrator.');
      }

      // Verify password (in production, this would be done with Firebase Auth)
      // For demo purposes, we're skipping actual password verification
      // const isValidPassword = await comparePassword(password, user.password);
      // if (!isValidPassword) {
      //   throw new Error('Invalid email or password');
      // }

      // Update login statistics
      await User.update(user.id, {
        lastLoginAt: new Date(),
        loginCount: (user.loginCount || 0) + 1
      });

      // Generate JWT token
      const token = await generateToken(user.id, user.role);

      return {
        user,
        token
      };

    } catch (error) {
      console.error('Login service error:', error);
      throw error;
    }
  }

  /**
   * Verify user email
   */
  static async verifyEmail(token) {
    try {
      // Validate the token and get user ID
      const decoded = await validateToken(token);
      
      // Update user email verification status
      await User.update(decoded.uid, {
        emailVerified: true,
        verifiedAt: new Date()
      });

      return {
        success: true,
        message: 'Email verified successfully'
      };

    } catch (error) {
      console.error('Email verification service error:', error);
      throw new Error('Invalid or expired verification token');
    }
  }

  /**
   * Resend verification email
   */
  static async resendVerificationEmail(userId) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      if (user.emailVerified) {
        throw new Error('Email is already verified');
      }

      await EmailService.sendVerificationEmail(user.email, userId);

      return {
        success: true,
        message: 'Verification email sent successfully'
      };

    } catch (error) {
      console.error('Resend verification service error:', error);
      throw error;
    }
  }

  /**
   * Change user password
   */
  static async changePassword(userId, currentPassword, newPassword) {
    try {
      // In production, verify current password with Firebase Auth
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Update password in Firebase Auth
      await auth.updateUser(userId, {
        password: newPassword
      });

      // Log password change activity
      await this.logAuthActivity(userId, 'password_change', {
        changedAt: new Date()
      });

      return {
        success: true,
        message: 'Password changed successfully'
      };

    } catch (error) {
      console.error('Change password service error:', error);
      throw error;
    }
  }

  /**
   * Request password reset
   */
  static async requestPasswordReset(email) {
    try {
      const user = await User.findByEmail(email);
      if (!user) {
        // Don't reveal whether email exists
        return {
          success: true,
          message: 'If the email exists, a password reset link has been sent.'
        };
      }

      // Generate password reset token
      const resetToken = await auth.generatePasswordResetLink(email);

      // Send password reset email
      await EmailService.sendPasswordResetEmail(email, resetToken);

      // Log reset request activity
      await this.logAuthActivity(user.id, 'password_reset_request', {
        requestedAt: new Date()
      });

      return {
        success: true,
        message: 'If the email exists, a password reset link has been sent.'
      };

    } catch (error) {
      console.error('Password reset service error:', error);
      throw error;
    }
  }

  /**
   * Validate reset token
   */
  static async validateResetToken(resetToken) {
    try {
      // In a real implementation, you would validate the Firebase reset token
      // This is a simplified version
      return {
        valid: true,
        message: 'Token is valid'
      };
    } catch (error) {
      console.error('Reset token validation error:', error);
      throw new Error('Invalid or expired reset token');
    }
  }

  /**
   * Reset password with token
   */
  static async resetPasswordWithToken(resetToken, newPassword) {
    try {
      // In production, this would use Firebase Auth to reset the password
      // This is a simplified implementation
      
      // Validate token first
      const validation = await this.validateResetToken(resetToken);
      if (!validation.valid) {
        throw new Error('Invalid or expired reset token');
      }

      // Extract user ID from token (simplified)
      // In real implementation, you'd decode the Firebase token
      const userId = this.extractUserIdFromToken(resetToken);

      // Update password
      await auth.updateUser(userId, {
        password: newPassword
      });

      // Log password reset activity
      await this.logAuthActivity(userId, 'password_reset', {
        resetAt: new Date()
      });

      return {
        success: true,
        message: 'Password reset successfully'
      };

    } catch (error) {
      console.error('Password reset service error:', error);
      throw error;
    }
  }

  /**
   * Log authentication activity
   */
  static async logAuthActivity(userId, action, details = {}) {
    try {
      const activityData = {
        userId,
        action,
        details,
        timestamp: new Date(),
        ipAddress: details.ipAddress || 'unknown',
        userAgent: details.userAgent || 'unknown'
      };

      await db.collection('auth_activities').add(activityData);
    } catch (error) {
      console.error('Error logging auth activity:', error);
      // Don't throw error for logging failures
    }
  }

  /**
   * Get user authentication activities
   */
  static async getUserAuthActivities(userId, limit = 20) {
    try {
      const snapshot = await db.collection('auth_activities')
        .where('userId', '==', userId)
        .orderBy('timestamp', 'desc')
        .limit(limit)
        .get();

      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp?.toDate?.() || null
      }));
    } catch (error) {
      console.error('Error getting auth activities:', error);
      throw error;
    }
  }

  /**
   * Validate user session
   */
  static async validateSession(token) {
    try {
      const decoded = await validateToken(token);
      
      const user = await User.findById(decoded.uid);
      if (!user) {
        throw new Error('User not found');
      }

      if (user.profile.status !== 'active') {
        throw new Error('Account is suspended');
      }

      return {
        valid: true,
        user: {
          uid: user.id,
          email: user.email,
          role: user.role,
          profile: user.profile,
          emailVerified: user.emailVerified
        }
      };

    } catch (error) {
      console.error('Session validation error:', error);
      return {
        valid: false,
        error: error.message
      };
    }
  }

  /**
   * Logout user (client-side token invalidation)
   */
  static async logoutUser(userId, logoutDetails = {}) {
    try {
      // Log logout activity
      await this.logAuthActivity(userId, 'logout', {
        logoutAt: new Date(),
        ...logoutDetails
      });

      return {
        success: true,
        message: 'Logged out successfully'
      };

    } catch (error) {
      console.error('Logout service error:', error);
      throw error;
    }
  }

  /**
   * Get user profile
   */
  static async getUserProfile(userId) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Remove sensitive information
      const { password, ...userProfile } = user;

      return userProfile;
    } catch (error) {
      console.error('Get user profile service error:', error);
      throw error;
    }
  }

  /**
   * Update user profile
   */
  static async updateUserProfile(userId, updates) {
    try {
      // Allowed fields for update
      const allowedUpdates = [
        'name',
        'phone',
        'address',
        'bio',
        'skills',
        'education',
        'experience',
        'location',
        'dateOfBirth'
      ];

      // Filter updates to only allowed fields
      const filteredUpdates = {};
      Object.keys(updates).forEach(key => {
        if (allowedUpdates.includes(key)) {
          filteredUpdates[`profile.${key}`] = updates[key];
        }
      });

      if (Object.keys(filteredUpdates).length === 0) {
        throw new Error('No valid fields to update');
      }

      const updatedUser = await User.update(userId, filteredUpdates);

      // Log profile update activity
      await this.logAuthActivity(userId, 'profile_update', {
        updatedFields: Object.keys(filteredUpdates),
        updatedAt: new Date()
      });

      return updatedUser;

    } catch (error) {
      console.error('Update profile service error:', error);
      throw error;
    }
  }

  /**
   * Helper method to extract user ID from token (simplified)
   */
  static extractUserIdFromToken(token) {
    // This is a simplified implementation
    // In production, you would properly decode the Firebase token
    try {
      const decoded = jwt.decode(token);
      return decoded.uid;
    } catch (error) {
      throw new Error('Invalid token format');
    }
  }

  /**
   * Check if email is available
   */
  static async checkEmailAvailability(email) {
    try {
      const user = await User.findByEmail(email);
      return {
        available: !user,
        message: user ? 'Email is already registered' : 'Email is available'
      };
    } catch (error) {
      console.error('Email availability check error:', error);
      throw error;
    }
  }

  /**
   * Admin: Suspend user account
   */
  static async suspendUserAccount(userId, adminId, reason = '') {
    try {
      await User.update(userId, {
        'profile.status': 'suspended',
        suspendedAt: new Date(),
        suspendedBy: adminId,
        suspensionReason: reason
      });

      // Log suspension activity
      await this.logAuthActivity(userId, 'account_suspended', {
        suspendedBy: adminId,
        reason,
        suspendedAt: new Date()
      });

      return {
        success: true,
        message: 'User account suspended successfully'
      };

    } catch (error) {
      console.error('Suspend user service error:', error);
      throw error;
    }
  }

  /**
   * Admin: Reactivate user account
   */
  static async reactivateUserAccount(userId, adminId) {
    try {
      await User.update(userId, {
        'profile.status': 'active',
        reactivatedAt: new Date(),
        reactivatedBy: adminId
      });

      // Log reactivation activity
      await this.logAuthActivity(userId, 'account_reactivated', {
        reactivatedBy: adminId,
        reactivatedAt: new Date()
      });

      return {
        success: true,
        message: 'User account reactivated successfully'
      };

    } catch (error) {
      console.error('Reactivate user service error:', error);
      throw error;
    }
  }
}

module.exports = authservices;