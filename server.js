var io = require('socket.io').listen(4242);
io.set('log level',1);

var config = require('./config.js');
var Cell = require('./cell.js');
var Player = require('./Player.js')
var Monsters = require('./monsters.js')
var Items = require('./items.js')

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
	console.log('sending map...');

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
/*
	var sightRangeOld;
	var sightRangeNew = newCell.getSightRange();
	var sightRange = sightRangeNew;
	if (oldCell !== undefined) {
		sightRangeOld = oldCell.getSightRange();
	}
	for (var position in sightRange){
		if (grid[position] !== undefined && grid[position].type == 'player') {
			var playerId = grid[position].player;
			sendMap(grid[position],players[playerId].socket);
		}
	}

	for (var position in sightRange){
		if (grid[position] !== undefined && grid[position].type == 'player') {
			var playerId = grid[position].player;
		}
	}
*/
	// TODO: not luck at all players
	for (var playerId in players) {
		if (players[playerId].socket !== undefined){
			var distOld;
			if (oldCell !== undefined) distOld = distanceBetweenCells(oldCell,players[playerId]);
			var distNew = distanceBetweenCells(newCell,players[playerId]);	

			if (distNew <= config.VIEW_FIELD || (distOld !== undefined && distOld <= config.VIEW_FIELD)){
				var pos = players[playerId].x+'x'+players[playerId].y;
				sendMap(grid[pos],players[playerId].socket);
			}
			if (distNew > config.VIEW_FIELD && distOld !== undefined && distOld <= config.VIEW_FIELD && socket !== undefined) {
				var pos = players[playerId].x+'x'+players[playerId].y;
				var cell = new Cell(undefined,grid[pos].x,grid[pos].y,pos,grid[pos].oldColor,'sight');
				socket.emit('gridUpdate', cell);
				socket.emit('deletePlayer', playerId);
				players[playerId].socket.emit('deletePlayer', socket.id);
			}
		}
	}
}

// Finds the closest player and returns the next cell to get to it (doesn't take into account walls)
function findClosestPlayer (cell,range) {
	var neighbours = [];
	var seen = {};
	neighbours.push(cell.position);
	seen[cell.position] = cell.position;
	while (neighbours.length > 0) {
		var candidatePos = neighbours.splice(0,1);
		candidatePos = candidatePos[0];
		if (grid[candidatePos].type == 'player' && candidatePos != cell.position) {
			var prevPos = candidatePos;
			while (seen[prevPos] != cell.position){
				prevPos = seen[prevPos];
			}
			return prevPos;
		}

		var newX = grid[candidatePos].x+1
		var newY = grid[candidatePos].y
		var newPos = newX+'x'+newY;
		if (seen[newPos] === undefined && grid[newPos] != undefined && (grid[newPos].type == 'sight' || grid[newPos].type == 'player') && distanceBetweenCells(cell,{x:newX,y:newY}) <= range) {
			seen[newPos] = candidatePos;
			neighbours.push(newPos);
		}

		var newX = grid[candidatePos].x-1
		var newY = grid[candidatePos].y
		var newPos = newX+'x'+newY;
		if (seen[newPos] === undefined && grid[newPos] != undefined && (grid[newPos].type == 'sight' || grid[newPos].type == 'player') && distanceBetweenCells(cell,{x:newX,y:newY}) <= range) {
			seen[newPos] = candidatePos;
			neighbours.push(newPos);
		}

		var newX = grid[candidatePos].x
		var newY = grid[candidatePos].y+1
		var newPos = newX+'x'+newY;
		if (seen[newPos] === undefined && grid[newPos] != undefined && (grid[newPos].type == 'sight' || grid[newPos].type == 'player') && distanceBetweenCells(cell,{x:newX,y:newY}) <= range) {
			seen[newPos] = candidatePos;
			neighbours.push(newPos);
		}

		var newX = grid[candidatePos].x
		var newY = grid[candidatePos].y-1
		var newPos = newX+'x'+newY;
		if (seen[newPos] === undefined && grid[newPos] != undefined && (grid[newPos].type == 'sight' || grid[newPos].type == 'player') && distanceBetweenCells(cell,{x:newX,y:newY}) <= range) {
			seen[newPos] = candidatePos;
			neighbours.push(newPos);
		}
	}
	var result = 0;
	return result;

}

// kill someone
function killMonster(monsterId,scorePlayerId) {
	var monster = players[monsterId];
	var pos = monster.x+'x'+monster.y;
	var monsterCell = grid[pos];

	grid[pos] = new Cell(undefined,monsterCell.x,monsterCell.y,monsterCell.position,monsterCell.oldColor,'sight');
	delete players[monsterId];
	delete monsters[monsterId];

	players[scorePlayerId].increaseScore(1);

	var sightRange = monsterCell.getSightRange();
	for (var position in sightRange){
		if (grid[position] !== undefined && grid[position].type == 'player') {
			var playerId = grid[position].player;
			players[playerId].socket.emit('gridUpdate', grid[pos]);
			players[playerId].socket.emit('playerUpdate', players[scorePlayerId].generateClientData());
			players[playerId].socket.emit('deletePlayer', monsterId);
		}
	}


/*
	// TODO: not luck at all players
	for (var playerId in players) {
		if (players[playerId].socket !== undefined) {
			if (distanceBetweenCells(monsterCell,players[playerId]) <= config.VIEW_FIELD){
				players[playerId].socket.emit('gridUpdate', grid[pos]);
				players[playerId].socket.emit('deletePlayer', monsterId);
			}
			//var cell = new Cell(undefined,grid[pos].x,grid[pos].y,pos,grid[pos].oldColor,'sight');

		}
	}
	*/
}

function killPlayer(enemyId,scorePlayerId) {
	var enemyPlayer = players[enemyId];
	var pos = enemyPlayer.x+'x'+enemyPlayer.y;
	var enemyPlayerCell = grid[pos];

	grid[pos] = new Cell(undefined,enemyPlayerCell.x,enemyPlayerCell.y,enemyPlayerCell.position,enemyPlayerCell.oldColor,'sight');

	var newPos;
	var posX, posY;
	while (newPos === undefined || grid[newPos] !== undefined && grid[newPos].type != 'sight') {
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
	players[scorePlayerId].increaseScore(50);
	//enemyPlayer.socket.emit('gridUpdate', grid[pos]);

	//flush client data.
	updateAllGridInfo(grid[newPos],grid[pos],enemyPlayer.socket);
}


function monsterWolfLogic () {
	for (monsterId in monsters) {
		var pos = players[monsterId].x+'x'+players[monsterId].y;
		var targetPos = findClosestPlayer(grid[pos], Monsters.WOLF_RANGE);

		if (targetPos != 0){
			if (grid[targetPos].type == 'sight'){
			 	players[monsterId].x = grid[targetPos].x;
			 	players[monsterId].y = grid[targetPos].y;

				var newcell = new Cell(monsterId,grid[targetPos].x,grid[targetPos].y,targetPos,'DarkGrey','monster',grid[targetPos].color);
				grid[pos] = new Cell(undefined,grid[pos].x,grid[pos].y,pos,grid[pos].oldColor,'sight'); //delete old
				grid[targetPos] = newcell;	//add new

				updateAllGridInfo(grid[targetPos],grid[pos]);
			}
			// attack mode
			else if (grid[targetPos].type == 'player') {
				targetId = grid[targetPos].player;
				players[targetId].HP -= players[monsterId].AD;

				if (players[targetId].HP <= 0) {
					players[targetId].HP = 0;
					if (monsters[targetId] !== undefined) killMonster(targetId,monsterId);
					else killPlayer(targetId,monsterId);
				}

				if (players[targetId] !== undefined) io.sockets.emit('playerUpdate', players[targetId].generateClientData());
			}
		}
	}
}


setInterval(function (){
	monsterWolfLogic();	
}, 250);

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


	var colorArray = ['#164cf2','#2542FF', '25DBFF', '25FF25', '004300'];
	var color = colorArray[Math.floor(Math.random()*colorArray.length)];
	var cell = new Cell(socket.id,posX,posY,position,color,'player');
	grid[position] = cell;

	// TODO: not luck at all players
	var sightRange = cell.getSightRange();
	for (var position in sightRange){
		if (grid[position] !== undefined && grid[position].type == 'player') {
			var playerId = grid[position].player;
			socket.emit('playerUpdate', players[playerId].generateClientData());
			if (players[playerId].socket !== undefined) players[playerId].socket.emit('playerUpdate', player.generateClientData());
		}
	}
	/*
	for (var playerId in players) {
		if (distanceBetweenCells(players[playerId],{x:posX,y:posY}) <= config.VIEW_FIELD){
			socket.emit('playerUpdate', players[playerId].generateClientData());
			if (players[playerId].socket !== undefined) players[playerId].socket.emit('playerUpdate', player.generateClientData());
		}
	}
*/
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
					grid[data.pos] = new Cell(undefined,grid[data.pos].x,grid[data.pos].y,data.pos,grid[data.pos].oldColor,'sight'); //delete old
					grid[newPosition] = newcell;	//add new

					updateAllGridInfo(newcell,grid[data.pos],socket);

					//var closestPlayer = findClosestPlayer(newcell,Monsters.WOLF_RANGE);
					//console.log(closestPlayer);
				}
				else if (grid[newPosition].type == 'item') {

					var playerId = grid[data.pos].player; 

					if (grid[newPosition].player == 'INFINITY_EDGE'){
						players[playerId].AD += Items.INFINITY_AD;
					}
					else if (grid[newPosition].player == 'WARMOG'){
						players[playerId].maxHP += Items.WARMOG_HP;
						players[playerId].HP += Items.WARMOG_HP;
					}
					else if (grid[newPosition].player == 'HEALTH_POTION'){
						players[playerId].HP += Items.HEALTH_POTION_HP;
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

					if (players[enemyId].HP <= 0) {
						players[enemyId].HP = 0;
						if (monsters[enemyId] !== undefined) killMonster(enemyId,playerId);
						else killPlayer(enemyId,playerId);
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