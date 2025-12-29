const { initializeFirebase, getDb } = require('./src/config/firebase');
require('dotenv').config();

try {
    initializeFirebase();
    const db = getDb();
    console.log('Attempting to write to Firestore...');
    db.collection('test').add({ test: true, timestamp: new Date() })
        .then(doc => {
            console.log('Success! Document ID:', doc.id);
            process.exit(0);
        })
        .catch(err => {
            console.error('Firestore Write Error:', err.message);
            process.exit(1);
        });
} catch (err) {
    console.error('Initialization Error:', err.message);
    process.exit(1);
}
