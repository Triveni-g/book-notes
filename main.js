import express from "express";
import bodyParser from "body-parser";
import pg from "pg";
import axios from "axios";
import bcrypt from "bcrypt";
import session from "express-session"
import passport from "passport";
import { Strategy } from "passport-local";
import GoogleStrategy from "passport-google-oauth2";
import env from "dotenv";


const app = express();
const port = 3000;
const saltRounds = 10;
env.config();


app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));
app.set('view engine', 'ejs');

app.use(
  session({
    secret: process.env.SESSION_SECRET || "TOPSECRET",
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 1000 * 60 * 60 * 24,
    },
  })
);

app.use(passport.initialize());
app.use(passport.session());

const db=new pg.Client({
  user: process.env.PG_USER,
  host: process.env.PG_HOST,
  database: process.env.PG_DATABASE,
  password: process.env.PG_PASSWORD,
  port: process.env.PG_PORT,
    });
db.connect();




app.get("/", async(req,res)=>{
    res.render("home.ejs");
})

app.get("/login", (req, res) => {
  res.render("login.ejs");
});

app.get("/register", (req, res) => {
  res.render("register.ejs");
});

function ensureAuth(req, res, next) {
  if (req.isAuthenticated()) return next();
  res.redirect("/login");
}

app.get("/main", ensureAuth, (req, res) => {
  console.log(req.user);
  res.render("main.ejs", {
    user: req.user
  });
});

app.get(
  "/auth/google",
  passport.authenticate("google", {
    scope: ["profile", "email"],
  })
);


// 2️⃣ Google CALLBACK (this must match Google Cloud)
app.get(
  "/auth/google/callback",
  passport.authenticate("google", {
    failureRedirect: "/login",
  }),
  (req, res) => {
    // 3️⃣ Success redirect (YOUR app page)
    res.redirect("/main");
  }
)


app.post("/register", async (req, res) => {
  const email = req.body.username;
  const password = req.body.password;

  try {
    const checkResult = await db.query("SELECT * FROM users WHERE email = $1", [
      email,
    ]);

    if (checkResult.rows.length > 0) {
      res.send("Email already exists. Try logging in.");
    } else {
      //hashing the password and saving it in the database
      bcrypt.hash(password, saltRounds, async (err, hash) => {
        if (err) {
          console.error("Error hashing password:", err);
        } else {
          console.log("Hashed Password:", hash);
          const result=await db.query(
            "INSERT INTO users (email, password) VALUES ($1, $2) RETURNING *",
            [email, hash]
          );
          const user=result.rows[0];
          req.login(user,(err)=>{
            console.log(err)
            res.redirect("/main")
          })
        }
      });
    }
  } catch (err) {
    console.log(err);
  }
});

app.post("/login", passport.authenticate("local",{
  successRedirect:"/main",
  failureRedirect:"/login"
}));
 
   //local strategy

passport.use(new  Strategy (async function verify(username,password,cb){
  console.log(username);
  try {
    const result = await db.query("SELECT * FROM users WHERE email = $1", [
      username,
    ]);
    if (result.rows.length > 0) {
      const user = result.rows[0];
      const storedHashedPassword = user.password;
      bcrypt.compare(password, storedHashedPassword, (err, result) => {
        if (err) {
          return cb(err)
        } else {
          if (result) {
            return cb(null,user)
          } else {
            return cb(null,false);
           }
        }
      });
    } else {
      return cb("user not found");
    }
  } catch (err) {
    console.log(err);
  }
}));


//google based startegy
/*
passport.use(
  "google",
  new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/callback",
    userProfileURL:"https://www.googleapis.com/oauth2/v3/userinfo",
  },async (accessToken,refreshToken,profile,cb)=>{
    console.log(profile);
    try{
      const result= await db.query("SELECT * FROM users WHERE email = $1",[profile.email]);
      if(result.rows.length==0){
        const newUser= await db.query("INSERT INTO users (email,password) VALUES ($1,$2)",[profile.email,"google"]);
        cb(null,newUser.rows[0]);
      }else{
        //already existing user
        cb(null,result.rows[0]);
      }
    }catch(err){
      cb(err);
    }
  })
);
*/

passport.use(
  "google",
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: "http://localhost:3000/auth/google/callback",
      userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo",
    },
    async (accessToken, refreshToken, profile, cb) => {
      try {
        const result = await db.query(
          "SELECT * FROM users WHERE email = $1",
          [profile.email]
        );

        let user;

        if (result.rows.length === 0) {
          const newUser = await db.query(
            "INSERT INTO users (email, password) VALUES ($1, $2) RETURNING *",
            [profile.email, "google"]
          );
          user = newUser.rows[0];   // ✅ now exists
        } else {
          user = result.rows[0];
        }

        // 🔥 ALWAYS return DB user (has id)
        return cb(null, user);

      } catch (err) {
        return cb(err);
      }
    }
  )
);



passport.serializeUser((user,cb)=>{
  cb(null,user);
})

passport.deserializeUser((user,cb)=>{
  cb(null,user)
})

// GET /books → show all books
/*
app.get('/books', async (req, res) => {
  try {
    const userId=req.user.id;
    const sort = req.query.sort || 'recent';   // ?sort=recent or ?sort=rating

    let orderBy;
    if (sort === 'rating') {
      orderBy = 'rating DESC NULLS LAST, read_date DESC NULLS LAST';
    } else {
      // default: most recent
      orderBy = 'read_date DESC NULLS LAST, created_at DESC';
    }

    const result = await db.query(
      `SELECT * FROM books  WHERE user_id=$1 ORDER BY ${orderBy}`,[userId]
    );

    const books = result.rows;
    res.render('books', { books, sort });  // pass sort into EJS too

  } catch (err) {
    console.error('Error fetching books:', err);
    res.status(500).send('Could not load books');
  }
});
*/

app.get('/books', async (req, res) => {
  try {
    // 🔍 Check authentication first
    if (!req.user || !req.user.id) {
      console.log('❌ No user authenticated');
      return res.status(401).send('Please log in first');
    }

    const userId = req.user.id;
    console.log('🔍 Fetching books for userId:', userId);

    const sort = req.query.sort || 'recent';

    let orderBy;
    if (sort === 'rating') {
      orderBy = 'rating DESC NULLS LAST, read_date DESC NULLS LAST';
    } else {
      orderBy = 'read_date DESC NULLS LAST, created_at DESC';
    }

    // 🛡️ Safe query - handles empty results
    const result = await db.query(
      `SELECT * FROM books WHERE user_id = $1 ORDER BY ${orderBy}`, 
      [userId]
    );

    const books = result.rows;
    console.log('✅ Books found:', books.length);

    res.render('books', { books, sort });

  } catch (err) {
    console.error('❌ Books error:', err.message);
    console.error('❌ Full error:', err);
    
    // More specific error messages
    if (err.code === '42P01') {
      res.status(500).send('Books table missing. Create it first.');
    } else if (err.code === '42703') {
      res.status(500).send('user_id column missing in books table.');
    } else {
      res.status(500).send('Could not load books: ' + err.message);
    }
  }
});



// SHOW empty Add Book form
app.get('/add', (req, res) => {
  res.render('add', {
    form: {},          // empty values for first time
    coverError: null,  // no error initially
  });
});

// HANDLE Save or Fetch Cover from the same form
app.post('/add', async (req, res) => {
  const userId=req.user.id;
  const { action, title, author, rating, review, read_date, cover_url } = req.body;

  // keep current form values so we can re-fill the form
  const form = {
    title,
    author,
    rating,
    review,
    read_date,
    cover_url: cover_url || ''
  };

  // 1) FETCH COVER BUTTON PRESSED
  if (action === 'fetch') {
    // if no title, just re-render with message
    if (!title || title.trim() === '') {
      return res.render('add', {
        form,
        coverError: 'Please enter a title before fetching the cover.',
      });
    }

    try {
      // Call Open Library search API with the title
      const url = 'https://openlibrary.org/search.json';
      const response = await axios.get(url, {
        params: { title: title.trim(), limit: 1 },
      });

      const docs = response.data.docs;
      let newCoverUrl = '';

      if (docs && docs.length > 0) {
        const book = docs[0];

        if (book.cover_i) {
          newCoverUrl = `https://covers.openlibrary.org/b/id/${book.cover_i}-L.jpg`;
        } else if (book.isbn && book.isbn.length > 0) {
          newCoverUrl = `https://covers.openlibrary.org/b/isbn/${book.isbn[0]}-L.jpg`;
        }
      }

      form.cover_url = newCoverUrl;

      return res.render('add', {
        form,
        coverError: newCoverUrl ? null : 'No cover found for that title.',
      });
    } catch (err) {
      console.error('Cover fetch error:', err.message);
      return res.render('add', {
        form,
        coverError: 'Error contacting Open Library. Try again.',
      });
    }
  }

  // 2) SAVE BUTTON PRESSED
  if (action === 'save') {
    try {
      const ratingNumber = rating ? parseInt(rating, 10) : null;

      await db.query(
        `INSERT INTO books (title, author, rating, review, read_date, cover_url,user_id)
         VALUES ($1, $2, $3, $4, $5, $6,$7)`,
        [title, author, ratingNumber, review, read_date, form.cover_url,userId]
      );

      return res.redirect('/books');
    } catch (err) {
      console.error('Insert error:', err);
      return res.status(500).send('Error saving book');
    }
  }

  // fallback (no action)
  res.redirect('/add');
});


app.post("/delete",async(req,res)=>{
  const bookId = parseInt(req.body.id);
  const userId = req.user.id;
  try{
     await db.query(
      `DELETE FROM books
       WHERE id = $1 AND user_id = $2`,
      [bookId, userId]
    );
    res.redirect("/books");
  }
  catch(err){
    console.log("delete erro",err);
    res.status(500).send("error deleting book");
  }
});

app.post("/edit",async(req,res)=>{
  const id=req.body.id;
  res.redirect(`/edit/${id}`);
});

app.get('/edit/:id', async (req, res) => {
  const bookId = parseInt(req.params.id);
  const userId = req.user.id;

  const result = await db.query(
    `SELECT * FROM books
     WHERE id = $1 AND user_id = $2`,
    [bookId, userId]
  );
   const book = result.rows[0];
  res.render('edit', { book });
});

app.post('/update', async (req, res) => {
  try{
    const { id, title, author, rating, review, read_date, cover_url } = req.body;
    const userId=req.user.id;
    const bookId=parseInt(id);
    const bookRating=rating ? parseInt(rating,10):null;
    await db.query(
      `UPDATE books
      SET title=$1, author=$2, rating=$3, review=$4, read_date=$5, cover_url=$6
      WHERE id=$7 AND user_id=$8`,
      [title, author, bookRating, review, read_date, cover_url, bookId,userId]
    );
    res.redirect('/books');
  }catch(err){
    console.log('update error', err);
    res.status(500).send('Error updating book');
  }
});

app.get("/back",(req,res)=>{
  res.render("main.ejs")
});

app.get("/logout", (req, res, next) => {
  req.logout(err => {                          //passport method-removes the user from the session
    if (err) return next(err);
    res.redirect("/login"); // or /main if you prefer
  });
});


const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${port}`);
});


/*
app.get("/books", async(req,res)=>{
    const result=await db.query("select * from books");
    res.render("posts.ejs")
})

app.listen(port,()=>{
    console.log(`server is running on post ${port}`);
})


// 3) Test route to check database connection
app.get('/test-db', async (req, res) => {
  try {
    const result = await pool.query('SELECT COUNT(*) AS count FROM books');
    const count = result.rows[0].count;
    res.send(`DB is working. Books in table: ${count}`);
  } catch (err) {
    console.error('Database error:', err);
    res.status(500).send('Database error. Check console.');
  }
});
    */

