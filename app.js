require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const _ = require("lodash");
const mongoose = require("mongoose");
const session = require("express-session");
var MongoDBSession = require('connect-mongodb-session')(session);
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const axios = require('axios');


const app = express();

app.set('view engine', 'ejs');

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static("public"));
app.use('/css', express.static("public/css"));

const User = require("./models/user");
const Admin = require("./models/admin");
const Item = require("./models/item");
const Order = require("./models/order");
const Collab = require("./models/collab");


const defaultUsers = require("./defaultItemsInDB/users");
const defaultAdmins = require("./defaultItemsInDB/admins");
const defaultItems = require("./defaultItemsInDB/items");
const defaultOrders = require("./defaultItemsInDB/orders");
const items = require("./defaultItemsInDB/items");
const collab = require("./models/collab");


const { checkPlagiarism } = require('./plagiarismChecker.js'); // Adjust the path as needed

// const MongoURI = 'mongodb://127.0.0.1:27017/techsolution';
const MongoURI = process.env.MONGO_URI;

mongoose
    .connect(MongoURI, {
        useNewUrlParser: true,
        useUnifiedTopology: true
    })
    .then(() => {
        console.log('Connected to MongoDB');
        // Continue with the rest of the code here
    })
    .catch((error) => {
        console.error('Error connecting to MongoDB:', error);
    });

//set storage for images and report files
const imgDir = "./public/img";
const reportDir = "./public/report";

const upload = multer({
    storage: multer.diskStorage({
        destination: (req, file, cb) => {
            // Determine the destination directory based on the field name
            if (file.fieldname === 'imgfile') {
                cb(null, imgDir);
            } else if (file.fieldname === 'pdffile') {
                cb(null, reportDir);
            } else {
                cb(new Error("Invalid field name"), null);
            }
        },
        filename: (req, file, cb) => {
            cb(null, file.originalname);
        },
    }),

    fileFilter: (req, file, cb) => {
        let ext = path.extname(file.originalname);
        if (ext !== '.png' && ext !== '.jpg' && ext !== '.gif' && ext !== '.jpeg' && ext !== '.pdf') {
            return cb(null, false);
        }
        cb(null, true);
    }
}).fields([{ name: 'imgfile', maxCount: 1 }, { name: 'pdffile', maxCountL: 1 }]);

const store = new MongoDBSession({
    uri: MongoURI,
    collection: "mySessions",
});

//sessions
app.use(session({
    secret: process.env.SECRET,
    resave: false,
    saveUninitialized: false,
    store: store,
    cookie: {
        maxAge: 10800000, // 3 hour in milliseconds
        sameSite: 'strict'
    },
}));

const isAuth = (req, res, next) => {
    if (req.session.isAuth) {
        next();
    } else {
        res.redirect("/");
    }
}

app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('Something went wrong!');
});

function insertDefaultAdmins() {
    // insertMany admins
    Admin.insertMany(defaultAdmins)
        .then(() => {
            console.log("Successfully inserted admin objects.");
        })
        .catch((error) => {
            console.log("Error inserting array of admin objects : " + error);
        });
}

app.get("/", function (req, res) {
    console.log('hello');
    res.render('loginSelect')
});

app.get("/alogin", function (req, res) {
    Admin.find({})
        .then(function (adminList) {
            if (adminList.length === 0) {
                insertDefaultAdmins();
                res.redirect("/admin");
            } else {
                console.log(adminList[0]);
                res.render("alogin", { message: "" });
            }
        })
        .catch((error) => {
            console.log("Error finding admins: " + error);
        });
});

app.post("/alogin", function (req, res) {
    const uname = req.body.name;
    const password = req.body.password;

    Admin.findOne({ name: uname })
        .then(function (foundAdmin) {
            if (!foundAdmin) {
                console.log("Admin not found");
                res.render("alogin", { message: "Wrong username or password" });
            } else {
                console.log("Found admin");
                if (foundAdmin.password == password) {
                    console.log("Admin varified");
                    req.session.isAuth = true;
                    req.session.user = foundAdmin;
                    res.redirect("/admin");
                }
                else {
                    // console.log("wrong password : " + password);
                    res.render("alogin", { message: "Wrong username or password" });
                }
            }
        })
        .catch((err) => {
            console.log("Error finding admin by name : " + err);
        });

});

function insertDefaultUsers() {
    // insertMany admins
    for (let user in defaultUsers) {
        console.log(defaultUsers[user]);
        if (defaultUsers[user].college_id === null) {
            const college = defaultUsers[user].college;
            Admin.findOne({ name: college })
                .then((foundCollege) => {
                    defaultUsers[user].college_id = foundCollege._id;
                    console.log("assigned college id to user");
                })
                .catch((err) => {
                    console.log("Error assigning college id : ", err);
                })
        }
    }

    // console.log(defaultUsers);

    User.insertMany(defaultUsers)
        .then(() => {
            console.log("Successfully inserted user objects.");
        })
        .catch((error) => {
            console.log("Error inserting array of user objects : " + error);
        });
}

app.get("/slogin", function (req, res) {
    User.find({})
        .then(function (userList) {
            if (userList.length === 0) {
                insertDefaultUsers();
                res.redirect("/slogin");
            } else {
                console.log(userList[0]);
                res.render("slogin", { message: "" });
            }
        })
        .catch((error) => {
            console.log("Error finding admins: " + error);
        });
});

app.post("/slogin", function (req, res) {
    const uname = req.body.name;
    const password = req.body.password;

    User.findOne({ name: uname })
        .then(function (foundUser) {
            if (!foundUser) {
                console.log("user not found");
                res.render("slogin", { message: "Wrong username or password" });
            } else {
                console.log("Found user");
                if (foundUser.password == password) {
                    console.log("student varified");
                    req.session.isAuth = true;
                    req.session.user = foundUser;
                    res.redirect("/home");
                }
                else {
                    // console.log("wrong password : " + password);
                    res.render("slogin", { message: "Wrong username or password" });
                }
            }
        })
        .catch((err) => {
            console.log("Error finding user by name : " + err);
        });

});

app.get("/home", isAuth, function (req, res) {
    Item.find({})
        .then(function (itemList) {
            if (itemList.length === 0) {
                console.log("No items found");
                res.render("home", { itemList });
            } else {
                res.render("home", { itemList });
            }
        })
        .catch((error) => {
            console.log("Error finding item : " + error);
        });
});

app.get("/admin", isAuth, function (req, res) {

    if (req.session.user.role != 'admin') {
        // It's not an Admin
        console.log("Unknown user type is logged in");
        console.log(req.session.user);
        res.redirect('/');
    }

    // console.log(req.session.user);

    Item.find({ college: req.session.user.name })
        .then(function (itemList) {
            Order.find({})
                .then((orderList) => {
                    res.render("admin", { itemList, orderList });
                })
                .catch((err) => {
                    console.log("error finding orderList : " + err);
                });
        })
        .catch((error) => {
            console.log("Error finding item : " + error);
        });
});

app.get("/additem", isAuth, function (req, res) {
    res.render("additem", { message: "" });
});

function addCollab(item, usn) {
    return new Promise((resolve, reject) => {
        User.findOne({ usn: usn })
            .then((foundUser) => {
                if (!foundUser) {
                    console.log("No user found for collab");
                    reject(new Error("No user found for collab"));
                } else {
                    Item.findOne({ name: item.name })
                        .then((foundItem) => {
                            const collab = new Collab({
                                student_id: foundUser._id,
                                item_id: foundItem._id
                            });
                            collab.save()
                                .then(() => {
                                    console.log("Collab with item saved successfully");
                                    resolve(); // Resolve the promise when collab is saved
                                })
                                .catch((err) => {
                                    console.log("Error creating a collab with item", err);
                                    reject(err); // Reject the promise if there's an error
                                });
                        })
                        .catch((err) => {
                            console.log("Error finding item details for collab ", err);
                            reject(err); // Reject the promise if there's an error
                        });
                }
            })
            .catch((err) => {
                console.log("Error finding user for collab, ", err);
                reject(err); // Reject the promise if there's an error
            });
    });
}

app.post("/additem", upload, function (req, res) {
    const name = req.body.name;
    const description = req.body.description;
    // const price = req.body.price;
    // const time = req.body.time;
    const subject = req.body.subject;
    const studentUSN = req.body.student;
    const college = req.body.college;
    const imgFile = req.files.imgfile;
    const pdfFile = req.files.pdffile;
    let link = req.body.link;

    if (link.length == 0) {
        link = null;
    }

    // Check if a file was uploaded
    if (!imgFile || imgFile[0].mimetype == 'application/pdf') {
        console.log("No image file was uploaded.");
        res.render("additem", { message: "Upload file with mentioned format (jpg, jpeg, png only)." });
        return;
    }

    if (!pdfFile || pdfFile[0].mimetype != 'application/pdf') {
        console.log("No PDF file was uploaded.");
        res.render("additem", { message: "Upload file with mentioned format (pdf only)." });
        return;
    }

    // console.log(req.files);
    // console.log(imgFile[0].originalname);
    // console.log(pdfFile[0].originalname);

    Admin.findOne({ name: college })
        .then((foundCollege) => {
            const item = new Item({
                name: name,
                image: {
                    data: imgFile[0].originalname,
                    ContentType: imgFile[0].mimetype
                },
                report: {
                    data: pdfFile[0].originalname,
                    ContentType: pdfFile[0].mimetype
                },
                description: description,
                college: college,
                // price: price,
                subject: subject,
                college_id: foundCollege._id,
                link: link
            });

            console.log("College_id assigned to project");

            Item.findOne({ name: name })
                .then(function (foundItem) {
                    if (!foundItem) {
                        console.log("Similar item not found.");
                        // console.log(item);
                        item.save()
                            .then((savedItem) => {
                                console.log("Item saved Successfully : \n" + savedItem);
                                //add collab after saving item successfully.
                                addCollab(item, studentUSN)
                                    .then(() => {
                                        console.log("Collaboration complete.");
                                        //plagarism check
                                        res.redirect('/uploadReport/' + savedItem._id)
                                    })
                                    .catch((err) => {
                                        console.log("Error creating collaboration, ", err);
                                    });
                                // res.redirect("/admin");
                            })
                            .catch((error) => {
                                console.log("Error saving Item : " + error);
                            });
                    } else {
                        console.log("Similar item has been found and you will be redirected to additem page.");
                        res.render("additem", { message: "Similar item has been found and you will be redirected to additem page." })
                    }
                })
                .catch((err) => {
                    console.log("Error finding similar items : " + err);
                });
        })
        .catch((err) => {
            console.log("Error assigning college_id to projects.", err);
        })

});

app.get('/uploadReport/:itemid', async function (req, res) {
    const itemId = req.params.itemid;
    let foundItem = null;

    try {
        foundItem = await Item.findById(itemId);
        console.log('Item found : ', foundItem);
    } catch (err) {
        console.log('item Not found while checking plagiarism.', err);
        return;
    }
    console.log('In upload report function route.');
    console.log(foundItem);
    const filePath = './public/report/' + foundItem.report.data;
    console.log(filePath);

    try {
        let percentPlagiarism = await checkPlagiarism(filePath);
        console.log('Percentage plagiarism:', percentPlagiarism);
        let message = '';
        let problemFlag = false;

        percentPlagiarism = 50;

        if (percentPlagiarism === null) {
            message = "Something went wrong";
            problemFlag = true;
        } else if (percentPlagiarism <= 30) {
            message = "You are good to go.";
        } else {
            console.log('Percentage plagiarism:', percentPlagiarism);
            message = "Sorry, You cannot proceed further.Plagarism must be less than 30%";
            problemFlag = true;
        }
        console.log('message: ', message);

        if (problemFlag) {
            try {
                deleteItemAndCollabs(itemId)
                    .then((deletedItems) => {
                        console.log("deleted Items after plagarism : \n", deletedItems);
                    })
                    .catch((err) => {
                        console.error("Error deleting item and collabs:", err);
                    });

                console.log('Project deleted successfully.');
            } catch (error) {
                console.error('Error deleting project:', error);
            }
        }
        res.render('ans', { percentPlagiarism, message });
    } catch (error) {
        console.error('Error in app.js:', error);
    }
});

app.get('/ans', (req, res) => {
    res.render('ans', { percentPlagiarism: null, message: 'You cannot upload this project.' });
});

function deleteItemAndCollabs(item_id) {
    return new Promise((resolve, reject) => {
        Item.findOneAndRemove({ _id: item_id })
            .then((item) => {
                if (!item) {
                    return reject(new Error("Item not found"));
                }

                fs.unlinkSync(`./public/img/${item.image.data}`);
                fs.unlinkSync(`./public/report/${item.report.data}`);
                console.log("Successfully deleted the Item.");

                Collab.deleteMany({ item_id })
                    .then((collabs) => {
                        console.log(collabs);
                        console.log("Successfully deleted collabs after deleting items.");
                        resolve(collabs);
                    })
                    .catch((err) => {
                        console.log('Error deleting collab items after deleting items.', err);
                        reject(err);
                    });
            })
            .catch((err) => {
                console.log("Error deleting Item : " + err);
                reject(err);
            });
    });
}


app.post("/admin/projects/delete", function (req, res) {
    const item_id = req.body.item_id;

    console.log("Deleting : " + item_id);

    deleteItemAndCollabs(item_id)
        .then(() => {
            console.log("successfully deleted item and collabs");
        })
        .catch((err) => {
            console.error("Error deleting item and collabs:", err);
        });

    res.redirect('/admin');
});

app.post("/alogout", function (req, res) {
    req.session.isAuth = false;

    //need to add session deletion.






    res.redirect("/alogin");
});

app.get("/projects/:projectid", async function (req, res) {
    const reqTitle = req.params.projectid;
    // const message = req.query.message;
    let collabMembers = [];

    try {
        // Find the project by ID, populate the members
        const foundItem = await Item.findById(reqTitle);

        if (!foundItem || foundItem.length === 0) {
            console.log("Project title match not found.");
            res.render("project", { title: "items not found.", message: "Please try again later. Try to contact a developer. Search with other parameters.", item: null });
        }

        try {
            const foundCollabs = await Collab.find({ item_id: foundItem._id });

            if (!foundCollabs || foundCollabs.length === 0) {
                console.log("Project collab members not found.");
                res.render("project", { title: "collab members not found.", message: "Please try again later. Try to contact a developer. Search with other parameters.", item: null });
            }

            for (let collab of foundCollabs) {
                const foundMembers = await User.find({ _id: collab.student_id });

                if (!foundMembers || foundMembers.length === 0) {
                    console.log("No users found for collaboration: " + grade);
                    continue;
                }

                collabMembers.push(...foundMembers);
            }

            if (collabMembers.length > 0) {
                console.log("collab members is ready");
                res.render("project", { title: "collab members not found.", message: "", item: foundItem, members: collabMembers });
            } else {
                console.log("No collab members found for the given project and collaborations.");
                return res.redirect('/home');
            }

        } catch (err) {
            console.log("Error finding collab members by proj ID: " + err);
            res.status(500).send("Internal Server Error");
        }

    } catch (err) {
        console.log("Error finding project by ID: " + err);
        res.status(500).send("Internal Server Error");
    }
});

app.get('/projects/reports/:reportname', function (req, res) {
    const reportName = req.params.reportname;
    const filePath = path.join(__dirname, 'public', 'report', reportName);

    // Use res.sendFile to send the PDF file as a response
    res.sendFile(filePath);
});

app.get("/admin/projects/:projectid", async function (req, res) {
    const reqTitle = req.params.projectid;
    // const message = req.query.message;
    let collabMembers = [];

    try {
        // Find the project by ID, populate the members
        const foundItem = await Item.findById(reqTitle);

        if (!foundItem || foundItem.length === 0) {
            console.log("Project title match not found.");
            res.render("ediproject", { title: "items not found.", message: "Please try again later. Try to contact a developer. Search with other parameters.", item: null });
        }

        try {
            const foundCollabs = await Collab.find({ item_id: foundItem._id });

            if (!foundCollabs || foundCollabs.length === 0) {
                console.log("Project collab members not found.");
                res.render("ediproject", { title: "collab members not found.", message: "Please try again later. Try to contact a developer. Search with other parameters.", item: null });
            }

            for (let collab of foundCollabs) {
                const foundMembers = await User.find({ _id: collab.student_id });

                if (!foundMembers || foundMembers.length === 0) {
                    console.log("No users found for collaboration: " + grade);
                    continue;
                }

                collabMembers.push(...foundMembers);
            }

            if (collabMembers.length > 0) {
                console.log("collab members is ready");
                res.render("ediproject", { title: "collab members not found.", message: "", item: foundItem, members: collabMembers });
            } else {
                console.log("No collab members found for the given project and collaborations.");
                return res.redirect('/admin');
            }

        } catch (err) {
            console.log("Error finding collab members by proj ID: " + err);
            res.status(500).send("Internal Server Error");
        }

    } catch (err) {
        console.log("Error finding project by ID: " + err);
        res.status(500).send("Internal Server Error");
    }
});

app.post("/addcollaborator", function (req, res) {
    const itemID = req.body.item_id;
    const collabusn = req.body.collabusn;

    Item.findOne({ _id: itemID })
        .then((foundItem) => {
            if (!foundItem) {
                console.log("Item not found for addcollab.");
            } else {
                console.log("item found for addcollab.");
                console.log(foundItem, collabusn);
                addCollab(foundItem, collabusn);
            }
        })
        .catch((err) => {
            console.log("Error finding item for addCollab. ", err);
        });

    res.redirect('/admin/projects/' + itemID);
});

app.post('/deletecollaborator', function (req, res) {
    const collabID = req.body.collab_id;
    const itemID = req.body.item_id;

    console.log(collabID, itemID);

    Collab.deleteOne({ student_id: collabID, item_id: itemID })
        .then(() => {
            console.log("Collaboration Deleted.");
        })
        .catch((err) => {
            console.log("Error deleting collaboration.", err);
        });

    res.redirect("/admin/projects/" + itemID);
});

app.post("/editproject", upload, function (req, res) {
    const itemID = req.body.item_id;
    const name = req.body.name;
    const description = req.body.description;
    const subject = req.body.subject;
    const college = req.body.college;
    let link = req.body.link;

    const imgFile = req.files.imgfile;

    if (!imgFile) {
        console.log("No image file was uploaded.");
    }

    if (imgFile) {
        console.log("image file being uploaded.");

        Item.findOne({ _id: itemID })
            .then((item) => {
                fs.unlinkSync(`./public/img/${item.image.data}`);
                console.log("Successfully deleted the image of Item.");
            })
            .catch((err) => {
                console.log("Error deleting image of the Item : " + err);
            });

        const image = {
            data: imgFile[0].originalname,
            ContentType: imgFile[0].mimetype
        }

        console.log(image.data, image.ContentType);

        Admin.findOne({ name: college })
            .then((foundCollege) => {
                if (!foundCollege) {
                    console.log("No college found for editing name.");
                    res.redirect("/admin");
                } else {
                    console.log("college found.");
                    ;
                    Item.findOneAndUpdate(
                        { _id: itemID },
                        { $set: { name, image, description, subject, college, college_id: foundCollege._id, link } },
                        { new: true, runValidators: true } // Add these options
                    )
                        .then((updatedItem) => {
                            console.log("Updated Item with image:", updatedItem);

                            if (updatedItem) {
                                console.log("Item edited with image successfully.");
                                res.redirect("/admin/projects/" + itemID);
                            } else {
                                console.log("No item found or no changes made with img.");
                                res.redirect("/admin/projects/" + itemID);
                            }
                        })
                        .catch((error) => {
                            console.log("Error while editing Item with image:", error);
                            res.redirect("/admin/projects/" + itemID);
                        });
                }
            })

    } else {

        console.log(name, itemID, description, subject, college, link);

        Admin.findOne({ name: college })
            .then((foundCollege) => {
                if (!foundCollege) {
                    console.log("No college found for editing name.");
                    res.redirect("/admin");
                } else {
                    console.log("college found.");
                    ;
                    Item.findOneAndUpdate(
                        { _id: itemID },
                        { $set: { name, description, subject, college, college_id: foundCollege._id, link } },
                        { new: true, runValidators: true } // Add these options
                    )
                        .then((updatedItem) => {
                            console.log("Updated Item with image:", updatedItem);

                            if (updatedItem) {
                                console.log("Item edited with image successfully.");
                                res.redirect("/admin/projects/" + itemID);
                            } else {
                                console.log("No item found or no changes made with img.");
                                res.redirect("/admin/projects/" + itemID);
                            }
                        })
                        .catch((error) => {
                            console.log("Error while editing Item with image:", error);
                            res.redirect("/admin/projects/" + itemID);
                        });
                }
            })
    }

});

app.get("/admin/orders", function (req, res) {
    Order.find({})
        .populate("item_id")
        .then((foundOrders) => {
            if (!foundOrders || foundOrders.length === 0) { // Check if the array is empty
                console.log("There are no orders.");
                res.render("orders", { orderList: foundOrders, message: "No orders available." });
            } else {
                console.log("Orders found.");
                res.render("orders", { orderList: foundOrders, message: "" });
            }
        })
        .catch((err) => {
            console.log("Error finding orders:", err);
        });
});

app.post("/admin/orders/delete", function (req, res) {
    const order_id = req.body.order_id;

    console.log("Deleting : " + order_id);

    Order.deleteOne({ _id: order_id })
        .then(() => {
            console.log("Successfully deleted the order.");
        })
        .catch((err) => {
            console.log("Error deleting order : " + err);
        });

    res.redirect('/admin/orders');
});

app.post("/projects/contact", function (req, res) {
    const itemID = req.body.itemID;
    const fname = req.body.fname;
    const lname = req.body.lname;
    const phone = req.body.phone;
    const city = req.body.city;
    const zip = req.body.zip;
    const nearby = req.body.nearby;

    const fullName = fname + " " + lname;

    if (nearby.length == 0) {
        nearby = "false";
    }

    const newOrder = new Order({
        item_id: itemID,
        name: fullName,
        phone: phone,
        city: city,
        zip: zip,
        nearby: nearby
    });

    Order.findOne({ name: fullName, item_id: itemID })
        .then(function (foundOrder) {
            if (!foundOrder) {
                // console.log("Similar order not found.");
                newOrder.save()
                    .then(() => {
                        console.log("New order saved Successfully : " + newOrder);
                        res.redirect("/");
                    })
                    .catch((error) => {
                        console.log("Error saving new Order : " + error);
                    });
            } else {
                console.log("Similar order has been found and you will be redirected to additem page.");
                res.send("You have already placed order and contacted the Seller, They will contact you in a while. Please be patient.")
            }
        })
        .catch((err) => {
            console.log("Error finding similar items : " + err);
        });


});

app.post('/grade', async function (req, res) {
    const grade = req.body.grade;

    let proj = [];

    try {
        const foundUsers = await User.find({ grade: grade });

        if (!foundUsers || foundUsers.length === 0) {
            console.log("No users found with this grade.");
            return res.render('home', { itemList: proj });
        }

        for (let user of foundUsers) {
            const foundCollabs = await Collab.find({ student_id: user._id });

            if (!foundCollabs || foundCollabs.length === 0) {
                console.log("No collaborations found for user with grade: " + grade);
                continue;
            }

            for (let collab of foundCollabs) {
                const foundItems = await Item.find({ _id: collab.item_id });

                if (!foundItems || foundItems.length === 0) {
                    console.log("No items found for collaboration: " + collab._id);
                    continue;
                }

                proj.push(...foundItems);
            }
        }

        if (proj.length > 0) {
            console.log("proj is ready");
            return res.render('home', { itemList: proj });
        } else {
            console.log("No projects found for the given grade and collaborations.");
            return res.render('home', { itemList: proj });
        }
    } catch (error) {
        console.log("Error in /grade route:", error);
        return res.status(500).send("Internal Server Error");
    }
});

app.post('/subject', function (req, res) {
    const subject = req.body.subject;

    Item.find({ subject })
        .then((foundItems) => {
            if (!foundItems) {
                console.log("Items not found while searching with subs");
            } else {
                console.log(foundItems);
                res.render('home', { itemList: foundItems });
            }
        })
})

app.post('/college', function (req, res) {
    const college = req.body.college;

    Item.find({ college })
        .then((foundItems) => {
            if (!foundItems) {
                console.log("Items not found while searching with subs");
            } else {
                console.log(foundItems);
                res.render('home', { itemList: foundItems });
            }
        })
});

// app.post('/usn', function(req, res){

// });

app.listen(3000, function () {
    console.log("Server is running on port 3000");
});