function Player(id,HP,AD,posX,posY,socket){
	this.id = id;
	this.HP = HP;
	this.maxHP = HP;
	this.AD = AD;
	this.x = posX;
	this.y = posY;
	this.socket = socket;
}
Player.prototype.generateClientData = function () {
	var data = {id:this.id,HP:this.HP,maxHP:this.maxHP,AD:this.AD,x:this.x,y:this.y};
	return data;
}

module.exports = Player;