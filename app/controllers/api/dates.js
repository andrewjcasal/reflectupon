var mongoose   = require('mongoose')
  , _          = require('underscore')
  , async      = require('async')
  , User       = mongoose.model('User')
  , Thought    = mongoose.model('Thought')
  , Annotation = mongoose.model('Annotation')
  , helpers    = require('../../helpers')
  , moment_tz  = require('moment-timezone')

exports.get = function(is_mobile, user_id, callback) {

    var num_days = 30;

    if (is_mobile) {
        num_days = 3;
    }

    var options = {
      date:    helpers.getDateRange(num_days),
      user_id: user_id
    };

    helpers.getThoughtsWithAnnotation(options, function(thoughts) {

        getAnnotations(options, function(annotations) {

            var frequency = [];

            for (var i = 0; i < num_days; i++) {

                var endDate   = getDate(i, 1);
                var startDate = getDate(i);
                var filtered_thoughts = getItemsByDate(thoughts, startDate, endDate);
                frequency[i] = {
                    day:         startDate,
                    thoughts:    filtered_thoughts,
                    activity:    getItemsByDate(annotations, startDate, endDate)
                };

            }

            async.mapSeries(frequency, function(freq_item, callback2) {

                async.mapSeries(freq_item.thoughts, function(freq_thought, callback3) {
                    helpers.getTopicsByIds(freq_thought.tag_ids, function(topics) {
                        freq_thought.tag_ids = topics;
                        callback3(null, freq_thought);
                    });
                },
                function(err, freq_thoughts) {
                    freq_item.thoughts = freq_thoughts;
                    callback2(null, freq_item);
                });
            },
            function(err, results) {
                callback(results);
            });

        });

    })

};

var formatRecommended = function(thoughts) {
    async.mapSeries(thoughts, formatRecommendedThought, function(err, thoughts) {
        console.log(thoughts);
    });
};

var getAnnotations = function(options, callback) {
    Annotation
        .find(options)
        .populate({path: 'replies' })
        .populate({path: 'thoughts'})
        .sort({date:-1})
        .exec(function(err, annotations) {
            callback(annotations);
        });
};

var getDate = function(num_day, end_day) {

    if (typeof end_day == "undefined") {
        end_day = 0;
    }

    var date = new Date();
    date.setDate(date.getDate()-(num_day - end_day));
    return getDateByTimeZone(date);
};

var getItemsByDate = function(thoughts, startDate, endDate) {
    return _.filter(thoughts, function(thought) {
        return getDateByTimeZone(thought.date) == startDate;
    });
};

var getTagsFromAllThoughts = function(thoughts, callback) {
    var tag_ids = _.map(thoughts, function(thought) {
        return thought.tag_ids;
    })
    tag_ids = _.uniq(_.flatten(tag_ids));
    helpers.getTopicsByIds(tag_ids, function(topics) {
        callback(topics);
    });
};

var getDateByTimeZone = function(date) {
    return moment_tz(date).tz('America/Los_Angeles').format("YYYY-MM-DD")
}