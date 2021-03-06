var express = require('express');
var util = require('./lib/utility');
var partials = require('express-partials');
var bodyParser = require('body-parser');

// var cookieParser = require('cookie-parser');
// var session = require('express-session');


var db = require('./app/config');
var Users = require('./app/collections/users');
var User = require('./app/models/user');
var Links = require('./app/collections/links');
var Link = require('./app/models/link');
var Click = require('./app/models/click');

var app = express();

app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');
app.use(partials());
// Parse JSON (uniform resource locators)
app.use(bodyParser.json());
// Parse forms (signup/login)
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(__dirname + '/public'));

// app.use(cookieParser('shhhh, very secret'));
// app.use(session());
// app.use(session({ secret: 'session secret', cookie: { maxAge: 60000 }}));
// https://codeforgeek.com/2014/09/manage-session-using-node-js-express-4/

app.use(function (req, res, next) {
  console.log(req.url);
  if (req.url === '/' || req.url === '/signup' || req.url === '/login') {
    next();
  } else if (!req.session) {
    res.render('login');
  } else {
    next();
  }
});

app.get('/', 
function(req, res) {
  res.render('index');
});

app.get('/signup', 
function(req, res) {
  res.render('signup');
});

app.get('/login', 
function(req, res) {
  res.render('login');
});

app.get('/create', 
function(req, res) {
  res.render('index');
});

app.get('/links', 
function(req, res) {
  Links.reset().fetch().then(function(links) {
    res.send(200, links.models);
  });
});

app.post('/links', 
function(req, res) {
  var uri = req.body.url;

  if (!util.isValidUrl(uri)) {
    console.log('Not a valid url: ', uri);
    return res.send(404);
  }

  new Link({ url: uri }).fetch().then(function(found) {
    if (found) {
      res.send(200, found.attributes);
    } else {
      util.getUrlTitle(uri, function(err, title) {
        if (err) {
          console.log('Error reading URL heading: ', err);
          return res.send(404);
        }

        Links.create({
          url: uri,
          title: title,
          base_url: req.headers.origin
        })
        .then(function(newLink) {
          res.send(200, newLink);
        });
      });
    }
  });
});

/************************************************************/
// Write your authentication routes here
/************************************************************/

app.post('/signup',
function (req, res) {
  console.log('got here');
  var username = req.body.username;
  var password = req.body.password;

  Users.create({
    username: username,
    password: password
  }).then(function (newUser) {
    console.log('NEW USER??');
    console.log(newUser);
    console.log('User was created!');
    res.redirect('/');
  });

  // new User ({username: username}).fetch().then(function(user){
  //   if (!user) {
  //     Users.create({
  //       username: username,
  //       password: password
  //     }).then(function (newUser) {
  //       // console.log(newUser);
  //       console.log('User was created!');
  //       res.redirect('/');
  //     });
  //   } else {
  //     console.log('User already exists!');
  //   }
  // });
});

app.post('/login',
function (req, res) {
  var username = req.body.username;
  var password = req.body.password;
  // console.log('Account credentials: ' + username + ' ' + password);

  new User({username: username}).fetch().then(function(user){
    if (user) {
      var salt = user.attributes.salt;
      if(util.hashSaltMatch(password, salt, user.attributes.password)) {
        console.log('User logged in!');
        res.redirect('/');
      } else {
        // Wrong password
        console.log('User entered incorrect password!');
        res.redirect('/login');
      }
    } else {
      // User does not exist
      console.log('User does not exist!');
      res.redirect('/login');
    }
  });
});

/************************************************************/
// Handle the wildcard route last - if all other routes fail
// assume the route is a short code and try and handle it here.
// If the short-code doesn't exist, send the user to '/'
/************************************************************/

app.get('/*', function(req, res) {
  new Link({ code: req.params[0] }).fetch().then(function(link) {
    if (!link) {
      res.redirect('/');
    } else {
      var click = new Click({
        link_id: link.get('id')
      });

      click.save().then(function() {
        link.set('visits', link.get('visits')+1);
        link.save().then(function() {
          return res.redirect(link.get('url'));
        });
      });
    }
  });
});

console.log('Shortly is listening on 4568');
app.listen(4568);
