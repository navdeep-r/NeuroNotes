require('dotenv').config();
const fs = require('fs');

async function testGrok() {
    console.log('--- Debugging Grok API ---');
    const apiKey = process.env.GROK_API_KEY ? process.env.GROK_API_KEY.trim() : null;
    if (!apiKey) {
        console.error('Missing GROK_API_KEY');
        return;
    }

    console.log('API Key loaded:', apiKey ? `${apiKey.substring(0, 5)}...` : 'NO');
    const url = 'https://api.x.ai/v1/chat/completions';

    const variations = [
        { model: "grok-beta", hasSystem: false }
    ];

    for (const v of variations) {
        console.log(`\nTesting ${v.model} (System: ${v.hasSystem})...`);
        const messages = [];
        if (v.hasSystem) messages.push({ role: "system", content: "You are a test assistant." });
        messages.push({ role: "user", content: "Say hello." });

        const body = {
            model: v.model,
            messages: messages,
            stream: false
        };

        try {
            const res = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify(body)
            });

            if (!res.ok) {
                console.log(`FAILED: ${res.status}`);
                const txt = await res.text();
                fs.writeFileSync('error.txt', txt);
                console.log('Error Body written to error.txt');
            } else {
                const data = await res.json();
                console.log('SUCCESS');
                console.log('Content:', data.choices[0].message.content);
                return;
            }
        } catch (e) {
            console.log('Ex:', e.message);
        }
    }
}

testGrok();
