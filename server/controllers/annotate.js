const github = require('../integrations/github');
const url = require('../integrations/url');
const config = require('../../env/config.json');
const User = require('../models/user');
const Key = require('../models/key');
const multiparty = require('multiparty');
const AWS = require('aws-sdk');

let fileUrl = 'https://s3-us-west-1.amazonaws.com/tuba-images-bucket/';

//prefer using environment variables versus hard-coding values here
AWS.config.update({
  accessKeyId: config.aws.accessKeyId,
  secretAccessKey: config.aws.secretAccessKey
});
const s3Client = new AWS.S3();

const accessHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'Origin, X-Requested-With, Content-Type, Accept'
};

module.exports.allowCORS = (req, res) => {
  res.set(accessHeaders);

  res.end();
};

module.exports.create = (req, res) => {
  // let destPath = 'clientUploads/';
  const body = {};
  const form = new multiparty.Form();
  let promise1 = null;
  let fileKey = Date.now();

  form.on('part', (part) => {
    promise1 = new Promise(
    (resolve, reject) => {
      //do async thing here
      fileKey += part.filename;
      s3Client.putObject({
        Bucket: 'tuba-images-bucket',
        Key: fileKey,
        ACL: 'public-read',
        Body: part,
        ContentType: part.headers['content-type'],
        ContentLength: part.byteCount
      }, (err, data) => {
        if (err) reject(err);
        if (data) {
          fileUrl += fileKey;
          const result = data;

          result.fileUrl = fileUrl;
          resolve(result);
        }
      });
    });
  });

  const params = {
    type: '',
    integration_meta: '',
    output_meta: ''
  };

  form.on('error', (err) => {
    console.log(`Error parsing form: ${err.stack}`);
  });
  form.on('field', (name, value) => {
    body[name] = value;
  });
  form.on('close', () => {
    if (!body.key) {
      res.status(400).json({ error: config.messages.no_key });

      return;
    }
    Key.findOne({ where: { key: body.key } })
    .then((key) => {
      params.type = key.type;
      params.output_meta = key.endpoint;

      return User.findOne({ where: { id: key.userId } });
    })
    .then((user) => {
      params.integration_meta = user.ghtoken;

      if (promise1) {
        promise1.then((data) => {
          console.log('inside promise1.then');
          if (params.type === 'github') {
            body.url = data.fileUrl;
            github.createIssue(params, body);
          }
          if (params.type === 'url') {
            url.postToUrl(params, body);
          }
          res.set(accessHeaders);
          res.end();
        })
        .catch((err) => { console.log(err); });
      } else {
        if (params.type === 'github') {
          github.createIssue(params, body);
        }
        if (params.type === 'url') {
          url.postToUrl(params, body);
        }
        res.set(accessHeaders);
        res.end();
      }
    });
  });

  form.parse(req);

};
