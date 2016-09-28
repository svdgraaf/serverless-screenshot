var path = require('path');
var fs = require('fs');

var handler = require( path.resolve( __dirname, "./handler.js" ) );
// var input = JSON.parse(fs.readFileSync('events/put_object.json', 'utf8'));
var input = JSON.parse(fs.readFileSync('events/create.json', 'utf8'));

var callback = function(err, data ) {
  if(err) {
    console.warn(data);
  } else {
    console.log(data);
  }
};

// handler.create_thumbnails(input, null, callback);
handler.take_screenshot(input, null, callback);
// handler.list_screenshots(input, null, callback);
