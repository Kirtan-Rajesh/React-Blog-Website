import express from 'express';
import mongoose from 'mongoose';
import 'dotenv/config';
import bcrypt from 'bcrypt';
import { nanoid } from 'nanoid';
import jwt from 'jsonwebtoken';
import cors from 'cors';
import admin from "firebase-admin";
import serviceAccountKey from "./react-js-blog-website-ffa4d-firebase-adminsdk-pkbo4-65722782eb.json" assert {type:"json"}
import {getAuth} from "firebase-admin/auth";
// Import User schema from the specified path
import User from './Schema/User.js';
import e from 'express';
import aws from "aws-sdk";
const server = express();
const PORT = 3000;
import Blog from "../server/Schema/Blog.js";

// Regular expressions for email and password validation
let emailRegex = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;
let passwordRegex = /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).{6,20}$/;

server.use(express.json());
server.use(cors());

admin.initializeApp({
    credential:admin.credential.cert(serviceAccountKey)
})

// Connect to the MongoDB database using the provided location
mongoose.connect(process.env.DB_LOCATION, {
    autoIndex: true
});


const verifyJWT =(req, res, next) =>{
    const authHeader = req.headers['authorization'];
    const token= authHeader && authHeader.split(" ")[1];

    if(token == null){
        return res.status(401).json({error: "NO access token"})
    }
        jwt.verify(token, process.env.SECRET_ACCESS_KEY, (err, user)=>{
            if(err){
                return res.status(403).json({error: "Access token is invalid" })
            }

            req.user =user.id;
            next()
        })
}

//setting up the bucket
const s3= new aws.S3({
    region:'ap-south-1',
    accessKeyId: process.env.AWS_ACCESS_KEY  ,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
})


const generateUploadUrl =async ()=>{

    const date =new Date();
    const imageName = `${nanoid()}-${date.getTime()}.jpeg`;
    return await s3.getSignedUrlPromise('putObject',{
        Bucket:"react-blog-website",
        Key: imageName,
        Expires: 1000,
        ContentType: "image/jpeg"
    })

}



const formatDataToSend = (user) => {
    // Create an access token using JWT with the user's ID and a secret access key
    const access_token = jwt.sign({ id: user._id }, process.env.SECRET_ACCESS_KEY);

    // Return formatted data
    return {
        access_token, // Include the access token in the response
        profile_img: user.personal_info.profile_img, // Include the user's profile image
        username: user.personal_info.username, // Include the user's username
        fullname: user.personal_info.fullname // Include the user's full name
    };
};

// Function to generate a unique username based on the email
const generateUsername = async (email) => {
    let username = email.split('@')[0];

    // Check if the generated username already exists in the database
    let isUserNameNotUnique = await User.exists({ "personal_info.username": username }).then((result) => result);

    // If not unique, append a short random string to make it unique
    isUserNameNotUnique ? username += nanoid().substring(0, 5) : "";

    return username;
};


server.get('/get-upload-url', (req,res) =>{
    generateUploadUrl().then(url =>res.status(200).json({uploadURL: url}))
    .catch(err =>{
        console.log(err.message);
        return res.status(500).json({error: err.message})
    })
})


// Endpoint for user signup
server.post("/signup", (req, res) => {
    let { fullname, email, password } = req.body;

    // Check if fullname is defined and has a length greater than or equal to 3
    if(fullname){
        if (fullname.toString().length < 3) {
            return res.status(403).json("Fullname should be more than 3 letters" );
        }
        }

    if (!email) {
        return res.status(403).json({ "error": "Enter Email" });
    }
    if (!emailRegex.test(email)) {
        return res.status(403).json({ "error": "Enter a Valid email" });
    }
    if (!passwordRegex.test(password)) {
        return res.status(403).json({ "error": "Enter a Valid password. It should contain 1 uppercase, 1 numeric and 1 special character" });
    }

    // Encrypt the password using bcrypt
    bcrypt.hash(password, 10, async (err, hashed_password) => { 
        let username = await generateUsername(email);

        // Create a new User instance with the provided data
        let user = new User({
            personal_info: { "fullname":fullname, "email":email, "password":hashed_password, "username":username }
        });

        console.log(fullname);
        console.log(username)

        // Save the user data to the database
        user.save().then((u) => {
            return res.status(200).json(formatDataToSend(u));
        })
            .catch(err => {
                if (err.code == 11000) {
                    return res.status(500).json({ "error": "Email already exists" });
                }
                return res.status(500).json({ "error": err.message });
            });
    });
});


server.post("/signin", (req,res)=> {
    
    let {email,password} =req.body;
    User.findOne({"personal_info.email":email})
    .then((user)=>{
        if(!user){
            return res.status(403).json({"error":"Email not found"})
        }
    
        if(!user.google_auth){

            bcrypt.compare(password,user.personal_info.password,(err,result)=>{
                if(err){
                    return res.status(403).json({"error":"Error occured while login. Please try again or during the password hashing"})
                }
                if(!result){
                    return res.status(403).json({"error":"Incorrect password"})
    
                }
                else{
                    return res.status(200).json(formatDataToSend(user))
                }
            })

        }else{
            return res.status(403).json({"error":"Account was created using google. Try logging in with google."})
        }
    })
    .catch(err => {
        console.log(err.message);
        return res.status(500).json({"error":err.message})
    })

})


server.post("/google-auth", async(req,res)=>{
    let {access_token} = req.body;
    
    getAuth()
    .verifyIdToken(access_token)
    .then(async (decodecUser)=>{
        let{email,name,picture} =decodecUser;

        picture=picture.replace("s96-c","s384-c");

        let user = await User.findOne({"personal_info.email":email}).select("personal_info.fullname personal_info.username personal_info.profile_img google_auth").then((u)=>{
            return u || null
        })
        .catch(err =>{
            return res.status(500).json({"error":err.message})
        })
        if(user){
            if(!user.google_auth){
                return res.status(403).json({"error":"This mail was signed up without google. Please log in with password to access the account"})
            }
        }
        else{ //sign up
            let username = await generateUsername(email);

            user= new User({
                personal_info:{ fullname:name, email, profile_img: picture, username },
                google_auth:true
            })

            await user.save().then((u) =>{
                user=u;
            })
            .catch(err =>{
                return res.status(500).json({"error" : err.message});
            })
        }

        return res.status(200).json(formatDataToSend(user))

    })
    .catch(err=>{
        return res.status(500).json({"error":"Failed to authenticate you with google. Try with another account."})
    })
    
})

let maxLimit=5;

server.get('/latest-blogs',(req,res)=>{

    Blog.find({draft:false})
    .populate("author","personal_info.profile_img personal_info.username personal_info.fullname -_id")
    .sort({"pushlishedAt":-1})
    .select("blog_id title des banner activity tags publishedAt -_id")
    .limit(maxLimit)
    .then(blogs =>{
        return res.status(200).json({blogs})
    })
    .catch(err=>{
        return res.status(500).json({error: err.message} )
    })
})

server.get('/trending-blogs',(req,res)=>{

    Blog.find({draft:false})
    .populate("author","personal_info.profile_img personal_info.username personal_info.fullname -_id")
    .sort({"activity.total_read":-1, "activity.total_likes":-1,"publishedAt":-1})
    .select("blog_id title publishedAt -_id")
    .limit(5)
    .then(blogs =>{
        return res.status(200).json({blogs})
    })
    .catch(err=>{
        return res.status(500).json({error: err.message} )
    })
})


server.post("/search-blogs", (req, res) => {
   
        let { tag } = req.body;

        let findQuery = { tags: tag, draft: false };
        let maxLimit = 5;

        Blog.find(findQuery)
        .populate("author","personal_info.profile_img personal_info.username personal_info.fullname -_id")
        .sort({"pushlishedAt":-1})
        .select("blog_id title des banner activity tags publishedAt -_id")
        .limit(maxLimit)
        .then(blogs =>{
            return res.status(200).json({blogs})
        })
        .catch(err=>{
            return res.status(500).json({error: err.message} )
        })
});


server.post('/create-blog', verifyJWT ,(req,res) =>{
        let authorId =req.user;

        let {title,des,banner,tags,content,draft}= req.body;
        
        if(!title.length){
            return res.status(403).json({error:"You must provide a title to continue "});
        }
        if(!draft){
            if(!des.length){
                return res.status(403).json({error:'Please add a description for your post'});
            }
    
            if(!banner.length){
                return res.status(403).json({error: "You must provide blog banner to publish it"});
            }
    
            if(!content.blocks.length){
                return res.status(403).json({error:"Content is empty! Please write something."});
                
            }
            if(!tags.length || tags.length>10){
                return res.status(403).json({error:`Tags should be between 1 and 10`});
            }

        }


        tags = tags.map(tag => tag.toLowerCase());

        let blog_id = title.replace(/[^a-zA-Z0-9]/g,' ').replace(/\s+/g,"-").trim() + nanoid();
        console.log(blog_id);

        let blog= new Blog({
            title, des, banner, tags, author: authorId, blog_id, draft: Boolean(draft)

        })

        blog.save().then(blog =>{
            let incrementVal = draft ? 0:1;

            User.findOneAndUpdate({_id: authorId},{ $inc:{ "account_info.total_posts" :incrementVal}, $push:{"blogs": blog._id } })
            .then(user =>{
                return res.status(200).json({id: blog.blog_id})
            })
            .catch(err=>{
                return res.status(500).json({ error: "Failed to update total posts number"})
            })
        })
        .catch(err=>{
            return res.status(500).json({ error: err.message });
        })


})

// Start the server and listen on the specified port
server.listen(PORT, () => {
    console.log('Listening on port -> ' + PORT);
});
