window.rupon = window.rupon || {};
window.rupon.controllers = window.rupon.controllers || {};
window.rupon.utils = window.rupon.utils || {};

(function() {

    var rc = window.rupon.controllers,
        rv = window.rupon.views,
        rm = window.rupon.models,
        rh = window.rupon.helpers;

    rc.startCommunityPage = function(params) {
      mixpanel.track('view-community', {
        id: params.community._id,
        title: params.community.title
      })
      rupon.account_info         = params.user || {};
      rupon.account_info.user_id = params.user._id;
      rc.setSettings(params.settings, rupon.account_info.username);

      var popularCollection = new rupon.models.thoughtCollection(params.popular),
          tags_collection         = new rm.topicsCollection();

      var userSubscribed = _.contains(_.pluck(params.communities, "_id"),params.community._id) || false;

      var communitySidebarView = new rv.CommunitySidebarView({
        communityId: params.community._id,
        title:       params.community.title,
        description: params.community.description,
        creator:     params.community.creator,
        members:     params.community.members,
        guidelines:  params.community.guidelines,
        maxUsers:    params.community.maxUsers,
        communities: params.communities
      });

      communitySidebarView
          .on("subscribed", function() {
            $('.write-view').removeClass('hidden');
          });

      var communityHeaderView = new rv.CommunityHeaderView({
        communityId: params.community._id,
        coverUrl:    params.community.coverUrl,
        title:       params.community.title,
        description: params.community.description,
        creator:     params.community.creator,
        members:     params.community.members,
        communities: params.communities
      });

      var isCreator = params.community.creator && (rupon.account_info.user_id == params.community.creator._id);
      var showCommunityChallengesView = !!_.filter(params.community.communityChallenges, function(communityChallenge) {
        return !!communityChallenge.challenge}).length || isCreator;

      filteredCollection = params.community.communityChallenges;

      // Don't show placeholder challenges for non-creator
      if (!isCreator) {
        filteredCollection = _.filter(params.community.communityChallenges, function(com){
          return !!com.challenge;
        });
      }

      if (showCommunityChallengesView) {
        var communityChallengesView = new rv.CommunityChallengesView({
          communityId: params.community._id,
          collection: new Backbone.Collection(filteredCollection),
          isCreator: isCreator
        });
      }

      // Only pass reference to reply_collection - since each thought handles its own replies
      var writeView = new rv.WriteView({
        tags_collection: tags_collection,
        showView:        userSubscribed
      });

      writeView
          .on("create-reflection", function(attrs) {
              attrs.communityId = params.community._id;
              attrs.isCommunity = true;
              var thought = new rm.thought(attrs);
              thought.save();
              popularCollection.add(thought);

              $('html, body').animate({
                  scrollTop: $('.popular-container .small-header').position().top
              }, 500);

              if (popularCollection.models) {
                $('.popular-container').find('.placeholder').hide();
              }
              this.clickedOnce = false;
              this.render({
                tags_collection: tags_collection,
                showView:        userSubscribed
              });

          });

      var communityMainView = new rv.ThoughtsView({
        collection:       popularCollection,
        reply_collection: rm.replyCollection,
        user:             rupon.account_info,
        isCommunity:      true
      });

      var frequencyView = new rv.FrequencyView({
        collection: new Backbone.Collection([]),
        myCommunities: params.myCommunities,
        showCommunity: true,
        myChallenges: params.myChallenges,
        showChallenges: true
      });

      $("#container").append('<div class="main-view-container"></div><div class="side-view-container"></div>');
      $("#container .side-view-container").append(communitySidebarView.$el);
      $("#container .side-view-container").append(frequencyView.$el);

      $("#container .main-view-container").append(communityHeaderView.$el);

      if (showCommunityChallengesView) {
        $("#container .main-view-container").append(communityChallengesView.$el);
      }
      $("#container .main-view-container").append(writeView.$el);
      $("#container .main-view-container").append('<div class="popular-container"><div class="small-header">Community Entries</div></div>');

      if (!popularCollection.models.length) {
        $('.popular-container').append('<div class="placeholder" style="padding: 10px">Subscribe and write an entry!</div>');
      }
      $("#container .popular-container").append(communityMainView.$el);     

      tags_collection.fetch(); 
    }
})();