function Player(id,HP,AD,posX,posY,socket){
	this.id = id;
	this.HP = HP;
	this.AD = AD;
	this.x = posX;
	this.y = posY;
	this.socket = socket;
}
Player.prototype.generateClientData = function () {
	var data = {id:this.id,HP:this.HP,AD:this.AD};
	return data;
}

module.exports = Player;