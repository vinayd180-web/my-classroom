const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const path = require('path');

app.use(express.static(__dirname));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

const roles = {};
let drawingHistory = []; // 👈 यहाँ बोर्ड पर लिखी गई हर लाइन लाइव सेव होगी
let currentBackground = ''; // 👈 वर्तमान PDF या इमेज स्लाइड को याद रखने के लिए
let currentZoom = 1;

io.on('connection', (socket) => {
    console.log('एक नया यूजर जुड़ा (ID):', socket.id);

    // 👈 नया यूजर आते ही उसे पुरानी पूरी क्लास का बैकग्राउंड, ज़ूम और ड्रॉइंग का इतिहास ऑटो-सिंक हो जाएगा
    socket.emit('bg-sync', currentBackground);
    socket.emit('zoom-sync', currentZoom);
    socket.emit('history-sync', drawingHistory);

    socket.on('register-role', (role) => {
        roles[socket.id] = role;
        console.log(`सॉकेट ${socket.id} ने रोल चुना: ${role}`);
    });

    socket.on('drawing', (data) => {
        drawingHistory.push(data); // 👈 हर नई लाइन को इतिहास में सुरक्षित करें
        socket.broadcast.emit('drawing', data);
    });

    socket.on('clearBoard', () => {
        drawingHistory = []; // 👈 वॉश करने पर पूरा इतिहास भी साफ
        currentBackground = '';
        currentZoom = 1;
        socket.broadcast.emit('clearBoard');
    });

    socket.on('bg-sync', (imgSrc) => {
        currentBackground = imgSrc; // 👈 वर्तमान स्लाइड को याद रखें
        if(!imgSrc) drawingHistory = []; // अगर बैकग्राउंड हटाया तो ड्राइंग भी साफ
        socket.broadcast.emit('bg-sync', imgSrc);
    });

    socket.on('zoom-sync', (scale) => {
        currentZoom = scale; // 👈 ज़ूम लेवल याद रखें
        socket.broadcast.emit('zoom-sync', scale);
    });

    socket.on('toggle-lock', (isLocked) => {
        io.emit('lock-state', isLocked);
    });

    socket.on('chat-message', (data) => {
        io.emit('chat-message', data);
    });

    socket.on('signal', (data) => {
        if (data.targetId === 'all') {
            socket.broadcast.emit('signal', { senderId: socket.id, signal: data.signal });
        } else {
            io.to(data.targetId).emit('signal', { senderId: socket.id, signal: data.signal });
        }
    });

    socket.on('disconnect', () => {
        console.log('यूजर डिस्कनेक्ट हुआ:', socket.id);
        delete roles[socket.id];
        io.emit('user-left', socket.id);
    });
});

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
    console.log(`=================================================`);
    console.log(`🚀 मास्टर डेटा-पर्सिस्टेंट सर्वर चालू हो गया है!`);
    console.log(`🌐 लोकल लिंक: http://localhost:${PORT}`);
    console.log(`=================================================`);
});
