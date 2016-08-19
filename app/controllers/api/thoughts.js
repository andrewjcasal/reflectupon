var mongoose   = require('mongoose')
  , async      = require('async')
  , Thought    = mongoose.model('Thought')
  , Reply      = mongoose.model('Reply')
  , Annotation = mongoose.model('Annotation')
  , User       = mongoose.model('User')
  , helpers    = require('../../helpers')
  , emails     = require('../../utils/emails')
  , _          = require('underscore')
  , prompts    = require('./prompts')
  , challenges = require('./challenges');

exports.get = function(req, res) {
    var params = {}, params2 = {}, array1 = null,
        limit  = 0,
        date_sort = null;
        more_limit = 0,
        where = null,
        populate = 'replies';

    var stream_type   = req.query.stream_type   || null,
        thought_id    = req.query.thought_id    || null,
        per_page      = req.query.per_page      || null,
        page          = req.query.page          || null,
        reply_privacy = req.query.reply_privacy || null,
        random        = req.query.random        || null;

    if (thought_id) params._id = thought_id;

    if (random) {
        Thought
            .find({
                privacy: "ANONYMOUS",
                user_id: { $ne: req.user._id } })
            .limit(1)
            .sort("-date")
            .skip(Math.floor(Math.random() * 10))
            .exec(function(err, thought) {
                res.send(thought[0]);
            })
    }
    if (req.user) {

        switch (stream_type) {
            case "other-thoughts":
                helpers.getPublicThoughts(params, function(thoughts) {
                    res.send(thoughts);
                });
                break;
            case "featured":

                var options = {
                    feature: true
                };

                helpers.getPublicThoughts(params, function(thoughts) {
                    res.send(thoughts);
                }, options);
                break;
            case "recommended":
                params.user_id = req.user._id;
                limit = 15;
                date_sort = {date: -1};

                Thought.find( params )
                    .limit(limit)
                    .skip(per_page * (page - 1))
                    .sort(date_sort)
                    .exec(function(err, thoughts) {

                        if (err) console.log(err);

                        // Array that will be sent back that picks from data taken from database
                        var send_thoughts = [];

                        // Send reflections from different intervals of time, so user may reflect back on them
                        if (thoughts && thoughts[5])  send_thoughts.push(thoughts[5]);

                        res.send(send_thoughts[0])
                    });
                break;
        }
    } else {

        var startDate = new Date(new Date().setHours(0,0,0,0));
        startDate.setDate(startDate.getDate()-14);

        params.date = {
            $gte: startDate,
            $lte: new Date() 
        };

        date_sort = {date: -1};
        params.privacy = "ANONYMOUS";

        populate = {
            path: 'replies',
            match: { privacy: reply_privacy }
        };

        Thought.find( params )
            .sort(date_sort)
            .populate(populate)
            .limit(6)
            .exec(function(err, thoughts) {

                if (err) console.log(err);

                res.send(thoughts);

            });

    }

}

/**
 * Get an anonymous entry from someone else for ALL recommendations
 * - TODO: To include an algorithm, which would include your entries as well soon.
 */
var getRecommended = function(user_id, callback) {

    var params = {
        user_id: {
            $ne: user_id
        },
        date: helpers.getDateRange(7),
        privacy: "ANONYMOUS"
    }

    findThought(params, function(thought) {

        callback(thought);

    });
}

var findThought = function(params, callback) {
    Thought.find(params).sort({date: -1 }).exec(function(err, thoughts) {
        if (thoughts.length) {
            thoughts = _.sortBy(thoughts, function(thought) {
                return thought.replies.length;
            })

            callback(thoughts[0]);
        } else {

            delete params.date;

            Thought.find(params).sort({date: -1 }).exec(function(err, thoughts) {
                console.log('No thoughts in the last 7 days.');
                callback(thoughts[0]);
            });
        }
    });
}

exports.post = function(req, res) {

        var prompt_id = "";
        if (typeof req.body.prompt_id != "undefined") {
            prompt_id = req.body.prompt_id;
        }
        prompts.getPromptsById(prompt_id, function(prompt) {

            challenges.getChallenges({_id: req.body.challenge_id}, function(challenges) {

                var thoughtAttr = {
                    title:          req.body.title,
                    description:    req.body.description,
                    expression:     req.body.expression,
                    annotation:     req.body.annotation,
                    privacy:        req.body.privacy,
                    user_id:        req.user._id,
                    link:           req.body.link,
                    tag_ids:        req.body.tag_ids,
                    date:           req.body.date,
                    community:      req.body.communityId
                }

                if (req.body.challenge_id && challenges.length) {
                    thoughtAttr.challenge = challenges[0];
                }

                if (prompt) {
                    thoughtAttr.prompt = prompt;
                }

                var thought = new Thought(thoughtAttr);

                thought.save(function(err) {

                    if (err) console.log(err);

                    Thought.populate(thought, [{path:"prompt"}], function(err,thought) {

                        thought = thought.toObject();

                        helpers.getUserIfPublic(thought, function(user, callback2) {
                            thought.username = user.username;
                            thought.intention = user.intention;
                            callback2();

                        },function() {
                            emails.sendPostActivityEmailToCommunity(thought, req.body.communityId, req.user);
                            res.send(thought);
                        });
                    })

                });
            });
        });

}

var populateRepliesForThought = function(thought, user_id, callback) {

    var populateOptions = {
        path: 'replies',
        match: {
            user_id: user_id
        }
    };

    Thought.populate(thought, populateOptions, function(err,recommended) {
        callback(recommended);
    })

}

exports.put = function(req,res) {
    var options = _.pick(req.body, [
        'privacy',
        'description',
        'archived',
        'feature',
        'flaggedBy'
    ]);

    if (options.flaggedBy) {
        User.findById(req.user._id).exec(function(err, user) {
                Thought.findByIdAndUpdate(req.params.id, {
                        $push: {flaggedBy: req.user._id}
                    }, {'new': true}, function(err,thought) {
                        if (err) console.log(err);
                        res.send(thought);
                    });
            });
    } else {
        Thought.findByIdAndUpdate(req.params.id, options, function(err,thought) {
            if (err) console.log(err);
            res.send(thought);
        });
    }
}

exports.delete = function(req,res) {
    Thought.findById(req.params.id, function(err,thought) {
        thought.remove(function(err) {
            if (err) console.log(err);
            res.send(thought);
        })
    });
}

exports.postReply = function(req, res) {

    var reply_attr = {
        title:          req.body.title,
        description:    req.body.description,
        thought_id:     req.body.thought_id,
        privacy:        req.body.privacy,
        date:           new Date()   
    }

    // Associate non-account replier in entry page to the thought
    if (req.body.experiment) {
        reply_attr.user_id = req.body.user_id;
    } else {
        reply_attr.user_id = req.user._id;
    }

    if (req.body.main_reply_id) {
        reply_attr.main_reply_id = req.body.main_reply_id;
    }


    challenges.getChallenges({_id: req.body.challenge_id}, function(challenges) {

        if (req.body.challenge_id && challenges.length) {
            reply_attr.challenge = challenges[0];
        }

        var reply = new Reply(reply_attr);

        reply.save(function(err, reply) {

            if (err) console.log(err);

            Thought
                .findById(req.body.thought_id)
                .populate('replies')
                .exec(function(err, thought) {

                    emails.sendReplyEmailToEntryWriter(thought, reply);
                    emails.sendReplyToOtherParticipants(thought, reply);
                })

            if (req.body.annotations){
                for (var i = 0; i < req.body.annotations.length; i++) {

                    var annotation = new Annotation({
                        _reply_id:      reply._id,
                        description:    req.body.annotations[i].description,
                        start:          req.body.annotations[i].start,
                        end:            req.body.annotations[i].end,
                        thought_id:     req.body.thought_id,
                        user_id:        req.user._id,
                        date:           new Date()
                    });

                    annotation.replies.push(reply);

                    Thought.findById(req.body.thought_id, function(err, thought) {
                        annotation.thoughts.push(thought);

                        annotation.save(function(err) {

                            if (err) console.log(err);

                            reply.annotations.push(annotation);

                            helpers.getUserIfPublic(reply, function(user, callback3) {
                                reply.username = user.username;
                            }, function() {
                                reply.save(function(err, reply){

                                    var populateOptions = {
                                        path: 'annotations'
                                    };

                                    Reply
                                        .findById(reply._id)
                                        .populate('annotations')
                                        .populate('challenge')
                                        .exec(function(err,reply) {
                                            if (err) console.log(err);

                                            res.send(reply);
                                        })


                                });
                            });
                        });

                    })

                }
            } else {
                reply = reply.toObject();
                helpers.getUserIfPublic(reply, function(user, callback3) {
                    reply.username = user.username;
                    callback3();
                }, function() {
                    res.send(reply);
                });
            }

            exports.saveReplyToThought(req.body.thought_id, reply);

        });

    })

}

exports.saveReplyToThought = function(thought_id, reply) {

    Thought.find({ _id: thought_id }, function(err, thought) {

        var oneThought = thought[0];

        oneThought.replies.push(reply);

        oneThought.save(function(err){

            if (err) console.log(err);

        });
    });
}