
/**
 * Module dependencies.
 */
global.config = require('./config.js');
global.db_config = require('./db_config.js');

var express = require('express')
  , routes = require('./routes')
  , http = require('http')
  , path = require('path')
  , userDao = require('./lib/userDao.js');

// Create an Evernote instance
var Evernote = require('evernode').Evernote;
var evernote = new Evernote(
		config.evernoteConsumerKey,
		config.evernoteConsumerSecret,
		config.evernoteUsedSandbox
		);

var app = express();

// all environments
app.set('port', process.env.PORT || 3000);
app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');
app.use(express.favicon());
app.use(express.logger('dev'));
app.use(express.bodyParser());
app.use(express.methodOverride());
app.use(express.cookieParser('your secret here'));
app.use(express.session());
app.use(app.router);
app.use(express.static(path.join(__dirname, 'public')));

// development only
if ('development' == app.get('env')) {
  app.use(express.errorHandler());
}

userDao.initDB(db_config.dbPath,db_config.db, db_config.userTablename);
/*userDao.insertUser("kjs8469","123123123");
userDao.insertUser("ephemera","456456456");
userDao.readAllUsers(function(err,rows){
	console.log(rows);
});
userDao.readUser("kjs8469",function(err,rows){
	console.log(rows);
});
*/

app.get('/', routes.index);
app.get('/home', routes.index);
app.get('/about', routes.about);
app.get('/contact', routes.contact);

http.createServer(app).listen(app.get('port'), function(){
  console.log('Express server listening on port ' + app.get('port'));
});

app.all('/authentication', function(req, res){

	var evernote_callback = config.serverUrl + '/authentication/callback';

  evernote.oAuth(evernote_callback).getOAuthRequestToken( function(error, oauthToken, oauthTokenSecret, results){

		if (error) return res.send("Error getting OAuth request token : " + error, 500);

    req.session.oauthRequestToken = oauthToken;
    res.redirect( evernote.oAuthRedirectUrl(oauthToken) );      
  });

});

app.all('/authentication/callback', function(req, res){
	var evernote_callback = config.serverUrl +'/evernote/authentication/callback';

  evernote.oAuth(evernote_callback).getOAuthAccessToken( req.session.oauthRequestToken, 
		req.session.oauthRequestTokenSecret, 
		req.query.oauth_verifier, 
		function(err, authToken, accessTokenSecret, results) {
			if (err) return res.send("Error getting accessToken : "+err, 500);

			evernote.getUser(authToken, function(err, edamUser) {
				if (err) return res.send("Error getting userInfo : "+err, 500);

				req.session.authToken = authToken;
				req.session.user = edamUser;

				var username = edamUser["username"];

				userDao.readUser(username,function(err,rows){
					if(rows.length == 0){
						userDao.insertUser(username,authToken);

						evernote.createNotebook(edamUser, {name:'test'}, function(err, tag) {
							console.log('tag',tag);
							console.log('err',err);
			  		});
					}
				});

				res.redirect('/');
			});
  });
});

