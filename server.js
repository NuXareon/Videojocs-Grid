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

		var sightRange = playerCell.getSightRange();
		///console.log(sightRange);

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
						clientSocket.emit('playerUpdate', players[cell.player].generateClientData());
					}
				}
			} 
		}

	}

	// Sends player info to other players (only if they are near the player), it also can delete an old position.
	function updateAllGridInfo(newCell,oldCell) {
		for (var playerId in players) {
			var distOld;
			if (oldCell !== undefined) distOld = distanceBetweenCells(oldCell,players[playerId]);
			var distNew = distanceBetweenCells(newCell,players[playerId]);	
			if (distNew <= config.VIEW_FIELD || (distOld !== undefined && distOld <= config.VIEW_FIELD)){
				var pos = players[playerId].x+'x'+players[playerId].y;
				sendMap(grid[pos],players[playerId].socket);
			}
			if (distNew > config.VIEW_FIELD && distOld !== undefined && distOld <= config.VIEW_FIELD) {
				var pos = players[playerId].x+'x'+players[playerId].y;
				var cell = new Cell(undefined,grid[pos].x,grid[pos].y,pos,grid[pos].oldColor,'sight');
				socket.emit('gridUpdate', cell);
				socket.emit('deletePlayer', playerId);
				players[playerId].socket.emit('deletePlayer', socket.id);
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

	var player = new Player(socket.id,100,5,posX,posY,socket);
	players[socket.id] = player;

	for (var playerId in players) {
		if (distanceBetweenCells(players[playerId],{x:posX,y:posY}) <= config.VIEW_FIELD){
			socket.emit('playerUpdate', players[playerId].generateClientData());
			players[playerId].socket.emit('playerUpdate', player.generateClientData());
		}
	}


	//io.sockets.emit('playerUpdate', player.generateClientData());
	//console.log(player[socket.id].socket)
	//io.sockets.sockets[id];

	var colorArray = ['#164cf2','#2542FF', '25DBFF', '25FF25', '004300'];
	var color = colorArray[Math.floor(Math.random()*colorArray.length)];
	var cell = new Cell(socket.id,posX,posY,position,color,'player');
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

						//console.log(grid[newPosition].color);
						var newcell = new Cell(socket.id,newX,newY,newPosition,myCell.color,'player',grid[newPosition].color);
						grid[data.pos].oldCol;
						grid[data.pos] = new Cell(undefined,grid[data.pos].x,grid[data.pos].y,data.pos,grid[data.pos].oldColor,'sight'); //delete old
						grid[newPosition] = newcell;	//add new
						updateAllGridInfo(newcell,grid[data.pos]);
						//io.sockets.emit('deleteCell', data.pos);
						//io.sockets.emit('gridUpdate', grid[newPosition]);
						//sendMap(grid[newPosition]);
					}
					else if (grid[newPosition].type == 'item') {

						var playerId = grid[data.pos].player; 

						if (grid[newPosition].player == 'INFINITY_EDGE'){
							players[playerId].AD += 5;
						}

					 	players[playerId].x = newX;
					 	players[playerId].y = newY;

						var newcell = new Cell(socket.id,newX,newY,newPosition,myCell.color);
						grid[data.pos] = new Cell(undefined,grid[data.pos].x,grid[data.pos].y,data.pos,grid[data.pos].oldColor,'sight'); //delete old
						grid[newPosition] = newcell;	//add new
						//io.sockets.emit('deleteCell', data.pos);
						//io.sockets.emit('gridUpdate', grid[newPosition]);
						updateAllGridInfo(newcell,grid[data.pos]);
						//sendMap(grid[newPosition]);
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
		var pos = players[socket.id].x+'x'+players[socket.id].y;
		var newCell = new Cell(undefined,players[socket.id].x,players[socket.id].y,pos,undefined,'sight')
		grid[pos] = newCell;
		delete players[socket.id];
		updateAllGridInfo(newCell);
		io.sockets.emit('deletePlayer', socket.id);
		//delete grid[pos];
		//socket.broadcast.emit('deleteCell', position);
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