var page = require('webpage').create(),
    system = require('system'),
    url, output, width, height;

page.onResourceReceived = function(response) {
    // console.log(JSON.stringify(response, undefined, 4));
    if(response.id == 1 && response.status != 200){
        console.log('Received a non-200 OK response, got: ', response.status);
        phantom.exit(1);
    }
}

address = system.args[1];
output = system.args[2];
width = system.args[3];
height = system.args[4];

timeout = 3000;
console.log("Args: ", system.args);
console.log("Screenshotting: ", address, ", to: ", output);

page.viewportSize = { width: parseInt(width), height: parseInt(height) };
console.log("Viewport: ", JSON.stringify(page.viewportSize));

page.open(address, function (status) {
    if (status !== 'success') {
        console.log('Unable to load the address!');
        phantom.exit();
    } else {
        window.setTimeout(function () {
            page.render(output);
            phantom.exit();
        }, timeout);
    }
});
//
// var page = require('webpage').create();
// page.open('http://github.com/', function() {
//   page.render('github.png');
//   phantom.exit();
// });
