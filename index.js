require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

//  node-fetch import
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());


// MongoDB connection
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.vbsgl0h.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    await client.connect();
    await client.db("admin").command({ ping: 1 });
    console.log(" Connected to MongoDB");
  } finally {
    // keep connection alive
  }
}
run().catch(console.dir);

// ====== USERS COLLECTION ======
const userCollection = client.db("finalportfolio").collection("users");
app.post("/users/delete", async (req, res) => {
  try {
    const { ids } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).send({ success: false, message: "No user IDs provided" });
    }

    const objectIds = ids.map(id => new ObjectId(id));

    const result = await userCollection.deleteMany({ _id: { $in: objectIds } });

    if (result.deletedCount > 0) {
      res.send({ success: true, message: `${result.deletedCount} user(s) deleted successfully` });
    } else {
      res.status(404).send({ success: false, message: "No matching users found" });
    }
  } catch (error) {
    console.error(" Error deleting users:", error);
    res.status(500).send({ success: false, message: "Failed to delete users" });
  }
});

// GET route to fetch all users
app.get("/users", async (req, res) => {
  try {
    const users = await userCollection.find({}).toArray();
    res.send({ success: true, users });
  } catch (error) {
    console.error(" Error fetching users:", error);
    res.status(500).send({ success: false, message: "Failed to fetch users" });
  }
});

app.post("/users", async (req, res) => {
  try {
    const { name, email, loginType, country, location, deviceType, deviceName, lastLogin } = req.body;

    if (!email) return res.status(400).send({ message: "Email is required" });

    const existingUser = await userCollection.findOne({ email });
    const updateData = { name, loginType, country, location, deviceType, deviceName, lastLogin };

    if (existingUser) {
      const result = await userCollection.updateOne({ email }, { $set: updateData });
      res.send({ success: true, message: "User info updated", result });
    } else {
      const result = await userCollection.insertOne({
        email,
        ...updateData,
        createdAt: new Date().toISOString(),
      });
      res.send({ success: true, message: "User registered", result });
    }
  } catch (error) {
    console.error("Error saving user:", error);
    res.status(500).send({ success: false, message: "Failed to save user info" });
  }
});

// ====== LOCATION API ======
app.get("/api/location", async (req, res) => {
  try {
    const userIP = req.headers["x-forwarded-for"] || req.connection.remoteAddress;

    console.log("User IP:", userIP);

    const response = await fetch(`http://ip-api.com/json/${userIP}`);
    console.log("Location API status:", response.status);

    if (!response.ok) throw new Error("Location API failed");

    const locationData = await response.json();

    const result = {
      country_name: locationData.country || "Unknown",
      region: locationData.regionName || "",
      city: locationData.city || "",
      ip: locationData.query || "",
    };

    res.json(result);
  } catch (error) {
    console.error(" Error fetching location:", error);
    res.status(500).json({ error: "Failed to fetch location" });
  }
});


// ====== PROJECTS COLLECTION ======
const projectCollection = client.db("finalportfolio").collection("projects");

app.put("/projects/:id/add/:field", async (req, res) => {
  try {
    const { id, field } = req.params;
    const { newItem } = req.body;

    if (!newItem) return res.status(400).send({ message: "New item is required" });

    const allowedFields = ["frontendTech", "backendTech", "features", "challenges"];
    if (!allowedFields.includes(field)) return res.status(400).send({ message: "Invalid field" });

    const result = await projectCollection.updateOne(
      { _id: new ObjectId(id) },
      { $push: { [field]: newItem } }
    );

    if (result.modifiedCount > 0) res.send({ success: true, message: `New item added to ${field}` });
    else res.status(404).send({ success: false, message: "Project not found" });
  } catch (error) {
    console.error("Error adding item:", error);
    res.status(500).send({ success: false, message: "Failed to add item" });
  }
});

app.get("/projects", async (req, res) => {
  try {
    const projects = await projectCollection.find().toArray();
    res.send(projects);
  } catch (error) {
    console.error(error);
    res.status(500).send({ message: "Failed to fetch projects" });
  }
});

app.get("/projects/:id", async (req, res) => {
  try {
    const project = await projectCollection.findOne({ _id: new ObjectId(req.params.id) });
    if (!project) return res.status(404).send({ message: "Project not found" });
    res.send(project);
  } catch (error) {
    console.error(error);
    res.status(500).send({ message: "Failed to fetch project" });
  }
});

app.post("/projects", async (req, res) => {
  try {
    const project = req.body;
    const result = await projectCollection.insertOne(project);
    res.send({ success: true, message: "Project added successfully", result });
  } catch (error) {
    console.error(error);
    res.status(500).send({ success: false, message: "Failed to add project" });
  }
});

app.put("/projects/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const updatedFields = req.body;
    if (updatedFields._id) delete updatedFields._id;

    const result = await projectCollection.updateOne(
      { _id: new ObjectId(id) },
      { $set: updatedFields }
    );

    if (result.modifiedCount > 0) res.send({ success: true, message: "Project updated successfully" });
    else res.status(404).send({ success: false, message: "No matching project found" });
  } catch (error) {
    console.error(error);
    res.status(500).send({ success: false, message: "Failed to update project" });
  }
});

app.delete("/projects/:id", async (req, res) => {
  try {
    const result = await projectCollection.deleteOne({ _id: new ObjectId(req.params.id) });
    if (result.deletedCount > 0) res.send({ success: true, message: "Project deleted successfully" });
    else res.status(404).send({ success: false, message: "Project not found" });
  } catch (error) {
    console.error(error);
    res.status(500).send({ success: false, message: "Failed to delete project" });
  }
});

// ====== RESUME COLLECTION ======
const resumeCollection = client.db("finalportfolio").collection("resume");

app.get("/resume", async (req, res) => {
  try {
    const resume = await resumeCollection.findOne({});
    res.send(resume || { link: "" });
  } catch (error) {
    console.error(error);
    res.status(500).send({ message: "Failed to fetch resume link" });
  }
});

app.put("/resume", async (req, res) => {
  try {
    const { link } = req.body;
    if (!link) return res.status(400).send({ message: "Resume link is required" });

    const result = await resumeCollection.updateOne({}, { $set: { link } }, { upsert: true });
    res.send({ success: true, message: "Resume link updated successfully", result });
  } catch (error) {
    console.error(error);
    res.status(500).send({ success: false, message: "Failed to update resume" });
  }
});

// ====== COLORS COLLECTION ======
app.get("/colors", async (req, res) => {
  try {
    const colors = await client.db("finalportfolio").collection("color").find().toArray();
    res.send(colors);
  } catch (error) {
    console.error(error);
    res.status(500).send({ message: "Failed to fetch colors" });
  }
});

app.put("/colors/:id/:theme/:key", async (req, res) => {
  try {
    const { id, theme, key } = req.params;
    const { newColor } = req.body;
    if (!newColor) return res.status(400).send({ message: "New color value is required" });

    const datacollection = client.db("finalportfolio").collection("color");
    const fieldPath = `${theme}.${key}`;

    const result = await datacollection.updateOne({ _id: new ObjectId(id) }, { $set: { [fieldPath]: newColor } });

    if (result.modifiedCount > 0) res.send({ success: true, message: `${theme}.${key} updated successfully` });
    else res.status(404).send({ success: false, message: "No matching document found" });
  } catch (error) {
    console.error(error);
    res.status(500).send({ success: false, message: "Failed to update color" });
  }
});

app.get("/", (req, res) => {
  res.send(" Final Portfolio Server Running");
});

app.listen(port, () => {
  console.log(` Server running on port ${port}`);
});
