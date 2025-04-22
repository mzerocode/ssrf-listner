const http = require('http');
const path = require('path');
const fs = require('fs');

const server = http.createServer((req, res) => {
    console.log(`\n📥 ${req.method} Request received---------------------------------------------------------------`);

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
    console.log(`🧠 Headers:`, req.body);

    let body = [];
    req.on('data', chunk => body.push(chunk));
    req.on('end', () => {
        body = Buffer.concat(body).toString();
        if (body) console.log(`📦 Body: ${body}`);

        // Serve static HTML from a file
            const filePath = path.join(__dirname, 'public', req.url);
            if(req.url.startsWith('/payload/')) {
                fs.readFile(filePath, (err, content) => {
                    if(err) {
                        res.writeHead(404, {'Content-Type': 'text/plain'});
                        res.end('File Not Found');
                        return;
                    }
                    
                    res.writeHead(200, {'Content-Type': 'text/html'});
                    res.end(content);
                })
            } else {
            res.writeHead(200, { 'Content-Type': 'text/plain' });
            res.end('SSRF listner is active');
        }
    });

});

const PORT = 4545;
server.listen(PORT, () => {
    console.log(`🚀 SSRF listener is running at http://localhost:${PORT}`);
})
