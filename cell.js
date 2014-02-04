var config = require('./config.js');

function Cell(playerId,posX,posY,pos,color,type,oldCol){
	this.x = posX;
	this.y = posY;
	this.position = pos;
	this.type = type || 'player';
	this.player = playerId || undefined; //canviar nom
	this.color = color || '#'+Math.floor(Math.random()*16777215).toString(16);
	this.oldColor = oldCol || this.color;
}
Cell.prototype.getSightRange = function () {
	var i = this.x;
	var j = this.y;
	var sightRange = {};


	for (var i = this.x-config.VIEW_FIELD; i < this.x+config.VIEW_FIELD; ++i){
		for (var j = this.y-config.VIEW_FIELD; j < this.y+config.VIEW_FIELD; ++j){
			if (Math.abs(this.x - i) + Math.abs(this.y - j) <= config.VIEW_FIELD){
				var position = i+'x'+j;	
				sightRange[position] = new Cell(undefined,i,j,position);
			}
		}
	}
/*
	while (Math.abs(this.x - i) + Math.abs(this.y - j) <= config.VIEW_FIELD) {
		while (Math.abs(this.x - i) + Math.abs(this.y - j) <= config.VIEW_FIELD) {
			var position = i+'x'+j;	
			sightRange[position] = new Cell(undefined,i,j,position);
			i += 1;
		}
		i = this.x;
		while (Math.abs(this.x - i) + Math.abs(this.y - j) <= config.VIEW_FIELD) {
			var position = i+'x'+j;	
			sightRange[position] = new Cell(undefined,i,j,position);
			i -= 1;
		}
		j += 1;
		i = this.x;
	}
	j = this.y;
	while (Math.abs(this.x - i) + Math.abs(this.y - j) <= config.VIEW_FIELD) {
		while (Math.abs(this.x - i) + Math.abs(this.y - j) <= config.VIEW_FIELD) {
			var position = i+'x'+j;	
			sightRange[position] = new Cell(undefined,i,j,position);
			i += 1;
		}
		i = this.x;
		while (Math.abs(this.x - i) + Math.abs(this.y - j) <= config.VIEW_FIELD) {
			var position = i+'x'+j;	
			sightRange[position] = new Cell(undefined,i,j,position);
			i -= 1;
		}
		j -= 1;
		i = this.x;
	}
	*/
	return sightRange;
}

module.exports = Cell;