var io = require('socket.io').listen(4242);
io.set('log level',1);

var config = require('./config.js');
var Cell = require('./cell.js');

var grid = {};

io.sockets.on('connection', function(socket) {

	for (var position in grid) {
		socket.emit('gridUpdate', grid[position]);
	}

	var nCellsX = config.CANVAS_WIDTH/config.CELL_SIZE;
	var nCellsY = config.CANVAS_HEIGHT/config.CELL_SIZE;
	var x = Math.random()*config.CANVAS_WIDTH;
	var y = Math.random()*config.CANVAS_HEIGHT;
	x = Math.floor(x)%nCellsX;
	y = Math.floor(y)%nCellsY;
	var position = x+"x"+y;
	var cell = new Cell(socket.id,x,y,position);
	grid[position] = cell;
	io.sockets.emit('gridUpdate', cell);

	socket.on('moveRight', function (pos) {
		if (grid[pos] !== undefined && grid[pos].player == socket.id){
			var oldCell = grid[pos];
			var newX = oldCell.x + 1;
			var position = newX+"x"+oldCell.y;
			if (grid[position] === undefined){
				var newcell = new Cell(socket.id,newX,oldCell.y,position,oldCell.color);
				delete grid[pos]; //delete old
				grid[position] = newcell;	//add new
				io.sockets.emit('deleteCell', pos);
				io.sockets.emit('gridUpdate', grid[position]);
			}
		}
	});

	socket.on('moveLeft', function (pos) {
		if (grid[pos] !== undefined && grid[pos].player == socket.id){
			var oldCell = grid[pos];
			var newX = oldCell.x - 1;
			var position = newX+"x"+oldCell.y;
			if (grid[position] === undefined){
			var newcell = new Cell(socket.id,newX,oldCell.y,position,oldCell.color);
				delete grid[pos]; //delete old
				grid[position] = newcell;	//add new
				io.sockets.emit('deleteCell', pos);
				io.sockets.emit('gridUpdate', grid[position]);
			}
		}
	});

	socket.on('moveUp', function (pos) {
		if (grid[pos] !== undefined && grid[pos].player == socket.id){
			var oldCell = grid[pos];
			var newY = oldCell.y - 1;
			var position = oldCell.x+"x"+newY;
			if (grid[position] === undefined){
			var newcell = new Cell(socket.id,oldCell.x,newY,position,oldCell.color);
				delete grid[pos]; //delete old
				grid[position] = newcell;	//add new
				io.sockets.emit('deleteCell', pos);
				io.sockets.emit('gridUpdate', grid[position]);
			}
		}
	});

	socket.on('moveDown', function (pos) {
		if (grid[pos] !== undefined && grid[pos].player == socket.id){
			var oldCell = grid[pos];
			var newY = oldCell.y + 1;
			var position = oldCell.x+"x"+newY;
			if (grid[position] === undefined){
				var newcell = new Cell(socket.id,oldCell.x,newY,position,oldCell.color);
				delete grid[pos]; //delete old
				grid[position] = newcell;	//add new
				io.sockets.emit('deleteCell', pos);
				io.sockets.emit('gridUpdate', grid[position]);
			}
		}
	});

	socket.on('disconnect', function (){
		for (var position in grid) {
			if (grid[position].player == socket.id) {
				delete grid[position];
				socket.broadcast.emit('deleteCell', position);
			}
		}
	});
});