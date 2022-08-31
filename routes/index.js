var express = require('express');
var router = express.Router();
var app = express();
const multer  = require('multer')
const fs = require('fs');
const reader = require('xlsx')
//const mysql = require('mysql');
const Pool = require('pg').Pool
const upload = multer({ dest: 'uploads/' })
const https = require('https');
const path = require('path');
const xlsx = require('xlsx');
const FileSaver = require('file-saver')
const Blob = require('node-blob');
var pm2 = require('pm2');

/* GET home page. */
router.get('/', function(req, res, next) {
  console.log(path.join(__dirname, "uploads"));
  res.render('index', { title: 'Express' });
});
router.get('/r', function(req, res, next) {
  pm2.connect(function(err) {
    if (err) throw err;
    pm2.restart('app', function() {});
    res.send("restarting...");
  });
});
let connection = new Pool({
  host: 'localhost',
  user: 'postgres',
  password: '0000',
  database:'biat',
  port: 5432,
  multipleStatements: true,
  connectionLimit : 10
});
let co_db = new Pool({
  host: 'localhost',
  user: 'postgres',
  password: '0000',
  port: 5432,
  database:'biat_report',
  multipleStatements: true,
  connectionLimit : 10, 
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
  connection.query(req.body.query, function(err, rows) {
      if(err){
        res.send(null)
      }else{
        //console.log(rows.rows);
        //console.log(tables);
        var jsoned = Object.values(JSON.parse(JSON.stringify(rows.rows)));
        //console.log(jsoned);
        res.send(jsoned);
      }
  });
  });
router.get('/get-tables',  function(req, res, next) {
  var dbname;
  let tables;
  /*const data = fs.readFileSync('./dbname', 'utf8')
  dbname = data;
    connection.query("use " + dbname + " ;", function(err, rows) {
      console.log(err);
    });*/
    connection.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;", function(err, rows) {
        console.log(err);
        tables = rows.rows;
        console.log(tables);
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

router.get('/show-function',  function(req, res, next) {
  co_db.query(`SELECT * from public. "function";`, function(err, rows) {
      if(err) throw err 
      //console.log("in show")
      //console.log(rows.rows)
      res.send(rows.rows)
  });
  console.log("finish");
});
router.get('/nbrwrongFunction',  function(req, res, next) {
    co_db.query(`select count(*) as n from public. function where status='0';`, function(err, number) {
        if(err) throw err
        console.log(number);
        res.send(number.rows)
    });
});

router.get('/update-fn-status/:id/:bool',  function(req, res, next) {
  co_db.query(`update public. function set status=${req.params.bool} where id= ${req.params.id};`, function(err, rows) {
    if(err) throw err 
    res.send("updated status!")
  });
})
router.get('/get-function/:id',  function(req, res, next) {
  co_db.query(`SELECT * from public. function where id=${req.params.id};`, function(err, rows) {
      if(err) throw err
      console.log(rows.rows)
      res.send(rows.rows[0])
  });
});
router.post('/add-function',  function(req, res, next) {
  function sanitize(str){
    for(let y = 0; y<=str.length-1; y++){
      if(str[y] == "'"){
        str = str.slice(0, y) + "'" + str.slice(y);
        y++;
      }
    }
    return str;
  }
  let q1 = sanitize(req.body.query)
   console.log(q1)
  let q2 = sanitize(req.body.query_error)
  console.log(q1)
  console.log(q2)
  let strr = `INSERT INTO public."function" (id, query, status, "name", query_error) values (`+Math.random()*(50000-500+1)+`, '`+q1+`',`+ req.body.status+`, '`+ req.body.name +`' , '` +q2+ `');`;
  console.log(strr);  
  console.log("ons");
  co_db.query(strr, function(err, rows) {
        console.log(rows);
        res.send("done")
    });
    console.log("noussa");
});
router.post('/mod-function/:id',  function(req, res, next) {
  function sanitize(str){
    for(let y = 0; y<=str.length-1; y++){
      if(str[y] == "'"){
        str = str.slice(0, y) + "'" + str.slice(y);
        y++;
      }
    }
    console.log(str);
    return str;
  }
  console.log(req.body.query_error);
    co_db.query(`update function set query_error=\'` + sanitize(req.body.query_error) + `\',  query=\'`+ sanitize(req.body.query) +`\', name=\'`+ req.body.name+`\' where id=`+ req.params.id +`;`, function(err, rows) {
        console.log(err)
        res.send("done")
    });
});
router.delete('/delete-function/:id',  function(req, res, next) {
    co_db.query(`delete from public. "function" where id=`+req.params.id + `;`, function(err, rows) {
        console.log(err);
        res.send("done")
    });
});
module.exports = router;