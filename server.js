import express from "express";
import apiRouter from "./src/apis/index.js"; 

const app = express();
const PORT = process.env.PORT || 3009;

app.use(express.json());

app.use("/v1", apiRouter);

app.listen(PORT, () => {
  console.log(`Server running on port ${3009}`);
});
