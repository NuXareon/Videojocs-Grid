var io = require('socket.io').listen(4242);
io.set('log level',1);

var config = require('./config.js');
var Cell = require('./cell.js');
var Player = require('./Player.js')

var grid = {};
var players = {};

/* 
TODO - Multipartida.

var games:
	.players
	.map.cells
	.id
	.logic
	.genGameInfo

*/

function distanceBetweenCells(data1,data2){
	var dist = Math.abs(data1.x - data2.x) + Math.abs(data1.y - data2.y);
	return dist;
}

io.sockets.on('connection', function(socket) {

	// Sends local map (only cells near the player), its possible to especify another socket.
	function sendMap(playerCell,clientSocket) {
/*
		camera.x += (player.x*cellSize+cellSize/2 - canvas.width/2 - camera.x)/40;
		camera.y += (player.y*cellSize+cellSize/2 - canvas.height/2 - camera.y)/40;

		initialX = Math.floor(playerCell.x);
		initialY = Math.floor(camera.y/cellSize);
		finalX = Math.floor(initialX + (canvas.width+cellSize)/cellSize);
		finalY = Math.floor(initialY + (canvas.height+cellSize)/cellSize);
*/
		var sightRange = playerCell.getSightRange();

		
		//console.log(sightRange);
//		for (var i = playerCell.x; i < )

		for (var position in sightRange){
			if (grid[position] === undefined){
				var newCell = new Cell(undefined,sightRange[position].x,sightRange[position].y,position,undefined,'sight');
				grid[position] = newCell;
			}
			var cell = grid[position];
			if (distanceBetweenCells(playerCell,cell) <= config.VIEW_FIELD){
				if (clientSocket === undefined){
					socket.emit('gridUpdate', cell);
					if (players[cell.player] !== undefined) {
						socket.emit('playerUpdate', players[cell.player].generateClientData());
					}
				}
				else {
					clientSocket.emit('gridUpdate', cell);
					if (players[cell.player] !== undefined) {
						socket.emit('playerUpdate', players[cell.player].generateClientData());
					}
				}
			} 
			else {
				// needed?
				if (clientSocket === undefined){
					socket.emit('deleteCell', cell.position);
				}
				else {
					socket.emit('deleteCell', cell.position);
				}
			}
		}

	}

	// Sends player info to other players (only if they are near the player), it also can delete an old position.
	function updateAllGridInfo(newCell,oldPos) {
		for (var playerId in players) {
			var dist = distanceBetweenCells(newCell,players[playerId]);
			if (dist <= config.VIEW_FIELD){
				var pos = players[playerId].x+'x'+players[playerId].y;
				sendMap(grid[pos],players[playerId].socket);
			}
		}
	}

	var position;
	var posX, posY;
	while (position === undefined || grid[position] !== undefined) {
		var nCellsX = config.MAP_WIDTH/config.CELL_SIZE;
		var nCellsY = config.MAP_HEIGHT/config.CELL_SIZE;
		posX = Math.random()*config.MAP_WIDTH;
		posY = Math.random()*config.MAP_HEIGHT;
		posX = Math.floor(posX)%nCellsX;
		posY = Math.floor(posY)%nCellsY;
		position = posX+"x"+posY;
	}

	for (var playerId in players) {
		if (distanceBetweenCells(players[playerId],{x:posX,y:posY}) <= config.VIEW_FIELD){
			socket.emit('playerUpdate', players[playerId].generateClientData());
		}
	}

	var player = new Player(socket.id,100,5,posX,posY,socket);
	players[socket.id] = player;
	io.sockets.emit('playerUpdate', player.generateClientData());
	//console.log(player[socket.id].socket)
	//io.sockets.sockets[id];

	var cell = new Cell(socket.id,posX,posY,position);
	grid[position] = cell;
	//io.sockets.emit('gridUpdate', cell);

	//crida get mapa
	sendMap(cell);

	socket.on('move', function (data) {
		if (grid[data.pos] !== undefined && grid[data.pos].player == socket.id){
			var myCell = grid[data.pos];
			if ([1,0,-1].indexOf(data.dir['x']) != -1 && [1,0,-1].indexOf(data.dir['y']) != -1) {
				newX = myCell.x + data.dir['x'];
				newY = myCell.y + data.dir['y'];
				var newPosition = newX+"x"+newY;
				//if (newY < nCellsY && newX < nCellsX && newY >= 0  && newX >= 0) {

					 if (grid[newPosition].type == 'sight') {		

					 	var playerId = grid[data.pos].player; 

					 	players[playerId].x = newX;
					 	players[playerId].y = newY;
//TODO:no canviar color de casella despres de passar
						var newcell = new Cell(socket.id,newX,newY,newPosition,myCell.color,'player',grid[newPosition].color);
						grid[data.pos] = new Cell(undefined,grid[data.pos].x,grid[data.pos].y,data.pos,grid[data.pos].oldCol,'sight'); //delete old
						grid[newPosition] = newcell;	//add new
						updateAllGridInfo(newcell,data.pos);
						io.sockets.emit('deleteCell', data.pos);
						//io.sockets.emit('gridUpdate', grid[newPosition]);
						sendMap(grid[newPosition]);
					}
					else if (grid[newPosition].type == 'item') {

						var playerId = grid[data.pos].player; 

						if (grid[newPosition].player == 'INFINITY_EDGE'){
							players[playerId].AD += 5;
						}

					 	players[playerId].x = newX;
					 	players[playerId].y = newY;

						io.sockets.emit('playerUpdate', players[playerId].generateClientData());

						var newcell = new Cell(socket.id,newX,newY,newPosition,myCell.color);
						delete grid[data.pos]; //delete old
						grid[newPosition] = newcell;	//add new
						io.sockets.emit('deleteCell', data.pos);
						io.sockets.emit('gridUpdate', grid[newPosition]);
						sendMap(grid[newPosition]);
					}
			//	}
			}
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
					io.sockets.emit('playerUpdate', players[enemyId].generateClientData());
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
}