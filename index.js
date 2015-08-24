/// <reference path="typings/node/node.d.ts"/>
// var express = require('express');
// var app = express();

// app.set('port', (process.env.PORT || 5000));



var express = require('express'),
  app = express(),
  server = require('http').createServer(app),
  io = require('socket.io').listen(server),
  port = process.env.PORT || 3000

app.use(express.static(__dirname + '/public'))

server.listen(port, function () {
  console.log('Node app is running on port', port)
})


app.get('/', function (request, response) {
  response.send('Hello World!')
})


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
    io.to(users[message.recipient]).emit('messageReceived', message)
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

