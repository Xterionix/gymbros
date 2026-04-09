export const checkAndRolloverDailyLog = async (user) => {
    if (!user || !user.dailyLog || !user.dailyLog.date) return false;

    const todayStr = new Date().toDateString();
    const logDateStr = new Date(user.dailyLog.date).toDateString();

    if (todayStr !== logDateStr) {
        // Evaluate if there is data to archive
        const hasData = user.dailyLog.calories > 0 || 
                        user.dailyLog.hydration > 0 || 
                        user.dailyLog.macros.protein > 0 || 
                        user.dailyLog.macros.carbs > 0 || 
                        user.dailyLog.macros.fats > 0;
        
        if (hasData) {
            user.dailyTrackingHistory.push({
                date: user.dailyLog.date,
                calories: user.dailyLog.calories,
                hydration: user.dailyLog.hydration,
                macros: user.dailyLog.macros
            });
        }

        user.dailyLog.date = new Date();
        user.dailyLog.calories = 0;
        user.dailyLog.hydration = 0;
        user.dailyLog.macros = { protein: 0, carbs: 0, fats: 0 };
        return true; // Means modifying the schema object happened natively. Must call user.save() afterwards.
    }
    return false;
};
