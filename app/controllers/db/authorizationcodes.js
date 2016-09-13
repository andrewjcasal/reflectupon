var mongoose = require('mongoose'),
    AuthorizationCode = mongoose.model('AuthorizationCode');

var codes = {};


exports.find = function(key, done) {
  AuthorizationCode
    .findOne({code: key})
    .exec(function(err, code) {
      return done(null, code);
    })
};

exports.save = function(code, clientID, redirectURI, userID, done) {
  var authorizationCode = new AuthorizationCode({
    code: code,
    clientID: clientID,
    redirectURI: redirectURI,
    userID: userID
  });

  authorizationCode.save(function(err) {
    return done(null);
  })
};

exports.delete = function(key, done) {
  AuthorizationCode
    .findOne({code: key})
    .exec(function(err, code) {
      code.remove(function(err) {
        return done(null);
      })
    })
}