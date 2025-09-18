const express = require('express');
const cors = require('cors');
const app = express();
const port = process.env.PORT || 3000 ;
app.use(cors());
app.use(express.json());







app.get('/' , (req , res)=>{
    res.send('final portfolio server');



    
});
app.listen(port , ()=>{
    console.log(`final portfolio server on port ${port}`)
})