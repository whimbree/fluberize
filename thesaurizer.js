'use strict';

let moby = require('moby');

class Thesaurizer {
  constructor() {}

  async randomSynonymString(str) {
    let words = str.split(' ');
    let ret = '';
    for (let i = 0; i < words.length; i++) {
      let syn = await this.randomSynonymWord(words[i]);
      ret += `${syn} `;
    }
    ret = ret.trim();
    return ret;
  }

  async randomSynonymWord(word) {
    let lookup = moby.search(word);
    if (lookup.length == 0) {
      lookup = moby.reverseSearch(word);
    }
    if (lookup.length == 0) return word;
    let random = lookup[Math.floor(Math.random() * lookup.length)];
    return random;
  }
}

module.exports = Thesaurizer;
