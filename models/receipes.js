const mongoose = require('mongoose');


const receipeSchema = mongoose.Schema({
    name : String,
    image : String,
    user : String
});




module.exports = mongoose.model('receipe' , receipeSchema);