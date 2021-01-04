const bcrypt = require("bcrypt");

module.exports = (passport, user) => {
	const User = user;
	const LocalStrategy = require("passport-local").Strategy;
	const GoogleStrategy = require("passport-google-oauth").OAuth2Strategy;

	// Local Sign Up
	passport.use(
		"local-signup",
		new LocalStrategy(
			{
				usernameField: "email",
				passwordField: "password",
				passReqToCallback: true, // allows us to pass back the entire request to the callback
			},

			function (req, username, password, done) {
				const generateHash = password => {
					return bcrypt.hashSync(password, bcrypt.genSaltSync(8), null);
				};

				User.findOne({
					where: {
						email: username,
					},
				}).then(user => {
					if (user) {
						return done(null, false, {
							message: "User already existed",
						});
					} else {
						const userPassword = generateHash(password);
						const data = {
							email: username,
							password: userPassword,
						};
						User.create(data).then((newUser, created) => {
							if (!newUser) {
								return done(null, false);
							}
							if (newUser) {
								return done(null, newUser);
							}
						});
					}
				});
			}
		)
	);

	// Serialize
	passport.serializeUser((user, done) => {
		done(null, user.id);
	});

	// Deserialzie user
	passport.deserializeUser((id, done) => {
		User.findByPk(id).then(user => {
			if (user) {
				done(null, user); // return req.user for routes and controllers
			} else {
				done(user.errors, null);
			}
		});
	});

	// Local Sign In
	passport.use(
		"local-signin",
		new LocalStrategy(
			{
				usernameField: "email",
				passwordField: "password",
				passReqToCallback: true,
			},

			function (req, username, password, done) {
				const User = user;
				const isValidPassword = (userpass, password) => {
					return bcrypt.compareSync(password, userpass);
				};

				User.findOne({
					where: {
						email: username,
					},
				})
					.then(user => {
						if (!user) {
							return done(null, false, {
								message: "User does not exist",
							});
						}
						if (!isValidPassword(user.password, password)) {
							return done(null, false, {
								message: "Incorrect password.",
							});
						}

						user.createCart();
						const userinfo = user.get();
						return done(null, userinfo);
					})
					.catch(err => {
						console.log("Error:", err);

						return done(null, false, {
							message: "Something went wrong with your Signin",
						});
					});
			}
		)
	);

	// Google Sign In
	passport.use(
		new GoogleStrategy(
			{
				clientID: process.env.GOOGLE_CLIENT_ID,
				clientSecret: process.env.GOOGLE_CLIENT_SECRET,
				callbackURL: `http://127.0.0.1:3000/auth/google/callback`,
			},
			function (accessToken, refreshToken, profile, done) {
				// console.log(profile);
				User.findOne({
					where: {
						email: profile.emails[0].value,
					},
				}).then(user => {
					if (user) {
						user.createCart();
						return done(null, user);
					} else {
						User.create({email: profile.emails[0].value}).then((newUser, created) => {
							if (!newUser) {
								return done(null, false);
							}
							if (newUser) {
								newUser.createCart();
								return done(null, newUser);
							}
						});
					}
				});
			}
		)
	);
};
