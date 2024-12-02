import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { User } from "../models/user.model.js"
import { uploadOnCloudinary } from "../utils/cloudinary.js"
import jwt from "jsonwebtoken";



const generateAccessAndRefreshTokens = async (userId) => {
    try {
        const user = await User.findById(userId);
        
        if (!user) {
            throw new ApiError(404, "User not found");
        }

        const accessToken = user.generateAccessToken();
        const refreshToken = user.generateRefreshToken();

        user.refreshToken = refreshToken;

        await user.save({ validateBeforeSave: false });

        return { accessToken, refreshToken };
    } catch (error) {
        console.error("Error generating tokens:", error); // Log the error for debugging
        throw new ApiError(500, "Something went wrong while generating refresh and access token");
    }
};




const registerUser = asyncHandler(async (req, res) => {
    // get user details from frontend
    // validation - not empty
    // check if user already exits: username, email
    // check for images, check for avatar
    // upload them to cloudinary, avatar
    // create user object - create entry in db
    // remove password and refresh token field rom response
    // check for user creation
    // return res

    const { fullName, email, username, password } = req.body
    // console.log("email:", email)

    if (
        [fullName, email, username, password].some((field) => field?.trim() === "")
    ) {
        throw new ApiError(400, "All fields are required")
    }

    const existedUser = await User.findOne({
        $or: [{ username }, { email }]
    })

    if (existedUser) {
        throw new ApiError(409, "User with email or username already exist")
    }

    const avatarLocalPath = req.files?.avatar[0]?.path;
    // const coverImageLocalPath = req.files?.coverImage[0]?.path;

    let coverImageLocalPath
    if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
        coverImageLocalPath = req.files.coverImage[0].path;
    }


    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar file is required")
    }


    const avatar = await uploadOnCloudinary(avatarLocalPath)
    const coverImage = await uploadOnCloudinary(coverImageLocalPath)


    if (!avatar) {
        throw new ApiError(400, "Avatar file is required to upload on cloudinary")
    }


    const user = await User.create({
        fullName,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
        email,
        username: username.toLowerCase(),
        password
    })

    const createUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )

    if (!createUser) {
        throw new ApiError(500, "Something went wrong while registering a user")
    }

    return res.status(201).json(
        new ApiResponse(200, createUser, "user register successfully")
    )
})



const loginUser = asyncHandler(async (req, res) => {
    // req body -> data
    // username or email
    // find the user
    // password check
    // access or refresh token
    // send cookies

    const { email, username, password } = req.body;
    // console.log(password)

    if (!(email || username)) {
        throw new ApiError(400, "username or email is require")
    }

    const user = await User.findOne({
        $or: [{ username }, { email }]
    })

    // console.log("user", user);

    if (!user) {
        throw new ApiError(404, "User does not Exist")
    }

    const isPasswordValid = await user.isPasswordCorrect(password);

    if (!isPasswordValid) {
        throw new ApiError(401, "Invalid user password")
    }

    const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(user._id)

    console.log("inner acess", accessToken)
    console.log("inner ref", refreshToken);

    const loggedInUser = await User.findById(user._id).select("-password -refreshToken")

    const options = {
        httpOnly: true,
        secure: true
    }

    return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(
            new ApiResponse(
                200,
                {
                    user: loggedInUser, accessToken, refreshToken
                },
                "User logged In Successfully"
            )
        )
})



const logoutUser = asyncHandler(async (req, res) => {
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                refreshToken: undefined
            }
        },
        {
            new: true
        }
    )

    const options = {
        httpOnly: true,
        secure: true
    }

    return res
        .status(200)
        .clearCookie("accessToken", options)
        .clearCookie("refreshToken", options)
        .json(new ApiResponse(
            200, {}, "User logged Out"
        ))
})



const refreshAccesstoken = asyncHandler(async (req, res) => {
    const incommingRefreshToken = req.cookies.refreshToken || req.body.refreshToken;

    if(!incommingRefreshToken){
        throw new ApiError(401, "unauthorised Request")
    }

    const decodeRefreshToken = jwt.verify(incommingRefreshToken, process.env.REFRESH_TOKEN_SECRET)

    try {
        if(!decodeRefreshToken){
            throw new ApiError(401, "unauthorised Request")
        }
    
        const user = await User.findById(decodeRefreshToken?._id);
    
        if(!user){
            throw new ApiError(401, "Invalid refresh token")
        }
    
        if(incommingRefreshToken !== user?.refreshToken){
            throw new ApiError(401, "Refresh token is expired or used")
        }
    
        const {accessToken, newRefreshToken} = await generateAccessAndRefreshTokens(user._id);
    
        const options = {
            httpOnly: true,
            secure: true
        }
    
        return res
        .status(201)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", newRefreshToken, opitons)
        .json(
            new ApiResponse(
                201, 
                {
                    accessToken, refreshToken: newRefreshToken
                },
                "access token refreshed"
            )
        )
    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid refresh token")
    }

})



const changeCurrentPassword = asyncHandler( async (req, res) => {
    const {oldPassword, newPassword} = req.body;

    const user = await User.findById(req.user?._id);
    const isPassword = await user.isPasswordCorrect(oldPassword);

    if(!isPassword){
        throw new ApiError(401, "Invalid old password")
    }

    user.password = newPassword
    await user.save({validateBeforeSave: false})

    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            {},
            "Password change successfully"
        )
    )
})



const getCurrentUser = asyncHandler( async (req, res) => {
    return res
    .status(200)
    .json(
        new ApiResponse(
            200, 
            req.user,
            "current user Fetch successfully"
        )
    )
})



const updateAccountDetails = asyncHandler( async (req, res) => {
    const {username, fullName} = req.body;

    if(!username || !fullName){
        throw new ApiError(401, "All fileds are required")
    }

    const user = await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                fullName,
                email
            }
        },
        {
            new: true
        }
    ).select("-password -refreshToken")


    return res
    .status(200)
    .json(
        new ApiResponse(
            200, 
            user,
            "Account details updated successfully"
        )
    )
})



const updateUserAvatar = asyncHandler( async (req, res) => {
    const avatarLocalPath = req.file?.path

    if(!avatarLocalPath){
        throw new ApiError(402, "Avatar file is missing")
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath);

    if(!avatar.url){
        throw new ApiError(400,"Error while uploading avatar file")
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                avatar: avatar.url
            }
        },
        {new: true}
    ).select("-password -refreshToken")


    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            user,
            "Avatar Image updated successfully"
        )
    )
})



const updateUserCoverImage = asyncHandler( async (req, res) => {
    const coverImageLocalPath = req.file?.path

    if(!coverImageLocalPath){
        throw new ApiError(402, "CoverImage file is missing")
    }

    const coverImage = await uploadOnCloudinary(avatarLocalPath);

    if(!coverImage.url){
        throw new ApiError(400,"Error while uploading CoverImage")
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                coverImage: coverImage.url
            }
        },
        {new: true}
    ).select("-password -refreshToken")


    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            user,
            "coverImage updated successfully"
        )
    )
})



export {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccesstoken,
    changeCurrentPassword,
    getCurrentUser,
    updateAccountDetails,
    updateUserAvatar,
    updateUserCoverImage
}