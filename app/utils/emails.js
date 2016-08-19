var config   = process.env.PORT ? require('../../config') : require('../../config_settings')
  , sendgrid = require('sendgrid')(
      config.sg_username,
      config.sg_password
    )
  , Q        = require('q')
  , mongoose = require('mongoose')
  , Thought  = mongoose.model('Thought')
  , User     = mongoose.model('User')
  , Community = mongoose.model('Community')
  , userSettings = require('../controllers/api/user_settings')
  , _        = require('underscore')
  , helpers  = require('../helpers')
  , prompts  = require('../controllers/api/prompts');

exports.sendEmail = function(params, callback) {

  var email_params = {
      to:       params.recipients,
      from:     params.from || 'stephen@heroslive.com',
      subject:  params.subject,
      html:     params.html_template
  }

  sendgrid.send(email_params, function(err, json) {
      if (err) {
        return console.error(err);
      }

      if (callback && typeof callback == "function") {
        callback();
      }
  });

}

exports.sendNewEmail = function(email_addresses, params, callback) {
    params = params || {};
    var email = new sendgrid.Email();
    email.setSmtpapiTos(email_addresses);
    email.from = params.from || 'stephen@heroslive.com';
    email.subject = params.subject;
    email.html    = params.html;

    if (params.subs && params.subs.length) {
      _.each(params.subs, function(sub) {

        var subTextArr = sub.text;
        if (!Array.isArray(sub.text)) {
          subTextArr = _.map(email_addresses, function(email) {
            return sub.text;
          });
        }
        email.addSubstitution(sub.type, subTextArr);
      })
    }

    if (params.template_id) {
      email.addFilter('templates', 'template_id', params.template_id);
    }

    sendgrid.send(email, function(err, json) {
      if (err) {
        console.log(err);
      }

      if (callback) {
        callback();
      }
    })
}

exports.sendRegisterEmail = function(email) {

    exports.sendNewEmail([email], {
      subject: "Welcome to Heros!",
      html:    "Welcome to Heros!",
      template_id: 'e7685b73-1f75-47a6-8e9f-ce4959ba7ebe'
    });
}
/**
 * Params
 *   - thought_id: (string) Thought, where reply was made
 */
exports.sendReplyEmailToEntryWriter = function(thought, reply) {

    // Send e-mail notification if you're getting a reply from someone else

    User.findById(thought.user_id, function(err, user) {

      User.findById(reply.user_id, function(err, replier) {

        userSettings.getSettings(user.id, function(userSettings) {

            if (!userSettings.email_reply) {
              return false;
            }

            if (reply.user_id != user.id) {

                var display_name = reply.privacy == "PUBLIC" ? replier.username : "Someone";
                var thought_description = thought.description.length <= 100 ? thought.description : thought.description.substring(0, 100) + '...';

                exports.sendNewEmail([user.email], {
                  subject: display_name + " replied to your entry!",
                  html:    display_name + ' just replied to your entry, "'+thought_description+'"',
                  subs:    [{
                    type: "-reply_description-",
                    text: reply.description
                  }],
                  template_id: '7ab8d627-e0d0-4a39-84e7-ae5bd588450c'
                });
            }
        })
      })
    })
}

exports.sendReplyToOtherParticipants = function(thought, reply) {
  var user_ids = _.pluck(thought.replies, 'user_id');
  user_ids = _.uniq(user_ids);
  user_ids = _.without(user_ids, thought.user_id, reply.user_id);

  // Get full information on the users in the conversation
  User.find({
    '_id': { $in: user_ids}
  }, function(err, users) {

    //Get full information on the person who replied
    User.findById(reply.user_id, function(err, replier) {
      var display_name = reply.privacy == "PUBLIC" ? replier.username : "Someone";
      var thought_description = thought.description.length <= 100 ? thought.description : thought.description.substring(0, 100) + '...';

      exports.sendNewEmail(_.pluck(users, 'email'), {
        subject: display_name + " wrote a reply in a conversation you're part of.",
        html:    display_name + ' just replied to an entry, "'+thought_description+'"',
        subs: [{
          type: "-reply_description-",
          text: reply.description
        }],
        template_id: '7ab8d627-e0d0-4a39-84e7-ae5bd588450c'
      });
    });
  });
}

exports.sendPostActivityEmailToCommunity = function(thought, communityId, user) {

  Community.findById(communityId)
    .populate('members')
    .exec(function(err, community) {
      var emails = _.uniq(_.map(community.members, function(m) {
        return m.email
      }));

      var username;
      if (thought.privacy == "PUBLIC") {
        username = thought.username;
      } else {
        username = "Anonymous";
      }
      var params = {
        recipients: _.without(emails, user.email),
        subject: "There's activity in your community!",
        html_template: username + " just wrote an entry in the "+ community.title + " community. Check it out on Heros!<br /><br />"+thought.description
      }
      exports.sendEmail(params);
  })
}

exports.sendEmailWhenThanked = function(reply) {

  User.findById(reply.user_id, function(err, user) {

    userSettings.getSettings(user.id, function(userSettings) {

      if (!userSettings.email_thanks) {
        return false;
      }

      var params = {
        recipients:    user.email,
        subject:       'Someone thanked your reply!',
        html_template: 'Someone just thanked your reply to their entries. Great job!<br /><br/>Thanks!<br />Heros team'
      }

      exports.sendEmail(params);

    })
  });
}

exports.sendJournalPromptEmail = function(users, domain, callback) {

  var daydiff = function(first, second) {
      return Math.round((second-first)/(1000*60*60*24));
  }
  var date1 = new Date();
  date1.setHours(0,0,0,0);

  var promptsParams = {
      eligible: daydiff(moment("2016-03-12"), date1) % 30
  }

  prompts.getPrompts(promptsParams, function(prompts) {

    var delimiter = " -OR- ";
    var promptDescription = prompts[0].description;
    var indexDelim = promptDescription.indexOf(delimiter);

    var first, second;
    if (indexDelim != -1) {
      first = promptDescription.substring(0, indexDelim);
      second = "<br />OR<br /><br />" + promptDescription.substring(indexDelim + delimiter.length) + "<br />"
    } else {
      first = promptDescription;
      second = "";
    }

    exports.eligibleForPrompts(users, function(users) {

      var userEmails = _.pluck(users, 'email');
      var settingsUrls = _.map(users, function(user) {

        /* Journal Prompts to non-users, labeled NEW */
        return user._id != "NEW" ? (domain + "/settings/" + user._id) : "";
      });

      exports.sendNewEmail(userEmails, {

        from: 'entry@getyourshittogether.co',
        subject: 'Truth or Dare',
        html:    first,
        subs:    [{
          type: "-challenge1-",
          text: second
        }, {
          type: "-prompt1Id-",
          text: prompts[0]._id
        }, {
          type: "-settings-",
          text: settingsUrls
        }],
        template_id: 'f4f96446-8111-4ede-aa5e-a7d1c40768a6'
      }, function() {
        callback();
      });
    });

  })
}

/* Handle two cases: for non-users receiving for first time, or for regulars */
exports.eligibleForPrompts = function (users, callback){

  if (users.length == 1 && users[0]._id == "NEW") {
    callback(users);
  } else {
    userSettings.eligibleUsers(users, 'email_prompts', function(users) {
      callback(users);
    })
  }

}