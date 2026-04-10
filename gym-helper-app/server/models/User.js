import mongoose from "mongoose";

const setSchema = new mongoose.Schema({
    reps: Number,
    weight: Number
})

const performedExerciseSchema = new mongoose.Schema({
    name: String,
    sets: [setSchema]
})

const workoutSchema = new mongoose.Schema({
    time: Date,
    duration: Number,
    templateId: Number,
    templateName: String,
    exercises: [performedExerciseSchema]
})

const workoutTemplateSchema = new mongoose.Schema({
    id: Number,
    name: String,
    description: String,
    exercises: [String],
    days: [String]
})

const weeklyActivitySchema = new mongoose.Schema({
    day: String,
    minutes: { type: Number, default: 0 }
})

const exerciseSchema = new mongoose.Schema({
    name: String,
    category: String,
    bodyParts: [String]
})

const galleryItemSchema = new mongoose.Schema({
    url: String,
    date: { type: Date, default: Date.now }
});

const userSchema = new mongoose.Schema({
    email: { type: String, index: true, unique: false, sparse: true },
    password: String,
    googleId: { type: String, index: true, unique: false, sparse: true },
    provider: String,
    name: String,
    username: String,
    profilePicture: String,
    workoutHistory: [workoutSchema], //! Consider moving this to its own model; Users could log a lot of workouts
    workoutTemplates: [workoutTemplateSchema],
    customExercises: [exerciseSchema],
    nutrition: {
        targetCalories: Number,
        hydrationGoal: Number,
        macros: {
            protein: Number,
            carbs: Number,
            fats: Number
        }
    },
    dailyLog: {
        date: { type: Date, default: Date.now }, 
        calories: { type: Number, default: 0 },
        hydration: { type: Number, default: 0 },
        macros: {
            protein: { type: Number, default: 0 },
            carbs: { type: Number, default: 0 },
            fats: { type: Number, default: 0 }
        }
    },
    dailyTrackingHistory: [{
        date: Date,
        calories: { type: Number, default: 0 },
        hydration: { type: Number, default: 0 },
        macros: {
            protein: { type: Number, default: 0 },
            carbs: { type: Number, default: 0 },
            fats: { type: Number, default: 0 }
        }
    }],
    streak: { type: Number, default: 0 },
    prs: [{
        exercise: String,
        weight: String,
        metric: String
    }],
    gallery: [galleryItemSchema],
    weeklyActivity: [weeklyActivitySchema],
    
})

export const User = mongoose.model("user", userSchema);