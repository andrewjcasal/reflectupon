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
      var challengesTwo = params.challengesTwo;
      var challengesThree = params.challengesThree;

      var challengesPage = new rv.MainChallengesView({
        challenges: challenges,
        prompts:    params.prompts,
        collectionFeatured: new rm.challengesCollection(challenges),
        collectionOne: new rm.challengesCollection(challengesOne),
        collectionTwo: new rm.challengesCollection(challengesTwo),
        collectionThree: new rm.challengesCollection(challengesThree)
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