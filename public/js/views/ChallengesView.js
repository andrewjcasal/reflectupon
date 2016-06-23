window.rupon = window.rupon || {};
window.rupon.views = window.rupon.views || {};

(function() {

    var rv = window.rupon.views;
    var cv = window.rupon.common_views;
    var rm = window.rupon.models;

    rv.MainChallengesView = cv.TemplateView.extend({
      template: Handlebars.templates['challenges-main'],

      events: {
        'click .add-challenge': 'addChallenge',
        'keyup .search-challenges': 'searchChallenges',
        'click .filter a': 'filter'
      },

      render: function(options) {

        //Main challenges within community challenges modal
        this.dontReload = options.dontReload;
        this.cantRedirect = options.cantRedirect;
        //end main challenges within community challenges modal

        this.$el.html(this.template(options));

        var challengesPage = new rv.ChallengesView({
          collection: this.collection,
          cantRedirect: this.cantRedirect
        });

        var self = this;
        challengesPage
          .on('picked', function(model) {
            self.trigger('picked', model)
          })

        this.$el.find('.challenges-list').html(challengesPage.$el);
      },

      renderList: function(challenges) {
        this.$el.find('.challenges-list').html('');

        var challengesPage = new rv.ChallengesView({
          collection: challenges,
          cantRedirect: this.cantRedirect
        });

        this.$el.find('.challenges-list').html(challengesPage.$el);
      },

      filter: function(e) {
        var type = $(e.currentTarget).attr("class");
        this.renderList(this.collection.filterType(type));
      },

      searchChallenges: function() {
        var input = this.$el.find('.search-challenges').val();
        this.renderList(this.collection.search(input));
      },

      addChallenge: function() {

        var self = this;
        var addChallengesView = new rv.AddChallengesView();

        var modal = new rv.MainModal({
            modalType: addChallengesView,
            htmlTitle: 'Add a challenge',
        });

        addChallengesView
            .on('added', function(response) {

                if (!self.dontReload) {
                  window.location.replace("/challenge/"+response._id);
                }

                var chView = new rv.ChallengeView({
                  model: new rm.challenge(response),
                  pick: true,
                  cantRedirect: true
                });
                self.$el.find('.challenges-list >div').prepend(chView.$el);
                $(modal.$el).modal('hide');
            });

        $(modal.$el).modal();

      }
    });

    rv.ChallengesView = cv.CollectionContainer.extend({
      className: "",
      template: Handlebars.templates['challenges-view'],

      initialize: function(options) {
        options = options || {};

        if (options.collapsible) {
          this.collapsible = true;
          this.num_elements = 3;
        }

        cv.CollectionContainer.prototype.initialize.call(this, function(model) {
          if (!!model.get('title')) {
            return new rv.ChallengeView({
              model: model,
              canRemove: options.canRemove,
              cantRedirect: options.cantRedirect,
              viewType: options.viewType
            });
          } else {
            return new rv.PromptView({
              model: model
            })
          }
        })
      }

    });

    rv.PlaceholderChallengeView = cv.TemplateView.extend({
      className: "challenge-view placeholder",
      template: Handlebars.templates['placeholder-view']
    })

    rv.ChallengeView = cv.SimpleModelView.extend({
      className: "challenge-view",
      template: Handlebars.templates['challenge-view'],
      events: {
        'click .start-challenge': 'startChallenge',
        'click .complete-challenge': 'completeChallenge',
        'click .pick-challenge':  'pickChallenge',
        'change #file-input':     'changeFileInput',
        'click .submit-reflection': 'submitReflection',
        'click .select-challenge': 'selectRelatedChallenge',
        'click .related-challenges-list .fa-times': 'removeRelatedChallenge',
        'click .delete': 'delete'
      },

      render: function(options) {
        options.canSelectOrNotEmpty = options.isCreator || (this.model.get('relatedChallenges') && !!this.model.get('relatedChallenges').length);
        cv.SimpleModelView.prototype.render.call(this, options);

        var relatedChallengesCol = new Backbone.Collection(options.relatedChallenges);
        var relatedChallengesView = new rv.ChallengesView({
          collection: relatedChallengesCol,
          canRemove: options.isCreator,
          cantRedirect: options.cantRedirect
        });

        this.on('added-related', function(model) {
          relatedChallengesCol.add([model]);
        })
        this.on('remove-related', function(challengeId) {
          relatedChallengesCol.remove(challengeId);
        })
        this.$el.find('.related-challenges-list').html(relatedChallengesView.$el);
      },

      startChallenge: function() {
        var self = this;
        $.ajax({
            type: 'PUT',
            data: {
              status: "started"
            },
            url:  '/api/challenges/' + this.model.id,
            success: function(response) {
              self.$el.find('.start-challenge').addClass('hidden');
              self.$el.find('.complete-challenge').removeClass('hidden');
            },
            dataType: 'JSON'
        });
      },

      completeChallenge: function() {
        var self = this;
        $.ajax({
            type: 'PUT',
            data: {
              status: "completed"
            },
            url:  '/api/challenges/' + this.model.id,
            success: function(response) {
              self.$el.find('.complete-challenge').addClass('hidden');
              self.$el.find('.completed-challenge').removeClass('hidden');
              self.$el.find('.reflection-container').removeClass('hidden');
              self.$el.find('.reflection-container textarea').focus();
            },
            dataType: 'JSON'
        });
      },

      pickChallenge: function() {
        this.trigger('picked', this.model);
      },

      changeFileInput: function(e) {
        var file = $(e.currentTarget)[0].files[0];
        fr = new FileReader();
        fr.onload = function() {
          console.log(fr.result);
        }

        if(file == null){
          return alert('No file selected.');
        }

        this.getSignedRequest(file);
      },

      getSignedRequest: function(file){
        var self = this;
        var xhr = new XMLHttpRequest();
        var fileName = 'challenge-' + this.model.id +'.png';
        xhr.open('GET', `/sign-s3?file-name=${file.name}&file-type=${file.type}&image-type=challenges`);
        xhr.onreadystatechange = function() {
          if(xhr.readyState === 4){
            if(xhr.status === 200){
              var response = JSON.parse(xhr.responseText);
              self.uploadFile(file, response.signedRequest, response.url);
            }
            else{
              alert('Could not get signed URL.');
            }
          }
        };
        xhr.send();
      },

      uploadFile: function(file, signedRequest, url){
        var xhr = new XMLHttpRequest();
        var self = this;
        xhr.open('PUT', signedRequest);
        xhr.onreadystatechange = function() {
          if(xhr.readyState === 4){
            if(xhr.status === 200){

              $.ajax({
                  type: 'PUT',
                  url:  '/api/challenges/' +self.model.id,
                  data: {
                      avatar_url: url
                  },
                  success: function(response) {
                    self.$el.find('#preview').show();
                    self.$el.find('#preview').attr('src', url);
                    self.$el.find('#avatar-url').val(url);
                  },
                  dataType: 'JSON'
              });
            }
            else{
              alert('Could not upload file.');
            }
          }
        };
        xhr.send(file);
      },

      submitReflection: function() {
        var val = this.$el.find('.reflection-container textarea').val();
        var self = this;
        if (val != "") {
          $.ajax({
              type: 'POST',
              data: {
                description: val,
                privacy:     "ANONYMOUS"
              },
              url:  '/api/challenges/' + this.model.id + '/thought',
              success: function(response) {
                self.$el.find('.reflection-container').hide();
                self.$el.find('.thought-success').removeClass('hidden');
                self.$el.find('.thought-success .desc-field').text(response.description);
              },
              dataType: 'JSON'
          });
        }
      },

      selectRelatedChallenge: function(e) {
        var self = this;

        $.ajax({
           type: 'GET',
            url:  '/api/challenges/',
            success: function(response) {

              response = _.map(response, function(challenge) {
                challenge.pick = true;
                return challenge;
              })

              var challengesView = new rv.ChallengesView({
                collection: new Backbone.Collection(response)
              });

              var modal = new rv.MainModal({
                  modalType: challengesView,
                  htmlTitle: 'Add a challenge',
              });

              challengesView
                  .on('picked', function(model) {
                    model.set('pick', false);

                    $.ajax({
                      type: 'PUT',
                      url:  '/api/challenges/' + self.model.id + '/related/' + model.get('_id'),
                      success: function() {
                        self.trigger('added-related', model);
                        $(modal.$el).modal('hide');
                      }
                    })
                  });

              $(modal.$el).modal();
            },
            dataType: 'JSON'
        });
      },

      removeRelatedChallenge: function(e) {

        var challengeId = $(e.currentTarget).attr('data-id');
        var self = this;

        $.ajax({
          type: 'DELETE',
          url:  '/api/challenges/' + self.model.id + '/related/' + challengeId,
          success: function() {
            self.trigger('remove-related', challengeId);
          }
        })
      },

      delete: function() {
        var self = this;
        $.ajax({
            type: 'DELETE',
            url:  '/api/challenges/' + self.model.id,
            success: function(response) {
              self.$el.remove();
            },
            dataType: 'JSON'
        });
      }
    });

    rv.CommunityChallengesView = cv.CollectionContainer.extend({
      template: Handlebars.templates['community-challenges-view'],

      className: "section community-challenges-view",
      container_ele: ".challenge-list",

      events: {
        'click .pick-challenge': 'chooseChallenge'
      },

      initialize: function(options) {
        this.communityId = options.communityId;
        this.isCreator = options.isCreator;

        cv.CollectionContainer.prototype.initialize.call(this, function(model) {
          var challenge = model.get('challenge') || {};
          if (this.isCreator) {
            challenge.pick = true;
          }

          if (!challenge.title) {
            return new rv.PlaceholderChallengeView();
          } else {
            return new rv.ChallengeView({model: new Backbone.Model(challenge)});
          }
        })
      },

      chooseChallenge: function(e) {
        var self = this;
        var challengePos = $(e.currentTarget).closest('.challenge-view').index() + 1;
        $.ajax({
           type: 'GET',
            url:  '/api/challenges/',
            success: function(response) {

              response = _.map(response, function(challenge) {
                challenge.pick = true;
                return challenge;
              })

              var challengesView = new rv.MainChallengesView({
                collection: new Backbone.Collection(response),
                cantRedirect: true,
                noHeader: true,
                dontReload: true
              });

              var modal = new rv.MainModal({
                  modalType: challengesView,
                  htmlTitle: 'Choose a Challenge',
              });

              challengesView
                  .on('picked', function(model) {
                    model.set('pick', true);
                    var chalRow = new rv.ChallengeView({
                      model: model
                    })

                    $.ajax({
                      type: 'PUT',
                      url:  '/api/communities/' + self.communityId + '/challenges/' + challengePos,
                      data: {
                        challengeId: model.get('_id')
                      },
                      success: function() {
                        $(e.currentTarget).closest('.challenge-view').remove();
                        self.$el.find('.challenge-list').prepend(chalRow.$el);
                        $(modal.$el).modal('hide');
                      }
                    })
                  });

              $(modal.$el).modal();
            },
            dataType: 'JSON'
        });
      }
    });

    rv.PromptView = cv.SimpleModelView.extend({
      template: Handlebars.templates['prompt-view']
    })

})();