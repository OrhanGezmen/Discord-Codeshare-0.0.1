const mongoose = require("mongoose");
const express = require("express");
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");
const ejs = require("ejs");
const app = express();
let port = 3000;
const node = require("node-fetch");
const morgan = require("morgan");
app.set("view engine", "ejs");
app.use(express.static("public"));
app.use(cookieParser());

const multer = require("multer");
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "public/data");
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + "-" + uniqueSuffix + ".png");
  },
});
const upload = multer({ storage: storage });
app.use(morgan("dev"));

const dotenv = require("dotenv");
dotenv.config();

const Code = require("./models/codes.js");
const User = require("./models/users.js");
const Uptime = require("./models/uptime.js");
const config = require("./config/config.json");
const dbURL = process.env.db;
mongoose
  .connect(dbURL, { useNewUrlParser: true, useUnifiedTopology: true })
  .then((result) => {
    app.listen(port, () => {
      console.log("mongoDB Bağlantı kuruldu");
    });
  })
  .catch((err) => console.log(err));
app.use(bodyParser.json()).use(
  bodyParser.urlencoded({
    extended: true,
  })
);
/* Discord Client */
const discord = require("discord.js");
const client = new discord.Client();
client.on("ready", () => {
  console.log("Djs Ready");
});
client.login(process.env.token);

/* Home Page */
app.get("/", (req, res) => {
  let userId = req.cookies.userId;
  let guild = client.guilds.cache.get(config.guildID);
  let member = guild.members.cache.get(userId);
  if (!member) return res.redirect("/login");
  res.render(`${__dirname}/src/pages/index.ejs`, {
    userData: req.cookies.userId,
    member: member,
  });
});
/* Passport Discord */
const passport = require("passport");
const { Strategy } = require("passport-discord");
const session = require("express-session");

app.use(
  session({
    secret: "secret-session-thing",
    resave: false,
    saveUninitialized: false,
  })
);
app.use(passport.initialize());
app.use(passport.session());

passport.serializeUser((user, done) => done(null, user));

passport.deserializeUser((obj, done) => done(null, obj));

const scopes = ["identify", "guilds"];
passport.use(
  new Strategy(
    {
      clientID: config.clientID,
      clientSecret: config.secret,
      callbackURL: config.callbackURL,
      scope: scopes,
    },
    (accessToken, refreshToken, profile, done) => {
      process.nextTick(() => done(null, profile));
    }
  )
);

app.get("/login", passport.authenticate("discord", { scope: scopes }));
app.get(
  "/callback",
  passport.authenticate("discord", { failureRedirect: "/error" }),
  (req, res) => {
    res.cookie("userId", req.user.id);
    res.redirect(`/`);
  }
);
app.get("/logout", (req, res) => {
  req.logOut();
  res.clearCookie("userId");
  return res.redirect("/");
});

/* Uptime System */

const interval = setInterval(() => {
  Uptime.find({}, function (err, link) {
    link.forEach((links) => {
      node(links.uptimeLink);
      console.log(`linkler  Aktif Tutuluyor Çiçek`);
    });
  });
}, 30000);
/* Codes Category Page */
app.get("/category", (req, res) => {
  res.render(`${__dirname}/src/pages/codesCategory.ejs`);
});
app.get("/category/:category", (req, res) => {
  let category = req.params.category;
  Code.find({ codeCategory: category })
    .sort()
    .then((codeResult) => {
      res.render(`${__dirname}/src/pages/codes.ejs`, {
        code: codeResult,
        user: req.user,
        codeCategory: category,
      });
    });
});
/* Admin Dashboard */
app.get("/admin/:userId", (req, res) => {
  let userId = req.cookies.userId;
  if (!userId) return res.redirect("/callback");
  const guild = client.guilds.cache.get(config.guildID);
  const member = guild.members.cache.get(userId);
  if (!member)
    return res.send("Bu sayfaya girmek için sunuzumuza katılmalısın!");
  if (!member.hasPermission(8))
    return res.send("Bu sayfaya girmek için yetkin bulunmuyor!");
  let member_permission = member.hasPermission(8);
  if (!userId) return res.redirect("/callback");
  console.log(member.user);
  res.render(`${__dirname}/src/dashboard/admin.ejs`, {
    username: member.user.username,
    userId: userId,
    member_permission: member_permission,
  });
});
/* Admin Codes */
app.get("/admin-codes/:userId", (req, res) => {
  let userId = req.cookies.userId;
  let guild = client.guilds.cache.get(config.guildID);
  let member = guild.members.cache.get(userId);
  if (!member) return res.send("Lütfen Giriş Yapınız ");
  Code.find({ userId: userId })
    .sort()
    .then((codeResult) => {
      console.log(codeResult);
      res.render(`${__dirname}/src/dashboard/codes.ejs`, {
        code: codeResult,
        codeCategory: "Codes Admin",
        username: member.user.username,
        userId: codeResult.userId,
      });
    });
});
/* Admin Code-Panel */

app.get("/code-panel/:userId", (req, res) => {
  let userId = req.params.userId;
  let user = req.cookies.userId;
  let guild = client.guilds.cache.get(config.guildID);
  let member = guild.members.cache.get(user);
  if (!member) return res.send("Giris Yapmalısınız");
  Code.find({ userId: user }).then((codeResult) => {
    res.render(`${__dirname}/src/dashboard/code-panel.ejs`, {
      code: codeResult,
      codeCategory: "Code Panel",
      username: member.user.username,
      userId: codeResult.userId,
    });
  });
});

app.get("/code-edit/:codeId", (req, res) => {
  let codeId = req.params.codeId;
  let userId = req.cookies.userId;
  let guild = client.guilds.cache.get(config.guildID);
  let member = guild.members.cache.get(userId);
  if (!member)
    return res.send("Sunucumuza Katılmasın Veya Siteye Giriş Yapmalisin");
  if (!member.hasPermission(8)) return res.send("Admin Yetkisi Yok");
  Code.findOne({ codeId: codeId }).then((codeResult) => {
    res.render(`${__dirname}/src/dashboard/code-edit.ejs`, {
      code: codeResult,
      userId: userId,
    });
  });
});
/* Code Categories */

app.get("/code-categories", (req, res) => {
  res.render(`${__dirname}/src/pages/codesCategory.ejs`);
});
/*  Code Page */
app.get("/code/:codeId", async (req, res) => {
  let codeId = req.params.codeId;
  let user = req.cookies.userId;
  const guild = client.guilds.cache.get(config.guildID);
  const member = guild.members.cache.get(user);
  if (!member)
    return res.send("Bu sayfaya girmek için sunucumuza katılmalısın!");
  if (!codeId) return res.redirect("/");
  const code = await Code.findOne({ codeId: codeId });
  if (!code) return res.json({ 404: `${codeId} ID'li bir kod bulunmuyor!` });
  if (user) {
    const codeData = Code.findOne({ codeId: codeId }).then((codeResult) => {
      let user = guild.members.cache.get(codeResult.userId);
      console.log(user);
      res.render(`${__dirname}/src/pages/code.ejs`, {
        userAvatar: user.user.avatar,
        user: user,
        code: codeResult,
      });
    });
  } else {
    res.redirect("/callback");
  }
});

/* Code Add */
app.get("/code-add", (req, res) => {
  let userData = req.cookies.userId;
  let guild = client.guilds.cache.get(config.guildID);
  let user = guild.members.cache.get(userData);
  if (!userData) return res.redirect("/callback");
  if (!user.hasPermission(8)) return res.send("Uzgunum Yetkin Bulunmuyor");
  res.render(`${__dirname}/src/dashboard/code-add.ejs`, {
    username: user.user.username,
    userId: userData,
  });
});
app.post(
  "/code-add/:userId",
  upload.single("uploaded_file"),
  async (req, res) => {
    let userId = req.cookies.userId;
    const guild = client.guilds.cache.get(config.guildID);
    const member = guild.members.cache.get(userId);
    const point = await User.findOne({ userId: userId });
    if (!member) return res.json({ 138: "Lütfen Giriş Yapınız!" });
    if (!member.hasPermission(8))
      return res.json({ 404: "8 Perm Bulunmuyor Kod Yetkiniz Yok" });
    if (userId == req.cookies.userId) {
      let newCode = new Code({
        codeTitle: req.body.codeTitle,
        shortDescription: req.body.shortDescription,
        codePhoto: req.file.filename,
        codeText: req.body.codeText,
        codeDescription: req.body.codeDescription,
        codeCategory: req.body.codeCategory,
        userId: userId,
        codeOwner: userId,
        codeId: Math.floor(Math.random() * 99999),
      });
      newCode.save().then((NewCodeResult) => {
        res.redirect(`/code/${NewCodeResult.codeId}`);
      });
    } else {
      res.redirect("/callback");
    }
  }
);
/* Code Delete */
app.post("/code-delete/:codeId", (req, res) => {
  let codeId = req.params.codeId;
  let userId = req.cookies.userId;
  let guild = client.guilds.cache.get(config.guildID);
  let member = guild.members.cache.get(userId);
  if (!member)
    return res.send("Sunucumuzda Bulunmuyorsun Veya Siteye Giriş yapmadın ");
  if (!member.hasPermission(8)) return res.send("Admin Yetkin Yok");
  Code.findOneAndRemove({ codeId: codeId }).then((codeResult) => {
    res.redirect(`/code-panel/${codeResult.userId}`);
  });
});
/* Code Edit */
app.post("/code-edit/:codeId", (req, res) => {
  let userId = req.cookies.userId;
  let codeId = req.params.codeId;
  let guild = client.guilds.cache.get(config.guildID);
  let member = guild.members.cache.get(userId);
  if (!member)
    return res.send("Sunucuya girmelisin veya siteye giriş yapmalısın");
  if (!member.hasPermission(8)) return res.send("Admin yetkin yok");
  const codeOwner = Code.findOne({ codeId: codeId });
  if (userId == codeOwner.codeOwner) {
    Code.findOneAndUpdate(
      { codeId: codeId },
      {
        codeTitle: req.body.codeTitle,
        shortDescription: req.body.shortDescription,
        codePhoto: req.file.filename,
        codeText: req.body.codeText,
        codeDescription: req.body.codeDescription,
        codeCategory: req.body.codeCategory,
        userId: userId,
        codeOwner: userId,
        codeId: Math.floor(Math.random() * 99999),
      }
    );
  } else {
    res.json({ 404: "Kodun Sahibi Sen Değilsin!" });
  }
});

/* Fight-Club */

app.get("/ekip", (req, res) => {
  let developer = client.users.cache.get(config.ekip_member_1);
  let developer_1_avatar = developer.avatarURL({ dynmaic: true });
  let developer_1_name = developer.username;
  let developer2 = client.users.cache.get(config.ekip_member_3);
  let developer_2_avatar = developer2.avatarURL({ dynmaic: true });
  let developer_2_name = developer2.username;
  res.render(`${__dirname}/src/pages/ekip.ejs`, {
    developer_1_name: developer_1_name,
    developer_1_avatar: developer_1_avatar,
    developer_2_name: developer_2_name,
    developer_2_avatar: developer_2_avatar,
  });
});

/* Uptime (Yaw Eklemeyecektim Kendi Kendimi Dürttüm*/

app.get("/uptime/:userId", (req, res) => {
  let userId = req.params.userId;
  let user = req.cookies.userId;
  let guild = client.guilds.cache.get(config.guildID);
  let member = guild.members.cache.get(user);
  if (!member)
    return res.send("Lütfen Sunucumjza Girin veya Siteye Giriş Yapın");
  res.render(`${__dirname}/src/uptime/uptime.ejs`, {
    member: member,
    userId: user,
  });
});

app.post("/link-ekle/:userId", async function (req, res) {
  let id = req.params.id;
  let token = Math.floor(Math.random() * 99999);
  let url = new Uptime({
    userId: id,
    uptimeLink: req.body.link,
    uptimeID: token,
  });
  url.save().then((result) => {
    res.redirect(`/uptime/${id}`);
  });
});

app.get("/uptime-panel/:userId", (req, res) => {
  let userId = req.params.userId;
  let user = req.cookies.userId;
  let guild = client.guilds.cache.get(config.guildID);
  let member = guild.members.cache.get(user);
  if (!member) return res.send("Lutfen Sunucumuza Katılın Veya Giriş Yapin");
  if (!member.hasPermission(8))
    return res.send("Bu Siteye Erişmek İçin 8 Perme Sahip Olmalısın");
  Uptime.find()
    .sort()
    .then((uptimeResult) => {
      let kullanıcı = uptimeResult.userId;
      let userData = guild.members.cache.get(kullanıcı);
      res.render(`${__dirname}/src/uptime/uptime-panel.ejs`, {
        uptime: uptimeResult,
        user: userData,
        admin: user,
      });
    });
});

app.post("/link-delete/:linkID", (req, res) => {
  let linkID = req.params.linkID;
  let userId = req.cookies.userId;
  let guild = client.guilds.cache.get(config.guildID);
  let member = guild.members.cache.get(userId);
  if (!member) return res.send("Sunucumuza Katılmalısın Veya Giriş Yapmalısın");
  if (!member.hasPermission(8)) return res.send("Admin Yetkin Yok");
  Uptime.findOneAndRemove(linkID).then((result) => {
    res.redirect(`/uptime-panel/${userId}`);
  });
});
