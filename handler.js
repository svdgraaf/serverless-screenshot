const exec = require('child_process').exec;
const crypto = require('crypto');
const fs = require('fs');
const AWS = require('aws-sdk');
const validUrl = require('valid-url');

// overall constants
const screenWidth = 1280;
const screenHeight = 1024;

// screenshot the given url
module.exports.take_screenshot = (event, context, cb) => {
  const targetUrl = event.query.url;
  const timeout = event.stageVariables.screenshotTimeout;

  // check if the given url is valid
  if (!validUrl.isUri(targetUrl)) {
    cb(`422, please provide a valid url, not: ${targetUrl}`);
    return false;
  }

  const targetBucket = event.stageVariables.bucketName;
  const targetHash = crypto.createHash('md5').update(targetUrl).digest('hex');
  const targetFilename = `${targetHash}/original.png`;
  console.log(`Snapshotting ${targetUrl} to s3://${targetBucket}/${targetFilename}`);

  // build the cmd for phantom to render the url
  const cmd = `./phantomjs/phantomjs_linux-x86_64 --debug=yes --ignore-ssl-errors=true ./phantomjs/screenshot.js ${targetUrl} /tmp/${targetHash}.png ${screenWidth} ${screenHeight} ${timeout}`; // eslint-disable-line max-len
  // const cmd =`./phantomjs/phantomjs_osx          --debug=yes --ignore-ssl-errors=true ./phantomjs/screenshot.js ${targetUrl} /tmp/${targetHash}.png ${screenWidth} ${screenHeight} ${timeout}`;
  console.log(cmd);

  // run the phantomjs command
  exec(cmd, (error, stdout, stderr) => {
    if (error) {
      // the command failed (non-zero), fail the entire call
      console.warn(`exec error: ${error}`, stdout, stderr);
      cb(`422, please try again ${error}`);
    } else {
      // snapshotting succeeded, let's upload to S3
      // read the file into buffer (perhaps make this async?)
      const fileBuffer = fs.readFileSync(`/tmp/${targetHash}.png`);

      // upload the file
      const s3 = new AWS.S3();
      s3.putObject({
        ACL: 'public-read',
        Key: targetFilename,
        Body: fileBuffer,
        Bucket: targetBucket,
        ContentType: 'image/png',
      }, (err) => {
        if (err) {
          console.warn(err);
          cb(err);
        } else {
          // console.info(stderr);
          // console.info(stdout);
          cb(null, {
            hash: targetHash,
            key: `${targetFilename}`,
            bucket: targetBucket,
            url: `https://s3.amazonaws.com/${targetBucket}/${targetFilename}`,
          });
        }
        return;
      });
    }
  });
};


// gives a list of urls for the given snapshotted url
module.exports.list_screenshots = (event, context, cb) => {
  const targetUrl = event.query.url;

  // check if the given url is valid
  if (!validUrl.isUri(targetUrl)) {
    cb(`422, please provide a valid url, not: ${targetUrl}`);
    return false;
  }

  const targetHash = crypto.createHash('md5').update(targetUrl).digest('hex');
  const targetBucket = event.stageVariables.bucketName;
  const targetPath = `${targetHash}/`;

  const s3 = new AWS.S3();
  s3.listObjects({
    Bucket: targetBucket,
    Prefix: targetPath,
    EncodingType: 'url',
  }, (err, data) => {
    if (err) {
      cb(err);
    } else {
      const urls = {};
      // for each key, get the image width and add it to the output object
      data.Contents.forEach((content) => {
        const parts = content.Key.split('/');
        const size = parts.pop().split('.')[0];
        urls[size] = `https://s3.amazonaws.com/${targetBucket}/${content.Key}`;
      });
      cb(null, urls);
    }
    return;
  });
};

module.exports.create_thumbnails = (event, context, cb) => {
  // define all the thumbnails that we want
  const widths = {
    '320x240': `-crop ${screenWidth}x${screenHeight}+0x0 -thumbnail 320x240`,
    '640x480': `-crop ${screenWidth}x${screenHeight}+0x0 -thumbnail 640x480`,
    '800x600': `-crop ${screenWidth}x${screenHeight}+0x0 -thumbnail 800x600`,
    '1024x768': `-crop ${screenWidth}x${screenHeight}+0x0 -thumbnail 1024x768`,
    100: '-thumbnail 100x',
    200: '-thumbnail 200x',
    320: '-thumbnail 320x',
    400: '-thumbnail 400x',
    640: '-thumbnail 640x',
    800: '-thumbnail 800x',
    1024: '-thumbnail 1024x',
  };
  const record = event.Records[0];

  // we only want to deal with originals
  if (record.s3.object.key.indexOf('original.png') === -1) {
    console.warn('Not an original, skipping');
    cb('Not an original, skipping');
    return false;
  }

  // get the prefix, and get the hash
  const prefix = record.s3.object.key.split('/')[0];
  const hash = prefix;

  // download the original to disk
  const s3 = new AWS.S3();
  const sourcePath = '/tmp/original.png';
  const targetStream = fs.createWriteStream(sourcePath);
  const fileStream = s3.getObject({
    Bucket: record.s3.bucket.name,
    Key: record.s3.object.key,
  }).createReadStream();
  fileStream.pipe(targetStream);

  // when file is downloaded, start processing
  fileStream.on('end', () => {
    // resize to every configured size
    Object.keys(widths).forEach((size) => {
      const cmd = `convert ${widths[size]} ${sourcePath} /tmp/${hash}-${size}.png`;
      console.log('Running ', cmd);

      exec(cmd, (error, stdout, stderr) => {
        if (error) {
          // the command failed (non-zero), fail
          console.warn(`exec error: ${error}, stdout, stderr`);
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
};
