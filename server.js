var mysql = require('mysql');
var express = require('express');
var bodyParser = require('body-parser');
var app = express();
var moment = require('moment');
require('moment-timezone');
moment.tz.setDefault("Asia/Seoul");

const now_date = moment().format('YYYY-MM-DD HH:mm:ss');
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));

app.listen(5000, '172.31.35.92', function () {
    console.log('서버 실행 중...');
});

var connection = mysql.createConnection({
    host: "13.209.88.95",
    user: "root",
    database: "caringrobot",
    password: "root",
    port: "3306"
});

var admin = require("firebase-admin")
var serviceAccount = require("/home/ubuntu/app/node/project/fcm-example-6dbdc-firebase-adminsdk-fgc39-b3dddeaff2.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://fcm-example-6dbdc.firebaseio.com"
});


// -------------------------------------------------------------------------------------------------------
var io = require('socket.io').listen(3030);

io.on('connection', function (socket) {
    console.log('android connect');

    //rasp room join - room1
    socket.on('joinRoom_rasp',function(data){
        var roomName1 = data;
        socket.join(roomName1);
        console.log("join_rasp");
    });

    //app room join - room2
    socket.on('joinRoom_app',function(data){
        var roomName2 = data;
        socket.join(roomName2);
        console.log("join_app");
    });

});

// -------------------------------------------------------------------------------------------------------

app.post('/user/join', function (req, res) {
    console.log(req.body);
    var userId = req.body.userId;
    var userPwd = req.body.userPwd;
    var userName = req.body.userName;
    var patient_id = req.body.patient_id;
    var userEmail = req.body.userEmail;
    var userPhone = req.body.userPhone;
    var userMac = req.body.userMac;
    var userToken=req.body.userToken;

    // 삽입을 수행하는 sql문.
    var sql = 'INSERT INTO Users VALUES (?,?,?,?,?,?,?,?)';
    var params = [userId, userPwd, userName, patient_id, userEmail, userPhone, userMac,userToken];

    // sql 문의 ?는 두번째 매개변수로 넘겨진 params의 값으로 치환된다.
    connection.query(sql, params, function (err, result) {
        var resultCode = 404;
        var message = 'join 에러가 발생했습니다';

        if (err) {
            console.log(err);
        } else {
            resultCode = 200;
            message = '회원가입에 성공했습니다.';
        }

        res.json({
            'code': resultCode,
            'message': message
        });
    });
});

app.post('/user/time', function (req, res) {
    console.log(req.body);
    var medName = req.body.medName;
    var patientname = req.body.patientname;
    var medTime = req.body.medTime;
    var patient_id=req.body.patient_id;
    var medNum = req.body.medNum;
    date = now_date;
    // 삽입을 수행하는 sql문.
    var sql = 'INSERT INTO TimeSettings (patientname,patient_id,medName,medTime,medNum,date) VALUES (?,?,?,?,?,?)';
    var params = [patientname, patient_id, medName, medTime, medNum, date];
    var socket_param = [medName, medTime, medNum];

    // sql 문의 ?는 두번째 매개변수로 넘겨진 params의 값으로 치환된다.
    connection.query(sql, params, function (err, result) {
        var resultCode = 404;
        var message = 'time 에러가 발생했습니다';
        console.log(medName+'time에서 받은 약이름');
        console.log(medName.length+"약이름 길이");

        if (err) {
            console.log(err);
        } else {
            resultCode = 200;
            message = '약 주기 등록에 성공했습니다.';
            io.sockets.in('room1').emit("insert_medicine",socket_param);

        }


        res.json({
            'code': resultCode,
            'message': message
        });
    });
});

// 삭제 
app.post('/user/delmeddata', function(req, res){
    var pos = req.body.pos;
    var medName;
    var message;
    var patientname = req.body.patientname;
    console.log(patientname+"!!!");
    var sql= 'select * from TimeSettings where patientname=?';
    var sqldel= 'delete from TimeSettings where medName=? and patientname=?';
    connection.query(sql, patientname, function (err, result) {
        var resultCode = 404;
        if (err) {
            console.log(err);
        } else {
            if (result.length === 0) {
                resultCode = 204;
            } else {
                resultCode = 200;
                medName = result[pos].medName;
                medTime = result[pos].medTime;
                
                var param = [medName, patientname];
                var socket_param1 = medName;


                connection.query(sqldel, param, function(err, result){
                    console.log('삭제 완료'+medName+patientname);
                    message = "삭제 완료"
                })

                io.sockets.in('room1').emit("delete_medicine",socket_param1);

                }
            
            }

        
        res.json({
            'code': resultCode,
            'message':message
        });
   })
});

// 같은 약 있으면 삭제하고 삽입 
app.post('/user/mednamecheck', function (req, res) {
    console.log(req.body);
    var medName = req.body.medName;
    var medTime = req.body.medTime;
    var patientName = req.body.patientName;
    var patient_id =req.body.patient_id;
    date = now_date;
    // 삽입을 수행하는 sql문.
    var sql= 'select * from TimeSettings where medName=? and patientName=?';
    var sqldel= 'delete from TimeSettings where medName=? and patientName=?';
    var sqlinsert= 'INSERT INTO Alltimelists (medName,medTime,patientname,date,patient_id) VALUES (?,?,?,?,?)';
    var params = [medName, medTime, patientName, date, patient_id];
    var params1 =[medName, patientName];
    var params2 = [medName, medTime]

   // sql 문의 ?는 두번째 매개변수로 넘겨진 params의 값으로 치환된다.
    connection.query(sqlinsert,params,function (err, result){
        console.log('삽입성공')
        connection.query(sql, params1, function (err, result) {
            var resultCode = 404;
            var message = 'medtimecheck 에러가 발생했습니다';
            console.log('찾기'+patientName+medName);
            if (result.length===0) {
                resultCode = 200;
                message = '성공'
            } else if(req.body.medName === result[0].medName) {
                resultCode = 100;
                message = '동일한 약 이름이 있습니다.';
                connection.query(sqldel, params1, function (err, result){
                    console.log('삭제 완료');
                });

            } 
            console.log(req.body.medName+'check 후 약이름');

            res.json({
                'code': resultCode,
                'message': message,
                'medName': req.body.medName,
                'medTime' : req.body.medTime
            });
        });

    });
});



app.post('/user/gettime', function (req, res) {
    var medNameApp =[];
    var medTimeApp =[];
    var medNumApp =[];
    var patientname = req.body.patientname;
    var sql = 'select * from TimeSettings where patientname=?';

    connection.query(sql, patientname, function (err, result) {
        var resultCode = 404;
        console.log(patientname+"!@!#!@#!");
        if (err) {
            console.log(err);
        } else {
            if (result.length === 0) {
                resultCode = 204;
            } else {
                resultCode = 200;
                for(i=0; i<result.length; i++){
                    medNameApp[i] = result[i].medName;
                    medTimeApp[i] = result[i].medTime;
                    medNumApp[i] = result[i].medNum;
                    console.log(medNameApp[i]);
                    console.log(medTimeApp[i]);
                    console.log(medNum[i])
                    console.log(i);
                    console.log(result.length);
                }
            }

        }

        res.json({
            'code': resultCode,
            'length':result.length,
            'medNameApp': medNameApp,
            'medTimeApp' : medTimeApp,
            'medNumApp' : medNumApp
        });
    })
});
// 게시판 가져오기
app.post('/user/getboard', function (req, res) {
    console.log('getboard로 왔다');
    var patient_id = req.body.patient_id;
    var sql = 'select * from Boards where patient_id = ?';
    var contents = '게시판입니다';
    console.log('받은 아이디'+patient_id);
    connection.query(sql, patient_id, function (err, result) {
        var resultCode = 404;
        var message = '에러가 발생했습니다';

        if (err) {
            console.log(err);
        } else {
            if (result.length === 0) {
                resultCode = 204;
            }else{
            resultCode = 200;
            contents = result[result.length-1].contents;
            message = '게시판 등록';
        }
    }

        res.json({
            'code': resultCode,
            'message': message,
            'contents' : contents,
        });
    })
});

app.post('/user/login', function (req, res) {
    var userId = req.body.userId;
    var patient_id;
    var userPwd = req.body.userPwd;
    var sql = 'select * from Users where UserId = ?';

    connection.query(sql, userId, function (err, result) {
        var resultCode = 404;
        var message = 'login 에러가 발생했습니다';

        if (err) {
            console.log(err);
        } else {
            if (result.length === 0) {
                resultCode = 204;
                message = '존재하지 않는 계정입니다!';
            } else if (userPwd !== result[0].UserPwd) {
                resultCode = 204;
                message = '비밀번호가 틀렸습니다!';
            } else {
                resultCode = 200;
                patient_id = result[0].patient_id;
                message = '로그인 성공! ' + result[0].UserName + '님 환영합니다!';
            }
        }

        res.json({
            'patient_id':patient_id,
            'code': resultCode,
            'message': message,
            'userid' : result[0].UserName
        });
    })
});
app.post('/push',function(request,response)
{
  var mac=request.body.msg
  var registrationToken
  var sql='select * from Users where UserMac = ?'
  connection.query(sql,mac,function(err,results)
  {
    var message='에러가 발생했습니다.'
    if(err)
    {
      console.log(err)
    }
    else{
      if(results.length!=0)
      {
        console.log('이상')

       registrationToken=results[0].UserToken
       console.log(registrationToken)
       var payload={
        data:{
        channel:"10",  
        title:"긴급",
        body:"로봇이 호출되었습니다."
        },
        token:registrationToken
      }
      admin.messaging().send(payload)
      .then(function(response){
        console.log("Successfully sent message:",response)
      })
      .catch(function(error){
      
      console.log("Error sending message",error)
      })
      }
    }
  })
  console.log(mac)
  response.send('ㅋㅋ')
})
app.post('/update',function(request,response){

    var mac=request.body.msg
    var medname=request.body.medicname
    var sql='select * from Users where UserMac = ?'
    var patientid
    var username
    connection.query(sql,mac,function(err,results)
    {
      if(err)
      {
        console.log(err)
      }
      else{
        if(results.length!=0)
        {
          var sql2='insert into MedicRecords (PatientName,Patient_Id,MedicName,TakingTime) values(?,?,?,?)'
          username=results[0].UserName
          patientid=results[0].patient_id
          var date=moment().format('YYYY-MM-DD HH:mm')
          var params=[username,patientid,medname,date]
          connection.query(sql2,params,function(err,result)
          {
            var message='에러가 발생했습니다.'
            if(err)
            {
             console.log(err)
            }
          })
        }
      }
    })
    response.send('ㅋㅋ')
  })
  //복용 약 데이터 가져오기
app.post('/user/getmedtakentime', function (req, res) {
    var medNameApp =[];
    var medTimeApp =[];
    var senddate = req.body.senddate;
    var patient_id = req.body.patient_id;
    console.log(senddate+'받은날짜');
    var params =[senddate, patient_id];
    var sql = 'select * from MedicRecords where TakingTime like ? and patient_id = ?';
    
    connection.query(sql, params, function (err, result) {
        var resultCode = 404;
        if (err) {
            console.log(err);
        } else {
            if (result.length === 0) {
                resultCode = 204;
            } else {
                resultCode = 200;
                for(i=0; i<result.length; i++){
                    medNameApp[i] = result[i].MedicName;
                    medTimeApp[i] = result[i].TakingTime;
                    console.log("약이름"+medNameApp[i]);
                    console.log("약복용시간"+medTimeApp[i]);
                    console.log(i);
                    console.log(result.length);
                }
            }

        }

        res.json({
            'code': resultCode,
            'length':result.length,
            'medNameApp': medNameApp,
            'medTimeApp' : medTimeApp
        });
    })
});

app.post('/fail',function(request,response)
{
  var mac=request.body.msg
  var medname=request.body.medicname
  var registrationToken
  var sql='select * from Users where UserMac = ?'
  connection.query(sql,mac,function(err,results)
  {
    var message='에러가 발생했습니다.'
    if(err)
    {
      console.log(err)
    }
    else{
      if(results.length!=0)
      {
        console.log('이상')

       registrationToken=results[0].UserToken
       console.log(registrationToken)
       var payload={
        data:{
        channel:"10",  
        title:"환자 약복용 정보 알림",
        body:"환자분께서 "+medname+" 복용을 하지 않았습니다."
        },
        token:registrationToken
      }
      admin.messaging().send(payload)
      .then(function(response){
        console.log("Successfully sent message:",response)
      })
      .catch(function(error){
      
      console.log("Error sending message",error)
      })
      }
    }
  })
  console.log(mac)
  response.send('')
})

