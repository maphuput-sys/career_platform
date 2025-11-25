const { db, FieldValue } = require('../config/firebase');

class Course {
  static collection = db.collection('courses');

  static async create(courseData) {
    const course = {
      ...courseData,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp()
    };

    const docRef = await this.collection.add(course);
    return docRef.id;
  }

  static async findById(courseId) {
    const doc = await this.collection.doc(courseId).get();
    return doc.exists ? { id: doc.id, ...doc.data() } : null;
  }

  static async findByInstitution(institutionId) {
    const snapshot = await this.collection
      .where('institutionId', '==', institutionId)
      .where('status', '==', 'active')
      .orderBy('createdAt', 'desc')
      .get();

    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }

  static async findByFaculty(facultyId) {
    const snapshot = await this.collection
      .where('facultyId', '==', facultyId)
      .where('status', '==', 'active')
      .get();

    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }

  static async update(courseId, updates) {
    const updateData = {
      ...updates,
      updatedAt: FieldValue.serverTimestamp()
    };

    await this.collection.doc(courseId).update(updateData);
    return this.findById(courseId);
  }

  static async delete(courseId) {
    await this.collection.doc(courseId).update({
      status: 'inactive',
      updatedAt: FieldValue.serverTimestamp()
    });
  }

  static async search(query) {
    const snapshot = await this.collection
      .where('name', '>=', query)
      .where('name', '<=', query + '\uf8ff')
      .where('status', '==', 'active')
      .limit(20)
      .get();

    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }
}

module.exports = Course;