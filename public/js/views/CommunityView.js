window.rupon = window.rupon || {};
window.rupon.views = window.rupon.views || {};

(function() {

    var rv = window.rupon.views;
    var cv = window.rupon.common_views;

    rv.CommunitySidebarView = cv.TemplateView.extend({
        template: Handlebars.templates['community-sidebar'],

        events: {
          'click .guidelines-container .fa-pencil':  'editGuidelines',
          'click .edit-guidelines-container button':  'submitGuidelines',
          'click .subscription-button':               'clickSubscribe',
          'click .members-tab .fa-pencil':           'editMaxUsers',
          'click .members-tab .users-check':         'submitMaxUsers'
        },

        initialize: function(options) {
          this._id = options.communityId;
          cv.TemplateView.prototype.initialize.call(this, options);
        },

        render: function(options) {
          options.isCreator = false;
          if (options.creator) {
            options.isCreator = rupon.account_info.user_id == options.creator._id;
          }

          options.isSubscribed = _.contains(_.pluck(options.communities, "_id"),this._id) || false;
          options.cantSubscribe = (options.members.length >= options.maxUsers) && !options.isSubscribed;
          cv.TemplateView.prototype.render.call(this, options);
        },

        editTitle: function() {
          this.$el.find('.title-container').hide();
          this.$el.find('.edit-title-container').show();
        },

        submitTitle: function() {
          var title = this.$el.find('.edit-title-container textarea').val();
          var self = this;
          $.ajax({
              type: 'PUT',
              url:  '/api/communities/' + this._id,
              data: {
                  title: title
              },
              success: function(response) {
                self.$el.find('.title').text(response.title);
                self.$el.find('.title-container').show();
                self.$el.find('.edit-title-container').hide();
              },
              dataType: 'JSON'
          });
        },

        editDescription: function() {
          this.$el.find('.description-container').hide();
          this.$el.find('.edit-description-container').show();
        },

        submitDescription: function() {
          var description = this.$el.find('.edit-description-container textarea').val();
          var self = this;
          $.ajax({
              type: 'PUT',
              url:  '/api/communities/' + this._id,
              data: {
                  description: description
              },
              success: function(response) {
                self.$el.find('.description').text(response.description);
                self.$el.find('.description-container').show();
                self.$el.find('.edit-description-container').hide();
              },
              dataType: 'JSON'
          });
        },

        editGuidelines: function() {
          this.$el.find('.guidelines-container').hide();
          this.$el.find('.edit-guidelines-container').show();
        },

        submitGuidelines: function() {
          var guidelines = this.$el.find('.edit-guidelines-container textarea').val();
          var self = this;
          $.ajax({
              type: 'PUT',
              url:  '/api/communities/' + this._id,
              data: {
                  guidelines: guidelines
              },
              success: function(response) {
                self.$el.find('.guidelines-label').text(response.guidelines);
                self.$el.find('.guidelines-container').show();
                self.$el.find('.edit-guidelines-container').hide();
              },
              dataType: 'JSON'
          });
        },

        editMaxUsers: function() {
          this.$el.find('.max-users').hide();
          this.$el.find('.max-users-edit').show();
          this.$el.find('.users-check').show();
          this.$el.find('.users-pencil').hide();
          this.$el.find('.members-tab input').focus();
        },

        submitMaxUsers: function() {
          var self = this;
          var maxUsers = this.$el.find('.members-tab input').val();
          $.ajax({
              type: 'PUT',
              url:  '/api/communities/' + this._id,
              data: {
                  maxUsers: maxUsers
              },
              success: function(response) {
                self.$el.find('.max-users').show();
                self.$el.find('.max-users').text(response.maxUsers);
                self.$el.find('.max-users-edit').hide();
                self.$el.find('.users-check').hide();
                self.$el.find('.users-pencil').show();
              },
              dataType: 'JSON'
          });
        }

    });

    rv.CommunityHeaderView = cv.TemplateView.extend({
        template: Handlebars.templates['community-header'],

        events: {
          'click .title-container .fa-pencil':       'editTitle',
          'click .edit-title-container button':       'submitTitle',
          'click .description-container .fa-pencil': 'editDescription',
          'click .edit-description-container button': 'submitDescription',
          'click .subscription-button':               'clickSubscribe'
        },

        initialize: function(options) {
          this._id = options.communityId;
          cv.TemplateView.prototype.initialize.call(this, options);
        },

        render: function(options) {
          options.isCreator = false;
          if (options.creator) {
            options.isCreator = rupon.account_info.user_id == options.creator._id;
          }

          options.isSubscribed = _.contains(_.pluck(options.communities, "_id"),this._id) || false;
          options.cantSubscribe = (options.members.length >= options.maxUsers) && !options.isSubscribed;
          cv.TemplateView.prototype.render.call(this, options);
        },

        editTitle: function() {
          this.$el.find('.title-container').hide();
          this.$el.find('.edit-title-container').show();
        },

        submitTitle: function() {
          var title = this.$el.find('.edit-title-container textarea').val();
          var self = this;
          $.ajax({
              type: 'PUT',
              url:  '/api/communities/' + this._id,
              data: {
                  title: title
              },
              success: function(response) {
                self.$el.find('.title').text(response.title);
                self.$el.find('.title-container').show();
                self.$el.find('.edit-title-container').hide();
                window.location.replace("/community/"+response.title);
              },
              dataType: 'JSON'
          });
        },

        editDescription: function() {
          this.$el.find('.description-container').hide();
          this.$el.find('.edit-description-container').show();
        },

        submitDescription: function() {
          var description = this.$el.find('.edit-description-container textarea').val();
          var self = this;

          if (description == "") {
            alert('cannot be empty!');
          } else {
            $.ajax({
                type: 'PUT',
                url:  '/api/communities/' + this._id,
                data: {
                    description: description
                },
                success: function(response) {
                  self.$el.find('.description .main-desc').text(response.description);
                  self.$el.find('.description-container').show();
                  self.$el.find('.edit-description-container').hide();
                },
                dataType: 'JSON'
            });
          }
        },

        clickSubscribe: function() {
          var self = this;
          $.ajax({
              type: 'POST',
              url:  '/api/communities/' + this._id + '/members/' + rupon.account_info.user_id,
              success: function(response) {
                self.$el.find('.subscription-status').addClass('subscribed');
                self.trigger('subscribed');
              },
              dataType: 'JSON'
          });
        }
    });

})();