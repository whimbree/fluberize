'use strict';

const request = require('request-promise');
const qs = require('querystring');
const url = require('url');
const he = require('he');

const Translator = require('./translator');
const Thesaurizer = require('./thesaurizer');

module.exports.fluberize = async (text, langs = 5, synonym = 1) => {
  if (synonym > 0) {
    let saurus = new Thesaurizer();
    text = await saurus.garbleString(text, synonym);
    console.log(`After Thesaurus: ${text}`);
  }
  let langsArr = [];
  if (langs > 0) {
    let trans = new Translator();
    let languageObj = await trans.telephone(text, langs);
    text = languageObj.ret;
    langsArr = languageObj.langsArr;
    console.log(`After Translator: ${text}`);
  }
  if (langs == 0) langsArr = ['null'];
  return { ret: text, langsArr };
};

// Handles nuking @user and #channel tags as well as emoji and settings flags
module.exports.parsingHelper = async str => {
  console.log(`Parsing Helper Called With: ${str}`);
  const regexLangs = /langs=+\d+/g;
  const regexSynonym = /synonym=+\d+/g;
  const regexSlackTokens = /(:[^\s:]*:)|(<@?#?!?[^>]+>)/g;
  const regexAlphaNumeric = /([^\.\!\?0-9A-Za-z\s]*)/g;
  const replaceString = '';
  let text = str;
  text = he.decode(text);
  text = text.replace(regexLangs, replaceString);
  text = text.replace(regexSynonym, replaceString);
  text = text.replace(regexSlackTokens, replaceString);
  text = text.replace(regexAlphaNumeric, replaceString);
  text = text.trim();
  console.log(`Parsed Message: ${text}`);
  return text;
};
