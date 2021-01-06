const express = require('express');
const app = express();
const dotenv = require('dotenv').config()

const ejs = require('ejs');
const bodyParser = require('body-parser');
app.use(bodyParser.urlencoded({ extended: false }));  //BodyParser

const mongoose = require('mongoose');

const methodOverride = require('method-override');




const bcrypt = require('bcrypt');
const randToken = require('rand-token');
const nodeMailer = require('nodemailer');

const session = require('express-session');
const passport = require('passport');
const passportLocalMongoose = require('passport-local-mongoose');

// MODELS
const User = require('./models/user.js');
const Reset = require('./models/reset.js');
const Receipe = require('./models/receipes');
const Ingredient = require('./models/ingredient');
const Schedule = require('./models/schedule');
const Favourite = require('./models/favorite.js');

app.use(express.static(__dirname + '/public')); //public
app.set('view engine', 'ejs');  //views

app.use(session({
    secret: 'mysecret',
    resave: false,
    saveUninitialized: false

}));

app.use(passport.initialize());
app.use(passport.session());

//connectio MongoDB
mongoose.connect('MongoDB URI', { useNewUrlParser: true, useUnifiedTopology: true });
mongoose.set('useUnifiedTopology', true);
mongoose.set('useFindAndModify', false);


// passport-local-mongoose
passport.use(User.createStrategy());
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());



/*  FLASH  */
const flash = require('connect-flash');
app.use(flash());
app.use(function (req, res, next) {
    res.locals.currentUser = req.user;
    res.locals.error = req.flash("error");
    res.locals.success = req.flash('success');
    next();
});


app.get('/signup', function (req, res) {
    res.render('signup');
});

app.post('/signup', function (req, res) {
    //passport
    const newUser = new User({
        username: req.body.username,
    });

    User.register(newUser, req.body.password, function (err, user) {
        if (err) {
            console.log(err)
            res.redirect('/signup');
        } else {
            passport.authenticate('local')(req, res, function () {
                res.redirect('/login')
            })
        }
    });


    // bcrypt
    /*const saltRounds = 10;
    bcrypt.hash(req.body.password , saltRounds , function(err , hash){
        const user = {
            username: req.body.username,
            password: hash
        }
        User.create(user, function(err){
            if(err){
                console.log(err);
            }else{
                res.render('index');
            }
        });
    })*/




})


app.get('/login', function (req, res) {
    res.render('login')
});
app.post('/login', function (req, res) {
    //passport
    const user = new User({
        username: req.body.username,
        password: req.body.password
    });

    req.login(user, function (err) {
        if (err) {
            console.log(err)
        } else {
            passport.authenticate('local')(req, res, function () {
                req.flash('success', 'Vous aveez bien connectez')
                res.redirect('/dashboard');
            })
        }
    })


    //bcrypt
    /*User.findOne({username : req.body.username}, function(err , result){
        if(err){
            console.log(err)
        }else{
            if(result){

                bcrypt.compare(req.body.password , result.password , function(err , comp){
                    if(comp == true){
                        console.log('t es connecté')
                        res.render('index');
                    }else if(err){
                        console.log(err); 
                    }else{
                        res.send('Mot de pass incorrect');
                    }
                })

                
            }
            else{
                res.send('Vous etes pas inscrit');
            }
        }
    })*/
});





app.get('/', (req, res) => {
    res.render('index')
});

app.get('/dashboard', isLogged, function (req, res) {
    res.render('dashboard')
});

app.get('/logout', function (req, res) {
    req.logout();
    req.flash('success', 'Thank you, you are logged out now!')
    res.redirect('login');
});


app.get('/forgot', function (req, res) {
    res.render('forgot')
});

app.post('/forgot', function (req, res) {
    User.findOne({ username: req.body.username }, function (err, userFound) {
        if (err) {
            console.log(err)
            res.render('login')
        }
        else {
            const token = randToken.generate(16);
            Reset.create({
                username: userFound.username,
                resetPasswordToken: token,
                resetPasswordExpired: Date.now() + 360000
            });
            const transporter = nodeMailer.createTransport({
                service: 'gmail',
                auth: {
                    user: 'bebe.store20@gmail.com',
                    pass: process.env.PWD
                }
            });
            const mailOption = {
                from: 'bebe.store20@gmail.com',
                to: req.body.username,
                subject: 'link to reset your password',
                text: 'voila le lien http://localhost:3000/reset/' + token
            };

            console.log('pret')

            transporter.sendMail(mailOption, function (err, responce) {
                if (err) {
                    console.log(err);
                } else {
                    res.render('login');
                }
            });

            console.log('Done')
        }
    })
});

app.get('/reset/:token', function (req, res) {
    Reset.findOne({
        resetPasswordToken: req.params.token,
        resetPasswordExpired: { $gt: Date.now() }
    }, function (err, obj) {
        if (err) {
            console.log(err);
            res.render('login');
        } else {
            res.render('reset', { token: req.params.token });
        }
    });
});

app.post('/reset/:token', function (req, res) {
    Reset.findOne({
        resetPasswordToken: req.params.token,
        resetPasswordExpired: { $gt: Date.now() }
    }, function (err, obj) {
        if (err) {
            console.log(err);
            res.render('login');
        } else {
            if (req.body.password == req.body.password2) {
                User.findOne({ username: obj.username }, function (err, result) {
                    if (err) {
                        console.log(err)
                    } else {
                        result.setPassword(req.body.password, function (err) {
                            if (err) {
                                console.log(err)
                            } else {
                                result.save();
                                const deleteToken = {
                                    resetPasswordToken: null,
                                    resetPasswordExpired: null
                                }
                                Reset.findOneAndUpdate({ username: req.params.token }, deleteToken, function (err) {
                                    if (err) {
                                        console.log(err);
                                    } else {
                                        res.render('login');
                                    }
                                })
                            }
                        })
                    }
                })
            }
        }
    });
})

app.get('/dashboard/myreceipes', isLogged, function (req, res) {
    Receipe.find({
        user: req.user._id
    }, function (err, receipe) {
        if (err) {
            console.log(err)
        } else {
            res.render('receipe.ejs', { receipe: receipe })
        }
    })
})

app.get('/dashboard/newreceipe', isLogged, function (res, res) {
    res.render('newreceipe')
})
app.post('/dashboard/newreceipe', function (req, res) {
    const newReceipe = {
        name: req.body.receipe,
        image: req.body.logo,
        user: req.user._id
    }



    Receipe.create(newReceipe, function (err, newRecette) {
        if (err) {
            console.log(err)
        } else {
            req.flash('success', 'receipe added');
            res.redirect('/dashboard/myreceipes')
        }
    })
})

app.get('/dashboard/myreceipes/:id', function (req, res) {
    Receipe.findOne({ user: req.user.id, _id: req.params.id }, function (err, foundReceipe) {
        if (err) {
            console.log(err)
        } else {
            Ingredient.find({
                user: req.user.id,
                receipe: req.params.id
            }, function (err, ingredientFound) {
                if (err) {
                    console.log(err)
                } else {
                    res.render('ingredients', { receipe: foundReceipe, ingredient: ingredientFound })
                }
            })
        }
    })
})

app.get('/dashboard/myreceipes/:id/newingredient', function (req, res) {
    Receipe.findById({_id: req.params.id }, function (err, receipeF) {
        if (err) {
            console.log(err)
        } else {
            res.render('newingredient', { receipe: receipeF })
        }
    })
})

app.post('/dashboard/myreceipes/:id', function (req, res) {
    const newingre = {
        name: req.body.name,
        quantity: req.body.quantity,
        receipe: req.params.id,
        bestDish: req.body.dish,
        user: req.user.id,
    }

    Ingredient.create(newingre , function(err , newingredient){
        if(err){
            console.log(err)
        }else{
            req.flash('success', 'Ingredient added')
            res.redirect('/dashboard/myreceipes/'+req.params.id)
        }
    })
})

function isLogged(req, res, next) {
    if (req.isAuthenticated()) {
        next();
    } else {
        req.flash('error', 'pleaz, login first')
        res.redirect('login')
    }
}

app.listen(3000, function () {
    console.log('on ecoute le port 3000')
});
