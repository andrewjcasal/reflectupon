var communities     = require('./api/communities')
    challenges      = require('./api/challenges');

exports.get = function(req, res) {
    var is_admin = req.user.email == 'andrewjcasal@gmail.com' || req.user.email == "stranovich@gmail.com";

    if (is_admin) {
      communities.getCommunities({approved: 'all'}, function(communities){
        challenges.getChallenges({}, function(challenges) {
          res.render('superuser', {
            landing_page: false,
            topBar: true,
            is_admin: is_admin,
            signout: true,
            user: JSON.stringify(req.user),
            challenges: JSON.stringify(challenges),
            communities: JSON.stringify(communities)
          });
        })
      })
    } else {
      res.redirect('/home');
    }
}