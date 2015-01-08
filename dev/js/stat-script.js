$(document).ready(function() {

	// Connect to socket
	var socket = io.connect();

	// We want this to be available throughout
	var mousePts = [];

	// When I hear from the server about a pageview event
	socket.on('pageview', function (msg) {

		if (msg.url) {
			$('#pageviews').prepend('<tr><td>' + 
			'<a class="draw-canvas"' + 
			'data-page="' + msg.url + '" ' +
			'data-ip="' + msg.ip + '">' + msg.url + 
			'</td><td> ' + msg.ip + 
			'</td><td> ' + msg.time + 
			'</td></tr>');
		}

		// Update number of current connections being displayed
		$('#connections').text(msg.connections);

	});

	// When I click a link in the table, I wanna view stats for that IP!
	$('#pageviews').on('click', '.draw-canvas', function() {

		// Table link contains two data attributes received from the server
		var ip = $(this).data('ip'),
			page = $(this).data('page');

		// Ping the server to get the users directory and page.json
		socket.emit('pagebyiprequest', {ip: ip, page: page}, function (data) {
			mousePts = JSON.parse(data);
			draw(mousePts);
		});

		$('#current-graph').html('<b class="text-success">' + page + '</b> views from <b class="text-info">' + ip + '</b>');

	});

	// When I click a button in the pages section, I wanna view the page stats or aggregate them!
	$('#page-btns ul li a').on('click', function () {
		var host = $('#host').val(),
			page = $(this).data('page'),
			action = $(this).data('action');

		if (action === 'display') {
			// Send out the aggregate page request, and get the data back
			socket.emit('pagerequest', {host: host, page: page}, function (data) {
				mousePts = JSON.parse(data);
				draw(mousePts);
			});
			$('#current-graph').html('<b class="text-success">' + page + '</b> aggregate');
		} else {
			// Send out the request to aggregate the data
			socket.emit('aggregatepage', {host: host, page: page}, function (data) {
				$('#agg-success').text(data);
			});
		}
	});

	// Draw points and dots on the canvas
	function draw (data) {

		// Canvas element
		var canvas = document.getElementById('myCanvas');
	    var ctx = canvas.getContext('2d');

	    // Clear the canvas each time I want to draw again, set universal line width and joins
	    ctx.clearRect(0, 0, canvas.width, canvas.height);
		ctx.lineWidth = 1;
		ctx.lineJoin = 'round';

		// Previous x, y and timestamp values
		var prevX = 0;
		var prevY = 0;
		var prevTS = 0;

		// Red lines mean fast mouse movement, green lines mean slow (could also indicate separate session if timestamp difference is massive, but do we care?)
		var colorsArr = [
			'rgba(255,0,0,0.3)', // 0 - Red
			'rgba(255,51,0,0.3)',
			'rgba(255,102,0,0.3)',
			'rgba(255,153,0,0.3)',
			'rgba(255,204,0,0.3)',
			'rgba(255,255,0,0.3)', // 5 - Red/Green
			'rgba(204,255,0,0.3)',
			'rgba(153,255,0,0.3)',
			'rgba(102,255,0,0.3)',
			'rgba(51,255,0,0.3)',
			'rgba(0,255,0,0.3)' // 10 - Green
		];

		// For each array in our main array
	    data.forEach(function (array) {

	    	// For each object in our sub arrays
	    	array.forEach(function (obj) {

				// Canvas will not replicate browser window size; bring coordinates to within canvas size by finding vertical and horizontal ratios based on objects document width/height
				var wRatio = canvas.width/obj.w,
					hRatio = canvas.height/obj.h;

				// Multiplying ratio with coordinates to reduce alegbraically
				var x = obj.x * wRatio,
					y = obj.y * hRatio;

				// Reduce time difference from current timestamp and last one to a number 1-10
				var ts = obj.time,
					timeDiff = Math.floor((ts - prevTS)/10) - 1;

				// Time differences can be enormous between sessions or sparsely active sessions, just log those as slow mouse movements for now
				if (timeDiff > 10) timeDiff = 10;

				// Lines indicate mouse movements
				ctx.beginPath();
		        ctx.moveTo(x, y);
		        ctx.lineTo(prevX, prevY);
		        ctx.strokeStyle = colorsArr[timeDiff];
		        ctx.stroke();
		        ctx.closePath();

		        // Dots join lines, larger dots indicate clicks
		        var radius = (obj.click) ? 7 : 1;
				ctx.fillStyle = 'rgba(0,0,0,0.1)';
			    ctx.beginPath();
		        ctx.arc(x, y, radius, 0, Math.PI * 2, true);
		        ctx.fill();
		        ctx.closePath();

		        // Update previous values so we can compare next loop
		        prevX = x;
		        prevY = y;
		        prevTS = ts;

	    	});

		});
	}
});