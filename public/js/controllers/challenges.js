window.rupon = window.rupon || {};
window.rupon.controllers = window.rupon.controllers || {};
window.rupon.utils = window.rupon.utils || {};

(function() {

    var rc = window.rupon.controllers,
        rv = window.rupon.views,
        rm = window.rupon.models,
        rh = window.rupon.helpers;

    rc.startChallengesPage = function(params) {
      rupon.account_info         = params.user || {};
      rupon.account_info.user_id = params.user._id;

      mixpanel.track('view-challenges');

      rc.setSettings(params.settings, rupon.account_info.username);

      var challenges = _.filter(params.challenges, function(challenge) {
        return !challenge.flaggedBy.length;
      });

      var challengesOne = params.challengesOne;

      var challenges1 = _.filter(challengesOne, function(c) {return _.contains(c.subjects, 'meditation')});
      var challenges2 = _.filter(challengesOne, function(c) {return _.contains(c.subjects, 'adventure')});
      var challenges3 = _.filter(challengesOne, function(c) {return _.contains(c.subjects, 'relationships')});
      var challenges4 = _.filter(challengesOne, function(c) {return _.contains(c.subjects, 'self-esteem')});
      var challenges5 = _.filter(challengesOne, function(c) {return _.contains(c.subjects, 'addiction')});
      var challenges6 = _.filter(challengesOne, function(c) {return _.contains(c.subjects, 'social')});

      var challengesPage = new rv.MainChallengesView({
        challenges: challenges,
        prompts:    params.prompts,
        collectionFeatured: new rm.challengesCollection(challenges),
        collection1: new rm.challengesCollection(challenges1),
        collection2: new rm.challengesCollection(challenges2),
        collection3: new rm.challengesCollection(challenges3),
        collection4: new rm.challengesCollection(challenges4),
        collection5: new rm.challengesCollection(challenges5),
        collection6: new rm.challengesCollection(challenges6),

      });

      var frequencyView = new rv.FrequencyView({
        collection: new Backbone.Collection([]),
        myCommunities: params.myCommunities,
        showCommunity: true,
        myChallenges: params.myChallenges,
        showChallenges: true
      });

      $("#container").append('<div class="main-view-container main-module"></div><div class="side-view-container"></div>');
      $("#container .main-view-container").append(challengesPage.$el);
      $("#container .side-view-container").append(frequencyView.$el);
    }
})();