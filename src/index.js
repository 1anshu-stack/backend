import connectDB from "./db/index.js";
import dotenv from "dotenv"



dotenv.config({
    path: "./env"
})
connectDB();















/*
import express from "express"
const app = express();
;( async ()=>{
    try {
        await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`)
        app.on("error", (error) => {
            console.log("error:application not able to talk to database ", error)
            throw error;
        })
    } catch (error) {
        console.error("Error:", error)
    }
}) */