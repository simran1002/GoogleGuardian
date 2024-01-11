const mongoose = require("mongoose");
const jwt=require("jsonwebtoken");

const studentSchema = new mongoose.Schema({
    name:  {
        type:String,
        required: true
    },
    email:  {
        type:String,
        required: true,
        unique:true
    },
    profileurl:  {
        type:String,
        required: true
    },
    branch:  {
        type:String,
        required: true
    },
    year:  {
        type:Number,
        required: true
    },
    student_number:  {
        type:Number,
        required: true,
        unique: true
    },
    roll_number:  {
        type:Number,
        required: true,
        unique: true
    },
    payment_status:{
        type:Boolean,
        default:false,
    },
    order_id:{
        type:String,
        default:"NULL"
    },
    payment_id:{
        type:String,
        default:"NULL",
    }
})

studentSchema.methods.generateAuthtoken=async function(){
    try {
        console.log(this.email);
        const token=jwt.sign({email:this.email.toString()},"Google");
        return token;
        
    } catch (error) {
        console.log(error);
    }
}

const Schema = new mongoose.model("schema", studentSchema);

module.exports= Schema;









