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

    const app = express();
  
////set view engine to ejs
app.set("view engine", "ejs");
///use body parser
app.use(bodyParser.urlencoded({
    extended: true
}));
////use express static for external files like css files
app.use(express.static("public"));
app.use(session({
    secret: process.env.SECRET,
    resave: false,
    saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());
/////connect to mongoose
mongoose.connect("mongodb://localhost:27017/blogDB");
//create mongoose schema and model
    const blogSchema = new mongoose.Schema({
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
        }
    });

    const userSchema = new mongoose.Schema({
        username: String,
        email: String,
        password:  String,
    });


    userSchema.plugin(passportLocalMongoose);
    userSchema.plugin(findOrCreate);

    const Blog = mongoose.model("Blog", blogSchema);
    const User = mongoose.model("User", userSchema);
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


    app.get("/", function(req, res){
        Blog.find(function(err, foundPosts){
            if(err){
                console.log("Error fetching posts!");
            } else {
               res.render("home", {foundPosts : foundPosts});
            }
           
          
        });
    });

 
///admin area
    app.get("/admin", function(req, res){
        Blog.find(function(err, foundPosts){
            if(err){
                console.log("Error fetching posts!");
            } else {
               res.render("admin", {foundPosts : foundPosts});
            }
           
          
        });
    });


////compose articles
    app.get("/compose", function(req, res){
            res.render("compose");
        });

    app.post("/compose", function(req, res){
        /////handle file upload (image)
        const options = {
            filter: function ({name, originalFilename, mimetype}) {
              // keep only images
              return mimetype && mimetype.includes("image");
            },
            uploadDir: __dirname + "/public/images"
          };
        const form = formidable(options);
        form.on("file", (field, file) => {
            
            fs.rename(
              file.filepath,
              form.uploadDir + "/" + file.originalFilename,
              () => {
                
              }
            );
          });
        form.parse(req, (err, fields, files) => {
            ////save form data to database
            const title = fields.title;
            const imageUrl = files.imageUrl.originalFilename;
            const content = fields.content;
            const blog = new Blog({
                title: title,
                imageUrl: imageUrl,
                content: content
            });
            blog.save(function(err){
                if(err){
                    res.send("Error in saving article! Check your internet connection and make sure you have all fields filled!!!");
                } else {
                    res.redirect("/admin");
                }
            });
        });
        
    });

///update articles
    app.get("/update/:articleId", function(req, res){
        const articleID = req.params.articleId;
        Blog.findById({_id: articleID}, function(err, foundPost){
            res.render("update", {postDetails: foundPost})
        });
    });

    app.post("/update/:articleId", function(req, res){
         /////handle file upload (image)
         const options = {
            filter: function ({name, originalFilename, mimetype}) {
              // keep only images
              return mimetype && mimetype.includes("image");
            },
            uploadDir: __dirname + "/public/images"
          };
        const form = formidable(options);
        form.on("file", (field, file) => {
            
            fs.rename(
              file.filepath,
              form.uploadDir + "/" + file.originalFilename,
              () => {
                
              }
            );
          });
        form.parse(req, (err, fields, files) => {
            if (typeof files.imageUrl !== "undefined"){
                ////save form data to database
            const articleID = req.params.articleId;
            const setTitle = fields.title;
            const setImageUrl = files.imageUrl.originalFilename;
            const setContent = fields.content;
            Blog.findByIdAndUpdate({_id: articleID}, {$set: {title: setTitle, imageUrl: setImageUrl, content: setContent }}, function(err, done){
                if(err){
                    res.send("Error updating document!");
                } else {
                    res.redirect("/admin");
                }
            });
            } else {
                const articleID = req.params.articleId;
                const setTitle = fields.title;
                const setContent = fields.content;
                Blog.findByIdAndUpdate({_id: articleID}, {$set: {title: setTitle, content: setContent }}, function(err, done){
                    if(err){
                        res.send("Error updating document!");
                    } else {
                        res.redirect("/admin");
                    }
                });
            }
            
      });
    });

////display a particular article
    app.get("/posts/:articleId", function(req, res){
        const articleID = req.params.articleId;
        Blog.findById({_id: articleID}, function(err, found){
            if(!err){
                res.render("post", {postDetail: found});
            } else {
                res.send("Error!");
            }
            
        });
    });

//////delete articles
    app.get("/delete/:articleId", function(req, res){
        const articleID = req.params.articleId;
        Blog.findByIdAndDelete({_id: articleID}, function(err){
            if(!err){
                res.redirect("/admin");
            } else {
                res.redirect("/error")
            }
        });
    });




    // app.get('/aaaa', (req, res) => {
    //     res.send(`
    //       <h2>With <code>"express"</code> npm package</h2>
    //       <form action="/api/upload" enctype="multipart/form-data" method="post">
    //         <div>Text field title: <input type="text" name="title" /></div>
    //         <div>File: <input type="file" name="someExpressFiles" multiple="multiple" /></div>
    //         <input type="submit" value="Upload" />
    //       </form>
    //     `);
    //   });
      
    //   app.post('/api/upload', (req, res, next) => {
       
    //     const form = formidable({ uploadDir: __dirname + "/images"});
    //     form.on("file", (field, file) => {
    //         fs.rename(
    //           file.filepath,
    //           form.uploadDir + "/" + file.originalFilename,
    //           () => {
           
    //           }
    //         );
    //       });
    //     form.parse(req, (err, fields, files) => {
    //       if (err) {
    //         next(err);
    //         return;
    //       }
         
    //       res.json({ fields, files });
    //     });
    //   });






    app.listen(3000, function(){
        console.log("Server running on port 3000!");
    });