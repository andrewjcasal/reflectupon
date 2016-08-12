window.rupon = window.rupon || {};
window.rupon.views = window.rupon.views || {};

(function() {

    var rv = window.rupon.views,
        cv = window.rupon.common_views;

    var getMonth = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    rv.GetStartedView = cv.TemplateView.extend({
        template: Handlebars.templates['get-started'],

        writeDone: false,
        highlightElseDone: false,

        render: function() {

            // Written an entry before
            this.writeDone = _.chain(this.collection.models)
                .pluck("attributes")
                .pluck("thoughts")
                .flatten()
                .value()
                .length

            var userActivities = _.chain(this.collection.models)
                .pluck('attributes')
                .pluck('activity')
                .flatten()
                .pluck('thoughts')
                .flatten()
                .pluck('user_id')
                .value();

            this.highlightElseDone = !!_.reject(userActivities, function(id){
                return id == rupon.account_info.user_id
            }).length;

            if (typeof arguments[0] == "string") {
                switch (arguments[0]) {
                    case "write-done":
                        this.writeDone = true;
                        break;
                    case "highlight-else-done":
                        this.highlightElseDone = true;
                        break;
                }
            }

            cv.TemplateView.prototype.render.call(this, {
                write_done:          this.writeDone,
                highlight_else_done: this.highlightElseDone
            });
        }
    });

    rv.FrequencyView = cv.CollectionContainer.extend({

        tagName: "div",
        className: "side-view clearfix",
        id: "entries",

        template: Handlebars.templates['frequency'],

        container_ele: '.entries-container',

        events: {
            "click .write-entry": "writeReflection",
            "click .add-community": "addCommunity",
            "click .fa-check":    "completeChallenge"
        },

        initialize: function(options) {

            this.listenTo(this.collection, 'thought-change', this.showModule);

            cv.CollectionContainer.prototype.initialize.call(this, function(model) { 
                return new rv.FrequencyItemView({model: model});
            }, options);
        },

        render: function(options) {
            cv.CollectionContainer.prototype.render.call(this, options);
        },

        showModule: function() {
            this.$el.find('.entries-container').show();
            this.$el.find('.write-entry').show();
        },

        writeReflection: function() {
            this.trigger('write-reflection');
        },

        addCommunity: function() {
            mixpanel.track('add-community');

            var self = this;
            var addCommunityView = new rv.AddCommunityView();

            var modal = new rv.MainModal({
                modalType: addCommunityView,
                htmlTitle: 'Suggest a community',
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
        },

        completeChallenge: function(e) {
            var ele = $(e.currentTarget);
            var id = ele.attr("data-id");

            var self = this;
            $.ajax({
                type: 'PUT',
                data: {
                  status: "completed"
                },
                url:  '/api/challenges/' + id,
                success: function(response) {
                    ele.closest('li').find('.success-label').show();
                    ele.hide();              
                },
                dataType: 'JSON'
            });
        }

    });

    rv.FrequencyItemView = cv.TemplateView.extend({

        tagName: "li",
        template: Handlebars.templates['frequency-item'],

        events: {
            "click a":        "goToEntry",
            "click .fa-plus": "writeNewEntry"
        },

        initialize: function() {
            this.listenTo(this.model, "thought-change", this.render);
            cv.TemplateView.prototype.initialize.call(this);
        },

        render: function() {
            var filled = this.model.get("thoughts") && this.model.get("thoughts").length > 0;

            var options = {
                date:   moment(this.model.attributes.day).format('MMM Do'),
                filled: filled,
                colored_tabs: getUserTabs(this.model.attributes.tags)
            } 
            cv.TemplateView.prototype.render.call(this,options);

            this.$el.toggleClass("filled", filled);
        },

        goToEntry: function(e) {
            mixpanel.track('go-to-entry');
            this.trigger('go-to-entry', this.model.attributes.day);
        },

        writeNewEntry: function(e) {
            this.trigger('write-entry', this.model.attributes.day);
        }

    });

    var getUserTabs = function(tags) {
        return _.map(tags, function(tag) {
            return getUserTabFromDictionary(tag);
        })
    };

    var getUserTabFromDictionary = function(tag) {
        rupon.colored_tabs = rupon.colored_tabs || [];
        tab_index = _.indexOf(rupon.colored_tabs, tag);
        if (tab_index == -1) {
            rupon.colored_tabs.push(tag);
            tab_index = _.indexOf(rupon.colored_tabs, tag);
        }
        return tab_index;
    }

})();