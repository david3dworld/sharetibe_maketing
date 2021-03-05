import getRawBody from 'raw-body'
import mongoose from 'mongoose';
import express from 'express';
import https from 'https'
import fs from 'fs'
import expressWinston from 'express-winston';
import winston from 'winston';
import cors from 'cors';
import fileUpload from 'express-fileupload';
import dotenv from 'dotenv';
import dotenvExpand from 'dotenv-expand';
import passport from 'passport';

import { reader } from './serializer.js';
import { router } from './api-routes.js';
import { initTransitions } from './transitionController.js';
import { initNotifications } from './notificationController.js';

const options = {
     key: fs.readFileSync("./ssl/key.pem"),
     cert: fs.readFileSync("./ssl/ffs_oldencars_com.crt")
};
var app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Setup passport
app.use(passport.initialize());

// Handle incomming transit-json
app.use(function (req, res, next) {
     if(req.headers['content-type'] === 'application/transit+json') {
          getRawBody(req, {
               length: req.headers['content-length'],
               limit: '1mb',
               encoding: true
          }, function (err, string) {
               if(err) return next(err)

               const r = reader();
               req.body = r.read(string);
               next();
          });
     }
     else
          next();
});

// Load environment
var myEnv = dotenv.config();
dotenvExpand(myEnv);

// Handle image uploads
app.use(fileUpload());

// Handle CORS
app.use(cors());

// Logging
/*
app.use(expressWinston.logger({
     transports: [
          new winston.transports.Console()
          //{ format: winston.format.combine(winston.format.colorize(), logFormat) })
     ],
     format: winston.format.combine(
          winston.format.colorize(),
          winston.format.json(),
          winston.format.printf(function(info) {
               return `${JSON.stringify(info, null, 4)}\n`;
          })
     )
}));
*/

// Connect to Mongoose and set connection variable
mongoose.connect(process.env.MONGODB_URI, { 
     useNewUrlParser: true, 
     useUnifiedTopology: true 
});
var db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function() {
     console.log("Db connected successfully");
     mongoose.set('useCreateIndex', true);
});

// Inititialise the transition/transcation flow
initTransitions();

// Inititialise the notification state machine
initNotifications();

// Use Api routes in the App
app.use('/v1', router)

// Catch 404 and forward to error handler
app.use(function (req, res, next) {
     res.status(404);
     console.log('%s %d %s', req.method, res.statusCode, req.url);
     res.json({
         error: 'Not found'
     });
     return;
 });
 
 // Error handlers
 app.use(function (err, req, res, next) {
     res.status(err.status || 500);
     console.log('%s %d %s', req.method, res.statusCode, err.message);
     res.json({
         error: err.message
     });
     return;
 });

// Launch app to listen to specified port (SSL or not?)
var port = process.env.PORT || 8080;

// Not needed when running behind Heroku SSL
//var server = https.createServer(options, app).listen(port, function () {
//     console.log("Running FFS on port " + port);
//});

var server = app.listen(port, function () {
     console.log("Running FFS on port " + port);
});






