const { db, FieldValue } = require('../config/firebase');

class Transcript {
  static collection = db.collection('transcripts');

  /**
   * Create a new transcript
   */
  static async create(transcriptData) {
    try {
      const transcript = {
        ...transcriptData,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
        status: 'pending_verification',
        verified: false
      };

      const docRef = await this.collection.add(transcript);
      return { id: docRef.id, ...transcript };
    } catch (error) {
      console.error('Error creating transcript:', error);
      throw error;
    }
  }

  /**
   * Find transcript by ID
   */
  static async findById(transcriptId) {
    try {
      const doc = await this.collection.doc(transcriptId).get();
      return doc.exists ? { id: doc.id, ...doc.data() } : null;
    } catch (error) {
      console.error('Error finding transcript by ID:', error);
      throw error;
    }
  }

  /**
   * Find transcripts by student ID
   */
  static async findByStudent(studentId) {
    try {
      const snapshot = await this.collection
        .where('studentId', '==', studentId)
        .orderBy('createdAt', 'desc')
        .get();

      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        // Convert Firestore timestamp to Date
        uploadDate: doc.data().uploadDate?.toDate?.() || null,
        createdAt: doc.data().createdAt?.toDate?.() || null,
        updatedAt: doc.data().updatedAt?.toDate?.() || null
      }));
    } catch (error) {
      console.error('Error finding transcripts by student:', error);
      throw error;
    }
  }

  /**
   * Find transcripts by institution ID
   */
  static async findByInstitution(institutionId) {
    try {
      const snapshot = await this.collection
        .where('institutionId', '==', institutionId)
        .orderBy('createdAt', 'desc')
        .get();

      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        uploadDate: doc.data().uploadDate?.toDate?.() || null,
        createdAt: doc.data().createdAt?.toDate?.() || null,
        updatedAt: doc.data().updatedAt?.toDate?.() || null
      }));
    } catch (error) {
      console.error('Error finding transcripts by institution:', error);
      throw error;
    }
  }

  /**
   * Update transcript
   */
  static async update(transcriptId, updates) {
    try {
      const updateData = {
        ...updates,
        updatedAt: FieldValue.serverTimestamp()
      };

      await this.collection.doc(transcriptId).update(updateData);
      return this.findById(transcriptId);
    } catch (error) {
      console.error('Error updating transcript:', error);
      throw error;
    }
  }

  /**
   * Verify transcript
   */
  static async verify(transcriptId, verifiedBy, notes = '') {
    try {
      const updateData = {
        verified: true,
        verificationStatus: 'verified',
        verifiedBy,
        verifiedAt: FieldValue.serverTimestamp(),
        verificationNotes: notes,
        updatedAt: FieldValue.serverTimestamp()
      };

      await this.collection.doc(transcriptId).update(updateData);
      return this.findById(transcriptId);
    } catch (error) {
      console.error('Error verifying transcript:', error);
      throw error;
    }
  }

  /**
   * Reject transcript
   */
  static async reject(transcriptId, verifiedBy, notes = '') {
    try {
      const updateData = {
        verified: false,
        verificationStatus: 'rejected',
        verifiedBy,
        verifiedAt: FieldValue.serverTimestamp(),
        verificationNotes: notes,
        updatedAt: FieldValue.serverTimestamp()
      };

      await this.collection.doc(transcriptId).update(updateData);
      return this.findById(transcriptId);
    } catch (error) {
      console.error('Error rejecting transcript:', error);
      throw error;
    }
  }

  /**
   * Delete transcript
   */
  static async delete(transcriptId) {
    try {
      await this.collection.doc(transcriptId).delete();
      return true;
    } catch (error) {
      console.error('Error deleting transcript:', error);
      throw error;
    }
  }

  /**
   * Get pending transcripts for verification
   */
  static async getPendingVerification(limit = 50) {
    try {
      const snapshot = await this.collection
        .where('verificationStatus', '==', 'pending')
        .where('status', '==', 'active')
        .orderBy('createdAt', 'asc')
        .limit(limit)
        .get();

      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        uploadDate: doc.data().uploadDate?.toDate?.() || null,
        createdAt: doc.data().createdAt?.toDate?.() || null
      }));
    } catch (error) {
      console.error('Error getting pending transcripts:', error);
      throw error;
    }
  }

  /**
   * Get verified transcripts
   */
  static async getVerifiedTranscripts(studentId = null, limit = 100) {
    try {
      let query = this.collection
        .where('verified', '==', true)
        .where('status', '==', 'active');

      if (studentId) {
        query = query.where('studentId', '==', studentId);
      }

      const snapshot = await query
        .orderBy('verifiedAt', 'desc')
        .limit(limit)
        .get();

      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        uploadDate: doc.data().uploadDate?.toDate?.() || null,
        verifiedAt: doc.data().verifiedAt?.toDate?.() || null
      }));
    } catch (error) {
      console.error('Error getting verified transcripts:', error);
      throw error;
    }
  }

  /**
   * Calculate GPA from transcript grades
   */
  static calculateGPA(grades) {
    if (!grades || typeof grades !== 'object') {
      return 0;
    }

    const subjects = Object.values(grades);
    if (subjects.length === 0) {
      return 0;
    }

    const total = subjects.reduce((sum, grade) => {
      const numericGrade = parseFloat(grade) || 0;
      return sum + numericGrade;
    }, 0);

    return parseFloat((total / subjects.length).toFixed(2));
  }

  /**
   * Extract subjects from transcript
   */
  static extractSubjects(grades) {
    if (!grades || typeof grades !== 'object') {
      return [];
    }

    return Object.keys(grades).map(subject => ({
      name: subject,
      grade: grades[subject]
    }));
  }

  /**
   * Get transcript statistics for a student
   */
  static async getStudentTranscriptStats(studentId) {
    try {
      const transcripts = await this.findByStudent(studentId);
      
      if (transcripts.length === 0) {
        return {
          total: 0,
          verified: 0,
          pending: 0,
          averageGPA: 0,
          institutions: []
        };
      }

      const stats = {
        total: transcripts.length,
        verified: transcripts.filter(t => t.verified).length,
        pending: transcripts.filter(t => !t.verified).length,
        averageGPA: 0,
        institutions: []
      };

      // Calculate average GPA from verified transcripts
      const verifiedTranscripts = transcripts.filter(t => t.verified && t.grades);
      if (verifiedTranscripts.length > 0) {
        const totalGPA = verifiedTranscripts.reduce((sum, transcript) => {
          return sum + this.calculateGPA(transcript.grades);
        }, 0);
        stats.averageGPA = parseFloat((totalGPA / verifiedTranscripts.length).toFixed(2));
      }

      // Get unique institutions
      const institutionIds = [...new Set(transcripts.map(t => t.institutionId))];
      stats.institutions = institutionIds;

      return stats;
    } catch (error) {
      console.error('Error getting transcript stats:', error);
      throw error;
    }
  }

  /**
   * Search transcripts by student name or institution
   */
  static async search(query, filters = {}) {
    try {
      // This is a simplified search implementation
      // In a real application, you might want to use Algolia or Elasticsearch
      
      let transcriptQuery = this.collection;

      if (filters.verified !== undefined) {
        transcriptQuery = transcriptQuery.where('verified', '==', filters.verified);
      }

      if (filters.institutionId) {
        transcriptQuery = transcriptQuery.where('institutionId', '==', filters.institutionId);
      }

      const snapshot = await transcriptQuery
        .orderBy('createdAt', 'desc')
        .limit(50)
        .get();

      let transcripts = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        uploadDate: doc.data().uploadDate?.toDate?.() || null,
        createdAt: doc.data().createdAt?.toDate?.() || null
      }));

      // Basic client-side filtering for name search
      if (query) {
        transcripts = transcripts.filter(transcript => 
          transcript.studentName?.toLowerCase().includes(query.toLowerCase()) ||
          transcript.institutionName?.toLowerCase().includes(query.toLowerCase())
        );
      }

      return transcripts;
    } catch (error) {
      console.error('Error searching transcripts:', error);
      throw error;
    }
  }
}

module.exports = Transcript;