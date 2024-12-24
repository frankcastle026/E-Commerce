import express from "express";
import bodyParser from "body-parser";
import pg from "pg";
import bcrypt from "bcrypt";

const app = express();
const port = 3000;

const db = new pg.Client({
    database:"ECommerce",
    host:"localhost",
    user:"postgres",
    password:"dhanesh1386",
    port:"5432"
});

db.connect();

app.use(bodyParser.urlencoded({ extended: true }));

app.get("/",async (req,res) => {

    try {const result = await db.query("SELECT * from products ORDER by id ASC");
        const items = result.rows;

        res.render("login.ejs",{Products : items});

    } catch (err) {
        console.log(err);
    }
});

app.get("/register", (req,res) => {
    res.render("register.ejs");
});

app.post("/register", async (req, res) => {
    const email = req.body.email;
    const password = req.body.password;

    try {
        // Check if the email already exists
        const checkResult = await db.query("SELECT * from ecom_users WHERE email = $1", [email]);

        if (checkResult.rows.length > 0) {
            res.status(400).send("Email already exists! Try logging in");
        } else {
            // Hash the password
            const hashedPassword = await bcrypt.hash(password, 10);

            // Insert the new user with the hashed password
            await db.query("INSERT INTO ecom_users(email, password) VALUES($1, $2)", [email, hashedPassword]);

            res.status(201).send("Successfully registered");
        }
    } catch (err) {
        console.error(err);
        res.status(500).send("An error occurred during registration");
    }
});


app.get("/login", (req,res) => {
    res.render("login.ejs");
});

app.post("/login", async (req, res) => {
    const email = req.body.email;
    const password = req.body.password;

    try {
        const result = await db.query("SELECT id, password FROM ecom_users WHERE email = $1", [email]);

        if (result.rows.length > 0) {
            const user = result.rows[0];

            const isMatch = await bcrypt.compare(password, user.password);

            if (isMatch) {
                const id = user.id;

        
                const wishlistResult = await db.query("SELECT product_id FROM wishlist WHERE customer_id = $1", [id]);
                const wishlistItems = wishlistResult.rows.map(row => row.product_id);
                const productsResult = await db.query("SELECT * FROM products ORDER BY id ASC");
                const items = productsResult.rows;

                res.render("home.ejs", { Products: items, customer_id: id, wishlistItems });
            } else {
                res.status(401).send("Incorrect password");
            }
        } else {
            res.status(404).send("User not found");
        }
    } catch (err) {
        console.error(err);
        res.status(500).send("An error occurred during login");
    }
});


app.get('/checkout',async (req, res) => {
    const { product_name, price,item_id, customer_id} = req.query;
    const inCart = await db.query("INSERT INTO checkout(product_id,product_name,price,customer_id) VALUES($1,$2,$3,$4)",[item_id,product_name,price,customer_id]);
    const result = await db.query("SELECT * from checkout WHERE customer_id = $1",[customer_id]);
    const Checkout = result.rows;
    const count = await db.query("SELECT count(product_id) from checkout WHERE customer_id = $1",[customer_id]);
    const count_result = count.rows[0];
    const final_count = count_result.count;
    const total_result = await db.query("SELECT sum(price) from checkout WHERE customer_id = $1",[customer_id]);
    const Total = total_result.rows[0].sum;

    res.redirect(`/checkout?customer_id=${encodeURIComponent(customer_id)}`);

    // res.redirect(`/cart?customer_id=${customer_id}`);
});

app.get('/addToCart',async (req, res) => {
    const { product_name, price,item_id, customer_id} = req.query;
    const inCart = await db.query("INSERT INTO cart(product_id,product_name,price,customer_id) VALUES($1,$2,$3,$4)",[item_id,product_name,price,customer_id]);
    res.redirect('/cart?customer_id=' + customer_id);
});

app.get('/cart',async (req, res) => {
    const { customer_id} = req.query;
    const result = await db.query("SELECT * from cart WHERE customer_id = $1",[customer_id]);
    const Checkout = result.rows;
    const count = await db.query("SELECT count(product_id) from cart WHERE customer_id = $1",[customer_id]);
    const count_result = count.rows[0];
    const final_count = count_result.count;
    const total_result = await db.query("SELECT sum(price) from cart WHERE customer_id = $1",[customer_id]);
    const Total = total_result.rows[0].sum;

    res.render('Cart.ejs',{Checkout : Checkout,Product_Count : final_count,Total : Total,customer_id : customer_id});
});

app.get('/delete',async (req, res) => {

    const { customer_id,product_id} = req.query;
    const delete_item = await db.query("DELETE from cart WHERE customer_id = $1 AND id = $2",[customer_id,product_id]);
    res.redirect(`/cart?customer_id=${customer_id}`);
});

app.get('/wishList',async (req, res) =>{
    const { item_id, customer_id, checked } = req.query;

    try {
        if (checked === 'true') {
            await db.query("INSERT INTO wishlist (product_id, customer_id) VALUES ($1, $2) ON CONFLICT DO NOTHING", [item_id, customer_id]);
        } else {
            await db.query("DELETE FROM wishlist WHERE product_id = $1 AND customer_id = $2", [item_id, customer_id]);
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "An error occurred." });
    }
});

app.get('/toWishList',async (req, res) =>{
    const {customer_id} = req.query;
    try {
        const result = await db.query("Select distinct(product_name),imageurl,product_id,customer_id, price from products, wishlist where products.id = wishlist.product_id and wishlist.customer_id = $1",[customer_id]);
        const wishlist = result.rows;
        res.render('WishList.ejs',{Products : wishlist,customer_id : customer_id});
    } catch (err) {
        res.send(err);
    }
});

app.get('/addToCartAndDelete',async (req, res) => {
    const { product_name, price,item_id, customer_id} = req.query;
    const inCart = await db.query("INSERT INTO cart(product_id,product_name,price,customer_id) VALUES($1,$2,$3,$4)",[item_id,product_name,price,customer_id]);
    const deleteFromWishlist = await db.query("DELETE FROM wishlist WHERE product_id = $1 AND customer_id = $2", [item_id, customer_id]);
    const result = await db.query("Select distinct(product_name),imageurl,product_id,customer_id, price from products, wishlist where products.id = wishlist.product_id and wishlist.customer_id = $1",[customer_id]);
    const wishlist = result.rows;
    const result_ = await db.query("SELECT * from cart WHERE customer_id = $1",[customer_id]);
    const Checkout = result_.rows;
    const count = await db.query("SELECT count(product_id) from cart WHERE customer_id = $1",[customer_id]);
    const count_result = count.rows[0];
    const final_count = count_result.count;
    const total_result = await db.query("SELECT sum(price) from cart WHERE customer_id = $1",[customer_id]);
    const Total = total_result.rows[0].sum;

    res.redirect(`/toWishList?customer_id=${customer_id}`);
});

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});

// Select product_name,imageurl,product_id,customer_id, price from products, wishlist where products.id = wishlist.product_id and wishlist.customer_id = 1;