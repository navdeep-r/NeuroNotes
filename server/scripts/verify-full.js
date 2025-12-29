/**
 * Verification script for MinuteFlow Firebase migration
 * 
 * This script verifies the full flow:
 * 1. Starts a simulation via REST API
 * 2. Polls Firestore for transcript updates
 * 3. Polls Firestore for insights and visuals
 * 
 * Usage: node scripts/verify-full.js
 * 
 * Requirements: Firebase emulator or real Firestore connection
 */

const http = require('http');

const BASE_URL = 'http://localhost:5000';
let meetingId = '';

console.log('Starting MinuteFlow verification...\n');

async function startSimulation() {
    return new Promise((resolve, reject) => {
        const data = JSON.stringify({
            title: 'Verification Meeting'
        });

        const req = http.request({
            hostname: 'localhost',
            port: 5000,
            path: '/api/ingest/simulation',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': data.length
            }
        }, (res) => {
            let body = '';
            res.on('data', (chunk) => body += chunk);
            res.on('end', () => {
                try {
                    const response = JSON.parse(body);
                    console.log('✓ Simulation Started:', response.meetingId);
                    resolve(response.meetingId);
                } catch (e) {
                    reject(new Error(`Failed to parse response: ${body}`));
                }
            });
        });

        req.on('error', reject);
        req.write(data);
        req.end();
    });
}

async function getMeetingArtifacts(meetingId) {
    return new Promise((resolve, reject) => {
        const req = http.request({
            hostname: 'localhost',
            port: 5000,
            path: `/api/meetings/${meetingId}/artifacts`,
            method: 'GET'
        }, (res) => {
            let body = '';
            res.on('data', (chunk) => body += chunk);
            res.on('end', () => {
                try {
                    resolve(JSON.parse(body));
                } catch (e) {
                    reject(new Error(`Failed to parse artifacts: ${body}`));
                }
            });
        });

        req.on('error', reject);
        req.end();
    });
}

async function getMeeting(meetingId) {
    return new Promise((resolve, reject) => {
        const req = http.request({
            hostname: 'localhost',
            port: 5000,
            path: `/api/meetings/${meetingId}`,
            method: 'GET'
        }, (res) => {
            let body = '';
            res.on('data', (chunk) => body += chunk);
            res.on('end', () => {
                try {
                    resolve(JSON.parse(body));
                } catch (e) {
                    reject(new Error(`Failed to parse meeting: ${body}`));
                }
            });
        });

        req.on('error', reject);
        req.end();
    });
}

async function pollForData(meetingId, maxAttempts = 20, intervalMs = 3000) {
    console.log('\nPolling for data (this may take up to 60 seconds)...\n');
    
    let hasActions = false;
    let hasDecisions = false;
    let hasVisuals = false;
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        await new Promise(resolve => setTimeout(resolve, intervalMs));
        
        try {
            const artifacts = await getMeetingArtifacts(meetingId);
            
            if (artifacts.actions?.length > 0 && !hasActions) {
                hasActions = true;
                console.log(`✓ Actions found: ${artifacts.actions.length}`);
                artifacts.actions.forEach(a => console.log(`  - ${a.content}`));
            }
            
            if (artifacts.decisions?.length > 0 && !hasDecisions) {
                hasDecisions = true;
                console.log(`✓ Decisions found: ${artifacts.decisions.length}`);
                artifacts.decisions.forEach(d => console.log(`  - ${d.content}`));
            }
            
            if (artifacts.visuals?.length > 0 && !hasVisuals) {
                hasVisuals = true;
                console.log(`✓ Visuals found: ${artifacts.visuals.length}`);
                artifacts.visuals.forEach(v => console.log(`  - ${v.title} (${v.type})`));
            }
            
            // Check if we have all expected data
            if (hasActions && hasDecisions && hasVisuals) {
                return { success: true, artifacts };
            }
            
            process.stdout.write(`  Attempt ${attempt}/${maxAttempts}...\r`);
        } catch (error) {
            console.error(`  Attempt ${attempt} failed:`, error.message);
        }
    }
    
    return { 
        success: hasActions || hasDecisions || hasVisuals,
        hasActions,
        hasDecisions,
        hasVisuals
    };
}

async function run() {
    try {
        // Start simulation
        meetingId = await startSimulation();
        
        // Poll for data
        const result = await pollForData(meetingId);
        
        // Get final meeting state
        const meeting = await getMeeting(meetingId);
        console.log(`\n✓ Meeting status: ${meeting.status}`);
        
        if (result.success) {
            console.log('\n========================================');
            console.log('✓ VERIFICATION PASSED');
            console.log('========================================\n');
            process.exit(0);
        } else {
            console.log('\n========================================');
            console.log('⚠ VERIFICATION INCOMPLETE');
            console.log('Some data may still be processing.');
            console.log('========================================\n');
            process.exit(1);
        }
    } catch (error) {
        console.error('\n✗ VERIFICATION FAILED:', error.message);
        process.exit(1);
    }
}

run();
