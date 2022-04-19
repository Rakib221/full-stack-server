const express = require('express');
const app = express();
const cors = require('cors')
const bodyParser = require('body-parser')
const ObjectId = require('mongodb').ObjectId;
const port = 7777;
app.use(express.json());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

app.use(cors())

require('dotenv').config();

// const stars = [
//   { name: "Lionel Messi", id: 10, position: "CF,RWF,AMF,FALSE NINE STRIKER,SS,RMF" },
//   { name: "Cristiano Ronaldo", id: 7, position: "CF,RMF,LWF" },
//   { name: "Neymar Jr", id: 11, position: "AMF,LMF,LWF" }
// ];

// app.get('/', (req, res) => {
//   // res.send("hello everyone");
//   res.sendFile(__dirname + '/index.html');
// })

// app.get('/users', (req, res) => {
//   const searchName = req.query.search;
//   if (searchName) {
//     const searchResult = stars.filter(star => star.name.toLocaleLowerCase().includes(searchName));
//     res.send(searchResult);
//   }
//   else {
//     res.send(stars);
//   }
// })

// app.get('/users/:id', (req, res) => {
//   // console.log(req.params.id);
//   const id = req.params.id;
//   // const userId = stars[id];
//   console.log(id);
// })

// app.post('/users', (req, res) => {
//   console.log("Hitting the post ", req.body);
//   const newStar = req.body;
//   newStar.id = stars.length;
//   stars.push(newStar);
//   // sending data in json format because fetch parse json data.
//   res.send(newStar.json());
// })


const { MongoClient, ServerApiVersion } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.tmhor.mongodb.net/${process.env.DB_NAME}?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });

// client.connect(err => {
//   const productCollection = client.db(`${process.env.DB_NAME}`).collection("products");

//   app.get('/product',(req, res) => {
//     // productCollection.find({}).limit(4)
//       productCollection.find({}).toArray((err,documents)=>{
//         res.send(documents)
//       })
//   })

//   app.post("/addProduct", (req, res) => {
//     const product = req.body;
//     console.log(product);
//     productCollection.insertOne(product)
//       .then(res => {
//         console.log("Data added successfully");
//         res.send("Congratulations, Data added successfully");
//       })
//       .catch(err => {
//         console.log(err);
//       })
//   })
//   console.log('Database connected');
//   // client.close();
// });
async function run() {
  try {
    await client.connect();
    const database = client.db(`${process.env.DB_NAME}`);
    const productCollection = database.collection("products");
    // get data
    app.get('/products', async (req, res) => {
      const cursor = productCollection.find({});
      const products = await cursor.toArray();
      res.send(products);
    });
    // post data
    app.post('/products', async (req, res) => {
      const product = req.body;
      console.log("hitting the post", req.body);
      const result = await productCollection.insertOne(product);
      console.log(`A document was inserted with the _id: ${result.insertedId}`);
      res.json(result);
    });
    // delete data
    app.delete('/products/:id', async (req, res) => {
      const id = req.params.id;
      const query = {_id:ObjectId(id)};
      const result = await productCollection.deleteOne(query);
      console.log("Deleting id ",result);
      res.json(result);
    })
  } finally {
    // await client.close();
  }
}
run().catch(console.err);


app.listen(port, () => console.log(`Sever running on port ${port}`));