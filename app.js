const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const mysql = require('mysql');
const multer = require('multer');

const app = express();


/* connect to database *******************************************************************/

const dbConnector = mysql.createConnection({
    host: 'localhost',
    user: 'ikan',
    password: 'ikankonsultikan',
    database: 'tms'
});

dbConnector.connect();

/* mapbox *********************************************************************************/


/* use these resources *******************************************************************/

app.use(express.static(__dirname));
app.use('/', express.static(path.join(__dirname, '/html')));
app.use('/', express.static(path.join(__dirname, '/css')));
app.use('/', express.static(path.join(__dirname, '/js')));
app.use('/', express.static(path.join(__dirname, '/images')));
app.use('/', express.static(path.join(__dirname, '/records')));
app.use(express.json());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true}));


/* form data upload **********************************************************************/

// Set The Storage Engine
const storage = multer.diskStorage({
    destination: (req, file, cd) => {
        let dir = path.join(__dirname, '/records/sites/', String(req.body.locationName));

        if(!fs.existsSync(dir)) {
            fs.mkdirSync(dir);
        }

        dir = path.join(dir, '/images');

        if(!fs.existsSync(dir)) {
            fs.mkdirSync(dir);
        }

        cd(null, dir);
    },
    filename: (req, file, cb) => {
        cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits:{fileSize: 1000000},
    fileFilter: function(req, file, cb){
        checkFileType(file, cb);
    }
}).array('images', 3);

function checkFileType(file, cb){
    // Allowed ext
    const filetypes = /jpeg|jpg|png|gif/;
    // Check ext
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    // Check mime
    // const mimetype = filetypes.test(file.mimetype);

    if(extname) {
        return cb(null, true);
    } else {
        cb('Error: Images Only!');
    }

    // if(mimetype && extname){
    //     return cb(null,true);
    // } else {
    //     cb('Error: Images Only!');
    // }
}


/* create functions **********************************************************************/




/* handle requests ***********************************************************************/

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "/html/index.html"));
});

app.get('/load-geojson', (req, res) => {
    fs.readFile(path.join(__dirname, '/records/map-features.json'), (err, data) => {
        if(err) throw err;
        let mapFeatures = JSON.parse(data);
        // console.log(mapFeatures);
        res.status(200).json(mapFeatures);
    });
});

app.post('/save-geojson', (req, res) => {
    // console.log(req.body);
    fs.readFile(path.join(__dirname, '/records/map-features.json'), (err, data) => {
        if(err) throw err;
        mapFeatures = JSON.parse(data);
        console.log(mapFeatures);
        // res.status(200).json(mapFeatures);
    });

    mapFeatures = mapFeatures.push(req.body);

    let mapFeatures = JSON.stringify(mapFeatures, null, 2);

    fs.writeFile(path.join(__dirname, '/records/save-test.json'), mapFeatures, (err) => {
        if (err) throw err;
        console.log('Data written to file');
        console.log(mapFeatures);
    });

});

app.post("/register-site", (req, res, next) => {
    upload(req, res, (err) => {
        if(err) {
            console.log('Contents not saved.');
        }

        const qry = "INSERT INTO locations (coordinates, location_name, auther, location_accessible, doc, notes) VALUES (?, ?, ?, ?, ?, ?)";
        let accessible = 0;
        let acc = 'yes'||'Yes'||'YES'; // use toLowerCase
        
        // convert data to database format
        if(req.body.accessible === acc) {
            accessible = 1;
        }

        dbConnector.query(qry, [req.body.coordinates, req.body.locationName, req.body.auther, req.body.accessible, req.body.doc, req.body.notes], (err, result) => {
            if(err) throw err;

            res.json({"err": false});
    
            console.log("Site Successfully Registered.");
        });
    });
});


app.get('/get-location/:id', (req, res) => {
    // console.log(req.params.id);
    dbConnector.query("SELECT * FROM locations WHERE coordinates = ?", req.params.id, (err, result) => {
        if(err) throw err;

        // res.json(result);

        console.log(result);

        console.log('data retrieved');
    });
});


app.get('/get-locations', (req, res) => {
    dbConnector.query('SELECT * FROM locations', (err, locations) => {
        if(err) {
            res.json({"err": true});
        }

        locations.forEach(location => {
            fs.readdir(path.join(__dirname, '/records/locations/', location.location_name, '/images'), (err, files) => {
                let fileArray = [];
                fileArray[0] = [];

                files.forEach((file, index) => {
                    fileArray[index] = file;
                });
            });

            location.images = fileArray;
        });
    });

    res.json(locations)
});


const port = 3000;

app.listen(port);