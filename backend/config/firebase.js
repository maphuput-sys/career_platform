const admin = require('firebase-admin');

const initializeFirebase = () => {
  try {
    console.log('🔍 Initializing Firebase...');
    
    if (process.env.FIREBASE_PRIVATE_KEY) {
      console.log('📝 Using environment variables for Firebase...');
      
      admin.initializeApp({
        credential: admin.credential.cert({
          project_id: process.env.FIREBASE_PROJECT_ID,
          private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
          client_email: process.env.FIREBASE_CLIENT_EMAIL,
        }),
        databaseURL: `https://${process.env.FIREBASE_PROJECT_ID}.firebaseio.com`,
        storageBucket: `${process.env.FIREBASE_PROJECT_ID}.appspot.com`
      });
      
      console.log('✅ Firebase initialized via environment variables');
      console.log(`📋 Project: ${process.env.FIREBASE_PROJECT_ID}`);
      return admin;
    } else {
      throw new Error('No Firebase configuration found in environment variables');
    }
    
  } catch (error) {
    console.error('❌ Firebase initialization failed:', error.message);
    throw error;
  }
};

module.exports = initializeFirebase();