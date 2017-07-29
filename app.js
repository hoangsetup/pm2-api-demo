var express = require('express');
var app = express();
var http = require("http").Server(app);
var io = require("socket.io")(http);
var bodyParser = require('body-parser');
var pm2 = require("pm2");

var PORT = process.env.PORT || 8080;
const MINERS = ["miner001.js", "miner002.js"];
function getProcessSetting(name) {
    var alias = name.replace(".js", "");
    return {
        script: __dirname + "/miners/" + name,
        name: name,
        log_date_format: "YYYY-MM-DD HH:mm Z",
        out_file: __dirname + "/miners/" + alias + ".stdout.log",
        error_file: __dirname + "/miners/" + alias + ".stderr.log",
        exec_mode: "fork",
        autorestart: false
    };
}
app.use(bodyParser.urlencoded({
    extended: true
}));
app.use(bodyParser.json({
    type: '*/*'
}));
app.use(express.static("static"));

/* Routes */
app.get("/miners", function (req, res) {
    var promiseLst = [];
    MINERS.map(function (t) {
        return getProcessSetting(t);
    }).forEach(function (t) {
        promiseLst.push(new Promise(function (resolve, reject) {
            pm2.describe(t.name, function (err, processDescription) {
                if (err) {
                    reject(err);
                } else {
                    var des = processDescription[0];
                    var process = des? des : {
                        name: t.name,
                        pid: "N/A",
                        pm_id: "N/A",
                        monit: {
                            memory: "N/A",
                            cpu: "N/A"
                        },
                        pm2_env: {
                            status: "unregistry"
                        }
                    };
                    resolve(process);
                }
            });
        }));
    });
    Promise.all(promiseLst)
        .then(function (result) {
            console.log(result);
            res.json(result);
        })
        .catch(function (err) {
            console.log(err);
            res.json(err);
        });
});
app.put("/miners/:name", function (req, res) {
    var processName = req.params["name"];
    var action = req.query["action"];
    if (["start", "stop", "restart"].indexOf(action) >= 0 && MINERS.indexOf(processName) >= 0) {
        var process = processName;
        if (action === "start") {
            process = getProcessSetting(processName);
        }
        pm2.connect(function(err) {
            if (err) {
                console.error(err);
                res.status(500).json(err);
                return;
            }
            pm2[action](process, function(err, apps) {
                // pm2.disconnect();   // Disconnects from PM2
                if (err) {
                    res.status(500).json(err.message);
                    return;
                }
                res.json({success: true});
            });
        });
        return;
    }
    res.status(404).json({message: "action or process not found!"});
});

app.use('/', function (req, res) {
    res.sendFile(__dirname + "/static/index.html");
});
// socket.io
io.on("connection", function (client) {
    console.log("A client connect. ClientId: " + client.id);
});
http.listen(PORT, function () {
    console.log('Server is running on port: ' + PORT);
    pm2.connect(function(err) {
        if (err) {
            console.error(err);
            process.exit(0);
            return;
        }
        pm2.launchBus(function (err, bus) {
            bus.off('log:out');
            bus.on('log:out', function (data) {
                var processName = data.process.name;
                if (MINERS.indexOf(processName) >= 0) {
                    io.emit(`${processName}:log`, {log: data.data})
                }
            });
        });
    });
});
module.exports = app;