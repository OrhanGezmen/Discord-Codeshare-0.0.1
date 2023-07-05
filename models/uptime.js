const mongoose = require('mongoose')
const Schema = mongoose.Schema 

const uptimeSchema = new Schema({
  uptimeID:{type:String,require:true},
  uptimeLink:{type:String,require:true},
  userId:{type:String,require:true},
})

const uptime = mongoose.model("Uptime",uptimeSchema)
module.exports = uptime