var mongoose = require('mongoose')
  , Schema   = mongoose.Schema;

var refreshTokenSchema = Schema({
    refreshToken:    String,
    userID:   String,
    clientID: String
});

mongoose.model('RefreshToken', refreshTokenSchema);