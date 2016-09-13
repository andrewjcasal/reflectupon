var mongoose = require('mongoose')
  , Schema   = mongoose.Schema;

var accessTokenSchema = Schema({
    token:    String,
    userID:   String,
    clientID: String
});

mongoose.model('AccessToken', accessTokenSchema);