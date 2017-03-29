var CUST_TAG = RegExp(/^([ \t]*)<(-?[A-Za-z][-\w\xA0-\xFF]*)(?:\s+([^'"\/>]+(?:(?:@|\/[^>])[^'"\/>]*)*)|\s*)?(?:\/>|>[ \t]*\n?([\S\s]*)^\1<\/\2\s*>|>(.*)<\/\2\s*>)/
    .source.replace('@', S_STRINGS), 'gim');
var SCRIPTS = /<script(\s+[^>]*)?>\n?([\S\s]*?)<\/script\s*>/gi;
var STYLES = /<style(\s+[^>]*)?>\n?([\S\s]*?)<\/style\s*>/gi;
var END_TAGS = /\/>\n|^<(?:\/?-?[A-Za-z][-\w\xA0-\xFF]*\s*|-?[A-Za-z][-\w\xA0-\xFF]*\s+[-\w:\xA0-\xFF][\S\s]*?)>\n/;
function getType (attribs) {
  if (attribs) {
    var match = attribs.match(TYPE_ATTR);

    match = match && (match[2] || match[3]);
    if (match) {
      return match.replace('text/', '')
    }
  }
  return ''
}
function riotjs (js) {
  var
    parts = [],
    match,
    toes5,
    pos,
    method,
    prefix,
    name,
    RE = RegExp;

  if (~js.indexOf('/')) { js = rmComms(js, JS_COMMS); }

  while ((match = js.match(JS_ES6SIGN))) {

    parts.push(RE.leftContext);
    js  = RE.rightContext;
    pos = skipBody(js, JS_ES6END);

    method = match[1];
    prefix = match[2] || '';
    name  = match[3];

    toes5 = !/^(?:if|while|for|switch|catch|function)$/.test(name);

    if (toes5) {
      name = match[0].replace(method, 'this.' + name + ' =' + prefix + ' function');
    } else {
      name = match[0];
    }

    parts.push(name, js.slice(0, pos));
    js = js.slice(pos);

    if (toes5 && !/^\s*.\s*bind\b/.test(js)) { parts.push('.bind(this)'); }
  }

  return parts.length ? parts.join('') + js : js

  function rmComms (s, r, m) {
    r.lastIndex = 0;
    while ((m = r.exec(s))) {
      if (m[0][0] === '/' && !m[1] && !m[2]) {
        s = RE.leftContext + ' ' + RE.rightContext;
        r.lastIndex = m[3] + 1;
      }
    }
    return s
  }

  function skipBody (s, r) {
    var m, i = 1;

    r.lastIndex = 0;
    while (i && (m = r.exec(s))) {
      if (m[0] === '{') { ++i; }
      else if (m[0] === '}') { --i; }
    }
    return i ? s.length : r.lastIndex
  }
}
function getAttrib (attribs, name) {
  if (attribs) {
    var match = attribs.match(RegExp('\\s' + name + MISC_ATTR, 'i'));

    match = match && match[1];
    if (match) {
      return (/^['"]/).test(match) ? match.slice(1, -1) : match
    }
  }
  return ''
}
function extend (obj, props) {
    if (props) {
      for (var prop in props) {
        /* istanbul ignore next */
        if (props.hasOwnProperty(prop)) {
          obj[prop] = props[prop];
        }
      }
    }
    return obj
  }
function cleanSource (src) {
  var
    mm,
    re = HTML_COMMS;

  if (~src.indexOf('\r')) {
    src = src.replace(/\r\n?/g, '\n');
  }

  re.lastIndex = 0;
  while ((mm = re.exec(src))) {
    if (mm[0][0] === '<') {
      src = RegExp.leftContext + RegExp.rightContext;
      re.lastIndex = mm[3] + 1;
    }
  }
  return src
}
var brackets = (function (UNDEF) {

  var
    REGLOB = 'g',

    R_MLCOMMS = /\/\*[^*]*\*+(?:[^*\/][^*]*\*+)*\//g,

    R_STRINGS = /"[^"\\]*(?:\\[\S\s][^"\\]*)*"|'[^'\\]*(?:\\[\S\s][^'\\]*)*'|`[^`\\]*(?:\\[\S\s][^`\\]*)*`/g,

    S_QBLOCKS = R_STRINGS.source + '|' +
      /(?:\breturn\s+|(?:[$\w\)\]]|\+\+|--)\s*(\/)(?![*\/]))/.source + '|' +
      /\/(?=[^*\/])[^[\/\\]*(?:(?:\[(?:\\.|[^\]\\]*)*\]|\\.)[^[\/\\]*)*?(\/)[gim]*/.source,

    UNSUPPORTED = RegExp('[\\' + 'x00-\\x1F<>a-zA-Z0-9\'",;\\\\]'),

    NEED_ESCAPE = /(?=[[\]()*+?.^$|])/g,

    FINDBRACES = {
      '(': RegExp('([()])|'   + S_QBLOCKS, REGLOB),
      '[': RegExp('([[\\]])|' + S_QBLOCKS, REGLOB),
      '{': RegExp('([{}])|'   + S_QBLOCKS, REGLOB)
    },

    DEFAULT = '{ }';

  var _pairs = [
    '{', '}',
    '{', '}',
    /{[^}]*}/,
    /\\([{}])/g,
    /\\({)|{/g,
    RegExp('\\\\(})|([[({])|(})|' + S_QBLOCKS, REGLOB),
    DEFAULT,
    /^\s*{\^?\s*([$\w]+)(?:\s*,\s*(\S+))?\s+in\s+(\S.*)\s*}/,
    /(^|[^\\]){=[\S\s]*?}/
  ];

  var
    cachedBrackets = UNDEF,
    _regex,
    _cache = [],
    _settings;

  function _loopback (re) { return re }

  function _rewrite (re, bp) {
    if (!bp) { bp = _cache; }
    return new RegExp(
      re.source.replace(/{/g, bp[2]).replace(/}/g, bp[3]), re.global ? REGLOB : ''
    )
  }

  function _create (pair) {
    if (pair === DEFAULT) { return _pairs }

    var arr = pair.split(' ');

    if (arr.length !== 2 || UNSUPPORTED.test(pair)) {
      throw new Error('Unsupported brackets "' + pair + '"')
    }
    arr = arr.concat(pair.replace(NEED_ESCAPE, '\\').split(' '));

    arr[4] = _rewrite(arr[1].length > 1 ? /{[\S\s]*?}/ : _pairs[4], arr);
    arr[5] = _rewrite(pair.length > 3 ? /\\({|})/g : _pairs[5], arr);
    arr[6] = _rewrite(_pairs[6], arr);
    arr[7] = RegExp('\\\\(' + arr[3] + ')|([[({])|(' + arr[3] + ')|' + S_QBLOCKS, REGLOB);
    arr[8] = pair;
    return arr
  }

  function _brackets (reOrIdx) {
    return reOrIdx instanceof RegExp ? _regex(reOrIdx) : _cache[reOrIdx]
  }

  _brackets.split = function split (str, tmpl, _bp) {
    // istanbul ignore next: _bp is for the compiler
    if (!_bp) { _bp = _cache; }

    var
      parts = [],
      match,
      isexpr,
      start,
      pos,
      re = _bp[6];

    isexpr = start = re.lastIndex = 0;

    while ((match = re.exec(str))) {

      pos = match.index;

      if (isexpr) {

        if (match[2]) {
          re.lastIndex = skipBraces(str, match[2], re.lastIndex);
          continue
        }
        if (!match[3]) {
          continue
        }
      }

      if (!match[1]) {
        unescapeStr(str.slice(start, pos));
        start = re.lastIndex;
        re = _bp[6 + (isexpr ^= 1)];
        re.lastIndex = start;
      }
    }

    if (str && start < str.length) {
      unescapeStr(str.slice(start));
    }

    return parts

    function unescapeStr (s) {
      if (tmpl || isexpr) {
        parts.push(s && s.replace(_bp[5], '$1'));
      } else {
        parts.push(s);
      }
    }

    function skipBraces (s, ch, ix) {
      var
        match,
        recch = FINDBRACES[ch];

      recch.lastIndex = ix;
      ix = 1;
      while ((match = recch.exec(s))) {
        if (match[1] &&
          !(match[1] === ch ? ++ix : --ix)) { break }
      }
      return ix ? s.length : recch.lastIndex
    }
  };

  _brackets.hasExpr = function hasExpr (str) {
    return _cache[4].test(str)
  };

  _brackets.loopKeys = function loopKeys (expr) {
    var m = expr.match(_cache[9]);

    return m
      ? { key: m[1], pos: m[2], val: _cache[0] + m[3].trim() + _cache[1] }
      : { val: expr.trim() }
  };

  _brackets.array = function array (pair) {
    return pair ? _create(pair) : _cache
  };

  function _reset (pair) {
    if ((pair || (pair = DEFAULT)) !== _cache[8]) {
      _cache = _create(pair);
      _regex = pair === DEFAULT ? _loopback : _rewrite;
      _cache[9] = _regex(_pairs[9]);
    }
    cachedBrackets = pair;
  }

  function _setSettings (o) {
    var b;

    o = o || {};
    b = o.brackets;
    Object.defineProperty(o, 'brackets', {
      set: _reset,
      get: function () { return cachedBrackets },
      enumerable: true
    });
    _settings = o;
    _reset(b);
  }

  Object.defineProperty(_brackets, 'settings', {
    set: _setSettings,
    get: function () { return _settings }
  });

  /* istanbul ignore next: in the browser riot is always in the scope */
  _brackets.settings = typeof tiny !== 'undefined' && tiny.settings || {};
  _brackets.set = _reset;

  _brackets.R_STRINGS = R_STRINGS;
  _brackets.R_MLCOMMS = R_MLCOMMS;
  _brackets.S_QBLOCKS = S_QBLOCKS;

  return _brackets

})();

var JS_ES6SIGN = /^[ \t]*(((?:async|\*)\s*)?([$_A-Za-z][$\w]*))\s*\([^()]*\)\s*{/m;

var JS_ES6END = RegExp('[{}]|' + brackets.S_QBLOCKS, 'g');

var JS_COMMS = RegExp(brackets.R_MLCOMMS.source + '|//[^\r\n]*|' + brackets.S_QBLOCKS, 'g');

/* eslint-enable */

var S_LINESTR = /"[^"\n\\]*(?:\\[\S\s][^"\n\\]*)*"|'[^'\n\\]*(?:\\[\S\s][^'\n\\]*)*'/.source;

var S_STRINGS = brackets.R_STRINGS.source;

var HTML_ATTRS = / *([-\w:\xA0-\xFF]+) ?(?:= ?('[^']*'|"[^"]*"|\S+))?/g;

var HTML_COMMS = RegExp(/<!--(?!>)[\S\s]*?-->/.source + '|' + S_LINESTR, 'g');

var HTML_TAGS = /<(-?[A-Za-z][-\w\xA0-\xFF]*)(?:\s+([^"'\/>]*(?:(?:"[^"]*"|'[^']*'|\/[^>])[^'"\/>]*)*)|\s*)(\/?)>/g;

var HTML_PACK = />[ \t]+<(-?[A-Za-z]|\/[-A-Za-z])/g;

var RIOT_ATTRS = ['style', 'src', 'd', 'value'];

var VOID_TAGS = /^(?:input|img|br|wbr|hr|area|base|col|embed|keygen|link|meta|param|source|track)$/;

var PRE_TAGS = /<pre(?:\s+(?:[^">]*|"[^"]*")*)?>([\S\s]+?)<\/pre\s*>/gi;

var SPEC_TYPES = /^"(?:number|date(?:time)?|time|month|email|color)\b/i;

var IMPORT_STATEMENT = /^\s*import(?!\w)(?:(?:\s|[^\s'"])*)['|"].*\n?/gm;

var TRIM_TRAIL = /[ \t]+$/gm;

var RE_HASEXPR = safeRegex(/@#\d/, 'x01');
var RE_REPEXPR = safeRegex(/@#(\d+)/g, 'x01');
var CH_IDEXPR  = '\x01#';
var CH_DQCODE  = '\u2057';
var DQ = '"';
var SQ = "'";


function safeRegex (re) {
  var arguments$1 = arguments;

  var src = re.source;
  var opt = re.global ? 'g' : '';

  if (re.ignoreCase) { opt += 'i'; }
  if (re.multiline)  { opt += 'm'; }

  for (var i = 1; i < arguments.length; i++) {
    src = src.replace('@', '\\' + arguments$1[i]);
  }

  return new RegExp(src, opt)
}

extend$1=extend;
  function _brackets (reOrIdx) {
    return reOrIdx instanceof RegExp ? _regex(reOrIdx) : _cache[reOrIdx]
  }
  function parseAttribs (str, pcex) {
  var
    list = [],
    match,
    type, vexp;

  HTML_ATTRS.lastIndex = 0;

  str = str.replace(/\s+/g, ' ');

  while ((match = HTML_ATTRS.exec(str))) {
    var
      k = match[1].toLowerCase(),
      v = match[2];

    if (!v) {
      list.push(k);
    } else {

      if (v[0] !== DQ) {
        v = DQ + (v[0] === SQ ? v.slice(1, -1) : v) + DQ;
      }

      if (k === 'type' && SPEC_TYPES.test(v)) {
        type = v;
      } else {
        if (RE_HASEXPR.test(v)) {

          if (k === 'value') { vexp = 1; }
          if (~RIOT_ATTRS.indexOf(k)) { k = 'riot-' + k; }
        }

        list.push(k + '=' + v);
      }
    }
  }

  if (type) {
    if (vexp) { type = DQ + pcex._bp[0] + SQ + type.slice(1, -1) + SQ + pcex._bp[1] + DQ; }
    list.push('type=' + type);
  }
  return list.join(' ')
}


function restoreExpr (html, pcex) {
  if (pcex.length) {
    html = html.replace(RE_REPEXPR, function (_, d) {

      return pcex._bp[0] + pcex[d].trim().replace(/[\r\n]+/g, ' ').replace(/"/g, CH_DQCODE)
    });
  }
  return html
}



function splitHtml (html, opts, pcex) {
  var _bp = pcex._bp;

  if (html && _bp[4].test(html)) {
    var
      jsfn = opts.expr && (opts.parser || opts.type) ? _compileJS : 0,
      list = brackets.split(html, 0, _bp),
      expr;

    for (var i = 1; i < list.length; i += 2) {
      expr = list[i];
      if (expr[0] === '^') {
        expr = expr.slice(1);
      } else if (jsfn) {
        expr = jsfn(expr, opts).trim();
        if (expr.slice(-1) === ';') { expr = expr.slice(0, -1); }
      }
      list[i] = CH_IDEXPR + (pcex.push(expr) - 1) + _bp[1];
    }
    html = list.join('');
  }
  return html
}
function _compileHTML (html, opts, pcex) {
  if (!/\S/.test(html)) { return '' }

  html = splitHtml(html, opts, pcex)
    .replace(HTML_TAGS, function (_, name, attr, ends) {

      name = name.toLowerCase();

      ends = ends && !VOID_TAGS.test(name) ? '></' + name : '';

      if (attr) { name += ' ' + parseAttribs(attr, pcex); }

      return '<' + name + ends + '>'
    });

  if (!opts.whitespace) {
    var p = [];

    if (/<pre[\s>]/.test(html)) {
      html = html.replace(PRE_TAGS, function (q) {
        p.push(q);
        return '\u0002'
      });
    }

    html = html.trim().replace(/\s+/g, ' ');

    if (p.length) { html = html.replace(/\u0002/g, function () { return p.shift() }); }
  }

  if (opts.compact) { html = html.replace(HTML_PACK, '><$1'); }

  return restoreExpr(html, pcex).replace(TRIM_TRAIL, '')
}
function getCode (code, opts, attribs, base) {
  var
    type = getType(attribs),
    src  = getAttrib(attribs, 'src'),
    jsParserOptions = extend$1({}, opts.parserOptions.js);

  if (src) { return false }

  return _compileJS(
          code,
          opts,
          type,
          extend$1(jsParserOptions, getParserOptions(attribs)),
          base
        )
}
function unescapeHTML (str) {
  return str
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&quot;/g, '"')
          .replace(/&#039;/g, '\'')
}
function getParserOptions (attribs) {
  var opts = unescapeHTML(getAttrib(attribs, 'options'));

  return opts ? JSON.parse(opts) : null
}
function compile$1 (src, opts, url) {
  var
    parts = [],
    included,
    defaultParserptions = {

      template: {},
      js: {},
      style: {}
    };

  if (!opts) { opts = {}; }

  opts.parserOptions = extend$1(defaultParserptions, opts.parserOptions || {});

  included = opts.exclude
    ? function (s) { return opts.exclude.indexOf(s) < 0 } : function () { return 1 };

  if (!url) { url = ''; }

  var _bp = brackets.array(opts.brackets);

  if (opts.template) {
    src = compileTemplate(src, url, opts.template, opts.parserOptions.template);
  }

  src = cleanSource(src)
    .replace(CUST_TAG, function (_, indent, tagName, attribs, body, body2) {
      var
        jscode = '',
        styles = '',
        html = '',
        imports = '',
        pcex = [];

      pcex._bp = _bp;

      tagName = tagName.toLowerCase();

      attribs = attribs && included('attribs')
        ? restoreExpr(
            parseAttribs(
              splitHtml(attribs, opts, pcex),
            pcex),
          pcex) : '';

      if ((body || (body = body2)) && /\S/.test(body)) {

        if (body2) {

          if (included('html')) { html = _compileHTML(body2, opts, pcex); }
        } else {

          body = body.replace(RegExp('^' + indent, 'gm'), '');

          body = body.replace(SCRIPTS, function (_m, _attrs, _script) {
            if (included('js')) {
              var code = getCode(_script, opts, _attrs, url);

              if (code) { jscode += (jscode ? '\n' : '') + code; }
            }
            return ''
          });

          body = body.replace(STYLES, function (_m, _attrs, _style) {
            if (included('css')) {
              styles += (styles ? ' ' : '') + cssCode(_style, opts, _attrs, url, tagName);
            }
            return ''
          });

          var blocks = splitBlocks(body.replace(TRIM_TRAIL, ''));

          if (included('html')) {
            html = _compileHTML(blocks[0], opts, pcex);
          }

          if (included('js')) {
            body = _compileJS(blocks[1], opts, null, null, url);
            if (body) { jscode += (jscode ? '\n' : '') + body; }
            jscode = jscode.replace(IMPORT_STATEMENT, function (s) {
              imports += s.trim() + '\n';
              return ''
            });
          }
        }
      }

      jscode = /\S/.test(jscode) ? jscode.replace(/\n{3,}/g, '\n\n') : '';

      if (opts.entities) {
        parts.push({
          tagName: tagName,
          html: html,
          css: styles,
          attribs: attribs,
          js: jscode,
          imports: imports
        });
        return ''
      }

      return mktag(tagName, html, styles, attribs, jscode, imports, opts)
    });

  if (opts.entities) { return parts }

  return src
}
function cssCode (code, opts, attribs, url, tag) {
  var
    parserStyleOptions = extend$1({}, opts.parserOptions.style),
    extraOpts = {
      parserOpts: extend$1(parserStyleOptions, getParserOptions(attribs)),
      url: url
    };

  return _compileCSS(code, tag, getType(attribs) || opts.style, extraOpts)
}

var CSS_SELECTOR = RegExp('([{}]|^)[; ]*((?:[^@ ;{}][^{}]*)?[^@ ;{}:] ?)(?={)|' + S_LINESTR, 'g');

function scopedCSS (tag, css) {
  var scope = ':scope';

  return css.replace(CSS_SELECTOR, function (m, p1, p2) {

    if (!p2) { return m }

    p2 = p2.replace(/[^,]+/g, function (sel) {
      var s = sel.trim();

      if (s.indexOf(tag) === 0) {
        return sel
      }

      if (!s || s === 'from' || s === 'to' || s.slice(-1) === '%') {
        return sel
      }

      if (s.indexOf(scope) < 0) {
        s = tag + ' ' + s + ',[data-is="' + tag + '"] ' + s;
      } else {
        s = s.replace(scope, tag) + ',' +
            s.replace(scope, '[data-is="' + tag + '"]');
      }
      return s
    });

    return p1 ? p1 + ' ' + p2 : p2
  })
}
function _compileCSS (css, tag, type, opts) {
  opts = opts || {};

  if (type) {
    if (type !== 'css') {

      var parser = parsers$1._req('css.' + type, true);
      css = parser(tag, css, opts.parserOpts || {}, opts.url);
    }
  }

  css = css.replace(brackets.R_MLCOMMS, '').replace(/\s+/g, ' ').trim();
  if (tag) { css = scopedCSS(tag, css); }

  return css
}

function splitBlocks (str) {
  if (/<[-\w]/.test(str)) {
    var
      m,
      k = str.lastIndexOf('<'),
      n = str.length;

    while (~k) {
      m = str.slice(k, n).match(END_TAGS);
      if (m) {
        k += m.index + m[0].length;
        m = str.slice(0, k);
        if (m.slice(-5) === '<-/>\n') { m = m.slice(0, -5); }
        return [m, str.slice(k)]
      }
      n = k;
      k = str.lastIndexOf('<', k - 1);
    }
  }
  return ['', str]
}
function _compileJS (js, opts, type, parserOpts, url) {
  if (!/\S/.test(js)) { return '' }
  if (!type) { type = opts.type; }

  var parser = opts.parser || type && parsers$1._req('js.' + type, true) || riotjs;

  return parser(js, parserOpts, url).replace(/\r\n?/g, '\n').replace(TRIM_TRAIL, '')
}
function _q (s, r) {
  if (!s) { return "''" }
  s = SQ + s.replace(/\\/g, '\\\\').replace(/'/g, "\\'") + SQ;
  return r && ~s.indexOf('\n') ? s.replace(/\n/g, '\\n') : s
}
function mktag (name, html, css, attr, js, imports, opts) {
  var
    c = opts.debug ? ',\n  ' : ', ',
    s = '});';

  if (js && js.slice(-1) !== '\n') { s = '\n' + s; }

  return imports + 'tiny.tag2(\'' + name + SQ +
    c + _q(html, 1) +
    c + _q(css) +
    c + _q(attr) + ', function(opts) {\n' + js + s
}


var rf=require("fs");

var compilerTag=function(fileName,inputPath,outPath,fn){
  //console.log(fileName,inputPath,outPath)
  var that=this;
  function callBack(err,data){
    if(err){  
        console.log("error:"+err);  
    }else{  
        var res=rf.writeFileSync((outPath+(fileName.replace('.xhtml','.js'))),compile$1(data));
        fn(that);
    }
  }  
  rf.readFile(inputPath,"utf-8",callBack);
  return true;
};




module['exports'] = compilerTag;



