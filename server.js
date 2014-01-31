var io = require('socket.io').listen(4242);
io.set('log level',1);

var config = require('./config.js');
var Cell = require('./cell.js');
var Player = require('./Player.js')

var grid = {};
var players = {};

io.sockets.on('connection', function(socket) {

//funcion enviar mapa funcion distancia ( no tot)
/*
	for (var position in grid) {
		socket.emit('gridUpdate', grid[position]);
	}
*/

	// TODO
	function sendMap(playerCell) {
		for (var position in grid){
			var cell = grid[position];
			if (Math.sqrt(Math.pow(playerCell.x-cell.x,2) + Math.pow(playerCell.y-cell.y,2)) < 7){
				socket.emit('gridUpdate', grid[position]);
			} 
			else {
				io.sockets.emit('deleteCell', cell.pos);
			}
		}
	}

	for (var playerId in players) {
		socket.emit('playerUpdate', players[playerId]);
	}

	var player = new Player(socket.id,100,5);
	players[socket.id] = player;
	io.sockets.emit('playerUpdate', player);

	var position;
	while (position == undefined || grid[position] !== undefined) {
		var nCellsX = config.MAP_WIDTH/config.CELL_SIZE;
		var nCellsY = config.MAP_HEIGHT/config.CELL_SIZE;
		var x = Math.random()*config.MAP_WIDTH;
		var y = Math.random()*config.MAP_HEIGHT;
		x = Math.floor(x)%nCellsX;
		y = Math.floor(y)%nCellsY;
		position = x+"x"+y;
	}

	var cell = new Cell(socket.id,x,y,position);
	grid[position] = cell;
	io.sockets.emit('gridUpdate', cell);

	//crida get mapa
	sendMap(cell);

	socket.on('move', function (data) {
		if (grid[data.pos] !== undefined && grid[data.pos].player == socket.id){
			var myCell = grid[data.pos];
			if ([1,0,-1].indexOf(data.dir['x']) != -1 && [1,0,-1].indexOf(data.dir['y']) != -1) {
				newX = myCell.x + data.dir['x'];
				newY = myCell.y + data.dir['y'];
				var newPosition = newX+"x"+newY;
				if (newY < nCellsY && newX < nCellsX && newY >= 0  && newX >= 0) {

					 if (grid[newPosition] === undefined) {						
						var newcell = new Cell(socket.id,newX,newY,newPosition,myCell.color);
						delete grid[data.pos]; //delete old
						grid[newPosition] = newcell;	//add new
						io.sockets.emit('deleteCell', data.pos);
						io.sockets.emit('gridUpdate', grid[newPosition]);

					}
					else if (grid[newPosition].type == 'item') {

						var playerId = grid[data.pos].player; 

						if (grid[newPosition].player == 'INFINITY_EDGE'){
							players[playerId].AD += 5;
						}

						io.sockets.emit('playerUpdate', players[playerId]);

						var newcell = new Cell(socket.id,newX,newY,newPosition,myCell.color);
						delete grid[data.pos]; //delete old
						grid[newPosition] = newcell;	//add new
						io.sockets.emit('deleteCell', data.pos);
						io.sockets.emit('gridUpdate', grid[newPosition]);
					}
				}
			}
			sendMap(grid[newPosition]);
		}
	});

	socket.on('attack', function (data) {
		if (grid[data.pos] !== undefined && grid[data.pos].player == socket.id){
			var myCell = grid[data.pos];
			if ([1,0,-1].indexOf(data.dir['x']) != -1 && [1,0,-1].indexOf(data.dir['y']) != -1) {
				newX = myCell.x + data.dir['x'];
				newY = myCell.y + data.dir['y'];
				var enemyPosition = newX+"x"+newY;
				if (grid[enemyPosition] !== undefined && grid[enemyPosition].type == 'player'){
					enemyId = grid[enemyPosition].player;
					players[enemyId].HP -= players[myCell.player].AD;
					if (players[enemyId].HP < 0) players[enemyId].HP = 0;
					io.sockets.emit('playerUpdate', players[enemyId]);
				}
			}
		}
	});

	socket.on('disconnect', function (){
		for (var position in grid) {
			if (grid[position].player == socket.id) {
				delete grid[position];
				socket.broadcast.emit('deleteCell', position);
				delete players[socket.id];
				socket.broadcast.emit('deletePlayer', socket.id);
			}
		}
	});
});

for (var i = 0; i < config.NUM_WALL; ++i) {
	var position;
	while (position == undefined || grid[position] !== undefined){
		var nCellsX = config.MAP_WIDTH/config.CELL_SIZE;
		var nCellsY = config.MAP_HEIGHT/config.CELL_SIZE;
		var x = Math.random()*config.MAP_WIDTH;
		var y = Math.random()*config.MAP_HEIGHT;
		x = Math.floor(x)%nCellsX;
		y = Math.floor(y)%nCellsY;
		position = x+"x"+y;
	}
	var cell = new Cell(undefined,x,y,position,'black','wall');
	grid[position] = cell;
	io.sockets.emit('gridUpdate', cell);
}

for (var i = 0; i < config.NUM_WALL; ++i) {
	var position;
	while (position == undefined || grid[position] !== undefined) {
		var nCellsX = config.MAP_WIDTH/config.CELL_SIZE;
		var nCellsY = config.MAP_HEIGHT/config.CELL_SIZE;
		var x = Math.random()*config.MAP_WIDTH;
		var y = Math.random()*config.MAP_HEIGHT;
		x = Math.floor(x)%nCellsX;
		y = Math.floor(y)%nCellsY;
		var position = x+"x"+y;
	}
	var cell = new Cell('INFINITY_EDGE',x,y,position,'gold','item');
	grid[position] = cell;
	io.sockets.emit('gridUpdate', cell);
}