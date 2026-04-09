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
    const { name, username } = req.body;
    const updatedUser = await User.findByIdAndUpdate(
      req.user.sub, 
      { name, username }, 
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
        const { targetCalories, protein, carbs, fats } = req.body;
        
        const updatedUser = await User.findByIdAndUpdate(
            req.user.sub,
            {
                "nutrition.targetCalories": targetCalories,
                "nutrition.macros.protein": protein,
                "nutrition.macros.carbs": carbs,
                "nutrition.macros.fats": fats
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

export default router;