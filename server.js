var express = require('express'),
	app = express(),
	server = require('http').createServer(app),
	jade = require('jade'),
	io = require('socket.io')(server),
	fs = require('fs'),
	url = require('url');

app.set('views', __dirname + '/public/views');
app.set('view engine', 'jade');
app.use(express.static(__dirname + '/public'));

app.get('/', function (req, res) {
	res.render('index.jade');
});

app.get('/about', function (req, res) {
	res.render('about.jade');
});

app.get('/stats', function (req, res) {
	res.render('stats.jade');
});

io.on('connection', function (socket) {

	// Address whence they came
	var address = socket.handshake.address.address;

	// Path of inquiry
	var referer = socket.handshake.headers.referer;

	// Current domain
	var hostname = url.parse(referer).hostname;

	// Host directory
	var hostLogDir = 'logs/' + hostname;

	// IP directory, probably gets overwritten on a pageview
	var ipLogDir = hostLogDir + '/' + address;

	// Path parsing for page parameter; if falsey, string is empty and user must be at root (index)
	var path = url.parse(referer).path.replace(/\//g,'') || 'index';

	// Our path related file name
	var filename = path + '.json';

	// Where we will be storing mouse movements
	var mouseLog = [];

	// Handy function to spit out time strings
	function timeStamp() {
		return new Date().getTime();
	}

	// Check if the hostname directory exists, would not mind moving this somewhere

	io.emit('pageview', {'connections': Object.keys(io.sockets.connected).length - 1});

	// When the server receives a generic pageview event shoot it to the stats page
	socket.on('message', function (msg) {
		io.emit('pageview', {
			'connections': Object.keys(io.sockets.connected).length - 1,
			'url': referer,
			'ip': msg.ip || address,
			'time': new Date()
		});

		if (msg.ip) {
			ipLogDir = hostLogDir + '/' + msg.ip;
		}

		if (!fs.existsSync(hostLogDir)) {
			fs.mkdir(hostLogDir);
			console.log('Host dir made.');
		}
	});

	// When the server receives a request to update a pages aggregate data
	socket.on('aggregatepage', function (msg, callback) {

		// Update host directory with value fed from input
		var host = msg.host;
		hostLogDir = 'logs/' + host;

		// If aggregate pages folder does not exist, make it
		if (!fs.existsSync(hostLogDir + '/' + 'pages')) {
			fs.mkdir(hostLogDir + '/' + 'pages');
			console.log('Host pages dir made.');
		}

		// Read each directory for a file listing
		fs.readdir(hostLogDir + '/', function (err, array) {
			if (err) console.log('Directory not found.');

			// Get the pages directory out of there
			array.splice(array.indexOf('pages'), 1);

			// Number of directories we have to go through
			var remaining = array.length;

			// Number of bytes written will get tallied for no good reason
			var totalBytes = 0;

			// Where we will temporarily store all data relevant to the page aggregate requested
			var aggregateArr = [];

			// Read each file listing and access the files
			array.forEach(function (dir) {

				//Read each file relevant to page requested
				fs.readFile(hostLogDir + '/' + dir + '/' + msg.page + '.json', 'utf8', function (err, data) {
					if (err) console.log('Data not found. Perhaps no one has browsed to it?');
					if (data) {
						var parsed = JSON.parse(data);

						// Pop out each array inside the IP specific file and push to aggregate array
						parsed.forEach(function (array) {
							aggregateArr.push(array);
						});

						totalBytes += data.length;
						remaining -= 1;

						if (remaining == 0) {
							// Convert it all to valid JSON
							var jsonLog = JSON.stringify(aggregateArr);

							// Write aggregate data to generic page.json
							fs.writeFile(hostLogDir + '/pages/' + msg.page + '.json', jsonLog, function (err) {
								if (err) console.log('I can\'t write this file...');
							});

							console.log("Done reading the files. Wrote " + totalBytes + ' bytes to ' + hostLogDir + '/pages/' + msg.page + '.json.');
						}
					}
				});
			});
		});
	});

	// When the server receives a request for a pages aggregate data
	socket.on('pagerequest', function (msg, callback) {
		var path = url.parse(msg.page).path.replace(/\//g,'') || 'index';

		// Update host directory with value fed from input
		var host = msg.host;
		hostLogDir = 'logs/' + host;

		fs.readFile(hostLogDir + '/pages/' + path + '.json', 'utf8', function (err, data) {
			if (err) console.log('Data not found.');
			else callback(data);
		});
	});

	// When the server receives a request for page data regarding a specific ip
	socket.on('pagebyiprequest', function (msg, callback) {
		hostLogDir = 'logs/' + (url.parse(msg.page).hostname || hostname);
		var path = url.parse(msg.page).path.replace(/\//g,'') || 'index';

		fs.readFile(hostLogDir + '/' + msg.ip + '/' + path + '.json', 'utf8', function (err, data) {
			if (err) console.log('Data not found.');
			else callback(data);
		});
	});

	// When the server receives a mousepoll event, push it to our temp mouseLog array
	socket.on('mousepoll', function (msg) {
		mouseLog.push({
			x: msg.x,
			y: msg.y,
			time: timeStamp(),
			click: msg.click,
			type: msg.type,
			w: msg.w,
			h: msg.h
		});
	});

	// When a user disconnects (leaves page, closes window) we will then log their mouse movements like the FBI
	socket.on('disconnect', function (msg) {

		io.emit('pageview', {'connections': Object.keys(io.sockets.connected).length - 1});

		var clicked = false;

		// Check if the user clicked anything, if not we will not store the data
		mouseLog.forEach(function (obj) {
			if (obj.click) clicked = true;
		});

		// If mouseLog actually has any data we will store it, otherwise scrap the idea
		if (mouseLog.toString() && clicked) {

			// If IP specific folder does not exist, make it
			if (!fs.existsSync(ipLogDir)) {
				fs.mkdir(ipLogDir);
				console.log('IP dir made.');
			}

			// We will check if the file already exists in this IPs folder
			fs.readFile(ipLogDir + '/' + filename, 'utf8', function (err, data) {
				var history;

				// If we get an error, chances are the file does not exist. Empty array then!
				if (err || !data) history = [];
				else history = JSON.parse(data);

				// Push our new data to the array
				history.push(mouseLog);

				// Convert it all to valid JSON
				var jsonLog = JSON.stringify(history);

				// Write it to the corresponding path.json
				fs.writeFile(ipLogDir + '/' + filename, jsonLog, 'utf8', function (err) {
					if (err) throw err;
					console.log('Created or updated: ' + ipLogDir + '/' + filename);
				});
			});
		}

	});

});

// Local
server.listen(5455);

// Live
// server.listen(80);