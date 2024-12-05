import connectDB from "./db/index.js";
import dotenv from "dotenv"
import { app } from "./app.js";



dotenv.config({
    path: "./env"
})



connectDB()
.then(()=>{
    app.listen(process.env.PORT || 8000, () => {
        console.log(`Server running at port: ${process.env.PORT}`)
    })
})
.catch((err)=>{
    console.log("MongoDB connection failed!", err)
})



 







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