import dotenv from "dotenv";
dotenv.config();

const env = {
  nodeEnv: process.env.NODE_ENV || "development",

  port: process.env.PORT || 5000,

  mongoUri: process.env.MONGODB_URI,

  clientUrl: process.env.CLIENT_URL || "http://localhost:3000",

  basicRoute: process.env.BASIC_ROUTE || "/api/v1",

  accessTokenSecret: process.env.ACCESS_TOKEN_SECRET,
  accessTokenExpiresIn: process.env.ACCESS_TOKEN_EXPIRES_IN,

  refreshTokenSecret: process.env.REFRESH_TOKEN_SECRET,
  refreshTokenExpiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN,
};



export default env;