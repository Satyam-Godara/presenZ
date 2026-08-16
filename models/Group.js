const mongoose = require('mongoose');

const groupSchema = new mongoose.Schema({
    // subjectId : {type: mongoose.Schema.Types.ObjectId , ref:'Subject' , required:true},
    name : {type:String, required:true, unique:true, trim:true},
    code : {type:String,required:true, unique:true, trim:true}
},{timestamps:true});

module.exports = mongoose.model('Group',groupSchema);

