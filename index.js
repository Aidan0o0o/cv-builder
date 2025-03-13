const express = require("express"); //to run web server
const sqlite3 = require('sqlite3'); //to run database and querys
const hbs = require('hbs'); //to run the template
const multer = require("multer");//to save user inputed images to file
const { and } = require("sequelize");
const dotenv = require('dotenv').config()
const upload = multer({ dest: 'public/user_images/' }) //sets folder destination 
//helper - a function which is called within the template
hbs.registerHelper("ifEquals", function (a, b, options) {
    if (a == b) {       // in this case it checks if a variable is equal to another variable                             
        return options.fn(this) //options.fn - handles bar provided function that will return the html inside the ifEquals tag 
    } else {
        return options.inverse(this) //currenty not in use but good practice to include incase we want to use an else later
    }
})

const environment = dotenv.parsed;

const app = express();  //creating the instanse of express
app.use(express.urlencoded({ extended: false })); //lets us send dta between server and client easier

// use handlebars template engine with html extensions 
app.set('view engine', 'html');
app.engine('html', require('hbs').__express);

app.listen(3000, () => console.log("listening on http://localhost:3000")); //tells application which port to listen to

const db = new sqlite3.Database('./cv-db.sqlite'); //creates the database

//function to creat db tables and insert data into key-info-types
function createDB() {
    const queries = [
        "CREATE TABLE cv (id INTEGER PRIMARY KEY, name varchar(250)); ",
        `CREATE TABLE user_summary (
                id INTEGER PRIMARY KEY NOT NULL,  
                cv_id INTEGER NOT NULL, 
                first_name varchar(250), 
                last_name varchar(250), 
                email varchar(250), 
                phone varchar(250), 
                summary TEXT, 
                photo varchar(500), 
                FOREIGN KEY(cv_id) REFERENCES cv(id)
            );`,
        `CREATE TABLE work_experience (
                id INTEGER PRIMARY KEY NOT NULL,  
                cv_id INTEGER NOT NULL, 
                job_role varchar(250), 
                employer varchar(250), 
                work_start TEXT, 
                work_end TEXT, 
                work_location varchar(250), 
                work_notes TEXT, 
                FOREIGN KEY(cv_id) REFERENCES cv(id)
            );`,
        `CREATE TABLE education (
            id INTEGER PRIMARY KEY NOT NULL, 
            cv_id INTEGER NOT NULL, 
            qualification varchar(250), 
            school_name varchar(250), 
            school_start TEXT, 
            school_end TEXT, 
            school_location varchar(250), 
            FOREIGN KEY(cv_id) REFERENCES cv(id)
        );`,
        `CREATE TABLE key_info_content (
            id INTEGER PRIMARY KEY NOT NULL, 
            cv_id INTEGER NOT NULL, 
            key_info_type_id INTEGER, 
            key_info_content TEXT, 
            FOREIGN KEY(cv_id) REFERENCES cv(id), 
            FOREIGN KEY(key_info_type_id) REFERENCES key_info_type(id)
        );`,
        `CREATE TABLE key_info_type (
            id INTEGER PRIMARY KEY NOT NULL, 
            key_info_type varchar(250)
        );`,

        `INSERT INTO key_info_type(id, key_info_type)
         VALUES(1,'language');`,

        `INSERT INTO key_info_type(id, key_info_type)
         VALUES(2,'extra_qualification');`,

        `INSERT INTO key_info_type(id, key_info_type)
         VALUES(3,'interests');`,

        `INSERT INTO cv(id)
         VALUES(1);`



    ];
    db.serialize(() => {    //db.serialize executes requests 1 at a time to stop errors
        //loop to execute each query whilst checking for errors
        queries.forEach(function (query) {
            try {
                console.log("Running: ", query);
                db.run(query);
            } catch (error) {
                console.error("DB Error: ", error);
            }
        })
    })



}
//functions for user summary


function insertUserSummary(params) {
    db.run(`
        INSERT INTO user_summary(cv_id, first_name,last_name,phone,email,summary,photo)
        VALUES(?, ?, ?, ?, ?, ?,?)`, [params.cv_id, params.first_name, params.last_name, params.phone_num, params.email, params.summary, params.photo], //array containing values for insertion
        function (err) {
            if (err) { console.error(err.message) }
            console.log("NEW ID IS", this.lastID)
        }
    )
}


function recieveUserSummary(request, response) {  //function to allow the user to request data and recieve a response
    console.log(request.body)
    if (request.body.user_summary_id == "") { //checks if id is empty (checks if its creating new or editing)
        insertUserSummary(request.body)
    } else {
        updateUserSummary(request.body)
        console.log("Updating education")
    }
    response.redirect("/?cv_id=" + request.body.cv_id); //reloads the cv page after it updates to display to user the current version
}

function updateUserSummary(params) {
    db.run(`UPDATE user_summary
        SET 
        first_name= ?,
        last_name=?,
        phone=?, 
        email=?, 
        summary=?
        WHERE id=? AND cv_id=?`,
        [params.first_name, params.last_name, params.phone_num, params.email, params.summary, params.user_summary_id, params.cv_id])
}


function updateUserSummaryPhoto(photo, summaryId, cvId) {
    db.run(`UPDATE user_summary
        SET 
        photo=?
        WHERE id=? AND cv_id=?`,
        [photo, summaryId, cvId])
}

//functions for education

//insert
function insertEducation(params) {
    console.log("test test")
    db.run(`INSERT INTO education(cv_id,qualification ,school_name,school_start,school_end, school_location)
        VALUES(?,?,?,?,?,?)`, [params.cv_id, params.qualification, params.school_name, params.school_start, params.school_end, params.school_location], //passing data as paramaters to stop sql injections which could compromise the database
        function (err) {
            console.log(err);
        }
    )
}

//recieve from forms
function recieveEducation(request, response) {  //function to allow the user to request data and recieve a response
    if (request.body.education_id == "") {
        insertEducation(request.body)
    } else {
        updateEducation(request.body)
        console.log("Updating education")
    }
    response.redirect('/?cv_id=' + request.body.cv_id);
}

function updateEducation(params) {
    db.run(`UPDATE education
        SET 
        qualification= ?,
        school_name=?,
        school_start=?, 
        school_end=?, 
        school_location=?
        WHERE id=? AND cv_id=?`,
        [params.qualification, params.school_name, params.school_start, params.school_end, params.school_location, params.education_id, params.cv_id])
}


//functions for work experience
function insertWorkExp(params) {
    db.run(`INSERT INTO work_experience(cv_id,job_role, employer, work_start, work_end, work_location, work_notes )
        VALUES(?,?,?,?,?,?,?)`, [params.cv_id, params.job_role, params.employer, params.work_start, params.work_end, params.work_location, params.work_notes],
        function (err) {  //db.run function expects a callback function with 'err' as a parameter in case of an error
            console.log(err); //logs error to the console
        }
    )
}

function recieveWorkExp(request, response) {  //function to allow the user to request data and recieve a response
    console.log("WORK EXP:", request.body)
    if (request.body.work_exp_id == "") { //checks to see if there is a existing ID to decide whether to update table or insert new data to it
        insertWorkExp(request.body)
    } else {
        updateWorkExp(request.body)
        console.log("Updating work experience: ")
    }
    response.redirect('/?cv_id=' + request.body.cv_id);
}


function updateWorkExp(params) {
    db.run(`UPDATE work_experience
        SET 
        job_role=?,
        employer=?,
        work_start=?, 
        work_end=?, 
        work_location=?,
        work_notes=?
        WHERE id=? AND cv_id=?`,
        [params.job_role, params.employer, params.work_start, params.work_end, params.work_location, params.work_notes, params.work_exp_id, params.cv_id])
}

//functions for key info value
function insertKeyInfoContent(params) {
    db.run(`INSERT INTO key_info_content(cv_id, key_info_type_id,key_info_content)
        VALUES (?,?,?)` , [params.cv_id, params.key_info_type, params.key_info_content],
        function (err) {
            console.log(err);
        }
    )
}

function deleteKeyInfo(keyInfoId, cvId, response) {
    db.serialize(() => {
        db.run(`DELETE FROM key_info_content WHERE id = ?`, [keyInfoId,],
            function (err) {
                response.redirect('/?cv_id=' + cvId); // redirect after delete

            }
        )
    });
}

function receiveKeyInfoDelete(request, response) {
    deleteKeyInfo(request.query.id, request.query.cv_id, response); //.query. to recieve url parameters
}


function recieveKeyInfo(request, response) {  //function to allow the user to request data and recieve a response
    console.log(request.body)
    if (request.body.key_info_content_id == "") {
        insertKeyInfoContent(request.body) //.body to recieve data from form (body from form query from url)
    } else {
        //updateKeyInfoContent(request.body)
        console.log("Updating education")
    }
    response.redirect('/?cv_id=' + request.body.cv_id);
}

// password is a pseudo authentication mechanism here. it's defined in the environment and currently single user.
function renderCV(cv_id, response, password) {   //selects all from cv table where the cv id matches the given cv id
    const cvData = {};
    
    if (password === environment.PASSWORD) {
        cvData.authenticated = true;
    }
    db.serialize(function () {
        db.get( //get instead of run as get returns a single row from db and run doesnt recieve data
            `SELECT * FROM cv WHERE id = ?`,
            [cv_id],
            function (err, cv) { //function to catch errors and load data 
                cvData.id = cv.id;
                cvData.name = cv.name
            }
        );
        db.get(
            "SELECT * from user_summary where cv_id = ?",
            [cv_id],
            function (err, row) {
                cvData.summary = row; //puts single row of data into the cvData object
            }

        );
        db.all( //all so we can recieve multiple rows from the database allowing multiple jobs to be put on cv
            "SELECT * from work_experience where cv_id = ? ORDER BY work_start DESC",
            [cv_id],
            function (err, rows) {
                cvData.work_experience = rows;
            }

        )
        db.all(
            `SELECT key_info_content.*, key_info_type.key_info_type
            FROM key_info_content 
            JOIN key_info_type ON key_info_type.id = key_info_content.key_info_type_id 
            WHERE cv_id = ? `, [cv_id],
            function (err, rows) {
                cvData.key_info = rows; //puts rows of data in cvData object
            }
        );
        db.all(
            "SELECT * from education where cv_id = ? ORDER BY school_start ASC",
            [cv_id],
            function (err, rows) {
                cvData.education = rows;
                response.render("index", cvData)
            }
        );

    })


}




// main cv rendering handler. passes the response to renderCV as it is asynchronous and will render the response when completing loading the full cv data
function cvMain(request, response) {
    const cvId = request.query.cv_id; //request query
    const password = request.query.password;
    if (cvId) {
        renderCV(cvId, response, password);
    } else {
        response.redirect("/?cv_id=1")
    }
}

//function to recieve image data and update the summarys image
function receiveImage(request, response) {
    console.log("Photo saved to file...");
    console.log(request.file);

    updateUserSummaryPhoto(request.file.filename, request.query.id, request.query.cv_id)
    response.redirect("/?cv_id=1")
}

//application routes
app.get("/", cvMain); //route for main function
app.post('/recieve-user-image', upload.single('photo'), receiveImage) //route to upload image
app.get("/delete-key-info", receiveKeyInfoDelete) //get request instead of delete tag as less complicated for current level
app.post("/recieve-user-summary", recieveUserSummary)
app.post("/recieve-education", recieveEducation)
app.post("/recieve-work-exp", recieveWorkExp)
app.post("/recieve-key-info", recieveKeyInfo)
app.use(express.static("./public")); //for all static files

//create DB should only run once and is therefor commented out as DB is supplied 
try {
    //createDB(); 
} catch (err) {
    console.log(err)
}
