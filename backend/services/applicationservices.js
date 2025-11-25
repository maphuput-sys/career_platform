// services/applicationService.js
const { db } = require('../config/firebase');

class ApplicationService {
  async submitApplication(studentId, applicationData) {
    const { courseId, institutionId, priority, applicationData: appData } = applicationData;
    
    // Check if student already has 2 applications for this institution
    const existingApps = await db.collection('applications')
      .where('studentId', '==', studentId)
      .where('institutionId', '==', institutionId)
      .get();

    if (existingApps.size >= 2) {
      throw new Error('Maximum of 2 applications per institution allowed');
    }

    // Check if applying for same course twice
    const existingCourseApp = existingApps.docs.find(doc => 
      doc.data().courseId === courseId
    );
    
    if (existingCourseApp) {
      throw new Error('You have already applied for this course');
    }

    // Check if student meets course requirements
    const courseDoc = await db.collection('courses').doc(courseId).get();
    if (!courseDoc.exists) {
      throw new Error('Course not found');
    }

    const course = courseDoc.data();
    const meetsRequirements = await this.checkRequirements(appData.grades, course.requirements);
    
    if (!meetsRequirements) {
      throw new Error('Student does not meet course requirements');
    }

    // Check course capacity
    const currentAdmissions = await db.collection('applications')
      .where('courseId', '==', courseId)
      .where('status', '==', 'admitted')
      .get();

    if (currentAdmissions.size >= course.capacity) {
      // Add to waiting list
      const application = await this.createApplication(
        studentId, courseId, institutionId, priority, appData, 'waiting'
      );
      return { ...application, status: 'waiting', message: 'Added to waiting list' };
    }

    // Create regular application
    const application = await this.createApplication(
      studentId, courseId, institutionId, priority, appData, 'pending'
    );

    return application;
  }

  async checkRequirements(studentGrades, courseRequirements) {
    if (!courseRequirements || !studentGrades) return false;

    const minGrade = courseRequirements.minGrade || 0;
    const requiredSubjects = courseRequirements.subjects || [];

    for (const subject of requiredSubjects) {
      if (!studentGrades[subject] || studentGrades[subject] < minGrade) {
        return false;
      }
    }

    // Check additional requirements if any
    if (courseRequirements.additionalRequirements) {
      // Implement additional requirements checking logic
      // This could include specific subject combinations, etc.
    }

    return true;
  }

  async createApplication(studentId, courseId, institutionId, priority, appData, status) {
    const applicationRef = db.collection('applications').doc();
    const application = {
      applicationId: applicationRef.id,
      studentId,
      courseId,
      institutionId,
      applicationData: appData,
      status,
      priority,
      appliedAt: new Date(),
      updatedAt: new Date()
    };

    await applicationRef.set(application);
    return application;
  }

  async handleMultipleAdmissions(studentId) {
    const admissions = await db.collection('applications')
      .where('studentId', '==', studentId)
      .where('status', '==', 'admitted')
      .get();

    if (admissions.size > 1) {
      // Create notification for student to choose one institution
      await db.collection('notifications').add({
        userId: studentId,
        type: 'multiple_admissions',
        title: 'Multiple Admissions',
        message: 'You have been admitted to multiple institutions. Please choose one within 7 days.',
        data: {
          admissions: admissions.docs.map(doc => ({
            applicationId: doc.id,
            ...doc.data()
          }))
        },
        read: false,
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
      });

      return true;
    }
    
    return false;
  }

  async studentSelectsInstitution(studentId, selectedApplicationId) {
    // Get all admitted applications
    const admissions = await db.collection('applications')
      .where('studentId', '==', studentId)
      .where('status', '==', 'admitted')
      .get();

    // Update all other applications to rejected
    const batch = db.batch();
    
    for (const doc of admissions.docs) {
      if (doc.id === selectedApplicationId) {
        // Keep the selected one as admitted
        continue;
      }
      
      // Reject other applications
      const appRef = db.collection('applications').doc(doc.id);
      batch.update(appRef, {
        status: 'rejected',
        updatedAt: new Date()
      });

      // Move first student from waiting list to main list for each rejected course
      await this.promoteFromWaitingList(doc.data().courseId);
    }

    await batch.commit();

    // Remove the multiple admissions notification
    const notifications = await db.collection('notifications')
      .where('userId', '==', studentId)
      .where('type', '==', 'multiple_admissions')
      .get();

    const deleteBatch = db.batch();
    notifications.docs.forEach(doc => {
      deleteBatch.delete(doc.ref);
    });
    await deleteBatch.commit();
  }

  async promoteFromWaitingList(courseId) {
    // Get first student from waiting list
    const waitingList = await db.collection('applications')
      .where('courseId', '==', courseId)
      .where('status', '==', 'waiting')
      .orderBy('appliedAt', 'asc')
      .limit(1)
      .get();

    if (!waitingList.empty) {
      const firstWaiting = waitingList.docs[0];
      await db.collection('applications').doc(firstWaiting.id).update({
        status: 'admitted',
        updatedAt: new Date()
      });
    }
  }
}

module.exports = new ApplicationService();