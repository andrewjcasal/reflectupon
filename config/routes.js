var mongoose        = require('mongoose')
  , async           = require('async')
  , auth            = require('./middlewares/authorization')
  , _               = require('underscore')
  , $               = require('jquery')(require('jsdom').jsdom().parentWindow)
  , emails          = require('../app/utils/emails')
  , helpers          = require('../app/helpers')
  , user_routes      = require('../app/controllers/user')
  , thought_routes   = require('../app/controllers/thought')
  , superuser_routes = require('../app/controllers/superuser')
  , dates            = require('../app/controllers/api/dates')
  , thoughts         = require('../app/controllers/api/thoughts')
  , replies          = require('../app/controllers/api/replies')
  , reports          = require('../app/controllers/api/reports')
  , superuser        = require('../app/controllers/api/superuser')
  , prompts          = require('../app/controllers/api/prompts')
  , communities      = require('../app/controllers/api/communities')
  , challenges       = require('../app/controllers/api/challenges')
  , profile          = require('../app/controllers/api/profile')
  , userSettings     = require('../app/controllers/api/user_settings')
  , aws             = require('aws-sdk')

var Thought     = mongoose.model('Thought'),
    Reply       = mongoose.model('Reply'),
    Annotation  = mongoose.model('Annotation'),
    User        = mongoose.model('User'),
    userMessage = mongoose.model('UserMessage'),
    Topic       = mongoose.model('Topic'),
    Prompt      = mongoose.model('Prompt');

module.exports = function(app) {

    app.get( '/',                                    user_routes.getIndex);
    app.get( '/home',   auth.ensureAuthenticated,    function(req, res) {
        user_routes.home(req, res, dates);
    });
    app.get('/challenges',      auth.ensureAuthenticated, user_routes.challenges);
    app.get('/challenge/:id',   auth.ensureAuthenticated, user_routes.challenge);
    app.get('/communities',     auth.ensureAuthenticated, user_routes.communities);
    app.get('/community/:name', auth.ensureAuthenticated, user_routes.community);
    app.get('/profile/:name',   auth.ensureAuthenticated, user_routes.profile)
    app.get( '/reports',auth.ensureAuthenticated,    user_routes.reports);
    app.get( '/entry/:id',                           user_routes.entry);
    app.get( '/new-ux', auth.ensureAuthenticated,    user_routes.newUser);
    app.post('/new-user-communities', auth.ensureAuthenticated, user_routes.newUserPost);
    app.post('/login',                               user_routes.postlogin);
    app.get( '/logout',                              user_routes.logout);
    app.post('/register',                            user_routes.postregister);
    app.post('/register-beta',                       user_routes.postRegBetaUser);
    app.post('/check-password',                      user_routes.checkPassword);
    app.post('/forgot',                              user_routes.postForgot);
    app.post('/reset',                               user_routes.postReset);
    app.post('/check-email',                         user_routes.checkEmail);
    app.post('/check-username',                      user_routes.checkUsername);
    app.get( '/twiml',                               thought_routes.getTwiml);
    app.get( '/superuser', auth.ensureAuthenticated, superuser_routes.get);
    app.get( '/settings/:id',                        user_routes.settings);

    app.get('/api/stream',         helpers.getStream);
    app.get('/api/thought',        thoughts.get);
    app.post('/api/thought',       thoughts.post);
    app.put('/api/thought/:id',    thoughts.put);
    app.delete('/api/thought/:id', thoughts.delete);

    app.post('/api/thought/:thought/reply', thoughts.postReply);
    app.get('/api/reply', auth.ensureAuthenticated, replies.get);
    app.patch('/api/reply/:reply_id',               replies.patch);
    app.delete('/api/reply/:id',                    replies.delete);

    app.post('/api/prompts',       prompts.post);
    app.get('/api/prompts',        prompts.get);
    app.put('/api/prompts/:id',    prompts.put);
    app.delete('/api/prompts/:id', prompts.delete);

    app.post('/api/communities',    communities.post);
    app.put('/api/communities/:id', communities.put);
    app.delete('/api/communities/:id', communities.delete);
    app.post('/api/communities/:id/members/:memberId', communities.postMember);

    app.put('/api/communities/:id/challenges/:challengePos', communities.putChallenge);

    app.get('/api/challenges',      challenges.get);
    app.post('/api/challenges',     challenges.post);
    app.put('/api/challenges/:id',  challenges.put);
    app.delete('/api/challenges/:id', challenges.delete);

    app.post('/api/challenges/:id/thought', challenges.postThought);
    app.put('/api/challenges/:id/related/:challengeId', challenges.putRelated);
    app.delete('/api/challenges/:id/related/:challengeId', challenges.deletedRelated);

    app.post('/api/user_settings', auth.ensureAuthenticated, userSettings.post);
    app.get('/api/user_settings',  auth.ensureAuthenticated, userSettings.get);
    app.put('/api/user_settings',  userSettings.put);

    app.put('/api/profile', auth.ensureAuthenticated, profile.put);

    app.get('/api/reports',        reports.get);

    app.get('/api/frequency', function(req, res) {

        var is_mobile = req.query.mobile,
            user_id   = req.user._id;

        dates.get(is_mobile, user_id, function(frequency) {
            res.send(frequency);
        });
    });

    app.post('/api/send_email', function(req,res) {

        var params = {
            status: 'beta1'
        };

        User.find(params, function(err, users) {

            emails.sendJournalPromptEmail(users, req.headers.origin, function() {
                res.send("success");
            });

        })
    });

    app.post('/api/send_email_indl', function(req, res) {

        var email = req.body.email_address;

        var users = [{
            email: email,
            _id:   'NEW'
        }]

        emails.sendJournalPromptEmail(users, req.headers.origin, function() {
            res.send("success");
        });
    })

    app.get('/api/active_users', superuser.active_users.get)

    app.get('/api/users', auth.ensureAuthenticated, function(req,res) {

        var options = {};

        //if (req.body.check_username) options.check_username

        User
            .find({})
            .sort({'created_at': -1})
            .exec(function(err, users) {

            var send_users = [];

            async.eachSeries(users, function(user, callback) {
                var send_user = user.toObject();

                Thought.find({user_id: send_user._id}).count().exec(function(err,count) {
                    send_user.num_thoughts = count;
                    send_users.push(send_user);
                    callback();
                });
            }, function(err){
                send_users = send_users;
                res.send(send_users);
            });

        });

    });

    app.delete('/api/users/:id', auth.ensureAuthenticated, function(req,res) {
        User.findById(req.params.id, function(err,user) {
            user.remove(function(err) {
                if (err) console.log(err);
                res.send(user);
            })
        });
    });

    app.get('/api/user_messages', function(req,res) {
        var user_id = req.query.user_id;
        userMessage.find({user_id: user_id}, function(err,user_messages) {

            if (!user_messages.length) {
                var user_message_data = {
                    message_id: "1",
                    user_id: user_id
                };

                var user_message = new userMessage(user_message_data);
                user_message.save(function (err, user_message) {
                    if (err) return console.error(err);
                    res.send(user_message);
                });

            } else {

                res.send(user_messages);

            }

        })
    });

    app.put('/api/user_messages/:user_message', function(req,res) {
        userMessage.findById(req.params.user_message, function(err,message) {
            message.dismissed = req.body.dismissed;
            message.save(function(err) {
                res.send(message);
            });
        })
    });

    app.get('/api/thought/:thought/reply/', function(req, res) {

        Reply.find({ thought_id: req.params.thought }, function(err, replies) {

            res.send(replies);

        });
    });

    app.post('/api/thought/:thought/reply/:reply/annotation/', function(req, res) {

        var annotation = new Annotation({
            description:    req.body.description,
            thought_id:     req.body.thought_id,
            reply_id:       req.body.reply_id,
            user_id:        req.user._id,
            date:           new Date()
        });

        Reply.findById(req.body.reply_id, function(err, reply) {
            annotation.replies.push(reply);

            annotation.save(function(err) {

                if (err) console.log(err);

                res.send( req.body );

            });
        })

    });

    app.get('/api/annotations', function(req, res) {
        Annotation.find({
            thought_id: req.query.thought_id
        }, function(err, annotations) {
            res.send(annotations)
        })
    });

    app.get('/account', auth.ensureAuthenticated, function(req,res) {
        res.send( req.user );
    });

    var topics_uri = '/api/topics';

    app.post(topics_uri, function(req, res) {

        var topic = new Topic({
            name: req.body.name,
            date: new Date()
        });

        topic.save(function(err) {
            res.send(topic);
        });
    });

    app.get(topics_uri, function(req, res) {
        Topic.find({}, function(err, topics) {
            res.send(topics);
        });
    });

    app.delete(topics_uri +"/:id", function(req, res) {
        Topic.findById(req.params.id, function(err,topic) {
            topic.remove(function(err) {
                if (err) console.log(err);
                res.send(topic);
            })
        });
    });

    app.post('/api/email', function(req, res) {

        var body = req.body.html;

        var idIndex = body.indexOf('[ID:');
        var idTag = "";

        if (parseInt(idIndex) != -1) {
            var startSubstr = body.substr(idIndex + 5);
            var endIdIndex = startSubstr.indexOf(']');
            idTag = startSubstr.substring(0, endIdIndex);
        }

        $('body').html(body);
        $('body .gmail_signature').remove();

        var nextHtml = $('body [dir=ltr]').html();
        $('body').html(nextHtml);

        $('body div').each(function() {
            var text = $(this).html();

            if (text != '<br>') {
                $(this).replaceWith('<br>' + text);
            } else {
                $(this).replaceWith(text);
            }
        });
        nextHtml = $('body').html()

        var textIndex = nextHtml.indexOf('<br clear="all">');
        if (textIndex != -1) {
            nextHtml = nextHtml.substring(0, textIndex);
        }

        var email = JSON.parse(req.body.envelope).from;

        user_routes.getMakeUser(email, function(user, userCreated) {
            var thoughtAttr = {
                description: nextHtml,
                privacy:     'PUBLIC',
                user_id:     user._id,
                date:        new Date()
            }

            prompts.getPromptIfId(idTag, function(prompt) {
                thoughtAttr.prompt = prompt;
            }, function() {

                var thought = new Thought(thoughtAttr);

                thought.save(function(err) {

                    if (userCreated) {
                        emails.sendNewEmail([user.email], {
                          from: "entry@getyourshittogether.co",
                          subject: "Thanks for your entry!",
                          html:    "http://www.getyourshittogether.co/?beta-signup=1&new-user-email=" + user.email,
                          template_id: "acc92f29-e849-43fb-a885-409e411e4b5a"
                        });
                    }

                    res.send('success');
                });
            });
        });
    })

    app.get('/sign-s3', function (req, res) {
        aws.config.update({
            accessKeyId: "AKIAIO6MYXA7IR7WG6GA",
            secretAccessKey: "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" 
        });
      var s3 = new aws.S3();
      var fileName = req.query['file-name'];
      var fileType = req.query['file-type'];
      var imageType = req.query['image-type'];
      var s3Params = {
        Bucket: 'avatars-images',
        Key: fileName,
        Expires: 60,
        ContentType: fileType,
        ACL: 'public-read'
      };

      s3.getSignedUrl('putObject', s3Params, function(err, data) {
        if(err){
          console.log(err);
          return res.end();
        }
        var returnData = {
          signedRequest: data,
          url: 'https://s3-us-west-2.amazonaws.com/avatars-images/'+fileName
        };
        res.write(JSON.stringify(returnData));
        res.end();
      });
    });

}