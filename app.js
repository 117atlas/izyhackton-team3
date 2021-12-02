var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var cors = require('cors');

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');
var variablesRouter = require('./routes/variables');
var launcherRouter = require('./routes/launcher');

var testsRouter = require('./routes/tests');

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

var corsOptions = {
  "origin": "*",
  "methods": "GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS",
  "preflightContinue": false,
  "optionsSuccessStatus": 204
};
app.use(cors(corsOptions));
app.options('*', cors());
app.use(logger('combined'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/izyhackton/', indexRouter);
app.use('/izyhackton/users', usersRouter);
app.use('/izyhackton/variables', variablesRouter);
app.use('/izyhackton/launcher', launcherRouter);
app.use('/izyhackton/tests', testsRouter);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

//let socket = require('./modules/binance/socket')();
//console.log(socket);

module.exports = app;
