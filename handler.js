'use strict';

const request = require('request-promise');
const qs = require('querystring');
const url = require('url');
const he = require('he');

const Translator = require('./translator');
const Thesaurizer = require('./thesaurizer');
const Fluberize = require('./fluberize');

//clientID and clientSecret only needed to generate userToken
const clientID = process.env.SLACK_CLIENT_ID;
const clientSecret = process.env.SLACK_CLIENT_SECRET;
//Authorization will put this token into console, grab it and put it into serverless.yml for fluberize to work
const userToken = process.env.USER_TOKEN;

//Getting a new user token
module.exports.authorization = async (event, context, callback) => {
  const code = event.queryStringParameters.code;

  console.log('Authorization called');
  const oauthURL = url.format({
    protocol: 'https',
    hostname: 'slack.com/api',
    pathname: 'oauth.access',
    query: {
      client_id: clientID,
      client_secret: clientSecret,
      code: code
    }
  });

  const options = {
    url: oauthURL,
    json: true
  };

  return (
    request(options)
      .then(response => {
        console.log(`USER_ACCESS_TOKEN: ${response.access_token}`);
      })
      .catch(error => {
        console.log(error);
      })
      //Callback here
      .then(() => {
        const response = {
          statusCode: 200,
          body: JSON.stringify({
            message: 'Authorization has completed',
            input: event
          })
        };
        callback(null, response);
      })
      .catch(error => {
        console.log(error);
        const response = {
          statusCode: 500,
          body: JSON.stringify({
            message: error,
            input: event
          })
        };
        callback(null, response);
      })
  );
};

//(/fluberize) entrypoint
module.exports.fluberize = async (event, context, callback) => {
  let response = {
    statusCode: 200,
    body: ''
  };
  await fluberizeHandoff(event, callback(null, response));
};

let fluberizeHandoff = async (event, nuts) => {
  const params = qs.parse(event.body);
  const parseSlackTokenRegex = /(<@?#?!?[^>]+>)/g;
  let message = '';
  // Get previous message in channel
  if (!params.text) {
    let gets = await slackGET('conversations.history', {
      channel: params.channel_id,
      limit: 1
    });
    try {
      message = JSON.parse(gets).messages[0]['text'];
    } catch (err) {
      console.log(err);
    }
  }
  // Else use provided command input
  else {
    message = params.text;
  }
  console.log(
    `Fluberize called by: ${params.user_name} with message: ${message}`
  );
  let processedMessage = await fluberizeInit(params, message);
  sendJSON_POST(processedMessage, params.response_url);
};

let fluberizeInit = async (params, message) => {
  let text = message;
  let user_name = params.user_name;
  let codeBlk = '```';
  let fireEmoji = ':fire:';
  let hyperThonkSpinEmoji = ':hyperthonkspin:';
  let blanchardEmoji = ':blanchard:';
  const num_langs_regex = new RegExp(/(?<=langs=)\d+(?=\s)/);
  const synonym_regex = new RegExp(/(?<=synonym=)\d+(?=\s)/);
  const fire_easter_egg_regex = new RegExp(/(?<=fire=)\d+(?=\s)/);
  let fire_easter_egg_arr = fire_easter_egg_regex.exec(text);
  if (fire_easter_egg_arr === null || fire_easter_egg_arr[0] === null)
    fire_easter_egg_arr = [0];
  let num_langs_arr = num_langs_regex.exec(text);
  if (num_langs_arr === null || num_langs_arr[0] === null) num_langs_arr = [5];
  let synonym_arr = synonym_regex.exec(text);
  if (synonym_arr === null || synonym_arr[0] === null) synonym_arr = [1];
  let fire_easter_egg = fire_easter_egg_arr[0];
  let num_langs = num_langs_arr[0];
  let synonym = synonym_arr[0];
  // Parse out easter egg "fire=#"
  text = text.replace(/fire=+\d+/g, '');
  text = await Fluberize.parsingHelper(text);
  let messageObj = await Fluberize.fluberize(text, num_langs, synonym);
  let ret = messageObj.ret;
  let langsArr = messageObj.langsArr;
  let final_msg = '';
  if (fire_easter_egg == 1)
    final_msg = `Original message\n${codeBlk}${text}${codeBlk}\n${fireEmoji} @${blanchardEmoji}, ${fireEmoji} here's what I found ${fireEmoji} [ langs=[${langsArr}], synonym=${synonym} ] ${fireEmoji}\n${codeBlk}${ret}${codeBlk}`;
  else
    final_msg = `Original message\n${codeBlk}${text}${codeBlk}\n${hyperThonkSpinEmoji} <@${user_name}>, ${hyperThonkSpinEmoji} here's what I found ${hyperThonkSpinEmoji} [ langs=[${langsArr}], synonym=${synonym} ] ${hyperThonkSpinEmoji}\n${codeBlk}${ret}${codeBlk}`;
  return final_msg;
};

//GET a slack method
let slackGET = async (endpoint, params) => {
  console.log(
    `SlackGET called with endpoint: ${endpoint}, params: ${JSON.stringify(
      params
    )}`
  );
  const apiURL = url.format({
    protocol: 'https',
    hostname: 'slack.com/api',
    pathname: endpoint,
    query: Object.assign({ token: userToken }, params)
  });
  console.log(`SlackGET URL: ${apiURL}`);
  return request(apiURL);
};

//POST with body formatted as JSON
let sendJSON_POST = async (message, response_url) => {
  console.log(
    `sendJSON_POST called with message: ${message}, response_url: ${response_url}`
  );
  const options = {
    method: 'POST',
    url: response_url,
    body: {
      response_type: 'in_channel',
      text: message
    },
    headers: {
      'Content-Type': 'application/json'
    },
    json: true
  };
  request(options)
    .then(res => console.log(`sendJSON_POST: ${res}`))
    .catch(error => console.log(`sendJSON_POST error: ${error}`));
};
