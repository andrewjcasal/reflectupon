var mongoose = require('mongoose')
  , Schema   = mongoose.Schema;

var communitySchema = Schema({
    creator:        { type: Schema.Types.ObjectId, ref: 'User'},
    title:          String,
    description:    String,
    date:           Date,
    guidelines:     String,
    members:        [{
      type: Schema.Types.ObjectId,
      ref: 'User',
      index: {unique: true, dropDups: true}
    }],
    maxUsers:       { type: Number, default: 20 },
    communityChallenges: [{
      pos: Number
    , date: Date
    , challenge: {
        type: Schema.Types.ObjectId, ref: 'Challenge'
      }
    }],
    coverUrl: String,
    approved: { type: Boolean, default: true}
});

communitySchema.pre("save", function(next) {
  this.communityChallenges = this.communityChallenges || [];

  if (!this.communityChallenges.length) {
    this.communityChallenges.push(
      {pos: 1},
      {pos: 2},
      {pos: 3}
      )
  }
  next();
})

mongoose.model('Community', communitySchema);