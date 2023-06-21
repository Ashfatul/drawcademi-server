require("dotenv").config();
const express = require("express");
const cors = require("cors");
const app = express();
const port = process.env.PORT || 5000;
const stripe = require("stripe")(`${process.env.STRIPE_SECRET_KEY}`);

app.use(cors());
app.use(express.json());

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

const uri = `mongodb+srv://${process.env.DB_USERNAME}:${process.env.DB_PASSWORD}@drawcademi.oil09m9.mongodb.net/?retryWrites=true&w=majority`;

const client = new MongoClient(uri, {
   serverApi: {
      version: ServerApiVersion.v1,
      strict: true,
      deprecationErrors: true,
   },
});

async function run() {
   const school = client.db("DrawCademiDB");
   const users = school.collection("users");
   const reviews = school.collection("reviews");
   const classes = school.collection("classes");
   const studentItems = school.collection("studentItems");
   const payment = school.collection("payment");
   try {
      app.get("/", (req, res) => {
         res.send(`Server is running`);
      });

      app.post("/payment-intent", async (req, res) => {
         const amount = req.body.amount;
         const pay = parseInt(amount) * 100;
         const paymentIntent = await stripe.paymentIntents.create({
            amount: pay,
            currency: "usd",
            payment_method_types: ["card"],
         });
         res.send({
            clientSecret: paymentIntent.client_secret,
         });
      });

      app.get("/users", async (req, res) => {
         const data = await users.find().toArray();
         res.send(data);
      });
      app.get("/popular-classes", async (req, res) => {
         const query = { status: "approved" };
         const sort = { enrolled_student: -1 };
         const data = await classes.find(query).limit(6).sort(sort).toArray();
         res.send(data);
      });
      app.get("/instructors/", async (req, res) => {
         const query = { role: "instructor" };
         const dataLimit = parseInt(req?.query?.limit) || 0;
         const data = await users.find(query).limit(dataLimit).toArray();
         res.send(data);
      });
      app.get("/student-classes/:id", async (req, res) => {
         const authID = req.params.id;
         const query = { authID };
         const data = await studentItems.find(query).toArray();
         res.send(data);
      });
      app.get("/student-classes/selected/:id", async (req, res) => {
         const authID = req.params.id;
         const status = "selected";
         const query = { authID, status };

         const data = await studentItems.find(query).toArray();
         res.send(data);
      });
      app.get("/student-classes/enrolled/:id", async (req, res) => {
         const authID = req.params.id;
         const status = "paid";
         const query = { authID, status };
         const data = await studentItems.find(query).toArray();
         res.send(data);
      });
      app.patch("/student-classes/enrolled/:id", async (req, res) => {
         const id = req.params.id;
         const data = req.body;
         const { transactionID, status, createdOn, paidAmount } = data;
         const query = { _id: new ObjectId(id) };
         const options = { upsert: true };
         const result = await studentItems.updateOne(
            query,
            { $set: { transactionID, status, createdOn, paidAmount } },
            options
         );
         res.send(result);
      });
      app.delete("/student-classes/delete/:id", async (req, res) => {
         const id = req.params.id;
         const query = { _id: new ObjectId(id) };
         const data = await studentItems.deleteOne(query);
         res.send(data);
      });
      app.get("/classes", async (req, res) => {
         const query = { status: "approved" };
         const data = await classes.find(query).toArray();
         res.send(data);
      });
      app.get("/class/:id", async (req, res) => {
         const id = req.params.id;
         const query = { _id: new ObjectId(id) };
         const result = await classes.findOne(query);
         res.send(result);
      });
      app.get("/payment-history/:id", async (req, res) => {
         const authID = req.params.id;
         const query = { authID };
         const data = await payment
            .find(query)
            .sort({ createdOn: -1 })
            .toArray();
         res.send(data);
      });
      app.get("/payment-of/:id", async (req, res) => {
         const id = req.params.id;
         const query = { _id: new ObjectId(id) };
         const data = await studentItems.findOne(query);
         res.send(data);
      });

      app.post("/add-user", async (req, res) => {
         const data = req.body;
         const result = await users.insertOne(data);
         res.send(result);
      });
      app.post("/student-items/select/:id", async (req, res) => {
         const authID = req.params.id;
         const classItem = req.body.item;
         const add = {
            authID,
            classItem,
            status: "selected",
         };
         const result = await studentItems.insertOne(add);
         res.send(result);
      });
      app.get("/reviews", async (req, res) => {
         const data = await reviews.find().toArray();
         res.send(data);
      });
      app.get("/user-role/:id", async (req, res) => {
         const id = req.params.id;
         const query = { authID: id };
         const data = await users.findOne(query);
         res.send(data?.role);
      });
      app.get("/my-classes/:id", async (req, res) => {
         const id = req.params.id;
         const query = { authID: id };
         const data = await classes.find(query).toArray();
         res.send(data);
      });
      app.get("/classes-of/:id", async (req, res) => {
         const id = req.params.id;
         const query = { authID: id, status: "approved" };
         const data = await classes.find(query).toArray();
         res.send(data);
      });

      app.get("/user/:id", async (req, res) => {
         const id = req.params.id;
         const query = { authID: id };
         const findUser = await users.findOne(query);
         res.send(findUser);
      });
      app.get("/all-classes", async (req, res) => {
         const allClasses = await classes.find().toArray();
         res.send(allClasses);
      });

      app.post("/add-class", async (req, res) => {
         const data = req.body;
         const result = classes.insertOne(data);
         res.send(result);
      });

      app.post("/payment", async (req, res) => {
         const paymentHistory = req.body.paymentHistory;
         const result = await payment.insertOne(paymentHistory);
         res.send(result);
      });

      app.put("/update-user-role/:id", async (req, res) => {
         const id = req.params.id;
         const role = req.body;
         const query = { _id: new ObjectId(id) };
         const options = { upsert: true };
         const result = await users.updateOne(query, { $set: role }, options);
         res.send(result);
      });

      app.patch("/updateSeats/:id", async (req, res) => {
         const id = req.params.id;
         const query = { _id: new ObjectId(id) };
         const existing = await classes.findOne(query);
         const data = {
            availableSeats: existing.availableSeats - 1,
            enrolled_student: existing.enrolled_student + 1,
         };
         const options = { upsert: true };
         const result = await classes.updateOne(query, { $set: data }, options);
         res.send(result);
      });

      app.put("/approve-class/:id", async (req, res) => {
         const id = req.params.id;
         const query = { _id: new ObjectId(id) };
         const data = { status: "approved" };
         const options = { upsert: false };
         const result = await classes.updateOne(query, { $set: data }, options);
         res.send(result);
      });

      app.put("/deny-class/:id", async (req, res) => {
         const id = req.params.id;
         const query = { _id: new ObjectId(id) };
         const data = { status: "denied" };
         const options = { upsert: false };
         const result = await classes.updateOne(query, { $set: data }, options);
         res.send(result);
      });

      app.put("/feedback/:id", async (req, res) => {
         const id = req.params.id;
         const query = { _id: new ObjectId(id) };
         const feedback = req.body.feedback;
         const options = { upsert: false };
         const result = await classes.updateOne(
            query,
            { $set: { feedback } },
            options
         );
         res.send(result);
      });
      app.patch("/update-profile/:id", async (req, res) => {
         const id = req.params.id;
         const query = { _id: new ObjectId(id) };
         const data = req.body;
         const options = { upsert: true };
         const result = await users.updateOne(query, { $set: data }, options);
         res.send(result);
      });
      app.patch("/update-class/:id", async (req, res) => {
         const id = req.params.id;
         const query = { _id: new ObjectId(id) };
         const data = req.body;
         data.status = "pending";
         const options = { upsert: true };
         const result = await classes.updateOne(query, { $set: data }, options);
         res.send(result);
      });
   } catch (e) {
      console.log(e);
   }
}
run().catch(console.dir);

app.listen(port);
