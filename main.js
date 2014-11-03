var express = require('express');
var app = express();
var nunjucks = require('nunjucks');
var bodyParser = require('body-parser');
var orm = require('orm');

// Connect to mysql. You'll want to replace this with relevant info for your setup
app.use(orm.express("mysql://clipasaurus:clippass@localhost/clipasaurus", {
	define: function (db, models, next) {

		models.clip = db.define("clip", {
			youtube_id: String,
			start: Number,
			stop: Number,
		});

		next();
		db.sync();
	}
}))

app.use(bodyParser.urlencoded());
app.use(bodyParser.json());

// Handle statics
app.use('/js',express.static(__dirname+'/static/js'));
app.use('/fonts',express.static(__dirname+'/static/fonts'));
app.use('/images',express.static(__dirname+'/static/images'));
app.use('/css',express.static(__dirname+'/static/css'));

app.get('/clip/*', function (req, res) {
	nunjucks.configure({ autoescape: true});
	var video_id;
	var urlParts = req.url.split('/');
	var thisClip = req.models.clip.get(urlParts[2], function (err, clip) {
		if (err) {
			res.send(404, 'Sorry, this clip does not exist.');
			return;
		}
		var response = nunjucks.render('templates/clip.html', { video_id: clip['youtube_id'], start: Math.ceil(clip['start']), stop: Math.ceil(clip['stop']) });
	  	res.send(response)
	});
})

// Save new clip info and redirect to permalink (In a serious production environment, you'd cache here)
app.post('/newclip', function (req, res) {
	var newRecord = {};
	newRecord.youtube_id = req.body.video_id
	newRecord.start = req.body.start
	newRecord.stop = req.body.stop
	req.models.clip.create(newRecord, function(err, results) {
		res.redirect('/clip/' + results['id'])
	});
})

// Index
app.get('/', function (req, res) {
  nunjucks.configure({ autoescape: true });
  var response = nunjucks.render('templates/index.html', { });
  res.send(response)
})

// Handle YouTube url/id post. Parsing should be much more comprehensive here, but for now I'm supporting
// regular urls like 'https://www.youtube.com/watch?v=nd7q1op4BVw' and id's like 'nd7q1op4BVw'
app.post('/', function (req, res) {
  var url = req.param('youtube_url');
  var video_id;
  if ( url.indexOf('v=') != -1 ) {
  	video_id = url.split('v=')[1];
  }
  else {
  	video_id = url;
  }
  var ampersandPosition = video_id.indexOf('&');
    if(ampersandPosition != -1) {
    	video_id = video_id.substring(0, ampersandPosition);
    }
  nunjucks.configure({ autoescape: true });
  var response = nunjucks.render('templates/index.post.html', { video_id: video_id });
  res.send(response);
})

var server = app.listen(3000, function () {

  var host = server.address().address
  var port = server.address().port

  console.log('Clipasaurus listening at http://%s:%s', host, port)

})