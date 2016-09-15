var mongoose = require('mongoose'),
    Token = mongoose.model('AccessToken');


exports.find = function(key, done) {
  Token
    .find({token: key})
    .exec(function(err, token) {
      console.log('token found');
      return done(null, token);
    })
};
