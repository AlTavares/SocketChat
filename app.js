
//prod
// var env = JSON.parse(process.env.VCAP_SERVICES)
//dev

var env = require('./env.json');

var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
/*
var redis = require('redis').createClient;
var redisAdapter = require('socket.io-redis');



var rediscloud = env.rediscloud[0]
var redisHost = rediscloud.credentials.hostname
var redisPass = rediscloud.credentials.password
var redisPort = rediscloud.credentials.port

var pub = redis(redisPort, redisHost, {auth_pass:redisPass});
var sub = redis(redisPort, redisHost, {detect_buffers: true, auth_pass:redisPass} );
 

io.adapter(redisAdapter({ pubClient: pub, subClient: sub }));

*/

app.use("/public", express.static(__dirname + '/public'));

app.get('/', function (req, res) {
  res.sendFile(__dirname + '/public/index.html');
});

var port = (process.env.VCAP_APP_PORT || 3000);
http.listen(port);
console.log("mobile backend app is listening at " + port);

// Load the Cloudant library.
var Cloudant = require('cloudant');
var cloudantCred = env.cloudantNoSQLDB[0].credentials

// Initialize the library with my account.
var cloudant = Cloudant({ hostname: cloudantCred.host, account: cloudantCred.username, password: cloudantCred.password });

cloudant.db.list(function (err, allDbs) {
  console.log('All my databases: %s', allDbs.join(', '))
});

var healmeDB = cloudant.db.use('healme')



//Socket stuff

var users = {}

io.on('connection', function (socket) {
  console.log('a user connected -', Date())

  socket.on('register', function (username) {
    socket.username = username
    users[username] = socket.id
    console.log(users)
  })

  socket.on('sendMessage', function (message) {
    if (users[message.recipient]) {
      io.to(users[message.recipient]).emit('messageReceived', message)
      return
    }
    saveMessage(message.recipient, message)
  })

  socket.on('messageDelivered', function (id, sender) {
    io.to(users[sender]).emit('messageDelivered', id, sender)
  })

  socket.on('disconnect', function () {
    console.log('user disconnected -', Date())
    delete users[socket.username]
    console.log(users)
  })

})

function deliverMessages(username) {
  healmeDB.find({ selector: { username: username } }, function (er, result) {
    if (er) {
      throw er;
    }

    console.log('Found %d messages for %s', result.docs.length, username);
    for (var i = 0; i < result.docs.length; i++) {
      console.log('  message: %s', result.docs[i].message);
    }
  });
}

function saveMessage(username, message) {
  healmeDB.insert({ username: username, message: message }, function (err, body, header) {
    if (err) {
      return console.log('[message.insert] ', err.message);
    }
    console.log('You have inserted the message.');
    console.log(body);
  });

}
