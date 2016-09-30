# serverless-screenshot
Serverless Screenshot Service

This will setup a screenshot api which will take a screenshot from a given url, and push it into an S3 bucket. This is all done with Lambda calls. After the screenshot is created, another lambda function creates thumbnails from the given screenshot.

The screenshotting is done with PhantomJS (which is precompiled in this project), and the resizing is done with ImageMagick (which is available by default in Lambda).

Quick installation 🚀
====================
If you just want to launch the service yourself, you can use this magic button which will setup everything for you in your AWS account through the magic of CloudFormation:

[![Launch Awesomeness](https://s3.amazonaws.com/cloudformation-examples/cloudformation-launch-stack.png)](https://console.aws.amazon.com/cloudformation/home?region=eu-west-1#/stacks/new?stackName=serverless-screenshot-service&templateURL=https://s3-eu-west-1.amazonaws.com/serverless-screenshots-service/2016-09-23T12%3A50%3A03/template.yml)

# Examples
[![https://www.youtube.com/](https://github.com/svdgraaf/serverless-screenshot/raw/master/docs/youtube-320x240.png)](https://github.com/svdgraaf/serverless-screenshot/raw/master/docs/youtube.png){: .img-responsive .col-md-3 .img-thumbnail }
[![http://www.apple.com/](https://github.com/svdgraaf/serverless-screenshot/raw/master/docs/apple-320x240.png)](https://github.com/svdgraaf/serverless-screenshot/raw/master/docs/apple.png){: .img-responsive .col-md-3 .img-thumbnail }
[![https://www.reddit.com/](https://github.com/svdgraaf/serverless-screenshot/raw/master/docs/reddit-320x240.png)](https://github.com/svdgraaf/serverless-screenshot/raw/master/docs/reddit.png){: .img-responsive .col-md-3 .img-thumbnail }
[![http://www.bbc.com/](https://github.com/svdgraaf/serverless-screenshot/raw/master/docs/bbc-320x240.png)](https://github.com/svdgraaf/serverless-screenshot/raw/master/docs/bbc.png){: .img-responsive .col-md-3 .img-thumbnail }

## Architecture
![architecture](https://github.com/svdgraaf/serverless-screenshot/blob/master/docs/architecture.png?raw=true)

The stack setsup 3 lambda functions, two (POST/GET) can be called via ApiGateway. The third is triggered whenever a file is uploaded into the S3 bucket. The user can request the screenshots through CloudFront.

# Setup
Just install all requirements with npm:

```bash
npm install
```

# Installation
This project uses Serverless for setting up the service. Check the `serverless.yml` for the bucket name, and change it to whatever you want to call it. You can then deploy the stack with:

```bash
sls deploy -s dev
# ...
# endpoints:
#   POST - https://123j6pi123.execute-api.us-east-1.amazonaws.com/dev/screenshots
#   GET - https://123j6pi123.execute-api.us-east-1.amazonaws.com/dev/screenshots
```

After this, you should have a CloudFormation stack up and running. All endpoints are protected with an x-api-token key, which you should provide, and you can find it in the ApiGateway console.

# Usage

## Create screenshot
If you post a url to the /screenshots/ endpoint, it will create a screenshot for you, in the example above:

```bash
curl -X POST "https://123j6pi123.execute-api.us-east-1.amazonaws.com/dev/screenshots?url=http://google.com/" -H "x-api-key: [your-api-key]"
```

## List available screenshot sizes
After creating a screenshot, you can see all the available sizes with a GET:
```bash
curl -X GET "https://123j6pi123.execute-api.us-east-1.amazonaws.com/dev/screenshots?url=http://google.com/" -H "x-api-key: [your-api-key]"
{
	"100": "https://s3.amazonaws.com/dev-123456-screenshots/6ab016b2dad7ba49a992ba0213a91cf8/100.png",
	"200": "https://s3.amazonaws.com/dev-123456-screenshots/6ab016b2dad7ba49a992ba0213a91cf8/200.png",
	"320": "https://s3.amazonaws.com/dev-123456-screenshots/6ab016b2dad7ba49a992ba0213a91cf8/320.png",
	"400": "https://s3.amazonaws.com/dev-123456-screenshots/6ab016b2dad7ba49a992ba0213a91cf8/400.png",
	"640": "https://s3.amazonaws.com/dev-123456-screenshots/6ab016b2dad7ba49a992ba0213a91cf8/640.png",
	"800": "https://s3.amazonaws.com/dev-123456-screenshots/6ab016b2dad7ba49a992ba0213a91cf8/800.png",
	"1024": "https://s3.amazonaws.com/dev-123456-screenshots/6ab016b2dad7ba49a992ba0213a91cf8/1024.png",
	"1024x768": "https://s3.amazonaws.com/dev-123456-screenshots/6ab016b2dad7ba49a992ba0213a91cf8/1024x768.png",
	"320x240": "https://s3.amazonaws.com/dev-123456-screenshots/6ab016b2dad7ba49a992ba0213a91cf8/320x240.png",
	"640x480": "https://s3.amazonaws.com/dev-123456-screenshots/6ab016b2dad7ba49a992ba0213a91cf8/640x480.png",
	"800x600": "https://s3.amazonaws.com/dev-123456-screenshots/6ab016b2dad7ba49a992ba0213a91cf8/800x600.png",
	"original": "https://s3.amazonaws.com/dev-123456-screenshots/6ab016b2dad7ba49a992ba0213a91cf8/original.png"
}
```

# Caveats
* This service uses the awesome PhantomJS service to capture the screenshots, which is compiled on the Lambda service. There probably will be issues with fonts of some sorts.
* The default timeout for PhantomJS is set to 3 seconds, if the page takes longer to load, this will result in b0rked screenshots (ofcourse). You can change the timeout in handler.js (a PR with custom timeout is greatly appreciated)
* Currently, when the thumbnailer fails, it will fail silently, and will result in missing thumbnails. Could be anything really, memory, timeout, etc. PR's to fix this are welcome :) Easiest fix: just setup the Lambda function to allow for more memory usage.
