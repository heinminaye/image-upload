import "reflect-metadata";
import express from "express";

const app = express();

require("./loaders").default({ expressApp: app });

const port = process.env.PORT || 3030;
var server = app
  .listen(3030, () => {
    console.log(`
    ------------------------------------------------
    ################################################
    Server listening on port: ${port} 
    ################################################`);
  })
  .on("error", (err) => {
    console.log(err);
  });

process.on("uncaughtException", (error, origin) => {
  console.log("----- Uncaught exception -----");
  console.log(error);
  console.log("----- Exception origin -----");
  console.log(origin);
});

process.on("unhandledRejection", (reason, promise) => {
  console.log("----- Unhandled Rejection at -----");
  console.log(promise);
  console.log("----- Reason -----");
  console.log(reason);
});

