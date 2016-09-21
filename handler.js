'use strict';
require('dotenv').config();
var util = require('util');
var exec = require('child_process').exec;
var crypto = require('crypto');
var fs = require('fs');
var url = require('url');
var AWS = require('aws-sdk');
var validUrl = require('valid-url');

// overall constants
const screen_width = 1280;
const screen_height = 1024;
const timeout = 3000;

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
  const target_filename = `${target_hash}/original.png`
  console.log(`Snapshotting ${target_url} to s3://${target_bucket}/${target_filename}`);

  // build the cmd for phantom to render the url
  const cmd =`./phantomjs/phantomjs_linux-x86_64 --debug=yes --ignore-ssl-errors=true ./phantomjs/screenshot.js ${target_url} /tmp/${target_hash}.png ${screen_width} ${screen_height} ${timeout}`;
  // const cmd =`./phantomjs/phantomjs_osx          --debug=yes --ignore-ssl-errors=true ./phantomjs/screenshot.js ${target_url} /tmp/${target_hash}.png ${screen_width} ${screen_height} ${timeout}`;
  console.log(cmd);

  // run the phantomjs command
  exec(cmd, function (error, stdout, stderr) {
    if (error) {
      // the command failed (non-zero), fail the entire call
      console.warn('exec error: ' + error, stdout, stderr);
      cb('422, please try again' + error);
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
          console.warn(err);
          cb(err);
          return false;
        } else {
          // console.info(stderr);
          // console.info(stdout);
          cb(null, { hash: target_hash, key: `${target_filename}`, bucket:target_bucket, url:`https://s3.amazonaws.com/${target_bucket}/${target_filename}`});
          return true;
        }
      });
    }
  });
};


// gives a list of urls for the given snapshotted url
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
  const target_path = `${target_hash}/`

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
      // for each key, get the image width and add it to the output object
      data.Contents.forEach(function(content){
        var parts = content.Key.split('/')
        var size = parts.pop().split('.')[0]
        urls[size] = `https://s3.amazonaws.com/${target_bucket}/${content.Key}`
      })
      cb(null, urls);
    }
  })

}


module.exports.create_thumbnails = (event, context, cb) => {
  const widths = {
    '320x240': `-crop ${screen_width}x${screen_height}+0x0 -thumbnail 320x240`,
    '640x480': `-crop ${screen_width}x${screen_height}+0x0 -thumbnail 640x480`,
    '800x600': `-crop ${screen_width}x${screen_height}+0x0 -thumbnail 800x600`,
    '1024x768': `-crop ${screen_width}x${screen_height}+0x0 -thumbnail 1024x768`,
    '100': '-thumbnail 100x',
    '200': '-thumbnail 200x',
    '320': '-thumbnail 320x',
    '400': '-thumbnail 400x',
    '640': '-thumbnail 640x',
    '800': '-thumbnail 800x',
    '1024': '-thumbnail 1024x',
  }
  const record = event.Records[0];

  // we only want to deal with originals
  if(record.s3.object.key.indexOf('original.png') === -1) {
    console.warn('Not an original, skipping');
    cb('Not an original, skipping');
    return false;
  }

  // get the prefix, and get the hash
  var prefix = record.s3.object.key.split('/')[0];
  const hash = prefix;

  // download the original to disk
  var s3 = new AWS.S3();
  const source_path = '/tmp/original.png';
  var target_stream = fs.createWriteStream(source_path);
  var fileStream = s3.getObject({
    Bucket: record.s3.bucket.name,
    Key: record.s3.object.key
  }).createReadStream();
  fileStream.pipe(target_stream);

  // when file is downloaded, start processing
  fileStream.on('end', function () {

    // resize to every configured size
    Object.keys(widths).forEach(function(size){
      var cmd = `convert ${widths[size]} ${source_path} /tmp/${hash}-${size}.png`;
      console.log('Running ', cmd)

      exec(cmd, function (error, stdout, stderr) {
        if (error) {
          // the command failed (non-zero), fail
          console.warn('exec error: ' + error, stdout, stderr);
          // continue
        } else {
          // resize was succesfull, upload the file
          console.info(`Resize to ${size} OK`);
          var fileBuffer = fs.readFileSync(`/tmp/${hash}-${size}.png`);
          s3.putObject({
              ACL: 'public-read',
              Key: `${prefix}/${size}.png`,
              Body: fileBuffer,
              Bucket: record.s3.bucket.name,
              ContentType: 'image/png'
          }, function(err, data){
            if(err) {
              console.warn(err);
            } else {
              console.info(`${size} uploaded`)
            }
          });
        }
      })
    });
  });

}
