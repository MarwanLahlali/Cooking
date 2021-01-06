const mongoose = require('mongoose');


const favoriteSchema = mongoose.Schema({
    image : String,
    title : String,
    description : String,
    user : String,
    date : {
        type: Date,
        default: Date.now()
    }
});




module.exports = mongoose.model('favorite' , favoriteSchema);