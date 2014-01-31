function Cell(playerId,posX,posY,pos,color,type){
	this.x = posX;
	this.y = posY;
	this.position = pos;
	this.type = type || 'player';
	this.player = playerId || undefined; //canviar nom
	this.color = color || '#'+Math.floor(Math.random()*16777215).toString(16);
}

module.exports = Cell;