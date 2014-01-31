function Cell(playerId,posX,posY,pos,color){
	this.x = posX;
	this.y = posY;
	this.position = pos;
	this.player = playerId;
	this.color = color || '#'+Math.floor(Math.random()*16777215).toString(16);
}

module.exports = Cell;