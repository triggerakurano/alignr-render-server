const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
// Create an HTTP server using the Express app as the request handler
const server = http.createServer(app);
// Attach Socket.IO to the HTTP server instance
const io = new Server(server, {
  cors: { origin: "*" }
});

const deviceList = [];

// Serve static HTML/JS files from a "public" folder
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json()); 


// Standard HTTP Route
app.get('/api/status', (req, res) => {
  res.json({ status: 'Server is running smoothly' });
});

// Standard HTTP Route
app.post('/api/updateDevice', (req, res) => {
  let updatedDeviceData = req.body;

  const deviceExists = deviceList.some(deviceData => deviceData.name === updatedDeviceData.name);

  const existingDeviceIndex = deviceList.findIndex(deviceData => deviceData.name === updatedDeviceData.name);

  if (existingDeviceIndex != -1){
    deviceList[existingDeviceIndex] = updatedDeviceData;
  } else {
    deviceList.push(updatedDeviceData);
  }

  io.emit('update-device-list', deviceList);
  res.json({ status: 'Devices Updated' });
});


// Socket.IO Event Handling
io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  io.emit('update-device-list', deviceList);

  // Listen for custom event from client
  //socket.on('chatMessage', (data) => {
  //  console.log('Received message:', data);
//
  //  // Broadcast the message back to all connected clients
  //  //io.emit('messageFromServer', data);
  //});

  // Handle user disconnect
  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);
  });
});

// Start the server (Listen on the server instance, NOT the app instance)
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});