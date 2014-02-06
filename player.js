function Player(id,HP,AD,posX,posY,socket){
	this.id = id;
	this.HP = HP;
	this.maxHP = HP;
	this.AD = AD;
	this.x = posX;
	this.y = posY;
	this.socket = socket;
	this.score = 0;
}
Player.prototype.generateClientData = function () {
	var data = {id:this.id,HP:this.HP,maxHP:this.maxHP,AD:this.AD,x:this.x,y:this.y,score:this.score};
	return data;
}
Player.prototype.increaseScore = function (n) {
	this.score += n;
}

module.exports = Player;