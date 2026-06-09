require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

//  node-fetch import
const fetch = (...args) =>
  import("node-fetch").then(({ default: fetch }) => fetch(...args));

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
const connectUserCollection = client
  .db("finalportfolio")
  .collection("connectusers");
// ====== CONNECTED USERS ROUTE ======
app.get("/connectusers", async (req, res) => {
  try {
    const connectedUsers = await connectUserCollection
      .aggregate([
        {
          $group: {
            _id: "$email",
            name: { $first: "$name" },
            email: { $first: "$email" },
            messages: {
              $push: {
                message: "$message",
                createdAt: "$createdAt",
              },
            },
            messageCount: { $sum: 1 },
          },
        },
        { $sort: { messageCount: -1 } },
      ])
      .toArray();

    res.send({ success: true, connectedUsers });
  } catch (error) {
    console.error("Error fetching connected users:", error);
    res
      .status(500)
      .send({ success: false, message: "Failed to fetch connected users" });
  }
});

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
      return res
        .status(400)
        .send({ success: false, message: "All fields are required" });
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
              <a href="https://www.linkedin.com/in/web-developer-mdyasin/" style="margin: 0 8px; text-decoration: none; color: #0a66c2;">LinkedIn</a> |
              <a href="https://github.com/mdyasin0" style="margin: 0 8px; text-decoration: none; color: #333;">GitHub</a> |
              <a href="https://x.com/MDYasin567726" style="margin: 0 8px; text-decoration: none; color: #1da1f2;">Twitter</a>
            </div>

            <p style="font-size: 14px; color: gray; text-align: center;">Best regards,<br><strong>Yasin</strong><br>Frontend Developer</p>
          </div>
        </div>
      `,
    };

    await transporter.sendMail(userMail);

    res.send({
      success: true,
      message: "Message sent & confirmation email delivered",
      result,
    });
  } catch (error) {
    console.error(" Error handling contact:", error);
    res.status(500).send({ success: false, message: "Failed to send message" });
  }
});

// ====== USERS COLLECTION ======
const userCollection = client.db("finalportfolio").collection("users");

// user data save
app.post("/users", async (req, res) => {
  try {
    const { name, email } = req.body;

    if (!name || !email) {
      return res.status(400).send({ message: "Name and email are required" });
    }

    // check user exists কিনা
    const existingUser = await userCollection.findOne({ email });

    if (existingUser) {
      return res.send({
        success: true,
        message: "User already exists",
        user: existingUser,
      });
    }

    // new user create
    const newUser = {
      name,
      email,
      role: "user",
      createdAt: new Date(),
    };

    const result = await userCollection.insertOne(newUser);

    res.send({
      success: true,
      message: "User created successfully",
      user: newUser,
    });
  } catch (error) {
    console.error("User create error:", error);
    res.status(500).send({
      success: false,
      message: "Failed to create user",
    });
  }
});
// login user data get 
app.get("/users", async (req, res) => {
  try {
    const { email } = req.query;

    if (!email) {
      return res.status(400).send({ message: "Email is required" });
    }

    const user = await userCollection.findOne({ email });

    if (!user) {
      return res.status(404).send({ message: "User not found" });
    }

    res.send({
      success: true,
      user,
    });
  } catch (error) {
    console.error("Get user error:", error);
    res.status(500).send({
      success: false,
      message: "Failed to get user",
    });
  }
});

// ====== PROJECTS COLLECTION ======
const projectCollection = client.db("finalportfolio").collection("projects");

app.put("/projects/:id/add/:field", async (req, res) => {
  try {
    const { id, field } = req.params;
    const { newItem } = req.body;

    if (!newItem)
      return res.status(400).send({ message: "New item is required" });

    const allowedFields = [
      "frontendTech",
      "backendTech",
      "features",
      "challenges",
    ];
    if (!allowedFields.includes(field))
      return res.status(400).send({ message: "Invalid field" });

    const result = await projectCollection.updateOne(
      { _id: new ObjectId(id) },
      { $push: { [field]: newItem } },
    );

    if (result.modifiedCount > 0)
      res.send({ success: true, message: `New item added to ${field}` });
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
    const project = await projectCollection.findOne({
      _id: new ObjectId(req.params.id),
    });
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
      { $set: updatedFields },
    );

    if (result.modifiedCount > 0)
      res.send({ success: true, message: "Project updated successfully" });
    else
      res
        .status(404)
        .send({ success: false, message: "No matching project found" });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .send({ success: false, message: "Failed to update project" });
  }
});

app.delete("/projects/:id", async (req, res) => {
  try {
    const result = await projectCollection.deleteOne({
      _id: new ObjectId(req.params.id),
    });
    if (result.deletedCount > 0)
      res.send({ success: true, message: "Project deleted successfully" });
    else res.status(404).send({ success: false, message: "Project not found" });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .send({ success: false, message: "Failed to delete project" });
  }
});

// topprojects collection

const topprojectCollection = client.db("finalportfolio").collection("topprojects");


app.get("/topprojects", async (req, res) => {
  try {
    console.log("API HIT");

    console.log("collection:", topprojectCollection);

    const projects = await topprojectCollection.find().toArray();

    res.send(projects);
  } catch (error) {
    console.error("TOP PROJECT ERROR:", error); 
    res.status(500).send({ message: error.message });
  }
});





app.post("/topprojects", async (req, res) => {
  try {
    const project = req.body;
    const result = await topprojectCollection.insertOne(project);
    res.send({ success: true, message: "Project added successfully", result });
  } catch (error) {
    console.error(error);
    res.status(500).send({ success: false, message: "Failed to add project" });
  }
});



app.delete("/topproject/:id", async (req, res) => {
  try {
    const result = await topprojectCollection.deleteOne({
      _id: new ObjectId(req.params.id),
    });
    if (result.deletedCount > 0)
      res.send({ success: true, message: "Project deleted successfully" });
    else res.status(404).send({ success: false, message: "Project not found" });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .send({ success: false, message: "Failed to delete project" });
  }
});



app.get("/topproject/:id", async (req, res) => {
  try {
    const project = await topprojectCollection.findOne({
      _id: new ObjectId(req.params.id),
    });
    if (!project) return res.status(404).send({ message: "Project not found" });
    res.send(project);
  } catch (error) {
    console.error(error);
    res.status(500).send({ message: "Failed to fetch project" });
  }
});


app.put("/topprojects/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const updatedFields = req.body;
    if (updatedFields._id) delete updatedFields._id;

    const result = await topprojectCollection.updateOne(
      { _id: new ObjectId(id) },
      { $set: updatedFields },
    );

    if (result.modifiedCount > 0)
      res.send({ success: true, message: "Project updated successfully" });
    else
      res
        .status(404)
        .send({ success: false, message: "No matching project found" });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .send({ success: false, message: "Failed to update project" });
  }
});



app.put("/topprojects/:id/add/:field", async (req, res) => {
  try {
    const { id, field } = req.params;
    const { newItem } = req.body;

    if (!newItem)
      return res.status(400).send({ message: "New item is required" });

    const allowedFields = [
      "frontendTech",
      "backendTech",
      "features",
      "challenges",
    ];
    if (!allowedFields.includes(field))
      return res.status(400).send({ message: "Invalid field" });

    const result = await topprojectCollection.updateOne(
      { _id: new ObjectId(id) },
      { $push: { [field]: newItem } },
    );

    if (result.modifiedCount > 0)
      res.send({ success: true, message: `New item added to ${field}` });
    else res.status(404).send({ success: false, message: "Project not found" });
  } catch (error) {
    console.error("Error adding item:", error);
    res.status(500).send({ success: false, message: "Failed to add item" });
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
    if (!link)
      return res.status(400).send({ message: "Resume link is required" });

    const result = await resumeCollection.updateOne(
      {},
      { $set: { link } },
      { upsert: true },
    );
    res.send({
      success: true,
      message: "Resume link updated successfully",
      result,
    });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .send({ success: false, message: "Failed to update resume" });
  }
});

// ====== COLORS COLLECTION ======
app.get("/colors", async (req, res) => {
  try {
    const colors = await client
      .db("finalportfolio")
      .collection("color")
      .find()
      .toArray();
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
    if (!newColor)
      return res.status(400).send({ message: "New color value is required" });

    const datacollection = client.db("finalportfolio").collection("color");
    const fieldPath = `${theme}.${key}`;

    const result = await datacollection.updateOne(
      { _id: new ObjectId(id) },
      { $set: { [fieldPath]: newColor } },
    );

    if (result.modifiedCount > 0)
      res.send({
        success: true,
        message: `${theme}.${key} updated successfully`,
      });
    else
      res
        .status(404)
        .send({ success: false, message: "No matching document found" });
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
