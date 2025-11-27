const { db, FieldValue } = require('../config/firebase');
const { sendNotification } = require('./emailService');

class NotificationService {
  static async createNotification(userId, type, title, message, data = {}) {
    try {
      const notification = {
        userId,
        type,
        title,
        message,
        data,
        read: false,
        createdAt: FieldValue.serverTimestamp()
      };

      await db.collection('notifications').add(notification);

      // Send email notification for important events
      if (type === 'admission' || type === 'job_match') {
        const user = await db.collection('users').doc(userId).get();
        if (user.exists) {
          await sendNotification(user.data().email, title, message);
        }
      }

    } catch (error) {
      console.error('Error creating notification:', error);
    }
  }

  static async getUserNotifications(userId, limit = 20) {
    try {
      const snapshot = await db.collection('notifications')
        .where('userId', '==', userId)
        .orderBy('createdAt', 'desc')
        .limit(limit)
        .get();

      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    } catch (error) {
      console.error('Error fetching notifications:', error);
      return [];
    }
  }

  static async markAsRead(notificationId) {
    try {
      await db.collection('notifications').doc(notificationId).update({
        read: true,
        readAt: FieldValue.serverTimestamp()
      });

    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  }

  static async notifyJobMatch(studentId, jobId) {
    const job = await db.collection('jobs').doc(jobId).get();
    if (!job.exists) return;

    const jobData = job.data();

    await this.createNotification(
      studentId,
      'job_match',
      'New Job Match Found!',
      `A new job "${jobData.title}" matches your profile. Apply now!`,
      { jobId }
    );
  }

  static async notifyAdmissionDecision(studentId, institutionId, status) {
    const institution = await db.collection('users').doc(institutionId).get();
    const institutionName = institution.exists ? institution.data().profile.name : 'Institution';

    const message = status === 'admitted' 
      ? `Congratulations! You have been admitted to ${institutionName}.`
      : `Your application to ${institutionName} has been ${status}.`;

    await this.createNotification(
      studentId,
      'admission',
      `Admission Decision - ${institutionName}`,
      message,
      { institutionId, status }
    );
  }
}

module.exports = NotificationService;