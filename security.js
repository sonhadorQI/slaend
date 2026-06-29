// security.js
const express = require("express");
const helmet = require("helmet");
const rateLimit = require("express-slow-down");
const mongoSanitize = require("express-mongo-sanitize");
const xss = require("xss-clean");

module.exports = function security(app) {


  app.set("trust proxy", true);


  app.use(express.json({ limit: "1mb" }));


  app.use(helmet({
    crossOriginResourcePolicy: false
  }));


  app.use(mongoSanitize());

  // 🧽 Anti XSS
  app.use(xss());


  app.use(rateLimit({
    windowMs: 60 * 1000,
    delayAfter: 80,      
    delayMs: () => 400,  
    maxDelayMs: 5000   
  }));

};
