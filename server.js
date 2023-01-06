const express = require('express');
require('dotenv').config();
const app = express();
const cors = require('cors')
const bodyParser = require('body-parser')
const ObjectId = require('mongodb').ObjectId;
const admin = require("firebase-admin");
// const serviceAccount = require('./mega-project-firebase-adminsdk.json');
const stripe = require('stripe')(process.env.STRIPE_SECRET);

app.use(express.json());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

app.use(cors())

const port = process.env.PORT || 7777;

// admin.initializeApp({
//   credential: admin.credential.cert(serviceAccount)
//// });

const firebaseApp = global.firebaseApp??
admin.initializeApp({
  credential: admin.credential.cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  }),
});

global.firebaseApp = firebaseApp;


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

async function verifyToken(req, res, next) {
  if (req.headers?.authorization?.startsWith('Bearer ')) {
    const token = req.headers.authorization.split(' ')[1];

    try {
      const decodedUser = await admin.auth().verifyIdToken(token);
      req.decodedEmail = decodedUser.email;
    }
    catch {

    }
  }
  next();
}


async function run() {
  try {
    await client.connect();
    const database = client.db(`${process.env.DB_NAME}`);
    const productCollection = database.collection("products");
    const orderCollection = database.collection("orders");
    const userCollection = database.collection("users");
    // get data
    app.get('/products', async (req, res) => {
      const category = req.query.category;
      console.log("category id ",category);
      const page = req.query.page;
      const size = parseInt(req.query.numberOfProPerPage);
      let categoryLenght;
      let cursor;
      if (category === undefined) {
         categoryLenght = '';
      }
      else{
        categoryLenght = category.length;
      }
      if(categoryLenght === '') {
          cursor = productCollection.find({});
      }
      else{
          // const query = {category: {$regex: /category.*/}};
          const query = {category: category}
          cursor = productCollection.find(query);
          console.log('inside else ',category.length)
          const findLength = cursor.length;
          // if ((await cursor.toArray()).length <= 0) {
          //     cursor = productCollection.find({});
          // }
      }
      console.log(cursor);
      let products;
      const count = await cursor.count();
      if (page) {
        products = await cursor.skip(page * size).limit(size).toArray();
      }
      else {
        products = await cursor.toArray();
      }
      // const products = await cursor.limit(10).toArray();

      // const count = await cursor.countDocuments();
      res.send({ count, products });
      // res.send(products);
    });

    // get orders
    app.get('/orders', verifyToken, async (req, res) => {
      const uid = req.query.uid;
      const date = new Date(req.query.date).toDateString();
      const query = { uid: uid, ExpectedDeliveryDate: date };
      console.log("query is", query);
      const cursor = orderCollection.find(query);
      const orders = await cursor.toArray();
      res.json(orders);
    });

    app.get('/products/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const findProduct = await productCollection.findOne(query);
      console.log("this is id ", id);
      res.send(findProduct);
    });
    // post data
    app.post('/products', async (req, res) => {
      const product = req.body;
      console.log(req.body);
      const result = await productCollection.insertOne(product);
      console.log(`A document was inserted with the _id: ${result.insertedId}`);
      res.json(result);
    });
    // put data or update data
    app.put('/products/:id', async (req, res) => {
      const id = req.params.id;
      const updateProduct = req.body;
      const filter = { _id: ObjectId(id) };
      const options = { upsert: true };
      const updateProductDetails = {
        $set: {
          name: updateProduct.name,
          price: updateProduct.price,
          imageUrl: updateProduct.imageUrl,
          category: updateProduct.category,
          description: updateProduct.description
        },
      };
      const update = await productCollection.updateOne(filter, updateProductDetails, options);
      res.json(update);
      res.send(id);
    })
    // delete data
    app.delete('/products/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const result = await productCollection.deleteOne(query);
      console.log("Deleting id ", result);
      res.json(result);
    })
    // use post to get data by keys
    app.post('/products/_id', async (req, res) => {
      id = req.body;
      let newId;
      let arrayOfId = [];
      id.forEach(i => {
        newId = ObjectId(i);
        arrayOfId.push(newId);
      });
      console.log("array of id's", arrayOfId);
      const query = { _id: { $in: arrayOfId } };
      // const query = { key: { $in: id } };
      console.log("selected products id's query", query);
      const productsById = await productCollection.find(query).toArray();
      // // res.send(productsById);
      res.json(productsById);
    })
    // orders collection
    app.post('/orders', async (req, res) => {
      const orders = req.body;
      orders.createAt = new Date().toDateString();
      const insertOrders = await orderCollection.insertOne(orders);
      console.log(orders);
      res.json(insertOrders);
    })
    // get data by email
    app.get('/orders', async (req, res) => {
      let query = {};
      const email = req.query.email;
      console.log(email);
      if (email) {
        query = { authEmail: email };
      }
      const cursor = orderCollection.find(query);
      const allOrders = await cursor.toArray();
      res.json(allOrders);
    })

    app.post('/userDetails', async (req, res) => {
      const userDetails = req.body;
      const creationTime = new Date().toDateString();
      userDetails.createAt = creationTime;
      const insertUser = await userCollection.insertOne(userDetails);
      res.json(insertUser);
    })

    app.put('/userDetails', async (req, res) => {
      const userDetails = req.body;
      const filter = { uid: userDetails.uid };
      const options = { upsert: true };
      const creationTime = new Date().toDateString();
      userDetails.createAt = creationTime;
      const updateUser = { $set: userDetails };
      const insertUser = await userCollection.updateOne(filter, updateUser, options);
      res.json(insertUser);

    })
    // make admin
    app.put('/users/admin', verifyToken, async (req, res) => {
      const adminDetails = req.body;
      const requester = req.decodedEmail;
      if (requester) {
        const requesterAccount = await userCollection.findOne({ email: requester });
        if (requesterAccount.role === 'admin') {
          const filter = { email: adminDetails.adminEmail };
          const updateUserRole = { $set: { role: 'admin' } };
          const insertAdmin = await userCollection.updateOne(filter, updateUserRole);
          res.json(insertAdmin);
        }
        else {
          res.status(403).json({ message: 'You do not have access to admin control' });
        }
      }
    })
    // check login user is admin?
    app.get('/users/:email', async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const findAdmin = await userCollection.findOne(query);
      let isAdmin = false;
      if (findAdmin?.role === 'admin') {
        isAdmin = true;
      }
      res.send({ admin: isAdmin });
    })
    // get data for payment
    app.get('/payment/:orderId', async (req, res) => {
      const id = req.params.orderId;
      const query = { _id: ObjectId(id) };
      const findForPayment = await orderCollection.findOne(query);
      res.send(findForPayment);
    })
    // use post to get data by auth email;
    // app.post('/ordersByEmail', async (req, res) => {
    //   const ordersByEmail = req.body;
    //   console.log(ordersByEmail);
    // })
    app.post('/create-payment-intent', async (req, res) => {
      const paymentInfo = req.body;
      const amount = paymentInfo.price * 100;
      console.log(amount);
      const paymentIntent = await stripe.paymentIntents.create({
        currency: 'usd',
        amount: amount,
        payment_method_types: ['card']
      });
      res.json({ clientSecret: paymentIntent.client_secret });
    })

    // update order payment status
    app.put('/orders/:orderId', async (req, res) => {
      const id = req.params.orderId;
      const payment = req.body.payment;
      const filter = { _id: ObjectId(id) };
      const updatePaymentStatus = { $set: { payment: payment } };
      const insertUpdate = await orderCollection.updateOne(filter, updatePaymentStatus);
      res.json(insertUpdate);
    })

    // post user comment
    app.put('/comments', async (req, res) => {
      const uid = req.body.userUid;
      const comment = req.body.comment;
      const filter = { uid: uid };
      const updateUserComment = { $set: { comment: comment } };
      const insertUpdate = await userCollection.updateOne(filter, updateUserComment);
      console.log(insertUpdate);
      res.json(insertUpdate);
    })

  } finally {
    // await client.close();
  }
}
run().catch(console.err);

app.get('/', (req, res) => {
  res.send("Mega project server running successfully");
});

app.listen(port, () => console.log(`Server running on port ${port}`));