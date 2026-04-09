import { Strategy } from "passport-google-oauth20";
import { User } from "../models/User.js";

export default function configurePassport(passport) {
    passport.use(
        new Strategy(
            {
                clientID: process.env.GOOGLE_CLIENT_ID,
                clientSecret: process.env.GOOGLE_CLIENT_SECRET,
                callbackURL: `${process.env.SERVER_URL || process.env.URL || ''}/api/auth/google/callback`
            },
            async (accessToken, refreshToken, profile, done) => {
                try {
                    const googleId = profile.id;
                    const email = profile.emails && profile.emails[0] && profile.emails[0].value;
                    const name = profile.displayName || (profile.name && `${profile.name.givenName} ${profile.name.familyName}`) || '';
                    const avatar = profile.photos && profile.photos[0] && profile.photos[0].value;

                    let user = await User.findOne({ googleId });
                    if (!user) {
                        // Try to upsert by email if present to avoid duplicate accounts
                        if (email) {
                            user = await User.findOne({ email });
                        }
                    }

                    if (!user) {
                        const defaultTemplates = [
                            {
                                id: Date.now() + 1,
                                name: "Push Day",
                                description: "Chest, Shoulders, and Tricep focus.",
                                exercises: ["Incline Bench Press", "Overhead Press", "Lateral Raises", "Tricep Pushdowns"],
                                days: ["Monday"]
                            },
                            {
                                id: Date.now() + 2,
                                name: "Pull Day",
                                description: "Back and Bicep focus.",
                                exercises: ["Pull-ups", "Barbell Rows", "Face Pulls", "Bicep Curls"],
                                days: ["Wednesday"]
                            },
                            {
                                id: Date.now() + 3,
                                name: "Leg Day",
                                description: "Quads, Hamstrings, and General Lower Body.",
                                exercises: ["Barbell Squats", "Romanian Deadlifts", "Leg Press", "Calf Raises"],
                                days: ["Friday"]
                            }
                        ];

                        user = await User.create({
                            googleId,
                            provider: 'google',
                            username: name.toLowerCase().replace(/\s+/g, ''),
                            email,
                            name,
                            avatar,
                            workoutTemplates: defaultTemplates
                        });
                    } else if (!user.googleId) {
                        // If a user existed by email, attach googleId
                        user.googleId = googleId;
                        user.provider = 'google';
                        user.avatar = user.avatar || avatar;
                        await user.save();
                    }

                    return done(null, user);
                } catch (err) {
                    return done(err, null);
                }
            }
        )
    );
}

