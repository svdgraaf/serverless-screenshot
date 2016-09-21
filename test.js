var path = require('path');
var fs = require('fs');

var handler = require( path.resolve( __dirname, "./handler.js" ) );
var input = JSON.parse(fs.readFileSync('event.json', 'utf8'));

var callback = function(data) {
  console.log('got data: '+data);
};

// handler.take_screenshot(input, null, callback);
handler.list_screenshots(input, null, callback);
