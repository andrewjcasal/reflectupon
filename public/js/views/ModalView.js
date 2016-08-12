window.rupon = window.rupon || {};
window.rupon.views = window.rupon.views || {};

(function() {

    var rv = window.rupon.views;
    var cv = window.rupon.common_views;

    rv.ModalView = cv.BaseView.extend({
        initialize: function(opts) {
            if (opts.view == 'login') {
                var isReset = opts.message && opts.message == "reset";
                this.renderLogin(isReset);
            } else if (opts.view == 'signup') {
                this.renderSignup();
            }
        },

        renderLogin: function(isReset) {
            var loginView = new rv.LoginModal({reset: isReset}),
                loginViewEl = $(loginView.$el);
            loginView
                .on('show-forgot', function(email) {
                    loginViewEl.modal('hide');
                    var forgotView = new rv.ForgotModal({email: email});
                    $(forgotView.$el).modal();
                });
            loginViewEl.modal();
        },

        renderSignup: function() {
            var signupView = new rv.SignupView();

            var modal = new rv.MainModal({
                modalType: signupView,
                htmlTitle: '<span style="color:#00AA27">Beta</span> Sign up'
            })

            $(modal.$el).modal();
        }

    });

    rv.SignupModal = cv.Container.extend({
        className: "modal fade signup",
        template: Handlebars.templates['modal'],

        initialize: function(options) {
            /* for signup view */
            options = options || {};
            this.email = options.email;
            this.nonUserSignedUp = options.nonUserSignedUp;

            cv.Container.prototype.initialize.call(this);
            this.render();
        },

        render: function(options) {
            options.htmlTitle = '<span style="color:#00AA27">Beta</span> Sign up';
            this.$el.html(this.template(options));

            var params = {};

            if (this.email) {
                params.email = this.email;
            }

            if (this.nonUserSignedUp) {
                params.nonUserSignedUp = this.nonUserSignedUp;
            }
            this.addChild(new rv.SignupView(params), '.modal-body');
        }

    });

    rv.SignupView = cv.TemplateView.extend({
        template: Handlebars.templates['signup-view'],

        events: {
            'click .submit-box input': 'clickSubmit',
            'focusout #username-field input': 'checkUsername',
            'focusout #email-field input': 'checkEmail'
        },

        clickSubmit: function() {
            var error = false;

            var usernameField = this.$el.find('#username-field'),
                emailField    = this.$el.find('#email-field'),
                passwordField = this.$el.find('#password-field'),
                confirmField  = this.$el.find('#confirm-password-field');

            usernameField.find('span').html('');
            emailField.find('span').html('');
            passwordField.find('span').html('');
            confirmField.find('span').html('');

            if (!$.trim(usernameField.find('input').val())) {
                usernameField.find('span').html('Required');
                error = true;
            }

            var emailInput = emailField.find('input').val();
            if (!$.trim(emailInput)) {
                emailField.find('span').html('Required');
                error = true;
            } else if (!this.validateEmail(emailInput)) {
                emailField.find('span').html('Not an e-mail');
            }

            var passwordInput = passwordField.find('input').val();
            if (!$.trim(passwordInput)) {
                passwordField.find('span').html('Required');
                error = true;
            }

            var confirmInput = confirmField.find('input').val()
            if (!$.trim(confirmInput)) {
                confirmField.find('span').html('Required');
                error = true;
            }

            if (passwordInput != confirmInput) {
                passwordField.find('span').html('Passwords must match');
            }

            if (self.err || error) {
                return false;
            }
        },

        checkUsername: function() {
            var usernameField = this.$el.find('#username-field');
            usernameField.find('span').html('');
            var usernameInput = usernameField.find('input').val();
            if ($.trim(usernameInput) == "") {
            } else {
                var self = this;
                $.ajax({
                    type: "POST",
                    url: "/check-username",
                    data: {username: usernameInput},
                    success: function(response){
                        self.err = false;
                        if (response.msg == "already exists") {
                            usernameField.find('span').html('Username already exists.');
                            self.err = true;
                        }
                    },
                    dataType: "JSON"
                });
            }
        },

        checkEmail: function() {
            var emailField = this.$el.find('#email-field');
            emailField.find('span').html('');
            var emailInput = emailField.find('input').val();
            if ($.trim(emailInput) == "") {
            } else if (!this.validateEmail(emailInput)) {
                emailField.find('span').html('Not an e-mail');
            } else {
                var self = this;
                $.ajax({
                    type: "POST",
                    url: "/check-email",
                    data: {email: emailInput},
                    success: function(response){
                        self.err = false;
                        if (response.msg == "already exists") {
                            emailField.find('span').html('E-mail already exists.');
                            self.err = true;
                        }
                    },
                    dataType: "JSON"
                });
            }
        },

        validateEmail: function(email) {
            var re = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
            return re.test(email);
        }

    });

    rv.LoginModal = cv.TemplateView.extend({
        className: "modal fade login",
        template: Handlebars.templates['login-modal'],

        events: {
            'click .forgot-password':  'showForgotPassword',
            'click .submit-box input': 'clickSubmit'
        },

        showForgotPassword: function() {
            var username = this.$el.find('#username').val();

            if (!this.validateEmail(username)) {
                username = '';
            }
            this.trigger('show-forgot', username);
        },

        clickSubmit: function(e) {
            var username = this.$el.find('#username').val();
            var password = this.$el.find('#password').val();
            var form = this.$el.find('#login-form');
            var errorMsg = this.$el.find('.error-msg');

            e.preventDefault();
            $.ajax({
                type: "POST",
                url: "/check-password",
                data: form.serialize(),
                success: function(response){
                    if (response.status == "valid") {
                        form.submit();
                        $('input[type=submit]').val('Loading...')
                    } else {
                        errorMsg.show();
                    }
                }
            });
        },

        validateEmail: function(email) {
            var re = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
            return re.test(email);
        }
    });

    rv.ForgotModal = cv.TemplateView.extend({
        className: "modal fade forgot",
        template: Handlebars.templates['forgot-modal'],

        events: {
            'click .submit-forgot': 'clickSubmit'
        },

        clickSubmit: function() {
            var self = this,
                email = this.$el.find('#email').val();

            if ($.trim(email) != "") {
                $.ajax({
                    type: "POST",
                    url: "/forgot",
                    data: {email: email},
                    success: function(){
                        self.$el.find('.email-sent').show();
                    },
                    dataType: "JSON"
                });
            }

            return false;
        }
    });

    rv.MainModal = cv.Container.extend({
        className: "modal fade",
        template: Handlebars.templates['modal'],

        initialize: function(options) {
            cv.Container.prototype.initialize.call(this);
            this.render(options);
        },

        render: function(options) {
            options = options || {};
            this.$el.html(this.template(options));
            this.addChild(options.modalType, '.modal-body');
        }
    });

    rv.AddCommunityView = cv.TemplateView.extend({
        template: Handlebars.templates['add-community-view'],
        className: 'modal-view',

        events: {
            'click button': 'submitCommunity'
        },

        initialize: function(options) {
            mixpanel.track('view-add-community');
            cv.TemplateView.prototype.initialize.call(this, options);
        },

        submitCommunity: function() {
            mixpanel.track('submit-add-community');
            var self = this;
            var nameVal = this.$el.find('.name-val').val(),
                descriptionTextarea = this.$el.find('.description-val').val(),
                guidelinesTextarea = this.$el.find('.guidelines-val').val(),
                maxMembersVal = this.$el.find('.members-val').val();

            if ($.trim(nameVal) == "" || $.trim(descriptionTextarea) == "") {
                this.$el.find('.error-msg').show();
            } else { 

                var data = {
                    title:       nameVal,
                    description: descriptionTextarea,
                    guidelines:  guidelinesTextarea
                }

                if (maxMembersVal) {
                    data.maxUsers = parseInt(maxMembersVal);
                }
                $.ajax({
                    type: 'POST',
                    url:  '/api/communities',
                    data: data,
                    success: function(response) {
                        self.trigger('added', response.title);
                    },
                    dataType: 'JSON'
                });
            }
        }
    })

    rv.ConfirmCommunityView = cv.TemplateView.extend({
        template: Handlebars.templates['confirm-community-view']
    });

    rv.AddChallengesView = cv.TemplateView.extend({
        className: 'add-challenge-view modal-view',
        template: Handlebars.templates['add-challenges-view'],

        events: {
            'click button': 'submitChallenge',
            'change #file-input': 'changeFileInput'
        },

        initialize: function(options) {
            mixpanel.track('view-add-challenge');
            cv.TemplateView.prototype.initialize.call(this, options);
        },

        submitChallenge: function() {
            mixpanel.track('submit-add-challenge');
            var self = this;
            var challengeNameInput = this.$el.find('.challenge-name').val(),
                descriptionTextarea = this.$el.find('.description-val').val(),
                instructionsTextarea = this.$el.find('.instructions-val').val(),
                backgroundLinkInput = this.$el.find('.background-link-val').val();

            if ($.trim(challengeNameInput) == "" || $.trim(descriptionTextarea) == "" ||
                $.trim(instructionsTextarea) == "") {
                this.$el.find('.error-msg').show();
            } else { 
                $.ajax({
                    type: 'POST',
                    url:  '/api/challenges',
                    data: {
                        title:        challengeNameInput,
                        description:  descriptionTextarea,
                        instructions: instructionsTextarea,
                        link:         backgroundLinkInput
                    },
                    success: function(response) {
                        self.modelId = response._id;
                        self.checkFileInput(function() {
                            self.trigger('added', response);
                        });
                    },
                    dataType: 'JSON'
                });
            }
        },

        changeFileInput: function(e) {
            mixpanel.track('add-image-challenge');
            var reader = new FileReader();
            var self= this;

            reader.onload = function (e) {
                self.$el.find('#preview').attr('src', e.target.result);
            }
            reader.readAsDataURL($(e.currentTarget)[0].files[0]);
        },

      checkFileInput: function(callback) {
        var file = this.$el.find('#file-input')[0].files[0];
        fr = new FileReader();
        fr.onload = function() {
          console.log(fr.result);
        }

        if(file == null){
            callback(); 
        } else {
            this.getSignedRequest(file, callback);   
        }
      },

      getSignedRequest: function(file, callback){
        var self = this;
        var xhr = new XMLHttpRequest();
        var fileName = 'challenge-' + this.modelId +'.png';
        xhr.open('GET', '/sign-s3?file-name='+file.name+'&file-type='+file.type+'&image-type=challenges');
        xhr.onreadystatechange = function() {
          if(xhr.readyState === 4){
            if(xhr.status === 200){
              var response = JSON.parse(xhr.responseText);
              self.uploadFile(file, response.signedRequest, response.url, callback);
            }
            else{
              callback();
              alert('Could not get signed URL.');
            }
          }
        };
        xhr.send();
      },

      uploadFile: function(file, signedRequest, url, callback){
        var xhr = new XMLHttpRequest();
        var self = this;
        xhr.open('PUT', signedRequest);
        xhr.onreadystatechange = function() {
          if(xhr.readyState === 4){
            if(xhr.status === 200){

              $.ajax({
                  type: 'PUT',
                  url:  '/api/challenges/' +self.modelId,
                  data: {
                      avatar_url: url
                  },
                  success: function(response) {
                    callback();
                  },
                  dataType: 'JSON'
              });
            }
            else{
                callback();
              alert('Could not upload file.');
            }
          }
        };
        xhr.send(file);
      }
    })
})();