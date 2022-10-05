    ////require your packages
    const express = require("express");
    const bodyParser = require("body-parser");
    const mongoose = require("mongoose");
    const ejs = require("ejs");
const { urlencoded } = require("body-parser");

    const app = express();
////set view engine to ejs
app.set("view engine", "ejs");
///use body parser
app.use(bodyParser.urlencoded({
    extended: true
}));
////use express static for external files like css files
app.use(express.static("public"));
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
            required: [true, "PLease check your data entry"]
        },
        content:  {
            type: String,
            required: [true, "PLease check your data entry"]
        }
    });
    const Blog = mongoose.model("Blog", blogSchema);


    app.get("/", function(req, res){
        Blog.find(function(err, foundPosts){
            if(err){
                console.log("Error fetching posts!");
            } else {
               res.render("home", {foundPosts : foundPosts});
            }
           
          
        });
    });

    app.post("/compose", function(req, res){
        var title = req.body.title;
        const imageUrl = req.body.imageUrl;
        const content = req.body.content;
        const blog = new Blog({
            title: title,
            imageUrl: imageUrl,
            content: content
        });
        blog.save(function(err){
            if(err){
                res.send("Error in saving article! Check your internet connection and make sure you have all fields filled!!!");
            } else {
                res.redirect("/");
            }
        });
        
    });

    app.post("/update")

    app.get("/delete/:articleId", function(req, res){
        const articleID = req.params.articleId;
        Blog.findByIdAndDelete({_id: articleID}, function(err){
            if(!err){
                res.redirect("/");
            } else {
                res.redirect("/error")
            }
        });
    });

    app.listen(3000, function(){
        console.log("Server running on port 3000!");
    });