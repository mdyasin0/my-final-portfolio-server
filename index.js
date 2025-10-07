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
    // await client.connect();
    await client.db("admin").command({ ping: 1 });
    console.log(" Connected to MongoDB");
  } finally {
    // keep connection alive
  }
}
run().catch(console.dir);

// ====== CONNECT USERS COLLECTION ======
const connectUserCollection = client.db("finalportfolio").collection("connectusers");

// ====== NODEMAILER SETUP ======
const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// ====== CONTACT FORM API ======
app.post("/contact", async (req, res) => {
  try {
    const { name, email, message } = req.body;

    if (!name || !email || !message) {
      return res.status(400).send({ success: false, message: "All fields are required" });
    }

    const contactData = {
      name,
      email,
      message,
      createdAt: new Date(),
    };

    //  Step 1: Save to MongoDB
    const result = await connectUserCollection.insertOne(contactData);

    //  Step 2: Beautiful Admin Mail Template
    const adminMail = {
      from: process.env.EMAIL_USER,
      to: process.env.EMAIL_USER,
      subject: `📩 New Message from ${name}`,
      html: `
        <div style="font-family: 'Segoe UI', sans-serif; background: linear-gradient(135deg, #1e3a8a, #9333ea); padding: 30px;">
          <div style="max-width: 600px; background: white; margin: auto; border-radius: 15px; padding: 25px; box-shadow: 0 4px 12px rgba(0,0,0,0.15);">
            <h2 style="color: #1e3a8a; text-align: center;">📨 New Contact Message</h2>
            <p style="font-size: 16px; color: #333;">Hey <strong>Yasin</strong>, someone just contacted you through your portfolio site!</p>
            <table style="width:100%; border-collapse: collapse; margin-top: 15px;">
              <tr>
                <td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Name:</strong></td>
                <td style="padding: 8px; border-bottom: 1px solid #eee;">${name}</td>
              </tr>
              <tr>
                <td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Email:</strong></td>
                <td style="padding: 8px; border-bottom: 1px solid #eee;">${email}</td>
              </tr>
              <tr>
                <td style="padding: 8px; vertical-align: top;"><strong>Message:</strong></td>
                <td style="padding: 8px;">${message}</td>
              </tr>
            </table>
            <p style="font-size: 14px; color: gray; text-align: right; margin-top: 20px;">
              Sent at: ${new Date().toLocaleString()}
            </p>
            <div style="text-align: center; margin-top: 20px;">
              <a href="mailto:${email}" style="background: #1e3a8a; color: white; padding: 10px 20px; text-decoration: none; border-radius: 8px;">Reply to ${name}</a>
            </div>
          </div>
        </div>
      `,
    };

    await transporter.sendMail(adminMail);

    // Step 3: Beautiful User Confirmation Mail Template
    const userMail = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: ` Thanks ${name}, I've received your message!`,
      html: `
        <div style="font-family: 'Segoe UI', sans-serif; background: linear-gradient(135deg, #9333ea, #2563eb); padding: 30px;">
          <div style="max-width: 600px; background: white; margin: auto; border-radius: 15px; padding: 25px; box-shadow: 0 4px 12px rgba(0,0,0,0.15);">
            <h2 style="color: #2563eb; text-align: center;">Hey ${name} 👋</h2>
            <p style="font-size: 16px; color: #333;">Thanks for reaching out! I’ve received your message and will get back to you soon.</p>
            
            <div style="background: #f3f4f6; padding: 15px; border-radius: 10px; margin-top: 15px;">
              <p style="margin: 0; font-size: 15px; color: #555;"><strong>Your message:</strong></p>
              <p style="margin-top: 8px; color: #444;">"${message}"</p>
            </div>

            <p style="margin-top: 20px; color: #555;">In the meantime, feel free to connect with me on:</p>
            <div style="text-align: center; margin: 15px 0;">
              <a href="https://www.linkedin.com" style="margin: 0 8px; text-decoration: none; color: #0a66c2;">LinkedIn</a> |
              <a href="https://github.com" style="margin: 0 8px; text-decoration: none; color: #333;">GitHub</a> |
              <a href="https://twitter.com" style="margin: 0 8px; text-decoration: none; color: #1da1f2;">Twitter</a>
            </div>

            <p style="font-size: 14px; color: gray; text-align: center;">Best regards,<br><strong>Yasin</strong><br>Frontend Developer</p>
          </div>
        </div>
      `,
    };

    await transporter.sendMail(userMail);

    res.send({ success: true, message: "Message sent & confirmation email delivered", result });
  } catch (error) {
    console.error(" Error handling contact:", error);
    res.status(500).send({ success: false, message: "Failed to send message" });
  }
});


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


app.get("/users/:email", async (req, res) => {
  try {
    const email = req.params.email;
    const user = await userCollection.findOne({ email });

    if (!user) {
      return res.status(404).send({ message: "User not found" });
    }

    res.send({ role: user.role || "user" });
  } catch (error) {
    console.error(error);
    res.status(500).send({ message: "Server error" });
  }
});


app.post("/users", async (req, res) => {
  try {
    const { name, email, loginType, country, location, deviceType, deviceName, lastLogin, role } = req.body;

    if (!email) return res.status(400).send({ message: "Email is required" });

    const existingUser = await userCollection.findOne({ email });
    const updateData = { name, loginType, country, location, deviceType, deviceName, lastLogin, role: role || "user" };

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
