window.rupon = window.rupon || {};
window.rupon.controllers = window.rupon.controllers || {};
window.rupon.utils = window.rupon.utils || {};

(function() {

    Handlebars.registerHelper('equal', function(lvalue, rvalue, options) {
        if (arguments.length < 3)
            throw new Error("Handlebars Helper equal needs 2 parameters");
        if( lvalue!=rvalue ) {
            return options.inverse(this);
        } else {
            return options.fn(this);
        }
    });

    var rc = window.rupon.controllers,
        rv = window.rupon.views,
        rm = window.rupon.models,
        rh = window.rupon.helpers;

    /* reset all views unless otherwise stated in params */
    rc.resetViews = function(options) {

        options = options || {all_views: true};

        if (options.all_views || options.tooltip_view) {
            $(".thoughts-list").removeClass("select-text");
            $(".thought-row").removeClass("selected").trigger("tooltip-end");
        }

        if (options.all_views) {
            $("body").scrollTop(0);
        }
    };

    rupon.utils.getSelectionText = function() {
		var text = "";
		if (window.getSelection) {
		    text = window.getSelection().toString();
		} else if (document.selection && document.selection.type != "Control") {
		    text = document.selection.createRange().text;
		}
		return text;
    }

    rc.startIndexPage = function(message, options) {

        options = options || {};

		var indexView = new rupon.views.IndexView({message: message}),
            betaSignup    = options['beta-signup'],
            passwordReset = options['password-reset'],
            newUserEmail     = options['new-user-email'];

        indexView
            .on('subscribe', function(email, callback) {
                $.ajax({
                    type: "POST",
                    url:  "/register-beta",
                    data: {
                        "email": email
                    },
                    success: function(response) {
                        callback(response.msg);
                    }
                })
            });

        $('.index-container')
            .on('click', '.head-container .btn', function() {
                $("html, body").animate({ scrollTop: "550px" });
            });
        $('#topbar')
            .on('click', '.sign-up-btn', function() {
                new rv.ModalView({view: "signup"});
            })
            .on('click', '.log-in-btn', function() {
                new rv.ModalView({view: "login"});
            });

        if (betaSignup == "1" && newUserEmail) {
            var signupModal = new rv.SignupModal({
                email: newUserEmail,
                nonUserSignedUp: true
            });
            $(signupModal.$el).modal();
        } else if (betaSignup == "1") {
            var signupModal = new rv.SignupModal();
            $(signupModal.$el).modal();
        }

        if (passwordReset == "1") {
            new rv.ModalView({view: "login", message: "reset"});
        }

    }
    
    rc.applyTooltipEvents = function(view) {

        var setTooltipView = function() {

            var text = rupon.utils.getSelectionText();

            tooltipView = new rupon.views.TooltipView({collection: my_thoughts_collection, annotation: text});
            $(".jquery-gdakram-tooltip").find(".content").html(tooltipView.$el);

            tooltipView.on("create-reflection", function(attrs) {
                my_thoughts_collection.create(attrs,{wait:true});
                rc.resetViews({tooltip_view:true});
            });

        }

        view
            .on("tooltip-initialized", function() {
                setTooltipView() })
            .on("start-tooltip", function(ele) {

                $("body").animate({scrollTop:(ele.offset().top - 60)}, '20000', 'swing');

                $(".thought-row").trigger("tooltip-end");
                if (tooltipView) tooltipView.remove();

                ele.trigger("tooltip-start");

                $(document).click(function(event) {
                if($(event.target).parents().index($('.jquery-gdakram-tooltip')) == -1) {
                    if($('.jquery-gdakram-tooltip').is(":visible")) {
                    ele.trigger("tooltip-end");
                    rc.resetViews({tooltip_view:true});
                    }
                }
                })
            })
            .on("archive-thought", function(model) {
                model.save({archived: true});
            })
    }

})();
