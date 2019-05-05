'use strict';

const request = require('request-promise');
const qs = require('querystring');
const url = require('url');
const he = require('he');

const Translator = require('./translator');
const Thesaurizer = require('./thesaurizer');

module.exports.fluberize = async (text, langs = 5, do_synonym = 1) => {
  if (do_synonym > 0) {
    let saurus = new Thesaurizer();
    text = await saurus.randomSynonymString(text);
    console.log(`After Thesaurus: ${text}`);
  }
  if (langs > 0) {
    let trans = new Translator();
    text = await trans.multiTranslate(text, ['en', 'es', 'ru', 'en']);
    console.log(`After Translator: ${text}`);
  }
  return text;
};

// Handles nuking @user and #channel tags as well as emoji and settings flags
module.exports.parsingHelper = async str => {
  console.log(`Parsing Helper Called With: ${str}`);
  const regexLangs = /langs=+\d+/g;
  const regexSynonym = /synonym=+\d+/g;
  const regexSlackTokens = /(:[^\s:]*:)|(<@?#?!?[^>]+>)/g;
  const regexAlphaNumeric = /([^0-9A-Za-z\s]*)/g;
  const replaceString = '';
  let text = str;
  text = he.decode(text);
  text = text.replace(regexLangs, replaceString);
  text = text.replace(regexSynonym, replaceString);
  text = text.replace(regexSlackTokens, replaceString);
  text = text.replace(regexAlphaNumeric, replaceString);
  console.log(`Parsed Message: ${text}`);
  return text;
};
