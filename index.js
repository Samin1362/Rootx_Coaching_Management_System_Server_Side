import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { MongoClient, ServerApiVersion } from "mongodb";

dotenv.config();

const app = express();
const port = 3001;

// middleware
app.use(express.json());
app.use(cors());

// encode credentials
const user = encodeURIComponent(process.env.DB_USER);
const pass = encodeURIComponent(process.env.DB_PASS);

const uri = `mongodb+srv://${user}:${pass}@cluster0.l2cobj0.mongodb.net/rootxCMS?appName=Cluster0`;

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

    const db = client.db("roots_coaching_management_users");
    const usersCollection = db.collection("users");
    const studentsCollection = db.collection("students");

    // users api's
    app.post("/users", async (req, res) => {
      try {
        const user = req.body;

        // basic validation
        if (!user.name || !user.email || !user.password || !user.role) {
          return res.status(400).send({ message: "Required fields missing" });
        }

        const newUser = {
          name: user.name,
          email: user.email,
          phone: user.phone || "",
          password: user.password, 

          image: user.image || "",

          role: user.role, // admin | manager
          status: "active",

          lastLogin: null,

          createdAt: new Date(),
          updatedAt: new Date(),
        };

        const result = await usersCollection.insertOne(newUser);

        res.status(201).send({
          message: "User created successfully",
          insertedId: result.insertedId,
        });
      } catch (error) {
        res.status(500).send({ message: "Failed to create user" });
      }
    });

    // students api's


    await client.db("admin").command({ ping: 1 });
    console.log("✅ Connected to MongoDB");
  } catch (err) {
    console.error(err);
  }
}

run();

app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.listen(port, () => {
  console.log(`🚀 Server running on port ${port}`);
});
