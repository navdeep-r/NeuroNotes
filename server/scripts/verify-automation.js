const mongoose = require('mongoose');
const AutomationService = require('../src/services/AutomationService');
const AutomationLog = require('../src/models/AutomationLog');
require('dotenv').config();

// Connect to DB (using the URI from env or default local)
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/neuronotes';

async function runVerification() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('✅ Connected to MongoDB');

        // Create a dummy meeting ID
        const meetingId = new mongoose.Types.ObjectId();
        console.log(`ℹ️ Testing with Meeting ID: ${meetingId}`);

        // Test Case 1: Positive Match
        const text1 = "Hey neuro schedule a meeting for Friday at 10pm";
        console.log(`\n🔹 Processing: "${text1}"`);

        const log1 = await AutomationService.processChunk(meetingId, {
            text: text1,
            speaker: { name: 'Navdeep', color: '#FF5733' }, // Mock speaker
            timestamp: new Date()
        });

        if (log1 && log1.intent === 'schedule_meeting') {
            console.log('✅ Intent Detected:', log1.intent);
            console.log('✅ Log Saved with ID:', log1._id);
            console.log('✅ Status:', log1.status);
        } else {
            console.error('❌ Failed to detect intent for Case 1');
        }

        // Test Case 2: Negative Match
        const text2 = "Just talking about the weather";
        console.log(`\n🔹 Processing: "${text2}"`);
        const log2 = await AutomationService.processChunk(meetingId, {
            text: text2,
            speaker: 'Navdeep',
            timestamp: new Date()
        });

        if (log2 === null) {
            console.log('✅ No intent detected (Expected)');
        } else {
            console.error('❌ False positive detected:', log2);
        }

        // Verify DB Persistence
        if (log1) {
            const found = await AutomationLog.findById(log1._id);
            if (found) {
                console.log('\n✅ Verified Log existence in DB');
            } else {
                console.error('\n❌ Log not found in DB');
            }
        }

        // Wait a moment for the background webhook trigger to finish
        console.log('\n⏳ Waiting for background tasks...');
        await new Promise(resolve => setTimeout(resolve, 2000));

    } catch (error) {
        console.error('❌ Verification Error:', error);
    } finally {
        await mongoose.disconnect();
        console.log('\nDisconnected.');
    }
}

runVerification();
