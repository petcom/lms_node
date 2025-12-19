const mongoose = require("mongoose");
const logger = require("../utils/logger");

const dbConnect = async() => {
    try {
        const mongoUrl = process.env.MONGO_URL;
        
        if (!mongoUrl) {
            throw new Error('MONGO_URL is not defined in environment variables');
        }

        await mongoose.connect(mongoUrl);
        logger.info("Database connected successfully");
        logger.info(`Database: ${mongoose.connection.name}`);
        logger.info(`Host: ${mongoose.connection.host}:${mongoose.connection.port}`);
    } catch (error) {
        logger.error("Database connection failed", { 
            error: error.message,
            stack: error.stack 
        });
        process.exit(1);
    }
    
    // Database connection event handlers
    mongoose.connection.on('error', (err) => {
        logger.error('Database error', { error: err.message });
    });
    
    mongoose.connection.on('disconnected', () => {
        logger.warn('Database disconnected');
    });
    
    mongoose.connection.on('reconnected', () => {
        logger.info('Database reconnected');
    });
};

module.exports = dbConnect;