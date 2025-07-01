const express = require("express");
const path = require("path");
const mongoose = require('mongoose');
const cors = require('cors');
const app = express();

const http = require("http");
const { Server } = require("socket.io");
const server = http.createServer(app);
const io = new Server(server);

app.use(express.json());
app.use(cors());
app.use(express.static(path.join(__dirname , "public")));

const userSchema = new mongoose.Schema({
    fullName: {
      type: String,
      required: true,
    },
  
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true
    },
  
    password: {
      type: String,
      required: true
    },
  
    role: {
      type: String,
      enum: ['user', 'admin'],
      default: 'user'
    },
  
    devices: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Device',
        default: []
      }
    ]
  });

const UserModel = mongoose.model('user', userSchema);

const deviceSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  location: String,
  topic: {
    type: String,
    required: true
  }
});

const DeviceModel = mongoose.model('device', deviceSchema);


const mqtt = require('mqtt');

const client = mqtt.connect('mqtt://localhost:1883');

client.on('connect', () => {
  client.subscribe('GATEWAY1/#');
});

client.on('message', (topic, value) => {
  const timestamp = new Date().toISOString();
  const message = {
    "topic": topic,
    "value": Number(value),
    "timestamp": timestamp,
  };
  // console.log(message);
// store and forward concept
// save the mqtt data to mongo
  io.emit("live_sensor_updates", message);
});

app.get("/findAllUsers", async (request, response) => {
  try {
    await mongoose.connect(process.env.DB_ENV);

    const result = await UserModel.find({}).lean();

    response.status(200).send(result)
  } catch(error){
    response.status(500).send("Something went wrong")
  } finally{
    await mongoose.disconnect();
  }

})

app.post("/insertUser", async (request, response) => {
    try {
        const fullName = request.body.fullName;
        const email = request.body.email;
        const password = request.body.password;

        await mongoose.connect('mongodb://localhost:27017/iotdb');

        await UserModel.insertOne(
            { "fullName": fullName, "email": email, "password": password } 
        );
        response.status(201).send({ "success": true, "message": "Signup successful" })
    } catch(error){
        response.status(500).send({ "success": false, "message": "Internal server error" })
    } finally{
        await mongoose.disconnect();  
    }

});

app.post("/login", async (request, response) => {
    try {
        const email = request.body.email;
        const password = request.body.password;

        await mongoose.connect('mongodb://localhost:27017/iotdb');

        const user = await UserModel.findOne({ email: email });

        if (!user) {
            return response.status(401).send({ "success": false, "message": "Invalid credentials" });
        }

        // In a real application, you should compare hashed passwords
        // if (user.password === password) {
        //     response.status(200).send({ "success": true, "message": "Login successful" });

        if (user.password === password) {
        response.status(200).send({ 
        "success": true, 
        "message": "Login successful", 
        "role": user.role
      })
        } else {
            response.status(401).send({ "success": false, "message": "Invalid credentials" });
        }

    } catch (error) {
        console.error("Login error:", error);
        response.status(500).send({ "success": false, "message": "Internal server error" });
    } finally {
        await mongoose.disconnect();
    }
});

app.put("/updateUser", async (request, response) => {
    try {
        const email = request.body.email;
        const fullName = request.body.fullName;
        const devices = request.body.devices;
        const role = request.body.role;

        await mongoose.connect('mongodb://localhost:27017/iotdb');
        await UserModel.updateOne(
            { "email": email },
            { $set: { "fullName": fullName, "devices": devices, "role": role } }
        );
        response.send("user doc is updated successfully")
    } catch(error){
        response.status(500).send("Something went wrong")
    } finally{
        await mongoose.disconnect();  
    }

});

app.delete("/deleteUser", async (request, response) => {
    try {
        const email = request.body.email;

        await mongoose.connect('mongodb://localhost:27017/iotdb');
        await UserModel.deleteOne({ "email": email });
        response.status(200).send("User doc is deleted successfully")
    } catch(error){
        response.status(500).send("Something went wrong")
    } finally{
        await mongoose.disconnect();
    }

});

app.post("/insertDevice", async (request, response) => {
  try {
      const name = request.body.name;
      const location = request.body.location;
      const topic = request.body.topic

      await mongoose.connect('mongodb://localhost:27017/iotdb');

      await DeviceModel.insertOne(
          { "name": name, "location": location, "topic": topic } 
      );
      response.status(201).send({ "success": true, "message": "Device added successful" })
  } catch(error){
      response.status(500).send({ "success": false, "message": "Internal server error" })
  } finally{
      await mongoose.disconnect();  
  }

});

app.get("/findAllDevices", async (request, response) => {
  try {

    await mongoose.connect('mongodb://localhost:27017/iotdb');

    const result = await DeviceModel.find({}).lean();

    response.status(200).send(result)
  } catch(error){
    response.status(500).send("Something went wrong")
  } finally{
    await mongoose.disconnect();
  }

})

app.delete("/deleteDevice", async (request, response) => {
  try {
      const deviceId = request.body.deviceId;

      await mongoose.connect('mongodb://localhost:27017/iotdb');
      await DeviceModel.deleteOne({ "_id": deviceId });
      response.status(200).send("Device doc is deleted successfully")
  } catch(error){
      response.status(500).send("Something went wrong")
  } finally{
      await mongoose.disconnect();
  }
});

app.put("/updateDevice", async (request, response) => {
  try {
      const deviceId = request.body.deviceId;
      const name = request.body.name;
      const location = request.body.location;
      const topic = request.body.topic;

      await mongoose.connect('mongodb://localhost:27017/iotdb');
      await DeviceModel.updateOne(
          { "_id": deviceId },
          { $set: { "name": name, "location": location, "topic": topic } }
      );
      response.send("device doc is updated successfully")
  } catch(error){
      response.status(500).send("Something went wrong")
  } finally{
      await mongoose.disconnect();  
  }
});


server.listen(3000, () => console.log(`Server running on port 3000`));


