const express = require("express");
const bodyParser = require("body-parser");
const session = require("express-session");
const sqlite3 = require("sqlite3").verbose();
const bcrypt = require("bcrypt");
const multer = require("multer");
const path = require("path");

const app = express();

const db = new sqlite3.Database("./database.db");

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

app.use(session({
    secret: "training-secret",
    resave: false,
    saveUninitialized: true
}));

app.set("view engine", "ejs");

db.serialize(() => {

    db.run(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT,
            password TEXT
        )
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS posts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT,
            content TEXT
        )
    `);

});

app.get("/", (req, res) => {
    res.render("login");
});

app.get("/register", (req, res) => {
    res.render("register");
});

app.post("/register", async (req, res) => {

    const username = req.body.username;
    const password = req.body.password;

    const hash = await bcrypt.hash(password, 10);

    db.run(
        "INSERT INTO users(username, password) VALUES (?, ?)",
        [username, hash],
        (err) => {

            if (err) {
                return res.send("Error");
            }

            res.redirect("/");
        }
    );
});

app.post("/login", (req, res) => {

    const username = req.body.username;
    const password = req.body.password;

    db.get(
        "SELECT * FROM users WHERE username=?",
        [username],
        async (err, user) => {

            if (!user) {
                return res.send("User not found");
            }

            const match = await bcrypt.compare(password, user.password);

            if (!match) {
                return res.send("Wrong password");
            }

            req.session.user = username;

            res.redirect("/dashboard");
        }
    );
});

app.get("/dashboard", (req, res) => {

    if (!req.session.user) {
        return res.redirect("/");
    }

    db.all("SELECT * FROM posts", (err, posts) => {

        res.render("dashboard", {
            username: req.session.user,
            posts: posts
        });

    });
});

app.post("/post", (req, res) => {

    if (!req.session.user) {
        return res.redirect("/");
    }

    const content = req.body.content;

    db.run(
        "INSERT INTO posts(username, content) VALUES (?, ?)",
        [req.session.user, content],
        () => {
            res.redirect("/dashboard");
        }
    );
});

const storage = multer.diskStorage({

    destination: function(req, file, cb) {
        cb(null, "uploads/");
    },

    filename: function(req, file, cb) {
        cb(null, Date.now() + "-" + file.originalname);
    }

});

const upload = multer({ storage: storage });

app.post("/upload", upload.single("myfile"), (req, res) => {
    res.send("File uploaded");
});

app.listen(3000, () => {
    console.log("Server running at http://localhost:3000");
});