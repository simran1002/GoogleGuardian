require("dotenv").config();

const nodemailer = require("nodemailer");
const express = require("express");
const path = require("path");
const ejs = require("ejs");
const passport = require("passport");
const cookieSession = require("cookie-session");
const Razorpay = require("razorpay");
const cors = require("cors");
const { nextTick } = require("process");
const { updateMany, updateOne, update } = require("./source/model/schema");
const jwt=require("jsonwebtoken");
const cookieParser=require("cookie-parser");
const bodyParser = require('body-parser')
const PORT = process.env.PORT || 5000
const session = require("express-session");
const schema = require("./source/model/schema");
const { response } = require("express");
require("./source/db/connection");
require("./passport-setup");
const app = express()
app.use(express.json());
app.use(cors());

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cors());
app.use(cookieParser());

app.use(session({
  resave: false,
  saveUninitialized: true,
  secret: process.env.secret 
}));

const views_path = path.join(__dirname,  "./views/pages");
const static_path = path.join(__dirname, "/public");
app.use(express.static(static_path ))
app.use(passport.initialize());
app.use(passport.session());
app.set("view engine", "ejs");


app.get('/',(req,res)=> {
    res.render("pages/index")
})


app.get('/pages/login',(req,res) => {
    res.render('pages/login');
})

app.get("/google",passport.authenticate("google", { scope: ["profile", "email"] })
);

app.get("/google/callback",passport.authenticate("google", { failureRedirect: "/failed" }),
    function(req,res){
      if (req.user.email.match(/[A-Za-z0-9]+@akgec\.ac\.in/g)) {
        res.redirect("/success");
      } else {
        res.send("Login using college email only")
      }
    }  
);

app.get('/success',(req,res) => {
  if(req.isAuthenticated()) {
    const userDetails = {
      email: req.user.email,
      name: req.user.name.givenName + " " + req.user.name.familyName,
      profileURL: req.user.picture
    }
    res.render("pages/register", {userDetailsNew: userDetails})
  } else {
    res.redirect("/")
  }   
})

function loggedIn(req, res, next) {
  if (req.user) {
      next();
  } else {
      res.redirect('/google');
  }
}

async function sendEmail(toAddress) {
  try {
    const transport = nodemailer.createTransport({
      service: "gmail",
      auth: {
        type: "OAuth2",
        user: process.env.USER_MAIL,
        clientId: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        accessToken: AUTH_ACCESS_TOKEN
      },
    });
 
    const mailOptions = {
        from: process.env.USER_MAIL,
        to: toAddress,
        subject:"This is the confirmation email",
        text:"Hello this is the body of the email",
        html:"<h1>Successfully registered for Workshop </h1>"
    }
 
    const result = await transport.sendMail(mailOptions)
 
    return result
 
  } catch (error) {
    console.log(error);
  }
}


app.post("/add/registered/user",async (req,res,next)=>{
  console.log(req.body)
    
  
  try {
    const userExist=await schema.findOne({email:req.body.email});
    
    if(!userExist){
      const registerUser=new schema({
        email:req.body.email,
        name:req.body.userName,
        profileurl:req.body.pictureURL,
        branch:req.body.branch,
        year:req.body.year,
        student_number:req.body.student_number,
        roll_number:req.body.roll_number
      })
      const userData=await registerUser.save();
       const token= await registerUser.generateAuthtoken();
      res.cookie("email",token);
      console.log(userData);
      console.log("registered Successfully");
      
      res.redirect("/payment");
    }
    else if(userExist.payment_status==true){
      
      res.redirect("/success");
    }
    else{
      console.log("User Already Exists")
      const token= await userExist.generateAuthtoken();
      res.cookie("email",token);
      res.redirect("/payment");
    }
    
  } catch (e) {
    console.log(e);
    res.status(400).json({message:"Details missing"});
  }
})


app.get("/payment",loggedIn,(req,res,next)=>{
  try {
    res.render("pages/payment",{
      email:req.body.email,
    });
  } catch (error) {
    console.log(error);
  }
})


app.post("/payment", async (req,res) => {
  let { amount } = req.body;

  var instance = new Razorpay({
    key_id: process.env.RAZORPAY_API_KEY,
    key_secret: process.env.RAZORPAY_API_SECRET,
  });
  let order = await instance.orders.create({
    amount: 50000,
    currency: "INR",
    receipt: "receipt#1",
  });
  res.status(201).json({
    success: true,
    order,
    amount,
  });
  });


  app.post("/verify", async (req, res) => {
    try {
      const paymentID=req.body.razorpay_payment_id;
      const order_id=req.body.razorpay_order_id;
      const signatureId=req.body.razorpay_signature;
      console.log(`paymentID= ${paymentID}`)
      console.log(`orderID= ${order_id}`)
      console.log(`signatureID= ${signatureId}`)
      const sign = order_id + "|" + paymentID;
      let body =order_id +"|" +paymentID;

      let crypto = require("crypto");
      let expectedSignature = crypto.createHmac("sha256", process.env.RAZORPAY_API_SECRET ).update(body.toString()).digest("hex");
      console.log("sign received ", signatureId);
      console.log("sign generated ", expectedSignature);
      var response = " Signature is false" ;
      if (expectedSignature === signatureId){
        const newdata=await schema.updateOne({
          payment_status:"true",
          order_id:order_id,
          payment_id:paymentID,
        });

        return res.status(200).json({ message: "Payment verified successfully" });
      } else {
        return res.status(400).json({ message: "Invalid signature sent!" });
      }
    } catch (error) {
      res.status(500).json({ message: "Internal Server Error!" });
      console.log(error);
    }
  });
  

app.listen(PORT,() => {
    console.log(`App is running at Port ${PORT}`);
});