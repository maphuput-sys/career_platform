const { db } = require('../config/firebase');

const validateApplication = async (studentId, courseId, institutionId) => {
  try {
    // 1. Check maximum applications per institution
    const institutionApplications = await db.collection('applications')
      .where('studentId', '==', studentId)
      .where('institutionId', '==', institutionId)
      .get();

    if (institutionApplications.size >= 2) {
      return {
        isValid: false,
        message: 'You can only apply to maximum 2 courses per institution'
      };
    }

    // 2. Check if already applied to same course
    const existingApplication = await db.collection('applications')
      .where('studentId', '==', studentId)
      .where('courseId', '==', courseId)
      .get();

    if (!existingApplication.empty) {
      return {
        isValid: false,
        message: 'You have already applied to this course'
      };
    }

    // 3. Check course requirements
    const course = await db.collection('courses').doc(courseId).get();
    if (!course.exists) {
      return {
        isValid: false,
        message: 'Course not found'
      };
    }

    const courseData = course.data();
    const requirementCheck = await checkCourseRequirements(studentId, courseData.requirements);

    if (!requirementCheck.met) {
      return {
        isValid: false,
        message: `Course requirements not met: ${requirementCheck.message}`
      };
    }

    // 4. Check if already admitted to another institution
    const existingAdmissions = await db.collection('applications')
      .where('studentId', '==', studentId)
      .where('status', '==', 'admitted')
      .get();

    if (!existingAdmissions.empty) {
      return {
        isValid: false,
        message: 'You are already admitted to another institution. Please select your preferred institution first.'
      };
    }

    return {
      isValid: true,
      message: 'Application is valid'
    };

  } catch (error) {
    console.error('Application validation error:', error);
    return {
      isValid: false,
      message: 'Validation error occurred'
    };
  }
};

const checkCourseRequirements = async (studentId, requirements) => {
  if (!requirements) {
    return { met: true, message: 'No specific requirements' };
  }

  // Get student transcripts
  const transcriptsSnapshot = await db.collection('transcripts')
    .where('studentId', '==', studentId)
    .get();

  const transcripts = transcriptsSnapshot.docs.map(doc => doc.data());

  // Check minimum GPA
  if (requirements.minGPA) {
    const highestGPA = Math.max(...transcripts.map(t => t.grades?.gpa || 0));
    if (highestGPA < requirements.minGPA) {
      return {
        met: false,
        message: `Minimum GPA requirement not met (required: ${requirements.minGPA})`
      };
    }
  }

  // Check required subjects
  if (requirements.requiredSubjects && requirements.requiredSubjects.length > 0) {
    const studentSubjects = new Set();
    transcripts.forEach(transcript => {
      if (transcript.grades && transcript.grades.subjects) {
        Object.keys(transcript.grades.subjects).forEach(subject => {
          studentSubjects.add(subject.toLowerCase());
        });
      }
    });

    const missingSubjects = requirements.requiredSubjects.filter(subject =>
      !studentSubjects.has(subject.toLowerCase())
    );

    if (missingSubjects.length > 0) {
      return {
        met: false,
        message: `Missing required subjects: ${missingSubjects.join(', ')}`
      };
    }
  }

  return { met: true, message: 'All requirements met' };
};

const handleMultipleAdmissions = async (studentId, selectedApplicationId) => {
  try {
    // Get all admitted applications for the student
    const admittedApplications = await db.collection('applications')
      .where('studentId', '==', studentId)
      .where('status', '==', 'admitted')
      .get();

    const batch = db.batch();

    // Reject all other admissions
    admittedApplications.docs.forEach(doc => {
      if (doc.id !== selectedApplicationId) {
        batch.update(doc.ref, {
          status: 'rejected',
          updatedAt: new Date(),
          rejectionReason: 'Student selected another institution'
        });

        // Move next student from waiting list
        moveFromWaitingList(doc.data().courseId);
      }
    });

    await batch.commit();

    return {
      success: true,
      message: 'Admission selection processed successfully'
    };

  } catch (error) {
    console.error('Error handling multiple admissions:', error);
    throw error;
  }
};

const moveFromWaitingList = async (courseId) => {
  try {
    // Get waiting list applications for this course
    const waitingApplications = await db.collection('applications')
      .where('courseId', '==', courseId)
      .where('status', '==', 'waiting')
      .orderBy('createdAt', 'asc')
      .limit(1)
      .get();

    if (!waitingApplications.empty) {
      const nextApplication = waitingApplications.docs[0];
      await nextApplication.ref.update({
        status: 'admitted',
        updatedAt: new Date()
      });

      // Notify the student
      await notifyAdmission(nextApplication.data().studentId, courseId);
    }

  } catch (error) {
    console.error('Error moving from waiting list:', error);
  }
};

const notifyAdmission = async (studentId, courseId) => {
  // Implementation for notifying student
  console.log(`Notifying student ${studentId} about admission to course ${courseId}`);
};

module.exports = {
  validateApplication,
  checkCourseRequirements,
  handleMultipleAdmissions
};