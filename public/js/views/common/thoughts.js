window.rupon = window.rupon || {};
window.rupon.views = window.rupon.views || {};

(function() {

    String.prototype.splice = function( idx, rem, s ) {
        return (this.slice(0,idx) + s + this.slice(idx + Math.abs(rem)));
    };

    var rv = window.rupon.views;
    var cv = window.rupon.common_views;
    var rh = window.rupon.helpers;

    var privacy = ["PRIVATE", "ANONYMOUS"];

    var toTitleCase = function(str){
        return str.replace(/\w\S*/g, function(txt){return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();});
    }

    rv.ThoughtWrapperView = cv.Container.extend({

        tagName:   "div",
        className: "thought-row tooltipbottom clearfix",
        template: Handlebars.templates['thought-item'],

        user: null,
        can_reply: true,
        annotation_mode: false,

        events: {
            'click .read-more':               'showSingle',
            'selectstart .selectable-text':   'takeAnnotation',
            'click .privacy-status':          'changePrivacy',
            'click .edit':                    'editThought',
            'click .delete':                  'deleteThought',
            'click .archive':                 'archiveThought',
            'keypress .message textarea':     'submitEdit',
            'focusin input':                  'focusTextarea',
            'click .write-reply2':            'writeReply', 
            'click .reply-summary':           'getReplySummary',
            'click .reply-popover button':    'submitReply',
            'click .reply-popover .fa-times': 'removePopover'
        },

        initialize: function(options) {
            options = options || {};

            this.tags_collection = options.tags_collection;
            if (typeof options.reply_collection != "undefined") {
                this.replyCollection = new options.reply_collection(this.model.get("replies"));
            }

            cv.Container.prototype.initialize.call(this);

            this.listenTo(this.model, "change", this.render);
            this.listenTo(this.model, "destroy", this.remove);

            //this.activateTooltip();
            this.render(options);

            this.user      = options.user;
            this.can_reply = (options.can_reply == false) ? false : true;

            //this.replyCollectionContainer = new rv.RepliesView({collection: this.replyCollection, user: options.user});

            var self = this;
            var patch_options = {
                wait: true,
                patch: true
            };

            // this.replyCollectionContainer
            //     .on('thank-reply', function(attr) {
            //         var reply = self.replyCollection.findWhere(attr);
            //         reply.save({
            //             'thanked': !reply.get('thanked')
            //         }, patch_options);
            //     })
            //     .on('make-reply-public', function(attr) {
            //         var reply = self.replyCollection.findWhere(attr);
            //         reply.save({
            //             'privacy': 'AUTHOR_TO_PUBLIC'
            //         }, patch_options);
            //     })

            // if (this.user) this.addChild(this.replyCollectionContainer, ".reply-collection-container");
        },

        render: function(options) {

            this.$el.find(".privacy-status").trigger("tooltip-end");
            var template_options = _.clone(this.model.attributes);

            var created_at = new Date(template_options.date).getTime();
            var today = new Date().getTime();

            var difference_ms = today - created_at;

            this.user = (options && options.user) ? options.user : this.user;
            // var tags = [];

            // if (typeof this.tags_collection != "undefined") {
            //     if (this.model.get('tags').length && this.tags_collection) {
            //         tags = _.filter(_.pluck(this.tags_collection.models, 'attributes'), function (model) {
            //             return _.contains(this.model.get('tag_ids'), model._id)
            //         }.bind(this));
            //     }
            // }

            var params = {
                is_author:       this.user && this.user.user_id == this.model.get('user_id'),
                can_edit:        (difference_ms/(1000*60*60*24)) <= 1,
                duration:        moment(this.model.get("date")).format('MMM Do'),
                past_posts:      this.model.get('history') ? this.model.get('history').length : null,
                //tags:            tags
            }

            if (typeof this.reply_collection != "undefined") {
                if (this.can_reply) {
                    //show "write reply" for all posts on index page
                    params.can_reply = (!this.model.get('replies').length && !params.is_author) || !this.user;
                    //params.show_replies = true;
                } else {
                    params.can_reply = false;
                    params.show_replies = false;
                }
            }

            template_options = _.extend(template_options, params);

            if (!template_options.is_author) this.$el.addClass('other-author');

            options = options || {};
            template_options.showMore = options.showMore || false;

            if (!template_options.showMore && template_options.description.length >1100) {
                template_options.description = this.truncateDescription(template_options.description, 1100);
                template_options.read_more = true;
            }

            template_options.description = rh.convertLineBreaks(template_options.description, 'n');
            template_options.annotation_notice = !!template_options.can_reply;

            // Description used when editing - without all the annotations
            this.editable_description = template_options.description;

            var annotations = this.model.get('annotations');
            if (annotations && annotations.length) {
                template_options.description = this.renderAnnotations(template_options.description, annotations, replies);
                template_options.num_annotations = annotations.length;
            }

            var replies = this.model.get('replies').models;
            if (replies && replies.length) {
                template_options.num_replies = replies.length;
            }

            //template_options.enable_below_message = !!template_options.num_annotations || !!template_options.num_replies || template_options.tags.length;

            if (_.indexOf(privacy, template_options.privacy) != -1) {

                if (template_options.privacy == privacy[0]) {
                    template_options.privacy_inverse = privacy[1];
                } else if (template_options.privacy == privacy[1]){
                    template_options.privacy_inverse = privacy[0];
                }

                template_options.privacy = toTitleCase(template_options.privacy.toLowerCase());
                template_options.privacy_inverse = toTitleCase(template_options.privacy_inverse.toLowerCase());
            }

            var outputHtml = this.template(template_options);

            cv.Container.prototype.detachChildren.call(this);
            this.$el.html(outputHtml);
            cv.Container.prototype.reattachChildren.call(this);

            this.$el.find('.write-reply textarea').autosize();
            if (annotations && annotations.length && replies && replies.length) {
                this.renderRepliesForAnnotation(this.$el.find('.perm'), replies);
            }
        },

        renderAnnotations: function(description, annotations, replies) {
            var output_annotation = this.formatAnnotationsForDisplay(annotations);

            // Start from the last of array, better with text injection
            var annotations_object = condenseArray(output_annotation).reverse();

            return this.replaceWithAnnotations(annotations_object, description);
        },

        formatAnnotationsForDisplay: function(annotations) {
            return _.map(annotations, function(model) {
                return {
                    text:     model.description,
                    start:    model.start,
                    end:      model.end,
                    reply_id: [model._reply_id]
                };
            });
        },

        renderRepliesForAnnotation: function(highlights, replies) {
            _.each(highlights, function(highlight) {

                var filteredReplies = this.getRepliesForAnnotation(highlight, replies);

                if (filteredReplies.length) {
                    var list = _.map(filteredReplies, function(reply) {
                        return "<li>" + reply.get('description') + "</li>";
                    });

                    list = "<ul>" + list.join("") + "</ul>";

                    this.renderRepliesPopover(highlight, list);
                }

            }, this);
        },

        renderRepliesPopover: function(highlight, content) {
            this.$el.find(highlight).popover({
                content:   content,
                html:      true,
                trigger:   "hover",
                placement: "bottom"
            });
        },

        getRepliesForAnnotation: function(annotation, replies) {
            var reply_ids = $(annotation).attr('data-reply-id').split(',');
            return _.filter(replies, function(reply) {
                return _.contains(reply_ids, reply.id)
            }, this);
        },

        replaceWithAnnotations: function (annotations, str) {

            _.each(annotations, function(annotation) {
                end_tag   = "</span>";
                start_tag = "<span class='perm' data-reply-id='"+annotation.reply_id+"'>";
                str = [str.slice(0, annotation.end), end_tag, str.slice(annotation.end)].join('');
                str = [str.slice(0, annotation.start), start_tag, str.slice(annotation.start)].join('');
            });

            return str;
        },

        truncateDescription: function(description, length) {
            return description.trim().substring(0,length).split(" ").slice(0, -1).join(" ") + "...";
        },

        showSingle: function() {
            var attrs = {
                showMore: true
            }

            this.$el.addClass('show-replies');
            this.render(attrs);
        },

        getReplySummary: function() {

            $(".main-view-container").addClass('left-align');

            this.$el.find('.reply-collection-container').removeClass('hidden');
            this.$el.find('.reply-summary').addClass('hidden');
            this.$el.find('.message').addClass('reply-summary-activated');

        },

        takeAnnotation: function() {

            if (!this.can_reply || this.annotation_mode) {
                return;
            }

            var is_author = this.user && this.user.user_id == this.model.get('user_id')

            if (is_author) {
                var self = this;
                $(document).one('mouseup', function() {
                    self.setAnnotation();
                });
            }

        },

        setAnnotation: function() {
            var selected_text = window.getSelection().toString();

            if (selected_text.length) {
                this.annotation_mode = true;
                var selectable_field = this.$el.find('.selectable-text')
                var selectable_text = selectable_field.html();

                var html_text = rh.convertLineBreaks(selected_text, 'n');
                this.selected_start = selectable_text.indexOf(html_text)
                this.selected_end = this.selected_start + html_text.length;

                selectable_field.html(this.showTempText(true, selectable_text));

                $('.temp').popover({
                    content: Handlebars.templates['popover']
                });
                $('.temp').popover('show')

                popover_input = $('.popover-content').find('input');
                $('.temp').on('shown.bs.popover', function () {
                  popover_input.focus()
                })
            }
        },

        showTempText: function(showPopover, textBeforeEdit) {
            if (showPopover) {
                this.selected_text = this.getSelectedText(textBeforeEdit, this.selected_start, this.selected_end);
                return textBeforeEdit.replace(this.selected_text, this.highlightTemplate(this.selected_text));
            } else {
                var tempText = $(".temp").html();
                var tempParent = $(".temp").parent();
                $(".temp").replaceWith(tempText);
            }
        },

        getSelectedText: function(full_text, start_pos, end_pos) {
            return full_text.substring(start_pos, end_pos);
        },

        highlightTemplate: function(text) {
            return '<span class="temp" data-placement="bottom" data-html="true">' + text + '</span>'
        },

        changePrivacy: function() {

            var model_privacy = this.model.get("privacy");

            if (privacy[0] == model_privacy) {
                model_privacy = privacy[1];
            } else if(privacy[1] == model_privacy) {
                model_privacy = privacy[0];
            }

            this.trigger("change-privacy", model_privacy, this.model);
        },

        // activateTooltip: function() {
        //     var self = this;

        //     this.$el.tooltip({
        //         event_in:          "tooltip-start",
        //         event_out:         "tooltip-end",
        //         opacity:           1,
        //         on_complete:       function() {
        //             self.trigger("tooltip-initialized");
        //         },
        //         arrow_left_offset: 280,
        //         tooltip_class:     "thought-tooltip"
        //     });
        // },

        editThought: function() {
            this.$el.addClass("editing");
            this.$el.find('.message').append('<textarea class="editable">'+this.editable_description+'</textarea>');
            this.$el.find('textarea.editable').autosize();
        },

        submitEdit: function(e) {
            if (e.which == 13){
                var value = this.$el.find("textarea").val();
                this.$el.removeClass("editing");
                this.trigger("edit-thought", this.model, value);
            }
        },

        deleteThought: function() {
            this.trigger("delete-thought", this.model);
        },

        archiveThought: function() {
            this.trigger("archive-thought", this.model);
        },

        writeReply: function() {

            if (typeof this.user == "undefined") {
                $('#myModal').modal();
            } else {

                $(".main-view-container").addClass('left-align');

                this.$el
                    .find('.write-reply2').addClass('hidden').end()
                    .find('.write-reply').css('display','block').find('textarea').focus();
            }
        },

        focusTextarea: function() {

            if (typeof this.user == "undefined") {
                $('#myModal').modal();
            }

        },

        removePopover: function(e) {
            $('.temp').popover('hide');
            this.showTempText(false);
            this.annotation_mode = false;
        },

        submitReply: function(e) {

            var description = this.$el.find('.popover-content').find('textarea').val()

            if ($.trim(description) != "") {

                var attr = {
                    user_id:     this.user.user_id,
                    description: description,
                    thought_id:  this.model.get('_id')
                };

                if (this.selected_start >= 0 && this.selected_end && this.selected_text) {
                    attr.annotations = [{
                        start: this.selected_start,
                        end:   this.selected_end,
                        description: this.selected_text
                    }];
                }

                var self = this;
                this.replyCollection.create(attr, { 
                    wait: true,
                    success: function() {
                        self.$el.find('.write-reply').addClass('hidden');
                        self.$el.find('.preempt-reply').addClass('hidden');
                        $('.temp').popover('hide')
                        self.$el.find('.temp').removeClass('temp').addClass('perm');
                    }
                });
            }

        }

    });

    // puts elements in order by letter position
    var condenseArray = function(input) {

        var injectAfter = function(pos, into_array, element) {
            into_array.splice(pos+1, 0, element);
            return into_array;
        }

        var injectBefore = function(pos, into_array, element) {
            into_array.splice(pos, 0, element);
            return into_array;
        }

        var overlapLater = function(pos, into_array, element) {
            old_reply_id = into_array[pos].reply_id;

            into_array[pos].end = element.end;
            into_array[pos].reply_id = old_reply_id.push(element.reply_id);

            return into_array;
        }

        var overlapEarlier = function(pos, into_array, element) {
            old_reply_id = into_array[pos].reply_id;

            into_array[pos].start = element.start;
            into_array[pos].reply_id = old_reply_id.push(element.reply_id);

            return into_array;
        }

        var overlapAround = function(pos, into_array, element) {
            old_reply_ids = into_array[pos].reply_id;
            old_reply_ids.push(element.reply_id[0]);

            into_array[pos].start = element.start;
            into_array[pos].end   = element.end;
            into_array[pos].reply_id = old_reply_ids;

            return into_array;
        }

        var overlapWithin = function(pos, into_array, element) {
            old_reply_id = into_array[pos].reply_id;
            into_array[pos].reply_id = old_reply_id.push(element.reply_id);

            return into_array;
        }

        var output = [input.shift()];

        _(input.length).times( function(n) {
            if (output[0].end < input[0].start) {
                output = injectAfter(0, output, input.shift());

            } else if (input[0].end < output[0].start) {
                output = injectBefore(0, output, input.shift());

            } else if (input[0].start > output[0].start && input[0].end > output[0].end) {
                output = overlapLater(0, output, input.shift());

            } else if (output[0].start > input[0].start && output[0].end > input[0].end) {
                output = overlapEarlier(0, output, input.shift());

            } else if (input[0].start < output[0].start && output[0].end < input[0].end) {
                output = overlapAround(0, output, input.shift());

            } else if (output[0].start < input[0].start && input[0].end < output[0].end) {
                output = overlapWithin(0, output, input.shift());
            }
        })

        return output;

    };

})();