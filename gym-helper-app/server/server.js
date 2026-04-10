import dotenv from 'dotenv';
dotenv.config({ path: './.env' })

import connectToDB from './config/db.js';
import cors from 'cors';
import express from 'express';
import passport from 'passport';
import cookieParser from 'cookie-parser';
import http from 'http';
import configurePassport from './config/passport.js';
import authRoutes from './routes/auth.routes.js'
import profileRoutes from "./routes/profile.js";
import matchingRoutes from "./routes/matching.routes.js";
import path from "path";
import { initSocket } from './utils/socket.js';

const app = express();
const server = http.createServer(app);
app.use(cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true
}));

app.use(express.json());

app.use(cookieParser());

configurePassport(passport);
app.use(passport.initialize());

const __dirname = path.resolve();
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use('/api/auth', authRoutes);
app.use('/api/matching', matchingRoutes);

app.get("/", (req, res) => {
    res.send("Running");
})
app.use("/api/auth/me", profileRoutes);
// app.use("/uploads", express.static("uploads"));
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));
connectToDB()
    .then(() => {
        initSocket(server);
        const PORT = process.env.PORT || 5000;
        server.listen(PORT, () => {
            console.log(`Server is listening at port ${PORT}`);
        })
    })
    .catch((err) => {
        console.log("Mongo DB Connection Failed | ", err);
    })