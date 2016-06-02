window.rupon = window.rupon || {};
window.rupon.controllers = window.rupon.controllers || {};
window.rupon.utils = window.rupon.utils || {};

(function() {

    var rc = window.rupon.controllers,
        rv = window.rupon.views,
        rm = window.rupon.models,
        rh = window.rupon.helpers,

        dayModelIndex,
        popularView;

    rc.setAllThoughts = function(params) {

        rupon.account_info         = params.user || {};
        rupon.account_info.user_id = params.user._id;

        mixpanel.identify(rupon.account_info.user_id);
        mixpanel.people.set({
            "$email": rupon.account_info.email
        });
        mixpanel.track('home-page-view');

        params = params || {};

        var frequency =    params.frequency, 
            popular =      params.popular,
            prompt =       params.prompt,
            settings =     params.settings;

        var recommended_collection  = new rupon.models.thoughtCollection(),
            user_message_collection = new rupon.models.userMessageCollection(),
            frequency_collection    = new rupon.models.frequencyCollection(frequency),
            popular_collection      = new rupon.models.thoughtCollection(popular),
            tags_collection         = new rm.topicsCollection();

        // Only pass reference to reply_collection - since each thought handles its own replies
        var writeToThoughtsView = new rv.WriteToThoughtsView({
            tags_collection:      tags_collection,
            frequency_collection: frequency_collection,
            reply_collection:     rm.replyCollection,
            user:                 rupon.account_info,
            prompt:               prompt
        });

        writeToThoughtsView
            .on("create-reflection", function(attrs) {
                var format_date = rh.dateForFrequencyItem(attrs.date);
                var freq_item   = frequency_collection.where({day: format_date})[0];

                var thought = new rm.thought(attrs);
                thought.save({},{success: function() {
                    renderRightColumnView("recommended", {
                        collection:          frequency_collection,
                        writeToThoughtsView: writeToThoughtsView
                    })
                }});

                popular_collection.add(thought);

                var thoughts = freq_item.get('thoughts')
                thoughts.unshift(thought);
                freq_item.set('thoughts', thoughts);
                freq_item.trigger('thought-change');
            });

        frequencyView = new rv.FrequencyView({
            collection:  frequency_collection,
            no_entries:  !_.flatten(_.pluck(frequency, 'thoughts')).length,
            communities: params.communities,
            myCommunities: params.myCommunities
        });
        frequencyView
            .on('write-reflection', function() {
                writeToThoughtsView.trigger('write-reflection')
            })
            .on('go-to-entry', function(date) {
                renderRightColumnView(date, {
                    collection:          frequency_collection,
                    writeToThoughtsView: writeToThoughtsView
                });
            })
            .on('write-entry', function(val) {
                writeToThoughtsView.trigger('write-entry', val);
            })

        var mainView = new rv.MainView();
        popularView = new rv.ThoughtsView({
            collection: popular_collection,
            reply_collection: rm.replyCollection,
            user: rupon.account_info
        });

        $("#container").html("<div class='main-view-container'></div><div class='side-view-container'></div>");
        $(".side-view-container")
            .append(frequencyView.$el)
            .append(Handlebars.templates['guidelines']());

        settings.username = rupon.account_info.username;
        var settingsView = new rv.SettingsView({
            model: new rm.userSettings(settings)
        });
        $(".me-container .dropdown").html(settingsView.$el);

        $(document).scroll(function() {
            var scrollTop = $(document).scrollTop(),
                guidelinesEl = $('.guidelines');

            if (scrollTop > 578 && !guidelinesEl.hasClass('fixed')) {
                guidelinesEl.addClass('fixed');
                guidelinesEl.fadeIn(300);
            } else if(scrollTop <= 578 && guidelinesEl.hasClass('fixed')) {
                guidelinesEl.fadeOut(50, function() {
                    guidelinesEl.removeClass('fixed');
                });
            }
        })
        $(".main-view-container")
            .append(mainView.$el)

        mainView.$el
            .find(".dashboard-container").append(writeToThoughtsView.$el).end()
            .find(".popular-container").append(popularView.$el);

        popularView.trigger('content-loaded');

        user_message_collection.on("reset", function() {
            if (user_message_collection.at(0)) {
                var nagView = new rv.nagView({model: user_message_collection.at(0)});

                nagView.on("dismiss-message", function() {
                    var first_message = user_message_collection.at(0);
                    var num_dismissed = parseInt(first_message.get('dismissed')) || 0;
                    first_message.save({dismissed: num_dismissed + 1 });
                });

                mainView.$el
                    .find(".message-container").html(nagView.$el);
            }
        })

        tags_collection.fetch();

        recommended_collection.fetch({reset:true, data: {stream_type: "recommended"}});
        user_message_collection.fetch({reset:true, data: {user_id:rupon.account_info.user_id}});
        tags_collection.fetch();

    };

    /**
     * Params:
     *   - date: String (i.e. as a date "2015-06-20" or "most-recent")
     */
    var getModelByDate = function(date, collection, model_index) {
        var frequency_models = _.clone(collection.models);
        switch (date) {
            case "most-recent":
                return _.find(frequency_models, function(model) {
                    return model.get('thoughts').length;
                });
                break;
            case "next-entry":
                return _.find(frequency_models, function(model, index) {
                    return model.get('thoughts').length && index > model_index;
                });
                break;
            case "previous-entry":
                frequency_models.reverse();
                return _.find(frequency_models, function(model, index) {
                    return model.get('thoughts').length && (frequency_models.length - index) <= model_index;
                });
                break;
            case "least-recent":
                frequency_models.reverse();
                return _.find(frequency_models, function(model) {
                    return model.get('thoughts').length;
                });
        }
        return _.find(frequency_models, function(model) {
            return model.get('day') == date;
        });
    }

    var renderRightColumnView = function(modelType, options) {

        var collection          = options.collection;
        var writeToThoughtsView = options.writeToThoughtsView;

        if (modelType == "recommended") {
            writeToThoughtsView.render("recommended");
        } else {
            var model = getModelByDate(modelType, collection, dayModelIndex);
            dayModelIndex = collection.indexOf(model);

            var firstModel = getModelByDate("most-recent", collection);
            var firstModelIndex = collection.indexOf(firstModel);

            var lastModel = getModelByDate("least-recent", collection);
            var lastModelIndex = collection.indexOf(lastModel);

            writeToThoughtsView.render("day", model);
            popularView.remove();
            $('.popular-container').hide();
        }
    }

})();
