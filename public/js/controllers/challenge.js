window.rupon = window.rupon || {};
window.rupon.controllers = window.rupon.controllers || {};
window.rupon.utils = window.rupon.utils || {};

(function() {

    var rc = window.rupon.controllers,
        rv = window.rupon.views,
        rm = window.rupon.models,
        rh = window.rupon.helpers;

    rc.startChallengePage = function(params) {
      rupon.account_info         = params.user || {};
      rupon.account_info.user_id = params.user._id;

      mixpanel.track('view-challenge', {
        id: params.challenge._id,
        title: params.challenge.title
      });
      rc.setSettings(params.settings, rupon.account_info.username);
      
      var challengePage = new rv.ChallengeView({
        model: new Backbone.Model(params.challenge),
        extended: true,
        isCreator: params.challenge.creator && (params.challenge.creator._id == params.user._id),
        communities: params.myCommunities
      })

      var frequencyView = new rv.FrequencyView({
        collection: new Backbone.Collection([]),
        myCommunities: params.myCommunities,
        showCommunity: true,
        myChallenges: params.myChallenges,
        showChallenges: true
      });

      $("#container .main-view-container").append(challengePage.$el);
      $("#container .side-view-container").append(frequencyView.$el);
    }
})();