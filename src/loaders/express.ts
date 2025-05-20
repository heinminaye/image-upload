import express from "express";
import cors from "cors";
import routes from "../api";
import config from "../config";
import bodyParser from "body-parser";
export default ({ app }: { app: express.Application }) => {
  /**
   * Health Check endpoints
   * @TODO Explain why they are here
   */ 
  app.get("/", function (req, res) {
    res.json({"message" : "Server is running!"})
  });

  // Enable Cross Origin Resource Sharing to all origins by default
  app.use(cors());

  //Header override
  app.use(require("method-override")());

  // Transforms the raw string of req.body into json
  app.use(express.json());

  app.use(bodyParser.json());
  app.use(
    bodyParser.urlencoded({
      extended: true,
    })
  );
    
  // Load API routes
  app.use(config.api.prefix, routes());

  /// catch 404 and forward to error handler
  app.use((req, res, next) => {
    const err: any = new Error("Not Found");
    err["status"] = 404;
    next(err);
  });
};
