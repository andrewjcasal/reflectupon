var mongoose = require('mongoose')
  , Schema   = mongoose.Schema;

var authorizationCodeSchema = Schema({
    code:        String,
    clientID:    String, 
    redirectURI: String, 
    userID:      String
});

mongoose.model('AuthorizationCode', authorizationCodeSchema);