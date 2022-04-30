const express = require('express');
const app = express();
const cors = require('cors')
const bodyParser = require('body-parser')
const ObjectId = require('mongodb').ObjectId;
const port = process.env.PORT||7777;
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

async function run() {
  try {
    await client.connect();
    const database = client.db(`${process.env.DB_NAME}`);
    const productCollection = database.collection("products");
    const orderCollection = database.collection("orders");
    // get data
    app.get('/products', async (req, res) => {
      // console.log(req.query);
      const page = req.query.page;
      const size = parseInt(req.query.numberOfProPerPage);
      const cursor = productCollection.find({});
      let products;
      const count = await cursor.count();
      if (page) {
        products = await cursor.skip(page*size).limit(size).toArray();
      }
      else{
        products = await cursor.toArray();
      }
      // const products = await cursor.limit(10).toArray();
  
      // const count = await cursor.countDocuments();
      res.send({count,products});
      // res.send(products);
    });

    app.get('/products/:id', async (req, res) => {
        const id = req.params.id;
        const query = {_id:ObjectId(id)};
        const findProduct = await productCollection.findOne(query);
        console.log("this is id ",id);
        res.send(findProduct);
    });
    // post data
    app.post('/products', async (req, res) => {
      const product = req.body;
      console.log("hitting the post", req.body);
      const result = await productCollection.insertOne(product);
      console.log(`A document was inserted with the _id: ${result.insertedId}`);
      res.json(result);
    });
    // put data or update data
    app.put('/products/:id', async (req, res)=>{
      const id = req.params.id;
      const updateProduct = req.body;
      const filter = {_id:ObjectId(id)};
      const options = {upsert:true};
      const updateProductDetails = {
        $set: {
          name: updateProduct.name,
          price:updateProduct.price,
          imageUrl:updateProduct.imageUrl,
          category:updateProduct.category,
          description:updateProduct.description
        },
      };
      const update = await productCollection.updateOne(filter, updateProductDetails, options);
      console.log("put hitted ",req.body);
      res.json(update);
      res.send(id);
    })
    // delete data
    app.delete('/products/:id', async (req, res) => {
      const id = req.params.id;
      const query = {_id:ObjectId(id)};
      const result = await productCollection.deleteOne(query);
      console.log("Deleting id ",result);
      res.json(result);
    })
    // use post to get data by keys
    app.post('/products/_id', async (req, res) =>{
        console.log(req.body);
        // const keys = req.body;
        const id = req.body;
        // let newId;
        // let arrayOfId = [];
        // id.forEach(i=>{
        //   newId = ObjectId(i);
        //   arrayOfId.push(newId);
        // });
        // console.log(arrayOfId);
        // const query = {_id: {$in:ObjectId(id)}};
        const query = {key: {$in:id}};
        console.log(query);
        const productsByKey = await productCollection.find(query).toArray();
        console.log(productsByKey);
        // // res.send(productsByKey);
        res.json(productsByKey);
    })
    // orders collection
    app.post('/orders', async (req, res) => {
        const orders = req.body;
        const insertOrders = await orderCollection.insertOne(orders);
        console.log(orders);
        res.json(insertOrders);
    })
  } finally {
    // await client.close();
  }
}
run().catch(console.err);

app.get('/',(req, res)=>{
  res.send("Mega project server running successfully");
});

app.listen(port, () => console.log(`Sever running on port ${port}`));