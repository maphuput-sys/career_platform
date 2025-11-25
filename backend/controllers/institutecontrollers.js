const { db, FieldValue } = require('../config/firebase');
const Institution = require('../models/institution');
const Course = require('../models/course');
const Application = require('../models/application');

class institutioncontrollers {
  static async createFaculty(req, res) {
    try {
      const { name, description } = req.body;
      const institutionId = req.user.uid;

      const facultyData = {
        name,
        description,
        institutionId,
        createdAt: FieldValue.serverTimestamp(),
        status: 'active'
      };

      const facultyRef = await db.collection('faculties').add(facultyData);

      res.status(201).json({
        success: true,
        message: 'Faculty created successfully',
        data: { facultyId: facultyRef.id }
      });

    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to create faculty',
        error: error.message
      });
    }
  }

  static async createCourse(req, res) {
    try {
      const institutionId = req.user.uid;
      const { name, facultyId, requirements, duration, capacity, description } = req.body;

      const courseData = {
        name,
        facultyId,
        institutionId,
        requirements: requirements || {},
        duration,
        capacity: parseInt(capacity),
        description,
        createdAt: FieldValue.serverTimestamp(),
        status: 'active'
      };

      const courseId = await Course.create(courseData);

      res.status(201).json({
        success: true,
        message: 'Course created successfully',
        data: { courseId }
      });

    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to create course',
        error: error.message
      });
    }
  }

  static async getApplications(req, res) {
    try {
      const institutionId = req.user.uid;
      const { status, courseId, page = 1, limit = 20 } = req.query;

      let query = db.collection('applications').where('institutionId', '==', institutionId);

      if (status) {
        query = query.where('status', '==', status);
      }

      if (courseId) {
        query = query.where('courseId', '==', courseId);
      }

      const snapshot = await query
        .orderBy('createdAt', 'desc')
        .limit(parseInt(limit))
        .offset((parseInt(page) - 1) * parseInt(limit))
        .get();

      const applications = await Promise.all(
        snapshot.docs.map(async (doc) => {
          const application = doc.data();
          const [student, course] = await Promise.all([
            db.collection('users').doc(application.studentId).get(),
            db.collection('courses').doc(application.courseId).get()
          ]);

          return {
            id: doc.id,
            ...application,
            student: student.exists ? student.data() : null,
            course: course.exists ? course.data() : null
          };
        })
      );

      res.json({
        success: true,
        data: { applications },
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: snapshot.size
        }
      });

    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to fetch applications',
        error: error.message
      });
    }
  }

  static async updateApplicationStatus(req, res) {
    try {
      const { applicationId } = req.params;
      const { status } = req.body;
      const institutionId = req.user.uid;

      // Verify application belongs to institution
      const application = await Application.findById(applicationId);
      if (!application || application.institutionId !== institutionId) {
        return res.status(404).json({
          success: false,
          message: 'Application not found'
        });
      }

      // Update status
      const updatedApplication = await Application.updateStatus(applicationId, status);

      // Handle multiple admissions
      if (status === 'admitted') {
        await handleMultipleAdmissions(application.studentId, applicationId);
      }

      res.json({
        success: true,
        message: 'Application status updated successfully',
        data: { application: updatedApplication }
      });

    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to update application status',
        error: error.message
      });
    }
  }

  static async publishAdmissions(req, res) {
    try {
      const institutionId = req.user.uid;
      const { courseId, admittedStudents } = req.body;

      const admissionData = {
        institutionId,
        courseId,
        admittedStudents,
        publishedAt: FieldValue.serverTimestamp(),
        status: 'published'
      };

      await db.collection('admissions').add(admissionData);

      // Notify admitted students
      await Promise.all(
        admittedStudents.map(async (studentId) => {
          const student = await db.collection('users').doc(studentId).get();
          if (student.exists) {
            // Send notification email
            await sendAdmissionNotification(student.data().email, institutionId);
          }
        })
      );

      res.json({
        success: true,
        message: 'Admissions published successfully'
      });

    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to publish admissions',
        error: error.message
      });
    }
  }

  static async getCourses(req, res) {
    try {
      const institutionId = req.user.uid;
      const courses = await Course.findByInstitution(institutionId);

      res.json({
        success: true,
        data: { courses }
      });

    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to fetch courses',
        error: error.message
      });
    }
  }

  static async updateProfile(req, res) {
    try {
      const institutionId = req.user.uid;
      const updates = req.body;

      const updatedInstitution = await User.update(institutionId, {
        profile: updates
      });

      res.json({
        success: true,
        message: 'Profile updated successfully',
        data: { institution: updatedInstitution }
      });

    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to update profile',
        error: error.message
      });
    }
  }
}

async function handleMultipleAdmissions(studentId, currentApplicationId) {
  // Check if student has other admissions
  const otherAdmissions = await db.collection('applications')
    .where('studentId', '==', studentId)
    .where('status', '==', 'admitted')
    .where('id', '!=', currentApplicationId)
    .get();

  if (!otherAdmissions.empty) {
    // Notify student to choose one institution
    await notifyStudentToChoose(studentId);
  }
}

async function notifyStudentToChoose(studentId) {
  const student = await db.collection('users').doc(studentId).get();
  if (student.exists) {
    // Send email notification
    await sendNotification(
      student.data().email,
      'Multiple Admissions - Choose Your Institution',
      'You have been admitted to multiple institutions. Please log in to choose your preferred institution.'
    );
  }
}

async function sendAdmissionNotification(studentEmail, institutionId) {
  const institution = await db.collection('users').doc(institutionId).get();
  const institutionName = institution.exists ? institution.data().profile.name : 'the institution';

  await sendNotification(
    studentEmail,
    'Admission Decision',
    `Congratulations! You have been admitted to ${institutionName}. Please log in to view your admission letter.`
  );
}

module.exports = institutioncontrollers;