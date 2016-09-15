var oauth2orize = require('oauth2orize')
  , passport    = require('passport')
  , login       = require('connect-ensure-login')
  , db          = require('./db')
  , utils       = require('./utils')
  , mongoose    = require('mongoose')
  , User        = mongoose.model('User')
  , RefreshToken = mongoose.model('RefreshToken')
  , AccessToken = mongoose.model('AccessToken')
  , bcrypt      = require('bcryptjs')
  , crypto      = require('crypto')

var server = oauth2orize.createServer();

server.exchange(oauth2orize.exchange.password(function (client, username, password, scope, done) {
    User.findOne({username: username}, function (err, user) {
        if (err) return done(err)
        if (!user) return done(null, false)
        user.comparePassword(password, function (err, res) {
            if (!res) return done(null, false)
 
            var token = utils.uid(256)
            var refreshToken = utils.uid(256)
            var tokenHash = crypto.createHash('sha1').update(token).digest('hex')
            var refreshTokenHash = crypto.createHash('sha1').update(refreshToken).digest('hex')
 
            var expirationDate = new Date(new Date().getTime() + (3600 * 1000))

            var token = new AccessToken({
              token: tokenHash,
              expirationDate: expirationDate,
              clientID: client.clientId,
              userID: user.id,
              scope: scope
            });

            token.save(function (err) {
                if (err) return done(err)

                var refreshToken = new RefreshToken({
                  refreshToken: refreshTokenHash,
                  clientID: client.clientId,
                  userID: user.id
                })

                refreshToken.save(function (err, refResp) {
                    if (err) return done(err)
                    done(null, token, refreshToken, {expires_in: expirationDate})
                })
            })
        })
    })
}))

server.exchange(oauth2orize.exchange.refreshToken(function (client, refreshToken, scope, done) {
    RefreshToken.findOne({refreshToken: refreshToken}, function (err, token) {
        if (err) return done(err)
        if (!token) return done(null, false)
        if (client.clientId !== token.clientID) return done(null, false)
 
        var newAccessToken = utils.uid(256)
        var accessTokenHash = crypto.createHash('sha1').update(newAccessToken).digest('hex')
 
        var expirationDate = new Date(new Date().getTime() + (3600 * 1000))
 
        AccessToken.update({userId: token.userId}, {$set: {token: accessTokenHash, scope: scope, expirationDate: expirationDate}}, function (err) {
            if (err) return done(err)
            done(null, newAccessToken, refreshToken, {expires_in: expirationDate});
        })
    })
}))

exports.token = [
  passport.authenticate(['clientBasic', 'clientPassword'], { session: false }),
  server.token(),
  server.errorHandler()
]