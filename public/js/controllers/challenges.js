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
      rc.setSettings(params.settings, rupon.account_info.username);

      var challengesPage = new rv.MainChallengesView({
        challenges: params.challenges,
        prompts:    params.prompts,
        collection: new rm.challengesCollection(params.challenges.concat(params.prompts))
      });

      $("#container").append('<div class="main-view-container module"></div><div class="side-view-container"></div>');
      $("#container .main-view-container").append(challengesPage.$el);
    }
})();