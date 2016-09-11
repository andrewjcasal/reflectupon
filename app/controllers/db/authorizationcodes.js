var codes = {};


exports.find = function(key, done) {
  var code = codes[key];
  return done(null, code);
};

exports.save = function(code, clientID, redirectURI, userID, done) {

  console.log('saved');
  console.log(arguments);
  codes[code] = { clientID: clientID, redirectURI: redirectURI, userID: userID };
  return done(null);
};

exports.delete = function(key, done) {
    delete codes[key];
    return done(null);
}