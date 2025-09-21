require('dotenv').config();
const express = require('express');
const cors = require('cors');
const app = express();
const port = process.env.PORT || 3000 ;
const { MongoClient, ServerApiVersion } = require('mongodb');
app.use(cors());
app.use(express.json());




const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.vbsgl0h.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();


    const datacollection = client.db('finalportfolio').collection('color')

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);


// all color  
app.get('/colors', async (req, res) => {
  try {
    const datacollection = client.db('finalportfolio').collection('color');
    const colors = await datacollection.find().toArray(); 
    res.send(colors);
  } catch (error) {
    console.error(error);
    res.status(500).send({ message: "Failed to fetch colors" });
  }
});

// update single color 

const { ObjectId } = require("mongodb");


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
      res.send({ success: true, message: `${theme}.${key} updated successfully` });
    } else {
      res.status(404).send({ success: false, message: "No matching document found or no change made" });
    }
  } catch (error) {
    console.error("Error updating color:", error);
    res.status(500).send({ success: false, message: "Failed to update color" });
  }
});




app.get('/' , (req , res)=>{
    res.send('final portfolio server');



    
});
app.listen(port , ()=>{
    console.log(`final portfolio server on port ${port}`)
})