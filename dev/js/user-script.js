(function($) {

	var socket = io.connect();

	socket.on('connect', function() {

		//need to send over IP eventually
		socket.send({'url': String(window.location)});

		var mousePos,
			prevMousePos = {
				x: 0,
				y: 0
			};

		// Get all the anchors and we can log clicks
		var anchors = document.getElementsByTagName("a");

		for (var i = 0; i < anchors.length ; i++) {
			anchors[i].addEventListener("click", logMouseClick, false);
		}

		function logMouseClick (event) {
			//Hold on, I gotta log your click
			event.preventDefault();

			mousePos = {
				x: event.pageX,
				y: event.pageY,
				click: true,
				// type: $(event.target).data('type'),
				w: $(document).width(),
				h: $(document).height()
			};

			socket.emit('mousepoll', mousePos);

			// Okay now I will let you go
			if (event.target.href) {
				setTimeout(function () {
					window.location = event.target.href;
				}, 1000);
			}
		}

		// We will log mouse movements
		window.onmousemove = logMouseMove;

		// I want to log x/y mouse coordinates every n pixels
		var logXEvery = window.innerWidth / 20,
			logYEvery = window.innerHeight / 20;

		// Capture mouse movements and if coordinate checks pass, emit to server for logging
		function logMouseMove (event) {
			mousePos = {
				x: event.pageX,
				y: event.pageY,
				w: window.innerWidth,
				h: window.innerHeight
			};
			if (chkAxes(mousePos)) socket.emit('mousepoll', mousePos);
		}

		// Do either x/y values pass the coordinate check?
		function chkAxes (mousePos) {
			if (chkCoord(mousePos, 'x') || chkCoord(mousePos, 'y')) {
				prevMousePos = mousePos;
				return true;
			} else {
				return false;
			}
		}

		// Is the given coordinate sufficiently different from the previously logged coordinate?
		function chkCoord (mousePos, axis) {
			var mp = mousePos,
				pmp = prevMousePos,
				inc = (axis === 'x') ? logXEvery : logYEvery;

			if (mp[axis] < (pmp[axis] - inc) || mp[axis] > (pmp[axis] + inc))
				return true;
			else
				return false;
		}

	});

})(jQuery);