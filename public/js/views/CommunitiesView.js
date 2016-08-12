window.rupon = window.rupon || {};
window.rupon.views = window.rupon.views || {};

(function() {

    var rv = window.rupon.views;
    var cv = window.rupon.common_views;

    rv.MainCommunitiesView = cv.TemplateView.extend({
      template: Handlebars.templates['communities-main'],

      events: {
        'click .add-challenge': 'addChallenge',
        'keyup .search-challenges': 'searchChallenges'
      },

      render: function(options) {
        this.$el.html(this.template(options));

        var challengesPage = new rv.CommunitiesView({
          collection: this.collection
        });

        this.$el.find('.challenges').html(challengesPage.$el);
      },

      renderList: function(challenges) {
        this.$el.find('.challenges').html('');

        var challengesPage = new rv.CommunitiesView({
          collection: challenges
        });

        this.$el.find('.challenges').html(challengesPage.$el);
      },

      searchChallenges: function() {
        mixpanel.track('click-com-search');
        var input = this.$el.find('.search-challenges').val();
        this.renderList(this.collection.search(input));
      },

      addChallenge: function() {
        mixpanel.track('add-community');

        var self = this;
        var addCommunityView = new rv.AddCommunityView();

        var modal = new rv.MainModal({
            modalType: addCommunityView,
            htmlTitle: 'Suggest a Community',
        });

        addCommunityView
            .on('added', function(title) {
              $(modal.$el).modal('hide');
              var confirmCommunityView = new rv.ConfirmCommunityView();
              var modalConfirm = new rv.MainModal({
                  modalType: confirmCommunityView,
                  htmlTitle: 'Thanks for your suggestion!'
              });

              $(modalConfirm.$el).modal();
            });

        $(modal.$el).modal();

      }
    });

    rv.CommunitiesView = cv.CollectionContainer.extend({
      className: "",
      template: Handlebars.templates['challenges-view'],

      initialize: function(options) {
        options = options || {};

        if (options.collapsible) {
          this.collapsible = true;
          this.num_elements = 3;
        }

        cv.CollectionContainer.prototype.initialize.call(this, function(model) {
          return new rv.CommunityView({
            model: model,
            pick: options.pick,
            viewType: options.viewType
          });
        })
      }

    });

    rv.CommunityView = cv.SimpleModelView.extend({
      className: "community-view",
      template: Handlebars.templates['community-view'],

      events: {
        'click': 'clickElement',
        'click .delete': 'delete'
      },

      initialize: function(options) {
        options = options || {};
        if (options.pick) {
          this.pick = true;
        }
        cv.SimpleModelView.prototype.initialize.call(this, options);
      },

      clickElement: function() {
        if (this.pick) {
          this.trigger('picked', this.model.id);
          this.$el.toggleClass('picked');
        }
      },

      delete: function() {
        var self = this;
        $.ajax({
            type: 'DELETE',
            url:  '/api/communities/' + self.model.id,
            success: function(response) {
              self.$el.remove();
            },
            dataType: 'JSON'
        });
      }
    });

})();