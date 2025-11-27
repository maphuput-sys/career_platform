// services/jobMatchingService.js
const { db } = require('../config/firebase');

class JobMatchingService {
  async findQualifiedCandidates(jobId) {
    const jobDoc = await db.collection('jobPostings').doc(jobId).get();
    
    if (!jobDoc.exists) {
      throw new Error('Job not found');
    }

    const job = jobDoc.data();
    const allStudents = await db.collection('studentProfiles').get();
    const qualifiedStudents = [];

    for (const studentDoc of allStudents.docs) {
      const student = studentDoc.data();
      const score = await this.calculateMatchScore(student, job.requirements);
      
      if (score >= 0.7) { // 70% match threshold
        qualifiedStudents.push({
          studentId: student.studentId,
          matchScore: score,
          profile: student
        });
      }
    }

    // Sort by match score
    qualifiedStudents.sort((a, b) => b.matchScore - a.matchScore);
    
    return qualifiedStudents;
  }

  async calculateMatchScore(student, jobRequirements) {
    if (!student || !jobRequirements) return 0;

    let score = 0;
    let totalWeight = 0;

    // Academic performance weight: 40%
    const academicWeight = 0.4;
    const academicScore = this.calculateAcademicScore(student, jobRequirements);
    score += academicScore * academicWeight;
    totalWeight += academicWeight;

    // Course relevance weight: 30%
    const courseWeight = 0.3;
    const courseScore = this.calculateCourseRelevance(student, jobRequirements);
    score += courseScore * courseWeight;
    totalWeight += courseWeight;

    // Experience weight: 20%
    const experienceWeight = 0.2;
    const experienceScore = this.calculateExperienceScore(student, jobRequirements);
    score += experienceScore * experienceWeight;
    totalWeight += experienceWeight;

    // Certificates weight: 10%
    const certificatesWeight = 0.1;
    const certificatesScore = this.calculateCertificatesScore(student, jobRequirements);
    score += certificatesScore * certificatesWeight;
    totalWeight += certificatesWeight;

    return totalWeight > 0 ? score / totalWeight : 0;
  }

  calculateAcademicScore(student, requirements) {
    const latestRecord = student.academicRecords?.[0];
    if (!latestRecord || !requirements.minGPA) return 0;

    const gpa = latestRecord.gpa || 0;
    const minGPA = requirements.minGPA || 0;

    if (gpa >= minGPA) {
      return 1;
    } else if (gpa >= minGPA * 0.8) {
      return 0.7;
    } else if (gpa >= minGPA * 0.6) {
      return 0.4;
    }

    return 0;
  }

  calculateCourseRelevance(student, requirements) {
    const latestRecord = student.academicRecords?.[0];
    if (!latestRecord || !requirements.requiredCourses) return 0.5; // Neutral score

    const studentCourse = latestRecord.course;
    const requiredCourses = requirements.requiredCourses || [];

    if (requiredCourses.length === 0) return 0.5;

    // Exact match
    if (requiredCourses.includes(studentCourse)) {
      return 1;
    }

    // Partial match (check if course contains keywords)
    const courseWords = studentCourse.toLowerCase().split(' ');
    for (const reqCourse of requiredCourses) {
      const reqWords = reqCourse.toLowerCase().split(' ');
      const commonWords = courseWords.filter(word => 
        reqWords.includes(word) && word.length > 3
      );
      
      if (commonWords.length >= 2) {
        return 0.7;
      }
    }

    return 0.3;
  }

  calculateExperienceScore(student, requirements) {
    const workExperience = student.workExperience || [];
    const requiredExperience = requirements.experience || 0;

    if (requiredExperience === 0) return 1;

    const totalExperience = workExperience.reduce((sum, exp) => sum + (exp.duration || 0), 0);
    
    if (totalExperience >= requiredExperience) {
      return 1;
    } else if (totalExperience >= requiredExperience * 0.7) {
      return 0.8;
    } else if (totalExperience >= requiredExperience * 0.5) {
      return 0.6;
    } else if (totalExperience >= requiredExperience * 0.3) {
      return 0.4;
    }

    return 0.2;
  }

  calculateCertificatesScore(student, requirements) {
    const studentCerts = student.certificates || [];
    const requiredCerts = requirements.certificates || [];

    if (requiredCerts.length === 0) return 1;

    const matchCount = requiredCerts.filter(reqCert => 
      studentCerts.some(studentCert => 
        studentCert.name.toLowerCase().includes(reqCert.toLowerCase()) ||
        reqCert.toLowerCase().includes(studentCert.name.toLowerCase())
      )
    ).length;

    return matchCount / requiredCerts.length;
  }

  async notifyMatchingJobs(studentId) {
    const studentProfile = await db.collection('studentProfiles').doc(studentId).get();
    
    if (!studentProfile.exists) return;

    const profile = studentProfile.data();
    const activeJobs = await db.collection('jobPostings')
      .where('status', '==', 'active')
      .get();

    const matchingJobs = [];

    for (const jobDoc of activeJobs.docs) {
      const job = jobDoc.data();
      const matchScore = await this.calculateMatchScore(profile, job.requirements);
      
      if (matchScore >= 0.8) { // High match threshold for notifications
        matchingJobs.push({
          jobId: jobDoc.id,
          ...job,
          matchScore
        });
      }
    }

    // Create notifications for matching jobs
    if (matchingJobs.length > 0) {
      const notificationBatch = db.batch();
      
      matchingJobs.forEach(job => {
        const notificationRef = db.collection('notifications').doc();
        notificationBatch.set(notificationRef, {
          userId: studentId,
          type: 'job_recommendation',
          title: 'New Job Match',
          message: `You're a great match for: ${job.title}`,
          data: {
            jobId: job.jobId,
            companyId: job.companyId,
            matchScore: job.matchScore
          },
          read: false,
          createdAt: new Date()
        });
      });

      await notificationBatch.commit();
    }
  }
}

module.exports = new JobMatchingService();