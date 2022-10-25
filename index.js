'use strict'

const http = require('http');
const express = require('express')
const bodyParser = require('body-parser')
const csv = require('csv-parser');
const fs = require('fs')

const hostname = '0.0.0.0';
const port = 5000;

// Create a new instance of express
const app = express()

// Tell express to use the body-parser middleware and to not parse extended bodies
app.use(bodyParser.urlencoded({ extended: false }))

var dt = new Date();

var eventfilename = "scanned.csv";
var sourcefilename = "registered.csv";
var reprintfilename = "reprinted.csv"
var sourceData = {};

fs.createReadStream(sourcefilename)
    .pipe(csv())
    .on('data', (row) => {
        //console.log(row);
        sourceData[row.Mumin_ID] = row;
    })
    .on('end', (data) => {
        //console.log(data);
        //console.log(sourceData);
    });



app.get('/', function(req, res) {
	res.writeHead(200, { 'content-type': 'text/html' })
	fs.createReadStream('index.html').pipe(res)
})

app.get('/scan', function (req, res) {
	res.writeHead(200, { 'content-type': 'text/html' })
	fs.createReadStream('scan.html').pipe(res)
})

app.get('/reprint', function (req, res) {
	res.writeHead(200, { 'content-type': 'text/html' })
    fs.createReadStream('reprint.html').pipe(res)
})

app.get('/*', function(req, res) {
	fs.readFile(__dirname + req.url, function (err,data) {
    if (err) {
      res.writeHead(404);
      res.end(JSON.stringify(err));
      return;
    }
    res.writeHead(200);
    res.end(data);
  });
})

// Route that receives a POST request
app.post('/addITS', function (req, res) {

    const body = JSON.parse(JSON.stringify(req.body));
    var responseToSend = { "message": "", "type": "" };
    var sentStatus = 200;

    console.log(sourceData[body.itsid]);
	
	var cnt = 0;
	fs.createReadStream(eventfilename)
		.pipe(csv())
		.on('data', (row) => {
			console.log(row.Scanned);
			if (row.Scanned == body.itsid) {
				cnt += 1;
			}
		})
		.on('end', (data) => {
			if (cnt > 0) {
				sentStatus = 403;
				console.log('Already scanned');
				responseToSend = { "message": "Already scanned", "mumindata": JSON.stringify(sourceData[body.itsid]), "type": "error" }

				res.set('Content-Type', 'application/json');
				res.statusCode = sentStatus;
				res.send(responseToSend)
			} else {
				fs.appendFile(eventfilename, "\r\n" + body.itsid, function (err) {
					if (err) {
						sentStatus = 400;
						console.log('Scanning error');
						responseToSend = { "message": "Scanning error", "mumindata": "Unavailable", "type": "error" }
					} else {
						if (!sourceData[body.itsid]) {
							sentStatus = 412;
							console.log('Scanned unregistered attendee');
							responseToSend = { "message": "ITS ID not registered but saved", "type": "error" }
						} else {
							console.log('Scanned registered attendee');
							responseToSend = { "message": "Scanned successfully", "mumindata": JSON.stringify(sourceData[body.itsid]), "type": "success" }
						}

						
					}
					
					res.set('Content-Type', 'application/json');
					res.statusCode = sentStatus;
					res.send(responseToSend)
				});
			}
		});
});


// Route that receives a POST request
app.post('/getCount', function (req, res) {
	var cnt = 0;
	fs.createReadStream(eventfilename)
		.pipe(csv())
        .on('data', (row) => {
            //console.log(row);
			cnt += 1;
		})
		.on('end', (data) => {
			//console.log(data);
			console.log('CSV file successfully processed');
			res.set('Content-Type', 'application/json')
			res.send({ "scanned": cnt });
		});
});

// Tell our app to listen on port declared above
app.listen(port, function (err) {
  if (err) {
    throw err
  }

  console.log('Server started on port ' + port);
});
