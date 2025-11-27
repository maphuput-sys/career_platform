const { db, FieldValue } = require('../config/firebase');

class User {
  static collection = db.collection('users');

  static async create(uid, userData) {
    const user = {
      ...userData,
      uid,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      status: 'active',
      emailVerified: false
    };

    await this.collection.doc(uid).set(user);
    return user;
  }

  static async findById(uid) {
    const doc = await this.collection.doc(uid).get();
    return doc.exists ? { id: doc.id, ...doc.data() } : null;
  }

  static async findByEmail(email) {
    const snapshot = await this.collection
      .where('email', '==', email.toLowerCase())
      .limit(1)
      .get();

    return snapshot.empty ? null : { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };
  }

  static async update(uid, updates) {
    const updateData = {
      ...updates,
      updatedAt: FieldValue.serverTimestamp()
    };

    await this.collection.doc(uid).update(updateData);
    return this.findById(uid);
  }

  static async delete(uid) {
    await this.collection.doc(uid).delete();
  }

  static async findByRole(role, limit = 50) {
    const snapshot = await this.collection
      .where('role', '==', role)
      .limit(limit)
      .get();

    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }
}

module.exports = User;