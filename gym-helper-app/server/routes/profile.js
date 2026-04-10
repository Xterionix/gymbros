import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import passport from "passport";
import { User } from "../models/User.js"; // adjust path to your User model
import { authenticate } from "../middleware/auth.middleware.js"; 
import { checkAndRolloverDailyLog } from "../utils/rollover.js";


const router = express.Router();

// Ensure uploads folder exists
const uploadDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

// Multer setup: store files on disk
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}${ext}`);
  },
});

const upload = multer({ storage });

router.patch("/", authenticate, async (req, res) => {
  try {
    const { name, username, bio } = req.body;
    const normalizedBio = typeof bio === "string" ? bio.trim().slice(0, 280) : undefined;

    const updatePayload = { name, username };
    if (typeof normalizedBio === "string") {
      updatePayload.bio = normalizedBio;
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.user.sub, 
      updatePayload, 
      { new: true }
    );
    if (!updatedUser) {
      return res.status(404).json({ error: "User not found"});
    }
    
    res.json({ data: updatedUser });
  } catch (err) {
    console.error("Profile update failed:", err);
    res.status(500).json({ error: "Update failed" });
  }
});

router.patch("/avatar", 
    authenticate,
    upload.single("avatar"), 
    async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    // Build a URL to serve the file
    const uploadedUrl = `${req.protocol}://${req.get("host")}/uploads/${req.file.filename}`;

    // Update user in DB
    const updatedUser = await User.findByIdAndUpdate(
      req.user.sub,
      { profilePicture: uploadedUrl },
      { new: true }
    );
    
    if (!updatedUser) {
      return res.status(404).json({ error: "User not found"});
    }

    res.json({ data: updatedUser });
  } catch (err) {
    console.error("Avatar upload failed:", err);
    res.status(500).json({ error: "Upload failed" });
  }
});

router.patch("/nutrition", authenticate, async (req, res) => {
    try {
        const { calories, protein, carbs, fats } = req.body;
        
        let user = await User.findById(req.user.sub);
        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        await checkAndRolloverDailyLog(user);
        
        user.dailyLog.calories = calories;
        user.dailyLog.macros.protein = protein;
        user.dailyLog.macros.carbs = carbs;
        user.dailyLog.macros.fats = fats;
        user.dailyLog.date = new Date();
        
        await user.save();

        res.json({ data: user });
    } catch (err) {
        console.error("Nutrition update failed:", err);
        res.status(500).json({ error: "Nutrition update failed" });
    }
});

router.patch("/hydration", authenticate, async (req, res) => {
    try {
        const { hydration } = req.body;
        
        let user = await User.findById(req.user.sub ?? req.user.id);
        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        await checkAndRolloverDailyLog(user);

        user.dailyLog.hydration = hydration;
        user.dailyLog.date = new Date();
        
        await user.save();

        res.json({ data: user });
    } catch (err) {
        console.error("Hydration update failed:", err);
        res.status(500).json({ error: "Hydration update failed" });
    }
});

router.patch("/goals", authenticate, async (req, res) => {
    try {
    const { targetCalories, hydrationGoal, protein, carbs, fats } = req.body;
    const userId = req.user.sub ?? req.user.id;

    const existingUser = await User.findById(userId).select("nutrition");
    if (!existingUser) {
      return res.status(404).json({ error: "User not found" });
    }
        
        const updatedUser = await User.findByIdAndUpdate(
      userId,
            {
        "nutrition.targetCalories": targetCalories ?? existingUser.nutrition?.targetCalories ?? 0,
        "nutrition.hydrationGoal": hydrationGoal ?? existingUser.nutrition?.hydrationGoal ?? 3000,
        "nutrition.macros.protein": protein ?? existingUser.nutrition?.macros?.protein ?? 0,
        "nutrition.macros.carbs": carbs ?? existingUser.nutrition?.macros?.carbs ?? 0,
        "nutrition.macros.fats": fats ?? existingUser.nutrition?.macros?.fats ?? 0
            },
            { new: true }
        );

        if (!updatedUser) {
            return res.status(404).json({ error: "User not found" });
        }

        res.json({ data: updatedUser });
    } catch (err) {
        console.error("Goals update failed:", err);
        res.status(500).json({ error: "Goals update failed" });
    }
});

router.post("/gallery", authenticate, upload.single("image"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const uploadedUrl = `${req.protocol}://${req.get("host")}/uploads/${req.file.filename}`;
    
    // Push the new image object into the gallery array
    const updatedUser = await User.findByIdAndUpdate(
      req.user.sub,
      { 
        $push: { 
          gallery: { 
            url: uploadedUrl, 
            date: new Date() 
          } 
        } 
      },
      { new: true }
    );

    if (!updatedUser) {
        return res.status(404).json({ error: "User not found" });
    }

    res.json({ data: updatedUser });
  } catch (err) {
    console.error("Gallery upload failed:", err);
    res.status(500).json({ error: "Gallery upload failed" });
  }
});

router.delete("/gallery/:id", authenticate, async (req, res) => {
    try {
        const imageId = req.params.id;

        const updatedUser = await User.findByIdAndUpdate(
            req.user.sub,
            { 
                $pull: { gallery: { _id: imageId } } // Removes the item with this specific ID
            },
            { new: true }
        );

        if (!updatedUser) {
            return res.status(404).json({ error: "User not found" });
        }

        res.json({ data: updatedUser });
    } catch (err) {
        console.error("Gallery delete failed:", err);
        res.status(500).json({ error: "Delete failed" });
    }
});

router.patch("/activity", authenticate, async (req, res) => {
  try {
    const { WeeklyActivity } = req.body;
    const updatedUser = await User.findByIdAndUpdate(
      req.user.sub,
      { weeklyActivity },
      { new: true }
    );
    res.json({ data: updatedUser });
  } catch (err) {
    console.error("Activity update failed:", err);
    res.status(500).json({ error: "Activity update failed" });
  }
});

router.patch("/workouts", authenticate, async (req, res) => {
    try {
        const { routines } = req.body;
        const updatedUser = await User.findByIdAndUpdate(
            req.user.sub,
            { workoutTemplates: routines },
            { new: true }
        );
        res.json({ data: updatedUser });
    } catch (err) {
        console.error("Workout update failed:", err);
        res.status(500).json({ error: "Update failed" });
    }
});

router.post("/history", authenticate, async (req, res) => {
    try {
        const { duration, exercises, date, templateId, templateName } = req.body;
        const time = date ? new Date(date) : new Date();
        const durationMinutes = parseInt(duration) || 0;

        // 1. Add to workout history
        const newHistoryItem = { time, duration: durationMinutes, templateId, templateName, exercises: exercises || [] };

        const user = await User.findById(req.user.sub);
        if (!user) return res.status(404).json({ error: "User not found" });

        user.workoutHistory.push(newHistoryItem);

        // 2. Increment weeklyActivity for today
        const dayNames = ["S", "M", "T", "W", "Th", "F", "S"];
        const todayStr = dayNames[time.getDay()];
        
        let foundDay = false;
        for (let i = 0; i < user.weeklyActivity.length; i++) {
            if (user.weeklyActivity[i].day === todayStr) {
                user.weeklyActivity[i].minutes += durationMinutes;
                foundDay = true;
                break;
            }
        }
        
        // If they had no weeklyActivity schema populated, let's initialize it
        if (!foundDay) {
            if (user.weeklyActivity.length === 0) {
               dayNames.forEach(d => user.weeklyActivity.push({ day: d, minutes: 0 }));
               const todayObj = user.weeklyActivity.find(d => d.day === todayStr);
               if (todayObj) todayObj.minutes += durationMinutes;
            } else {
               user.weeklyActivity.push({ day: todayStr, minutes: durationMinutes });
            }
        }

        // 3. Recalculate streak strictly backwards
        const activeDates = new Set(
            user.workoutHistory.map(h => {
                const d = new Date(h.time);
                return d.toISOString().split("T")[0];
            })
        );
        
        let calculatedStreak = 0;
        let checkDate = new Date(); 
        
        const todayKey = checkDate.toISOString().split("T")[0];
        
        let testYesterday = new Date(checkDate);
        testYesterday.setDate(testYesterday.getDate() - 1);
        const yesterdayKey = testYesterday.toISOString().split("T")[0];
        
        // Grace period logic: If today isn't logged yet but yesterday is, streak counts from yesterday
        if (!activeDates.has(todayKey) && activeDates.has(yesterdayKey)) {
            checkDate.setDate(checkDate.getDate() - 1);
        }

        while (activeDates.has(checkDate.toISOString().split("T")[0])) {
            calculatedStreak++;
            checkDate.setDate(checkDate.getDate() - 1);
        }

        user.streak = calculatedStreak;

        await user.save();

        res.json({ data: user });
    } catch (err) {
        console.error("History logging failed:", err);
        res.status(500).json({ error: "History logging failed" });
    }
});

router.post("/nutrition/history", authenticate, async (req, res) => {
    try {
        const { date, calories, hydration, protein, carbs, fats } = req.body;

        if (!date) {
            return res.status(400).json({ error: "Date is required" });
        }

        const targetDate = new Date(date);
        const today = new Date();
        
        let user = await User.findById(req.user.sub ?? req.user.id);
        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        if (targetDate.toDateString() === today.toDateString()) {
            if (calories !== undefined && calories !== "") user.dailyLog.calories = Number(calories);
            if (hydration !== undefined && hydration !== "") user.dailyLog.hydration = Number(hydration);
            if (protein !== undefined && protein !== "") user.dailyLog.macros.protein = Number(protein);
            if (carbs !== undefined && carbs !== "") user.dailyLog.macros.carbs = Number(carbs);
            if (fats !== undefined && fats !== "") user.dailyLog.macros.fats = Number(fats);
        } else {
            const existingEntryIndex = user.dailyTrackingHistory.findIndex(entry => 
                new Date(entry.date).toDateString() === targetDate.toDateString()
            );

            if (existingEntryIndex > -1) {
                if (calories !== undefined && calories !== "") user.dailyTrackingHistory[existingEntryIndex].calories = Number(calories);
                if (hydration !== undefined && hydration !== "") user.dailyTrackingHistory[existingEntryIndex].hydration = Number(hydration);
                if (protein !== undefined && protein !== "") user.dailyTrackingHistory[existingEntryIndex].macros.protein = Number(protein);
                if (carbs !== undefined && carbs !== "") user.dailyTrackingHistory[existingEntryIndex].macros.carbs = Number(carbs);
                if (fats !== undefined && fats !== "") user.dailyTrackingHistory[existingEntryIndex].macros.fats = Number(fats);
            } else {
                user.dailyTrackingHistory.push({
                    date: targetDate,
                    calories: calories ? Number(calories) : 0,
                    hydration: hydration ? Number(hydration) : 0,
                    macros: {
                        protein: protein ? Number(protein) : 0,
                        carbs: carbs ? Number(carbs) : 0,
                        fats: fats ? Number(fats) : 0
                    }
                });
            }
            user.dailyTrackingHistory.sort((a, b) => new Date(a.date) - new Date(b.date));
        }

        await user.save();
        res.json({ data: user });
    } catch (err) {
        console.error("Historical nutrition logging failed:", err);
        res.status(500).json({ error: "Historical nutrition logging failed" });
    }
});

export default router;