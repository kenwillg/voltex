
import fs from 'fs';
import path from 'path';

async function main() {
    console.log("Checking Brevo API Key...");

    // Manually load .env
    const envPath = path.join(process.cwd(), '.env');
    let apiKey = process.env.BREVO_API_KEY;

    if (fs.existsSync(envPath)) {
        console.log("Loading .env file...");
        const envContent = fs.readFileSync(envPath, 'utf-8');
        const lines = envContent.split('\n');
        for (const line of lines) {
            const match = line.match(/^BREVO_API_KEY=(.*)$/);
            if (match) {
                let val = match[1].trim();
                // Remove quotes if present
                if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
                    val = val.slice(1, -1);
                }
                apiKey = val;
                console.log("Found BREVO_API_KEY in .env");
                break;
            }
        }
    } else {
        console.log(".env file not found.");
    }

    if (!apiKey) {
        console.error("Error: BREVO_API_KEY not found in environment or .env file.");
        return;
    }

    console.log(`Key length: ${apiKey.length}`);
    console.log(`Key start: ${apiKey.substring(0, 4)}...`);
    console.log(`Key end: ...${apiKey.substring(apiKey.length - 4)}`);

    console.log("Testing connection to Brevo API...");
    try {
        const res = await fetch("https://api.brevo.com/v3/account", {
            method: "GET",
            headers: {
                "api-key": apiKey,
                "Content-Type": "application/json",
            },
        });

        if (res.ok) {
            const data = await res.json();
            console.log("Success! Connected to Brevo.");
            console.log(`Account email: ${data.email}`);
        } else {
            console.error(`Failed: ${res.status} ${res.statusText}`);
            const text = await res.text();
            console.error("Response:", text);
        }
    } catch (error) {
        console.error("Network error:", error);
    }
}

main();
