import express from "express";
import cors from "cors";
import apiRouter from "./src/apis/index.js"; 

const app = express();
// app.use(cors());

const PORT = process.env.PORT || 3009;

const corsOptions = {
  origin: '*', 
  methods: ['GET', 'POST', 'PUT', 'DELETE'], 
  credentials: true,
};

app.use(cors(corsOptions));

app.use(express.json());

app.use("/v1", apiRouter);


app.listen(PORT, () => {
  console.log(`Server running on port ${3009}`);
});
