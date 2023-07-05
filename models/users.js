const mongoose = require('mongoose')
const Schema = mongoose.Schema

const userSchema = new Schema({
  userId:{
    type:String,
    require:true
  },
  userPoint:{
    type:Number,
    require:true,
    default:0
  },
  userUptime:{
    type:Number,
    require:true,
    default:0
  }
})

const user = mongoose.model("User",userSchema)
module.exports = user