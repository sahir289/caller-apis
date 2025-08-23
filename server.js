import express from "express";
import cors from "cors";
import apiRouter from "./src/apis/index.js"; 
import { startUserFetchCron } from "./src/apis/cron/cron.js";
import { errorHandler } from "./src/middlewares/errorHandler.js";
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
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

app.use("/v1", apiRouter);
app.use(errorHandler);
startUserFetchCron();
app.listen(PORT, () => {
  console.log(`Server running on port ${3009}`);
});
