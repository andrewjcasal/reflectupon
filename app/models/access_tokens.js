var mongoose = require('mongoose')
  , Schema   = mongoose.Schema;

var accessTokenSchema = Schema({
    token:    String,
    expirationDate: Date,
    userID:   String,
    clientID: String,
    scope:    String
});

mongoose.model('AccessToken', accessTokenSchema);