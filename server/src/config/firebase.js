const admin = require('firebase-admin');

let db = null;

/**
 * Initialize Firebase Admin SDK
 * Uses environment variables for service account credentials
 * @returns {FirebaseFirestore.Firestore} Firestore database instance
 */
function initializeFirebase() {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY;

  // Validate required credentials
  if (!projectId || !clientEmail || !privateKey) {
    const missing = [];
    if (!projectId) missing.push('FIREBASE_PROJECT_ID');
    if (!clientEmail) missing.push('FIREBASE_CLIENT_EMAIL');
    if (!privateKey) missing.push('FIREBASE_PRIVATE_KEY');
    
    console.error(`Firebase initialization failed: Missing environment variables: ${missing.join(', ')}`);
    process.exit(1);
  }

  try {
    // Handle private key newline characters (often escaped in env vars)
    const formattedPrivateKey = privateKey.replace(/\\n/g, '\n');

    admin.initializeApp({
      credential: admin.credential.cert({
        projectId,
        clientEmail,
        privateKey: formattedPrivateKey,
      }),
    });

    db = admin.firestore();
    console.log('Firebase Admin SDK initialized successfully');
    return db;
  } catch (error) {
    console.error('Firebase initialization error:', error.message);
    process.exit(1);
  }
}

/**
 * Get Firestore database instance
 * @returns {FirebaseFirestore.Firestore} Firestore database instance
 * @throws {Error} If Firebase has not been initialized
 */
function getDb() {
  if (!db) {
    throw new Error('Firebase has not been initialized. Call initializeFirebase() first.');
  }
  return db;
}

module.exports = { initializeFirebase, getDb };
