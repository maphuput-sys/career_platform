const { db, FieldValue } = require('../config/firebase');

class Job {
  static collection = db.collection('jobs');

  static async create(jobData) {
    const job = {
      ...jobData,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp()
    };

    const docRef = await this.collection.add(job);
    return docRef.id;
  }

  static async findById(jobId) {
    const doc = await this.collection.doc(jobId).get();
    return doc.exists ? { id: doc.id, ...doc.data() } : null;
  }

  static async findByCompany(companyId) {
    const snapshot = await this.collection
      .where('companyId', '==', companyId)
      .orderBy('createdAt', 'desc')
      .get();

    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }

  static async update(jobId, updates) {
    const updateData = {
      ...updates,
      updatedAt: FieldValue.serverTimestamp()
    };

    await this.collection.doc(jobId).update(updateData);
    return this.findById(jobId);
  }

  static async closeJob(jobId) {
    await this.collection.doc(jobId).update({
      status: 'closed',
      updatedAt: FieldValue.serverTimestamp()
    });
  }

  static async getActiveJobs(limit = 50) {
    const snapshot = await this.collection
      .where('status', '==', 'active')
      .where('deadline', '>', new Date())
      .orderBy('deadline', 'asc')
      .limit(limit)
      .get();

    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }

  static async addApplication(jobId, applicationId) {
    await this.collection.doc(jobId).update({
      applications: FieldValue.arrayUnion(applicationId)
    });
  }
}

module.exports = Job;