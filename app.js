const createError = require('http-errors');
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const fs = require('fs');
const Request = require('./util/request');
const DataHandle = require('./util/dataHandle');
const config = require('./bin/config');
const axios = require('axios');
const jsonFile = require('jsonfile');

const app = express();
jsonFile.readFile('data/findMap.json')
  .then((res) => {
    global.findMap = res;
  }, (err) => {
    global.findMap = {};
    jsonFile.writeFile('data/findMap.json', {});
  });
// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

Object.keys(config.hostMap).forEach((k) => {
  axios({
    url: config.hostMap[k],
  }).then((res) => {
    console.log(`✅  ${k} 后台正常，地址：${config.hostMap[k]}`)
  }, (err) => {
    console.log(`❌  ${k} 后台异常，地址：${config.hostMap[k]}，请检查`)
  })
})


fs.readdirSync(path.join(__dirname, 'routes')).reverse().forEach(file => {
  const filename = file.replace(/(\.js|\.ts)$/, '');
  if (filename === 'index') {
    return;
  }
  app.use(`/${filename}`, (req, res, next) => {
    const router = express.Router();
    req.query = {
      ...req.query,
      ...req.body,
    };
    req.query.platform = req.query['_p'].toLowerCase();
    const RouterMap = require(`./routes/${filename}`);
    Object.keys(RouterMap).forEach((path) => {
      const func = (req, res, next) => RouterMap[path]({
        req,
        res,
        next,
        dataHandle: new DataHandle(req.query.platform),
        platform: req.query.platform,
        request: new Request({ req, res }).request,
      });
      router.post(path, func);
      router.get(path, func);
    });
    router(req, res, next);
  });
});

app.use('/', require('./routes/index'));

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

module.exports = app;
