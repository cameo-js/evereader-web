
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
app.get('/welcome', routes.welcome);
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
					} else {
						userDao.updateUser(username,authToken,function(err,rows){

						});
					}
				});


				evernote.listTags(edamUser, function(err, tagList) {
					var existUrlNote = false;
					var guid_list = [];
					tagList.forEach(function(tag){
	  				if(tag.name=='evereader-url'){
	  					guid_list.push(tag.guid);
	  				}
	  			});

	  			evernote.listNotebooks(edamUser, function(err, notebookList) {
						var notebookGuid = "";
						notebookList.forEach(function(notebook_){
							if(notebook_.name == 'evereader'){
								notebookGuid = notebook_.guid;
							}
						});

						evernote.findNotes(edamUser,  'evereader-url', { tagGuids : guid_list }, function(err, noteList) {
		    			noteList.notes.forEach(function(note){
		    				if(note.notebookGuid == notebookGuid){
			  					existUrlNote = true;
		    				}
			  			});

		    			if(!existUrlNote){
		  					evernote.createNotebook(edamUser, {name:'evereader'}, function(err, notebook) {
									if(notebook!=undefined){
										notebookGuid = notebook.guid;
									}
									evernote.createNote(edamUser, { title: 'evereader-url', content: decorator('evereader-url', 'http://blog.evereader.io/rss'), notebookGuid : notebookGuid, tagNames : ['evereader-url']},function(err, note){
									});
		  					});
		  				}
		  			});
			    });
		 		});

				res.redirect('/');
			});
  });
});

function decorator(title, description) {

  var str = '<!DOCTYPE en-note SYSTEM "http://xml.evernote.com/pub/enml2.dtd">';
  str += '<en-note style="word-wrap: break-word; -webkit-nbsp-mode: space; -webkit-line-break: after-white-space;">';
  str += '<div><span style="font-size:large;"><strong>' + title + '</strong></span></div>';
  str += '<div><br clear="none"/></div>';
  str += '<div>' + description + '</div>';
  str += '<div><br clear="none"/></div>';
  str += get_logo();
  str += '</en-note>';

  return str;
}

function get_logo() {
    var str = '<div>';
    str += '<div style="background-color: #6bb130; background-image: url(http://24.media.tumblr.com/ec64d0fe2381e97deb8e84f200741e3f/tumb lr_m p959c1gJm1sqjjz7o1_1280.png) no-repeat center top; border-bottom: 1px solid #5f9e2b; padding: 20px; text-align:center; font-family: Times New Roman; font-size:20px; font-weight: bold;">';
    str += '<a style="text-decoration:none; color:#fff;" href="http://for.evereader.io">FOR.EVEREADER.IO</a></div>';
    str += '</div>';
    return str;
}

