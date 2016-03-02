var mongoose     = require('mongoose')
  , async        = require('async')
  , UserSettings = mongoose.model('UserSettings')
  , User         = mongoose.model('User')
  , helpers      = require('../../helpers')
  , emails       = require('../../utils/emails')
  , _            = require('underscore');

exports.post = function(req, res) {
}

exports.get = function(req, res) {
    exports.getSettings();
}

exports.getSettings = function(user_id, callback) {

    User.findById(user_id, function(err, user) {

        UserSettings
            .findOne({
                user: user })
            .exec(function(err, userSettings) {

                if (!userSettings) {
                    userSettings = new UserSettings({
                        user: user
                    })

                    userSettings.save(function(err) {
                        if (err) console.log(err);
                        callback(userSettings);
                    });
                } else {
                    callback(userSettings);
                }

            });
    })
}

exports.put = function(req,res) {
    var user_id = req.query.user_id;

    User.findById(user_id, function(err, user) {

        UserSettings
            .findOne({
                user: user})
            .exec(function(err, userSettings) {

                if (userSettings) {
                    userSettings.email_reply = req.body.email_reply;
                    userSettings.email_thanks = req.body.email_thanks;
                    userSettings.save(function(err) {
                        if (err) console.log(err);
                        res.send(userSettings);
                    });
                }

            });
    });
}