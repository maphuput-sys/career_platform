const { db, FieldValue } = require('../config/firebase');

class Application {
  static collection = db.collection('applications');

  static async create(applicationData) {
    const application = {
      ...applicationData,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      status: 'pending'
    };

    const docRef = await this.collection.add(application);
    return { id: docRef.id, ...application };
  }

  static async findById(applicationId) {
    const doc = await this.collection.doc(applicationId).get();
    return doc.exists ? { id: doc.id, ...doc.data() } : null;
  }

  static async findByStudent(studentId) {
    const snapshot = await this.collection
      .where('studentId', '==', studentId)
      .orderBy('createdAt', 'desc')
      .get();

    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }

  static async findByInstitution(institutionId) {
    const snapshot = await this.collection
      .where('institutionId', '==', institutionId)
      .orderBy('createdAt', 'desc')
      .get();

    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }

  static async updateStatus(applicationId, status) {
    const updateData = {
      status,
      updatedAt: FieldValue.serverTimestamp()
    };

    if (status === 'admitted') {
      updateData.admittedAt = FieldValue.serverTimestamp();
    }

    await this.collection.doc(applicationId).update(updateData);
    return this.findById(applicationId);
  }

  static async countByInstitutionAndStatus(institutionId, status) {
    const snapshot = await this.collection
      .where('institutionId', '==', institutionId)
      .where('status', '==', status)
      .get();

    return snapshot.size;
  }
}

module.exports = Application;