var express = require('express');
var app = express();
var server =require('http').createServer(app);
var mysql=require('mysql');
var io=require('socket.io').listen(server);
//$db = mysqli_connect('localhost', 'root', '', 'registration');
users= [];
var connection2 = mysql.createConnection({
        host: 'localhost',
        user: 'root',
        password: "root",
        database: 'registration'
});
connection2.connect();
connections =[];
var waitingQueue = [];
var tableCount=1;
server.listen(2001);
console.log('server is running');
bodyParser = require('body-parser');


// `use` it in your express app
app.use(bodyParser.urlencoded({ extended: true}));

app.get('/',function(req,res){
	res.sendFile(__dirname + '/login.html');
});

app.get("/login", function (req, res) {
res.sendFile(__dirname + "/login.html");
}); 

app.get("/index", function (req, res) {
res.sendFile(__dirname + "/index.html");
}); 

app.get("/register", function (req, res) {
res.sendFile(__dirname + "/register.html");
});
var username;
app.get("/username", function (req, res) {
res.send(username);
});

app.post("/login", function (req, res) {
//res.sendFile(__dirname + "/login.html");
username = req.body.username;
var password = req.body.password;
var query = "SELECT * FROM player WHERE username='"+username+"' AND password='"+password+"'";
var numrows;
var results;
connection2.query(query, function(err,results) {
	console.log(results.length+"&");
    numrows = results.length;
    if(numrows==1)
{
	console.log("ur successful");
	res.redirect('/index');

}
});
//console.log(numrows+"%");

console.log(query);
//console.log(results);
//console.log(req.body.password);
});
app.post("/register", function (req, res) {
res.sendFile(__dirname + "/register.html");
 var username = req.body.username;
  var email = req.body.email;
  var password = req.body.password_1;
  var password_2 = req.body.password_2;
   var query = "INSERT INTO player (username, email, password) VALUES('"+username+"', '"+email+"', '"+password+"')";
   console.log(query);
  	connection2.query(query);
  	 var query = "INSERT INTO multiplayerrecords (username) VALUES('"+username+"')";
  	 connection2.query(query);
});

setInterval(function () {
    if (waitingQueue.length < 2)
        return;

    var index = Math.floor(Math.random() * waitingQueue.length);
    var playerX = waitingQueue[index];
    waitingQueue.splice(index, 1);

    index = Math.floor(Math.random() * waitingQueue.length);
    var playerO = waitingQueue[index];
    waitingQueue.splice(index, 1);
     
    var tablename = "Table" + tableCount++;
    playerX.join(tablename);
    playerO.join(tablename);
    cturn=1;
    console.log('paired'+tablename+") "+cturn);

    if (playerX.username == playerO.username) {
    	console.log("its same name");
        playerO.username += "1";
        console.log(playerO.username);
        playerO.emit('renamed', playerO.username);
    }

    io.sockets.in(tablename).emit('join table',{tablename,p1:playerX.username,p2:playerO.username,cturn});
}, 2000);

io.sockets.on('connection',function(socket){
	connections.push(socket);
	console.log('connected : %s sockets connected',connections.length);

	//disconnect
	socket.on('disconnect',function(data){
		
		users.splice(users.indexOf(socket.username),1);
		updateUsernames();
		connections.splice(connections.indexOf(socket),1);
	console.log('disconnected : %s sockets connected',connections.length);
	});
	//send message
	
		
		socket.on('send message',function(data){
		console.log(data.tablename+" "+socket.username);
		io.sockets.in(data.tablename).emit('new message',{msg: data.val ,user : socket.username});
	});
	

	socket.on('new user',function(data,callback)
	{
       callback(true);
        socket.username =data;
         waitingQueue.push(socket);
         console.log("pushed lala");
        users.push(socket.username);
        updateUsernames();
	});
	socket.on('make a move',function(data)
	{
		console.log(data.id+" "+data.turn+" "+data.playername+"@");
       io.sockets.in(data.tablename).emit('new move',{id: data.id ,turn :data.turn,playername:data.playername});
	});
	socket.on('start again',function(data)
	{
		console.log('answer me'+data.tablename);
      io.sockets.in(data.tablename).emit('pok',{tablename:data.tablename});
	});
	
	socket.on('leave game',function(data)
	{
		console.log('answer me'+data.tablename);
      io.sockets.in(data.tablename).emit('leave the game',{tablename:data.tablename});
	});
	socket.on('new record',function(data)
	{
		var lastrecord;
		var currentwinningstreak,currentlosingstreak,currentdrawingstreak;
		var maxwinningstreak,maxlosingstreak,maxdrawingstreak;
		var query2;
		var query = "SELECT * FROM multiplayerrecords WHERE username='"+data.user+"'";
        connection2.query(query, function(err,results) {
        lastrecord=results[0]['lastrecord'];
        currentwinningstreak=results[0]['cur_winning_streak'];
        currentlosingstreak=results[0]['cur_losing_streak'];
        currentdrawingstreak=results[0]['cur_drawing_streak'];
        maxwinningstreak=results[0]['max_winning_streak'];
        maxlosingstreak=results[0]['max_losing_streak'];
        maxdrawingstreak=results[0]['max_drawing_streak'];
        console.log(results[0]);
        console.log(results[0]['cur_winning_streak']);
        console.log(currentwinningstreak+" $$");
	    console.log(results[0]['no_of_wins']);
	    if(data.msg=="you win")
		{
            var query="UPDATE multiplayerrecords SET  no_of_wins=no_of_wins+1 WHERE username='"+data.user+"'";
            if(lastrecord==1||lastrecord==-1)
            	{
            		currentwinningstreak+=1;
            	 lastrecord=1;
            	 
            	}
            else
             {
             	
           	   currentwinningstreak=1;
           	   lastrecord=1;
           	 
             }
             if(currentwinningstreak>maxwinningstreak)
            	 	maxwinningstreak=currentwinningstreak;
         
             var query2="UPDATE multiplayerrecords SET  cur_winning_streak="+currentwinningstreak+",max_winning_streak="+maxwinningstreak+",lastrecord="+lastrecord+" WHERE username='"+data.user+"'";
                
		}
		else if(data.msg=="you lose")
		{
            var query="UPDATE multiplayerrecords SET  no_of_loses=no_of_loses+1 WHERE username='"+data.user+"'";
            if(lastrecord==0||lastrecord==-1)
            	{
            		currentlosingstreak+=1;
            	 lastrecord=0;
            	 
            	}
            else
             { 
           	   currentlosingstreak=1;
           	   lastrecord=0;
           	   
             }
             if(currentlosingstreak>maxlosingstreak)
            	 	maxlosingstreak=currentlosingstreak;
            	 
             var query2="UPDATE multiplayerrecords SET  cur_losing_streak="+currentlosingstreak+",max_losing_streak="+maxlosingstreak+",lastrecord="+lastrecord+" WHERE username='"+data.user+"'";
		}
		else if(data.msg=="draw")
		{
			var query="UPDATE multiplayerrecords SET  no_of_draws=no_of_draws+1 WHERE username='"+data.user+"'";
			 if(lastrecord==3||lastrecord==-1)
            	{currentdrawingstreak+=1;
            	 lastrecord=3;
            	}
            else
             {
           	   currentwdrawingstreak=1;
           	   lastrecord=3;
             }
             if(currentdrawingstreak>maxdrawingstreak)
            	 	maxdrawingstreak=currentdrawingstreak;
             var query2="UPDATE multiplayerrecords SET  cur_losing_streak="+currentdrawingstreak+",max_losing_streak="+maxdrawingstreak+",lastrecord="+lastrecord+" WHERE username='"+data.user+"'";
		}
		 console.log(query);
        console.log(query2);
         
		connection2.query(query);
		connection2.query(query2);	
	    });
		
       
     
	});
	function updateUsernames()
	{
		io.sockets.emit('get users',users);
	}
	});
	

