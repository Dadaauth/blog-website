    ////require your packages
    require("dotenv").config();
    const express = require("express");
    const bodyParser = require("body-parser");
    const mongoose = require("mongoose");
    const ejs = require("ejs");
    const session = require("express-session");
    const passport = require("passport");
    const passportLocalMongoose = require("passport-local-mongoose");
    const findOrCreate = require("mongoose-findorcreate");
    const formidable = require('formidable');
    const fs = require("fs");
const { Console } = require("console");

    const app = express();
  
    ////set view engine to ejs
    app.set("view engine", "ejs");

    ///use body parser
    app.use(bodyParser.urlencoded({
        extended: true
    }));


    ////use express static for external files like css files
    app.use(express.static("public"));
    app.use(session({ /////for session creation needed for authentication.
        secret: process.env.SECRET,
        resave: false,
        saveUninitialized: false
    }));


    app.use(passport.initialize());
    app.use(passport.session());


    /////connect to mongoose
    // mongoose.connect("mongodb+srv://authority:4141clement%3F@cluster0.gs6bw9m.mongodb.net/blogDB");
    mongoose.connect("mongodb://localhost:27017/blogDB");
//create posts schema
    const blogSchema = new mongoose.Schema({
        userId:  {
            type: String,
            required: [true, "PLease check your data entry"]
        },
        username:  {
            type: String,
            required: [true, "PLease check your data entry"]
        },
        title:  {
            type: String,
            required: [true, "PLease check your data entry"]
        },
        imageUrl: {
            type: String,
        },
        content:  {
            type: String,
            required: [true, "PLease check your data entry"]
        },
        publishedDate: String, 
        updatedDate: String,    
        category: String,
    });

    /////create users schema
    const userSchema = new mongoose.Schema({
        username: String,
        email: String,
        password:  String,
        role: String
    });


    userSchema.plugin(passportLocalMongoose);
    userSchema.plugin(findOrCreate);

    ////create comment schema
    const commentSchema = new mongoose.Schema({
        userId:  String,
        postId: String,
        username: String,
        comment: String,
        reply : [{
            reply : String,
            date : String,
            username: String
             }],
        publishedDate: String,
        updatedDate: String
    });


    const Blog = mongoose.model("Blog", blogSchema);
    const User = mongoose.model("User", userSchema);
    const Comment = mongoose.model("Comment", commentSchema);
    passport.use(User.createStrategy());

passport.serializeUser(function(user, cb) {
    process.nextTick(function() {
            return cb(null, {
        id: user.id,
        username: user.username,
        email: user.email,
        picture: user.picture,
        facebookId: user.facebookId,
        facebookName: user.facebookName,
        googleId: user.googleId
      });
      
    });
  });
  
  passport.deserializeUser(function(user, cb) {
    process.nextTick(function() {
      return cb(null, user);
    });
  });








  //get home
    app.get("/", function(req, res){
        var perPage = 10;
        var page = req.query.page || 1;
        Blog.find({})
        .sort({$natural:-1})
        .skip((perPage * page) - perPage)
        .limit(perPage)
        .exec(function(err,data){
            if(err){
                console.log("Error fetching posts!");
            } else {
                Blog.countDocuments({}).exec((err,count)=>{ 
                    const counted = count - 2;
                    const randNum = Math.random();   
                     const rand = Math.floor(randNum * counted);
                        Blog.find({})
                        .sort({_id: -1})
                        .limit(2)
                        .skip(rand)
                        .exec(function(err, oneData){  
               if(req.isAuthenticated()){
                res.render("home", {records: data, onedata: oneData, current: page, pages: Math.ceil(count / perPage), authenticated: true, userId: req.user.id});
               } else {
                res.render("home", {records: data, onedata: oneData, current: page, pages: Math.ceil(count / perPage), authenticated: false,});
               }
           
            });      
         });         
            }         
      
        }); 
    });
 


        ///////compose articles
    app.get("/compose", function(req, res){
        if(req.isAuthenticated()){
            res.render("compose", {authenticated: true, userId: req.user.id});
        } else {
            res.render("login", {comeBackUrl: "/compose", authenticated: false});
        }
            
        });

    app.post("/compose", function(req, res){
        if(req.isAuthenticated()){
        /////handle file upload (image)
        const options = {
            filter: function ({name, originalFilename, mimetype}) {
            // keep only images
            return mimetype && mimetype.includes("image");
            },
            uploadDir: __dirname + "/public/images",
            keepExtensions : true
        };
        const form = formidable(options);
        
        // form.on("file", (field, file) => {
        //     fs.rename(
        //     file.filepath,
        //     form.uploadDir + "/" + file.originalFilename,
        //     () => {
                
        //     }
        //     );
        // });
        form.parse(req, (err, fields, files) => {
            const options = {year: "numeric", month: "long", day: "numeric", seconds: "numeric"};
            const today = new Date();
            const pubDate =  today.toLocaleDateString("en-US", options);
            const user_ID = req.user.id;
            const username = req.user.username;
            const title = fields.title; 
            const content = fields.content;
            const category = fields.category;
            if (typeof files.imageUrl !== "undefined"){
            ////save form data to database
            const imageUrl = files.imageUrl.newFilename;
            const blog = new Blog({
                username: username,
                userId: user_ID,
                title: title,
                imageUrl: imageUrl,
                content: content,
                publishedDate: pubDate,
                category: category
            });
            blog.save(function(err){
                if(err){
                    res.send("Error in saving article! Check your internet connection and make sure you have all fields filled!!!");
                } else {
                    res.redirect("/user/" + req.user.id);
                }
            });
        } else {
                ////save form data to database
            const blog = new Blog({
                username: username,
                userId: user_ID,
                title: title,
                content: content,
                publishedDate: pubDate,
                category: category
            });
            blog.save(function(err){
                if(err){
                    res.send("Error in saving article! Check your internet connection and make sure you have all fields filled!!!");
                } else {
                    res.redirect("/user/" + req.user.id);
                }
            });
        }
        });
    } else {
        res.render("login", {comeBackUrl: "/compose", authenticated: false});
    }
    });








    /////////////update articles
    app.get("/update/:articleId", function(req, res){
        if(req.isAuthenticated()){
            const articleID = req.params.articleId;
        Blog.findById({_id: articleID}, function(err, foundPost){
            res.render("update", {postDetails: foundPost, authenticated: true, userId: req.user.id})
        });
        } else {
            res.render("login", {comeBackUrl: "/compose", authenticated: false});
        }
        
        });

    app.post("/update/:articleId", function(req, res){
        if(req.isAuthenticated()){
        /////handle file upload (image)
        const options = {
            filter: function ({name, originalFilename, mimetype}) {
            // keep only images
            return mimetype && mimetype.includes("image");
            },
            uploadDir: __dirname + "/public/images",
            keepExtensions : true
        };
        const form = formidable(options);

        // form.on("file", (field, file) => {         
        //     fs.rename(
        //     file.filepath,
        //     form.uploadDir + "/" + file.originalFilename,
        //     () => {
                
        //     }
        //     );
        // });
        form.parse(req, (err, fields, files) => {
            const options = {year: "numeric", month: "long", day: "numeric", seconds: "numeric"};
            const today = new Date();
            const updateDate =  today.toLocaleDateString("en-US", options);   
            const user_ID = req.user.id;
            const username = req.user.username;
            const articleID = req.params.articleId;
            const setTitle = fields.title; 
            const setContent = fields.content; 
            const category = fields.category;
            if (typeof files.imageUrl !== "undefined"){
                ////save form data to database
            const setImageUrl = files.imageUrl.newFilename;   
            Blog.findById({_id: articleID}, function(err, found){
                fs.unlink(__dirname + "/public/images/" + found.imageUrl, (err) => {
                    if (err) {
                       
                    }
                });
            });    
            Blog.findByIdAndUpdate({_id: articleID}, {$set: {    
                title: setTitle,
                imageUrl: setImageUrl, 
                content: setContent,
                userId: user_ID,  
                username: username,
                updatedDate: updateDate,
                category: category
                }}, function(err, done){
                if(err){
                    res.send("Error updating document!");
                } else {
                    res.redirect("/user/" + req.user.id);
                }
            });
            } else {
                Blog.findByIdAndUpdate({_id: articleID}, {$set: {
                    title: setTitle, 
                    content: setContent,
                    userId: user_ID,
                    username: username,
                    updatedDate: updateDate,
                    category: category
                  }}, function(err, done){
                    if(err){
                        res.send("Error updating document!");
                    } else {
                        res.redirect("/user/" + req.user.id);
                    }
                });
            }
            
    });
        } else {
            res.render("login", {comeBackUrl: "/update/" + req.params.articleId, authenticated: false});
        }
    });







////display a particular article
    app.get("/posts/:articleId", function(req, res){
        const articleID = req.params.articleId;
        Blog.findById({_id: articleID}, function(err, found){
            if(req.isAuthenticated()){
                var authValue = true; 
                var userId = req.user.id;
            } else {
                var authValue = false;
                var userId = "unknown";
            }
            if(found){
                Comment.find({postId:articleID}, function(err, foundComments){         
                     res.render("post", {postDetail: found, comments:foundComments, authenticated: authValue, userId: userId});          
                });
               
            } else {
                res.render("post", {postDetail: undefined, comments:undefined, authenticated: authValue, userId:userId, errorMsg: "Post has been deleted or does not exist!"});
            }
            
        });
    });

    ////search articles 
    app.get("/search", function(req, res){
        
    });
    app.post("/search", function(req, res){

        // const query = { $text: { $search: req.body.search } };
        // // Return only the `title` of each matched document
        // const projection = {
        //   _id: 0,
        //   title: 1,
        // };
        // // find documents based on our query and projection
        // const cursor = Blog.find(query).project(projection);
        // console.log(cursor);


        // Blog.find({title: {$search: req.body.search}})
        //     // .search({
        //     //     text: {
        //     //     query: req.body.search,
        //     //     path: 'title'
        //     //     }
        //     // }) 
        //     .sort({$natural: -1})
        //     .exec(function(err, found){
        //         console.log(found);
        //     });


            exports.getSearch = (req, res, next) => { 
                const title = req.body.search;
                Product.find({ title: { $regex: title, $options: "i" } })
                    .then(title => {
                        console.log(title);
                    })
                    .catch(err => {
                      console.log(err);
                    });
                }
        });
    





    ////////REMEMBER TO ADD EDIT AND DELETE COMMENTS ADD UPDATED DATE ALSO
        ///comment system
        app.get("/comment/:articleId", function(req, res){
            res.redirect("/posts/" + req.params.articleId);
        });
    app.post("/comment/:articleId", function(req, res){
            if(req.isAuthenticated()){    
                    const options = {year: "numeric", month: "long", day: "numeric", seconds: "numeric"};
                    const today = new Date();
                  const pubDate =  today.toLocaleDateString("en-US", options);   
           const newComment = new Comment({
                postId: req.params.articleId,
                userId: req.user.id,
                username: req.user.username,
                comment: req.body.comment,
                publishedDate: pubDate
           });
           newComment.save();
           res.redirect("back")
            } else {
                res.render("login", {comeBackUrl: "/comment/" + req.params.articleId, authenticated: false});
            }
           
        });

        ///edit comment
        app.post("/editComment/:articleId", function(req, res){
            if(req.isAuthenticated()){
                    const options = {year: "numeric", month: "long", day: "numeric", seconds: "numeric"};
                    const today = new Date();
                    const editDate =  today.toLocaleDateString("en-US", options);  
                Comment.findByIdAndUpdate({_id: req.body.commentId}, {$set: {comment: req.body.editedComment, updatedDate: editDate}}, function(err){
                    if(!err){
                        res.redirect("/posts/" + req.params.articleId);
                    } else {
                        res.send("failure");
                    }
                });  
            } else {
                 res.render("login", {comeBackUrl: "/comment/" + req.params.articleId, authenticated: false});
            }
        });
       
        ///delete comment
        app.get("/deleteComment/:articleId/:commentId", function(req, res){
            if(req.isAuthenticated()){
                            Comment.findByIdAndDelete({_id: req.params.commentId}, function(err){
                if(!err){
                    res.redirect("/posts/" + req.params.articleId);
                } else {
                    res.send("error!");
                }
            });
            } else {
                res.render("login", {comeBackUrl: "/Comment/" + req.params.articleId, authenticated: false});
            }
        });


        ///comment reply system
        app.get("/reply/:articleId", function(req, res){
            res.redirect("/posts/" + req.params.articleId);
        });
    app.post("/reply/:articleId", function(req, res){
            if(req.isAuthenticated()){
                //get date
                const options = {year: "numeric", month: "long", day: "numeric", seconds: "numeric"};
                const today = new Date();
                const pubDate =  today.toLocaleDateString("en-US", options);
                //get date end
                const commentId = req.body.commentId;
                const username = req.user.username;
                const reply = req.body.reply;
                Comment.findOneAndUpdate({_id: commentId}, 
                    {$push: {reply: [{reply: reply, username: username, date: pubDate}]}},
                    function(err, done){
                        if(!err){
                            res.redirect("back");
                        } else {
                            res.send("Error!");
                        }
                    });
           
            } else {
                res.render("login", {comeBackUrl: "/reply/" + req.params.articleId,  authenticated: false});
            }
           
        });

        ////edit reply
        app.post("/editReply/:articleId", function(req, res){
            if(req.isAuthenticated()){
                    const options = {year: "numeric", month: "long", day: "numeric", seconds: "numeric"};
                    const today = new Date();
                    const editDate =  today.toLocaleDateString("en-US", options);  
                Comment.findOneAndUpdate({
                    _id: req.body.commentId,
                   "reply._id": req.body.replyId
                }, 
                    {$set: {
                        "reply.$.reply": req.body.editedReply, 
                        "reply.$.date": editDate
                    }}, 
                    function(err){
                    if(!err){
                        res.redirect("/posts/" + req.params.articleId);
                    } else {
                        res.send("failure");
                    }
                });  
            } else {
                res.render("login", {comeBackUrl: "/reply/" + req.params.articleId, authenticated: false});
            }
        });
       
        ///delete reply
        app.get("/deleteReply/:articleId/:commentId/:replyId", function(req, res){
            if(req.isAuthenticated()){
                Comment.findOneAndUpdate({ 
                    _id: req.params.commentId,
                }, 
                {
                    $pull:{"reply":{"_id": req.params.replyId}}
                },
                function(err){
                if(!err){
                    res.redirect("/posts/" + req.params.articleId);
                } else {
                    res.send("error!");
                    console.log(err);
                }
            });
            } else {
                res.render("login", {comeBackUrl: "/reply/" + req.params.articleId, authenticated: false});
            }
        });





//////delete articles
    app.get("/delete/:articleId", function(req, res){
        if(req.isAuthenticated()){
        const articleID = req.params.articleId;
            Blog.findById({_id: articleID}, function(err, found){
                    /////delete image with articles
                if(typeof found.imageUrl !== "undefined"){
                    fs.unlink(__dirname + "/public/images/" + found.imageUrl, (err) => {
                    if (err) {
                        throw err;
                    }           
                });
                }
                
            });
            Blog.findByIdAndDelete({_id: articleID}, function(err){
                if(!err){
                    res.redirect("/user/" + req.user.id);
                } else {
                    res.redirect("/error")
                }
            });
        } else {
            res.redirect("/login");
        }
        
    });








    
    ///profile area
        app.get("/user/:userId", function(req, res){
            const perPage = 3;
            const page = req.query.page || 1;
        if(req.isAuthenticated() && req.params.userId === req.user.id){
            Blog.find({userId: req.user.id})
                .sort({$natural:-1})
                .skip((perPage * page) - perPage)
                .limit(perPage)
                .exec(function(err, data){
                if(err){
                    console.log("Error fetching posts!");
                } else {
                    Blog.countDocuments({userId: req.user.id}).exec((err,count)=>{ 
                res.render("admin", {records: data,  current: page, pages: Math.ceil(count / perPage), authenticated: true, userId: req.user.id});
                    });
                }         
            });
        } else {
            if(req.isAuthenticated() && req.params.userId !== req.user.id){
                res.redirect("/user/" + req.user.id);
            } else {
                res.render("login", {authenticated: false});
            }
               
        }
            
        });

   




    //////Login Page
    
        app.get("/login", function(req, res){
            if(req.isAuthenticated()){
                res.redirect("back");
            } else{
                 res.render("login", {authenticated: false});
            }      
        });

        app.post("/login", function(req, res, next){
            const user = new User({
                username: req.body.username,
                password: req.body.password
                
            });
            User.countDocuments({username: req.body.username}).exec((err,count)=>{ 
               if(count !== 0){
                     req.login(user, function(err){
                if(err){
                    console.log(err);
                } else {
                    passport.authenticate("local")
                    (req, res, function(err){
                         if(req.body.comeBackUrl){
                        res.redirect(req.body.comeBackUrl);
                       } else {
                        res.redirect("user/" + req.user.id);
                       }
                        
                      
                    });
                }
            }); 
                } else {
                    res.redirect("/login-err");
                }
            });
          
        });
       
        ////display error message for login.
        app.get("/login-err", function(req, res){
            const error_msg = "Incorrect User Details";
            res.render("login", {errorMessage: error_msg, authenticated: false});
        });

        /////Register Page
       
        app.get("/register", function(req, res){
            if(req.isAuthenticated()){
                res.redirect("back");
            } else {
                 res.render("register", {authenticated: false});
            }
           
        })

        app.post("/register", function(req, res){
            User.register({username: req.body.username, email: req.body.email}, req.body.password, function(err, user){
                if(err){
                    console.log(err);
                    res.redirect("/register");
                } else{
                    passport.authenticate("local")(req, res, function(){
                        res.redirect("/user/" + req.user.id);
                    });
                }
            });
        });




    ///logout
        app.get("/logout", function(req, res){
            req.logout(function(err) {
            if (err) { return next(err); }
            });
            res.redirect("/");
        });



    app.listen(process.env.PORT || 3000, function(){
        console.log("Server running on port 3000!");
    });