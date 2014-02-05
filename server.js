var io = require('socket.io').listen(4242);
io.set('log level',1);

var config = require('./config.js');
var Cell = require('./cell.js');
var Player = require('./Player.js')
var Monsters = require('./monsters.js')

var grid = {};
var players = {};
var monsters = {};

function distanceBetweenCells(data1,data2){
	var dist = Math.abs(data1.x - data2.x) + Math.abs(data1.y - data2.y);
	return dist;
}

// Sends local map (only cells near the player), its possible to especify another socket.
function sendMap(playerCell,clientSocket) {

	var sightRange = playerCell.getSightRange();
	///console.log(sightRange);

	for (var position in sightRange){
		if (grid[position] === undefined){
			var newCell;
			var wallRandom = Math.random();
			var itemRandom = Math.random();
			var monsterRandom = Math.random();
			if (wallRandom <= config.WALL_CHANCE) {
				newCell = new Cell(undefined,sightRange[position].x,sightRange[position].y,position,'Black','wall');
			}
			else if (itemRandom <= config.ITEM_CHANCE){
				var infinityRandom = Math.random();
				var warmogRandom = Math.random();
				var healthPotionRandom = Math.random();

				if (infinityRandom <= config.INFINITY_CHANCE){
					newCell = new Cell('INFINITY_EDGE',sightRange[position].x,sightRange[position].y,position,'Gold','item');
				}
				else if (warmogRandom <= config.WARMOG_CHANCE){
					newCell = new Cell('WARMOG',sightRange[position].x,sightRange[position].y,position,'SpringGreen','item');
				}
				else if (healthPotionRandom <= config.HEALTH_POTION_CHANCE){
					newCell = new Cell('HEALTH_POTION',sightRange[position].x,sightRange[position].y,position,'Purple','item');
				}
				else {
					newCell = new Cell(undefined,sightRange[position].x,sightRange[position].y,position,undefined,'sight');
				}
			}
			else if (monsterRandom <= config.MONSTER_CHANCE){
				var wolfRandom = Math.random();
				if (wolfRandom <= config.WOLF_CHANCE){
					// cu2vsGzyv7tu1kkIYw_n
					// _MRxOihJ7oRHGRuKYw_m
					// 20 Chars
					// Math.floor(Math.random()*(Math.pow(16,8)-1)).toString(16);
					// generar, truncar i comprovar
					var monsterId;
					while (monsterId === undefined || players[monsterId] !== undefined){
						monsterId = Math.floor(Math.random()*(Math.pow(16,8)-1)).toString(16);
					}
					var player = new Player(monsterId,Monsters.WOLF_HP,Monsters.WOLF_AD,sightRange[position].x,sightRange[position].y,undefined);
					players[monsterId] = player;
					monsters[monsterId] = monsterId;
					clientSocket.emit('playerUpdate', player.generateClientData());

					newCell = new Cell(monsterId,sightRange[position].x,sightRange[position].y,position,'DarkGrey','monster');
				}
			}
			else {
				newCell = new Cell(undefined,sightRange[position].x,sightRange[position].y,position,undefined,'sight');
			}

			grid[position] = newCell;
		}
		var cell = grid[position];
		if (distanceBetweenCells(playerCell,cell) <= config.VIEW_FIELD){
			clientSocket.emit('gridUpdate', cell);
			if (players[cell.player] !== undefined) {
				clientSocket.emit('playerUpdate', players[cell.player].generateClientData());
			}
		} 
	}
}

// Sends player info to other players (only if they are near the player), it also can delete an old position.
function updateAllGridInfo(newCell,oldCell,socket) {
	for (var playerId in players) {
		if (players[playerId].socket !== undefined){
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
}

// kill someone
function killMonster(monsterId) {
	var monster = players[monsterId];
	var pos = monster.x+'x'+monster.y;
	var monsterCell = grid[pos];

	grid[pos] = new Cell(undefined,monsterCell.x,monsterCell.y,monsterCell.position,monsterCell.oldColor,'sight');
	delete players[monsterId];
	delete monsters[monsterId];

	for (var playerId in players) {
		if (players[playerId].socket !== undefined) {
			if (distanceBetweenCells(monsterCell,players[playerId]) <= config.VIEW_FIELD){
				players[playerId].socket.emit('gridUpdate', grid[pos]);
				players[playerId].socket.emit('deletePlayer', monsterId);
			}
			//var cell = new Cell(undefined,grid[pos].x,grid[pos].y,pos,grid[pos].oldColor,'sight');

		}
	}
}

function killPlayer(enemyId) {
	var enemyPlayer = players[enemyId];
	var pos = enemyPlayer.x+'x'+enemyPlayer.y;
	var enemyPlayerCell = grid[pos];

	grid[pos] = new Cell(undefined,enemyPlayerCell.x,enemyPlayerCell.y,enemyPlayerCell.position,enemyPlayerCell.oldColor,'sight');

	var newPos;
	var posX, posY;
		while (newPos === undefined || grid[newPos] !== undefined) {
		var nCellsX = config.MAP_WIDTH/config.CELL_SIZE;
		var nCellsY = config.MAP_HEIGHT/config.CELL_SIZE;
		posX = Math.random()*config.MAP_WIDTH;
		posY = Math.random()*config.MAP_HEIGHT;
		posX = Math.floor(posX)%nCellsX;
		posY = Math.floor(posY)%nCellsY;
		newPos = posX+"x"+posY;
	}

	players[enemyId] = new Player(enemyId,config.PLAYER_INITIAL_HP,config.PLAYER_INITIAL_AD,posX,posY,enemyPlayer.socket);
	grid[newPos] = new Cell(enemyId,posX,posY,newPos,enemyPlayerCell.color,'player');
}


function monsterWolfLogic () {
	//fer servir BFS per trobar la casella del jugador mes proper
	// moure el llop / attacar
	// executar cada x temps (setInterval(javascript function",milliseconds))
}



// Client connection logic
io.sockets.on('connection', function(socket) {

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

	var player = new Player(socket.id,config.PLAYER_INITIAL_HP,config.PLAYER_INITIAL_AD,posX,posY,socket);
	players[socket.id] = player;

	for (var playerId in players) {
		if (distanceBetweenCells(players[playerId],{x:posX,y:posY}) <= config.VIEW_FIELD){
			socket.emit('playerUpdate', players[playerId].generateClientData());
			if (players[playerId].socket !== undefined) players[playerId].socket.emit('playerUpdate', player.generateClientData());
		}
	}

	var colorArray = ['#164cf2','#2542FF', '25DBFF', '25FF25', '004300'];
	var color = colorArray[Math.floor(Math.random()*colorArray.length)];
	var cell = new Cell(socket.id,posX,posY,position,color,'player');
	grid[position] = cell;

	updateAllGridInfo(cell,undefined,socket);

	socket.on('move', function (data) {
		if (grid[data.pos] !== undefined && grid[data.pos].player == socket.id){
			var myCell = grid[data.pos];
			if ([1,0,-1].indexOf(data.dir['x']) != -1 && [1,0,-1].indexOf(data.dir['y']) != -1) {
				newX = myCell.x + data.dir['x'];
				newY = myCell.y + data.dir['y'];
				var newPosition = newX+"x"+newY;

				if (grid[newPosition].type == 'sight') {		

				 	var playerId = grid[data.pos].player; 

				 	players[playerId].x = newX;
				 	players[playerId].y = newY;

					var newcell = new Cell(socket.id,newX,newY,newPosition,myCell.color,'player',grid[newPosition].color);
					grid[data.pos].oldCol;
					grid[data.pos] = new Cell(undefined,grid[data.pos].x,grid[data.pos].y,data.pos,grid[data.pos].oldColor,'sight'); //delete old
					grid[newPosition] = newcell;	//add new

					updateAllGridInfo(newcell,grid[data.pos],socket);
				}
				else if (grid[newPosition].type == 'item') {

					var playerId = grid[data.pos].player; 

					if (grid[newPosition].player == 'INFINITY_EDGE'){
						players[playerId].AD += 5;
					}
					else if (grid[newPosition].player == 'WARMOG'){
						players[playerId].maxHP += 30;
						players[playerId].HP += 30;
					}
					else if (grid[newPosition].player == 'HEALTH_POTION'){
						players[playerId].HP += 10;
						if (players[playerId].HP > players[playerId].maxHP) players[playerId].HP = players[playerId].maxHP;
					}

				 	players[playerId].x = newX;
				 	players[playerId].y = newY;

					var newcell = new Cell(socket.id,newX,newY,newPosition,myCell.color);
					grid[data.pos] = new Cell(undefined,grid[data.pos].x,grid[data.pos].y,data.pos,grid[data.pos].oldColor,'sight'); //delete old
					grid[newPosition] = newcell;	//add new

					updateAllGridInfo(newcell,grid[data.pos],socket);
				}
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
				if (grid[enemyPosition] !== undefined && (grid[enemyPosition].type == 'player' || grid[enemyPosition].type == 'monster')){
					enemyId = grid[enemyPosition].player;
					players[enemyId].HP -= players[myCell.player].AD;

					if (players[enemyId].HP < 0) {
						players[enemyId].HP = 0;
						if (monsters[enemyId] !== undefined) killMonster(enemyId);
						else killPlayer(enemyId);
					}

					if (players[enemyId] !== undefined) io.sockets.emit('playerUpdate', players[enemyId].generateClientData());
				}
			}
		}
	});

	socket.on('disconnect', function (){
		var pos = players[socket.id].x+'x'+players[socket.id].y;
		var newCell = new Cell(undefined,players[socket.id].x,players[socket.id].y,pos,undefined,'sight')
		grid[pos] = newCell;
		delete players[socket.id];
		updateAllGridInfo(newCell,undefined,socket);
		io.sockets.emit('deletePlayer', socket.id);
	});
});