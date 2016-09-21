'use strict';
require('dotenv').config();
var util = require('util');
var exec = require('child_process').exec;
var crypto = require('crypto');
var fs = require('fs');
var url = require('url');
var AWS = require('aws-sdk');
var validUrl = require('valid-url');


// screenshot the given url
module.exports.take_screenshot = (event, context, cb) => {
  const target_url = event['query']['url']

  // check if the given url is valid
  if(!validUrl.isUri(target_url)) {
    cb(`422, please provide a valid url, not: ${target_url}`);
    return false;
  }

  const target_hostname = url.parse(target_url).hostname;
  const target_bucket = process.env.BUCKET_NAME;
  const target_hash = crypto.createHash('md5').update(target_url).digest("hex");
  const target_filename = `${target_hash}/${target_hostname}/original-${target_hash}.png`
  const width = 1280;
  const width = 1024;
  console.log(`Snapshotting ${target_url} to s3://${target_bucket}/${target_filename}`);

  // build the cmd for phantom to render the url
  const cmd =`./phantomjs/phantomjs_linux-x86_64 --debug=yes --ignore-ssl-errors=true ./phantomjs/screenshot.js ${target_url} /tmp/${target_hash}.png ${width} ${height}`;
  // const cmd =`./phantomjs/phantomjs_osx --debug=yes --ignore-ssl-errors=true ./phantomjs/screenshot.js ${target_url} /tmp/${target_hash}.png 1280 1024`;
  console.log(cmd);

  // run the phantomjs command
  exec(cmd, function (error, stdout, stderr) {
    if (error !== null) {
      // the command failed (non-zero), fail
      cb('422, please try again' + error);
      console.log('exec error: ' + error, stdout, stderr);
      return false;
    } else {
      // snapshotting succeeded, let's upload to S3

      // read the file into buffer (perhaps make this async?)
      var fileBuffer = fs.readFileSync(`/tmp/${target_hash}.png`);

      // upload the file
      var s3 = new AWS.S3();
      s3.putObject({
          ACL: 'public-read',
          Key: target_filename,
          Body: fileBuffer,
          Bucket: target_bucket,
          ContentType: 'image/png'
      }, function(err, data){
        if(err) {
          cb(err);
          return false;
        } else {
          cb(null, { hash: target_hash, url: `s3://${target_bucket}/${target_filename}`, stdout: stdout, stderr: stderr});
          return true;
        }
      });
    }
  });
};


module.exports.list_screenshots = (event, context, cb) => {
  const target_url = event['query']['url']

  // check if the given url is valid
  if(!validUrl.isUri(target_url)) {
    cb(`422, please provide a valid url, not: ${target_url}`);
    return false;
  }

  const target_hostname = url.parse(target_url).hostname;
  const target_hash = crypto.createHash('md5').update(target_url).digest("hex");
  const target_bucket = process.env.BUCKET_NAME;
  const target_path = `${target_hash}/${target_hostname}/`

  var s3 = new AWS.S3();
  s3.listObjects({
    Bucket: target_bucket,
    Prefix: target_path,
    EncodingType: 'url',
  }, function(err, data) {
    if(err){
      cb(err);
      return false;
    } else {
      var urls = {};
      data.Contents.forEach(function(content){
        var parts = content.Key.split('/')
        var size = parts[parts.length - 1].split('-')[0]
        urls[size] = `https://s3.amazonaws.com/${target_bucket}/${content.Key}`
      })
      console.log(urls);
    }
  })

}
