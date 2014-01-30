var io = require('socket.io').listen(4242);
io.set('log level',1);

var grid = {};

io.sockets.on('connection', function(socket) {

	for (var position in grid) {
		socket.emit('gridUpdate', grid[position]);
	}

	var cell = new Cell(socket.id);
	var position = Math.random()+"x"+Math.random();
	grid[position] = cell;

	socket.on('moveCell', function (data){
		delete grid[data.oldPos];
		var cell = new Cell(socket.id);
		var position = data.xPos+"x"+data.yPos;
		grid[position] = cell;
		scoket.broadcast.emir('deleteCell', grid[data.old])
		socket.broadcast.emit('gridUpdate', grid[position]);
	});

	socket.on('disconnect', function (){
	for (var position in grid) {
		if (grid[position].playedId == socket.id) delete grid[position];
	}
		io.sockets.emit('deleteCell', socket.id);
	});
});