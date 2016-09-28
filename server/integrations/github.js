const config = require('../../env/config.json');
const https = require('https');
const Integration = require('../models/integration');

const apiUrl = 'api.github.com';

const parseRes = (res) =>
  res
  .split('&')
  .reduce((sum, cur) => {
    const parts = cur.split('=');
    const newSum = sum;

    newSum[parts[0]] = parts[1];

    return newSum;
  }, {});

module.exports.createIssue = (repo, issue) => {
  const options = {
    host: apiUrl,
    post: 80,
    path: `/repos/${repo}/issues`,
    method: 'POST',
    headers: { 'User-Agent': 'frolicking tuba' },
    auth: `${config.github.username}:${config.github.password}`
  };

  const req = https.request(options, (res) => {
    res.setEncoding('utf8');
    res.on('data', (part) => {
      console.log(part);
    });
  });

  req.write(JSON.stringify(issue));
  //req.end();
};

module.exports.register = (req, res) => {
  const apiHost = 'github.com';
  const apiPath = '/login/oauth/access_token';

  const options = {
    host: apiHost,
    post: 80,
    path: apiPath,
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
  };

  const githubReq = https.request(options, (githubRes) => {
    githubRes.setEncoding('utf8');
    let githubResData = '';

    githubRes.on('data', (part) => {
      githubResData += part;
    });

    githubRes.on('end', () => {
      const fromGithub = parseRes(githubResData);

      if (!fromGithub.access_token || !req.session.user) {
        res.status(400).json({
          error: 'failed to authenticate with github',
          token: fromGithub.access_token,
          sess: req.session.user || null
        });

        return;
      }

      Integration.create({
        type: 'github',
        meta: fromGithub.access_token,
        userId: req.session.user.id
      }).then((integration) =>
        res.redirect('/'));
    });
  });

  githubReq.write(
`client_id=${config.github.client_id}\
&client_secret=${config.github.secret}\
&code=${req.query.code}`);

  githubReq.end();
};
