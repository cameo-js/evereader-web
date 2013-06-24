
/*
 * GET home page.
 */

exports.index = function(req, res){
  res.render('index', {
  	title: 'Evereader'
  });
};

exports.about = function(req, res){
  res.render('about', {
  	title: 'Evereader'
  });
};

exports.contact = function(req, res){
  res.render('contact', {
  	title: 'Evereader'
  });
};