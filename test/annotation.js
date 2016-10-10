const Key = require('../server/models/key');
const User = require('../server/models/user');
const server = require('../server/server');
const request = require('supertest');
const config = require('../env/config.json');
const http = require('http');

class MockServer {
  constructor() {
    this.port = 1338;
    this.url = `http://localhost:${this.port}`;
    this.githubPath = '/github/repos/user/repo/issues';
    this.urlPath = '/url';

    this.recieved = [];
    this.server = http.createServer(this.handler.bind(this));
  }
  handler(req, res) {
    console.log(`mock server: ${req.method} to ${req.url}`);

    let body = '';

    req.on('data', (data) => {
      body += data;
    });

    req.on('end', () => {
      body = JSON.parse(body);
      if (req.url === this.githubPath) {
        this.recieved.push(body);
      } else if (req.url === this.urlPath) {
        this.recieved.push(body);
      } else {
        throw new Error('should only use predefined mock server url');
      }

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ issues: 'created' }));
    });
  }
  has(content) {
    return this.recieved.indexOf(content) >= 0;
  }
  start() {
    config.github.api_url = `${this.url}/github`;

    return new Promise((resolve, reject) => {
      this.server.listen(this.port, (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }
}

describe('annotation', () => { // eslint-disable-line max-statements
  let apiKeyGithub = '';
  let apiKeyURL = '';
  let mockServer = null;

  before((done) => {
    mockServer = new MockServer();
    mockServer.start().then(done);
  });

  //ooh, a pyramid
  before((done) => {
    // create test user and API keys
    let testUserId = null;

    User.create({
      email: 'testemail',
      password: 'testpass',
      ghtoken: 'GITHUBKEYHERE'
    })
    .then((user) => {
      testUserId = user.id;

      return Key.create({ userId: testUserId });
    })
    .then((key) => {
      apiKeyGithub = key.key;

      return Key.update({
        name: 'githubkey',
        type: 'github',
        endpoint: 'user/repo'
      }, { where: { key: apiKeyGithub } });
    })
    .then(() => Key.create({ userId: testUserId }))
    .then((key) => {
      apiKeyURL = key.key;

      return Key.update({
        name: 'urlkey',
        type: 'url',
        endpoint: `${mockServer.url}/url`
      }, { where: { key: apiKeyURL } });
    })
    .then(() => done());
  });

  it('should not POST to /annotate without key', (done) => {
    request(server)
      .post('/api/annotate')
      .field('title', 'a test annotation')
      .field('to', 'to user')
      .field('from', 'from user')
      .field('selected', 'this would be the selected text')
      .field('comment', 'this is the comment')
      .expect(400)
      .end(done)
      .catch(() => done());
  });

  it('should POST with attachment to /annotate with Github key', (done) => {
    request(server)
      .post('/api/annotate')
      .field('key', apiKeyGithub)
      .field('title', 'a test annotation')
      .field('to', 'to user')
      .field('from', 'from user')
      .field('selected', 'this would be the selected text')
      .field('comment', 'this is the comment')
      .attach('file', `${__dirname}/testfile`)
      .expect(200)
      .end(done);
  });

  it('should POST without attachment to /annotate with Github key', (done) => {
    request(server)
      .post('/api/annotate')
      .field('key', apiKeyGithub)
      .field('title', 'a test annotation')
      .field('to', 'to user')
      .field('from', 'from user')
      .field('selected', 'this would be the selected text')
      .field('comment', 'this is the comment')
      .expect(200)
      .end(done);
  });

  //it('should create github issue', (done) => {
    //request(mockServerUrl)
      //.get(githubMockPath)
      //.expect(200)
      //.end((err, res) => {
        //res.body[0].title.should.eql('a test annotation');
        //done(err);
      //});
  //});

  //it('should POST to /annotate with URL key', (done) => {
    //request(server)
      //.post('/api/annotate')
      //.field('key', apiKeyURL)
      //.field('title', 'a test annotation')
      //.field('to', 'to user')
      //.field('from', 'from user')
      //.field('selected', 'this would be the selected text')
      //.field('comment', 'this is the comment')
      //.expect(200)
      //.end(done);
  //});

  //it('should make POST request to a URL', (done) => {
    //request(mockServerUrl)
      //.get('/url')
      //.expect(200)
      //.end((err, res) => {
        //res.body[0].title.should.eql('a test annotation');
        //done(err);
      //});
  //});
});
