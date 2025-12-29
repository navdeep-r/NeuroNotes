require('dotenv').config();

module.exports = {
  PORT: process.env.PORT || 5000,
  MONGO_URI: process.env.MONGO_URI || 'mongodb://localhost:27017/neuronotes',
  DEMO_MODE: process.env.DEMO_MODE === 'true',
  GEMINI_API_KEY: process.env.GEMINI_API_KEY,
  GROK_API_KEY: process.env.GROK_API_KEY,
};
