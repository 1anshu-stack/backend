import express from "express"
import cors from "cors"
import cookieParser from "cookie-parser"
import compression from "compression"



const app = express();


app.use(compression()) // css and js file get compressed but image files are not compressed here because that actually makes it longer to load them
app.use(cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true
}))
app.use(express.json({limit:"16kb"}))
app.use(express.urlencoded({extended:true, limit:"16kb"}))
app.use(express.static("public"))
app.use(cookieParser())



// router import
import userRouter from "./routes/user.route.js"


// router declaration
app.use("/api/v1/user", userRouter);



export {app};