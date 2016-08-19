var mongoose   = require('mongoose')
  , Challenge  = mongoose.model('Challenge')
  , _          = require('underscore')
  , Thought    = mongoose.model('Thought')
  , User       = mongoose.model('User')
  , helpers      = require('../../helpers');

exports.post = function(req, res) {
    var challenge = new Challenge({
        creator:      req.user,
        title:        req.body.title,
        description:  req.body.description,
        instructions: req.body.instructions,
        link:         req.body.link
    });

    challenge.save(function(err) {
        res.send(challenge);
    });
}

var putUserChallenges = function(userId, challengeId, options, callback) {
  User.findById(userId)
      .populate({
        path: 'user_challenges.challenge',
        model: 'Challenge'
      }).exec(function(err, user) {

      Challenge.findById(challengeId, function(err, challenge) {

        var matchingUserChallenge = _.filter(user.user_challenges, function(uc) {
          if (uc.challenge) {
            return uc.challenge.toObject()._id == challengeId;
          } else {
            return false;
          }
        });

        var user_challenge;

        if (matchingUserChallenge.length) {
          user_challenge = matchingUserChallenge[0];

          if (options.status) {
            user_challenge.status = options.status;
          }

          if (options.thought) {
            user_challenge.thought = options.thought;
          }

        } else {
          user_challenge = {
            date:   new Date(),
            status: options.status,
            challenge: challenge
          };
        }

        var userChallenges = _.reject(user.user_challenges, function(uc) {
          if (uc.challenge) {
            return uc.challenge.toObject()._id == challengeId;
          } else {
            return false;
          }
        })

        userChallenges.push(user_challenge);
        user.user_challenges = userChallenges;
          console.log(userChallenges);

        user.save(function(err, user) {
          callback(user_challenge);
        });

      });

    });
}

exports.put = function(req, res) {
  var options = _.pick(req.body, [
    'status',
    'thought',
    'avatar_url',
    'flaggedBy',
    'addSubject',
    'removeSubject',
    'featured',
    'title'
  ]);

  // Only specific user challenges
  if (options.status || options.thought) {
    putUserChallenges(req.user._id, req.params.id, options, function(user_challenge) {
      res.send(user_challenge);
    });
  } else {

    if (options.flaggedBy) {
      Challenge.findByIdAndUpdate(req.params.id, {
        $push: {flaggedBy: req.user}
      }, {'new': true}, function(err, challenge) {
        if (err) {
          console.log(err);
        }
        res.send(challenge);
      });
    } else if (options.addSubject) {
      Challenge.findByIdAndUpdate(req.params.id, {
        $push: {subjects: options.addSubject}
      }, {'new': true}, function(err, challenge) {
        if (err) {
          console.log(err);
        }
        res.send(challenge);
      });
    } else if (options.removeSubject) {
      Challenge.findByIdAndUpdate(req.params.id, {
        $pull: {subjects: options.removeSubject}
      }, function(err, challenge) {
        if (err) {
          console.log(err);
        }
        res.send(challenge);
      });
    } else {
      Challenge.findByIdAndUpdate(req.params.id, options, function(err, challenge) {
        res.send(challenge);
      });
    }
  }
}

exports.putRelated = function(req, res) {
  Challenge.findById(req.params.challengeId, function(err, related) {
    Challenge.findByIdAndUpdate(req.params.id, { $addToSet: {relatedChallenges: related } }, function (err, challenge) {
      res.send(challenge);
    });
  })
}

exports.deletedRelated = function(req, res) {
  Challenge.findByIdAndUpdate(req.params.id, 
    { $pull: {relatedChallenges: req.params.challengeId} },
  function (err, challenge) {
    res.send(challenge);
  });
}

exports.postThought = function(req, res) {

  Challenge.findById(req.params.id, function(err, challenge) {

    var thoughtAttr = {
        description:    req.body.description,
        privacy:        req.body.privacy,
        user_id:        req.user._id,
        challenge:      challenge,
        date:           new Date()
    }

    var thought = new Thought(thoughtAttr);

    thought.save(function(err) {

      var options = {
        thought: thought
      }

      putUserChallenges(req.user._id, req.params.id, options, function(user_challenge) {
        res.send(thought);
      })
    });

  })
}

exports.get = function(req, res) {
    exports.getChallenges({}, function(challenges) {

      if (req.query.completed) {
        User.findById(req.user._id)
            .populate({
              path: 'user_challenges.challenge',
              model: 'Challenge'
            }).exec(function(err, user) {
              var uc = helpers.startedChallengeStatus(challenges, user.user_challenges);

              res.send(_.where(uc, {status: 'completed'}));

            });
      } else {
        res.send(challenges);
      }
    });
}

exports.getChallenges = function(params, callback) {
  Challenge
    .find(params)
    .populate('creator')
    .populate('relatedChallenges')
    .exec(function(err, challenges) {
      callback(challenges);
    })
}

exports.delete = function(req,res) {
    Challenge.findById(req.params.id, function(err,challenge) {
        challenge.remove(function(err) {
            if (err) console.log(err);
            res.send(challenge);
        })
    });
}