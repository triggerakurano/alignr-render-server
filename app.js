const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const cors = require('cors');
const {MongoClient} = require('mongodb')

const app = express();
// Create an HTTP server using the Express app as the request handler
const server = http.createServer(app);
// Attach Socket.IO to the HTTP server instance
const io = new Server(server, {
  cors: { origin: "*" }
});

const client = new MongoClient(process.env.MONGODB_URI);

const getDevices = async () => {
  try {
    await client.connect();
    const db = client.db('ALIGNR-Devices-DB');
    const collection = await db.collection("ALIGNR-Devices-Collection");
    const allDocs = await collection.find({}).toArray();
    await client.close();
    return allDocs;
  } catch (error) {
    await client.close();
    return { error }
  }
};

const deviceList = [];

// Serve static HTML/JS files from a "public" folder
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.use(cors());


// Standard HTTP Route
app.get('/api/status', (req, res) => {
  res.json({ status: 'Server is running smoothly' });
});

// Send longterm data
app.post('/api/sendLongTermData', async (req, res) => {
  let longTermData = req.body;

  const newMeasurement = {
    metadata: { deviceID: longTermData.name }, // relatively static
    timeStamp: new Date(), // Standard ISO-8601 Date format
    value: longTermData.data
  };

  await client.connect();
  const db = client.db('Longterm-Data-DB');
  const collection = await db.collection("Longterm-Data-Collection");
  const result = await collection.insertOne(newMeasurement);
  
  res.json({ status: 'Long Term Data Received' });
});

app.post('/api/clearCurrentDevices', async (req, res) => {
  deviceList.length = 0;
  res.json({ status: 'Devices Cleared' });
  io.emit('update-device-list', deviceList);
});

// Get long term data
app.get('/api/getLongTermData', async (req, res) => {
  await client.connect();
  const db = client.db('Longterm-Data-DB');
  const collection = await db.collection("Longterm-Data-Collection");

  const lastFiveDocs = await collection
    .find({})
    .sort({ _id: -1 })
    .limit(1)
    .toArray();

  await client.close();
  res.json({ lastData: lastFiveDocs });
});

// Standard HTTP Route
app.post('/api/updateDevice', (req, res) => {
  let updatedDeviceData = req.body;

  const existingDeviceIndex = deviceList.findIndex(deviceData => deviceData.name === updatedDeviceData.name);

  if (existingDeviceIndex != -1){
    deviceList[existingDeviceIndex] = updatedDeviceData;
  } else {
    deviceList.push(updatedDeviceData);
  }

  io.emit('update-device-list', deviceList);
  res.json({ status: 'Devices Updated' });
});

// Standard HTTP Route
app.get('/api/getDeviceMongo', async (req, res) => {
  let devices = await getDevices();
  res.json({ data: devices });
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