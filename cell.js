var config = require('./config.js');

function Cell(playerId,posX,posY,pos,color,type,oldCol){
	this.x = posX;
	this.y = posY;
	this.position = pos;
	this.type = type || 'player';
	this.player = playerId || undefined; //canviar nom
	this.color = color || this.cellColors[Math.floor(Math.random()*this.cellColors.length)];
	this.oldColor = oldCol || this.cellColors[Math.floor(Math.random()*this.cellColors.length)];
}
Cell.prototype = {
	cellColors: ["#A50000", "#D25110", "#F5FF5E", "#FF2424"]
}
Cell.prototype.getSightRange = function () {
	var i = this.x;
	var j = this.y;
	var sightRange = {};


	for (var i = this.x-config.VIEW_FIELD; i <= this.x+config.VIEW_FIELD; ++i){
		for (var j = this.y-config.VIEW_FIELD; j <= this.y+config.VIEW_FIELD; ++j){
			if (Math.abs(this.x - i) + Math.abs(this.y - j) <= config.VIEW_FIELD){
				var position = i+'x'+j;	
				sightRange[position] = new Cell(undefined,i,j,position);
			}
		}
	}
	return sightRange;
}

module.exports = Cell;