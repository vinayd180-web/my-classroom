const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const path = require('path');

app.use(express.static(path.join(__dirname, '/')));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// 🔑 डायनामिक स्टूडेंट पासवर्ड स्टोर करने के लिए वेरिएबल
let currentStudentPassword = "student2026"; 

io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    // 🔑 नए जुड़ने वाले को मौजूदा स्टूडेंट पासवर्ड भेजना
    socket.emit('init-student-password', currentStudentPassword);

    // 🔑 जब टीचर पासवर्ड बदले, तो उसे अपडेट करके सबको बताना
    socket.on('update-student-password', (newPassword) => {
        currentStudentPassword = newPassword;
        io.emit('init-student-password', currentStudentPassword);
    });

    socket.on('register-role', (role) => {
        socket.role = role;
        if(role === 'teacher') {
            socket.join('teacher-room');
        }
    });

    socket.on('signal', (data) => {
        if (data.targetId === 'all') {
            socket.broadcast.emit('signal', { senderId: socket.id, signal: data.signal });
        } else {
            io.to(data.targetId).emit('signal', { senderId: socket.id, signal: data.signal });
        }
    });

    socket.on('draw', (data) => {
        socket.broadcast.emit('draw', data);
    });

    socket.on('clear-board', () => {
        socket.broadcast.emit('clear-board');
    });

    socket.on('chat-message', (data) => {
        io.emit('chat-message', data);
    });

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
    });
});

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
