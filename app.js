

var env
if (!process.env.VCAP_SERVICES) {
  console.log('running local')
  env = require('./env.json');
}
else {
  console.log('running on cloud')
  env = JSON.parse(process.env.VCAP_SERVICES)
}

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
    deliverMessages(username)
  })

  socket.on('sendMessage', function (message) {
    if (users[message.recipient]) {
      logMessage('Sending Message', message)
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
  healmeDB.find({ selector: { username: username }}, function (er, result) {
    if (er) {
      console.log(er);
      return
    }

    console.log('Found %d messages for %s', result.docs.length, username);
    for (var i = 0; i < result.docs.length; i++) {
      var doc = result.docs[i]
      var message = doc.message
      logMessage('Sending Message', message)
      io.to(users[message.recipient]).emit('messageReceived', message)
      healmeDB.destroy(doc._id, doc._rev, function (err, body) {
        if (err) {
          console.log(err);
          return;
        }

      });

    }
  });
}

function saveMessage(username, message) {
  healmeDB.insert({ username: username, message: message, date: message.date }, function (err, body, header) {
    if (err) {
      return console.log('[message.insert] ', err.message);
    }
    logMessage('You have inserted the message.', message, body);
  });

}

function logMessage(state, message, body) {
  console.log(state)
  if (body) {
    console.log('body: ' + body);
  }
  console.log('  sender: ' + message.sender);
  console.log('  recipient: ' + message.recipient);
  console.log('  message: ' + message.message);
}