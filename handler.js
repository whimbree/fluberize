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
  const response = {
    statusCode: 200,
    body: ''
  };
  await callback(null, response);
  await fluberizeHandoff(event);
};

let fluberizeHandoff = async event => {
  const params = qs.parse(event.body);
  const parseSlackTokenRegex = /(<@?#?!?[^>]+>)/g;

  // If fluberize called without text input
  // if (!params.text) {
  //   slackGET('conversations.history', { channel: params.channel_id, limit: 1 })
  //     .then(res => {
  //       let message = JSON.parse(res).messages[0]['text'];
  //       console.log(
  //         `Fluberize called by: ${params.user_name} with message: ${message}`
  //       );
  //       let processedMessage = `${SPONGE_EMOJI} ${parsingHelper(
  //         message,
  //         spongemockify
  //       ).join('')} ${SPONGE_EMOJI}`;
  //       sendJSON_POST(processedMessage, params.response_url);
  //     })
  //     .catch(error => console.log(`Spongemock w/o text error: ${error}`));
  // }
  // //Else use provided command input
  // else {
  console.log(
    `Fluberize called by: ${params.user_name} with message: ${params.text}`
  );
  let processedMessage = await fluberizeInit(params);
  sendJSON_POST(processedMessage, params.response_url);
};

let fluberizeInit = async params => {
  let text = params.text;
  let user_name = params.user_name;
  let codeBlk = '```';
  const num_langs_regex = new RegExp(/(?<=langs=)\d+(?=\s)/);
  const do_synonym_regex = new RegExp(/(?<=synonym=)\d+(?=\s)/);
  let num_langs_arr = num_langs_regex.exec(text);
  if (num_langs_arr === null || num_langs_arr[0] === null) num_langs_arr = [5];
  let do_synonym_arr = do_synonym_regex.exec(text);
  if (do_synonym_arr === null || do_synonym_arr[0] === null)
    do_synonym_arr = [1];
  let num_langs = num_langs_arr[0];
  let do_synonym = do_synonym_arr[0];
  text = await Fluberize.parsingHelper(text);
  let ret = await Fluberize.fluberize(text, num_langs, do_synonym);
  const final_msg = `Original message\n${codeBlk}${text}${codeBlk}\n<@${user_name}>, here's what I found [ langs=['en', 'es', 'ru', 'en'], synonym=${do_synonym} ]\n${codeBlk}${ret}${codeBlk}`;
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
