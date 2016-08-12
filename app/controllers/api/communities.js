var mongoose   = require('mongoose')
  , Community  = mongoose.model('Community')
  , Challenge  = mongoose.model('Challenge')
  , User       = mongoose.model('User')
  , _          = require('underscore')
  , helpers    = require('../../helpers');

exports.post = function(req, res) {

    var commAttr = {
        title:       req.body.title,
        description: req.body.description,
        creator:     req.user,
        guidelines:  req.body.guidelines,
        approved:    false
    }

    if (req.body.maxUsers) {
      commAttr.maxUsers = req.body.maxUsers;
    }

    var community = new Community(commAttr);

    community.members.push(req.user);
    User.findById(req.user._id, function(err, user) {
      community.save(function(err) {
        user.communities.push(community);
        user.save(function(err) {
          res.send(community);
        });
      });
    });

}

exports.postMember = function(req, res) {
  User.findById(req.params.memberId, function (err, user) {
    Community.findByIdAndUpdate(req.params.id, { $addToSet: {members: user } }, function (err, community) {
      user.update({$addToSet: {communities: community}}, function(err) {
        res.send(user);
      });
    });
  });
}

exports.get = function(req, res) {
  exports.getCommunities({}, function(communities) {
    res.send(communities);
  })
}

exports.put = function(req, res) {
  Community.findById(req.params.id, function (err, community) {

      community = _.extend(community, _.pick(req.body, ['title','description', 'guidelines', 'maxUsers', 'coverUrl']));
      community.save(function(err) {
          res.send(community);
      });

  });
}

exports.putChallenge = function(req, res) {
  Community.findById(req.params.id, function(err, community) {
    Challenge.findById(req.body.challengeId, function(err, challenge) {

      Community.update(
        {_id: req.params.id, 'communityChallenges.pos': req.params.challengePos},
        {'$set': {
          'communityChallenges.$.date': new Date(),
          'communityChallenges.$.challenge': challenge
        }}, function(err) {
          res.send(community);
        })
    });
  })
}

exports.getCommunities = function(params, callback) {
  params = params || {};

  if (params.approved && params.approved == "all") {
    delete params.approved;
  } else {
    params.approved = {$ne: false};
  }

  Community
    .find(params)
    .populate('creator')
    .populate('members')
    .exec(function(err, communitiesTemp) {

      var options = {
        path: 'communityChallenges.challenge',
        model: 'Challenge'
      };

      Community.populate(communitiesTemp, options, function(err, communities) {
        callback(communities);
      })
    })
}

exports.delete = function(req,res) {
    Community.findById(req.params.id, function(err,community) {
        community.remove(function(err) {
            if (err) console.log(err);
            res.send(community);
        })
    });
}