# serverless-screenshot
Serverless Screenshot Service

This will setup a screenshot api which will take a screenshot from a given url, and push it into an S3 bucket. This is all done with Lambda calls. After the screenshot is created, another lambda function creates thumbnails from the given screenshot.

# Installation
Check the `serverless.yml` for the bucket name, and change it to whatever you want to call it.

```bash
npm install
sls deploy -s dev
# ...
# endpoints:
#   POST - https://123j6pi123.execute-api.us-east-1.amazonaws.com/dev/screenshots
#   GET - https://123j6pi123.execute-api.us-east-1.amazonaws.com/dev/screenshots
```

After this, you should have a cloudformation stack up and running. All endpoints are protected with an x-api-token key, which you should provide.

# Usage

## Create screenshot
If you post a url to the /screenshots/ endpoint, it will create a screenshot for you, in the example above:

```bash
curl -X POST "https://123j6pi123.execute-api.us-east-1.amazonaws.com/dev/screenshots?url=http://google.com/" -H "x-api-key: [your-api-key]"
```

## List available screenshot sizes
After creating a screenshot, you can see all the availabe sizes:
```bash
curl -X GET "https://5l8j6pizg8.execute-api.us-east-1.amazonaws.com/dev/screenshots?url=http://google.com/" -H "x-api-key: zlqti7KSFa71L8xFiG4GF1XP2U2awvlP2NdSGTpt"
```
```json
{"100":"https://s3.amazonaws.com/dev-foobar-screenshots/6ab016b2dad7ba49a992ba0213a91cf8/100.png","200":"https://s3.amazonaws.com/dev-foobar-screenshots/6ab016b2dad7ba49a992ba0213a91cf8/200.png","320":"https://s3.amazonaws.com/dev-foobar-screenshots/6ab016b2dad7ba49a992ba0213a91cf8/320.png","400":"https://s3.amazonaws.com/dev-foobar-screenshots/6ab016b2dad7ba49a992ba0213a91cf8/400.png","640":"https://s3.amazonaws.com/dev-foobar-screenshots/6ab016b2dad7ba49a992ba0213a91cf8/640.png","800":"https://s3.amazonaws.com/dev-foobar-screenshots/6ab016b2dad7ba49a992ba0213a91cf8/800.png","1024":"https://s3.amazonaws.com/dev-foobar-screenshots/6ab016b2dad7ba49a992ba0213a91cf8/1024.png","1024x768":"https://s3.amazonaws.com/dev-foobar-screenshots/6ab016b2dad7ba49a992ba0213a91cf8/1024x768.png","320x240":"https://s3.amazonaws.com/dev-foobar-screenshots/6ab016b2dad7ba49a992ba0213a91cf8/320x240.png","640x480":"https://s3.amazonaws.com/dev-foobar-screenshots/6ab016b2dad7ba49a992ba0213a91cf8/640x480.png","800x600":"https://s3.amazonaws.com/dev-foobar-screenshots/6ab016b2dad7ba49a992ba0213a91cf8/800x600.png","original":"https://s3.amazonaws.com/dev-foobar-screenshots/6ab016b2dad7ba49a992ba0213a91cf8/original.png"}
```
