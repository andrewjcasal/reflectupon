var config          = process.env.PORT ? require('../../config') : require('../../config_settings'),
    passport        = require('passport'),
    util            = require('util'),
    mongoose        = require('mongoose'),
    LocalStrategy   = require('passport-local').Strategy,
    forgot          = require('../../forgot'),
    fs              = require('fs'),
    helpers         = require('../helpers'),
    prompts         = require('./api/prompts'),
    communities     = require('./api/communities'),
    challenges      = require('./api/challenges'),
    userSettings    = require('./api/user_settings'),
    sendgrid        = require('sendgrid')(
        config.sg_username,
        config.sg_password
    ),
    emails          = require('../utils/emails'),
    moment          = require('moment'),

    User        = mongoose.model('User'),
    Thought     = mongoose.model('Thought'),
    UserMessage = mongoose.model('UserMessage'),
    Community   = mongoose.model('Community'),
    UserSettings = mongoose.model('UserSettings'),
    _ = require('underscore'),
    Q = require('q');
    SALT_WORK_FACTOR = 10;

exports.home = function(req, res, dates) {
    Thought
        .where('user_id').ne(req.user._id)
        .where('description').ne("")
        .sort('-date')
        .limit(5)
        .exec(function(err, thoughts) {

            if (thoughts) {

                for (var x = 0; x < thoughts.length; x++) {
                    if (thoughts[x] && thoughts[x].description) {
                        thoughts[x].description = thoughts[x].description.substr(0,40) + "...";
                    }
                }

                var is_mobile = false,
                    user_id   = req.user._id;

                dates.get(is_mobile, user_id, function(frequency) {

                    User.findById(req.user._id)
                        .populate('communities')
                        .populate({
                          path: 'user_challenges.challenge',
                          model: 'Challenge'
                        }).exec(function(err, user) {

                        helpers.getPublicThoughts({currentUser: user}, function(popular_thoughts) {

                            userSettings.getSettings(user_id, function(userSettings) {

                                var daydiff = function(first, second) {
                                    return Math.round((second-first)/(1000*60*60*24));
                                }
                                var date1 = new Date();
                                date1.setHours(0,0,0,0);

                                var promptsParams = {
                                    eligible: daydiff(moment("2016-03-12"), date1) % 30
                                }

                                prompts.getPrompts(promptsParams, function(prompts) {


                                    communities.getCommunities({}, function(communities) {
                                    challenges.getChallenges({}, function(challenges) {
                                        var current = _.filter(user.user_challenges, function(uc) {
                                            return uc.status == 'started';
                                        });

                                        current = _.map(current, function(com) {
                                            return com.challenge;
                                        });

                                        var userAttrs = _.pick(user, [
                                            'username',
                                            '_id',
                                            'email',
                                            'intention',
                                            'avatar_url'
                                        ]);
                
                                        var attr = {
                                            user:         JSON.stringify(userAttrs),
                                            topBar:       true,
                                            signout:      true,
                                            thoughts:     thoughts,
                                            landing_page: false,
                                            is_admin:     req.user.email == 'andrewjcasal@gmail.com' || req.user.email == 'stranovich@gmail.com',
                                            frequency:    JSON.stringify(frequency),
                                            popular:      JSON.stringify(popular_thoughts),
                                            settings:     JSON.stringify(userSettings),
                                            communities:  JSON.stringify(communities),
                                            myCommunities: JSON.stringify(_.where(user.communities, {approved: true})),
                                            myChallenges: JSON.stringify(current),
                                            challenges:   JSON.stringify(challenges)
                                        };

                                        if (prompts.length) {
                                            attr.prompt = JSON.stringify({
                                                id: prompts[0].id,
                                                description: prompts[0].description
                                            })
                                        }

                                        res.render('home', attr);
                                    }); });

                                })
                            })
                        })
                    });

                });
            }

    })

};

exports.sortCommunities = function(communities) {
    return _.sortBy(communities, function(com) {
        return -com.members.length;
    })
};

exports.communities = function(req, res) {
    userSettings.getSettings(req.user._id, function(userSettings) {

        communities.getCommunities({}, function(communities) {

            communities = exports.sortCommunities(communities);

            User.findById(req.user._id)
                .populate('communities')
                .populate({
                  path: 'user_challenges.challenge',
                  model: 'Challenge'
                }).exec(function(err, user) {

                var current = _.filter(user.user_challenges, function(uc) {
                    return uc.status == 'started';
                });

                current = _.map(current, function(com) {
                    return com.challenge;
                });

                var userAttrs = _.pick(req.user, [
                    'username',
                    '_id',
                    'email',
                    'intention',
                    'avatar_url'
                ]);

                res.render('communities', _.defaults({
                    user: JSON.stringify(userAttrs),
                    settings: JSON.stringify(userSettings),
                    communities: JSON.stringify(communities),
                    signout: true,
                    myCommunities: JSON.stringify(user.communities),
                    myChallenges: JSON.stringify(current)
                }, pageDefaults))
            });

        });
    });
}

exports.community = function(req, res) {

    var name = req.params.name;
    var user_id = req.user._id;

    communities.getCommunities({
        title:name
    }, function(communities) {

        challenges.getChallenges({}, function(challenges) {

            var community = communities[0];

            User.findById(req.user._id)
                .populate('communities')
                .populate({
                  path: 'user_challenges.challenge',
                  model: 'Challenge'
                }).exec(function(err, user) {

                    community = community.toObject();
                    community.communityChallenges = _.map(community.communityChallenges, function(derp) {
                        if (derp.challenge) {
                            var challenge = helpers.startedChallengeStatus([derp.challenge], user.user_challenges);
                            derp.challenge = challenge[0];
                        }
                        return derp;
                    })

                    helpers.getPublicThoughts({
                        community: community,
                        currentUser: user
                    }, function(popular_thoughts) {

                        userSettings.getSettings(user_id, function(userSettings) {

                            var current = _.filter(user.user_challenges, function(uc) {
                                return uc.status == 'started';
                            });

                            current = _.map(current, function(com) {
                                return com.challenge;
                            });

                            var userAttrs = _.pick(user, [
                                'username',
                                '_id',
                                'email',
                                'intention',
                                'avatar_url'
                            ]);

                            res.render('community', {
                                settings: JSON.stringify(userSettings),
                                landing_page: false,
                                topBar: true,
                                is_admin: false,
                                signout: true,
                                user: JSON.stringify(userAttrs),
                                communities: JSON.stringify(user.communities),
                                challenges: JSON.stringify(challenges),
                                community: JSON.stringify(community),
                                popular: JSON.stringify(popular_thoughts),
                                settings: JSON.stringify(userSettings),
                                myCommunities: JSON.stringify(user.communities),
                                myChallenges: JSON.stringify(current)
                            });
                        })
                });

            });

        });

    })
};

exports.challenges = function(req, res) {

    userSettings.getSettings(req.user._id, function(userSettings) {
        challenges.getChallenges({featured: true}, function(challengesA) {
            challenges.getChallenges({subjects: {'$in':['meditation', 'adventure','relationships','self-esteem','addiction','social']}}, function(challengesOne) {

            prompts.getPrompts({}, function(prompts) {

                User.findById(req.user._id)
                    .populate({
                      path: 'user_challenges.thought',
                      model: 'Thought'
                    })
                    .populate({
                      path: 'user_challenges.challenge',
                      model: 'Challenge'
                    })
                    .populate('communities')
                    .exec(function(err, user) {

                    var userAttrs = _.pick(req.user, [
                        'username',
                        '_id',
                        'email',
                        'intention',
                        'avatar_url'
                    ]);

                    challengesA = helpers.startedChallengeStatus(challengesA, user.user_challenges);
                    challengesOne = helpers.startedChallengeStatus(challengesOne, user.user_challenges);

                    var current = _.filter(user.user_challenges, function(uc) {
                        return uc.status == 'started';
                    });

                    current = _.map(current, function(com) {
                        return com.challenge;
                    });

                    res.render('challenges', {
                        user: JSON.stringify(userAttrs),
                        settings: JSON.stringify(userSettings),
                        landing_page: false,
                        topBar: true,
                        is_admin: false,
                        signout: true,
                        challenges: JSON.stringify(challengesA),
                        prompts: JSON.stringify(prompts),
                        myCommunities: JSON.stringify(user.communities),
                        myChallenges: JSON.stringify(current),
                        challengesOne: JSON.stringify(challengesOne)
                    });
                });
            })

            });

        })
    });
}

var pageDefaults = {
    landing_page: false,
    topBar: true,
    is_admin: false,
    signout: false
}

exports.challenge = function(req, res) {

    userSettings.getSettings(req.user._id, function(userSettings) {

        challenges.getChallenges({_id: req.params.id}, function(challenges) {

            User.findById(req.user._id)
                .populate('communities')
                .populate({
                  path: 'user_challenges.challenge',
                  model: 'Challenge'
                })
                .populate({
                  path: 'user_challenges.thought',
                  model: 'Thought'
                }).exec(function(err, user) {

                challenges = helpers.startedChallengeStatus(challenges, user.user_challenges);

                var current = _.filter(user.user_challenges, function(uc) {
                    return uc.status == 'started';
                });

                current = _.map(current, function(com) {
                    return com.challenge;
                });

                var userAttrs = _.pick(req.user, [
                    'username',
                    '_id',
                    'email',
                    'intention',
                    'avatar_url'
                ]);
                res.render('challenge', _.defaults({
                    user: JSON.stringify(userAttrs),
                    settings: JSON.stringify(userSettings),
                    challenge: JSON.stringify(challenges[0]),
                    signout: true,
                    myCommunities: JSON.stringify(user.communities),
                    myChallenges: JSON.stringify(current)
                }, pageDefaults));
            });
        })
    });
}

exports.profile = function(req, res) {

    User.findOne({username: req.params.name})
        .populate('communities')
        .populate({
          path: 'user_challenges.challenge',
          model: 'Challenge'
        }).exec(function(err, user) {

            communities.getCommunities({creator: user}, function(communities) {

                challenges.getChallenges({creator: user}, function(created) {

                    var completed = [];
                    if (user && user.user_challenges) {
                        completed = _.filter(user.user_challenges, function(uc) {
                            return uc.status == 'completed';
                        });

                        completed = _.map(completed, function(com) {
                            return com.challenge;
                        });
                    }

                    var current = [];
                    if (user && user.user_challenges) {
                        current = _.filter(user.user_challenges, function(uc) {
                            return uc.status == 'started';
                        });

                        current = _.map(current, function(com) {
                            return com.challenge;
                        });
                    }

                    userSettings.getSettings(req.user._id, function(userSettings) {

                        User.find({username: req.params.name}, function(err, profile) {
                            var userAttrs = _.pick(req.user, [
                                'username',
                                '_id',
                                'email',
                                'intention',
                                'avatar_url'
                            ]);

                            var profileAttrs = _.pick(profile[0], [
                                'username',
                                '_id',
                                'email',
                                'intention',
                                'personal_url',
                                'avatar_url'
                            ]);

                            res.render('profile', _.defaults({
                                user: JSON.stringify(userAttrs),
                                settings: JSON.stringify(userSettings),
                                profile: JSON.stringify(profileAttrs),
                                completed: JSON.stringify(completed),
                                current: JSON.stringify(current),
                                signout: true,
                                communities: JSON.stringify(communities),
                                created: JSON.stringify(created),
                                myCommunities: JSON.stringify(user.communities),
                                myChallenges: JSON.stringify(current)
                            }, pageDefaults));
                        })
                    });
                })

            });
    })
}

exports.journal = function(req, res) {
    res.render('journal', {
        user: req.user,
        topBar: true,
        signout: true,
        landing_page: false,
        is_admin: req.user.username == 'andrew'
    });
};

exports.entry = function(req, res) {
    var params = {};
    if (req.params.id) {
        params._id = req.params.id;
    }
    helpers.getPublicThoughts(params, function(thoughts) {
        if (thoughts.length) {

            User.findById(thoughts[0].user_id, function(err, user) {

                res.render('entry', {
                    user: req.user,
                    topBar: true,
                    signout: false,
                    landing_page: false,
                    is_admin: false,
                    thought: JSON.stringify(thoughts),
                    userMade: user.status == "single" || user.username.indexOf('claim') == -1
                });
            })
        }
    });
};

exports.settings = function(req, res) {

    userSettings.getSettings(req.params.id, function(userSettings, user) {

        res.render('settings', {
            settings: JSON.stringify(userSettings),
            landing_page: false,
            topBar: true,
            is_admin: false,
            signout: false,
            user: user
        });
    });
}

exports.reports = function(req, res) {
    res.render('reports', { user: req.user, topBar: true, signout: true, landing_page: false, is_admin: req.user.username == 'andrew' });
};

exports.newUser = function(req, res) {
    communities.getCommunities({
        title: {$in: ['Entrepreneurs', 'Body Image', 'Social Anxiety']}
    }, function(communities) {

        res.render('new-user', {
            topBar: false,
            body: true,
            landing_page: false,
            is_admin: req.user.username == 'andrew',
            communities: JSON.stringify(communities)
        });
    })
};

exports.newUserPost = function(req, res) {
    User.findById(req.user._id, function(err, user) {
        Community.find({
            '_id': { $in: req.body.communities}
        }, function(err, comms){
            user.communities = comms;
            user.welcome_at = new Date();
            user.save(function(err, user) {
                res.send({success: 1})
            });
        });
    })
}

exports.getIndex = function(req, res) {

    var options = { user: req.user, signout: false, topBar: true, is_admin: false, landing_page: true };

    if (req.session.messages) {
        options.message = req.session.messages.message;
        req.session.messages = {};
    }

    res.render('index', options);
};

exports.postlogin = function(req, res, next) {

    req.body.username = req.body.username.trim().toLowerCase();

    passport.authenticate('local', function(err, user, info) {
        if (err) { return next(err) }
        if (!user) {
            req.session.messages =  {message: 'Incorrect username or password'};
            return res.redirect('/')
        }
        req.logIn(user, function(err) {

            if (err) { return next(err); }
            return res.redirect('/home');
        });
    })(req, res, next);
};

exports.logout = function(req, res) {
    req.logout();
    res.redirect('/');
};

exports.postregister = function(req, res, next) {

    /* single entry page experiment */
    if (req.body.thoughtId) {
        Thought.findById(req.body.thoughtId, function(err, thought) {
            User.findById(thought.user_id, function(err, user) {
                user.username = req.body.username;
                user.email = req.body.email;
                user.password = req.body.password;
                user.status = "single";

                user.save(function(err, user_saved) {
                    req.logIn(user, function(err) {
                        if (err) { return next(err); }
                        return res.redirect('/home');
                    });
                })
            })
        })

    /* proper sign up after using email prompt */
    } else if (req.body.nonUserSignedUp) {
        User.findOne({
            email:  req.body.email
        }, function(err, user) {
            user.username = req.body.username;
            user.password = req.body.password;
            user.status = "emailUser";

            user.save(function(err, user_saved) {
                req.logIn(user, function(err) {
                    if (err) { return next(err); }
                    return res.redirect('/home');
                });
            })
        })
    } else {

    /* regular user registration flow */

    User.findOne({username: req.body.username}, function(err, user_check) {

        if (user_check) {

            req.session.messages = {message: 'Username already exists'};
            return res.redirect('/');

        } else {

            var user = new User({ 
                username: req.body.username,
                email: req.body.email,
                password: req.body.password,
                status: "beta1"
            });

            user.save(function(err, user_saved) {
                if(err) {
                    console.log(err);
                } else {

                    var userSettings = new UserSettings({
                        user: user
                    })

                    userSettings.save(function(err) {
                        if (err) console.log(err);
                    });

                    emails.sendRegisterEmail(req.body.email);

                    passport.authenticate('local', function(err, user, info) {
                        if (err) { return next(err) }
                        if (!user) {
                            req.session.messages =  [info.message];
                            return res.redirect('/login')
                        }
                        req.logIn(user, function(err) {
                            if (err) { return next(err); }
                            return res.redirect('/home');
                        });
                    })(req, res, next);
                }
            });

        }
    })

    }

};

exports.registerEmail = function(email) {
    sendgrid.send({
        to: email,
        from: 'andrewjcasal@gmail.com',
        subject: 'Welcome to Heros!',
        html: 'Thanks for your interest! Stay tuned for further updates.<br /><br/>Thanks!<br />Heros team'
    }, function(err, json) {
        if (err) { return console.error(err); }
        console.log(json);
    });
}
exports.checkPassword = function(req, res, next) {
    req.body.username = req.body.username.trim().toLowerCase();

    passport.authenticate('local', function(err, user, info) {
        if (err) { return next(err) }

        if (!user) {
            res.send({status: 'invalid'});
        } else {
            res.send({status: 'valid'});
        }
    })(req, res, next);
};
exports.postRegBetaUser = function(req, res, next) {

    var emailAddress = req.body.email;

    if (!validateEmail(emailAddress)) {
        return false;
    }

    User.findOne({email: emailAddress}, function(err, user_check) {

        if (user_check) {
            res.send({"msg": "exists"});
            return false;

        }

        var username = Math.floor((Math.random() * 1000000) + 1);

        var user = new User({
            username: username,
            email:    emailAddress,
            password: "default",
            status:   "input"
        });

        user.save(function(err, user_saved) {
            if(err) {
                console.log(err);
            } else {

                var email = new sendgrid.Email();
                email.addTo(emailAddress);
                email.from = 'noreply@heros.live';
                email.subject = "Stay tuned for further updates!";
                email.html = "Thanks for your interest. We'll get in touch with you soon regarding our newsletter and releases.<br />" +
                    "<br />Thanks,<br />" +
                    "The Team at Heros<br />" +
                    "<a href='www.heros.live'>www.heros.live</a>";

                email.addFilter('templates', 'template_id', '25bd6eaf-6b06-4f76-a255-eb5037b0ffe7');
                sendgrid.send(email, function(err, json) {
                });
                res.send({"msg": "success"});
            }
        });

    });

}

var validateEmail = function(email) {
    var re = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    return re.test(email);
}

exports.postForgot = function(req, res, next) {

    var email = req.body.email;

    var user = User.findOne({ email: email }, function(err, user) {
        if (user) {
            var email_options = {
                sender:   "andrewjcasal@gmail.com",
                receiver: email,
                subject:  "Forgot your password?",
                text:     'Hey,<br /><br />It seems like you might have forgotten your password. Click <a href="{{ verification_link }}">here</a> to retrieve it.<br /><br/>'+

                    "The Team at Heros<br />" +
                    "<a href='www.heroslive.com'>www.heroslive.com</a>"
            };

            var reset = forgot.forgot( email_options, function(err) {

                if (err) res.end('Error sending message.')

            });

            reset.on('request', function(req_, res_) {
                req_.session.reset = { email : email, id : reset.id };

                fs.createReadStream(__dirname + '/../views/forgot.ejs').pipe(res_);
            })

        } else {
            console.log("does not contain the email address");
        }
    });

    res.send({"msg": "success"});
};

exports.postReset = function(req, res, next) {
    var password = req.body.password;
    var confirm = req.body.confirm;

    var email = req.session.reset.email;
    forgot.forgot.expire(req.session.reset.id)

    if (password == confirm && email) {
        var user = User.findOne({ email: email}, function(err, user) {
            if (user) {
                user.password = password;
                user.save(function() {
                    res.redirect('/?password-reset=1');
                });
            }
        })
    }

}

exports.checkEmail = function(req, res) {
    var email = req.body.email;

    User.findOne({
        email: { $regex : new RegExp(email, "i") },

        /*  Non-user prompt email 'registers' person, so they shouldn't get this message */
        status: { $ne: 'email'}
    }, function(err, user) {
        if (user) {
            res.send({msg: "already exists"})
        } else {
            res.send({msg: "success"})
        }
    });
}

exports.checkUsername = function(req, res) {
    var username = req.body.username;
    User.findOne({ username: { $regex : new RegExp(username, "i") } }, function(err, user) {
        if (user) {
            res.send({msg: "already exists"})
        } else {
            res.send({msg: "success"})
        }
    });
}

/* Find a user, and if not, just create one!
   Used for sending email entries to site from non-users
   If user was created, we send true as second param
   */
exports.getMakeUser = function(email, callback) {
    User.findOne({email: email}, function(err, user) {

        if (!user) {

            var user = new User({
                username: 'emailUser' + Math.floor((Math.random() * 1000000) + 1),
                email:    email,
                password: "default",
                status:   "email"
            });

            user.save(function(err, user_saved) {
                console.log('user_id');
                console.log(user_saved._id);
                callback(user, true);
            });

        } else {
            callback(user, false);
        }
    })
}

passport.serializeUser(function(user, done) {
    done(null, user.id);
});

passport.deserializeUser(function(id, done) {
    User.findById(id, function (err, user) {
        done(err, user);
    });
});

passport.use(new LocalStrategy(function(email, password, done) {

    /* validate e-mail */
    var re = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    var params = re.test(email) ? {email: email} : {username: email};

    User.findOne(params, '+password', function(err, user) {
        if (err) { return done(err); }
        if (!user) { return done(null, false, { message: 'Unknown user ' + email }); }
        user.comparePassword(password, function(err, isMatch) {
            if (err) return done(err);
            if(isMatch) {
                return done(null, user);
            } else {
                return done(null, false, { message: 'Invalid password' });
            }
        });
    });
}));