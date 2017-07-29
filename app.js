var express = require('express');
var app = express();
var http = require("http").Server(app);
var io = require("socket.io")(http);
var bodyParser = require('body-parser');

var PORT = process.env.PORT || 8080;
const MINERS = ["miner001.js", "miner002.js"];
app.use(bodyParser.urlencoded({
    extended: true
}));
app.use(bodyParser.json({
    type: '*/*'
}));
app.use(express.static("static"));

/* Routes */
app.use('/', function (req, res) {
    res.sendFile(__dirname + "/static/index.html");
});
// socket.io
io.on("connection", function (client) {
    console.log("A client connect. ClientId: " + client.id);
});
http.listen(PORT, function () {
    console.log('Server is running on port: ' + PORT);
});
module.exports = app;