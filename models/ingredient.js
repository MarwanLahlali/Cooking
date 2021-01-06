const mongoose = require('mongoose');


const ingredientSchema = mongoose.Schema({
    name : String,
    quantity : Number,
    receipe : String,
    bestDish : String,
    user : String,
    date : {
        type: Date,
        default: Date.now()
    }
});




module.exports = mongoose.model('ingredient' , ingredientSchema);