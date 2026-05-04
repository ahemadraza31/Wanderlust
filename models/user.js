const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const passportLocalMongoose = require("passport-local-mongoose");

const userSchema = Schema({
  email: {
    type: String,
    required: true,
  },
  fName: {
    type: String,
    required: true,
  },
  lName: {
    type: String,
  },
  googleId: {
    type: String,
  },
  facebookId: {
    type: String,
  },
  image: {
    url: String,
    filename: String,
  },
});

userSchema.plugin(passportLocalMongoose);

// const upload = multer({ dest: 'uploads/' })  //uploads folder me save karega
module.exports = mongoose.model("User", userSchema);
