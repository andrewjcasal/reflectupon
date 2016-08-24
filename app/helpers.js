var mongoose   = require('mongoose')
  , async      = require('async')
  , Thought    = mongoose.model('Thought')
  , Annotation = mongoose.model('Annotation')
  , Reply      = mongoose.model('Reply')
  , User       = mongoose.model('User')
  , Topic      = mongoose.model('Topic')
  , _          = require('underscore');

exports.getThoughtsWithAnnotation = function(options, callback) {

    var params = {};
    if (options.date)    params.date    = options.date;
    if (options.user_id) params.user_id = options.user_id;

    limit = options.limit || null;

    populate = {
        path: 'recommended'
    };

    Thought
        .find(params)
        .populate(populate)
        .populate('replies')
        .sort({date:-1})
        .limit(limit)
        .exec(function(err, thoughts) {

            var params = {
                path: 'recommended.replies',
                match: {user_id: options.user_id},
                model: 'Reply'
            };

            Thought.populate(thoughts, params, function(err, thoughtsWithRecs) {

                async.mapSeries(
                    thoughtsWithRecs, function(thought, callback) {

                        thought = thought.toObject();
                        exports.getAnnotationsForThought(thought, null, function(annotations) {
                            thought.annotations = annotations;

                            if (thought.recommended && thought.recommended.length) {
                                exports.getAnnotationsForThought(thought.recommended[0], options.user_id, function(annotations) {
                                    thought.recommended[0].annotations = annotations;
                                    callback(err, thought);
                                });
                            } else {
                                callback(err, thought);
                            }
                        })
                    },
                    function(err, results) {
                        callback(results);
                    });
            });
        });

};

/**
 * Params:
 *   - thought: the entry to get annotations for
 *   - user_id: get annotations only that the user has made to the recommended entry
 */
exports.getAnnotationsForThought = function(thought, user_id, callback) {

    var params = {
        thought_id: thought._id
    };

    if (user_id) {
        params.user_id = user_id;
    }

    Annotation.find(params, function(err, annotations) {
        callback(annotations);
    })
}

exports.getStream = function(req, res) {
    exports.getPublicThoughts({}, function(popular_thoughts) {
        res.send(popular_thoughts);
    });
}

exports.getPublicThoughts = function(params, callback, options) {

    options = options || {};
    params = params || {};

    var limit = 20;
    if (params.limit) {
        limit = params.limit;
        delete params.limit;
    }

    var currentUser = false;
    if (params.currentUser) {
        currentUser = params.currentUser;
        delete params.currentUser;
    }

    var userSubscribedToCommunity;
    if (currentUser && params.community) {
        userSubscribedToCommunity = !!_.filter(currentUser.communities, function(com) {
            return com._id.toString() == params.community._id.toString();
        }).length;
    }

    if (typeof options.feature != "undefined") {
        params.feature = options.feature;
    }

    Thought.find(params)
        .where('privacy')
        .in(["ANONYMOUS", "PUBLIC"])
        .sort({date: -1})
        .limit(limit)
        .populate('replies')
        .populate('prompt')
        .populate('challenge')
        .populate('community')
        .exec(function(err, thoughtsTemp) {

            var chalPopOptions = {
                path: 'replies.challenge',
                model: 'Challenge'
            };

            Thought.populate(thoughtsTemp, chalPopOptions, function(err, thoughts) {

                thoughts.reverse();

                async.mapSeries(
                    thoughts, function(thought, callback) {

                        thought = thought.toObject();

                        thought.replies = exports.removeRejectedReplies(thought.replies);

                        if (thought.challenge && currentUser) {
                            var challenges = exports.startedChallengeStatus([thought.challenge], currentUser.user_challenges);
                            thought.challenge = challenges[0];
                        }

                        async.mapSeries(thought.replies, function(reply, callback2) {

                            if (reply.challenge && currentUser) {
                                var challenges = exports.startedChallengeStatus([reply.challenge], currentUser.user_challenges);
                                reply.challenge = challenges[0];
                            }

                            exports.getUserIfPublic(reply, function(user, callback3) {

                                if (params.community && userSubscribedToCommunity) {
                                    reply.username = user.username;
                                } else {
                                    reply.privacy = "ANONYMOUS";
                                }

                                Thought.count({user_id: user._id}, function(err, count) {
                                    Reply.count({user_id: user._id}, function(err, replyCount) {
                                        Reply.count({user_id: user._id, thanked: true}, function(err, thankedCount) {
                                            reply.userEntriesCount = count;
                                            reply.userRepliesCount = replyCount;
                                            reply.userThanksCount = thankedCount;
                                            callback3();
                                        })
                                    })
                                })
                            }, function() {
                                callback2(err, reply);
                            })

                        }, function(err, replies_results) {

                            thought.replies = replies_results;
                            exports.getAnnotationsForThought(thought, null, function(annotations) {
                                thought.annotations = annotations;

                                exports.getUserIfPublic(thought, function(user, callback2) {

                                    if (params.community && userSubscribedToCommunity) {
                                        thought.username = user.username;
                                        thought.intention = user.intention;
                                        //thought.user = _.pick(user, ['username','intention','avatar_url']);
                                    } else {
                                        thought.privacy = "ANONYMOUS";
                                        thought.user = {
                                            username:   "Anonymous",
                                            avatar_url: "/images/heros-default.jpg"
                                        }
                                    }

                                    callback2();

                                },function() {

                                    exports.getTopicsByIds(thought.tag_ids, function(topics) {
                                        thought.tag_ids = topics;
                                        callback(err, thought);
                                    })
                                });

                            })
                        });
                    },
                    function(err, results) {
                        if (err) console.log(err);
                        callback(results);
                    });
            })
        });
}

exports.getTopicsByIds = function(tag_ids, callback) {
    Topic.find({"_id": { $in: tag_ids }}).exec(function(err, topics) {
        callback(_.map(topics, function(topic){
            return topic.name;
        }));
    });
}

exports.removeRejectedReplies = function(replies) {
    return _.reject(replies, function(reply) {
        return typeof reply.status != 'undefined' && reply.status.indexOf('rejected') != -1;
    });
}

exports.getUserIfPublic = function(item, action, callback) {
    if (item.privacy == "PUBLIC") {
        User.findById(item.user_id, function(err, user) {
            action(user, function() {
            callback();
            });
        });
    } else {
        callback();
    }
}

/* Get date range from start to end */
exports.getDateRange = function(num_days) {
    var d = new Date();
    d.setDate(d.getDate()-num_days);
    return { $lt: new Date(), $gt: d }
};

exports.convertLineBreaks = function(description, type) {
    var before_type, after_type;

    if (type == 'n') {
        before_type = '\n';
        after_type = '<br>';
    } else if (type == 'br') {
        before_type = '<br>';
        after_type = '\n';
    }

    while (description.indexOf(before_type) != -1) {
        description = description.replace(before_type, after_type);
    }
    return description;
}

exports.startedChallengeStatus = function(challenges, user_challenges) {    
    return _.map(challenges, function(challenge) {

        if (challenge.toObject) {
            challenge = challenge.toObject();
        }
        challenge.status = "not started";
        var userChallenge = _.filter(user_challenges, function(uc) {
            return uc.challenge ? uc.challenge._id.toString() == challenge._id.toString() : false
        });

        if (userChallenge.length) {
            challenge.status = userChallenge[0].status;
            challenge.thought = userChallenge[0].thought;
        }
        return challenge;
    });

}