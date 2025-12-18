const mongoose = require("mongoose");

const dbConnect = async() => {
    try {
        const mongoUrl = process.env.MONGO_URL;
        
        if (!mongoUrl) {
            throw new Error('MONGO_URL is not defined in environment variables');
        }

        await mongoose.connect(mongoUrl);
        console.log("DB connected successfully");
    } catch (error) {
        console.error("DB connection failed:", error.message);
        process.exit(1);
    }
};

module.exports = dbConnect;