require("dotenv").config();
const express = require("express");
const cors = require("cors");
const app = express();
const port = process.env.PORT || 3000;
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

app.use(cors());
app.use(express.json());

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
    console.log("✅ Connected to MongoDB");
  } finally {
    // keep connection alive
  }
}
run().catch(console.dir);

// project collection
const projectCollection = client.db("finalportfolio").collection("projects");





// Add new item to array field
app.put("/projects/:id/add/:field", async (req, res) => {
  try {
    const { id, field } = req.params;
    const { newItem } = req.body;

    if (!newItem) {
      return res.status(400).send({ message: "New item is required" });
    }

    const allowedFields = ["frontendTech", "backendTech", "features", "challenges"];
    if (!allowedFields.includes(field)) {
      return res.status(400).send({ message: "Invalid field" });
    }

    const result = await projectCollection.updateOne(
      { _id: new ObjectId(id) },
      { $push: { [field]: newItem } }
    );

    if (result.modifiedCount > 0) {
      res.send({ success: true, message: `New item added to ${field}` });
    } else {
      res.status(404).send({ success: false, message: "Project not found" });
    }
  } catch (error) {
    console.error("Error adding item:", error);
    res.status(500).send({ success: false, message: "Failed to add item" });
  }
});




// Get all projects
app.get("/projects", async (req, res) => {
  try {
    const projects = await projectCollection.find().toArray();
    res.send(projects);
  } catch (error) {
    console.error(error);
    res.status(500).send({ message: "Failed to fetch projects" });
  }
});

// Get single project by id
app.get("/projects/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const project = await projectCollection.findOne({ _id: new ObjectId(id) });
    if (!project) {
      return res.status(404).send({ message: "Project not found" });
    }
    res.send(project);
  } catch (error) {
    console.error(error);
    res.status(500).send({ message: "Failed to fetch project" });
  }
});

// Add new project
app.post("/projects", async (req, res) => {
  try {
    const project = req.body;
    const result = await projectCollection.insertOne(project);
    res.send({
      success: true,
      message: "Project added successfully",
      result,
    });
  } catch (error) {
    console.error("Error adding project:", error);
    res.status(500).send({ success: false, message: "Failed to add project" });
  }
});

// ✅ Update project (only update given fields, not whole object replace)
app.put("/projects/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const updatedFields = req.body;

    if (updatedFields._id) {
      delete updatedFields._id; // prevent _id overwrite
    }

    const result = await projectCollection.updateOne(
      { _id: new ObjectId(id) },
      { $set: updatedFields } // শুধু যেটা আসবে সেটা update হবে
    );

    if (result.modifiedCount > 0) {
      res.send({ success: true, message: "Project updated successfully" });
    } else {
      res.status(404).send({
        success: false,
        message: "No matching project found or no changes made",
      });
    }
  } catch (error) {
    console.error("Error updating project:", error);
    res
      .status(500)
      .send({ success: false, message: "Failed to update project" });
  }
});

// Delete project
app.delete("/projects/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const result = await projectCollection.deleteOne({ _id: new ObjectId(id) });

    if (result.deletedCount > 0) {
      res.send({ success: true, message: "Project deleted successfully" });
    } else {
      res.status(404).send({ success: false, message: "Project not found" });
    }
  } catch (error) {
    console.error("Error deleting project:", error);
    res.status(500).send({ success: false, message: "Failed to delete project" });
  }
});

// resume collection
const resumeCollection = client.db("finalportfolio").collection("resume");

// Get current resume link
app.get("/resume", async (req, res) => {
  try {
    const resume = await resumeCollection.findOne({});
    res.send(resume || { link: "" });
  } catch (error) {
    console.error(error);
    res.status(500).send({ message: "Failed to fetch resume link" });
  }
});

// Update resume link
app.put("/resume", async (req, res) => {
  try {
    const { link } = req.body;
    if (!link) {
      return res.status(400).send({ message: "Resume link is required" });
    }

    const result = await resumeCollection.updateOne(
      {},
      { $set: { link } },
      { upsert: true }
    );

    res.send({
      success: true,
      message: "Resume link updated successfully",
      result,
    });
  } catch (error) {
    console.error("Error updating resume:", error);
    res.status(500).send({ success: false, message: "Failed to update resume" });
  }
});

// all colors
app.get("/colors", async (req, res) => {
  try {
    const datacollection = client.db("finalportfolio").collection("color");
    const colors = await datacollection.find().toArray();
    res.send(colors);
  } catch (error) {
    console.error(error);
    res.status(500).send({ message: "Failed to fetch colors" });
  }
});

// update single color
app.put("/colors/:id/:theme/:key", async (req, res) => {
  try {
    const { id, theme, key } = req.params;
    const { newColor } = req.body;

    if (!newColor) {
      return res.status(400).send({ message: "New color value is required" });
    }

    const datacollection = client.db("finalportfolio").collection("color");
    const fieldPath = `${theme}.${key}`;

    const result = await datacollection.updateOne(
      { _id: new ObjectId(id) },
      { $set: { [fieldPath]: newColor } }
    );

    if (result.modifiedCount > 0) {
      res.send({
        success: true,
        message: `${theme}.${key} updated successfully`,
      });
    } else {
      res.status(404).send({
        success: false,
        message: "No matching document found or no change made",
      });
    }
  } catch (error) {
    console.error("Error updating color:", error);
    res.status(500).send({ success: false, message: "Failed to update color" });
  }
});

app.get("/", (req, res) => {
  res.send("final portfolio server");
});

app.listen(port, () => {
  console.log(`🚀 final portfolio server running on port ${port}`);
});
