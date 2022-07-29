var express = require('express');
var router = express.Router();
var app = express();
const multer  = require('multer')
const fs = require('fs');
const reader = require('xlsx')
const mysql = require('mysql');
const upload = multer({ dest: 'uploads/' })
const https = require('https');
const path = require('path');
const xlsx = require('xlsx');
const FileSaver = require('file-saver')
const Blob = require('node-blob');

/* GET home page. */
router.get('/', function(req, res, next) {
  console.log(path.join(__dirname, "uploads"));
  res.render('index', { title: 'Express' });
});
let connection = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: '',
  database:'biat',
  multipleStatements: true
});
router.post('/upload', upload.single('file'),  function(req, res, next) {
  //-----
  console.log(req.file);
  if(req.file.mimetype != "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"){
    console.log("ITS SQL FILE");
    var sqldata = fs.readFileSync('uploads/' + req.file.filename, 'utf8');
    console.log(sqldata);
    connection.getConnection(function(err, connection) {
      connection.query("create database " +req.body.dbname+ " ;", function(err, rows) {
        console.log(err);
      });
      connection.query("use " + req.body.dbname + " ;", function(err, rows) {
        console.log(err);
      });
      connection.query(sqldata, function(err, rows) {
          console.log(err);
          connection.release();
      });
    });
    fs.writeFile('./dbname', req.body.dbname, err => {
      if (err) {
        console.error(err);
      }
      // file written successfully
    });
  }else{
    const file = reader.readFile('uploads/' ,req.file.filename)
    console.log("ITS EXCEL FILE XLSX");
    let data = []
    let whole = [[]]
      
    // te9sem l des sheets
    const sheets = file.SheetNames
      
    /*for(let i = 0; i < sheets.length; i++){
      const temp = reader.utils.sheet_to_json(file.Sheets[file.SheetNames[i]])
      data.push(file.SheetNames[i])
      temp.forEach((res) => {
          data.push(res)
      })
      whole.push(data)
      data = []
    }
    console.log(whole)*/
    for(let i = 0; i < sheets.length; i++){
      const temp = reader.utils.sheet_to_csv(file.Sheets[file.SheetNames[i]])
      data[file.SheetNames[i]] = temp;
    }
    console.log(data);
    //kol sheet ywali csv 
    //tconverti sql w tabaathou lil base  'knex'
    //database create 
    //table tsob sql
  }
  res.send("finish")
});

router.get('/file-content',  function(req, res, next) {
  const dir = 'uploads/'
  console.log(dir);
  const files = fs.readdirSync(dir)
  res.download(dir + files[0], files[0]); 

});

router.post('/query/:table',  function(req, res, next) {
  console.log(req.body.query);
  console.log(req.params.table);
  const dbname = fs.readFileSync('./dbname', 'utf8')
  connection.getConnection(function(err, connection) {
    connection.query("use " + dbname + " ;", function(err, rows) {
      console.log(err);
    });
    connection.query(req.body.query, function(err, rows) {
        console.log(err);
        tables = rows;
        //console.log(tables);
        var jsoned = Object.values(JSON.parse(JSON.stringify(tables)));
        console.log(jsoned);
        connection.release();
        res.send(jsoned);
    });
  });
});
router.get('/get-tables',  function(req, res, next) {
  var dbname;
  let tables;
  const data = fs.readFileSync('./dbname', 'utf8')
  dbname = data;
  connection.getConnection(function(err, connection) {
    connection.query("use " + dbname + " ;", function(err, rows) {
      console.log(err);
    });
    connection.query("SELECT table_name FROM information_schema.tables WHERE table_schema ='"+dbname+"';", function(err, rows) {
        console.log(err);
        tables = rows;
        //console.log(tables);
        connection.release();
        var all = [];
        var jsoned = Object.values(JSON.parse(JSON.stringify(tables)));
        console.log(jsoned);
        jsoned.forEach((v) => {
          console.log(v.table_name);
          all.push(v.table_name);
        });
        res.send(all)
    });
  });
});




module.exports = router;
