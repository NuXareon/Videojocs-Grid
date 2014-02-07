var mongoose = require('mongoose'),
	Schema = mongoose.Schema,
	ObjectId = mongoose.ObjectId;

var ScoreSchema = new Schema ({
	username: {type: String},
	score: {type: Number},
	date: {type: Date}
});

ScoreSchema.statics.getHighScore = function (n, callback) {
	if (n <= 0) callback([]);
	var query = this.find();
	query.sort({score:'desc'}).limit(n).exec(function (err, scores){
		if (err) throw err;
		callback(scores);
	});
}

mongoose.model('Score', ScoreSchema);
var Score = mongoose.model('Score');
module.exports = Score;