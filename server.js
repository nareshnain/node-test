require('rootpath')();
const express = require('express');
let session = require('express-session');
const app = express();
const cors = require('cors');
const bodyParser = require('body-parser');
const jwt = require('_helpers/jwt');
const errorHandler = require('_helpers/error-handler');
let sys = require('sys');
let oauth = require('oauth');
let Twitter = require('twitter');

// Twitter connect start
let _twitterConsumerKey = "grjAiUf4aaDkFrpQHmgJ8ZMYI";
let _twitterConsumerSecret = "4QF2z407ddDgIZ05UEHuyPKNdXilzTnCiHLU58Jq906k2i0kMI";
function consumer() {
    return new oauth.OAuth(
      "https://twitter.com/oauth/request_token", "https://twitter.com/oauth/access_token",
      _twitterConsumerKey, _twitterConsumerSecret, "1.0A", 
      "http://localhost:5200/sessions/callback", "HMAC-SHA1");   
  }

app.use(bodyParser.urlencoded({ extended: false }));

app.use(bodyParser.json());
app.use(cors());
app.use(session({ secret: 'cat', cookie: { maxAge: 60000 }}));

app.use('/users', require('./users/users.controller'));
app.use('/twitter-auth', (req, res) => res.send('Hello World!'));

app.get('/sessions/connect', function(req, res){
    consumer().getOAuthRequestToken(function(error, oauthToken, oauthTokenSecret, results){
      if (error) {
        res.send("Error getting OAuth request token : " + sys.inspect(error), 500);
      } else {
        req.session.oauthRequestToken = oauthToken;
        req.session.oauthRequestTokenSecret = oauthTokenSecret;
        res.redirect("https://twitter.com/oauth/authorize?oauth_token="+req.session.oauthRequestToken);
      }
    });
  });
  
  app.get('/sessions/callback', function(req, res){
    consumer().getOAuthAccessToken(req.session.oauthRequestToken, req.session.oauthRequestTokenSecret, req.query.oauth_verifier, function(error, oauthAccessToken, oauthAccessTokenSecret, results) {
      if (error) {
        res.send("Error getting OAuth access token : " + sys.inspect(error) + "["+oauthAccessToken+"]"+ "["+oauthAccessTokenSecret+"]"+ "["+sys.inspect(results)+"]", 500);
      } else {
        req.session.oauthAccessToken = oauthAccessToken;
        req.session.oauthAccessTokenSecret = oauthAccessTokenSecret;
        res.redirect(`http://localhost:4200/?twitterAccessToken=${oauthAccessToken}
        &twitterTokenSecret=${oauthAccessTokenSecret}`);
      }
    });
  });

  app.get('/friends', function(req, res) {
    if (!req.body.accessToken || !req.body.accesssecret) {
      res.send({status: 401, users: [], response: [], message: ''});
    } else {
      var client = new Twitter({
        consumer_key: _twitterConsumerKey,
        consumer_secret: _twitterConsumerSecret,
        access_token_key: req.body.accessToken,
        access_token_secret: req.body.accesssecret
      });
      client.get('friends/list', function(error, users, response) {
        res.send({status: 200, users, response, message: 'Friend list data.'});
      }); 
    }   
  });
  
  app.get('/profile', function(req, res) {
    if (!req.body.accessToken || !req.body.accesssecret) {
      res.send({status: 401, users: [], response: [], message: ''});
    } else {
      let client = new Twitter({
        consumer_key: _twitterConsumerKey,
        consumer_secret: _twitterConsumerSecret,
        access_token_key: req.body.accessToken,
        access_token_secret: req.body.accesssecret
      });
      let params = {user_id: req.body.userId};
      client.get(`users/show`, params ,function(error, users, response) {
        res.send({status: 200, users, response, message: 'Profile data.'});
      }); 
    }   
  });

app.use(errorHandler);

const port = process.env.NODE_ENV === 'production' ? (process.env.PORT || 80) : 5200;
const server = app.listen(port, function () {
    console.log('Server listening on port ' + port);
});
