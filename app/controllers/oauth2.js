var oauth2orize = require('oauth2orize')
  , passport    = require('passport')
  , login       = require('connect-ensure-login')
  , db          = require('./db')
  , utils       = require('./utils');

var server = oauth2orize.createServer();

server.serializeClient(function(client, done) {
  return done(null, client.id);
});

server.deserializeClient(function(id, done) {
  db.clients.find(id, function(err, client) {
    if (err) { return done(err); }
    return done(null, client);
  });
});

server.grant(oauth2orize.grant.code(function(client, redirectURI, user, ares, done) {
  var code = utils.uid(16)
  
  db.authorizationCodes.save(code, client.id, redirectURI, user.id, function(err) {
    if (err) { return done(err); }
    done(null, code);
  });
}));

server.exchange(oauth2orize.exchange.code(function(client, code, redirectURI, done) {
  db.authorizationCodes.find(code, function(err, authCode) {
    if (err) { return done(err); }
    if (authCode === undefined) { return done(null, false); }
    if (client.id !== authCode.clientID) { return done(null, false); }
    if (redirectURI !== authCode.redirectURI) { return done(null, false); }

      db.authorizationCodes.delete(code, function(err) {
        if(err) { return done(err); }
        var token = utils.uid(256);
        db.accessTokens.save(token, authCode.userID, authCode.clientID, function(err) {
          if (err) { return done(err); }
            done(null, token);
        });
      });
  });
}));

exports.authorization = [
  login.ensureLoggedIn(),
  server.authorization(function(clientID, redirectURI, done) {
    db.clients.findByClientId(clientID, function(err, client) {
      if (err) { return done(err); }
      // WARNING: For security purposes, it is highly advisable to check that
      //          redirectURI provided by the client matches one registered with
      //          the server.  For simplicity, this example does not.  You have
      //          been warned.
      return done(null, client, redirectURI);
    });
  }),
  function(req, res){
    res.render('dialog', { transactionID: req.oauth2.transactionID, user: req.user, client: req.oauth2.client });
  }
]

exports.decision = [
  login.ensureLoggedIn(),
  server.decision()
]

exports.token = [
  passport.authenticate(['basic', 'oauth2-client-password'], { session: false }),
  server.token(),
  server.errorHandler()
]