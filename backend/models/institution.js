const { db, FieldValue } = require('../config/firebase');

class Institution {
  static collection = db.collection('users');

  static async findById(institutionId) {
    const doc = await this.collection.doc(institutionId).get();
    const data = doc.data();
    
    if (doc.exists && data.role === 'institution') {
      return { id: doc.id, ...data };
    }
    
    return null;
  }

  static async getAllActive() {
    const snapshot = await this.collection
      .where('role', '==', 'institution')
      .where('profile.status', '==', 'approved')
      .orderBy('profile.name')
      .get();

    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }

  static async getWithCourses() {
    const institutions = await this.getAllActive();
    
    const institutionsWithCourses = await Promise.all(
      institutions.map(async (institution) => {
        const coursesSnapshot = await db.collection('courses')
          .where('institutionId', '==', institution.id)
          .where('status', '==', 'active')
          .get();

        const courses = coursesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        return {
          ...institution,
          courses
        };
      })
    );

    return institutionsWithCourses;
  }
}

module.exports = Institution;