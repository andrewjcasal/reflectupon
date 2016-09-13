var mongoose = require('mongoose'),
    Token = mongoose.model('AccessToken');


exports.find = function(key, done) {
  console.log('find token');
  Token
    .find({token: key})
    .exec(function(err, token) {
      console.log('token found');
      return done(null, token);
    })
};

exports.save = function(token, userID, clientID, done) {
  console.log('saved');
  console.log(arguments);
  var token = new Token({
    token:    token,
    userID:   userID,
    clientID: clientID
  })

  token.save(function(err) {
    return done(null);
  })
};