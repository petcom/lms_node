require('dotenv-safe').config({
    allowEmptyValues: true,
    example: './.env.example'
});

const dbConnect = require("./config/dbConnect");

const http = require("http");
const app  = require("./app/app");
const PORT = process.env.PORT || 8082;

// Connect to database
dbConnect();

// server
const server = http.createServer(app);
server.listen(PORT, console.log(`Server is running on port: ${PORT}`));